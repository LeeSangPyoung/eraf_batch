import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate, getUserTimeZone } from '../../utils/helper';

import CloseIcon from '@mui/icons-material/Close';
import BaseTextArea from '../CustomInput/BaseTextArea';
import { styleHeaderTable } from '../Table/JobResultTable';

function RepeatInterval({ open, onClose, repeatInterval, startDate }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    try {
      api
        .post('/job/repeatIntervalSample', {
          repeat_interval: repeatInterval,
          start_date: formatDate(startDate),
          timezone: getUserTimeZone(),
        })
        .then((res) => {
          const rows = [];
          for (let i = 0; i < res.data.data.length; i += 3) {
            rows.push(res.data.data.slice(i, i + 3));
          }
          setRows(rows);
        });
    } catch (error) {
      toast.error(error);
    }
  }, [repeatInterval, startDate]);

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="text-2xl font-bold">Repeat Interval</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon className="text-3xl text-black font-bold" />
      </IconButton>
      <DialogContent>
        <Box className="grid grid-cols-1 mt-4">
          <BaseTextArea
            disabled
            isRawInput
            value={repeatInterval}
            content="Repeat Interval"
            rows={3}
            className="col-span-2"
          />
          {rows.length > 0 && (
            <TableContainer className="mt-6 bg-white rounded-md border border-white">
              <Table
                sx={{
                  minWidth: 650,
                }}
              >
                <TableHead>
                  <TableRow className="bg-white  sticky top-[-1px]">
                    <TableCell style={styleHeaderTable} align="center">
                      Run Time
                    </TableCell>
                    <TableCell style={styleHeaderTable} align="center">
                      Run Time
                    </TableCell>
                    <TableCell style={styleHeaderTable} align="center">
                      Run Time
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index} className="hover:bg-grayLight">
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} align="center">
                          {cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default RepeatInterval;
