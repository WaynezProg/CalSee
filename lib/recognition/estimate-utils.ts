import type { RecognitionItem } from '@/types/recognition';

export interface DerivedPortion {
  portionSize: number;
  portionUnit: string;
  containerSize?: RecognitionItem['containerSize'];
  aiEstimatedCount?: number;
  aiEstimatedWeightGrams?: number;
}

export function parseEstimatedNumber(value?: number | string): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') return undefined;

  const matches = value.match(/(\d+(\.\d+)?)/g);
  if (!matches || matches.length === 0) return undefined;
  const numbers = matches.map((item) => Number.parseFloat(item)).filter(Number.isFinite);
  if (numbers.length === 0) return undefined;
  if (numbers.length >= 2) {
    return (numbers[0] + numbers[1]) / 2;
  }
  return numbers[0];
}

export function derivePortionFromRecognition(item: RecognitionItem): DerivedPortion {
  const estimatedWeight = parseEstimatedNumber(item.estimatedWeightGrams);
  const estimatedCount = parseEstimatedNumber(item.estimatedCount);
  const portionUnit = item.portionUnit?.trim() || '份';
  const countBasedUnits = ['片', '隻', '只', '塊', '顆', '朵'];
  const isCountUnit = countBasedUnits.includes(portionUnit);
  const countSize =
    estimatedCount && estimatedCount > 0 ? Math.round(estimatedCount * 10) / 10 : undefined;

  return {
    portionSize: isCountUnit && countSize ? countSize : 1,
    portionUnit,
    containerSize: item.containerSize,
    aiEstimatedCount: estimatedCount,
    aiEstimatedWeightGrams: estimatedWeight,
  };
}
