'use client';

/**
 * Meal History Page
 *
 * Displays all logged meals in reverse chronological order.
 * Allows viewing meal details.
 */

import AppLayout from '@/app/components/layout/AppLayout';
import { useI18n } from '@/lib/i18n';
import { MealHistory as SyncMealHistory } from '@/app/components/meals/MealHistory';

export default function HistoryPage() {
  const { t } = useI18n();

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
        <SyncMealHistory />
      </main>
    </AppLayout>
  );
}
