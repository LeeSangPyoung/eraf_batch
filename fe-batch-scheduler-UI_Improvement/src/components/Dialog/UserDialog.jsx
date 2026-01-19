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

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="flex justify-between">
        <div className="text-2xl font-bold">
          {data ? 'Update User' : 'Create User'}
        </div>
        {data && (
          <div className="flex space-x-2">
            <ButtonWithLoading
              loading={loading.loading && loading.button === 'reset'}
              disabled={disable}
              className="bg-[#1C1C1C0D] font-semibold"
              onClick={resetPw}
            >
              Reset password
            </ButtonWithLoading>
            {data?.user_status ? (
              <ButtonWithLoading
                loading={loading.loading && loading.button === 'lock'}
                disabled={disable}
                className="bg-[#1C1C1C0D] font-semibold"
                onClick={lockAcc}
              >
                Lock account
              </ButtonWithLoading>
            ) : (
              <ButtonWithLoading
                loading={loading.loading && loading.button === 'unlock'}
                disabled={disable}
                className="bg-[#1C1C1C0D] font-semibold"
                onClick={unlockAcc}
              >
                Unlock account
              </ButtonWithLoading>
            )}
            <ButtonWithLoading
              onClick={openDeleteConfirmModal}
              disabled={
                disable ||
                user?.user_type !== 0 ||
                data?.user_id === user?.user_id
              }
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
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <SimpleBar
            style={{
              maxHeight: '60vh',
              paddingTop: 10,
              paddingBottom: 15,
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
          <Box className="flex col-span-2 justify-end ml-auto space-x-2 p-2">
            <BaseButton onClick={handleCancel} theme="light">
              Cancel
            </BaseButton>
            <BaseButton theme="dark" type="submit">
              Save
            </BaseButton>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
