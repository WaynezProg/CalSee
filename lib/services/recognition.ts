/**
 * Client-side Recognition Service
 *
 * Calls the /api/recognize route for food recognition.
 * Handles timeout and error cases.
 */

import type { FoodRecognitionResult, RecognitionApiResponse, RecognitionError } from '@/types/meal';
import { blobToDataUrl } from '@/lib/utils/image-compression';
import { translate } from '@/lib/i18n';

const API_TIMEOUT = 3000; // 3 seconds

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
