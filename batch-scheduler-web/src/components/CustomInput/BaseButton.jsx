import { Button } from '@mui/material';
import clsx from 'clsx';
import React from 'react';

const BaseButton = ({
  children,
  startIcon,
  endIcon,
  disabled = false,
  onClick,
  className = '',
  theme = 'light',
  size = 'medium',
  sx,
  ...props
}) => {
  // Apple style color definitions
  const themes = {
    // Primary - Filled blue button (main CTA)
    primary: {
      backgroundColor: '#0071E3',
      color: '#FFFFFF',
      border: 'none',
      '&:hover': {
        backgroundColor: '#0077ED',
        boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
      },
      '&:active': {
        backgroundColor: '#006ACC',
      },
    },
    // Secondary - Outlined button
    secondary: {
      backgroundColor: 'transparent',
      color: '#0071E3',
      border: '1px solid #D2D2D7',
      '&:hover': {
        backgroundColor: 'rgba(0, 113, 227, 0.04)',
        borderColor: '#0071E3',
      },
      '&:active': {
        backgroundColor: 'rgba(0, 113, 227, 0.08)',
      },
    },
    // Light - White background (legacy support)
    light: {
      backgroundColor: '#FFFFFF',
      color: '#1D1D1F',
      border: '1px solid #D2D2D7',
      '&:hover': {
        backgroundColor: '#F5F5F7',
        borderColor: '#86868B',
      },
      '&:active': {
        backgroundColor: '#E8E8ED',
      },
    },
    // Dark - Dark background button
    dark: {
      backgroundColor: '#1D1D1F',
      color: '#FFFFFF',
      border: 'none',
      '&:hover': {
        backgroundColor: '#2C2C2E',
      },
      '&:active': {
        backgroundColor: '#3A3A3C',
      },
    },
    // Ghost - Text only button
    ghost: {
      backgroundColor: 'transparent',
      color: '#0071E3',
      border: 'none',
      '&:hover': {
        backgroundColor: 'rgba(0, 113, 227, 0.04)',
      },
      '&:active': {
        backgroundColor: 'rgba(0, 113, 227, 0.08)',
      },
    },
    // Danger - Red button for destructive actions
    danger: {
      backgroundColor: '#FF3B30',
      color: '#FFFFFF',
      border: 'none',
      '&:hover': {
        backgroundColor: '#FF453A',
        boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)',
      },
      '&:active': {
        backgroundColor: '#E63329',
      },
    },
  };

  // Size configurations
  const sizes = {
    small: {
      padding: '6px 12px',
      fontSize: '13px',
      minHeight: '32px',
    },
    medium: {
      padding: '8px 16px',
      fontSize: '13px',
      minHeight: '36px',
    },
    large: {
      padding: '14px 28px',
      fontSize: '16px',
      minHeight: '48px',
    },
  };

  const currentTheme = themes[theme] || themes.light;
  const currentSize = sizes[size] || sizes.medium;

  return (
    <Button
      className={clsx(className)}
      disabled={disabled}
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        ...currentTheme,
        ...currentSize,
        fontWeight: 500,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        borderRadius: '12px',
        boxShadow: 'none',
        textTransform: 'none',
        whiteSpace: 'nowrap',
        minWidth: 'max-content',
        transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
        letterSpacing: '-0.01em',
        '&.Mui-disabled': {
          backgroundColor: '#F5F5F7',
          color: '#86868B',
          border: '1px solid #E8E8ED',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default BaseButton;
