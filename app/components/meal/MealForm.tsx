'use client';

/**
 * MealForm Component
 *
 * Form for confirming/correcting meal information.
 * Supports both recognition results and manual entry.
 * Automatically fetches nutrition data with AI fallback.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { getNutritionWithAIFallback } from '@/lib/services/nutrition';
import type { FoodRecognitionResult, MealFormData, NutritionData } from '@/types/meal';

interface MealFormProps {
  recognitionResult?: FoodRecognitionResult | null;
  nutritionData?: NutritionData | null;
  isLoading?: boolean;
  onSubmit: (data: MealFormData) => void;
  onCancel: () => void;
}

export default function MealForm({
  recognitionResult,
  nutritionData: initialNutritionData,
  isLoading = false,
  onSubmit,
  onCancel,
}: MealFormProps) {
  const { t } = useI18n();
  const portionOptions = useMemo(() => ([
    { value: t('mealForm.portionOptions.halfValue'), label: t('mealForm.portionOptions.halfLabel') },
    { value: t('mealForm.portionOptions.oneValue'), label: t('mealForm.portionOptions.oneLabel') },
    { value: t('mealForm.portionOptions.oneHalfValue'), label: t('mealForm.portionOptions.oneHalfLabel') },
    { value: t('mealForm.portionOptions.twoValue'), label: t('mealForm.portionOptions.twoLabel') },
    { value: t('mealForm.portionOptions.bowlValue'), label: t('mealForm.portionOptions.bowlLabel') },
    { value: t('mealForm.portionOptions.plateValue'), label: t('mealForm.portionOptions.plateLabel') },
    { value: t('mealForm.portionOptions.cupValue'), label: t('mealForm.portionOptions.cupLabel') },
  ]), [t]);
  const [foodName, setFoodName] = useState('');
  const [portionSize, setPortionSize] = useState(() => t('mealForm.portionOptions.oneValue'));
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Nutrition state
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(initialNutritionData || null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const nutritionFetchRef = useRef<string | null>(null);

  // Update form when recognition result changes
  useEffect(() => {
    if (recognitionResult) {
      setFoodName(recognitionResult.primaryCandidate ?? '');
      setIsManualEntry(false);
      // Show alternatives if confidence is low
      setShowAlternatives(recognitionResult.confidence < 0.7);
    }
  }, [recognitionResult]);

  // Update nutrition data when passed from parent
  useEffect(() => {
    if (initialNutritionData) {
      setNutritionData(initialNutritionData);
    }
  }, [initialNutritionData]);

  // Fetch nutrition data when food name changes (with debounce)
  useEffect(() => {
    const trimmedName = (foodName ?? '').trim();

    // Skip if no food name or if we already have nutrition data for this food
    if (!trimmedName || trimmedName.length < 2) {
      return;
    }

    // Skip if we already fetched for this exact food name
    if (nutritionFetchRef.current === trimmedName) {
      return;
    }

    // Debounce: wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      // Skip if food name changed during debounce
      if ((foodName ?? '').trim() !== trimmedName) {
        return;
      }

      nutritionFetchRef.current = trimmedName;
      setIsLoadingNutrition(true);

      try {
        const result = await getNutritionWithAIFallback(trimmedName, portionSize);
        // Only update if food name hasn't changed
        if ((foodName ?? '').trim() === trimmedName) {
          if (result.success && result.data) {
            setNutritionData(result.data);
          } else {
            setNutritionData(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch nutrition data:', error);
        // Only clear if food name hasn't changed
        if ((foodName ?? '').trim() === trimmedName) {
          setNutritionData(null);
        }
      } finally {
        setIsLoadingNutrition(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [foodName, portionSize]);

  const handleSelectAlternative = useCallback((candidate: string) => {
    setFoodName(candidate);
    setShowAlternatives(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFoodName = (foodName ?? '').trim();
    if (!trimmedFoodName) {
      return;
    }

    const formData: MealFormData = {
      foodName: trimmedFoodName,
      portionSize,
      calories: nutritionData?.calories,
      protein: nutritionData?.protein,
      carbohydrates: nutritionData?.carbohydrates,
      fats: nutritionData?.fats,
      isManualEntry,
    };

    onSubmit(formData);
  }, [foodName, portionSize, nutritionData, isManualEntry, onSubmit]);

  const handleManualEntryToggle = useCallback(() => {
    setIsManualEntry(true);
    setFoodName('');
    setShowAlternatives(false);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Food Name */}
      <div>
        <label htmlFor="foodName" className="block text-sm font-medium text-gray-700 mb-1">
          {t('mealForm.foodNameLabel')}
        </label>
        <input
          type="text"
          id="foodName"
          value={foodName ?? ''}
          onChange={(e) => setFoodName(e.target.value)}
          placeholder={t('mealForm.foodNamePlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          required
          disabled={isLoading}
        />

        {/* Recognition confidence */}
        {recognitionResult && !isManualEntry && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {t('mealForm.recognitionConfidence', {
                percent: Math.round(recognitionResult.confidence * 100),
              })}
            </span>
            {recognitionResult.confidence < 0.7 && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                {t('mealForm.lowConfidence')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alternative candidates */}
      {showAlternatives && recognitionResult?.alternativeCandidates && recognitionResult.alternativeCandidates.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">{t('mealForm.alternativesTitle')}</p>
          <div className="flex flex-wrap gap-2">
            {recognitionResult.alternativeCandidates.map((candidate, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectAlternative(candidate)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                {candidate}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual entry button */}
      {recognitionResult && !isManualEntry && (
        <button
          type="button"
          onClick={handleManualEntryToggle}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {t('mealForm.manualEntry')}
        </button>
      )}

      {/* Portion Size */}
      <div>
        <label htmlFor="portionSize" className="block text-sm font-medium text-gray-700 mb-1">
          {t('mealForm.portionLabel')}
        </label>
        <select
          id="portionSize"
          value={portionSize}
          onChange={(e) => setPortionSize(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          disabled={isLoading}
        >
          {portionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Nutrition Display */}
      {nutritionData && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">{t('mealForm.nutritionTitle')}</h3>
            {nutritionData.isAIEstimate && (
              <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {t('mealForm.aiEstimated')}
              </span>
            )}
          </div>

          {/* Calories - Prominent display */}
          <div className="bg-white rounded-lg p-3 text-center">
            <span className="text-2xl font-bold text-gray-900">
              {nutritionData.calories != null ? nutritionData.calories : '--'}
            </span>
            <span className="text-sm text-gray-600 ml-1">kcal</span>
          </div>

          {/* Macronutrients */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('mealForm.macronutrientsTitle')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.proteinLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.protein != null ? `${nutritionData.protein}g` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.carbsLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.carbohydrates != null ? `${nutritionData.carbohydrates}g` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.fatsLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.fats != null ? `${nutritionData.fats}g` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.saturatedFatLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.saturatedFat != null ? `${nutritionData.saturatedFat}g` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.fiberLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.fiber != null ? `${nutritionData.fiber}g` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.sugarLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.sugar != null ? `${nutritionData.sugar}g` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Minerals */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('mealForm.mineralsTitle')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.sodiumLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.sodium != null ? `${nutritionData.sodium}mg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.potassiumLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.potassium != null ? `${nutritionData.potassium}mg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.calciumLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.calcium != null ? `${nutritionData.calcium}mg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.ironLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.iron != null ? `${nutritionData.iron}mg` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Vitamins */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('mealForm.vitaminsTitle')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.vitaminALabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.vitaminA != null ? `${nutritionData.vitaminA}μg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.vitaminCLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.vitaminC != null ? `${nutritionData.vitaminC}mg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.vitaminDLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.vitaminD != null ? `${nutritionData.vitaminD}μg` : '--'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.vitaminB12Label')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.vitaminB12 != null ? `${nutritionData.vitaminB12}μg` : '--'}</span>
              </div>
            </div>
          </div>

          {/* Other */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t('mealForm.otherNutrientsTitle')}
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('mealForm.cholesterolLabel')}</span>
                <span className="text-gray-900 font-medium">{nutritionData.cholesterol != null ? `${nutritionData.cholesterol}mg` : '--'}</span>
              </div>
            </div>
          </div>

          {nutritionData.isAIEstimate && (
            <p className="text-xs text-purple-600">
              {t('mealForm.aiEstimateNote')}
            </p>
          )}
          {!nutritionData.dataComplete && !nutritionData.isAIEstimate && (
            <p className="text-xs text-orange-600">
              {t('mealForm.partialNutritionWarning')}
            </p>
          )}
        </div>
      )}

      {/* Loading indicator for nutrition */}
      {isLoadingNutrition && !nutritionData && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent mr-2" />
          <span className="text-sm text-gray-600">{t('mealForm.loadingNutrition')}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          {t('mealForm.cancel')}
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !(foodName ?? '').trim()}
        >
          {t('mealForm.save')}
        </button>
      </div>
    </form>
  );
}
