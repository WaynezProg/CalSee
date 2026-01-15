/**
 * AI Nutrition Estimation API Route
 *
 * POST /api/nutrition-ai
 *
 * Uses OpenAI to estimate nutrition data when USDA database has no results.
 * Server-side route to protect API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { translate } from '@/lib/i18n';

interface NutritionAIRequest {
  foodName: string;
  portionSize?: string;
}

interface NutritionAIResponse {
  success: boolean;
  data?: {
    // Macronutrients
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fats?: number;
    fiber?: number;
    sugar?: number;
    saturatedFat?: number;
    // Minerals
    sodium?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    // Vitamins
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminB12?: number;
    // Other
    cholesterol?: number;
    // Metadata
    sourceDatabase: string;
    dataComplete: boolean;
    isAIEstimate: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<NutritionAIResponse>> {
  try {
    const body: NutritionAIRequest = await request.json();

    // Validate food name
    if (!body.foodName || body.foodName.trim() === '') {
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
    const apiKey = process.env.RECOGNITION_API_KEY;

    if (!apiKey) {
      console.error('OpenAI API key not configured');
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

    // Call OpenAI for nutrition estimation
    const result = await estimateNutritionWithAI(body.foodName.trim(), body.portionSize, apiKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI Nutrition API error:', error);
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
 * Use OpenAI to estimate nutrition data for a food item.
 */
async function estimateNutritionWithAI(
  foodName: string,
  portionSize: string | undefined,
  apiKey: string,
): Promise<NutritionAIResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds for detailed nutrition

  try {
    const portionInfo = portionSize ? ` (${portionSize})` : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert. Estimate the comprehensive nutritional content for food items.
Provide estimates per serving based on typical portion sizes.
Respond ONLY with a valid JSON object in this exact format:
{
  "calories": <number>,
  "protein": <number in grams>,
  "carbohydrates": <number in grams>,
  "fats": <number in grams>,
  "fiber": <number in grams>,
  "sugar": <number in grams>,
  "saturatedFat": <number in grams>,
  "sodium": <number in milligrams>,
  "potassium": <number in milligrams>,
  "calcium": <number in milligrams>,
  "iron": <number in milligrams>,
  "vitaminA": <number in micrograms RAE>,
  "vitaminC": <number in milligrams>,
  "vitaminD": <number in micrograms>,
  "vitaminB12": <number in micrograms>,
  "cholesterol": <number in milligrams>
}
Use reasonable estimates based on typical nutritional data. All values must be numbers. Use 0 if a nutrient is not present.`,
          },
          {
            role: 'user',
            content: `Estimate the complete nutritional content for: ${foodName}${portionInfo}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, await response.text());
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.nutritionUnavailable'),
        },
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: translate('errors.nutritionFailed'),
        },
      };
    }

    // Parse JSON response from GPT
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Helper function to parse and round numbers
      const parseNum = (val: unknown, decimals: number = 1): number | undefined => {
        if (typeof val !== 'number') return undefined;
        const multiplier = Math.pow(10, decimals);
        return Math.round(val * multiplier) / multiplier;
      };

      // Macronutrients
      const calories =
        typeof parsed.calories === 'number' ? Math.round(parsed.calories) : undefined;
      const protein = parseNum(parsed.protein);
      const carbohydrates = parseNum(parsed.carbohydrates);
      const fats = parseNum(parsed.fats);
      const fiber = parseNum(parsed.fiber);
      const sugar = parseNum(parsed.sugar);
      const saturatedFat = parseNum(parsed.saturatedFat);

      // Minerals (in mg, round to whole numbers)
      const sodium = typeof parsed.sodium === 'number' ? Math.round(parsed.sodium) : undefined;
      const potassium =
        typeof parsed.potassium === 'number' ? Math.round(parsed.potassium) : undefined;
      const calcium = typeof parsed.calcium === 'number' ? Math.round(parsed.calcium) : undefined;
      const iron = parseNum(parsed.iron);

      // Vitamins
      const vitaminA =
        typeof parsed.vitaminA === 'number' ? Math.round(parsed.vitaminA) : undefined;
      const vitaminC = parseNum(parsed.vitaminC);
      const vitaminD = parseNum(parsed.vitaminD);
      const vitaminB12 = parseNum(parsed.vitaminB12, 2);

      // Other
      const cholesterol =
        typeof parsed.cholesterol === 'number' ? Math.round(parsed.cholesterol) : undefined;

      const dataComplete =
        calories !== undefined &&
        protein !== undefined &&
        carbohydrates !== undefined &&
        fats !== undefined;

      return {
        success: true,
        data: {
          calories,
          protein,
          carbohydrates,
          fats,
          fiber,
          sugar,
          saturatedFat,
          sodium,
          potassium,
          calcium,
          iron,
          vitaminA,
          vitaminC,
          vitaminD,
          vitaminB12,
          cholesterol,
          sourceDatabase: 'AI Estimate (OpenAI)',
          dataComplete,
          isAIEstimate: true,
        },
      };
    } catch {
      console.error('Failed to parse OpenAI nutrition response:', content);
      return {
        success: false,
        error: {
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
}
