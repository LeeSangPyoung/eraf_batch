import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';
import { formatDate } from '../utils/helper';
import useFilterAndPagination from './useFilterAndPagination';
import useWorkflowRunFilter from './useWorkflowRunFilter';

const useWorkflowRun = ({groupId, search} = {groupId: '', search: ''}) => {
  const {
    workflow,
    group,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    goToPage
  } = useFilterAndPagination({groupId, jobId: undefined, search});

  const { state, handleValueChange, handleInputChange } = useWorkflowRunFilter();

  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const {
    data,
    error: jobError,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/workflow/run/filter', pageSize, pageNumber],
    async ([url, pageSize, pageNumber]) => {
      try {
        const input = {
          ...(workflow !== 'all' && { workflow_id: workflow }),
          ...(group !== 'all' && { group_id: group }),
          ...(searchTerm !== '' && { search_text: searchTerm }),
          ...{ page_size: pageSize },
          ...{ page_number: pageNumber },
          ...(state.status !== null && { status: state.status }),
          ...(state.from !== null && {
            workflow_run_from: formatDate(state.from),
          }),
          ...(state.to !== null && { workflow_run_to: formatDate(state.to) }),
        };
        const response = await api.post(url, input);
        return response.data;
      } catch (error) {
        toast.error('Error fetching workflow runs');
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 5000,
      dedupingInterval: 2000,
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
    workflowRunData: data?.data,
    total: data?.total,
    isLoading: loading,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
    workflow,
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

export const useDetailWorkflowRun = async (data) => {
  if (data) {
    try {
      const url = 'workflow/run/detail/' + data.workflow_run_id;
      const response = await api.get(url);
      if (response.data.success) {
        return response.data.data;
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
        return data;
      }
    } catch (error) {
      toast.error(error);
      return data;
    }
  }
};

export default useWorkflowRun;
