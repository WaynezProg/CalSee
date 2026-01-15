'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCloudRecognitionConsent, withdrawCloudRecognitionConsent } from '@/lib/db/indexeddb';
import { useI18n } from '@/lib/i18n';

interface ConsentWithdrawProps {
  onWithdraw?: () => void;
}

export default function ConsentWithdraw({ onWithdraw }: ConsentWithdrawProps) {
  const { t } = useI18n();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadConsent = async () => {
      try {
        const consent = await getCloudRecognitionConsent();
        setHasConsent(consent?.accepted ?? false);
      } catch (error) {
        console.error('Failed to load consent status:', error);
        setHasConsent(false);
      }
    };

    loadConsent();
  }, []);

  const handleWithdraw = useCallback(async () => {
    if (!window.confirm(t('consentWithdraw.confirm'))) {
      return;
    }

    setIsWithdrawing(true);
    setStatusMessage(null);

    try {
      await withdrawCloudRecognitionConsent();
      setHasConsent(false);
      setStatusMessage(t('consentWithdraw.success'));
      onWithdraw?.();
    } catch (error) {
      console.error('Failed to withdraw consent:', error);
      setStatusMessage(t('errors.withdrawConsentFailed'));
    } finally {
      setIsWithdrawing(false);
    }
  }, [onWithdraw, t]);

  if (!hasConsent) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <button
        type="button"
        onClick={handleWithdraw}
        className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
        disabled={isWithdrawing}
      >
        {t('consentWithdraw.label')}
      </button>
      {statusMessage && <span className="text-xs text-gray-400">{statusMessage}</span>}
    </div>
  );
}
