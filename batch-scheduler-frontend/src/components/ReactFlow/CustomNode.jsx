// @ts-nocheck
import { Box, Typography } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { backgroundIndicator } from '../../utils/helper';

const StatusDot = ({ status }) => {
  if (!status) return null;
  const upper = status?.toUpperCase?.();
  const isRunning = upper === 'RUNNING';
  const color = backgroundIndicator(status);
  return (
    <Box
      sx={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: color,
        flexShrink: 0,
        boxShadow: `0 0 0 2px ${color}25`,
        ...(isRunning && {
          animation: 'nodePulse 1.5s ease-in-out infinite',
          '@keyframes nodePulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 },
          },
        }),
      }}
    />
  );
};

export default memo(({ data, isConnectable }) => {
  const { jobList } = data;
  const priority = jobList?.[0]?.jobPriority || jobList?.[0]?.priority;

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ width: 6, height: 6, background: '#D1D1D6', border: '1px solid #fff' }}
      />
      <Box
        sx={{
          width: '90px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >

      {/* Header */}
      <Box
        sx={{
          px: 1,
          py: 0.5,
          background: 'linear-gradient(180deg, #FAFAFA 0%, #F5F5F7 100%)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography
          sx={{
            fontSize: '9px',
            fontWeight: 600,
            color: '#86868B',
            textAlign: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          Priority {priority}
        </Typography>
      </Box>

      {/* Jobs */}
      <Box sx={{ p: 0.5 }}>
        {jobList.map((job) => {
          const st = job?.current_state?.toUpperCase?.();
          const isSuccess = st === 'SUCCESS' || st === 'COMPLETED';
          const isFailed = st === 'FAILED' || st === 'FAILURE' || st === 'BROKEN';
          const isRunning = st === 'RUNNING';

          return (
            <Box
              key={job.job_id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                py: 0.4,
                px: 0.5,
                borderRadius: '6px',
                marginBottom: jobList.length > 1 ? '2px' : 0,
                transition: 'background-color 0.2s ease',
                ...(isRunning && {
                  backgroundColor: 'rgba(255, 149, 0, 0.1)',
                }),
                ...(isSuccess && {
                  backgroundColor: 'rgba(52, 199, 89, 0.1)',
                }),
                ...(isFailed && {
                  backgroundColor: 'rgba(255, 59, 48, 0.1)',
                }),
              }}
            >
              <StatusDot status={job?.current_state} />
              <Typography
                sx={{
                  fontSize: '10px',
                  fontWeight: 500,
                  color: isFailed ? '#FF3B30' : isSuccess ? '#34C759' : isRunning ? '#FF9500' : '#1D1D1F',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                }}
              >
                {job?.job_name}
              </Typography>
            </Box>
          );
        })}
      </Box>
      </Box>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ width: 6, height: 6, background: '#D1D1D6', border: '1px solid #fff' }}
      />
    </Box>
  );
});
