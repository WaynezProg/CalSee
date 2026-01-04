/**
 * Multi-item Food Recognition Types
 * Based on Spec 003 - Multi-item Recognition
 */

/**
 * Single food item from recognition response.
 */
export interface RecognitionItem {
  name: string;              // Food item name in specified locale
  confidence?: number;       // Recognition confidence (0.0-1.0)
  notes?: string;            // Additional notes about the item
  portionUnit?: string;      // Portion unit (e.g., "份", "碗")
}

/**
 * Multi-item recognition response from API.
 */
export interface MultiItemRecognitionResponse {
  items: RecognitionItem[];  // Array of recognized food items (1-6 items)
  locale: string;            // Locale identifier (e.g., "zh-TW")
}

/**
 * Recognition API success response.
 */
export interface RecognitionApiSuccessResponse {
  success: true;
  data: MultiItemRecognitionResponse;
}

/**
 * Recognition API error response.
 */
export interface RecognitionApiErrorResponse {
  success: false;
  error: {
    code: MultiItemRecognitionError;
    message: string;
  };
}

/**
 * Recognition API response union type.
 */
export type MultiItemRecognitionApiResponse = RecognitionApiSuccessResponse | RecognitionApiErrorResponse;

/**
 * Recognition error types for multi-item recognition.
 */
export enum MultiItemRecognitionError {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_IMAGE = 'INVALID_IMAGE',
  NO_FOOD_DETECTED = 'NO_FOOD_DETECTED',
  INVALID_JSON = 'INVALID_JSON',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  INVALID_LOCALE = 'INVALID_LOCALE',
}

/**
 * Recognition API request body.
 */
export interface RecognitionApiRequest {
  image: string;         // Base64-encoded image data
  consent: boolean;      // User consent for cloud processing
  locale?: string;       // Optional locale parameter (default: "zh-TW")
}

/**
 * Default locale for recognition.
 */
export const DEFAULT_LOCALE = 'zh-TW';

/**
 * Supported locales.
 */
export const SUPPORTED_LOCALES = ['zh-TW'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Check if a locale is supported.
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}
