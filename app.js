const defaultFoods = [
  { id: "chicken-breast", name: "雞胸肉 熟", calories: 165, protein: 31, carbs: 0, fat: 3.6, category: "protein" },
  { id: "salmon", name: "鮭魚 熟", calories: 206, protein: 22, carbs: 0, fat: 12.4, category: "protein" },
  { id: "egg", name: "全蛋", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, category: "protein" },
  { id: "tofu", name: "板豆腐", calories: 76, protein: 8.1, carbs: 1.9, fat: 4.8, category: "protein" },
  { id: "greek-yogurt", name: "希臘優格 無糖", calories: 97, protein: 9, carbs: 3.6, fat: 5, category: "protein" },
  { id: "white-rice", name: "白飯 熟", calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, category: "carb" },
  { id: "brown-rice", name: "糙米飯 熟", calories: 123, protein: 2.7, carbs: 25.6, fat: 1, category: "carb" },
  { id: "oats", name: "燕麥 乾", calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, category: "carb" },
  { id: "sweet-potato", name: "地瓜 熟", calories: 90, protein: 2, carbs: 20.7, fat: 0.2, category: "carb" },
  { id: "banana", name: "香蕉", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, category: "carb" },
  { id: "apple", name: "蘋果", calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, category: "carb" },
  { id: "broccoli", name: "花椰菜 熟", calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4, category: "veg" },
  { id: "spinach", name: "菠菜 熟", calories: 23, protein: 3, carbs: 3.8, fat: 0.3, category: "veg" },
  { id: "avocado", name: "酪梨", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, category: "fat" },
  { id: "olive-oil", name: "橄欖油", calories: 884, protein: 0, carbs: 0, fat: 100, category: "fat" },
  { id: "almonds", name: "杏仁", calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, category: "fat" },
  { id: "milk", name: "牛奶 全脂", calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, category: "drink" },
  { id: "beef", name: "牛肉 瘦 熟", calories: 217, protein: 26.1, carbs: 0, fat: 11.8, category: "protein" },
  { id: "pork-loin", name: "豬里肌 熟", calories: 196, protein: 29, carbs: 0, fat: 7.7, category: "protein" },
  { id: "lentils", name: "扁豆 熟", calories: 116, protein: 9, carbs: 20.1, fat: 0.4, category: "carb" }
];

const modeText = {
  calorie: "優先看今日熱量是否接近目標，適合剛開始建立紀錄習慣。",
  macro: "優先看蛋白質、碳水與脂肪缺口，適合有訓練週期或體態目標的人。",
  balanced: "同時控制總熱量與三大營養素，適合穩定減脂、增肌或維持體態。"
};

const dietModeText = {
  general: "一般紀錄會直接給出理想熱量，並以碳水 50%、蛋白質 25%、脂肪 25% 分配。",
  carbDrop: "碳水漸降會固定蛋白質與脂肪，並以開始日期為基準每週把碳水下調 30g。",
  carbCycle: "碳循環會依照節奏切換低碳日與高碳日，低碳日控碳，高碳日提高碳水並降低脂肪。",
  keto: "生酮飲食會把碳水壓到很低，主要用蛋白質與脂肪補足今日熱量。"
};

const dietModeLabel = {
  general: "一般紀錄",
  carbDrop: "碳水漸降",
  carbCycle: "碳循環",
  keto: "生酮飲食"
};

const categoryLabels = {
  protein: "蛋白質",
  carb: "碳水",
  veg: "蔬菜",
  fat: "脂肪",
  drink: "飲品",
  user: "自訂"
};

const defaultDietRatios = {
  general: { protein: 1.8, carbs: 3, fat: 0.8, deficit: 400 },
  carbDrop: { protein: 1.8, carbs: 3, fat: 0.8, weeklyDrop: 30 },
  keto: { protein: 2, carbs: 0.35, fat: 1.6 },
  carbCycle: {
    low: { carbs: 1.5, protein: 1.8, fat: 0.8 },
    high: { carbs: 5, protein: 1, fat: 0.3 }
  }
};

const state = {
  step: "profile",
  mode: "calorie",
  dietMode: "general",
  cyclePattern: "3low1high",
  dietStartDate: new Date().toISOString(),
  dietRatios: structuredClone(defaultDietRatios),
  selectedDate: todayKey(),
  backendFoods: structuredClone(defaultFoods),
  foods: [],
  log: [],
  plan: [],
  logsByDate: {},
  plansByDate: {},
  planShuffleIndex: 0,
  foodLibrarySync: {
    status: "local",
    message: "使用本機預設食物庫。",
    fetchedAt: null
  }
};

const $ = (id) => document.getElementById(id);
const storageKey = "fitplan-state-v1";
const dataChannel = "fitplan-data-sync";
const syncChannel = "BroadcastChannel" in window ? new BroadcastChannel(dataChannel) : null;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
}

function readSavedState() {
  return JSON.parse(localStorage.getItem(storageKey) || "{}");
}

function hasCloudFoodLibrary() {
  return state.foodLibrarySync.status === "online" || state.foodLibrarySync.status === "cached";
}

function hasFoodListChanged(nextFoods = []) {
  return JSON.stringify(state.backendFoods) !== JSON.stringify(nextFoods);
}

