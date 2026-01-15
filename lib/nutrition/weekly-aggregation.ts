import type { Meal, MealItem } from '@/types/sync';
import type {
  WeeklyNutritionSummary,
  NutritionTotals,
  MacroDistribution,
  DailyNutritionData,
} from '@/types/weekly-report';

const DAYS_IN_WEEK = 7;
const CALORIES_PER_GRAM_PROTEIN = 4;
const CALORIES_PER_GRAM_CARBS = 4;
const CALORIES_PER_GRAM_FAT = 9;

function createEmptyTotals(): NutritionTotals {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    calcium: 0,
    iron: 0,
    vitaminC: 0,
    vitaminA: 0,
    vitaminD: 0,
    vitaminB12: 0,
    potassium: 0,
    cholesterol: 0,
  };
}

function addNutritionFromItem(totals: NutritionTotals, item: MealItem): void {
  totals.calories += item.calories ?? 0;
  totals.protein += item.protein ?? 0;
  totals.carbs += item.carbs ?? 0;
  totals.fat += item.fat ?? 0;
  totals.fiber += item.fiber ?? 0;
  totals.sugar += item.sugar ?? 0;
  totals.sodium += item.sodium ?? 0;
  totals.calcium += item.calcium ?? 0;
  totals.iron += item.iron ?? 0;
  totals.vitaminC += item.vitaminC ?? 0;
  totals.vitaminA += item.vitaminA ?? 0;
  totals.vitaminD += item.vitaminD ?? 0;
  totals.vitaminB12 += item.vitaminB12 ?? 0;
  totals.potassium += item.potassium ?? 0;
  totals.cholesterol += item.cholesterol ?? 0;
}

function hasIncompleteNutrition(item: MealItem): boolean {
  return item.calories == null || item.protein == null || item.carbs == null || item.fat == null;
}

function calculateMacroDistribution(totals: NutritionTotals): MacroDistribution {
  const proteinCalories = totals.protein * CALORIES_PER_GRAM_PROTEIN;
  const carbsCalories = totals.carbs * CALORIES_PER_GRAM_CARBS;
  const fatCalories = totals.fat * CALORIES_PER_GRAM_FAT;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

  if (totalMacroCalories === 0) {
    return { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 };
  }

  const proteinPercent = Math.round((proteinCalories / totalMacroCalories) * 100);
  const carbsPercent = Math.round((carbsCalories / totalMacroCalories) * 100);
  const fatPercent = 100 - proteinPercent - carbsPercent;

  return { proteinPercent, carbsPercent, fatPercent };
}

function divideTotals(totals: NutritionTotals, divisor: number): NutritionTotals {
  if (divisor <= 0) return createEmptyTotals();

  return {
    calories: Math.round(totals.calories / divisor),
    protein: Math.round((totals.protein / divisor) * 10) / 10,
    carbs: Math.round((totals.carbs / divisor) * 10) / 10,
    fat: Math.round((totals.fat / divisor) * 10) / 10,
    fiber: Math.round((totals.fiber / divisor) * 10) / 10,
    sugar: Math.round((totals.sugar / divisor) * 10) / 10,
    sodium: Math.round(totals.sodium / divisor),
    calcium: Math.round(totals.calcium / divisor),
    iron: Math.round((totals.iron / divisor) * 10) / 10,
    vitaminC: Math.round((totals.vitaminC / divisor) * 10) / 10,
    vitaminA: Math.round(totals.vitaminA / divisor),
    vitaminD: Math.round((totals.vitaminD / divisor) * 10) / 10,
    vitaminB12: Math.round((totals.vitaminB12 / divisor) * 100) / 100,
    potassium: Math.round(totals.potassium / divisor),
    cholesterol: Math.round(totals.cholesterol / divisor),
  };
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseMealTimestamp(meal: Meal): Date {
  return new Date(meal.timestamp);
}

function isWithinDateRange(date: Date, startDate: Date, endDate: Date): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return dateOnly >= startOnly && dateOnly <= endOnly;
}

export function calculateWeeklySummary(
  meals: Meal[],
  referenceDate: Date = new Date(),
): WeeklyNutritionSummary {
  const endDate = new Date(referenceDate);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(referenceDate);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  const weekMeals = meals.filter((meal) => {
    const mealDate = parseMealTimestamp(meal);
    return isWithinDateRange(mealDate, startDate, endDate);
  });

  const totals = createEmptyTotals();
  let hasIncompleteData = false;
  const daysWithMealsSet = new Set<string>();

  for (const meal of weekMeals) {
    const mealDate = parseMealTimestamp(meal);
    daysWithMealsSet.add(getDateKey(mealDate));

    for (const item of meal.items) {
      addNutritionFromItem(totals, item);
      if (hasIncompleteNutrition(item)) {
        hasIncompleteData = true;
      }
    }
  }

  const daysWithMeals = daysWithMealsSet.size;
  const dailyAverages = divideTotals(totals, daysWithMeals);
  const macroDistribution = calculateMacroDistribution(totals);

  return {
    startDate,
    endDate,
    daysWithMeals,
    totalMealCount: weekMeals.length,
    dataCompleteness: daysWithMeals / DAYS_IN_WEEK,
    hasIncompleteData,
    totals,
    dailyAverages,
    macroDistribution,
  };
}

export function getDailyBreakdown(
  meals: Meal[],
  referenceDate: Date = new Date(),
): DailyNutritionData[] {
  const result: DailyNutritionData[] = [];
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dateKey = getDateKey(date);
    const dayMeals = meals.filter((meal) => {
      const mealDate = parseMealTimestamp(meal);
      return getDateKey(mealDate) === dateKey;
    });

    const totals = createEmptyTotals();
    for (const meal of dayMeals) {
      for (const item of meal.items) {
        addNutritionFromItem(totals, item);
      }
    }

    const dayOfWeek = date.getDay();
    const dayLabel = `週${dayLabels[dayOfWeek]}`;

    result.push({
      date,
      dayLabel,
      mealCount: dayMeals.length,
      totals,
      hasData: dayMeals.length > 0,
    });
  }

  return result;
}
