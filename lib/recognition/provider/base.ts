/**
 * Recognition Provider Abstraction Layer
 * Based on Spec 003 - Multi-item Recognition
 *
 * Provides a common interface for different recognition providers
 * (OpenAI Vision, Google Cloud Vision, etc.)
 */

import type { SupportedLocale } from '@/types/recognition';

/**
 * Recognition provider response.
 */
export interface ProviderResponse {
  success: boolean;
  rawJson?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Recognition provider configuration.
 */
export interface ProviderConfig {
  apiKey: string;
  timeout?: number; // in milliseconds
}

/**
 * Abstract base class for recognition providers.
 */
export abstract class RecognitionProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = {
      ...config,
      timeout: config.timeout ?? 30000, // Default 30 seconds
    };
  }

  /**
   * Get raw JSON response from the provider.
   * Subclasses must implement this method.
   *
   * @param imageData - Base64-encoded image data
   * @param locale - Target locale for recognition results
   * @returns Promise resolving to provider response with raw JSON string
   */
  abstract getJsonResponse(imageData: string, locale: SupportedLocale): Promise<ProviderResponse>;

  /**
   * Get the provider name for logging.
   */
  abstract get name(): string;
}

/**
 * Factory function type for creating recognition providers.
 */
export type RecognitionProviderFactory = (config: ProviderConfig) => RecognitionProvider;
