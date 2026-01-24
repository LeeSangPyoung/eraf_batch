import {
  Checkbox,
  FormHelperText,
  ListItemText,
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import * as React from 'react';
import { Controller } from 'react-hook-form';
import clsx from 'clsx';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckIcon from '@mui/icons-material/Check';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    sx: {
      borderRadius: '0',

      ul: {
        padding: 0,

        li: {
          borderRadius: '0',
          padding: '15px',
          '& .PrivateSwitchBase-input': {
            border: '1px solid black',
          },
        },
      },
    },
    style: {
      maxHeight: ITEM_HEIGHT * 7 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function MultipleSelectChip({
  control,
  name,
  label,
  content,
  textStyles,
  className,
  options,
  required,
  height = '50px',
  ...props
}) {
  return (
    <Box className={clsx('w-full', className)}>
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
            <InputLabel id="multiple-chip-label">{label}</InputLabel>
            <Select
              labelId={`multiple-chip-label-${label}`}
              id={`multiple-chip-${label}`}
              multiple
              name={name}
              value={field.value}
              onChange={(e) =>
                field.onChange(
                  typeof e.target.value === 'string'
                    ? e.target.value.split(',')
                    : e.target.value,
                )
              }
              input={<OutlinedInput id="select-multiple-chip" label={label} />}
              renderValue={(selected) => {
                const selectedNames = selected.map((value) => {
                  const selectedOption = options.find(
                    (opt) => opt.id === value,
                  );
                  return selectedOption ? selectedOption.name : value;
                });
                return selectedNames.join(', ');
              }}
              error={!!error}
              MenuProps={MenuProps}
              sx={{
                background: 'white',
                height: height,
                '& .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  border: error ? '1px solid #d32f2f' : '1px solid #E9EAEB',
                },
                '.MuiList-root': {
                  padding: '0',
                },
              }}
              IconComponent={KeyboardArrowDownIcon}
              {...props}
            >
              {options.map((opt) => (
                <MenuItem
                  key={opt.name}
                  value={opt.id}
                  sx={{
                    margin: '0 2px',
                    borderRadius: '10px !important',
                    '& .MuiCheckbox-root': {
                      padding: '0',
                      paddingRight: '10px',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'transparent !important',
                    },
                  }}
                >
                  <Checkbox
                    checked={field.value.includes(opt.id)}
                    sx={{
                      '& .MuiSvgIcon-root': {
                        color: '#E9EAEB',
                      },
                      '&.Mui-checked .MuiSvgIcon-root': {
                        color: '#FABB18',
                      },
                    }}
                  />
                  <ListItemText primary={opt.name} />
                </MenuItem>
              ))}
            </Select>
            <FormHelperText error={!!error}>{error?.message}</FormHelperText>
          </FormControl>
        )}
      />
    </Box>
  );
}
