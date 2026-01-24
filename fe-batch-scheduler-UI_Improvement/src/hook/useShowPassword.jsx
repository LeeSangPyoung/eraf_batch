import { useState, useCallback } from 'react';

const useShowPassword = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibilityPw = () => {
    setIsVisible((prev) => !prev);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleMouseUpPassword = (event) => {
    event.preventDefault();
  };

  return {
    isVisible,
    toggleVisibilityPw,
    handleMouseDownPassword,
    handleMouseUpPassword,
  };
};

export default useShowPassword;
