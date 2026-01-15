'use client';

import { useI18n } from '@/lib/i18n';
import type { NutritionRecommendation, DeficiencyLevel } from '@/types/weekly-report';

interface NutritionRecommendationsProps {
  recommendations: NutritionRecommendation[];
  hasEnoughData: boolean;
}

function InsufficientDataState() {
  const { t } = useI18n();

  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      <div className="w-10 h-10 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <svg
          className="w-5 h-5 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h4 className="text-sm font-medium text-slate-600 mb-1">
        {t('weeklyReport.recommendations.noDataTitle')}
      </h4>
      <p className="text-xs text-slate-500">{t('weeklyReport.recommendations.noDataMessage')}</p>
    </div>
  );
}

function BalancedNutritionState() {
  const { t } = useI18n();

  return (
    <div className="bg-green-50 rounded-xl p-4 text-center">
      <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
        <svg
          className="w-5 h-5 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h4 className="text-sm font-medium text-green-700 mb-1">
        {t('weeklyReport.recommendations.goodJobTitle')}
      </h4>
      <p className="text-xs text-green-600">{t('weeklyReport.recommendations.goodJobMessage')}</p>
    </div>
  );
}

function getDeficiencyColor(level: DeficiencyLevel): { bg: string; text: string; badge: string } {
  switch (level) {
    case 'severe':
      return { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-600' };
    case 'moderate':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-600',
      };
    case 'mild':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        badge: 'bg-yellow-100 text-yellow-600',
      };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-600' };
  }
}

interface RecommendationCardProps {
  recommendation: NutritionRecommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { t } = useI18n();
  const colors = getDeficiencyColor(recommendation.deficiencyLevel);

  return (
    <div className={`${colors.bg} rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className={`font-medium ${colors.text}`}>{recommendation.nutrientName}</h4>
          <p className="text-xs text-slate-500">
            {t('weeklyReport.recommendations.current')}: {recommendation.currentDailyAverage}
            {recommendation.unit} / {t('weeklyReport.recommendations.perDay')}:{' '}
            {recommendation.recommendedDaily}
            {recommendation.unit}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors.badge}`}>
          {recommendation.percentageOfRDA}%
        </span>
      </div>

      <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${recommendation.deficiencyLevel === 'severe' ? 'bg-red-400' : recommendation.deficiencyLevel === 'moderate' ? 'bg-orange-400' : 'bg-yellow-400'} transition-all duration-300`}
          style={{ width: `${Math.min(recommendation.percentageOfRDA, 100)}%` }}
        />
      </div>

      <p className="text-xs text-slate-600 mb-3">{recommendation.improvementTip}</p>

      {recommendation.suggestedFoods.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">
            {t('weeklyReport.recommendations.suggestedFoods')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {recommendation.suggestedFoods.map((food, index) => (
              <span
                key={index}
                className="text-xs bg-white/70 text-slate-600 px-2 py-1 rounded-full"
              >
                {food.name} ({food.amount})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NutritionRecommendations({
  recommendations,
  hasEnoughData,
}: NutritionRecommendationsProps) {
  const { t } = useI18n();

  if (!hasEnoughData) {
    return <InsufficientDataState />;
  }

  if (recommendations.length === 0) {
    return <BalancedNutritionState />;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-slate-400">
        {t('weeklyReport.recommendations.title')}
      </h4>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.nutrientKey} recommendation={rec} />
      ))}
    </div>
  );
}
