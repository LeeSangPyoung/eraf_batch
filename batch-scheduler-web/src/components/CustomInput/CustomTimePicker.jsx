import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { Controller } from 'react-hook-form';

const CustomTimePicker = ({
  control,
  name,
  required = false,
  label,
  content,
  height = '44px',
  isBackgroundGray,
  ...props
}) => {
  return (
    <Box className="flex flex-col w-full">
      {content && (
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1D1D1F',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          {content} {required && <span style={{ color: '#FF3B30' }}> *</span>}
        </Typography>
      )}
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState: { error } }) => (
          <TimePicker
            {...field}
            {...props}
            format="HH:mm"
            timeSteps={{ minutes: 1 }}
            ampm={false}
            label={label}
            slotProps={{
              textField: {
                required: required,
                error: !!error,
                helperText: error?.message,
                sx: {
                  '& .MuiInputBase-root': {
                    height: height,
                    borderRadius: '10px',
                    backgroundColor: isBackgroundGray ? '#F5F5F7' : '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    transition: 'all 0.2s ease',
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '14px',
                    color: '#1D1D1F',
                    padding: '0 14px',
                  },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: error
                        ? '1.5px solid #FF3B30'
                        : isBackgroundGray
                        ? '1px solid transparent'
                        : '1px solid #E8E8ED',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      border: error
                        ? '1.5px solid #FF3B30'
                        : '1px solid #86868B',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: error
                        ? '1.5px solid #FF3B30'
                        : '2px solid #0071E3',
                      boxShadow: error ? 'none' : '0 0 0 3px rgba(0, 113, 227, 0.1)',
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    marginLeft: '2px',
                    marginTop: '6px',
                    fontSize: '12px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    '&.Mui-error': {
                      color: '#FF3B30',
                    },
                  },
                },
              },
              openPickerButton: {
                sx: {
                  color: '#86868B',
                  '&:hover': {
                    color: '#0071E3',
                    backgroundColor: 'rgba(0, 113, 227, 0.06)',
                  },
                },
              },
              desktopPaper: {
                sx: {
                  borderRadius: '14px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '1px solid #E8E8ED',
                  '& .MuiList-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#F5F5F7',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#C7C7CC',
                      borderRadius: '3px',
                      '&:hover': {
                        background: '#86868B',
                      },
                    },
                  },
                  '& .MuiMenuItem-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: '#F5F5F7',
                    },
                    '&.Mui-selected': {
                      backgroundColor: '#0071E3 !important',
                      color: '#FFFFFF !important',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: '#0077ED !important',
                      },
                    },
                  },
                  '& .MuiPickersLayout-actionBar': {
                    display: 'none',
                  },
                },
              },
            }}
          />
        )}
      />
    </Box>
  );
};

export default CustomTimePicker;
