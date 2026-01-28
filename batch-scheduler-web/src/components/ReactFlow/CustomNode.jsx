// @ts-nocheck
import { Box, Typography } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { iconStatusRender } from '../../assets/IconRender';
import { backgroundIndicator } from '../../utils/helper';

const JobStatusIcon = ({ status }) => {
  return iconStatusRender({ status });
};

const StatusDot = ({ status }) => {
  if (!status) return null;
  const upper = status?.toUpperCase?.();
  const isRunning = upper === 'RUNNING';
  const isSuccess = upper === 'SUCCESS' || upper === 'COMPLETED';
  const color = backgroundIndicator(status);
  return (
    <Box
      sx={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        ...(isRunning && {
          animation: 'nodePulse 1.5s ease-in-out infinite',
          '@keyframes nodePulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.3, transform: 'scale(0.7)' },
          },
        }),
      }}
    />
  );
};

export default memo(({ data, isConnectable }) => {
  const { jobList } = data;
  const priority = jobList?.[0]?.jobPriority;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Priority header */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          backgroundColor: '#F5F5F7',
          borderBottom: '1px solid #E8E8ED',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#86868B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          Priority {priority}
        </Typography>
        <Typography
          sx={{
            fontSize: '10px',
            color: '#86868B',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          job
        </Typography>
      </Box>

      {/* Job list */}
      <Box sx={{ py: 0.5 }}>
        {jobList.map((job, index) => {
          const st = job?.current_state?.toUpperCase?.();
          const isRunning = st === 'RUNNING';
          const isSuccess = st === 'SUCCESS' || st === 'COMPLETED';
          const isFailed = st === 'FAILED' || st === 'FAILURE' || st === 'BROKEN';
          const isStandby = st === 'STANDBY' || st === 'PENDING';
          const isWaiting = st === 'WAITING';
          const hasStatus = !!st;
          return (
          <React.Fragment key={job.job_id}>
            <Handle
              type="target"
              position={Position.Left}
              isConnectable={isConnectable}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                px: 1.5,
                py: 0.75,
                borderRadius: '6px',
                mx: 0.5,
                '&:hover': {
                  backgroundColor: isFailed ? '#FFF0EF' : isSuccess ? '#E8F9EE' : isStandby ? '#F0F0F2' : '#F5F5F7',
                },
                transition: 'background-color 0.3s ease',
                ...(isRunning && {
                  animation: 'jobRunningPulse 2s ease-in-out infinite',
                  '@keyframes jobRunningPulse': {
                    '0%, 100%': { backgroundColor: 'rgba(255, 149, 0, 0.04)' },
                    '50%': { backgroundColor: 'rgba(255, 149, 0, 0.12)' },
                  },
                }),
                ...(isSuccess && {
                  backgroundColor: 'rgba(0, 113, 227, 0.06)',
                }),
                ...(isFailed && {
                  backgroundColor: 'rgba(255, 59, 48, 0.06)',
                }),
                ...(isStandby && {
                  backgroundColor: 'rgba(142, 142, 147, 0.06)',
                }),
                ...(isWaiting && {
                  backgroundColor: 'rgba(142, 142, 147, 0.06)',
                  animation: 'jobWaitingPulse 2.5s ease-in-out infinite',
                  '@keyframes jobWaitingPulse': {
                    '0%, 100%': { opacity: 0.5 },
                    '50%': { opacity: 1 },
                  },
                }),
              }}
            >
              <StatusDot status={job?.current_state} />
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isFailed ? '#FF3B30' : isSuccess ? '#0071E3' : isStandby ? '#8E8E93' : '#1D1D1F',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {job?.job_name}
              </Typography>
            </Box>
            <Handle
              type="source"
              position={Position.Right}
              isConnectable={isConnectable}
            />
            {index < jobList.length - 1 && (
              <Box
                sx={{
                  mx: 1.5,
                  borderBottom: '1px solid #F0F0F2',
                }}
              />
            )}
          </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
});
