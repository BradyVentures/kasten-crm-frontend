import api from './api';
import { db, getTable } from './offlineDb';
import { getCurrentUserId, isTokenExpired } from './offlineUtils';

type SyncResult = {
  processed: number;
  failed: number;
  remaining: number;
};

let isSyncing = false;
const listeners: Set<(status: SyncStatus) => void> = new Set();

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'done';

export function onSyncStatusChange(fn: (status: SyncStatus) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function emitStatus(status: SyncStatus) {
  listeners.forEach(fn => fn(status));
}

/**
 * Process the sync queue — replay offline mutations to the server
 */
export async function processQueue(): Promise<SyncResult> {
  const userId = getCurrentUserId();
  if (!userId || isSyncing) return { processed: 0, failed: 0, remaining: 0 };

  // Check token validity
  if (isTokenExpired()) {
    console.warn('[Sync] Token expired, skipping sync');
    return { processed: 0, failed: 0, remaining: 0 };
  }

  isSyncing = true;
  emitStatus('syncing');
  let processed = 0;
  let failed = 0;

  try {
    // Get pending items ordered by timestamp (FIFO)
    // Process POSTs first, then PUTs/PATCHes, then DELETEs
    const pending = await db.syncQueue
      .where({ userId, status: 'pending' })
      .sortBy('timestamp');

    const creates = pending.filter(e => e.method === 'POST');
    const updates = pending.filter(e => e.method === 'PUT' || e.method === 'PATCH');
    const deletes = pending.filter(e => e.method === 'DELETE');
    const ordered = [...creates, ...updates, ...deletes];

    for (const entry of ordered) {
      try {
        // Mark as processing
        await db.syncQueue.update(entry.id!, { status: 'processing' });

        // Execute the API call
        let response;
        switch (entry.method) {
          case 'POST':
            response = await api.post(entry.endpoint, entry.payload);
            break;
          case 'PUT':
            response = await api.put(entry.endpoint, entry.payload);
            break;
          case 'PATCH':
            response = await api.patch(entry.endpoint, entry.payload);
            break;
          case 'DELETE':
            response = await api.delete(entry.endpoint);
            break;
        }

        // Success: remove from queue
        await db.syncQueue.delete(entry.id!);

        // Update local IndexedDB with server response
        if (entry.entityTable && response?.data) {
          const table = getTable(entry.entityTable);
          if (table) {
            if (entry.method === 'POST' && entry.tempId && response.data.id) {
              // Replace temp record with server record
              await table.delete(entry.tempId);
              await table.put({ ...response.data, _dirty: false, _cachedAt: Date.now() });
            } else if (entry.method === 'DELETE' && entry.entityId) {
              await table.delete(entry.entityId);
            } else if (response.data.id) {
              await table.put({ ...response.data, _dirty: false, _cachedAt: Date.now() });
            }
          }
        }

        // For deletes without response data, just clean up
        if (entry.method === 'DELETE' && entry.entityTable && entry.entityId) {
          const table = getTable(entry.entityTable);
          if (table) await table.delete(entry.entityId);
        }

        processed++;
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };

        if (axiosErr.response?.status === 409) {
          // Conflict: server has a newer version — server wins
          await db.syncQueue.update(entry.id!, {
            status: 'failed',
            lastError: 'Konflikt: Server hat neuere Version',
            retryCount: 99, // Don't retry conflicts
          });
          // Fetch latest from server and overwrite local
          if (entry.entityTable && entry.entityId) {
            try {
              const table = getTable(entry.entityTable);
              const { data } = await api.get(`${entry.endpoint}`);
              if (table && data) {
                await table.put({ ...data, _dirty: false, _cachedAt: Date.now() });
              }
            } catch { /* ignore */ }
          }
          failed++;
        } else if (axiosErr.response?.status && axiosErr.response.status >= 400) {
          // Client error (4xx): don't retry
          const retryCount = (entry.retryCount || 0) + 1;
          await db.syncQueue.update(entry.id!, {
            status: 'failed',
            lastError: `Server-Fehler: ${axiosErr.response.status}`,
            retryCount,
          });
          failed++;
        } else {
          // Network error: stop processing, revert to pending
          await db.syncQueue.update(entry.id!, { status: 'pending' });
          break; // Stop processing — we're probably offline again
        }
      }
    }

    // Clean up old failed entries (> 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await db.syncQueue.where('timestamp').below(oneDayAgo).delete();

  } finally {
    isSyncing = false;
    const remaining = await db.syncQueue.where({ userId, status: 'pending' }).count();
    emitStatus(remaining > 0 ? 'error' : 'done');
    return { processed, failed, remaining };
  }
}

/**
 * Full sync: process queue + refresh all data
 */
export async function fullSync(): Promise<void> {
  if (!navigator.onLine) return;

  const result = await processQueue();
  console.log(`[Sync] Processed: ${result.processed}, Failed: ${result.failed}, Remaining: ${result.remaining}`);
}
