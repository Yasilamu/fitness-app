const defaultBackendFoods = [
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

const storageKey = "fitplan-state-v1";
const dataChannel = "fitplan-data-sync";
const syncChannel = "BroadcastChannel" in window ? new BroadcastChannel(dataChannel) : null;
const $ = (id) => document.getElementById(id);
let backendFoods = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readSavedState() {
  return JSON.parse(localStorage.getItem(storageKey) || "{}");
}

function saveBackendFoods() {
  const saved = readSavedState();
  localStorage.setItem(storageKey, JSON.stringify({ ...saved, backendFoods }));
  syncChannel?.postMessage({ type: "backend-foods-updated" });
}

function loadBackendFoods() {
  const saved = readSavedState();
  backendFoods = saved.backendFoods || structuredClone(defaultBackendFoods);
}

function resetForm() {
  $("backendFoodId").value = "";
  $("backendFoodForm").reset();
  $("backendFoodCalories").value = 150;
  $("backendFoodProtein").value = 10;
  $("backendFoodCarbs").value = 20;
  $("backendFoodFat").value = 3;
}

function fillForm(food) {
  $("backendFoodId").value = food.id;
  $("backendFoodName").value = food.name;
  $("backendFoodCalories").value = food.calories;
  $("backendFoodProtein").value = food.protein;
  $("backendFoodCarbs").value = food.carbs;
  $("backendFoodFat").value = food.fat;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render() {
  $("backendCount").textContent = `${backendFoods.length} 項`;
  $("backendFoodDatabase").innerHTML = backendFoods.length
    ? backendFoods
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
    : `<div class="empty compact-empty">後台食物庫目前是空的。</div>`;
}

function bindEvents() {
  $("backendFoodForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("backendFoodName").value.trim();
    if (!name) return;
    const food = {
      id: $("backendFoodId").value || `backend-${Date.now()}`,
      name,
      calories: Number($("backendFoodCalories").value) || 0,
      protein: Number($("backendFoodProtein").value) || 0,
      carbs: Number($("backendFoodCarbs").value) || 0,
      fat: Number($("backendFoodFat").value) || 0,
      category: "backend"
    };
    const index = backendFoods.findIndex((item) => item.id === food.id);
    if (index >= 0) {
      backendFoods[index] = food;
    } else {
      backendFoods.push(food);
    }
    saveBackendFoods();
    resetForm();
    render();
  });

  $("cancelBackendFoodEditBtn").addEventListener("click", resetForm);

  $("resetBackendDefaultsBtn").addEventListener("click", () => {
    backendFoods = structuredClone(defaultBackendFoods);
    saveBackendFoods();
    resetForm();
    render();
  });

  $("backendFoodDatabase").addEventListener("click", (event) => {
    const editId = event.target.dataset.editFood;
    const deleteId = event.target.dataset.deleteFood;
    if (editId) {
      const food = backendFoods.find((item) => item.id === editId);
      if (food) fillForm(food);
    }
    if (deleteId) {
      backendFoods = backendFoods.filter((item) => item.id !== deleteId);
      saveBackendFoods();
      resetForm();
      render();
    }
  });
}

loadBackendFoods();
bindEvents();
render();
