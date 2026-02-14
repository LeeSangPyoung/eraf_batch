import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';

const phoneRegExp =
  /^(\+?\d{0,4})?\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{3}\)?)\s?-?\s?(\(?\d{4}\)?)?$/;

const useUserForm = (userData, onClose) => {
  const { mutate: globalMutate } = useSWRConfig();

  const validationSchema = Yup.object().shape({
    user_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters')
      .trim(),
    user_id: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters')
      .trim(),
    password: Yup.string().when('userData', {
      is: (val) => !val,
      then: (schema) =>
        schema
          .required('Password is required')
          .min(10, 'Password must be at least 10 characters long.')
          .matches(
            /[A-Z]/,
            'Password must contain at least one uppercase letter.',
          )
          .matches(
            /[a-z]/,
            'Password must contain at least one lowercase letter.',
          )
          .matches(/[0-9]/, 'Password must contain at least one number.')
          .matches(
            /[!@#$%^&*(),.?":{}|<>]/,
            'Password must contain at least one special character.',
          ),
      otherwise: (schema) => schema.notRequired(),
    }),
    confirmPassword: Yup.string().when('password', {
      is: (val) => !!val,
      then: (schema) =>
        schema
          .oneOf([Yup.ref('password'), null], 'Passwords must match')
          .required('Please confirm your password'),
      otherwise: (schema) => schema.notRequired(),
    }),
    user_type: Yup.number().required(),
    email_addr: Yup.string().email(),
    celp_tlno: Yup.string()
      .nullable()
      .test('is-valid-phone', 'Phone number is not valid', function (value) {
        if (!value) return true;

        return phoneRegExp.test(value);
      }),
    userData: Yup.bool(),
    related_scheduler_group: Yup.array().of(Yup.string()).required().min(1),
  });

  const { handleSubmit, control, watch, reset } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      user_name: userData?.user_name || '',
      user_id: userData?.user_id || '',
      password: '',
      user_type: userData?.user_type || 0,
      email_addr: userData?.email_addr || '',
      celp_tlno: userData?.celp_tlno || '',
      confirmPassword: '',
      userData: !!userData,
      related_scheduler_group: userData?.related_scheduler_group || [],
    },
  });

  useEffect(() => {
    reset({
      user_name: userData?.user_name || '',
      user_id: userData?.user_id || '',
      password: '',
      user_type: userData?.user_type ?? 0,
      email_addr: userData?.email_addr || '',
      celp_tlno: userData?.celp_tlno || '',
      confirmPassword: '',
      userData: !!userData,
      related_scheduler_group: userData?.related_scheduler_group || [],
    });
  }, [userData, reset]);

  const onSubmit = async (data) => {
    try {
      let url = userData ? '/user/update' : '/user/create';
      let input = { ...data, ...(userData && { id: userData.id }) };
      delete input.userData;
      if (userData) {
        delete input.password;
        delete input.confirmPassword;
      }
      const response = await api.post(url, input);
      if (response.data.success) {
        const message = userData
          ? 'User updated successfully'
          : 'User created successfully';
        toast.success(message);
        globalMutate('/user/all');
        globalMutate('/group/getFilter');
        globalMutate((key) => Array.isArray(key) && key[0] === '/user/filter');
        onClose();
      } else {
        const msgs = Array.isArray(response.data.error_msg) ? response.data.error_msg : [response.data.error_msg];
        msgs.forEach((noti) => {
          toast.error(String(noti), { autoClose: false });
        });
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset };
};

export default useUserForm;
