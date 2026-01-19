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
import clsx from 'clsx';
import useShowPassword from '../../hook/useShowPassword';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

const CustomPwInput = ({ control, name, label, placeholder, heght='50px', isBackgroundGray, content, textStyles, required, ...props }) => {
  const {
    isVisible,
    toggleVisibilityPw,
    handleMouseDownPassword,
    handleMouseUpPassword,
  } = useShowPassword();
  return (
    <Box className='w-full flex flex-col'>
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
        render={({ field, fieldState: { error } }) => (
          <FormControl className="w-full">
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
              height: heght,
              backgroundColor: isBackgroundGray ? '#1C1C1C0D' : 'white',
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
                >
                  {isVisible ? (
                    <VisibilityOffOutlinedIcon className="text-gray" />
                  ) : (
                    <VisibilityOutlinedIcon className="text-gray" />
                  )}
                </IconButton>
              </InputAdornment>
            }
          />
          <FormHelperText error={!!error}>{error?.message}</FormHelperText>
        </FormControl>
      )}
    />
    </Box>
  );
};

export default CustomPwInput;
