/**
 * Nutrition Lookup Service
 * Based on Spec 003 - Multi-item Recognition
 *
 * Provides nutrition lookup for food items with React Query hooks
 * for progressive loading.
 */

import { useQuery, useQueries } from "@tanstack/react-query";
import type { MealItem } from "@/types/sync";
import { getNutritionWithAIFallback } from "@/lib/services/nutrition";

/**
 * Nutrition data response from the API.
 */
export interface NutritionData {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fats?: number;
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
 * @returns Promise resolving to nutrition data
 */
export async function lookupNutrition(
  foodName: string,
  portionSize: number = 1
): Promise<NutritionLookupResult> {
  if (!foodName.trim()) {
    return {
      success: false,
      error: {
        code: "INVALID_FOOD_NAME",
        message: "Food name is required",
      },
    };
  }

  try {
    const result = await getNutritionWithAIFallback(
      foodName.trim(),
      portionSize ? `${portionSize}` : undefined
    );

    if (result.success && result.data) {
      const shouldScale = !result.data.isAIEstimate;
      const multiplier = portionSize || 1;

      return {
        success: true,
        data: {
          calories: result.data.calories
            ? Math.round(result.data.calories * (shouldScale ? multiplier : 1))
            : undefined,
          protein: result.data.protein
            ? Math.round(result.data.protein * (shouldScale ? multiplier : 1) * 10) / 10
            : undefined,
          carbohydrates: result.data.carbohydrates
            ? Math.round(result.data.carbohydrates * (shouldScale ? multiplier : 1) * 10) / 10
            : undefined,
          fats: result.data.fats
            ? Math.round(result.data.fats * (shouldScale ? multiplier : 1) * 10) / 10
            : undefined,
          sourceDatabase: result.data.sourceDatabase,
          dataComplete: result.data.dataComplete,
        },
      };
    }

    return {
      success: false,
      error: result.error || {
        code: "API_ERROR",
        message: "Failed to fetch nutrition data",
      },
    };
  } catch (error) {
    console.error("Nutrition lookup error:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Failed to fetch nutrition data",
      },
    };
  }
}

/**
 * React Query hook for single item nutrition lookup.
 *
 * @param foodName - Name of the food to look up
 * @param portionSize - Portion size multiplier
 * @param enabled - Whether to enable the query
 */
export function useNutritionLookup(
  foodName: string,
  portionSize: number = 1,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["nutrition", foodName, portionSize],
    queryFn: () => lookupNutrition(foodName, portionSize),
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
export function useMultipleNutritionLookup(
  items: MealItem[],
  enabled: boolean = true
) {
  return useQueries({
    queries: items.map((item) => ({
      queryKey: ["nutrition", item.foodName, item.portionSize],
      queryFn: () => lookupNutrition(item.foodName, item.portionSize),
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
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );
}
