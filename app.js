const core = window.FitPlanCore;
const $ = (id) => document.getElementById(id);

const pageCopy = {
  today: "今日",
  diet: "飲食",
  train: "訓練",
  progress: "進度",
  settings: "設定",
  foods: "食物庫"
};

const pageHint = {
  settings: "目標、飲食模式、備份",
  foods: "自訂食物與雲端食物庫"
};

const state = {
  foodCategory: "all",
  selectedFoodId: "",
  historyExerciseId: "squat",
  foodLibrarySync: { status: "local", message: "使用本機預設食物庫。", fetchedAt: null }
};

let hydrating = false;
let lastKnownTodayKey = core.todayKey();
let undoAdd = null;
let toastTimer = 0;
let exerciseOptionsSignature = "";
const syncChannel = "BroadcastChannel" in window ? new BroadcastChannel("fitplan-data-sync") : null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function allFoods() {
  return [...(state.backendFoods || []), ...(state.foods || [])];
}

function selectedFood() {
  return allFoods().find((food) => food.id === state.selectedFoodId) || allFoods()[0] || null;
}

function ensureSelectedFood() {
  const foods = allFoods();
  if (!foods.some((food) => food.id === state.selectedFoodId)) state.selectedFoodId = foods[0]?.id || "";
}

function foodsByIds(ids = []) {
  const foods = allFoods();
  return ids.map((id) => foods.find((food) => food.id === id)).filter(Boolean);
}

function formatPer100(food) {
  const basis = window.FitPlanFoodBasis?.servingLabel?.(food);
  const weight = food.serving_weight_g ? `，約 ${food.serving_weight_g}g` : "";
  const source = basis && basis !== "每 100g" ? ` · 原始 ${basis}${weight}` : "";
  return `${food.calories} kcal · 蛋白質 ${food.protein}g · 碳水 ${food.carbs}g · 脂肪 ${food.fat}g / 100g${source}`;
}

function formatFoodLine(item) {
  const multiplier = Number(item.grams) / 100;
  return `${core.round(item.calories * multiplier)} kcal · 蛋白質 ${core.round(item.protein * multiplier, 1)}g · 碳水 ${core.round(item.carbs * multiplier, 1)}g · 脂肪 ${core.round(item.fat * multiplier, 1)}g`;
}

function targetContext(dateKey = state.selectedDate) {
  return core.macroTargets({ ...state, dateKey });
}

function readRaw() {
  try {
    const raw = localStorage.getItem(core.storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad");
    return parsed;
  } catch (error) {
    const raw = localStorage.getItem(core.storageKey);
    if (raw) localStorage.setItem(`${core.storageKey}-corrupt`, raw);
    return {};
  }
}

function loadState() {
  const saved = readRaw();
  const cached = window.FitPlanSupabaseFoods?.readCachedFoods?.();
  Object.assign(state, core.migrateSaved(saved, { now: new Date() }));
  if (cached?.foods?.length) {
    state.backendFoods = cached.foods;
    state.foodLibrarySync = {
      status: "cached",
      message: "先使用上次快取的 Supabase 食物庫。",
      fetchedAt: cached.fetchedAt || null
    };
  }
}

function saveState() {
  try {
    localStorage.setItem(core.storageKey, JSON.stringify(core.serializeState(state)));
  } catch (error) {
    console.warn("FitPlan 無法寫入本機資料", error);
  }
}

function resolvedDark() {
  if (state.theme === "dark") return true;
  if (state.theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme || "system";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedDark() ? "#101512" : "#f3f5f1");
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeValue === (state.theme || "system"));
  });
}

function showToast(message, canUndo = false) {
  const toast = $("toast");
  toast.replaceChildren();
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(text);
  if (canUndo) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "復原";
    button.addEventListener("click", () => {
      if (!undoAdd) return;
      const { date, entryId } = undoAdd;
      state.logsByDate[date] = (state.logsByDate[date] || []).filter((item) => item.entryId !== entryId);
      undoAdd = null;
      toast.hidden = true;
      render();
    });
    toast.append(button);
  } else {
    undoAdd = null;
  }
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function confirmAction({ title, body, confirmLabel }) {
  const dialog = $("confirmDialog");
  $("confirmTitle").textContent = title;
  $("confirmBody").textContent = body;
  $("confirmOk").textContent = confirmLabel || "確定";
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    if (!dialog.open) dialog.showModal();
  });
}

function emptyHtml(message) {
  return `<div class="empty"><p>${escapeHtml(message)}</p></div>`;
}

function chipButton(food) {
  const grams = core.defaultGrams(food, state.logsByDate);
  return `<button type="button" class="chip" data-action="quick-add" data-food-id="${escapeHtml(food.id)}" data-grams="${grams}"><span>${escapeHtml(food.name)}</span><small>${grams}g</small></button>`;
}

function chipList(foods, emptyMessage) {
  if (!foods.length) return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  return foods.map(chipButton).join("");
}

function logHtml(entries) {
  const valid = (entries || []).filter(core.isValidFoodEntry);
  if (!valid.length) return emptyHtml("這一天還沒有飲食紀錄。");
  return valid
    .map(
      (item) => `
      <article class="log-row">
        <div class="log-main">
          <strong>${escapeHtml(item.name)} · ${item.grams}g</strong>
          <span>${escapeHtml(formatFoodLine(item))}</span>
        </div>
        <div class="log-actions">
          <button type="button" class="btn btn-ghost" data-action="repeat-log" data-entry-id="${escapeHtml(item.entryId)}">再記</button>
          <button type="button" class="btn btn-ghost" data-action="remove-log" data-entry-id="${escapeHtml(item.entryId)}" aria-label="刪除 ${escapeHtml(item.name)}">刪除</button>
        </div>
      </article>`
    )
    .join("");
}

function filteredFoods() {
  const term = ($("foodSearch")?.value || "").trim().toLocaleLowerCase("zh-TW");
  return allFoods().filter((food) => {
    if (state.foodCategory !== "all" && (food.category || "other") !== state.foodCategory) return false;
    if (!term) return true;
    const blob = `${food.name} ${core.categoryLabels[food.category] || ""}`.toLocaleLowerCase("zh-TW");
    return blob.includes(term);
  });
}

