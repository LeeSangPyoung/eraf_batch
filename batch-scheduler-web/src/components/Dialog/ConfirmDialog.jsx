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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { widthClassName, hightClassName } = props;
  const handleClose = () => {
    callback();
    setCloseConfirm();
  };
  return (
    <Dialog
      open={openConfirm}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: '20px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16)',
          minWidth: '400px',
          maxWidth: '480px',
          overflow: 'hidden',
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      <DialogTitle
        id="alert-dialog-title"
        sx={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '24px 24px 16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={() => setCloseConfirm()}
        sx={{
          position: 'absolute',
          right: 16,
          top: 16,
          width: '32px',
          height: '32px',
          color: '#86868B',
          backgroundColor: '#F5F5F7',
          borderRadius: '50%',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#E8E8ED',
            color: '#1D1D1F',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '18px' }} />
      </IconButton>
      <DialogContent
        id="alert-dialog-description"
        className={`${widthClassName} ${hightClassName ? hightClassName : ''}`}
        sx={{
          padding: '0 24px 24px',
        }}
      >
        {showIcon && (
          <div className="w-1/3 pt-6 flex justify-center">{showIcon}</div>
        )}
        <Typography
          sx={{
            fontSize: '15px',
            color: '#86868B',
            lineHeight: 1.6,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          }}
        >
          {children}
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          padding: '16px 24px 24px',
          gap: '12px',
          justifyContent: 'flex-end',
        }}
      >
        <BaseButton onClick={() => setCloseConfirm()} theme="secondary" size="medium">
          {t('cancel')}
        </BaseButton>
        <BaseButton onClick={handleClose} theme="primary" size="medium">
          {t('ok')}
        </BaseButton>
      </DialogActions>
    </Dialog>
  );
};