function syncBackendFoodsFromStorage() {
  if (hasCloudFoodLibrary()) return false;
  const saved = readSavedState();
  if (!saved.backendFoods || !hasFoodListChanged(saved.backendFoods)) return false;
  state.backendFoods = saved.backendFoods;
  return true;
}

function loadState() {
  const saved = readSavedState();
  const cachedCloudFoods = window.FitPlanSupabaseFoods?.readCachedFoods?.();
  const currentDate = todayKey();
  state.step = saved.step || "profile";
  state.mode = saved.mode || "calorie";
  state.dietMode = saved.dietMode || "general";
  state.cyclePattern = saved.cyclePattern || "3low1high";
  state.dietStartDate = saved.dietStartDate || new Date().toISOString();
  state.dietRatios = mergeDietRatios(saved.dietRatios);
  state.selectedDate = saved.selectedDate || currentDate;
  state.backendFoods = cachedCloudFoods?.foods || saved.backendFoods || structuredClone(defaultFoods);
  if (cachedCloudFoods?.foods?.length) {
    state.foodLibrarySync = {
      status: "cached",
      message: "先使用上次快取的 Supabase 食物庫。",
      fetchedAt: cachedCloudFoods.fetchedAt || null
    };
  }
  state.foods = saved.foods || saved.customFoods || [];
  state.logsByDate = saved.logsByDate || {};
  state.plansByDate = saved.plansByDate || {};
  state.planShuffleIndex = saved.planShuffleIndex || 0;
  if (!saved.logsByDate && saved.log?.length) {
    state.logsByDate[currentDate] = saved.log;
  }
  if (!saved.plansByDate && saved.plan?.length) {
    state.plansByDate[currentDate] = saved.plan;
  }
  state.log = currentLog();
  state.plan = currentPlan();

  const profile = saved.profile || {};
  ["height", "weight", "age", "sex", "activity", "goal"].forEach((id) => {
    if (profile[id]) $(id).value = profile[id];
  });
}

function saveState() {
  if (!hasCloudFoodLibrary()) syncBackendFoodsFromStorage();
  const profile = Object.fromEntries(["height", "weight", "age", "sex", "activity", "goal"].map((id) => [id, $(id).value]));
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      step: state.step,
      mode: state.mode,
      dietMode: state.dietMode,
      cyclePattern: state.cyclePattern,
      dietStartDate: state.dietStartDate,
      dietRatios: state.dietRatios,
      selectedDate: state.selectedDate,
      backendFoods: state.backendFoods,
      foods: state.foods,
      log: currentLog(),
      plan: currentPlan(),
      logsByDate: state.logsByDate,
      plansByDate: state.plansByDate,
      planShuffleIndex: state.planShuffleIndex,
      profile
    })
  );
}

async function syncCloudFoodLibrary() {
  if (!window.FitPlanSupabaseFoods) return;
  const result = await window.FitPlanSupabaseFoods.loadFoods(structuredClone(defaultFoods));
  state.foodLibrarySync = {
    status: result.status,
    message: result.message,
    fetchedAt: result.fetchedAt || null
  };
  if (Array.isArray(result.foods) && result.foods.length && hasFoodListChanged(result.foods)) {
    state.backendFoods = result.foods;
  }
  render();
  saveState();
}

function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mergeDietRatios(saved = {}) {
  return {
    general: { ...defaultDietRatios.general, ...(saved.general || {}) },
    carbDrop: { ...defaultDietRatios.carbDrop, ...(saved.carbDrop || {}) },
    keto: { ...defaultDietRatios.keto, ...(saved.keto || {}) },
    carbCycle: {
      low: { ...defaultDietRatios.carbCycle.low, ...((saved.carbCycle || {}).low || {}) },
      high: { ...defaultDietRatios.carbCycle.high, ...((saved.carbCycle || {}).high || {}) }
    }
  };
}

function ratioToTargets(weight, ratio, note) {
  const protein = weight * ratio.protein;
  const carbs = weight * ratio.carbs;
  const fat = weight * ratio.fat;
  return {
    calories: protein * 4 + carbs * 4 + fat * 9,
    protein,
    carbs,
    fat,
    note
  };
}

function generalTargets(profile) {
  const deficit = 400;
  const idealCalories = Math.max(1200, profile.tdee - deficit);
  const carbs = (idealCalories * 0.5) / 4;
  const protein = (idealCalories * 0.25) / 4;
  const fat = (idealCalories * 0.25) / 9;
  const calories = protein * 4 + carbs * 4 + fat * 9;
  return {
    calories,
    protein,
    carbs,
    fat,
    note: `理想熱量 TDEE - ${deficit} kcal`
  };
}

function getProfile() {
  const height = Number($("height").value) || 170;
  const weight = Number($("weight").value) || 70;
  const age = Number($("age").value) || 28;
  const sex = $("sex").value;
  const activity = Number($("activity").value) || 1.55;
  const goalPercent = Number($("goal").value) || 0;
  const sexOffset = sex === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
  const tdee = bmr * activity;
  const calorieTarget = tdee * (1 + goalPercent / 100);
  const proteinTarget = weight * 1.8;
  const fatTarget = weight * 0.8;
  const remainingCaloriesForCarbs = calorieTarget - proteinTarget * 4 - fatTarget * 9;
  const carbsTarget = Math.max(80, remainingCaloriesForCarbs / 4);
  return { height, weight, age, sex, activity, goalPercent, bmr, tdee, calorieTarget, proteinTarget, carbsTarget, fatTarget };
}

