import { Box, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import React from 'react';
import { scrollbar } from './CustomDateTimePicker';

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
      <Typography className="text-secondaryGray text-sm font-medium">
        {content}
      </Typography>
      <DateTimePicker
        className="w-full"
        ampm={ampm}
        format={format}
        value={value}
        onChange={onChange}
        slotProps={{
          ...scrollbar,
          ...{
            textField: {
              size: size,
              sx: {
                '& .MuiInputBase-root': {
                  height: '35px',
                  backgroundColor: 'white',
                },
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid #E9EAEB',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid #E9EAEB',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid #E9EAEB',
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
        sx={{
          backgroundColor: 'white',
        }}
        {...props}
      />
    </Box>
  );
};

export default BaseDatePicker;
