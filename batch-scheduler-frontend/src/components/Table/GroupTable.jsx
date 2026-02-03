import { CircularProgress } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useModal from '../../hook/useModal';
import CreateAndModifyGroup from '../Dialog/CreateAndModifyGroup';
import { TableWrapper } from './TableWrapper';
import TableEmpty from './TableEmpty';
import { timestampFormat } from '../../utils/helper';

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

function GroupTable({
  groups,
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
          <TableCell style={styleHeaderTable}>{t('groupName')}</TableCell>
          <TableCell style={{ ...styleHeaderTable, textAlign: 'center' }}>{t('jobs')}</TableCell>
          <TableCell style={{ ...styleHeaderTable, textAlign: 'center' }}>{t('users')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('creator')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('createDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('lastModifier')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('lastModifyDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('comments')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody style={{ maxHeight: '100%', overflowY: 'auto' }}>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={8} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : groups && groups?.length > 0 ? (
          groups.map((row) => (
            <TableRow
              className="hover:bg-grayLight cursor-pointer"
              key={row.id}
              onDoubleClick={() => handleModalOpen(row)}
            >
              <TableCell style={styleTableCell}>{row.name}</TableCell>
              <TableCell style={{ ...styleTableCell, textAlign: 'center' }}>{row.job_count ?? 0}</TableCell>
              <TableCell style={{ ...styleTableCell, textAlign: 'center' }}>{row.user_count ?? 0}</TableCell>
              <TableCell style={styleTableCell}>{row.creator}</TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.frst_reg_date)}
              </TableCell>
              <TableCell style={styleTableCell}>{row.last_modifier}</TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.last_chg_date)}
              </TableCell>
              <TableCell style={styleTableCell}>{row.group_comments}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {isVisible && (
        <CreateAndModifyGroup
          open={isVisible}
          onClose={closeModal}
          data={selectedRow}
          jobForm={{ setValue: () => {}, clearErrors: () => {} }}
          setVisibleGroups={() => {}}
          mutate={mutate}
        />
      )}
    </TableWrapper>
  );
}

export default GroupTable;