function totals(items = currentLog()) {
  return items.reduce(
    (sum, item) => {
      if (!isValidFoodEntry(item)) return sum;
      const multiplier = item.grams / 100;
      sum.calories += item.calories * multiplier;
      sum.protein += item.protein * multiplier;
      sum.carbs += item.carbs * multiplier;
      sum.fat += item.fat * multiplier;
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function isValidFoodEntry(item) {
  return Boolean(
    item &&
      item.name &&
      Number.isFinite(Number(item.grams)) &&
      Number.isFinite(Number(item.calories)) &&
      Number.isFinite(Number(item.protein)) &&
      Number.isFinite(Number(item.carbs)) &&
      Number.isFinite(Number(item.fat))
  );
}

function currentLog() {
  state.logsByDate[state.selectedDate] ||= [];
  return state.logsByDate[state.selectedDate];
}

function currentPlan() {
  state.plansByDate[state.selectedDate] ||= [];
  return state.plansByDate[state.selectedDate];
}

function macroTargets(profile = getProfile()) {
  const base = {
    calories: profile.calorieTarget,
    protein: profile.proteinTarget,
    carbs: profile.carbsTarget,
    fat: profile.fatTarget
  };

  if (state.dietMode === "carbDrop") {
    const started = new Date(state.dietStartDate);
    const elapsedMs = Date.now() - started.getTime();
    const week = Math.max(0, Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000)));
    const ratio = state.dietRatios.carbDrop;
    const carbs = Math.max(0, profile.weight * ratio.carbs - week * ratio.weeklyDrop);
    return {
      calories: profile.weight * ratio.protein * 4 + carbs * 4 + profile.weight * ratio.fat * 9,
      protein: profile.weight * ratio.protein,
      carbs,
      fat: profile.weight * ratio.fat,
      note: `第 ${week + 1} 週，碳水已下調 ${week * ratio.weeklyDrop}g`
    };
  }

  if (state.dietMode === "carbCycle") {
    const cycleLength = state.cyclePattern === "4low1high" ? 5 : 4;
    const highDayIndex = cycleLength - 1;
    const cycleStart = (state.dietStartDate || state.selectedDate).slice(0, 10);
    const dayIndex = daysBetween(cycleStart, state.selectedDate) % cycleLength;
    const isHighDay = dayIndex === highDayIndex;
    const ratio = isHighDay ? state.dietRatios.carbCycle.high : state.dietRatios.carbCycle.low;
    return ratioToTargets(profile.weight, ratio, isHighDay ? "所選日期是高碳日" : "所選日期是低碳日");
  }

  if (state.dietMode === "keto") {
    return ratioToTargets(profile.weight, state.dietRatios.keto, "使用自訂生酮比例");
  }

  return generalTargets(profile);
}

function formatFoodLine(item) {
  if (!isValidFoodEntry(item)) return "資料不完整";
  const multiplier = item.grams / 100;
  return `${round(item.calories * multiplier)} kcal · 蛋白質 ${round(item.protein * multiplier, 1)}g / 碳水 ${round(item.carbs * multiplier, 1)}g / 脂肪 ${round(item.fat * multiplier, 1)}g`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function allFoods() {
  return [...state.backendFoods, ...state.foods];
}

function foodCategoryLabel(food) {
  return categoryLabels[food.category] || "其他";
}

function formatFoodPer100(food) {
  return `蛋白質: ${food.protein}g | 碳水: ${food.carbs}g | 脂肪: ${food.fat}g | 熱量: ${food.calories}kcal (100g)`;
}

function selectedFood() {
  const foods = allFoods();
  return foods.find((food) => food.id === $("foodSelect").value) || foods[0];
}

function renderFoods() {
  const selectedFoodId = $("foodSelect").value;
  const backendOptions = state.backendFoods
    .map(
      (food) =>
        `<option value="${food.id}">${escapeHtml(food.name)} · ${food.calories} kcal/100g · 蛋白質 ${food.protein}g / 碳水 ${food.carbs}g / 脂肪 ${food.fat}g</option>`
    )
    .join("");
  const userOptions = state.foods
    .map(
      (food) =>
        `<option value="${food.id}">${escapeHtml(food.name)} · ${food.calories} kcal/100g · 蛋白質 ${food.protein}g / 碳水 ${food.carbs}g / 脂肪 ${food.fat}g</option>`
    )
    .join("");
  $("foodSelect").innerHTML = allFoods().length
    ? `${backendOptions ? `<optgroup label="內建食物庫">${backendOptions}</optgroup>` : ""}${userOptions ? `<optgroup label="我的食物資料庫">${userOptions}</optgroup>` : ""}`
    : `<option value="">請先新增後台或個人食物</option>`;
  if (selectedFoodId && allFoods().some((food) => food.id === selectedFoodId)) {
    $("foodSelect").value = selectedFoodId;
  }
  $("foodSelect").disabled = allFoods().length === 0;
  $("addLogBtn").disabled = allFoods().length === 0;
  $("foodPickerBtn").disabled = allFoods().length === 0;

  const food = selectedFood();
  $("selectedFoodName").textContent = food ? food.name : "沒有可選食物";
  $("selectedFoodMacros").textContent = food ? formatFoodPer100(food) : "請先新增後台或個人食物";
}

function renderFoodPicker() {
  const foods = allFoods();
  const selectedId = selectedFood()?.id;
  $("foodPickerCount").textContent = `${foods.length} 項`;
  $("foodPickerList").innerHTML = foods.length
    ? foods
        .map(
          (food) => `
        <button class="food-option-card${food.id === selectedId ? " is-active" : ""}" type="button" data-select-food="${food.id}">
          <span class="food-option-accent" aria-hidden="true"></span>
          <span>
            <strong>${escapeHtml(food.name)}</strong>
            <small>${foodCategoryLabel(food)}</small>
            <em>${formatFoodPer100(food)}</em>
          </span>
        </button>`
        )
        .join("")
    : `<div class="empty compact-empty">食物庫目前沒有資料。先新增食物後就能選取。</div>`;
}

function renderFoodLibrary() {
  const foods = allFoods();
  const groups = foods.reduce((result, food) => {
    const key = food.category || "other";
    result[key] ||= [];
    result[key].push(food);
    return result;
  }, {});
  const orderedKeys = [...Object.keys(categoryLabels), ...Object.keys(groups).filter((key) => !categoryLabels[key])].filter((key) => groups[key]?.length);

  $("foodLibrarySummary").textContent = `${foods.length} 項`;
  if ($("foodLibrarySyncStatus")) {
    const fetchedText = state.foodLibrarySync.fetchedAt ? ` · ${new Date(state.foodLibrarySync.fetchedAt).toLocaleString("zh-TW")}` : "";
    $("foodLibrarySyncStatus").textContent = `${state.foodLibrarySync.message}${fetchedText}`;
  }
  $("foodLibraryList").innerHTML = foods.length
    ? orderedKeys
        .map(
          (key) => `
        <section class="library-group">
          <div class="library-group-title">
            <strong>${categoryLabels[key] || "其他"}</strong>
            <span>${groups[key].length} 項</span>
          </div>
          <div class="library-card-list">
            ${groups[key]
              .map(
                (food) => `
              <article class="library-food-card">
                <strong>${escapeHtml(food.name)}</strong>
                <span>${formatFoodPer100(food)}</span>
              </article>`
              )
              .join("")}
          </div>
        </section>`
        )
        .join("")
    : `<div class="empty">食物庫目前沒有資料。新增自訂食物後會顯示在這裡。</div>`;
}

function openFoodPicker() {
  $("foodPickerPanel").hidden = false;
  $("foodPickerBtn").setAttribute("aria-expanded", "true");
  renderFoodPicker();
}

function closeFoodPicker() {
  $("foodPickerPanel").hidden = true;
  $("foodPickerBtn").setAttribute("aria-expanded", "false");
}

function renderFoodDatabase() {
  $("foodDatabase").innerHTML = state.foods.length
    ? state.foods
        .map(
          (food) => `
        <div class="food-item database-item">
          <div>
            <strong>${escapeHtml(food.name)}</strong>
            <span>${food.calories} kcal/100g · 蛋白質 ${food.protein}g / 碳水 ${food.carbs}g / 脂肪 ${food.fat}g</span>
          </div>
          <div class="database-actions">
            <button type="button" data-edit-food="${food.id}">編輯</button>
            <button type="button" data-delete-food="${food.id}">刪除</button>
          </div>
        </div>`
        )
        .join("")
    : `<div class="empty compact-empty">資料庫還沒有食物。先新增常吃的食物，之後就能從下拉選單選取。</div>`;
}

function goToStep(step) {
  state.step = step;
  document.body.dataset.step = step;

  const viewByStep = {
    profile: "profileView",
    mode: "modeView",
    dashboard: "dashboardView",
    foodLibrary: "foodLibraryView"
  };

  document.querySelectorAll(".flow-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewByStep[step]);
  });

  document.querySelectorAll("[data-step-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", dot.dataset.stepDot === step);
  });

  if (step === "dashboard" || step === "foodLibrary") {
    render();
  } else {
    saveState();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  $("modeCopy").textContent = modeText[mode];
  saveState();
  render();
}

