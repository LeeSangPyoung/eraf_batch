import { Box, TextareaAutosize, Typography, styled } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';

const StyledTextarea = styled(TextareaAutosize, {
  shouldForwardProp: (prop) => prop !== 'hasError',
})(({ hasError }) => ({
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: hasError ? '1.5px solid #FF3B30' : '1px solid #E8E8ED',
  borderRadius: '10px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
  resize: 'vertical',
  outline: 'none',
  backgroundColor: '#FFFFFF',
  color: '#1D1D1F',
  transition: 'all 0.2s ease',
  '&::placeholder': {
    color: '#86868B',
  },
  '&:hover': {
    borderColor: hasError ? '#FF3B30' : '#86868B',
  },
  '&:focus': {
    borderColor: hasError ? '#FF3B30' : '#0071E3',
    borderWidth: '2px',
    boxShadow: hasError ? 'none' : '0 0 0 3px rgba(0, 113, 227, 0.1)',
  },
}));

const DisabledTextarea = styled(TextareaAutosize)({
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid transparent',
  borderRadius: '10px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
  resize: 'vertical',
  outline: 'none',
  backgroundColor: '#F5F5F7',
  color: '#86868B',
  cursor: 'default',
});

const BaseTextArea = ({
  control,
  name,
  placeholder,
  content,
  required,
  minRows = 3,
  maxRows = 6,
  className,
  isRawInput,
  ...props
}) => {
  return (
    <Box className={clsx('flex flex-col', className)}>
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
      {!isRawInput ? (
        <Controller
          control={control}
          name={name}
          render={({ field, fieldState: { error } }) => (
            <>
              <StyledTextarea
                {...field}
                aria-label={content || placeholder}
                placeholder={placeholder}
                minRows={minRows}
                maxRows={maxRows}
                hasError={!!error}
                {...props}
              />
              {error && (
                <Typography
                  sx={{
                    marginTop: '6px',
                    marginLeft: '2px',
                    fontSize: '12px',
                    color: '#FF3B30',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  {error.message}
                </Typography>
              )}
            </>
          )}
        />
      ) : (
        <DisabledTextarea
          aria-label={content || placeholder}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          {...props}
        />
      )}
    </Box>
  );
};

export default BaseTextArea;
