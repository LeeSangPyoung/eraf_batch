import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { backgroundIndicator, capitalizeFirst } from '../../utils/helper';
import { runningStates } from '../../utils/enum';

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
`;

const DotStatus = ({ value, className = '', ...props }) => {
  if (!value) return null;

  const isRunning = runningStates.includes(value);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: `${backgroundIndicator(value)}15`,
        borderRadius: '6px',
      }}
      className={className}
      {...props}
    >
      <Box
        component="span"
        sx={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: backgroundIndicator(value),
          boxShadow: `0 0 6px ${backgroundIndicator(value)}60`,
          ...(isRunning && {
            animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
          }),
        }}
      />
      <Typography
        component="span"
        sx={{
          fontSize: '13px',
          fontWeight: 500,
          color: backgroundIndicator(value),
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {capitalizeFirst(value)}
      </Typography>
    </Box>
  );
};

export default DotStatus;
