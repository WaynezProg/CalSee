'use client';

/**
 * MealDetail Component
 *
 * Full meal information display with edit and delete functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Meal, MealFormData } from '@/types/meal';
import { getPhoto, updateMeal, deleteMeal } from '@/lib/db/indexeddb';
import MealForm from './MealForm';
import DeleteConfirmDialog from '@/app/components/ui/DeleteConfirmDialog';
import { useI18n } from '@/lib/i18n';

interface MealDetailProps {
  meal: Meal;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

export default function MealDetail({
  meal,
  onClose,
  onUpdated,
  onDeleted,
}: MealDetailProps) {
  const { t, locale } = useI18n();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load photo
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const photo = await getPhoto(meal.photoId);
        if (photo) {
          const url = URL.createObjectURL(photo.blob);
          setPhotoUrl(url);
        }
      } catch (err) {
        console.error('Failed to load photo:', err);
      }
    };

    loadPhoto();

    // Cleanup
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [meal.photoId]);

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setError(null);
  }, []);

  const handleSaveEdit = useCallback(async (formData: MealFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      const updatedMeal: Meal = {
        ...meal,
        foodName: formData.foodName,
        portionSize: formData.portionSize,
        calories: formData.calories,
        protein: formData.protein,
        carbohydrates: formData.carbohydrates,
        fats: formData.fats,
        nutritionDataComplete: !!(formData.calories && formData.protein && formData.carbohydrates && formData.fats),
        updatedAt: new Date(),
        isManualEntry: formData.isManualEntry,
      };

      await updateMeal(updatedMeal);
      setIsEditing(false);
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update meal:', err);
      setError(t('errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }, [meal, onUpdated, t]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsDeleting(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setError(null);

    try {
      await deleteMeal(meal.id);
      onDeleted?.();
    } catch (err) {
      console.error('Failed to delete meal:', err);
      setError(t('errors.mealDeleteFailed'));
      setIsDeleting(false);
    }
  }, [meal.id, onDeleted, t]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? t('mealDetail.editTitle') : t('mealDetail.viewTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t('mealDetail.closeLabel')}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Photo */}
          {photoUrl && (
            <div className="mb-4">
              <img
                src={photoUrl}
                alt={meal.foodName}
                className="w-full max-h-64 object-contain rounded-lg bg-gray-100"
              />
            </div>
          )}

          {isEditing ? (
            // Edit Form
            <MealForm
              recognitionResult={null}
              nutritionData={{
                calories: meal.calories,
                protein: meal.protein,
                carbohydrates: meal.carbohydrates,
                fats: meal.fats,
                sourceDatabase: meal.sourceDatabase || 'USDA FoodData Central',
                dataComplete: meal.nutritionDataComplete,
              }}
              isLoading={isSaving}
              onSubmit={handleSaveEdit}
              onCancel={handleCancelEdit}
            />
          ) : (
            // Detail View
            <div className="space-y-4">
              {/* Food Info */}
              <div>
                <h3 className="text-xl font-medium text-gray-900">{meal.foodName}</h3>
                <p className="text-gray-500">{meal.portionSize}</p>
              </div>

              {/* Nutrition */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{t('mealDetail.nutritionTitle')}</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('mealDetail.caloriesLabel')}</span>
                    <span>
                      {meal.calories != null ? (
                        <>{meal.calories} kcal <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                      ) : (
                        <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('mealDetail.proteinLabel')}</span>
                    <span>
                      {meal.protein != null ? (
                        <>{meal.protein}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                      ) : (
                        <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('mealDetail.carbsLabel')}</span>
                    <span>
                      {meal.carbohydrates != null ? (
                        <>{meal.carbohydrates}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                      ) : (
                        <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('mealDetail.fatsLabel')}</span>
                    <span>
                      {meal.fats != null ? (
                        <>{meal.fats}g <span className="text-xs text-gray-400">{t('mealForm.estimated')}</span></>
                      ) : (
                        <span className="text-gray-400">{t('mealForm.dataMissing')}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="text-sm text-gray-500 space-y-1">
                <p>{t('mealDetail.recordedAt', { time: formatDate(meal.createdAt) })}</p>
                {meal.createdAt.getTime() !== meal.updatedAt.getTime() && (
                  <p>{t('mealDetail.updatedAt', { time: formatDate(meal.updatedAt) })}</p>
                )}
                {meal.recognitionConfidence > 0 && (
                  <p>{t('mealDetail.confidence', { percent: Math.round(meal.recognitionConfidence * 100) })}</p>
                )}
                {meal.isManualEntry && (
                  <p className="text-amber-600">{t('mealDetail.manualEntry')}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleEdit}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t('mealDetail.edit')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
                >
                  {t('mealDetail.delete')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleting}
        itemName={meal.foodName}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
