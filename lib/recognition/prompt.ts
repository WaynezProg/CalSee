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
    { "name": "食物名稱1", "confidence": 0.92, "portionUnit": "份", "notes": "可選的附加說明" },
    { "name": "食物名稱2", "confidence": 0.88, "portionUnit": "碗" }
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

JSON SCHEMA:
${JSON_SCHEMA_EXAMPLE}

RULES:
- "name": Food name in ${localeName} (required)
- "confidence": Recognition confidence 0.0-1.0 (optional but recommended)
- "portionUnit": Portion unit like "份", "碗", "盤", "杯" (optional)
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
4. Add a reasonable portion unit for each item when possible (e.g., "份", "碗", "盤", "杯")
5. Return results in JSON format with "items" array and "locale" field
6. Do NOT include plates, utensils, or non-food objects

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
