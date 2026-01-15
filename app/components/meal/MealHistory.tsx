'use client';

/**
 * MealHistory Component
 *
 * Displays list of logged meals in reverse chronological order.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Meal } from '@/types/meal';
import { getAllMeals, getPhoto } from '@/lib/db/indexeddb';
import { useI18n } from '@/lib/i18n';
import LoadingSkeleton from '@/app/components/ui/LoadingSkeleton';

interface MealHistoryProps {
  onMealSelect?: (meal: Meal) => void;
}

interface MealWithPhoto extends Meal {
  photoUrl?: string;
}

export default function MealHistory({ onMealSelect }: MealHistoryProps) {
  const { t, locale } = useI18n();
  const [meals, setMeals] = useState<MealWithPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const photoUrlsRef = useRef<string[]>([]);

  // Load meals on mount
  useEffect(() => {
    const loadMeals = async () => {
      try {
        setIsLoading(true);
        const allMeals = await getAllMeals();

        photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        photoUrlsRef.current = [];

        // Load photos for each meal
        const mealsWithPhotos = await Promise.all(
          allMeals.map(async (meal) => {
            try {
              const photo = await getPhoto(meal.photoId);
              const photoUrl = photo ? URL.createObjectURL(photo.blob) : undefined;
              if (photoUrl) {
                photoUrlsRef.current.push(photoUrl);
              }
              return {
                ...meal,
                photoUrl,
              };
            } catch {
              return { ...meal };
            }
          }),
        );

        setMeals(mealsWithPhotos);
        setError(null);
      } catch (err) {
        console.error('Failed to load meals:', err);
        setError(t('errors.mealLoadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadMeals();

    // Cleanup object URLs on unmount
    return () => {
      photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoUrlsRef.current = [];
    };
  }, []);

  const formatDate = useCallback(
    (date: Date) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const mealDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.floor((today.getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24));
      const timeLabel = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

      if (diffDays === 0) {
        return t('mealHistory.today', { time: timeLabel });
      } else if (diffDays === 1) {
        return t('mealHistory.yesterday', { time: timeLabel });
      } else {
        return date.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    },
    [locale, t],
  );

  if (isLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (meals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-400"
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
        <h3 className="text-lg font-medium text-slate-800 mb-2">{t('mealHistory.emptyTitle')}</h3>
        <p className="text-sm text-slate-500">{t('mealHistory.emptySubtitle')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal) => (
        <button
          key={meal.id}
          onClick={() => onMealSelect?.(meal)}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
        >
          {/* Photo thumbnail */}
          <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
            {meal.photoUrl ? (
              <img src={meal.photoUrl} alt={meal.foodName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Meal info */}
          <div className="flex-grow min-w-0">
            <h3 className="font-medium text-slate-800 truncate">{meal.foodName}</h3>
            <p className="text-sm text-slate-500">{meal.portionSize}</p>
            <p className="text-xs text-slate-400 mt-1">{formatDate(meal.createdAt)}</p>
          </div>

          {/* Calories */}
          <div className="flex-shrink-0 text-right">
            {meal.calories != null ? (
              <>
                <p className="font-semibold text-slate-800">{meal.calories}</p>
                <p className="text-xs text-slate-500">{t('mealHistory.caloriesUnit')}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">-</p>
            )}
          </div>

          {/* Arrow */}
          <svg
            className="w-5 h-5 text-slate-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </div>
  );
}
