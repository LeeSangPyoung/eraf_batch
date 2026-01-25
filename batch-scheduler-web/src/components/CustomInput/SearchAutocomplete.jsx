import { Autocomplete, capitalize } from '@mui/material';
import React from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchTextField from './SearchTextField';

function SearchAutocomplete({
  id,
  size = 'small',
  options = [],
  getOptionLabel = (option) => option,
  getOptionKey,
  value,
  inputValue,
  onChange,
  onInputChange,
  content = 'Search',
  isOptionEqualToValue,
  ListboxProps,
  disabled = false,
  disablePortal = true,
  capitalizeOptions = false,
  ...otherProps
}) {
  const handleGetOptionLabel = (option) => {
    if (capitalizeOptions) {
      return capitalize(getOptionLabel(option));
    }
    return getOptionLabel(option);
  };

  const controlledValue = value ?? null;
  const controlledInputValue = inputValue ?? '';

  return (
    <Autocomplete
      disablePortal={disablePortal}
      id={id}
      size={size}
      options={options}
      getOptionLabel={handleGetOptionLabel}
      getOptionKey={getOptionKey}
      value={controlledValue}
      inputValue={controlledInputValue}
      onChange={onChange}
      onInputChange={onInputChange}
      isOptionEqualToValue={isOptionEqualToValue}
      disabled={disabled}
      renderInput={(params) => (
        <SearchTextField {...params} content={content} />
      )}
      ListboxProps={{
        ...ListboxProps,
        sx: {
          padding: '6px',
          '& .MuiAutocomplete-option': {
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
            '&[aria-selected="true"]': {
              backgroundColor: 'rgba(0, 113, 227, 0.08)',
              color: '#0071E3',
              '&:hover': {
                backgroundColor: 'rgba(0, 113, 227, 0.12)',
              },
            },
          },
          ...ListboxProps?.sx,
        },
      }}
      popupIcon={<KeyboardArrowDownIcon sx={{ color: '#86868B' }} />}
      slotProps={{
        paper: {
          sx: {
            marginTop: '8px',
            borderRadius: '12px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
            border: '1px solid #E8E8ED',
          },
        },
      }}
      sx={{
        '& .MuiAutocomplete-endAdornment': {
          right: '12px',
        },
      }}
      {...otherProps}
    />
  );
}

export default SearchAutocomplete;