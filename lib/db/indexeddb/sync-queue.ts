import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface SyncQueueRecord {
  operationId: string;
  operationType: 'create' | 'update' | 'delete';
  mealId: string;
  localData: unknown;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
}

interface SyncQueueSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncQueueRecord;
    indexes: { status: string; nextRetryAt: number; mealId: string };
  };
}

const DB_NAME = 'CalSeeSyncQueue';
const STORE_NAME = 'syncQueue';
const DB_VERSION = 1;

export async function openSyncQueueDB(): Promise<IDBPDatabase<SyncQueueSchema>> {
  return openDB<SyncQueueSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'operationId' });
        store.createIndex('status', 'status');
        store.createIndex('nextRetryAt', 'nextRetryAt');
        store.createIndex('mealId', 'mealId');
      }
    },
  });
}

export async function addSyncQueueItem(item: SyncQueueRecord): Promise<void> {
  const db = await openSyncQueueDB();
  await db.put(STORE_NAME, item);
}

export async function updateSyncQueueItem(item: SyncQueueRecord): Promise<void> {
  const db = await openSyncQueueDB();
  await db.put(STORE_NAME, item);
}

export async function markSyncQueueItemCompleted(operationId: string): Promise<void> {
  const db = await openSyncQueueDB();
  const existing = await db.get(STORE_NAME, operationId);
  if (!existing) return;
  await db.put(STORE_NAME, { ...existing, status: 'completed', updatedAt: Date.now() });
}

export async function removeSyncQueueItem(operationId: string): Promise<void> {
  const db = await openSyncQueueDB();
  await db.delete(STORE_NAME, operationId);
}

export async function getDueSyncQueueItems(now = Date.now()): Promise<SyncQueueRecord[]> {
  const db = await openSyncQueueDB();
  const tx = db.transaction(STORE_NAME);
  const index = tx.store.index('nextRetryAt');
  const items: SyncQueueRecord[] = [];

  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
  while (cursor) {
    const value = cursor.value;
    if (value.status === 'pending' || value.status === 'failed') {
      items.push(value);
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  return items;
}
export async function getSyncQueueItem(operationId: string): Promise<SyncQueueRecord | undefined> {
  const db = await openSyncQueueDB();
  return db.get(STORE_NAME, operationId);
}

export async function getPendingSyncQueueCount(): Promise<number> {
  const db = await openSyncQueueDB();
  const pending = await db.getAllFromIndex(STORE_NAME, 'status', 'pending');
  const failed = await db.getAllFromIndex(STORE_NAME, 'status', 'failed');
  const syncing = await db.getAllFromIndex(STORE_NAME, 'status', 'syncing');
  return pending.length + failed.length + syncing.length;
}
