import { Box, Button, Dialog, DialogContent, DialogTitle } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useUserStore from '../../hook/store/useUserStore';
import useModal from '../../hook/useModal';
import useServerForm from '../../hook/useServerForm';
import api from '../../services/api';
import { cn, stopPropagate } from '../../utils/helper';
import Selected from '../CustomInput/Select';
import TextInput from '../CustomInput/TextInput';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { ButtonWithLoading } from './JobStatusDetail';
import useAuthStore from '../../hook/store/useAuthStore';
import BaseTextArea from '../CustomInput/BaseTextArea';
import BaseButton from '../CustomInput/BaseButton';

const BatchJobServerDialog = ({
  open,
  onClose,
  data,
  mutateSystem,
  jobForm,
}) => {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const users = useUserStore((state) => state.users);
  const { handleSubmit, control, onSubmit, reset, formState } = useServerForm(
    data,
    onClose,
    mutateSystem,
    jobForm,
  );
  const [loading, setLoading] = useState({ loading: false, button: '' });
  const [disable, setDisable] = useState(false);
  const {
    isVisible: isDeleteConfirm,
    openModal: openDeleteConfirmModal,
    closeModal: closeDeleteConfirmModal,
  } = useModal();

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleRestart = async () => {
    setLoading({ loading: true, button: 'restart' });
    setDisable(true);
    try {
      const response = await api.post('/server/restart', {
        redeploy: false,
        system_name: data.name,
      });
      if (response.data.success) {
        toast.success('System restart successfully');
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when restarting system');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleRedeploy = async () => {
    setLoading({ loading: true, button: 'redeploy' });
    setDisable(true);
    try {
      const response = await api.post('/server/restart', {
        redeploy: true,
        system_name: data.name,
      });
      if (response.data.success) {
        toast.success('System redeploy successfully');
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when redeploying system');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleDelete = async () => {
    setLoading({ loading: true, button: 'delete' });
    setDisable(true);
    try {
      const response = await api.delete('/server/delete', {
        data: {
          system_id: data.id,
          user_id: user?.id,
        },
      });
      if (response.data.success) {
        toast.success('System delete successfully');
        jobForm.setValue('system', null);
        mutateSystem();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when deleting system');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  return (
    <Dialog
      open={open}
      aria-labelledby="form-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="form-dialog-title">
        <div className="flex items-center justify-between w-full">
          <span className="font-bold">
            {t(data ? 'Edit Batch Job Server' : 'Create Batch Job Server')}
          </span>
          {data && (
            <div className="flex space-x-2">
              <ButtonWithLoading
                onClick={handleRestart}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'restart'}
                className="bg-[#1C1C1C0D] font-semibold"
              >
                {t('restart')}
              </ButtonWithLoading>
              <ButtonWithLoading
                onClick={handleRedeploy}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'redeploy'}
                className="bg-[#1C1C1C0D] font-semibold"
              >
                {t('redeploy')}
              </ButtonWithLoading>
              <ButtonWithLoading
                onClick={openDeleteConfirmModal}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'delete'}
                className="bg-[#1C1C1C0D] font-semibold"
              >
                {t('delete')}
              </ButtonWithLoading>
              <ConfirmDialog
                widthClassName="w-100"
                openConfirm={isDeleteConfirm}
                setCloseConfirm={closeDeleteConfirmModal}
                title="Delete"
                callback={() => handleDelete()}
              >
                <div className="w-full text-lg">
                  <p>
                    <strong>Do you want to delete the Scheduler System?</strong>
                  </p>
                </div>
              </ConfirmDialog>
            </div>
          )}
        </div>
      </DialogTitle>
      <DialogContent>
        <form
          onSubmit={stopPropagate(handleSubmit(onSubmit))}
          className="flex flex-col gap-4 mt-2"
        >
          {/* {data && (
            <FormControl variant="outlined" fullWidth className="col-span-2">
              <InputLabel required htmlFor="system_name">
                {t('System Id')}
              </InputLabel>
              <OutlinedInput
                id="system_name"
                name="system_name"
                type="text"
                label={t('System id')}
                fullWidth
                value={data.system_id || ''}
                disabled
              />
            </FormControl>
          )} */}
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="system_name"
              content="System Name"
              required
            />
            <TextInput
              control={control}
              name="host_name"
              content="Host Name"
              required
            />
          </Box>
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="host_ip_addr"
              content="Host IP Address"
              required
            />
            <TextInput
              control={control}
              name="folder_path"
              content="Folder Path"
              required
            />
          </Box>
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="secondary_host_ip_addr"
              content="Secondary Host IP Address"
            />
            <TextInput
              control={control}
              name="secondary_folder_path"
              content="Secondary Folder Path"
            />
          </Box>

          <BaseTextArea
            control={control}
            name="system_comments"
            content={t('Comments')}
          />
          {users && users.length > 0 && (
            <>
              <Selected
                control={control}
                name="frst_reg_user_id"
                options={users}
                content="Creator"
                valueKey="id"
                labelKey="user_name"
                className={cn(!data && 'col-span-2')}
                required
                disabled={!!data}
              />
              {data && (
                <Selected
                  control={control}
                  name="last_reg_user_id"
                  options={users}
                  content="Modifier*"
                  valueKey="id"
                  labelKey="user_name"
                  required
                />
              )}
            </>
          )}
          <Box className="col-span-2 ml-auto space-x-2">
            <BaseButton
              onClick={handleCancel}
              disabled={formState.isSubmitting}
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
              type="submit"
              disabled={formState.isSubmitting || !formState.isDirty}
              loading={formState.isSubmitting}
              className="bg-black text-white"
            >
              Save
            </ButtonWithLoading>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BatchJobServerDialog;
