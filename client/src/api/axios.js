import axios from 'axios';

// 🚀 DYNAMIC BASE URL
// In Production (Vercel), this will use the VITE_API_URL environment variable.
// In Development (Localhost), it defaults to your local server.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const instance = axios.create({
  baseURL: baseURL,
  withCredentials: true // Important for CORS cookies if you use them
});

// ✅ INTERCEPTOR: Automatically add Token to headers
instance.interceptors.request.use((config) => {
  // Check sessionStorage first, then localStorage
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default instance;