import { Checkbox, FormControlLabel, Typography } from '@mui/material';
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
          sx={{
            margin: 0,
            padding: '6px 10px',
            borderRadius: '10px',
            backgroundColor: field.value ? 'rgba(0, 113, 227, 0.06)' : 'transparent',
            border: field.value ? '1px solid rgba(0, 113, 227, 0.2)' : '1px solid #E8E8ED',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: field.value ? 'rgba(0, 113, 227, 0.1)' : '#F5F5F7',
            },
          }}
          control={
            <Checkbox
              sx={{
                padding: '4px',
                marginRight: '6px',
                '& .MuiSvgIcon-root': {
                  fontSize: '20px',
                  color: '#D2D2D7',
                  transition: 'color 0.2s ease',
                },
                '&.Mui-checked .MuiSvgIcon-root': {
                  color: '#0071E3',
                },
                '&:hover .MuiSvgIcon-root': {
                  color: '#86868B',
                },
                '&.Mui-checked:hover .MuiSvgIcon-root': {
                  color: '#0077ED',
                },
              }}
              {...field}
              checked={field.value}
            />
          }
          label={
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: field.value ? '#0071E3' : '#1D1D1F',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                transition: 'color 0.2s ease',
              }}
            >
              {label}
            </Typography>
          }
          {...props}
        />
      )}
    />
  );
};

export default RHFCheckbox;
