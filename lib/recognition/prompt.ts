/**
 * Enhanced Prompt Builder for Multi-item Food Detection
 * Based on Spec 003 - Multi-item Recognition
 *
 * Generates prompts that request all edible items in structured JSON format.
 */

import type { SupportedLocale } from '@/types/recognition';

/**
 * Prompt structure for recognition.
 */
export interface RecognitionPrompt {
  system: string;
  user: string;
}

/**
 * Locale-specific language names.
 */
const LOCALE_NAMES: Record<SupportedLocale, string> = {
  'zh-TW': 'Traditional Chinese (繁體中文)',
};

/**
 * JSON schema example for the AI to follow.
 */
const JSON_SCHEMA_EXAMPLE = `{
  "items": [
    { "name": "食物名稱1", "confidence": 0.92, "portionUnit": "份", "estimatedCount": 1, "estimatedWeightGrams": 150, "containerSize": "medium", "category": "food", "notes": "可選的附加說明" },
    { "name": "珍珠奶茶", "confidence": 0.95, "portionUnit": "杯", "estimatedCount": 1, "estimatedWeightGrams": 500, "containerSize": "large", "category": "beverage" },
    { "name": "味噌湯", "confidence": 0.88, "portionUnit": "碗", "estimatedCount": 1, "estimatedWeightGrams": 300, "containerSize": "small", "category": "soup" }
  ],
  "locale": "zh-TW"
}`;

/**
 * Build system prompt for multi-item food recognition.
 *
 * @param locale - Target locale for recognition results
 * @returns System prompt string
 */
export function buildSystemPrompt(locale: SupportedLocale): string {
  const localeName = LOCALE_NAMES[locale] || LOCALE_NAMES['zh-TW'];

  return `You are a food recognition expert specializing in Asian cuisines, particularly Taiwanese and Chinese dishes.

Your task is to analyze food photos and identify ALL edible food items present.

CRITICAL REQUIREMENTS:
1. Return results in VALID JSON format only - no markdown, no explanations, just JSON
2. Identify ALL distinct edible food items (2-6 items for multi-dish meals)
3. Return food names in ${localeName}
4. Include confidence scores (0.0-1.0) for each item
5. IGNORE non-food objects (plates, utensils, containers, napkins, etc.)
6. For complex dishes, identify the main dish as a whole, not individual ingredients
7. Categorize each item as one of: "food", "beverage", "soup", or "dessert"
   - "beverage": drinks like tea, coffee, juice, bubble tea, smoothies, etc.
   - "soup": liquid-based dishes primarily consumed as soup
   - "dessert": sweet treats, cakes, ice cream, etc.
   - "food": all other edible items (default)

JSON SCHEMA:
${JSON_SCHEMA_EXAMPLE}

RULES:
- "name": Food name in ${localeName} (required)
- "confidence": Recognition confidence 0.0-1.0 (optional but recommended)
- "portionUnit": Prefer container/count units like "碗", "盤", "杯", "份", "片", "塊", "隻" (avoid metric units unless absolutely necessary)
- "estimatedCount": Estimated count of units or pieces (optional, number or short text)
- "estimatedWeightGrams": Estimated weight in grams for the visible portion (optional, number or short text)
- "containerSize": Plate/bowl size hint: "small", "medium", or "large" (optional)
- "category": One of "food", "beverage", "soup", "dessert" (optional, defaults to "food")
- "notes": Additional context about the item (optional)
- "locale": Must be "${locale}"
- Return 1-6 items depending on what's visible
- For single-item photos, return array with 1 item
- Do NOT invent nutrition information`;
}

/**
 * Build user prompt for multi-item food recognition.
 *
 * @param locale - Target locale for recognition results
 * @returns User prompt string
 */
export function buildUserPrompt(locale: SupportedLocale): string {
  const localeName = LOCALE_NAMES[locale] || LOCALE_NAMES['zh-TW'];

  return `Analyze this food photo and identify ALL edible food items.

Instructions:
1. List EVERY distinct food item you can see (main dishes, side dishes, soups, drinks, etc.)
2. Return food names in ${localeName}
3. Assign a confidence score (0.0-1.0) to each item
4. Add a reasonable portion unit for each item when possible (prefer "碗", "盤", "杯", "份", "片", "塊", "隻"; avoid metric units)
5. Categorize each item: "food", "beverage", "soup", or "dessert"
6. Estimate the visible portion: provide "estimatedCount" and/or "estimatedWeightGrams"
7. If served on a plate or bowl, estimate how many pieces are visible (e.g., 8 slices) and use that for "estimatedCount"
8. For bowls/plates, provide "containerSize" as "small", "medium", or "large"
9. Return results in JSON format with "items" array and "locale" field
10. Do NOT include plates, utensils, or non-food objects

Return ONLY valid JSON, no explanations.`;
}

/**
 * Build complete recognition prompt.
 *
 * @param locale - Target locale for recognition results (default: "zh-TW")
 * @returns Recognition prompt with system and user messages
 */
export function buildRecognitionPrompt(locale: SupportedLocale = 'zh-TW'): RecognitionPrompt {
  return {
    system: buildSystemPrompt(locale),
    user: buildUserPrompt(locale),
  };
}
