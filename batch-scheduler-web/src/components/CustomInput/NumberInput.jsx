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
  height = '36px',
  sx,
  ...props
}) => {
  return (
    <Box className={clsx('w-full flex flex-col gap-1', className)}>
      {content && (
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1D1D1F',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            marginBottom: '4px',
          }}
        >
          {content} {required && <span style={{ color: '#FF3B30' }}> *</span>}
        </Typography>
      )}
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
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                transition: 'all 0.2s ease',
              },
              '& .MuiInputBase-input': {
                height: '100%',
                padding: '0 14px',
                fontSize: '14px',
                color: '#1D1D1F',
                '&::placeholder': {
                  color: '#86868B',
                  opacity: 1,
                },
                // Hide spinner buttons for cleaner look
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '&[type=number]': {
                  MozAppearance: 'textfield',
                },
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1.5px solid #FF3B30' : '1px solid #E8E8ED',
                  transition: 'all 0.2s ease',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1.5px solid #FF3B30' : '1px solid #86868B',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1.5px solid #FF3B30' : '2px solid #0071E3',
                  boxShadow: error ? 'none' : '0 0 0 3px rgba(0, 113, 227, 0.1)',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#F5F5F7',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid #E8E8ED',
                  },
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
              ...sx,
            }}
            {...props}
          />
        )}
      />
    </Box>
  );
};
