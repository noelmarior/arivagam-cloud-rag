// client/src/api/axios.js
import axios from 'axios';

// 🚀 Get API URL from environment variable
const baseURL = import.meta.env.VITE_API_URL;

// 🔍 Enhanced Debug Logging
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔗 API Base URL:', baseURL || '⚠️ NOT SET - Using localhost fallback');
console.log('🌍 Environment:', import.meta.env.MODE);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// ❌ Critical Error Detection
if (!baseURL) {
  console.error('❌ CRITICAL: VITE_API_URL is not defined!');
  console.error('📝 Local Dev: Create client/.env with VITE_API_URL=http://localhost:5000/api');
  console.error('☁️ Production: Set VITE_API_URL in Vercel Environment Variables');
}

// ⚠️ Production Safety Check
if (import.meta.env.PROD && (!baseURL || baseURL.includes('localhost'))) {
  console.error('⚠️ PRODUCTION ERROR: Using localhost in production build!');
  console.error('🔧 Fix: Set VITE_API_URL in Vercel Dashboard → Settings → Environment Variables');
  console.error('📍 Should be: https://your-backend.onrender.com/api');
}

// Create axios instance
const instance = axios.create({
  baseURL: baseURL || 'http://localhost:5000/api',
  timeout: 60000, // 60 second timeout (uploads may take time)
  headers: {
    'Content-Type': 'application/json',
  }
});

// ✅ REQUEST INTERCEPTOR: Automatically add Token to headers
instance.interceptors.request.use(
  (config) => {
    // Check sessionStorage first, then localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ RESPONSE INTERCEPTOR: Handle common errors
instance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  (error) => {
    const requestUrl = error.config?.url || '';

    // ✅ Skip redirect for auth endpoints
    // A 401 on /auth/login means wrong password - NOT expired session
    const isAuthEndpoint = requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/check-email');

    // Only redirect to login if:
    // 1. It's a 401 error
    // 2. It's NOT an auth endpoint (real expired session)
    if (error.response?.status === 401 && !isAuthEndpoint) {
      console.warn('🔒 Session expired. Redirecting to login...');
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network Error: Cannot reach backend');
      console.error('Check if backend is running:', baseURL);
    }

    if (import.meta.env.DEV) {
      console.error('❌ Response Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.error || error.message
      });
    }

    return Promise.reject(error);
  }
);

export default instance;