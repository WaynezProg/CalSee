import { v4 as uuidv4 } from 'uuid';
import type { Meal } from '@/types/sync';
import {
  addSyncQueueItem,
  getDueSyncQueueItems,
  markSyncQueueItemCompleted,
  removeSyncQueueItem,
  updateSyncQueueItem,
} from '@/lib/db/indexeddb/sync-queue';

const MAX_RETRY_DELAY_MS = 60_000;
const SYNC_DEBUG = process.env.NEXT_PUBLIC_SYNC_DEBUG === 'true';

type SyncMetric = {
  successCount: number;
  failureCount: number;
  conflictCount: number;
  totalDurationMs: number;
};

const syncMetrics: SyncMetric = {
  successCount: 0,
  failureCount: 0,
  conflictCount: 0,
  totalDurationMs: 0,
};

class SyncError extends Error {
  constructor(
    message: string,
    public code: 'failed' | 'conflict' | 'quota_exceeded' = 'failed',
  ) {
    super(message);
  }
}

function getBackoffDelay(retryCount: number) {
  return Math.min(1000 * 2 ** retryCount, MAX_RETRY_DELAY_MS);
}

export async function syncMealCreate(meal: Meal): Promise<Meal> {
  const start = performance.now();
  const response = await fetch('/api/sync/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal),
  });

  if (!response.ok) {
    syncMetrics.failureCount += 1;
    throw new SyncError('Meal sync failed');
  }

  const data = await response.json();
  syncMetrics.successCount += 1;
  syncMetrics.totalDurationMs += performance.now() - start;
  if (SYNC_DEBUG) {
    console.info('[sync]', { operation: 'create', durationMs: performance.now() - start });
  }
  return data;
}

export async function enqueueMealSync(meal: Meal, operationType: 'create' | 'update' | 'delete') {
  const now = Date.now();
  await addSyncQueueItem({
    operationId: uuidv4(),
    operationType,
    mealId: meal.id ?? '',
    localData: meal,
    status: 'pending',
    retryCount: 0,
    nextRetryAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function syncMealWithQueue(meal: Meal, operationType: 'create' | 'update' | 'delete') {
  if (operationType !== 'create' && !meal.id) {
    throw new Error('Meal id is required for update/delete sync');
  }

  try {
    if (operationType === 'create') {
      return await syncMealCreate(meal);
    }

    const start = performance.now();
    const response = await fetch(`/api/sync/meals/${meal.id}`, {
      method: operationType === 'update' ? 'PUT' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: operationType === 'update' ? JSON.stringify(meal) : undefined,
    });

    if (!response.ok) {
      if (response.status === 409) {
        syncMetrics.conflictCount += 1;
        throw new SyncError('Meal conflict detected', 'conflict');
      }
      syncMetrics.failureCount += 1;
      throw new SyncError('Meal sync failed');
    }

    const payload = operationType === 'delete' ? undefined : await response.json();
    syncMetrics.successCount += 1;
    syncMetrics.totalDurationMs += performance.now() - start;
    if (SYNC_DEBUG) {
      console.info('[sync]', { operation: operationType, durationMs: performance.now() - start });
    }
    return payload;
  } catch (error) {
    await enqueueMealSync(meal, operationType);
    throw error;
  }
}

export async function processSyncQueue(): Promise<void> {
  const now = Date.now();
  const dueItems = await getDueSyncQueueItems(now);

  for (const item of dueItems) {
    const updatedAt = Date.now();
    await updateSyncQueueItem({
      ...item,
      status: 'syncing',
      updatedAt,
    });

    try {
      if (item.operationType === 'create') {
        await syncMealCreate(item.localData as Meal);
      } else if (item.operationType === 'update') {
        await fetch(`/api/sync/meals/${item.mealId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.localData),
        });
      } else if (item.operationType === 'delete') {
        await fetch(`/api/sync/meals/${item.mealId}`, { method: 'DELETE' });
      }

      await markSyncQueueItemCompleted(item.operationId);
      await removeSyncQueueItem(item.operationId);
    } catch {
      syncMetrics.failureCount += 1;
      const retryDelay = getBackoffDelay(item.retryCount + 1);
      await updateSyncQueueItem({
        ...item,
        status: 'failed',
        retryCount: item.retryCount + 1,
        nextRetryAt: Date.now() + retryDelay,
        updatedAt: Date.now(),
      });
    }
  }
}

export function getSyncMetrics() {
  const averageDurationMs =
    syncMetrics.successCount === 0 ? 0 : syncMetrics.totalDurationMs / syncMetrics.successCount;
  return {
    ...syncMetrics,
    averageDurationMs,
  };
}

export function isSyncError(error: unknown): error is SyncError {
  return error instanceof SyncError;
}
