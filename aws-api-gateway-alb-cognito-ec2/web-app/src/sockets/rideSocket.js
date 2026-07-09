import { io } from 'socket.io-client';
import { tokens } from '../utils/tokens.js';

/**
 * Socket.IO client for the ride-service. Separate connection from the chat
 * socket because they live on different paths in production (`/socket.io`
 * vs `/socket.io` — both services own that path on their own host).
 *
 * In dev Vite proxies `/api/v1/ride` to :4003 — we connect directly to the
 * ride service's port so the WebSocket upgrade goes to the right process.
 */
let socket = null;

export const connectRideSocket = () => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(import.meta.env.VITE_RIDE_URL || 'http://localhost:4003', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token: tokens.access() },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });
  return socket;
};

export const disconnectRideSocket = () => { if (socket) socket.disconnect(); socket = null; };
