export type PortionUnitKey =
  | "serving"
  | "bowl"
  | "plate"
  | "slice"
  | "piece"
  | "chunk"
  | "g"
  | "kg"
  | "ml"
  | "l";

export interface PortionScaleResult {
  scale: number;
  source: "serving" | "metric" | "food" | "generic";
  servingGrams: number;
  grams?: number;
  unitKey?: PortionUnitKey;
}

const DEFAULT_SERVING_GRAMS = 100;

const UNIT_ALIASES = new Map<string, PortionUnitKey>([
  ["份", "serving"],
  ["servings", "serving"],
  ["碗", "bowl"],
  ["一碗", "bowl"],
  ["盤", "plate"],
  ["一盤", "plate"],
  ["片", "slice"],
  ["一片", "slice"],
  ["隻", "piece"],
  ["只", "piece"],
  ["一隻", "piece"],
  ["一只", "piece"],
  ["顆", "piece"],
  ["一顆", "piece"],
  ["朵", "piece"],
  ["一朵", "piece"],
  ["塊", "chunk"],
  ["一塊", "chunk"],
  ["克", "g"],
  ["公克", "g"],
  ["g", "g"],
  ["公斤", "kg"],
  ["千克", "kg"],
  ["kg", "kg"],
  ["毫升", "ml"],
  ["ml", "ml"],
  ["公升", "l"],
  ["升", "l"],
  ["l", "l"],
]);

const DEFAULT_UNIT_GRAMS: Record<PortionUnitKey, number> = {
  serving: DEFAULT_SERVING_GRAMS,
  bowl: 250,
  plate: 300,
  slice: 30,
  piece: 100,
  chunk: 60,
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
};

const FOOD_UNIT_RULES = [
  {
    name: "rice",
    match: /飯|米飯|炒飯/,
    servingGrams: 180,
    unitGrams: { bowl: 180 },
  },
  {
    name: "noodles",
    match: /麵|麵條|拉麵|烏龍|麵線/,
    servingGrams: 200,
    unitGrams: { bowl: 200 },
  },
  {
    name: "soup",
    match: /湯|羹/,
    servingGrams: 300,
    unitGrams: { bowl: 300 },
  },
  {
    name: "porridge",
    match: /粥|稀飯/,
    servingGrams: 250,
    unitGrams: { bowl: 250 },
  },
  {
    name: "meat-slice",
    match: /牛肉片|豬肉片|羊肉片|肉片|火鍋肉片/,
    servingGrams: 100,
    unitGrams: { slice: 25 },
  },
  {
    name: "broccoli",
    match: /花椰菜|綠花椰|青花椰/,
    servingGrams: 100,
    unitGrams: { piece: 12 },
  },
  {
    name: "bacon",
    match: /培根/,
    servingGrams: 60,
    unitGrams: { slice: 15 },
  },
  {
    name: "ham",
    match: /火腿/,
    servingGrams: 60,
    unitGrams: { slice: 20 },
  },
  {
    name: "fish-slice",
    match: /魚片/,
    servingGrams: 120,
    unitGrams: { slice: 60 },
  },
  {
    name: "bread",
    match: /吐司|麵包|土司/,
    servingGrams: 60,
    unitGrams: { slice: 30 },
  },
  {
    name: "cheese",
    match: /起司|芝士/,
    servingGrams: 40,
    unitGrams: { slice: 20 },
  },
  {
    name: "chicken-wing",
    match: /雞翅/,
    servingGrams: 100,
    unitGrams: { piece: 35 },
  },
  {
    name: "chicken-leg",
    match: /雞腿/,
    servingGrams: 150,
    unitGrams: { piece: 120 },
  },
  {
    name: "shrimp",
    match: /蝦/,
    servingGrams: 100,
    unitGrams: { piece: 10 },
  },
  {
    name: "fish",
    match: /魚/,
    servingGrams: 150,
    unitGrams: { piece: 150 },
  },
  {
    name: "tofu",
    match: /豆腐/,
    servingGrams: 100,
    unitGrams: { chunk: 80 },
  },
  {
    name: "steak",
    match: /牛排|豬排|雞排/,
    servingGrams: 200,
    unitGrams: { chunk: 200 },
  },
  {
    name: "chicken-nugget",
    match: /雞塊/,
    servingGrams: 100,
    unitGrams: { chunk: 20 },
  },
  {
    name: "dumpling",
    match: /水餃|鍋貼|餃子/,
    servingGrams: 100,
    unitGrams: { piece: 25 },
  },
  {
    name: "cake",
    match: /蛋糕|甜點/,
    servingGrams: 100,
    unitGrams: { chunk: 80 },
  },
];

