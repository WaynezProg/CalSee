# CalSee

CalSee is a Next.js proof-of-concept for logging meals by photo. It compresses images in the browser, optionally uses a cloud vision API for recognition, fetches nutrition estimates from USDA FoodData Central, and stores everything locally in IndexedDB.

## Features

- Photo capture or upload with client-side compression
- AI food recognition via server-side API route (consent required)
- Nutrition lookup with client-side caching
- Local-only storage (IndexedDB) with photo blobs
- Meal history, detail view, edit, and delete
- i18n-ready UI (Traditional Chinese messages included)

## Tech Stack

- Next.js App Router, React, TypeScript
- IndexedDB (native API)
- Tailwind CSS
- OpenAI Vision API or Google Cloud Vision API
- USDA FoodData Central API

## Requirements

- Node.js 18+
- API keys for recognition and nutrition services

## Getting API Keys

### Recognition API (Choose One)

**Option 1: OpenAI Vision API (Recommended)**
1. Sign up at [platform.openai.com](https://platform.openai.com/signup)
2. Go to [API Keys](https://platform.openai.com/api-keys)
3. Click "Create new secret key"
4. Copy your key and set `RECOGNITION_API_TYPE=openai`

> Note: Requires payment method. See [pricing](https://openai.com/pricing).

**Option 2: Google Cloud Vision API**
1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
3. Go to APIs & Services > Credentials
4. Click "Create Credentials" > "API key"
5. Copy your key and set `RECOGNITION_API_TYPE=google`

> Note: New accounts get $300 free credits. See [pricing](https://cloud.google.com/vision/pricing).

### Nutrition API

**USDA FoodData Central API (Free)**
1. Go to [API Key Signup](https://fdc.nal.usda.gov/api-key-signup.html)
2. Enter your name and email
3. Check your email for the API key (arrives within minutes)

> This API is completely free with generous rate limits.

## Setup

```bash
npm install
```

Create `.env.local` in the repo root:

```bash
RECOGNITION_API_KEY=your_key
RECOGNITION_API_TYPE=openai  # or google
NUTRITION_API_KEY=your_key
```

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run format:write
```

## Project Structure

```
app/
  api/              # Server routes for recognition & nutrition
  components/       # UI components
  history/          # Meal history page
  page.tsx          # Home flow
lib/
  db/               # IndexedDB helpers
  i18n/             # i18n utilities and messages
  services/         # Client API services
  utils/            # Utilities (image compression, etc.)
types/              # Shared TypeScript types
```

## Notes

- All meal data and photos are stored locally in the browser (no accounts or cloud sync).
- Cloud recognition requires explicit consent and is handled via server-side API routes to protect keys.

## License

MIT
