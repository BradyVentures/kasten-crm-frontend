'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '@/lib/offlineSync';
import { fullSync, onSyncStatusChange, type SyncStatus } from '@/lib/syncEngine';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  // Track online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      fullSync().catch(console.error);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for sync status changes
  useEffect(() => {
    return onSyncStatusChange((status) => {
      setSyncStatus(status);
      // Refresh pending count after status changes
      getPendingCount().then(setPendingCount).catch(() => {});
    });
  }, []);

  // Periodically check pending count
  useEffect(() => {
    const check = () => getPendingCount().then(setPendingCount).catch(() => {});
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  const triggerSync = useCallback(() => {
    if (navigator.onLine) {
      fullSync().catch(console.error);
    }
  }, []);

  return { isOnline, syncStatus, pendingCount, triggerSync };
}
