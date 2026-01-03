# CalSee

CalSee 是一個以 Next.js 開發的概念驗證專案，讓使用者透過拍照記錄飲食。它會在瀏覽器中壓縮圖片、可選擇使用雲端視覺 API 進行食物辨識、從 USDA FoodData Central 取得營養估算值，並將所有資料儲存在本地的 IndexedDB 中。

## 功能特色

- 拍照或上傳照片，支援客戶端壓縮
- AI 食物辨識（透過伺服器端 API 路由，需要使用者同意）
- 營養資料查詢，支援客戶端快取
- 僅本地儲存（IndexedDB），包含照片 Blob
- 飲食記錄瀏覽、詳細檢視、編輯與刪除
- 支援多語系的 UI（已包含繁體中文訊息）

## 技術架構

- Next.js App Router、React、TypeScript
- IndexedDB（原生 API）
- Tailwind CSS
- OpenAI Vision API 或 Google Cloud Vision API
- USDA FoodData Central API

## 系統需求

- Node.js 18+
- 辨識與營養服務的 API 金鑰

## 安裝設定

```bash
npm install
```

在專案根目錄建立 `.env.local` 檔案：

```bash
RECOGNITION_API_KEY=你的金鑰
RECOGNITION_API_TYPE=openai  # 或 google
NUTRITION_API_KEY=你的金鑰
```

啟動開發伺服器：

```bash
npm run dev
```

開啟 `http://localhost:3000`。

## 指令

```bash
npm run dev        # 開發模式
npm run build      # 建置
npm run start      # 啟動生產伺服器
npm run lint       # 程式碼檢查
npm run format     # 格式檢查
npm run format:write  # 格式化程式碼
```

## 專案結構

```
app/
  api/              # 辨識與營養的伺服器端路由
  components/       # UI 元件
  history/          # 飲食記錄頁面
  page.tsx          # 首頁流程
lib/
  db/               # IndexedDB 輔助函式
  i18n/             # 國際化工具與訊息
  services/         # 客戶端 API 服務
  utils/            # 工具程式（圖片壓縮等）
types/              # 共用 TypeScript 型別
```

## 注意事項

- 所有飲食資料與照片皆儲存在瀏覽器本地（無帳號系統或雲端同步）。
- 雲端辨識需要使用者明確同意，並透過伺服器端 API 路由處理以保護 API 金鑰。

## 授權條款

MIT
