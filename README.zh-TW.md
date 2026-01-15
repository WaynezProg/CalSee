# CalSee

[![Demo Video](https://img.youtube.com/vi/QGiLpQ6wZDE/0.jpg)](https://youtube.com/shorts/QGiLpQ6wZDE)

> 💡 **點擊上圖觀看完整示範影片，展示應用程式的完整工作流程。**

CalSee 是一個以 Next.js 開發的概念驗證專案，讓使用者透過拍照記錄飲食。它會在瀏覽器中壓縮圖片、可選擇使用雲端視覺 API 進行食物辨識、從 USDA FoodData Central 取得營養估算值並在資料不足時以 AI 補足，並將所有資料儲存在本地的 IndexedDB 中。

## 功能特色

- 拍照或上傳照片，支援客戶端壓縮
- **多項目食物辨識** — AI 可從單張照片辨識多個食物項目（1-6 項）
- 使用 React Query 進行漸進式營養資料查詢，支援平行載入
- 食物項目內嵌編輯，可自訂份量大小與單位
- AI 估算份量（數量/重量 + 碗盤大小）自動縮放營養值，使用者可覆蓋
- 營養資料查詢，支援客戶端快取，USDA 無資料時以 AI 補足
- 僅本地儲存（IndexedDB），包含照片 Blob、營養快取與同意狀態
- 選用 Google 登入（NextAuth，JWT Session）
- 飲食記錄瀏覽、詳細檢視、編輯與刪除
- 支援多語系的 UI（預設繁體中文）

## 技術架構

- Next.js App Router、React、TypeScript
- React Query（TanStack Query）用於資料擷取與快取
- NextAuth.js（Google OAuth）
- IndexedDB（原生 API）
- Tailwind CSS
- OpenAI Vision API 或 Google Gemini API
- OpenAI Chat Completions（營養資料補足）
- USDA FoodData Central API

## 系統需求

- Node.js 18+
- 辨識與營養服務的 API 金鑰
- Google OAuth 憑證（選用，用於登入）

## 取得 API 金鑰

### 辨識 API（擇一）

**選項 1：OpenAI Vision API（推薦）**

1. 至 [platform.openai.com](https://platform.openai.com/signup) 註冊帳號
2. 前往 [API Keys](https://platform.openai.com/api-keys) 頁面
3. 點擊「Create new secret key」
4. 複製金鑰並設定 `RECOGNITION_API_TYPE=openai`

> 注意：需要綁定付款方式。詳見[定價說明](https://openai.com/pricing)。

**選項 2：Google Gemini API**

1. 至 [Google AI Studio](https://aistudio.google.com/) 建立專案
2. 建立 API 金鑰
3. 設定 `RECOGNITION_API_TYPE=gemini`
4. 將金鑰放入 `GEMINI_API_KEY`（或 `GOOGLE_API_KEY`）

> 注意：使用量由 Google 計費，請見 Google AI Studio 定價。

### 營養 API

**USDA FoodData Central API（免費）**

1. 前往 [API 金鑰申請頁面](https://fdc.nal.usda.gov/api-key-signup.html)
2. 填寫姓名與電子郵件
3. 查收郵件取得 API 金鑰（通常幾分鐘內寄達）

> 此 API 完全免費，且有相當寬鬆的使用限制。

## 安裝設定

```bash
npm install
```

在專案根目錄建立 `.env.local` 檔案：

```bash
RECOGNITION_API_KEY=你的金鑰
RECOGNITION_API_TYPE=openai  # 或 gemini
GEMINI_API_KEY=你的金鑰      # 選用，用於 gemini
NUTRITION_API_KEY=你的金鑰

# 選用：啟用 Google 登入
NEXTAUTH_SECRET=你的隨機字串
GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
GOOGLE_CLIENT_SECRET=你的 Google OAuth Client Secret
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
  (auth)/           # 登入與錯誤頁
  api/              # 辨識、營養與登入的伺服器端路由
  add/              # 新增飲食流程
  components/
    meals/          # 飲食相關元件（MealItemList、MultiItemMealForm 等）
    providers/      # React Query 與其他 Provider
    ui/             # 共用 UI 元件
  history/          # 飲食記錄頁面
  settings/         # 設定與隱私
  page.tsx          # 首頁儀表板
lib/
  db/               # IndexedDB 輔助函式
  i18n/             # 國際化工具與訊息
  nutrition/        # 營養查詢與 React Query hooks
  services/         # 客戶端 API 服務
  utils/            # 工具程式（圖片壓縮等）
types/              # 共用 TypeScript 型別（MealItem、Meal、辨識型別）
```

## 注意事項

- 所有飲食資料與照片皆儲存在瀏覽器本地（無帳號系統或雲端同步）。
- 雲端辨識需要使用者明確同意，並透過伺服器端 API 路由處理以保護 API 金鑰。
- 多項目辨識支援每張照片 1-6 個食物項目，並提供信心分數。
- 營養資料使用 React Query 平行載入，逐步顯示結果。
- 份量縮放會使用 AI 估算的碗盤大小與數量；公制單位保留給使用者手動覆蓋。
- AI 營養補足在使用 OpenAI 時，會沿用 `RECOGNITION_API_KEY`。

## 授權條款

MIT
