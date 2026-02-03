import { useCallback, useState } from 'react';

const useWorkflowRunFilter = () => {
  const [state, setState] = useState({
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

export default useWorkflowRunFilter;
