import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import useAuthStore from './store/useAuthStore';

const useServerForm = (serverData, onClose, mutateSystem, jobForm, onError) => {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();
  const { setValue, clearErrors } = jobForm;

  // Custom test for no leading/trailing whitespace
  const noWhitespace = (fieldName) => ({
    name: 'no-whitespace',
    message: t('noLeadingTrailingWhitespace', { field: fieldName }) || `${fieldName} must not have leading or trailing whitespace`,
    test: (value) => {
      if (!value) return true;
      return value === value.trim();
    },
  });

  const validationSchema = Yup.object().shape({
    frst_reg_user_id: Yup.string().nullable(),
    last_reg_user_id: Yup.string().nullable(),
    system_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters')
      .test(noWhitespace('System Name')),
    host_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters')
      .test(noWhitespace('Host Name')),
    host_ip_addr: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters')
      .test(noWhitespace('Host IP Address')),
    system_comments: Yup.string().max(4000, 'Maximum 4000 characters'),
    folder_path: Yup.string()
      .required('Required')
      .test(noWhitespace('Folder Path')),
    ssh_user: Yup.string()
      .required('Required')
      .max(100, 'Maximum 100 characters')
      .test(noWhitespace('SSH User')),
    ssh_password: Yup.string()
      .required('Required')
      .max(255, 'Maximum 255 characters'),
    agent_port: Yup.number()
      .required('Required')
      .min(1024, 'Port must be >= 1024')
      .max(65535, 'Port must be <= 65535'),
    deployment_type: Yup.string()
      .oneOf(['JAR', 'DOCKER'], 'Invalid deployment type')
      .required('Required'),
    mount_paths: Yup.string()
      .max(1000, 'Maximum 1000 characters')
      .nullable(),
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
      system_comments: serverData?.system_comments || '',
      folder_path: serverData?.folder_path || '',
      ssh_user: serverData?.ssh_user || '',
      ssh_password: serverData?.ssh_password || '',
      agent_port: serverData?.agent_port || '',
      deployment_type: serverData?.deployment_type || 'JAR',
      mount_paths: serverData?.mount_paths || '',
    },
  });

  const onSubmit = async (data) => {
    const endpoint = serverData ? '/server/update' : '/server/create';
    try {
      let input = {
        ...data,
        ...(serverData && { system_id: serverData.id }),
        ...(serverData && {
          last_reg_user_id: user?.id,
        }),
        ...(!serverData && {
          frst_reg_user_id: user?.id,
        }),
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
        // Show validation error in dialog
        if (onError) {
          onError(response.data.errorMsg || response.data.error_msg);
        } else {
          toast.error(response.data.errorMsg || response.data.error_msg, { autoClose: false });
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.errorMsg || error.response?.data?.error_msg || t(data ? 'updateJobServerError' : 'createJobServerError');
      if (onError) {
        onError(errorMsg);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset, formState };
};

export default useServerForm;
