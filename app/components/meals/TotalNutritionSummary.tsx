'use client';

/**
 * TotalNutritionSummary Component
 * Based on Spec 003 - Multi-item Recognition
 *
 * Displays aggregated nutrition totals for all meal items.
 * Shows calories prominently, with macros in a summary row.
 * Supports expandable detailed nutrition view.
 */

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { MealItem } from '@/types/sync';

interface TotalNutritionSummaryProps {
  items: MealItem[];
}

export function TotalNutritionSummary({ items }: TotalNutritionSummaryProps) {
  const { t } = useI18n();
  const [showDetailed, setShowDetailed] = useState(false);

  // Calculate totals including extended nutrition
  const totals = items.reduce(
    (acc, item) => ({
      // Basic macros
      calories: acc.calories + (item.calories ?? 0),
      protein: acc.protein + (item.protein ?? 0),
      carbs: acc.carbs + (item.carbs ?? 0),
      fat: acc.fat + (item.fat ?? 0),
      // Extended macros
      fiber: acc.fiber + (item.fiber ?? 0),
      sugar: acc.sugar + (item.sugar ?? 0),
      saturatedFat: acc.saturatedFat + (item.saturatedFat ?? 0),
      // Minerals
      sodium: acc.sodium + (item.sodium ?? 0),
      potassium: acc.potassium + (item.potassium ?? 0),
      calcium: acc.calcium + (item.calcium ?? 0),
      iron: acc.iron + (item.iron ?? 0),
      // Vitamins
      vitaminA: acc.vitaminA + (item.vitaminA ?? 0),
      vitaminC: acc.vitaminC + (item.vitaminC ?? 0),
      vitaminD: acc.vitaminD + (item.vitaminD ?? 0),
      vitaminB12: acc.vitaminB12 + (item.vitaminB12 ?? 0),
      // Other
      cholesterol: acc.cholesterol + (item.cholesterol ?? 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      saturatedFat: 0,
      sodium: 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      vitaminA: 0,
      vitaminC: 0,
      vitaminD: 0,
      vitaminB12: 0,
      cholesterol: 0,
    },
  );

  // Check if any nutrition data is missing
  const hasMissingData = items.some(
    (item) =>
      item.calories == null || item.protein == null || item.carbs == null || item.fat == null,
  );

  // Check if any item uses AI estimation
  const hasAIEstimate = items.some((item) => item.nutritionSource?.includes('AI') ?? false);

  return (
    <div className="rounded-lg bg-blue-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {t('mealForm.totalNutrition.title')}
      </h3>

      {/* Total calories - prominent display */}
      <div className="mb-3 rounded-lg bg-white p-3 text-center">
        <p className="text-xs text-gray-500">{t('mealForm.totalNutrition.calories')}</p>
        <p className="text-3xl font-bold text-blue-600">
          {Math.round(totals.calories)}
          <span className="ml-1 text-base font-normal text-gray-500">kcal</span>
        </p>
      </div>

      {/* Macros summary row */}
      <div className="grid grid-cols-3 gap-2">
        <MacroField
          label={t('mealForm.totalNutrition.protein')}
          value={totals.protein}
          unit="g"
          color="text-green-600"
        />
        <MacroField
          label={t('mealForm.totalNutrition.carbs')}
          value={totals.carbs}
          unit="g"
          color="text-orange-600"
        />
        <MacroField
          label={t('mealForm.totalNutrition.fat')}
          value={totals.fat}
          unit="g"
          color="text-red-500"
        />
      </div>

      {/* Toggle for detailed view */}
      <button
        type="button"
        onClick={() => setShowDetailed(!showDetailed)}
        className="mt-3 w-full text-center text-xs text-blue-600 hover:text-blue-800"
      >
        {showDetailed ? '▲ 收合詳細營養' : '▼ 展開詳細營養'}
      </button>

      {/* Detailed nutrition - expandable */}
      {showDetailed && (
        <div className="mt-3 space-y-3 border-t border-blue-200 pt-3">
          {/* Extended macronutrients */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              {t('mealForm.macronutrientsTitle')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <DetailField label={t('mealForm.fiberLabel')} value={totals.fiber} unit="g" />
              <DetailField label={t('mealForm.sugarLabel')} value={totals.sugar} unit="g" />
              <DetailField
                label={t('mealForm.saturatedFatLabel')}
                value={totals.saturatedFat}
                unit="g"
              />
            </div>
          </div>

          {/* Minerals */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">{t('mealForm.mineralsTitle')}</p>
            <div className="grid grid-cols-4 gap-2">
              <DetailField label={t('mealForm.sodiumLabel')} value={totals.sodium} unit="mg" />
              <DetailField
                label={t('mealForm.potassiumLabel')}
                value={totals.potassium}
                unit="mg"
              />
              <DetailField label={t('mealForm.calciumLabel')} value={totals.calcium} unit="mg" />
              <DetailField label={t('mealForm.ironLabel')} value={totals.iron} unit="mg" decimal />
            </div>
          </div>

          {/* Vitamins */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">{t('mealForm.vitaminsTitle')}</p>
            <div className="grid grid-cols-4 gap-2">
              <DetailField label={t('mealForm.vitaminALabel')} value={totals.vitaminA} unit="μg" />
              <DetailField
                label={t('mealForm.vitaminCLabel')}
                value={totals.vitaminC}
                unit="mg"
                decimal
              />
              <DetailField
                label={t('mealForm.vitaminDLabel')}
                value={totals.vitaminD}
                unit="μg"
                decimal
              />
              <DetailField
                label={t('mealForm.vitaminB12Label')}
                value={totals.vitaminB12}
                unit="μg"
                decimal
              />
            </div>
          </div>

          {/* Other */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              {t('mealForm.otherNutrientsTitle')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <DetailField
                label={t('mealForm.cholesterolLabel')}
                value={totals.cholesterol}
                unit="mg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Warning messages */}
      {hasAIEstimate && (
        <p className="mt-3 text-xs text-purple-600">{t('mealForm.aiEstimateNote')}</p>
      )}
      {hasMissingData && !hasAIEstimate && (
        <p className="mt-3 text-xs text-orange-600">{t('mealForm.partialNutritionWarning')}</p>
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

/**
 * Detail nutrition field for expanded view.
 */
interface DetailFieldProps {
  label: string;
  value: number;
  unit: string;
  decimal?: boolean;
}

function DetailField({ label, value, unit, decimal = false }: DetailFieldProps) {
  const displayValue = decimal ? Math.round(value * 10) / 10 : Math.round(value);
  return (
    <div className="rounded bg-white p-1.5 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-700">
        {displayValue}
        <span className="text-xs font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}

export default TotalNutritionSummary;
