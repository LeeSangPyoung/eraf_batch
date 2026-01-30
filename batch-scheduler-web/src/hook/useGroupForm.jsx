import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import useAuthStore from './store/useAuthStore';

const useGroupForm = (groupData, onClose, jobForm, setVisibleGroups, externalMutate) => {
  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();
  const { setValue, clearErrors } = jobForm || { setValue: () => {}, clearErrors: () => {} };

  const validationSchema = Yup.object().shape({
    frst_reg_user_id: Yup.string().nullable(),
    last_reg_user_id: Yup.string().nullable(),
    group_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    group_comments: Yup.string().max(4000, 'Maximum 4000 characters'),
  });

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { isDirty },
  } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      frst_reg_user_id: groupData?.frst_reg_user_id || user?.id,
      last_reg_user_id: groupData?.last_reg_user_id || user?.id,
      group_name: groupData?.name || '',
      group_comments: groupData?.group_comments || '',
    },
  });

  const onSubmit = async (data) => {
    try {
      let url = groupData ? '/group/update' : '/group/create';
      let input = {
        ...data,
        ...(groupData && { group_id: groupData.id }),
        ...(groupData && {
          last_reg_user_id: user.id,
        }),
        ...(!groupData && {
          frst_reg_user_id: user.id,
        }),
      };
      let response;
      try {
        response = await api.post(url, input);
        if (response.data.success) {
          const message = groupData
            ? 'Group updated successfully'
            : 'Group created successfully';
          toast.success(message);
          onClose();
          reset();
          if (setVisibleGroups) setVisibleGroups([]);
          if (setValue) setValue('group', { id: input.group_id ?? response.data.data?.group_id, name: input.group_name });
          if (clearErrors) clearErrors('group');
          globalMutate('/group/getFilter');
          if (externalMutate) externalMutate();
        } else {
          toast.error(response.data.error_msg, { autoClose: false });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error saving group', { autoClose: false });
      }
    } catch (error) {
      toast.error(error?.message || 'Error saving group');
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset };
};

export default useGroupForm;
