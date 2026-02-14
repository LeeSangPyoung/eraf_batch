import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, IconButton, Tooltip, CircularProgress } from '@mui/material';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

// Helper to get JWT token from localStorage
const getAuthToken = () => {
  try {
    const auth = localStorage.getItem('auth');
    if (auth) {
      const parsed = JSON.parse(auth);
      return parsed?.state?.token || null;
    }
  } catch (e) {
    console.error('Failed to parse auth token:', e);
  }
  return null;
};

/**
 * Real-time log viewer component with SSE streaming
 */
const MAX_LOG_LINES = 5000; // [P3] Prevent memory issues from unbounded log growth

const RealtimeLogViewer = ({ taskId, jobId, isRunning = false }) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [storedLogs, setStoredLogs] = useState('');
  const [isLoadingStored, setIsLoadingStored] = useState(false);
  const logContainerRef = useRef(null);
  const eventSourceRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const lastScrollHeightRef = useRef(0);
  const jobCompletedRef = useRef(false); // Track if job finished to prevent reconnection loop

  // Debounced auto-scroll - only scroll after logs stop coming for 200ms
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      // Cancel previous scheduled scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Debounce scroll - wait 200ms after last log update
      scrollTimeoutRef.current = setTimeout(() => {
        if (logContainerRef.current) {
          const newScrollHeight = logContainerRef.current.scrollHeight;
          // Only scroll if content height actually changed
          if (newScrollHeight !== lastScrollHeightRef.current) {
            lastScrollHeightRef.current = newScrollHeight;
            logContainerRef.current.scrollTop = newScrollHeight;
          }
        }
      }, 200);
    }
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [logs, autoScroll]);

  // Load stored logs - try Redis buffer first, then fallback to database
  const loadStoredLogs = useCallback(async () => {
    if (!taskId) return;

    setIsLoadingStored(true);
    setLogs([]); // Clear existing logs
    setStoredLogs('');
    const token = getAuthToken();
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      // First try to get buffered logs from Redis (formatted with timestamps)
      const bufferedResponse = await fetch(`${API_BASE_URL}/api/logs/${taskId}/buffered`, {
        headers: authHeaders
      });
      if (bufferedResponse.ok) {
        const bufferedData = await bufferedResponse.json();
        if (bufferedData.available && bufferedData.logs && bufferedData.logs.length > 0) {
          // Use buffered logs, filter out [END] marker
          const formattedLogs = bufferedData.logs
            .filter(line => line !== '[END]')
            .map(line => ({
              type: line.includes('[ERROR]') ? 'error' : 'log',
              message: line
            }));
          setLogs(formattedLogs);
          setStoredLogs('');
          setIsLoadingStored(false);
          return;
        }
      }

      // Fallback to database stored logs (raw output only)
      const response = await fetch(`${API_BASE_URL}/api/logs/${taskId}`, {
        headers: authHeaders
      });
      if (response.ok) {
        const text = await response.text();
        setStoredLogs(text);
      }
    } catch (error) {
      console.error('Failed to load stored logs:', error);
    } finally {
      setIsLoadingStored(false);
    }
  }, [taskId]);

  // Track received log messages to prevent duplicates
  const receivedLogsRef = useRef(new Set());
  // Buffer for batching log updates
  const logBufferRef = useRef([]);
  const flushTimeoutRef = useRef(null);

  // Flush buffered logs to state (batched update to reduce re-renders)
  const flushLogBuffer = useCallback(() => {
    if (logBufferRef.current.length > 0) {
      const bufferedLogs = [...logBufferRef.current];
      logBufferRef.current = [];
      setLogs(prev => {
        const combined = [...prev, ...bufferedLogs];
        return combined.length > MAX_LOG_LINES ? combined.slice(-MAX_LOG_LINES) : combined;
      });
    }
    flushTimeoutRef.current = null;
  }, []);

  // [C7] Parse SSE format from text chunk, returns { events, remaining }
  const parseSSE = useCallback((text) => {
    const events = [];
    const blocks = text.split('\n\n');
    const remaining = blocks.pop(); // last block may be incomplete
    for (const block of blocks) {
      if (!block.trim()) continue;
      let eventType = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventType = line.substring(6).trim();
        else if (line.startsWith('data:')) data = line.substring(5).trimStart();
      }
      events.push({ type: eventType, data });
    }
    return { events, remaining };
  }, []);

  // [C7] Connect to SSE stream using fetch API (Authorization header instead of token in URL)
  const startStreaming = useCallback(() => {
    if (!taskId || eventSourceRef.current) return;

    // Clear existing logs and tracking set when starting fresh connection
    setLogs([]);
    setStoredLogs('');
    receivedLogsRef.current.clear();
    logBufferRef.current = [];
    jobCompletedRef.current = false;

    const token = getAuthToken();
    const sseUrl = `${API_BASE_URL}/api/logs/${taskId}/stream`;
    const abortController = new AbortController();
    eventSourceRef.current = abortController;

    setIsConnected(true);
    setIsStreaming(true);

    const headers = { 'Accept': 'text/event-stream' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(sseUrl, { headers, signal: abortController.signal })
      .then(response => {
        if (!response.ok) throw new Error(`SSE HTTP ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        const processChunk = ({ done, value }) => {
          if (done || jobCompletedRef.current) {
            setIsStreaming(false);
            setIsConnected(false);
            eventSourceRef.current = null;
            return;
          }

          sseBuffer += decoder.decode(value, { stream: true });
          const { events, remaining } = parseSSE(sseBuffer);
          sseBuffer = remaining;

          for (const evt of events) {
            if (evt.type === 'connected') continue;
            if (evt.type === 'log') {
              const logMessage = evt.data;
              if (logMessage === '[END]') {
                jobCompletedRef.current = true;
                if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
                if (logBufferRef.current.length > 0) {
                  const bufferedLogs = [...logBufferRef.current];
                  logBufferRef.current = [];
                  setLogs(prev => [...prev, ...bufferedLogs]);
                }
                abortController.abort();
                eventSourceRef.current = null;
                setIsStreaming(false);
                setIsConnected(false);
                return;
              }
              if (!receivedLogsRef.current.has(logMessage)) {
                receivedLogsRef.current.add(logMessage);
                if (receivedLogsRef.current.size > 10000) {
                  const arr = Array.from(receivedLogsRef.current);
                  receivedLogsRef.current = new Set(arr.slice(-5000));
                }
                const logType = logMessage.includes('[ERROR]') ? 'error' : 'log';
                logBufferRef.current.push({ type: logType, message: logMessage });
                if (!flushTimeoutRef.current) {
                  flushTimeoutRef.current = setTimeout(flushLogBuffer, 200);
                }
              }
            }
          }

          return reader.read().then(processChunk);
        };

        return reader.read().then(processChunk);
      })
      .catch(error => {
        if (error.name !== 'AbortError' && !jobCompletedRef.current) {
          console.error('SSE connection error:', error);
        }
        setIsConnected(false);
        setIsStreaming(false);
        eventSourceRef.current = null;
      });
  }, [taskId, flushLogBuffer, parseSSE]);

  // Disconnect from SSE stream
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.abort();
      eventSourceRef.current = null;
    }
    // Flush any remaining buffered logs
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    if (logBufferRef.current.length > 0) {
      const bufferedLogs = [...logBufferRef.current];
      logBufferRef.current = [];
      setLogs(prev => [...prev, ...bufferedLogs]);
    }
    setIsStreaming(false);
    setIsConnected(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [stopStreaming]);

  // Auto-start streaming if job is running, or load stored logs if completed
  useEffect(() => {
    if (isRunning && taskId && !isStreaming && !jobCompletedRef.current) {
      // Job is currently running - start real-time streaming
      // Don't restart if job already completed (received [END] marker)
      startStreaming();
    } else if (!isRunning && taskId) {
      // Job is completed - load stored logs from DB
      loadStoredLogs();
    }
  }, [isRunning, taskId, isStreaming, startStreaming, loadStoredLogs]);

  // Copy logs to clipboard
  const copyLogs = () => {
    const text = logs.map(l => l.message).join('\n');
    navigator.clipboard.writeText(text);
  };

  // Handle scroll to detect manual scrolling
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  // Get log line color based on type and content
  const getLogColor = (log) => {
    if (log.type === 'system') return '#8E8E93';
    if (log.type === 'error') return '#FF3B30';
    if (log.message.includes('ERROR') || log.message.includes('[ERROR]')) return '#FF3B30';
    if (log.message.includes('WARN') || log.message.includes('[WARN]')) return '#FF9500';
    if (log.message.includes('SUCCESS') || log.message.includes('Completed Successfully')) return '#34C759';
    return '#E5E5EA';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: '#2C2C2E',
          borderRadius: '12px 12px 0 0',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Connection status */}
          <Box
            sx={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#34C759' : '#8E8E93',
            }}
          />
          <Box sx={{ fontSize: '12px', color: '#8E8E93' }}>
            {isConnected ? t('connected') || 'Connected' : t('disconnected') || 'Disconnected'}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Auto-scroll toggle */}
          <Tooltip title={t('autoScroll') || 'Auto scroll'}>
            <IconButton
              size="small"
              onClick={() => setAutoScroll(!autoScroll)}
              sx={{
                color: autoScroll ? '#34C759' : '#8E8E93',
                '&:hover': { color: '#fff' }
              }}
            >
              <VerticalAlignBottomIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Copy logs */}
          <Tooltip title={t('copy') || 'Copy'}>
            <IconButton
              size="small"
              onClick={copyLogs}
              sx={{ color: '#8E8E93', '&:hover': { color: '#fff' } }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Log content */}
      <Box
        ref={logContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          backgroundColor: '#1C1C1E',
          padding: '12px',
          fontFamily: '"SF Mono", "Menlo", "Monaco", "Courier New", monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          overflowY: 'auto',
          overflowX: 'auto',
          borderRadius: '0 0 12px 12px',
          minHeight: '400px',
          maxHeight: '500px',
          scrollBehavior: 'auto', // Use 'auto' for programmatic scroll to avoid competing animations
        }}
      >
        {isLoadingStored ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <CircularProgress size={24} sx={{ color: '#8E8E93' }} />
          </Box>
        ) : logs.length > 0 ? (
          logs.map((log, index) => (
            <Box
              key={index}
              sx={{
                color: getLogColor(log),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              {log.message}
            </Box>
          ))
        ) : storedLogs ? (
          <Box sx={{ color: '#E5E5EA', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {storedLogs}
          </Box>
        ) : (
          <Box sx={{ color: '#8E8E93', textAlign: 'center', padding: '40px' }}>
            {taskId
              ? (t('noLogsYet') || 'No logs available.')
              : (t('selectJobToViewLogs') || 'Run a job to view logs.')}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default RealtimeLogViewer;