function foodResultHtml(food) {
  const starred = state.favoriteFoodIds.includes(food.id);
  const grams = core.defaultGrams(food, state.logsByDate);
  return `
    <article class="food-row${food.id === state.selectedFoodId ? " is-active" : ""}">
      <button type="button" class="food-main" data-action="select-food" data-food-id="${escapeHtml(food.id)}">
        <strong>${escapeHtml(food.name)}</strong>
        <span>${escapeHtml(core.categoryLabels[food.category] || "其他")} · ${escapeHtml(formatPer100(food))}</span>
      </button>
      <div class="row-actions">
        <button type="button" class="star${starred ? " is-on" : ""}" data-action="toggle-favorite" data-food-id="${escapeHtml(food.id)}" aria-pressed="${starred}" aria-label="${starred ? "取消收藏" : "收藏"}">${starred ? "★" : "☆"}</button>
        <button type="button" data-action="quick-add" data-food-id="${escapeHtml(food.id)}" data-grams="${grams}">加入</button>
      </div>
    </article>`;
}

function gapText(value) {
  return `${value >= 0 ? "還差" : "超過"} ${Math.abs(core.round(value, 1))}g`;
}

function remainingCopy(target, eaten) {
  const calorie = eaten.calories <= target.calories
    ? `還差 ${core.round(target.calories - eaten.calories)} kcal`
    : `已超過 ${core.round(eaten.calories - target.calories)} kcal`;
  const macro = `蛋白質 ${gapText(target.protein - eaten.protein)}，碳水 ${gapText(target.carbs - eaten.carbs)}，脂肪 ${gapText(target.fat - eaten.fat)}`;
  if (state.mode === "calorie") return calorie;
  if (state.mode === "macro") return macro;
  return `${calorie}；${macro}`;
}

function macroRow(name, eatenValue, targetValue, klass) {
  const percent = targetValue > 0 ? Math.min(100, (eatenValue / targetValue) * 100) : 0;
  return `<div class="macro-row"><span><b>${name}</b><b>${core.round(eatenValue, 1)} / ${core.round(targetValue)} g</b></span><div class="bar ${klass}"><i style="width:${percent}%"></i></div></div>`;
}

function renderChrome() {
  if (state.step === "settings" || state.step === "foods") $("pageKicker").textContent = pageHint[state.step];
  else {
    $("pageKicker").textContent = new Intl.DateTimeFormat("zh-Hant-TW", {
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(new Date(`${state.selectedDate}T00:00:00`));
  }
  if (document.activeElement !== $("logDate")) $("logDate").value = state.selectedDate;
  $("goTodayBtn").hidden = state.selectedDate === core.todayKey();
}

function renderToday() {
  const metrics = core.profileMetrics(state.profile);
  const target = targetContext();
  const eaten = core.totals(state.logsByDate[state.selectedDate] || []);
  const percent = target.calories > 0 ? (eaten.calories / target.calories) * 100 : 0;
  const status = core.calorieStatus(percent);
  const cycle = state.dietMode === "carbCycle"
    ? core.carbCycleDayInfo({
        cyclePattern: state.cyclePattern,
        dietStartDate: state.dietStartDate,
        dateKey: state.selectedDate
      })
    : null;
  const summary = core.weeklySummary(state);
  const dots = summary.days.map((day) => `<i class="${day.logged ? "is-on" : ""}"></i>`).join("");
  $("profileHint").hidden = Boolean(state.profileTouched || state.hintDismissed);
  $("todayHero").dataset.track = state.mode;
  $("todayHero").innerHTML = `
    <div class="ring${percent > 110 ? " is-over" : ""}" style="--progress:${Math.max(0, Math.min(100, percent))}">
      <div class="ring-hole">
        <strong>${core.round(eaten.calories)}</strong>
        <span>kcal</span>
      </div>
    </div>
    <div class="hero-copy">
      <div class="status${percent > 110 ? " is-over" : ""}">${status}</div>
      <div>${escapeHtml(core.dietModeLabel[state.dietMode] || "一般紀錄")}${cycle ? ` · <span class="badge">${escapeHtml(cycle.label)}</span>` : ""} · ${escapeHtml(core.goalLabel(state.profile.goal))}</div>
      <p>${escapeHtml(remainingCopy(target, eaten))}</p>
      <p class="muted">${escapeHtml(target.note)} · 目標 ${core.round(target.calories)} kcal · BMR ${core.round(metrics.bmr)} · TDEE ${core.round(metrics.tdee)}</p>
      <div class="macro-list">
        ${macroRow("蛋白質", eaten.protein, target.protein, "protein")}
        ${macroRow("碳水", eaten.carbs, target.carbs, "carbs")}
        ${macroRow("脂肪", eaten.fat, target.fat, "fat")}
      </div>
      <div class="week-dots" aria-label="近 7 天有紀錄的日子">${dots}</div>
    </div>`;
  const quickFoods = [
    ...foodsByIds(state.favoriteFoodIds).slice(0, 6),
    ...foodsByIds(core.recentFoodIds(state.logsByDate, 6)).filter((food) => !state.favoriteFoodIds.includes(food.id)).slice(0, 4)
  ];
  $("todayQuick").innerHTML = quickFoods.length
    ? `<div class="chip-row">${quickFoods.map(chipButton).join("")}</div>`
    : `${emptyHtml("先記一筆飲食，或把常吃的食物加星號，之後點一下就能再記。")}<button type="button" class="btn btn-primary" data-nav="diet">開始記錄</button>`;
  $("todayFoodList").innerHTML = logHtml(state.logsByDate[state.selectedDate] || []);
  $("todayWorkoutList").innerHTML = workoutSummaryHtml(state.workoutsByDate[state.selectedDate] || []);
}

function workoutSummaryHtml(entries) {
  if (!entries.length) return emptyHtml("這一天還沒有訓練。");
  return entries
    .map((entry) => {
      const best = core.bestSet(entry.sets);
      const bestText = best ? `最好 ${best.weight}kg × ${best.reps}` : "";
      return `<article class="log-row"><div class="log-main"><strong>${escapeHtml(entry.name)}</strong><span>${entry.sets.length} 組 · ${bestText} · 訓練量 ${core.round(core.workoutVolume([entry]))}</span></div></article>`;
    })
    .join("");
}

function renderDietLists() {
  ensureSelectedFood();
  const food = selectedFood();
  $("selectedFoodName").textContent = food ? food.name : "沒有可選食物";
  $("selectedFoodMeta").textContent = food ? formatPer100(food) : "請先到食物庫新增";
  $("addLogBtn").disabled = !food;
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.category === state.foodCategory);
  });
  $("favoriteChips").innerHTML = chipList(foodsByIds(state.favoriteFoodIds), "點星號，常吃的食物會留在這裡。");
  $("recentChips").innerHTML = chipList(
    foodsByIds(core.recentFoodIds(state.logsByDate)).filter((item) => !state.favoriteFoodIds.includes(item.id)),
    "記錄過的食物會出現在這裡。"
  );
  const foods = filteredFoods();
  const visible = foods.slice(0, 40);
  $("foodResults").innerHTML = visible.length
    ? `${visible.map(foodResultHtml).join("")}${foods.length > visible.length ? `<p class="muted">還有 ${foods.length - visible.length} 項，輸入名稱縮小範圍。</p>` : ""}`
    : emptyHtml(allFoods().length ? "找不到符合的食物。" : "食物庫目前沒有資料。");
  $("logTitle").textContent = state.selectedDate === core.todayKey() ? "今天吃了什麼" : "這一天吃了什麼";
  $("foodLog").innerHTML = logHtml(state.logsByDate[state.selectedDate] || []);
  const plan = (state.plansByDate[state.selectedDate] || []).filter(core.isValidFoodEntry);
  state.plansByDate[state.selectedDate] = plan;
  const planTotals = core.totals(plan);
  $("planSummary").textContent = plan.length ? `約 ${core.round(planTotals.calories)} kcal` : "尚未產生";
  $("mealPlan").innerHTML = plan.length
    ? plan
        .map(
          (item) => `<article class="log-row"><div class="log-main"><strong>${escapeHtml(item.name)} · ${item.grams}g</strong><span>${escapeHtml(formatFoodLine(item))}</span></div></article>`
        )
        .join("")
    : emptyHtml(allFoods().length ? "依剩下的熱量和營養素，從食物庫配一份建議。" : "先有食物庫，才能產生建議菜單。");
  $("applyPlanBtn").hidden = plan.length === 0;
}

