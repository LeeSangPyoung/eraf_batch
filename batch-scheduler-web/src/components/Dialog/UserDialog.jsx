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
          {data ? 'Update User' : 'Create User'}
        </Box>
        {data && (
          <div className="flex space-x-2">
            <ButtonWithLoading
              loading={loading.loading && loading.button === 'reset'}
              disabled={disable}
              onClick={openResetPwConfirmModal}
            >
              Reset password
            </ButtonWithLoading>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isResetPwConfirm}
              setCloseConfirm={closeResetPwConfirmModal}
              title="Reset Password"
              callback={resetPw}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>Do you want to reset the password?</strong>
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
                  Lock account
                </ButtonWithLoading>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isLockConfirm}
                  setCloseConfirm={closeLockConfirmModal}
                  title="Lock Account"
                  callback={lockAcc}
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>Do you want to lock this account?</strong>
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
                  Unlock account
                </ButtonWithLoading>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isUnlockConfirm}
                  setCloseConfirm={closeUnlockConfirmModal}
                  title="Unlock Account"
                  callback={unlockAcc}
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>Do you want to unlock this account?</strong>
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
              title="Delete"
              callback={remove}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>Do you want to delete the Scheduler User?</strong>
                </p>
              </div>
            </ConfirmDialog>
          </div>
        )}
      </DialogTitle>
      <DialogContent sx={{ padding: '24px' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
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
                    content="User ID"
                    textStyles="text-grayDark"
                  />
                  <BaseTextField
                    disabled
                    value={data?.user_status ? 'ENABLE' : 'DISABLE'}
                    content="User status"
                    textStyles="text-grayDark"
                  />
                </>
              )}
              {!data && (
                <TextInput
                  control={control}
                  name="user_id"
                  content="User ID"
                  required
                />
              )}
              <TextInput
                control={control}
                name="user_name"
                content="User Name"
                required
              />
              {!data && (
                <>
                  <CustomPwInput
                    control={control}
                    name="password"
                    content="Password"
                  />
                  <CustomPwInput
                    control={control}
                    name="confirmPassword"
                    content="(Re-enter) password"
                  />
                </>
              )}
              <Selected
                control={control}
                name="user_type"
                options={UserType}
                content="User Type"
                required
                disabled={data?.user_id === user?.user_id}
              />
              {groups && groups.length > 0 && (
                <MultipleSelectChip
                  name="related_scheduler_group"
                  control={control}
                  content="Group"
                  options={groups}
                  height="50px"
                  required
                />
              )}
              <TextInput control={control} name="email_addr" content="Email" />
              <TextInput
                control={control}
                name="celp_tlno"
                content="Cellphone"
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
              Cancel
            </BaseButton>
            <BaseButton theme="primary" onClick={openSaveConfirmModal}>
              Save
            </BaseButton>
            <ConfirmDialog
              widthClassName="w-100"
              openConfirm={isSaveConfirm}
              setCloseConfirm={closeSaveConfirmModal}
              title="Save"
              callback={handleSubmit(onSubmit)}
            >
              <div className="w-full text-lg">
                <p>
                  <strong>Do you want to save the changes?</strong>
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
