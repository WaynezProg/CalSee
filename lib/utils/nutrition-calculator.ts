import type { MealItem } from "../../types/sync";

export interface NutritionTotals {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export function calculateNutritionTotals(items: MealItem[]): NutritionTotals {
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
