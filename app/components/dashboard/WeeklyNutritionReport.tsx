'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { calculateWeeklySummary, getDailyBreakdown } from '@/lib/nutrition/weekly-aggregation';
import {
  generateRecommendations,
  hasEnoughDataForRecommendations,
} from '@/lib/nutrition/recommendation-engine';
import NutritionRecommendations from './NutritionRecommendations';
import WeeklyTrendChart from './WeeklyTrendChart';
import type { Meal } from '@/types/sync';
import type {
  WeeklyNutritionSummary,
  NutritionRecommendation,
  DailyNutritionData,
} from '@/types/weekly-report';

interface WeeklyNutritionReportProps {
  meals: Meal[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-32 mb-4" />
      <div className="h-3 bg-slate-50 rounded w-20 mb-6" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-slate-100 rounded w-16 mx-auto mb-2" />
            <div className="h-3 bg-slate-50 rounded w-12 mx-auto" />
          </div>
        ))}
      </div>

      <div className="h-3 bg-slate-50 rounded w-24 mb-2" />
      <div className="h-4 bg-slate-100 rounded-full w-full mb-4" />

      <div className="flex justify-center gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-100 rounded-full" />
            <div className="h-3 bg-slate-50 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  onRetry?: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  const { t } = useI18n();

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h4 className="font-medium text-red-800 mb-1">{t('weeklyReport.errorState.title')}</h4>
      <p className="text-sm text-red-600 mb-4">{t('weeklyReport.errorState.message')}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t('weeklyReport.errorState.retry')}
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="bg-slate-50 rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h4 className="font-medium text-slate-700 mb-1">{t('weeklyReport.emptyState.title')}</h4>
      <p className="text-sm text-slate-500">{t('weeklyReport.emptyState.message')}</p>
    </div>
  );
}

interface MacroBarProps {
  distribution: WeeklyNutritionSummary['macroDistribution'];
}

function MacroBar({ distribution }: MacroBarProps) {
  const { proteinPercent, carbsPercent, fatPercent } = distribution;

  if (proteinPercent === 0 && carbsPercent === 0 && fatPercent === 0) {
    return <div className="h-4 bg-slate-100 rounded-full overflow-hidden" />;
  }

  return (
    <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
      {proteinPercent > 0 && (
        <div
          className="bg-rose-400 transition-all duration-300"
          style={{ width: `${proteinPercent}%` }}
        />
      )}
      {carbsPercent > 0 && (
        <div
          className="bg-sky-400 transition-all duration-300"
          style={{ width: `${carbsPercent}%` }}
        />
      )}
      {fatPercent > 0 && (
        <div
          className="bg-amber-400 transition-all duration-300"
          style={{ width: `${fatPercent}%` }}
        />
      )}
    </div>
  );
}

interface SummaryContentProps {
  summary: WeeklyNutritionSummary;
  recommendations: NutritionRecommendation[];
  hasEnoughData: boolean;
  dailyData: DailyNutritionData[];
}

function SummaryContent({
  summary,
  recommendations,
  hasEnoughData,
  dailyData,
}: SummaryContentProps) {
  const { t } = useI18n();
  const { totals, dailyAverages, macroDistribution, daysWithMeals, hasIncompleteData } = summary;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-slate-500">{t('weeklyReport.title')}</h3>
        <p className="text-xs text-slate-400">{t('weeklyReport.period')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">
            {totals.calories.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">{t('weeklyReport.totalCalories')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">
            {dailyAverages.calories.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">{t('weeklyReport.dailyAverage')}</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800">{daysWithMeals}/7</div>
          <div className="text-xs text-slate-500">{t('weeklyReport.daysLogged')}</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-medium text-slate-400 mb-2">
          {t('weeklyReport.macroDistribution')}
        </h4>
        <MacroBar distribution={macroDistribution} />
      </div>

      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-rose-400 rounded-full" />
          <span className="text-xs text-slate-600">
            {t('weeklyReport.protein')} {macroDistribution.proteinPercent}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-sky-400 rounded-full" />
          <span className="text-xs text-slate-600">
            {t('weeklyReport.carbs')} {macroDistribution.carbsPercent}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-400 rounded-full" />
          <span className="text-xs text-slate-600">
            {t('weeklyReport.fat')} {macroDistribution.fatPercent}%
          </span>
        </div>
      </div>

      {hasIncompleteData && (
        <p className="text-xs text-amber-600 text-center mt-4 pt-4 border-t border-slate-100">
          {t('weeklyReport.incompleteData')}
        </p>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100">
        <WeeklyTrendChart dailyData={dailyData} />
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <NutritionRecommendations recommendations={recommendations} hasEnoughData={hasEnoughData} />
      </div>
    </div>
  );
}

export default function WeeklyNutritionReport({
  meals,
  isLoading = false,
  error = null,
  onRetry,
}: WeeklyNutritionReportProps) {
  const summary = useMemo(() => {
    if (isLoading || error || meals.length === 0) {
      return null;
    }
    return calculateWeeklySummary(meals);
  }, [meals, isLoading, error]);

  const { recommendations, hasEnoughData, dailyData } = useMemo(() => {
    if (!summary) {
      return { recommendations: [], hasEnoughData: false, dailyData: [] };
    }
    const enoughData = hasEnoughDataForRecommendations(summary.daysWithMeals);
    const recs = enoughData ? generateRecommendations(summary.dailyAverages) : [];
    const daily = getDailyBreakdown(meals);
    return { recommendations: recs, hasEnoughData: enoughData, dailyData: daily };
  }, [summary, meals]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState onRetry={onRetry} />;
  }

  if (!summary || summary.totalMealCount === 0) {
    return <EmptyState />;
  }

  return (
    <SummaryContent
      summary={summary}
      recommendations={recommendations}
      hasEnoughData={hasEnoughData}
      dailyData={dailyData}
    />
  );
}
