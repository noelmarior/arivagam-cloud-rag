import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:5000/api', // Make sure this matches your server port
});

// ✅ INTERCEPTOR: Automatically add Token to headers
instance.interceptors.request.use((config) => {
  // Check sessionStorage first (where AuthContext saves it), then localStorage
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default instance;