function setDietMode(dietMode, resetStartDate = false) {
  state.dietMode = dietMode;
  if (resetStartDate || !state.dietStartDate) {
    state.dietStartDate = `${state.selectedDate}T00:00:00.000Z`;
  }
  document.querySelectorAll(".diet-mode").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dietMode === dietMode);
  });
  $("cycleSetting").hidden = dietMode !== "carbCycle";
  $("singleRatioControls").hidden = dietMode === "carbCycle" || dietMode === "general";
  $("cycleRatioControls").hidden = dietMode !== "carbCycle";
  $("ratioPanelTitle").textContent = dietMode === "general" ? "理想熱量" : "自訂比例";
  $("ratioPanelCopy").textContent =
    dietMode === "general" ? "以 TDEE 減少 300 至 500 kcal，並用熱量比例 5:2.5:2.5 自動分配。" : "依每公斤體重換算每日營養目標。";
  $("ratioCarbsLabel").hidden = false;
  $("generalDeficitSetting").hidden = true;
  $("weeklyDropSetting").hidden = dietMode !== "carbDrop";
  $("dietModeCopy").textContent = dietModeText[dietMode];
  syncRatioInputs();
  saveState();
  render();
}

function syncRatioInputs() {
  const ratio = state.dietRatios[state.dietMode] || state.dietRatios.general;
  if (state.dietMode !== "carbCycle") {
    $("ratioProtein").value = ratio.protein;
    $("ratioCarbs").value = ratio.carbs;
    $("ratioFat").value = ratio.fat;
    $("generalDeficit").value = state.dietRatios.general.deficit;
    $("weeklyCarbDrop").value = ratio.weeklyDrop || defaultDietRatios.carbDrop.weeklyDrop;
  }
  $("lowCarbs").value = state.dietRatios.carbCycle.low.carbs;
  $("lowProtein").value = state.dietRatios.carbCycle.low.protein;
  $("lowFat").value = state.dietRatios.carbCycle.low.fat;
  $("highCarbs").value = state.dietRatios.carbCycle.high.carbs;
  $("highProtein").value = state.dietRatios.carbCycle.high.protein;
  $("highFat").value = state.dietRatios.carbCycle.high.fat;
}

