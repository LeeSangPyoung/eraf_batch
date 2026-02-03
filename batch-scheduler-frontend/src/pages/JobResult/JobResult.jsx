import SearchIcon from '@mui/icons-material/Search';
import { Box, Button } from '@mui/material';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import JobResultTable from '../../components/Table/JobResultTable';
import TableResultFilter from '../../components/Table/TableResultFilter';
import useJobResult from '../../hook/useJobResult';
import BaseButton from '../../components/CustomInput/BaseButton';

const JobResult = () => {
  const { t } = useTranslation();
  const {
    total,
    jobResultData,
    job,
    server,
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
  } = useJobResult();

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
    <Box className="flex flex-col space-y-2">
      <div className="flex justify-between w-full">
        <TableResultFilter
          job={job}
          group={group}
          server={server}
          handleChange={handleChange}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          inputCombo={state}
          handleValueChange={handleValueChange}
          handleInputChange={handleInputChange}
        />
      </div>
      <div className="justify-end flex ">
        <BaseButton
          onClick={handleFetchData}
          theme="light"
          startIcon={<SearchIcon />}
        >
          {t('search')}
        </BaseButton>
      </div>
      <JobResultTable
        jobResultData={jobResultData}
        isLoading={isLoading}
        isLoadingDefault={isLoadingDefault}
        setIsLoadingDefault={setIsLoadingDefault}
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

export default JobResult;
