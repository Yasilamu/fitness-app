# FitPlan 自主健身飲食計劃 MVP

這是一個可直接用瀏覽器開啟的靜態前端 app，不需要安裝套件。

## 功能

- 輸入身高、體重、年齡、生理性別與運動習慣，使用 Mifflin-St Jeor 公式估算 BMR，並依活動係數估算 TDEE。
- 可選熱量模式、營養素模式或綜合模式。
- 內建常見食物資料庫，以每 100g 的熱量、蛋白質、碳水與脂肪估算。
- 可新增自訂食物。
- 可記錄今日攝取量，並顯示還差或超過多少熱量與三大營養素。
- 可依目前缺口產生一份建議菜單。
- 使用 `localStorage` 保留個人設定、食物庫與今日紀錄。

## 使用方式

手機直接開啟：

https://yasilamu.github.io/fitness-app/

電腦本機也可以直接開啟 `index.html` 使用。

## PWA 手機使用

本專案已加入 PWA 必要檔案：`manifest.webmanifest`、`sw.js`、192/512 圖示與手機安裝提示。

手機正式網址：

https://yasilamu.github.io/fitness-app/

1. Android Chrome：開啟上方網址後，依瀏覽器提示按「安裝」，或從選單選「安裝應用程式」。
2. iPhone Safari：開啟上方網址後，按分享按鈕，選「加入主畫面」。

開發時本機預覽：

```bash
node .tools/static-server.js 8088 127.0.0.1
```

開啟 `http://127.0.0.1:8088` 後，可檢查 manifest 與離線快取是否正常。

## 營養資料說明

內建食物數值以 USDA FoodData Central 常見食物資料及其公開彙整值為基礎，實際品牌、烹調方式與含水量會造成差異，正式產品建議串接 FoodData Central API 或台灣食品營養成分資料庫。

## Supabase 食物庫同步

手機端與電腦端要同步食物庫時，不能依靠 `localStorage`，因為它只存在同一台裝置的同一個瀏覽器。此專案已加入 Supabase 唯讀食物庫同步：

1. 在 Supabase SQL Editor 執行 `supabase-foods.sql`。
2. 到 Supabase Project Settings 複製 Project URL 與公開 `anon` / publishable key。
3. 將 `supabase-config.js` 裡的 `url` 和 `anonKey` 填入公開值。
4. 部署到 GitHub Pages 後，手機端開啟 `https://yasilamu.github.io/fitness-app/`，前台與 `backend.html` 會讀取同一份 Supabase 食物庫。

### 後台輸入食物基準

食物資料可以不用都用 100g 輸入。到 Supabase 的 `foods` 表新增或修改食物時，請填這組「原始輸入基準」欄位：

- `serving_amount`: 這份食物的基準量，例如 `50`、`250`、`1`
- `serving_unit`: 基準單位，例如 `g`、`ml`、`顆`、`包`、`份`
- `serving_weight_g`: 這份食物約等於幾克，系統用它換算每 100g
- `serving_calories`: 這個基準量下的熱量
- `serving_protein`: 這個基準量下的蛋白質
- `serving_carbs`: 這個基準量下的碳水
- `serving_fat`: 這個基準量下的脂肪

資料庫會用 `serving_weight_g` 自動換算 `calories`、`protein`、`carbs`、`fat` 成每 100g，前台仍用每 100g 搭配使用者輸入克數計算。

範例：一顆雞蛋約 50g，營養值是 72 kcal、蛋白質 6.3g、碳水 0.4g、脂肪 4.8g，就填：

```sql
insert into public.foods (
  id, name,
  serving_amount, serving_unit, serving_weight_g,
  serving_calories, serving_protein, serving_carbs, serving_fat,
  category, sort_order
)
values (
  'egg',
  '全蛋',
  1,
  '顆',
  50,
  72,
  6.3,
  0.4,
  4.8,
  'protein',
  30
)
on conflict (id) do update set
  name = excluded.name,
  serving_amount = excluded.serving_amount,
  serving_unit = excluded.serving_unit,
  serving_weight_g = excluded.serving_weight_g,
  serving_calories = excluded.serving_calories,
  serving_protein = excluded.serving_protein,
  serving_carbs = excluded.serving_carbs,
  serving_fat = excluded.serving_fat,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true;
```

注意：前端只能放公開 anon/publishable key，不能放 `service_role` 或 secret key。目前前台僅同步食物庫讀取；個人紀錄、身體資料、自訂食物仍保存在各裝置本機。
