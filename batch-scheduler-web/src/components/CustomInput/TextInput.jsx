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
  height = '50px',
  isBackgroundGray,
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
            id={name}
            label={label}
            fullWidth
            error={!!error}
            helperText={error?.message}
            placeholder={placeholder}
            sx={{
              '& .MuiInputBase-root': {
                height: height,
                padding: '0 6px',
                minHeight: '30px',
                borderRadius: 0,
                backgroundColor: isBackgroundGray ? '#1C1C1C0D' : 'white',
              },
              '& .MuiInputBase-input': {
                height: '30px',
                padding: '0 8px',
                fontSize: '0.875rem',
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,

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
