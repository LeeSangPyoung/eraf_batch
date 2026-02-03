import { Box, Typography } from '@mui/material';
import React from 'react';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';

const TableEmpty = ({
  message = "No data available",
  className = "",
  icon: CustomIcon,
  ...props
}) => {
  const IconComponent = CustomIcon || FolderOpenOutlinedIcon;

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '12px',
      }}
      className={className}
      {...props}
    >
      <Box
        sx={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          backgroundColor: '#F5F5F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconComponent sx={{ fontSize: '28px', color: '#86868B' }} />
      </Box>
      <Typography
        sx={{
          fontSize: '14px',
          color: '#86868B',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          fontWeight: 500,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default TableEmpty;
