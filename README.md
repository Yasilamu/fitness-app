# FitPlan 飲食與訓練

FitPlan 是一個以減脂為目標的靜態網頁 app。可以估算 BMR / TDEE、設定飲食模式、記錄每天吃了什麼、記錄重量訓練，並看體重趨勢。資料存在這台裝置，不需要帳號。

正式網址：
https://yasilamu.github.io/fitness-app/

## 主要功能

- 依身高、體重、年齡、性別與活動量估算 BMR / TDEE。
- 目標可選減脂（TDEE 少 300～500 kcal）、維持或增肌（TDEE +10%）。
- 飲食模式：一般紀錄、碳水漸降、碳循環（三低一高或四低一高）、生酮。比例可自行調整。
- 記錄每日食物份量，查看熱量、蛋白質、碳水與脂肪。
- 收藏食物與最近吃過的食物，點一下就能再記。
- 可建立自訂食物，也可用 Supabase 同步共用食物庫。
- 依剩餘營養素產生建議菜單。
- 記錄訓練的組數、次數、重量，並看同一動作的歷史與預估單次極限。
- 記錄體重並看趨勢，以及最近 7 天的飲食和訓練摘要。
- 匯出 / 匯入 JSON 備份。
- 淺色、深色或跟隨系統。
- 支援 PWA，可加入手機主畫面。

## 使用方式

手機或電腦直接開啟：

```text
https://yasilamu.github.io/fitness-app/
```

本機預覽：

```bash
python3 -m http.server 8088
```

再開啟 `http://127.0.0.1:8088`。

## 手機安裝

- Android Chrome：開啟網站後，依瀏覽器提示按「安裝」。
- iPhone Safari：按分享按鈕，選擇「加入主畫面」。

## 資料保存

- 個人設定、每日飲食、訓練、體重與自訂食物存在瀏覽器 `localStorage`，鍵名是 `fitplan-state-v1`。
- 舊版同一個鍵的資料會在開啟時讀進來，不會清掉。
- 共用食物庫可透過 Supabase 讀取，快取鍵名是 `fitplan-supabase-foods-cache-v1`。
- 前端只能放公開的 anon / publishable key，不能放 `service_role` 或 secret key。

## 測試

```bash
node tests/food-basis.test.js
node tests/fitplan-core.test.js
```

## 專案檔案

- `index.html`、`styles.css`、`app.js`：主畫面
- `fitplan-core.js`：目標計算、舊資料遷移、訓練與備份
- `sw.js`、`manifest.webmanifest`、`pwa.html`：PWA
- `backend.html`、`backend.js`：雲端食物庫狀態
- `supabase-foods.sql`：Supabase 食物資料表
