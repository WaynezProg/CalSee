'use client';

/**
 * Add Meal Page
 *
 * Main workflow for adding a new meal:
 * 1. User selects/takes photo
 * 2. Photo is compressed
 * 3. Check consent, show dialog if needed
 * 4. Call recognition API (with consent)
 * 5. Show recognition result in form
 * 6. User confirms/corrects and saves
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AppLayout from '@/app/components/layout/AppLayout';
import CameraCapture from '@/app/components/camera/CameraCapture';
import { MultiItemMealForm } from '@/app/components/meals/MultiItemMealForm';
import ConsentDialog, { CONSENT_VERSION } from '@/app/components/ui/ConsentDialog';
import { useI18n } from '@/lib/i18n';
import { recognizeMultipleFoodWithRetry } from '@/lib/services/recognition';
import { getCloudRecognitionConsent, saveCloudRecognitionConsent } from '@/lib/db/indexeddb';
import type { MultiItemRecognitionResponse } from '@/types/recognition';

type WorkflowStep = 'capture' | 'processing' | 'confirm' | 'manualEntry' | 'success';

export default function AddMealPage() {
  const { t } = useI18n();
  const router = useRouter();

  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('capture');
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Recognition state
  const [recognitionResult, setRecognitionResult] = useState<MultiItemRecognitionResponse | null>(
    null,
  );
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Consent state
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingRecognition, setPendingRecognition] = useState(false);

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

  useEffect(() => {
    if (!photoBlob) {
      setPhotoPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(photoBlob);
    setPhotoPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [photoBlob]);

  // Handle image captured
  const handleImageCaptured = useCallback(
    (blob: Blob) => {
      setPhotoBlob(blob);
      setPhotoFile(
        new File([blob], `meal-${Date.now()}.jpg`, {
          type: blob.type || 'image/jpeg',
        }),
      );
      setError(null);

      // Check if we need consent
      if (hasConsent === false) {
        setShowConsentDialog(true);
        setPendingRecognition(true);
      } else if (hasConsent === true) {
        // Start recognition immediately
        startRecognition(blob);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startRecognition is stable
    [hasConsent],
  );

  // Start recognition process
  const startRecognition = useCallback(
    async (blob: Blob) => {
      setStep('processing');
      setIsRecognizing(true);
      setError(null);

      try {
        const result = await recognizeMultipleFoodWithRetry(blob, true);

        if (result.success && result.data) {
          setRecognitionResult(result.data);
          setStep('confirm');
        } else {
          // Recognition failed - stay on processing step and show error with retry option
          setRecognitionResult(null);
          if (result.error?.code === 'NO_FOOD_DETECTED') {
            // No food detected - go to confirm for manual entry
            setStep('confirm');
          } else {
            // Other errors (timeout, network) - allow retry
            setError(result.error?.message || t('errors.recognitionFailedManual'));
          }
        }
      } catch (err) {
        console.error('Recognition error:', err);
        setError(t('errors.recognitionErrorManual'));
      } finally {
        setIsRecognizing(false);
      }
    },
    [t],
  );

  // Handle retry recognition
  const handleRetryRecognition = useCallback(() => {
    if (photoBlob) {
      setError(null);
      startRecognition(photoBlob);
    }
  }, [photoBlob, startRecognition]);

  // Handle skip to manual entry from processing
  const handleSkipToManual = useCallback(() => {
    setError(null);
    setRecognitionResult(null);
    setStep('confirm');
  }, []);

  // Handle consent accepted
  const handleConsentAccept = useCallback(async () => {
    try {
      await saveCloudRecognitionConsent({
        accepted: true,
        version: CONSENT_VERSION,
        timestamp: new Date(),
      });
      setHasConsent(true);
      setShowConsentDialog(false);

      // Start recognition if we have a pending photo
      if (pendingRecognition && photoBlob) {
        setPendingRecognition(false);
        startRecognition(photoBlob);
      }
    } catch (err) {
      console.error('Failed to save consent:', err);
      setError(t('errors.consentSaveFailed'));
    }
  }, [pendingRecognition, photoBlob, startRecognition, t]);

  // Handle consent declined
  const handleConsentDecline = useCallback(() => {
    setHasConsent(false);
    setShowConsentDialog(false);
    setPendingRecognition(false);
    // Allow manual entry without recognition
    setRecognitionResult(null);
    setStep('confirm');
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setStep('success');
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setStep('capture');
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
    setPhotoFile(null);
    setRecognitionResult(null);
    setError(null);
  }, []);

  // Handle new meal after success
  const handleNewMeal = useCallback(() => {
    setStep('capture');
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
    setPhotoFile(null);
    setRecognitionResult(null);
    setError(null);
  }, []);

  // Handle image error
  const handleImageError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  // Handle manual entry (without photo)
  const handleManualEntry = useCallback(() => {
    setPhotoBlob(null);
    setPhotoPreviewUrl(null);
    setPhotoFile(null);
    setRecognitionResult(null);
    setError(null);
    setStep('manualEntry');
  }, []);

  return (
    <AppLayout>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-slate-800">{t('nav.newEntry')}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-800">{t('home.logMealTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('home.logMealSubtitle')}</p>
            </div>
            <CameraCapture onImageCaptured={handleImageCaptured} onError={handleImageError} />
            <div className="text-center pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {t('home.manualEntryButton')}
              </button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="text-center py-12">
            {isRecognizing ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
                <p className="text-slate-800">{t('home.processingTitle')}</p>
                <p className="text-sm text-slate-500 mt-2">{t('home.processingNotice')}</p>
              </>
            ) : (
              <>
                {/* Photo Preview */}
                {photoPreviewUrl && (
                  <div className="relative mb-6 h-48 w-full">
                    <Image
                      src={photoPreviewUrl}
                      alt={t('home.photoAlt')}
                      fill
                      className="object-contain rounded-2xl"
                      unoptimized
                    />
                  </div>
                )}

                {/* Retry and Skip buttons */}
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <button
                    onClick={handleRetryRecognition}
                    className="w-full px-6 py-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-colors font-medium shadow-sm"
                  >
                    {t('home.retryRecognition')}
                  </button>
                  <button
                    onClick={handleSkipToManual}
                    className="w-full px-6 py-3 border border-slate-200 bg-white rounded-2xl text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t('home.skipToManual')}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full px-6 py-2 text-slate-500 hover:text-slate-600 transition-colors text-sm"
                  >
                    {t('mealForm.cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-medium text-slate-800">{t('home.confirmTitle')}</h2>
            </div>

            {/* Photo Preview */}
            {photoPreviewUrl && (
              <div className="relative mb-4 h-48 w-full">
                <Image
                  src={photoPreviewUrl}
                  alt={t('home.photoAlt')}
                  fill
                  className="object-contain rounded-2xl"
                  unoptimized
                />
              </div>
            )}

            <MultiItemMealForm
              recognitionResult={recognitionResult}
              photoFile={photoFile}
              isLoading={isRecognizing}
              onSubmitSuccess={handleSubmitSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Step: Manual Entry (no photo) */}
        {step === 'manualEntry' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-medium text-slate-800">{t('home.manualEntryButton')}</h2>
            </div>

            <MultiItemMealForm
              recognitionResult={null}
              photoFile={null}
              isLoading={false}
              onSubmitSuccess={handleSubmitSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-medium text-slate-800 mb-2">{t('home.successTitle')}</h2>
            <p className="text-sm text-slate-500 mb-8">{t('home.successSubtitle')}</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button
                onClick={handleNewMeal}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-colors font-medium shadow-sm"
              >
                {t('home.newMeal')}
              </button>
              <button
                onClick={() => router.push('/history')}
                className="w-full px-6 py-3 border border-slate-200 bg-white rounded-2xl text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {t('home.viewHistory')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Consent Dialog */}
      <ConsentDialog
        isOpen={showConsentDialog}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </AppLayout>
  );
}
