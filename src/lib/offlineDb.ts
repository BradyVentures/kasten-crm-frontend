import Dexie, { type Table } from 'dexie';

// Offline metadata fields added to cached records
export interface OfflineMeta {
  _dirty?: boolean;    // Modified offline, needs sync
  _deleted?: boolean;  // Deleted offline, needs sync
  _tempId?: string;    // Client-generated ID for offline creates
}

// Sync queue entry
export interface SyncQueueEntry {
  id?: number;           // Auto-increment
  userId: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload?: Record<string, unknown>;
  entityTable?: string;
  entityId?: string;
  tempId?: string;       // For POST: client-generated ID
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
  lastError?: string;
}

// Sync metadata: tracks last sync time per endpoint
export interface SyncMeta {
  key: string;  // userId + endpoint
  userId: string;
  endpoint: string;
  lastSyncAt: number;
}

class OfflineDatabase extends Dexie {
  leads!: Table;
  customers!: Table;
  todos!: Table;
  emailTemplates!: Table;
  services!: Table;
  users!: Table;
  dashboardStats!: Table;
  recentActivity!: Table;
  documents!: Table;
  infoPages!: Table;
  regions!: Table;
  promotions!: Table;
  projects!: Table;
  projectModules!: Table;
  syncQueue!: Table<SyncQueueEntry, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('SalesToolOffline');

    this.version(1).stores({
      // Editable entities with dirty/deleted tracking
      leads: 'id, status, assigned_to, updated_at',
      customers: 'id, updated_at',
      todos: 'id, status, updated_at',
      emailTemplates: 'id, category, user_id',
      infoPages: 'id',
      documents: 'id',

      // Projects
      projects: 'id, status, assigned_to, customer_id, updated_at',
      projectModules: 'id, project_id, status',

      // Read-only reference data
      services: 'id',
      users: 'id',
      regions: 'id',
      promotions: 'id',

      // Dashboard cache (single record keyed by a static key)
      dashboardStats: 'key',
      recentActivity: '++_autoId',

      // Sync infrastructure
      syncQueue: '++id, [userId+status], userId, timestamp',
      syncMeta: 'key, userId',
    });
  }
}

export const db = new OfflineDatabase();

// URL-to-table mapping for the offline layer
const ENDPOINT_TABLE_MAP: Record<string, string> = {
  '/leads': 'leads',
  '/customers': 'customers',
  '/todos': 'todos',
  '/email-templates': 'emailTemplates',
  '/services': 'services',
  '/users': 'users',
  '/info-pages': 'infoPages',
  '/documents': 'documents',
  '/regions': 'regions',
  '/promotions': 'promotions',
  '/projects': 'projects',
  '/project-modules': 'projectModules',
  '/dashboard/stats': 'dashboardStats',
  '/dashboard/recent-activity': 'recentActivity',
};

/**
 * Get the Dexie table name for a given API endpoint
 */
export function getTableForEndpoint(endpoint: string): string | null {
  // Normalize: remove query params and trailing slashes
  const clean = endpoint.split('?')[0].replace(/\/$/, '');

  // Exact match first
  if (ENDPOINT_TABLE_MAP[clean]) return ENDPOINT_TABLE_MAP[clean];

  // Match base path (e.g., /leads/123 → leads, /leads/123/activities → null)
  for (const [path, table] of Object.entries(ENDPOINT_TABLE_MAP)) {
    const regex = new RegExp(`^${path}/[^/]+$`);
    if (regex.test(clean)) return table;
  }

  return null;
}

/**
 * Get the Dexie table instance for a given table name
 */
export function getTable(tableName: string): Table | null {
  try {
    return db.table(tableName);
  } catch {
    return null;
  }
}
