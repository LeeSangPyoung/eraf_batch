import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import React from 'react';
import SimpleBar from 'simplebar-react';

export const TableWrapper = ({
  minWidth = '650px',
  children,
  minusHeight = '252px',
}) => {
  return (
    <TableContainer
      sx={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E8E8ED',
        overflow: 'hidden',
      }}
    >
      <SimpleBar
        style={{
          maxWidth: 'calc(100vw - 240px)',
          maxHeight: `calc(100vh - ${minusHeight})`,
        }}
      >
        <Table
          stickyHeader
          sx={{
            minWidth: { minWidth },
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            // Header cells
            '& .MuiTableHead-root .MuiTableCell-root': {
              backgroundColor: '#F5F5F7',
              color: '#1D1D1F',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              padding: '14px 16px',
              borderBottom: '1px solid #E8E8ED',
              whiteSpace: 'nowrap',
            },
            // Body cells
            '& .MuiTableBody-root .MuiTableCell-root': {
              color: '#1D1D1F',
              fontSize: '14px',
              fontWeight: 400,
              padding: '14px 16px',
              borderBottom: '1px solid #F5F5F7',
              transition: 'background-color 0.15s ease',
            },
            // Row hover
            '& .MuiTableBody-root .MuiTableRow-root:hover': {
              backgroundColor: 'rgba(0, 113, 227, 0.04)',
            },
            // Row hover cells
            '& .MuiTableBody-root .MuiTableRow-root:hover .MuiTableCell-root': {
              backgroundColor: 'transparent',
            },
            // Selected row
            '& .MuiTableBody-root .MuiTableRow-root.Mui-selected': {
              backgroundColor: 'rgba(0, 113, 227, 0.08)',
            },
            '& .MuiTableBody-root .MuiTableRow-root.Mui-selected:hover': {
              backgroundColor: 'rgba(0, 113, 227, 0.12)',
            },
            // Last row no border
            '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
              borderBottom: 'none',
            },
          }}
        >
          {children}
        </Table>
      </SimpleBar>
    </TableContainer>
  );
};
