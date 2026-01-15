'use client';

import { useState } from 'react';
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
  const [items, setItems] = useState<MealItem[]>([emptyItem]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setStatusMessage(null);
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

      <MealItemList items={items} onChange={setItems} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          onClick={addItem}
        >
          Add item
        </button>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-semibold text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save meal'}
        </button>
      </div>

      <SyncStatus status={status} message={statusMessage} />
      <OfflineIndicator />
    </form>
  );
}
