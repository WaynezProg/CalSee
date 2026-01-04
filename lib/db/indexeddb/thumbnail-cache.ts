import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface ThumbnailCacheRecord {
  photoId: string;
  thumbnailBlob: Blob;
  cachedTimestamp: number;
  expirationTimestamp: number;
  size: number;
}

interface ThumbnailCacheSchema extends DBSchema {
  thumbnailCache: {
    key: string;
    value: ThumbnailCacheRecord;
    indexes: { cachedTimestamp: number; expirationTimestamp: number };
  };
}

const DB_NAME = "CalSeeThumbnailCache";
const STORE_NAME = "thumbnailCache";
const DB_VERSION = 1;
const CACHE_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 50 * 1024;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cacheMetrics = {
  hitCount: 0,
  missCount: 0,
};

export async function openThumbnailCacheDB(): Promise<IDBPDatabase<ThumbnailCacheSchema>> {
  return openDB<ThumbnailCacheSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "photoId" });
        store.createIndex("cachedTimestamp", "cachedTimestamp");
        store.createIndex("expirationTimestamp", "expirationTimestamp");
      }
    },
  });
}

async function getCacheSize(db: IDBPDatabase<ThumbnailCacheSchema>): Promise<number> {
  const records = await db.getAll(STORE_NAME);
  return records.reduce((total, record) => total + record.size, 0);
}

async function evictOldest(db: IDBPDatabase<ThumbnailCacheSchema>, targetBytes: number): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite");
  const index = tx.store.index("cachedTimestamp");
  let remaining = targetBytes;

  let cursor = await index.openCursor();
  while (cursor && remaining > 0) {
    remaining -= cursor.value.size;
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

export async function getThumbnail(photoId: string): Promise<Blob | null> {
  const db = await openThumbnailCacheDB();
  const record = await db.get(STORE_NAME, photoId);

  if (!record) {
    cacheMetrics.missCount += 1;
    return null;
  }

  if (record.expirationTimestamp <= Date.now()) {
    await db.delete(STORE_NAME, photoId);
    cacheMetrics.missCount += 1;
    return null;
  }

  cacheMetrics.hitCount += 1;
  return record.thumbnailBlob;
}

export async function cacheThumbnail(photoId: string, blob: Blob, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  if (blob.size > MAX_THUMBNAIL_BYTES) {
    throw new Error("Thumbnail exceeds size limit");
  }

  const db = await openThumbnailCacheDB();
  const size = blob.size;
  const currentSize = await getCacheSize(db);
  const nextSize = currentSize + size;

  if (nextSize > CACHE_SIZE_LIMIT_BYTES) {
    await evictOldest(db, nextSize - CACHE_SIZE_LIMIT_BYTES);
  }

  const now = Date.now();
  const record: ThumbnailCacheRecord = {
    photoId,
    thumbnailBlob: blob,
    cachedTimestamp: now,
    expirationTimestamp: now + ttlMs,
    size,
  };

  await db.put(STORE_NAME, record);
}

export async function deleteThumbnail(photoId: string): Promise<void> {
  const db = await openThumbnailCacheDB();
  await db.delete(STORE_NAME, photoId);
}

export function getThumbnailCacheStats() {
  const total = cacheMetrics.hitCount + cacheMetrics.missCount;
  const hitRate = total === 0 ? 0 : cacheMetrics.hitCount / total;
  return {
    ...cacheMetrics,
    totalRequests: total,
    hitRate,
  };
}

export function isThumbnailCacheHitRateHealthy(target = 0.8) {
  return getThumbnailCacheStats().hitRate >= target;
}
