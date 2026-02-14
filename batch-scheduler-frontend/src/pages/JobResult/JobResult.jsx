import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Box, Button } from '@mui/material';
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import JobResultTable from '../../components/Table/JobResultTable';
import TableResultFilter from '../../components/Table/TableResultFilter';
import useJobResult from '../../hook/useJobResult';
import BaseButton from '../../components/CustomInput/BaseButton';
import { exportToCSV } from '../../utils/csvExport';

const JobResult = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const jobId = searchParams.get('job');

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
  } = useJobResult({ jobId, initialStatus });

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleFetchData();
    }
  }, [handleFetchData]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
      <div className="justify-end flex gap-2">
        <BaseButton
          onClick={() => {
            const csvColumns = [
              { key: 'log_id', label: t('logId') },
              { key: 'log_date', label: t('logDate') },
              { key: 'system_name', label: t('system_id') },
              { key: 'group_name', label: t('group_name') },
              { key: 'job_name', label: t('job_name') },
              { key: 'batch_type', label: t('batchType') },
              { key: 'operation', label: t('operation') },
              { key: 'status', label: t('status') },
              { key: 'retry_count', label: t('retryCount') },
              { key: 'user_name', label: t('user') },
              { key: 'error_no', label: t('errorNo') },
              { key: 'req_start_date', label: t('reqStartDate') },
              { key: 'actual_start_date', label: t('actualStartDate') },
              { key: 'actual_end_date', label: t('actualEndDate') },
              { key: 'run_duration', label: t('runDuration') },
              { key: 'additional_info', label: t('additionalInfo') },
              { key: 'errors', label: t('errors') },
              { key: 'output', label: t('output') },
            ];
            exportToCSV(jobResultData, csvColumns, 'job_results');
          }}
          theme="ghost"
          startIcon={<FileDownloadIcon />}
          disabled={!jobResultData || jobResultData.length === 0}
        >
          CSV
        </BaseButton>
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
