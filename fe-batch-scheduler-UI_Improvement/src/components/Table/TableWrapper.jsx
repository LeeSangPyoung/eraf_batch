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
    <TableContainer className="bg-white ">
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
            '& .MuiTableCell-root': {
              borderLeft: '1px solid white',
              borderBottom: '1px solid  rgba(0,0,0,0.06)',
            },
            '& .MuiTableHead-root .MuiTableRow-root:first-of-type .MuiTableCell-root':
              {
                borderBottom: '2px solid  #1C1C1C0D',
              },
            '& .MuiTableCell-root:first-of-type': {
              borderLeft: 'none',
            },
          }}
        >
          {children}
        </Table>
      </SimpleBar>
    </TableContainer>
  );
};
