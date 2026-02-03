import { Box, TextField, Typography } from '@mui/material';
import React from 'react';

const SearchTextField = ({ sx, InputProps, content, ...props }) => {
  return (
    <Box sx={{ width: '100%' }}>
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
      <TextField
        {...props}
        className="w-full"
        sx={{
          '& .MuiInputBase-root': {
            height: '40px',
            minHeight: '40px',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          },
          '& .MuiInputBase-input': {
            height: '40px',
            padding: '0 12px',
            fontSize: '14px',
            '&::placeholder': {
              color: '#86868B',
              opacity: 1,
            },
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: '10px',
            '& .MuiOutlinedInput-notchedOutline': {
              border: '1px solid #D2D2D7',
              transition: 'border-color 0.2s ease',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#86868B',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              border: '2px solid #0071E3',
            },
          },
          ...sx,
        }}
        InputProps={{
          ...InputProps,
          sx: {
            height: '40px',
            minHeight: '40px',
            ...InputProps?.sx,
          },
        }}
      />
    </Box>
  );
};

export default SearchTextField;
