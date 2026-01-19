// @ts-nocheck
import { io } from 'socket.io-client';

export const BASE_SOCKET_URL = import.meta.env.VITE_WEB_SOCKET_URL;
export const LOGS_NSP = '/logs';

export const socket = io(BASE_SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 3,
  reconnectionDelay: 10000,
});

export function switchNamespace(namespace) {
  // socket.close();
  var newSocket = socket.io.socket(namespace);
  newSocket.connect();
  return newSocket;
}
