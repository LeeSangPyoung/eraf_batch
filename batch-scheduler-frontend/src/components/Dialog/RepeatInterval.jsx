import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate, getUserTimeZone } from '../../utils/helper';

import CloseIcon from '@mui/icons-material/Close';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function RepeatInterval({ open, onClose, repeatInterval, startDate }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !repeatInterval) return;

    setLoading(true);
    try {
      api
        .post('/job/repeatIntervalSample', {
          repeat_interval: repeatInterval,
          start_date: formatDate(startDate),
          timezone: getUserTimeZone(),
        })
        .then((res) => {
          setRows(res.data.data || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } catch (error) {
      toast.error(error);
      setLoading(false);
    }
  }, [repeatInterval, startDate, open]);

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
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            {t('repeatInterval')}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            width: '32px',
            height: '32px',
            backgroundColor: '#F5F5F7',
            borderRadius: '50%',
            '&:hover': {
              backgroundColor: '#E8E8ED',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: '18px', color: '#86868B' }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ padding: '24px' }}>
        {/* RRULE Display */}
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
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t('scheduleRule')}
          </Typography>
          <Typography
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1D1D1F',
              fontFamily: 'SF Mono, Monaco, "Pretendard", monospace',
              wordBreak: 'break-all',
            }}
          >
            {repeatInterval || '-'}
          </Typography>
        </Box>

        {/* Run Times */}
        {rows.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#86868B',
                marginBottom: '12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('upcomingRuns')} ({rows.length})
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '3px',
                },
              }}
            >
              {rows.map((time, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    backgroundColor: index === 0 ? 'rgba(0, 113, 227, 0.08)' : '#FFFFFF',
                    border: index === 0 ? '1px solid rgba(0, 113, 227, 0.2)' : '1px solid #E8E8ED',
                    borderRadius: '10px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: index === 0 ? 'rgba(0, 113, 227, 0.12)' : '#F5F5F7',
                    },
                  }}
                >
                  <AccessTimeIcon
                    sx={{
                      fontSize: '14px',
                      color: index === 0 ? '#0071E3' : '#86868B',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: index === 0 ? '#0071E3' : '#1D1D1F',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {time}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {loading && (
          <Box sx={{ textAlign: 'center', padding: '40px 0', color: '#86868B' }}>
            {t('loadingSchedule')}
          </Box>
        )}

        {!loading && rows.length === 0 && (
          <Box sx={{ textAlign: 'center', padding: '40px 0', color: '#86868B' }}>
            {t('noScheduledRuns')}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RepeatInterval;
