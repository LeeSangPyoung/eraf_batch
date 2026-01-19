import { useEffect, useState } from 'react';
import { BASE_SOCKET_URL, LOGS_NSP, switchNamespace, socket } from './socket.jsx';

const useLogSocketIO = () => {
  const logSocket = switchNamespace(LOGS_NSP);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [shouldConnection, setShouldConnection] = useState(false);
  function onConnect() {
    console.log('Socket Connected');
    setIsConnected(true);
  }

  function onDisconnect() {
    console.log('Socket Disconnected');
    setIsConnected(false);
  }

  function offEvent() {
    logSocket.off('connect', onConnect);
    logSocket.off('disconnect', onDisconnect);
  }

  // Join Room to listen log event from server.
  function joinRoom(jobId) {
    if (jobId) {
      logSocket.emit('join', { room: jobId });
    }
  }

  useEffect(() => {
    if (shouldConnection) {
      logSocket.connect();
    } else {
      logSocket.disconnect();
    }
  }, [shouldConnection]);

  logSocket.on('connect', onConnect);
  logSocket.on('disconnect', onDisconnect);

  return {
    socket: logSocket,
    isConnected,
    setShouldConnection,
    joinRoom,
    offEvent,
  };
};

export default useLogSocketIO;
