/**
 * Meal Photo Logging - TypeScript Types
 * Based on data-model.md specification
 */

/**
 * Represents a logged meal record containing photo, food information,
 * nutrition estimates, and metadata.
 */
export interface Meal {
  id: string;                         // UUID
  photoId: string;                    // Reference to photo in photos store
  foodName: string;                   // Primary recognized food name (user may have corrected)
  alternativeFoods?: string[];        // Alternative food candidates (when confidence was low)
  portionSize: string;                // Portion size in serving-based units (e.g., "1 bowl", "2 servings")

  // Macronutrients
  calories?: number;                  // Estimated calories (nullable if data unavailable)
  protein?: number;                   // Estimated protein in grams
  carbohydrates?: number;             // Estimated carbohydrates in grams
  fats?: number;                      // Estimated fats in grams
  fiber?: number;                     // Estimated fiber in grams
  sugar?: number;                     // Estimated sugar in grams
  saturatedFat?: number;              // Estimated saturated fat in grams

  // Minerals
  sodium?: number;                    // Estimated sodium in milligrams
  potassium?: number;                 // Estimated potassium in milligrams
  calcium?: number;                   // Estimated calcium in milligrams
  iron?: number;                      // Estimated iron in milligrams

  // Vitamins
  vitaminA?: number;                  // Estimated vitamin A in micrograms
  vitaminC?: number;                  // Estimated vitamin C in milligrams
  vitaminD?: number;                  // Estimated vitamin D in micrograms
  vitaminB12?: number;                // Estimated vitamin B12 in micrograms

  // Other
  cholesterol?: number;               // Estimated cholesterol in milligrams

  // Metadata
  recognitionConfidence: number;      // Confidence score from recognition (0.0-1.0)
  nutritionDataComplete: boolean;     // Whether all nutrition values are available
  sourceDatabase?: string;            // Database reference (e.g., "USDA FoodData Central")
  isAIEstimate?: boolean;             // Whether nutrition was estimated by AI
  createdAt: Date;                    // Timestamp when meal was created
  updatedAt: Date;                    // Timestamp when meal was last modified
  isManualEntry: boolean;             // Whether meal was entered manually (vs. recognized)
}

/**
 * Photo stored separately in IndexedDB photos object store.
 */
export interface Photo {
  photoId: string;                    // UUID, matches Meal.photoId
  blob: Blob;                         // Compressed photo stored as Blob
  mimeType: string;                   // Image MIME type (e.g., "image/jpeg")
  width: number;                      // Image width in pixels
  height: number;                     // Image height in pixels
}

/**
 * Transient data structure for AI recognition output.
 * Not persisted - used during recognition workflow.
 */
export interface FoodRecognitionResult {
  primaryCandidate: string;           // Primary food candidate name
  alternativeCandidates: string[];    // Alternative candidates (when confidence is low)
  confidence: number;                 // Confidence score (0.0-1.0)
  components?: string[];              // Identified components for complex dishes
  portionEstimate?: string;           // Estimated portion size suggestion
}

/**
 * Recognition API response format.
 */
export interface RecognitionApiResponse {
  success: boolean;
  data?: FoodRecognitionResult;
  error?: {
    code: RecognitionError;
    message: string;
  };
}

/**
 * Recognition error types.
 */
export enum RecognitionError {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_IMAGE = 'INVALID_IMAGE',
  NO_FOOD_DETECTED = 'NO_FOOD_DETECTED',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED'
}

/**
 * Nutrition data structure.
 */
export interface NutritionData {
  // Macronutrients
  calories?: number;
  protein?: number;                   // in grams
  carbohydrates?: number;             // in grams
  fats?: number;                      // in grams
  fiber?: number;                     // in grams
  sugar?: number;                     // in grams
  saturatedFat?: number;              // in grams

  // Minerals
  sodium?: number;                    // in milligrams
  potassium?: number;                 // in milligrams
  calcium?: number;                   // in milligrams
  iron?: number;                      // in milligrams

  // Vitamins
  vitaminA?: number;                  // in micrograms (RAE)
  vitaminC?: number;                  // in milligrams
  vitaminD?: number;                  // in micrograms
  vitaminB12?: number;                // in micrograms

  // Other
  cholesterol?: number;               // in milligrams

  // Metadata
  sourceDatabase: string;             // "USDA FoodData Central" or "AI Estimate (OpenAI)"
  dataComplete: boolean;              // true if all values present
  isAIEstimate?: boolean;             // true if nutrition was estimated by AI
}

/**
 * Nutrition API response format.
 */
export interface NutritionApiResponse {
  success: boolean;
  data?: NutritionData;
  error?: {
    code: NutritionError;
    message: string;
  };
}

/**
 * Nutrition error types.
 */
export enum NutritionError {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INCOMPLETE_DATA = 'INCOMPLETE_DATA'
}

/**
 * Cached nutrition data in IndexedDB.
 */
export interface CachedNutritionData {
  foodName: string;                   // Normalized food name (lowercase)
  nutritionData: NutritionData;
  cachedAt: Date;
  expiresAt: Date;                    // TTL: 30 days
}

/**
 * User consent for cloud recognition.
 */
export interface CloudRecognitionConsent {
  accepted: boolean;
  version: string;                    // Consent version for tracking changes
  timestamp: Date;
}

/**
 * Form data for creating/editing meals.
 */
export interface MealFormData {
  foodName: string;
  portionSize: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fats?: number;
  isManualEntry: boolean;
}
