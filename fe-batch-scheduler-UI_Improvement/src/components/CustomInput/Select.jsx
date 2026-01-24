import React from 'react';
import { Controller } from 'react-hook-form';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import clsx from 'clsx';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
const Selected = ({
  control,
  name,
  options,
  content,
  textStyles,
  valueKey = 'value',
  labelKey = 'label',
  required = false,
  height = '50px',
  ...props
}) => {
  return (
    <Box className='w-full'>
      {content && (
        <Typography
          className={clsx(
            'text-sm font-medium ',
            textStyles ?? 'text-secondaryGray',
          )}
        >
          {content} {required && <span className="text-red-500"> *</span>}
        </Typography>
      )}
      <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { invalid, error } }) => (
        <TextField
          {...field}
          fullWidth
          select
          error={invalid}
          helperText={error ? error?.message : ''}
          sx={{
            '& .MuiInputBase-root': {
              height: height,
              backgroundColor: 'white',
            },
            '& .MuiOutlinedInput-root': {
              '& .MuiOutlinedInput-notchedOutline': {
                border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
              },
            },
          }}
          SelectProps={{
            IconComponent: KeyboardArrowDownIcon,
          }}
          {...props}
        >
          {!required && <MenuItem value="">None</MenuItem>}
          {options?.map((option) => (
            <MenuItem key={option[valueKey]} value={option[valueKey]}>
              {option[labelKey]}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
    </Box>
  );
};

export default Selected;
