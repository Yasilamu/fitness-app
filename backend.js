const defaultBackendFoods = window.FitPlanCore?.defaultFoods || [];

const $ = (id) => document.getElementById(id);
let backendFoods = structuredClone(defaultBackendFoods);
let syncState = {
  status: "local",
  message: "使用本機預設食物庫。",
  fetchedAt: null
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFood(food) {
  const basis = window.FitPlanFoodBasis?.servingLabel(food) || "每 100g";
  const weight = food.serving_weight_g ? `，約 ${food.serving_weight_g}g` : "";
  const serving =
    food.serving_calories || food.serving_protein || food.serving_carbs || food.serving_fat
      ? `原始輸入 ${basis}${weight}: ${food.serving_calories} kcal · 蛋白質 ${food.serving_protein}g / 碳水 ${food.serving_carbs}g / 脂肪 ${food.serving_fat}g`
      : `原始輸入 ${basis}${weight}`;
  return `${serving} · 換算每 100g: ${food.calories} kcal · 蛋白質 ${food.protein}g / 碳水 ${food.carbs}g / 脂肪 ${food.fat}g`;
}

function render() {
  $("backendCount").textContent = `${backendFoods.length} 項`;
  const fetchedText = syncState.fetchedAt ? ` · ${new Date(syncState.fetchedAt).toLocaleString("zh-TW")}` : "";
  $("backendSyncStatus").textContent = `${syncState.message}${fetchedText}`;
  $("backendFoodDatabase").innerHTML = backendFoods.length
    ? backendFoods
        .map(
          (food) => `
        <article class="food-row">
          <div class="log-main">
            <strong>${escapeHtml(food.name)}</strong>
            <span>${formatFood(food)}</span>
          </div>
        </article>`
        )
        .join("")
    : `<div class="empty">食物庫目前沒有資料。</div>`;
}

async function loadBackendFoods() {
  if (!window.FitPlanSupabaseFoods) {
    render();
    return;
  }
  const result = await window.FitPlanSupabaseFoods.loadFoods(structuredClone(defaultBackendFoods));
  syncState = {
    status: result.status,
    message: result.message,
    fetchedAt: result.fetchedAt || null
  };
  backendFoods = Array.isArray(result.foods) && result.foods.length ? result.foods : structuredClone(defaultBackendFoods);
  render();
}

render();
loadBackendFoods();
