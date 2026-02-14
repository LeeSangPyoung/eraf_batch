import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

/** [F9] Check if JWT token is expired */
const isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    // Expired if less than 60 seconds remaining
    return decoded.exp * 1000 < Date.now() + 60000;
  } catch {
    return true;
  }
};

const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      login: (token) =>
        set({
          isAuthenticated: true,
          token: token,
          user: jwtDecode(token),
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
      /** [F9] Check token validity and auto-logout if expired */
      checkAuth: () => {
        const { token } = get();
        if (token && isTokenExpired(token)) {
          get().logout();
          return false;
        }
        return !!token;
      },
    }),
    {
      name: 'auth',
    },
  ),
);

export default useAuthStore;
