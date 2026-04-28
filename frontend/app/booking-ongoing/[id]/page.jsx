'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import ChatPanel from '@/features/booking/components/ChatPanel';
import BookingTimeline from '@/features/booking/components/BookingTimeline';
import { bookingService } from '@/lib/services/bookingApi';
import chatSocketService from '@/lib/services/chatSocketService';
import { getCurrentUser } from '@/lib/utils/userHelpers';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  assigned_to_pm: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-200 text-gray-800',
  cancelled: 'bg-red-100 text-red-700',
};

function formatStatus(status) {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

const BookingOngoingTab = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  const bookingId = params?.id || searchParams.get('bookingId');
  const queryServiceId = searchParams.get('serviceId');

  const [activeTab, setActiveTab] = useState('ongoing');
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const currentUser =
    typeof window !== 'undefined' ? getCurrentUser() : null;
  const currentUserId = currentUser?._id || null;
  const authToken =
    typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;

  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bookingService.getBookingById(bookingId);
      const data = res?.data?.data || res?.data || null;
      setBookingData(data);
    } catch (e) {
      console.error('Failed to load booking', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId, queryServiceId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Real-time booking status updates via the existing socket connection.
  useEffect(() => {
    const sock = chatSocketService.socket;
    if (!sock || !bookingId) return undefined;
    const onStatus = (payload) => {
      if (!payload || String(payload.bookingId) !== String(bookingId)) return;
      setBookingData((prev) => (prev ? { ...prev, status: payload.status } : prev));
      // refresh timeline so the new history entry shows up
      loadBooking();
    };
    sock.on('booking:status', onStatus);
    return () => sock.off('booking:status', onStatus);
  }, [bookingId, loadBooking]);

  const handleCancel = async () => {
    if (!bookingId) return;
    const reason = window.prompt('Reason for cancellation?');
    if (!reason) return;
    try {
      setActionBusy('cancel');
      await bookingService.cancelBooking(bookingId, reason);
      await loadBooking();
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionBusy(null);
    }
  };

  const handleExtend = async () => {
    if (!bookingId || !bookingData) return;
    const hoursRaw = window.prompt('Additional hours?', '4');
    const additionalHours = Number(hoursRaw);
    if (!additionalHours || additionalHours <= 0) return;
    const currentEnd = bookingData.endTime ? new Date(bookingData.endTime) : new Date();
    const newEndTime = new Date(currentEnd.getTime() + additionalHours * 3600_000).toISOString();
    try {
      setActionBusy('extend');
      await bookingService.extendBooking(bookingId, { additionalHours, newEndTime });
      await loadBooking();
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to extend booking');
    } finally {
      setActionBusy(null);
    }
  };

  if (!bookingId) {
    return <div className="p-6 text-gray-600">Missing booking id.</div>;
  }
  if (loading && !bookingData) {
    return <div className="p-6 text-gray-600">Loading booking…</div>;
  }
  if (error && !bookingData) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  const status = bookingData?.status || 'pending';
  const projectTitle = bookingData?.projectTitle || bookingData?.requirements || 'Your Booking';
  const duration = bookingData?.duration ? `${bookingData.duration} Hours` : '';
  const serviceInfo = duration ? `${duration}` : 'Service';
  const isCancellable = ['pending', 'confirmed', 'assigned_to_pm'].includes(status);
  const isExtendable = ['confirmed', 'assigned_to_pm', 'in_progress'].includes(status);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{projectTitle}</h1>
              <p className="text-gray-600">{serviceInfo}</p>
              <div className="flex gap-4 mt-3 flex-wrap">
                <span className="text-sm text-gray-500">Booking ID: {bookingId}</span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-700'}`}>
                  {formatStatus(status)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {isExtendable && (
                <button
                  onClick={handleExtend}
                  disabled={actionBusy === 'extend'}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionBusy === 'extend' ? 'Extending…' : 'Extend hours'}
                </button>
              )}
              {isCancellable && (
                <button
                  onClick={handleCancel}
                  disabled={actionBusy === 'cancel'}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {actionBusy === 'cancel' ? 'Cancelling…' : 'Cancel booking'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('ongoing')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'ongoing'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Panel - Booking Details */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Booking Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Service</p>
                  <p className="font-medium text-gray-800">{serviceInfo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${STATUS_BADGE[status] || 'bg-gray-100 text-gray-700'}`}>
                    {formatStatus(status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="font-medium text-gray-800">{fmtDate(bookingData?.startTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="font-medium text-gray-800">{fmtDate(bookingData?.endTime)}</p>
                </div>
                {bookingData?.pricing?.total != null && (
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium text-[#45A735]">
                      ₹{Number(bookingData.pricing.total).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Chat / History */}
          <div className="lg:col-span-2">
            <div className="h-[600px]">
              {activeTab === 'ongoing' && (
                <ChatPanel
                  projectTitle={projectTitle}
                  serviceInfo={serviceInfo}
                  bookingId={bookingId}
                  adminId={bookingData?.pmId || ''}
                  serviceId={bookingData?.serviceId || queryServiceId || ''}
                  hourlyRate={bookingData?.pricing?.hourlyRate || ''}
                  currentUserId={currentUserId}
                  authToken={authToken}
                />
              )}

              {activeTab === 'history' && (
                <div className="bg-white rounded-lg shadow-md p-6 h-full overflow-auto">
                  {bookingData?.serviceId ? (
                    <BookingTimeline
                      bookingId={bookingId}
                      serviceId={String(bookingData.serviceId)}
                    />
                  ) : (
                    <div className="text-center text-gray-500 mt-10">
                      <p className="text-lg font-medium">No history yet</p>
                      <p className="text-sm mt-1">Booking events will appear here as your project progresses.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingOngoingTab;
