import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import React from 'react';
import SimpleBar from 'simplebar-react';
import useGroupsStore from '../../hook/store/useGroupStore';
import useUserAction from '../../hook/user/useUserAction';
import useUserForm from '../../hook/useUserForm';
import { UserType } from '../../utils/enum';
import CustomPwInput from '../CustomInput/CustomPwInput';
import MultipleSelectChip from '../CustomInput/MultipleSelect';
import Selected from '../CustomInput/Select';
import TextInput from '../CustomInput/TextInput';
import { ButtonWithLoading } from './JobStatusDetail';
import { useTranslation } from 'react-i18next';
import useModal from '../../hook/useModal';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import useAuthStore from '../../hook/store/useAuthStore';
import BaseTextField from '../CustomInput/BaseTextField';
import BaseButton from '../CustomInput/BaseButton';

const UserDialog = ({ open, onClose, data, mutate }) => {
  const user = useAuthStore((state) => state.user);
  const { handleSubmit, control, onSubmit, reset } = useUserForm(data, onClose);
  const { resetPw, loading, disable, lockAcc, unlockAcc, remove } =
    useUserAction(data, onClose);
  const groups = useGroupsStore((state) => state.groups);
  const { t } = useTranslation();
  const {
    isVisible: isDeleteConfirm,
    openModal: openDeleteConfirmModal,
    closeModal: closeDeleteConfirmModal,
  } = useModal();
  const {
    isVisible: isResetPwConfirm,
    openModal: openResetPwConfirmModal,
    closeModal: closeResetPwConfirmModal,
  } = useModal();
  const {
    isVisible: isLockConfirm,
    openModal: openLockConfirmModal,
    closeModal: closeLockConfirmModal,
  } = useModal();
  const {
    isVisible: isUnlockConfirm,
    openModal: openUnlockConfirmModal,
    closeModal: closeUnlockConfirmModal,
  } = useModal();
  const {
    isVisible: isSaveConfirm,
    openModal: openSaveConfirmModal,
    closeModal: closeSaveConfirmModal,
  } = useModal();

  const handleCancel = () => {
    reset();
    onClose();
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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderBottom: '1px solid #E8E8ED',
        }}
      >
        <Box
          sx={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#1D1D1F',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            letterSpacing: '-0.01em',
          }}
        >
          {data ? t('updateUser') : t('createUser')}
        </Box>
        {data && (
          <div className="flex space-x-2">
            <ButtonWithLoading
              loading={loading.loading && loading.button === 'reset'}
              disabled={disable}
              onClick={openResetPwConfirmModal}
            >
              {t('resetPassword')}
            </ButtonWithLoading>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isResetPwConfirm}
              setCloseConfirm={closeResetPwConfirmModal}
              title={t('resetPassword')}
              callback={resetPw}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToResetPassword')}</strong>
                </p>
              </div>
            </ConfirmDialog>
            {data?.user_status ? (
              <>
                <ButtonWithLoading
                  loading={loading.loading && loading.button === 'lock'}
                  disabled={disable}
                  onClick={openLockConfirmModal}
                >
                  {t('lockAccount')}
                </ButtonWithLoading>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isLockConfirm}
                  setCloseConfirm={closeLockConfirmModal}
                  title={t('lockAccount')}
                  callback={lockAcc}
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>{t('doYouWantToLockAccount')}</strong>
                    </p>
                  </div>
                </ConfirmDialog>
              </>
            ) : (
              <>
                <ButtonWithLoading
                  loading={loading.loading && loading.button === 'unlock'}
                  disabled={disable}
                  onClick={openUnlockConfirmModal}
                >
                  {t('unlockAccount')}
                </ButtonWithLoading>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isUnlockConfirm}
                  setCloseConfirm={closeUnlockConfirmModal}
                  title={t('unlockAccount')}
                  callback={unlockAcc}
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>{t('doYouWantToUnlockAccount')}</strong>
                    </p>
                  </div>
                </ConfirmDialog>
              </>
            )}
            <BaseButton
              onClick={openDeleteConfirmModal}
              disabled={
                disable ||
                user?.user_type !== 0 ||
                data?.user_id === user?.user_id
              }
              theme="danger"
              size="small"
            >
              {t('delete')}
            </BaseButton>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isDeleteConfirm}
              setCloseConfirm={closeDeleteConfirmModal}
              title={t('delete')}
              callback={remove}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToDeleteUser')}</strong>
                </p>
              </div>
            </ConfirmDialog>
          </div>
        )}
      </DialogTitle>
      <DialogContent sx={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
          <SimpleBar
            style={{
              maxHeight: '60vh',
              paddingTop: 16,
              paddingBottom: 16,
            }}
          >
            <Box className="grid grid-cols-2 gap-4">
              {data && (
                <>
                  <BaseTextField
                    disabled
                    value={data?.user_id || ''}
                    content={t('userId')}
                    textStyles="text-grayDark"
                  />
                  <BaseTextField
                    disabled
                    value={data?.user_status ? t('enable').toUpperCase() : t('disable').toUpperCase()}
                    content={t('userStatus')}
                    textStyles="text-grayDark"
                  />
                </>
              )}
              {!data && (
                <TextInput
                  control={control}
                  name="user_id"
                  content={t('userId')}
                  required
                  autoComplete="off"
                />
              )}
              <TextInput
                control={control}
                name="user_name"
                content={t('userName')}
                required
                autoComplete="off"
              />
              {!data && (
                <>
                  <CustomPwInput
                    control={control}
                    name="password"
                    content={t('password')}
                    autoComplete="new-password"
                  />
                  <CustomPwInput
                    control={control}
                    name="confirmPassword"
                    content={t('reenterPassword')}
                    autoComplete="new-password"
                  />
                </>
              )}
              <Selected
                control={control}
                name="user_type"
                options={UserType}
                content={t('userType')}
                required
              />
              {groups && groups.length > 0 && (
                <MultipleSelectChip
                  name="related_scheduler_group"
                  control={control}
                  content={t('group')}
                  options={groups}
                  required
                />
              )}
              <TextInput control={control} name="email_addr" content={t('email')} />
              <TextInput
                control={control}
                name="celp_tlno"
                content={t('cellphone')}
                className={`${data ? 'col-span-2' : ''}`}
              />
            </Box>
          </SimpleBar>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
              borderTop: '1px solid #E8E8ED',
              marginTop: '16px',
            }}
          >
            <BaseButton onClick={handleCancel} theme="secondary">
              {t('cancel')}
            </BaseButton>
            <BaseButton theme="primary" onClick={openSaveConfirmModal}>
              {t('save')}
            </BaseButton>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isSaveConfirm}
              setCloseConfirm={closeSaveConfirmModal}
              title={t('save')}
              callback={handleSubmit(onSubmit)}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>{t('doYouWantToSaveChanges')}</strong>
                </p>
              </div>
            </ConfirmDialog>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
