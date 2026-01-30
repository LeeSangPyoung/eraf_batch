import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';
import useFilterAndPagination from './useFilterAndPagination';

const useGroupData = () => {
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
    ['/group/getFilter', pageSize, pageNumber, searchTerm],
    async ([url, pageSize, pageNumber, searchTerm]) => {
      try {
        const params = new URLSearchParams({
          page_size: pageSize,
          page_number: pageNumber,
          ...(searchTerm !== '' && { search_text: searchTerm }),
        });
        const response = await api.get(`${url}?${params.toString()}`);
        return response.data;
      } catch (error) {
        toast.error('Error fetching groups');
      }
    },
    {
      revalidateOnFocus: false,
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
    groups: data?.data,
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
  };
};

export default useGroupData;
