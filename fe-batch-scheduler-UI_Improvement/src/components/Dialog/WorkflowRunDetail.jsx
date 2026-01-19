import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import React from 'react';

import SimpleBar from 'simplebar-react';
import CloseIcon from '@mui/icons-material/Close';
import { timestampFormat } from '../../utils/helper';
import { useTranslation } from 'react-i18next';
import { BrightTextField } from '../CustomInput/TextInput';
import WorkflowRunLogsTable from '../Table/WorkflowRunLogsTable';
import CustomTablePagination from '../Table/CustomTablePagination';
import useWorkflowRun from '../../hook/useWorkflowRun';
import useGroupsStore from '../../hook/store/useGroupStore';
import BaseTextField from '../CustomInput/BaseTextField';

function WorkflowRunDetail({ open, onClose, data, search }) {
  const { t } = useTranslation();
  const group = useGroupsStore((state) => state.group);
  const {
    isLoading,
    isLoadingDefault,
    setIsLoadingDefault,
    pageNumber,
    pageSize,
    handleChangePage,
    handleChangeRowsPerPage,
  } = useWorkflowRun({ groupId: group, search });

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="text-2xl font-bold">
        Workflow Run Detail
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon className="text-black text-3xl" />
      </IconButton>
      <DialogContent>
        <SimpleBar style={{ maxHeight: '70vh', paddingBottom: 15 }}>
          <Box className="grid grid-cols-2 gap-4 mt-4">
            <BaseTextField
              disabled
              value={data.workflow_run_id || ''}
              content={t('workflowRunId')}
              textStyles={'text-grayDark'}
            />
            {/* <BaseTextField
              disabled
              value={data.workflow_id || ''}
              content={t('workflowId')}
            /> */}
            <BaseTextField
              disabled
              value={data.workflow_name || ''}
              content={t('workflowName')}
              textStyles={'text-grayDark'}
            />
            <BaseTextField
              disabled
              value={timestampFormat(data.start_date) || ''}
              content={t('start_date')}
              textStyles={'text-grayDark'}
            />
            <BaseTextField
              disabled
              value={timestampFormat(data.end_date) || ''}
              content={t('end_date')}
              textStyles={'text-grayDark'}
            />
          </Box>
          <Box className="mt-4">
            <BaseTextField
              disabled
              value={data.status}
              content={t('status')}
              textStyles={'text-grayDark'}
            />
          </Box>
          <Box
            marginTop={2}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <SimpleBar style={{ height: '100%', overflow: 'auto' }}>
                <WorkflowRunLogsTable
                  workflowRunLogsData={data.logs}
                  isLoading={isLoading}
                  isLoadingDefault={isLoadingDefault}
                  setIsLoadingDefault={setIsLoadingDefault}
                />
              </SimpleBar>
            </Box>
            {data.logs.length > 0 ? (
              <CustomTablePagination
                count={data.logs.length}
                page={pageNumber - 1}
                rowsPerPage={pageSize}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                customclassname="w-fit"
              />
            ) : null}
          </Box>
        </SimpleBar>
      </DialogContent>
    </Dialog>
  );
}

export default WorkflowRunDetail;
