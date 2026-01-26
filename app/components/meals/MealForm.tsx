'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import type { Meal, MealItem } from '@/types/sync';
import { MealItemList } from '@/app/components/meals/MealItemList';
import { OfflineIndicator } from '@/app/components/sync/OfflineIndicator';
import { SyncStatus, type SyncStatusType } from '@/app/components/sync/SyncStatus';
import { uploadPhotoWithThumbnail } from '@/lib/services/sync/photo-sync';
import { isSyncError, syncMealWithQueue } from '@/lib/services/sync/meal-sync';

const emptyItem: MealItem = {
  foodName: '',
  portionSize: 1,
  portionUnit: 'servings',
};

export function MealForm() {
  const { t } = useI18n();
  const [items, setItems] = useState<MealItem[]>([emptyItem]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Validation: at least one item with non-empty food name
  const isValid = useMemo(() => {
    return items.some((item) => item.foodName.trim());
  }, [items]);

  const addItem = useCallback(() => setItems((prev) => [...prev, { ...emptyItem }]), []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setStatus(null);
    setStatusMessage(null);

    // Validate before submission
    if (!isValid) {
      setStatus('failed');
      setStatusMessage(t('mealForm.noItemsError'));
      return;
    }

    setIsSubmitting(true);

    try {
      let photoId: string | undefined;

      if (photoFile) {
        try {
          const uploaded = await uploadPhotoWithThumbnail(photoFile);
          photoId = uploaded.photoId;
        } catch (err) {
          const error = err as Error & { code?: string };
          if (error.code === 'quota_exceeded') {
            setStatus('quota_exceeded');
          } else {
            setStatus('failed');
          }
          setIsSubmitting(false);
          return;
        }
      }

      const meal: Meal = {
        timestamp: new Date().toISOString(),
        photoId,
        items,
      };

      await syncMealWithQueue(meal, 'create');
      setItems([emptyItem]);
      setPhotoFile(null);
      setHasAttemptedSubmit(false);
      setStatus('success');
      setStatusMessage(t('mealForm.saveSuccess'));
    } catch (err) {
      if (isSyncError(err) && err.code === 'conflict') {
        setStatus('conflict');
      } else {
        setStatus('failed');
      }
      setStatusMessage('Failed to sync meal. It will retry in the background.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Meal photo</label>
        <input
          type="file"
          accept="image/*"
          className="mt-2 block w-full"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
        />
      </div>

      <MealItemList items={items} onChange={setItems} onAddItem={addItem} disabled={isSubmitting} />

      {/* Validation feedback */}
      {hasAttemptedSubmit && !isValid && (
        <p className="text-sm text-red-600" role="alert">
          {t('mealForm.noItemsError')}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          aria-disabled={isSubmitting}
        >
          {isSubmitting ? t('mealForm.saving') : t('mealForm.save')}
        </button>
      </div>

      <SyncStatus status={status} message={statusMessage} />
      <OfflineIndicator />
    </form>
  );
}
