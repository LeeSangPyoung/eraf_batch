import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  ListItemText,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAssignJobForm } from '../../hook/useWorkflowForm';
import BaseButton from '../CustomInput/BaseButton';
import BaseSelected from '../CustomInput/BaseSelected';
import { styleHeaderTable } from '../Table/JobResultTable';
import { TableWrapper } from '../Table/TableWrapper';

const IGNORE_STATUS_JOB = ['RUNNING', 'SUCCESS', 'COMPLETED', 'BROKEN', 'DELETED'];

const JobOfWorkflowTable = ({ className, form, fields, handleFieldChange }) => {
  const { control, setLastChanged } = form;
  const { t } = useTranslation();
  useEffect(() => {
    setLastChanged(fields.length - 1);
  }, [fields]);
  return (
    <Box className={className}>
      <TableWrapper minWidth={'500px'}>
        <TableHead className="bg-white  sticky top-[-1px]">
          <TableRow>
            <TableCell style={styleHeaderTable}>{t('job_name')}</TableCell>
            <TableCell style={styleHeaderTable}>{t('priority')}</TableCell>
            <TableCell style={styleHeaderTable}>{t('delay')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody className="transition">
          {fields.map((job, index) => (
            <TableRow key={job.job_id}>
              <TableCell>{job.job_name}</TableCell>
              <TableCell>
                <Controller
                  control={control}
                  name={`assignJobs.${index}.jobPriority`}
                  defaultValue={0}
                  render={({
                    field: { ref, ...field },
                    fieldState: { error },
                  }) => (
                    <TextField
                      id={job.job_id}
                      className="w-full"
                      inputRef={ref}
                      {...field}
                      type="number"
                      InputProps={{ min: 1, max: 20 }}
                      error={!!error}
                      helperText={error?.message}
                      // @ts-ignore
                      onWheel={(event) => event.target.blur()}
                      onFocus={(event) => {
                        event.target.select();
                      }}
                      onChange={(event) => {
                        const value = parseFloat(event.target.value);
                        field.onChange(isNaN(value) ? 0 : value);
                        setLastChanged(index);
                        handleFieldChange(
                          job.job_id,
                          isNaN(value) ? 0 : value,
                          'jobPriority',
                        );
                      }}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  control={control}
                  name={`assignJobs.${index}.jobDelay`}
                  defaultValue={0}
                  render={({
                    field: { ref, ...field },
                    fieldState: { error },
                  }) => (
                    <TextField
                      id={job.job_id}
                      className="w-full"
                      inputRef={ref}
                      {...field}
                      type="number"
                      InputProps={{ min: 1, max: 20 }}
                      error={!!error}
                      helperText={error?.message}
                      // @ts-ignore
                      onWheel={(event) => event.target.blur()}
                      onFocus={(event) => {
                        event.target.select();
                      }}
                      onChange={(event) => {
                        const value = parseFloat(event.target.value);
                        field.onChange(isNaN(value) ? 0 : value);
                        setLastChanged(index);
                        handleFieldChange(
                          job.job_id,
                          isNaN(value) ? 0 : value,
                          'jobDelay',
                        );
                      }}
                    />
                  )}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableWrapper>
    </Box>
  );
};

const AddJobModal = ({
  open,
  onClose,
  jobs,
  jobOfWorkflow,
  setJobOfWorkflow,
  setFormValue,
  listIgnoreResults,
  setListIgnoreResults,
  jobSearchTextInput,
  setJobSearchTextInput,
  totalJobs,
  setJobOffset,
}) => {
  const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
  const checkedIcon = <CheckBoxIcon fontSize="small" />;

  const [selectedJobs, setSelectedJobs] = React.useState(
    jobOfWorkflow ? jobOfWorkflow : [],
  );
  const callbackSubmit = (data) => {
    setJobOfWorkflow(fields);
    setSelectedJobs(fields);
    setFormValue('job_of_workflow', fields);
    onClose();
  };

  const form = useAssignJobForm(jobOfWorkflow, callbackSubmit);
  const baseFormControl = useForm({
    defaultValues: {
      selectedJobs: selectedJobs,
    },
  });

  const { handleSubmit, onSubmit } = form;
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'assignJobs',
  });
  const [jobPriorities, setJobPriorities] = React.useState({});
  const [jobDelays, setJobDelays] = React.useState({});
  const [disable, setDisable] = React.useState(false);
  const [initDisable, setInitDisable] = React.useState(false);

  const handleJobScroll = (e) => {
    if (
      totalJobs > jobs.length &&
      e.target.scrollHeight - e.target.scrollTop < 1000
    ) {
      setJobOffset((prev) => prev + 1);
    }
  };

  const handleChange = (newValue) => {
    setSelectedJobs(newValue);
    replace(
      newValue.map((item) => ({
        ...item,
        jobId: item.job_id,
        jobPriority: jobPriorities[item.job_id] ?? 0,
        jobDelay: jobDelays[item.job_id] ?? 0,
      })),
    );
  };

  const handleChangeIgnoreResult = (priority) => {
    if (listIgnoreResults.includes(priority)) {
      const newIgnoreResults = listIgnoreResults.filter(
        (item) => item !== priority,
      );
      setListIgnoreResults(newIgnoreResults);
    } else {
      setListIgnoreResults([...listIgnoreResults, priority]);
    }
  };
  const handleFieldChange = (job_id, value, field) => {
    let temp = {};
    if (field === 'jobPriority') {
      temp = { ...jobPriorities };
      temp[job_id] = value;
      setJobPriorities(temp);
      replace(
        fields.map((item) => ({
          ...item,
          jobPriority: temp[item.jobId] ?? 0,
        })),
      );
    } else {
      temp = { ...jobDelays };
      temp[job_id] = value;
      setJobDelays(temp);
      replace(
        fields.map((item) => ({
          ...item,
          jobDelay: temp[item.jobId] ?? 0,
        })),
      );
    }
  };
  useEffect(() => {
    let temp = {};
    fields.forEach((job) => {
      temp[job.jobId] = job.jobPriority ?? 0;
    });
    setJobPriorities(temp);
    temp = {};
    fields.forEach((job) => {
      temp[job.jobId] = job.jobDelay ?? 0;
    });
    setJobDelays(temp);
  }, [fields]);
  useEffect(() => {
    if (initDisable === true) {
      return;
    }
    setDisable(
      jobs.length === 0 &&
        selectedJobs.length === 0 &&
        jobSearchTextInput === '',
    );
    setInitDisable(true);
  }, [jobs, selectedJobs, jobSearchTextInput]);

  useEffect(() => {
    baseFormControl.setValue('selectedJobs', selectedJobs);
  }, [selectedJobs, baseFormControl]);

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableAutoFocus
      PaperProps={{
        sx: {
          borderRadius: '20px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16)',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '20px 24px 16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        Add Job To Workflow
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          width: '32px',
          height: '32px',
          color: '#86868B',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#F5F5F7',
            color: '#1D1D1F',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '20px' }} />
      </IconButton>
      <DialogContent sx={{ padding: '0 24px 24px', overflow: 'visible' }}>
        <Box>
          <FormControl className="w-full">
            <BaseSelected
              control={baseFormControl.control}
              name="selectedJobs"
              options={jobs}
              getOptionLabel={(option) => option.job_name}
              getOptionKey={(option) => option.job_id}
              isOptionEqualToValue={(option, value) =>
                option.job_id === value.job_id
              }
              isDisablePortal={false}
              content={'Jobs'}
              inputValue={jobSearchTextInput}
              onChange={(event, newValue) => {
                baseFormControl.setValue('selectedJobs', newValue);
                handleChange(newValue);
              }}
              onInputChange={(event, newValue) => {
                setJobSearchTextInput(newValue);
              }}
              multiple
              disabled={disable}
              getOptionDisabled={(option) =>
                IGNORE_STATUS_JOB.includes(option.current_state) ||
                option.workflow_id !== null
              }
              ListboxProps={{
                onScroll: handleJobScroll,
              }}
              disableCloseOnSelect
              renderOption={(props, option, { selected }) => {
                const { key, ...optionProps } = props;
                return (
                  <li
                    key={key}
                    {...optionProps}
                    className="bg-transparent hover:bg-grayLight rounded-lg m-1 MuiAutocomplete-option"
                  >
                    <Checkbox
                      icon={icon}
                      checkedIcon={checkedIcon}
                      style={{ marginRight: 8 }}
                      checked={selected}
                      sx={{
                        '& .MuiSvgIcon-root': {
                          color: '#E9EAEB',
                        },
                        '&.Mui-checked .MuiSvgIcon-root': {
                          color: '#0071E3',
                        },
                      }}
                    />
                    {option.job_name}
                  </li>
                );
              }}
            />
            {selectedJobs.length > 0 && (
              <div>
                <JobOfWorkflowTable
                  form={form}
                  className="mt-3"
                  fields={fields}
                  handleFieldChange={handleFieldChange}
                />
                {Array.from(new Set(Object.values(jobPriorities))).some(p => p >= 1) && (
                  <>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#86868B',
                        marginTop: '12px',
                        marginBottom: '4px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Ignore priority results
                    </Typography>
                    <div className="grid grid-cols-5">
                      {Array.from(new Set(Object.values(jobPriorities)))
                        .filter(p => p >= 1)
                        .sort((a, b) => a - b)
                        .map((item) => (
                          <MenuItem
                            key={item}
                            value={item}
                            sx={{
                              margin: '0 2px',
                              borderRadius: '10px !important',
                              '& .MuiCheckbox-root': {
                                padding: '0',
                                paddingRight: '10px',
                              },
                              '&.Mui-selected': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <Checkbox
                              sx={{
                                '& .MuiSvgIcon-root': {
                                  color: '#E9EAEB',
                                },
                                '&.Mui-checked .MuiSvgIcon-root': {
                                  color: '#0071E3',
                                },
                              }}
                              checked={listIgnoreResults.includes(item)}
                              onChange={() => {
                                handleChangeIgnoreResult(item);
                              }}
                            />
                            <ListItemText primary={item} />
                          </MenuItem>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <BaseButton theme="light" onClick={onClose}>
                Cancel
              </BaseButton>
              <BaseButton theme="dark" onClick={handleSubmit(onSubmit)}>
                Save
              </BaseButton>
            </Box>
          </FormControl>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;
