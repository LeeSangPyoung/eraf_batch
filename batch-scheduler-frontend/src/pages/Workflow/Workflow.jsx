import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button } from '@mui/material';
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  WF_MODE,
  WorkflowDetail,
} from '../../components/Dialog/WorkflowDetailDialog';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import WorkflowFilter from '../../components/Table/WorkflowFilter';
import WorkflowTable from '../../components/Table/WorkflowTable';
import useModal from '../../hook/useModal';
import { useWorkflow } from '../../hook/useWorkflow';
import { useState } from 'react';
import useAuthStore from '../../hook/store/useAuthStore';
import useJobStore from '../../hook/store/useJobStore';
import useGroupsStore from '../../hook/store/useGroupStore';
import useFilterData from '../../hook/useFilterData';
import BaseButton from '../../components/CustomInput/BaseButton';
import { AddOutlined } from '@mui/icons-material';

const Workflow = () => {
  const { t } = useTranslation();
  const {
    total,
    mutate,
    workflowData,
    isLoading,
    isLoadingDefault,
    setIsLoadingDefault,
    handleFetchData,
    group,
    statusState,
    handleChange,
    searchTerm,
    setSearchTerm,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    handleValueChange,
    handleInputChange,
  } = useWorkflow();
  const user = useAuthStore((state) => state.user);
  const { isVisible, openModal, closeModal } = useModal();
  const setJobs = useJobStore((state) => state.setJobs);
  const setGroup = useGroupsStore((state) => state.setGroup);
  const { setIsWorkflow } = useFilterData();

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleFetchData();
    }
  }, [handleFetchData]);

  const [mode, setMode] = useState(WF_MODE.CREATE);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Box className="flex flex-col space-y-5">
      <div className="flex justify-between items-center w-full">
        <WorkflowFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          group={group}
          inputCombo={statusState}
          handleChange={handleChange}
          handleValueChange={handleValueChange}
          handleInputChange={handleInputChange}
        />
      </div>
      <div className="flex justify-end">
        <BaseButton
          theme="light"
          onClick={handleFetchData}
          startIcon={<SearchIcon />}
        >
          {t('search')}
        </BaseButton>
        {user?.user_type === 0 && (
          <BaseButton
            onClick={() => {
              setMode(WF_MODE.CREATE);
              setJobs([]);
              setGroup(undefined);
              setIsWorkflow(true);
              openModal();
            }}
            startIcon={<AddOutlined />}
            theme="dark"
            sx={{
              whiteSpace: 'nowrap',
              minWidth: 'max-content',
              marginLeft: '10px',
            }}
          >
            {t('createWorkflow')}
          </BaseButton>
        )}

        <WorkflowDetail
          mode={mode}
          setMode={setMode}
          open={isVisible}
          onClose={closeModal}
          data={undefined}
          mutate={mutate}
        />
      </div>
      <WorkflowTable
        workflowData={workflowData}
        isLoading={isLoading}
        isLoadingDefault={isLoadingDefault}
        setIsLoadingDefault={setIsLoadingDefault}
        mutate={mutate}
        mode={mode}
        setMode={setMode}
      />
      {total && total > 0 ? (
        <Box className="fixed bottom-4 left-1/2 transform -translate-x-1/2  w-full">
          <CustomTablePagination
            count={total}
            page={pageNumber - 1}
            rowsPerPage={pageSize}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default Workflow;
