import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// In-memory access token storage
let accessToken = null;
let isRefreshing = null;

// Called when the server rejects the refresh token (logged out elsewhere,
// account deactivated, password changed, or refresh token reuse detected)
let onSessionExpired = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setOnSessionExpired = (callback) => {
  onSessionExpired = callback;
};

export const getAccessToken = () => accessToken;

// Request interceptor: attach in-memory access token if available
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh on 401 with promise deduplication
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/verify-otp') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = api.post('/auth/refresh').then((res) => {
            const newAccessToken = res.data.accessToken;
            setAccessToken(newAccessToken);
            return newAccessToken;
          }).finally(() => {
            isRefreshing = null;
          });
        }
        const token = await isRefreshing;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Only end the session when the server says it is invalid,
        // not on a network error (server unreachable, Wi-Fi drop)
        const status = refreshError.response?.status;
        if (status === 401 || status === 403) {
          setAccessToken(null);
          if (onSessionExpired) onSessionExpired();
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);


export default api;
