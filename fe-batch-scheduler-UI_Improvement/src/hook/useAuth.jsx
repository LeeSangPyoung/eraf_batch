import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import api from '../services/api';
import useAuthStore from './store/useAuthStore';

const useAuth = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const validationSchema = Yup.object().shape({
    user_id: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    password: Yup.string().required('Required'),
  });

  const { handleSubmit, control, watch, reset } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      user_id: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      let url = '/user/login';
      const response = await api.post(url, data);
      if (response.data.success) {
        const jwt = response.data.data.token;
        login(jwt);
        navigate('/');
      } else {
        if (
          response.data.error_msg ===
          "('Password is expired, Please update new password',)"
        ) {
          navigate('/change-password');
        }
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error');
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset };
};

export default useAuth;
