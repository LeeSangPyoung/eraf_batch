import { Box, Select, MenuItem, Typography } from '@mui/material';
import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

function SearchSelect({
  id,
  options = [],
  value,
  onChange,
  content = 'Select',
  getOptionLabel = (option) => option.label,
  getOptionValue = (option) => option.value,
  size = 'small',
  disabled = false,
  className,
  ...otherProps
}) {
  return (
    <Box className={`flex flex-col w-full ${className || ''}`}>
      <Typography className="text-secondaryGray text-sm font-medium">
        {content}
      </Typography>
      <Select
        labelId={`${id}-label`}
        id={id}
        size={size}
        value={value}
        onChange={onChange}
        disabled={disabled}
        sx={{
          backgroundColor: 'white',
          height: '35px',
          '& .MuiOutlinedInput-notchedOutline': {
            border: '1px solid #E9EAEB',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: '1px solid #E9EAEB',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: '1px solid #E9EAEB',
          },
        }}
        IconComponent={KeyboardArrowDownIcon}
        {...otherProps}
      >
        {options.map((option, index) => (
          <MenuItem key={getOptionValue(option) || index} value={getOptionValue(option)}>
            {getOptionLabel(option)}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default SearchSelect;