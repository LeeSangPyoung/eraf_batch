import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { Box } from '@mui/material';
import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import BaseButton from '../../components/CustomInput/BaseButton';
import SearchTextField from '../../components/CustomInput/SearchTextField';
import BatchJobServerDialog from '../../components/Dialog/BatchJobServerDialog';
import CustomTablePagination from '../../components/Table/CustomTablePagination';
import SystemTable from '../../components/Table/SystemTable';
import useModal from '../../hook/useModal';
import useSystemData from '../../hook/useSystemData';

function SystemManagement() {
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();

  const {
    total,
    systems,
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
    mutate,
  } = useSystemData();

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
      {/* Search Filter */}
      <Box className="grid grid-cols-5 gap-3">
        <SearchTextField
          size="small"
          value={searchTerm}
          variant="outlined"
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchBySystemName')}
          content={t('search')}
        />
      </Box>

      {isVisible && (
        <BatchJobServerDialog
          open={isVisible}
          onClose={closeModal}
          data={undefined}
          mutateSystem={mutate}
          jobForm={{ setValue: () => {}, clearErrors: () => {} }}
        />
      )}

      <Box className="flex justify-end gap-3">
        <BaseButton
          onClick={handleFetchData}
          startIcon={<SearchIcon />}
          className="bg-white text-black font-medium"
          sx={{
            border: '1px solid #D2D2D7',
            borderRadius: '10px',
            height: '40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            '&:hover': {
              borderColor: '#86868B',
              backgroundColor: '#F5F5F7',
            },
          }}
        >
          {t('search')}
        </BaseButton>
        <BaseButton
          className="bg-black text-white"
          startIcon={<AddIcon />}
          onClick={openModal}
          sx={{
            borderRadius: '10px',
            height: '40px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            minWidth: 'max-content',
            '&:hover': {
              backgroundColor: '#1C1C1E',
            },
          }}
        >
          {t('addSystem')}
        </BaseButton>
      </Box>

      <SystemTable
        systems={systems}
        isLoading={isLoading}
        mutate={mutate}
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

export default SystemManagement;
