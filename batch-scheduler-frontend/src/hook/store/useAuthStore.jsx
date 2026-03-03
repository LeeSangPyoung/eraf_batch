import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

/** [F9] Check if JWT token is expired (with clock skew compensation) */
const isTokenExpired = (token, clockSkew = 0) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;
    // Adjust Date.now() by clock skew to normalize to server time
    const adjustedNow = Date.now() - clockSkew * 1000;
    // Expired if less than 60 seconds remaining
    return decoded.exp * 1000 < adjustedNow + 60000;
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
      clockSkew: 0,
      login: (token) => {
        const decoded = jwtDecode(token);
        // Calculate clock skew: difference between client time and server issue time
        // If server clock is behind, clockSkew will be positive
        const clockSkew = decoded.iat
          ? Math.floor(Date.now() / 1000) - decoded.iat
          : 0;
        set({
          isAuthenticated: true,
          token: token,
          user: decoded,
          clockSkew: clockSkew,
        });
      },
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          clockSkew: 0,
        }),
      /** [F9] Check token validity and auto-logout if expired */
      checkAuth: () => {
        const { token, clockSkew } = get();
        if (token && isTokenExpired(token, clockSkew || 0)) {
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
