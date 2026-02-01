import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  Box,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import BaseButton from '../CustomInput/BaseButton';

const appleFont = '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif';
const monoFont = 'SF Mono, Monaco, "Pretendard", monospace';

const FREQ_OPTIONS = [
  { value: 'MINUTELY', label: 'Minutes' },
  { value: 'HOURLY', label: 'Hours' },
  { value: 'DAILY', label: 'Days' },
  { value: 'WEEKLY', label: 'Weeks' },
  { value: 'MONTHLY', label: 'Months' },
];

const WEEKDAYS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
];

function RRuleBuilder({ open, onClose, onApply, currentValue }) {
  const [freq, setFreq] = useState('DAILY');
  const [interval, setInterval] = useState(1);
  const [byHour, setByHour] = useState('');
  const [byMinute, setByMinute] = useState('');
  const [bySecond, setBySecond] = useState('');
  const [byDay, setByDay] = useState([]);
  const [byMonthDay, setByMonthDay] = useState('');

  // Parse current value if exists
  useEffect(() => {
    if (currentValue && currentValue.startsWith('FREQ=')) {
      const parts = currentValue.split(';');
      parts.forEach(part => {
        const [key, value] = part.split('=');
        switch (key) {
          case 'FREQ':
            setFreq(value);
            break;
          case 'INTERVAL':
            setInterval(parseInt(value) || 1);
            break;
          case 'BYHOUR':
            setByHour(value);
            break;
          case 'BYMINUTE':
            setByMinute(value);
            break;
          case 'BYSECOND':
            setBySecond(value);
            break;
          case 'BYDAY':
            setByDay(value.split(','));
            break;
          case 'BYMONTHDAY':
            setByMonthDay(value);
            break;
        }
      });
    }
  }, [currentValue, open]);

  const buildRRule = () => {
    let rrule = `FREQ=${freq};INTERVAL=${interval}`;

    if ((freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY') && byHour !== '') {
      rrule += `;BYHOUR=${byHour}`;
    }
    if ((freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY') && byMinute !== '') {
      rrule += `;BYMINUTE=${byMinute}`;
    }
    if ((freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY') && bySecond !== '') {
      rrule += `;BYSECOND=${bySecond}`;
    }
    if (freq === 'WEEKLY' && byDay.length > 0) {
      rrule += `;BYDAY=${byDay.join(',')}`;
    }
    if (freq === 'MONTHLY' && byMonthDay !== '') {
      rrule += `;BYMONTHDAY=${byMonthDay}`;
    }

    return rrule;
  };

  const handleApply = () => {
    onApply(buildRRule());
    onClose();
  };

  const toggleWeekday = (day) => {
    if (byDay.includes(day)) {
      setByDay(byDay.filter(d => d !== day));
    } else {
      setByDay([...byDay, day]);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #E8E8ED',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box
            sx={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 113, 227, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScheduleIcon sx={{ color: '#0071E3', fontSize: '22px' }} />
          </Box>
          <Typography
            sx={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1D1D1F',
              fontFamily: appleFont,
              letterSpacing: '-0.01em',
            }}
          >
            Schedule Builder
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            width: '32px',
            height: '32px',
            backgroundColor: '#F5F5F7',
            borderRadius: '50%',
            '&:hover': { backgroundColor: '#E8E8ED' },
          }}
        >
          <CloseIcon sx={{ fontSize: '18px', color: '#86868B' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ padding: '24px' }}>
        {/* Frequency & Interval */}
        <Box sx={{ marginBottom: '24px' }}>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#86868B',
              marginBottom: '10px',
              fontFamily: appleFont,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Repeat Every
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TextField
              type="number"
              value={interval}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              size="small"
              sx={{
                width: '80px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontFamily: appleFont,
                },
              }}
              inputProps={{ min: 1, max: 99 }}
            />
            <FormControl size="small" sx={{ minWidth: '130px' }}>
              <Select
                value={freq}
                onChange={(e) => {
                  setFreq(e.target.value);
                  setByDay([]);
                  setByMonthDay('');
                }}
                sx={{
                  borderRadius: '10px',
                  fontFamily: appleFont,
                }}
              >
                {FREQ_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value} sx={{ fontFamily: appleFont }}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Time Selection (for Daily/Weekly/Monthly) */}
        {(freq === 'DAILY' || freq === 'WEEKLY' || freq === 'MONTHLY') && (
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#86868B',
                marginBottom: '10px',
                fontFamily: appleFont,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              At Specific Time (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <TextField
                type="number"
                value={byHour}
                onChange={(e) => setByHour(e.target.value)}
                size="small"
                placeholder="HH"
                sx={{
                  width: '70px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: appleFont,
                  },
                }}
                inputProps={{ min: 0, max: 23 }}
              />
              <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#86868B' }}>:</Typography>
              <TextField
                type="number"
                value={byMinute}
                onChange={(e) => setByMinute(e.target.value)}
                size="small"
                placeholder="MM"
                sx={{
                  width: '70px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: appleFont,
                  },
                }}
                inputProps={{ min: 0, max: 59 }}
              />
              <Typography sx={{ fontSize: '16px', fontWeight: 500, color: '#86868B' }}>:</Typography>
              <TextField
                type="number"
                value={bySecond}
                onChange={(e) => setBySecond(e.target.value)}
                size="small"
                placeholder="SS"
                sx={{
                  width: '70px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    fontFamily: appleFont,
                  },
                }}
                inputProps={{ min: 0, max: 59 }}
              />
            </Box>
          </Box>
        )}

        {/* Weekday Selection (for Weekly) */}
        {freq === 'WEEKLY' && (
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#86868B',
                marginBottom: '10px',
                fontFamily: appleFont,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              On Days (Optional)
            </Typography>
            <Box sx={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {WEEKDAYS.map(day => (
                <Box
                  key={day.value}
                  onClick={() => toggleWeekday(day.value)}
                  sx={{
                    width: '44px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: appleFont,
                    backgroundColor: byDay.includes(day.value) ? '#0071E3' : '#F5F5F7',
                    color: byDay.includes(day.value) ? '#FFFFFF' : '#1D1D1F',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: byDay.includes(day.value) ? '#0077ED' : '#E8E8ED',
                    },
                  }}
                >
                  {day.label}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Day of Month (for Monthly) */}
        {freq === 'MONTHLY' && (
          <Box sx={{ marginBottom: '24px' }}>
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#86868B',
                marginBottom: '10px',
                fontFamily: appleFont,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              On Day of Month (Optional)
            </Typography>
            <TextField
              type="number"
              value={byMonthDay}
              onChange={(e) => setByMonthDay(e.target.value)}
              size="small"
              placeholder="1-31"
              sx={{
                width: '100px',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  fontFamily: appleFont,
                },
              }}
              inputProps={{ min: 1, max: 31 }}
            />
          </Box>
        )}

        {/* Preview */}
        <Box
          sx={{
            backgroundColor: '#F5F5F7',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#86868B',
              marginBottom: '8px',
              fontFamily: appleFont,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Generated RRULE
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1D1D1F',
              fontFamily: monoFont,
              wordBreak: 'break-all',
            }}
          >
            {buildRRule()}
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <BaseButton theme="light" onClick={onClose}>
            Cancel
          </BaseButton>
          <BaseButton theme="dark" onClick={handleApply}>
            Apply
          </BaseButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default RRuleBuilder;
