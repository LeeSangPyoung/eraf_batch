import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useGroupsStore from '../../hook/store/useGroupStore';
import useJobStore from '../../hook/store/useJobStore';
import useSystemsStore from '../../hook/store/useSystemsStore';
import useFilterData from '../../hook/useFilterData';
import {
  currentStateOptions,
  enableOptions,
  lastResultOptions,
  wfRegisteredOptions,
} from '../../utils/enum';
import BaseDatePicker from '../CustomInput/BaseDatePicker';
import SearchTextField from '../CustomInput/SearchTextField';
import SearchAutocomplete from '../CustomInput/SearchAutocomplete';

function TableFilter({
  job,
  group,
  server,
  handleChange,
  searchTerm,
  setSearchTerm,
  inputCombo,
  handleValueChange,
  handleInputChange,
}) {
  const { t } = useTranslation();
  const jobFilter = useJobStore((state) => state.jobs);
  const serverFilter = useSystemsStore((state) => state.systems);
  const groupFilter = useGroupsStore((state) => state.groups);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const {
    totalGroups,
    setGroupOffset,
    groupSearchTextInput,
    setGroupSearchTextInput,
    totalJobs,
    setJobOffset,
    jobSearchTextInput,
    setJobSearchTextInput,
  } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);
  const [visibleJobs, setVisibleJobs] = useState([]);
  const [serverSearchTextInput, setServerSearchTextInput] = useState('');

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

  useEffect(() => {
    setVisibleJobs((prev) => {
      const existingJobIds = new Set(prev.map((job) => job.job_id));
      const newJobs = jobFilter.filter(
        (job) => !existingJobIds.has(job.job_id),
      );
      return [...prev, ...newJobs];
    });
  }, [jobFilter]);

  const handleJobScroll = (e) => {
    if (
      totalJobs > visibleJobs.length &&
      e.target.scrollHeight - e.target.scrollTop < 1000
    ) {
      setJobOffset((prev) => prev + 1);
    }
  };

  const handleChangeGroup = (event, newValue) => {
    const e = { target: { value: newValue ? newValue.id : 'all' } };
    handleChange(e, 'group');
    if (e.target.value === 'all') {
      setGroup(null);
    } else {
      setGroup(e.target.value);
    }
    setGroupSearchTextInput('');
  };

  const handleChangeJob = (event, newValue) => {
    handleChange(
      { target: { value: newValue ? newValue.job_id : 'all' } },
      'job',
    );
    // Clear input sau khi chọn
    setJobSearchTextInput('');
  };

  return (
    <div className="grid lg:grid-cols-5 md:grid-cols-3 gap-3">
      {visibleJobs &&
        serverFilter &&
        visibleGroups &&
        job &&
        group &&
        server && (
          <>
            <SearchAutocomplete
              id="server-filter"
              options={serverFilter}
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id}
              value={serverFilter.find((s) => s.id === server)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              inputValue={serverSearchTextInput}
              onChange={(event, newValue) => {
                handleChange(
                  { target: { value: newValue ? newValue.id : 'all' } },
                  'server',
                );
                setServerSearchTextInput('');
              }}
              onInputChange={(event, newValue) => {
                setServerSearchTextInput(newValue);
              }}
              content={t('system')}
            />
            <SearchAutocomplete
              id="group-filter"
              options={visibleGroups}
              getOptionLabel={(option) => option.name}
              getOptionKey={(option) => option.id}
              value={visibleGroups.find((g) => g.id === group)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              inputValue={groupSearchTextInput}
              onChange={(event, newValue) => handleChangeGroup(event, newValue)}
              onInputChange={(event, newValue) => {
                setGroupSearchTextInput(newValue);
              }}
              content={t('group')}
              ListboxProps={{
                onScroll: handleGroupScroll,
              }}
            />
            <SearchAutocomplete
              id="job-filter"
              options={visibleJobs}
              getOptionLabel={(option) => option.job_name}
              getOptionKey={(option) => option.job_id}
              value={visibleJobs.find((j) => j.job_id === job)}
              isOptionEqualToValue={(option, value) =>
                option.job_id === value.job_id
              }
              inputValue={jobSearchTextInput}
              onChange={(event, newValue) => handleChangeJob(event, newValue)}
              onInputChange={(event, newValue) => {
                setJobSearchTextInput(newValue);
              }}
              content={t('job')}
              ListboxProps={{
                onScroll: handleJobScroll,
              }}
            />

            <SearchTextField
              size="small"
              value={searchTerm}
              variant="outlined"
              onChange={(e) => setSearchTerm(e.target.value)}
              content={t('search')}
            />
          </>
        )}

      <SearchAutocomplete
        id="combo-box-enable"
        options={enableOptions}
        value={inputCombo.enable}
        inputValue={inputCombo.enableInput}
        onChange={(event, newValue) =>
          handleValueChange(event, newValue, 'enable')
        }
        onInputChange={(event, newValue) =>
          handleInputChange(event, newValue, 'enable')
        }
        content={t('enable')}
        capitalizeOptions={true}
      />
      <SearchAutocomplete
        id="combo-box-current-state"
        options={currentStateOptions}
        value={inputCombo.currentState}
        inputValue={inputCombo.currentStateInput}
        onChange={(event, newValue) =>
          handleValueChange(event, newValue, 'currentState')
        }
        onInputChange={(event, newValue) =>
          handleInputChange(event, newValue, 'currentState')
        }
        content={t('currentState')}
        capitalizeOptions={true}
      />
      <SearchAutocomplete
        id="combo-box-last-result"
        options={lastResultOptions}
        value={inputCombo.lastResult}
        inputValue={inputCombo.lastResultInput}
        onChange={(event, newValue) =>
          handleValueChange(event, newValue, 'lastResult')
        }
        onInputChange={(event, newValue) =>
          handleInputChange(event, newValue, 'lastResult')
        }
        content={t('lastResult')}
        capitalizeOptions={true}
      />
      <BaseDatePicker
        content={t('from')}
        value={inputCombo.from}
        onChange={(newValue) => handleValueChange('', newValue, 'from')}
      />
      <BaseDatePicker
        content={t('to')}
        value={inputCombo.to}
        onChange={(newValue) => handleValueChange('', newValue, 'to')}
      />

      <SearchAutocomplete
        id="combo-box-wf-registered"
        options={wfRegisteredOptions}
        value={inputCombo.wfRegistered}
        inputValue={inputCombo.wfRegisteredInput}
        onChange={(event, newValue) =>
          handleValueChange(event, newValue, 'wfRegistered')
        }
        onInputChange={(event, newValue) =>
          handleInputChange(event, newValue, 'wfRegistered')
        }
        content={t('wfRegistered')}
        capitalizeOptions={true}
      />
    </div>
  );
}

export default TableFilter;
