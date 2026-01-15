/**
 * Nutrition Database API Route
 *
 * GET /api/nutrition?food={food_name}
 *
 * Returns nutrition data for a given food from USDA FoodData Central.
 * Server-side route to protect API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';

interface NutritionResponse {
  success: boolean;
  data?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fats?: number;
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
    sourceDatabase: string;
    dataComplete: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface USDAFoodSearchResponse {
  foods?: Array<{
    description: string;
    foodNutrients?: Array<{
      nutrientId: number;
      nutrientName: string;
      value: number;
      unitName: string;
    }>;
  }>;
}

// USDA nutrient IDs
// Reference: https://fdc.nal.usda.gov/api-guide.html
const NUTRIENT_IDS = {
  // Basic macronutrients
  ENERGY: 1008, // kcal
  PROTEIN: 1003, // g
  CARBOHYDRATES: 1005, // g
  FAT: 1004, // g
  // Extended macronutrients
  FIBER: 1079, // g - Total dietary fiber
  SUGAR: 2000, // g - Total sugars
  SATURATED_FAT: 1258, // g
  // Minerals
  SODIUM: 1093, // mg
  POTASSIUM: 1092, // mg
  CALCIUM: 1087, // mg
  IRON: 1089, // mg
  // Vitamins
  VITAMIN_A: 1106, // μg RAE
  VITAMIN_C: 1162, // mg
  VITAMIN_D: 1114, // μg (D2 + D3)
  VITAMIN_B12: 1178, // μg
  // Other
  CHOLESTEROL: 1253, // mg
};

export async function GET(request: NextRequest): Promise<NextResponse<NutritionResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const food = searchParams.get('food');

    // Validate food parameter
    if (!food || food.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: translate('errors.invalidFoodName'),
          },
        },
        { status: 400 },
      );
    }

    // Check API key configuration
    const apiKey = process.env.NUTRITION_API_KEY;

    if (!apiKey) {
      console.error('Nutrition API key not configured');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_ERROR',
            message: translate('errors.nutritionUnavailable'),
          },
        },
        { status: 500 },
      );
    }

    // Call USDA FoodData Central API
    const result = await callUSDAApi(food.trim(), apiKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Nutrition API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.nutritionFailedRetry'),
        },
      },
      { status: 500 },
    );
  }
}

/**
 * Call USDA FoodData Central API for nutrition data.
 */
async function callUSDAApi(foodName: string, apiKey: string): Promise<NutritionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', foodName);
    url.searchParams.set('dataType', 'Foundation,SR Legacy');
    url.searchParams.set('pageSize', '1');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('USDA API error:', response.status, await response.text());
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.nutritionUnavailable'),
        },
      };
    }

    const data: USDAFoodSearchResponse = await response.json();

    // No results found
    if (!data.foods || data.foods.length === 0) {
      return {
        success: true,
        data: {
          sourceDatabase: 'USDA FoodData Central',
          dataComplete: false,
        },
      };
    }

    const food = data.foods[0];
    const nutrients = food.foodNutrients || [];

    // Extract basic macronutrients
    const calories = findNutrient(nutrients, NUTRIENT_IDS.ENERGY);
    const protein = findNutrient(nutrients, NUTRIENT_IDS.PROTEIN);
    const carbohydrates = findNutrient(nutrients, NUTRIENT_IDS.CARBOHYDRATES);
    const fats = findNutrient(nutrients, NUTRIENT_IDS.FAT);

    // Extract extended macronutrients
    const fiber = findNutrient(nutrients, NUTRIENT_IDS.FIBER);
    const sugar = findNutrient(nutrients, NUTRIENT_IDS.SUGAR);
    const saturatedFat = findNutrient(nutrients, NUTRIENT_IDS.SATURATED_FAT);

    // Extract minerals
    const sodium = findNutrient(nutrients, NUTRIENT_IDS.SODIUM);
    const potassium = findNutrient(nutrients, NUTRIENT_IDS.POTASSIUM);
    const calcium = findNutrient(nutrients, NUTRIENT_IDS.CALCIUM);
    const iron = findNutrient(nutrients, NUTRIENT_IDS.IRON);

    // Extract vitamins
    const vitaminA = findNutrient(nutrients, NUTRIENT_IDS.VITAMIN_A);
    const vitaminC = findNutrient(nutrients, NUTRIENT_IDS.VITAMIN_C);
    const vitaminD = findNutrient(nutrients, NUTRIENT_IDS.VITAMIN_D);
    const vitaminB12 = findNutrient(nutrients, NUTRIENT_IDS.VITAMIN_B12);

    // Extract other
    const cholesterol = findNutrient(nutrients, NUTRIENT_IDS.CHOLESTEROL);

    // Basic macros must be present for dataComplete
    const dataComplete =
      calories !== undefined &&
      protein !== undefined &&
      carbohydrates !== undefined &&
      fats !== undefined;

    return {
      success: true,
      data: {
        // Basic macronutrients
        calories: calories !== undefined ? Math.round(calories) : undefined,
        protein: protein !== undefined ? Math.round(protein * 10) / 10 : undefined,
        carbohydrates:
          carbohydrates !== undefined ? Math.round(carbohydrates * 10) / 10 : undefined,
        fats: fats !== undefined ? Math.round(fats * 10) / 10 : undefined,
        // Extended macronutrients
        fiber: fiber !== undefined ? Math.round(fiber * 10) / 10 : undefined,
        sugar: sugar !== undefined ? Math.round(sugar * 10) / 10 : undefined,
        saturatedFat: saturatedFat !== undefined ? Math.round(saturatedFat * 10) / 10 : undefined,
        // Minerals
        sodium: sodium !== undefined ? Math.round(sodium) : undefined,
        potassium: potassium !== undefined ? Math.round(potassium) : undefined,
        calcium: calcium !== undefined ? Math.round(calcium) : undefined,
        iron: iron !== undefined ? Math.round(iron * 10) / 10 : undefined,
        // Vitamins
        vitaminA: vitaminA !== undefined ? Math.round(vitaminA) : undefined,
        vitaminC: vitaminC !== undefined ? Math.round(vitaminC * 10) / 10 : undefined,
        vitaminD: vitaminD !== undefined ? Math.round(vitaminD * 10) / 10 : undefined,
        vitaminB12: vitaminB12 !== undefined ? Math.round(vitaminB12 * 100) / 100 : undefined,
        // Other
        cholesterol: cholesterol !== undefined ? Math.round(cholesterol) : undefined,
        sourceDatabase: 'USDA FoodData Central',
        dataComplete,
      },
    };
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
}

/**
 * Find a nutrient value by ID.
 */
function findNutrient(
  nutrients: Array<{ nutrientId: number; value: number }>,
  nutrientId: number,
): number | undefined {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value;
}
