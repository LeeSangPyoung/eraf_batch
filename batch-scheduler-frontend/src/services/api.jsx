import axios from 'axios';
import useAuthStore from '../hook/store/useAuthStore';

const api = axios.create({
  // @ts-ignore
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest', // [C8] CSRF protection - custom header requires CORS preflight
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // [H12] Read token directly from Zustand store to avoid race condition with localStorage
    const store = useAuthStore.getState();

    // [F9] Check token expiry before every request
    if (store.token && !store.checkAuth()) {
      return Promise.reject(new Error('Token expired'));
    }

    if (store.token) {
      config.headers.Authorization = `Bearer ${store.token}`;
    }
    return config;
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
