# CalSee
[![Demo Video](https://img.youtube.com/vi/QGiLpQ6wZDE/0.jpg)](https://youtube.com/shorts/QGiLpQ6wZDE)

> 💡 **Click the image above to watch the full demo video** showing the complete workflow of the application.

[中文說明](README.zh-TW.md)

CalSee is a Next.js proof-of-concept for logging meals by photo. It compresses images in the browser, optionally uses a cloud vision API for recognition, fetches nutrition estimates from USDA FoodData Central with an AI fallback, and stores everything locally in IndexedDB.

## Features

- Photo capture or upload with client-side compression
- **Multi-item food recognition** - AI can recognize multiple food items (1-6) in a single photo
- Progressive nutrition lookup with React Query for parallel fetching
- Inline editing of food items with portion size and unit customization
- AI-estimated portions (count/weight + bowl/plate size) to auto-scale nutrition; users can override
- Nutrition lookup with client-side caching and AI fallback when USDA is missing data
- Local-only storage (IndexedDB) with photo blobs, nutrition cache, and consent
- Optional Google sign-in via NextAuth (JWT session)
- Meal history, detail view, edit, and delete
- i18n-ready UI (Traditional Chinese default)

## Tech Stack

- Next.js App Router, React, TypeScript
- React Query (TanStack Query) for data fetching and caching
- NextAuth.js (Google OAuth)
- IndexedDB (native API)
- Tailwind CSS
- OpenAI Vision API or Google Gemini API
- OpenAI Chat Completions (nutrition fallback)
- USDA FoodData Central API

## Requirements

- Node.js 18+
- API keys for recognition and nutrition services
- Google OAuth credentials (optional, for sign-in)

## Getting API Keys

### Recognition API (Choose One)

**Option 1: OpenAI Vision API (Recommended)**
1. Sign up at [platform.openai.com](https://platform.openai.com/signup)
2. Go to [API Keys](https://platform.openai.com/api-keys)
3. Click "Create new secret key"
4. Copy your key and set `RECOGNITION_API_TYPE=openai`

> Note: Requires payment method. See [pricing](https://openai.com/pricing).

**Option 2: Google Gemini API**
1. Create a project in [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Set `RECOGNITION_API_TYPE=gemini`
4. Put your key in `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)

> Note: Usage is billed by Google. See pricing in Google AI Studio.

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
RECOGNITION_API_TYPE=openai  # or gemini
GEMINI_API_KEY=your_key      # optional, for gemini
NUTRITION_API_KEY=your_key

# Optional: enable Google sign-in
NEXTAUTH_SECRET=your_random_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
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
  (auth)/           # Sign-in and error pages
  api/              # Server routes for recognition, nutrition, and auth
  add/              # Add meal flow
  components/
    meals/          # Meal-related components (MealItemList, MultiItemMealForm, etc.)
    providers/      # React Query and other providers
    ui/             # Shared UI components
  history/          # Meal history page
  settings/         # Settings and privacy controls
  page.tsx          # Home dashboard
lib/
  db/               # IndexedDB helpers
  i18n/             # i18n utilities and messages
  nutrition/        # Nutrition lookup with React Query hooks
  services/         # Client API services
  utils/            # Utilities (image compression, etc.)
types/              # Shared TypeScript types (MealItem, Meal, recognition types)
```

## Notes

- All meal data and photos are stored locally in the browser (no accounts or cloud sync).
- Cloud recognition requires explicit consent and is handled via server-side API routes to protect keys.
- Multi-item recognition supports 1-6 food items per photo with confidence scores.
- Nutrition data is fetched progressively in parallel using React Query.
- Portion scaling uses AI-estimated bowl/plate sizes and counts; metric units are supported for manual overrides.
- AI nutrition fallback uses the same `RECOGNITION_API_KEY` when OpenAI is selected.

## License

MIT
