import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../hook/store/useAuthStore';
import useModal from '../../hook/useModal';
import MyInfo from '../Dialog/MyInfo';

// Dashboard
const dashboardLink = { to: '/dashboard', text: 'dashboard-label', icon: '/icons/dashboard.svg' };

// Section 1: Job & Workflow
const jobLinks = [
  { to: '/job-status', text: 'job-status-label', icon: '/icons/Vector.svg' },
  {
    to: '/job-results',
    text: 'job-result-label',
    icon: '/icons/ChartPieSlice-d.svg',
  },
  { to: '/workflows', text: 'workflow-label', icon: '/icons/work flow.svg' },
  {
    to: '/workflow-runs',
    text: 'workflow-run-label',
    icon: '/icons/LineSegments.svg',
  },
];

// Section 2: Management
const managementLinks = [
  {
    to: '/system-management',
    text: 'system-management-label',
    icon: '/icons/ComputerTower.svg',
  },
  {
    to: '/group-management',
    text: 'group-management-label',
    icon: '/icons/Folder.svg',
  },
];

const SideBar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { isVisible, openModal, closeModal } = useModal();

  const isActive = (path) => location.pathname === path;

  const linkStyles = {
    base: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 16px',
      borderRadius: '10px',
      fontSize: '14px',
      fontWeight: 500,
      color: '#1D1D1F',
      textDecoration: 'none',
      transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
      letterSpacing: '-0.01em',
      '&:hover': {
        backgroundColor: 'rgba(0, 113, 227, 0.06)',
      },
    },
    active: {
      backgroundColor: 'rgba(0, 113, 227, 0.1)',
      color: '#0071E3',
    },
  };

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E8E8ED',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
      }}
    >
      <Box sx={{ flex: 1 }}>
        {/* Section Label */}
        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '8px 16px',
            marginBottom: '4px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          Menu
        </Typography>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Dashboard */}
          <Link
            to={dashboardLink.to}
            style={{
              ...linkStyles.base,
              ...(isActive(dashboardLink.to) ? linkStyles.active : {}),
            }}
          >
            <Box
              sx={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isActive(dashboardLink.to) ? 1 : 0.7,
              }}
            >
              <img
                src={dashboardLink.icon}
                alt=""
                style={{
                  width: '20px',
                  height: '20px',
                  filter: isActive(dashboardLink.to)
                    ? 'invert(27%) sepia(95%) saturate(1790%) hue-rotate(199deg) brightness(97%) contrast(101%)'
                    : 'none',
                }}
              />
            </Box>
            <span>{t(dashboardLink.text)}</span>
          </Link>

          {/* Divider */}
          <Box
            sx={{
              height: '1px',
              backgroundColor: '#E8E8ED',
              margin: '8px 16px',
              opacity: 0.6,
            }}
          />

          {/* Section 1: Job & Workflow */}
          {jobLinks.map((link) => (
            <Link
              key={link.text}
              to={link.to}
              style={{
                ...linkStyles.base,
                ...(isActive(link.to) ? linkStyles.active : {}),
              }}
            >
              <Box
                sx={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive(link.to) ? 1 : 0.7,
                }}
              >
                <img
                  src={link.icon}
                  alt=""
                  style={{
                    width: '20px',
                    height: '20px',
                    filter: isActive(link.to)
                      ? 'invert(27%) sepia(95%) saturate(1790%) hue-rotate(199deg) brightness(97%) contrast(101%)'
                      : 'none',
                  }}
                />
              </Box>
              <span>{t(link.text)}</span>
            </Link>
          ))}

          {/* Divider */}
          <Box
            sx={{
              height: '1px',
              backgroundColor: '#E8E8ED',
              margin: '8px 16px',
              opacity: 0.6,
            }}
          />

          {/* Section 2: Management */}
          {managementLinks.map((link) => (
            <Link
              key={link.text}
              to={link.to}
              style={{
                ...linkStyles.base,
                ...(isActive(link.to) ? linkStyles.active : {}),
              }}
            >
              <Box
                sx={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive(link.to) ? 1 : 0.7,
                }}
              >
                <img
                  src={link.icon}
                  alt=""
                  style={{
                    width: '20px',
                    height: '20px',
                    filter: isActive(link.to)
                      ? 'invert(27%) sepia(95%) saturate(1790%) hue-rotate(199deg) brightness(97%) contrast(101%)'
                      : 'none',
                  }}
                />
              </Box>
              <span>{t(link.text)}</span>
            </Link>
          ))}

          {/* Admin Only - User Master */}
          {user?.user_type === 0 && (
            <Link
              to="/user-master"
              style={{
                ...linkStyles.base,
                ...(isActive('/user-master') ? linkStyles.active : {}),
              }}
            >
              <Box
                sx={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive('/user-master') ? 1 : 0.7,
                }}
              >
                <img
                  src="/icons/UsersThree.svg"
                  alt=""
                  style={{
                    width: '20px',
                    height: '20px',
                    filter: isActive('/user-master')
                      ? 'invert(27%) sepia(95%) saturate(1790%) hue-rotate(199deg) brightness(97%) contrast(101%)'
                      : 'none',
                  }}
                />
              </Box>
              <span>{t('user-master-label')}</span>
            </Link>
          )}
        </nav>
      </Box>

      {/* My Info Section - Bottom */}
      <Box sx={{ marginTop: 'auto' }}>
        {/* Divider */}
        <Box
          sx={{
            height: '1px',
            backgroundColor: '#E8E8ED',
            margin: '0 16px 12px 16px',
            opacity: 0.6,
          }}
        />
        <Box
          onClick={openModal}
          sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          '&:hover': {
            backgroundColor: '#F5F5F7',
          },
        }}
      >
        <Box
          sx={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#0071E3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BadgeOutlined sx={{ color: '#FFFFFF', fontSize: '20px' }} />
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1D1D1F',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            My Info
          </Typography>
          <Typography
            sx={{
              fontSize: '12px',
              color: '#86868B',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            {user?.user_id || 'Account'}
          </Typography>
        </Box>
        </Box>
      </Box>

      {isVisible && <MyInfo onClose={closeModal} open={isVisible} />}
    </aside>
  );
};

export default SideBar;
