'use client';

/**
 * ConsentDialog Component
 *
 * Shows user consent dialog for cloud-based recognition.
 * Stores consent in IndexedDB.
 */

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

interface ConsentDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const CONSENT_VERSION = '1.0';

export default function ConsentDialog({
  isOpen,
  onAccept,
  onDecline,
}: ConsentDialogProps) {
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onAccept();
    } finally {
      setIsSubmitting(false);
    }
  }, [onAccept]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('consent.title')}
        </h2>

        <div className="space-y-4 text-sm text-gray-600">
          <p>{t('consent.body')}</p>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">{t('consent.noticeTitle')}</h3>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>{t('consent.noticeItem1')}</li>
              <li>{t('consent.noticeItem2')}</li>
              <li>{t('consent.noticeItem3')}</li>
            </ul>
          </div>

          <p className="text-gray-500">{t('consent.declineNote')}</p>

          <p className="text-xs text-gray-400">
            {t('consent.version', { version: CONSENT_VERSION })}
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            {t('consent.decline')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('consent.processing') : t('consent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

export { CONSENT_VERSION };
