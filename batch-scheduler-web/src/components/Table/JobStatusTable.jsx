import { Box, CircularProgress } from '@mui/material';
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
import JobStatusDetail from '../Dialog/JobStatusDetail';
import TableEmpty from './TableEmpty';
import { TableWrapper } from './TableWrapper';

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

function JobStatusTable({
  jobsData,
  isLoading,
  mutate,
  isLoadingDefault,
  setIsLoadingDefault,
}) {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (selectedJob && jobsData) {
      const updatedJob = jobsData.find(
        (job) => job.jobId === selectedJob.jobId,
      );
      setSelectedJob(updatedJob || null);
    }
    setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
  }, [jobsData, isLoadingDefault]);

  const handleModalOpen = (row) => {
    openModal(() => {
      setSelectedJob(row);
    });
  };

  const data = useDataTransition(jobsData, !jobsData, 300);

  return (
    <TableWrapper minusHeight="360px">
      <TableHead>
        <TableRow className="bg-white  sticky top-[-1px]">
          <TableCell style={{ ...styleHeaderTable, width: '88px' }}>
            {t('system_name')}
          </TableCell>
          <TableCell style={styleHeaderTable}>{t('creator')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('group_name')}</TableCell>
          <TableCell style={{ ...styleHeaderTable, maxWidth: '250px' }}>
            {t('job_name')}
          </TableCell>
          <TableCell style={styleHeaderTable}>Enable</TableCell>
          <TableCell style={styleHeaderTable}>{t('current_state')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('wf_registered')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('schedule')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('last_start_date')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('duration')}</TableCell>
          <TableCell style={styleHeaderTable}>Run count</TableCell>
          <TableCell style={styleHeaderTable}>Failure count</TableCell>
          <TableCell style={styleHeaderTable}>Retry count</TableCell>
          <TableCell style={styleHeaderTable}>{t('last_result')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody style={{ maxHeight: '100%', overflowY: 'auto' }}>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={12} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : data && data?.length > 0 ? (
          data.map((row) => (
            <TableRow
              className={`hover:bg-grayLight cursor-pointer `}
              key={row.jobName}
              onDoubleClick={() => handleModalOpen(row)}
              style={{
                backgroundColor:
                  row.currentState === 'RUNNING' ? '#FCA311' : '',
              }}
            >
              <TableCell style={{ ...styleTableCell }}>{row.system}</TableCell>
              <TableCell style={styleTableCell}>{row.creator}</TableCell>
              <TableCell style={styleTableCell}>{row.group}</TableCell>
              <TableCell style={{ ...styleTableCell }}>{row.jobName}</TableCell>
              <TableCell
                style={styleTableCell}
                sx={colorIndicator(row.enable.toString())}
              >
                <DotStatus value={row.enable.toString()} />
              </TableCell>
              <TableCell
                style={styleTableCell}
                sx={colorIndicator(row.currentState)}
              >
                <DotStatus value={row.currentState} />
                {/* <CustomChip
                  label={row.currentState}
                  sx={colorIndicator(row.currentState)}
                  // @ts-ignore
                  bgcolor={styleChipBackground(row.currentState)}
                /> */}
              </TableCell>
              <TableCell style={styleTableCell}>
                {row.workflowId !== null ? 'Yes' : 'No'}
              </TableCell>
              <TableCell style={styleTableCell}>
                {capitalizeFirst(row.schedule)}
              </TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.lastStartDate)}
              </TableCell>
              <TableCell style={styleTableCell}>{row.duration}</TableCell>
              <TableCell style={styleTableCell}>{row.runCount}</TableCell>
              <TableCell style={styleTableCell}>{row.failureCount}</TableCell>
              <TableCell style={styleTableCell}>{row.retryCount}</TableCell>
              <TableCell
                style={{
                  ...styleTableCell,
                }}
                sx={colorIndicator(row.lastResult)}
              >
                <DotStatus value={row.lastResult} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={14}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {selectedJob ? (
        <JobStatusDetail
          open={isVisible}
          onClose={closeModal}
          data={selectedJob}
          mutate={mutate}
        />
      ) : null}
    </TableWrapper>
  );
}

export default JobStatusTable;