function readRatioInputs() {
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
  } else {
    state.dietRatios[state.dietMode] = {
      ...state.dietRatios[state.dietMode],
      protein: Number($("ratioProtein").value) || 0,
      carbs: Number($("ratioCarbs").value) || 0,
      fat: Number($("ratioFat").value) || 0
    };
    if (state.dietMode === "general") {
      state.dietRatios.general.deficit = clamp(Number($("generalDeficit").value) || defaultDietRatios.general.deficit, 300, 500);
      $("generalDeficit").value = state.dietRatios.general.deficit;
    }
    if (state.dietMode === "carbDrop") {
      state.dietRatios.carbDrop.weeklyDrop = Number($("weeklyCarbDrop").value) || 0;
    }
  }
  render();
}

function renderProgress() {
  const profile = getProfile();
  const target = macroTargets(profile);
  const eaten = totals(currentLog());
  const caloriePercent = Math.min(100, (eaten.calories / target.calories) * 100 || 0);
  const proteinPercent = Math.min(100, (eaten.protein / target.protein) * 100 || 0);
  const carbsPercent = Math.min(100, (eaten.carbs / target.carbs) * 100 || 0);
  const fatPercent = Math.min(100, (eaten.fat / target.fat) * 100 || 0);

  $("bmrValue").textContent = round(profile.bmr);
  $("tdeeValue").textContent = round(profile.tdee);
  $("modeBmrValue").textContent = round(profile.bmr);
  $("modeTdeeValue").textContent = round(profile.tdee);
  $("targetValue").textContent = round(target.calories);
  const proteinKcal = target.protein * 4;
  const carbsKcal = target.carbs * 4;
  const fatKcal = target.fat * 9;
  const ratioText = state.dietMode === "general" ? `，熱量比例 C ${round((carbsKcal / target.calories) * 100)}% / P ${round((proteinKcal / target.calories) * 100)}% / F ${round((fatKcal / target.calories) * 100)}%` : "";
  $("ratioPreview").textContent = `目前目標：蛋白質 ${round(target.protein, 1)}g，碳水 ${round(target.carbs, 1)}g，脂肪 ${round(target.fat, 1)}g，約 ${round(target.calories)} kcal${ratioText}`;
  $("calorieConsumed").textContent = round(eaten.calories);
  document.querySelector(".calorie-ring").style.setProperty("--progress", caloriePercent);
  $("proteinText").textContent = `${round(eaten.protein, 1)} / ${round(target.protein)} g`;
  $("carbsText").textContent = `${round(eaten.carbs, 1)} / ${round(target.carbs)} g`;
  $("fatText").textContent = `${round(eaten.fat, 1)} / ${round(target.fat)} g`;
  $("proteinBar").style.width = `${proteinPercent}%`;
  $("carbsBar").style.width = `${carbsPercent}%`;
  $("fatBar").style.width = `${fatPercent}%`;

  const remaining = {
    calories: target.calories - eaten.calories,
    protein: target.protein - eaten.protein,
    carbs: target.carbs - eaten.carbs,
    fat: target.fat - eaten.fat
  };
  const calorieText = remaining.calories >= 0 ? `還差 ${round(remaining.calories)} kcal` : `已超過 ${Math.abs(round(remaining.calories))} kcal`;
  const macroText = `蛋白質 ${remaining.protein >= 0 ? "還差" : "超過"} ${Math.abs(round(remaining.protein, 1))}g，碳水 ${remaining.carbs >= 0 ? "還差" : "超過"} ${Math.abs(round(remaining.carbs, 1))}g，脂肪 ${remaining.fat >= 0 ? "還差" : "超過"} ${Math.abs(round(remaining.fat, 1))}g`;

  $("remainingText").textContent = state.mode === "calorie" ? calorieText : state.mode === "macro" ? macroText : `${calorieText}；${macroText}`;
  $("statusText").textContent = caloriePercent < 80 ? "仍有空間" : caloriePercent <= 110 ? "接近目標" : "今日偏高";
}

