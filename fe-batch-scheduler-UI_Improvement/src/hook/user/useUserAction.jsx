import { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import useAuthStore from '../store/useAuthStore';

const useUserAction = (data, onClose) => {
  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();
  const [loading, setLoading] = useState({ loading: false, button: '' });
  const [disable, setDisable] = useState(false);

  const onSuccess = (message) => {
    toast.success(message);
    globalMutate('/user/all');
    globalMutate((key) => Array.isArray(key) && key[0] === '/user/filter');
    onClose();
  };

  const resetPw = async () => {
    setLoading({ loading: true, button: 'reset' });
    setDisable(true);
    try {
      const response = await api.post('/user/reset', {
        target_user_id: data?.id,
      });
      if (response.data.success) {
        onSuccess("Reset password successfully")
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when resetting password');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const lockAcc = async () => {
    setLoading({ loading: true, button: 'lock' });
    setDisable(true);
    try {
      const response = await api.post('/user/lock', {
        target_user_id: data?.id,
        user_status: false,
      });
      if (response.data.success) {
        onSuccess('Account lock successfully')
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when lock account');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const unlockAcc = async () => {
    setLoading({ loading: true, button: 'unlock' });
    setDisable(true);
    try {
      const response = await api.post('/user/lock', {
        target_user_id: data?.id,
        user_status: true,
      });
      if (response.data.success) {
        onSuccess('Account unlock successfully')
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when unlock account');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const remove = async () => {
    setLoading({loading: true, button: 'delete'});
    setDisable(true);
    try {
      const response = await api.delete('/user/delete', {
        data: {
          id: data?.id,
          // user_id: user?.id,
        },
      });
      if (response.data.success) {
        onSuccess('User delete successfully');
      } else {
        toast.error(response.data.error_msg, {autoClose: false});
      }
    } catch (error) {
        toast.error('Error when deleting user');
    } finally {
        setLoading({loading: false, button: ''});
        setDisable(false);
    }
  };

  return {
    resetPw,
    lockAcc,
    unlockAcc,
    remove,
    loading,
    disable,
  };
};

export default useUserAction;
