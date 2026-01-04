# CalSee 部署快速運行檔（Vercel + Neon + R2）

> 目的：用最少步驟把專案部署到 Vercel，並完成資料庫與辨識服務設定。

## 0) 前置條件
- 已安裝 Vercel CLI 並登入：`vercel whoami`
- Neon 已建立專案並有 `DATABASE_URL`
- Cloudflare R2 已建立 bucket 與 API key
- OpenAI / Gemini / USDA 的 API key 已準備

## 1) 連結 Vercel 專案
```bash
vercel link
```
- 選擇建立新專案（或連到既有專案）

## 2) 設定環境變數（Production）
> 以下以 `vercel env add <NAME> production` 設定。

### 資料庫
```bash
vercel env add DATABASE_URL production
```
值：`postgresql://...`（Neon 連線字串）

### R2 物件儲存
```bash
vercel env add S3_ENDPOINT production
vercel env add S3_BUCKET production
vercel env add S3_ACCESS_KEY production
vercel env add S3_SECRET_KEY production
vercel env add S3_REGION production
vercel env add SIGNED_URL_EXPIRES_IN production
```
建議值：
- `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- `S3_BUCKET=calsee`
- `S3_ACCESS_KEY=<r2-access-key>`
- `S3_SECRET_KEY=<r2-secret-key>`
- `S3_REGION=auto`
- `SIGNED_URL_EXPIRES_IN=3600`

### 食物辨識 / 營養 API
```bash
# OpenAI
vercel env add RECOGNITION_API_KEY production

# Gemini
vercel env add GEMINI_API_KEY production

# 選擇辨識供應商：openai / gemini
vercel env add RECOGNITION_API_TYPE production

# USDA
vercel env add NUTRITION_API_KEY production
```

### NextAuth（本專案需要登入）
```bash
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
```

## 3) 資料庫同步（本地執行）
```bash
export DATABASE_URL="postgresql://..."  # Neon URL
npx prisma db push
```

## 4) 確保 Prisma client 會在 Vercel build 時生成
在 `package.json` 增加：
```json
"postinstall": "prisma generate"
```

## 5) 部署到 Vercel
```bash
vercel --prod
```
- 記下 alias（例如 `https://<project>.vercel.app`）

## 6) 更新 NEXTAUTH_URL（指向 alias）並重新部署
```bash
vercel env rm NEXTAUTH_URL production
vercel env add NEXTAUTH_URL production  # 填入 alias
vercel --prod
```

## 7) 切換辨識供應商（OpenAI / Gemini）
```bash
vercel env rm RECOGNITION_API_TYPE production
vercel env add RECOGNITION_API_TYPE production  # openai 或 gemini
vercel --prod
```

## 8) 驗證
- 直接開啟 alias URL
- 登入功能（Google OAuth）
- 食物辨識功能（觀察是否走指定供應商）
- 上傳照片（R2）

## 常見問題
- Build 失敗：`PrismaClient` 不存在
  - 解法：確保 `postinstall: prisma generate`
- NextAuth 無法登入
  - 解法：確認 `NEXTAUTH_URL` 與實際 alias 一致
  - 確認 Google OAuth redirect URI 已更新

