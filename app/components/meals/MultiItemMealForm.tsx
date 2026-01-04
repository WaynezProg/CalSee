"use client";

/**
 * MultiItemMealForm Component
 * Based on Spec 003 - Multi-item Recognition
 *
 * Form for confirming/editing multi-item meal recognition results.
 * Displays all recognized items with inline editing.
 * Uses existing Spec 002 sync infrastructure for saving meals.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { MealItemList } from "./MealItemList";
import { TotalNutritionSummary } from "./TotalNutritionSummary";
import { SyncStatus, type SyncStatusType } from "@/app/components/sync/SyncStatus";
import { syncMealWithQueue, isSyncError } from "@/lib/services/sync/meal-sync";
import { uploadPhotoWithThumbnail } from "@/lib/services/sync/photo-sync";
import type { MealItem, Meal } from "@/types/sync";
import type { MultiItemRecognitionResponse } from "@/types/recognition";

interface MultiItemMealFormProps {
  recognitionResult?: MultiItemRecognitionResponse | null;
  photoFile?: File | null;
  isLoading?: boolean;
  onSubmitSuccess?: () => void;
  onCancel: () => void;
}

/**
 * Map recognition response to MealItem array.
 */
function mapRecognitionToItems(
  response: MultiItemRecognitionResponse
): MealItem[] {
  return response.items.map((item, index) => ({
    id: `item-${Date.now()}-${index}`,
    foodName: item.name,
    portionSize: 1,
    portionUnit: item.portionUnit ?? "份",
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
    confidence: item.confidence,
    notes: item.notes,
    nutritionSource: undefined,
  }));
}

/**
 * Create a new empty meal item.
 */
function createEmptyItem(): MealItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    foodName: "",
    portionSize: 1,
    portionUnit: "份",
    calories: undefined,
    protein: undefined,
    carbs: undefined,
    fat: undefined,
    confidence: undefined,
    notes: undefined,
    nutritionSource: undefined,
  };
}

export function MultiItemMealForm({
  recognitionResult,
  photoFile,
  isLoading = false,
  onSubmitSuccess,
  onCancel,
}: MultiItemMealFormProps) {
  const { t } = useI18n();
  const [items, setItems] = useState<MealItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize items from recognition result
  useEffect(() => {
    if (recognitionResult && recognitionResult.items.length > 0) {
      setItems(mapRecognitionToItems(recognitionResult));
    } else {
      // Default to one empty item for manual entry
      setItems([createEmptyItem()]);
    }
  }, [recognitionResult]);

  // Handler for adding a new item
  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  // Handler for updating items
  const handleItemsChange = useCallback((newItems: MealItem[]) => {
    setItems(newItems);
  }, []);

  // Submit handler - uses Spec 002 sync infrastructure
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSyncStatus(null);
      setStatusMessage(null);

      // Filter out items with empty food names (T026 validation)
      const validItems = items.filter((item) => item.foodName.trim());

      if (validItems.length === 0) {
        setSyncStatus("failed");
        setStatusMessage(t("mealForm.noItemsError"));
        return;
      }

      setIsSaving(true);

      try {
        let photoId: string | undefined;

        // Upload photo if provided
        if (photoFile) {
          try {
            const uploaded = await uploadPhotoWithThumbnail(photoFile);
            photoId = uploaded.photoId;
          } catch (err) {
            const error = err as Error & { code?: string };
            if (error.code === "quota_exceeded") {
              setSyncStatus("quota_exceeded");
            } else {
              setSyncStatus("failed");
            }
            setIsSaving(false);
            return;
          }
        }

        // Create meal with all items (T027 - use existing sync infrastructure)
        const meal: Meal = {
          timestamp: new Date().toISOString(),
          photoId,
          items: validItems,
        };

        // Use existing Spec 002 sync mechanism
        await syncMealWithQueue(meal, "create");

        // Success - clear any error status and notify caller
        setSyncStatus(null);
        onSubmitSuccess?.();
      } catch (err) {
        if (isSyncError(err) && err.code === "conflict") {
          setSyncStatus("conflict");
        } else {
          setSyncStatus("failed");
        }
        setStatusMessage(t("mealForm.syncFailed"));
      } finally {
        setIsSaving(false);
      }
    },
    [items, photoFile, t, onSubmitSuccess]
  );

  // Check if form is valid (T026 - at least one item with non-empty name)
  const isValid = useMemo(() => {
    return items.some((item) => item.foodName.trim());
  }, [items]);

  const disabled = isLoading || isSaving;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item list */}
      <MealItemList
        items={items}
        onChange={handleItemsChange}
        onAddItem={handleAddItem}
        disabled={disabled}
        minItems={1}
        enableNutritionLookup
      />

      {/* Total nutrition summary */}
      {items.length > 0 && <TotalNutritionSummary items={items} />}

      {/* Sync status */}
      <SyncStatus status={syncStatus} message={statusMessage} />

      {/* Validation error message */}
      {!isValid && items.length > 0 && (
        <p className="text-sm text-red-600">{t("mealForm.noItemsError")}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {t("mealForm.cancel")}
        </button>
        <button
          type="submit"
          disabled={disabled || !isValid}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? t("mealForm.saving") : t("mealForm.save")}
        </button>
      </div>
    </form>
  );
}

export default MultiItemMealForm;
