const assert = require("node:assert/strict");
const core = require("../fitplan-core.js");

const now = new Date("2026-11-13T08:00:00");
const profile = { height: "170", weight: "70", age: "28", sex: "male", activity: "1.55", goal: "-15" };
const metrics = core.profileMetrics(profile);

assert.equal(metrics.bmr, 10 * 70 + 6.25 * 170 - 5 * 28 + 5);
assert.equal(metrics.tdee, metrics.bmr * 1.55);
assert.equal(core.profileMetrics({ ...profile, sex: "female" }).bmr, metrics.bmr - 166);

const cut = core.macroTargets({ profile, dietMode: "general", dietRatios: core.defaultDietRatios, dateKey: "2026-11-13" });
const expectedIdeal = Math.max(1200, metrics.tdee - 400);
assert.equal(cut.calories, expectedIdeal);
assert.equal(cut.protein, (expectedIdeal * 0.25) / 4);
assert.equal(cut.carbs, (expectedIdeal * 0.5) / 4);
assert.equal(cut.fat, (expectedIdeal * 0.25) / 9);
assert.match(cut.note, /TDEE - 400/);

const tight = core.macroTargets({
  profile: { height: "150", weight: "40", age: "60", sex: "female", activity: "1.2", goal: "-15" },
  dietMode: "general",
  dietRatios: { general: { deficit: 400 } }
});
assert.equal(tight.calories, 1200);

assert.equal(core.clampDeficit(100), 300);
assert.equal(core.clampDeficit(900), 500);
assert.equal(core.clampDeficit(350), 350);

const maintain = core.macroTargets({
  profile: { ...profile, goal: "0" },
  dietMode: "general",
  dietRatios: core.defaultDietRatios
});
assert.equal(maintain.calories, metrics.tdee);
assert.match(maintain.note, /維持/);

const bulk = core.macroTargets({
  profile: { ...profile, goal: "10" },
  dietMode: "general",
  dietRatios: core.defaultDietRatios
});
assert.equal(bulk.calories, metrics.tdee * 1.1);

const drop = core.macroTargets({
  profile,
  dietMode: "carbDrop",
  dietRatios: core.defaultDietRatios,
  dietStartDate: "2026-11-01T00:00:00.000Z",
  dateKey: "2026-11-15"
});
assert.equal(drop.protein, 70 * 1.8);
assert.equal(drop.fat, 70 * 0.8);
assert.equal(drop.carbs, 70 * 3 - 60);
assert.match(drop.note, /第 3 週/);

const cycleStart = "2026-11-01";
["2026-11-01", "2026-11-02", "2026-11-03"].forEach((date) => {
  const info = core.carbCycleDayInfo({ cyclePattern: "3low1high", dietStartDate: cycleStart, dateKey: date });
  assert.equal(info.isHighDay, false, date);
});
assert.equal(core.carbCycleDayInfo({ cyclePattern: "3low1high", dietStartDate: cycleStart, dateKey: "2026-11-04" }).isHighDay, true);
assert.equal(core.carbCycleDayInfo({ cyclePattern: "3low1high", dietStartDate: cycleStart, dateKey: "2026-11-05" }).label, "低碳日");
assert.equal(core.carbCycleDayInfo({ cyclePattern: "4low1high", dietStartDate: cycleStart, dateKey: "2026-11-05" }).label, "高碳日");

const cycle = core.macroTargets({
  profile,
  dietMode: "carbCycle",
  cyclePattern: "3low1high",
  dietStartDate: cycleStart,
  dietRatios: core.defaultDietRatios,
  dateKey: "2026-11-04"
});
assert.equal(cycle.carbs, 70 * 5);
assert.equal(cycle.protein, 70 * 1);
assert.equal(cycle.fat, 70 * 0.3);

const keto = core.macroTargets({ profile, dietMode: "keto", dietRatios: core.defaultDietRatios });
assert.equal(keto.carbs, 70 * 0.35);
assert.equal(keto.protein, 70 * 2);
assert.equal(keto.fat, 70 * 1.6);

const eaten = core.totals([
  { name: "雞胸肉 熟", grams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "雞胸肉 熟", grams: 50, calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "壞掉的" }
]);
assert.equal(eaten.calories, 165 * 1.5);
assert.equal(eaten.protein, 31 * 1.5);
assert.equal(core.calorieStatus(70), "仍有空間");
assert.equal(core.calorieStatus(100), "接近目標");
assert.equal(core.calorieStatus(120), "今日偏高");

