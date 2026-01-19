import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info.js';
import { Box, IconButton, InputAdornment, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import React, { useEffect, useState } from 'react';
import SimpleBar from 'simplebar-react';
import useAuthStore from '../../hook/store/useAuthStore';
import useGroupsStore from '../../hook/store/useGroupStore';
import useSystemsStore from '../../hook/store/useSystemsStore';
import useUserStore from '../../hook/store/useUserStore';
import useFilterData from '../../hook/useFilterData';
import useModal from '../../hook/useModal';
import {
  colorIndicator,
  formatDateTime,
  timestampFormat,
} from '../../utils/helper';
import BaseSelected from '../CustomInput/BaseSelected';
import BaseTextArea from '../CustomInput/BaseTextArea';
import BaseTextField from '../CustomInput/BaseTextField';
import CustomDateTimePicker from '../CustomInput/CustomDateTimePicker';
import CustomTimePicker from '../CustomInput/CustomTimePicker';
import { NumberInput } from '../CustomInput/NumberInput';
import RHFCheckbox from '../CustomInput/RHFCheckbox';
import Selected from '../CustomInput/Select';
import TextInput from '../CustomInput/TextInput';
import BatchJobServerDialog from '../Dialog/BatchJobServerDialog';
import CreateAndModifyGroup from '../Dialog/CreateAndModifyGroup';
import RepeatIntervalDialog from '../Dialog/RepeatInterval.jsx';

const ScheduleInfoTab = ({ data, form }) => {
  //Retrieve systems from global state
  const users = useUserStore((state) => state.users);
  const user = useAuthStore((state) => state.user);

  const serverFilter = useSystemsStore((state) => state.systems);
  const groupFilter = useGroupsStore((state) => state.groups);
  const {
    serverFilterMutation,
    groupFilterMutation,
    totalGroups,
    setGroupOffset,
    groupSearchTextInput,
    setGroupSearchTextInput,
  } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);
  const { isVisible, openModal, closeModal } = useModal();
  const { control, watch, setValue, trigger, clearErrors } = form;

  const restartOnFailure = watch('restart_on_failure');
  const system = watch('system');
  const group = watch('group');
  const startDate = watch('start_date');
  const startTime = watch('start_time');
  const repeatInterval = watch('repeat_interval');
  const endDate = watch('end_date');

  const {
    isVisible: isOpenDialogJobServer,
    openModal: handleClickOpenJobServer,
    closeModal: handleCloseJobServer,
  } = useModal();

  const {
    isVisible: isRepeatIntervalOpen,
    openModal: handleOpenRepeatInterval,
    closeModal: closeRepeatInterval,
  } = useModal();

  useEffect(() => {
    setVisibleGroups((prev) => {
      const existingGroupIds = new Set(prev.map((group) => group.id));
      const newGroups = groupFilter.filter(
        (group) => !existingGroupIds.has(group.id),
      );
      return [...prev, ...newGroups];
    });
  }, [groupFilter]);

  useEffect(() => {
    if (!endDate) {
      setValue('end_time', null);
      clearErrors('end_time');
    }
  }, [endDate, setValue]);

  const handleGroupScroll = (e) => {
    if (
      totalGroups > visibleGroups.length &&
      e.target.scrollHeight - e.target.scrollTop < 1000
    ) {
      setGroupOffset((prev) => prev + 1);
    }
  };

  function isValidRepeatInterval() {
    const prefix = 'FREQ=';
    if (!repeatInterval?.startsWith(prefix)) return false;

    const value = repeatInterval?.slice(prefix.length).trim();
    return value.length > 0;
  }

  return (
    <SimpleBar style={{ height: '60vh', paddingTop: 10, paddingBottom: 15 }}>
      {isOpenDialogJobServer && (
        <BatchJobServerDialog
          onClose={handleCloseJobServer}
          open={isOpenDialogJobServer}
          data={serverFilter?.filter((i) => i.id === system?.id)[0]}
          mutateSystem={serverFilterMutation}
          jobForm={form}
        />
      )}
      {isVisible && (
        <CreateAndModifyGroup
          open={isVisible}
          onClose={closeModal}
          data={visibleGroups?.find((i) => i.id === group?.id)}
          jobForm={form}
          setVisibleGroups={setVisibleGroups}
        />
      )}

      {/* Repeat Interval Dialog */}
      {isRepeatIntervalOpen && (
        <RepeatIntervalDialog
          open={isRepeatIntervalOpen}
          onClose={closeRepeatInterval}
          repeatInterval={repeatInterval}
          startDate={
            data && data.nextRunDate && data.nextRunDate !== 1
              ? data.nextRunDate
              : formatDateTime(startDate, startTime)
          }
        />
      )}
      {visibleGroups && serverFilter && (
        <Box className="grid grid-cols-2 gap-4">
          <Box className="flex flex-col ">
            <Typography
              className={
                'text-sm font-medium text-secondaryGray leading-normal tracking-normal'
              }
            >
              System <span className="text-red-500"> *</span>
            </Typography>
            <Box className="flex gap-2">
              <BaseSelected
                name="system"
                control={control}
                options={serverFilter}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => option.id}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              <Button
                disabled={user?.user_type !== 0}
                onClick={handleClickOpenJobServer}
                sx={{ fontSize: '23px' }}
                variant="outlined"
                size="large"
                className="h-[45px] min-w-[45px] p-0 rounded-[45px] border border-grayBorder"
              >
                <AddIcon />
              </Button>
            </Box>
          </Box>
          {data ? (
            <Selected
              control={control}
              name="last_reg_user_id"
              options={users}
              content="Changer"
              required
              valueKey="id"
              labelKey="user_name"
            />
          ) : (
            <Selected
              control={control}
              name="frst_reg_user_id"
              options={users}
              content="Creator"
              valueKey="id"
              labelKey="user_name"
              required
            />
          )}
          <Box className=" flex flex-col ">
            <Typography className={'text-sm font-medium text-secondaryGray'}>
              Group <span className="text-red-500"> *</span>
            </Typography>
            <Box className="flex gap-2">
              <BaseSelected
                name="group"
                control={control}
                options={visibleGroups}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => option.id}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                inputValue={groupSearchTextInput}
                onInputChange={(event, newValue) => {
                  setGroupSearchTextInput(newValue);
                }}
                ListboxProps={{
                  onScroll: handleGroupScroll,
                }}
              />
              <Button
                disabled={user?.user_type !== 0}
                onClick={openModal}
                sx={{ fontSize: '23px' }}
                variant="outlined"
                size="large"
                className="h-[45px] min-w-[45px] p-0 rounded-[45px]  border border-grayBorder"
              >
                <AddIcon />
              </Button>
            </Box>
          </Box>
          <TextInput
            control={control}
            name="job_name"
            content="Job Name"
            required={true}
          />
          {data && (
            <>
              <BaseTextField
                id="currentState"
                content="Current State"
                disabled={true}
                value={data.currentState || ''}
                sx={colorIndicator(data.currentState)}
              />
              <BaseTextField
                id="lastRunDuration"
                content="Last Run Duration"
                disabled={true}
                value={data.lastRunDuration || ''}
              />
              <BaseTextField
                id="lastStartDate"
                content="Last Start Date"
                disabled={true}
                value={timestampFormat(data.lastStartDate) || ''}
              />
              <BaseTextField
                id="nextRunDate"
                content="Next Run Date"
                disabled={true}
                value={timestampFormat(data.nextRunDate) || ''}
              />
            </>
          )}
          <CustomDateTimePicker
            control={control}
            name="start_date"
            required
            content="Start Date"
            disablePast
          />
          <CustomTimePicker
            control={control}
            name="start_time"
            required
            content="Start Time"
            disablePast
          />
          <CustomDateTimePicker
            control={control}
            name="end_date"
            content="End Date"
            disablePast
          />
          <CustomTimePicker
            control={control}
            name="end_time"
            content="End Time"
            disablePast
            disabled={!watch('end_date')}
          />
          <TextInput
            control={control}
            name="repeat_interval"
            content="Repeat Interval"
            required={true}
            className="col-span-2"
            InputProps={{
              endAdornment:
                startDate && startTime && isValidRepeatInterval() ? (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleOpenRepeatInterval}
                      color="info"
                      sx={{ padding: 0 }}
                      aria-label="info"
                      className="text-grayDark"
                    >
                      <InfoIcon />
                    </IconButton>
                  </InputAdornment>
                ) : null,
            }}
          />
          {/* <NumberInput
            control={control}
            name="retry_delay"
            label="Retry Delay"
            className={data ? '' : 'col-span-2'}
            disabled={!restartOnFailure}
          /> */}
          {/*data && (
            <>
              <TextField
                id="runCount"
                label="Run Count"
                disabled={true}
                value={data.runCount || ''}
              />
              <TextField
                id="failureCount"
                label="Failure Count"
                disabled={true}
                value={data.failureCount || ''}
              />
              <TextField
                id="retryCount"
                label="Retry Count"
                disabled={true}
                value={data.retryCount || ''}
              />
            </>
          )*/}
          <TextInput
            control={control}
            name="max_run_duration"
            content="Max Run Duration"
          />
          <NumberInput control={control} name="max_run" content="Max Run" />
          <NumberInput
            control={control}
            name="max_failure"
            content="Max Failures"
            className="col-span-2"
            disabled={!restartOnFailure}
          />
          {/* <NumberInput control={control} name="priority" label="Priority" /> */}
          <Box className="col-span-2 grid grid-cols-4 gap-4 w-full">
            <RHFCheckbox
              disabled={user?.user_type !== 0}
              label="Enable"
              name="is_enabled"
              control={control}
            />
            <RHFCheckbox
              disabled={user?.user_type !== 0}
              label="Auto Drop"
              name="auto_drop"
              control={control}
            />
            <RHFCheckbox
              disabled={user?.user_type !== 0}
              label="Restart On Failure"
              name="restart_on_failure"
              control={control}
            />
            <RHFCheckbox
              disabled={user?.user_type !== 0}
              label="Restartable"
              name="restartable"
              control={control}
            />
          </Box>
          <BaseTextArea
            control={control}
            name="job_comments"
            content="Comment"
            className="col-span-2"
          />
        </Box>
      )}
    </SimpleBar>
  );
};

export default ScheduleInfoTab;
