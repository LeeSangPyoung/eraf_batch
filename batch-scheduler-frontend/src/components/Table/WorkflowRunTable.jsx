import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataTransition } from '../../hook/useDataTransition';
import useModal from '../../hook/useModal';
import { colorIndicator, timestampFormat } from '../../utils/helper';
import WorkflowRunDetail from '../Dialog/WorkflowRunDetail';
import { TableWrapper } from './TableWrapper';
import { CircularProgress } from '@mui/material';
import { useDetailWorkflowRun } from '../../hook/useWorkflowRun';
import DotStatus from '../CustomInput/DotStatus';
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

function WorkflowRunTable({
  workflowRunData,
  isLoading,
  isLoadingDefault,
  setIsLoadingDefault,
  search,
}) {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedWorkflowRun, setSelectedWorkflowRun] = useState(null);

  const handleModalOpen = (row) => {
    useDetailWorkflowRun(row).then((res) => {
      openModal(() => {
        setSelectedWorkflowRun(res);
      });
    });
  };
  useEffect(() => {
    setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
  }, [isLoadingDefault]);

  const data = useDataTransition(workflowRunData, !workflowRunData, 300);

  return (
    <TableWrapper minusHeight="400px">
      <TableHead>
        <TableRow className="bg-white  top-[-1px]">
          <TableCell style={styleHeaderTable}>{t('workflowRunId')}</TableCell>
          {/* <TableCell style={styleHeaderTable}>{t('workflowId')}</TableCell> */}
          <TableCell style={styleHeaderTable}>{t('workflowName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('totalJobs')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('start_date')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('end_date')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('status')}</TableCell>
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
                className={`hover:bg-grayLight cursor-pointer ${row.status === 'RUNNING' ? 'running-row' : ''}`}
                key={row.workflow_run_id}
              >
                <TableCell style={styleTableCell}>
                  {row.workflow_run_id}
                </TableCell>
                {/* <TableCell style={styleTableCell}>{row.workflow_id}</TableCell> */}
                <TableCell style={styleTableCell}>
                  {row.workflow_name}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {row.total_jobs ?? '-'}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.start_date)}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.end_date)}
                </TableCell>
                <TableCell
                  sx={colorIndicator(row.status)}
                  style={styleTableCell}
                >
                  <DotStatus value={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </>
        ) : (
          <TableRow>
            <TableCell colSpan={20}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {selectedWorkflowRun ? (
        <WorkflowRunDetail
          open={isVisible}
          onClose={closeModal}
          data={selectedWorkflowRun}
          search={search}
        />
      ) : null}
    </TableWrapper>
  );
}

export default WorkflowRunTable;
