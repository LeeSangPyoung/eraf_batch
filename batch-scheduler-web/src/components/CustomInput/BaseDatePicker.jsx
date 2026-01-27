import { Box, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import React from 'react';

const BaseDatePicker = ({
  content,
  value,
  onChange,
  format = 'YYYY/MM/DD HH:mm',
  ampm = false,
  size = 'small',
  className = '',
  ...props
}) => {
  return (
    <Box className={className}>
      <Typography
        sx={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#86868B',
          marginBottom: '6px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        }}
      >
        {content}
      </Typography>
      <DateTimePicker
        className="w-full"
        ampm={ampm}
        format={format}
        value={value}
        onChange={onChange}
        slotProps={{
          textField: {
            size: size,
            sx: {
              '& .MuiInputBase-root': {
                height: '40px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              },
              '& .MuiOutlinedInput-root': {
                '& .MuiOutlinedInput-notchedOutline': {
                  border: '1px solid #D2D2D7',
                  borderRadius: '10px',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#86868B',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: '2px solid #0071E3',
                },
              },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': {
                color: '#86868B',
                fontSize: '20px',
              },
            },
          },
          desktopPaper: {
            sx: {
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E8E8ED',
              marginTop: '8px',
              '& .MuiList-root': {
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#F5F5F7',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#C7C7CC',
                  borderRadius: '3px',
                },
              },
              '& .Mui-selected': {
                backgroundColor: '#0071E3 !important',
                color: 'white !important',
              },
              '& .MuiPickersDay-root': {
                borderRadius: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                '&:hover': {
                  backgroundColor: 'rgba(0, 113, 227, 0.08)',
                },
              },
              '& .MuiPickersLayout-actionBar': {
                display: 'none',
              },
            },
          },
        }}
        sx={{
          backgroundColor: 'transparent',
        }}
        {...props}
      />
    </Box>
  );
};

export default BaseDatePicker;
