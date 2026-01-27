import {
  Box,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Typography,
} from '@mui/material';
import React from 'react';
import { Controller } from 'react-hook-form';
import useShowPassword from '../../hook/useShowPassword';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const CustomPwInput = ({
  control,
  name,
  label,
  placeholder,
  height = '44px',
  isBackgroundGray,
  content,
  textStyles,
  required,
  ...props
}) => {
  const {
    isVisible,
    toggleVisibilityPw,
    handleMouseDownPassword,
    handleMouseUpPassword,
  } = useShowPassword();

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {content && (
        <Typography
          sx={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1D1D1F',
            marginBottom: '8px',
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
          <FormControl sx={{ width: '100%' }}>
            {label && (
              <InputLabel error={!!error} required htmlFor={name}>
                {label}
              </InputLabel>
            )}
            <OutlinedInput
              id={name}
              label={label}
              placeholder={placeholder}
              type={isVisible ? 'text' : 'password'}
              sx={{
                '& input[type="password"]::-ms-reveal': { display: 'none' },
                '& input[type="password"]::-ms-clear': { display: 'none' },
                height: height,
                borderRadius: '12px',
                backgroundColor: isBackgroundGray ? '#F5F5F7' : '#FFFFFF',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '15px',
                transition: 'all 0.2s ease',
                '& .MuiOutlinedInput-notchedOutline': {
                  border: error
                    ? '2px solid #FF3B30'
                    : isBackgroundGray
                    ? '1px solid transparent'
                    : '1px solid #D2D2D7',
                  borderRadius: '12px',
                  transition: 'border-color 0.2s ease',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: error ? '#FF3B30' : '#86868B',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '2px solid #FF3B30' : '2px solid #0071E3',
                },
                '& .MuiInputBase-input': {
                  padding: '0 12px',
                  '&::placeholder': {
                    color: '#86868B',
                    opacity: 1,
                  },
                },
              }}
              {...field}
              {...props}
              error={!!error}
              endAdornment={
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={toggleVisibilityPw}
                    onMouseDown={handleMouseDownPassword}
                    onMouseUp={handleMouseUpPassword}
                    edge="end"
                    sx={{
                      color: '#86868B',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {isVisible ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: '20px' }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: '20px' }} />
                    )}
                  </IconButton>
                </InputAdornment>
              }
            />
            <FormHelperText
              error={!!error}
              sx={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '12px',
                marginTop: '6px',
                marginLeft: '4px',
              }}
            >
              {error?.message}
            </FormHelperText>
          </FormControl>
        )}
      />
    </Box>
  );
};

export default CustomPwInput;
