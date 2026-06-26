import { io } from 'socket.io-client';
import { tokens } from '../utils/tokens.js';

let socket = null;
export const connectSocket = () => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(import.meta.env.VITE_CHAT_URL || '/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token: tokens.access() },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
};
export const disconnectSocket = () => { if (socket) socket.disconnect(); socket = null; };
