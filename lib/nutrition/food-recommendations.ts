/**
 * Food Recommendations by Nutrient
 *
 * Pre-defined food suggestions for common nutrient deficiencies.
 * Focused on foods commonly available in Asian markets (Taiwan).
 *
 * Based on research.md findings from USDA FoodData Central.
 */

import type { FoodSuggestion } from '@/types/weekly-report';

/**
 * Food recommendations organized by nutrient key.
 * Each nutrient has 5 food suggestions.
 */
export const FOOD_RECOMMENDATIONS: Record<string, FoodSuggestion[]> = {
  fiber: [
    { name: '燕麥', nameEn: 'Oatmeal', amount: '1/2 杯', nutrientContent: 14, unit: 'g' },
    { name: '毛豆', nameEn: 'Edamame', amount: '1 杯', nutrientContent: 8, unit: 'g' },
    { name: '地瓜', nameEn: 'Sweet potato', amount: '1 個中型', nutrientContent: 4, unit: 'g' },
    { name: '糙米', nameEn: 'Brown rice', amount: '1 杯熟', nutrientContent: 3.5, unit: 'g' },
    { name: '奇亞籽', nameEn: 'Chia seeds', amount: '1 湯匙', nutrientContent: 5, unit: 'g' },
  ],

  protein: [
    { name: '雞胸肉', nameEn: 'Chicken breast', amount: '100g', nutrientContent: 31, unit: 'g' },
    { name: '鮭魚', nameEn: 'Salmon', amount: '100g', nutrientContent: 20, unit: 'g' },
    { name: '希臘優格', nameEn: 'Greek yogurt', amount: '1 杯', nutrientContent: 10, unit: 'g' },
    { name: '豆腐', nameEn: 'Tofu', amount: '100g', nutrientContent: 8, unit: 'g' },
    { name: '雞蛋', nameEn: 'Eggs', amount: '1 個大', nutrientContent: 6, unit: 'g' },
  ],

  vitaminC: [
    { name: '芭樂', nameEn: 'Guava', amount: '1 個', nutrientContent: 228, unit: 'mg' },
    { name: '紅甜椒', nameEn: 'Red bell pepper', amount: '1 杯', nutrientContent: 190, unit: 'mg' },
    { name: '奇異果', nameEn: 'Kiwi', amount: '1 個中型', nutrientContent: 71, unit: 'mg' },
    { name: '西蘭花', nameEn: 'Broccoli', amount: '1 杯', nutrientContent: 80, unit: 'mg' },
    { name: '柳橙', nameEn: 'Orange', amount: '1 個中型', nutrientContent: 70, unit: 'mg' },
  ],

  calcium: [
    { name: '小魚乾', nameEn: 'Dried small fish', amount: '30g', nutrientContent: 320, unit: 'mg' },
    { name: '牛奶', nameEn: 'Milk', amount: '1 杯', nutrientContent: 300, unit: 'mg' },
    {
      name: '豆腐（鈣質凝固）',
      nameEn: 'Calcium-set tofu',
      amount: '100g',
      nutrientContent: 253,
      unit: 'mg',
    },
    { name: '芥藍', nameEn: 'Chinese broccoli', amount: '1 杯', nutrientContent: 94, unit: 'mg' },
    { name: '黑芝麻', nameEn: 'Black sesame', amount: '1 湯匙', nutrientContent: 88, unit: 'mg' },
  ],

  iron: [
    { name: '紅肉（牛肉）', nameEn: 'Beef', amount: '100g', nutrientContent: 2.6, unit: 'mg' },
    { name: '鴨血', nameEn: 'Duck blood', amount: '100g', nutrientContent: 30, unit: 'mg' },
    { name: '菠菜', nameEn: 'Spinach', amount: '1 杯熟', nutrientContent: 6.4, unit: 'mg' },
    { name: '紅豆', nameEn: 'Red beans', amount: '1/2 杯熟', nutrientContent: 2.6, unit: 'mg' },
    { name: '豆腐', nameEn: 'Tofu', amount: '100g', nutrientContent: 5.4, unit: 'mg' },
  ],

  vitaminD: [
    { name: '鮭魚', nameEn: 'Salmon', amount: '100g', nutrientContent: 11, unit: 'μg' },
    { name: '鯖魚', nameEn: 'Mackerel', amount: '100g', nutrientContent: 16, unit: 'μg' },
    { name: '蛋黃', nameEn: 'Egg yolk', amount: '1 個', nutrientContent: 1, unit: 'μg' },
    { name: '強化牛奶', nameEn: 'Fortified milk', amount: '1 杯', nutrientContent: 3, unit: 'μg' },
    {
      name: '香菇（曬過）',
      nameEn: 'Sun-dried shiitake',
      amount: '100g',
      nutrientContent: 18,
      unit: 'μg',
    },
  ],

  potassium: [
    { name: '香蕉', nameEn: 'Banana', amount: '1 根中型', nutrientContent: 422, unit: 'mg' },
    { name: '地瓜', nameEn: 'Sweet potato', amount: '1 個中型', nutrientContent: 541, unit: 'mg' },
    { name: '菠菜', nameEn: 'Spinach', amount: '1 杯熟', nutrientContent: 839, unit: 'mg' },
    { name: '酪梨', nameEn: 'Avocado', amount: '半個', nutrientContent: 487, unit: 'mg' },
    { name: '白豆', nameEn: 'White beans', amount: '1/2 杯熟', nutrientContent: 595, unit: 'mg' },
  ],

  vitaminA: [
    { name: '地瓜', nameEn: 'Sweet potato', amount: '1 個中型', nutrientContent: 1096, unit: 'μg' },
    { name: '紅蘿蔔', nameEn: 'Carrot', amount: '1 根中型', nutrientContent: 509, unit: 'μg' },
    { name: '菠菜', nameEn: 'Spinach', amount: '1 杯熟', nutrientContent: 573, unit: 'μg' },
    { name: '南瓜', nameEn: 'Pumpkin', amount: '1 杯熟', nutrientContent: 706, unit: 'μg' },
    { name: '芒果', nameEn: 'Mango', amount: '1 杯切塊', nutrientContent: 89, unit: 'μg' },
  ],

  vitaminB12: [
    { name: '蛤蜊', nameEn: 'Clams', amount: '100g', nutrientContent: 98, unit: 'μg' },
    { name: '鮭魚', nameEn: 'Salmon', amount: '100g', nutrientContent: 4.8, unit: 'μg' },
    { name: '牛肉', nameEn: 'Beef', amount: '100g', nutrientContent: 2.1, unit: 'μg' },
    { name: '雞蛋', nameEn: 'Eggs', amount: '1 個大', nutrientContent: 0.6, unit: 'μg' },
    { name: '牛奶', nameEn: 'Milk', amount: '1 杯', nutrientContent: 1.2, unit: 'μg' },
  ],
};

/**
 * Get food suggestions for a specific nutrient.
 * Returns empty array if nutrient not found.
 */
export function getFoodSuggestions(nutrientKey: string): FoodSuggestion[] {
  return FOOD_RECOMMENDATIONS[nutrientKey] ?? [];
}

/**
 * Get top N food suggestions for a nutrient.
 */
export function getTopFoodSuggestions(nutrientKey: string, count: number = 3): FoodSuggestion[] {
  return getFoodSuggestions(nutrientKey).slice(0, count);
}
