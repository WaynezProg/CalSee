/**
 * Multi-item Food Recognition API Route
 * Based on Spec 003 - Multi-item Recognition
 *
 * POST /api/recognize
 *
 * Accepts an image and returns multi-item food recognition results.
 * Server-side route to protect API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';
import { createOpenAIProvider } from '@/lib/recognition/provider/openai';
import { createGeminiProvider } from '@/lib/recognition/provider/gemini';
import type { RecognitionProvider } from '@/lib/recognition/provider/base';
import { parseAndValidate, truncateItems } from '@/lib/recognition/parser';
import {
  type RecognitionApiRequest,
  type MultiItemRecognitionApiResponse,
  type RecognitionItem,
  type SupportedLocale,
  DEFAULT_LOCALE,
  isSupportedLocale,
  MultiItemRecognitionError,
} from '@/types/recognition';

/**
 * Log event structure for recognition requests.
 */
interface RecognitionLogEvent {
  event: 'recognition_request';
  requestId: string;
  apiType: string;
  success: boolean;
  status: number;
  errorCode?: string;
  itemCount?: number;
  locale: string;
  processingTimeMs: number;
  timestamp: string;
}

/**
 * Log recognition events.
 */
function logRecognitionEvent(event: RecognitionLogEvent) {
  const payload = JSON.stringify(event);
  if (event.success) {
    console.info(payload);
  } else {
    console.warn(payload);
  }
}

/**
 * Map error code to translated message.
 */
function getErrorMessage(code: MultiItemRecognitionError): string {
  const messageMap: Record<MultiItemRecognitionError, string> = {
    [MultiItemRecognitionError.CONSENT_REQUIRED]: translate('errors.consentRequired'),
    [MultiItemRecognitionError.INVALID_IMAGE]: translate('errors.invalidImage'),
    [MultiItemRecognitionError.NO_FOOD_DETECTED]: translate('errors.noFoodDetected'),
    [MultiItemRecognitionError.TIMEOUT]: translate('errors.recognitionTimeout'),
    [MultiItemRecognitionError.INVALID_JSON]: translate('errors.invalidJson'),
    [MultiItemRecognitionError.VALIDATION_ERROR]: translate('errors.validationError'),
    [MultiItemRecognitionError.INVALID_LOCALE]: translate('errors.invalidLocale'),
    [MultiItemRecognitionError.NETWORK_ERROR]: translate('errors.networkError'),
    [MultiItemRecognitionError.API_ERROR]: translate('errors.recognitionFailed'),
  };
  return messageMap[code] || translate('errors.recognitionFailed');
}

