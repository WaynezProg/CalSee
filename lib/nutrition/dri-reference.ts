/**
 * DRI (Dietary Reference Intakes) Reference Values
 *
 * Standard nutrition reference values from NIH/USDA.
 * Used for calculating deficiency levels and generating recommendations.
 *
 * Source: https://www.ncbi.nlm.nih.gov/books/NBK56068/
 */

/**
 * DRI value definition for a single nutrient.
 */
export interface DRIValue {
  name: string; // Localized name (Chinese)
  nameEn: string; // English name
  unit: string; // 'g', 'mg', 'μg'
  male19_50: number; // RDA for males 19-50
  female19_50: number; // RDA for females 19-50
  upperLimit?: number; // Tolerable Upper Intake Level (if applicable)
}

/**
 * DRI reference values for tracked nutrients.
 * Keys match NutritionTotals interface.
 */
export const DRI_REFERENCE: Record<string, DRIValue> = {
  protein: {
    name: '蛋白質',
    nameEn: 'Protein',
    unit: 'g',
    male19_50: 56,
    female19_50: 46,
  },
  fiber: {
    name: '膳食纖維',
    nameEn: 'Fiber',
    unit: 'g',
    male19_50: 38,
    female19_50: 25,
  },
  vitaminC: {
    name: '維生素C',
    nameEn: 'Vitamin C',
    unit: 'mg',
    male19_50: 90,
    female19_50: 75,
    upperLimit: 2000,
  },
  vitaminA: {
    name: '維生素A',
    nameEn: 'Vitamin A',
    unit: 'μg',
    male19_50: 900,
    female19_50: 700,
    upperLimit: 3000,
  },
  vitaminD: {
    name: '維生素D',
    nameEn: 'Vitamin D',
    unit: 'μg',
    male19_50: 15,
    female19_50: 15,
    upperLimit: 100,
  },
  vitaminB12: {
    name: '維生素B12',
    nameEn: 'Vitamin B12',
    unit: 'μg',
    male19_50: 2.4,
    female19_50: 2.4,
  },
  calcium: {
    name: '鈣',
    nameEn: 'Calcium',
    unit: 'mg',
    male19_50: 1000,
    female19_50: 1000,
    upperLimit: 2500,
  },
  iron: {
    name: '鐵',
    nameEn: 'Iron',
    unit: 'mg',
    male19_50: 8,
    female19_50: 18,
    upperLimit: 45,
  },
  potassium: {
    name: '鉀',
    nameEn: 'Potassium',
    unit: 'mg',
    male19_50: 3400,
    female19_50: 2600,
  },
  sodium: {
    name: '鈉',
    nameEn: 'Sodium',
    unit: 'mg',
    male19_50: 2300,
    female19_50: 2300,
    upperLimit: 2300,
  },
};

/**
 * Nutrients to check for recommendations (subset of DRI_REFERENCE).
 * Ordered by typical importance for recommendations.
 */
export const RECOMMENDATION_NUTRIENTS = [
  'fiber',
  'protein',
  'vitaminC',
  'calcium',
  'iron',
  'vitaminD',
  'potassium',
  'vitaminA',
  'vitaminB12',
] as const;

/**
 * Deficiency thresholds (percentage of RDA).
 */
export const DEFICIENCY_THRESHOLDS = {
  severe: 50, // < 50% = severe
  moderate: 75, // 50-75% = moderate
  mild: 90, // 75-90% = mild
  adequate: 110, // 90-110% = adequate
  // > 110% = excess
} as const;

/**
 * Get RDA value for a nutrient based on gender.
 * Defaults to male values if gender not specified.
 */
export function getRDA(
  nutrientKey: string,
  gender: 'male' | 'female' = 'male',
): number | undefined {
  const dri = DRI_REFERENCE[nutrientKey];
  if (!dri) return undefined;

  return gender === 'female' ? dri.female19_50 : dri.male19_50;
}

/**
 * Get nutrient display name.
 */
export function getNutrientName(nutrientKey: string): string {
  return DRI_REFERENCE[nutrientKey]?.name ?? nutrientKey;
}

/**
 * Get nutrient unit.
 */
export function getNutrientUnit(nutrientKey: string): string {
  return DRI_REFERENCE[nutrientKey]?.unit ?? '';
}
