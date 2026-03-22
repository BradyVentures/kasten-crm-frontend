'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function ConnectionStatus() {
  const { isOnline, syncStatus, pendingCount, triggerSync } = useOnlineStatus();

  // Fully online with no pending changes — don't show anything
  if (isOnline && pendingCount === 0 && syncStatus !== 'syncing') {
    return null;
  }

  // Syncing
  if (isOnline && syncStatus === 'syncing') {
    return (
      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        Synchronisiere... {pendingCount > 0 && `(${pendingCount} Änderungen)`}
      </div>
    );
  }

  // Online with pending changes (waiting to sync)
  if (isOnline && pendingCount > 0) {
    return (
      <div className="mb-3 flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full" />
          {pendingCount} {pendingCount === 1 ? 'Änderung' : 'Änderungen'} ausstehend
        </div>
        <button
          onClick={triggerSync}
          className="text-amber-300 hover:text-amber-200 underline"
        >
          Jetzt synchronisieren
        </button>
      </div>
    );
  }

  // Offline
  if (!isOnline) {
    return (
      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs">
        <span className="w-2 h-2 bg-amber-400 rounded-full" />
        Offline — Änderungen werden lokal gespeichert
        {pendingCount > 0 && ` (${pendingCount} ausstehend)`}
      </div>
    );
  }

  return null;
}