function shouldFallback(code: MultiItemRecognitionError): boolean {
  return (
    code === MultiItemRecognitionError.API_ERROR ||
    code === MultiItemRecognitionError.TIMEOUT ||
    code === MultiItemRecognitionError.INVALID_JSON ||
    code === MultiItemRecognitionError.VALIDATION_ERROR ||
    code === MultiItemRecognitionError.NETWORK_ERROR
  );
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MultiItemRecognitionApiResponse>> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const preferredApiType = process.env.RECOGNITION_API_TYPE || 'gemini';
  let apiType = preferredApiType;
  let status = 200;
  let locale: SupportedLocale = DEFAULT_LOCALE;
  let response: MultiItemRecognitionApiResponse = {
    success: false,
    error: {
      code: MultiItemRecognitionError.API_ERROR,
      message: translate('errors.recognitionFailed'),
    },
  };

  try {
    const body: RecognitionApiRequest = await request.json();

    // Validate consent
    if (!body.consent) {
      status = 400;
      response = {
        success: false,
        error: {
          code: MultiItemRecognitionError.CONSENT_REQUIRED,
          message: getErrorMessage(MultiItemRecognitionError.CONSENT_REQUIRED),
        },
      };
      return NextResponse.json(response, { status });
    }

    // Validate image data
    if (!body.image || !body.image.startsWith('data:image/')) {
      status = 400;
      response = {
        success: false,
        error: {
          code: MultiItemRecognitionError.INVALID_IMAGE,
          message: getErrorMessage(MultiItemRecognitionError.INVALID_IMAGE),
        },
      };
      return NextResponse.json(response, { status });
    }

    // Validate and set locale
    if (body.locale) {
      if (isSupportedLocale(body.locale)) {
        locale = body.locale;
      } else {
        // Log warning but default to zh-TW
        console.warn(`Invalid locale "${body.locale}", defaulting to ${DEFAULT_LOCALE}`);
        locale = DEFAULT_LOCALE;
      }
    }

    const openAiKey = process.env.RECOGNITION_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!openAiKey && !geminiKey) {
      console.error('Recognition API keys not configured');
      status = 500;
      response = {
        success: false,
        error: {
          code: MultiItemRecognitionError.API_ERROR,
          message: translate('errors.recognitionUnavailable'),
        },
      };
      return NextResponse.json(response, { status });
    }

    const providers: Array<{ name: string; handler: RecognitionProvider }> = [];
    const orderedTypes =
      preferredApiType === 'openai' ? ['openai', 'gemini'] : ['gemini', 'openai'];

    for (const type of orderedTypes) {
      if (type === 'gemini' && geminiKey) {
        providers.push({
          name: 'gemini',
          handler: createGeminiProvider({ apiKey: geminiKey, timeout: 30000 }),
        });
      }
      if (type === 'openai' && openAiKey) {
        providers.push({
          name: 'openai',
          handler: createOpenAIProvider({ apiKey: openAiKey, timeout: 30000 }),
        });
      }
    }

    if (providers.length === 0) {
      console.error('No recognition providers available');
      status = 500;
      response = {
        success: false,
        error: {
          code: MultiItemRecognitionError.API_ERROR,
          message: translate('errors.recognitionUnavailable'),
        },
      };
      return NextResponse.json(response, { status });
    }

    let lastErrorCode: MultiItemRecognitionError | undefined;

    for (const provider of providers) {
      apiType = provider.name;
      const providerResponse = await provider.handler.getJsonResponse(body.image, locale);

      if (!providerResponse.success || !providerResponse.rawJson) {
        const errorCode =
          (providerResponse.error?.code as MultiItemRecognitionError) ||
          MultiItemRecognitionError.API_ERROR;

        if (shouldFallback(errorCode)) {
          lastErrorCode = errorCode;
          continue;
        }

        status =
          errorCode === MultiItemRecognitionError.INVALID_IMAGE
            ? 400
            : errorCode === MultiItemRecognitionError.TIMEOUT
              ? 504
              : 500;
        response = {
          success: false,
          error: {
            code: errorCode,
            message: getErrorMessage(errorCode),
          },
        };
        return NextResponse.json(response, { status });
      }

      const parseResult = parseAndValidate(providerResponse.rawJson);

      if (!parseResult.success || !parseResult.data) {
        const errorCode =
          (parseResult.error?.code as MultiItemRecognitionError) ||
          MultiItemRecognitionError.VALIDATION_ERROR;

        if (shouldFallback(errorCode)) {
          lastErrorCode = errorCode;
          continue;
        }

        status = 500;
        response = {
          success: false,
          error: {
            code: errorCode,
            message: getErrorMessage(errorCode),
          },
        };
        return NextResponse.json(response, { status });
      }

      // Truncate items if more than 6 (per FR-001)
      const items: RecognitionItem[] = truncateItems(parseResult.data.items, 6);

      // Check for empty items
      if (items.length === 0) {
        status = 200; // Still a valid response, just no food detected
        response = {
          success: false,
          error: {
            code: MultiItemRecognitionError.NO_FOOD_DETECTED,
            message: getErrorMessage(MultiItemRecognitionError.NO_FOOD_DETECTED),
          },
        };
        return NextResponse.json(response, { status });
      }

      response = {
        success: true,
        data: {
          items,
          locale,
        },
      };

      return NextResponse.json(response, { status: 200 });
    }

    const finalError = lastErrorCode ?? MultiItemRecognitionError.API_ERROR;
    status = finalError === MultiItemRecognitionError.TIMEOUT ? 504 : 500;
    response = {
      success: false,
      error: {
        code: finalError,
        message: getErrorMessage(finalError),
      },
    };
    return NextResponse.json(response, { status });
  } catch (error) {
    console.error('Recognition API error:', error);
    status = 500;
    response = {
      success: false,
      error: {
        code: MultiItemRecognitionError.API_ERROR,
        message: translate('errors.recognitionFailed'),
      },
    };

    return NextResponse.json(response, { status });
  } finally {
    const processingTimeMs = Date.now() - startTime;
    const itemCount =
      response && 'data' in response && response.data ? response.data.items.length : undefined;

    logRecognitionEvent({
      event: 'recognition_request',
      requestId,
      apiType,
      success: response?.success ?? false,
      status,
      errorCode: response && 'error' in response ? response.error?.code : undefined,
      itemCount,
      locale,
      processingTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}
