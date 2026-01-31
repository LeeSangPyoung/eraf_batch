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
      borderRadius: '12px',
      marginTop: '4px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      border: '1px solid #E8E8ED',
      ul: {
        padding: '4px',

        li: {
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
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
  height = '36px',
  ...props
}) {
  return (
    <Box className={clsx('w-full', className)}>
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
                background: '#FFFFFF',
                height: height,
                minHeight: '36px',
                borderRadius: '12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                '& .MuiSelect-select': {
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                },
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
                    margin: '2px',
                    borderRadius: '8px !important',
                    transition: 'background-color 0.15s ease',
                    '& .MuiCheckbox-root': {
                      padding: '0',
                      paddingRight: '10px',
                    },
                    '&:hover': {
                      backgroundColor: '#F5F5F7',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(0, 113, 227, 0.08) !important',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 113, 227, 0.12) !important',
                      },
                    },
                  }}
                >
                  <Checkbox
                    checked={field.value.includes(opt.id)}
                    sx={{
                      '& .MuiSvgIcon-root': {
                        color: '#D2D2D7',
                        fontSize: '20px',
                      },
                      '&.Mui-checked .MuiSvgIcon-root': {
                        color: '#0071E3',
                      },
                    }}
                  />
                  <ListItemText
                    primary={opt.name}
                    sx={{
                      '& .MuiTypography-root': {
                        fontSize: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                      },
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
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
}
