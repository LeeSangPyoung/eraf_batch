import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import { httpRequestPattern } from '../utils/enum';
import { getUserTimeZone } from '../utils/helper';
import useAuthStore from './store/useAuthStore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);
const useJobForm = (jobData, onClose, mutate, resetTab) => {

  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();

  const validationSchema = Yup.object().shape({
    system: Yup.object().shape({
      id: Yup.string().required('Required'),
      name: Yup.string().required('Required'),
    }).required('Required'),
    group: Yup.object().shape({
      id: Yup.string().required('Required'),
      name: Yup.string().required('Required'),
    }).required('Required'),
    job_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    start_date: Yup.mixed()
      .test(
        'is-dayjs',
        'Invalid start date & time',
        (value) => dayjs.isDayjs(value) && value.isValid(),
      )
      .required('Required'),
    end_date: Yup.mixed()
      .nullable()
      .test(
        'is-after-start-date',
        'End date & time must be after start date & time',
        function (value) {
          const { start_date } = this.parent;
          if (!!value) {
            return (
              dayjs.isDayjs(value) &&
              dayjs.isDayjs(start_date) &&
              value.isAfter(start_date)
            );
          }
          return true;
        },
      ),
    repeat_interval: Yup.string()
      .required('Required')
      .max(4000, 'Maximum 4000 characters'),
    retry_delay: Yup.number(),
    max_run_duration: Yup.string(),
    max_run: Yup.number().min(0),
    max_failure: Yup.number().min(0),
    priority: Yup.number().min(0).max(5),
    job_comments: Yup.string().max(4000, 'Maximum 4000 characters'),
    frst_reg_user_id: Yup.string().nullable(),
    last_reg_user_id: Yup.string().nullable(),
    is_enabled: Yup.boolean(),
    auto_drop: Yup.boolean(),
    restart_on_failure: Yup.boolean(),
    restartable: Yup.boolean(),
    job_type: Yup.string(),
    job_action: Yup.string().when('job_type', {
      is: 'REST_API',
      then: (schema) =>
        schema
          .max(4000, 'Maximum 4000 characters')
          .matches(httpRequestPattern, 'Invalid HTTP request format')
          .required(),
      otherwise: (schema) =>
        schema.max(4000, 'Maximum 4000 characters').required(),
    }),
    job_body: Yup.string().test('is-json', 'Invalid JSON', (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }),
  });

  const { handleSubmit, control, watch, reset, formState, clearErrors, setValue, trigger } =
    useForm({
      mode: 'all',
      reValidateMode: 'onBlur',
      resolver: yupResolver(validationSchema),
      defaultValues: {
        // set default values creator and blocked field when update in server
        frst_reg_user_id: jobData?.frstRegUserId || user?.id,
        last_reg_user_id: user?.id,
        system: jobData ? { id: jobData.system_id, name: jobData.system } : null,
        group: jobData ? { id: jobData.group_id, name: jobData.group } : null,
        job_name: jobData?.job_name || '',
        start_date: jobData?.startDate
          ? dayjs(jobData.startDate)
          : dayjs().second(0).millisecond(0),
        end_date: jobData?.endDate ? dayjs(jobData.endDate) : null,
        repeat_interval: jobData?.repeatInterval || 'FREQ=',
        retry_delay: jobData?.retryDelay || 0,
        max_run_duration: jobData?.maxRunDuration ?? '1:00:00',
        is_enabled: jobData?.enable ?? true,
        max_run: jobData?.maxRun || 0,
        auto_drop: jobData?.autoDrop ?? false,
        max_failure: jobData?.maxFailure || 0,
        restart_on_failure: jobData?.restartOnFailure ?? false,
        priority: jobData?.jobPriority ?? 3,
        restartable: jobData?.restartable ?? false,
        job_comments: jobData?.comment || '',
        job_type: jobData?.jobType || 'REST_API',
        job_action: jobData?.jobAction || '',
        job_body: jobData?.jobBody || '{}',
      },
    });

  const jobType = watch('job_type');

  useEffect(() => {
    clearErrors('job_action');
  }, [jobType, clearErrors]);

  const onSubmit = async (data) => {
    //   handle form submission
    try {
      let url = jobData ? '/job/update' : '/job/create';
      let input = {
        ...data,
        job_body: JSON.parse(data.job_body),
        start_date: data.start_date.valueOf(),
        repeat_interval: data.repeat_interval.trim().toUpperCase(),
        ...(data.end_date && {
          end_date: data.end_date.valueOf(),
        }),
        ...(jobData && { job_id: jobData.job_id }),
        timezone: getUserTimeZone(),
      };
      if (data.job_type === 'EXECUTABLE') {
        delete input.job_body;
      }
      let response;
      try {
        response = await api.post(url, input);
        if (response.data.success) {
          mutate();
          globalMutate(
            (key) => Array.isArray(key) && key[0] === '/job/getFilter',
          );
          toast.success(
            jobData ? 'Update job successfully' : 'Create job successfully',
          );
          onClose();
          reset();
        } else {
          toast.error(response.data.error_msg, { autoClose: false });
        }
      } catch (error) {
        toast.error(error.response.data.message, { autoClose: false });
      } finally {
        resetTab();
      }
    } catch (error) {
      toast.error(error);
    }
  };

  return { handleSubmit, control, onSubmit, watch, reset, formState, setValue, trigger, clearErrors };
};

export default useJobForm;
