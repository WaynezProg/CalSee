'use client';

/**
 * MealDetailModal Component
 *
 * Modal dialog for viewing and editing meal details.
 * Supports two modes: view and edit.
 * Reuses MealItemList for editing functionality.
 */

import { useState, useCallback, useEffect, memo } from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/hooks';
import type { Meal, MealItem, MealType } from '@/types/sync';
import { MealItemList } from './MealItemList';
import { TotalNutritionSummary } from './TotalNutritionSummary';

function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatTimeInputValue(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function resolveDefaultMealType(date: Date): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

function toLocalTimestamp(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return new Date().toISOString();
  }
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(localDate.getTime())) {
    return new Date().toISOString();
  }
  return localDate.toISOString();
}

interface MealDetailModalProps {
  meal: Meal;
  photoUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMeal: Meal) => Promise<void>;
  onDelete?: (meal: Meal) => Promise<void>;
}

export function MealDetailModal({
  meal,
  photoUrl,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: MealDetailModalProps) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<MealItem[]>(meal.items);
  const [editedMealDate, setEditedMealDate] = useState(() =>
    formatDateInputValue(new Date(meal.timestamp)),
  );
  const [editedMealTime, setEditedMealTime] = useState(() =>
    formatTimeInputValue(new Date(meal.timestamp)),
  );
  const [editedMealType, setEditedMealType] = useState<MealType>(
    meal.mealType ?? resolveDefaultMealType(new Date(meal.timestamp)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mealTypeLabel = meal.mealType ? t(`mealForm.mealTypeOptions.${meal.mealType}`) : null;

  // Reset state when meal changes or modal opens
  const resetState = useCallback(() => {
    setIsEditing(false);
    setEditedItems(meal.items);
    setEditedMealDate(formatDateInputValue(new Date(meal.timestamp)));
    setEditedMealTime(formatTimeInputValue(new Date(meal.timestamp)));
    setEditedMealType(meal.mealType ?? resolveDefaultMealType(new Date(meal.timestamp)));
    setError(null);
  }, [meal.items, meal.mealType, meal.timestamp]);

  // Reset state when meal prop changes or modal opens with a different meal
  // This ensures stale data from a previous meal doesn't persist
  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, meal.id, resetState]);

  const handleStartEdit = () => {
    setEditedItems([...meal.items]);
    setEditedMealDate(formatDateInputValue(new Date(meal.timestamp)));
    setEditedMealTime(formatTimeInputValue(new Date(meal.timestamp)));
    setEditedMealType(meal.mealType ?? resolveDefaultMealType(new Date(meal.timestamp)));
    setIsEditing(true);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditedItems(meal.items);
    setEditedMealDate(formatDateInputValue(new Date(meal.timestamp)));
    setEditedMealTime(formatTimeInputValue(new Date(meal.timestamp)));
    setEditedMealType(meal.mealType ?? resolveDefaultMealType(new Date(meal.timestamp)));
    setIsEditing(false);
    setError(null);
  };

  const handleAddItem = () => {
    setEditedItems([
      ...editedItems,
      {
        foodName: '',
        portionSize: 1,
        portionUnit: '份',
      },
    ]);
  };

  const handleSave = async () => {
    // Validate at least one item with food name
    const validItems = editedItems.filter((item) => item.foodName.trim() !== '');
    if (validItems.length === 0) {
      setError(t('mealForm.noItemsError'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedMeal: Meal = {
        ...meal,
        timestamp: toLocalTimestamp(editedMealDate, editedMealTime),
        mealType: editedMealType,
        items: validItems,
        updatedAt: new Date().toISOString(),
      };
      await onSave(updatedMeal);
      setIsEditing(false);
    } catch {
      setError(t('mealForm.syncFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmed = window.confirm(t('deleteConfirm.message', { itemName: '這筆餐點' }));
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(meal);
      onClose();
    } catch {
      setError(t('errors.mealDeleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Use modal hook for accessibility (focus trap, escape key, body scroll lock)
  const { modalRef, handleOverlayClick } = useModal({
    isOpen,
    onClose: handleClose,
    closeOnEscape: !isSaving && !isDeleting,
    closeOnOverlayClick: !isSaving && !isDeleting,
    trapFocus: true,
  });

  if (!isOpen) return null;

  const displayItems = isEditing ? editedItems : meal.items;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-detail-title"
    >
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 id="meal-detail-title" className="text-lg font-semibold text-gray-900">
            {isEditing ? t('mealDetail.editTitle') : t('mealDetail.viewTitle')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving || isDeleting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label={t('mealDetail.closeLabel')}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-4 py-4">
          {/* Photo */}
          {photoUrl && (
            <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-xl">
              <Image src={photoUrl} alt="Meal photo" fill className="object-cover" unoptimized />
            </div>
          )}

          {/* Timestamp */}
          <div className="mb-4 space-y-1 text-sm text-gray-500">
            <p>
              {t('mealDetail.recordedAt', {
                time: new Date(meal.timestamp).toLocaleString(),
              })}
            </p>
            {mealTypeLabel && (
              <p>
                {t('mealForm.mealTypeLabel')}: {mealTypeLabel}
              </p>
            )}
          </div>

          {isEditing && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {t('mealForm.mealDateLabel')}
                  </span>
                  <input
                    type="date"
                    value={editedMealDate}
                    onChange={(e) => setEditedMealDate(e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {t('mealForm.mealTimeLabel')}
                  </span>
                  <input
                    type="time"
                    value={editedMealTime}
                    onChange={(e) => setEditedMealTime(e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {t('mealForm.mealTypeLabel')}
                  </span>
                  <select
                    value={editedMealType}
                    onChange={(e) => setEditedMealType(e.target.value as MealType)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="breakfast">{t('mealForm.mealTypeOptions.breakfast')}</option>
                    <option value="lunch">{t('mealForm.mealTypeOptions.lunch')}</option>
                    <option value="dinner">{t('mealForm.mealTypeOptions.dinner')}</option>
                    <option value="snack">{t('mealForm.mealTypeOptions.snack')}</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Items */}
          {isEditing ? (
            <MealItemList
              items={editedItems}
              onChange={setEditedItems}
              onAddItem={handleAddItem}
              disabled={isSaving}
              enableNutritionLookup={true}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                {t('mealForm.items.detected', { count: displayItems.length })}
              </p>
              {displayItems.map((item, index) => (
                <ViewMealItemCard key={item.id || index} item={item} />
              ))}
            </div>
          )}

          {/* Nutrition Summary */}
          <div className="mt-4">
            <TotalNutritionSummary items={displayItems} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-200 px-4 py-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t('mealForm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? t('mealForm.saving') : t('mealForm.save')}
              </button>
            </>
          ) : (
            <>
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? t('deleteConfirm.deleting') : t('mealDetail.delete')}
                </button>
              )}
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('mealDetail.edit')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * View-only meal item card (non-editable display)
 */
interface ViewMealItemCardProps {
  item: MealItem;
}

const ViewMealItemCard = memo(function ViewMealItemCard({ item }: ViewMealItemCardProps) {
  const { t } = useI18n();
  const [showDetailed, setShowDetailed] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Food name and portion */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-medium text-gray-900">{item.foodName}</p>
          <p className="text-sm text-gray-500">
            {item.portionSize} {item.portionUnit}
          </p>
        </div>
        {item.category && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {item.category === 'beverage'
              ? '飲料'
              : item.category === 'soup'
                ? '湯品'
                : item.category === 'dessert'
                  ? '甜點'
                  : '食物'}
          </span>
        )}
      </div>

      {/* Basic nutrition */}
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-2">
        <NutritionValue label={t('mealForm.caloriesLabel')} value={item.calories} unit="kcal" />
        <NutritionValue label={t('mealForm.proteinLabel')} value={item.protein} unit="g" />
        <NutritionValue label={t('mealForm.carbsLabel')} value={item.carbs} unit="g" />
        <NutritionValue label={t('mealForm.fatsLabel')} value={item.fat} unit="g" />
      </div>

      {/* Toggle for detailed nutrition */}
      <button
        type="button"
        onClick={() => setShowDetailed(!showDetailed)}
        className="mt-2 w-full text-center text-xs text-blue-600 hover:text-blue-800"
      >
        {showDetailed ? '▲ 收合詳細營養' : '▼ 展開詳細營養'}
      </button>

      {/* Detailed nutrition */}
      {showDetailed && (
        <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
          {/* Extended macronutrients */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              {t('mealForm.macronutrientsTitle')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <NutritionValue label={t('mealForm.fiberLabel')} value={item.fiber} unit="g" />
              <NutritionValue label={t('mealForm.sugarLabel')} value={item.sugar} unit="g" />
              <NutritionValue
                label={t('mealForm.saturatedFatLabel')}
                value={item.saturatedFat}
                unit="g"
              />
            </div>
          </div>

          {/* Minerals */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">{t('mealForm.mineralsTitle')}</p>
            <div className="grid grid-cols-4 gap-2">
              <NutritionValue label={t('mealForm.sodiumLabel')} value={item.sodium} unit="mg" />
              <NutritionValue
                label={t('mealForm.potassiumLabel')}
                value={item.potassium}
                unit="mg"
              />
              <NutritionValue label={t('mealForm.calciumLabel')} value={item.calcium} unit="mg" />
              <NutritionValue label={t('mealForm.ironLabel')} value={item.iron} unit="mg" />
            </div>
          </div>

          {/* Vitamins */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">{t('mealForm.vitaminsTitle')}</p>
            <div className="grid grid-cols-4 gap-2">
              <NutritionValue label={t('mealForm.vitaminALabel')} value={item.vitaminA} unit="μg" />
              <NutritionValue label={t('mealForm.vitaminCLabel')} value={item.vitaminC} unit="mg" />
              <NutritionValue label={t('mealForm.vitaminDLabel')} value={item.vitaminD} unit="μg" />
              <NutritionValue
                label={t('mealForm.vitaminB12Label')}
                value={item.vitaminB12}
                unit="μg"
              />
            </div>
          </div>

          {/* Other */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              {t('mealForm.otherNutrientsTitle')}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <NutritionValue
                label={t('mealForm.cholesterolLabel')}
                value={item.cholesterol}
                unit="mg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Nutrition source */}
      {item.nutritionSource && (
        <p className="mt-2 text-xs text-gray-500">
          {item.nutritionSource.includes('AI') ? (
            <span className="text-purple-600">{t('mealForm.aiEstimated')}</span>
          ) : (
            item.nutritionSource
          )}
        </p>
      )}
    </div>
  );
});

/**
 * Simple nutrition value display
 */
interface NutritionValueProps {
  label: string;
  value: number | null | undefined;
  unit: string;
}

const NutritionValue = memo(function NutritionValue({ label, value, unit }: NutritionValueProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">
        {value != null ? `${value}${unit}` : '--'}
      </p>
    </div>
  );
});

export default MealDetailModal;
