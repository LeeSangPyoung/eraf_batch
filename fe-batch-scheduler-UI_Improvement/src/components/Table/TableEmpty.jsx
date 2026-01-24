import { Box } from '@mui/material';
import React from 'react';

const TableEmpty = ({ 
  imageSrc = "/images/Empty.png", 
  alt = "No data available", 
  width = "50%",
  className = "",
  style = {},
  ...props 
}) => {
  return (
    <Box className={`w-full h-full flex justify-center ${className}`} {...props}>
      <img
        src={imageSrc}
        alt={alt}
        style={{
          width: width,
          ...style,
        }}
      />
    </Box>
  );
};

export default TableEmpty;