import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useSWRConfig } from 'swr';
import * as Yup from 'yup';
import api from '../services/api';
import useAuthStore from './store/useAuthStore';
import dayjs from 'dayjs';
import { getUserTimeZone } from '../utils/helper';

const mappingWorkflowDTO = (dto) => {
  const assignJobs = Object.values(dto.related_priority_group).flat();
  return {
    workflow_id: dto.workflow_detail.workflow_id,
    workflow_name: dto.workflow_detail.workflow_name,
    group_id: dto.workflow_detail.group_id,
    group: dto.workflow_detail.group,
    latest_status: dto.workflow_detail.latest_status,
    start_date: dto.workflow_detail.start_date,
    repeat_interval: dto.workflow_detail.repeat_interval,
    last_run_date: dto.workflow_detail.last_run_date,
    next_run_date: dto.workflow_detail.next_run_date,
    assignJobs
  };
};

const useWorkflowForm = (workflowData, onClose, mutate, setJobOfGroups, setJobOfWorkflow, setListIgnoreResults) => {
  const user = useAuthStore((state) => state.user);
  const { mutate: globalMutate } = useSWRConfig();
  const validateSchema = Yup.object().shape({
    workflow_id: Yup.string(),
    workflow_name: Yup.string()
      .required('Required')
      .max(128, 'Maximum 128 characters'),
    group: Yup.object().shape({
      id: Yup.string().required('Required'),
      name: Yup.string().required('Required'),
    }).required('Required'),
    latest_status: Yup.string(),
    job_of_workflow: Yup.array(),
    start_date: Yup.mixed()
      .test(
        'is-dayjs',
        'Invalid start date & time',
        (value) => dayjs.isDayjs(value) && value.isValid(),
      )
      .required('Required'),
    repeat_interval: Yup.string()
      .required('Required')
      .max(4000, 'Maximum 4000 characters')
  });
  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState,
    getValues,
    setValue,
    setError,
  } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    defaultValues: {
      workflow_id: workflowData?.workflow_id,
      workflow_name: workflowData?.workflow_name || '',
      group: workflowData ? { id: workflowData.group_id, name: workflowData.group } : null,
      latest_status: workflowData?.latest_status || 'CREATE',
      job_of_workflow: workflowData?.assignJobs || [],
      start_date: workflowData?.start_date
        ? dayjs(workflowData.start_date)
        : null,
      repeat_interval: workflowData?.repeat_interval || 'FREQ='
    },
    resolver: yupResolver(validateSchema),
  });

  const onSubmit = async (data, listIgnoreResults = []) => {
    try {
      const url = workflowData ? '/workflow/update' : '/workflow/create';
      let input = {
        workflow_id: data.workflow_id,
        workflow_name: data.workflow_name,
        group_id: data.group.id,
        last_reg_user_id: user?.id,
        start_date: data.start_date.valueOf(),
        repeat_interval: data.repeat_interval.trim().toUpperCase(),
        timezone: getUserTimeZone(),
      };
      const jobGroups = {};
      data.job_of_workflow.forEach((job) => {
        const priority = job.jobPriority ?? job.priority;
        if (!jobGroups[priority]) {
          jobGroups[priority] = [];
        }
        jobGroups[priority].push({
          job_id: job.job_id,
          delay: job.jobDelay ?? job.delay ?? 0
        });
      });
      input = {
        ...input,
        job_settings: {
          workflow_id: data.workflow_id,
          list_priority_groups: Object.keys(jobGroups).map((priority) => ({
            priority: Number(priority),
            ignore_result: listIgnoreResults.includes(Number(priority)),
            list_jobs: jobGroups[priority]
          }))
        }
      };
      const response = await api.post(url, input);
      if (response.data.success) {
        mutate();
        globalMutate('/workflow/filter');
        toast.success(
          workflowData
            ? 'Update Workflow successfully'
            : 'Create Workflow successfully',
        );
        setJobOfGroups([])
        setJobOfWorkflow([])
        setListIgnoreResults([])
        reset();
        onClose();
        setJobOfGroups([])
        setJobOfWorkflow([])
        setListIgnoreResults([])
        reset();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      if (error.response?.data?.error_msg) {
        toast.error(error.response.data.error_msg);
      } else {
        toast.error(error);
      }
    }
  };

  const updateForm = (data) => {
    if (data?.workflow_id) {
      setValue('workflow_id', data.workflow_id);
      setValue('workflow_name', data.workflow_name);
      setValue('latest_status', data.latest_status);
      setValue('group', { id: data.group_id, name: data.group });
      setValue('job_of_workflow', data.assignJobs);
      setValue('start_date', dayjs(data.start_date));
      setValue('repeat_interval', data.repeat_interval);
    }
  };

  return {
    handleSubmit,
    control,
    onSubmit,
    watchGroups: watch('group'),
    getValues,
    setValue,
    updateForm,
    reset,
    setError,
    formState,
    globalMutate,
    watch
  };
};

