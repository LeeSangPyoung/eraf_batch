import { Box, Checkbox, CircularProgress } from '@mui/material';
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
  selectedJobIds = [],
  onSelectionChange,
}) {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    if (selectedJob && jobsData) {
      const updatedJob = jobsData.find(
        (job) => job.job_id === selectedJob.job_id,
      );
      setSelectedJob(updatedJob || null);
    }
  }, [jobsData]);

  useEffect(() => {
    if (!isLoadingDefault) return;
    const timer = setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoadingDefault]);

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
          {onSelectionChange && (
            <TableCell style={{ ...styleHeaderTable, width: '48px', padding: '0 8px' }}>
              <Checkbox
                size="small"
                checked={data?.length > 0 && selectedJobIds.length === data.length}
                indeterminate={selectedJobIds.length > 0 && selectedJobIds.length < (data?.length || 0)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectionChange(data.map((row) => row.job_id));
                  } else {
                    onSelectionChange([]);
                  }
                }}
              />
            </TableCell>
          )}
          <TableCell style={{ ...styleHeaderTable, width: '88px' }}>
            {t('system_name')}
          </TableCell>
          <TableCell style={styleHeaderTable}>{t('creator')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('group_name')}</TableCell>
          <TableCell style={{ ...styleHeaderTable, maxWidth: '250px' }}>
            {t('job_name')}
          </TableCell>
          <TableCell style={styleHeaderTable}>{t('enable')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('current_state')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('job_type')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('workflowName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('schedule')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('last_start_date')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('last_result')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('duration')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('runCount')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('failureCount')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('retryCount')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody style={{ maxHeight: '100%', overflowY: 'auto' }}>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={onSelectionChange ? 16 : 15} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : data && data?.length > 0 ? (
          data.map((row) => (
            <TableRow
              className={`hover:bg-grayLight cursor-pointer ${row.current_state === 'RUNNING' ? 'running-row' : ''}`}
              key={row.job_name}
              onDoubleClick={() => handleModalOpen(row)}
              selected={selectedJobIds.includes(row.job_id)}
            >
              {onSelectionChange && (
                <TableCell style={{ ...styleTableCell, padding: '0 8px' }}>
                  <Checkbox
                    size="small"
                    checked={selectedJobIds.includes(row.job_id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange([...selectedJobIds, row.job_id]);
                      } else {
                        onSelectionChange(selectedJobIds.filter((id) => id !== row.job_id));
                      }
                    }}
                  />
                </TableCell>
              )}
              <TableCell style={{ ...styleTableCell }}>{row.system}</TableCell>
              <TableCell style={styleTableCell}>{row.creator}</TableCell>
              <TableCell style={styleTableCell}>{row.group}</TableCell>
              <TableCell style={{ ...styleTableCell }}>{row.job_name}</TableCell>
              <TableCell
                style={styleTableCell}
                sx={colorIndicator(row.enable?.toString())}
              >
                <DotStatus value={row.enable?.toString()} />
              </TableCell>
              <TableCell
                style={styleTableCell}
                sx={colorIndicator(row.enable === false ? 'DISABLED' : row.current_state)}
              >
                <DotStatus value={row.enable === false ? 'DISABLED' : row.current_state} />
              </TableCell>
              <TableCell style={styleTableCell}>
                {row.jobType === 'REST_API' ? 'REST API' : row.jobType === 'EXECUTABLE' ? 'Executable' : row.jobType}
              </TableCell>
              <TableCell style={styleTableCell}>
                {row.workflowName || row.workflow_name || ''}
              </TableCell>
              <TableCell style={styleTableCell}>
                {capitalizeFirst(row.schedule)}
              </TableCell>
              <TableCell style={styleTableCell}>
                {timestampFormat(row.lastStartDate)}
              </TableCell>
              <TableCell
                style={styleTableCell}
                sx={colorIndicator(row.lastResult)}
              >
                <DotStatus value={row.lastResult} />
              </TableCell>
              <TableCell style={styleTableCell}>{row.duration}</TableCell>
              <TableCell style={styleTableCell}>{row.runCount}</TableCell>
              <TableCell style={styleTableCell}>{row.failureCount}</TableCell>
              <TableCell style={styleTableCell}>{row.retryCount}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={onSelectionChange ? 16 : 15}>
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
