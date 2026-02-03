import { yupResolver } from '@hookform/resolvers/yup';
import dayjs from 'dayjs';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import { getUserTimeZone } from '../utils/helper';
import useAuthStore from './store/useAuthStore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrAfter);

// Helper function to parse existing job_action with method prefix
const parseJobAction = (jobAction) => {
  if (!jobAction) return { method: 'GET', url: '' };

  const methodPrefixes = ['GET:', 'POST:', 'PUT:', 'DELETE:', 'PATCH:'];
  for (const prefix of methodPrefixes) {
    if (jobAction.startsWith(prefix)) {
      return {
        method: prefix.replace(':', ''),
        url: jobAction.substring(prefix.length).trim(),
      };
    }
  }
  // Default to GET if no prefix found
  return { method: 'GET', url: jobAction };
};

// Helper function to parse existing job_headers from JSON string
const parseJobHeaders = (jobHeaders) => {
  if (!jobHeaders) return [];
  try {
    const parsed = typeof jobHeaders === 'string' ? JSON.parse(jobHeaders) : jobHeaders;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // Convert object to array of {key, value}
    return Object.entries(parsed).map(([key, value]) => ({ key, value }));
  } catch {
    return [];
  }
};
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
    http_method: Yup.string().when('job_type', {
      is: 'REST_API',
      then: (schema) => schema.required('HTTP method is required'),
      otherwise: (schema) => schema.nullable(),
    }),
    job_action: Yup.string().when('job_type', {
      is: 'REST_API',
      then: (schema) =>
        schema
          .max(4000, 'Maximum 4000 characters')
          .matches(/^https?:\/\/.+/, 'Please enter a valid URL (http:// or https://)')
          .required('URL is required'),
      otherwise: (schema) =>
        schema.max(4000, 'Maximum 4000 characters').required(),
    }),
    job_body: Yup.string().when('job_type', {
      is: 'REST_API',
      then: (schema) =>
        schema.test('is-json', 'Invalid JSON', (value) => {
          if (!value || value.trim() === '') return true;
          try {
            JSON.parse(value);
            return true;
          } catch {
            return false;
          }
        }),
      otherwise: (schema) => schema.nullable(),
    }),
    job_headers: Yup.array().of(
      Yup.object().shape({
        key: Yup.string(),
        value: Yup.string(),
      })
    ),
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
        secondary_system: jobData?.secondary_system_id ? { id: jobData.secondary_system_id, name: jobData.secondary_system } : null,
        tertiary_system: jobData?.tertiary_system_id ? { id: jobData.tertiary_system_id, name: jobData.tertiary_system } : null,
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
        // REST_API fields - only populate if job is REST_API type
        http_method: jobData?.jobType === 'REST_API'
          ? parseJobAction(jobData?.jobAction).method
          : 'GET',
        // EXECUTABLE uses job_action directly, REST_API parses URL from it
        // When switching types, these should be cleared (handled in useEffect)
        job_action: jobData?.jobType === 'REST_API'
          ? parseJobAction(jobData?.jobAction).url
          : jobData?.jobType === 'EXECUTABLE'
            ? (jobData?.jobAction || '')
            : '', // For new jobs, start empty
        job_body: jobData?.jobType === 'REST_API' ? (jobData?.jobBody || '{}') : '{}',
        job_headers: jobData?.jobType === 'REST_API' ? parseJobHeaders(jobData?.jobHeaders) : [],
      },
    });

  const jobType = watch('job_type');
  const prevJobTypeRef = useRef(jobData?.jobType || 'REST_API');

  // When job_type changes, clear the action fields (they should not share values)
  useEffect(() => {
    clearErrors('job_action');

    // Only reset when user actually changes the job_type (not on initial load)
    if (prevJobTypeRef.current !== jobType) {
      // Clear fields when switching types
      setValue('job_action', '');

      if (jobType === 'REST_API') {
        // Switching to REST_API - reset REST_API specific fields
        setValue('http_method', 'GET');
        setValue('job_body', '{}');
        setValue('job_headers', []);
      }

      prevJobTypeRef.current = jobType;
    }
  }, [jobType, clearErrors, setValue]);

  const onSubmit = async (data) => {
    //   handle form submission
    try {
      let url = jobData ? '/job/update' : '/job/create';

      // For REST_API, combine http_method with job_action
      let finalJobAction = data.job_action;
      if (data.job_type === 'REST_API') {
        finalJobAction = `${data.http_method}:${data.job_action}`;
      }

      // Convert job_headers array to JSON string (filter empty entries)
      const filteredHeaders = (data.job_headers || []).filter(
        (h) => h.key && h.key.trim() !== ''
      );
      const jobHeadersJson = filteredHeaders.length > 0
        ? JSON.stringify(filteredHeaders)
        : null;

      let input = {
        ...data,
        job_action: finalJobAction,
        job_body: data.job_type === 'REST_API' && data.job_body
          ? data.job_body
          : undefined,
        job_headers: jobHeadersJson,
        start_date: data.start_date.valueOf(),
        repeat_interval: data.repeat_interval.trim().toUpperCase(),
        ...(data.end_date && {
          end_date: data.end_date.valueOf(),
        }),
        ...(jobData && { job_id: jobData.job_id }),
        timezone: getUserTimeZone(),
        // Failover servers
        secondary_system_id: data.secondary_system?.id || null,
        tertiary_system_id: data.tertiary_system?.id || null,
      };

      // Remove fields not needed for EXECUTABLE
      if (data.job_type === 'EXECUTABLE') {
        delete input.job_body;
        delete input.job_headers;
        delete input.http_method;
      }
      // Remove http_method from payload (it's already combined into job_action)
      delete input.http_method;
      // Remove object forms of servers (only send IDs)
      delete input.secondary_system;
      delete input.tertiary_system;
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
