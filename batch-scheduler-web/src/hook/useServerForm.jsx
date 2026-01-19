import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import useAuthStore from './store/useAuthStore';

const useServerForm = (serverData, onClose, mutateSystem, jobForm) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();
  const { setValue, clearErrors } = jobForm;

  const validationSchema = Yup.object().shape({
    frst_reg_user_id: Yup.string().nullable(),
    last_reg_user_id: Yup.string().nullable(),
    system_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    host_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    host_ip_addr: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    secondary_host_ip_addr: Yup.string().max(128, 'Maximum 128 characters'),
    system_comments: Yup.string().max(4000, 'Maximum 4000 characters'),
    folder_path: Yup.string().required('Required'),
    secondary_folder_path: Yup.string(),
  });

  const { handleSubmit, control, watch, reset, formState } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    resolver: yupResolver(validationSchema),
    defaultValues: {
      frst_reg_user_id: serverData?.frst_reg_user_id || user?.id,
      last_reg_user_id: serverData?.last_reg_user_id || user?.id,
      system_name: serverData?.name || '',
      host_name: serverData?.host_name || '',
      host_ip_addr: serverData?.host_ip_addr || '',
      secondary_host_ip_addr: serverData?.secondary_host_ip_addr || '',
      system_comments: serverData?.system_comments || '',
      folder_path: serverData?.folder_path || '',
      secondary_folder_path: serverData?.secondary_folder_path || '',
    },
  });

  const onSubmit = async (data) => {
    const endpoint = serverData ? '/server/update' : '/server/create';
    try {
      let input = {
        ...data,
        ...(serverData && { system_id: serverData.id }),
        // ...(serverData && {
        //   last_reg_user_id: user?.id,
        // }),
        // ...(!data && {
        //   frst_reg_user_id: user?.id,
        // }),
      };
      const response = await api.post(endpoint, input);
      if (response.data.success) {
        toast.success(
          t(serverData ? 'updateJobServerSuccess' : 'createJobServerSuccess'),
        );
        onClose();
        reset();
        setValue('system', { id: input.system_id ?? response.data.data.system_id, name: input.system_name });
        clearErrors('system');
        mutateSystem();
        globalMutate('/server/getFilter');
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t(data ? 'updateJobServerError' : 'createJobServerError'));
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset, formState };
};

export default useServerForm;
