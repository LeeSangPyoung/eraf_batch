import { Box } from '@mui/material';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import SideBar from './components/SideBar/SideBar';
import MainContent from './components/MainContent/MainContent';
import useAuthStore from './hook/store/useAuthStore';

const ProtectedRoute = ({ element }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  if (user?.user_type !== 0 && location.pathname === '/user-master') {
    return <Navigate to="/" replace />;
  }

  // if (user?.user_type !== 0 && location.pathname === '/workflows') {
  //   return <Navigate to="/" replace />;
  // }

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
