import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box } from '@mui/material';
import React, { useEffect } from 'react';
import BaseButton from '../../components/CustomInput/BaseButton';
import DialogCreateAndModifyJob from '../../components/Dialog/DialogCreateAndModifyJob';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import JobStatusTable from '../../components/Table/JobStatusTable';
import TableFilter from '../../components/Table/TableFilter';
import useAuthStore from '../../hook/store/useAuthStore';
import useJobData from '../../hook/useJobData';
import useModal from '../../hook/useModal';
const JobStatus = () => {
  // const { t } = useLanguageContext();
  const { isVisible, openModal, closeModal } = useModal();
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
      <Box className="justify-end flex gap-5">
        <BaseButton
          onClick={handleFetchData}
          startIcon={<SearchIcon />}
          className="bg-white text-black font-medium rounded-lg"
          sx={{
            border: '1px solid #1C1C1C1A',
          }}
        >
          Search
        </BaseButton>
        <BaseButton
          className="bg-black text-white rounded-lg"
          disabled={user?.user_type !== 0}
          onClick={openModal}
          startIcon={<AddIcon />}
        >
          Create Job
        </BaseButton>
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
