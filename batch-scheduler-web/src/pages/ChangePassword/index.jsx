import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography } from '@mui/material';
import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CustomPwInput from '../../components/CustomInput/CustomPwInput';
import api from '../../services/api';
import TextInput from '../../components/CustomInput/TextInput';
import BaseButton from '../../components/CustomInput/BaseButton';

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F7 100%)',
        padding: '24px',
      }}
    >
      {/* Logo - Top Left */}
      <Typography
        sx={{
          position: 'fixed',
          top: '24px',
          left: '32px',
          fontSize: '24px',
          fontWeight: 700,
          color: '#1D1D1F',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        ERAF
      </Typography>

      {/* Main Card */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
          padding: '48px 40px',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', marginBottom: '32px' }}>
          <Typography
            sx={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#1D1D1F',
              marginBottom: '8px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            Change Password
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#86868B',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            Enter your credentials to update your password
          </Typography>
        </Box>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TextInput
              control={control}
              name="user_id"
              content="User ID"
              required
            />
            <CustomPwInput
              control={control}
              name="old_pwd"
              content="Current Password"
            />
            <CustomPwInput
              control={control}
              content="New Password"
              name="user_pwd"
            />
            <CustomPwInput
              control={control}
              content="Confirm New Password"
              name="confirmPassword"
            />

            {/* Submit Button */}
            <BaseButton
              type="submit"
              theme="primary"
              size="large"
              sx={{
                width: '100%',
                marginTop: '12px',
                height: '50px',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              Update Password
            </BaseButton>

            {/* Back to Sign In */}
            <BaseButton
              theme="ghost"
              onClick={() => navigate('/sign-in')}
              sx={{ width: '100%' }}
            >
              Back to Sign In
            </BaseButton>
          </Box>
        </form>
      </Box>
    </Box>
  );
}

export default ChangePassword;
