import { Checkbox, FormControlLabel } from '@mui/material';
import React from 'react';
import { Controller } from 'react-hook-form';

const RHFCheckbox = ({ control, name, label, ...props }) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          id={name}
          control={
            <Checkbox
              sx={{
                '& .MuiSvgIcon-root': {
                  color: '#E9EAEB',
                },
                '&.Mui-checked .MuiSvgIcon-root': {
                  color: '#FABB18',
                },
              }}
              {...field}
              checked={field.value}
            />
          }
          label={label}
          {...props}
        />
      )}
    />
  );
};

export default RHFCheckbox;
