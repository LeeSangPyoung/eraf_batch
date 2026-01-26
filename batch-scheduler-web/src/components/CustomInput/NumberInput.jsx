import { Box, TextField, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';

export const NumberInput = ({ 
  control, 
  name, 
  content,
  textStyles,
  required,
  className,
  height = '50px',
  sx,
  ...props 
}) => {
  return (
    <Box className={clsx('w-full flex flex-col', className)}>
      <Typography
        className={clsx(
          'text-sm font-medium ',
          textStyles ?? 'text-secondaryGray',
        )}
      >
        {content} {required && <span className="text-red-500"> *</span>}
      </Typography>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            type="number"
            // @ts-ignore
            onWheel={(event) => event.target.blur()}
            InputProps={{ min: '0' }}
            onFocus={(event) => {
              event.target.select();
            }}
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              field.onChange(isNaN(value) ? 0 : value);
            }}
            id={name}
            error={!!error}
            helperText={error?.message}
            sx={{
              '& .MuiInputBase-root': {
                height: height,
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

                '& .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                  border: '1px solid #E9EAEB',
                },
              },
              ...sx,
            }}
            {...props}
          />
        )}
      />
    </Box>
  );
};
