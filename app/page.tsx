'use client';

/**
 * Home Page - Meal Photo Logging
 *
 * Main workflow:
 * 1. User selects/takes photo
 * 2. Photo is compressed
 * 3. Check consent, show dialog if needed
 * 4. Call recognition API (with consent)
 * 5. Show recognition result in form
 * 6. User confirms/corrects and saves
 */

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import CameraCapture from '@/app/components/camera/CameraCapture';
import MealForm from '@/app/components/meal/MealForm';
import ConsentDialog, { CONSENT_VERSION } from '@/app/components/ui/ConsentDialog';
import ConsentWithdraw from '@/app/components/ui/ConsentWithdraw';
import { useI18n } from '@/lib/i18n';
import { recognizeFoodWithRetry } from '@/lib/services/recognition';
import {
  addMeal,
  addPhoto,
  getCloudRecognitionConsent,
  saveCloudRecognitionConsent,
  isStorageApproachingLimit,
} from '@/lib/db/indexeddb';
import type { FoodRecognitionResult, MealFormData, Photo, Meal } from '@/types/meal';

type WorkflowStep = 'capture' | 'processing' | 'confirm' | 'success' | 'error';

export default function Home() {
  const { t } = useI18n();
  // Workflow state
  const [step, setStep] = useState<WorkflowStep>('capture');
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoWidth, setPhotoWidth] = useState(0);
  const [photoHeight, setPhotoHeight] = useState(0);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // Recognition state
  const [recognitionResult, setRecognitionResult] = useState<FoodRecognitionResult | null>(null);
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
  const handleImageCaptured = useCallback((blob: Blob, width: number, height: number) => {
    setPhotoBlob(blob);
    setPhotoWidth(width);
    setPhotoHeight(height);
    setError(null);

    // Check if we need consent
    if (hasConsent === false) {
      setShowConsentDialog(true);
      setPendingRecognition(true);
    } else if (hasConsent === true) {
      // Start recognition immediately
      startRecognition(blob);
    }
  }, [hasConsent]);

  // Start recognition process
  const startRecognition = useCallback(async (blob: Blob) => {
    setStep('processing');
    setIsRecognizing(true);
    setError(null);

    try {
      const result = await recognizeFoodWithRetry(blob, true);

      if (result.success && result.data) {
        setRecognitionResult(result.data);
        setStep('confirm');
      } else {
        // Recognition failed - allow manual entry
        setRecognitionResult(null);
        setStep('confirm');
        if (result.error?.code !== 'NO_FOOD_DETECTED') {
          setError(result.error?.message || t('errors.recognitionFailedManual'));
        }
      }
    } catch (err) {
      console.error('Recognition error:', err);
      setError(t('errors.recognitionErrorManual'));
      setStep('confirm');
    } finally {
      setIsRecognizing(false);
    }
  }, [t]);

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

  // Handle form submit
  const handleFormSubmit = useCallback(async (formData: MealFormData) => {
    if (!photoBlob) {
      setError(t('errors.missingPhoto'));
      return;
    }

    try {
      // Check storage limit
      const isApproachingLimit = await isStorageApproachingLimit();
      if (isApproachingLimit) {
        setError(t('errors.storageLow'));
        return;
      }

      const photoId = uuidv4();
      const mealId = uuidv4();
      const now = new Date();

      // Save photo
      const photo: Photo = {
        photoId,
        blob: photoBlob,
        mimeType: 'image/jpeg',
        width: photoWidth,
        height: photoHeight,
      };
      await addPhoto(photo);

      // Save meal
      const meal: Meal = {
        id: mealId,
        photoId,
        foodName: formData.foodName,
        portionSize: formData.portionSize,
        calories: formData.calories,
        protein: formData.protein,
        carbohydrates: formData.carbohydrates,
        fats: formData.fats,
        recognitionConfidence: recognitionResult?.confidence ?? 0,
        nutritionDataComplete: !!(formData.calories && formData.protein && formData.carbohydrates && formData.fats),
        createdAt: now,
        updatedAt: now,
        isManualEntry: formData.isManualEntry,
      };
      await addMeal(meal);

      setStep('success');
    } catch (err) {
      console.error('Failed to save meal:', err);
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setError(t('errors.storageFull'));
      } else {
        setError(t('errors.saveFailed'));
      }
    }
  }, [photoBlob, photoWidth, photoHeight, recognitionResult, t]);

  const handleConsentWithdrawn = useCallback(() => {
    setHasConsent(false);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setStep('capture');
    setPhotoBlob(null);
    setPhotoWidth(0);
    setPhotoHeight(0);
    setPhotoPreviewUrl(null);
    setRecognitionResult(null);
    setError(null);
  }, []);

  // Handle new meal
  const handleNewMeal = useCallback(() => {
    setStep('capture');
    setPhotoBlob(null);
    setPhotoWidth(0);
    setPhotoHeight(0);
    setPhotoPreviewUrl(null);
    setRecognitionResult(null);
    setError(null);
  }, []);

  // Handle image error
  const handleImageError = useCallback((errorMessage: string) => {
    setError(errorMessage);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">{t('app.name')}</h1>
          <div className="flex items-center gap-4">
            <ConsentWithdraw onWithdraw={handleConsentWithdrawn} />
            <Link
              href="/history"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t('nav.history')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">{t('home.logMealTitle')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('home.logMealSubtitle')}</p>
            </div>
            <CameraCapture
              onImageCaptured={handleImageCaptured}
              onError={handleImageError}
            />
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">{t('home.processingTitle')}</p>
            <p className="text-sm text-gray-400 mt-2">{t('home.processingNotice')}</p>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">{t('home.confirmTitle')}</h2>
            </div>

            {/* Photo Preview */}
            {photoPreviewUrl && (
              <div className="mb-4">
                <img
                  src={photoPreviewUrl}
                  alt={t('home.photoAlt')}
                  className="w-full max-h-48 object-contain rounded-lg"
                />
              </div>
            )}

            <MealForm
              recognitionResult={recognitionResult}
              isLoading={isRecognizing}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h2 className="text-lg font-medium text-gray-900 mb-2">{t('home.successTitle')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('home.successSubtitle')}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleNewMeal}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('home.newMeal')}
              </button>
              <Link
                href="/history"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('home.viewHistory')}
              </Link>
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
    </div>
  );
}
