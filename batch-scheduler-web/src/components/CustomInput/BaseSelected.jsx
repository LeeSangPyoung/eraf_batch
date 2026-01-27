import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { Controller } from 'react-hook-form';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const BaseSelected = ({
  control,
  name,
  options,
  getOptionLabel,
  getOptionKey,
  isOptionEqualToValue,
  label,
  content,
  textStyles,
  required,
  inputValue,
  onInputChange,
  onChange,
  ListboxProps,
  isDisablePortal = true,
  height = '36px',
  ...props
}) => {
  return (
    <Box className="flex flex-col w-full">
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
        name={name}
        control={control}
        render={({ field, fieldState }) => (
          <Autocomplete
            size="small"
            disablePortal={isDisablePortal}
            options={options}
            getOptionLabel={getOptionLabel}
            getOptionKey={getOptionKey}
            value={field.value || null}
            isOptionEqualToValue={isOptionEqualToValue}
            inputValue={inputValue}
            onChange={(event, newValue) => {
              field.onChange(newValue);
              if (onChange) {
                onChange(event, newValue);
              }
            }}
            onInputChange={onInputChange}
            renderInput={(params) => (
              <TextField
                {...params}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                label={label}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: '#FFFFFF',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    transition: 'all 0.2s ease',
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1.5px solid #FF3B30'
                        : '1px solid #E8E8ED',
                      transition: 'all 0.2s ease',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1.5px solid #FF3B30'
                        : '1px solid #86868B',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1.5px solid #FF3B30'
                        : '2px solid #0071E3',
                      boxShadow: fieldState.error ? 'none' : '0 0 0 3px rgba(0, 113, 227, 0.1)',
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
                }}
                InputProps={{
                  ...params.InputProps,
                  sx: {
                    height: height,
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                    color: '#1D1D1F',
                  },
                }}
              />
            )}
            fullWidth
            ListboxProps={{
              ...ListboxProps,
              sx: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '14px',
                '& .MuiAutocomplete-option': {
                  padding: '10px 14px',
                  '&:hover': {
                    backgroundColor: '#F5F5F7',
                  },
                  '&[aria-selected="true"]': {
                    backgroundColor: 'rgba(0, 113, 227, 0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 113, 227, 0.12)',
                    },
                  },
                },
              },
            }}
            {...props}
            popupIcon={
              <KeyboardArrowDownIcon
                sx={{
                  color: '#86868B',
                  fontSize: '20px',
                  transition: 'transform 0.2s ease',
                }}
              />
            }
          />
        )}
      />
    </Box>
  );
};

export default BaseSelected;
