import axios from 'axios';
import useAuthStore from '../hook/store/useAuthStore';

const api = axios.create({
  // @ts-ignore
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const auth = localStorage.getItem('auth');
    if (auth) {
      try {
        const token = JSON.parse(auth).state.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        // Invalid auth data, continue without token
      }
    }
    return config; // Always return config
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default api;
