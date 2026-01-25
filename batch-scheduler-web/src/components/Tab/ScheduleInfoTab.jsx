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
  timestampFormat,
} from '../../utils/helper';
import BaseSelected from '../CustomInput/BaseSelected';
import BaseTextArea from '../CustomInput/BaseTextArea';
import BaseTextField from '../CustomInput/BaseTextField';
import CustomDateTimePicker from '../CustomInput/CustomDateTimePicker';
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
  const startDateTime = watch('start_date');
  const repeatInterval = watch('repeat_interval');
  const endDateTime = watch('end_date');

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
    <SimpleBar style={{ height: '60vh', paddingTop: 6, paddingBottom: 10 }}>
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
              : startDateTime?.valueOf()
          }
        />
      )}
      {visibleGroups && serverFilter && (
        <Box className="grid grid-cols-2 gap-2">
          <Box className="flex flex-col">
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: '4px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              }}
            >
              System <span style={{ color: '#FF3B30' }}> *</span>
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
                variant="outlined"
                sx={{
                  minWidth: '36px',
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  borderRadius: '10px',
                  border: '1px solid #E8E8ED',
                  backgroundColor: '#FFFFFF',
                  color: '#86868B',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    border: '1px solid #0071E3',
                    backgroundColor: 'rgba(0, 113, 227, 0.06)',
                    color: '#0071E3',
                  },
                  '&:disabled': {
                    border: '1px solid #E8E8ED',
                    backgroundColor: '#F5F5F7',
                    color: '#C7C7CC',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '18px',
                  },
                }}
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
          <Box className="flex flex-col">
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: '4px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              }}
            >
              Group <span style={{ color: '#FF3B30' }}> *</span>
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
                variant="outlined"
                sx={{
                  minWidth: '36px',
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  borderRadius: '10px',
                  border: '1px solid #E8E8ED',
                  backgroundColor: '#FFFFFF',
                  color: '#86868B',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    border: '1px solid #0071E3',
                    backgroundColor: 'rgba(0, 113, 227, 0.06)',
                    color: '#0071E3',
                  },
                  '&:disabled': {
                    border: '1px solid #E8E8ED',
                    backgroundColor: '#F5F5F7',
                    color: '#C7C7CC',
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: '18px',
                  },
                }}
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
                value={data.current_state || ''}
                sx={colorIndicator(data.current_state)}
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
            content="Start Date & Time"
            disablePast
          />
          <CustomDateTimePicker
            control={control}
            name="end_date"
            content="End Date & Time"
            disablePast
          />
          <TextInput
            control={control}
            name="repeat_interval"
            content="Repeat Interval"
            required={true}
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
          <Box className="col-span-2 grid grid-cols-4 gap-2 w-full">
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
            minRows={2}
            maxRows={4}
          />
        </Box>
      )}
    </SimpleBar>
  );
};

export default ScheduleInfoTab;
