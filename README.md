# FitPlan 健身飲食紀錄

FitPlan 是一個以減脂為目標的靜態網頁 app，可用來估算 BMR/TDEE、設定飲食模式、記錄每日飲食，並追蹤熱量與三大營養素。

正式網址：
https://yasilamu.github.io/fitness-app/

## 主要功能

- 依身高、體重、年齡、性別與活動量估算 BMR / TDEE。
- 支援一般紀錄、碳水漸降、碳循環與生酮飲食。
- 碳循環會依日期顯示低碳日或高碳日。
- 可記錄每日食物份量，查看熱量、蛋白質、碳水與脂肪進度。
- 可建立自訂食物，也可用 Supabase 同步共用食物庫。
- 支援 PWA，可加入手機主畫面使用。

## 使用方式

手機或電腦直接開啟：

```text
https://yasilamu.github.io/fitness-app/
```

本機預覽可直接開啟 `index.html`，或用靜態 server：

```bash
node .tools/static-server.js 8088 127.0.0.1
```

再開啟：

```text
http://127.0.0.1:8088
```

## 手機安裝

- Android Chrome：開啟網站後，依瀏覽器提示按「安裝」。
- iPhone Safari：按分享按鈕，選擇「加入主畫面」。

## 資料保存

- 個人設定、每日紀錄與自訂食物預設存在瀏覽器 `localStorage`。
- 共用食物庫可透過 Supabase 讀取。
- 前端只能放公開的 anon / publishable key，不能放 `service_role` 或 secret key。

## 專案檔案

- `index.html`：主要頁面
- `styles.css`：主要樣式與手機版版面
- `app.js`：飲食模式、日期、紀錄與計算邏輯
- `sw.js`、`manifest.webmanifest`：PWA 支援
- `backend.html`、`backend.js`：食物庫管理頁
- `supabase-foods.sql`：Supabase 食物資料表與範例資料
