import { Box, Button, Card, TextField, Typography } from '@mui/material';
import React from 'react';
import useAuth from '../../hook/useAuth';
import TextInput from '../../components/CustomInput/TextInput';
import CustomPwInput from '../../components/CustomInput/CustomPwInput';

function SignIn() {
  const { handleSubmit, control, onSubmit, reset } = useAuth();
  return (
    <Box
      className={`flex flex-col min-h-screen text-white items-center justify-center space-y-8 bg-[url('/images/login.png')] bg-cover`}
    >
      <Typography className="fixed top-5 left-6 text-primary text-4xl font-bold ">
        Tes
      </Typography>

      <Box className="flex gap-3 ">
        <Typography className="text-primary text-3xl font-bold  ">
          TES
        </Typography>
        <Typography className=" text-black text-3xl font-bold">
          Management System
        </Typography>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card
          className=" min-w-[450px] grid grid-cols-1 gap-4"
          sx={{ border: 'none', boxShadow: 'none' }}
        >
          <Box className="flex flex-col border-none">
              <Typography className="text-l font-semibold text-secondaryGray">
                ID
              </Typography>
              <TextInput
                control={control}
                name="user_id"
                placeholder="Enter your ID"
                isBackgroundGray
              />
              <Typography className=" mt-4 text-l font-semibold text-secondaryGray">
                Password <span className='text-red-500 font-bold'>*</span>
              </Typography>
              <CustomPwInput
                isBackgroundGray={true}
                control={control}
                placeholder="Enter your password"
                name="password"
              />
          </Box>
          <Box className="text-gray text-left max-w-[480px]">
            <ul className="list-disc pl-5 text-[15px] font-medium space-y-2">
              <li>
                비밀번호 5회 실패로 로그인 불가 시 TANGO-EC에 문의 바랍니다.
              </li>
              <li>
                부당한 방법으로 허가없이 전산망에 접속하거나 전산시스템의 자료를
                삭제, 변경, 유출하는 자는 국가 법령 및 관련 규정에 의해 처벌을
                받게 됩니다
              </li>
            </ul>
          </Box>
          <Button
            variant="contained"
            className="text-white bg-black"
            type="submit"
          >
            Log In
          </Button>
        </Card>
      </form>
    </Box>
  );
}

export default SignIn;
