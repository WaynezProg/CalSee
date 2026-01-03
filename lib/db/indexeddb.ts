/**
 * IndexedDB Database Wrapper for CalSee Meal Logging
 *
 * Database: CalSeeMeals
 * Object Stores:
 * - meals: Meal records with photoId reference
 * - photos: Photo blobs stored separately
 * - nutritionCache: Cached nutrition data from API
 * - consent: User consent for cloud recognition
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Meal, Photo, CachedNutritionData, CloudRecognitionConsent } from '@/types/meal';

const DB_NAME = 'CalSeeMeals';
const DB_VERSION = 1;

/**
 * IndexedDB Schema Definition
 */
interface CalSeeDB extends DBSchema {
  meals: {
    key: string;
    value: {
      id: string;
      photoId: string;
      foodName: string;
      alternativeFoods?: string[];
      portionSize: string;
      calories?: number;
      protein?: number;
      carbohydrates?: number;
      fats?: number;
      recognitionConfidence: number;
      nutritionDataComplete: boolean;
      sourceDatabase?: string;
      createdAt: string; // ISO string for IndexedDB
      updatedAt: string; // ISO string for IndexedDB
      isManualEntry: boolean;
    };
    indexes: {
      'by-createdAt': string;
    };
  };
  photos: {
    key: string;
    value: {
      photoId: string;
      blob: Blob;
      mimeType: string;
      width: number;
      height: number;
    };
  };
  nutritionCache: {
    key: string;
    value: {
      foodName: string;
      nutritionData: {
        calories?: number;
        protein?: number;
        carbohydrates?: number;
        fats?: number;
        sourceDatabase: string;
        dataComplete: boolean;
      };
      cachedAt: string;
      expiresAt: string;
    };
    indexes: {
      'by-expiresAt': string;
    };
  };
  consent: {
    key: string;
    value: {
      type: string;
      accepted: boolean;
      version: string;
      timestamp: string;
    };
  };
}

let dbInstance: IDBPDatabase<CalSeeDB> | null = null;

/**
 * Open and initialize the IndexedDB database.
 */
export async function openDatabase(): Promise<IDBPDatabase<CalSeeDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<CalSeeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create meals object store
      if (!db.objectStoreNames.contains('meals')) {
        const mealsStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealsStore.createIndex('by-createdAt', 'createdAt');
      }

      // Create photos object store
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'photoId' });
      }

      // Create nutrition cache object store
      if (!db.objectStoreNames.contains('nutritionCache')) {
        const cacheStore = db.createObjectStore('nutritionCache', { keyPath: 'foodName' });
        cacheStore.createIndex('by-expiresAt', 'expiresAt');
      }

      // Create consent object store
      if (!db.objectStoreNames.contains('consent')) {
        db.createObjectStore('consent', { keyPath: 'type' });
      }
    },
  });

  return dbInstance;
}

// ============ Meal Operations ============

/**
 * Add a new meal to the database.
 */
export async function addMeal(meal: Meal): Promise<string> {
  const db = await openDatabase();
  const mealRecord = {
    ...meal,
    createdAt: meal.createdAt.toISOString(),
    updatedAt: meal.updatedAt.toISOString(),
  };
  await db.put('meals', mealRecord);
  return meal.id;
}

/**
 * Get a meal by ID.
 */
export async function getMeal(id: string): Promise<Meal | undefined> {
  const db = await openDatabase();
  const record = await db.get('meals', id);
  if (!record) return undefined;

  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  };
}

/**
 * Get all meals ordered by createdAt descending.
 */
export async function getAllMeals(): Promise<Meal[]> {
  const db = await openDatabase();
  const records = await db.getAllFromIndex('meals', 'by-createdAt');

  // Reverse to get descending order (newest first)
  return records.reverse().map(record => ({
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }));
}

/**
 * Update an existing meal.
 */
export async function updateMeal(meal: Meal): Promise<void> {
  const db = await openDatabase();
  const mealRecord = {
    ...meal,
    createdAt: meal.createdAt.toISOString(),
    updatedAt: meal.updatedAt.toISOString(),
  };
  await db.put('meals', mealRecord);
}

/**
 * Delete a meal and its associated photo.
 */