function exerciseOptionsHtml(exercises) {
  const groups = new Map();
  exercises.forEach((exercise) => {
    const key = exercise.muscle || "其他";
    groups.set(key, [...(groups.get(key) || []), exercise]);
  });
  return [...groups.entries()]
    .map(
      ([muscle, items]) =>
        `<optgroup label="${escapeHtml(muscle)}">${items
          .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
          .join("")}</optgroup>`
    )
    .join("");
}

function ensureExerciseOptions() {
  const exercises = core.allExercises(state.customExercises);
  const signature = exercises.map((item) => `${item.id}:${item.name}`).join("|");
  if (signature === exerciseOptionsSignature) return;
  exerciseOptionsSignature = signature;
  const html = exerciseOptionsHtml(exercises);
  const currentExercise = $("exerciseSelect").value;
  const currentHistory = $("historyExercise").value || state.historyExerciseId;
  $("exerciseSelect").innerHTML = html;
  $("historyExercise").innerHTML = html;
  if (exercises.some((item) => item.id === currentExercise)) $("exerciseSelect").value = currentExercise;
  if (exercises.some((item) => item.id === currentHistory)) $("historyExercise").value = currentHistory;
  state.historyExerciseId = $("historyExercise").value;
}

function renumberSets() {
  [...$("setRows").querySelectorAll(".set-index")].forEach((node, index) => {
    node.textContent = String(index + 1);
  });
}

function setRowElement(set) {
  const row = document.createElement("div");
  row.className = "set-row";
  row.innerHTML = `
    <span class="set-index"></span>
    <label class="field">重量 kg <input data-field="weight" type="number" min="0" max="500" step="0.5" inputmode="decimal" /></label>
    <label class="field">次數 <input data-field="reps" type="number" min="1" max="100" step="1" inputmode="numeric" /></label>
    <button type="button" data-action="remove-set" aria-label="刪除這一組">刪除</button>`;
  row.querySelector("[data-field=weight]").value = set.weight ?? "";
  row.querySelector("[data-field=reps]").value = set.reps ?? "";
  return row;
}

function fillSetRows(sets) {
  const wrap = $("setRows");
  wrap.replaceChildren();
  (sets?.length ? sets : [{ weight: "", reps: "" }]).forEach((set) => wrap.append(setRowElement(set)));
  renumberSets();
}

function fillSetsForSelectedExercise() {
  const exerciseId = $("exerciseSelect").value;
  if (!exerciseId) return;
  const todayEntry = (state.workoutsByDate[state.selectedDate] || []).find((entry) => entry.exerciseId === exerciseId);
  if (todayEntry) {
    fillSetRows(todayEntry.sets);
    $("workoutFormMode").textContent = "正在編輯這一天的紀錄";
    return;
  }
  const last = core.lastSession(state.workoutsByDate, exerciseId, state.selectedDate);
  if (last) {
    fillSetRows(last.sets);
    $("workoutFormMode").textContent = `已帶入 ${last.date} 的組數，調整後再儲存`;
    return;
  }
  fillSetRows([{ weight: "", reps: "" }]);
  $("workoutFormMode").textContent = "輸入重量和次數。重量可以是 0，例如徒手動作。";
}

function readSetRows() {
  return [...$("setRows").querySelectorAll(".set-row")]
    .map((row) => {
      const weight = row.querySelector("[data-field=weight]").value;
      const reps = row.querySelector("[data-field=reps]").value;
      if (weight === "" || reps === "") return null;
      return core.sanitizeSet({ weight, reps });
    })
    .filter(Boolean);
}

