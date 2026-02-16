import axios from 'axios';

// 🚀 PRODUCTION-FIRST BASE URL
const baseURL = import.meta.env.VITE_API_URL;

// Debug log to see what the app is actually using (Check this in your browser console!)
console.log("🔗 Current API Base URL:", baseURL || "FALLBACK TO LOCALHOST");

const instance = axios.create({
  baseURL: baseURL || 'http://localhost:5000/api',
  withCredentials: true
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