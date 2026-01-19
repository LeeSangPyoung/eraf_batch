import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material';
import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { timestampFormat } from '../../utils/helper';
import BaseTextField from '../CustomInput/BaseTextField';
import BaseTextArea from '../CustomInput/BaseTextArea';

function JobResultsDetail({ open, onClose, data }) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="text-2xl font-bold">
        Job Results Detail
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
        <CloseIcon className="text-2xl text-black" />
      </IconButton>
      <DialogContent className="pt-0">
        <Box className="grid grid-cols-2 gap-4 mt-4">
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
      </DialogContent>
    </Dialog>
  );
}

export default JobResultsDetail;
