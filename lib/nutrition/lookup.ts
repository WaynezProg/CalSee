/**
 * Nutrition Lookup Service
 * Based on Spec 003 - Multi-item Recognition
 *
 * Provides nutrition lookup for food items with React Query hooks
 * for progressive loading.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import type { MealItem } from '@/types/sync';
import { getNutritionWithAIFallback } from '@/lib/services/nutrition';
import { resolvePortionScale } from '@/lib/nutrition/portion-conversion';

/**
 * Nutrition data response from the API.
 */
export interface NutritionData {
  // Basic macronutrients
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fats?: number;
  // Extended macronutrients
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  // Minerals
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  // Vitamins
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminB12?: number;
  // Other
  cholesterol?: number;
  // Metadata
  sourceDatabase: string;
  dataComplete: boolean;
}

/**
 * Nutrition lookup result.
 */
export interface NutritionLookupResult {
  success: boolean;
  data?: NutritionData;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Lookup nutrition data for a food item.
 * Calls the /api/nutrition endpoint.
 *
 * @param foodName - Name of the food to look up
 * @param portionSize - Portion size multiplier (default: 1)
 * @param portionUnit - Portion unit label (optional)
 * @param containerSize - Plate/bowl size hint (optional)
 * @param aiEstimatedWeightGrams - AI estimated weight for 1 bowl/plate (optional)
 * @returns Promise resolving to nutrition data
 */
export async function lookupNutrition(
  foodName: string,
  portionSize: number = 1,
  portionUnit?: string,
  containerSize?: 'small' | 'medium' | 'large',
  aiEstimatedWeightGrams?: number,
): Promise<NutritionLookupResult> {
  if (!foodName.trim()) {
    return {
      success: false,
      error: {
        code: 'INVALID_FOOD_NAME',
        message: 'Food name is required',
      },
    };
  }

  try {
    const unitLabel = portionUnit?.trim();
    const sizeLabel =
      containerSize && (unitLabel === '盤' || unitLabel === '碗')
        ? `${containerSize === 'small' ? '小' : containerSize === 'large' ? '大' : '中'}${unitLabel}`
        : unitLabel;
    const estimatedLabel =
      aiEstimatedWeightGrams && aiEstimatedWeightGrams > 0
        ? `約${Math.round(aiEstimatedWeightGrams * (portionSize || 1))}g`
        : undefined;
    const portionLabel = sizeLabel
      ? `${portionSize} ${sizeLabel}`.trim()
      : portionSize
        ? `${portionSize}`
        : undefined;
    const portionLabelWithEstimate =
      portionLabel && estimatedLabel ? `${portionLabel} (${estimatedLabel})` : portionLabel;
    const result = await getNutritionWithAIFallback(foodName.trim(), portionLabelWithEstimate);

    if (result.success && result.data) {
      const shouldScale = !result.data.isAIEstimate;
      const scale = shouldScale
        ? resolvePortionScale(
            foodName,
            portionSize,
            portionUnit,
            containerSize,
            aiEstimatedWeightGrams,
          ).scale
        : 1;

      return {
        success: true,
        data: {
          // Basic macronutrients
          calories: result.data.calories ? Math.round(result.data.calories * scale) : undefined,
          protein: result.data.protein
            ? Math.round(result.data.protein * scale * 10) / 10
            : undefined,
          carbohydrates: result.data.carbohydrates
            ? Math.round(result.data.carbohydrates * scale * 10) / 10
            : undefined,
          fats: result.data.fats ? Math.round(result.data.fats * scale * 10) / 10 : undefined,
          // Extended macronutrients
          fiber: result.data.fiber ? Math.round(result.data.fiber * scale * 10) / 10 : undefined,
          sugar: result.data.sugar ? Math.round(result.data.sugar * scale * 10) / 10 : undefined,
          saturatedFat: result.data.saturatedFat
            ? Math.round(result.data.saturatedFat * scale * 10) / 10
            : undefined,
          // Minerals
          sodium: result.data.sodium ? Math.round(result.data.sodium * scale) : undefined,
          potassium: result.data.potassium ? Math.round(result.data.potassium * scale) : undefined,
          calcium: result.data.calcium ? Math.round(result.data.calcium * scale) : undefined,
          iron: result.data.iron ? Math.round(result.data.iron * scale * 10) / 10 : undefined,
          // Vitamins
          vitaminA: result.data.vitaminA ? Math.round(result.data.vitaminA * scale) : undefined,
          vitaminC: result.data.vitaminC
            ? Math.round(result.data.vitaminC * scale * 10) / 10
            : undefined,
          vitaminD: result.data.vitaminD
            ? Math.round(result.data.vitaminD * scale * 10) / 10
            : undefined,
          vitaminB12: result.data.vitaminB12
            ? Math.round(result.data.vitaminB12 * scale * 100) / 100
            : undefined,
          // Other
          cholesterol: result.data.cholesterol
            ? Math.round(result.data.cholesterol * scale)
            : undefined,
          // Metadata
          sourceDatabase: result.data.sourceDatabase,
          dataComplete: result.data.dataComplete,
        },
      };
    }

    return {
      success: false,
      error: result.error || {
        code: 'API_ERROR',
        message: 'Failed to fetch nutrition data',
      },
    };
  } catch (error) {
    console.error('Nutrition lookup error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch nutrition data',
      },
    };
  }
}

/**
 * React Query hook for single item nutrition lookup.
 *
 * @param foodName - Name of the food to look up
 * @param portionSize - Portion size multiplier
 * @param portionUnit - Portion unit label (optional)
 * @param containerSize - Plate/bowl size hint (optional)
 * @param aiEstimatedWeightGrams - AI estimated weight for 1 bowl/plate (optional)
 * @param enabled - Whether to enable the query
 */
export function useNutritionLookup(
  foodName: string,
  portionSize: number = 1,
  portionUnit?: string,
  containerSize?: 'small' | 'medium' | 'large',
  aiEstimatedWeightGrams?: number,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: [
      'nutrition',
      foodName,
      portionSize,
      portionUnit,
      containerSize,
      aiEstimatedWeightGrams,
    ],
    queryFn: () =>
      lookupNutrition(foodName, portionSize, portionUnit, containerSize, aiEstimatedWeightGrams),
    enabled: enabled && foodName.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 1,
  });
}

/**
 * React Query hook for multiple item nutrition lookup.
 * Queries run in parallel for all items.
 *
 * @param items - Array of meal items to look up
 * @param enabled - Whether to enable the queries
 */
export function useMultipleNutritionLookup(items: MealItem[], enabled: boolean = true) {
  return useQueries({
    queries: items.map((item) => ({
      queryKey: [
        'nutrition',
        item.foodName,
        item.portionSize,
        item.portionUnit,
        item.containerSize,
        item.aiEstimatedWeightGrams,
      ],
      queryFn: () =>
        lookupNutrition(
          item.foodName,
          item.portionSize,
          item.portionUnit,
          item.containerSize,
          item.aiEstimatedWeightGrams,
        ),
      enabled: enabled && item.foodName.trim().length >= 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    })),
  });
}

/**
 * Calculate total nutrition from multiple items.
 *
 * @param items - Array of meal items with nutrition data
 * @returns Total nutrition values
 */
export function calculateTotalNutrition(items: MealItem[]): {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
} {
  return items.reduce(
    (totals, item) => ({
      totalCalories: totals.totalCalories + (item.calories ?? 0),
      totalProtein: totals.totalProtein + (item.protein ?? 0),
      totalCarbs: totals.totalCarbs + (item.carbs ?? 0),
      totalFat: totals.totalFat + (item.fat ?? 0),
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 },
  );
}
