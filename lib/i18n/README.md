# i18n (Internationalization) System

This directory contains the internationalization infrastructure for CalSee.

## Overview

CalSee uses a custom i18n system based on JSON message catalogs. The system supports:

- Traditional Chinese (zh-TW) as the default and primary locale
- Parameterized messages (e.g., `{count}` placeholders)
- Nested message keys for organization
- Server-side and client-side translation support

## Directory Structure

```
lib/i18n/
├── index.ts           # Main exports (I18nProvider, useI18n, translate)
├── messages/
│   └── zh-TW.json     # Traditional Chinese message catalog
└── README.md          # This file
```

## Message Catalog Format

Messages are organized in a nested JSON structure:

```json
{
  "namespace": {
    "key": "Translation text",
    "parameterized": "Found {count} items"
  }
}
```

### Accessing Messages

Use dot notation to access nested keys:

```typescript
// Client-side
const { t } = useI18n();
t('mealForm.items.detected', { count: 3 });

// Server-side
import { translate } from '@/lib/i18n';
translate('errors.networkError');
```

## Adding New Messages

1. Add the message to `messages/zh-TW.json`:

```json
{
  "newNamespace": {
    "newKey": "新的訊息"
  }
}
```

2. Use in components:

```typescript
const { t } = useI18n();
const message = t('newNamespace.newKey');
```

## Parameterized Messages

Use `{placeholder}` syntax for dynamic values:

```json
{
  "mealForm": {
    "items": {
      "detected": "偵測到 {count} 個項目"
    }
  }
}
```

```typescript
t('mealForm.items.detected', { count: 5 });
// Output: "偵測到 5 個項目"
```

## Adding New Locales

To add a new locale (e.g., `en-US`):

1. Create a new message file: `messages/en-US.json`
2. Copy the structure from `zh-TW.json`
3. Translate all messages
4. Update `index.ts` to support the new locale

## Key Message Namespaces

| Namespace     | Purpose                            |
| ------------- | ---------------------------------- |
| `meta`        | Page metadata (title, description) |
| `app`         | Application name and tagline       |
| `nav`         | Navigation labels                  |
| `home`        | Home page content                  |
| `errors`      | Error messages                     |
| `camera`      | Camera capture UI                  |
| `mealForm`    | Meal form labels and messages      |
| `mealHistory` | Meal history display               |
| `mealDetail`  | Meal detail view                   |
| `consent`     | Privacy consent dialog             |
| `settings`    | Settings page                      |

## Best Practices

1. Always use message keys, never hard-coded strings
2. Use descriptive, hierarchical keys
3. Keep translations concise but clear
4. Use parameterization for dynamic content
5. Test UI with different text lengths
