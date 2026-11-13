(function (root) {
  const storageKey = "fitplan-state-v1";

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

  const defaultExercises = [
    { id: "squat", name: "深蹲", muscle: "腿" },
    { id: "bench", name: "臥推", muscle: "胸" },
    { id: "deadlift", name: "傳統硬舉", muscle: "背" },
    { id: "ohp", name: "肩推", muscle: "肩" },
    { id: "row", name: "槓鈴划船", muscle: "背" },
    { id: "rdl", name: "羅馬尼亞硬舉", muscle: "腿" },
    { id: "pullup", name: "引體向上", muscle: "背" },
    { id: "lat-pulldown", name: "滑輪下拉", muscle: "背" },
    { id: "leg-press", name: "腿推", muscle: "腿" },
    { id: "lunge", name: "弓步蹲", muscle: "腿" },
    { id: "curl", name: "啞鈴彎舉", muscle: "手臂" },
    { id: "tricep", name: "三頭下壓", muscle: "手臂" },
    { id: "lateral-raise", name: "側平舉", muscle: "肩" },
    { id: "face-pull", name: "面拉", muscle: "肩" },
    { id: "crunch", name: "捲腹", muscle: "核心" }
  ];

  const defaultDietRatios = {
    general: { protein: 1.8, carbs: 3, fat: 0.8, deficit: 400 },
    carbDrop: { protein: 1.8, carbs: 3, fat: 0.8, weeklyDrop: 30 },
    keto: { protein: 2, carbs: 0.35, fat: 1.6 },
    carbCycle: {
      low: { carbs: 1.5, protein: 1.8, fat: 0.8 },
      high: { carbs: 5, protein: 1, fat: 0.3 }
    }
  };

  const categoryLabels = {
    protein: "蛋白質",
    carb: "碳水",
    veg: "蔬菜",
    fat: "脂肪",
    drink: "飲品",
    user: "自訂"
  };

  const dietModeLabel = {
    general: "一般紀錄",
    carbDrop: "碳水漸降",
    carbCycle: "碳循環",
    keto: "生酮飲食"
  };

  const modeText = {
    calorie: "優先看今日熱量是否接近目標。",
    macro: "優先看蛋白質、碳水與脂肪還差多少。",
    balanced: "同時看總熱量與三大營養素。"
  };

  const dietModeText = {
    general: "一般紀錄直接給出理想熱量，並以碳水 50%、蛋白質 25%、脂肪 25% 分配。",
    carbDrop: "碳水漸降會固定蛋白質與脂肪，並以開始日期為基準每週把碳水下調。",
    carbCycle: "碳循環會依照節奏切換低碳日與高碳日。低碳日控碳，高碳日提高碳水並降低脂肪。",
    keto: "生酮飲食會把碳水壓到很低，主要用蛋白質與脂肪補足今日熱量。"
  };

  const paletteIds = ["forest", "indigo", "crimson", "lime"];

  function normalizePalette(value) {
    return paletteIds.includes(value) ? value : "forest";
  }

  const stepMap = {
    profile: "settings",
    mode: "settings",
    dashboard: "today",
    foodLibrary: "foods",
    today: "today",
    diet: "diet",
    train: "train",
    progress: "progress",
    settings: "settings",
    foods: "foods"
  };

  let idCounter = 0;

  function createId(prefix) {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function round(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round(Number(value) * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(dateKey, days) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return todayKey(date);
  }

  function daysBetween(startDate, endDate) {
    const start = new Date(`${String(startDate).slice(0, 10)}T00:00:00`);
    const end = new Date(`${String(endDate).slice(0, 10)}T00:00:00`);
    return Math.max(0, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
  }

  function clampDeficit(value) {
    return clamp(Math.round(Number(value) || defaultDietRatios.general.deficit), 300, 500);
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

  function normalizeProfile(profile = {}, goalOverride) {
    const activities = ["1.2", "1.375", "1.55", "1.725", "1.9"];
    const activity = activities.includes(String(profile.activity)) ? String(profile.activity) : "1.55";
    const goalSource = goalOverride ?? profile.goal;
    const goal = ["-15", "0", "10"].includes(String(goalSource)) ? String(goalSource) : "-15";
    return {
      height: String(profile.height || "170"),
      weight: String(profile.weight || "70"),
      age: String(profile.age || "28"),
      sex: profile.sex === "female" ? "female" : "male",
      activity,
      goal
    };
  }

  function cloneEntries(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([date, entries]) => {
      if (!Array.isArray(entries)) return;
      result[date] = entries.filter((item) => item && typeof item === "object");
    });
    return result;
  }

  function sanitizeWorkouts(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([date, entries]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(entries)) return;
      const clean = entries.map(sanitizeWorkoutEntry).filter(Boolean);
      if (clean.length) result[date] = clean;
    });
    return result;
  }

  function sanitizeWorkoutEntry(entry) {
    if (!entry || typeof entry !== "object" || !entry.exerciseId) return null;
    const sets = Array.isArray(entry.sets) ? entry.sets.map(sanitizeSet).filter(Boolean) : [];
    if (!sets.length) return null;
    return {
      id: String(entry.id || createId("wo")),
      exerciseId: String(entry.exerciseId),
      name: String(entry.name || "動作"),
      sets
    };
  }

  function sanitizeSet(set) {
    const reps = Math.round(Number(set?.reps));
    const weight = Number(set?.weight);
    if (!Number.isFinite(reps) || reps < 1 || reps > 100) return null;
    if (!Number.isFinite(weight) || weight < 0 || weight > 500) return null;
    return {
      id: String(set.id || createId("set")),
      reps,
      weight: round(weight, 1)
    };
  }

  function sanitizeWeightLog(value) {
    if (!Array.isArray(value)) return [];
    const byDate = new Map();
    value.forEach((entry) => {
      if (!entry || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || ""))) return;
      const kg = round(Number(entry.kg), 1);
      if (!Number.isFinite(kg) || kg < 20 || kg > 400) return;
      byDate.set(entry.date, { id: String(entry.id || createId("wt")), date: entry.date, kg });
    });
    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  function migrateSaved(saved = {}, options = {}) {
    const source = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    const now = options.now || new Date();
    const today = todayKey(now);
    const isLegacy = !source.version || Number(source.version) < 2;
    let legacyGoalNote = Boolean(source.legacyGoalNote);
    let goalOverride;
    if (isLegacy && source.profile && String(source.profile.goal) === "0") {
      goalOverride = "-15";
      legacyGoalNote = true;
    }

    const logsByDate = cloneEntries(source.logsByDate);
    if (!source.logsByDate && Array.isArray(source.log) && source.log.length) {
      logsByDate[today] = source.log.filter((item) => item && typeof item === "object");
    }
    const plansByDate = cloneEntries(source.plansByDate);
    if (!source.plansByDate && Array.isArray(source.plan) && source.plan.length) {
      plansByDate[today] = source.plan.filter((item) => item && typeof item === "object");
    }

    const foods = Array.isArray(source.foods)
      ? source.foods
      : Array.isArray(source.customFoods)
        ? source.customFoods
        : [];

    return {
      version: 2,
      step: stepMap[source.step] || "today",
      mode: modeText[source.mode] ? source.mode : "calorie",
      dietMode: dietModeLabel[source.dietMode] ? source.dietMode : "general",
      cyclePattern: source.cyclePattern === "4low1high" ? "4low1high" : "3low1high",
      dietStartDate: source.dietStartDate || `${today}T00:00:00.000Z`,
      dietRatios: mergeDietRatios(source.dietRatios),
      selectedDate: today,
      backendFoods: Array.isArray(source.backendFoods) ? source.backendFoods : structuredClone(defaultFoods),
      foods: foods.filter((food) => food && typeof food === "object" && food.name),
      logsByDate,
      plansByDate,
      planShuffleIndex: Number(source.planShuffleIndex) || 0,
      profile: normalizeProfile(source.profile || {}, goalOverride),
      favoriteFoodIds: Array.isArray(source.favoriteFoodIds) ? source.favoriteFoodIds.map(String) : [],
      weightLog: sanitizeWeightLog(source.weightLog),
      workoutsByDate: sanitizeWorkouts(source.workoutsByDate),
      customExercises: Array.isArray(source.customExercises)
        ? source.customExercises.filter((item) => item && item.id && item.name)
        : [],
      theme: ["system", "light", "dark"].includes(source.theme) ? source.theme : "system",
      palette: normalizePalette(source.palette),
      profileTouched: isLegacy ? Boolean(source.profile) : Boolean(source.profileTouched),
      hintDismissed: Boolean(source.hintDismissed),
      legacyGoalNote
    };
  }

  function serializeState(state) {
    const selectedDate = state.selectedDate || todayKey();
    return {
      version: 2,
      step: state.step,
      mode: state.mode,
      dietMode: state.dietMode,
      cyclePattern: state.cyclePattern,
      dietStartDate: state.dietStartDate,
      dietRatios: state.dietRatios,
      selectedDate,
      backendFoods: state.backendFoods,
      foods: state.foods,
      logsByDate: state.logsByDate,
      plansByDate: state.plansByDate,
      planShuffleIndex: state.planShuffleIndex,
      profile: state.profile,
      favoriteFoodIds: state.favoriteFoodIds,
      weightLog: state.weightLog,
      workoutsByDate: state.workoutsByDate,
      customExercises: state.customExercises,
      theme: state.theme,
      palette: normalizePalette(state.palette),
      profileTouched: state.profileTouched,
      hintDismissed: state.hintDismissed,
      legacyGoalNote: state.legacyGoalNote,
      log: state.logsByDate?.[selectedDate] || [],
      plan: state.plansByDate?.[selectedDate] || []
    };
  }

  function profileMetrics(profile = {}) {
    const height = Number(profile.height) || 170;
    const weight = Number(profile.weight) || 70;
    const age = Number(profile.age) || 28;
    const sex = profile.sex === "female" ? "female" : "male";
    const activity = Number(profile.activity) || 1.55;
    const goalPercent = Number(profile.goal);
    const sexOffset = sex === "male" ? 5 : -161;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
    const tdee = bmr * activity;
    return {
      height,
      weight,
      age,
      sex,
      activity,
      goal: ["-15", "0", "10"].includes(String(profile.goal)) ? String(profile.goal) : "-15",
      goalPercent: Number.isFinite(goalPercent) ? goalPercent : -15,
      bmr,
      tdee
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

  function generalTargets(metrics, ratios) {
    const deficit = clampDeficit(ratios?.deficit);
    let idealCalories = metrics.tdee;
    let note = "維持：等於 TDEE";
    if (metrics.goal === "10") {
      idealCalories = metrics.tdee * 1.1;
      note = "增肌：TDEE +10%";
    } else if (metrics.goal === "-15") {
      idealCalories = Math.max(1200, metrics.tdee - deficit);
      note = `減脂：TDEE - ${deficit} kcal`;
    }
    const carbs = (idealCalories * 0.5) / 4;
    const protein = (idealCalories * 0.25) / 4;
    const fat = (idealCalories * 0.25) / 9;
    return {
      calories: protein * 4 + carbs * 4 + fat * 9,
      protein,
      carbs,
      fat,
      note
    };
  }

  function carbCycleDayInfo({ cyclePattern, dietStartDate, dateKey }) {
    const cycleLength = cyclePattern === "4low1high" ? 5 : 4;
    const highDayIndex = cycleLength - 1;
    const cycleStart = String(dietStartDate || dateKey).slice(0, 10);
    const dayIndex = daysBetween(cycleStart, dateKey) % cycleLength;
    const isHighDay = dayIndex === highDayIndex;
    return {
      isHighDay,
      label: isHighDay ? "高碳日" : "低碳日",
      note: isHighDay ? "所選日期是高碳日" : "所選日期是低碳日"
    };
  }

  function macroTargets(input) {
    const metrics = profileMetrics(input.profile);
    const ratios = mergeDietRatios(input.dietRatios);
    const dateKey = input.dateKey || input.selectedDate || todayKey();

    if (input.dietMode === "carbDrop") {
      const ratio = ratios.carbDrop;
      const week = Math.floor(daysBetween(String(input.dietStartDate || dateKey).slice(0, 10), dateKey) / 7);
      const carbs = Math.max(0, metrics.weight * ratio.carbs - week * (Number(ratio.weeklyDrop) || 0));
      return {
        calories: metrics.weight * ratio.protein * 4 + carbs * 4 + metrics.weight * ratio.fat * 9,
        protein: metrics.weight * ratio.protein,
        carbs,
        fat: metrics.weight * ratio.fat,
        note: `第 ${week + 1} 週，碳水已下調 ${week * (Number(ratio.weeklyDrop) || 0)}g`
      };
    }

    if (input.dietMode === "carbCycle") {
      const cycleDay = carbCycleDayInfo({
        cyclePattern: input.cyclePattern,
        dietStartDate: input.dietStartDate,
        dateKey
      });
      const ratio = cycleDay.isHighDay ? ratios.carbCycle.high : ratios.carbCycle.low;
      return ratioToTargets(metrics.weight, ratio, cycleDay.note);
    }

    if (input.dietMode === "keto") {
      return ratioToTargets(metrics.weight, ratios.keto, "使用自訂生酮比例");
    }

    return generalTargets(metrics, ratios.general);
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

  function totals(items = []) {
    return items.reduce(
      (sum, item) => {
        if (!isValidFoodEntry(item)) return sum;
        const multiplier = Number(item.grams) / 100;
        sum.calories += Number(item.calories) * multiplier;
        sum.protein += Number(item.protein) * multiplier;
        sum.carbs += Number(item.carbs) * multiplier;
        sum.fat += Number(item.fat) * multiplier;
        return sum;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  function calorieStatus(percent) {
    if (percent < 80) return "仍有空間";
    if (percent <= 110) return "接近目標";
    return "今日偏高";
  }

  function goalLabel(goal) {
    if (goal === "0") return "維持";
    if (goal === "10") return "增肌";
    return "減脂";
  }

  function allExercises(custom = []) {
    const known = new Set(defaultExercises.map((item) => item.id));
    const extra = custom
      .filter((item) => item && item.id && item.name && !known.has(item.id))
      .map((item) => ({ id: String(item.id), name: String(item.name), muscle: item.muscle || "自訂" }));
    return [...defaultExercises, ...extra];
  }

  function epley(weight, reps) {
    const safeWeight = Number(weight) || 0;
    const safeReps = Number(reps) || 0;
    if (safeWeight <= 0 || safeReps <= 0) return 0;
    if (safeReps === 1) return safeWeight;
    return safeWeight * (1 + safeReps / 30);
  }

  function workoutVolume(entries = []) {
    return entries.reduce((sum, entry) => {
      const sets = Array.isArray(entry?.sets) ? entry.sets : Array.isArray(entry) ? entry : [];
      return (
        sum +
        sets.reduce((setSum, set) => setSum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0)
      );
    }, 0);
  }

  function bestSet(sets = []) {
    return sets.reduce((best, set) => {
      const estimate = epley(set.weight, set.reps);
      if (!best || estimate > best.e1rm) {
        return { reps: Number(set.reps) || 0, weight: Number(set.weight) || 0, e1rm: estimate };
      }
      return best;
    }, null);
  }

  function exerciseHistory(workoutsByDate = {}, exerciseId) {
    return Object.keys(workoutsByDate)
      .sort()
      .reverse()
      .flatMap((date) =>
        (workoutsByDate[date] || [])
          .filter((entry) => entry.exerciseId === exerciseId)
          .map((entry) => ({
            date,
            name: entry.name,
            sets: entry.sets,
            volume: workoutVolume([entry]),
            best: bestSet(entry.sets)
          }))
      );
  }

  function lastSession(workoutsByDate, exerciseId, beforeDate) {
    return exerciseHistory(workoutsByDate, exerciseId).find((entry) => entry.date < beforeDate) || null;
  }

  function upsertWeight(log = [], entry) {
    const kg = round(Number(entry.kg), 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date || "")) || !Number.isFinite(kg) || kg < 20 || kg > 400) {
      throw new Error("體重請填 20 到 400 kg");
    }
    const next = log.filter((item) => item.date !== entry.date);
    next.push({ id: String(entry.id || createId("wt")), date: entry.date, kg });
    next.sort((a, b) => (a.date < b.date ? -1 : 1));
    return next;
  }

  function latestWeightOnOrBefore(log = [], dateKey) {
    return [...log].reverse().find((entry) => entry.date <= dateKey) || null;
  }

  function lineChartSvg(values, options = {}) {
    if (!Array.isArray(values) || values.filter((value) => Number.isFinite(Number(value))).length < 2) return "";
    const width = options.width || 640;
    const height = options.height || 180;
    const padX = 16;
    const padY = 18;
    const nums = values.map((value) => Number(value));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const span = Math.max(0.4, max - min);
    const coords = nums.map((value, index) => {
      const x = padX + (index / (nums.length - 1)) * (width - padX * 2);
      const y = padY + (1 - (value - min) / span) * (height - padY * 2);
      return [round(x, 1), round(y, 1)];
    });
    const points = coords.map((pair) => pair.join(",")).join(" ");
    const dots = coords
      .map((pair) => `<circle cx="${pair[0]}" cy="${pair[1]}" r="3.5" fill="currentColor"></circle>`)
      .join("");
    const average = options.average;
    const averageLine =
      Array.isArray(average) && average.length === nums.length
        ? `<polyline fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-dasharray="4 4" stroke-width="2" points="${average
            .map((value, index) => {
              const x = padX + (index / (nums.length - 1)) * (width - padX * 2);
              const y = padY + (1 - (Number(value) - min) / span) * (height - padY * 2);
              return `${round(x, 1)},${round(y, 1)}`;
            })
            .join(" ")}"></polyline>`
        : "";
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${options.label || "趨勢圖"}"><polyline fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${points}"></polyline>${averageLine}${dots}</svg>`;
  }

  function movingAverage(values, windowSize = 7) {
    return values.map((_, index) => {
      const slice = values.slice(Math.max(0, index - windowSize + 1), index + 1);
      return slice.reduce((sum, value) => sum + value, 0) / slice.length;
    });
  }

  function lastGramsForFood(logsByDate = {}, foodId) {
    const dates = Object.keys(logsByDate).sort().reverse();
    for (const date of dates) {
      const found = [...(logsByDate[date] || [])].reverse().find((item) => item.id === foodId && Number(item.grams) > 0);
      if (found) return Number(found.grams);
    }
    return null;
  }

  function defaultGrams(food, logsByDate) {
    const last = food?.id ? lastGramsForFood(logsByDate, food.id) : null;
    if (last) return last;
    const calories = Number(food?.calories) || 0;
    if (calories >= 500) return 15;
    if (calories >= 300) return 40;
    return 100;
  }

  function recentFoodIds(logsByDate = {}, limit = 8) {
    const ids = [];
    Object.keys(logsByDate)
      .sort()
      .reverse()
      .some((date) => {
        const items = [...(logsByDate[date] || [])].reverse();
        return items.some((item) => {
          if (!item.id || ids.includes(item.id)) return false;
          ids.push(item.id);
          return ids.length >= limit;
        });
      });
    return ids;
  }

  function toggleFavorite(ids = [], foodId) {
    const next = ids.filter((id) => id !== foodId);
    if (!ids.includes(foodId)) next.push(foodId);
    return next;
  }

  function weeklySummary(state) {
    const endDate = state.selectedDate || todayKey();
    const dates = Array.from({ length: 7 }, (_, index) => addDays(endDate, index - 6));
    const days = dates.map((date) => {
      const items = state.logsByDate?.[date] || [];
      const eaten = totals(items);
      const target = macroTargets({ ...state, dateKey: date });
      const workouts = state.workoutsByDate?.[date] || [];
      return {
        date,
        eaten,
        targetCalories: target.calories,
        targetProtein: target.protein,
        logged: items.some(isValidFoodEntry),
        sessions: workouts.length,
        volume: workoutVolume(workouts)
      };
    });
    const loggedDays = days.filter((day) => day.logged);
    const average = (key) =>
      loggedDays.length ? loggedDays.reduce((sum, day) => sum + day.eaten[key], 0) / loggedDays.length : 0;
    const targetAverage = loggedDays.length
      ? loggedDays.reduce((sum, day) => sum + day.targetCalories, 0) / loggedDays.length
      : days.reduce((sum, day) => sum + day.targetCalories, 0) / days.length;
    const startWeight = latestWeightOnOrBefore(state.weightLog || [], addDays(dates[0], -1));
    const endWeight = latestWeightOnOrBefore(state.weightLog || [], endDate);
    return {
      days,
      avgCalories: average("calories"),
      avgProtein: average("protein"),
      avgTargetCalories: targetAverage,
      loggedDays: loggedDays.length,
      workoutDays: days.filter((day) => day.sessions > 0).length,
      totalVolume: days.reduce((sum, day) => sum + day.volume, 0),
      startWeight,
      endWeight,
      weightDelta: startWeight && endWeight ? round(endWeight.kg - startWeight.kg, 1) : null
    };
  }

  function macroDensity(food, macro) {
    return Number(food[macro]) / Math.max(1, Number(food.calories));
  }

  function generatePlan({ foods = [], target, existingTotals, dietMode = "general", shuffleIndex = 0 }) {
    const library = foods.filter(
      (food) =>
        food.name &&
        Number(food.calories) > 0 &&
        Number.isFinite(Number(food.protein)) &&
        Number.isFinite(Number(food.carbs)) &&
        Number.isFinite(Number(food.fat))
    );
    if (!library.length || !target) return [];
    const remaining = {
      calories: Math.max(0, target.calories - (existingTotals?.calories || 0)),
      protein: Math.max(0, target.protein - (existingTotals?.protein || 0)),
      carbs: Math.max(0, target.carbs - (existingTotals?.carbs || 0)),
      fat: Math.max(0, target.fat - (existingTotals?.fat || 0))
    };
    if (remaining.calories < 80 && remaining.protein < 8 && remaining.carbs < 10 && remaining.fat < 5) return [];

    const usedIds = new Set();
    const plan = [];
    const choose = (candidates) => {
      const usable = candidates.filter((food) => food && !usedIds.has(food.id));
      if (!usable.length) return null;
      return usable[shuffleIndex % Math.min(usable.length, 5)];
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
      if (!food) return 0;
      const macroPer100g = Number(food[macro]);
      if (macroPer100g <= 0) return 0;
      const byMacro = (targetGrams * 100) / macroPer100g;
      const byCalories = remaining.calories > 0 ? (remaining.calories * 100) / Math.max(1, food.calories) : byMacro;
      return Math.min(max, Math.max(min, Math.min(byMacro, byCalories)));
    };

    if (remaining.protein >= 8) {
      const proteinFood = choose(
        [...library].filter((food) => food.protein > 0).sort((a, b) => macroDensity(b, "protein") - macroDensity(a, "protein"))
      );
      addFood(proteinFood, gramsByMacro(proteinFood, "protein", remaining.protein * 0.75, 80, 260));
    }
    if (dietMode !== "keto" && remaining.carbs >= 10) {
      const carbFood = choose(
        [...library].filter((food) => food.carbs > 0).sort((a, b) => macroDensity(b, "carbs") - macroDensity(a, "carbs"))
      );
      addFood(carbFood, gramsByMacro(carbFood, "carbs", remaining.carbs * 0.8, 60, 360));
    }
    if (remaining.fat >= 5) {
      const fatFood = choose([...library].filter((food) => food.fat > 0).sort((a, b) => macroDensity(b, "fat") - macroDensity(a, "fat")));
      addFood(fatFood, gramsByMacro(fatFood, "fat", remaining.fat * 0.7, 40, 140));
    }
    if (remaining.calories >= 120 && plan.length < 4) {
      const balancedFood = choose(
        [...library].sort((a, b) => Math.abs(a.calories - remaining.calories / 2) - Math.abs(b.calories - remaining.calories / 2))
      );
      const grams = Math.min(220, Math.max(60, (remaining.calories * 100) / Math.max(1, balancedFood?.calories || 1)));
      addFood(balancedFood, grams);
    }
    return plan.map((item) => ({ ...item, entryId: createId("plan") }));
  }

  function parseBackup(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("備份檔不是有效的 JSON");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("這不是 FitPlan 備份檔");
    if (data.app === "fitplan" && data.state && typeof data.state === "object") return data.state;
    if (data.logsByDate || data.profile || data.foods || data.customFoods || data.log) return data;
    throw new Error("這不是 FitPlan 備份檔");
  }

  function buildBackup(state, exportedAt = new Date().toISOString()) {
    return {
      app: "fitplan",
      version: 2,
      exportedAt,
      state: serializeState(state)
    };
  }

  const api = {
    storageKey,
    paletteIds,
    defaultFoods,
    defaultExercises,
    defaultDietRatios,
    categoryLabels,
    dietModeLabel,
    modeText,
    dietModeText,
    createId,
    round,
    clamp,
    clampDeficit,
    todayKey,
    addDays,
    daysBetween,
    mergeDietRatios,
    migrateSaved,
    serializeState,
    profileMetrics,
    macroTargets,
    carbCycleDayInfo,
    generalTargets,
    isValidFoodEntry,
    totals,
    calorieStatus,
    goalLabel,
    allExercises,
    epley,
    workoutVolume,
    bestSet,
    exerciseHistory,
    lastSession,
    upsertWeight,
    latestWeightOnOrBefore,
    lineChartSvg,
    movingAverage,
    lastGramsForFood,
    defaultGrams,
    recentFoodIds,
    toggleFavorite,
    weeklySummary,
    generatePlan,
    parseBackup,
    buildBackup,
    sanitizeSet
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.FitPlanCore = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
