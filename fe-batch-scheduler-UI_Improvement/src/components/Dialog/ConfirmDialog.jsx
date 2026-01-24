import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import React from 'react';
import BaseButton from '../CustomInput/BaseButton';

export const ConfirmDialog = ({
  openConfirm,
  setCloseConfirm,
  showIcon = undefined,
  title,
  callback,
  children,
  ...props
}) => {
  const { widthClassName, hightClassName } = props;
  const handleClose = () => {
    callback();
    setCloseConfirm();
  };
  return (
    <div>
      <Dialog
        open={openConfirm}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" className=" text-xl font-bold">
          {title}
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={() => setCloseConfirm()}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent
          id="alert-dialog-description"
          className={`${widthClassName} ${
            hightClassName ? hightClassName : ''
          } `}
        >
          {showIcon && (
            <div className="w-1/3 pt-6 flex justify-center">{showIcon}</div>
          )}

          <div className="w-full pr-4">
            <Typography className="font-extralight">{children}</Typography>
          </div>
        </DialogContent>
        <DialogActions>
          <BaseButton onClick={() => setCloseConfirm()} theme="light">
            Cancel
          </BaseButton>
          <BaseButton onClick={handleClose} className=" px-6" theme="dark">
            OK
          </BaseButton>
        </DialogActions>
      </Dialog>
    </div>
  );
};
