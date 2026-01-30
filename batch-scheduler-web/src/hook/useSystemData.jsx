import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';
import useFilterAndPagination from './useFilterAndPagination';

const useSystemData = () => {
  const {
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    goToPage,
  } = useFilterAndPagination();

  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const {
    data,
    error,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/server/getFilter', searchTerm],
    async ([url, searchTerm]) => {
      try {
        const response = await api.get(url);
        let systems = response.data.data || [];

        // Client-side filtering if search term exists
        if (searchTerm) {
          systems = systems.filter(s =>
            s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.host_name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        return {
          data: systems,
          total: systems.length,
        };
      } catch (error) {
        toast.error('Error fetching systems');
      }
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000, // Poll every 30 seconds for agent status
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
    systems: data?.data,
    total: data?.total,
    isLoading: loading,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    error,
    mutate,
  };
};

export default useSystemData;
