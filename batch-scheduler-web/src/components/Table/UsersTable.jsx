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
    setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
  }, [isLoadingDefault]);

  return (
    <TableWrapper minusHeight="330px">
      <TableHead>
        <TableRow className="bg-white sticky top-[-1]">
          <TableCell style={styleHeaderTable}>User ID</TableCell>
          <TableCell style={styleHeaderTable}>User Name</TableCell>
          <TableCell style={styleHeaderTable}>User Status</TableCell>
          <TableCell style={styleHeaderTable}>Cellphone</TableCell>
          <TableCell style={styleHeaderTable}>Email</TableCell>
          <TableCell style={styleHeaderTable}> Login Fail Count</TableCell>
          <TableCell style={styleHeaderTable}>Last Password Change Date</TableCell>
          <TableCell style={styleHeaderTable}> Last Login Time</TableCell>
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
              className="hover:bg-grayLight"
              key={row.id}
              onDoubleClick={() => handleModalOpen(row)}
            >
              <TableCell>{row.user_id}</TableCell>
              <TableCell>{row.user_name}</TableCell>
              <TableCell>{row.user_status ? 'ENABLE' : 'DISABLE'}</TableCell>
              <TableCell>{formatPhoneNumber(row.celp_tlno)}</TableCell>
              <TableCell>{row.email_addr}</TableCell>
              <TableCell>{row.lgin_fail_ncnt}</TableCell>
              <TableCell>
                {timestampFormat(row.last_pwd_chg_date * 1000)}
              </TableCell>
              <TableCell>
                {timestampFormat(row.last_lgin_timr * 1000)}
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
