'use client';

/**
 * CameraCapture Component
 *
 * Allows users to select/upload photos for meal logging.
 * Compresses images using Canvas API before processing.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { compressImage, formatFileSize } from '@/lib/utils/image-compression';
import { useI18n } from '@/lib/i18n';

interface CameraCaptureProps {
  onImageCaptured: (blob: Blob, width: number, height: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function CameraCapture({
  onImageCaptured,
  onError,
  disabled = false,
}: CameraCaptureProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.(t('errors.imageInvalid'));
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      onError?.(t('errors.imageTooLarge'));
      return;
    }

    setIsProcessing(true);

    try {
      // Compress the image
      const result = await compressImage(file);

      console.log(
        `Image compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`
      );

      // Create preview URL
      const previewUrl = URL.createObjectURL(result.blob);
      setPreview(previewUrl);

      // Notify parent
      onImageCaptured(result.blob, result.width, result.height);
    } catch (error) {
      console.error('Image compression failed:', error);
      onError?.(t('errors.imageProcessFailed'));
    } finally {
      setIsProcessing(false);
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onImageCaptured, onError]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
        aria-label={t('camera.inputLabel')}
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={t('camera.previewAlt')}
            className="w-full max-h-80 object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={handleClearPreview}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            aria-label={t('camera.clearPhoto')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={disabled || isProcessing}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
              <span className="text-gray-600">{t('camera.processing')}</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-gray-600">{t('camera.cta')}</span>
              <span className="text-sm text-gray-400">{t('camera.supportedFormats')}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
