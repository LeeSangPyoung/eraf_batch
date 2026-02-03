import React from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray } from 'react-hook-form';
import {
  Box,
  TextField,
  Typography,
  IconButton,
  MenuItem,
  Tooltip,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Selected from '../CustomInput/Select';
import BaseTextArea from '../CustomInput/BaseTextArea';

const JOB_TYPE_OPTIONS = [
  { id: 'REST_API', name: 'REST_API' },
  { id: 'EXECUTABLE', name: 'EXECUTABLE' },
];

const HTTP_METHODS = [
  { id: 'GET', name: 'GET', color: '#34C759', bg: 'rgba(52, 199, 89, 0.12)' },
  { id: 'POST', name: 'POST', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.12)' },
  { id: 'PUT', name: 'PUT', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.12)' },
  { id: 'DELETE', name: 'DELETE', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.12)' },
  { id: 'PATCH', name: 'PATCH', color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.12)' },
];

const getMethodStyle = (method) => {
  const found = HTTP_METHODS.find((m) => m.id === method);
  return found ? { color: found.color, bg: found.bg } : { color: '#8E8E93', bg: '#F2F2F7' };
};

const ActionInfoTab = ({ form }) => {
  const { t } = useTranslation();
  const { control, watch } = form;

  const watchJobType = watch('job_type');
  const watchHttpMethod = watch('http_method');
  const methodStyle = getMethodStyle(watchHttpMethod);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'job_headers',
  });

  const handleAddHeader = () => {
    append({ key: '', value: '' });
  };

  return (
    <div className="flex flex-col gap-5">
      <Selected
        control={control}
        name="job_type"
        options={JOB_TYPE_OPTIONS}
        content={t('jobType')}
        required
        valueKey="id"
        labelKey="name"
      />

      {watchJobType === 'REST_API' ? (
        <>
          {/* HTTP Method + URL Row (Postman/Apple style) */}
          <Box>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1D1D1F',
                marginBottom: '8px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {t('requestUrl')} <span style={{ color: '#FF3B30' }}>*</span>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E5EA',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#C7C7CC',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                },
                '&:focus-within': {
                  borderColor: '#007AFF',
                  boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.15)',
                },
              }}
            >
              {/* HTTP Method Dropdown */}
              <Controller
                control={control}
                name="http_method"
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    sx={{
                      minWidth: '110px',
                      '& .MuiInputBase-root': {
                        height: '44px',
                        backgroundColor: methodStyle.bg,
                        borderRadius: '0',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: methodStyle.color,
                        letterSpacing: '0.02em',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '& .MuiSelect-select': {
                        padding: '0 8px 0 14px',
                        display: 'flex',
                        alignItems: 'center',
                      },
                      '& .MuiSelect-icon': {
                        color: methodStyle.color,
                        right: '8px',
                      },
                    }}
                    SelectProps={{
                      IconComponent: KeyboardArrowDownIcon,
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            marginTop: '4px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                            border: '1px solid #E5E5EA',
                            '& .MuiList-root': {
                              padding: '6px',
                            },
                            '& .MuiMenuItem-root': {
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                              fontWeight: 700,
                              fontSize: '13px',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              margin: '2px 0',
                            },
                          },
                        },
                      },
                    }}
                  >
                    {HTTP_METHODS.map((method) => (
                      <MenuItem
                        key={method.id}
                        value={method.id}
                        sx={{
                          color: method.color,
                          backgroundColor: 'transparent',
                          '&:hover': {
                            backgroundColor: method.bg,
                          },
                          '&.Mui-selected': {
                            backgroundColor: method.bg,
                            '&:hover': {
                              backgroundColor: method.bg,
                            },
                          },
                        }}
                      >
                        {method.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />

              {/* Divider */}
              <Box
                sx={{
                  width: '1px',
                  height: '28px',
                  backgroundColor: '#E5E5EA',
                }}
              />

              {/* URL Input */}
              <Controller
                control={control}
                name="job_action"
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    placeholder="https://api.example.com/endpoint"
                    fullWidth
                    error={!!error}
                    sx={{
                      '& .MuiInputBase-root': {
                        height: '44px',
                        backgroundColor: 'transparent',
                        borderRadius: '0',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                        fontSize: '13px',
                        color: '#1D1D1F',
                      },
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none',
                      },
                      '& .MuiInputBase-input': {
                        padding: '0 14px',
                        '&::placeholder': {
                          color: '#8E8E93',
                          opacity: 1,
                        },
                      },
                    }}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Headers Section */}
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1D1D1F',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {t('headers')}
                </Typography>
                {fields.length > 0 && (
                  <Chip
                    label={fields.length}
                    size="small"
                    sx={{
                      height: '18px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: '#007AFF',
                      color: '#FFFFFF',
                      '& .MuiChip-label': {
                        padding: '0 6px',
                      },
                    }}
                  />
                )}
              </Box>
              <Tooltip title={t('addHeader')} arrow>
                <IconButton
                  onClick={handleAddHeader}
                  size="small"
                  sx={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    '&:hover': {
                      backgroundColor: '#0056CC',
                    },
                    transition: 'all 0.15s ease',
                  }}
                >
                  <AddIcon sx={{ fontSize: '18px' }} />
                </IconButton>
              </Tooltip>
            </Box>

            {fields.length === 0 ? (
              <Box
                onClick={handleAddHeader}
                sx={{
                  padding: '20px',
                  backgroundColor: '#F9F9FB',
                  borderRadius: '12px',
                  border: '2px dashed #D1D1D6',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#F2F2F7',
                    borderColor: '#007AFF',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '13px',
                    color: '#8E8E93',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  {t('noHeaders')}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: '#F9F9FB',
                  borderRadius: '12px',
                }}
              >
                {/* Header labels */}
                <Box sx={{ display: 'flex', gap: '8px', paddingRight: '36px' }}>
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8E8E93',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      paddingLeft: '12px',
                    }}
                  >
                    Key
                  </Typography>
                  <Typography
                    sx={{
                      flex: 2,
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#8E8E93',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      paddingLeft: '12px',
                    }}
                  >
                    Value
                  </Typography>
                </Box>

                {fields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <Controller
                      control={control}
                      name={`job_headers.${index}.key`}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="Content-Type"
                          size="small"
                          sx={{
                            flex: 1,
                            '& .MuiInputBase-root': {
                              height: '38px',
                              borderRadius: '10px',
                              backgroundColor: '#FFFFFF',
                              fontSize: '13px',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: '1px solid #E5E5EA',
                            },
                            '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#C7C7CC',
                            },
                            '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              border: '2px solid #007AFF',
                            },
                            '& .MuiInputBase-input': {
                              padding: '0 12px',
                              '&::placeholder': {
                                color: '#C7C7CC',
                                opacity: 1,
                              },
                            },
                          }}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`job_headers.${index}.value`}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          placeholder="application/json"
                          size="small"
                          sx={{
                            flex: 2,
                            '& .MuiInputBase-root': {
                              height: '38px',
                              borderRadius: '10px',
                              backgroundColor: '#FFFFFF',
                              fontSize: '13px',
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Mono", monospace',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: '1px solid #E5E5EA',
                            },
                            '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#C7C7CC',
                            },
                            '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              border: '2px solid #007AFF',
                            },
                            '& .MuiInputBase-input': {
                              padding: '0 12px',
                              '&::placeholder': {
                                color: '#C7C7CC',
                                opacity: 1,
                              },
                            },
                          }}
                        />
                      )}
                    />
                    <IconButton
                      onClick={() => remove(index)}
                      size="small"
                      sx={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: '#FF3B30',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        '&:hover': {
                          backgroundColor: '#D70015',
                        },
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <CloseIcon sx={{ fontSize: '16px' }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Request Body */}
          <BaseTextArea
            control={control}
            name="job_body"
            content={t('requestBody')}
            minRows={5}
            maxRows={10}
            placeholder='{"key": "value"}'
          />
        </>
      ) : (
        /* EXECUTABLE type - simple command input */
        <BaseTextArea
          control={control}
          name="job_action"
          content={t('jobAction')}
          required
          minRows={3}
          maxRows={6}
          placeholder="/path/to/script.sh --option value"
        />
      )}
    </div>
  );
};

export default ActionInfoTab;
