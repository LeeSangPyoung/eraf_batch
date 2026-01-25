import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import useAuthStore from '../../hook/store/useAuthStore';
import useGroupsStore from '../../hook/store/useGroupStore';
import useJobStore from '../../hook/store/useJobStore';
import useFilterData from '../../hook/useFilterData';
import useModal from '../../hook/useModal';
import useWorkflowForm, { useDeleteWorkflow } from '../../hook/useWorkflowForm';
import { workflowStatusOptions } from '../../utils/enum';
import { timestampFormat } from '../../utils/helper';
import BaseButton from '../CustomInput/BaseButton';
import BaseSelected from '../CustomInput/BaseSelected';
import BaseTextField from '../CustomInput/BaseTextField';
import CustomDateTimePicker from '../CustomInput/CustomDateTimePicker';
import TextInput from '../CustomInput/TextInput';
import RepeatIntervalDialog from '../Dialog/RepeatInterval';
import WorkFlowNodes from '../ReactFlow/CustomWorkFlow';
import AddJobModal from './AssignJobToWorkflow';
import { ConfirmDialog } from './ConfirmDialog';

export const WF_MODE = { CREATE: 'CREATE', UPDATE: 'UPDATE', VIEW: 'VIEW' };

export const WorkflowDetail = ({
  open,
  onClose,
  data,
  mutate,
  mode,
  setMode,
}) => {
  const user = useAuthStore((state) => state.user);
  const [jobOfWorkflow, setJobOfWorkflow] = useState(
    data?.assignJobs ? data?.assignJobs : [],
  );

  const [jobOfGroup, setJobOfGroups] = useState([]);
  const [listIgnoreResults, setListIgnoreResults] = React.useState([]);
  const {
    isVisible: isVisibleConfirmMD,
    openModal: openConfirmModal,
    closeModal: closeConfirmModal,
  } = useModal();
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const groupFilter = useGroupsStore((state) => state.groups);
  const jobFilter = useJobStore((state) => state.jobs);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const setJobs = useJobStore((state) => state.setJobs);
  const {
    totalGroups,
    setGroupOffset,
    groupSearchTextInput,
    setGroupSearchTextInput,
    totalJobs,
    setJobOffset,
    jobOffset,
    jobSearchTextInput,
    setJobSearchTextInput,
    setIsWorkflow,
  } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);

  const {
    handleSubmit,
    onSubmit,
    control,
    watchGroups,
    formState: { errors },
    getValues,
    setValue,
    updateForm,
    reset,
    setError,
    globalMutate,
    watch,
  } = useWorkflowForm(
    data,
    onClose,
    mutate,
    setJobOfGroups,
    setJobOfWorkflow,
    setListIgnoreResults,
  );

  const startDateTime = watch('start_date');
  const repeatInterval = watch('repeat_interval');
  const {
    isVisible: isRepeatIntervalOpen,
    openModal: handleOpenRepeatInterval,
    closeModal: closeRepeatInterval,
  } = useModal();

  function isValidRepeatInterval() {
    const prefix = 'FREQ=';
    if (!repeatInterval?.startsWith(prefix)) return false;

    const value = repeatInterval?.slice(prefix.length).trim();
    return value.length > 0;
  }

  useEffect(() => {
    if (open) {
      setIsWorkflow(true);
    }
    return () => {
      setIsWorkflow(false);
    };
  }, [open, setIsWorkflow]);

  useEffect(() => {
    setVisibleGroups((prev) => {
      const existingGroupIds = new Set(prev.map((group) => group.id));
      const newGroups = groupFilter.filter(
        (group) => !existingGroupIds.has(group.id),
      );
      return [...prev, ...newGroups];
    });
  }, [groupFilter]);

  const handleGroupScroll = (e) => {
    if (
      totalGroups > visibleGroups.length &&
      e.target.scrollHeight - e.target.scrollTop < 1000
    ) {
      setGroupOffset((prev) => prev + 1);
    }
  };

  const handleCancel = () => {
    setJobOfGroups([]);
    setJobOfWorkflow([]);
    setListIgnoreResults([]);
    reset();
    onClose();
  };

  useEffect(() => {
    updateForm(data);
    setJobOfWorkflow(
      data?.assignJobs?.map((job) => ({
        ...job,
        name: job.job_name,
        jobId: job.job_id,
        jobPriority: job.priority,
        jobDelay: job.delay,
        currentState: job.current_state,
        ignoreResult: job.ignore_result,
      })) || [],
    );
    setListIgnoreResults(
      data?.assignJobs
        ?.filter((job) => job.ignore_result)
        .map((job) => job.priority) || [],
    );
  }, [data]);

  useEffect(() => {
    if (getValues('group')) {
      setJobOfGroups((prev) => {
        if (jobOffset > 1) {
          const existingJobIds = new Set(prev.map((job) => job.job_id));
          const newJobs = jobFilter.filter(
            (job) => !existingJobIds.has(job.job_id),
          );
          return [...prev, ...newJobs];
        } else {
          return jobFilter;
        }
      });
    }
  }, [jobFilter]);

  const dialogTitle = (mode) => {
    switch (mode) {
      case WF_MODE.CREATE:
        return 'Create New Workflow';
      case WF_MODE.UPDATE:
        return 'Edit Workflow';
      default:
        return 'Workflow Detail';
    }
  };

  return (
    <Dialog open={open} maxWidth="lg" fullWidth>
      <DialogTitle className="text-2xl font-bold">
        {dialogTitle(mode)}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleCancel}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon className="text-2xl text-black" />
      </IconButton>
      <DialogContent>
        <form>
          <Box className="container">
            <Box className={`grid gap-2 mt-4 grid-cols-2`}>
              <TextInput
                disabled={mode === WF_MODE.VIEW}
                control={control}
                name="workflow_name"
                content={'Workflow Name'}
                required={true}
                isBackgroundGray={mode === WF_MODE.VIEW}
              />
              <Box className="inline-flex">
                {mode !== WF_MODE.VIEW ? (
                  <BaseSelected
                    name="group"
                    control={control}
                    options={visibleGroups}
                    getOptionLabel={(option) => option.name}
                    getOptionKey={(option) => option.id}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    inputValue={groupSearchTextInput}
                    onChange={async (event, newValue) => {
                      setJobOfGroups([]);
                      setJobOfWorkflow([]);
                      setListIgnoreResults([]);
                      setValue('job_of_workflow', []);
                      setGroup(newValue?.id);
                      // Directly fetch jobs for the selected group
                      if (newValue?.id) {
                        try {
                          const response = await api.post('/job/getFilter', {
                            group_id: newValue.id,
                            page_size: 100,
                            page_number: 1
                          });
                          if (response.data.success) {
                            setJobOfGroups(response.data.data || []);
                            setJobs(response.data.data || []);
                          }
                        } catch (error) {
                          console.error('Failed to fetch jobs for group:', error);
                        }
                      }
                    }}
                    onInputChange={(event, newValue) => {
                      setGroupSearchTextInput(newValue);
                    }}
                    content="Group"
                    required
                    height="50px"
                    ListboxProps={{
                      onScroll: handleGroupScroll,
                    }}
                    textStyles={'leading-5 text-secondaryGray'}
                  />
                ) : (
                  <BaseTextField
                    disabled
                    name="group_name"
                    content={'Group'}
                    required
                    value={data?.group || ' '}
                    fullWidth
                  />
                )}
              </Box>
              {mode === WF_MODE.VIEW && (
                <>
                  <BaseTextField
                    disabled
                    name="workflow_status"
                    content={'Workflow Status'}
                    value={data?.latest_status || ' '}
                  />
                  <BaseTextField
                    disabled
                    name="job_of_workflow"
                    content={t('Job')}
                    value={
                      jobOfWorkflow
                        ? jobOfWorkflow
                            .map((jobOfGroup) => jobOfGroup?.job_name)
                            .join(',') || ' '
                        : ''
                    }
                  />
                </>
              )}
            </Box>
            {mode !== WF_MODE.VIEW && (
              <Typography
                className={'text-sm font-medium text-secondaryGray mt-2'}
              >
                {t('Job')}
              </Typography>
            )}

            <Box className="w-full text-left  mb-3 flex items-center">
              {mode !== WF_MODE.VIEW && (
                <>
                  <TextInput
                    disabled={mode === WF_MODE.VIEW}
                    control={control}
                    name="job_of_workflow"
                    value={
                      jobOfWorkflow
                        ? jobOfWorkflow
                            .map((jobOfGroup) => jobOfGroup?.job_name)
                            .join(',') || ' '
                        : ''
                    }
                  />
                  <BaseButton
                    onClick={() => {
                      if (getValues('group')) {
                        openModal();
                      } else {
                        setError('group', {
                          message: 'Please select group first',
                        });
                      }
                    }}
                    sx={{ fontSize: '23px', marginLeft: '5px' }}
                    className="h-[45px] min-w-[45px] p-0 rounded-[45px]  border border-grayBorder"
                  >
                    <AddIcon />
                  </BaseButton>
                </>
              )}
            </Box>
          </Box>

          {isVisible && (
            <AddJobModal
              open={isVisible}
              onClose={closeModal}
              jobs={jobOfGroup}
              jobOfWorkflow={jobOfWorkflow}
              setJobOfWorkflow={setJobOfWorkflow}
              setFormValue={setValue}
              listIgnoreResults={listIgnoreResults}
              setListIgnoreResults={setListIgnoreResults}
              jobSearchTextInput={jobSearchTextInput}
              setJobSearchTextInput={setJobSearchTextInput}
              totalJobs={totalJobs}
              setJobOffset={setJobOffset}
            />
          )}

          <Box className={'grid gap-2 mt-4 grid-cols-2'}>
            <CustomDateTimePicker
              control={control}
              name="start_date"
              content="Start Date & Time"
              disablePast
              disabled={mode === WF_MODE.VIEW}
              isBackgroundGray={mode === WF_MODE.VIEW}
              required
              className="col-span-2"
            />
            <TextInput
              control={control}
              name="repeat_interval"
              content="Repeat Interval"
              required
              className="col-span-2"
              InputProps={{
                endAdornment:
                  startDateTime && isValidRepeatInterval() ? (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleOpenRepeatInterval}
                        aria-label="info"
                        sx={{
                          padding: '6px',
                          color: '#86868B',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            color: '#0071E3',
                            backgroundColor: 'rgba(0, 113, 227, 0.06)',
                          },
                        }}
                      >
                        <InfoIcon sx={{ fontSize: '20px' }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
              }}
              disabled={mode === WF_MODE.VIEW}
              isBackgroundGray={mode === WF_MODE.VIEW}
            />
          </Box>
          {/* Repeat Interval Dialog */}
          {isRepeatIntervalOpen && (
            <RepeatIntervalDialog
              open={isRepeatIntervalOpen}
              onClose={closeRepeatInterval}
              repeatInterval={repeatInterval}
              startDate={data ? data.start_date : startDateTime?.valueOf()}
            />
          )}

          {mode === WF_MODE.VIEW && (
            <Box className={'grid gap-2 mt-4 grid-cols-2'}>
              <BaseTextField
                disabled
                value={
                  data?.last_run_date ? timestampFormat(data.last_run_date) : ''
                }
                content={t('last_start_date')}
              />
              <BaseTextField
                disabled
                value={
                  data?.next_run_date ? timestampFormat(data.next_run_date) : ''
                }
                content={t('next_start_time')}
              />
            </Box>
          )}

          <Box
            className="mt-4"
            sx={{
              minHeight: '50vh',
            }}
          >
            <WorkFlowNodes jobs={jobOfWorkflow} />
          </Box>
          <Box className="flex col-span-2 justify-end ml-auto space-x-2 mt-2">
            <BaseButton onClick={handleCancel} theme="light">
              Cancel
            </BaseButton>
            {data && user?.user_type === 0 && (
              <>
                <BaseButton theme="light" onClick={() => openConfirmModal()}>
                  Delete
                </BaseButton>
                <ConfirmDialog
                  widthClassName="w-100"
                  openConfirm={isVisibleConfirmMD}
                  setCloseConfirm={closeConfirmModal}
                  title="Delete"
                  callback={() =>
                    useDeleteWorkflow(
                      data,
                      mutate,
                      onClose,
                      reset,
                      globalMutate,
                    )
                  }
                >
                  <div className="w-full text-lg">
                    <p>
                      <strong>
                        Are you sure you want to delete the workflow?
                      </strong>
                    </p>
                    <br />
                    <p>
                      Workflow Name:{' '}
                      <span className="text-red-500">
                        {data?.workflow_name}
                      </span>
                    </p>
                  </div>
                </ConfirmDialog>
              </>
            )}

            {mode === WF_MODE.VIEW &&
              user?.user_type === 0 &&
              data?.latest_status !== workflowStatusOptions[2] && (
                <BaseButton
                  theme="dark"
                  onClick={() => {
                    setMode(WF_MODE.UPDATE);
                    setValue('group', {
                      id: data?.group_id,
                      name: data?.group,
                    });
                    setGroup(data?.group_id);
                  }}
                >
                  Edit
                </BaseButton>
              )}
            {mode !== WF_MODE.VIEW && (
              <BaseButton
                theme="dark"
                disabled={
                  mode === WF_MODE.UPDATE &&
                  jobOfWorkflow?.length === 0 &&
                  (data?.latest_status === 'SUCCESS' ||
                    data?.latest_status === 'FAILED')
                }
                onClick={handleSubmit((data) => {
                  onSubmit(data, listIgnoreResults);
                })}
              >
                Save
              </BaseButton>
            )}
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};
