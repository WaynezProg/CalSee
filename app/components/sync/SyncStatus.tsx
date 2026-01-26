'use client';

import { memo } from 'react';

export type SyncStatusType = 'failed' | 'conflict' | 'quota_exceeded' | 'success' | 'syncing';

interface SyncStatusProps {
  status?: SyncStatusType | null;
  message?: string | null;
  onDismiss?: () => void;
}

const statusConfig: Record<
  SyncStatusType,
  { icon: string; bg: string; border: string; text: string; defaultMessage: string }
> = {
  failed: {
    icon: '!',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    defaultMessage: 'Sync failed. Changes will retry in the background.',
  },
  conflict: {
    icon: '⚠',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    defaultMessage: 'A newer version was found. Your view was updated to the latest version.',
  },
  quota_exceeded: {
    icon: '⊘',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    defaultMessage: 'Cloud storage quota exceeded. Please free space and try again.',
  },
  success: {
    icon: '✓',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    defaultMessage: 'Successfully synced.',
  },
  syncing: {
    icon: '↻',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    defaultMessage: 'Syncing...',
  },
};

function SyncStatus({ status, message, onDismiss }: SyncStatusProps) {
  if (!status) return null;

  const config = statusConfig[status];
  const content = message ?? config.defaultMessage;
  const isAnimated = status === 'syncing';

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border ${config.border} ${config.bg} px-3 py-2 text-sm ${config.text}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${isAnimated ? 'animate-spin' : ''}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span className="flex-1">{content}</span>
      {onDismiss && status !== 'syncing' && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-2 rounded p-0.5 hover:bg-black/5"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default memo(SyncStatus);
export { SyncStatus };
