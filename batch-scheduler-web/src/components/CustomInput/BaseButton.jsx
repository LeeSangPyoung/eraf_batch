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
  sx,
  ...props
}) => {
  return (
    <Button
      className={clsx(className, 'py-1.5 px-3')}
      disabled={disabled}
      onClick={onClick}
      startIcon={startIcon}
      endIcon={endIcon}
      sx={{
        ...(theme === 'light' && {
          backgroundColor: 'white',
          color: 'black',
          fontWeight: '500',
          border: '1px solid #E9EAEB',
          boxShadow: 'none',
          borderRadius: '10px'
        }),
        ...(theme === 'dark' && {
          backgroundColor: 'black',
          color: 'white',
          borderRadius: '10px',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: 'black',
          },
        }),
        ...sx,
        whiteSpace: 'nowrap',
        minWidth: 'max-content',
        textTransform: 'none',
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default BaseButton;
