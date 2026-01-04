"use client";

import { useEffect, useState } from "react";
import { getPendingSyncQueueCount } from "@/lib/db/indexeddb/sync-queue";

export function OfflineIndicator() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
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

  return (
    <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
      {isOnline
        ? `Sync queue: ${queueCount} pending`
        : `Offline · ${queueCount} pending syncs`}
    </div>
  );
}
