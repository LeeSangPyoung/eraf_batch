import { styled } from '@mui/material';
import Chip from '@mui/material/Chip';

import React from 'react';

const options = {
  shouldForwardProp: (prop) => prop !== 'bgcolor' && prop !== 'textcolor',
};

const CustomChip = styled(
  Chip,
  options,
// @ts-ignore
)(({ bgcolor, textcolor }) => ({
  backgroundColor: bgcolor || '#F5F5F7',
  color: textcolor || '#1D1D1F',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
  fontSize: '12px',
  fontWeight: 500,
  borderRadius: '8px',
  height: '28px',
  padding: '0 4px',
  transition: 'all 0.2s ease',
  '& .MuiChip-label': {
    padding: '0 8px',
  },
  '&:hover': {
    filter: 'brightness(0.95)',
  },
}));

export default CustomChip;