const legacy = core.migrateSaved(
  {
    step: "dashboard",
    mode: "macro",
    dietMode: "carbCycle",
    cyclePattern: "4low1high",
    profile: { height: "180", weight: "80", age: "30", sex: "male", activity: "1.55", goal: "0" },
    logsByDate: {
      "2026-11-01": [{ id: "white-rice", name: "白飯", grams: 200, calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, entryId: "e1" }]
    },
    foods: [{ id: "bento", name: "便當", calories: 180, protein: 10, carbs: 20, fat: 5 }],
    favoriteFoodIds: ["bento"]
  },
  { now }
);
assert.equal(legacy.profile.goal, "-15");
assert.equal(legacy.legacyGoalNote, true);
assert.equal(legacy.profileTouched, true);
assert.equal(legacy.step, "today");
assert.equal(legacy.mode, "macro");
assert.equal(legacy.dietMode, "carbCycle");
assert.equal(legacy.cyclePattern, "4low1high");
assert.equal(legacy.profile.height, "180");
assert.equal(legacy.logsByDate["2026-11-01"][0].name, "白飯");
assert.equal(legacy.selectedDate, "2026-11-13");
assert.deepEqual(legacy.favoriteFoodIds, ["bento"]);
assert.equal(legacy.backendFoods.length, 20);

const oldLog = core.migrateSaved(
  {
    step: "foodLibrary",
    customFoods: [{ id: "x", name: "雞胸便當", calories: 150, protein: 20, carbs: 8, fat: 4 }],
    log: [{ name: "蛋", grams: 50, calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, entryId: "old" }],
    plan: [{ name: "白飯 熟", grams: 150, calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }]
  },
  { now }
);
assert.equal(oldLog.step, "foods");
assert.equal(oldLog.foods[0].name, "雞胸便當");
assert.equal(oldLog.logsByDate["2026-11-13"][0].entryId, "old");
assert.equal(oldLog.plansByDate["2026-11-13"][0].name, "白飯 熟");
assert.equal(oldLog.profile.goal, "-15");
assert.equal(oldLog.legacyGoalNote, false);

const explicitBulk = core.migrateSaved({ profile: { goal: "10", height: "170", weight: "70", age: "28", sex: "male", activity: "1.725" } }, { now });
assert.equal(explicitBulk.profile.goal, "10");
assert.equal(explicitBulk.profile.activity, "1.725");
assert.equal(explicitBulk.legacyGoalNote, false);

const keptMaintain = core.migrateSaved(
  {
    version: 2,
    profile: { goal: "0", height: "170", weight: "70", age: "28", sex: "female", activity: "1.2" },
    profileTouched: true,
    legacyGoalNote: false,
    step: "progress",
    theme: "dark",
    weightLog: [
      { date: "2026-11-10", kg: 72.2 },
      { date: "2026-11-12", kg: 71.4 },
      { date: "2026-11-12", kg: 71.8 }
    ],
    workoutsByDate: {
      "2026-11-12": [{ id: "w1", exerciseId: "squat", name: "深蹲", sets: [{ id: "s1", reps: 5, weight: 100 }] }]
    }
  },
  { now }
);
assert.equal(keptMaintain.profile.goal, "0");
assert.equal(keptMaintain.profile.sex, "female");
assert.equal(keptMaintain.step, "progress");
assert.equal(keptMaintain.theme, "dark");
assert.equal(keptMaintain.weightLog.length, 2);
assert.equal(keptMaintain.weightLog[1].kg, 71.8);
assert.equal(keptMaintain.workoutsByDate["2026-11-12"][0].sets[0].weight, 100);

const roundTrip = core.migrateSaved(core.serializeState(keptMaintain), { now });
assert.equal(roundTrip.workoutsByDate["2026-11-12"][0].name, "深蹲");
assert.equal(core.serializeState(keptMaintain).log.length, 0);
assert.equal(core.serializeState(oldLog).log[0].name, "蛋");

assert.equal(core.defaultGrams({ id: "olive-oil", calories: 884 }, {}), 15);
assert.equal(core.defaultGrams({ id: "oats", calories: 389 }, {}), 40);
assert.equal(core.defaultGrams({ id: "egg", calories: 143 }, { "2026-11-01": [{ id: "egg", grams: 60 }] }), 60);
assert.deepEqual(
  core.recentFoodIds({
    "2026-11-01": [{ id: "egg" }, { id: "rice" }],
    "2026-11-03": [{ id: "rice" }, { id: "chicken" }]
  }),
  ["chicken", "rice", "egg"]
);
assert.deepEqual(core.toggleFavorite(["egg"], "chicken"), ["egg", "chicken"]);
assert.deepEqual(core.toggleFavorite(["egg", "chicken"], "egg"), ["chicken"]);