function normalizeUnit(rawUnit?: string): PortionUnitKey | null {
  if (!rawUnit) return null;
  const trimmed = rawUnit.trim().toLowerCase();
  if (!trimmed) return null;
  return UNIT_ALIASES.get(trimmed) ?? UNIT_ALIASES.get(trimmed.replace(/^一/, "")) ?? null;
}

function matchFoodRule(foodName: string) {
  const normalized = foodName.trim();
  if (!normalized) return undefined;
  return FOOD_UNIT_RULES.find((rule) => rule.match.test(normalized));
}

export function resolvePortionScale(
  foodName: string,
  portionSize: number = 1,
  portionUnit?: string,
  containerSize?: "small" | "medium" | "large",
  aiEstimatedWeightGrams?: number
): PortionScaleResult {
  const size = Number.isFinite(portionSize) && portionSize > 0 ? portionSize : 1;
  const unitKey = normalizeUnit(portionUnit);

  if (!unitKey || unitKey === "serving") {
    if (aiEstimatedWeightGrams && aiEstimatedWeightGrams > 0) {
      const grams = size * aiEstimatedWeightGrams;
      return {
        scale: grams / DEFAULT_SERVING_GRAMS,
        source: "metric",
        servingGrams: DEFAULT_SERVING_GRAMS,
        grams,
        unitKey: "serving",
      };
    }
    return {
      scale: size,
      source: "serving",
      servingGrams: DEFAULT_SERVING_GRAMS,
      unitKey: unitKey ?? "serving",
    };
  }

  const matchedRule = matchFoodRule(foodName);
  const servingGrams = matchedRule?.servingGrams ?? DEFAULT_SERVING_GRAMS;

  if (unitKey === "g" || unitKey === "kg" || unitKey === "ml" || unitKey === "l") {
    const grams = size * DEFAULT_UNIT_GRAMS[unitKey];
    return {
      scale: grams / servingGrams,
      source: "metric",
      servingGrams,
      grams,
      unitKey,
    };
  }

  const sizeMultiplier = (() => {
    if (!containerSize) return 1;
    if (containerSize === "small") return 0.8;
    if (containerSize === "large") return 1.2;
    return 1;
  })();
  const shouldApplySize = unitKey === "bowl" || unitKey === "plate";
  const estimatedUnitGrams =
    shouldApplySize && aiEstimatedWeightGrams && aiEstimatedWeightGrams > 0
      ? aiEstimatedWeightGrams
      : undefined;
  const unitGrams =
    (estimatedUnitGrams ??
      matchedRule?.unitGrams?.[unitKey] ??
      DEFAULT_UNIT_GRAMS[unitKey]) *
    (shouldApplySize && !estimatedUnitGrams ? sizeMultiplier : 1);

  const grams = size * unitGrams;
  return {
    scale: grams / servingGrams,
    source: matchedRule ? "food" : "generic",
    servingGrams,
    grams,
    unitKey,
  };
}

export function scaleNutritionValues<T extends Record<string, number | undefined>>(
  values: T,
  ratio: number
): T {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio === 1) {
    return values;
  }

  const precisionByKey: Record<string, number> = {
    calories: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    vitaminA: 0,
    cholesterol: 0,
    vitaminB12: 2,
  };

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === "number"
        ? (() => {
            const precision = precisionByKey[key] ?? 1;
            const multiplier = Math.pow(10, precision);
            return Math.round(value * ratio * multiplier) / multiplier;
          })()
        : value,
    ])
  ) as T;
}
