import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../services/api';
import { backgroundIndicator } from '../../utils/helper';

// Summary Card Component
const SummaryCard = ({ title, value, color, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      backgroundColor: '#FFFFFF',
      borderRadius: '20px',
      padding: '24px',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
      },
    }}
  >
    <Typography
      sx={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#86868B',
        marginBottom: '12px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
      }}
    >
      {title}
    </Typography>
    <Typography
      sx={{
        fontSize: '36px',
        fontWeight: 700,
        color: color || '#1D1D1F',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
  </Box>
);

// Chart Card Component with enhanced styling
const ChartCard = ({ title, children, rightContent }) => (
  <Box
    sx={{
      backgroundColor: '#FFFFFF',
      borderRadius: '20px',
      border: '1px solid rgba(0, 0, 0, 0.06)',
      padding: '24px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
      <Typography
        sx={{
          fontSize: '17px',
          fontWeight: 600,
          color: '#1D1D1F',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </Typography>
      {rightContent}
    </Box>
    {children}
  </Box>
);

// Status Badge Component
const StatusBadge = ({ status }) => {
  const color = backgroundIndicator(status);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: `${color}15`,
      }}
    >
      <Box sx={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
      <Typography sx={{ fontSize: '12px', fontWeight: 500, color }}>
        {status}
      </Typography>
    </Box>
  );
};

// List Item Component with enhanced styling
const ListItem = ({ name, status, time, type, jobId, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      borderRadius: '12px',
      backgroundColor: '#F5F5F7',
      transition: 'all 0.2s ease',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': { backgroundColor: '#EEEEF0' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
      <Box sx={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: backgroundIndicator(status),
        flexShrink: 0,
        boxShadow: `0 0 0 3px ${backgroundIndicator(status)}20`,
      }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1D1D1F',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </Typography>
        {type && <Typography sx={{ fontSize: '12px', color: '#86868B', fontWeight: 500 }}>{type}</Typography>}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <StatusBadge status={status} />
      {time && <Typography sx={{ fontSize: '12px', color: '#86868B', whiteSpace: 'nowrap', fontWeight: 500 }}>{time}</Typography>}
    </Box>
  </Box>
);

// Agent Card Component with enhanced styling
const AgentCard = ({ agent, t }) => {
  const isOnline = agent.agent_status === 'ONLINE';
  const isHealthy = isOnline && agent.is_healthy;
  return (
    <Box sx={{
      padding: '10px 12px',
      borderRadius: '10px',
      backgroundColor: '#F5F5F7',
      transition: 'all 0.2s ease',
      '&:hover': { backgroundColor: '#EEEEF0' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
          {agent.name}
        </Typography>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          backgroundColor: isHealthy ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
        }}>
          <Box sx={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isHealthy ? '#34C759' : '#FF3B30' }} />
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: isHealthy ? '#34C759' : '#FF3B30' }}>
            {isHealthy ? t('healthy') : t('unhealthy')}
          </Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: '11px', color: '#86868B', fontWeight: 500, marginTop: '2px' }}>{agent.host_name || t('unknownHost')}</Typography>
    </Box>
  );
};

