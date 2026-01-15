'use client';

export type SyncStatusType = 'failed' | 'conflict' | 'quota_exceeded';

interface SyncStatusProps {
  status?: SyncStatusType | null;
  message?: string | null;
}

const defaultMessages: Record<SyncStatusType, string> = {
  failed: 'Sync failed. Changes will retry in the background.',
  conflict: 'A newer version was found. Your view was updated to the latest version.',
  quota_exceeded: 'Cloud storage quota exceeded. Please free space and try again.',
};

export function SyncStatus({ status, message }: SyncStatusProps) {
  if (!status) return null;

  const content = message ?? defaultMessages[status];

  return (
    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      {content}
    </div>
  );
}
