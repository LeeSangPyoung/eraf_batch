import { Box } from '@mui/material';
import React, { useEffect, useState } from 'react';
import useGroupsStore from '../../hook/store/useGroupStore';
import useFilterData from '../../hook/useFilterData';
import SearchTextField from '../CustomInput/SearchTextField';
import SearchAutocomplete from '../CustomInput/SearchAutocomplete';
import SearchSelect from '../CustomInput/SearchSelect';
function UsersFilter({
  group,
  handleChange,
  searchTerm,
  setSearchTerm,
  userStatus,
  handleSelectStatus,
}) {
  const groupFilter = useGroupsStore((state) => state.groups);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const {
    totalGroups,
    setGroupOffset,
    groupSearchTextInput,
    setGroupSearchTextInput,
  } = useFilterData();
  const [visibleGroups, setVisibleGroups] = useState([]);

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

  const handleChangeGroup = (event, newValue) => {
    const e = { target: { value: newValue ? newValue.id : 'all' } };
    handleChange(e, 'group');
    if (e.target.value === 'all') {
      setGroup(null);
    } else {
      setGroup(e.target.value);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All status' },
    { value: 'true', label: 'Enable' },
    { value: 'false', label: 'Disable' }
  ];

  return (
    <Box className="flex gap-4 w-full">
      <Box className="flex-1">
        <SearchSelect
          id="status-filter"
          options={statusOptions}
          value={userStatus}
          onChange={handleSelectStatus}
          content="Status"
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
        />
      </Box>

      <Box className="flex-1">
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
          content="Group"
          ListboxProps={{
            onScroll: handleGroupScroll,
          }}
        />
      </Box>

      <Box className="flex-1">
        <SearchTextField
          size="small"
          value={searchTerm}
          placeholder="Search"
          onChange={(e) => setSearchTerm(e.target.value)}
          content={'Search'}
        />
      </Box>
    </Box>
  );
}

export default UsersFilter;
