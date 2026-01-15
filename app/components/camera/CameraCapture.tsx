'use client';

/**
 * CameraCapture Component
 *
 * Allows users to take photos or select from gallery for meal logging.
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const processFile = useCallback(
    async (file: File) => {
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
          `Image compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)}`,
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
      }
    },
    [onImageCaptured, onError, t],
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      await processFile(file);

      // Reset input to allow selecting the same file again
      event.target.value = '';
    },
    [processFile],
  );

  const handleTakePhoto = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleChooseFromGallery = useCallback(() => {
    galleryInputRef.current?.click();
  }, []);

  const handleClearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="w-full">
      {/* Hidden input for camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
        aria-label={t('camera.takePhoto')}
      />

      {/* Hidden input for gallery selection */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isProcessing}
        aria-label={t('camera.chooseFromGallery')}
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={t('camera.previewAlt')}
            className="w-full max-h-80 object-contain rounded-2xl"
          />
          <button
            type="button"
            onClick={handleClearPreview}
            className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-colors backdrop-blur-sm"
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
        <div className="w-full">
          {isProcessing ? (
            <div className="h-44 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
              <span className="text-slate-600">{t('camera.processing')}</span>
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-5">
              {/* Two buttons side by side */}
              <div className="flex gap-4">
                {/* Take Photo Button */}
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  disabled={disabled}
                  className="flex-1 h-32 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:from-blue-100 hover:to-sky-100 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-slate-700 text-sm font-medium">
                    {t('camera.takePhoto')}
                  </span>
                </button>

                {/* Choose from Gallery Button */}
                <button
                  type="button"
                  onClick={handleChooseFromGallery}
                  disabled={disabled}
                  className="flex-1 h-32 bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:from-slate-100 hover:to-gray-100 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-slate-700 text-sm font-medium">
                    {t('camera.chooseFromGallery')}
                  </span>
                </button>
              </div>

              {/* Supported Formats */}
              <p className="text-center text-xs text-slate-400 mt-4">
                {t('camera.supportedFormats')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
