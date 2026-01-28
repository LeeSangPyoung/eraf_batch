import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import CachedIcon from '@mui/icons-material/Cached';
import { toast } from 'react-toastify';
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
import JobResultTable from '../Table/JobResultTable.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import DialogCreateAndModifyJob from './DialogCreateAndModifyJob';
import RepeatInterval from './RepeatInterval';

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

  // Info Item Component for cleaner display
  const InfoItem = ({ label, value }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Box
        component="span"
        sx={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#86868B',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#1D1D1F',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          padding: '8px 12px',
          backgroundColor: '#F5F5F7',
          borderRadius: '8px',
          minHeight: '36px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {value || '-'}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Info Grid - 3 columns compact layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginTop: '8px',
        }}
      >
        <InfoItem label={t('system_id')} value={data.system} />
        <InfoItem label={t('group_name')} value={data.group} />
        <InfoItem label={t('job_name')} value={data.job_name} />

        <InfoItem label={t('creator')} value={data.creator} />
        <InfoItem label={t('job_type')} value={data.jobType} />
        <InfoItem label={t('job_create_date')} value={timestampFormat(data.jobCreateDate)} />

        <InfoItem label={t('start_date')} value={timestampFormat(data.startDate)} />
        <InfoItem label={t('end_date')} value={timestampFormat(data.endDate)} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Box
            component="span"
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#86868B',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            {t('repeat_interval')}
          </Box>
          <Box
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#1D1D1F',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              padding: '8px 12px',
              backgroundColor: '#F5F5F7',
              borderRadius: '8px',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{data.repeatInterval || '-'}</span>
            {data.current_state !== 'COMPLETED' && data.current_state !== 'DELETED' && (
              <IconButton
                onClick={openModal}
                size="small"
                sx={{
                  padding: '4px',
                  color: '#0071E3',
                  '&:hover': { backgroundColor: 'rgba(0, 113, 227, 0.08)' },
                }}
              >
                <InfoIcon sx={{ fontSize: '18px' }} />
              </IconButton>
            )}
          </Box>
        </Box>

        <InfoItem label={t('last_start_date')} value={timestampFormat(data.lastStartDate)} />
        <InfoItem label={t('next_run_date')} value={timestampFormat(data.nextRunDate)} />
        <InfoItem label={t('enable')} value={data.enable ? 'True' : 'False'} />

        <InfoItem label={t('state')} value={data.current_state} />

        {/* Comment - spans 2 columns */}
        <Box sx={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Box
            component="span"
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#86868B',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            }}
          >
            {t('comment')}
          </Box>
          <Box
            sx={{
              fontSize: '14px',
              fontWeight: 400,
              color: '#1D1D1F',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
              padding: '10px 12px',
              backgroundColor: '#F5F5F7',
              borderRadius: '8px',
              minHeight: '36px',
              lineHeight: 1.5,
            }}
          >
            {data.comment || '-'}
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #E8E8ED',
        }}
      >
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
          theme="secondary"
          size="small"
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
        <BaseButton
          onClick={openDeleteConfirmModal}
          disabled={disable || isRunning || isWaiting || user?.user_type !== 0}
          theme="danger"
          size="small"
          endIcon={loading.loading && loading.button === 'delete' ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {t('delete')}
        </BaseButton>
        <ConfirmDialog
          widthClassName="w-100"
          openConfirm={isDeleteConfirm}
          setCloseConfirm={closeDeleteConfirmModal}
          title="Delete"
          callback={() => handleDelete()}
        >
          <p>Do you want to delete the Scheduler Job?</p>
        </ConfirmDialog>
      </Box>

      {isVisible && (
        <RepeatInterval
          open={isVisible}
          onClose={closeModal}
          repeatInterval={data.repeatInterval}
          startDate={(() => {
            const now = Date.now();
            if (data.nextRunDate && data.nextRunDate !== 1) {
              return data.nextRunDate > now ? data.nextRunDate : now;
            }
            return data.startDate > now ? data.startDate : now;
          })()}
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

  // Stat Item Component
  const StatItem = ({ label, value }) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#F5F5F7',
        borderRadius: '12px',
        minWidth: '120px',
      }}
    >
      <Box
        sx={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#1D1D1F',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        }}
      >
        {value ?? 0}
      </Box>
      <Box
        sx={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#86868B',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          marginTop: '4px',
        }}
      >
        {label}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Stats Row */}
      {job && (
        <Box sx={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
          <StatItem label="Retry Delay" value={job.retryDelay} />
          <StatItem label="Run Count" value={job.runCount} />
          <StatItem label="Failure Count" value={job.failureCount} />
          <StatItem label="Retry Count" value={job.retryCount} />
        </Box>
      )}

      {/* Refresh Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <BaseButton
          startIcon={<CachedIcon style={{ color: 'currentColor' }} />}
          onClick={refreshData}
          theme="secondary"
          size="small"
        >
          Refresh
        </BaseButton>
      </Box>

      {/* Results Table */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '300px',
          maxHeight: '400px',
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <JobResultTable
            isShort
            jobResultData={jobResultData}
            isLoading={isLoading}
            isLoadingDefault={isLoadingDefault}
            setIsLoadingDefault={setIsLoadingDefault}
          />
        </Box>
        {total && total > 0 && (
          <BasePagination
            count={total}
            page={pageNumber - 1}
            rowsPerPage={pageSize}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            show
          />
        )}
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
    <Dialog
      open={open}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
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
          fontSize: '20px',
          fontWeight: 600,
          color: '#1D1D1F',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        Job Detail
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={handleClose}
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
      <Tabs
        value={tabIndex}
        onChange={handleChangeTab}
        sx={{
          paddingInline: '24px',
          borderBottom: '1px solid #E8E8ED',
          '& .MuiTabs-indicator': {
            backgroundColor: '#0071E3',
            height: '2px',
            borderRadius: '2px 2px 0 0',
          },
          '& .MuiTab-root': {
            color: '#86868B',
            fontWeight: 500,
            fontSize: '14px',
            textTransform: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
            minHeight: '48px',
            transition: 'color 0.2s ease',
            '&:hover': {
              color: '#1D1D1F',
            },
          },
          '& .MuiTab-root.Mui-selected': {
            color: '#0071E3',
            fontWeight: 600,
          },
        }}
      >
        <Tab label="Job Info" />
        <Tab label="Job History" />
        <Tab label="Job Log" />
      </Tabs>
      <DialogContent
        sx={{
          padding: '20px 24px',
          overflowY: 'auto',
        }}
      >
        {tabIndex === 0 && (
          <JobDetailTab onClose={onClose} data={data} mutate={mutate} />
        )}
        {tabIndex === 1 && <JobHistoryTab data={data} />}
        {tabIndex === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <BaseButton
                onClick={refreshServerLogData}
                theme="secondary"
                size="small"
              >
                Refresh
              </BaseButton>
              <BaseButton
                theme="primary"
                size="small"
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
            </Box>
            <Box
              sx={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #E8E8ED',
              }}
            >
              <iframe
                key={r}
                style={{ width: '100%', border: 'none' }}
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
                height="450px"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JobStatusDetail;

export const ButtonWithLoading = ({ loading, children, ...props }) => (
  <BaseButton
    {...props}
    theme="secondary"
    size="small"
    endIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
  >
    {children}
  </BaseButton>
);
