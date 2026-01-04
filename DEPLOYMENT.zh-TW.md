# CalSee 部署指南

本指南說明如何將 CalSee 部署至 **Vercel + Neon PostgreSQL + Cloudflare R2**。

## 架構概覽

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│    Neon     │     │ Cloudflare  │
│  (Next.js)  │     │ (PostgreSQL)│     │     R2      │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       ▲
       │                                       │
       └───────────────────────────────────────┘
                    (照片儲存)
```

## 前置需求

- GitHub 帳號（用於 Vercel 部署）
- Vercel 帳號（免費方案）
- Neon 帳號（免費方案）
- Cloudflare 帳號（免費方案）
- OpenAI API 金鑰（用於食物辨識）
- USDA FoodData Central API 金鑰（免費）
- Google OAuth 憑證（選用，用於登入）

---

## 步驟 1：設定 Neon PostgreSQL

### 1.1 建立 Neon 帳號
1. 前往 [neon.tech](https://neon.tech) 並註冊
2. 點擊「Create a project」
3. 輸入專案名稱（例如 `calsee`）
4. 選擇最接近使用者的區域
5. 點擊「Create project」

### 1.2 取得連線字串
1. 在 Neon 儀表板中，進入你的專案
2. 點擊「Connection Details」
3. 複製連線字串（格式如下）：
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. 將此儲存為 `DATABASE_URL`

### 1.3 執行資料庫遷移
你可以在部署前於本地執行遷移：

```bash
# 暫時設定 DATABASE_URL
export DATABASE_URL="postgresql://..."

# 產生 Prisma client 並推送 schema
npx prisma generate
npx prisma db push
```

---

## 步驟 2：設定 Cloudflare R2

### 2.1 建立 Cloudflare 帳號
1. 前往 [cloudflare.com](https://cloudflare.com) 並註冊
2. 在側邊欄找到「R2 Object Storage」

### 2.2 建立 R2 Bucket
1. 點擊「Create bucket」
2. 輸入 bucket 名稱：`calsee`
3. 選擇位置提示（auto 或特定區域）
4. 點擊「Create bucket」

### 2.3 建立 API Token
1. 前往「R2 Object Storage」>「Manage R2 API Tokens」
2. 點擊「Create API token」
3. 輸入名稱（例如 `calsee-production`）
4. 選擇權限：
   - 「Object Read & Write」
5. 指定 bucket 存取範圍：選擇你的 `calsee` bucket
6. 點擊「Create API Token」
7. **重要**：立即複製並儲存這些值：
   - Access Key ID → `S3_ACCESS_KEY`
   - Secret Access Key → `S3_SECRET_KEY`

### 2.4 取得 R2 Endpoint
你的 R2 endpoint 格式如下：
```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

找到你的 Account ID：
1. 前往 Cloudflare 儀表板
2. 點擊任何網域或 R2
3. 在右側邊欄找到「Account ID」

儲存為 `S3_ENDPOINT`。

---

## 步驟 3：設定 Vercel

