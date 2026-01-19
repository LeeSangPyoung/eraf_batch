import { Pagination } from '@mui/material';

export const BasePagination = (props) => {
  const { count, page, rowsPerPage, onPageChange } = props;
  const handleChange = (event, value) => {
    onPageChange(event, value - 1);
  };
  return (
    <div className="container text-black flex justify-center ml-3">
      <Pagination
        count={Math.ceil(count / rowsPerPage)}
        page={page + 1}
        onChange={handleChange}
        siblingCount={1}
        boundaryCount={1}
      />
    </div>
  );
};
