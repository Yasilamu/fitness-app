const assert = require("node:assert/strict");
const { convertServingToPer100, servingLabel } = require("../food-basis.js");

const egg = convertServingToPer100({
  servingAmount: 1,
  servingUnit: "顆",
  servingWeight: 50,
  calories: 72,
  protein: 6.3,
  carbs: 0.4,
  fat: 4.8
});

assert.deepEqual(egg, {
  serving_amount: 1,
  serving_unit: "顆",
  serving_weight_g: 50,
  serving_calories: 72,
  serving_protein: 6.3,
  serving_carbs: 0.4,
  serving_fat: 4.8,
  calories: 144,
  protein: 12.6,
  carbs: 0.8,
  fat: 9.6
});

assert.equal(servingLabel({ serving_amount: 250, serving_unit: "ml" }), "每 250ml");
assert.equal(servingLabel({ serving_amount: 1, serving_unit: "顆" }), "每 1顆");
assert.equal(servingLabel({ serving_amount: 100, serving_unit: "g" }), "每 100g");
assert.throws(() => convertServingToPer100({ servingAmount: 1, servingWeight: 0, calories: 10 }), /換算重量/);
