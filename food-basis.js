(function (root) {
  function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function round(value, decimals = 1) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  function convertServingToPer100(input) {
    const servingAmount = numberValue(input.servingAmount ?? input.serving_amount);
    if (servingAmount <= 0) {
      throw new Error("基準量必須大於 0");
    }

    const servingWeight = numberValue(input.servingWeight ?? input.serving_weight_g ?? servingAmount);
    if (servingWeight <= 0) {
      throw new Error("換算重量必須大於 0");
    }

    const servingUnit = String(input.servingUnit ?? input.serving_unit ?? "g").trim() || "g";
    const multiplier = 100 / servingWeight;
    const servingCalories = numberValue(input.calories ?? input.serving_calories);
    const servingProtein = numberValue(input.protein ?? input.serving_protein);
    const servingCarbs = numberValue(input.carbs ?? input.serving_carbs);
    const servingFat = numberValue(input.fat ?? input.serving_fat);

    return {
      serving_amount: servingAmount,
      serving_unit: servingUnit,
      serving_weight_g: servingWeight,
      serving_calories: servingCalories,
      serving_protein: servingProtein,
      serving_carbs: servingCarbs,
      serving_fat: servingFat,
      calories: round(servingCalories * multiplier),
      protein: round(servingProtein * multiplier),
      carbs: round(servingCarbs * multiplier),
      fat: round(servingFat * multiplier)
    };
  }

  function servingLabel(food) {
    const amount = numberValue(food?.serving_amount);
    const unit = String(food?.serving_unit || "g").trim() || "g";
    return amount > 0 ? `每 ${amount}${unit}` : "每 100g";
  }

  const api = { convertServingToPer100, servingLabel };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.FitPlanFoodBasis = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
