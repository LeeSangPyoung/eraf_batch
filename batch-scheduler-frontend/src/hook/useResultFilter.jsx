import { useCallback, useState } from 'react';

const useResultFilter = (initialStatus = null) => {
  const [state, setState] = useState({
    operation: null,
    operationInput: '',
    status : initialStatus,
    statusInput: initialStatus || '',
    from: null,
    to: null
  });

  const handleValueChange = useCallback((event, newValue, key) => {
    setState((prevState) => ({
      ...prevState,
      [key]: newValue,
    }));
  }, []);

  const handleInputChange = useCallback((event, newValue, key) => {
    setState((prevState) => ({
      ...prevState,
      [`${key}Input`]: newValue,
    }));
  }, []);

  return {
    state,
    handleValueChange,
    handleInputChange,
  };
};

export default useResultFilter;
