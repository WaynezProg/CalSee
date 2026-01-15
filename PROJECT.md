# PROJECT.md

Technical details for the CalSee project. For AI behavior guidelines, see [CLAUDE.md](./CLAUDE.md).

---

## Project Overview

CalSee is a Next.js meal photo logging application for Asian markets. Users photograph meals, get AI-based multi-item food recognition (1-6 items per photo), and view nutrition estimates from USDA FoodData Central with AI fallback. Privacy-first design uses IndexedDB for local storage with optional cloud sync.

---

## Build & Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npm run format:write # Prettier auto-fix

# Local environment (Docker-based PostgreSQL + MinIO)
./run.sh start       # Start containers
./run.sh stop        # Stop containers
./run.sh status      # Check status

# Database
npx prisma generate                    # Regenerate Prisma client
npx prisma migrate dev --name <name>   # Create migration
npx prisma migrate status              # Check migration status
```

---

## Architecture

### Data Flow

```
Photo Capture → Recognition API → Nutrition Lookup → Storage
     │              │                   │              │
     ▼              ▼                   ▼              ▼
  Camera      OpenAI/Gemini      USDA + AI       IndexedDB
  Component      Vision          Fallback        + PostgreSQL
```

1. **Photo Capture** — Camera component captures/uploads image
2. **Recognition** — `/api/recognize` calls OpenAI Vision or Gemini API → returns multi-item array
3. **Nutrition Lookup** — `/api/nutrition` queries USDA FoodData Central → AI fallback via `/api/nutrition-ai`
4. **Storage** — IndexedDB (local) + optional PostgreSQL sync via queue

### Key Directories

| Directory               | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `app/api/`              | Server routes protecting API keys (recognize, nutrition, auth, sync) |
| `app/components/meals/` | Multi-item form, nutrition summary, item cards                       |
| `lib/recognition/`      | Provider abstraction (OpenAI, Gemini), parser, schema                |
| `lib/nutrition/`        | USDA lookup with React Query hooks                                   |
| `lib/db/indexeddb/`     | Local persistence, sync queue, thumbnail cache                       |
| `lib/services/`         | Business logic layer                                                 |
| `types/`                | TypeScript type definitions                                          |

### Tech Stack

| Category      | Technology                           |
| ------------- | ------------------------------------ |
| Framework     | Next.js 16 + React 19 + TypeScript 5 |
| Styling       | Tailwind CSS 4                       |
| Data Fetching | React Query 5                        |
| Database      | Prisma 7 + PostgreSQL                |
| Storage       | AWS S3 / Cloudflare R2 (photos)      |
| Auth          | NextAuth.js 5 beta (Google OAuth)    |
| i18n          | next-intl (default: zh-TW)           |

---

## Data Models

### Prisma Schema (Main Models)

**Meal**

- `userId`, `timestamp`, `photoId`
- `totalCalories`, `totalProtein`, `totalCarbs`, `totalFat` (cached)
- `items[]` → MealItem

**MealItem**

- Basic: `foodName`, `portionSize`, `portionUnit`, `containerSize`
- Nutrition: `calories`, `protein`, `carbs`, `fat` + 12 extended nutrients
- Beverage: `category`, `sugarLevel`, `iceLevel`, `baseSugar`
- AI estimates: `aiEstimatedWeightGrams`, `confidence`

**Photo**

- `mainPhotoKey`, `thumbnailKey`
- `width`, `height`, `mimeType`

### Recognition Response Schema

```typescript
interface RecognitionItem {
  name: string; // Food name
  confidence?: number; // 0.0-1.0
  portionUnit?: string; // "碗", "盤", "杯", "份"
  category?: 'food' | 'beverage' | 'soup' | 'dessert';
  estimatedCount?: number | string;
  estimatedWeightGrams?: number | string;
  containerSize?: 'small' | 'medium' | 'large';
  notes?: string;
}
```

---

## MCP Server Usage

| Server              | Purpose                         | When to Use                                           |
| ------------------- | ------------------------------- | ----------------------------------------------------- |
| **Context7**        | Library docs & API references   | Prioritize over training data when looking up docs    |
| **Semgrep**         | Security vulnerability scanning | Scan generated code (auth, input handling, DB)        |
| **Chrome DevTools** | Frontend debugging              | DOM inspection, network/performance profiling         |
| **Draw.io**         | Architecture diagrams           | When visual representation helps explain architecture |
| **shadcn/ui**       | React component code            | When working with React/Next.js UI components         |

---

## Environment Variables

```bash
# Required
DATABASE_URL=           # PostgreSQL connection string
NEXTAUTH_SECRET=        # NextAuth.js secret
NEXTAUTH_URL=           # App URL

# AI Providers (at least one)
OPENAI_API_KEY=         # OpenAI Vision
GOOGLE_AI_API_KEY=      # Gemini

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

# Optional
USDA_API_KEY=           # FoodData Central
```

---

## Common Patterns

### API Route Structure

```typescript
// app/api/example/route.ts
export async function POST(request: Request) {
  // 1. Auth check (if needed)
  // 2. Validate input
  // 3. Business logic
  // 4. Return response
}
```

### React Query Hook Pattern

```typescript
// lib/hooks/useExample.ts
export function useExample(params: Params) {
  return useQuery({
    queryKey: ['example', params],
    queryFn: () => fetchExample(params),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Sync Queue Pattern

```typescript
// Local-first, background sync
await saveToIndexedDB(data);
await addToSyncQueue(data, 'create');
// Queue processor handles actual API call
```