function renderTrainLists() {
  ensureExerciseOptions();
  const entries = state.workoutsByDate[state.selectedDate] || [];
  $("savedWorkouts").innerHTML = entries.length
    ? entries
        .map((entry) => {
          const best = core.bestSet(entry.sets);
          return `<article class="log-row"><div class="log-main"><strong>${escapeHtml(entry.name)}</strong><span>${entry.sets
            .map((set) => `${set.weight}kg × ${set.reps}`)
            .join(" · ")}${best ? ` · 預估單次極限 ${core.round(best.e1rm, 1)}kg` : ""}</span></div><button type="button" class="btn btn-ghost" data-action="delete-workout" data-workout-id="${escapeHtml(entry.id)}">刪除</button></article>`;
        })
        .join("")
    : emptyHtml("這一天還沒有訓練。選一個動作，填重量和次數。");
  const exerciseId = $("historyExercise").value;
  const history = core.exerciseHistory(state.workoutsByDate, exerciseId).slice(0, 12);
  if (history.length < 2) $("historyChart").innerHTML = "";
  else {
    const chronological = [...history].reverse();
    $("historyChart").innerHTML = core.lineChartSvg(
      chronological.map((item) => core.round(item.best?.e1rm || 0, 1)),
      { label: "預估單次極限趨勢" }
    );
  }
  $("historyList").innerHTML = history.length
    ? history
        .map(
          (item) =>
            `<article class="history-row"><div><strong>${item.date}</strong><span>${item.sets
              .map((set) => `${set.weight}kg × ${set.reps}`)
              .join(" · ")} · 訓練量 ${core.round(item.volume)} · 預估單次極限 ${core.round(item.best?.e1rm || 0, 1)}kg</span></div></article>`
        )
        .join("")
    : emptyHtml("這個動作還沒有紀錄。練完存下來，之後可以比較重量。");
}

function renderProgress() {
  const latest = state.weightLog.at(-1);
  $("weightLatest").textContent = latest ? `最新 ${latest.kg} kg · ${latest.date}` : "還沒有紀錄";
  $("weightKg").placeholder = latest ? String(latest.kg) : "72.5";
  const points = state.weightLog.slice(-180);
  if (points.length < 2) {
    $("weightChart").innerHTML = emptyHtml("再記一筆體重，就會畫出趨勢。虛線是最近幾筆的平均。");
  } else {
    const values = points.map((point) => point.kg);
    $("weightChart").innerHTML = core.lineChartSvg(values, { label: "體重趨勢", average: core.movingAverage(values) });
  }
  const rows = [...state.weightLog].reverse().slice(0, 30);
  $("weightTable").innerHTML = rows
    .map(
      (entry) =>
        `<article class="log-row"><div class="log-main"><strong>${entry.kg} kg</strong><span>${entry.date}</span></div><button type="button" class="btn btn-ghost" data-action="delete-weight" data-weight-id="${escapeHtml(entry.id)}">刪除</button></article>`
    )
    .join("");
  const summary = core.weeklySummary(state);
  const weightText = summary.weightDelta === null ? "—" : `${summary.weightDelta > 0 ? "+" : ""}${summary.weightDelta}`;
  $("weekStats").innerHTML = `
    <article><span>飲食天數</span><strong>${summary.loggedDays}/7</strong><small>訓練 ${summary.workoutDays} 天</small></article>
    <article><span>平均熱量</span><strong>${summary.loggedDays ? core.round(summary.avgCalories) : "—"}</strong><small>目標約 ${core.round(summary.avgTargetCalories)}</small></article>
    <article><span>平均蛋白質</span><strong>${summary.loggedDays ? core.round(summary.avgProtein) : "—"}</strong><small>公克</small></article>
    <article><span>體重變化</span><strong>${weightText}</strong><small>kg · 訓練量 ${core.round(summary.totalVolume)}</small></article>`;
  $("weekBars").innerHTML = summary.days
    .map((day) => {
      const ratio = day.targetCalories > 0 ? day.eaten.calories / day.targetCalories : 0;
      const height = day.logged ? Math.max(22, Math.min(100, ratio * 100)) : 0;
      const label = ["日", "一", "二", "三", "四", "五", "六"][new Date(`${day.date}T00:00:00`).getDay()];
      const empty = day.logged ? "" : " is-empty";
      return `<div class="week-col${day.date === core.todayKey() ? " is-today" : ""}"><div class="week-track"><div class="week-fill${ratio > 1.1 ? " is-over" : ""}${empty}" style="height:${day.logged ? height : 6}%"></div></div><small>${label}</small></div>`;
    })
    .join("");
}

