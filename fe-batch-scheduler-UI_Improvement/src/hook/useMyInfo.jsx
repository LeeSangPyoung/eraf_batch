import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';

const useMyInfo = () => {
  const {
    data: info,
    isLoading,
    error,
    mutate,
  } = useSWR('/user/info', async (url) => {
    try {
      const response = await api.get(url);
      return response.data.data[0];
    } catch (error) {
      toast.error('Error fetching users');
      return [];
    }
  });

  return {
    info,
    isLoading,
    error,
    mutate,
  };
};

export default useMyInfo;
