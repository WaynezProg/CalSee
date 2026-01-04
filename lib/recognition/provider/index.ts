/**
 * Recognition Provider Exports
 * Based on Spec 003 - Multi-item Recognition
 */

export { RecognitionProvider, type ProviderConfig, type ProviderResponse } from './base';
export { OpenAIProvider, createOpenAIProvider } from './openai';
export { GeminiProvider, createGeminiProvider } from './gemini';
