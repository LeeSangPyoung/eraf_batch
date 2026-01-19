import { Box, TextField, Typography } from '@mui/material';
import React from 'react';

const SearchTextField = ({ sx, InputProps, content, ...props }) => {
  return (
    <>
      <Box className='w-full'>
        <Typography className="text-secondaryGray text-sm font-medium ">
          {content}
        </Typography>
        <TextField
          {...props}
          className="w-full"
          sx={{
            '& .MuiInputBase-root': {
              height: '35px',
              minHeight: '30px',
              borderRadius: 0,
              backgroundColor: 'white',
            },
            '& .MuiInputBase-input': {
              height: '30px',
              padding: '0 8px',
              fontSize: '0.875rem',
            },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              border: 'transparent',
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
            ...sx,
          }}
          InputProps={{
            ...InputProps,
            sx: {
              height: '35px',
              minHeight: '30px',
              ...InputProps?.sx,
            },
          }}
        />
      </Box>
    </>
  );
};

export default SearchTextField;
