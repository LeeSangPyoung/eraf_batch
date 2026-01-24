import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Tab,
  Tabs,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import CachedIcon from '@mui/icons-material/Cached';
import { toast } from 'react-toastify';
import SimpleBar from 'simplebar-react';
import useLogSocketIO from '../../hook/socket/useLogsSocket';
import useAuthStore from '../../hook/store/useAuthStore';
import useFilterData from '../../hook/useFilterData';
import useJobDetailData from '../../hook/useJobDetailData';
import useJobResult from '../../hook/useJobResult.jsx';
import useModal from '../../hook/useModal';
import api from '../../services/api';
import { timestampFormat } from '../../utils/helper';
import BaseButton from '../CustomInput/BaseButton';
import { BasePagination } from '../CustomInput/BasePagination';
import BaseTextField from '../CustomInput/BaseTextField';
import JobResultTable from '../Table/JobResultTable.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import DialogCreateAndModifyJob from './DialogCreateAndModifyJob';
import RepeatInterval from './RepeatInterval';
import BaseTextArea from '../CustomInput/BaseTextArea';

const JobDetailTab = (props) => {
  const user = useAuthStore((state) => state.user);
  const data = props.data;
  const onClose = props.onClose;
  const mutate = props.mutate;
  const { t } = useTranslation();
  const { isVisible, openModal, closeModal } = useModal();
  const {
    isVisible: isOpenDialogModify,
    openModal: handleClickOpenModifyDialog,
    closeModal: handleCloseModifyDialog,
  } = useModal();
  const [loading, setLoading] = useState({ loading: false, button: '' });
  const [disable, setDisable] = useState(false);
  const {
    isVisible: isDeleteConfirm,
    openModal: openDeleteConfirmModal,
    closeModal: closeDeleteConfirmModal,
  } = useModal();
  const { jobFilterMutation } = useFilterData();

  const isDeleted = data.current_state === 'DELETED';
  const isRunning = data.current_state === 'RUNNING';
  const isWaiting = data.current_state === 'WAITING';

  const handleDelete = async () => {
    setLoading({ loading: true, button: 'delete' });
    setDisable(true);
    try {
      const response = await api.delete('/job/delete', {
        data: {
          job_id: data.job_id,
          user_id: user?.id,
        },
      });
      if (response.data.success) {
        toast.success('Job delete successfully');
        mutate();
        jobFilterMutation();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when deleting job');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleManualRun = async () => {
    setLoading({ loading: true, button: 'execution' });
    setDisable(true);
    try {
      const response = await api.post('/job/manuallyRun', {
        job_id: data.job_id,
        user_id: user?.id,
      });
      if (response.data.success) {
        toast.success('Job manually run successfully');
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when running job manually');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleForceStop = async () => {
    setLoading({ loading: true, button: 'stop' });
    setDisable(true);
    try {
      const response = await api.post('/job/forceStop', {
        job_id: data.job_id,
      });
      if (response.data.success) {
        toast.success('Job stopped successfully');
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when force stop job manually');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading({ loading: true, button: 'disable' });
    setDisable(true);
    try {
      const response = await api.post('/job/updateJobStatus', {
        job_id: data.job_id,
        is_enabled: false,
        last_reg_user_id: user?.id,
      });
      if (response.data.success) {
        toast.success('Job deactivated successfully');
        setLoading({ loading: false, button: '' });
        mutate();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when disable job manually');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  const handleActivate = async () => {
    setLoading({ loading: true, button: 'enable' });
    setDisable(true);
    try {
      const response = await api.post('/job/updateJobStatus', {
        job_id: data.job_id,
        is_enabled: true,
        last_reg_user_id: user?.id,
      });
      if (response.data.success) {
        toast.success('Job activated successfully');
        setLoading({ loading: false, button: '' });
        mutate();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error('Error when enable job');
    } finally {
      setLoading({ loading: false, button: '' });
      setDisable(false);
    }
  };

  return (
    <>
      <Box className="flex flex-col gap-4 mt-4">
        <Box className="flex gap-8 ">
          <BaseTextField
            disabled
            value={data.system || ''}
            content={t('system_id')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={data.creator}
            content={t('creator')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>
        <Box className="flex gap-8">
          <BaseTextField
            disabled
            value={data.group || ''}
            content={t('group_name')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={data.job_name || ''}
            content={t('job_name')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>
        <Box className="flex gap-8">
          <BaseTextField
            disabled
            value={timestampFormat(data.startDate) || ''}
            content={t('start_date')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={timestampFormat(data.endDate) || ''}
            content={t('end_date')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>

        <BaseTextField
          disabled
          value={data.repeatInterval || ''}
          content={t('repeat_interval')}
          className="col-span-2"
          textStyles="text-grayDark font-bold mb-1"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {data.current_state !== 'COMPLETED' &&
                  data.current_state !== 'DELETED' && (
                    <IconButton
                      onClick={openModal}
                      color="info"
                      sx={{
                        padding: 0,
                      }}
                      aria-label="info"
                      className="text-grayDark"
                    >
                      <InfoIcon />
                    </IconButton>
                  )}
              </InputAdornment>
            ),
          }}
        />
        <Box className="flex gap-8">
          <BaseTextField
            disabled
            value={timestampFormat(data.lastStartDate) || ''}
            content={t('last_start_date')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={timestampFormat(data.nextRunDate) || ''}
            content={t('next_run_date')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>
        <Box className="flex gap-8">
          <BaseTextField
            disabled
            value={data.enable}
            content={t('enable')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={data.current_state || ''}
            content={t('state')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>
        <Box className="flex gap-8">
          <BaseTextField
            disabled
            value={data.jobType || ''}
            content={t('job_type')}
            textStyles="text-grayDark font-bold mb-1"
          />
          <BaseTextField
            disabled
            value={timestampFormat(data.jobCreateDate) || ''}
            content={t('job_create_date')}
            textStyles="text-grayDark font-bold mb-1"
          />
        </Box>
        <BaseTextArea
          disabled
          value={data.comment || ''}
          content={t('comment')}
          isRawInput
          textStyles="text-grayDark font-bold "
        />
      </Box>
      <Box className="mt-3 flex justify-end space-x-2">
        {data.enable ? (
          <ButtonWithLoading
            onClick={handleDeactivate}
            disabled={disable || isDeleted || user?.user_type !== 0}
            loading={loading.loading && loading.button === 'disable'}
          >
            {t('disable')}
          </ButtonWithLoading>
        ) : (
          <ButtonWithLoading
            onClick={handleActivate}
            disabled={disable || isDeleted || user?.user_type !== 0}
            loading={loading.loading && loading.button === 'enable'}
          >
            {t('enable')}
          </ButtonWithLoading>
        )}
        <ButtonWithLoading
          onClick={handleManualRun}
          disabled={disable || isRunning || isDeleted}
          loading={loading.loading && loading.button === 'execution'}
        >
          {t('execution')}
        </ButtonWithLoading>
        <ButtonWithLoading
          onClick={handleForceStop}
          disabled={disable || !isRunning || isDeleted}
          loading={loading.loading && loading.button === 'stop'}
        >
          {t('stop')}
        </ButtonWithLoading>
        <BaseButton
          onClick={handleClickOpenModifyDialog}
          disabled={disable || isRunning || isDeleted || user?.user_type !== 0}
          sx={{
            backgroundColor: 'white',
            color: 'black',
            fontWeight: '600',
            border: '2px solid #1C1C1C0D',
            boxShadow: 'none',
          }}
        >
          {t('modifyJobInformation')}
        </BaseButton>
        {isOpenDialogModify && (
          <DialogCreateAndModifyJob
            open={isOpenDialogModify}
            onClose={handleCloseModifyDialog}
            data={data}
            mutate={mutate}
          />
        )}
        <ButtonWithLoading
          onClick={openDeleteConfirmModal}
          disabled={disable || isRunning || isWaiting || user?.user_type !== 0}
          loading={loading.loading && loading.button === 'delete'}
          sx={{ backgroundColor: 'black', color: 'white', fontWeight: '600' }}
        >
          {t('delete')}
        </ButtonWithLoading>
        <ConfirmDialog
          widthClassName="w-100"
          openConfirm={isDeleteConfirm}
          setCloseConfirm={closeDeleteConfirmModal}
          title="Delete"
          callback={() => handleDelete()}
        >
          <div className="w-full text-lg">
            <p>
              <strong>Do you want to delete the Scheduler Job?</strong>
            </p>
          </div>
        </ConfirmDialog>
      </Box>
      {isVisible && (
        <RepeatInterval
          open={isVisible}
          onClose={closeModal}
          repeatInterval={data.repeatInterval}
          startDate={
            data.nextRunDate && data.nextRunDate !== 1
              ? data.nextRunDate
              : data.startDate
          }
        />
      )}
    </>
  );
};

const JobHistoryTab = (props) => {
  const { data } = props;
  // const navigate = useNavigate();
  const [logData, setLogData] = useState('');
  // const [checked, setChecked] = React.useState(false);

  const {
    jobResultData,
    isLoading,
    isLoadingDefault,
    setIsLoadingDefault,
    refreshData,
    total,
    pageNumber,
    pageSize,
    handleChangePage,
    handleChangeRowsPerPage,
  } = useJobResult({ jobId: data?.job_id });
  const { job } = useJobDetailData({ job_id: data?.job_id });
  // @ts-ignore
  const { socket, isConnected, setShouldConnection, joinRoom } =
    useLogSocketIO();
  // const [isConnected, setIsConnected] = useState(false);

  // const handleChange = () => {
  //   setChecked((prev) => !prev);
  // };

  // useEffect(() => {
  //     setShouldConnection(true);
  //     socket.on('logs_response', (msg) => {
  //         setLogData(logData + <br/> + msg?.logs);
  //     });
  // }, [logData]);

  return (
    <Box
      className="grid grid-rows-[min-content_min-content_minmax(0,1fr)]"
      style={{ maxHeight: '70vh', paddingTop: 10, paddingBottom: 15 }}
    >
      {/* <Box p={2} display="flex" justifyContent="flex-end">
          <Button
              variant="contained"
              onClick={() => {
                navigate('/job-results', {state: {job: data.jobName}});
              }}
          >
            Show more job execution results
          </Button>
        </Box> */}
      <Box className="grid grid-cols-2 gap-4">
        {job && (
          <>
            <BaseTextField
              id="retryDelay"
              content="Retry Delay"
              disabled={true}
              value={job.retryDelay ?? ''}
              size="small"
              textStyles={'text-grayDark'}
            />
            <BaseTextField
              id="runCount"
              content="Run Count"
              disabled={true}
              value={job.runCount ?? ''}
              size="small"
              textStyles={'text-grayDark'}
            />
            <BaseTextField
              id="failureCount"
              content="Failure Count"
              disabled={true}
              value={job.failureCount ?? ''}
              size="small"
              textStyles={'text-grayDark'}
            />
            <BaseTextField
              id="retryCount"
              content="Retry Count"
              disabled={true}
              value={job.retryCount ?? ''}
              size="small"
              textStyles={'text-grayDark'}
            />
          </>
        )}
      </Box>

      {/* <Box marginTop={3}>
          <FormControlLabel
              style={{margin: '1px'}}
              control={
                <Switch
                    checked={checked}
                    onChange={() => {
                      handleChange();
                      joinRoom(data.job_id);
                    }}
                />
              }
              label="Show Log"
          />
          <Box sx={{display: 'flex'}}>
            <Grow in={checked}>
              {
                <Box className="terminal-container">
                  <Box
                      marginBottom={1}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        border: '1px solid #333',
                      }}
                  >
                    <h1 className="font-extrabold text-yellow-300">
                      Log server: {data.system}
                    </h1>
                    <div
                        style={{
                          color: 'yellow',
                          display: 'flex',
                          marginRight: '5px',
                          alignItems: 'center',
                        }}
                    >
                      Connection status:{' '}
                      {isConnected ? (
                          <>
                            <DotIcon size={10} color="green"/> Connected
                          </>
                      ) : (
                          <>
                            <DotIcon size={10} color="red"/> Disconnected
                          </>
                      )}
                    </div>
                  </Box>

                  <SimpleBar
                      style={{
                        maxHeight: '30vh',
                        paddingTop: 2,
                        paddingBottom: 15,
                      }}
                  >
                    <p>{logData}</p>
                  </SimpleBar>
                </Box>
              }
            </Grow>
          </Box>
        </Box> */}
      <Box marginTop={2}>
        <div className="flex justify-end">
          <BaseButton
            variant="outlined"
            startIcon={<CachedIcon style={{ color: 'currentColor' }} />}
            onClick={refreshData}
            size="small"
            sx={{ fontWeight: 'bold', border: '1px solid #A2A8B3' }}
          >
            Refresh log
          </BaseButton>
        </div>
      </Box>
      <Box
        marginTop={2}
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <SimpleBar style={{ height: '100%', overflow: 'auto' }}>
            <JobResultTable
              isShort
              jobResultData={jobResultData}
              isLoading={isLoading}
              isLoadingDefault={isLoadingDefault}
              setIsLoadingDefault={setIsLoadingDefault}
            />
          </SimpleBar>
        </Box>
        {total && total > 0 ? (
          <BasePagination
            count={total}
            page={pageNumber - 1}
            rowsPerPage={pageSize}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            show
          />
        ) : null}
      </Box>
    </Box>
  );
};

function JobStatusDetail({ open, onClose, data, mutate }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [r, setR] = useState(() => Math.random());
  // @ts-ignore
  const handleChangeTab = (event, newValue) => {
    setTabIndex(newValue);
  };

  const refreshServerLogData = () => {
    setR(Math.random());
  };

  const handleClose = () => {
    setTabIndex(0); // Reset to first tab
    onClose();
  };

  return (
    <Dialog open={open} maxWidth="lg" fullWidth>
      <DialogTitle className="text-2xl font-bold ">Job Detail</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: (theme) => theme.palette.grey[500],
        }}
      >
        <CloseIcon className="text-black text-3xl" />
      </IconButton>
      <Tabs
        value={tabIndex}
        onChange={handleChangeTab}
        sx={{
          paddingInline: '24px',
          '& .MuiTab-root': {
            color: 'rgba(0,0,0,0.4)',
            fontWeight: 'bold',
            textTransform: 'none',
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#000000',
          },
        }}
      >
        <Tab label="Job Info" />
        <Tab label="Job History" />
        <Tab label="Job Log" />
      </Tabs>
      <DialogContent
        sx={{
          // minHeight: '710.5px',
          display: 'grid',
        }}
      >
        {tabIndex === 0 && (
          <JobDetailTab onClose={onClose} data={data} mutate={mutate} />
        )}
        {tabIndex === 1 && <JobHistoryTab data={data} />}
        {tabIndex === 2 && (
          <div>
            <div className="flex justify-end">
              <BaseButton
                variant="outlined"
                onClick={refreshServerLogData}
                sx={{
                  fontWeight: 'medium',
                  border: '1px solid #A2A8B3',
                  borderRadius: '20px',
                }}
              >
                Refresh log
              </BaseButton>
              <BaseButton
                sx={{
                  marginLeft: '10px',
                  fontWeight: 'medium',
                  border: '1px solid #A2A8B3',
                  borderRadius: '20px',
                }}
                variant="outlined"
                onClick={() => {
                  // @ts-ignore
                  window.open(
                    import.meta.env.VITE_SERVER_LOG_URL +
                      '/d/' +
                      import.meta.env.VITE_SERVER_LOG_DASHBOARD_ID +
                      '/worker-logs?orgId=1&from=' +
                      (Date.now() - 24 * 60 * 60 * 1000) +
                      '&to=' +
                      Date.now() +
                      '&timezone=browser&var-job_id=' +
                      data?.job_id,
                  );
                }}
              >
                Go To Dashboard
              </BaseButton>
            </div>
            <iframe
              key={r}
              className="w-full mt-2"
              src={
                // @ts-ignore
                import.meta.env.VITE_SERVER_LOG_URL +
                '/d-solo/' +
                import.meta.env.VITE_SERVER_LOG_DASHBOARD_ID +
                '/worker-logs?orgId=1&from=' +
                (Date.now() - 24 * 60 * 60 * 1000) +
                '&to=' +
                Date.now() +
                '&timezone=browser&var-job_id=' +
                data?.job_id +
                '&panelId=1&__feature.dashboardSceneSolo'
              }
              // width="100%"
              height="600px"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JobStatusDetail;

export const ButtonWithLoading = ({ loading, children, ...props }) => (
  <BaseButton
    {...props}
    endIcon={loading ? <CircularProgress size={15} color="inherit" /> : null}
    sx={{
      backgroundColor: 'white',
      color: 'black',
      fontWeight: '600',
      border: '2px solid #1C1C1C0D',
      boxShadow: 'none',
    }}
  >
    {children}
  </BaseButton>
);
