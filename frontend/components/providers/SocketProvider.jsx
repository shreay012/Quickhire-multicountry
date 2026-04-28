'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import chatSocketService from '@/lib/services/chatSocketService';
import { getCurrentUser } from '@/lib/utils/userHelpers';
import { useToast } from './ToastProvider';

const SocketContext = createContext({
  isConnected: false,
  notifications: [],
});

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userState, setUserState] = useState(null);
  const { showToast } = useToast();

  // Monitor localStorage for user changes
  useEffect(() => {
    const checkUser = () => {
      console.log('🔍 SocketProvider: checkUser called');
      const user = getCurrentUser();
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      console.log('   └─ User found:', !!user);
      console.log('   └─ Token found:', !!token);
      
      if (user && token) {
        console.log('✅ Setting userState - socket will connect');
        setUserState({ user, token });
      } else {
        console.log('⚠️ No user/token - clearing userState');
        setUserState(null);
      }
    };

    // Check initially
    checkUser();

    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkUser);
    
    // Custom event for same-tab login
    window.addEventListener('userLoggedIn', checkUser);

    return () => {
      window.removeEventListener('storage', checkUser);
      window.removeEventListener('userLoggedIn', checkUser);
    };
  }, []);

  useEffect(() => {
    console.log('🔌 SocketProvider: Checking for logged-in user...');
    console.log('   └─ User State:', userState);
    
    if (!userState) {
      console.log('⚠️ No user found, socket not connected');
      return;
    }

    const { user, token } = userState;

    console.log('✅ User found, connecting socket...');
    console.log('   └─ User ID:', user._id);
    
    // Connect socket for notifications
    chatSocketService.connect({
      baseUrl: 'http://localhost:5000',
      path: '/api/socket.io',
      roomId: user._id, // Use user ID as room ID
      userId: user._id,
      serviceId: null, // No service ID for login connection
      authToken: token,
      onNotificationReceived: (data) => {
        console.log('📬 NOTIFICATION RECEIVED (Global - Original Data):', data);
        
        console.log('🎨 About to call showToast with:', {
          type: data.type || 'general',
          title: data.title || 'New Notification',
          message: data.message || '',
          subtitle: data.projectTitle || data.serviceInfo || '',
          duration: 5000,
        });
        
        // Show toast notification
        showToast({
          type: data.type || 'general',
          title: data.title || 'New Notification',
          message: data.message || '',
          subtitle: data.projectTitle || data.serviceInfo || '',
          duration: 5000,
        });
          
          // Add to notifications array
          setNotifications(prev => [...prev, {
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
          }]);

          // Show browser notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title || 'New Notification', {
              body: data.message,
              icon: '/favicon.svg',
            });
          }
        },
        onMessageReceived: (data) => {
          // This receives transformed message data for chat updates
          console.log('💬 Chat message received (transformed):', data);
        },
        onConnected: () => {
          console.log('🟢 Socket connected on login');
          setIsConnected(true);
        },
        onDisconnected: () => {
          console.log('🔴 Socket disconnected');
          setIsConnected(false);
        },
        onError: (error) => {
          console.error('❌ Socket error:', error);
        },
      });

      // Request notification permission
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

    // Cleanup on unmount
    return () => {
      console.log('🔌 SocketProvider: Cleaning up socket connection...');
      // Don't disconnect here, let logout handle it
    };
  }, [userState]); // Re-run when userState changes (login/logout)

  return (
    <SocketContext.Provider value={{ isConnected, notifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
