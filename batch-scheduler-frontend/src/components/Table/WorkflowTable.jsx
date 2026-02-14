import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useModal from '../../hook/useModal';
import { useDataTransition } from '../../hook/useDataTransition';
import { TableWrapper } from './TableWrapper';
import {
  Chip,
  CircularProgress,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { WF_MODE, WorkflowDetail } from '../Dialog/WorkflowDetailDialog';
import { useDetailWorkflow } from '../../hook/useWorkflowForm';
import { colorIndicator, timestampFormat } from '../../utils/helper';
import useGroupsStore from '../../hook/store/useGroupStore';
import { styleHeaderTable } from './JobResultTable';
import TableEmpty from './TableEmpty';
import DotStatus from '../CustomInput/DotStatus';

const styleTableCell = { whiteSpace: 'nowrap' };

const WorkflowTable = ({
  workflowData,
  isLoading,
  isLoadingDefault,
  setIsLoadingDefault,
  mutate,
  mode,
  setMode,
}) => {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const handleModalOpen = (row) => {
    useDetailWorkflow(row).then((res) => {
      openModal(() => {
        setGroup(undefined);
        setSelectedWorkflow(res);
      });
    });
  };

  useEffect(() => {
    if (!isLoadingDefault) return;
    const timer = setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoadingDefault]);

  const data = useDataTransition(workflowData, !workflowData, 300);

  return (
    <TableWrapper minusHeight="300px">
      <TableHead>
        <TableRow className="bg-white  sticky top-[-1px]">
          <TableCell style={styleHeaderTable}>{t('workflowName')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('group')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('repeatInterval')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('status')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('createdDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('lastStartDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('nextStartTime')}</TableCell>
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
                onDoubleClick={() => {
                  setMode(WF_MODE.VIEW);
                  handleModalOpen(row);
                }}
                className={`hover:bg-grayLight cursor-pointer ${row.latest_status === 'RUNNING' ? 'running-row' : ''}`}
                key={row.workflow_id}
              >
                <TableCell style={styleTableCell}>
                  {row.workflow_name}
                  {(!row.start_date || !row.repeat_interval) && (
                    <span style={{ float: 'right' }}>
                      <Chip label={t('needUpdate')} color="error" />
                    </span>
                  )}
                </TableCell>
                <TableCell style={styleTableCell}>{row.group}</TableCell>
                <TableCell style={styleTableCell}>{row.repeat_interval || '-'}</TableCell>
                <TableCell
                  style={styleTableCell}
                  sx={colorIndicator(row.latest_status)}
                >
                  <DotStatus value={row.latest_status} />
                </TableCell>
                <TableCell>{timestampFormat(row.frst_reg_date)}</TableCell>
                <TableCell>{timestampFormat(row.last_run_date)}</TableCell>
                <TableCell>{timestampFormat(row.next_run_date)}</TableCell>
              </TableRow>
            ))}
          </>
        ) : (
          <TableRow>
            <TableCell colSpan={14}>
              <TableEmpty />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {selectedWorkflow ? (
        <WorkflowDetail
          mode={mode}
          setMode={setMode}
          open={isVisible}
          onClose={closeModal}
          data={selectedWorkflow}
          mutate={mutate}
        />
      ) : null}
    </TableWrapper>
  );
};

export default WorkflowTable;
