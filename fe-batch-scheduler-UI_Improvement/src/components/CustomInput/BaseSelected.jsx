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
  height = '50px',
  ...props
}) => {
  return (
    <Box className="flex flex-col w-full">
      <Typography
        className={clsx(
          'text-sm font-medium leading-normal tracking-normal',
          textStyles ?? 'text-secondaryGray',
        )}
      >
        {content} {required && <span className="text-red-500"> *</span>}
      </Typography>
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
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1px solid #d32f2f'
                        : '1px solid #E9EAEB',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1px solid #d32f2f'
                        : '1px solid #E9EAEB',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: fieldState.error
                        ? '1px solid #d32f2f'
                        : '1px solid #E9EAEB',
                    },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  sx: {
                    height: height,
                    alignItems: 'center',
                    backgroundColor: 'white',
                  },
                }}
              />
            )}
            fullWidth
            ListboxProps={ListboxProps}
            {...props}
            popupIcon={<KeyboardArrowDownIcon />}
          />
        )}
      />
    </Box>
  );
};

export default BaseSelected;
