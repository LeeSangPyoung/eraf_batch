import { Pagination, TablePagination } from '@mui/material';
import React from 'react';

const CustomPaginationAction = (props) => {
  const { count, page, rowsPerPage, onPageChange, customclassname } = props;
  const handleChange = (event, value) => {
    onPageChange(event, value - 1);
  };
  return (
    <div
      className={`container text-black flex justify-start ml-3 ${customclassname}`}
    >
      <Pagination
        count={Math.ceil(count / rowsPerPage)}
        page={page + 1}
        onChange={handleChange}
        siblingCount={1}
        boundaryCount={1}
        showFirstButton
        showLastButton
      />
    </div>
  );
};

const CustomTablePagination = (props) => {
  return (
    <TablePagination
      {...props}
      rowsPerPageOptions={[10, 20, 30, 50]}
      colSpan={3}
      component="div"
      showFirstButton={true}
      showLastButton={true}
      ActionsComponent={(subProps) => (
        <CustomPaginationAction
          {...subProps}
          customclassname={props.customclassname}
        />
      )}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        '& .MuiTablePagination-spacer': {
          display: 'none',
        },
        '& .MuiToolbar-root': {
          width: 'fit-content',
        },
      }}
    />
  );
};

export default CustomTablePagination;
