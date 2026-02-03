import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useGroupsStore from '../../hook/store/useGroupStore';
import useWorkflowStore from '../../hook/store/useWorkflowStore';
import useFilterData from '../../hook/useFilterData';
import { workflowRunStatusOptions } from '../../utils/enum';
import BaseDatePicker from '../CustomInput/BaseDatePicker';
import SearchTextField from '../CustomInput/SearchTextField';
import SearchAutocomplete from '../CustomInput/SearchAutocomplete';

function TableWorkflowRunFilter({
  workflow,
  group,
  handleChange,
  searchTerm,
  setSearchTerm,
  inputCombo,
  handleValueChange,
  handleInputChange,
}) {
  const { t } = useTranslation();
  const workflowFilter = useWorkflowStore((state) => state.workflows);
  const groupFilter = useGroupsStore((state) => state.groups);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const {
    totalGroups,
    setGroupOffset,
    groupSearchTextInput,
    setGroupSearchTextInput,
    totalWorkflows,
    setWorkflowOffset,
    workflowSearchTextInput,
    setWorkflowSearchTextInput,
  } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);
  const [visibleWorkflows, setVisibleWorkflows] = useState([]);

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
    setVisibleWorkflows((prev) => {
      const existingWorkflowIds = new Set(prev.map((workflow) => workflow.id));
      const newWorkflows = workflowFilter.filter(
        (workflow) => !existingWorkflowIds.has(workflow.id),
      );
      return [...prev, ...newWorkflows];
    });
  }, [workflowFilter]);

  const handleWorkflowScroll = (e) => {
    if (
      totalWorkflows > visibleWorkflows.length &&
      e.target.scrollHeight - e.target.scrollTop < 1000
    ) {
      setWorkflowOffset((prev) => prev + 1);
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
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {visibleWorkflows && visibleGroups && workflow && group && (
        <>
          <SearchAutocomplete
            id="workflow-filter"
            options={visibleWorkflows}
            getOptionLabel={(option) => option.name}
            getOptionKey={(option) => option.id}
            value={visibleWorkflows.find((w) => w.id === workflow) || null}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            inputValue={workflowSearchTextInput}
            onChange={(event, newValue) => {  
               handleChange(
                { target: { value: newValue ? newValue.id : 'all' } },
                'workflow',
              )
            }}
            onInputChange={(event, newValue) => {
              setWorkflowSearchTextInput(newValue);
            }}
            content={t('workflow-label')}
            ListboxProps={{
              onScroll: handleWorkflowScroll,
            }}
          />
          <SearchAutocomplete
            id="group-filter"
            options={visibleGroups}
            getOptionLabel={(option) => option.name}
            getOptionKey={(option) => option.id}
            value={visibleGroups.find((g) => g.id === group) || null}
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
          <SearchTextField
            value={searchTerm}
            content={t('search')}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </>
      )}

      <SearchAutocomplete
        id="combo-box-status"
        options={workflowRunStatusOptions}
        value={inputCombo.status}
        inputValue={inputCombo.statusInput}
        onChange={(event, newValue) =>
          handleValueChange(event, newValue, 'status')
        }
        onInputChange={(event, newValue) =>
          handleInputChange(event, newValue, 'status')
        }
        content={t('status')}
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
    </div>
  );
}

export default TableWorkflowRunFilter;
