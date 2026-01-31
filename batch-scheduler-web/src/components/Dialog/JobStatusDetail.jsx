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
import RealtimeLogViewer from '../Log/RealtimeLogViewer';

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
        toast.success(t('jobDeleteSuccess'));
        mutate();
        jobFilterMutation();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorDeletingJob'));
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
        toast.success(t('jobRunSuccess'));
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorRunningJob'));
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
        toast.success(t('jobStopSuccess'));
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorStoppingJob'));
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
        toast.success(t('jobDeactivatedSuccess'));
        setLoading({ loading: false, button: '' });
        mutate();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorDeactivatingJob'));
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
        toast.success(t('jobActivatedSuccess'));
        setLoading({ loading: false, button: '' });
        mutate();
        onClose();
      } else {
        toast.error(response.data.error_msg, { autoClose: false });
      }
    } catch (error) {
      toast.error(t('errorActivatingJob'));
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
        {/* Server with failover badges */}
        <Box sx={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Box component="span" sx={{ fontSize: '12px', fontWeight: 500, color: '#86868B', fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif' }}>
            Server
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Master - with pulse animation when running */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
              backgroundColor: '#FF9500', borderRadius: '16px',
              ...(data.current_state === 'RUNNING' && {
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 149, 0, 0.4)' },
                  '50%': { boxShadow: '0 0 0 8px rgba(255, 149, 0, 0)' },
                },
              }),
            }}>
              <Box sx={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>M</Box>
              <Box sx={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{data.system || '-'}</Box>
            </Box>
            {/* Slave1 */}
            {data.secondary_system && (
              <>
                <Box sx={{ fontSize: '14px', color: '#C7C7CC' }}>→</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#F5F5F7', borderRadius: '16px' }}>
                  <Box sx={{ fontSize: '10px', color: '#AEAEB2', fontWeight: 500 }}>S1</Box>
                  <Box sx={{ fontSize: '13px', color: '#86868B', fontWeight: 500 }}>{data.secondary_system}</Box>
                </Box>
              </>
            )}
            {/* Slave2 */}
            {data.tertiary_system && (
              <>
                <Box sx={{ fontSize: '14px', color: '#C7C7CC' }}>→</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#F5F5F7', borderRadius: '16px' }}>
                  <Box sx={{ fontSize: '10px', color: '#AEAEB2', fontWeight: 500 }}>S2</Box>
                  <Box sx={{ fontSize: '13px', color: '#86868B', fontWeight: 500 }}>{data.tertiary_system}</Box>
                </Box>
              </>
            )}
          </Box>
        </Box>
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
        <InfoItem label={t('enable')} value={data.enable ? t('true') : t('false')} />

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
          disabled={disable || isRunning || isDeleted || !data.enable}
          loading={loading.loading && loading.button === 'execution'}
          title={!data.enable ? t('cannotExecuteDisabledJob') : ''}
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
          disabled={disable || isDeleted || user?.user_type !== 0}
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
          disabled={disable || user?.user_type !== 0}
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
          title={t('delete')}
          callback={() => handleDelete()}
        >
          <div>
            <p>{t('doYouWantToDeleteJob')}</p>
            {(isRunning || isWaiting) && (
              <p style={{ color: '#FF3B30', marginTop: '8px', fontWeight: 500 }}>
                {t('warningJobIsRunning')}
              </p>
            )}
          </div>
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
  const { t } = useTranslation();
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
          <StatItem label={t('retryDelay')} value={job.retryDelay} />
          <StatItem label={t('runCount')} value={job.runCount} />
          <StatItem label={t('failureCount')} value={job.failureCount} />
          <StatItem label={t('retryCount')} value={job.retryCount} />
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
          {t('refresh')}
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
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  // Get job result data for log viewer
  const {
    jobResultData: logJobResults,
    refreshData: refreshLogResults,
  } = useJobResult({ jobId: data?.job_id });

  // @ts-ignore
  const handleChangeTab = (event, newValue) => {
    setTabIndex(newValue);
    // Refresh log results when switching to log tab
    if (newValue === 2) {
      refreshLogResults();
    }
  };

  const handleClose = () => {
    setTabIndex(0); // Reset to first tab
    onClose();
  };

  // Get the RUNNING task or the latest result (use log_id for SSE channel)
  const getActiveTaskId = () => {
    if (logJobResults && logJobResults.length > 0) {
      // Find running task first, otherwise get the most recent one
      const runningTask = logJobResults.find(r => r.status === 'RUNNING');
      if (runningTask) return String(runningTask.log_id);
      return String(logJobResults[0]?.log_id);
    }
    return null;
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
        {t('jobDetail')}
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
        <Tab label={t('jobInfo')} />
        <Tab label={t('jobHistory')} />
        <Tab label={t('jobLog')} />
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
            {/* Real-time log viewer - automatically shows RUNNING or latest result */}
            {logJobResults && logJobResults.length > 0 && getActiveTaskId() ? (
              <RealtimeLogViewer
                key={getActiveTaskId()}
                taskId={getActiveTaskId()}
                jobId={data?.job_id}
                isRunning={logJobResults.find(r => String(r.log_id) === getActiveTaskId())?.status === 'RUNNING'}
              />
            ) : (
              <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px',
                color: '#86868B',
                fontSize: '14px',
              }}>
                {t('noLogsYet') || 'No execution history yet.'}
              </Box>
            )}
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
