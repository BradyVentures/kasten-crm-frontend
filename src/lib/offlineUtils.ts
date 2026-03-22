/**
 * Get current user ID from localStorage without importing AuthContext
 */
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).id : null;
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;
  const token = localStorage.getItem('token');
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Check if a network error (no response = offline/network issue)
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { response?: unknown; code?: string; message?: string };
  // No response means network error (offline, DNS failure, etc.)
  if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
    return true;
  }
  return false;
}
