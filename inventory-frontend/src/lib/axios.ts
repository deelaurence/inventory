import axios from 'axios';

const API_BASE_URL = window.location.protocol.startsWith('https') 
  ? 'https://inventory.vendium.cloud' 
  // : 'http://localhost:4000';
  : 'https://inventory.vendium.cloud';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('[Axios] Request interceptor - URL:', config.url, 'hasToken:', !!token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Axios] Token added to request headers');
    } else {
      console.warn('[Axios] No token found in localStorage for request to:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('[Axios] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log('[Axios] Response received - URL:', response.config?.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.log('[Axios] Response error - URL:', error.config?.url, 'Status:', error.response?.status);
    if (error.response?.status === 401) {
      console.error('[Axios] 401 Unauthorized Error detected - redirecting to login');
      console.error('[Axios] Error details:', error.response.data);
      console.error('[Axios] Request URL:', error.config?.url);
      console.error('[Axios] Request method:', error.config?.method);
      console.error('[Axios] Current token in localStorage:', !!localStorage.getItem('token'));
      console.error('[Axios] Clearing auth data and redirecting...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
