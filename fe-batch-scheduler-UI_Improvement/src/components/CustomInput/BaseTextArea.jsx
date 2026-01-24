import { Box, TextareaAutosize, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';

const BaseTextArea = ({
  control,
  name,
  placeholder,
  content,
  textStyles,
  required,
  minRows = 3,
  maxRows = 6,
  height = '50px',
  style = {},
  className,
  isRawInput,
  ...props
}) => {
  return (
    <Box className={clsx('flex flex-col', className)}>
      <Typography
        className={clsx(
          'text-sm font-medium ',
          textStyles ?? 'text-secondaryGray',
        )}
      >
        {content} {required && <span className="text-red-500"> *</span>}
      </Typography>
      {!isRawInput ? (
        <Controller
          control={control}
          name={name}
          render={({ field, fieldState: { error } }) => (
            <>
              <TextareaAutosize
                {...field}
                aria-label={content || placeholder}
                placeholder={placeholder}
                minRows={minRows}
                maxRows={maxRows}
                style={{
                  width: '100%',
                  minHeight: height,
                  padding: '8px',
                  fontSize: '0.875rem',
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                  borderRadius: '4px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  backgroundColor: 'white',
                  '&:focus': {
                    borderColor: error ? '#d32f2f' : '#1976d2',
                  },
                  ...style,
                }}
                {...props}
              />
              {error && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, fontSize: '0.75rem' }}
                >
                  {error.message}
                </Typography>
              )}
            </>
          )}
        />
      ) : (
        <TextareaAutosize
          aria-label={content || placeholder}
          placeholder={placeholder}
          minRows={minRows}
          maxRows={maxRows}
          style={{
            width: '100%',
            minHeight: height,
            padding: '8px',
            fontSize: '0.875rem',
            border: '1px solid #E9EAEB',
            borderRadius: '4px',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
            backgroundColor: '#1C1C1C0D',
            color: 'gray',
            '&:focus': {
              borderColor: '#1C1C1C0D',
            },
            ...style,
          }}
          {...props}
        />
      )}
    </Box>
  );
};

export default BaseTextArea;
