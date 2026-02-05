import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useJobForm from '../../hook/useJobForm';
import ActionInfoTab from '../Tab/ActionInfoTab';
import ScheduleInfoTab from '../Tab/ScheduleInfoTab';
import { ButtonWithLoading } from './JobStatusDetail';
import useAuthStore from '../../hook/store/useAuthStore';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import useModal from '../../hook/useModal.jsx';
import BaseButton from '../CustomInput/BaseButton';

const DialogCreateAndModifyJob = ({ open, onClose, data, mutate }) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [tabIndex, setTabIndex] = useState(0);
  const [formData, setFormData] = useState({});

  const resetTab = () => {
    setTabIndex(0);
  };

  const form = useJobForm(data, onClose, mutate, resetTab);

  const {
    isVisible: isSaveConfirm,
    openModal: openConfirmModal,
    closeModal: closeConfirmModal,
  } = useModal();

  const handleCancel = () => {
    onClose();
    form.reset();
    resetTab();
  };

  const handleChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  const submitFormData = (values) => {
    const data = {
      ...values,
      system_id: values.system.id,
      group_id: values.group.id,
    };
    setFormData(data);
    openConfirmModal();
  };

  // Field name mapping for error messages
  const fieldNames = {
    system: t('server') || 'Server',
    group: t('group') || 'Group',
    job_name: t('job_name') || 'Job Name',
    start_date: t('start_date') || 'Start Date & Time',
    end_date: t('end_date') || 'End Date & Time',
    repeat_interval: t('repeat_interval') || 'Repeat Interval',
    job_action: t('job_action') || 'Job Action / URL',
    job_type: t('job_type') || 'Job Type',
    http_method: 'HTTP Method',
    job_body: 'Request Body',
  };

  // Handle validation errors - show toast with error details
  const handleValidationErrors = (errors) => {
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstErrorField = errorFields[0];
      const fieldName = fieldNames[firstErrorField] || firstErrorField;
      const errorMessage = errors[firstErrorField]?.message || errors[firstErrorField]?.id?.message || t('requiredFieldsMissing');

      // Switch to the appropriate tab if the error is on a different tab
      const scheduleInfoFields = ['system', 'group', 'job_name', 'start_date', 'end_date', 'repeat_interval'];
      const actionInfoFields = ['job_action', 'job_type', 'http_method', 'job_body', 'job_headers'];

      if (scheduleInfoFields.includes(firstErrorField) && tabIndex !== 0) {
        setTabIndex(0);
      } else if (actionInfoFields.includes(firstErrorField) && tabIndex !== 1) {
        setTabIndex(1);
      }

      toast.error(`${fieldName}: ${errorMessage}`, { autoClose: 5000 });
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16)',
          overflow: 'hidden',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '16px 20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {data
          ? t('modificationOfSchedulerJob')
          : t('creationOfNewSchedulerJob')}
      </DialogTitle>
      <Tabs
        value={tabIndex}
        onChange={handleChange}
        sx={{
          paddingInline: '20px',
          borderBottom: '1px solid #E8E8ED',
          minHeight: '40px',
          '& .MuiTabs-indicator': {
            backgroundColor: '#0071E3',
            height: '2px',
            borderRadius: '2px 2px 0 0',
          },
          '& .MuiTab-root': {
            color: '#86868B',
            fontWeight: 500,
            fontSize: '13px',
            textTransform: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            minHeight: '40px',
            padding: '8px 16px',
            transition: 'color 0.2s ease',
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
        <Tab label={t('scheduleInfo')} />
        <Tab label={t('actionInfo')} />
      </Tabs>
      <DialogContent sx={{ padding: '16px 20px' }}>
        <form>
          {tabIndex === 0 && (
            <ScheduleInfoTab data={data ? data : null} form={form} />
          )}
          {tabIndex === 1 && <ActionInfoTab form={form} />}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #E8E8ED',
            }}
          >
            <BaseButton onClick={handleCancel} theme="secondary">
              {t('cancel')}
            </BaseButton>
            <BaseButton
              disabled={user?.user_type !== 0}
              type="submit"
              theme="primary"
              onClick={form.handleSubmit(submitFormData, handleValidationErrors)}
            >
              {form.formState.isSubmitting ? t('saving') : t('save')}
            </BaseButton>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isSaveConfirm}
              setCloseConfirm={closeConfirmModal}
              title={t('save')}
              callback={() => form.onSubmit(formData)}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToSaveJob')}</strong>
                </p>
              </div>
            </ConfirmDialog>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DialogCreateAndModifyJob;
