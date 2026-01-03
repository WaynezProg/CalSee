'use client';

/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for deleting items.
 */

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  itemName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  itemName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t('deleteConfirm.title')}
        </h2>

        <p className="text-gray-600 mb-6">
          {t('deleteConfirm.message', { itemName })}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isDeleting}
          >
            {t('deleteConfirm.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? t('deleteConfirm.deleting') : t('deleteConfirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
