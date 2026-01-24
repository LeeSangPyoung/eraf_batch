import { useState, useCallback } from 'react';

const useModal = () => {
  const [isVisible, setIsVisible] = useState(false);

  const openModal = useCallback((callback) => {
    setIsVisible(true);
    if (callback && typeof callback === 'function') {
      callback();
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    openModal,
    closeModal
  };
};

export default useModal;