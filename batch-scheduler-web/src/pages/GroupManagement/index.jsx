import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box } from '@mui/material';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BaseButton from '../../components/CustomInput/BaseButton';
import CreateAndModifyGroup from '../../components/Dialog/CreateAndModifyGroup';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import GroupTable from '../../components/Table/GroupTable';
import useGroupData from '../../hook/useGroupData';
import useModal from '../../hook/useModal';

function GroupManagement() {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();

  const {
    total,
    groups,
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
  } = useGroupData();

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
    <div className="flex flex-col space-y-4">
      {/* Search Filter */}
      <Box className="flex gap-4 items-end">
        <Box className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchByGroupName')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Box>
      </Box>

      {isVisible && (
        <CreateAndModifyGroup
          open={isVisible}
          onClose={closeModal}
          data={undefined}
          jobForm={{ setValue: () => {}, clearErrors: () => {} }}
          setVisibleGroups={() => {}}
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
          {t('addGroup')}
        </BaseButton>
      </Box>

      <GroupTable
        groups={groups}
        isLoading={isLoading}
        mutate={handleFetchData}
        isLoadingDefault={isLoadingDefault}
        setIsLoadingDefault={setIsLoadingDefault}
      />

      {total && total > 0 ? (
        <Box className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full">
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

export default GroupManagement;
