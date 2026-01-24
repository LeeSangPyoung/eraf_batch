import React from 'react';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotInterestedIcon from '@mui/icons-material/NotInterested';
import SevereColdIcon from '@mui/icons-material/SevereCold';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';

export const iconStatusRender = ({ status }) => {
  switch (status) {
    case 'READY TO RUNNING':
      return (
        <Tooltip title="READY TO RUNNING">
          <IconButton className="p-0-important">
            <AlarmOnIcon sx={{ height: 20, width: 20, color: '#4da6ff' }} />
          </IconButton>
        </Tooltip>
      );
    case 'RUNNING':
      return (
        <Tooltip title="RUNNING">
          <IconButton className="p-0-important">
            <CircularProgress size={20} color="warning" />
          </IconButton>
        </Tooltip>
      );
    case 'SCHEDULED':
      return (
        <Tooltip title="SCHEDULED">
          <IconButton className="p-0-important">
            <CalendarTodayIcon
              sx={{ height: 16, width: 16, color: '#4da6ff' }}
            />
          </IconButton>
        </Tooltip>
      );
    case 'RETRY SCHEDULED':
      return (
        <Tooltip title="RETRY SCHEDULED">
          <IconButton className="p-0-important">
            <EventRepeatIcon sx={{ height: 16, width: 16, color: '#4da6ff' }} />
          </IconButton>
        </Tooltip>
      );
    case 'BLOCKED':
      return (
        <Tooltip title="BLOCKED">
          <IconButton className="p-0-important">
            <CancelIcon sx={{ height: 16, width: 16, color: '#d1242f' }} />{' '}
          </IconButton>
        </Tooltip>
      );
    case 'BROKEN':
      return (
        <Tooltip title="BROKEN">
          <IconButton className="p-0-important">
            <CancelIcon sx={{ height: 16, width: 16, color: '#d1242f' }} />
          </IconButton>
        </Tooltip>
      );
    case 'FAILED':
      return (
        <Tooltip title="FAILED">
          <IconButton className="p-0-important">
            <CancelIcon sx={{ height: 16, width: 16, color: '#d1242f' }} />
          </IconButton>
        </Tooltip>
      );
    case 'COMPLETED':
      return (
        <Tooltip title="COMPLETED">
          <IconButton className="p-0-important">
            <CheckCircleIcon sx={{ height: 16, width: 16, color: '#1a7f37' }} />
          </IconButton>
        </Tooltip>
      );
    case 'DISABLED':
      return (
        <Tooltip title="DISABLED">
          <IconButton className="p-0-important">
            <NotInterestedIcon
              sx={{ height: 16, width: 16, color: '#d1242f' }}
            />
          </IconButton>
        </Tooltip>
      );
    case 'WAITING':
      return (
        <Tooltip title="WAITING">
          <IconButton className="p-0-important">
            <SevereColdIcon sx={{ height: 20, width: 20, color: '#99ccff' }} />
          </IconButton>
        </Tooltip>
      );
  }
};
