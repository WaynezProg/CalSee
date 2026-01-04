'use client';

/**
 * Home Page - Dashboard
 *
 * Shows today's summary and recent meals.
 * Provides quick access to add new meals.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AppLayout from '@/app/components/layout/AppLayout';
import AppLogo from '@/app/components/ui/AppLogo';
import { useI18n } from '@/lib/i18n';
import { getAllMeals, getPhoto } from '@/lib/db/indexeddb';
import type { Meal as SyncMeal } from '@/types/sync';

interface MealWithPhoto {
  id?: string;
  foodName: string;
  calories?: number | null;
  createdAt: Date;
  photoUrl?: string;
}

interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealWithTotals {
  meal: SyncMeal;
  totals: MealTotals;
  createdAt: Date;
}

interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function getSyncMealTotals(meal: SyncMeal): MealTotals {
  const fallback = meal.items.reduce(
    (totals, item) => ({
      calories: totals.calories + (item.calories ?? 0),
      protein: totals.protein + (item.protein ?? 0),
      carbs: totals.carbs + (item.carbs ?? 0),
      fats: totals.fats + (item.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );

  return {
    calories: Number.isFinite(meal.totalCalories ?? NaN) ? meal.totalCalories ?? 0 : fallback.calories,
    protein: Number.isFinite(meal.totalProtein ?? NaN) ? meal.totalProtein ?? 0 : fallback.protein,
    carbs: Number.isFinite(meal.totalCarbs ?? NaN) ? meal.totalCarbs ?? 0 : fallback.carbs,
    fats: Number.isFinite(meal.totalFat ?? NaN) ? meal.totalFat ?? 0 : fallback.fats,
  };
}

interface TodaySummary {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealCount: number;
}

export default function Home() {
  const { t, locale } = useI18n();
  const { data: session } = useSession();
  const [recentMeals, setRecentMeals] = useState<MealWithPhoto[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    mealCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const photoUrlsRef = useRef<string[]>([]);

  // Load meals on mount
  useEffect(() => {
    let isActive = true;

    const fetchSignedThumbnail = async (photoId: string) => {
      const response = await fetch(`/api/sync/photos/signed-url?photoId=${photoId}&type=thumbnail`);
      if (!response.ok) {
        return undefined;
      }
      const data = (await response.json()) as SignedUrlResponse;
      return data.url;
    };

    const loadLocalMeals = async () => {
      const allMeals = await getAllMeals();

      // Cleanup old URLs
      photoUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      photoUrlsRef.current = [];

      // Calculate today's summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMeals = allMeals.filter(meal => {
        const mealDate = new Date(meal.createdAt);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate.getTime() === today.getTime();
      });

      const summary: TodaySummary = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        mealCount: todayMeals.length,
      };

      todayMeals.forEach(meal => {
        summary.calories += meal.calories || 0;
        summary.protein += meal.protein || 0;
        summary.carbs += meal.carbohydrates || 0;
        summary.fats += meal.fats || 0;
      });

      const recent = allMeals.slice(0, 3);
      const mealsWithPhotos = await Promise.all(
        recent.map(async (meal) => {
          try {
            const photo = await getPhoto(meal.photoId);
            const photoUrl = photo ? URL.createObjectURL(photo.blob) : undefined;
            if (photoUrl) {
              photoUrlsRef.current.push(photoUrl);
            }
            return {
              id: meal.id,
              foodName: meal.foodName,
              calories: meal.calories ?? null,
              createdAt: coerceDate(meal.createdAt),
              photoUrl,
            };
          } catch {
            return {
              id: meal.id,
              foodName: meal.foodName,
              calories: meal.calories ?? null,
              createdAt: coerceDate(meal.createdAt),
            };
          }
        })
      );

      if (!isActive) return;
      setTodaySummary(summary);
      setRecentMeals(mealsWithPhotos);
    };

    const loadSyncMeals = async () => {
      const response = await fetch('/api/sync/meals?limit=200');
      if (!response.ok) {
        throw new Error('Failed to load synced meals');
      }
      const data = await response.json();
      const meals: SyncMeal[] = data.meals ?? [];

      const mealsWithTotals: MealWithTotals[] = meals.map(meal => ({
        meal,
        totals: getSyncMealTotals(meal),
        createdAt: coerceDate(meal.timestamp),
      }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMeals = mealsWithTotals.filter(({ createdAt }) => {
        const mealDate = new Date(createdAt);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate.getTime() === today.getTime();
      });

      const summary: TodaySummary = todayMeals.reduce(
        (totals, entry) => ({
          calories: totals.calories + entry.totals.calories,
          protein: totals.protein + entry.totals.protein,
          carbs: totals.carbs + entry.totals.carbs,
          fats: totals.fats + entry.totals.fats,
          mealCount: totals.mealCount + 1,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0, mealCount: 0 },
      );

      const recent = mealsWithTotals.slice(0, 3);
      const mealsWithPhotos: MealWithPhoto[] = await Promise.all(
        recent.map(async ({ meal, totals, createdAt }) => {
          const primaryItem = meal.items[0];
          const foodName = primaryItem?.foodName || 'Meal';
          const photoUrl = meal.photoId ? await fetchSignedThumbnail(meal.photoId) : undefined;
          return {
            id: meal.id,
            foodName,
            calories: totals.calories,
            createdAt,
            photoUrl,
          };
        }),
      );

      if (!isActive) return;
      setTodaySummary(summary);
      setRecentMeals(mealsWithPhotos);
    };

    const loadMeals = async () => {
      try {
        setIsLoading(true);
        if (session?.user?.id) {
          await loadSyncMeals();
        } else {
          await loadLocalMeals();
        }
      } catch (err) {
        console.error('Failed to load meals:', err);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadMeals();

    return () => {
      isActive = false;
      photoUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      photoUrlsRef.current = [];
    };
  }, [session?.user?.id]);

  const formatTime = useCallback((date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mealDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24));
    const timeLabel = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) {
      return t('mealHistory.today', { time: timeLabel });
    } else if (diffDays === 1) {
      return t('mealHistory.yesterday', { time: timeLabel });
    }
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }, [locale, t]);

  const userName = session?.user?.name?.split(' ')[0] || '';

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-12">
          <div className="flex items-center justify-between mb-6">
            <AppLogo />
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ''}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          <h2 className="text-xl font-medium">{t('home.greeting')}</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 -mt-6">
        {/* Today's Summary Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h3 className="text-sm font-medium text-slate-500 mb-4">{t('home.todaySummary')}</h3>

          {/* Calories - Main */}
          <div className="text-center mb-6">
            <span className="text-4xl font-bold text-slate-800">{todaySummary.calories}</span>
            <span className="text-slate-500 ml-1">kcal</span>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-2">
                <span className="text-rose-600 font-semibold text-sm">{todaySummary.protein}g</span>
              </div>
              <span className="text-xs text-slate-500">{t('mealForm.proteinLabel')}</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-sky-100 flex items-center justify-center mb-2">
                <span className="text-sky-600 font-semibold text-sm">{todaySummary.carbs}g</span>
              </div>
              <span className="text-xs text-slate-500">{t('mealForm.carbsLabel')}</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-2">
                <span className="text-amber-600 font-semibold text-sm">{todaySummary.fats}g</span>
              </div>
              <span className="text-xs text-slate-500">{t('mealForm.fatsLabel')}</span>
            </div>
          </div>
        </div>

        {/* Quick Add Button */}
        <Link
          href="/add"
          className="flex items-center justify-center gap-3 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-4 px-6 shadow-md transition-colors mb-6"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="font-medium text-lg">{t('home.quickAdd')}</span>
        </Link>

        {/* Recent Meals */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">{t('home.recentMeals')}</h3>
            <Link href="/history" className="text-sm text-blue-500 hover:text-blue-600">
              {t('home.viewAll')}
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-100 rounded w-24 mb-2" />
                      <div className="h-3 bg-slate-50 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentMeals.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-1">{t('home.noMealsToday')}</p>
              <p className="text-slate-500 text-sm">{t('home.startLogging')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMeals.map((meal) => (
                <Link
                  key={meal.id}
                  href="/history"
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Photo */}
                  <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                    {meal.photoUrl ? (
                      <img
                        src={meal.photoUrl}
                        alt={meal.foodName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{meal.foodName}</h4>
                    <p className="text-xs text-slate-500">{formatTime(meal.createdAt)}</p>
                  </div>

                  {/* Calories */}
                  <div className="text-right flex-shrink-0">
                    <span className="font-semibold text-slate-800">{meal.calories ?? '-'}</span>
                    <span className="text-xs text-slate-500 ml-1">kcal</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
