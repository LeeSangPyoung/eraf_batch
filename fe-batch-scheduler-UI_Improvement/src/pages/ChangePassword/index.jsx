import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Button, Card } from '@mui/material';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CustomPwInput from '../../components/CustomInput/CustomPwInput';
import api from '../../services/api';
import TextInput from '../../components/CustomInput/TextInput';

function ChangePassword() {
  const navigate = useNavigate();

  const validationSchema = Yup.object().shape({
    user_id: Yup.string().required('Required'),
    old_pwd: Yup.string().required('Required'),
    user_pwd: Yup.string().when('userData', {
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
    }),
    confirmPassword: Yup.string().when('user_pwd', {
      is: (val) => !!val,
      then: (schema) =>
        schema
          .oneOf([Yup.ref('user_pwd'), null], 'Passwords must match')
          .required('Please confirm your password'),
      otherwise: (schema) => schema.required('Required'),
    }),
  });

  const { handleSubmit, control } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      user_pwd: '',
      old_pwd: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      let url = '/user/change-password';
      let input = { ...data };
      delete input.confirmPassword;
      const response = await api.post(url, input);
      if (response.data.success) {
        toast.success('Change password success');
        navigate('/sign-in');
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error');
    }
  };

  return (
    <Box className="flex flex-col min-h-screen bg-white text-black items-center justify-center space-y-8">
      <h1 className="text-4xl">TES Management System</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 min-w-[450px] grid grid-cols-1 gap-4">
          <h2 className="text-center text-xl">Change password</h2>
          <Box className="grid grid-cols-2 gap-4">
            <TextInput
              control={control}
              name="user_id"
              label="User ID"
              className="col-span-2"
              required
            />
            <CustomPwInput
              control={control}
              name="old_pwd"
              label="Old password"
            />
            <CustomPwInput
              control={control}
              label="New password"
              name="user_pwd"
            />
            <CustomPwInput
              control={control}
              label="(Re-enter) password"
              name="confirmPassword"
            />
          </Box>
          <Button variant="contained" className="text-black" type="submit">
            Submit
          </Button>
        </Card>
      </form>
    </Box>
  );
}

export default ChangePassword;