assert.equal(core.round(core.epley(100, 5), 2), core.round(100 * (1 + 5 / 30), 2));
assert.equal(core.epley(60, 1), 60);
assert.equal(core.epley(0, 10), 0);
const history = core.exerciseHistory(
  {
    "2026-11-01": [{ exerciseId: "bench", name: "臥推", sets: [{ reps: 8, weight: 60 }] }],
    "2026-11-10": [
      { exerciseId: "bench", name: "臥推", sets: [{ reps: 5, weight: 70 }, { reps: 5, weight: 65 }] },
      { exerciseId: "squat", name: "深蹲", sets: [{ reps: 3, weight: 120 }] }
    ]
  },
  "bench"
);
assert.equal(history.length, 2);
assert.equal(history[0].date, "2026-11-10");
assert.equal(history[0].best.weight, 70);
assert.equal(history[0].volume, 70 * 5 + 65 * 5);
assert.equal(core.workoutVolume(history), 70 * 5 + 65 * 5 + 60 * 8);
assert.equal(core.lastSession({ "2026-11-01": [{ exerciseId: "squat", name: "深蹲", sets: [{ reps: 5, weight: 80 }] }] }, "squat", "2026-11-13").date, "2026-11-01");

const weights = core.upsertWeight([{ date: "2026-11-01", kg: 70, id: "a" }], { date: "2026-11-13", kg: 69.24 });
assert.equal(weights[1].kg, 69.2);
assert.throws(() => core.upsertWeight([], { date: "2026-11-13", kg: 10 }), /20 到 400/);
assert.equal(core.latestWeightOnOrBefore(weights, "2026-11-12").kg, 70);

const summary = core.weeklySummary({
  selectedDate: "2026-11-13",
  profile,
  dietMode: "general",
  dietRatios: core.defaultDietRatios,
  logsByDate: {
    "2026-11-12": [{ name: "飯", grams: 100, calories: 2000, protein: 100, carbs: 200, fat: 50 }]
  },
  workoutsByDate: {
    "2026-11-11": [{ sets: [{ weight: 100, reps: 5 }] }]
  },
  weightLog: [
    { date: "2026-11-01", kg: 72 },
    { date: "2026-11-13", kg: 71.2 }
  ]
});
assert.equal(summary.days.length, 7);
assert.equal(summary.loggedDays, 1);
assert.equal(summary.avgCalories, 2000);
assert.equal(summary.workoutDays, 1);
assert.equal(summary.totalVolume, 500);
assert.equal(summary.weightDelta, -0.8);

const plan = core.generatePlan({
  foods: core.defaultFoods,
  target: cut,
  existingTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  dietMode: "general",
  shuffleIndex: 0
});
assert.ok(plan.length >= 2);
assert.ok(plan.every((item) => item.grams > 0 && item.name));
assert.deepEqual(core.generatePlan({ foods: [], target: cut, existingTotals: core.totals([]), dietMode: "general" }), []);
const second = core.generatePlan({
  foods: core.defaultFoods,
  target: cut,
  existingTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  dietMode: "general",
  shuffleIndex: 1
});
assert.notEqual(plan.map((item) => item.id).join(), second.map((item) => item.id).join());

assert.equal(core.lineChartSvg([70]), "");
assert.match(core.lineChartSvg([72, 71.5, 71]), /<svg/);
assert.equal(core.movingAverage([1, 2, 3], 2)[2], 2.5);

const backup = core.buildBackup(legacy, "2026-11-13T00:00:00.000Z");
assert.equal(backup.app, "fitplan");
assert.equal(core.parseBackup(JSON.stringify(backup)).profile.height, "180");
assert.equal(core.parseBackup(JSON.stringify({ profile: { goal: "10" }, log: [{ name: "蛋" }] })).profile.goal, "10");
assert.throws(() => core.parseBackup("{"), /JSON/);
assert.throws(() => core.parseBackup("[]"), /FitPlan/);
assert.throws(() => core.parseBackup("{\"hello\":1}"), /FitPlan/);

assert.equal(core.addDays("2026-11-13", -6), "2026-11-07");
assert.equal(core.daysBetween("2026-11-01", "2026-11-13"), 12);
assert.equal(core.allExercises([{ id: "farmer", name: "農夫走路", muscle: "自訂" }]).at(-1).name, "農夫走路");
assert.equal(core.allExercises([{ id: "squat", name: "不要覆蓋" }]).filter((item) => item.id === "squat").length, 1);

console.log("fitplan-core tests passed");