function renderSettingsPreview() {
  const metrics = core.profileMetrics(state.profile);
  const target = targetContext();
  $("settingsBmr").textContent = String(core.round(metrics.bmr));
  $("settingsTdee").textContent = String(core.round(metrics.tdee));
  $("modeCopy").textContent = core.modeText[state.mode];
  $("dietModeCopy").textContent = core.dietModeText[state.dietMode];
  $("goalNote").hidden = !state.legacyGoalNote;
  $("generalDeficitSetting").hidden = !(state.dietMode === "general" && state.profile.goal === "-15");
  $("singleRatioControls").hidden = state.dietMode === "general" || state.dietMode === "carbCycle";
  $("cycleRatioControls").hidden = state.dietMode !== "carbCycle";
  $("cycleSetting").hidden = state.dietMode !== "carbCycle";
  $("weeklyDropSetting").hidden = state.dietMode !== "carbDrop";
  $("restartDietBtn").hidden = state.dietMode !== "carbDrop" && state.dietMode !== "carbCycle";
  document.querySelectorAll("[data-track-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.trackMode === state.mode);
  });
  document.querySelectorAll("[data-diet-mode]").forEach((button) => {
    const active = button.dataset.dietMode === state.dietMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
  const calories = target.calories || 1;
  const ratioText =
    state.dietMode === "general"
      ? `，熱量比例 碳水 ${core.round(((target.carbs * 4) / calories) * 100)}% / 蛋白質 ${core.round(((target.protein * 4) / calories) * 100)}% / 脂肪 ${core.round(((target.fat * 9) / calories) * 100)}%`
      : "";
  const cycle =
    state.dietMode === "carbCycle"
      ? core.carbCycleDayInfo({
          cyclePattern: state.cyclePattern,
          dietStartDate: state.dietStartDate,
          dateKey: state.selectedDate
        })
      : null;
  $("ratioPreview").textContent = `${cycle ? `${cycle.label} · ` : ""}目前目標：蛋白質 ${core.round(target.protein, 1)}g，碳水 ${core.round(target.carbs, 1)}g，脂肪 ${core.round(target.fat, 1)}g，約 ${core.round(target.calories)} kcal${ratioText}。${target.note}`;
}

function renderFoodLibrary() {
  const foods = allFoods();
  const fetched = state.foodLibrarySync.fetchedAt ? ` · ${new Date(state.foodLibrarySync.fetchedAt).toLocaleString("zh-TW")}` : "";
  $("foodLibrarySyncStatus").textContent = `${state.foodLibrarySync.message}${fetched}`;
  $("foodLibrarySummary").textContent = `${foods.length} 項`;
  $("customFoodCount").textContent = `${state.foods.length} 項`;
  $("customFoodList").innerHTML = state.foods.length
    ? state.foods
        .map(
          (food) => `<article class="food-row"><div class="log-main"><strong>${escapeHtml(food.name)}</strong><span>${escapeHtml(formatPer100(food))}</span></div><div class="row-actions"><button type="button" data-action="edit-food" data-food-id="${escapeHtml(food.id)}">編輯</button><button type="button" data-action="delete-food" data-food-id="${escapeHtml(food.id)}">刪除</button></div></article>`
        )
        .join("")
    : emptyHtml("還沒有自訂食物。常吃的便當可以存起來，之後直接選。");
  const groups = foods.reduce((result, food) => {
    const key = food.category || "other";
    result[key] ||= [];
    result[key].push(food);
    return result;
  }, {});
  const orderedKeys = [...Object.keys(core.categoryLabels), ...Object.keys(groups).filter((key) => !core.categoryLabels[key])].filter(
    (key) => groups[key]?.length
  );
  $("foodLibraryList").innerHTML = orderedKeys.length
    ? orderedKeys
        .map(
          (key) => `<section><div class="section-head"><h3>${core.categoryLabels[key] || "其他"}</h3><span class="muted">${groups[key].length} 項</span></div>${groups[key]
            .map(
              (food) =>
                `<article class="food-row"><div class="log-main"><strong>${escapeHtml(food.name)}</strong><span>${escapeHtml(formatPer100(food))}</span></div><button type="button" class="star${state.favoriteFoodIds.includes(food.id) ? " is-on" : ""}" data-action="toggle-favorite" data-food-id="${escapeHtml(food.id)}" aria-label="收藏">${state.favoriteFoodIds.includes(food.id) ? "★" : "☆"}</button></article>`
            )
            .join("")}</section>`
        )
        .join("")
    : emptyHtml("食物庫目前沒有資料。");
}

function render() {
  renderChrome();
  renderToday();
  renderDietLists();
  renderTrainLists();
  renderProgress();
  renderFoodLibrary();
  renderSettingsPreview();
  applyTheme();
  saveState();
}

function showView(view) {
  if (!pageCopy[view]) view = "today";
  state.step = view;
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll("[data-nav]").forEach((button) => {
    const active = button.dataset.nav === view || (view === "foods" && button.dataset.nav === "settings");
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("dateNav").hidden = view === "settings" || view === "foods";
  $("pageTitle").textContent = pageCopy[view];
  render();
}

function setSelectedDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey || "")) return;
  state.selectedDate = dateKey;
  if (document.activeElement !== $("weightDate")) $("weightDate").value = dateKey;
  fillSetsForSelectedExercise();
  render();
}

function addFoodToLog(foodId, grams) {
  const food = allFoods().find((item) => item.id === foodId);
  const amount = Number(grams);
  if (!food || !Number.isFinite(amount) || amount <= 0 || amount > 2000) {
    showToast("請輸入 1 到 2000 公克");
    return;
  }
  const entry = {
    id: food.id,
    name: food.name,
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fat: Number(food.fat) || 0,
    category: food.category || "other",
    grams: amount,
    entryId: core.createId("log")
  };
  state.logsByDate[state.selectedDate] ||= [];
  state.logsByDate[state.selectedDate].push(entry);
  undoAdd = { date: state.selectedDate, entryId: entry.entryId };
  render();
  showToast(`已加入 ${food.name} ${amount}g`, true);
}

function selectFood(foodId) {
  state.selectedFoodId = foodId;
  const food = selectedFood();
  if (food) $("grams").value = core.defaultGrams(food, state.logsByDate);
  renderDietLists();
  $("grams").focus();
}

function removeLog(entryId) {
  state.logsByDate[state.selectedDate] = (state.logsByDate[state.selectedDate] || []).filter((item) => item.entryId !== entryId);
  render();
}

function repeatLog(entryId) {
  const source = (state.logsByDate[state.selectedDate] || []).find((item) => item.entryId === entryId);
  if (!source) return;
  const entry = { ...source, entryId: core.createId("log") };
  state.logsByDate[state.selectedDate].push(entry);
  undoAdd = { date: state.selectedDate, entryId: entry.entryId };
  render();
  showToast(`已再記一次 ${source.name}`, true);
}

async function clearLog() {
  const entries = state.logsByDate[state.selectedDate] || [];
  if (!entries.length) return;
  const ok = await confirmAction({ title: "清空這一天的飲食", body: "這一天已記錄的食物會全部刪除。", confirmLabel: "清空" });
  if (!ok) return;
  state.logsByDate[state.selectedDate] = [];
  render();
}

function generateMealPlan(replace) {
  if (replace) state.planShuffleIndex += 1;
  const plan = core.generatePlan({
    foods: allFoods(),
    target: targetContext(),
    existingTotals: core.totals(state.logsByDate[state.selectedDate] || []),
    dietMode: state.dietMode,
    shuffleIndex: state.planShuffleIndex
  });
  state.plansByDate[state.selectedDate] = plan;
  render();
  if (!plan.length) showToast(allFoods().length ? "今天的目標差不多已經吃滿了" : "食物庫是空的，沒辦法配菜單");
}

function applyPlan() {
  const plan = state.plansByDate[state.selectedDate] || [];
  if (!plan.length) return;
  state.logsByDate[state.selectedDate] ||= [];
  plan.forEach((item) => state.logsByDate[state.selectedDate].push({ ...item, entryId: core.createId("log") }));
  render();
  showToast("已把建議菜單加入紀錄");
}

function readProfile() {
  ["height", "weight", "age", "sex", "activity", "goal"].forEach((id) => {
    state.profile[id] = $(id).value;
  });
}

function readRatios() {
  if (state.dietMode === "carbCycle") {
    state.dietRatios.carbCycle.low = {
      carbs: Number($("lowCarbs").value) || 0,
      protein: Number($("lowProtein").value) || 0,
      fat: Number($("lowFat").value) || 0
    };
    state.dietRatios.carbCycle.high = {
      carbs: Number($("highCarbs").value) || 0,
      protein: Number($("highProtein").value) || 0,
      fat: Number($("highFat").value) || 0
    };
    return;
  }
  if (state.dietMode === "general") {
    const raw = Number($("generalDeficit").value);
    if (raw >= 300 && raw <= 500) state.dietRatios.general.deficit = raw;
    return;
  }
  state.dietRatios[state.dietMode] = {
    ...state.dietRatios[state.dietMode],
    protein: Number($("ratioProtein").value) || 0,
    carbs: Number($("ratioCarbs").value) || 0,
    fat: Number($("ratioFat").value) || 0
  };
  if (state.dietMode === "carbDrop") state.dietRatios.carbDrop.weeklyDrop = Number($("weeklyCarbDrop").value) || 0;
}

