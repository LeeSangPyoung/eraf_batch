import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info.js';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import React, { useEffect, useState } from 'react';
import SimpleBar from 'simplebar-react';
import useAuthStore from '../../hook/store/useAuthStore';
import useGroupsStore from '../../hook/store/useGroupStore';
import useSystemsStore from '../../hook/store/useSystemsStore';
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
import TextInput from '../CustomInput/TextInput';
import CreateAndModifyGroup from '../Dialog/CreateAndModifyGroup';
import RepeatIntervalDialog from '../Dialog/RepeatInterval.jsx';
import RRuleBuilder from '../Dialog/RRuleBuilder.jsx';

const ScheduleInfoTab = ({ data, form }) => {
  //Retrieve systems from global state
  const user = useAuthStore((state) => state.user);

  const serverFilter = useSystemsStore((state) => state.systems);
  const groupFilter = useGroupsStore((state) => state.groups);
  const {
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
  const secondarySystem = watch('secondary_system');
  const tertiarySystem = watch('tertiary_system');
  const group = watch('group');
  const startDateTime = watch('start_date');
  const repeatInterval = watch('repeat_interval');
  const endDateTime = watch('end_date');

  // Filter out already selected servers to prevent duplicates
  const getAvailableServersForSlave1 = () => {
    return serverFilter.filter((s) => s.id !== system?.id);
  };

  const getAvailableServersForSlave2 = () => {
    return serverFilter.filter((s) => s.id !== system?.id && s.id !== secondarySystem?.id);
  };

  const {
    isVisible: isRepeatIntervalOpen,
    openModal: handleOpenRepeatInterval,
    closeModal: closeRepeatInterval,
  } = useModal();

  const {
    isVisible: isRRuleBuilderOpen,
    openModal: openRRuleBuilder,
    closeModal: closeRRuleBuilder,
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

  // Clear slave selections if they conflict with master/slave1
  useEffect(() => {
    if (secondarySystem?.id && system?.id === secondarySystem?.id) {
      setValue('secondary_system', null);
    }
    if (tertiarySystem?.id && (system?.id === tertiarySystem?.id || secondarySystem?.id === tertiarySystem?.id)) {
      setValue('tertiary_system', null);
    }
  }, [system?.id, secondarySystem?.id, tertiarySystem?.id, setValue]);


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
          startDate={(() => {
            const now = Date.now();
            if (data && data.nextRunDate && data.nextRunDate !== 1) {
              return data.nextRunDate > now ? data.nextRunDate : now;
            }
            return startDateTime?.valueOf() || now;
          })()}
        />
      )}
      {visibleGroups && serverFilter && (
        <Box className="grid grid-cols-2 gap-2">
          {/* Server Section */}
          <Box className="col-span-2 flex flex-col gap-1">
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#1D1D1F',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              }}
            >
              Server <span style={{ color: '#FF3B30' }}> *</span>
            </Typography>
            <Box className="grid grid-cols-3 gap-2">
              {/* Master */}
              <Box className="flex flex-col">
                <Typography
                  sx={{
                    fontSize: '10px',
                    fontWeight: 400,
                    color: '#86868B',
                    marginBottom: '2px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  Master
                </Typography>
                <BaseSelected
                  name="system"
                  control={control}
                  options={serverFilter}
                  getOptionLabel={(option) => option.name}
                  getOptionKey={(option) => option.id}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
              </Box>
              {/* Slave1 */}
              <Box className="flex flex-col">
                <Typography
                  sx={{
                    fontSize: '10px',
                    fontWeight: 400,
                    color: '#86868B',
                    marginBottom: '2px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  Slave1
                </Typography>
                <BaseSelected
                  name="secondary_system"
                  control={control}
                  options={[{ id: null, name: '- None -' }, ...getAvailableServersForSlave1()]}
                  getOptionLabel={(option) => option.name}
                  getOptionKey={(option) => option.id}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                />
              </Box>
              {/* Slave2 */}
              <Box className="flex flex-col">
                <Typography
                  sx={{
                    fontSize: '10px',
                    fontWeight: 400,
                    color: '#86868B',
                    marginBottom: '2px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  Slave2
                </Typography>
                <BaseSelected
                  name="tertiary_system"
                  control={control}
                  options={[{ id: null, name: '- None -' }, ...getAvailableServersForSlave2()]}
                  getOptionLabel={(option) => option.name}
                  getOptionKey={(option) => option.id}
                  isOptionEqualToValue={(option, value) => option?.id === value?.id}
                />
              </Box>
            </Box>
          </Box>
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
          {/* Repeat Interval with Presets - grouped together */}
          <Box className="col-span-2">
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#1D1D1F',
                marginBottom: '6px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              }}
            >
              Repeat Interval <span style={{ color: '#FF3B30' }}> *</span>
            </Typography>
            <Box
              sx={{
                border: '1px solid #E8E8ED',
                borderRadius: '12px',
                padding: '12px',
                backgroundColor: '#FAFAFA',
              }}
            >
              <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <TextInput
                    control={control}
                    name="repeat_interval"
                  />
                </Box>
                {startDateTime && isValidRepeatInterval() && (
                  <IconButton
                    onClick={handleOpenRepeatInterval}
                    aria-label="View scheduled runs"
                    sx={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E8E8ED',
                      color: '#0071E3',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 113, 227, 0.06)',
                        borderColor: '#0071E3',
                      },
                    }}
                  >
                    <InfoIcon sx={{ fontSize: '20px' }} />
                  </IconButton>
                )}
              </Box>
            {/* RRULE Presets */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {[
                { label: 'Every 1 min', value: 'FREQ=MINUTELY;INTERVAL=1' },
                { label: 'Every 5 min', value: 'FREQ=MINUTELY;INTERVAL=5' },
                { label: 'Hourly', value: 'FREQ=HOURLY;INTERVAL=1' },
                { label: 'Daily', value: 'FREQ=DAILY;INTERVAL=1' },
                { label: 'Weekly', value: 'FREQ=WEEKLY;INTERVAL=1' },
                { label: 'Monthly', value: 'FREQ=MONTHLY;INTERVAL=1' },
              ].map((preset) => (
                <Chip
                  key={preset.value}
                  label={preset.label}
                  size="small"
                  onClick={() => setValue('repeat_interval', preset.value)}
                  sx={{
                    fontSize: '11px',
                    height: '24px',
                    backgroundColor: repeatInterval === preset.value ? '#0071E3' : '#FFFFFF',
                    color: repeatInterval === preset.value ? '#FFFFFF' : '#1D1D1F',
                    border: repeatInterval === preset.value ? 'none' : '1px solid #E8E8ED',
                    '&:hover': {
                      backgroundColor: repeatInterval === preset.value ? '#0077ED' : '#F5F5F7',
                    },
                    cursor: 'pointer',
                  }}
                />
              ))}
              <Chip
                label="Custom..."
                size="small"
                onClick={openRRuleBuilder}
                sx={{
                  fontSize: '11px',
                  height: '24px',
                  backgroundColor: '#FFFFFF',
                  color: '#0071E3',
                  border: '1px solid #0071E3',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 113, 227, 0.06)',
                  },
                  cursor: 'pointer',
                }}
              />
            </Box>
            </Box>
          </Box>

          {/* RRULE Builder Dialog */}
          <RRuleBuilder
            open={isRRuleBuilderOpen}
            onClose={closeRRuleBuilder}
            onApply={(rrule) => setValue('repeat_interval', rrule)}
            currentValue={repeatInterval}
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
