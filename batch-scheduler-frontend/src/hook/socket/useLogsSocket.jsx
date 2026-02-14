import { useEffect, useState } from 'react';
import { BASE_SOCKET_URL, LOGS_NSP, switchNamespace, socket } from './socket.jsx';

const useLogSocketIO = () => {
  const logSocket = switchNamespace(LOGS_NSP);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [shouldConnection, setShouldConnection] = useState(false);

  // Join Room to listen log event from server.
  function joinRoom(jobId) {
    if (jobId) {
      logSocket.emit('join', { room: jobId });
    }
  }

  // [H10] Register listeners inside useEffect with proper cleanup to prevent memory leaks
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    logSocket.on('connect', onConnect);
    logSocket.on('disconnect', onDisconnect);

    return () => {
      logSocket.off('connect', onConnect);
      logSocket.off('disconnect', onDisconnect);
    };
  }, [logSocket]);

  useEffect(() => {
    if (shouldConnection) {
      logSocket.connect();
    } else {
      logSocket.disconnect();
    }
  }, [shouldConnection, logSocket]);

  function offEvent() {
    // No-op: cleanup is handled by useEffect
  }

  return {
    socket: logSocket,
    isConnected,
    setShouldConnection,
    joinRoom,
    offEvent,
  };
};

export default useLogSocketIO;