const CHART_COLORS = {
  success: '#34C759',
  failed: '#FF3B30',
  running: '#FF9500',
  total: '#0071E3',
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hourly'); // 'hourly' or 'daily'
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day'));
  const [endDate, setEndDate] = useState(dayjs());
  const [stats, setStats] = useState({ totalJobs: 0, runningJobs: 0, failedToday: 0, successToday: 0 });
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [recentFailed, setRecentFailed] = useState([]);
  const [runningItems, setRunningItems] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs count
      const jobsRes = await api.post('/job/getFilter', { page_size: 10000, page_number: 1 });
      const jobs = jobsRes.data?.data || [];

      // Fetch dashboard aggregation data (pre-aggregated by backend)
      const dashRes = await api.post('/logs/dashboard', {
        from: startDate.startOf('day').valueOf(),
        to: endDate.endOf('day').valueOf(),
      });
      const dashData = dashRes.data?.data || {};

      // Fetch agents (servers)
      let agentList = [];
      try {
        const agentsRes = await api.get('/server/getFilter');
        agentList = agentsRes.data?.data || [];
      } catch (e) {
        console.error('Failed to fetch agents:', e);
      }
      setAgents(agentList);

      // Process hourly data - fill all 24 hours
      const hourlyMap = {};
      (dashData.hourly || []).forEach(h => { hourlyMap[h.hour] = h; });
      setHourlyData(Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        total: Number(hourlyMap[i]?.total || 0),
        success: Number(hourlyMap[i]?.success || 0),
        failed: Number(hourlyMap[i]?.failed || 0),
      })));

      // Process daily data - fill all dates in range
      const dailyMap = {};
      (dashData.daily || []).forEach(d => { dailyMap[d.day] = d; });
      const processedDaily = [];
      let current = startDate.startOf('day');
      const end = endDate.endOf('day');
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const key = current.format('MM/DD');
        processedDaily.push({
          date: key,
          total: Number(dailyMap[key]?.total || 0),
          success: Number(dailyMap[key]?.success || 0),
          failed: Number(dailyMap[key]?.failed || 0),
        });
        current = current.add(1, 'day');
      }
      setDailyData(processedDaily);

      // Process pie data - group similar statuses
      const statusGroupMap = {
        'SUCCESS': 'SUCCESS', 'COMPLETED': 'SUCCESS',
        'FAILED': 'FAILED', 'FAILURE': 'FAILED', 'BROKEN': 'FAILED', 'TIMEOUT': 'FAILED',
        'RUNNING': 'RUNNING', 'PENDING': 'PENDING', 'STARTED': 'RUNNING',
        'SKIPPED': 'SKIPPED', 'REVOKED': 'REVOKED',
      };
      const groupColors = {
        'SUCCESS': CHART_COLORS.success, 'FAILED': CHART_COLORS.failed,
        'RUNNING': CHART_COLORS.running, 'PENDING': '#A0A0A5',
        'SKIPPED': '#C7C7CC', 'REVOKED': '#AF52DE',
      };
      const groupedCounts = {};
      (dashData.statusDistribution || []).forEach(item => {
        const grouped = statusGroupMap[item.status] || item.status;
        groupedCounts[grouped] = (groupedCounts[grouped] || 0) + Number(item.count || 0);
      });
      setPieData(Object.entries(groupedCounts)
        .map(([status, count]) => ({ name: status, value: count, color: groupColors[status] || '#86868B' }))
        .filter(d => d.value > 0)
        .sort((a, b) => b.value - a.value));

      // Today's stats from todayStats (aggregated by backend)
      const todayStatusMap = {};
      (dashData.todayStats || []).forEach(item => {
        const grouped = statusGroupMap[item.status] || item.status;
        todayStatusMap[grouped] = (todayStatusMap[grouped] || 0) + Number(item.count || 0);
      });
      setStats({
        totalJobs: jobs.length,
        runningJobs: todayStatusMap['RUNNING'] || 0,
        failedToday: todayStatusMap['FAILED'] || 0,
        successToday: todayStatusMap['SUCCESS'] || 0,
      });

      // Recent failed and running - from dashboard response
      setRecentFailed((dashData.recentFailed || []).map(log => ({
        name: log.job_name, jobId: log.job_id, status: log.status,
        time: formatTime(log.req_start_date), type: log.group_name,
      })));
      setRunningItems((dashData.recentRunning || []).map(log => ({
        name: log.job_name, jobId: log.job_id, status: log.status,
        time: formatTime(log.req_start_date), type: log.group_name,
      })));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return dayjs(timestamp).format('MM/DD HH:mm');
  };

  // Find peak hour from hourlyData
  const peakHour = (() => {
    let maxHour = 0;
    let maxCount = 0;
    hourlyData.forEach((h, i) => {
      if (h.total > maxCount) {
        maxCount = h.total;
        maxHour = i;
      }
    });
    return { hour: maxHour, count: maxCount };
  })();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress sx={{ color: '#0071E3' }} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          padding: '32px',
          background: 'linear-gradient(180deg, #F5F5F7 0%, #EEEEF0 100%)',
          minHeight: '100%',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Pretendard", sans-serif',
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <Box>
            <Typography sx={{ fontSize: '34px', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.025em' }}>
              {t('dashboard')}
            </Typography>
            <Typography sx={{ fontSize: '15px', color: '#86868B', marginTop: '6px', fontWeight: 500 }}>
              {t('batchSchedulerOverview')}
            </Typography>
          </Box>
          {/* Date Range Picker */}
          <Box sx={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: '14px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}>
            <DatePicker
              label={t('start')}
              value={startDate}
              onChange={(v) => v && setStartDate(v)}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: {
                    '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#F5F5F7' },
                    '& .MuiInputBase-input': { color: '#1D1D1F' },
                    '& .MuiInputLabel-root': { color: '#86868B' },
                    width: '150px',
                  },
                },
              }}
            />
            <Typography sx={{ color: '#86868B', fontWeight: 500 }}>~</Typography>
            <DatePicker
              label={t('end')}
              value={endDate}
              onChange={(v) => v && setEndDate(v)}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: {
                    '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#F5F5F7' },
                    '& .MuiInputBase-input': { color: '#1D1D1F' },
                    '& .MuiInputLabel-root': { color: '#86868B' },
                    width: '150px',
                  },
                },
              }}
            />
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <SummaryCard title={t('totalJobs')} value={stats.totalJobs} onClick={() => navigate('/job-status')} />
          <SummaryCard title={t('running')} value={stats.runningJobs} color="#FF9500" />
          <SummaryCard title={t('successToday')} value={stats.successToday} color="#34C759" />
          <SummaryCard title={t('failedToday')} value={stats.failedToday} color="#FF3B30" />
        </Box>

        {/* Charts Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '28px' }}>
          {/* Main Chart */}
          <ChartCard
            title={viewMode === 'hourly' ? t('todaysHourlyExecution') : t('dailyExecution')}
            rightContent={
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, v) => v && setViewMode(v)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    padding: '4px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    textTransform: 'none',
                    '&.Mui-selected': { backgroundColor: '#0071E3', color: '#fff' },
                  },
                }}
              >
                <ToggleButton value="hourly">{t('hourly')}</ToggleButton>
                <ToggleButton value="daily">{t('daily')}</ToggleButton>
              </ToggleButtonGroup>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              {viewMode === 'hourly' ? (
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#86868B' }} tickLine={false} axisLine={{ stroke: '#E8E8ED' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#86868B' }} tickLine={false} axisLine={{ stroke: '#E8E8ED' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E8E8ED', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="total" name="Total" fill={CHART_COLORS.total} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="success" name="Success" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill={CHART_COLORS.failed} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E8ED" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#86868B' }} tickLine={false} axisLine={{ stroke: '#E8E8ED' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#86868B' }} tickLine={false} axisLine={{ stroke: '#E8E8ED' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #E8E8ED', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS.total} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="success" name="Success" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="failed" name="Failed" stroke={CHART_COLORS.failed} strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
            {viewMode === 'hourly' && peakHour.count > 0 && (
              <Box sx={{ marginTop: '12px', padding: '12px 16px', backgroundColor: '#F5F5F7', borderRadius: '10px' }}>
                <Typography sx={{ fontSize: '13px', color: '#1D1D1F' }}>
                  {t('todaysPeak')}: <strong>{peakHour.hour}:00 ~ {peakHour.hour}:59</strong> ({peakHour.count} {t('executions')})
                </Typography>
              </Box>
            )}
          </ChartCard>

          {/* Pie Chart */}
          <ChartCard title={t('statusDistribution')}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E8E8ED' }}
                  formatter={(value, name) => [`${value} jobs`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              {pieData.map((item) => (
                <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Box sx={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                  <Typography sx={{ fontSize: '12px', color: '#1D1D1F' }}>
                    {item.name}: {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </ChartCard>
        </Box>

        {/* Bottom Row */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          {/* Running Now */}
          <ChartCard
            title={t('runningNow')}
            rightContent={
              <Typography
                onClick={() => navigate('/job-results?status=RUNNING')}
                sx={{ fontSize: '13px', color: '#0071E3', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
              >
                {t('viewAll')}
              </Typography>
            }
          >
            {runningItems.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {runningItems.map((item, index) => (
                  <ListItem
                    key={index}
                    {...item}
                    onClick={() => navigate(`/job-results?status=RUNNING&job=${item.jobId}`)}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ padding: '32px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', color: '#86868B', fontWeight: 500 }}>{t('noRunningJobs')}</Typography>
              </Box>
            )}
          </ChartCard>

          {/* Recent Failed */}
          <ChartCard
            title={t('recentFailed')}
            rightContent={
              <Typography
                onClick={() => navigate('/job-results?status=FAILED')}
                sx={{ fontSize: '13px', color: '#0071E3', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
              >
                {t('viewAll')}
              </Typography>
            }
          >
            {recentFailed.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentFailed.map((item, index) => (
                  <ListItem
                    key={index}
                    {...item}
                    onClick={() => navigate(`/job-results?status=FAILED&job=${item.jobId}`)}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ padding: '32px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', color: '#34C759', fontWeight: 500 }}>{t('noFailures')}</Typography>
              </Box>
            )}
          </ChartCard>

          {/* Agent Status */}
          <ChartCard
            title={t('agentStatus')}
            rightContent={
              <Typography sx={{ fontSize: '13px', color: '#86868B' }}>
                {agents.filter(a => a.agent_status === 'ONLINE' && a.is_healthy).length} / {agents.length} {t('healthy')}
              </Typography>
            }
          >
            {agents.length > 0 ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '280px',
                overflowY: 'auto',
                paddingRight: '4px',
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { backgroundColor: '#F5F5F7', borderRadius: '3px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#C7C7CC', borderRadius: '3px', '&:hover': { backgroundColor: '#AEAEB2' } },
              }}>
                {agents.map((agent, index) => (
                  <AgentCard key={index} agent={agent} t={t} />
                ))}
              </Box>
            ) : (
              <Box sx={{ padding: '32px', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '14px', color: '#86868B', fontWeight: 500 }}>{t('noAgents')}</Typography>
              </Box>
            )}
          </ChartCard>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default Dashboard;
