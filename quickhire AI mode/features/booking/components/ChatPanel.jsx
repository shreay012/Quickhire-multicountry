"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import MessageInputBar from "./MessageInputBar";
import chatSocketService from "@/lib/services/chatSocketService";
import {
  getChatMessages,
  sendTextMessage,
  sendMessageWithAttachment,
  sendTypingStatus,
} from "@/lib/services/chatApi";
import {
  parseMessageData,
  getInitials,
  isMessageFromCurrentUser,
} from "@/lib/utils/chatHelpers";

const ChatPanel = ({
  projectTitle = "Development",
  serviceInfo = "Service Details",
  bookingId,
  adminId,
  serviceId,
  hourlyRate = "",
  currentUserId,
  authToken,
  // Socket.IO connects to the backend ORIGIN (path '/api/socket.io' is added separately).
  // Use NEXT_PUBLIC_BACKEND_URL (host without /api) so we don't end up with /api/api/socket.io.
  baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000",
  triggerSocketConnect = 0, // Trigger from parent component
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [manualConnect, setManualConnect] = useState(true); // Auto-connect socket on mount

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const hasInitialized = useRef(false);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Debug render state
  useEffect(() => {
    console.log(' ChatPanel render state:', {
      loading,
      error: !!error,
      messagesCount: messages.length,
      socketConnected,
      bookingId,
      serviceId
    });
  }, [loading, error, messages.length, socketConnected, bookingId, serviceId]);

  // Load chat messages
  const loadMessages = useCallback(async () => {
    if (!bookingId || !serviceId) {
      setError("Missing booking or service information");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine customerId: Use PM ID if assigned, otherwise use Service ID
      const customerId = adminId && adminId.trim() ? adminId : serviceId;

      console.log("🔄 Loading chat messages...");
      console.log("   BookingId:", bookingId);
      console.log("   AdminId (PM):", adminId || "Not assigned");
      console.log("   ServiceId:", serviceId);
      console.log("   ➡️ Using Customer ID:", customerId);

      const response = await getChatMessages(customerId, serviceId);

      if (response.success && response.data) {
        const parsedMessages = response.data
          .map((msg) => {
            const parsed = parseMessageData(msg);
            // Determine if message is from current user
            const isMine = isMessageFromCurrentUser(
              parsed.senderId,
              currentUserId,
            );
            parsed.isFromCurrentUser = isMine;

            // Debug log for message detection
            console.log("📧 Message parsing:", {
              id: parsed.id,
              from: parsed.senderName,
              senderId: parsed.senderId,
              senderIdType: typeof parsed.senderId,
              currentUserId: currentUserId,
              currentUserIdType: typeof currentUserId,
              isFromCurrentUser: isMine,
              text: parsed.message.substring(0, 30),
            });

            return parsed;
          })
          .sort((a, b) => a.timestamp - b.timestamp);

        // Filter out duplicates by id to prevent React key errors
        const uniqueMessages = parsedMessages.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);

        // Check if there are new messages (for polling)
        const hasNewMessages =
          uniqueMessages.length > messages.length ||
          (uniqueMessages.length > 0 &&
            lastMessageIdRef.current !==
              uniqueMessages[uniqueMessages.length - 1]?.id);

        if (hasNewMessages) {
          console.log(
            "✨ New messages detected:",
            uniqueMessages.length - messages.length,
          );
        }

        setMessages(uniqueMessages);

        // Store last message ID for comparison
        if (uniqueMessages.length > 0) {
          lastMessageIdRef.current =
            uniqueMessages[uniqueMessages.length - 1].id;
        }
        
        console.log('✅ Messages loaded:', uniqueMessages.length);
        console.log('📊 State after setMessages - loading:', false, 'messages.length:', uniqueMessages.length);
      } else {
        console.warn("⚠️ No messages found or backend not ready");
        setMessages([]);
      }
    } catch (err) {
      console.error("❌ Error loading messages:", err);

      // Don't show error for 500/404 - backend might not be ready yet
      if (err.response?.status === 500 || err.response?.status === 404) {
        console.warn(
          "⚠️ Backend chat endpoints not ready. Chat UI will still load.",
        );
        setError(null); // Clear error - let user try to send messages
        setMessages([]);
      } else {
        setError("Failed to load messages. Backend may not be ready yet.");
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  }, [bookingId, adminId, serviceId, currentUserId]);

  // Polling fallback when socket is disconnected
  useEffect(() => {
    // Only poll if socket is disconnected and we have required data
    if (!socketConnected && bookingId && serviceId) {
      console.log(
        "🔄 Socket disconnected - enabling polling fallback (every 5 seconds)",
      );

      // Poll every 5 seconds
      //   pollingIntervalRef.current = setInterval(() => {
      //     console.log('📡 Polling for new messages...');
      //     loadMessages();
      //   }, 5000);
    } else if (socketConnected) {
      console.log("✅ Socket connected - disabling polling");
      // Clear polling if socket connects
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [socketConnected, bookingId, serviceId, loadMessages]);

  // Initialize WebSocket connection
  const initializeSocket = useCallback(() => {
    if (!bookingId || !serviceId || !currentUserId) {
      console.warn("⚠️ Missing required data for socket connection");
      console.warn("   └─ bookingId:", bookingId);
      console.warn("   └─ serviceId:", serviceId);
      console.warn("   └─ currentUserId:", currentUserId);
      setError("Cannot connect socket: Missing booking/service/user ID");
      return;
    }

    if (!authToken || authToken === "Bearer test-token-123") {
      console.error("❌ Invalid or test auth token - Socket.IO will fail");
      console.error("   └─ Token:", authToken);
      setError(
        "Socket connection requires valid authentication token. Please login first.",
      );
      return;
    }

    console.log("🔌 Initializing socket connection...");
    console.log("   └─ Base URL:", baseUrl);
    console.log("   └─ Booking ID:", bookingId);
    console.log("   └─ Service ID:", serviceId);
    console.log("   └─ Current User ID:", currentUserId);
    console.log("   └─ Admin ID:", adminId || "Not assigned");
    console.log(
      "   └─ Auth Token:",
      authToken ? "Present (" + authToken.length + " chars)" : "Missing",
    );

    chatSocketService.connect({
      baseUrl,
      // Pass canonical backend roomId so the socket joins the same room
      // the REST endpoint will broadcast into.
      roomId: (adminId && adminId.trim() && adminId !== serviceId)
        ? `${adminId}_service_${serviceId}`
        : `service_${serviceId}_pending_${currentUserId}`,
      userId: currentUserId,
      serviceId, // kept for logging only; canonical roomId already includes it
      authToken,
      onMessageReceived: (data) => {
        console.log("📨 New message received via socket callback:", data);

        const newMessage = parseMessageData(data);
        // Use helper function for consistent comparison
        newMessage.isFromCurrentUser = isMessageFromCurrentUser(
          newMessage.senderId,
          currentUserId,
        );

        console.log("📝 Parsed socket message:", {
          id: newMessage.id,
          from: newMessage.senderName,
          senderId: newMessage.senderId,
          currentUserId: currentUserId,
          isFromCurrentUser: newMessage.isFromCurrentUser,
          text: newMessage.message.substring(0, 30),
        });

        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some(
            (msg) =>
              msg.id === newMessage.id ||
              msg.messageId === newMessage.messageId,
          );
          if (exists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }
          console.log("✅ Adding new message to chat");
          return [...prev, newMessage].sort(
            (a, b) => a.timestamp - b.timestamp,
          );
        });
      },
      onRefreshMessages: () => {
        console.log("🔄 Refresh messages callback triggered");
        loadMessages();
      },
      onConnected: () => {
        console.log("✅ Socket connected successfully");
        setSocketConnected(true);
      },
      onDisconnected: () => {
        console.log("❌ Socket disconnected");
        setSocketConnected(false);
      },
      onError: (error) => {
        console.error("❌ Socket error:", error);
        setSocketConnected(false);

        // Show user-friendly error message
        if (
          error.includes("Connection error") ||
          error.includes("connect_error")
        ) {
          setError(
            "Socket.IO server not responding. Check: \n1. Backend Socket.IO server is running\n2. Server is at: " +
              baseUrl +
              "/api/socket.io\n3. CORS is configured for localhost:3000\n\nUsing polling fallback for now.",
          );
        } else if (error.includes("Unauthorized") || error.includes("403")) {
          setError("Socket authentication failed. Token may be invalid.");
        } else {
          setError("Socket connection failed: " + error);
        }
      },
      onTypingStatusReceived: (senderId, isTyping, typingData) => {
        console.log("⌨️ Typing status received:", {
          senderId,
          isTyping,
          typingData,
        });

        // Only show typing indicator if it's from the admin/PM and they're typing
        if (senderId === adminId && isTyping) {
          setIsTyping(true);
          setTypingUser({
            name: typingData.userName || "PM",
            initials: getInitials(typingData.userName || "PM"),
          });

          // Clear previous timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }

          // Auto-hide typing indicator after 5 seconds
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingUser(null);
          }, 5000);
        } else if (senderId === adminId && !isTyping) {
          setIsTyping(false);
          setTypingUser(null);

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      },
    });
  }, [bookingId, serviceId, currentUserId, adminId, authToken, baseUrl]);

  // Load messages on mount
  // Load messages and auto-connect socket on mount
  useEffect(() => {
    loadMessages();

    // Auto-connect socket on mount (only once)
    if (
      !hasInitialized.current &&
      bookingId &&
      serviceId &&
      currentUserId &&
      authToken
    ) {
      console.log("🚀 Auto-connecting socket on component mount...");
      hasInitialized.current = true;
      // Delay socket init slightly to let messages load first
      setTimeout(() => {
        initializeSocket();
      }, 500);
    }

    return () => {
      // Cleanup socket on unmount
      // chatSocketService.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [
    loadMessages,
    bookingId,
    serviceId,
    currentUserId,
    authToken,
    initializeSocket,
  ]);

  // Initialize socket when manual connect is triggered
  useEffect(() => {
    if (manualConnect && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeSocket();
    }
  }, [manualConnect, initializeSocket]);

  // Watch for external trigger to connect socket (from test page button)
  useEffect(() => {
    if (triggerSocketConnect > 0) {
      console.log(
        "🔔 External socket connection trigger received (count:",
        triggerSocketConnect,
        ")",
      );
      handleConnectSocket();
    }
  }, [triggerSocketConnect]);

  // Manual socket connection handler
  const handleConnectSocket = () => {
    console.log("🔘 Manual socket connection requested");
    console.log("   └─ Booking ID:", bookingId);
    console.log("   └─ Service ID:", serviceId);
    console.log("   └─ User ID:", currentUserId);
    console.log("   └─ Auth Token:", authToken ? "Present" : "Missing");
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setManualConnect(true);
    }
  };

  // Handle sending text message
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    try {
      // Determine customerId: Use PM ID if assigned, otherwise use Service ID
      const customerId = adminId && adminId.trim() ? adminId : serviceId;
      const firstMsg = !adminId || !adminId.trim() ? 1 : null;

      console.log("📤 Sending message...");
      console.log("   Message:", messageText);
      console.log("   BookingId:", bookingId);
      console.log("   ServiceId:", serviceId);
      console.log("   AdminId (PM):", adminId || "Not assigned");
      console.log("   ➡️ Using Customer ID:", customerId);
      console.log("   FirstMsg:", firstMsg);

      // Optimistic UI update
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        senderName: "You",
        senderInitials: getInitials("You"),
        senderId: currentUserId, // Add senderId for proper matching
        message: messageText,
        timestamp: new Date(),
        isFromCurrentUser: true,
        msgType: 0,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Send via API with customerId (PM ID or Service ID)
      const response = await sendTextMessage(
        customerId,
        messageText,
        serviceId,
        firstMsg,
      );

      if (response.success && response.data) {
        // Replace optimistic message with actual message
        const actualMessage = parseMessageData(response.data);
        actualMessage.isFromCurrentUser = true;

        setMessages((prev) =>
          prev
            .filter((msg) => msg.id !== optimisticMessage.id)
            .concat(actualMessage)
            .sort((a, b) => a.timestamp - b.timestamp),
        );

        // Send via socket for real-time delivery
        if (socketConnected) {
          chatSocketService.sendMessage({
            message: messageText,
            recipientId: adminId || serviceId,
            roomId: response.data.chatId?.toString() || bookingId,
            serviceId,
          });
        }

        console.log("✅ Message sent successfully");
        setError(null); // Clear any previous errors
      } else {
        // Remove optimistic message on failure
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== optimisticMessage.id),
        );
        setError("Failed to send message - backend may not be ready");
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);

      // Check if it's a backend error (500/404)
      if (err.response?.status === 500 || err.response?.status === 404) {
        console.warn(
          "⚠️ Backend not ready. Keeping message in UI for demo purposes.",
        );
        // Keep the optimistic message for UI demo
        setError("Backend not ready - message shown for UI demo only");
      } else {
        // Remove optimistic message only for other errors
        setMessages((prev) =>
          prev.filter((msg) => !msg.id.startsWith("temp_")),
        );
        setError("Failed to send message. Please check your connection.");
      }
    }
  };

  // Handle sending attachment
  const handleSendAttachment = async (file) => {
    if (!file) return;

    try {
      // Determine customerId: Use PM ID if assigned, otherwise use Service ID
      const customerId = adminId && adminId.trim() ? adminId : serviceId;
      const firstMsg = !adminId || !adminId.trim() ? 1 : null;

      console.log("📎 Sending attachment...");
      console.log("   File:", file.name);
      console.log("   ServiceId:", serviceId);
      console.log("   AdminId (PM):", adminId || "Not assigned");
      console.log("   ➡️ Using Customer ID:", customerId);

      const response = await sendMessageWithAttachment(
        customerId,
        file,
        serviceId,
        "",
        1,
        firstMsg,
      );

      if (response.success && response.data) {
        const newMessage = parseMessageData(response.data);
        newMessage.isFromCurrentUser = true;

        setMessages((prev) =>
          [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp),
        );

        console.log("✅ Attachment sent successfully");
      } else {
        setError("Failed to send attachment");
      }
    } catch (err) {
      console.error("❌ Error sending attachment:", err);
      setError("Failed to send attachment. Please try again.");
    }
  };

  // Handle typing status change
  const handleTypingChange = async (isTyping) => {
    if (!socketConnected) return;

    try {
      // Determine customerId: Use PM ID if assigned, otherwise use Service ID
      const customerId = adminId && adminId.trim() ? adminId : serviceId;

      // Send via socket
      chatSocketService.sendTypingStatus(isTyping, serviceId);

      // Also send via API using customerId
      await sendTypingStatus(customerId, isTyping, serviceId);
    } catch (err) {
      console.error("❌ Error sending typing status:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Security Banner */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              <Image
                src="/images/verifyIcon.svg"
                alt="Verified"
                width={20}
                height={20}
              />
            </div>
            <p className="text-sm text-gray-700">
              Secure & Protected
            </p>
          </div>
          <p className="text-[10px] sm:text-[11px] md:text-[12px] font-normal mt-0.5" style={{ color: '#909090' }}>
            Your conversations are encrypted and your data is always safe with
            us.
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#45A735]" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col justify-center items-center h-full text-gray-500">
            <p className="text-base font-normal text-gray-600">
              No messages yet.
            </p>
            <p className="text-base font-normal text-gray-600 mt-1">
              Start the conversation!
            </p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromCurrentUser={message.isFromCurrentUser}
              />
            ))}

            {isTyping && typingUser && (
              <TypingIndicator
                senderName={typingUser.name}
                senderInitials={typingUser.initials}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      <MessageInputBar
        onSendMessage={handleSendMessage}
        onSendAttachment={handleSendAttachment}
        onTypingChange={handleTypingChange}
        disabled={loading}
      />
    </div>
  );
};

export default ChatPanel;
