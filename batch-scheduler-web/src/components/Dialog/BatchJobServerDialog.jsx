import { Box, Dialog, DialogContent, DialogTitle } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useModal from '../../hook/useModal';
import useServerForm from '../../hook/useServerForm';
import api from '../../services/api';
import { stopPropagate } from '../../utils/helper';
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
  const { handleSubmit, control, onSubmit, reset, formState } = useServerForm(
    data,
    onClose,
    mutateSystem,
    jobForm,
  );
  const [loading, setLoading] = useState({ loading: false, button: '' });
  const [disable, setDisable] = useState(false);
  const [agentStatus, setAgentStatus] = useState(data?.agent_status);
  const {
    isVisible: isDeleteConfirm,
    openModal: openDeleteConfirmModal,
    closeModal: closeDeleteConfirmModal,
  } = useModal();
  const {
    isVisible: isStopConfirm,
    openModal: openStopConfirmModal,
    closeModal: closeStopConfirmModal,
  } = useModal();
  const {
    isVisible: isStartConfirm,
    openModal: openStartConfirmModal,
    closeModal: closeStartConfirmModal,
  } = useModal();
  const {
    isVisible: isRedeployConfirm,
    openModal: openRedeployConfirmModal,
    closeModal: closeRedeployConfirmModal,
  } = useModal();
  const {
    isVisible: isSaveConfirm,
    openModal: openSaveConfirmModal,
    closeModal: closeSaveConfirmModal,
  } = useModal();

  // Sync agentStatus when data changes
  useEffect(() => {
    setAgentStatus(data?.agent_status);
  }, [data?.agent_status]);

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleStop = async () => {
    setLoading({ loading: true, button: 'stop' });
    setDisable(true);
    try {
      const response = await api.post('/server/stop', {
        system_name: data.name,
      });
      if (response.data.success) {
        toast.success(t('agentStoppedSuccess'));
        setAgentStatus('OFFLINE');
        mutateSystem();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorStoppingAgent'));
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleStart = async () => {
    setLoading({ loading: true, button: 'start' });
    setDisable(true);
    try {
      const response = await api.post('/server/start', {
        system_name: data.name,
      });
      if (response.data.success) {
        toast.success(t('agentStartedSuccess'));
        setAgentStatus('ONLINE');
        mutateSystem();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorStartingAgent'));
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleRedeploy = async () => {
    setLoading({ loading: true, button: 'redeploy' });
    setDisable(true);
    try {
      const response = await api.post('/server/redeploy', {
        system_name: data.name,
      });
      if (response.data.success) {
        toast.success(t('agentRedeployedSuccess'));
        setAgentStatus('ONLINE');
        mutateSystem();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorRedeployingAgent'));
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
        toast.success(t('systemDeletedSuccess'));
        jobForm.setValue('system', null);
        mutateSystem();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorDeletingSystem'));
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
          <div className="flex items-center gap-3">
            <span className="font-bold">
              {data ? t('editBatchJobServer') : t('createBatchJobServer')}
            </span>
            {data && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: agentStatus === 'ONLINE' ? '#34C75915' : '#8E8E9315',
                  borderRadius: '6px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: agentStatus === 'ONLINE' ? '#34C759' : '#8E8E93',
                    boxShadow: `0 0 6px ${agentStatus === 'ONLINE' ? '#34C75960' : '#8E8E9360'}`,
                  }}
                />
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: agentStatus === 'ONLINE' ? '#34C759' : '#8E8E93',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  {agentStatus === 'ONLINE' ? t('online') : t('offline')}
                </span>
              </div>
            )}
          </div>
          {data && (
            <div className="flex space-x-2">
              <ButtonWithLoading
                onClick={openStopConfirmModal}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'stop'}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold"
              >
                {t('stop')}
              </ButtonWithLoading>
              <ButtonWithLoading
                onClick={openStartConfirmModal}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'start'}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold"
              >
                {t('start')}
              </ButtonWithLoading>
              <ButtonWithLoading
                onClick={openRedeployConfirmModal}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'redeploy'}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                {t('redeploy')}
              </ButtonWithLoading>
              <ButtonWithLoading
                onClick={openDeleteConfirmModal}
                disabled={disable || user?.user_type !== 0}
                loading={loading.loading && loading.button === 'delete'}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                {t('delete')}
              </ButtonWithLoading>
              <ConfirmDialog
                widthClassName="w-100"
                openConfirm={isStopConfirm}
                setCloseConfirm={closeStopConfirmModal}
                title={t('stopAgent')}
                callback={() => handleStop()}
              >
                <div className="w-full text-lg">
                  <p>
                    <strong>{t('doYouWantToStopAgent')}</strong>
                  </p>
                </div>
              </ConfirmDialog>
              <ConfirmDialog
                widthClassName="w-100"
                openConfirm={isStartConfirm}
                setCloseConfirm={closeStartConfirmModal}
                title={t('startAgent')}
                callback={() => handleStart()}
              >
                <div className="w-full text-lg">
                  <p>
                    <strong>{t('doYouWantToStartAgent')}</strong>
                  </p>
                </div>
              </ConfirmDialog>
              <ConfirmDialog
                widthClassName="w-100"
                openConfirm={isRedeployConfirm}
                setCloseConfirm={closeRedeployConfirmModal}
                title={t('redeployAgent')}
                callback={() => handleRedeploy()}
              >
                <div className="w-full text-lg">
                  <p>
                    <strong>{t('doYouWantToRedeployAgent')}</strong>
                  </p>
                </div>
              </ConfirmDialog>
              <ConfirmDialog
                widthClassName="w-100"
                openConfirm={isDeleteConfirm}
                setCloseConfirm={closeDeleteConfirmModal}
                title={t('delete')}
                callback={() => handleDelete()}
              >
                <div className="w-full text-lg">
                  <p>
                    <strong>{t('doYouWantToDeleteSystem')}</strong>
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
              content={t('systemName')}
              required
            />
            <TextInput
              control={control}
              name="host_name"
              content={t('hostName')}
              required
            />
          </Box>
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="host_ip_addr"
              content={t('hostIpAddress')}
              required
            />
            <TextInput
              control={control}
              name="folder_path"
              content={t('folderPath')}
              required
            />
          </Box>
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="secondary_host_ip_addr"
              content={t('secondaryHostIpAddress')}
            />
            <TextInput
              control={control}
              name="secondary_folder_path"
              content={t('secondaryFolderPath')}
            />
          </Box>
          <Box className="flex gap-3">
            <TextInput
              control={control}
              name="agent_port"
              content={t('agentPort')}
              type="number"
              placeholder="8081-8999"
            />
            <Box className="w-full" />
          </Box>

          <BaseTextArea
            control={control}
            name="system_comments"
            content={t('comments')}
          />
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
              {t('cancel')}
            </BaseButton>
            <ButtonWithLoading
              type="button"
              disabled={formState.isSubmitting || !formState.isDirty}
              loading={formState.isSubmitting}
              className="bg-black text-white"
              onClick={openSaveConfirmModal}
            >
              {t('save')}
            </ButtonWithLoading>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isSaveConfirm}
              setCloseConfirm={closeSaveConfirmModal}
              title={t('save')}
              callback={handleSubmit(onSubmit)}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToSaveServer')}</strong>
                </p>
              </div>
            </ConfirmDialog>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BatchJobServerDialog;
