/**
 * Client-side Recognition Service
 * Based on Spec 003 - Multi-item Recognition
 *
 * Calls the /api/recognize route for multi-item food recognition.
 * Handles timeout and error cases.
 */

import type { FoodRecognitionResult, RecognitionError, RecognitionApiResponse } from '@/types/meal';
import type {
  MultiItemRecognitionApiResponse,
  MultiItemRecognitionResponse,
  MultiItemRecognitionError,
  SupportedLocale,
} from '@/types/recognition';
import { DEFAULT_LOCALE } from '@/types/recognition';
import { blobToDataUrl } from '@/lib/utils/image-compression';
import { translate } from '@/lib/i18n';

const API_TIMEOUT = 15000; // 15 seconds

/**
 * Multi-item recognition service result.
 */
interface MultiItemRecognitionServiceResult {
  success: boolean;
  data?: MultiItemRecognitionResponse;
  error?: {
    code: MultiItemRecognitionError;
    message: string;
  };
}

/**
 * Legacy single-item recognition service result.
 * @deprecated Use MultiItemRecognitionServiceResult instead
 */
interface RecognitionServiceResult {
  success: boolean;
  data?: FoodRecognitionResult;
  error?: {
    code: RecognitionError;
    message: string;
  };
}

/**
 * Recognize food from an image blob.
 *
 * @param imageBlob - Compressed image blob
 * @param hasConsent - Whether user has consented to cloud processing
 * @returns Promise resolving to recognition result
 */
export async function recognizeFood(
  imageBlob: Blob,
  hasConsent: boolean
): Promise<RecognitionServiceResult> {
  // Require consent
  if (!hasConsent) {
    return {
      success: false,
      error: {
        code: 'CONSENT_REQUIRED' as RecognitionError,
        message: translate('errors.consentRequired'),
      },
    };
  }

  try {
    // Convert blob to base64 data URL
    const imageDataUrl = await blobToDataUrl(imageBlob);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          consent: hasConsent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: RecognitionApiResponse = await response.json();

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: 'API_ERROR' as RecognitionError,
            message: translate('errors.recognitionFailed'),
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT' as RecognitionError,
            message: translate('errors.recognitionTimeout'),
          },
        };
      }

      throw error;
    }
  } catch (error) {
    console.error('Recognition service error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR' as RecognitionError,
        message: translate('errors.networkError'),
      },
    };
  }
}

/**
 * Recognize food with retry logic.
 *
 * @param imageBlob - Compressed image blob
 * @param hasConsent - Whether user has consented to cloud processing
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Promise resolving to recognition result
 */
export async function recognizeFoodWithRetry(
  imageBlob: Blob,
  hasConsent: boolean,
  maxRetries: number = 2
): Promise<RecognitionServiceResult> {
  let lastError: RecognitionServiceResult['error'];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await recognizeFood(imageBlob, hasConsent);

    if (result.success) {
      return result;
    }

    // Don't retry for certain error types
    if (
      result.error?.code === 'CONSENT_REQUIRED' ||
      result.error?.code === 'INVALID_IMAGE' ||
      result.error?.code === 'NO_FOOD_DETECTED'
    ) {
      return result;
    }

    lastError = result.error;

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  return {
    success: false,
    error: lastError || {
      code: 'API_ERROR' as RecognitionError,
      message: translate('errors.recognitionFailed'),
    },
  };
}

/**
 * Recognize multiple food items from an image blob.
 * Based on Spec 003 - Multi-item Recognition
 *
 * @param imageBlob - Compressed image blob
 * @param hasConsent - Whether user has consented to cloud processing
 * @param locale - Target locale for recognition results (default: "zh-TW")
 * @returns Promise resolving to multi-item recognition result
 */
export async function recognizeMultipleFood(
  imageBlob: Blob,
  hasConsent: boolean,
  locale: SupportedLocale = DEFAULT_LOCALE
): Promise<MultiItemRecognitionServiceResult> {
  // Require consent
  if (!hasConsent) {
    return {
      success: false,
      error: {
        code: 'CONSENT_REQUIRED' as MultiItemRecognitionError,
        message: translate('errors.consentRequired'),
      },
    };
  }

  try {
    // Convert blob to base64 data URL
    const imageDataUrl = await blobToDataUrl(imageBlob);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch('/api/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          consent: hasConsent,
          locale,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: MultiItemRecognitionApiResponse = await response.json();

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
        };
      } else {
        // When success is false, error exists on the response
        const errorResponse = result as { success: false; error: { code: MultiItemRecognitionError; message: string } };
        return {
          success: false,
          error: errorResponse.error || {
            code: 'API_ERROR' as MultiItemRecognitionError,
            message: translate('errors.recognitionFailed'),
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT' as MultiItemRecognitionError,
            message: translate('errors.recognitionTimeout'),
          },
        };
      }

      throw error;
    }
  } catch (error) {
    console.error('Multi-item recognition service error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR' as MultiItemRecognitionError,
        message: translate('errors.networkError'),
      },
    };
  }
}

/**
 * Recognize multiple food items with retry logic.
 *
 * @param imageBlob - Compressed image blob
 * @param hasConsent - Whether user has consented to cloud processing
 * @param locale - Target locale for recognition results (default: "zh-TW")
 * @param maxRetries - Maximum number of retries (default: 2)
 * @returns Promise resolving to multi-item recognition result
 */
export async function recognizeMultipleFoodWithRetry(
  imageBlob: Blob,
  hasConsent: boolean,
  locale: SupportedLocale = DEFAULT_LOCALE,
  maxRetries: number = 2
): Promise<MultiItemRecognitionServiceResult> {
  let lastError: MultiItemRecognitionServiceResult['error'];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await recognizeMultipleFood(imageBlob, hasConsent, locale);

    if (result.success) {
      return result;
    }

    // Don't retry for certain error types
    if (
      result.error?.code === 'CONSENT_REQUIRED' ||
      result.error?.code === 'INVALID_IMAGE' ||
      result.error?.code === 'NO_FOOD_DETECTED'
    ) {
      return result;
    }

    lastError = result.error;

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }

  return {
    success: false,
    error: lastError || {
      code: 'API_ERROR' as MultiItemRecognitionError,
      message: translate('errors.recognitionFailed'),
    },
  };
}
