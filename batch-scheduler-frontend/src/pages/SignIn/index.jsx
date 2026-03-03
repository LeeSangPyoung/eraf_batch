import { Box } from '@mui/material';
import React from 'react';
import useAuth from '../../hook/useAuth';
import TextInput from '../../components/CustomInput/TextInput';
import CustomPwInput from '../../components/CustomInput/CustomPwInput';
import BaseButton from '../../components/CustomInput/BaseButton';

// System font stack for proper bold rendering (Pretendard only has weight 400)
const systemFont = "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif";

function SignIn() {
  const { handleSubmit, control, onSubmit, reset } = useAuth();

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', fontFamily: systemFont }}>
      {/* Left Panel - Dark Navy Branding */}
      <div
        style={{
          flex: 1,
          background: '#001529',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 60,
        }}
      >
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: 8,
              marginBottom: 20,
              color: '#fff',
            }}
          >
            ERAF
          </div>
          <div
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.75)',
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            Enterprise Reusable Asset Factory
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Batch Scheduler
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        style={{
          width: 480,
          background: '#fff',
          padding: '80px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 4,
              color: 'rgba(0, 0, 0, 0.88)',
              lineHeight: 1.3,
            }}
          >
            로그인
          </div>
          <div style={{ color: '#666', fontSize: 13 }}>
            ERAF Batch Scheduler
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ID Field */}
            <div>
              <div style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.88)', marginBottom: 8 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>아이디
              </div>
              <TextInput
                control={control}
                name="user_id"
                placeholder="아이디를 입력하세요"
                isBackgroundGray={false}
                height="40px"
              />
            </div>

            {/* Password Field */}
            <div>
              <div style={{ fontSize: 14, color: 'rgba(0, 0, 0, 0.88)', marginBottom: 8 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>비밀번호
              </div>
              <CustomPwInput
                isBackgroundGray={false}
                control={control}
                placeholder="비밀번호를 입력하세요"
                name="password"
                height="40px"
              />
            </div>

            {/* Submit Button */}
            <BaseButton
              type="submit"
              theme="primary"
              size="large"
              sx={{
                width: '100%',
                height: '40px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '8px !important',
                backgroundColor: '#1677ff !important',
                '&:hover': {
                  backgroundColor: '#4096ff !important',
                  boxShadow: '0 2px 0 rgba(5, 145, 255, 0.1)',
                },
              }}
            >
              로그인
            </BaseButton>
          </div>
        </form>

        {/* Notice Section */}
        <div style={{ marginTop: 24, fontSize: 12, color: '#999', lineHeight: 1.8 }}>
          • 비밀번호 5회 실패로 로그인 불가 시 TANGO-EC에 문의 바랍니다.
          <br />
          • 부당한 방법으로 허가없이 전산망에 접속하거나 전산시스템의 자료를
          삭제, 변경, 유출하는 자는 국가 법령 및 관련 규정에 의해 처벌을
          받게 됩니다.
        </div>
      </div>
    </div>
  );
}

export default SignIn;
