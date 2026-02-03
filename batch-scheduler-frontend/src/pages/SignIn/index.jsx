import { Box, Typography } from '@mui/material';
import React from 'react';
import useAuth from '../../hook/useAuth';
import TextInput from '../../components/CustomInput/TextInput';
import CustomPwInput from '../../components/CustomInput/CustomPwInput';
import BaseButton from '../../components/CustomInput/BaseButton';

function SignIn() {
  const { handleSubmit, control, onSubmit, reset } = useAuth();

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
          maxWidth: '400px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
          padding: '48px 40px',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', marginBottom: '40px' }}>
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
            Welcome back
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#86868B',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            Sign in to ERAF Scheduler
          </Typography>
        </Box>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ID Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                }}
              >
                ID
              </Typography>
              <TextInput
                control={control}
                name="user_id"
                placeholder="Enter your ID"
                isBackgroundGray={false}
              />
            </Box>

            {/* Password Field */}
            <Box>
              <Typography
                sx={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1D1D1F',
                  marginBottom: '8px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                }}
              >
                Password <span style={{ color: '#FF3B30' }}>*</span>
              </Typography>
              <CustomPwInput
                isBackgroundGray={false}
                control={control}
                placeholder="Enter your password"
                name="password"
              />
            </Box>

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
              Sign In
            </BaseButton>
          </Box>
        </form>

        {/* Notice Section */}
        <Box
          sx={{
            marginTop: '32px',
            padding: '16px',
            backgroundColor: '#F5F5F7',
            borderRadius: '12px',
          }}
        >
          <Typography
            sx={{
              fontSize: '12px',
              color: '#86868B',
              lineHeight: 1.6,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            <Box component="span" sx={{ display: 'block', marginBottom: '8px' }}>
              • 비밀번호 5회 실패로 로그인 불가 시 TANGO-EC에 문의 바랍니다.
            </Box>
            <Box component="span" sx={{ display: 'block' }}>
              • 부당한 방법으로 허가없이 전산망에 접속하거나 전산시스템의 자료를
              삭제, 변경, 유출하는 자는 국가 법령 및 관련 규정에 의해 처벌을
              받게 됩니다.
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default SignIn;
