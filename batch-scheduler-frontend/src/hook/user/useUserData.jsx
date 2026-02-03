import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useSWR from 'swr';
import useFilterAndPagination from '../useFilterAndPagination';
import api from '../../services/api';

const useUserData = () => {
  const [userStatus, setUserStatus] = useState('all');
  const {
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

  const handleSelectStatus = (e) => {
    setUserStatus(e.target.value)
  }

  const [shouldFetchFilters, setShouldFetchFilters] = useState(false);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const {
    data,
    error,
    isLoading: loading,
    mutate,
  } = useSWR(
    ['/user/filter', pageSize, pageNumber],
    async ([url, pageSize, pageNumber]) => {
      try {
        const input = {
          ...(group !== 'all' && { group_id: group }),
          ...(userStatus !== 'all' && { user_status: userStatus === 'true' ? true : false }),
          ...(searchTerm !== '' && { text_search: searchTerm }),
          ...{ page_size: pageSize },
          ...{ page_number: pageNumber },
        };
        const response = await api.post(url, input);
        return response.data;
      } catch (error) {
        toast.error('Error fetching user');
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
    users: data?.data,
    total: data?.total,
    isLoading: loading,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
    group,
    userStatus,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSelectStatus,
    error,
  };
};

export default useUserData;
