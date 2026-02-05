import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';

const useJobDetailData = ({ job_id, refreshInterval = 2000 }) => {
    const { data: job, mutate } = useSWR(
      job_id ? ['/job/detail', job_id] : null,
      async ([url, job_id]) => {
        try {
          const params = { params: { job_id } };
          const response = await api.get(url, params);
          return response.data.data;
        } catch (error) {
          // Don't show toast for background refresh errors
          console.error('Error fetching job detail:', error);
          return null;
        }
      },
      {
        refreshInterval, // Poll every 2 seconds for real-time updates
        revalidateOnFocus: true,
        dedupingInterval: 1000,
      }
    );

  return {
    job,
    refreshJobDetail: mutate,
  }
}

export default useJobDetailData;