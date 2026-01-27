import { Box, Pagination } from '@mui/material';

export const BasePagination = (props) => {
  const { count, page, rowsPerPage, onPageChange } = props;
  const handleChange = (event, value) => {
    onPageChange(event, value - 1);
  };
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        padding: '16px 0',
        marginTop: '8px',
      }}
    >
      <Pagination
        count={Math.ceil(count / rowsPerPage)}
        page={page + 1}
        onChange={handleChange}
        siblingCount={1}
        boundaryCount={1}
        sx={{
          '& .MuiPaginationItem-root': {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#1D1D1F',
            borderRadius: '8px',
            minWidth: '36px',
            height: '36px',
            margin: '0 2px',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#F5F5F7',
            },
          },
          '& .MuiPaginationItem-root.Mui-selected': {
            backgroundColor: '#0071E3',
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: '#0077ED',
            },
          },
          '& .MuiPaginationItem-previousNext': {
            color: '#86868B',
            '&:hover': {
              backgroundColor: '#F5F5F7',
              color: '#1D1D1F',
            },
          },
          '& .MuiPaginationItem-ellipsis': {
            color: '#86868B',
          },
        }}
      />
    </Box>
  );
};
