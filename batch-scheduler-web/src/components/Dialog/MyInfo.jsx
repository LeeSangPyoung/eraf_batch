import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  OutlinedInput,
  Select,
  Typography,
} from '@mui/material';
import React from 'react';
import SimpleBar from 'simplebar-react';
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
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle className="text-black font-bold pb-0 text-2xl">
        My Info
      </DialogTitle>
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
        <CloseIcon className="text-black" />
      </IconButton>
      <DialogContent>
        <SimpleBar
          style={{
            maxHeight: '60vh',
            paddingTop: 10,
            paddingBottom: 15,
          }}
        >
          <Box className="grid grid-cols-2 gap-6">
            {info && (
              <>
                {/* Left Column */}
                <Box className="space-y-4">
                  <Box>
                    <Typography className="text-grayDark text-sm mb-2">
                      User ID
                    </Typography>
                    <BaseTextField
                      disabled
                      value={info.user_id || ''}
                      fullWidth
                    />
                  </Box>

                  <Box>
                    <Typography className="text-grayDark text-sm mb-2">
                      User Type
                    </Typography>
                    <BaseTextField disabled value={userType?.label || ''} fullWidth />
                  </Box>

                  <Box>
                    <Typography className="text-grayDark text-sm mb-2">
                      Email
                    </Typography>
                    <BaseTextField disabled value={info.email_addr || ''} fullWidth />
                  </Box>
                </Box>

                {/* Right Column */}
                <Box className="space-y-4">
                  <Box>
                    <Typography className="text-grayDark text-sm mb-2">
                      User Status
                    </Typography>
                    <BaseTextField
                      disabled
                      value={info.user_status ? 'ENABLE' : 'DISABLE'}
                      fullWidth
                    />
                  </Box>

                  <Box>
                    <Typography className="text-grayDark text-sm mb-2">
                      Phone
                    </Typography>
                    <BaseTextField disabled value={info.celp_tlno || ''} fullWidth />
                  </Box>

                  {info.related_scheduler_group && info.related_scheduler_group.length > 0 && (
                    <Box>
                      <Typography className="text-grayDark text-sm mb-2">
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
                </Box>
              </>
            )}
          </Box>
        </SimpleBar>
      </DialogContent>
    </Dialog>
  );
};

export default MyInfo;
