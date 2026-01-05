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
import { resolvePortionScale, scaleNutritionValues } from "@/lib/nutrition/portion-conversion";
import type { MealItem, SugarLevel, IceLevel } from "@/types/sync";
import { BeverageOptions } from "./BeverageOptions";

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
  const [showDetailedNutrition, setShowDetailedNutrition] = useState(false);
  const [portionInput, setPortionInput] = useState(() => `${item.portionSize}`);
  const previousFoodNameRef = useRef(item.foodName);
  const previousPortionSizeRef = useRef(item.portionSize);
  const previousPortionUnitRef = useRef(item.portionUnit);

  // Use nutrition lookup hook when enabled
  const {
    data: nutritionResult,
    isLoading: isNutritionLoading,
    isError: isNutritionError,
  } = useNutritionLookup(
    item.foodName,
    item.portionSize,
    item.portionUnit,
    item.containerSize,
    item.aiEstimatedWeightGrams,
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
    setPortionInput(item.portionSize ? `${item.portionSize}` : "");
  }, [item.portionSize]);

  useEffect(() => {
    const sizeChanged = item.portionSize !== previousPortionSizeRef.current;
    const unitChanged = item.portionUnit !== previousPortionUnitRef.current;

    if (!sizeChanged && !unitChanged) return;

    const previousSize = previousPortionSizeRef.current;
    const previousUnit = previousPortionUnitRef.current;

    previousPortionSizeRef.current = item.portionSize;
    previousPortionUnitRef.current = item.portionUnit;

    if (hasManualOverride || manualNutritionMode) {
      const previousScale = resolvePortionScale(
        item.foodName,
        previousSize,
        previousUnit,
        item.containerSize,
        item.aiEstimatedWeightGrams
      ).scale;
      const nextScale = resolvePortionScale(
        item.foodName,
        item.portionSize,
        item.portionUnit,
        item.containerSize,
        item.aiEstimatedWeightGrams
      ).scale;

      if (previousScale > 0 && nextScale > 0 && previousScale !== nextScale) {
        const ratio = nextScale / previousScale;
        const scaledValues = scaleNutritionValues(
          {
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            sugar: item.sugar,
            saturatedFat: item.saturatedFat,
            sodium: item.sodium,
            potassium: item.potassium,
            calcium: item.calcium,
            iron: item.iron,
            vitaminA: item.vitaminA,
            vitaminC: item.vitaminC,
            vitaminD: item.vitaminD,
            vitaminB12: item.vitaminB12,
            cholesterol: item.cholesterol,
          },
          ratio
        );
        onUpdate(index, scaledValues);
      }
      return;
    }

    setManualNutritionMode(false);
    setHasManualOverride(false);
  }, [
    item.portionSize,
    item.portionUnit,
    item.foodName,
    item.calories,
    item.protein,
    item.carbs,
    item.fat,
    item.fiber,
    item.sugar,
    item.saturatedFat,
    item.sodium,
    item.potassium,
    item.calcium,
    item.iron,
    item.vitaminA,
    item.vitaminC,
    item.vitaminD,
    item.vitaminB12,
    item.cholesterol,
    hasManualOverride,
    manualNutritionMode,
    index,
    onUpdate,
  ]);

  // Update item nutrition when lookup completes
  useEffect(() => {
    if (hasManualOverride) {
      return;
    }

    if (nutritionResult?.success && nutritionResult.data) {
      const {
        calories, protein, carbohydrates, fats,
        fiber, sugar, saturatedFat,
        sodium, potassium, calcium, iron,
        vitaminA, vitaminC, vitaminD, vitaminB12,
        cholesterol,
        sourceDatabase, dataComplete
      } = nutritionResult.data;

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
          fiber,
          sugar,
          saturatedFat,
          sodium,
          potassium,
          calcium,
          iron,
          vitaminA,
          vitaminC,
          vitaminD,
          vitaminB12,
          cholesterol,
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
              value={portionInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setPortionInput(nextValue);
                if (!nextValue) return;
                const parsed = Number.parseFloat(nextValue);
                if (!Number.isFinite(parsed) || parsed <= 0) return;
                onUpdate(index, { portionSize: parsed });
              }}
              onBlur={() => {
                if (portionInput.trim()) return;
                setPortionInput("1");
                onUpdate(index, { portionSize: 1 });
              }}
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
              <option value="片" />
              <option value="隻" />
              <option value="塊" />
              <option value="顆" />
              <option value="朵" />
            </datalist>
          </div>
        </div>
      </div>

      {/* Nutrition display */}
      <div className="mt-3 rounded-lg bg-gray-50 p-2">
        {/* Basic nutrition - always visible */}
        <div className="grid grid-cols-4 gap-2">
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

        {/* Toggle button for detailed nutrition */}
        <button
          type="button"
          onClick={() => setShowDetailedNutrition(!showDetailedNutrition)}
          className="mt-2 w-full text-center text-xs text-blue-600 hover:text-blue-800"
        >
          {showDetailedNutrition ? "▲ 收合詳細營養" : "▼ 展開詳細營養"}
        </button>

        {/* Detailed nutrition - collapsible */}
        {showDetailedNutrition && (
          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
            {/* Extended macronutrients */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t("mealForm.macronutrientsTitle")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                <NutritionField
                  label={t("mealForm.fiberLabel")}
                  value={item.fiber}
                  unit="g"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { fiber: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.sugarLabel")}
                  value={item.sugar}
                  unit="g"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { sugar: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.saturatedFatLabel")}
                  value={item.saturatedFat}
                  unit="g"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { saturatedFat: val });
                  }}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Minerals */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t("mealForm.mineralsTitle")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <NutritionField
                  label={t("mealForm.sodiumLabel")}
                  value={item.sodium}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { sodium: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.potassiumLabel")}
                  value={item.potassium}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { potassium: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.calciumLabel")}
                  value={item.calcium}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { calcium: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.ironLabel")}
                  value={item.iron}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { iron: val });
                  }}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Vitamins */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t("mealForm.vitaminsTitle")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <NutritionField
                  label={t("mealForm.vitaminALabel")}
                  value={item.vitaminA}
                  unit="μg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { vitaminA: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.vitaminCLabel")}
                  value={item.vitaminC}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { vitaminC: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.vitaminDLabel")}
                  value={item.vitaminD}
                  unit="μg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { vitaminD: val });
                  }}
                  disabled={disabled}
                />
                <NutritionField
                  label={t("mealForm.vitaminB12Label")}
                  value={item.vitaminB12}
                  unit="μg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { vitaminB12: val });
                  }}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Other */}
            <div>
              <p className="mb-2 text-xs font-medium text-gray-600">
                {t("mealForm.otherNutrientsTitle")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <NutritionField
                  label={t("mealForm.cholesterolLabel")}
                  value={item.cholesterol}
                  unit="mg"
                  isLoading={showLoading}
                  editable={manualNutritionMode}
                  onChange={(val) => {
                    setHasManualOverride(true);
                    onUpdate(index, { cholesterol: val });
                  }}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        )}
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

      {/* Beverage options for drinks */}
      {item.category === "beverage" && (
        <BeverageOptions
          sugarLevel={item.sugarLevel}
          iceLevel={item.iceLevel}
          baseSugar={item.baseSugar}
          currentSugar={item.sugar}
          onSugarLevelChange={(level: SugarLevel, adjustedSugar: number) => {
            // Store baseSugar if not already set (first time selecting)
            const baseSugar = item.baseSugar ?? item.sugar ?? adjustedSugar;
            onUpdate(index, {
              sugarLevel: level,
              sugar: adjustedSugar,
              baseSugar,
            });
          }}
          onIceLevelChange={(level: IceLevel) => {
            onUpdate(index, { iceLevel: level });
          }}
          disabled={disabled}
        />
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
