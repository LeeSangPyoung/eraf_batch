import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { formatDate } from '../utils/helper';
import useFilterAndPagination from './useFilterAndPagination';
import useStatusFilter from './useStatusFilter';
import useSWR from 'swr';

const useJobData = () => {
  const {
    job,
    group,
    server,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    goToPage
  } = useFilterAndPagination();

  const { state, handleValueChange, handleInputChange } = useStatusFilter();
  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  // Build filter input for SWR key to ensure proper cache invalidation
  const filterInput = {
    ...(job !== 'all' && { job_id: job }),
    ...(group !== 'all' && { group_id: group }),
    ...(server !== 'all' && { system_id: server }),
    ...(searchTerm !== '' && { text_search: searchTerm }),
    ...(state.enable !== null && { is_enabled: state.enable === 'true' }),
    ...(state.wfRegistered !== null && { wf_registered: state.wfRegistered === 'Yes' }),
    ...(state.currentState !== null && { current_state: state.currentState }),
    ...(state.lastResult !== null && { last_result: state.lastResult }),
    ...(state.from !== null && { last_start_date_from: formatDate(state.from) }),
    ...(state.to !== null && { last_start_date_to: formatDate(state.to) }),
    page_size: pageSize,
    page_number: pageNumber,
  };

  const {
    data,
    error: jobError,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/job/filter', JSON.stringify(filterInput)],
    async ([url]) => {
      try {
        const response = await api.post(url, filterInput);
        return response.data;
      } catch (error) {
        toast.error('Error fetching job');
        return [];
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 5000, // Poll every 5 seconds for real-time updates
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    },
  );

  const handleFetchData = () => {
    goToPage(1)
    setShouldFetchFilters(true);
    setIsLoadingDefault(true);
  };

  useEffect(() => {
    if (shouldFetchFilters) {
      mutate();
      setShouldFetchFilters(false);
    }
  }, [shouldFetchFilters]);

  return {
    jobsData: data?.data,
    total: data?.total,
    isLoading: loading,
    isLoadingDefault,
    setIsLoadingDefault,
    job,
    server,
    group,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    handleFetchData,
    state,
    handleValueChange,
    handleInputChange,
  };
};

export default useJobData;
