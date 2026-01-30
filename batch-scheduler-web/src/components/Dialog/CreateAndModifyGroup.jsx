import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import useGroupForm from '../../hook/useGroupForm';
import useModal from '../../hook/useModal';
import useAuthStore from '../../hook/store/useAuthStore';
import api from '../../services/api';
import TextInput from '../CustomInput/TextInput';
import BaseTextArea from '../CustomInput/BaseTextArea';
import BaseButton from '../CustomInput/BaseButton';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const CreateAndModifyGroup = ({
  open,
  onClose,
  data,
  jobForm,
  setVisibleGroups,
  mutate,
}) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { handleSubmit, control, onSubmit, reset } = useGroupForm(
    data,
    onClose,
    jobForm,
    setVisibleGroups,
    mutate,
  );
  const [loading, setLoading] = useState(false);
  const {
    isVisible: isDeleteConfirm,
    openModal: openDeleteConfirmModal,
    closeModal: closeDeleteConfirmModal,
  } = useModal();
  const {
    isVisible: isSaveConfirm,
    openModal: openSaveConfirmModal,
    closeModal: closeSaveConfirmModal,
  } = useModal();
  const {
    isVisible: isCancelConfirm,
    openModal: openCancelConfirmModal,
    closeModal: closeCancelConfirmModal,
  } = useModal();

  const handleCancel = () => {
    reset();
    onClose();
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await api.delete(`/group/delete?groupId=${data.id}`);
      if (response.data.success) {
        toast.success(t('groupDeletedSuccess'));
        if (setVisibleGroups) setVisibleGroups([]);
        if (mutate) mutate();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('errorDeletingGroup'), { autoClose: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClick = (e) => {
    e.preventDefault();
    openSaveConfirmModal();
  };

  const handleConfirmSave = () => {
    closeSaveConfirmModal();
    handleSubmit(onSubmit)();
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
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
          fontSize: '20px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '20px 24px 16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {data ? t('updateGroup') : t('createGroup')}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={openCancelConfirmModal}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          width: '32px',
          height: '32px',
          color: '#86868B',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#F5F5F7',
            color: '#1D1D1F',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '20px' }} />
      </IconButton>
      <DialogContent sx={{ padding: '0 24px 24px' }}>
        <form onSubmit={handleSaveClick}>
          <Box className="flex flex-col gap-4 mt-2">
            <TextInput
              control={control}
              name="group_name"
              content={t('groupName')}
              required
            />
            <BaseTextArea
              control={control}
              name="group_comments"
              content={t('comments')}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E8E8ED',
            }}
          >
            <BaseButton onClick={openCancelConfirmModal} theme="light">
              {t('cancel')}
            </BaseButton>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isCancelConfirm}
              setCloseConfirm={closeCancelConfirmModal}
              title={t('cancel')}
              callback={handleCancel}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToCloseDialog')}</strong>
                </p>
              </div>
            </ConfirmDialog>

            {data && user?.user_type === 0 && (
              <>
                <BaseButton
                  theme="danger"
                  onClick={openDeleteConfirmModal}
                  disabled={loading}
                >
                  {t('delete')}
                </BaseButton>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isDeleteConfirm}
                  setCloseConfirm={closeDeleteConfirmModal}
                  title={t('delete')}
                  callback={handleDelete}
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>{t('doYouWantToDeleteGroup')}</strong>
                    </p>
                    <br />
                    <p>
                      {t('groupName')}:{' '}
                      <span className="text-red-500">{data?.group_name}</span>
                    </p>
                  </div>
                </ConfirmDialog>
              </>
            )}

            <BaseButton type="submit" theme="dark">
              {t('save')}
            </BaseButton>
          </Box>
        </form>
        <ConfirmDialog
          widthClassName="w-100"
          openConfirm={isSaveConfirm}
          setCloseConfirm={closeSaveConfirmModal}
          title={data ? t('update') : t('create')}
          callback={handleConfirmSave}
        >
          <div className="w-full text-lg">
            <p>
              <strong>
                {data ? t('doYouWantToUpdateGroup') : t('doYouWantToCreateGroup')}
              </strong>
            </p>
          </div>
        </ConfirmDialog>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAndModifyGroup;
