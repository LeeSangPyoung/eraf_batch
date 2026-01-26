import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Box, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';
import { scrollbar } from './CustomDateTimePicker';

const CustomTimePicker = ({
  control,
  name,
  required = false,
  label,
  content,
  textStyles,
  height = '50px',
  isBackgroundGray,
  ...props
}) => {
  return (
    <Box className="flex flex-col w-full">
      {content && (
        <Typography
          className={clsx(
            'text-sm font-medium ',
            textStyles ?? 'text-secondaryGray',
          )}
        >
          {content} {required && <span className="text-red-500"> *</span>}
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
              ...scrollbar,
              ...{
                textField: {
                  required: required,
                  error: !!error,
                  helperText: error?.message,
                  sx: {
                    '& .MuiInputBase-root': {
                      height: height,
                      backgroundColor: isBackgroundGray ? '#1C1C1C0D' : 'white',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: error
                          ? '1px solid #d32f2f'
                          : isBackgroundGray
                          ? 'transparent'
                          : '1px solid #E9EAEB',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        border: error
                          ? '1px solid #d32f2f'
                          : isBackgroundGray
                          ? 'transparent'
                          : '1px solid #E9EAEB',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        border: error
                          ? '1px solid #d32f2f'
                          : isBackgroundGray
                          ? 'transparent'
                          : '1px solid #E9EAEB',
                      },
                    },
                  },
                },
              },
              desktopPaper: {
                sx: {
                  '& .MuiList-root': {
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#1C1C1C0D',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#A2A8B3',
                      border: 'none',
                    },
                  },
                  '& .Mui-selected': {
                    backgroundColor: '#FABB18 !important',
                    color: 'white !important',
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
