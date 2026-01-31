import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import React, { useState } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { timestampFormat } from '../../utils/helper';
import BaseTextField from '../CustomInput/BaseTextField';
import BaseTextArea from '../CustomInput/BaseTextArea';
import RealtimeLogViewer from '../Log/RealtimeLogViewer';

function JobResultsDetail({ open, onClose, data }) {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);

  const handleChangeTab = (event, newValue) => {
    setTabIndex(newValue);
  };

  const handleClose = () => {
    setTabIndex(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '20px 24px 12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        }}
      >
        {t('jobResultsDetail')}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          width: '32px',
          height: '32px',
          color: '#86868B',
          backgroundColor: '#F5F5F7',
          borderRadius: '50%',
          '&:hover': {
            backgroundColor: '#E8E8ED',
            color: '#1D1D1F',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '18px' }} />
      </IconButton>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={handleChangeTab}
        sx={{
          paddingInline: '24px',
          borderBottom: '1px solid #E8E8ED',
          minHeight: '40px',
          '& .MuiTabs-indicator': {
            backgroundColor: '#0071E3',
            height: '2px',
          },
          '& .MuiTab-root': {
            color: '#86868B',
            fontWeight: 500,
            fontSize: '13px',
            textTransform: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            minHeight: '40px',
            padding: '8px 16px',
            '&:hover': {
              color: '#1D1D1F',
            },
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#0071E3',
            fontWeight: 600,
          },
        }}
      >
        <Tab label={t('info') || 'Info'} />
        <Tab label={t('log') || 'Log'} />
      </Tabs>

      <DialogContent sx={{ padding: '16px 24px 24px' }}>
        {/* Info Tab */}
        {tabIndex === 0 && (
          <Box className="grid grid-cols-2 gap-4 mt-2">
            <BaseTextField
              disabled
              value={data.log_id || ''}
              content={t('logId')}
            />
            <BaseTextField
              disabled
              value={timestampFormat(data.log_date) || ''}
              content={t('logDate')}
            />
            <BaseTextField
              disabled
              value={data.job_name || ''}
              content={t('job_name')}
            />
            <BaseTextField
              disabled
              value={data.system_name || ''}
              content={t('system_id')}
            />
            <BaseTextField
              disabled
              value={data.group_name || ''}
              content={t('group_name')}
            />
            <BaseTextField
              disabled
              value={data.operation || ''}
              content={t('operation')}
            />
            <BaseTextField disabled value={data.status || ''} content={t('status')} />
            <BaseTextField
              disabled
              value={data.user_name || ''}
              content={t('user')}
            />
            <BaseTextField
              disabled
              value={data.error_no || ''}
              content={t('errorNo')}
            />
            <BaseTextField
              disabled
              value={data.run_duration || ''}
              content={t('runDuration')}
            />
            <BaseTextField
              disabled
              value={timestampFormat(data.req_start_date) || ''}
              content={t('reqStartDate')}
            />
            <BaseTextField
              disabled
              value={timestampFormat(data.actual_start_date) || ''}
              content={t('actualStartDate')}
            />
            <BaseTextField
              disabled
              value={data.additional_info || ''}
              content={t('additionalInfo')}
            />
            <BaseTextField
              disabled
              value={data.errors || ''}
              content={t('errors')}
              inputprops={{ style: { padding: '10px' } }}
            />
            <BaseTextArea
              disabled
              isRawInput
              value={data.output || ''}
              content={t('output')}
              inputprops={{ style: { padding: '10px' } }}
              className="col-span-2"
            />
          </Box>
        )}

        {/* Log Tab */}
        {tabIndex === 1 && (
          <Box sx={{ marginTop: '8px' }}>
            <RealtimeLogViewer
              key={data.log_id}
              taskId={String(data.log_id)}
              jobId={data.job_id}
              isRunning={data.status === 'RUNNING'}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JobResultsDetail;
