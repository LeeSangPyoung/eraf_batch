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
import useJobForm from '../../hook/useJobForm';
import ActionInfoTab from '../Tab/ActionInfoTab';
import ScheduleInfoTab from '../Tab/ScheduleInfoTab';
import { ButtonWithLoading } from './JobStatusDetail';
import useAuthStore from '../../hook/store/useAuthStore';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import useModal from '../../hook/useModal.jsx';
import BaseButton from '../CustomInput/BaseButton';

const DialogCreateAndModifyJob = ({ open, onClose, data, mutate }) => {
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

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="text-black text-2xl font-bold">
        {data
          ? 'Modification of Scheduler Job'
          : 'Creation of New Scheduler Job'}
      </DialogTitle>
      <Tabs
        value={tabIndex}
        onChange={handleChange}
        sx={{
          paddingInline: '24px',
          '& .MuiTab-root': {
            color: 'rgba(0,0,0,0.4)',
            fontWeight: 'bold',
            textTransform: 'none',
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#000000',
          },
        }}
      >
        <Tab label="Schedule Info" />
        <Tab label="Action Info" />
      </Tabs>
      <DialogContent>
        <form>
          {tabIndex === 0 && (
            <ScheduleInfoTab data={data ? data : null} form={form} />
          )}
          {tabIndex === 1 && <ActionInfoTab form={form} />}
          <Box className="flex justify-end ml-auto space-x-2 mt-4">
            <BaseButton
              onClick={handleCancel}
              className="text-black "
              sx={{
                backgroundColor: 'white',
                color: 'black',
                fontWeight: '600',
                border: '2px solid #1C1C1C0D',
                boxShadow: 'none',
              }}
            >
              Cancel
            </BaseButton>
            <ButtonWithLoading
              disabled={user?.user_type !== 0}
              type="submit"
              loading={form.formState.isSubmitting}
              className="bg-black text-white"
              onClick={form.handleSubmit(submitFormData)}
            >
              Save
            </ButtonWithLoading>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isSaveConfirm}
              setCloseConfirm={closeConfirmModal}
              title="Save"
              callback={() => form.onSubmit(formData)}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>Do you want to save the Scheduler Job?</strong>
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
