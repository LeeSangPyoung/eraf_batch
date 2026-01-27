import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import useMyInfo from '../../hook/useMyInfo';
import { UserType } from '../../utils/enum';
import useGroupsStore from '../../hook/store/useGroupStore';
import BaseTextField from '../CustomInput/BaseTextField';

const MyInfo = ({ open, onClose }) => {
  const { info } = useMyInfo();
  const userType = UserType.find((type) => type.value === info?.user_type);
  const groups = useGroupsStore((state) => state.groups);

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16)',
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
        sx={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '16px 20px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        My Info
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          width: '32px',
          height: '32px',
          color: '#86868B',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: '#F5F5F7',
            color: '#1D1D1F',
          },
        }}
      >
        <CloseIcon sx={{ fontSize: '20px' }} />
      </IconButton>
      <DialogContent sx={{ padding: '16px 20px' }}>
        <Box className="grid grid-cols-2 gap-2">
          {info && (
            <>
              <Box>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  User ID
                </Typography>
                <BaseTextField
                  disabled
                  value={info.user_id || ''}
                  fullWidth
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  User Status
                </Typography>
                <BaseTextField
                  disabled
                  value={info.user_status ? 'ENABLE' : 'DISABLE'}
                  fullWidth
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  User Type
                </Typography>
                <BaseTextField disabled value={userType?.label || ''} fullWidth />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  Phone
                </Typography>
                <BaseTextField disabled value={info.celp_tlno || ''} fullWidth />
              </Box>

              <Box className="col-span-2">
                <Typography
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#1D1D1F',
                    marginBottom: '4px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                  }}
                >
                  Email
                </Typography>
                <BaseTextField disabled value={info.email_addr || ''} fullWidth />
              </Box>

              {info.related_scheduler_group && info.related_scheduler_group.length > 0 && (
                <Box className="col-span-2">
                  <Typography
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#1D1D1F',
                      marginBottom: '4px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
                    }}
                  >
                    Groups
                  </Typography>
                  <BaseTextField
                    disabled
                    fullWidth
                    value={groups
                      ?.filter((gr) => info.related_scheduler_group.includes(gr.id))
                      .map((item) => item.name)
                      .join(', ') || ''
                    }
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default MyInfo;
