'use client';

import { memo, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { DailyNutritionData } from '@/types/weekly-report';

interface WeeklyTrendChartProps {
  dailyData: DailyNutritionData[];
  maxCalories?: number;
}

interface DayBarProps {
  day: DailyNutritionData;
  maxCalories: number;
  isSelected: boolean;
  onSelect: () => void;
}

const DayBar = memo(function DayBar({ day, maxCalories, isSelected, onSelect }: DayBarProps) {
  const heightPercent = maxCalories > 0 ? (day.totals.calories / maxCalories) * 100 : 0;

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center flex-1 min-w-0 transition-all ${
        isSelected ? 'scale-105' : 'hover:scale-102'
      }`}
      aria-pressed={isSelected}
      aria-label={`${day.dayLabel}: ${day.hasData ? `${day.totals.calories} kcal` : 'No data'}`}
    >
      <div className="w-full h-24 flex items-end justify-center mb-1">
        {day.hasData ? (
          <div
            className={`w-6 rounded-t transition-all duration-300 ${
              isSelected ? 'bg-blue-500' : 'bg-blue-300 hover:bg-blue-400'
            }`}
            style={{ height: `${Math.max(heightPercent, 4)}%` }}
            role="img"
            aria-label={`${day.totals.calories} calories`}
          />
        ) : (
          <div className="w-6 h-1 bg-slate-200 rounded" aria-hidden="true" />
        )}
      </div>
      <span className={`text-xs ${isSelected ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
        {day.dayLabel.replace('週', '')}
      </span>
    </button>
  );
});

interface DayDetailProps {
  day: DailyNutritionData;
}

const DayDetail = memo(function DayDetail({ day }: DayDetailProps) {
  const { t } = useI18n();

  if (!day.hasData) {
    return (
      <div className="text-center text-sm text-slate-400 py-2">
        {t('weeklyReport.trendChart.noData')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div>
        <div className="text-lg font-bold text-slate-800">{day.totals.calories}</div>
        <div className="text-xs text-slate-500">kcal</div>
      </div>
      <div>
        <div className="text-lg font-bold text-rose-600">{day.totals.protein.toFixed(1)}g</div>
        <div className="text-xs text-slate-500">{t('weeklyReport.protein')}</div>
      </div>
      <div>
        <div className="text-lg font-bold text-sky-600">{day.totals.carbs.toFixed(1)}g</div>
        <div className="text-xs text-slate-500">{t('weeklyReport.carbs')}</div>
      </div>
      <div>
        <div className="text-lg font-bold text-amber-600">{day.totals.fat.toFixed(1)}g</div>
        <div className="text-xs text-slate-500">{t('weeklyReport.fat')}</div>
      </div>
    </div>
  );
});

export default function WeeklyTrendChart({ dailyData, maxCalories }: WeeklyTrendChartProps) {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(dailyData.length - 1);

  const computedMaxCalories =
    maxCalories ?? Math.max(...dailyData.map((d) => d.totals.calories), 1);

  const selectedDay = dailyData[selectedIndex];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-slate-400">{t('weeklyReport.trendChart.title')}</h4>

      <div className="flex gap-1">
        {dailyData.map((day, index) => (
          <DayBar
            key={day.dayLabel}
            day={day}
            maxCalories={computedMaxCalories}
            isSelected={index === selectedIndex}
            onSelect={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {selectedDay && (
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400 text-center mb-2">
            {selectedDay.dayLabel} - {selectedDay.mealCount} 餐
          </p>
          <DayDetail day={selectedDay} />
        </div>
      )}
    </div>
  );
}
