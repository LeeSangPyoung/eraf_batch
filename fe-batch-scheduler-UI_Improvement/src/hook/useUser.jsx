import useSWR from 'swr';
import api from '../services/api';
import { toast } from 'react-toastify';

const useUser = () => {
  const {
    data: users,
    isLoading,
    error,
    mutate,
  } = useSWR('/user/all', async (url) => {
    try {
      const response = await api.get(url);
      return response.data.data;
    } catch (error) {
      toast.error('Error fetching users');
      return [];
    }
  });

  return {
    users,
    isLoading,
    error,
    mutate,
  };
};

export default useUser;
