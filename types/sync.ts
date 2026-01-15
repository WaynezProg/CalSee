export type FoodCategory = 'food' | 'beverage' | 'soup' | 'dessert';
export type SugarLevel = 'full' | 'less' | 'half' | 'light' | 'none';
export type IceLevel = 'normal' | 'less' | 'light' | 'none' | 'warm' | 'hot';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealItem {
  id?: string;
  mealId?: string;
  foodName: string;
  portionSize: number;
  portionUnit: string;
  containerSize?: 'small' | 'medium' | 'large';
  aiEstimatedCount?: number;
  aiEstimatedWeightGrams?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence?: number;
  notes?: string;
  nutritionSource?: string;

  // Extended nutrition fields
  fiber?: number;
  sugar?: number;
  saturatedFat?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminB12?: number;
  cholesterol?: number;

  // Beverage options
  category?: FoodCategory;
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
  baseSugar?: number; // Original AI-estimated sugar value for percentage calculation
}

export interface Meal {
  id?: string;
  userId?: string;
  timestamp: string;
  updatedAt?: string;
  mealType?: MealType | null;
  photoId?: string | null;
  totalCalories?: number | null;
  totalProtein?: number | null;
  totalCarbs?: number | null;
  totalFat?: number | null;
  items: MealItem[];
}

export interface Photo {
  id: string;
  userId: string;
  mealId?: string | null;
  mainPhotoKey: string;
  thumbnailKey: string;
  mainPhotoSize: number;
  thumbnailSize: number;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  uploadedAt: string;
}

export type SyncQueueStatus = 'pending' | 'syncing' | 'failed' | 'completed';
export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  operationId: string;
  operationType: SyncOperationType;
  mealId: string;
  localData: unknown;
  status: SyncQueueStatus;
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface ThumbnailCacheEntry {
  photoId: string;
  thumbnailBlob: Blob;
  cachedTimestamp: number;
  expirationTimestamp: number;
  size: number;
}
