import { useEffect, useState } from 'react';
import useFilterAndPagination from './useFilterAndPagination';
import useSWR from 'swr';
import { toast } from 'react-toastify';
import api from '../services/api';
import useStatusFilter from './useStatusFilter';
import useGroupsStore from './store/useGroupStore';
import useAuthStore from './store/useAuthStore';

export const useWorkflow = () => {
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
    goToPage,
  } = useFilterAndPagination();

  const {
    state: statusState,
    handleValueChange,
    handleInputChange,
  } = useStatusFilter();
  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);
  const groupFilter = useGroupsStore((state) => state.groups);
  const { user } = useAuthStore();
  const {
    data,
    error,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/workflow/filter', pageSize, pageNumber],
    async ([url, pageSize, pageNumber]) => {
      try {
        const input = {
          ...(workflow !== 'all' && { workflow_name: workflow }),
          ...(group !== 'all' && { group_id: group }),
          ...(searchTerm !== '' && { text_search: searchTerm }),
          ...(statusState.latestStatus !== null && {
            latest_status: statusState.latestStatus,
          }),
          ...{ page_size: pageSize },
          ...{ page_number: pageNumber },
        };
        const response = await api.post(url, input);
        return response.data;
      } catch (error) {
        toast.error('Error fetching workflow');
        return [];
      }
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 5000,
      dedupingInterval: 2000,
    },
  );

  const handleFetchData = () => {
    goToPage(1);
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
    mutate,
    workflowData: data?.data,
    total: data?.total,
    loading,
    group,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
    handleChange,
    searchTerm,
    statusState,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    handleValueChange,
    handleInputChange,
  };
};
