"use client";

/**
 * MealItemList Component
 * Based on Spec 003 - Multi-item Recognition
 *
 * Displays and manages list of recognized food items.
 * Supports inline editing, deletion, adding new items,
 * and progressive nutrition lookup.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNutritionLookup } from "@/lib/nutrition/lookup";
import type { MealItem } from "@/types/sync";

interface MealItemListProps {
  items: MealItem[];
  onChange: (items: MealItem[]) => void;
  onAddItem?: () => void;
  disabled?: boolean;
  minItems?: number;
  enableNutritionLookup?: boolean;
}

export function MealItemList({
  items,
  onChange,
  onAddItem,
  disabled = false,
  minItems = 1,
  enableNutritionLookup = false,
}: MealItemListProps) {
  const { t } = useI18n();

  const updateItem = useCallback(
    (index: number, patch: Partial<MealItem>) => {
      const next = items.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      );
      onChange(next);
    },
    [items, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      // Enforce minimum items
      if (items.length <= minItems) {
        return;
      }
      const next = items.filter((_, idx) => idx !== index);
      onChange(next);
    },
    [items, onChange, minItems]
  );

  const canRemove = items.length > minItems;

  return (
    <div className="space-y-3">
      {/* Items count header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {t("mealForm.items.detected", { count: items.length })}
        </p>
        {onAddItem && (
          <button
            type="button"
            onClick={onAddItem}
            disabled={disabled}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            + {t("mealForm.items.add")}
          </button>
        )}
      </div>

      {/* Item cards */}
      {items.map((item, index) => (
        <MealItemCard
          key={item.id || index}
          item={item}
          index={index}
          onUpdate={updateItem}
          onRemove={removeItem}
          canRemove={canRemove}
          disabled={disabled}
          enableNutritionLookup={enableNutritionLookup}
        />
      ))}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">{t("mealForm.items.noItems")}</p>
          {onAddItem && (
            <button
              type="button"
              onClick={onAddItem}
              disabled={disabled}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + {t("mealForm.items.add")}
            </button>
          )}
        </div>
      )}

      {/* Minimum items warning */}
      {!canRemove && items.length === minItems && (
        <p className="text-xs text-orange-600">
          {t("mealForm.items.atLeastOneRequired")}
        </p>
      )}
    </div>
  );
}

/**
 * MealItemCard - Individual item display with nutrition lookup.
 */
