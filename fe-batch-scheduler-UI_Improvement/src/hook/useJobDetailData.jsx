import { toast } from 'react-toastify';
import useSWR from 'swr';
import api from '../services/api';

const useJobDetailData = ({ job_id }) => {
    const { data: job } = useSWR(['/job/detail', job_id], async ([url, job_id]) => {
    try {
      const params = { params: { job_id } };
      const response = await api.get(url, params);
      return response.data.data;
    } catch (error) {
      toast.error(error);
      return null;
    }
  });

  return {
    job
  }
}

export default useJobDetailData;