### 3.1 匯入專案
1. 前往 [vercel.com](https://vercel.com) 並登入
2. 點擊「Add New...」>「Project」
3. 匯入你的 GitHub 儲存庫
4. 選擇 CalSee 儲存庫

### 3.2 設定建置選項
Vercel 應會自動偵測 Next.js。確認以下設定：
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 3.3 新增環境變數
在 Vercel 專案設定中，新增以下環境變數：

#### 資料庫
| 變數 | 值 | 說明 |
|------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Neon 連線字串 |

#### S3 儲存（Cloudflare R2）
| 變數 | 值 | 說明 |
|------|-----|------|
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | R2 endpoint |
| `S3_BUCKET` | `calsee-photos` | Bucket 名稱 |
| `S3_ACCESS_KEY` | `<your-access-key>` | R2 API token access key |
| `S3_SECRET_KEY` | `<your-secret-key>` | R2 API token secret key |
| `S3_REGION` | `auto` | R2 使用 `auto` |
| `SIGNED_URL_EXPIRES_IN` | `3600` | 簽名 URL 過期時間（秒） |

#### 辨識與營養 API
| 變數 | 值 | 說明 |
|------|-----|------|
| `RECOGNITION_API_KEY` | `sk-...` | OpenAI API 金鑰 |
| `RECOGNITION_API_TYPE` | `openai` | `openai` 或 `google` |
| `NUTRITION_API_KEY` | `<usda-key>` | USDA FoodData Central 金鑰 |

#### 身份驗證（選用）
| 變數 | 值 | 說明 |
|------|-----|------|
| `NEXTAUTH_SECRET` | `<random-string>` | 使用 `openssl rand -base64 32` 產生 |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | 你的正式環境 URL |
| `GOOGLE_CLIENT_ID` | `<client-id>` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `<client-secret>` | Google OAuth client secret |

### 3.4 部署
1. 點擊「Deploy」
2. 等待建置完成
3. 你的應用程式將在 `https://your-project.vercel.app` 上線

---

## 步驟 4：部署後設定

### 4.1 執行資料庫遷移
首次部署後，執行 Prisma 遷移：

```bash
# 選項 1：使用正式環境 DATABASE_URL 在本地執行
export DATABASE_URL="postgresql://..."
npx prisma db push

# 選項 2：使用 Vercel CLI
vercel env pull .env.local
npx prisma db push
```

### 4.2 設定 R2 CORS（如有需要）
如果照片上傳遇到 CORS 問題：

1. 前往 R2 bucket 設定
2. 新增 CORS 政策：
```json
[
  {
    "AllowedOrigins": ["https://your-app.vercel.app"],
    "AllowedMethods": ["GET", "PUT", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4.3 更新 Google OAuth 重新導向 URI
如果使用 Google 登入：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 編輯你的 OAuth 2.0 用戶端
3. 新增授權重新導向 URI：
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

---

## 環境變數參考

建立 `.env.local` 檔案用於本地開發：

```bash
# 資料庫（Neon PostgreSQL）
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# S3 儲存（Cloudflare R2）
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_BUCKET="calsee-photos"
S3_ACCESS_KEY="your-r2-access-key"
S3_SECRET_KEY="your-r2-secret-key"
S3_REGION="auto"
SIGNED_URL_EXPIRES_IN=3600

# 辨識 API
RECOGNITION_API_KEY="sk-your-openai-key"
RECOGNITION_API_TYPE="openai"

# 營養 API
NUTRITION_API_KEY="your-usda-api-key"

# 身份驗證（選用）
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## 疑難排解

### 資料庫連線問題
- 確認連線字串包含 `?sslmode=require`
- 檢查 Neon 專案是否處於啟用狀態（免費方案閒置後會暫停）
- 確認 Neon 設定中的 IP 允許清單

### R2 上傳失敗
- 確認 S3_ENDPOINT 格式正確（結尾無斜線）
- 檢查 API token 權限包含寫入權限
- 確認 bucket 名稱完全一致

### 建置失敗
- 在本地執行 `npm run build` 檢查錯誤
- 確認所有環境變數都已在 Vercel 設定
- 檢查 Prisma client 已產生：`npx prisma generate`

### 身份驗證問題
- 確認 NEXTAUTH_URL 與部署 URL 相符
- 檢查 Google OAuth 重新導向 URI 包含你的網域
- 確認 NEXTAUTH_SECRET 已設定

---

## 費用估算（免費方案）

| 服務 | 免費額度 | 典型 Demo 用量 |
|------|----------|---------------|
| Vercel | 100GB 頻寬/月 | ~1-5GB |
| Neon | 0.5GB 儲存、191 小時運算 | 足夠使用 |
| Cloudflare R2 | 10GB 儲存、無出口費 | ~100MB-1GB |
| OpenAI | 依用量計費（約 $0.01/張圖） | ~$1-5/月 |
| USDA API | 無限制（免費） | - |

**Demo 預估月費用：$0-5**（主要是 OpenAI 用量）

---

## 安全檢查清單

- [ ] 所有 API 金鑰儲存在 Vercel 環境變數（不在程式碼中）
- [ ] NEXTAUTH_SECRET 是強隨機字串
- [ ] R2 bucket 未設為公開存取
- [ ] 資料庫連線使用 SSL（`sslmode=require`）
- [ ] Google OAuth 憑證限制於你的網域