function renderLog() {
  const log = currentLog();
  $("logTitle").textContent = state.selectedDate === todayKey() ? "今日紀錄" : "歷史紀錄";
  $("foodLog").innerHTML = log.length
    ? log
        .map(
          (item) => `
        <div class="food-item">
          <div>
            <strong>${item.name} · ${item.grams}g</strong>
            <span>${formatFoodLine(item)}</span>
          </div>
          <button type="button" aria-label="刪除 ${item.name}" data-remove="${item.entryId}">×</button>
        </div>`
        )
        .join("")
    : `<div class="empty">還沒有紀錄。先新增一項食物，儀表板就會開始計算。</div>`;
}

function renderPlan() {
  const plan = currentPlan().filter(isValidFoodEntry);
  if (plan.length !== currentPlan().length) {
    state.plansByDate[state.selectedDate] = plan;
  }
  const planTotals = totals(plan);
  $("planSummary").textContent = plan.length ? `${round(planTotals.calories)} kcal` : "尚未產生";
  $("mealPlan").innerHTML = plan.length
    ? plan
        .map(
          (item) => `
        <div class="food-item">
          <div>
            <strong>${item.name} · ${item.grams}g</strong>
            <span>${formatFoodLine(item)}</span>
          </div>
        </div>`
        )
        .join("")
    : allFoods().length
      ? `<div class="empty">按下產生建議菜單，系統會依你的目標挑選資料庫食物並估算份量。</div>`
      : `<div class="empty">先新增後台或個人食物，系統才能產生建議菜單。</div>`;
}

function render() {
  state.log = currentLog();
  state.plan = currentPlan();
  $("logDate").value = state.selectedDate;
  $("todayLabel").textContent = new Intl.DateTimeFormat("zh-Hant-TW", {
    dateStyle: "full"
  }).format(new Date(`${state.selectedDate}T00:00:00`));
  $("dashboardTitle").textContent = dietModeLabel[state.dietMode];
  renderProgress();
  renderLog();
  renderPlan();
  renderFoods();
  renderFoodPicker();
  renderFoodLibrary();
  renderFoodDatabase();
  saveState();
}

function addFoodToLog(foodId, grams) {
  const food = allFoods().find((item) => item.id === foodId);
  if (!food || !grams) return;
  currentLog().push({ ...food, grams, entryId: crypto.randomUUID() });
  render();
}

function resetFoodForm() {
  $("customId").value = "";
  $("customForm").reset();
  $("customServingGrams").value = 100;
  $("customProtein").value = 0;
  $("customCarbs").value = 0;
  $("customFat").value = 0;
}

function fillFoodForm(food) {
  $("customId").value = food.id;
  $("customName").value = food.name;
  $("customServingGrams").value = 100;
  $("customProtein").value = food.protein;
  $("customCarbs").value = food.carbs;
  $("customFat").value = food.fat;
  $("customForm").hidden = false;
}

function generatePlan() {
  const foods = allFoods().filter((food) => food.name && Number(food.calories) > 0 && Number.isFinite(Number(food.protein)) && Number.isFinite(Number(food.carbs)) && Number.isFinite(Number(food.fat)));
  if (!foods.length) {
    state.plansByDate[state.selectedDate] = [];
    render();
    return;
  }
  const target = macroTargets();
  const existing = totals(currentLog());
  const remaining = {
    calories: Math.max(0, target.calories - existing.calories),
    protein: Math.max(0, target.protein - existing.protein),
    carbs: Math.max(0, target.carbs - existing.carbs),
    fat: Math.max(0, target.fat - existing.fat)
  };

  if (remaining.calories < 80 && remaining.protein < 8 && remaining.carbs < 10 && remaining.fat < 5) {
    state.plansByDate[state.selectedDate] = [];
    render();
    return;
  }

  const usedIds = new Set();
  const plan = [];
  const macroDensity = (food, macro) => Number(food[macro]) / Math.max(1, Number(food.calories));
  const choose = (candidates) => {
    const usable = candidates.filter((food) => !usedIds.has(food.id));
    if (!usable.length) return null;
    return usable[state.planShuffleIndex % Math.min(usable.length, 5)];
  };
  const addFood = (food, grams) => {
    if (!food || !Number.isFinite(grams) || grams <= 0 || usedIds.has(food.id)) return;
    const item = { ...food, grams: round(grams) };
    if (!isValidFoodEntry(item)) return;
    plan.push(item);
    usedIds.add(food.id);
    const eaten = totals([item]);
    remaining.calories = Math.max(0, remaining.calories - eaten.calories);
    remaining.protein = Math.max(0, remaining.protein - eaten.protein);
    remaining.carbs = Math.max(0, remaining.carbs - eaten.carbs);
    remaining.fat = Math.max(0, remaining.fat - eaten.fat);
  };
  const gramsByMacro = (food, macro, targetGrams, min = 60, max = 260) => {
    const macroPer100g = Number(food[macro]);
    if (macroPer100g <= 0) return 0;
    const byMacro = (targetGrams * 100) / macroPer100g;
    const byCalories = remaining.calories > 0 ? (remaining.calories * 100) / Math.max(1, food.calories) : byMacro;
    return Math.min(max, Math.max(min, Math.min(byMacro, byCalories)));
  };

  if (remaining.protein >= 8) {
    const proteinFood = choose([...foods].filter((food) => food.protein > 0).sort((a, b) => macroDensity(b, "protein") - macroDensity(a, "protein")));
    addFood(proteinFood, gramsByMacro(proteinFood, "protein", remaining.protein * 0.75, 80, 260));
  }

  if (state.dietMode !== "keto" && remaining.carbs >= 10) {
    const carbFood = choose([...foods].filter((food) => food.carbs > 0).sort((a, b) => macroDensity(b, "carbs") - macroDensity(a, "carbs")));
    addFood(carbFood, gramsByMacro(carbFood, "carbs", remaining.carbs * 0.8, 60, 360));
  }

  if (remaining.fat >= 5) {
    const fatFood = choose([...foods].filter((food) => food.fat > 0).sort((a, b) => macroDensity(b, "fat") - macroDensity(a, "fat")));
    addFood(fatFood, gramsByMacro(fatFood, "fat", remaining.fat * 0.7, 40, 140));
  }

  if (remaining.calories >= 120 && plan.length < 4) {
    const balancedFood = choose([...foods].sort((a, b) => Math.abs(a.calories - remaining.calories / 2) - Math.abs(b.calories - remaining.calories / 2)));
    const grams = Math.min(220, Math.max(60, (remaining.calories * 100) / Math.max(1, balancedFood?.calories || 1)));
    addFood(balancedFood, grams);
  }

  state.plansByDate[state.selectedDate] = plan.map((item) => ({ ...item, entryId: crypto.randomUUID() }));
  render();
}

