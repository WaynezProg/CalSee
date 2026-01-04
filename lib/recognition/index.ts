/**
 * Recognition Module Exports
 * Based on Spec 003 - Multi-item Recognition
 */

// Schema and validation
export {
  RecognitionItemSchema,
  MultiItemRecognitionResponseSchema,
  validateRecognitionResponse,
  type RecognitionItemFromSchema,
  type MultiItemRecognitionResponseFromSchema,
  type ValidationResult,
} from './schema';

// Parser
export { parseAndValidate, truncateItems, type ParseResult } from './parser';

// Prompt builder
export { buildRecognitionPrompt, buildSystemPrompt, buildUserPrompt, type RecognitionPrompt } from './prompt';

// Provider abstraction
export { RecognitionProvider, type ProviderConfig, type ProviderResponse } from './provider/base';

// OpenAI provider
export { OpenAIProvider, createOpenAIProvider } from './provider/openai';

// Gemini provider
export { GeminiProvider, createGeminiProvider } from './provider/gemini';
