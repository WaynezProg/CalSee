/**
 * Weekly Nutrition Report Type Definitions
 *
 * Types for the weekly nutrition summary and recommendations feature.
 * Based on data-model.md specification.
 */

// ============ Nutrition Totals ============

/**
 * Aggregated nutrition values for a period.
 * All values are numeric (null nutrition treated as 0 during aggregation).
 */
export interface NutritionTotals {
  // Primary macros
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams

  // Extended (for detailed recommendations)
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  calcium: number; // mg
  iron: number; // mg
  vitaminC: number; // mg
  vitaminA: number; // μg
  vitaminD: number; // μg
  vitaminB12: number; // μg
  potassium: number; // mg
  cholesterol: number; // mg
}

/**
 * Macro distribution as percentages (should sum to 100%).
 */
export interface MacroDistribution {
  proteinPercent: number; // 0-100
  carbsPercent: number; // 0-100
  fatPercent: number; // 0-100
}

// ============ Weekly Summary ============

/**
 * Aggregated nutrition data for a 7-day rolling window.
 */
export interface WeeklyNutritionSummary {
  // Time range
  startDate: Date;
  endDate: Date;

  // Data completeness
  daysWithMeals: number; // 0-7
  totalMealCount: number;
  dataCompleteness: number; // 0.0-1.0 (daysWithMeals / 7)

  // Flag for incomplete nutrition data in meals
  hasIncompleteData: boolean;

  // Totals (sum of all meals in period)
  totals: NutritionTotals;

  // Daily averages (totals / daysWithMeals, not / 7)
  dailyAverages: NutritionTotals;

  // Macro distribution as percentages
  macroDistribution: MacroDistribution;
}

// ============ Recommendations ============

/**
 * Deficiency severity classification based on % of RDA.
 * - severe: < 50% RDA
 * - moderate: 50-75% RDA
 * - mild: 75-90% RDA
 * - adequate: 90-110% RDA
 * - excess: > 110% RDA
 */
export type DeficiencyLevel = 'severe' | 'moderate' | 'mild' | 'adequate' | 'excess';

/**
 * Recommendation priority for sorting.
 */
export type RecommendationPriority = 'high' | 'medium' | 'low' | 'none';

/**
 * Food suggestion with localized names and nutrient content.
 */
export interface FoodSuggestion {
  name: string; // Localized food name (Chinese)
  nameEn: string; // English name for reference
  amount: string; // e.g., "1 杯", "100g"
  nutrientContent: number;
  unit: string;
}

/**
 * Actionable nutrition recommendation based on DRI comparison.
 */
export interface NutritionRecommendation {
  nutrientKey: string; // e.g., 'fiber', 'vitaminC'
  nutrientName: string; // Localized display name

  // Intake analysis
  currentDailyAverage: number;
  recommendedDaily: number; // RDA value
  percentageOfRDA: number; // 0-200+
  unit: string; // 'g', 'mg', 'μg'

  // Classification
  deficiencyLevel: DeficiencyLevel;
  priority: RecommendationPriority;

  // Actionable suggestions
  suggestedFoods: FoodSuggestion[];

  // Display helpers
  gapAmount: number; // How much more needed per day (positive = deficit)
  improvementTip: string; // Localized tip text
}

// ============ Daily Breakdown (for trend chart) ============

/**
 * Daily nutrition data for trend visualization.
 */
export interface DailyNutritionData {
  date: Date;
  dayLabel: string; // e.g., "週一", "1/15"
  mealCount: number;
  totals: NutritionTotals;
  hasData: boolean; // false if no meals on this day
}

// ============ Helper Types ============

/**
 * Initial empty nutrition totals for aggregation.
 */
export const EMPTY_NUTRITION_TOTALS: NutritionTotals = {
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

/**
 * Initial empty macro distribution.
 */
export const EMPTY_MACRO_DISTRIBUTION: MacroDistribution = {
  proteinPercent: 0,
  carbsPercent: 0,
  fatPercent: 0,
};
