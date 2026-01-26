'use client';

import { memo, useEffect, useState } from 'react';
import { getPendingSyncQueueCount } from '@/lib/db/indexeddb/sync-queue';

function OfflineIndicator() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const refreshQueue = async () => {
      const count = await getPendingSyncQueueCount();
      if (mounted) setQueueCount(count);
    };

    void refreshQueue();
    const interval = window.setInterval(refreshQueue, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (queueCount === 0 && isOnline) {
    return null;
  }

  const isOffline = !isOnline;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        isOffline
          ? 'border-gray-300 bg-gray-100 text-gray-700'
          : 'border-blue-200 bg-blue-50 text-blue-700'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Status icon */}
      <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
        {isOffline ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </span>

      {/* Status text */}
      <span>
        {isOffline ? (
          <>
            <span className="font-medium">Offline</span>
            {queueCount > 0 && <span className="ml-1">· {queueCount} pending</span>}
          </>
        ) : (
          <>
            <span className="font-medium">Syncing</span>
            <span className="ml-1">· {queueCount} pending</span>
          </>
        )}
      </span>

      {/* Pending count badge */}
      {queueCount > 0 && (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
            isOffline ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'
          }`}
        >
          {queueCount}
        </span>
      )}
    </div>
  );
}

export default memo(OfflineIndicator);
export { OfflineIndicator };
