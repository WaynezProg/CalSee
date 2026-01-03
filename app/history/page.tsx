'use client';

/**
 * Meal History Page
 *
 * Displays all logged meals in reverse chronological order.
 * Allows viewing meal details.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import MealHistory from '@/app/components/meal/MealHistory';
import MealDetail from '@/app/components/meal/MealDetail';
import { useI18n } from '@/lib/i18n';
import type { Meal } from '@/types/meal';

export default function HistoryPage() {
  const { t } = useI18n();
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMealSelect = useCallback((meal: Meal) => {
    setSelectedMeal(meal);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMeal(null);
  }, []);

  const handleMealUpdated = useCallback(() => {
    // Refresh the meal list
    setRefreshKey(prev => prev + 1);
    setSelectedMeal(null);
  }, []);

  const handleMealDeleted = useCallback(() => {
    // Refresh the meal list
    setRefreshKey(prev => prev + 1);
    setSelectedMeal(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900"
              aria-label={t('nav.backHome')}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{t('nav.history')}</h1>
          </div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('nav.newEntry')}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <MealHistory key={refreshKey} onMealSelect={handleMealSelect} />
      </main>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <MealDetail
          meal={selectedMeal}
          onClose={handleCloseDetail}
          onUpdated={handleMealUpdated}
          onDeleted={handleMealDeleted}
        />
      )}
    </div>
  );
}
