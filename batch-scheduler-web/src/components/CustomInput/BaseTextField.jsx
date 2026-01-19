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
  height = '50px',
  ...props
}) => {
  return (
    <>
      <Box className={clsx('w-full', className)}>
        <Typography
          className={clsx(
            'text-sm font-medium',
            textStyles ?? 'text-secondaryGray',
          )}
        >
          {content} {required && <span className="text-red-500">*</span>}
        </Typography>
        <TextField
          {...props}
          className={clsx('w-full', className)}
          sx={{
            '& .MuiInputBase-root': {
              height: height,
              minHeight: '30px',
              borderRadius: 0,
              border: 'transparent',
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
                border: 'transparent',
              },
            },
            ...sx,
          }}
          InputProps={{
            ...InputProps,
            className: className,
            sx: {
              height: '30px',
              minHeight: '30px',
              ...InputProps?.sx,
            },
          }}
        />
      </Box>
    </>
  );
};

export default BaseTextField;
