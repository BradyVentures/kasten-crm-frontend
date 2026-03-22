import { v4 as uuidv4 } from 'uuid';
import { db, getTableForEndpoint, getTable, type SyncQueueEntry } from './offlineDb';
import { getCurrentUserId } from './offlineUtils';

/**
 * Cache API GET response data into IndexedDB
 */
export async function cacheApiResponse(endpoint: string, data: unknown): Promise<void> {
  try {
    const tableName = getTableForEndpoint(endpoint);
    if (!tableName) return;

    const table = getTable(tableName);
    if (!table) return;

    // Handle dashboard stats (single record)
    if (tableName === 'dashboardStats') {
      await table.put({ key: 'stats', ...(data as object), _cachedAt: Date.now() });
      return;
    }

    // Handle recent activity (replace all)
    if (tableName === 'recentActivity') {
      await table.clear();
      if (Array.isArray(data)) {
        await table.bulkPut(data.map((item: Record<string, unknown>) => ({ ...item, _cachedAt: Date.now() })));
      }
      return;
    }

    // Handle paginated responses (e.g., { customers: [...], total, page })
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      // Look for the array property (leads, customers, etc.)
      const arrayKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
      if (arrayKey) {
        const items = obj[arrayKey] as Record<string, unknown>[];
        await bulkUpsert(table, items);
        return;
      }
      // Single record (detail endpoint like /leads/123)
      if ('id' in obj) {
        await table.put({ ...obj, _cachedAt: Date.now() });
        return;
      }
    }

    // Handle array responses
    if (Array.isArray(data)) {
      await bulkUpsert(table, data as Record<string, unknown>[]);
      return;
    }
  } catch (err) {
    console.warn('[Offline] Cache write failed:', err);
  }
}

/**
 * Bulk upsert records, preserving _dirty flags on locally modified records
 */
async function bulkUpsert(table: ReturnType<typeof getTable>, items: Record<string, unknown>[]): Promise<void> {
  if (!table || items.length === 0) return;

  for (const item of items) {
    if (!item.id) continue;
    const existing = await table.get(item.id);
    // Don't overwrite locally modified records
    if (existing?._dirty) continue;
    await table.put({ ...item, _cachedAt: Date.now() });
  }
}

/**
 * Read cached data from IndexedDB for a given endpoint
 */
export async function getCachedData(endpoint: string): Promise<unknown | null> {
  try {
    const clean = endpoint.split('?')[0].replace(/\/$/, '');
    const tableName = getTableForEndpoint(endpoint);
    if (!tableName) return null;

    const table = getTable(tableName);
    if (!table) return null;

    // Dashboard stats
    if (tableName === 'dashboardStats') {
      return await table.get('stats') || null;
    }

    // Recent activity
    if (tableName === 'recentActivity') {
      return await table.toArray();
    }

    // Single record (e.g., /leads/123)
    const idMatch = clean.match(/\/([a-f0-9-]{36})$/);
    if (idMatch) {
      const record = await table.get(idMatch[1]);
      return record && !record._deleted ? record : null;
    }

    // List endpoint — apply basic filters from query params
    const queryString = endpoint.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    let collection = table.toCollection();

    // Filter out deleted records
    let results = await collection.toArray();
    results = results.filter((r: Record<string, unknown>) => !r._deleted);

    // Apply status filter if present
    const statusFilter = params.get('status');
    if (statusFilter) {
      results = results.filter((r: Record<string, unknown>) => r.status === statusFilter);
    }

    // For paginated endpoints, wrap in expected format
    if (['leads', 'customers'].includes(tableName)) {
      const page = parseInt(params.get('page') || '1');
      const perPage = parseInt(params.get('per_page') || '25');
      const start = (page - 1) * perPage;
      const paged = results.slice(start, start + perPage);
      return {
        [tableName]: paged,
        total: results.length,
        page,
        per_page: perPage,
      };
    }

    return results;
  } catch (err) {
    console.warn('[Offline] Cache read failed:', err);
    return null;
  }
}

/**
 * Queue an offline write (POST/PUT/PATCH/DELETE) and apply optimistic update
 */
export async function queueOfflineWrite(
  method: string,
  endpoint: string,
  payload?: Record<string, unknown>
): Promise<{ optimisticData: unknown; tempId?: string }> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('No user ID available');

  const clean = endpoint.split('?')[0].replace(/\/$/, '');
  const tableName = getTableForEndpoint(endpoint);
  let tempId: string | undefined;
  let optimisticData: unknown = payload;

  // Apply optimistic update to IndexedDB
  if (tableName) {
    const table = getTable(tableName);
    if (table) {
      if (method === 'POST') {
        // Create: generate temp ID and store locally
        tempId = uuidv4();
        const newRecord = {
          ...payload,
          id: tempId,
          _dirty: true,
          _tempId: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await table.put(newRecord);
        optimisticData = newRecord;
      } else if (method === 'PUT' || method === 'PATCH') {
        // Update: modify existing record
        const idMatch = clean.match(/\/([a-f0-9-]{36})$/);
        if (idMatch && payload) {
          const id = idMatch[1];
          const existing = await table.get(id);
          if (existing) {
            const updated = { ...existing, ...payload, _dirty: true, updated_at: new Date().toISOString() };
            await table.put(updated);
            optimisticData = updated;
          }
        }
      } else if (method === 'DELETE') {
        // Delete: mark as deleted
        const idMatch = clean.match(/\/([a-f0-9-]{36})$/);
        if (idMatch) {
          const id = idMatch[1];
          const existing = await table.get(id);
          if (existing) {
            await table.put({ ...existing, _deleted: true, _dirty: true });
          }
        }
      }
    }
  }

  // Add to sync queue
  const entry: SyncQueueEntry = {
    userId,
    method: method.toUpperCase() as SyncQueueEntry['method'],
    endpoint: clean,
    payload,
    entityTable: tableName || undefined,
    entityId: clean.match(/\/([a-f0-9-]{36})$/)?.[1],
    tempId,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  await db.syncQueue.add(entry);
  return { optimisticData, tempId };
}

/**
 * Get count of pending sync queue items
 */
export async function getPendingCount(): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) return 0;
  return await db.syncQueue.where({ userId, status: 'pending' }).count();
}
