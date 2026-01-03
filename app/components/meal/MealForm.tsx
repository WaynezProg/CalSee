'use client';

/**
 * MealForm Component
 *
 * Form for confirming/correcting meal information.
 * Supports both recognition results and manual entry.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
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
  nutritionData,
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

  // Update form when recognition result changes
  useEffect(() => {
    if (recognitionResult) {
      setFoodName(recognitionResult.primaryCandidate);
      setIsManualEntry(false);
      // Show alternatives if confidence is low
      setShowAlternatives(recognitionResult.confidence < 0.7);
    }
  }, [recognitionResult]);

  const handleSelectAlternative = useCallback((candidate: string) => {
    setFoodName(candidate);
    setShowAlternatives(false);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!foodName.trim()) {
      return;
    }

    const formData: MealFormData = {
      foodName: foodName.trim(),
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
          value={foodName}
          onChange={(e) => setFoodName(e.target.value)}
          placeholder={t('mealForm.foodNamePlaceholder')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
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
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('mealForm.nutritionTitle')}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('mealForm.caloriesLabel')}</span>
              <span>
                {nutritionData.calories != null ? (
                  <>{nutritionData.calories} kcal <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                ) : (
                  <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('mealForm.proteinLabel')}</span>
              <span>
                {nutritionData.protein != null ? (
                  <>{nutritionData.protein}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                ) : (
                  <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('mealForm.carbsLabel')}</span>
              <span>
                {nutritionData.carbohydrates != null ? (
                  <>{nutritionData.carbohydrates}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                ) : (
                  <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('mealForm.fatsLabel')}</span>
              <span>
                {nutritionData.fats != null ? (
                  <>{nutritionData.fats}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                ) : (
                  <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                )}
              </span>
            </div>
          </div>
          {!nutritionData.dataComplete && (
            <p className="mt-2 text-xs text-amber-600">
              {t('mealForm.partialNutritionWarning')}
            </p>
          )}
        </div>
      )}

      {/* Loading indicator for nutrition */}
      {isLoading && !nutritionData && (
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
          disabled={isLoading || !foodName.trim()}
        >
          {t('mealForm.save')}
        </button>
      </div>
    </form>
  );
}
