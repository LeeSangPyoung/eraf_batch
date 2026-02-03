import SearchIcon from '@mui/icons-material/Search';
import { Box, Button } from '@mui/material';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import WorkflowRunTable from '../../components/Table/WorkflowRunTable';
import TableWorkflowRunFilter from '../../components/Table/TableWorkflowRunFilter';
import useWorkflowRun from '../../hook/useWorkflowRun';
import BaseButton from '../../components/CustomInput/BaseButton';

const WorkflowRun = () => {
  const { t } = useTranslation();
  const {
    total,
    workflowRunData,
    workflow,
    group,
    handleChange,
    searchTerm,
    setSearchTerm,
    isLoading,
    isLoadingDefault,
    setIsLoadingDefault,
    pageSize,
    pageNumber,
    handleChangePage,
    handleChangeRowsPerPage,
    state,
    handleValueChange,
    handleInputChange,
    handleFetchData,
  } = useWorkflowRun();

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleFetchData();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Box className="flex flex-col space-y-4">
      <TableWorkflowRunFilter
        workflow={workflow}
        group={group}
        handleChange={handleChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        inputCombo={state}
        handleValueChange={handleValueChange}
        handleInputChange={handleInputChange}
      />
      <Box className="flex justify-end">
        <BaseButton
          className="bg-white text-black font-medium rounded-lg"
          sx={{
            border: '1px solid #1C1C1C1A',
          }}
          onClick={handleFetchData}
          startIcon={<SearchIcon />}
        >
          {t('search')}
        </BaseButton>
      </Box>

      <WorkflowRunTable
        workflowRunData={workflowRunData}
        isLoading={isLoading}
        isLoadingDefault={isLoadingDefault}
        setIsLoadingDefault={setIsLoadingDefault}
        search={searchTerm}
      />
      {total && total > 0 ? (
        <Box className="fixed bottom-4 left-1/2 transform -translate-x-1/2  w-full">
          <CustomTablePagination
            component="div"
            count={total}
            page={pageNumber - 1}
            onPageChange={handleChangePage}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default WorkflowRun;
