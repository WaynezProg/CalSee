# CalSee Deployment Guide

This guide covers deploying CalSee to production using **Vercel + Neon PostgreSQL + Cloudflare R2**.

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│    Neon     │     │ Cloudflare  │
│  (Next.js)  │     │ (PostgreSQL)│     │     R2      │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       ▲
       │                                       │
       └───────────────────────────────────────┘
                  (Photo Storage)
```

## Prerequisites

- GitHub account (for Vercel deployment)
- Vercel account (free tier)
- Neon account (free tier)
- Cloudflare account (free tier)
- OpenAI API key (for food recognition)
- USDA FoodData Central API key (free)
- Google OAuth credentials (optional, for sign-in)

---

## Step 1: Set Up Neon PostgreSQL

### 1.1 Create Neon Account

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click "Create a project"
3. Choose a project name (e.g., `calsee`)
4. Select the region closest to your users
5. Click "Create project"

### 1.2 Get Connection String

1. In the Neon dashboard, go to your project
2. Click "Connection Details"
3. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```
4. Save this as `DATABASE_URL`

### 1.3 Run Database Migration

You can run migrations locally before deploying:

```bash
# Set the DATABASE_URL temporarily
export DATABASE_URL="postgresql://..."

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push
```

---

## Step 2: Set Up Cloudflare R2

### 2.1 Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com) and sign up
2. Navigate to "R2 Object Storage" in the sidebar

### 2.2 Create R2 Bucket

1. Click "Create bucket"
2. Enter bucket name: `calsee-photos`
3. Choose location hint (auto or specific region)
4. Click "Create bucket"

### 2.3 Create API Token

1. Go to "R2 Object Storage" > "Manage R2 API Tokens"
2. Click "Create API token"
3. Give it a name (e.g., `calsee-production`)
4. Select permissions:
   - "Object Read & Write"
5. Specify bucket access: Select your `calsee-photos` bucket
6. Click "Create API Token"
7. **Important**: Copy and save these values immediately:
   - Access Key ID → `S3_ACCESS_KEY`
   - Secret Access Key → `S3_SECRET_KEY`

### 2.4 Get R2 Endpoint

Your R2 endpoint follows this format:

```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Find your Account ID:

1. Go to Cloudflare Dashboard
2. Click on any domain or R2
3. Look for "Account ID" in the right sidebar

Save as `S3_ENDPOINT`.

---

## Step 3: Set Up Vercel

### 3.1 Import Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Select the CalSee repository

### 3.2 Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 3.3 Add Environment Variables

In the Vercel project settings, add these environment variables:

#### Database

| Variable       | Value              | Description            |
| -------------- | ------------------ | ---------------------- |
| `DATABASE_URL` | `postgresql://...` | Neon connection string |

#### S3 Storage (Cloudflare R2)

| Variable                | Value                                           | Description                 |
| ----------------------- | ----------------------------------------------- | --------------------------- |
| `S3_ENDPOINT`           | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | R2 endpoint                 |
| `S3_BUCKET`             | `calsee-photos`                                 | Bucket name                 |
| `S3_ACCESS_KEY`         | `<your-access-key>`                             | R2 API token access key     |
| `S3_SECRET_KEY`         | `<your-secret-key>`                             | R2 API token secret key     |
| `S3_REGION`             | `auto`                                          | Use `auto` for R2           |
| `SIGNED_URL_EXPIRES_IN` | `3600`                                          | Signed URL expiry (seconds) |

#### Recognition & Nutrition APIs

| Variable               | Value        | Description               |
| ---------------------- | ------------ | ------------------------- |
| `RECOGNITION_API_KEY`  | `sk-...`     | OpenAI API key            |
| `RECOGNITION_API_TYPE` | `openai`     | `openai` or `google`      |
| `NUTRITION_API_KEY`    | `<usda-key>` | USDA FoodData Central key |

#### Authentication (Optional)

| Variable               | Value                         | Description                             |
| ---------------------- | ----------------------------- | --------------------------------------- |
| `NEXTAUTH_SECRET`      | `<random-string>`             | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL`         | `https://your-app.vercel.app` | Your production URL                     |
| `GOOGLE_CLIENT_ID`     | `<client-id>`                 | Google OAuth client ID                  |
| `GOOGLE_CLIENT_SECRET` | `<client-secret>`             | Google OAuth client secret              |

### 3.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

---

## Step 4: Post-Deployment

### 4.1 Run Database Migration

After first deployment, run the Prisma migration:

```bash
# Option 1: Run locally with production DATABASE_URL
export DATABASE_URL="postgresql://..."
npx prisma db push

# Option 2: Use Vercel CLI
vercel env pull .env.local
npx prisma db push
```

### 4.2 Configure CORS for R2 (if needed)

If you experience CORS issues with photo uploads:

1. Go to R2 bucket settings
2. Add CORS policy:

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

### 4.3 Update Google OAuth Redirect URIs

If using Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add authorized redirect URI:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

---

## Environment Variables Reference

Create a `.env.local` file for local development:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# S3 Storage (Cloudflare R2)
S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
S3_BUCKET="calsee-photos"
S3_ACCESS_KEY="your-r2-access-key"
S3_SECRET_KEY="your-r2-secret-key"
S3_REGION="auto"
SIGNED_URL_EXPIRES_IN=3600

# Recognition API
RECOGNITION_API_KEY="sk-your-openai-key"
RECOGNITION_API_TYPE="openai"

# Nutrition API
NUTRITION_API_KEY="your-usda-api-key"

# Authentication (Optional)
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## Troubleshooting

### Database Connection Issues

- Ensure `?sslmode=require` is in the connection string
- Check if Neon project is active (free tier pauses after inactivity)
- Verify IP allowlist in Neon settings

### R2 Upload Failures

- Verify S3_ENDPOINT format (no trailing slash)
- Check API token permissions include write access
- Ensure bucket name matches exactly

### Build Failures

- Run `npm run build` locally to check for errors
- Ensure all environment variables are set in Vercel
- Check Prisma client is generated: `npx prisma generate`

### Authentication Issues

- Verify NEXTAUTH_URL matches your deployment URL
- Check Google OAuth redirect URIs include your domain
- Ensure NEXTAUTH_SECRET is set

---

## Cost Estimation (Free Tier)

| Service       | Free Tier Limit              | Typical Demo Usage |
| ------------- | ---------------------------- | ------------------ |
| Vercel        | 100GB bandwidth/month        | ~1-5GB             |
| Neon          | 0.5GB storage, 191h compute  | Sufficient         |
| Cloudflare R2 | 10GB storage, no egress fees | ~100MB-1GB         |
| OpenAI        | Pay-as-you-go (~$0.01/image) | ~$1-5/month        |
| USDA API      | Unlimited (free)             | -                  |

**Estimated monthly cost for demo: $0-5** (mainly OpenAI usage)

---

## Security Checklist

- [ ] All API keys stored in Vercel environment variables (not in code)
- [ ] NEXTAUTH_SECRET is a strong random string
- [ ] R2 bucket is not publicly accessible
- [ ] Database connection uses SSL (`sslmode=require`)
- [ ] Google OAuth credentials restricted to your domain
