/**
 * Gemini Vision Provider Implementation
 * Based on Spec 003 - Multi-item Recognition
 *
 * Implements the RecognitionProvider interface for Gemini API.
 */

import { GoogleGenAI } from '@google/genai';
import { RecognitionProvider, type ProviderConfig, type ProviderResponse } from './base';
import { buildRecognitionPrompt } from '../prompt';
import type { SupportedLocale } from '@/types/recognition';

/**
 * Gemini Vision provider for multi-item food recognition.
 */
export class GeminiProvider extends RecognitionProvider {
  private readonly model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  constructor(config: ProviderConfig) {
    super(config);
  }

  get name(): string {
    return 'gemini';
  }

  /**
   * Get raw JSON response from Gemini API.
   *
   * @param imageData - Base64-encoded image data (data URL format)
   * @param locale - Target locale for recognition results
   * @returns Promise resolving to provider response with raw JSON string
   */
  async getJsonResponse(imageData: string, locale: SupportedLocale): Promise<ProviderResponse> {
    const parsedImage = parseDataUrl(imageData);
    if (!parsedImage) {
      return {
        success: false,
        error: {
          code: 'INVALID_IMAGE',
          message: 'Invalid image data URL',
        },
      };
    }

    const prompt = buildRecognitionPrompt(locale);
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    const request = ai.models.generateContent({
      model: this.model,
      contents: [
        {
          text: `${prompt.system}\n\n${prompt.user}`,
        },
        {
          inlineData: {
            mimeType: parsedImage.mimeType,
            data: parsedImage.base64,
          },
        },
      ],
    });

    try {
      const response = await withTimeout(request, this.config.timeout ?? 30000);
      const content = extractText(response);

      if (!content) {
        return {
          success: false,
          error: {
            code: 'NO_FOOD_DETECTED',
            message: 'No response content from Gemini',
          },
        };
      }

      return {
        success: true,
        rawJson: content,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out',
          },
        };
      }

      console.error('Gemini provider error:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

/**
 * Create Gemini provider instance.
 */
export function createGeminiProvider(config: ProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function extractText(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') {
    return undefined;
  }

  const responseWithText = response as { text?: string };
  if (responseWithText.text) {
    return responseWithText.text;
  }

  const responseWithCandidates = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const parts = responseWithCandidates.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map(part => part.text).filter(Boolean).join('');
  return text || undefined;
}
