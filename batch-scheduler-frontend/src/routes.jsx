import React, { lazy, Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import ProtectedRoute from './layout';

const LoadingComponent = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
     className="bg-white"
  >
    <CircularProgress />
  </Box>
);

const Dashboard = lazy(() => import('./pages/Dashboard/index'));
const JobStatus = lazy(() => import('./pages/JobStatus/JobStatus'));
const JobResult = lazy(() => import('./pages/JobResult/JobResult'));
const Users = lazy(() => import('./pages/Users/index'));
const SignIn = lazy(() => import('./pages/SignIn/index'));
const ChangePassword = lazy(() => import('./pages/ChangePassword/index'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage/index'));
const Workflow = lazy(() => import('./pages/Workflow/Workflow'));
const WorkflowRun = lazy(() => import('./pages/WorkflowRun/WorkflowRun'));
const SystemManagement = lazy(() => import('./pages/SystemManagement/index'));
const GroupManagement = lazy(() => import('./pages/GroupManagement/index'));

const Routes = () => {
  const routes = useRoutes([
    {
      path: '/dashboard',
      element: <ProtectedRoute element={<Dashboard />} />,
    },
    {
      path: '/job-status',
      element: <ProtectedRoute element={<JobStatus />} />,
    },
    {
      path: '/job-results',
      element:  <ProtectedRoute element={<JobResult />} />,
    },
    {
      path: '/user-master',
      element: <ProtectedRoute element={<Users />} />,
    },
    {
      path: '/workflows',
      element: <ProtectedRoute element={<Workflow />} />,
    },
    {
      path: '/workflow-runs',
      element:  <ProtectedRoute element={<WorkflowRun />} />,
    },
    {
      path: '/system-management',
      element: <ProtectedRoute element={<SystemManagement />} />,
    },
    {
      path: '/group-management',
      element: <ProtectedRoute element={<GroupManagement />} />,
    },
    { path: '/sign-in', element: <SignIn /> },
    { path: '/change-password', element: <ChangePassword /> },
    { path: '/', element: <Navigate to="/dashboard" replace /> },
    { path: '*', element: <NotFoundPage /> },
  ]);

  return <Suspense fallback={<LoadingComponent />}>{routes}</Suspense>;
};

export default Routes;
