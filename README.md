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
