'use client';

/**
 * Meal History Page
 *
 * Displays all logged meals in reverse chronological order.
 * Allows viewing meal details.
 */

import { useState, useCallback } from 'react';
import AppLayout from '@/app/components/layout/AppLayout';
import MealHistory from '@/app/components/meal/MealHistory';
import { MealHistory as SyncMealHistory } from '@/app/components/meals/MealHistory';
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
    <AppLayout>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800">{t('nav.history')}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <MealHistory key={refreshKey} onMealSelect={handleMealSelect} />

        <section className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-800">Sync history (multi-item)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Prototype history list for synced meals.
          </p>
          <div className="mt-4">
            <SyncMealHistory />
          </div>
        </section>
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
    </AppLayout>
  );
}
