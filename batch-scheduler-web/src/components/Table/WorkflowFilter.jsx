import { Autocomplete, MenuItem, Select, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useGroupsStore from '../../hook/store/useGroupStore';
import { workflowStatusOptions } from '../../utils/enum';
import useFilterData from '../../hook/useFilterData';
import SearchTextField from '../CustomInput/SearchTextField';
import SearchAutocomplete from '../CustomInput/SearchAutocomplete';

const WorkflowFilter = ({
  className = '',
  group,
  inputCombo,
  searchTerm,
  setSearchTerm,
  handleChange,
  handleValueChange,
  handleInputChange,
}) => {
  const { t } = useTranslation();
  const groupFilter = useGroupsStore((state) => state.groups);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const { totalGroups, setGroupOffset, groupSearchTextInput, setGroupSearchTextInput } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);

  useEffect(() => {
    setVisibleGroups((prev) => {
      const existingGroupIds = new Set(prev.map(group => group.id));
      const newGroups = groupFilter.filter(group => !existingGroupIds.has(group.id));
      return [...prev, ...newGroups];
    });
  }, [groupFilter]);

  const handleGroupScroll = (e) => {
    if(totalGroups > visibleGroups.length && e.target.scrollHeight - e.target.scrollTop < 1000) {
      setGroupOffset(prev => prev + 1)
    }
  }

  const handleChangeGroup = (event, newValue) => {
    const e = { target: { value: newValue ? newValue.id : 'all' } };
    handleChange(e, 'group')
    if (e.target.value === 'all') {
      setGroup(null);
    } else {
      setGroup(e.target.value);
    }
  };

  return (
    <div className={`${className} grid lg:grid-cols-3 md:grid-cols-3 gap-3 w-full`}>
      <>
        <SearchTextField
          value={searchTerm}
          content={t('search')}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <SearchAutocomplete
          id="group-filter"
          options={visibleGroups}
          getOptionLabel={(option) => option.name}
          getOptionKey={(option) => option.id}
          value={visibleGroups.find((g) => g.id === group)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          inputValue={groupSearchTextInput}
          onChange={(event, newValue) =>
            handleChangeGroup(event, newValue)
          }
          onInputChange={(event, newValue) => {
            setGroupSearchTextInput(newValue);
          }}
          content={t('group')}
          ListboxProps={{
            onScroll: handleGroupScroll
          }}
        />
        <SearchAutocomplete
          id="combo-box-current-state"
          options={workflowStatusOptions}
          value={inputCombo.latestStatus}
          inputValue={inputCombo.latestStatusInput}
          onChange={(event, newValue) =>
            handleValueChange(event, newValue, 'latestStatus')
          }
          onInputChange={(event, newValue) =>
            handleInputChange(event, newValue, 'latestStatus')
          }
          content={t('latestStatus')}
        />
      </>
    </div>
  );
};

export default WorkflowFilter;
