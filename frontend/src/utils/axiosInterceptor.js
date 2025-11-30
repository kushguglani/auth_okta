import axios from 'axios';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AXIOS INTERCEPTOR WITH AUTO-REFRESH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Axios instance configured with:
 * - Auto-attach access token to requests
 * - Auto-refresh on token expiry (401)
 * - Request queuing during refresh
 * - Logout on refresh failure
 * 
 * @file frontend/src/utils/axiosInterceptor.js
 * @phase Phase 3.4 - Token Refresh
 * 
 * Usage:
 * import api from './utils/axiosInterceptor';
 * const response = await api.get('/api/users');
 */

/**
 * Create Axios instance
 * ────────────────────────────────────────────────────────────────────────
 * Base URL points to backend API
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000'
});

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUEST INTERCEPTOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Automatically adds access token to every request
 * 
 * Before:
 * axios.get('/api/users', {
 *   headers: { Authorization: `Bearer ${token}` }
 * })
 * 
 * After (automatic):
 * api.get('/api/users') // Token added automatically!
 */

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RESPONSE INTERCEPTOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles 401 Unauthorized responses by auto-refreshing tokens
 * 
 * Flow:
 * 1. Request fails with 401
 * 2. Interceptor catches error
 * 3. Call /api/auth/refresh with refresh token
 * 4. Get new access + refresh tokens
 * 5. Store new tokens
 * 6. Retry original request
 * 7. Return response to caller (seamless!)
 * 
 * If refresh fails:
 * - Clear tokens
 * - Redirect to login
 * - User must re-authenticate
 */

let isRefreshing = false;
let failedQueue = [];

/**
 * Process queued requests
 * ────────────────────────────────────────────────────────────────────────
 * When multiple requests fail simultaneously:
 * - Queue them
 * - Refresh token once
 * - Retry all queued requests
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  // Success response - pass through
  (response) => {
    return response;
  },
  
  // Error response - check if 401 and refresh
  async (error) => {
    const originalRequest = error.config;
    
    /**
     * Check if error is 401 and we haven't retried yet
     * ────────────────────────────────────────────────────────────────────
     * 401 = Unauthorized (token expired or invalid)
     * _retry flag prevents infinite loop
     */
    if (error.response?.status === 401 && !originalRequest._retry) {
      /**
       * Handle concurrent 401 errors
       * ────────────────────────────────────────────────────────────────
       * If multiple requests fail simultaneously:
       * - First request triggers refresh
       * - Other requests wait in queue
       * - All retry after refresh completes
       */
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token → Redirect to login
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        // ─────────────────────────────────────────────────────────
        // Call Refresh Endpoint
        // ─────────────────────────────────────────────────────────
        /**
         * Important: Use axios (not api) to avoid interceptor loop
         */
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/refresh`,
          { refreshToken }
        );
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        // ─────────────────────────────────────────────────────────
        // Store New Tokens
        // ─────────────────────────────────────────────────────────
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // ─────────────────────────────────────────────────────────
        // Update Original Request Header
        // ─────────────────────────────────────────────────────────
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // ─────────────────────────────────────────────────────────
        // Process Queued Requests
        // ─────────────────────────────────────────────────────────
        processQueue(null, accessToken);
        
        // ─────────────────────────────────────────────────────────
        // Retry Original Request
        // ─────────────────────────────────────────────────────────
        return api(originalRequest);
        
      } catch (refreshError) {
        // ─────────────────────────────────────────────────────────
        // Refresh Failed → Logout
        // ─────────────────────────────────────────────────────────
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Not a 401 error or already retried → pass through
    return Promise.reject(error);
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Use this instead of axios:
 * 
 * // ❌ DON'T:
 * import axios from 'axios';
 * axios.get('/api/users');
 * 
 * // ✅ DO:
 * import api from './utils/axiosInterceptor';
 * api.get('/api/users');
 */
export default api;

