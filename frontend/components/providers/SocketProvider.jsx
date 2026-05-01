'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import chatSocketService from '@/lib/services/chatSocketService';
import { getCurrentUser } from '@/lib/utils/userHelpers';
import { useToast } from './ToastProvider';

// Resolve socket base URL from environment — NEVER hardcode localhost
const SOCKET_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin) ||
  'http://localhost:4000';

const SocketContext = createContext({
  isConnected: false,
  notifications: [],
});

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userState, setUserState] = useState(null);
  const { showToast } = useToast();

  // Monitor localStorage for user changes (login / logout)
  // SOCKET_RECONNECT_FIX_V1: only update userState when the underlying identity
  // actually changes (user._id or token string). Previously every checkUser
  // call produced a new object reference, which made the connect-effect below
  // re-run on every storage event and clobbered ChatPanel's onMessageReceived
  // callback — so chat messages stopped appearing on the chat screen.
  useEffect(() => {
    const checkUser = () => {
      const user = getCurrentUser();
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      setUserState((prev) => {
        if (!user || !token) return prev === null ? prev : null;
        const nextId = user?._id || user?.id;
        const prevId = prev?.user?._id || prev?.user?.id;
        if (prev && prevId === nextId && prev.token === token) {
          return prev; // identity unchanged → keep ref stable, no reconnect
        }
        return { user, token };
      });
    };

    checkUser();

    window.addEventListener('storage', checkUser);
    window.addEventListener('userLoggedIn', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLoggedIn', checkUser);
    };
  }, []);

  // Connect / reconnect whenever userState changes
  useEffect(() => {
    if (!userState) return;

    const { user, token } = userState;

    chatSocketService.connect({
      baseUrl: SOCKET_BASE_URL,
      path: '/api/socket.io',
      roomId: user._id,
      userId: user._id,
      serviceId: null,
      authToken: token,

      onNotificationReceived: (data) => {
        showToast({
          type: data.type || 'general',
          title: data.title || 'New Notification',
          message: data.message || '',
          subtitle: data.projectTitle || data.serviceInfo || '',
          duration: 5000,
        });

        setNotifications((prev) => [
          ...prev,
          {
            id: data.messageId || Date.now(),
            type: data.type,
            title: data.title,
            message: data.message,
            route: data.route,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            serviceId: data.serviceId,
            createdAt: new Date(),
            read: false,
          },
        ]);

        // Browser push notification (only if permission already granted)
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(data.title || 'New Notification', {
            body: data.message,
            icon: '/favicon.svg',
          });
        }
      },

      // SOCKET_CALLBACK_PRESERVE_FIX_V1: don't pass onMessageReceived /
      // onError here. chatSocketService preserves any existing callback when
      // the new config omits it — that lets ChatPanel keep its own message
      // handler across SocketProvider reconnects.

      onConnected: () => {
        setIsConnected(true);
      },

      onDisconnected: () => {
        setIsConnected(false);
      },
    });

    // Request browser notification permission on first connect
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission();
    }

    // Cleanup handled by logout flow, not unmount, to prevent ghost disconnects
  }, [userState]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SocketContext.Provider value={{ isConnected, notifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
