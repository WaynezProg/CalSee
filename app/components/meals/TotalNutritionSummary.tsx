"use client";

/**
 * TotalNutritionSummary Component
 * Based on Spec 003 - Multi-item Recognition
 *
 * Displays aggregated nutrition totals for all meal items.
 * Shows calories prominently, with macros in a summary row.
 */

import { useI18n } from "@/lib/i18n";
import type { MealItem } from "@/types/sync";

interface TotalNutritionSummaryProps {
  items: MealItem[];
}

export function TotalNutritionSummary({ items }: TotalNutritionSummaryProps) {
  const { t } = useI18n();

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Check if any nutrition data is missing
  const hasMissingData = items.some(
    (item) =>
      item.calories == null ||
      item.protein == null ||
      item.carbs == null ||
      item.fat == null
  );

  // Check if any item uses AI estimation
  const hasAIEstimate = items.some(
    (item) => item.nutritionSource?.includes("AI") ?? false
  );

  return (
    <div className="rounded-lg bg-blue-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {t("mealForm.totalNutrition.title")}
      </h3>

      {/* Total calories - prominent display */}
      <div className="mb-3 rounded-lg bg-white p-3 text-center">
        <p className="text-xs text-gray-500">
          {t("mealForm.totalNutrition.calories")}
        </p>
        <p className="text-3xl font-bold text-blue-600">
          {Math.round(totals.calories)}
          <span className="ml-1 text-base font-normal text-gray-500">kcal</span>
        </p>
      </div>

      {/* Macros summary row */}
      <div className="grid grid-cols-3 gap-2">
        <MacroField
          label={t("mealForm.totalNutrition.protein")}
          value={totals.protein}
          unit="g"
          color="text-green-600"
        />
        <MacroField
          label={t("mealForm.totalNutrition.carbs")}
          value={totals.carbs}
          unit="g"
          color="text-orange-600"
        />
        <MacroField
          label={t("mealForm.totalNutrition.fat")}
          value={totals.fat}
          unit="g"
          color="text-red-500"
        />
      </div>

      {/* Warning messages */}
      {hasAIEstimate && (
        <p className="mt-3 text-xs text-purple-600">
          {t("mealForm.aiEstimateNote")}
        </p>
      )}
      {hasMissingData && !hasAIEstimate && (
        <p className="mt-3 text-xs text-orange-600">
          {t("mealForm.partialNutritionWarning")}
        </p>
      )}
    </div>
  );
}

/**
 * Macro nutrient field display.
 */
interface MacroFieldProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MacroField({ label, value, unit, color }: MacroFieldProps) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>
        {Math.round(value)}
        <span className="text-xs font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

export default TotalNutritionSummary;