function replacePlan() {
  state.planShuffleIndex += 1;
  generatePlan();
}

function clearPlan() {
  state.plansByDate[state.selectedDate] = [];
  render();
}

function bindEvents() {
  $("todayLabel").textContent = new Intl.DateTimeFormat("zh-Hant-TW", {
    dateStyle: "full"
  }).format(new Date());
  $("logDate").value = state.selectedDate;
  $("logDate").addEventListener("change", (event) => {
    state.selectedDate = event.target.value || todayKey();
    render();
  });

  ["height", "weight", "age", "sex", "activity", "goal"].forEach((id) => {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  });

  $("profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    goToStep("mode");
  });

  document.querySelectorAll(".mode").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  document.querySelectorAll(".diet-mode").forEach((button) => {
    button.addEventListener("click", () => setDietMode(button.dataset.dietMode, button.dataset.dietMode === "carbDrop" || button.dataset.dietMode === "carbCycle"));
  });

  $("cyclePattern").value = state.cyclePattern;
  $("cyclePattern").addEventListener("change", (event) => {
    state.cyclePattern = event.target.value;
    saveState();
    render();
  });

  [
    "ratioProtein",
    "ratioCarbs",
    "ratioFat",
    "generalDeficit",
    "weeklyCarbDrop",
    "lowCarbs",
    "lowProtein",
    "lowFat",
    "highCarbs",
    "highProtein",
    "highFat"
  ].forEach((id) => {
    $(id).addEventListener("input", readRatioInputs);
    $(id).addEventListener("change", readRatioInputs);
  });

  $("backToProfileBtn").addEventListener("click", () => goToStep("profile"));
  $("enterDashboardBtn").addEventListener("click", () => goToStep("dashboard"));
  $("settingsMenuBtn").addEventListener("click", () => {
    const menu = $("settingsMenu");
    menu.hidden = !menu.hidden;
    $("settingsMenuBtn").setAttribute("aria-expanded", String(!menu.hidden));
  });
  $("editProfileBtn").addEventListener("click", () => {
    $("settingsMenu").hidden = true;
    $("settingsMenuBtn").setAttribute("aria-expanded", "false");
    goToStep("profile");
  });
  $("foodLibraryMenuBtn").addEventListener("click", () => {
    $("settingsMenu").hidden = true;
    $("settingsMenuBtn").setAttribute("aria-expanded", "false");
    goToStep("foodLibrary");
  });
  $("backToDashboardBtn").addEventListener("click", () => goToStep("dashboard"));
  document.addEventListener("click", (event) => {
    if (!$("settingsMenu").hidden && !event.target.closest(".settings-menu")) {
      $("settingsMenu").hidden = true;
      $("settingsMenuBtn").setAttribute("aria-expanded", "false");
    }
  });

  $("foodPickerBtn").addEventListener("click", () => {
    if ($("foodPickerPanel").hidden) {
      openFoodPicker();
    } else {
      closeFoodPicker();
    }
  });
  $("closeFoodPickerBtn").addEventListener("click", closeFoodPicker);
  $("foodPickerList").addEventListener("click", (event) => {
    const option = event.target.closest("[data-select-food]");
    if (!option) return;
    $("foodSelect").value = option.dataset.selectFood;
    renderFoods();
    renderFoodPicker();
    closeFoodPicker();
  });
  $("foodSelect").addEventListener("change", () => {
    renderFoods();
    renderFoodPicker();
  });
  document.addEventListener("click", (event) => {
    if (!$("foodPickerPanel").hidden && !event.target.closest(".logger-panel")) {
      closeFoodPicker();
    }
  });

  $("logForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addFoodToLog($("foodSelect").value, Number($("grams").value));
    $("grams").value = 100;
  });

  $("foodLog").addEventListener("click", (event) => {
    const removeId = event.target.dataset.remove;
    if (!removeId) return;
    state.logsByDate[state.selectedDate] = currentLog().filter((item) => item.entryId !== removeId);
    render();
  });

  $("customToggle").addEventListener("click", () => {
    $("customForm").hidden = !$("customForm").hidden;
  });

  $("customForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("customName").value.trim();
    if (!name) return;
    const servingGrams = Number($("customServingGrams").value) || 100;
    const multiplier = 100 / servingGrams;
    const protein = (Number($("customProtein").value) || 0) * multiplier;
    const carbs = (Number($("customCarbs").value) || 0) * multiplier;
    const fat = (Number($("customFat").value) || 0) * multiplier;
    const food = {
      id: $("customId").value || `food-${Date.now()}`,
      name,
      protein: round(protein, 1),
      carbs: round(carbs, 1),
      fat: round(fat, 1),
      category: "user"
    };
    food.calories = round(food.protein * 4 + food.carbs * 4 + food.fat * 9);
    const existingIndex = state.foods.findIndex((item) => item.id === food.id);
    if (existingIndex >= 0) {
      state.foods[existingIndex] = food;
    } else {
      state.foods.push(food);
    }
    resetFoodForm();
    render();
  });

  $("cancelFoodEditBtn").addEventListener("click", resetFoodForm);

  $("foodDatabase").addEventListener("click", (event) => {
    const editId = event.target.dataset.editFood;
    const deleteId = event.target.dataset.deleteFood;
    if (editId) {
      const food = state.foods.find((item) => item.id === editId);
      if (food) fillFoodForm(food);
    }
    if (deleteId) {
      state.foods = state.foods.filter((item) => item.id !== deleteId);
      resetFoodForm();
      render();
    }
  });

  $("planBtn").addEventListener("click", generatePlan);
  $("replacePlanBtn").addEventListener("click", replacePlan);
  $("clearPlanBtn").addEventListener("click", clearPlan);
  $("clearLogBtn").addEventListener("click", () => {
    state.logsByDate[state.selectedDate] = [];
    render();
  });
  $("resetBtn").addEventListener("click", () => {
    state.logsByDate[state.selectedDate] = [];
    state.plansByDate[state.selectedDate] = [];
    render();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey || !syncBackendFoodsFromStorage()) return;
    render();
  });

  syncChannel?.addEventListener("message", (event) => {
    if (event.data?.type !== "backend-foods-updated" || !syncBackendFoodsFromStorage()) return;
    render();
  });
}

