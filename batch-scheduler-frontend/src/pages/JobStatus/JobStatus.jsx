import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import { Box } from '@mui/material';
import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import BaseButton from '../../components/CustomInput/BaseButton';
import DialogCreateAndModifyJob from '../../components/Dialog/DialogCreateAndModifyJob';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import JobStatusTable from '../../components/Table/JobStatusTable';
import TableFilter from '../../components/Table/TableFilter';
import useAuthStore from '../../hook/store/useAuthStore';
import useJobData from '../../hook/useJobData';
import useModal from '../../hook/useModal';
import api from '../../services/api';
const JobStatus = () => {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const {
    total,
    jobsData,
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
    handleFetchData,
    state,
    handleValueChange,
    handleInputChange,
  } = useJobData();

  const user = useAuthStore((state) => state.user);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleFetchData();
    }
  }, [handleFetchData]);

  const handleBulkUpdateStatus = async (isEnabled) => {
    if (selectedJobIds.length === 0) return;
    try {
      const res = await api.post('/job/bulkUpdateJobStatus', {
        job_ids: selectedJobIds,
        is_enabled: isEnabled,
      });
      toast.success(res.data?.data || `Updated ${selectedJobIds.length} jobs`);
      setSelectedJobIds([]);
      handleFetchData();
    } catch (error) {
      toast.error('Failed to update jobs');
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  return (
    <Box className="flex flex-col space-y-4">
      <TableFilter
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
      <Box className="justify-between flex items-center">
        <Box className="flex gap-2 items-center">
          {selectedJobIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">
                {selectedJobIds.length} {t('selected') || 'selected'}
              </span>
              <BaseButton
                theme="ghost"
                size="small"
                onClick={() => handleBulkUpdateStatus(true)}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ color: '#34C759' }}
              >
                {t('enable') || 'Enable'}
              </BaseButton>
              <BaseButton
                theme="ghost"
                size="small"
                onClick={() => handleBulkUpdateStatus(false)}
                startIcon={<BlockIcon />}
                sx={{ color: '#FF3B30' }}
              >
                {t('disable') || 'Disable'}
              </BaseButton>
            </>
          )}
        </Box>
        <Box className="flex gap-5">
          <BaseButton
            onClick={handleFetchData}
            startIcon={<SearchIcon />}
            className="bg-white text-black font-medium rounded-lg"
            sx={{
              border: '1px solid #1C1C1C1A',
            }}
          >
            {t('search')}
          </BaseButton>
          <BaseButton
            className="bg-black text-white rounded-lg"
            disabled={user?.user_type !== 0}
            onClick={openModal}
            startIcon={<AddIcon />}
          >
            {t('createJob')}
          </BaseButton>
        </Box>
      </Box>

      <DialogCreateAndModifyJob
        open={isVisible}
        onClose={closeModal}
        data={undefined}
        mutate={handleFetchData}
      />
      <JobStatusTable
        jobsData={jobsData}
        isLoading={isLoading}
        mutate={handleFetchData}
        isLoadingDefault={isLoadingDefault}
        setIsLoadingDefault={setIsLoadingDefault}
        selectedJobIds={selectedJobIds}
        onSelectionChange={user?.user_type === 0 ? setSelectedJobIds : undefined}
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

export default JobStatus;
