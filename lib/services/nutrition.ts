/**
 * Client-side Nutrition Service
 *
 * Calls the /api/nutrition route for nutrition data.
 * Implements caching in IndexedDB.
 */

import type { NutritionData, NutritionApiResponse, CachedNutritionData } from '@/types/meal';
import { getCachedNutrition, cacheNutrition } from '@/lib/db/indexeddb';
import { translate } from '@/lib/i18n';

const API_TIMEOUT = 2000; // 2 seconds
const CACHE_TTL_DAYS = 30;

interface NutritionServiceResult {
  success: boolean;
  data?: NutritionData;
  error?: {
    code: string;
    message: string;
  };
  fromCache?: boolean;
}

/**
 * Get nutrition data for a food.
 *
 * @param foodName - Name of the food to look up
 * @returns Promise resolving to nutrition result
 */
export async function getNutrition(foodName: string): Promise<NutritionServiceResult> {
  const normalizedName = foodName.toLowerCase().trim();

  // Check cache first
  try {
    const cached = await getCachedNutrition(normalizedName);
    if (cached) {
      return {
        success: true,
        data: cached.nutritionData,
        fromCache: true,
      };
    }
  } catch (err) {
    console.error('Cache lookup failed:', err);
  }

  // Call API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`/api/nutrition?food=${encodeURIComponent(foodName)}`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: NutritionApiResponse = await response.json();

      if (result.success && result.data) {
        // Cache the result
        try {
          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

          const cacheEntry: CachedNutritionData = {
            foodName: normalizedName,
            nutritionData: result.data,
            cachedAt: now,
            expiresAt,
          };

          await cacheNutrition(cacheEntry);
        } catch (cacheErr) {
          console.error('Failed to cache nutrition data:', cacheErr);
        }

        return {
          success: true,
          data: result.data,
          fromCache: false,
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: 'API_ERROR',
            message: translate('errors.nutritionFailed'),
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: translate('errors.nutritionTimeout'),
          },
        };
      }

      throw error;
    }
  } catch (error) {
    console.error('Nutrition service error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: translate('errors.networkError'),
      },
    };
  }
}

/**
 * Get nutrition data with retry logic.
 *
 * @param foodName - Name of the food to look up
 * @param maxRetries - Maximum number of retries (default: 1)
 * @returns Promise resolving to nutrition result
 */
export async function getNutritionWithRetry(
  foodName: string,
  maxRetries: number = 1
): Promise<NutritionServiceResult> {
  let lastError: NutritionServiceResult['error'];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await getNutrition(foodName);

    if (result.success || result.fromCache) {
      return result;
    }

    lastError = result.error;

    // Wait before retry
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    success: false,
    error: lastError || {
      code: 'API_ERROR',
      message: translate('errors.nutritionFailed'),
    },
  };
}

/**
 * Get AI-estimated nutrition data for a food.
 * Used as fallback when USDA database has no results.
 *
 * @param foodName - Name of the food to estimate
 * @param portionSize - Optional portion size for better estimation
 * @returns Promise resolving to nutrition result
 */
export async function getAINutritionEstimate(
  foodName: string,
  portionSize?: string
): Promise<NutritionServiceResult> {
  const normalizedName = foodName.toLowerCase().trim();
  const normalizedPortion = portionSize?.toLowerCase().trim() || 'default';
  const cacheKey = `ai:${normalizedName}:${normalizedPortion}`;

  // Check cache first (AI estimates are also cached)
  try {
    const cached = await getCachedNutrition(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached.nutritionData,
        fromCache: true,
      };
    }
  } catch (err) {
    console.error('Cache lookup failed:', err);
  }

  // Call AI API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // Longer timeout for AI

    try {
      const response = await fetch('/api/nutrition-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName,
          portionSize,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success && result.data) {
        // Cache the AI result
        try {
          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

          const cacheEntry: CachedNutritionData = {
            foodName: cacheKey,
            nutritionData: result.data,
            cachedAt: now,
            expiresAt,
          };

          await cacheNutrition(cacheEntry);
        } catch (cacheErr) {
          console.error('Failed to cache AI nutrition data:', cacheErr);
        }

        return {
          success: true,
          data: result.data,
          fromCache: false,
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: 'API_ERROR',
            message: translate('errors.nutritionFailed'),
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: translate('errors.nutritionTimeout'),
          },
        };
      }

      throw error;
    }
  } catch (error) {
    console.error('AI Nutrition service error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: translate('errors.networkError'),
      },
    };
  }
}

/**
 * Get nutrition data with AI fallback.
 * First tries USDA database, then falls back to AI estimation.
 *
 * @param foodName - Name of the food to look up
 * @param portionSize - Optional portion size for AI estimation
 * @returns Promise resolving to nutrition result
 */
export async function getNutritionWithAIFallback(
  foodName: string,
  portionSize?: string
): Promise<NutritionServiceResult> {
  // First, try USDA database
  const usdaResult = await getNutritionWithRetry(foodName);

  // If successful with complete data, return it
  if (usdaResult.success && usdaResult.data?.dataComplete) {
    return usdaResult;
  }

  // If USDA has partial data or no data, try AI estimation
  const aiResult = await getAINutritionEstimate(foodName, portionSize);

  if (aiResult.success) {
    return aiResult;
  }

  // If AI also fails, return USDA result if it had partial data
  if (usdaResult.success && usdaResult.data) {
    return usdaResult;
  }

  // Return AI error as it was the last attempt
  return aiResult;
}
