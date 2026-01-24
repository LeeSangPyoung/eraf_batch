import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataTransition } from '../../hook/useDataTransition';
import { colorIndicator, timestampFormat } from '../../utils/helper';
import { TableWrapper } from './TableWrapper';
import { CircularProgress } from '@mui/material';

export const styleTableCell = { whiteSpace: 'nowrap' };
export const styleHeaderTable = {
  whiteSpace: 'nowrap',
  fontWeight: 'normal',
  color: 'rgba(0,0,0,0.4)',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  lineHeight: '16px',
  letterSpacing: 'normal',
};
function WorkflowRunLogsTable({
  workflowRunLogsData,
  isLoading,
  isLoadingDefault,
  setIsLoadingDefault,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    setTimeout(() => {
      setIsLoadingDefault(false);
    }, 300);
  }, [isLoadingDefault]);

  const data = useDataTransition(
    workflowRunLogsData,
    !workflowRunLogsData,
    300,
  );

  return (
    <TableWrapper>
      <TableHead>
        <TableRow className="bg-white   top-[-1px]">
          <TableCell style={styleHeaderTable}>{t('job_name')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('status')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('priority')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('reqStartDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('actualStartDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('actualEndDate')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('errors')}</TableCell>
          <TableCell style={styleHeaderTable}>{t('output')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody className="transition">
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={12} style={{ textAlign: 'center' }}>
              <CircularProgress size={40} />
            </TableCell>
          </TableRow>
        ) : data && data.length > 0 ? (
          <>
            {data?.map((row) => (
              <TableRow className="hover:bg-grayLight" key={row.log_id}>
                <TableCell style={styleTableCell}>{row.job_name}</TableCell>
                <TableCell
                  sx={colorIndicator(row.status)}
                  style={styleTableCell}
                >
                  {row.status}
                </TableCell>
                <TableCell style={styleTableCell}>{row.priority}</TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.req_start_date)}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.actual_start_date)}
                </TableCell>
                <TableCell style={styleTableCell}>
                  {timestampFormat(row.actual_end_date)}
                </TableCell>
                <TableCell style={styleTableCell}>{row.errors}</TableCell>
                <TableCell
                  className="truncate w-[150px] max-w-[300px]"
                  style={styleTableCell}
                >
                  {row.output}
                </TableCell>
              </TableRow>
            ))}
          </>
        ) : (
          <TableRow>
            <TableCell colSpan={15}>No results found</TableCell>
          </TableRow>
        )}
      </TableBody>
    </TableWrapper>
  );
}

export default WorkflowRunLogsTable;
