import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import { Box } from '@mui/material';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../../hook/store/useAuthStore';
import useModal from '../../hook/useModal';
import MyInfo from '../Dialog/MyInfo';
const links = [
  { to: '/job-status', text: 'job-status-label', icon: '/icons/Vector.svg' },
  {
    to: '/job-results',
    text: 'job-result-label',
    icon: '/icons/ChartPieSlice-d.svg',
  },
  { to: '/workflows', text: 'workflow-label', icon: '/icons/work flow.svg' },
  {
    to: '/workflow-runs',
    text: 'workflow-run-label',
    icon: '/icons/LineSegments.svg',
  },
];

const SideBar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const { isVisible, openModal, closeModal } = useModal();

  return (
    <aside className="p-3  w-70 border-r-2 border-grayLight">
      <Box className="flex flex-col justify-between h-full">
        <Box>
          <nav className="flex flex-col space-y-4 text-lg">
            {links.map((link) => (
              <Link
                key={link.text}
                to={link.to}
                className={clsx(
                  'hover:brightness-125 hover:bg-grayLight p-2 rounded flex items-center gap-3 relative text-l pl-4',
                  location.pathname === link.to && 'bg-grayLight',
                )}
              >
                {location.pathname === link.to && (
                  <div className="absolute left-0 top-[50%] translate-y-[-50%] w-1.5 h-[60%] rounded-lg bg-black "></div>
                )}
                <img src={link.icon} alt="" className="w-6 h-6" />
                <span> {t(link.text)}</span>
              </Link>
            ))}
            {user?.user_type === 0 && (
              <Link
                to="/user-master"
                className={clsx(
                  'hover:brightness-125 hover:bg-grayLight p-2 rounded flex items-center gap-3 relative text-l pl-4',
                  location.pathname === '/user-master' && 'bg-grayLight',
                )}
              >
                {location.pathname === '/user-master' && (
                  <div className="absolute left-0 top-[50%] translate-y-[-50%] w-1.5 h-[60%] rounded-lg bg-black "></div>
                )}
                <img src="/icons/UsersThree.svg" alt="" className="w-6 h-6" />
                <span>{t('user-master-label')}</span>
              </Link>
            )}
          </nav>
        </Box>
        <Box
          onClick={openModal}
          className="hover:brightness-125 hover:bg-grayLight p-2 rounded flex items-center gap-3 relative text-l cursor-pointer z-[1] transition-colors duration-200"
        >
          <BadgeOutlined className="w-6 h-6" />
          My Info
        </Box>
      </Box>

      {isVisible && <MyInfo onClose={closeModal} open={isVisible} />}
    </aside>
  );
};

export default SideBar;
