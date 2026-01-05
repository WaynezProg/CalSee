/**
 * Recognition Mapper Service
 * Based on Spec 003 - Multi-item Recognition
 *
 * Maps recognition response items to MealItem objects.
 * Ensures ALL items from recognition are mapped (never takes only first item).
 */

import type { RecognitionItem, MultiItemRecognitionResponse } from '@/types/recognition';
import { derivePortionFromRecognition } from '@/lib/recognition/estimate-utils';

/**
 * MealItem structure for multi-item meals.
 * Based on Spec 002 data model.
 */
export interface MealItem {
  id: string;
  foodName: string;
  portionSize: number;
  portionUnit: string;
  containerSize?: RecognitionItem['containerSize'];
  aiEstimatedCount?: number;
  aiEstimatedWeightGrams?: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  confidence: number | null;
  notes: string | null;
  nutritionSource: string | null;
  isLoadingNutrition: boolean;
}

/**
 * Default values for new meal items.
 */
const DEFAULT_PORTION_SIZE = 1.0;
const DEFAULT_PORTION_UNIT = 'servings';

/**
 * Generate a unique ID for meal items.
 */
function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map a single recognition item to a MealItem.
 *
 * @param item - Recognition item from API response
 * @returns MealItem object with default values
 */
export function mapRecognitionItemToMealItem(item: RecognitionItem): MealItem {
  const portion = derivePortionFromRecognition(item);

  return {
    id: generateItemId(),
    foodName: item.name,
    portionSize: portion.portionSize ?? DEFAULT_PORTION_SIZE,
    portionUnit: portion.portionUnit ?? DEFAULT_PORTION_UNIT,
    containerSize: portion.containerSize,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    confidence: item.confidence ?? null,
    notes: item.notes ?? null,
    nutritionSource: null,
    isLoadingNutrition: false,
  };
}

/**
 * Map all recognition items to MealItem objects.
 *
 * CRITICAL: Maps ALL items from recognition response.
 * Per FR-006, system MUST map all returned items to Meal.items[],
 * never take only the first item.
 *
 * @param response - Multi-item recognition API response
 * @returns Array of MealItem objects
 */
export function mapRecognitionResponseToMealItems(
  response: MultiItemRecognitionResponse
): MealItem[] {
  // Map ALL items - never take only first item (FR-006)
  return response.items.map(mapRecognitionItemToMealItem);
}

/**
 * Create a new empty meal item for manual entry.
 *
 * @param foodName - Optional initial food name
 * @returns New MealItem object with default values
 */
export function createEmptyMealItem(foodName: string = ''): MealItem {
  return {
    id: generateItemId(),
    foodName,
    portionSize: DEFAULT_PORTION_SIZE,
    portionUnit: DEFAULT_PORTION_UNIT,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    confidence: null,
    notes: null,
    nutritionSource: null,
    isLoadingNutrition: false,
  };
}

/**
 * Update nutrition values for a meal item.
 *
 * @param item - Existing MealItem
 * @param nutrition - Nutrition values to update
 * @returns Updated MealItem (immutable)
 */
export function updateMealItemNutrition(
  item: MealItem,
  nutrition: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    nutritionSource: string | null;
  }
): MealItem {
  return {
    ...item,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    nutritionSource: nutrition.nutritionSource,
    isLoadingNutrition: false,
  };
}

/**
 * Calculate total nutrition from all meal items.
 *
 * @param items - Array of MealItem objects
 * @returns Total nutrition values (null values treated as 0)
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