export const useAssignJobForm = (selectedJobs, callbackSubmit) => {
  const [lastChanged, setLastChanged] = useState(0);
  const validateSchema = Yup.object()
    .shape({
      assignJobs: Yup.array().of(
        Yup.object().shape({
          jobId: Yup.string(),
          jobPriority: Yup.number()
            .required('Required')
            .min(1, 'Min value of priority is 1')
            .max(20, 'Max value of priority is 20'),
          jobDelay: Yup.number()
            .required('Required'),
          ignoreResult: Yup.boolean(),
        }),
      ),
    })
    .test({
      test() {
        const { createError, originalValue } = this;
        const { assignJobs } = originalValue;
        if (assignJobs.length > 20) {
          return createError({
            path: `assignJobs.[${lastChanged}].jobDelay`,
            message: 'Max Job is 20',
          });
        }
        // var prioritySet = new Set(assignJobs.map((job) => job.jobPriority));
        // if (prioritySet.size !== assignJobs.length) {
        //   let errorIndex = 0;
        //   assignJobs.forEach((job, index) => {
        //     for (let i = index + 1; i < assignJobs.length; i++) {
        //       if (job.jobPriority === assignJobs[i].jobPriority) {
        //         errorIndex = i;
        //         break;
        //       }
        //     }
        //   });
        //
        //   return createError({
        //     path: `assignJobs.[${errorIndex}].jobPriority`,
        //     message: 'Cannot select duplicate priority',
        //   });
        // }
        return true;
      },
    });
  const {
    control,
    watch,
    handleSubmit,
    reset,
    formState,
    clearErrors,
    register,
    getValues,
  } = useForm({
    mode: 'all',
    reValidateMode: 'onBlur',
    defaultValues: {
      assignJobs: selectedJobs ? selectedJobs : [],
    },
    resolver: yupResolver(validateSchema),
  });

  const onSubmit = (data) => {
    callbackSubmit(data);
    reset();
  };

  return {
    handleSubmit,
    control,
    onSubmit,
    watch,
    reset,
    formState,
    register,
    setLastChanged,
    getValues,
  };
};

export const useDeleteWorkflow = async (
  workflowData,
  mutate,
  onClose,
  reset,
  globalMutate,
) => {
  try {
    let url = '/workflow/delete';
    let input = {
      workflow_id: workflowData.workflow_id,
    };
    const response = await api.post(url, input);
    if (response.data.success) {
      if (mutate) mutate();
      if (globalMutate) globalMutate('/workflow/filter');
      toast.success('Deleted workflow ' + workflowData.workflow_name);
      onClose();
      reset();
    } else {
      toast.error(response.data.error_msg, { autoClose: false });
    }
  } catch (error) {
    toast.error(error);
  }
};

export const useDetailWorkflow = async (data) => {
  if (data) {
    try {
      let url = 'workflow/detail';
      let input = {
        workflow_id: data.workflow_id,
      };
      const response = await api.post(url, input);
      if (response.data.success) {
        return mappingWorkflowDTO(response.data.data);
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
        return data;
      }
    } catch (error) {
      toast.error(error);
      return data;
    }
  }
};

export default useWorkflowForm;
