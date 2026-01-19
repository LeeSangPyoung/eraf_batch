import { styled } from '@mui/material';
import Chip from '@mui/material/Chip';

import React from 'react';

const options = {
  shouldForwardProp: (prop) => prop !== 'bgcolor',
};

const CustomChip = styled(
  Chip,
  options,
// @ts-ignore
)(({ bgcolor }) => ({
  backgroundColor: bgcolor,
}));

export default CustomChip;