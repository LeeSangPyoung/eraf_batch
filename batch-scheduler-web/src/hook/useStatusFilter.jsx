import { useCallback, useState } from 'react';

const useStatusFilter = () => {
  const [state, setState] = useState({
    enable: null,
    enableInput: '',
    currentState: null,
    currentStateInput: '',
    latestStatus: null,
    latestStatusInput: '',
    lastResult: null,
    lastResultInput: '',
    from: null,
    to: null,
    wfRegistered: null,
    wfRegisteredInput: '',
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

export default useStatusFilter;