function syncProfileForm() {
  hydrating = true;
  ["height", "weight", "age", "sex", "activity", "goal"].forEach((id) => {
    $(id).value = state.profile[id];
  });
  hydrating = false;
}

function syncRatioInputs() {
  hydrating = true;
  const ratio = state.dietRatios[state.dietMode] || state.dietRatios.general;
  $("ratioProtein").value = ratio.protein ?? "";
  $("ratioCarbs").value = ratio.carbs ?? "";
  $("ratioFat").value = ratio.fat ?? "";
  $("generalDeficit").value = state.dietRatios.general.deficit;
  $("weeklyCarbDrop").value = state.dietRatios.carbDrop.weeklyDrop;
  $("lowCarbs").value = state.dietRatios.carbCycle.low.carbs;
  $("lowProtein").value = state.dietRatios.carbCycle.low.protein;
  $("lowFat").value = state.dietRatios.carbCycle.low.fat;
  $("highCarbs").value = state.dietRatios.carbCycle.high.carbs;
  $("highProtein").value = state.dietRatios.carbCycle.high.protein;
  $("highFat").value = state.dietRatios.carbCycle.high.fat;
  $("cyclePattern").value = state.cyclePattern;
  hydrating = false;
}

function logProfileWeight() {
  const kg = Number(state.profile.weight);
  if (!Number.isFinite(kg)) return;
  try {
    const today = core.todayKey();
    const existing = state.weightLog.find((entry) => entry.date === today);
    const rounded = core.round(kg, 1);
    if (existing?.kg === rounded) return;
    state.weightLog = core.upsertWeight(state.weightLog, { date: today, kg: rounded, id: existing?.id });
    renderProgress();
    saveState();
    showToast("已把目前體重記到今天");
  } catch (error) {
    showToast(error.message);
  }
}

function saveWorkout(event) {
  event.preventDefault();
  const exercise = core.allExercises(state.customExercises).find((item) => item.id === $("exerciseSelect").value);
  const sets = readSetRows();
  if (!exercise || !sets.length) {
    showToast("請至少填一組完整的重量和次數");
    return;
  }
  const date = state.selectedDate;
  const list = [...(state.workoutsByDate[date] || [])];
  const index = list.findIndex((entry) => entry.exerciseId === exercise.id);
  const entry = {
    id: index >= 0 ? list[index].id : core.createId("wo"),
    exerciseId: exercise.id,
    name: exercise.name,
    sets
  };
  if (index >= 0) list[index] = entry;
  else list.push(entry);
  state.workoutsByDate[date] = list;
  fillSetsForSelectedExercise();
  render();
  showToast(`已儲存${exercise.name}`);
}

function deleteWorkout(id) {
  const date = state.selectedDate;
  state.workoutsByDate[date] = (state.workoutsByDate[date] || []).filter((entry) => entry.id !== id);
  if (!state.workoutsByDate[date].length) delete state.workoutsByDate[date];
  fillSetsForSelectedExercise();
  render();
}

function addSetRow() {
  const last = [...$("setRows").querySelectorAll(".set-row")].at(-1);
  $("setRows").append(
    setRowElement({
      weight: last?.querySelector("[data-field=weight]").value || "",
      reps: last?.querySelector("[data-field=reps]").value || ""
    })
  );
  renumberSets();
}

function removeSet(button) {
  const rows = [...$("setRows").querySelectorAll(".set-row")];
  if (rows.length === 1) {
    rows[0].querySelector("[data-field=weight]").value = "";
    rows[0].querySelector("[data-field=reps]").value = "";
    return;
  }
  button.closest(".set-row")?.remove();
  renumberSets();
}

function copyLastIntoForm() {
  const last = core.lastSession(state.workoutsByDate, $("exerciseSelect").value, state.selectedDate);
  if (!last) {
    showToast("這個動作還沒有更早的紀錄");
    return;
  }
  fillSetRows(last.sets);
  $("workoutFormMode").textContent = `已帶入 ${last.date} 的組數，調整後再儲存`;
}

function addCustomExercise() {
  const name = $("customExerciseName").value.trim();
  if (!name) {
    showToast("請先填動作名稱");
    return;
  }
  if (core.allExercises(state.customExercises).some((item) => item.name === name)) {
    showToast("已經有這個動作");
    return;
  }
  const exercise = { id: core.createId("ex"), name, muscle: "自訂" };
  state.customExercises.push(exercise);
  exerciseOptionsSignature = "";
  $("customExerciseName").value = "";
  ensureExerciseOptions();
  $("exerciseSelect").value = exercise.id;
  $("historyExercise").value = exercise.id;
  state.historyExerciseId = exercise.id;
  fillSetsForSelectedExercise();
  render();
}

