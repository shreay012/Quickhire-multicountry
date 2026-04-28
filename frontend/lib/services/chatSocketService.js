import { io } from 'socket.io-client';

/**
 * Chat WebSocket Service
 * Manages real-time chat connections using Socket.IO
 */
class ChatSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentRoomId = null;
    this.currentUserId = null;
    this.baseUrl = null;
    this.callbacks = {
      onMessageReceived: null,
      onConnected: null,
      onDisconnected: null,
      onError: null,
      onTypingStatusReceived: null,
      onMessageSeen: null,
      onNotificationReceived: null, // Global notification callback (persists across reconnections)
    };
  }

  /**
   * Connect to Socket.IO server
   * @param {Object} config - Connection configuration
   */
  connect(config) {
    const {
      baseUrl,
      roomId,
      userId,
      serviceId,
      authToken,
      ticketId, // Add ticketId for ticket chat
      onMessageReceived,
      onConnected,
      onDisconnected,
      onError,
      onTypingStatusReceived,
      onMessageSeen,
    } = config;

    // Check if already connected to the same room
    if (this.socket && this.isConnected && this.currentRoomId === roomId && this.currentUserId === userId) {
      console.log('✅ CHAT SOCKET: Already connected to same room, skipping reconnection');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔌 CHAT SOCKET CONNECTION ATTEMPT');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔗 Connection Parameters:');
    console.log('   └─ Base URL:', baseUrl);
    console.log('   └─ Original Room ID:', roomId);
    console.log('   └─ User ID:', userId);
    console.log('   └─ Service ID:', serviceId);
    console.log('   └─ Auth Token:', authToken ? 'Present (' + authToken.length + ' chars)' : 'Missing');

    // Store configuration
    this.baseUrl = baseUrl;
    this.currentUserId = userId;
    
    // Preserve existing onNotificationReceived if not provided in new config
    // This ensures global notification handler persists across chat reconnections
    const preservedNotificationCallback = this.callbacks.onNotificationReceived;
    
    this.callbacks = {
      onMessageReceived,
      onConnected,
      onDisconnected,
      onError,
      onTypingStatusReceived,
      onMessageSeen,
      onRefreshMessages: config.onRefreshMessages,
      onNotificationReceived: config.onNotificationReceived || preservedNotificationCallback,
    };
    
    if (!config.onNotificationReceived && preservedNotificationCallback) {
      console.log('✅ Preserved global notification callback from previous connection');
    }

    // Build room ID with service ID — but only if caller passed a non-canonical id.
    // Canonical backend rooms already contain `_service_` or `_pending_`.
    const isCanonical = typeof roomId === 'string' && (roomId.includes('_service_') || roomId.includes('_pending_'));
    const actualRoomId = isCanonical || !serviceId ? roomId : `${roomId}_service_${serviceId}`;
    this.currentRoomId = actualRoomId;

    console.log('   └─ Actual Room ID:', actualRoomId);

    // Disconnect previous socket if exists
    if (this.socket) {
      console.log('🔄 Disconnecting previous socket...');
      this.socket.disconnect();
      this.socket = null;
    }

    // Prepare Socket.IO options
    const socketOptions = {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'], // Try both transports
      autoConnect: true, // Changed to true for immediate connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000, // 10 second timeout
    };

    // Add auth token if provided
    if (authToken) {
      const cleanToken = authToken.startsWith('Bearer ') ? authToken.substring(7) : authToken;
      socketOptions.query = { token: cleanToken };
      socketOptions.auth = { token: cleanToken };
      console.log('✅ Added token authentication (length: ' + cleanToken.length + ')');
    } else {
      console.warn('⚠️ No auth token provided - connection may fail');
    }

    console.log('🔧 Socket options:', {
      path: socketOptions.path,
      transports: socketOptions.transports,
      hasAuth: !!socketOptions.auth,
    });

    // Create socket instance
    try {
      this.socket = io(baseUrl, socketOptions);
      console.log('✅ Socket instance created');
    } catch (err) {
      console.error('❌ Failed to create socket instance:', err);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to create socket: ' + err.message);
      }
      return;
    }

    // Setup event listeners
    this._setupEventListeners(actualRoomId, userId, ticketId);
  }

  /**
   * Setup Socket.IO event listeners
   * @private
   */
  _setupEventListeners(roomId, userId, ticketId) {
    // Connection successful
    this.socket.on('connect', () => {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ CHAT SOCKET CONNECTED SUCCESSFULLY!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 Connection Details:');
      console.log('   └─ Socket ID:', this.socket.id);
      console.log('   └─ Room ID:', roomId);
      console.log('   └─ Transport:', this.socket.io.engine.transport.name);
      console.log('📡 Listening for incoming messages on channels:');
      console.log('   ├─ new-message (PRIMARY - matches Flutter)');
      console.log('   ├─ new_message (underscore variant)');
      console.log('   ├─ message (fallback)');
      console.log('   ├─ chat-message (fallback)');
      console.log('   ├─ receive-message (fallback)');
      console.log('   └─ notification:new (backend notification format)');
      console.log('📡 Also listening for: user_typing, message_seen');

      this.isConnected = true;

      // Emit canonical chat:join (preferred by backend) AND legacy aliases
      if (ticketId) {
        console.log('📤 Emitting join-ticket-room:', { ticketId });
        this.socket.emit('join-ticket-room', { ticketId });
      } else if (roomId) {
        console.log('📤 Emitting chat:join + join-room:', roomId);
        this.socket.emit('chat:join', { roomId }, (ack) => {
          console.log('📥 chat:join ack:', ack);
        });
        this.socket.emit('join-room', roomId);
      } else {
        console.log('ℹ️ No room ID or ticket ID - skipping room join');
      }

      // Emit user_online status
      const userIdNum = parseInt(userId) || userId;
      console.log('📤 Emitting user_online:', userIdNum);
      this.socket.emit('user_online', userIdNum);

      // Emit join_user_room
      console.log('📤 Emitting join_user_room:', userIdNum);
      this.socket.emit('join_user_room', userIdNum);

      // Call connected callback
      if (this.callbacks.onConnected) {
        this.callbacks.onConnected();
      }
    });

    // Disconnection
    this.socket.on('disconnect', () => {
      console.log('❌ CHAT SOCKET: Disconnected');
      this.isConnected = false;

      if (this.callbacks.onDisconnected) {
        this.callbacks.onDisconnected();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ CHAT SOCKET: Connection error:', error);
      console.error('   └─ Error message:', error.message);
      console.error('   └─ Error type:', error.type);
      console.error('   └─ Error description:', error.description);
      console.error('   └─ Base URL:', this.baseUrl);
      console.error('   └─ Socket path: /api/socket.io');
      this.isConnected = false;

      if (this.callbacks.onError) {
        this.callbacks.onError(`Connection error: ${error.message}`);
      }
    });

    // General error
    this.socket.on('error', (error) => {
      console.error('❌ CHAT SOCKET: General error:', error);

      if (this.callbacks.onError) {
        this.callbacks.onError(`Socket error: ${error}`);
      }
    });

    // Listen for 'new-message' event (PRIMARY - matches Flutter)
    this.socket.on('new-message', (data) => {
      console.log('🔔 NEW MESSAGE RECEIVED on "new-message" event (PRIMARY)!');
      console.log('📨 Message data:', data);

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for 'message:new' event (canonical backend event)
    this.socket.on('message:new', (data) => {
      console.log('🔔 NEW MESSAGE RECEIVED on "message:new" event (canonical)!');
      console.log('📨 Message data:', data);

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for 'new_message' event (underscore variant - Flutter fallback)
    this.socket.on('new_message', (data) => {
      console.log('🔔 NEW MESSAGE RECEIVED on "new_message" event (underscore variant)!');
      console.log('📨 Message data:', data);

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for 'message' event (Flutter fallback)
    this.socket.on('message', (data) => {
      console.log('🔔 NEW MESSAGE RECEIVED on "message" event (fallback)!');
      console.log('📨 Message data:', data);

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for 'chat-message' event (Flutter fallback)
    this.socket.on('chat-message', (data) => {
      console.log('🔔 NEW MESSAGE RECEIVED on "chat-message" event (fallback)!');
      console.log('📨 Message data:', data);

      if (this.callbacks.onMessageReceived) {
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for 'receive-message' event (TICKET MESSAGES - Primary for tickets)
    this.socket.on('receive-message', (data) => {
      console.log('🔔 RECEIVE MESSAGE on "receive-message" event!');
      console.log('📨 Message data:', data);
      console.log('   └─ Has ticketId?:', !!data.ticketId);

      // Only process if callback exists
      if (this.callbacks.onMessageReceived) {
        // If it has ticketId, it's a ticket message - always process
        // If no ticketId, it might be regular chat - process for compatibility
        this.callbacks.onMessageReceived(data);
      }
    });

    // Listen for notification:new event (backend notification format)
    this.socket.on('notification:new', (data) => {
      console.log('🔔 NOTIFICATION RECEIVED on "notification:new" event!');

      // 🔑 Fire global window event so Header badge + NotificationDrawer update
      // regardless of which component is mounted
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('newNotification', { detail: data }));
      }

      // FIRST: Call notification callback with original data (for toasts, etc.)
      if (this.callbacks.onNotificationReceived) {
        console.log('📢 Calling onNotificationReceived callback with original data');
        this.callbacks.onNotificationReceived(data);
      }

      // THEN: If it's a chat notification, trigger message refresh
      if (data.type === 'chat' && data.route === '/chat') {
        console.log('✅ Chat notification detected - triggering message refresh');
        
        // Call the message received callback with parsed data
        if (this.callbacks.onMessageReceived) {
          // Transform notification to message format
          const messageData = {
            _id: data.messageId,
            id: data.messageId,
            msg: data.message,
            message: data.message,
            senderId: data.fromUserId,
            senderName: data.title || 'User',
            serviceId: data.serviceId,
            createdAt: new Date().toISOString(),
            msg_from: {
              _id: data.fromUserId,
              name: data.title || 'User',
              role: 'customer',
            },
            msg_to: {
              _id: data.toUserId,
              name: 'You',
              role: 'customer',
            },
            msg_type: 0,
            is_read: 0,
          };
          
          console.log('📤 Emitting parsed message to callback:', messageData);
          this.callbacks.onMessageReceived(messageData);
        }

        // Also trigger refresh if callback exists
        if (this.callbacks.onRefreshMessages) {
          console.log('🔄 Triggering message refresh callback');
          this.callbacks.onRefreshMessages();
        }
      }
    });

    // Listen for typing status (canonical 'typing' + legacy 'user_typing')
    const typingListener = (data) => {
      console.log('⌨️ TYPING STATUS RECEIVED:', data);
      if (this.callbacks.onTypingStatusReceived) {
        const senderId = data.senderId || data.userId;
        const { isTyping, ...rest } = data;
        this.callbacks.onTypingStatusReceived(senderId, isTyping, rest);
      }
    };
    this.socket.on('user_typing', typingListener);
    this.socket.on('typing', typingListener);

    // Listen for message seen
    this.socket.on('message_seen', (data) => {
      console.log('👁️ MESSAGE SEEN EVENT:', data);

      if (this.callbacks.onMessageSeen) {
        this.callbacks.onMessageSeen(data);
      }
    });
  }

  /**
   * Send a message via socket
   * @param {Object} messageData - Message data
   */
  sendMessage(messageData) {
    const { message, recipientId, roomId, serviceId } = messageData;

    if (!this.isConnected) {
      console.warn('⚠️ CHAT SOCKET: Not connected, cannot send message');
      return;
    }

    console.log('📤 CHAT SOCKET: Emitting send-message');
    console.log('   └─ Room ID:', roomId);
    console.log('   └─ Recipient:', recipientId);
    console.log('   └─ Service ID:', serviceId);

    this.socket.emit('send-message', {
      roomId,
      message,
      recipientId,
      serviceId,
    });
  }

  /**
   * Send a ticket message via socket
   * @param {Object} messageData - Ticket message data
   */
  sendTicketMessage(messageData) {
    const { ticketId, message, token } = messageData;

    if (!this.isConnected) {
      console.warn('⚠️ CHAT SOCKET: Not connected, cannot send ticket message');
      return false;
    }

    console.log('📤 CHAT SOCKET: Emitting send-ticket-message');
    console.log('   └─ Ticket ID:', ticketId);
    console.log('   └─ Message:', message);

    this.socket.emit('send-ticket-message', {
      ticketId,
      message,
      timestamp: new Date().toISOString().slice(0, -1), // Remove 'Z' from end
      token,
    });

    return true;
  }

  /**
   * Send typing status
   * @param {boolean} isTyping - Typing status
   * @param {string} serviceId - Service ID
   */
  sendTypingStatus(isTyping, serviceId) {
    if (!this.isConnected) {
      console.warn('⚠️ CHAT SOCKET: Not connected, cannot send typing status');
      return;
    }

    console.log('📤 CHAT SOCKET: Emitting typing status:', isTyping);

    this.socket.emit('user_typing', {
      isTyping,
      serviceId,
      userId: this.currentUserId,
    });
  }

  /**
   * Disconnect from socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 CHAT SOCKET: Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRoomId = null;
      this.currentUserId = null;
    }
  }

  /**
   * Check if socket is connected
   */
  getIsConnected() {
    return this.isConnected;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId() {
    return this.currentRoomId;
  }
}

// Export singleton instance
export default new ChatSocketService();
