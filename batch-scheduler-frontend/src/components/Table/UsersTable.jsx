import { CircularProgress } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useModal from '../../hook/useModal';
import { formatPhoneNumber, timestampFormat } from '../../utils/helper';
import UserDialog from '../Dialog/UserDialog';
import { TableWrapper } from './TableWrapper';
import TableEmpty from './TableEmpty';

export const styleTableCell = {
  whiteSpace: 'nowrap',
};
export const styleHeaderTable = {
  whiteSpace: 'nowrap',
  fontWeight: 'normal',
  color: 'rgba(0,0,0,0.4)',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  lineHeight: '16px',
  letterSpacing: 'normal',
};
function UsersTable({
  users,
  isLoading,
  mutate,
  isLoadingDefault,
  setIsLoadingDefault,
}) {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedRow, setSelectedRow] = useState(null);

  const handleModalOpen = (row) => {
    openModal(() => {
      setSelectedRow(row);
    });
  };

  useEffect(() => {
    if (!isLoadingDefault) return;
    const timer = setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoadingDefault]);

  return (
    <TableWrapper minusHeight="330px">
      <TableHead>
        <TableRow className="bg-white sticky top-[-1]">
          <TableCell style={styleHeaderTable}>{t('userId')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('userName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('userStatus')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('cellphone')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('email')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('loginFailCount')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('lastPasswordChangeDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('lastLoginTime')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody style={{ maxHeight: '100%', overflowY: 'auto' }}>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={12} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : users && users?.length > 0 ? (
          users.map((row) => (
            <TableRow
              className="hover:bg-grayLight cursor-pointer"
              key={row.id}
              onDoubleClick={() => handleModalOpen(row)}
            >
              <TableCell style={styleTableCell}>{row.user_id}</TableCell>
              <TableCell style={styleTableCell}>{row.user_name}</TableCell>
              <TableCell style={styleTableCell}>
                {(() => {
                  const isEnabled = row.user_status;
                  const color = isEnabled ? '#34C759' : '#8E8E93';
                  return (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        backgroundColor: `${color}15`,
                        borderRadius: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: `0 0 6px ${color}60`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: color,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {isEnabled ? t('enable') : t('disable')}
                      </span>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell style={styleTableCell}>{formatPhoneNumber(row.celp_tlno)}</TableCell>
              <TableCell style={styleTableCell}>{row.email_addr}</TableCell>
              <TableCell style={styleTableCell}>{row.lgin_fail_ncnt}</TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.last_pwd_chg_date)}
              </TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.last_login_time)}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={14}
            >
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {isVisible && (
        <UserDialog
          open={isVisible}
          onClose={closeModal}
          data={selectedRow}
          mutate={mutate}
        />
      )}
    </TableWrapper>
  );
}

export default UsersTable;
