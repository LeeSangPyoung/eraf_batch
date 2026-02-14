import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box, TablePagination } from '@mui/material';
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import BaseButton from '../../components/CustomInput/BaseButton';
import UserDialog from '../../components/Dialog/UserDialog';
import UsersFilter from '../../components/Table/UsersFilter';
import UsersTable from '../../components/Table/UsersTable';
import useModal from '../../hook/useModal';
import useUserData from '../../hook/user/useUserData';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
function Users() {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();

  const {
    total,
    users,
    group,
    userStatus,
    handleSelectStatus,
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
  } = useUserData();

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
    <div className="flex flex-col space-y-4">
      <UsersFilter
        group={group}
        handleChange={handleChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        userStatus={userStatus}
        handleSelectStatus={handleSelectStatus}
      />

      {isVisible && (
        <UserDialog
          open={isVisible}
          onClose={closeModal}
          data={undefined}
          mutate={handleFetchData}
        />
      )}
      <Box className="flex justify-end gap-5">
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
          startIcon={<AddIcon />}
          sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
          onClick={openModal}
        >
          {t('addUser')}
        </BaseButton>
      </Box>
      <UsersTable
        users={users}
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
    </div>
  );
}

export default Users;
