/**
 * Recognition Response Parser
 * Based on Spec 003 - Multi-item Recognition
 *
 * Centralized parsing and validation for recognition responses.
 * Single source of truth for response validation.
 */

import {
  MultiItemRecognitionResponseSchema,
  type MultiItemRecognitionResponseFromSchema,
} from './schema';

/**
 * Parser result type.
 */
export interface ParseResult {
  success: boolean;
  data?: MultiItemRecognitionResponseFromSchema;
  error?: {
    code: 'INVALID_JSON' | 'VALIDATION_ERROR';
    message: string;
  };
}

/**
 * Log event for parser operations.
 */
interface ParseLogEvent {
  event: 'recognition_parse';
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  itemCount?: number;
  timestamp: string;
}

/**
 * Log parser events.
 */
function logParseEvent(event: ParseLogEvent): void {
  const payload = JSON.stringify(event);
  if (event.success) {
    console.info(payload);
  } else {
    console.warn(payload);
  }
}

/**
 * Parse and validate recognition response.
 *
 * This is the centralized validation point for all recognition responses.
 * The route.ts should call this function and NOT duplicate validation logic.
 *
 * @param rawJson - Raw JSON string from AI service
 * @returns ParseResult with validated data or error
 */
export function parseAndValidate(rawJson: string): ParseResult {
  const timestamp = new Date().toISOString();

  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    // Handle potential markdown code blocks
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logParseEvent({
        event: 'recognition_parse',
        success: false,
        errorCode: 'INVALID_JSON',
        errorMessage: 'No JSON object found in response',
        timestamp,
      });
      return {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'No JSON object found in response',
        },
      };
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown JSON parse error';
    logParseEvent({
      event: 'recognition_parse',
      success: false,
      errorCode: 'INVALID_JSON',
      errorMessage: message,
      timestamp,
    });
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: `Failed to parse JSON: ${message}`,
      },
    };
  }

  // Step 2: Validate with Zod schema
  const result = MultiItemRecognitionResponseSchema.safeParse(parsed);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');

    logParseEvent({
      event: 'recognition_parse',
      success: false,
      errorCode: 'VALIDATION_ERROR',
      errorMessage: errorMessages,
      timestamp,
    });

    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${errorMessages}`,
      },
    };
  }

  // Success
  logParseEvent({
    event: 'recognition_parse',
    success: true,
    itemCount: result.data.items.length,
    timestamp,
  });

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Truncate items array to maximum allowed (6 items).
 * Returns top items by confidence if available, otherwise first 6.
 *
 * @param items - Array of recognition items
 * @param maxItems - Maximum number of items (default: 6)
 * @returns Truncated array
 */
export function truncateItems<T extends { confidence?: number }>(
  items: T[],
  maxItems: number = 6,
): T[] {
  if (items.length <= maxItems) {
    return items;
  }

  // Sort by confidence (descending) if available
  const hasConfidence = items.some((item) => item.confidence != null);
  if (hasConfidence) {
    const sorted = [...items].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    return sorted.slice(0, maxItems);
  }

  // Otherwise return first N items
  return items.slice(0, maxItems);
}
