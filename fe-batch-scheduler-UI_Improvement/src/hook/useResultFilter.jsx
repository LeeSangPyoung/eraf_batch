import { useCallback, useState } from 'react';

const useResultFilter = () => {
  const [state, setState] = useState({
    operation: null,
    operationInput: '',
    status : null,
    statusInput: '',
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
