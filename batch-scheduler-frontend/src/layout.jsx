import { Box } from '@mui/material';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import SideBar from './components/SideBar/SideBar';
import MainContent from './components/MainContent/MainContent';
import useAuthStore from './hook/store/useAuthStore';

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const user = useAuthStore((state) => state.user);
  const location = useLocation()

  // [H11] Re-verify token validity on every route change
  if (!isAuthenticated || !checkAuth()) {
    return <Navigate to="/sign-in" replace />;
  }

  // General User cannot access admin pages
  const adminOnlyPaths = ['/user-master', '/system-management', '/group-management'];
  if (Number(user?.user_type) !== 0 && adminOnlyPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box className="app flex flex-col min-h-screen bg-white">
      <Header />
      <Box className="flex flex-1">
        <SideBar />
        <MainContent>{element}</MainContent>
      </Box>
    </Box>
  );
};

export default ProtectedRoute;
