/**
 * OpenAI Vision Provider Implementation
 * Based on Spec 003 - Multi-item Recognition
 *
 * Implements the RecognitionProvider interface for OpenAI Vision API.
 * Configured with JSON mode for structured output.
 */

import { RecognitionProvider, type ProviderConfig, type ProviderResponse } from './base';
import { buildRecognitionPrompt } from '../prompt';
import type { SupportedLocale } from '@/types/recognition';

/**
 * OpenAI API response structure.
 */
interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
  };
}

/**
 * OpenAI Vision provider for multi-item food recognition.
 */
export class OpenAIProvider extends RecognitionProvider {
  private readonly apiEndpoint = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4o-mini';

  constructor(config: ProviderConfig) {
    super(config);
  }

  get name(): string {
    return 'openai';
  }

  /**
   * Get raw JSON response from OpenAI Vision API.
   *
   * @param imageData - Base64-encoded image data (data URL format)
   * @param locale - Target locale for recognition results
   * @returns Promise resolving to provider response with raw JSON string
   */
  async getJsonResponse(imageData: string, locale: SupportedLocale): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const prompt = buildRecognitionPrompt(locale);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: prompt.system,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData,
                  },
                },
                {
                  type: 'text',
                  text: prompt.user,
                },
              ],
            },
          ],
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: `OpenAI API error: ${response.status}`,
          },
        };
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: {
            code: 'NO_FOOD_DETECTED',
            message: 'No response content from OpenAI',
          },
        };
      }

      return {
        success: true,
        rawJson: content,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out',
          },
        };
      }

      console.error('OpenAI provider error:', error);
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
 * Create OpenAI provider instance.
 */
export function createOpenAIProvider(config: ProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
