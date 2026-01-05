/**
 * Zod Schema for Multi-item Recognition Response Validation
 * Based on Spec 003 - Multi-item Recognition
 */

import { z } from 'zod';

/**
 * Valid food categories.
 */
export const FOOD_CATEGORIES = ['food', 'beverage', 'soup', 'dessert'] as const;

/**
 * Schema for a single recognition item.
 */
export const RecognitionItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  portionUnit: z.string().min(1, 'Portion unit is required').optional(),
  category: z.enum(FOOD_CATEGORIES).optional(),
  estimatedCount: z.union([z.number(), z.string().min(1)]).optional(),
  estimatedWeightGrams: z.union([z.number(), z.string().min(1)]).optional(),
  containerSize: z.enum(['small', 'medium', 'large']).optional(),
});

/**
 * Schema for multi-item recognition response.
 * Enforces 1-6 items as per FR-001.
 */
export const MultiItemRecognitionResponseSchema = z.object({
  items: z
    .array(RecognitionItemSchema)
    .min(1, 'At least one item is required')
    .max(6, 'Maximum 6 items allowed'),
  locale: z.string().min(1, 'Locale is required'),
});

/**
 * Type inference from Zod schema.
 */
export type RecognitionItemFromSchema = z.infer<typeof RecognitionItemSchema>;
export type MultiItemRecognitionResponseFromSchema = z.infer<typeof MultiItemRecognitionResponseSchema>;

/**
 * Validation result type.
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: 'VALIDATION_ERROR' | 'INVALID_JSON';
    message: string;
    details?: z.ZodError;
  };
}

/**
 * Validate recognition response against schema.
 */
export function validateRecognitionResponse(
  data: unknown
): ValidationResult<MultiItemRecognitionResponseFromSchema> {
  const result = MultiItemRecognitionResponseSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Recognition response validation failed',
      details: result.error,
    },
  };
}
