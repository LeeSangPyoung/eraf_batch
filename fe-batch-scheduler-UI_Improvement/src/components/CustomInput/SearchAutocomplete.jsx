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
      ListboxProps={ListboxProps}
      popupIcon={<KeyboardArrowDownIcon />}
      {...otherProps}
    />
  );
}

export default SearchAutocomplete;