(function () {
  const cacheKey = "fitplan-supabase-foods-cache-v1";
  const config = window.FITPLAN_SUPABASE_CONFIG || {};

  function cleanUrl(value = "") {
    return String(value).trim().replace(/\/+$/, "");
  }

  function projectUrl() {
    return cleanUrl(config.url).replace(/\/rest\/v1$/i, "");
  }

  function isConfigured() {
    return Boolean(projectUrl() && String(config.anonKey || "").trim());
  }

  function numberValue(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeFood(row) {
    if (!row || !row.id || !row.name) return null;
    return {
      id: String(row.id),
      name: String(row.name),
      calories: numberValue(row.calories),
      protein: numberValue(row.protein),
      carbs: numberValue(row.carbs),
      fat: numberValue(row.fat),
      category: row.category ? String(row.category) : "other"
    };
  }

  function readCachedFoods() {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (!cached || !Array.isArray(cached.foods) || !cached.foods.length) return null;
      return cached;
    } catch {
      return null;
    }
  }

  function writeCachedFoods(foods) {
    localStorage.setItem(cacheKey, JSON.stringify({ foods, fetchedAt: new Date().toISOString() }));
  }

  async function fetchFoods() {
    if (!isConfigured()) {
      return {
        status: "disabled",
        foods: null,
        message: "尚未設定 Supabase URL 與公開 anon key。"
      };
    }

    const url = projectUrl();
    const anonKey = String(config.anonKey).trim();
    const query = "select=id,name,calories,protein,carbs,fat,category&is_active=eq.true&order=sort_order.asc,name.asc";
    const response = await fetch(`${url}/rest/v1/foods?${query}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase ${response.status}: ${detail || response.statusText}`);
    }

    const foods = (await response.json()).map(normalizeFood).filter(Boolean);
    writeCachedFoods(foods);
    return {
      status: "online",
      foods,
      fetchedAt: new Date().toISOString(),
      message: "已從 Supabase 同步食物庫。"
    };
  }

  async function loadFoods(fallbackFoods = []) {
    const cached = readCachedFoods();
    try {
      const result = await fetchFoods();
      if (result.status === "disabled") {
        return {
          ...result,
          foods: cached?.foods || fallbackFoods,
          fetchedAt: cached?.fetchedAt || null
        };
      }
      return result;
    } catch (error) {
      if (cached?.foods?.length) {
        return {
          status: "cached",
          foods: cached.foods,
          fetchedAt: cached.fetchedAt || null,
          message: "Supabase 暫時無法連線，已使用上次快取的食物庫。",
          error
        };
      }
      return {
        status: "error",
        foods: fallbackFoods,
        fetchedAt: null,
        message: "Supabase 暫時無法連線，已使用本機預設食物庫。",
        error
      };
    }
  }

  window.FitPlanSupabaseFoods = {
    cacheKey,
    isConfigured,
    loadFoods,
    readCachedFoods
  };
})();
