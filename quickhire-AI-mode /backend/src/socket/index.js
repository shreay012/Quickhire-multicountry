import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { pubClient, subClient } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { registerChatHandlers } from '../modules/chat/chat.socket.js';
import { connectedSockets } from '../config/metrics.js';

let io;

export function attachSocketIO(httpServer) {
  io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: {
      origin: env.ALLOWED_ORIGINS === '*' ? true : env.ALLOWED_ORIGINS.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const claims = jwt.verify(token, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
      socket.data.user = { id: claims.sub, role: claims.role, sessionId: claims.sessionId };
      next();
    } catch (e) {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.data.user;
    socket.join(`user_${userId}`);
    if (role === 'admin') socket.join('role_admin');

    connectedSockets.inc();
    socket.emit('connected', { userId, role, serverTime: new Date().toISOString() });
    logger.info({ userId, role, sid: socket.id }, 'socket connected');

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      connectedSockets.dec();
      logger.info({ userId, sid: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/** Helper for HTTP handlers to emit to a user/room. */
export function emitTo(target, event, payload) {
  if (!io) return;
  io.to(target).emit(event, payload);
}