function saveWeight(event) {
  event.preventDefault();
  try {
    state.weightLog = core.upsertWeight(state.weightLog, { date: $("weightDate").value, kg: $("weightKg").value });
    const latest = state.weightLog.at(-1);
    if (latest) {
      state.profile.weight = String(latest.kg);
      if (document.activeElement !== $("weight")) $("weight").value = state.profile.weight;
    }
    $("weightKg").value = "";
    state.profileTouched = true;
    render();
    showToast("已記錄體重");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteWeight(id) {
  const entry = state.weightLog.find((item) => item.id === id);
  if (!entry) return;
  const ok = await confirmAction({ title: "刪除體重", body: `刪除 ${entry.date} 的 ${entry.kg} kg？`, confirmLabel: "刪除" });
  if (!ok) return;
  state.weightLog = state.weightLog.filter((item) => item.id !== id);
  render();
}

function updateCustomPreview() {
  const serving = Number($("customServingGrams").value) || 100;
  const multiplier = 100 / serving;
  const protein = (Number($("customProtein").value) || 0) * multiplier;
  const carbs = (Number($("customCarbs").value) || 0) * multiplier;
  const fat = (Number($("customFat").value) || 0) * multiplier;
  $("customPreview").textContent = `換算每 100g：${core.round(protein * 4 + carbs * 4 + fat * 9)} kcal · 蛋白質 ${core.round(protein, 1)}g · 碳水 ${core.round(carbs, 1)}g · 脂肪 ${core.round(fat, 1)}g`;
}

function resetCustomForm() {
  $("customForm").reset();
  $("customId").value = "";
  $("customServingGrams").value = 100;
  $("customProtein").value = 0;
  $("customCarbs").value = 0;
  $("customFat").value = 0;
  updateCustomPreview();
}

function saveCustomFood(event) {
  event.preventDefault();
  const name = $("customName").value.trim();
  if (!name) return;
  const servingGrams = Number($("customServingGrams").value) || 100;
  const multiplier = 100 / servingGrams;
  const food = {
    id: $("customId").value || core.createId("food"),
    name,
    protein: core.round((Number($("customProtein").value) || 0) * multiplier, 1),
    carbs: core.round((Number($("customCarbs").value) || 0) * multiplier, 1),
    fat: core.round((Number($("customFat").value) || 0) * multiplier, 1),
    category: "user"
  };
  food.calories = core.round(food.protein * 4 + food.carbs * 4 + food.fat * 9);
  const index = state.foods.findIndex((item) => item.id === food.id);
  if (index >= 0) state.foods[index] = food;
  else state.foods.push(food);
  resetCustomForm();
  render();
  showToast("已儲存食物");
}

function editCustomFood(id) {
  const food = state.foods.find((item) => item.id === id);
  if (!food) return;
  $("customForm").hidden = false;
  $("customId").value = food.id;
  $("customName").value = food.name;
  $("customServingGrams").value = 100;
  $("customProtein").value = food.protein;
  $("customCarbs").value = food.carbs;
  $("customFat").value = food.fat;
  updateCustomPreview();
  $("customName").focus();
}

async function deleteCustomFood(id) {
  const food = state.foods.find((item) => item.id === id);
  if (!food) return;
  const ok = await confirmAction({
    title: "刪除自訂食物",
    body: `刪除「${food.name}」後，食物庫不會再出現它。已經記過的飲食仍會保留。`,
    confirmLabel: "刪除"
  });
  if (!ok) return;
  state.foods = state.foods.filter((item) => item.id !== id);
  state.favoriteFoodIds = state.favoriteFoodIds.filter((item) => item !== id);
  if ($("customId").value === id) resetCustomForm();
  render();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(core.buildBackup(state), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fitplan-backup-${core.todayKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已下載備份");
}

async function importBackupFile(file) {
  if (!file) return;
  const text = await file.text();
  if (text.length > 5_000_000) {
    showToast("備份檔太大");
    return;
  }
  let parsed;
  try {
    parsed = core.parseBackup(text);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const ok = await confirmAction({
    title: "匯入備份",
    body: "會用這份備份覆蓋這台裝置目前的設定、飲食、訓練和體重。",
    confirmLabel: "覆蓋並匯入"
  });
  if (!ok) return;
  const migrated = core.migrateSaved(parsed, { now: new Date() });
  Object.assign(state, migrated);
  exerciseOptionsSignature = "";
  syncProfileForm();
  syncRatioInputs();
  ensureExerciseOptions();
  fillSetsForSelectedExercise();
  if (document.activeElement !== $("weightDate")) $("weightDate").value = state.selectedDate;
  showView(state.step || "today");
  showToast("已匯入備份");
}

async function clearAllData() {
  const ok = await confirmAction({
    title: "清除本機資料",
    body: "會刪掉這台裝置上的設定、飲食、訓練和體重。建議先匯出備份。",
    confirmLabel: "全部清除"
  });
  if (!ok) return;
  localStorage.removeItem(core.storageKey);
  localStorage.removeItem(window.FitPlanSupabaseFoods?.cacheKey || "fitplan-supabase-foods-cache-v1");
  location.reload();
}

function restartDiet() {
  state.dietStartDate = `${state.selectedDate}T00:00:00.000Z`;
  render();
  showToast("已從所選日期重新計算");
}

function syncDateAfterDayChange() {
  const today = core.todayKey();
  if (today === lastKnownTodayKey) return;
  lastKnownTodayKey = today;
  setSelectedDate(today);
}

async function syncCloudFoodLibrary() {
  if (!window.FitPlanSupabaseFoods) return;
  const result = await window.FitPlanSupabaseFoods.loadFoods(structuredClone(core.defaultFoods));
  state.foodLibrarySync = {
    status: result.status,
    message: result.message,
    fetchedAt: result.fetchedAt || null
  };
  if (Array.isArray(result.foods) && result.foods.length && JSON.stringify(state.backendFoods) !== JSON.stringify(result.foods)) {
    state.backendFoods = result.foods;
  }
  render();
}

function setupPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Service worker registration failed", error));
    });
  }
  if (window.top !== window.self) return;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (standalone) return;

  let deferredPrompt;
  let panel;
  const createPanel = ({ showButton = false, text = "Android 可直接安裝；iPhone 請用分享選單加入主畫面。" } = {}) => {
    if (panel) return panel;
    panel = document.createElement("section");
    panel.className = "pwa-install";
    panel.setAttribute("aria-label", "安裝 FitPlan");
    panel.innerHTML = `
      <div>
        <strong>把 FitPlan 加到手機</strong>
        <span data-pwa-help>${text}</span>
      </div>
      <button class="btn btn-primary" type="button" data-pwa-install ${showButton ? "" : "hidden"}>安裝</button>
      <button class="icon-btn" type="button" data-pwa-close aria-label="關閉安裝提示">×</button>`;
    document.body.classList.add("has-install-banner");
    document.body.append(panel);
    const closeBanner = () => {
      panel?.remove();
      panel = undefined;
      document.body.classList.remove("has-install-banner");
    };
    panel.querySelector("[data-pwa-install]").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = undefined;
      closeBanner();
    });
    panel.querySelector("[data-pwa-close]").addEventListener("click", closeBanner);
    return panel;
  };

  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) createPanel();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    const next = createPanel({ showButton: true, text: "可安裝成手機 App，之後也能離線開啟。" });
    next.querySelector("[data-pwa-install]").hidden = false;
    next.querySelector("[data-pwa-help]").textContent = "可安裝成手機 App，之後也能離線開啟。";
  });
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      showView(nav.dataset.nav);
      return;
    }
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const runners = {
      "shift-date": () => setSelectedDate(core.addDays(state.selectedDate, Number(actionEl.dataset.delta))),
      "go-today": () => setSelectedDate(core.todayKey()),
      "dismiss-hint": () => {
        state.hintDismissed = true;
        render();
      },
      "dismiss-goal-note": () => {
        state.legacyGoalNote = false;
        render();
      },
      "quick-add": () => addFoodToLog(actionEl.dataset.foodId, actionEl.dataset.grams),
      "select-food": () => selectFood(actionEl.dataset.foodId),
      "toggle-favorite": () => {
        state.favoriteFoodIds = core.toggleFavorite(state.favoriteFoodIds, actionEl.dataset.foodId);
        render();
      },
      "filter-category": () => {
        state.foodCategory = actionEl.dataset.category;
        renderDietLists();
      },
      "remove-log": () => removeLog(actionEl.dataset.entryId),
      "repeat-log": () => repeatLog(actionEl.dataset.entryId),
      "clear-log": () => clearLog(),
      "generate-plan": () => generateMealPlan(false),
      "replace-plan": () => generateMealPlan(true),
      "clear-plan": () => {
        state.plansByDate[state.selectedDate] = [];
        render();
      },
      "apply-plan": () => applyPlan(),
      "add-set": () => addSetRow(),
      "remove-set": () => removeSet(actionEl),
      "copy-last": () => copyLastIntoForm(),
      "add-exercise": () => addCustomExercise(),
      "delete-workout": () => deleteWorkout(actionEl.dataset.workoutId),
      "delete-weight": () => deleteWeight(actionEl.dataset.weightId),
      "restart-diet": () => restartDiet(),
      "export-backup": () => exportBackup(),
      "import-backup": () => $("importFile").click(),
      "clear-all": () => clearAllData(),
      "toggle-custom-form": () => {
        $("customForm").hidden = !$("customForm").hidden;
      },
      "edit-food": () => editCustomFood(actionEl.dataset.foodId),
      "delete-food": () => deleteCustomFood(actionEl.dataset.foodId)
    };
    runners[action]?.();
  });

  $("logDate").addEventListener("change", () => setSelectedDate($("logDate").value || core.todayKey()));
  $("themeBtn").addEventListener("click", () => {
    state.theme = resolvedDark() ? "light" : "dark";
    applyTheme();
    saveState();
  });
  $("logForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addFoodToLog(state.selectedFoodId || selectedFood()?.id, $("grams").value);
  });
  $("foodSearch").addEventListener("input", renderDietLists);
  $("workoutForm").addEventListener("submit", saveWorkout);
  $("exerciseSelect").addEventListener("change", fillSetsForSelectedExercise);
  $("historyExercise").addEventListener("change", () => {
    state.historyExerciseId = $("historyExercise").value;
    renderTrainLists();
  });
  $("weightForm").addEventListener("submit", saveWeight);
  $("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    readProfile();
    readRatios();
    if (state.dietMode === "general") {
      state.dietRatios.general.deficit = core.clampDeficit($("generalDeficit").value);
      $("generalDeficit").value = state.dietRatios.general.deficit;
    }
    state.profileTouched = true;
    render();
    showToast("已儲存設定");
  });
  ["height", "weight", "age", "sex", "activity", "goal"].forEach((id) => {
    const updateProfile = () => {
      if (hydrating) return;
      state.profile[id] = $(id).value;
      state.profileTouched = true;
      render();
    };
    $(id).addEventListener("input", updateProfile);
    $(id).addEventListener("change", updateProfile);
  });
  $("weight").addEventListener("change", () => {
    if (!hydrating) logProfileWeight();
  });
  ["ratioProtein", "ratioCarbs", "ratioFat", "generalDeficit", "weeklyCarbDrop", "lowCarbs", "lowProtein", "lowFat", "highCarbs", "highProtein", "highFat"].forEach(
    (id) => {
      $(id).addEventListener("input", () => {
        if (hydrating) return;
        readRatios();
        render();
      });
    }
  );
  $("generalDeficit").addEventListener("change", () => {
    if (hydrating) return;
    state.dietRatios.general.deficit = core.clampDeficit($("generalDeficit").value);
    $("generalDeficit").value = state.dietRatios.general.deficit;
    render();
  });
  document.querySelectorAll("[data-diet-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.dietMode;
      if (state.dietMode !== mode && (mode === "carbDrop" || mode === "carbCycle")) {
        state.dietStartDate = `${state.selectedDate}T00:00:00.000Z`;
      }
      state.dietMode = mode;
      syncRatioInputs();
      render();
    });
  });
  document.querySelectorAll("[data-track-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.trackMode;
      render();
    });
  });
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.themeValue;
      applyTheme();
      saveState();
    });
  });
  $("cyclePattern").addEventListener("change", () => {
    state.cyclePattern = $("cyclePattern").value;
    render();
  });
  $("customForm").addEventListener("submit", saveCustomFood);
  $("cancelFoodEditBtn").addEventListener("click", () => {
    resetCustomForm();
    $("customForm").hidden = true;
  });
  ["customServingGrams", "customProtein", "customCarbs", "customFat"].forEach((id) => {
    $(id).addEventListener("input", updateCustomPreview);
  });
  $("importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await importBackupFile(file);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncDateAfterDayChange();
  });
  window.addEventListener("focus", syncDateAfterDayChange);
  setInterval(syncDateAfterDayChange, 60 * 1000);
  window.addEventListener("storage", (event) => {
    if (event.key !== core.storageKey) return;
    const date = state.selectedDate;
    const step = state.step;
    loadState();
    state.selectedDate = date;
    state.step = step;
    syncProfileForm();
    syncRatioInputs();
    exerciseOptionsSignature = "";
    ensureExerciseOptions();
    showView(step);
  });
  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.type !== "backend-foods-updated") return;
    const saved = readRaw();
    if (!Array.isArray(saved.backendFoods)) return;
    state.backendFoods = saved.backendFoods;
    render();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (state.theme === "system") applyTheme();
  });
}

loadState();
bindEvents();
syncProfileForm();
syncRatioInputs();
ensureExerciseOptions();
$("weightDate").value = state.selectedDate;
fillSetsForSelectedExercise();
updateCustomPreview();
showView(state.step || "today");
setupPwa();
syncCloudFoodLibrary();
