import { Box, MenuItem, Select } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../hook/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';

import BaseButton from '../CustomInput/BaseButton';

const languages = {
  en: { nativeName: 'English', flag: '🇺🇸' },
  kor: { nativeName: '한국어', flag: '🇰🇷' },
};

const Header = () => {
  const { i18n } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid #D2D2D7',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Box
        onClick={() => navigate('/job-status')}
        sx={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'opacity 0.2s ease',
          '&:hover': {
            opacity: 0.7,
          },
        }}
      >
        <span
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#0071E3',
            letterSpacing: '-0.02em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          ERAF
        </span>
        <span
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#1D1D1F',
            letterSpacing: '-0.02em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          Scheduler
        </span>
      </Box>

      {/* Right side controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* User Info */}
        {user && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              backgroundColor: '#F5F5F7',
              borderRadius: '10px',
            }}
          >
            <Box
              sx={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#0071E3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              }}
            >
              {user.user_id?.charAt(0)?.toUpperCase() || 'U'}
            </Box>
            <Box>
              <Box
                sx={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  lineHeight: 1.2,
                }}
              >
                {user.user_id}
              </Box>
              <Box
                sx={{
                  fontSize: '11px',
                  color: '#86868B',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  lineHeight: 1.2,
                }}
              >
                {user.user_type === 0 ? 'Admin' : 'User'}
              </Box>
            </Box>
          </Box>
        )}

        {/* Language Selector */}
        <Select
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          value={i18n.language}
          size="small"
          startAdornment={
            <LanguageOutlined
              sx={{
                mr: 1,
                color: '#86868B',
                fontSize: '20px',
              }}
            />
          }
          sx={{
            minWidth: '120px',
            height: '36px',
            backgroundColor: '#F5F5F7',
            borderRadius: '10px',
            border: 'none',
            fontSize: '14px',
            fontWeight: 500,
            color: '#1D1D1F',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            transition: 'all 0.2s ease',
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            '& .MuiSelect-select': {
              paddingLeft: '8px',
              paddingRight: '32px !important',
            },
            '&:hover': {
              backgroundColor: '#E8E8ED',
            },
            '& .MuiSvgIcon-root': {
              color: '#86868B',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                marginTop: '8px',
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
                border: '1px solid #E8E8ED',
                '& .MuiList-root': {
                  padding: '6px',
                },
              },
            },
          }}
        >
          {Object.keys(languages).map((lng) => (
            <MenuItem
              key={lng}
              value={lng}
              sx={{
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 12px',
                margin: '2px 0',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                  backgroundColor: '#F5F5F7',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 113, 227, 0.08)',
                  color: '#0071E3',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 113, 227, 0.12)',
                  },
                },
              }}
            >
              <span style={{ marginRight: '8px' }}>{languages[lng].flag}</span>
              {languages[lng].nativeName}
            </MenuItem>
          ))}
        </Select>

        {/* Logout Button */}
        <BaseButton
          theme="ghost"
          size="small"
          onClick={() => logout()}
          startIcon={<LogoutOutlined sx={{ fontSize: '18px' }} />}
          sx={{
            color: '#86868B',
            '&:hover': {
              color: '#FF3B30',
              backgroundColor: 'rgba(255, 59, 48, 0.08)',
            },
          }}
        >
          Logout
        </BaseButton>
      </Box>
    </header>
  );
};

export default Header;
