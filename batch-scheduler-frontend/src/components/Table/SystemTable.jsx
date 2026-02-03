import { CircularProgress } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useModal from '../../hook/useModal';
import BatchJobServerDialog from '../Dialog/BatchJobServerDialog';
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

function SystemTable({
  systems,
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
          <TableCell style={styleHeaderTable}>{t('systemName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('hostName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('hostIpAddress')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('status')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('health')}</TableCell>
          <TableCell style={{ ...styleHeaderTable, textAlign: 'center' }}>{t('agentPort')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('folderPath')}</TableCell>
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
            <TableCell colSpan={12} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : systems && systems?.length > 0 ? (
          systems.map((row) => (
            <TableRow
              className="hover:bg-grayLight cursor-pointer"
              key={row.id}
              onDoubleClick={() => handleModalOpen(row)}
            >
              <TableCell style={styleTableCell}>{row.name}</TableCell>
              <TableCell style={styleTableCell}>{row.host_name}</TableCell>
              <TableCell style={styleTableCell}>{row.host_ip_addr}</TableCell>
              <TableCell style={styleTableCell}>
                {(() => {
                  const isOnline = row.agent_status === 'ONLINE';
                  const color = isOnline ? '#34C759' : '#8E8E93'; // Apple Green / Gray
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
                        {isOnline ? t('online') : t('offline')}
                      </span>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell style={styleTableCell}>
                {(() => {
                  // Don't show health for OFFLINE servers
                  if (row.agent_status !== 'ONLINE') {
                    return (
                      <span style={{ color: '#8E8E93', fontSize: '13px' }}>-</span>
                    );
                  }
                  const isHealthy = row.is_healthy === true;
                  const color = isHealthy ? '#34C759' : '#FF3B30'; // Green / Red
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
                          animation: isHealthy ? 'pulse 2s infinite' : 'none',
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
                        {isHealthy ? t('healthy') : t('unhealthy')}
                      </span>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell style={{ ...styleTableCell, textAlign: 'center' }}>{row.agent_port || '-'}</TableCell>
              <TableCell style={styleTableCell}>{row.folder_path}</TableCell>
              <TableCell style={styleTableCell}>{row.creator}</TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.frst_reg_date)}
              </TableCell>
              <TableCell style={styleTableCell}>{row.last_modifier}</TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.last_chg_date)}
              </TableCell>
              <TableCell style={styleTableCell}>{row.system_comments}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={12}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {isVisible && (
        <BatchJobServerDialog
          open={isVisible}
          onClose={closeModal}
          data={selectedRow}
          mutateSystem={mutate}
          jobForm={{ setValue: () => {}, clearErrors: () => {} }}
        />
      )}
    </TableWrapper>
  );
}

export default SystemTable;
