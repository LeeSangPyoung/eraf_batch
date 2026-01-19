import { Box, Button, Dialog, DialogContent, DialogTitle } from '@mui/material';
import React from 'react';
import SimpleBar from 'simplebar-react';
import useAuthStore from '../../hook/store/useAuthStore';
import useUserStore from '../../hook/store/useUserStore';
import useGroupForm from '../../hook/useGroupForm';
import { cn, stopPropagate } from '../../utils/helper';
import Selected from '../CustomInput/Select';
import TextInput from '../CustomInput/TextInput';
import BaseTextArea from '../CustomInput/BaseTextArea';
import BaseButton from '../CustomInput/BaseButton';

const CreateAndModifyGroup = ({
  open,
  onClose,
  data,
  jobForm,
  setVisibleGroups,
}) => {
  const user = useAuthStore((state) => state.user);
  const { handleSubmit, control, onSubmit, reset } = useGroupForm(
    data,
    onClose,
    jobForm,
    setVisibleGroups,
  );
  const users = useUserStore((state) => state.users);

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle className="font-bold">
        {data ? 'Update Group' : 'Create Group'}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={stopPropagate(handleSubmit(onSubmit))}>
          <SimpleBar
            style={{
              maxHeight: '60vh',
              paddingTop: 10,
              paddingBottom: 15,
            }}
          >
            <Box className="flex flex-col gap-4">
              <TextInput
                control={control}
                name="group_name"
                content="Group Name"
                required
              />
              <BaseTextArea
                control={control}
                name="group_comments"
                content="Comments"
              />
              {/* {data && data.jobs.length > 0 && (
                <TableContainer className="my-3 bg-dark rounded-md border col-span-2">
                  <Table
                    sx={{
                      minWidth: 650,
                      '& .MuiTableCell-root': {
                        border: '1px solid white',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow className="bg-primary">
                        <TableCell align="center">Job Name</TableCell>
                        <TableCell align="center">Server Name</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.jobs.map((job) => (
                        <TableRow key={job.name} className="hover:bg-secondary">
                          <TableCell align="center">{job.name}</TableCell>
                          <TableCell align="center">
                            {job.server_name}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )} */}
              {users && users.length > 0 && (
                <>
                  <Selected
                    control={control}
                    name="frst_reg_user_id"
                    options={users}
                    content="Creator"
                    valueKey="id"
                    labelKey="user_name"
                    className={cn(!data && 'col-span-2')}
                    required
                  />
                  {data && (
                    <Selected
                      control={control}
                      name="last_reg_user_id"
                      options={users}
                      content="Modifier"
                      valueKey="id"
                      labelKey="user_name"
                      required
                    />
                  )}
                </>
              )}
            </Box>
          </SimpleBar>
          <Box className="flex col-span-2 justify-end ml-auto space-x-2 p-2">
            <BaseButton
              onClick={handleCancel}
              className="text-black "
              sx={{
                backgroundColor: 'white',
                color: 'black',
                fontWeight: '600',
                border: '2px solid #1C1C1C0D',
                boxShadow: 'none',
              }}
            >
              Cancel
            </BaseButton>
            <BaseButton type="submit" className="bg-black text-white">
              Save
            </BaseButton>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAndModifyGroup;
