import React from 'react';
import { Controller } from 'react-hook-form';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
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
  height = '36px',
  ...props
}) => {
  return (
    <Box sx={{ width: '100%' }}>
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
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              },
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: error ? '2px solid #FF3B30' : '1px solid #D2D2D7',
                  borderRadius: '12px',
                  transition: 'border-color 0.2s ease',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: error ? '#FF3B30' : '#86868B',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '2px solid #FF3B30' : '2px solid #0071E3',
                },
              },
              '& .MuiSelect-select': {
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
              },
              '& .MuiFormHelperText-root': {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '12px',
                marginTop: '6px',
                marginLeft: '4px',
              },
            }}
            SelectProps={{
              IconComponent: KeyboardArrowDownIcon,
              MenuProps: {
                PaperProps: {
                  sx: {
                    marginTop: '8px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #E8E8ED',
                    '& .MuiList-root': {
                      padding: '6px',
                    },
                    '& .MuiMenuItem-root': {
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '10px 12px',
                      margin: '2px 0',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        backgroundColor: '#F5F5F7',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(0, 113, 227, 0.08)',
                        color: '#0071E3',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 113, 227, 0.12)',
                        },
                      },
                    },
                  },
                },
              },
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
