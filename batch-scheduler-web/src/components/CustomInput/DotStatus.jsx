import React from 'react';
import { backgroundIndicator, capitalizeFirst } from '../../utils/helper';

const DotStatus = ({ value, className = '', ...props }) => {
  if (!value) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`} {...props}>
      <span
        className="w-1.5 h-1.5 inline-block rounded-lg"
        style={{
          background: backgroundIndicator(value),
        }}
      ></span>
      {capitalizeFirst(value)}
    </div>
  );
};

export default DotStatus;
