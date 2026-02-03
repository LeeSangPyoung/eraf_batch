import styled from '@emotion/styled';
import { Box, TextField, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';

const TextInput = ({
  control,
  name,
  label,
  placeholder,
  sx,
  content,
  textStyles,
  required,
  className,
  height = '36px',
  isBackgroundGray,
  ...props
}) => {
  return (
    <Box className={clsx('w-full flex flex-col', className)}>
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
          <TextField
            {...field}
            id={name}
            label={label}
            fullWidth
            error={!!error}
            helperText={error?.message}
            placeholder={placeholder}
            sx={{
              '& .MuiInputBase-root': {
                height: height,
                padding: '0 4px',
                minHeight: '36px',
                borderRadius: '12px',
                backgroundColor: isBackgroundGray ? '#F5F5F7' : '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              },
              '& .MuiInputBase-input': {
                padding: '0 12px',
                fontSize: '14px',
                '&::placeholder': {
                  color: '#86868B',
                  opacity: 1,
                },
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: error
                    ? '2px solid #FF3B30'
                    : isBackgroundGray
                    ? '1px solid transparent'
                    : '1px solid #D2D2D7',
                  transition: 'border-color 0.2s ease',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: error ? '#FF3B30' : '#86868B',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '2px solid #FF3B30' : '2px solid #0071E3',
                },
              },
              '& .MuiFormHelperText-root': {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '12px',
                marginTop: '6px',
                marginLeft: '4px',
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

export const BrightTextField = styled(TextField)(({ children }) => ({
  filter: 'brightness(1)',
}));

export default TextInput;
