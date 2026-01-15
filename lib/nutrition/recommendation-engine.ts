import type {
  NutritionTotals,
  NutritionRecommendation,
  DeficiencyLevel,
  RecommendationPriority,
} from '@/types/weekly-report';
import {
  DRI_REFERENCE,
  RECOMMENDATION_NUTRIENTS,
  DEFICIENCY_THRESHOLDS,
  getRDA,
  getNutrientName,
  getNutrientUnit,
} from './dri-reference';
import { getTopFoodSuggestions } from './food-recommendations';

const MAX_RECOMMENDATIONS = 3;
const MIN_DAYS_FOR_RECOMMENDATIONS = 3;

function classifyDeficiency(percentageOfRDA: number): DeficiencyLevel {
  if (percentageOfRDA < DEFICIENCY_THRESHOLDS.severe) return 'severe';
  if (percentageOfRDA < DEFICIENCY_THRESHOLDS.moderate) return 'moderate';
  if (percentageOfRDA < DEFICIENCY_THRESHOLDS.mild) return 'mild';
  if (percentageOfRDA <= DEFICIENCY_THRESHOLDS.adequate) return 'adequate';
  return 'excess';
}

function getPriorityFromLevel(level: DeficiencyLevel): RecommendationPriority {
  switch (level) {
    case 'severe':
      return 'high';
    case 'moderate':
      return 'medium';
    case 'mild':
      return 'low';
    default:
      return 'none';
  }
}

function getImprovementTip(nutrientKey: string, level: DeficiencyLevel): string {
  const nutrientName = getNutrientName(nutrientKey);

  switch (level) {
    case 'severe':
      return `您的${nutrientName}攝取量明顯不足，建議每天增加富含${nutrientName}的食物`;
    case 'moderate':
      return `建議適量增加${nutrientName}的攝取`;
    case 'mild':
      return `${nutrientName}攝取接近建議量，可稍微注意補充`;
    default:
      return `${nutrientName}攝取充足，繼續保持`;
  }
}

function getNutrientValue(totals: NutritionTotals, key: string): number {
  const keyMap: Record<string, keyof NutritionTotals> = {
    protein: 'protein',
    fiber: 'fiber',
    vitaminC: 'vitaminC',
    vitaminA: 'vitaminA',
    vitaminD: 'vitaminD',
    vitaminB12: 'vitaminB12',
    calcium: 'calcium',
    iron: 'iron',
    potassium: 'potassium',
    sodium: 'sodium',
  };

  const totalsKey = keyMap[key];
  return totalsKey ? (totals[totalsKey] as number) : 0;
}

export function generateRecommendations(
  dailyAverages: NutritionTotals,
  gender: 'male' | 'female' = 'male',
): NutritionRecommendation[] {
  const recommendations: NutritionRecommendation[] = [];

  for (const nutrientKey of RECOMMENDATION_NUTRIENTS) {
    const rda = getRDA(nutrientKey, gender);
    if (rda === undefined || rda === 0) continue;

    const currentDailyAverage = getNutrientValue(dailyAverages, nutrientKey);
    const percentageOfRDA = (currentDailyAverage / rda) * 100;
    const deficiencyLevel = classifyDeficiency(percentageOfRDA);

    if (deficiencyLevel === 'adequate' || deficiencyLevel === 'excess') {
      continue;
    }

    const gapAmount = Math.max(0, rda - currentDailyAverage);
    const priority = getPriorityFromLevel(deficiencyLevel);

    recommendations.push({
      nutrientKey,
      nutrientName: getNutrientName(nutrientKey),
      currentDailyAverage: Math.round(currentDailyAverage * 10) / 10,
      recommendedDaily: rda,
      percentageOfRDA: Math.round(percentageOfRDA),
      unit: getNutrientUnit(nutrientKey),
      deficiencyLevel,
      priority,
      suggestedFoods: getTopFoodSuggestions(nutrientKey, 3),
      gapAmount: Math.round(gapAmount * 10) / 10,
      improvementTip: getImprovementTip(nutrientKey, deficiencyLevel),
    });
  }

  recommendations.sort((a, b) => {
    const priorityOrder: Record<RecommendationPriority, number> = {
      high: 0,
      medium: 1,
      low: 2,
      none: 3,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return recommendations.slice(0, MAX_RECOMMENDATIONS);
}

export function hasEnoughDataForRecommendations(daysWithMeals: number): boolean {
  return daysWithMeals >= MIN_DAYS_FOR_RECOMMENDATIONS;
}

export function hasAnyDeficiencies(recommendations: NutritionRecommendation[]): boolean {
  return recommendations.length > 0;
}
