'use client';

import React, { useState } from 'react';
import ChatPanel from '@/features/booking/components/ChatPanel';

/**
 * Chat Test Page
 * Use this page to test the chat functionality with mock data
 * Navigate to: /test-chat
 */
const TestChatPage = () => {
  // Valid 24-character MongoDB ObjectId format (hexadecimal)
  const [bookingId, setBookingId] = useState('65a1b2c3d4e5f678901234ab');
  const [adminId, setAdminId] = useState('65a1b2c3d4e5f678901234cd');
  const [serviceId, setServiceId] = useState('65a1b2c3d4e5f678901234ef');
  const [currentUserId, setCurrentUserId] = useState('65a1b2c3d4e5f678901234ff');
  const [authToken, setAuthToken] = useState('Bearer test-token-123');
  const [showChat, setShowChat] = useState(false);
  const [triggerSocketConnect, setTriggerSocketConnect] = useState(0); // Trigger for socket connection

  const loadFromLocalStorage = () => {
    try {
      // Get token from your auth system
      const token = localStorage.getItem('token');
      const guestToken = localStorage.getItem('guestToken');
      const userStr = localStorage.getItem('user');

      let userId = '';
      let formattedToken = '';

      // Parse user info
      if (userStr) {
        const userResponse = JSON.parse(userStr);
        // Handle nested structure: {"success": true, "data": {...}}
        const user = userResponse.data || userResponse;
        userId = user._id || user.id || user.userId || '';
        console.log('👤 Loaded user ID:', userId);
      }

      // Use token or guestToken
      const actualToken = token || guestToken;
      if (actualToken) {
        // Add Bearer prefix if not present
        formattedToken = actualToken.startsWith('Bearer ') 
          ? actualToken 
          : `Bearer ${actualToken}`;
      }

      setCurrentUserId(userId);
      setAuthToken(formattedToken);

      console.log('✅ Loaded from localStorage:', {
        userId,
        tokenLength: formattedToken.length,
        hasToken: !!actualToken,
      });

      alert(`Loaded successfully!\nUser ID: ${userId}\nToken: ${formattedToken.substring(0, 30)}...`);
    } catch (err) {
      console.error('❌ Error loading from localStorage:', err);
      alert('Error loading from localStorage: ' + err.message);
    }
  };

  const saveToLocalStorage = () => {
    try {
      // Save in the format your auth system expects
      const user = { _id: currentUserId, id: currentUserId, userId: currentUserId };
      localStorage.setItem('user', JSON.stringify(user));
      
      // Remove 'Bearer ' prefix before saving if present
      const tokenToSave = authToken.startsWith('Bearer ') 
        ? authToken.substring(7) 
        : authToken;
      localStorage.setItem('token', tokenToSave);

      console.log('✅ Saved to localStorage:', {
        userId: currentUserId,
        token: tokenToSave,
      });

      alert('Saved to localStorage successfully!');
    } catch (err) {
      console.error('❌ Error saving to localStorage:', err);
      alert('Error saving to localStorage: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chat Test Page</h1>
          <p className="text-gray-600 mb-6">
            Configure the chat parameters below and click "Show Chat" to test the functionality.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Booking ID</label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter booking ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin ID (PM)
                <span className="text-xs text-gray-500 ml-2">(Leave empty if PM not assigned)</span>
              </label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin/PM ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service ID</label>
              <input
                type="text"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter service ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current User ID</label>
              <input
                type="text"
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your user ID"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Auth Token</label>
              <input
                type="text"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter auth token (Bearer ...)"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTriggerSocketConnect(prev => prev + 1)}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors font-semibold"
            >
              🔌 Connect Socket
            </button>
            <button
              onClick={() => setShowChat(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Show Chat
            </button>
            <button
              onClick={() => setShowChat(false)}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Hide Chat
            </button>
            <button
              onClick={loadFromLocalStorage}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Load from LocalStorage
            </button>
            <button
              onClick={saveToLocalStorage}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Save to LocalStorage
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure your backend is running at the configured URL</li>
              <li>• IDs must be valid 24-character MongoDB ObjectIds (hexadecimal)</li>
              <li>• Check browser console for debug logs (🔌, 📨, 📤, etc.)</li>
              <li>• The green/red dot indicates Socket.IO connection status</li>
              <li>• If PM is not assigned, leave Admin ID empty</li>
              <li>• Auth token should start with "Bearer " for Socket.IO auth</li>
            </ul>
          </div>
        </div>

        {showChat && (
          <div className="h-[700px]">
            <ChatPanel
              projectTitle="Test Project"
              serviceInfo="Test Service | Testing"
              bookingId={bookingId}
              adminId={adminId}
              serviceId={serviceId}
              hourlyRate="$50/hr"
              currentUserId={currentUserId}
              authToken={authToken}
              baseUrl={process.env.NEXT_PUBLIC_API_URL}
              triggerSocketConnect={triggerSocketConnect}
            />
          </div>
        )}

        {!showChat && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-24 w-24 mx-auto mb-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Chat Hidden</h2>
            <p className="text-gray-500">Configure the parameters above and click "Show Chat" to test.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestChatPage;