export async function deleteMeal(id: string): Promise<void> {
  const db = await openDatabase();
  const meal = await db.get('meals', id);

  if (meal) {
    // Delete associated photo first
    await db.delete('photos', meal.photoId);
    // Delete meal record
    await db.delete('meals', id);
  }
}

// ============ Photo Operations ============

/**
 * Add a photo to the database.
 */
export async function addPhoto(photo: Photo): Promise<string> {
  const db = await openDatabase();
  await db.put('photos', photo);
  return photo.photoId;
}

/**
 * Get a photo by ID.
 */
export async function getPhoto(photoId: string): Promise<Photo | undefined> {
  const db = await openDatabase();
  return db.get('photos', photoId);
}

/**
 * Delete a photo by ID.
 */
export async function deletePhoto(photoId: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('photos', photoId);
}

// ============ Nutrition Cache Operations ============

/**
 * Get cached nutrition data for a food.
 */
export async function getCachedNutrition(foodName: string): Promise<CachedNutritionData | undefined> {
  const db = await openDatabase();
  const normalizedName = foodName.toLowerCase().trim();
  const record = await db.get('nutritionCache', normalizedName);

  if (!record) return undefined;

  // Check if expired
  const expiresAt = new Date(record.expiresAt);
  if (expiresAt < new Date()) {
    // Delete expired record
    await db.delete('nutritionCache', normalizedName);
    return undefined;
  }

  return {
    ...record,
    cachedAt: new Date(record.cachedAt),
    expiresAt: new Date(record.expiresAt),
  };
}

/**
 * Cache nutrition data for a food.
 */
export async function cacheNutrition(data: CachedNutritionData): Promise<void> {
  const db = await openDatabase();
  const record = {
    ...data,
    foodName: data.foodName.toLowerCase().trim(),
    cachedAt: data.cachedAt.toISOString(),
    expiresAt: data.expiresAt.toISOString(),
  };
  await db.put('nutritionCache', record);
}

/**
 * Clean up expired nutrition cache entries.
 */
export async function cleanExpiredNutritionCache(): Promise<number> {
  const db = await openDatabase();
  const now = new Date().toISOString();
  const tx = db.transaction('nutritionCache', 'readwrite');
  const index = tx.store.index('by-expiresAt');

  let deletedCount = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));

  while (cursor) {
    await cursor.delete();
    deletedCount++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return deletedCount;
}

// ============ Consent Operations ============

const CONSENT_TYPE_CLOUD_RECOGNITION = 'cloud_recognition';

/**
 * Get cloud recognition consent status.
 */
export async function getCloudRecognitionConsent(): Promise<CloudRecognitionConsent | undefined> {
  const db = await openDatabase();
  const record = await db.get('consent', CONSENT_TYPE_CLOUD_RECOGNITION);

  if (!record) return undefined;

  return {
    accepted: record.accepted,
    version: record.version,
    timestamp: new Date(record.timestamp),
  };
}

/**
 * Save cloud recognition consent.
 */
export async function saveCloudRecognitionConsent(consent: CloudRecognitionConsent): Promise<void> {
  const db = await openDatabase();
  await db.put('consent', {
    type: CONSENT_TYPE_CLOUD_RECOGNITION,
    accepted: consent.accepted,
    version: consent.version,
    timestamp: consent.timestamp.toISOString(),
  });
}

/**
 * Withdraw cloud recognition consent.
 */
export async function withdrawCloudRecognitionConsent(): Promise<void> {
  const db = await openDatabase();
  await db.delete('consent', CONSENT_TYPE_CLOUD_RECOGNITION);
}

// ============ Storage Management ============

/**
 * Get storage usage estimate.
 */
export async function getStorageEstimate(): Promise<{ used: number; quota: number; percentage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    return { used, quota, percentage };
  }

  return { used: 0, quota: 0, percentage: 0 };
}

/**
 * Check if storage is approaching quota.
 * Returns true if usage exceeds 80%.
 */
export async function isStorageApproachingLimit(): Promise<boolean> {
  const { percentage } = await getStorageEstimate();
  return percentage > 80;
}

/**
 * Get total meal count.
 */
export async function getMealCount(): Promise<number> {
  const db = await openDatabase();
  return db.count('meals');
}