interface MealItemCardProps {
  item: MealItem;
  index: number;
  onUpdate: (index: number, patch: Partial<MealItem>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  disabled: boolean;
  enableNutritionLookup: boolean;
}

function MealItemCard({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  disabled,
  enableNutritionLookup,
}: MealItemCardProps) {
  const { t } = useI18n();
  const [manualNutritionMode, setManualNutritionMode] = useState(false);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const previousFoodNameRef = useRef(item.foodName);
  const previousPortionSizeRef = useRef(item.portionSize);

  // Use nutrition lookup hook when enabled
  const {
    data: nutritionResult,
    isLoading: isNutritionLoading,
    isError: isNutritionError,
  } = useNutritionLookup(
    item.foodName,
    item.portionSize,
    enableNutritionLookup && item.foodName.trim().length >= 2
  );

  // Reset manual override when food name changes
  useEffect(() => {
    if (item.foodName !== previousFoodNameRef.current) {
      previousFoodNameRef.current = item.foodName;
      setManualNutritionMode(false);
      setHasManualOverride(false);
    }
  }, [item.foodName]);

  useEffect(() => {
    if (item.portionSize !== previousPortionSizeRef.current) {
      previousPortionSizeRef.current = item.portionSize;
      setManualNutritionMode(false);
      setHasManualOverride(false);
    }
  }, [item.portionSize]);

  // Update item nutrition when lookup completes
  useEffect(() => {
    if (hasManualOverride) {
      return;
    }

    if (nutritionResult?.success && nutritionResult.data) {
      const { calories, protein, carbohydrates, fats, sourceDatabase, dataComplete } =
        nutritionResult.data;

      // Only update if we have data and it's different
      if (
        calories !== item.calories ||
        protein !== item.protein ||
        carbohydrates !== item.carbs ||
        fats !== item.fat
      ) {
        onUpdate(index, {
          calories,
          protein,
          carbs: carbohydrates,
          fat: fats,
          nutritionSource: sourceDatabase,
        });
      }

      // Show manual input if data is incomplete
      if (!dataComplete) {
        setManualNutritionMode(true);
      }
    } else if (nutritionResult?.success && !nutritionResult.data?.dataComplete) {
      // No data found - enable manual mode
      setManualNutritionMode(true);
    }
  }, [
    nutritionResult,
    index,
    onUpdate,
    item.calories,
    item.protein,
    item.carbs,
    item.fat,
    hasManualOverride,
  ]);

  // Enable manual mode on error
  useEffect(() => {
    if (isNutritionError) {
      setManualNutritionMode(true);
    }
  }, [isNutritionError]);

  const showLoading = enableNutritionLookup && isNutritionLoading;
  const showInsufficientData =
    enableNutritionLookup &&
    !isNutritionLoading &&
    item.calories == null &&
    !manualNutritionMode;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Item header with name and delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={item.foodName}
            onChange={(e) => {
              const nextName = e.target.value;
              onUpdate(index, {
                foodName: nextName,
                calories: undefined,
                protein: undefined,
                carbs: undefined,
                fat: undefined,
                nutritionSource: undefined,
              });
            }}
            placeholder={t("mealForm.foodNamePlaceholder")}
            disabled={disabled}
            className="w-full border-0 border-b border-gray-200 bg-transparent pb-1 text-lg font-medium text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          {item.confidence != null && (
            <p className="mt-1 text-xs text-gray-500">
              {t("mealForm.recognitionConfidence", {
                percent: Math.round(item.confidence * 100),
              })}
            </p>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {t("mealForm.items.delete")}
          </button>
        )}
      </div>

      {/* Portion size row */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">
            {t("mealForm.portionLabel")}
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={item.portionSize}
              onChange={(e) =>
                onUpdate(index, {
                  portionSize: parseFloat(e.target.value) || 1,
                })
              }
              disabled={disabled}
              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <input
              type="text"
              value={item.portionUnit}
              onChange={(e) =>
                onUpdate(index, { portionUnit: e.target.value })
              }
              placeholder="份"
              list={`portion-unit-options-${item.id ?? index}`}
              disabled={disabled}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <datalist id={`portion-unit-options-${item.id ?? index}`}>
              <option value="份" />
              <option value="碗" />
              <option value="盤" />
              <option value="杯" />
              <option value="克" />
              <option value="公斤" />
              <option value="毫升" />
              <option value="公升" />
            </datalist>
          </div>
        </div>
      </div>

      {/* Nutrition display */}
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-2">
        <NutritionField
          label={t("mealForm.caloriesLabel")}
          value={item.calories}
          unit="kcal"
          isLoading={showLoading}
          editable={manualNutritionMode}
          onChange={(val) => {
            setHasManualOverride(true);
            onUpdate(index, { calories: val });
          }}
          disabled={disabled}
        />
        <NutritionField
          label={t("mealForm.proteinLabel")}
          value={item.protein}
          unit="g"
          isLoading={showLoading}
          editable={manualNutritionMode}
          onChange={(val) => {
            setHasManualOverride(true);
            onUpdate(index, { protein: val });
          }}
          disabled={disabled}
        />
        <NutritionField
          label={t("mealForm.carbsLabel")}
          value={item.carbs}
          unit="g"
          isLoading={showLoading}
          editable={manualNutritionMode}
          onChange={(val) => {
            setHasManualOverride(true);
            onUpdate(index, { carbs: val });
          }}
          disabled={disabled}
        />
        <NutritionField
          label={t("mealForm.fatsLabel")}
          value={item.fat}
          unit="g"
          isLoading={showLoading}
          editable={manualNutritionMode}
          onChange={(val) => {
            setHasManualOverride(true);
            onUpdate(index, { fat: val });
          }}
          disabled={disabled}
        />
      </div>

      {/* Insufficient data message */}
      {showInsufficientData && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-orange-600">
            {t("mealForm.items.insufficientData")}
          </p>
          <button
            type="button"
            onClick={() => setManualNutritionMode(true)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {t("mealForm.manualEntry")}
          </button>
        </div>
      )}

      {/* Nutrition source indicator */}
      {item.nutritionSource && !manualNutritionMode && item.nutritionSource !== "manual" && (
        <p className="mt-2 text-xs text-gray-500">
          {item.nutritionSource.includes("AI") ? (
            <span className="text-purple-600">
              {t("mealForm.aiEstimated")}
            </span>
          ) : (
            item.nutritionSource
          )}
        </p>
      )}

      {/* Notes if present */}
      {item.notes && (
        <p className="mt-2 text-xs italic text-gray-500">{item.notes}</p>
      )}
    </div>
  );
}

/**
 * Nutrition field display component with optional editing.
 */
interface NutritionFieldProps {
  label: string;
  value: number | null | undefined;
  unit: string;
  isLoading?: boolean;
  editable?: boolean;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
}

function NutritionField({
  label,
  value,
  unit,
  isLoading = false,
  editable = false,
  onChange,
  disabled = false,
}: NutritionFieldProps) {
  if (isLoading) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="mx-auto mt-1 h-5 w-12 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (editable && onChange) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min="0"
            step="1"
            value={value ?? ""}
            onChange={(e) =>
              onChange(e.target.value ? parseFloat(e.target.value) : undefined)
            }
            disabled={disabled}
            className="w-14 rounded border border-gray-300 px-1 py-0.5 text-center text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            placeholder="--"
          />
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">
        {value != null ? `${value}${unit}` : "--"}
      </p>
    </div>
  );
}

export default MealItemList;
