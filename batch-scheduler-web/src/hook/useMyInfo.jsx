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
      // Server returns single object, not array
      return response.data.data;
    } catch (error) {
      toast.error('Error fetching user info');
      return null;
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
