import { Box, Button, MenuItem, Select } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../hook/store/useAuthStore';
import useModal from '../../hook/useModal';
import MyInfo from '../Dialog/MyInfo';
import { useNavigate } from 'react-router-dom';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';

import BaseButton from '../CustomInput/BaseButton';
const languages = {
  en: { nativeName: 'English' },
  kor: { nativeName: 'Korean' },
};

const Header = () => {
  const { i18n } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return (
    <header className="border-b-2 border-grayLight bg-white shadow-sm flex justify-between items-center px-6 py-4">
      <Box className="flex items-center">
        <Box
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/job-status')}
        >
          <span className="text-3xl text-primary font-bold mr-2 ">TES</span>
          <span className="text-3xl text-black font-bold font-[SourceCodePro]">
            Platform
          </span>
        </Box>
      </Box>

      <div className="flex items-center space-x-3">
        <Select
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          value={i18n.language}
          size="small"
          startAdornment={<LanguageOutlined className="mr-2 text-gray-600" />}
          sx={{
            border: 'none',
            '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
            '& .MuiSelect-select': { paddingLeft: '8px' },
          }}
          MenuProps={{
            sx: {
              '& ul': {
                padding: 0,
              },
            },
          }}
        >
          {Object.keys(languages).map((lng) => (
            <MenuItem
              key={lng}
              value={lng}
              sx={{
                borderRadius: 0,
              }}
            >
              {languages[lng].nativeName}
            </MenuItem>
          ))}
        </Select>

        <BaseButton
          theme="light"
          onClick={() => logout()}
          startIcon={<LogoutOutlined />}
        >
          Logout
        </BaseButton>
      </div>
    </header>
  );
};

export default Header;
