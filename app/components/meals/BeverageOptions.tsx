"use client";

/**
 * BeverageOptions Component
 *
 * Displays sweetness and ice level options for beverage items.
 * Automatically shown when item.category === 'beverage'.
 * Adjusts sugar value based on selected sweetness level.
 */

import { useI18n } from "@/lib/i18n";
import type { SugarLevel, IceLevel } from "@/types/sync";

interface BeverageOptionsProps {
  sugarLevel?: SugarLevel;
  iceLevel?: IceLevel;
  baseSugar?: number;
  currentSugar?: number;
  onSugarLevelChange: (level: SugarLevel, adjustedSugar: number) => void;
  onIceLevelChange: (level: IceLevel) => void;
  disabled?: boolean;
}

/**
 * Sugar level percentage mapping.
 * Used to calculate adjusted sugar from AI-estimated base value.
 */
const SUGAR_LEVEL_PERCENTAGES: Record<SugarLevel, number> = {
  full: 1.0,    // 全糖 100%
  less: 0.7,   // 少糖 70%
  half: 0.5,   // 半糖 50%
  light: 0.3,  // 微糖 30%
  none: 0,     // 無糖 0%
};

/**
 * Sugar level display labels.
 */
const SUGAR_LEVEL_LABELS: Record<SugarLevel, string> = {
  full: "全糖",
  less: "少糖",
  half: "半糖",
  light: "微糖",
  none: "無糖",
};

/**
 * Ice level display labels.
 */
const ICE_LEVEL_LABELS: Record<IceLevel, string> = {
  normal: "正常冰",
  less: "少冰",
  light: "微冰",
  none: "去冰",
  warm: "溫",
  hot: "熱",
};

const SUGAR_LEVELS: SugarLevel[] = ["full", "less", "half", "light", "none"];
const ICE_LEVELS: IceLevel[] = ["normal", "less", "light", "none", "warm", "hot"];

export function BeverageOptions({
  sugarLevel = "full",
  iceLevel = "normal",
  baseSugar,
  currentSugar,
  onSugarLevelChange,
  onIceLevelChange,
  disabled = false,
}: BeverageOptionsProps) {
  const { t } = useI18n();

  const handleSugarLevelChange = (level: SugarLevel) => {
    const percentage = SUGAR_LEVEL_PERCENTAGES[level];
    // Use baseSugar if available, otherwise use currentSugar as base
    const base = baseSugar ?? currentSugar ?? 0;
    const adjustedSugar = Math.round(base * percentage * 10) / 10;
    onSugarLevelChange(level, adjustedSugar);
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      {/* Sweetness Level */}
      <div>
        <p className="mb-2 text-xs font-medium text-amber-800">
          {t("beverageOptions.sugarLevel")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGAR_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleSugarLevelChange(level)}
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sugarLevel === level
                  ? "bg-amber-500 text-white"
                  : "bg-white text-amber-700 hover:bg-amber-100"
              } disabled:opacity-50`}
            >
              {SUGAR_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        {/* Show calculated sugar info */}
        {baseSugar != null && currentSugar != null && (
          <p className="mt-1.5 text-xs text-amber-600">
            {t("beverageOptions.sugarCalculation", {
              percentage: Math.round(SUGAR_LEVEL_PERCENTAGES[sugarLevel] * 100),
              value: currentSugar,
            })}
          </p>
        )}
      </div>

      {/* Ice Level */}
      <div>
        <p className="mb-2 text-xs font-medium text-amber-800">
          {t("beverageOptions.iceLevel")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ICE_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onIceLevelChange(level)}
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                iceLevel === level
                  ? "bg-sky-500 text-white"
                  : "bg-white text-sky-700 hover:bg-sky-100"
              } disabled:opacity-50`}
            >
              {ICE_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BeverageOptions;
