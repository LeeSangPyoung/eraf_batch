import { CircularProgress } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataTransition } from '../../hook/useDataTransition';
import useModal from '../../hook/useModal';
import {
  capitalizeFirst,
  colorIndicator,
  timestampFormat,
} from '../../utils/helper';
import DotStatus from '../CustomInput/DotStatus';
import JobResultsDetail from '../Dialog/JobResultsDetail';
import { TableWrapper } from './TableWrapper';
import TableEmpty from './TableEmpty';

export const styleTableCell = { whiteSpace: 'nowrap' };

export const styleHeaderTable = {
  whiteSpace: 'nowrap',
  fontWeight: 'normal',
  color: 'rgba(0,0,0,0.4)',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  lineHeight: '16px',
  letterSpacing: 'normal',
};

function JobResultTable({
  jobResultData,
  isLoading,
  isLoadingDefault,
  setIsLoadingDefault,
  isShort = false,
}) {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedJob, setSelectedJob] = useState(null);

  const handleModalOpen = (row) => {
    openModal(() => {
      setSelectedJob(row);
    });
  };
  useEffect(() => {
    setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
  }, [isLoadingDefault]);

  const data = useDataTransition(jobResultData, !jobResultData, 300);

  return (
    <TableWrapper minusHeight="350px">
      <TableHead>
        <TableRow className="bg-white  sticky top-[-1px]">
          <TableCell style={styleHeaderTable}>{t('logId')}</TableCell>
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('logDate')}</TableCell>
          )}
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('system_id')}</TableCell>
          )}
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('group_name')}</TableCell>
          )}
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('job_name')}</TableCell>
          )}
          <TableCell style={styleHeaderTable}>{t('batchType')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('operation')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('status')}</TableCell>
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('retryCount')}</TableCell>
          )}
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('user')}</TableCell>
          )}
          <TableCell style={styleHeaderTable}>{t('errorNo')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('reqStartDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('actualStartDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('actualEndDate')}</TableCell>
          {!isShort && (
            <TableCell style={styleHeaderTable}>{t('runDuration')}</TableCell>
          )}
          {!isShort && (
            <TableCell style={styleHeaderTable}>
              {t('additionalInfo')}
            </TableCell>
          )}
          <TableCell style={styleHeaderTable}>{t('errors')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('output')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody className="transition">
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={12} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : data && data.length > 0 ? (
          <>
            {data?.map((row) => (
              <TableRow
                onDoubleClick={() => handleModalOpen(row)}
                className="hover:bg-grayLight"
                key={row.log_id}
              >
                <TableCell style={styleTableCell}>{row.log_id}</TableCell>
                {!isShort && (
                  <TableCell style={styleTableCell}>
                    {timestampFormat(row.log_date)}
                  </TableCell>
                )}
                {!isShort && (
                  <TableCell style={styleTableCell}>
                    {row.system_name}
                  </TableCell>
                )}
                {!isShort && (
                  <TableCell style={styleTableCell}>{row.group_name}</TableCell>
                )}
                {!isShort && (
                  <TableCell style={styleTableCell}>{row.job_name}</TableCell>
                )}
                <TableCell style={styleTableCell}>{row.batch_type}</TableCell>
                <TableCell style={styleTableCell}>
                  {capitalizeFirst(row.operation)}
                </TableCell>
                <TableCell
                  sx={colorIndicator(row.status)}
                  style={styleTableCell}
                >
                  <DotStatus value={row.status} />
                </TableCell>
                {!isShort && (
                  <TableCell style={styleTableCell}>
                    {row.retry_count}
                  </TableCell>
                )}
                {!isShort && (
                  <TableCell style={styleTableCell}>{row.user_name}</TableCell>
                )}
                <TableCell style={styleTableCell}>
                  {row.error_no === 0 ? null : row.error_no}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.req_start_date)}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.actual_start_date)}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.actual_end_date)}
                </TableCell>
                {!isShort && (
                  <TableCell style={styleTableCell}>
                    {row.run_duration}
                  </TableCell>
                )}
                {!isShort && (
                  <TableCell style={styleTableCell}>
                    {row.additional_info}
                  </TableCell>
                )}
                <TableCell style={styleTableCell}>{row.errors}</TableCell>
                <TableCell
                  className="truncate w-[150px] max-w-[300px]"
                  style={styleTableCell}
                >
                  {row.output}
                </TableCell>
              </TableRow>
            ))}
          </>
        ) : (
          <TableRow>
            <TableCell colSpan={18}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {selectedJob ? (
        <JobResultsDetail
          open={isVisible}
          onClose={closeModal}
          data={selectedJob}
        />
      ) : null}
    </TableWrapper>
  );
}

export default JobResultTable;
