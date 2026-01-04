'use client';

/**
 * Settings Page
 *
 * User settings including:
 * - Account management
 * - Privacy settings (cloud recognition consent)
 * - Data management
 * - About
 */

import { useState, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import AppLayout from '@/app/components/layout/AppLayout';
import SignInButton from '@/app/components/auth/SignInButton';
import { useI18n } from '@/lib/i18n';
import {
  getCloudRecognitionConsent,
  saveCloudRecognitionConsent,
  clearAllData,
} from '@/lib/db/indexeddb';

export default function SettingsPage() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check consent status on mount
  useEffect(() => {
    const checkConsent = async () => {
      try {
        const consent = await getCloudRecognitionConsent();
        setHasConsent(consent?.accepted ?? false);
      } catch (err) {
        console.error('Failed to check consent:', err);
        setHasConsent(false);
      }
    };
    checkConsent();
  }, []);

  const handleWithdrawConsent = useCallback(async () => {
    if (!window.confirm(t('consentWithdraw.confirm'))) {
      return;
    }

    setIsWithdrawing(true);
    try {
      await saveCloudRecognitionConsent({
        accepted: false,
        version: '1.0',
        timestamp: new Date(),
      });
      setHasConsent(false);
      setMessage({ type: 'success', text: t('consentWithdraw.success') });
    } catch (err) {
      console.error('Failed to withdraw consent:', err);
      setMessage({ type: 'error', text: t('errors.withdrawConsentFailed') });
    } finally {
      setIsWithdrawing(false);
    }
  }, [t]);

  const handleClearData = useCallback(async () => {
    if (!window.confirm(t('settings.clearDataConfirm'))) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();
      setMessage({ type: 'success', text: t('settings.clearDataSuccess') });
    } catch (err) {
      console.error('Failed to clear data:', err);
      setMessage({ type: 'error', text: t('errors.unexpected') });
    } finally {
      setIsClearing(false);
    }
  }, [t]);

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800">{t('settings.title')}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Account Section */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">{t('settings.accountSection')}</h2>
          </div>

          <div className="p-4">
            {status === 'loading' ? (
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-50 rounded w-32" />
                </div>
              </div>
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || ''}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-blue-600">
                      {session.user.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{session.user.name}</p>
                  <p className="text-sm text-slate-500 truncate">{session.user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('settings.signOut')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{t('settings.signIn')}</p>
                  <p className="text-sm text-slate-500">{t('settings.signInDescription')}</p>
                </div>
                <SignInButton />
              </div>
            )}
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">{t('settings.privacySection')}</h2>
          </div>

          <div className="divide-y divide-slate-50">
            {/* Cloud Recognition */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{t('settings.cloudRecognition')}</p>
                <p className="text-sm text-slate-500">
                  {hasConsent
                    ? t('settings.cloudRecognitionEnabled')
                    : t('settings.cloudRecognitionDisabled')}
                </p>
              </div>
              {hasConsent && (
                <button
                  onClick={handleWithdrawConsent}
                  disabled={isWithdrawing}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  {isWithdrawing ? '...' : t('settings.withdrawConsent')}
                </button>
              )}
            </div>

            {/* Data Storage */}
            <div className="p-4">
              <p className="font-medium text-slate-800">{t('settings.dataStorage')}</p>
              <p className="text-sm text-slate-500">{t('settings.dataStorageLocal')}</p>
            </div>

            {/* Clear Data */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{t('settings.clearData')}</p>
              </div>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {isClearing ? '...' : t('deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-500">{t('settings.aboutSection')}</h2>
          </div>

          <div className="divide-y divide-slate-50">
            <div className="p-4 flex items-center justify-between">
              <span className="text-slate-800">{t('settings.version')}</span>
              <span className="text-slate-500">1.0.0</span>
            </div>
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