function setupPwa() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (isStandalone) return;

  const installPanel = document.createElement("section");
  installPanel.className = "pwa-install";
  installPanel.setAttribute("aria-label", "安裝 FitPlan");
  installPanel.innerHTML = `
    <div>
      <strong>把 FitPlan 加到手機</strong>
      <span data-pwa-help>Android 可直接安裝；iPhone 請用分享選單加入主畫面。</span>
    </div>
    <button class="secondary-button" type="button" data-pwa-install hidden>安裝</button>
    <button class="icon-button" type="button" data-pwa-close aria-label="關閉安裝提示">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  `;
  document.body.append(installPanel);

  const installButton = installPanel.querySelector("[data-pwa-install]");
  const helpText = installPanel.querySelector("[data-pwa-help]");
  let deferredPrompt;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
    helpText.textContent = "可安裝成手機 App，之後也能離線開啟基本功能。";
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = undefined;
    installPanel.remove();
  });

  installPanel.querySelector("[data-pwa-close]").addEventListener("click", () => {
    installPanel.remove();
  });
}

function setupPwaPrompt() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.warn("Service worker registration failed", error);
      });
    });
  }

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (isStandalone) return;

  let deferredPrompt;
  let installPanel;

  const createInstallPanel = ({ showButton = false, text = "Android 可直接安裝；iPhone 請用分享選單加入主畫面。" } = {}) => {
    if (installPanel) return installPanel;
    installPanel = document.createElement("section");
    installPanel.className = "pwa-install";
    installPanel.setAttribute("aria-label", "安裝 FitPlan");
    installPanel.innerHTML = `
      <div>
        <strong>把 FitPlan 加到手機</strong>
        <span data-pwa-help>${text}</span>
      </div>
      <button class="secondary-button" type="button" data-pwa-install ${showButton ? "" : "hidden"}>安裝</button>
      <button class="icon-button" type="button" data-pwa-close aria-label="關閉安裝提示">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    `;
    document.body.append(installPanel);

    installPanel.querySelector("[data-pwa-install]").addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = undefined;
      installPanel.remove();
      installPanel = undefined;
    });

    installPanel.querySelector("[data-pwa-close]").addEventListener("click", () => {
      installPanel.remove();
      installPanel = undefined;
    });

    return installPanel;
  };

  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
    createInstallPanel();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    const panel = createInstallPanel({
      showButton: true,
      text: "可安裝成手機 App，之後也能離線開啟基本功能。"
    });
    panel.querySelector("[data-pwa-install]").hidden = false;
    panel.querySelector("[data-pwa-help]").textContent = "可安裝成手機 App，之後也能離線開啟基本功能。";
  });
}

loadState();
bindEvents();
setupPwaPrompt();
renderFoods();
setMode(state.mode);
setDietMode(state.dietMode);
goToStep(state.step);
syncCloudFoodLibrary();
