import axios from 'axios';
import { cacheApiResponse, getCachedData, queueOfflineWrite } from './offlineSync';
import { isNetworkError } from './offlineUtils';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: cache successful GETs + handle offline
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses in IndexedDB
    if (
      response.config.method === 'get' &&
      typeof window !== 'undefined' &&
      response.config.url
    ) {
      cacheApiResponse(response.config.url, response.data).catch(() => {});
    }
    return response;
  },
  async (error) => {
    // Skip offline handling on server side
    if (typeof window === 'undefined') return Promise.reject(error);

    const config = error.config;

    // Handle network errors (offline)
    if (isNetworkError(error) && config) {
      const method = (config.method || '').toLowerCase();
      const url = config.url || '';

      // GET: serve from IndexedDB cache
      if (method === 'get') {
        const cached = await getCachedData(url);
        if (cached !== null) {
          return {
            data: cached,
            status: 200,
            statusText: 'OK (offline cache)',
            headers: {},
            config,
            _fromCache: true,
          };
        }
      }

      // Mutations (POST/PUT/PATCH/DELETE): queue for later sync
      if (['post', 'put', 'patch', 'delete'].includes(method)) {
        try {
          const payload = config.data ? JSON.parse(config.data) : undefined;
          const result = await queueOfflineWrite(
            method.toUpperCase(),
            url,
            payload
          );
          return {
            data: result.optimisticData || { success: true },
            status: 200,
            statusText: 'OK (queued offline)',
            headers: {},
            config,
            _offlineQueued: true,
          };
        } catch (queueErr) {
          console.error('[Offline] Failed to queue write:', queueErr);
        }
      }
    }

    // 401: only redirect if online (offline 401s are stale tokens, not auth failures)
    if (error.response?.status === 401) {
      if (navigator.onLine) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
