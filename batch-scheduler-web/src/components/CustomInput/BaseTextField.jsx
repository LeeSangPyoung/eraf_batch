import { Box, TextField, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';

const BaseTextField = ({
  sx,
  InputProps,
  content,
  textStyles,
  className,
  required,
  height = '36px',
  isBackgroundGray,
  ...props
}) => {
  return (
    <Box className={clsx('w-full', className)}>
      {content && (
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#1D1D1F',
            marginBottom: '4px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            letterSpacing: '-0.01em',
          }}
          className={clsx(textStyles)}
        >
          {content} {required && <span style={{ color: '#FF3B30' }}>*</span>}
        </Typography>
      )}
      <TextField
        {...props}
        className={clsx('w-full')}
        sx={{
          '& .MuiInputBase-root': {
            height: height,
            minHeight: '36px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#86868B',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0071E3',
                borderWidth: '2px',
              },
              boxShadow: '0 0 0 4px rgba(0, 113, 227, 0.1)',
            },
          },
          '& .MuiInputBase-input': {
            padding: '8px 12px',
            fontSize: '14px',
            color: '#1D1D1F',
            letterSpacing: '-0.01em',
            '&::placeholder': {
              color: '#86868B',
              opacity: 1,
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isBackgroundGray ? 'transparent' : '#D2D2D7',
              transition: 'all 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            },
          },
          '& .Mui-disabled': {
            backgroundColor: '#F5F5F7',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isBackgroundGray ? 'transparent' : '#D2D2D7',
            },
          },
          ...sx,
        }}
        InputProps={{
          ...InputProps,
          sx: {
            ...InputProps?.sx,
          },
        }}
      />
    </Box>
  );
};

export default BaseTextField;
