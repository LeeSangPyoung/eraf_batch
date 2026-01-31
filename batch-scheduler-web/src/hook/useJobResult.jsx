import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';
import { formatDate } from '../utils/helper';
import useFilterAndPagination from './useFilterAndPagination';
import useResultFilter from './useResultFilter';

const useJobResult = ({jobId} = {jobId: ''}) => {
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
  } = useFilterAndPagination({jobId, groupId: undefined, search: ''});

  const { state, handleValueChange, handleInputChange } = useResultFilter();

  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const {
    data,
    error: jobError,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/logs/filter', job, pageSize, pageNumber],
    async ([url, currentJob, pageSize, pageNumber]) => {
      try {
        const input = {
          ...(job !== 'all' && { job_id: job }),
          ...(group !== 'all' && { group_id: group }),
          ...(server !== 'all' && { system_id: server }),
          ...(searchTerm !== '' && { text_search: searchTerm }),
          ...{ page_size: pageSize },
          ...{ page_number: pageNumber },
          ...(state.operation !== null && { operation: state.operation }),
          ...(state.status !== null && { status: state.status }),
          ...(state.from !== null && {
            req_start_date_from: formatDate(state.from),
          }),
          ...(state.to !== null && { req_start_date_to: formatDate(state.to) }),
        };
        const response = await api.post(url, input);
        return response.data;
      } catch (error) {
        toast.error('Error fetching job results');
      }
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 10000, // Poll every 10 seconds
    },
  );

  const handleFetchData = () => {
    goToPage(1)
    setShouldFetchFilters(true);
    setIsLoadingDefault(true)
  };

  useEffect(() => {
    if (shouldFetchFilters) {
      mutate();
      setShouldFetchFilters(false);
    }
  }, [shouldFetchFilters]);

  const refreshData = () => {
    mutate();
  };

  return {
    jobResultData: data?.data,
    total: data?.total,
    isLoading: loading,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
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
    state,
    handleValueChange,
    handleInputChange,
    refreshData
  };
};

export default useJobResult;
