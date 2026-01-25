import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { Controller } from 'react-hook-form';

const CustomDateTimePicker = ({
  control,
  name,
  required = false,
  label,
  content,
  height = '36px',
  isBackgroundGray,
  ...props
}) => {
  return (
    <Box className="flex flex-col w-full">
      {content && (
        <Typography
          sx={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#1D1D1F',
            marginBottom: '4px',
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
          <DateTimePicker
            {...field}
            {...props}
            format="YYYY/MM/DD HH:mm"
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
                  '& .MuiPickersCalendarHeader-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  },
                  '& .MuiDayCalendar-weekDayLabel': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    color: '#86868B',
                    fontWeight: 500,
                  },
                  '& .MuiPickersDay-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    borderRadius: '8px',
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
                    '&.MuiPickersDay-today': {
                      border: '1px solid #0071E3',
                    },
                  },
                  '& .MuiMultiSectionDigitalClock-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  },
                  '& .MuiMenuItem-root': {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    borderRadius: '6px',
                    margin: '2px 4px',
                    '&.Mui-selected': {
                      backgroundColor: '#0071E3 !important',
                      color: '#FFFFFF !important',
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

export default CustomDateTimePicker;
