'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import { s } from '@/lib/utils/i18nText';
import {
  PageHeader,
  Table,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  EmptyState,
} from '@/components/staff/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

const STATUS_TABS = [
  { key: '',              label: 'All' },
  { key: 'pending',       label: 'Pending' },
  { key: 'confirmed',     label: 'Confirmed' },
  { key: 'assigned_to_pm',label: 'Assigned to PM' },
  { key: 'in_progress',   label: 'In Progress' },
  { key: 'completed',     label: 'Completed' },
  { key: 'cancelled',     label: 'Cancelled' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(amount) {
  if (amount == null || isNaN(Number(amount))) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminBookingsPage() {
  const router = useRouter();

  // ─── Data state ───────────────────────────────────────────────────────────
  const [bookings, setBookings]     = useState(null);   // null = loading
  const [total, setTotal]           = useState(0);
  const [error, setError]           = useState(null);

  // ─── Filter / pagination state ────────────────────────────────────────────
  const [activeStatus, setActiveStatus] = useState('');
  const [page, setPage]                 = useState(1);

  // ─── PM picker state ──────────────────────────────────────────────────────
  const [pms, setPms]               = useState([]);

  // ─── Inline action states (no window.confirm / window.alert) ─────────────
  const [confirmTarget, setConfirmTarget] = useState(null);   // bookingId to confirm
  const [rejectTarget, setRejectTarget]   = useState(null);   // bookingId to reject
  const [assignModal, setAssignModal]     = useState(null);   // bookingId to assign PM
  const [selectedPmId, setSelectedPmId]   = useState('');

  // ─── Loading/busy states ──────────────────────────────────────────────────
  const [busyConfirm, setBusyConfirm] = useState(null);
  const [busyReject, setBusyReject]   = useState(null);
  const [busyAssign, setBusyAssign]   = useState(false);

  // ─── Load bookings ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setBookings(null);
    setError(null);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      if (activeStatus) params.status = activeStatus;
      const r = await staffApi.get('/admin/bookings', { params });
      const d = r.data?.data || r.data || {};
      const arr = Array.isArray(d) ? d : (Array.isArray(d.bookings) ? d.bookings : []);
      setBookings(arr);
      setTotal(typeof d.total === 'number' ? d.total : arr.length);
    } catch (e) {
      setError(e);
      setBookings([]);
    }
  }, [activeStatus, page]);

  useEffect(() => { load(); }, [load]);

  // ─── Load PMs list ────────────────────────────────────────────────────────
  useEffect(() => {
    staffApi.get('/admin/pms-list')
      .then((r) => setPms(r.data?.data || r.data || []))
      .catch(() => {});
  }, []);

  // ─── Status tab change ────────────────────────────────────────────────────
  const handleStatusChange = (key) => {
    setActiveStatus(key);
    setPage(1);
    setConfirmTarget(null);
    setRejectTarget(null);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const doConfirm = async (id) => {
    setBusyConfirm(id);
    try {
      await staffApi.post(`/admin/bookings/${id}/confirm`);
      showSuccess('Booking confirmed successfully.');
      setConfirmTarget(null);
      await load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to confirm booking.');
    } finally {
      setBusyConfirm(null);
    }
  };

  const doReject = async (id) => {
    setBusyReject(id);
    try {
      await staffApi.patch(`/admin/bookings/${id}/reject`, { reason: '' });
      showSuccess('Booking cancelled.');
      setRejectTarget(null);
      await load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to cancel booking.');
    } finally {
      setBusyReject(null);
    }
  };

  const openAssignModal = (id) => {
    setAssignModal(id);
    setSelectedPmId('');
  };

  const doAssign = async () => {
    if (!assignModal || !selectedPmId) return;
    setBusyAssign(true);
    try {
      await staffApi.post(`/admin/bookings/${assignModal}/assign-pm`, { pmId: selectedPmId });
      showSuccess('PM assigned successfully.');
      setAssignModal(null);
      setSelectedPmId('');
      await load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || e?.message || 'Failed to assign PM.');
    } finally {
      setBusyAssign(false);
    }
  };

  // ─── Quick stats ──────────────────────────────────────────────────────────
  const loaded = Array.isArray(bookings) && bookings.length > 0;
  const countPending   = bookings ? bookings.filter((b) => b.status === 'pending').length : 0;
  const countActive    = bookings ? bookings.filter((b) => ['confirmed', 'assigned_to_pm', 'in_progress'].includes(b.status)).length : 0;
  const countCompleted = bookings ? bookings.filter((b) => b.status === 'completed').length : 0;

  // ─── Table columns ────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'booking',
      label: 'Booking',
      render: (r) => (
        <div>
          <div className="font-mono text-[11px] text-[#909090] tracking-wider">
            #{String(r._id).slice(-8)}
          </div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm leading-tight mt-0.5">
            {s(r.customerName) || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      label: 'Service',
      render: (r) => (
        <div>
          <div className="text-sm text-[#484848] font-open-sauce">{s(r.serviceName) || '—'}</div>
          {r.customerMobile && (
            <div className="text-xs text-[#909090] mt-0.5">{r.customerMobile}</div>
          )}
        </div>
      ),
    },
    {
      key: 'pm',
      label: 'PM',
      render: (r) => (
        <span className={`text-sm font-open-sauce ${r.pmName ? 'text-[#26472B] font-open-sauce-medium' : 'text-[#909090] italic'}`}>
          {s(r.pmName) || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => (
        <span className="font-open-sauce-semibold text-[#26472B] text-sm">
          {fmtINR(r.amount)}
        </span>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      render: (r) => (
        <span className="text-sm text-[#636363] font-open-sauce">
          {fmtDate(r.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-1.5 flex-wrap min-w-[200px]">
          {/* Always show View → */}
          <Button
            size="sm"
            variant="subtle"
            onClick={() => router.push(`/admin/bookings/${r._id}`)}
          >
            View →
          </Button>

          {/* Pending: inline confirm */}
          {r.status === 'pending' && (
            <>
              {confirmTarget === r._id ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={busyConfirm === r._id}
                    onClick={() => doConfirm(r._id)}
                  >
                    ✓ Yes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmTarget(null)}
                    disabled={busyConfirm === r._id}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setConfirmTarget(r._id); setRejectTarget(null); }}
                >
                  Confirm
                </Button>
              )}
            </>
          )}

          {/* Confirmed: assign PM */}
          {r.status === 'confirmed' && (
            <Button size="sm" variant="subtle" onClick={() => openAssignModal(r._id)}>
              Assign PM
            </Button>
          )}

          {/* Reject: shown for non-terminal, non-pending statuses */}
          {!['cancelled', 'completed'].includes(r.status) && r.status !== 'pending' && rejectTarget !== r._id && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => { setRejectTarget(r._id); setConfirmTarget(null); }}
            >
              Reject
            </Button>
          )}

          {/* Inline reject confirmation */}
          {rejectTarget === r._id && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="danger"
                loading={busyReject === r._id}
                onClick={() => doReject(r._id)}
              >
                Yes, cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectTarget(null)}
                disabled={busyReject === r._id}
              >
                No
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  // ─── Pagination helpers ───────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fromRow = (page - 1) * PAGE_SIZE + 1;
  const toRow   = Math.min(page * PAGE_SIZE, total);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <PageHeader
        title="Bookings"
        subtitle="All customer bookings across services"
      />

      {/* ── Status Filter Tabs ────────────────────────────────────────────── */}
      <div className="px-4 sm:px-8 pt-4 bg-white border-b border-[#E5F1E2]">
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleStatusChange(tab.key)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#45A735] text-white font-open-sauce-semibold shadow-sm'
                    : 'bg-white text-[#636363] border border-[#E5F1E2] font-open-sauce-medium hover:border-[#45A735] hover:text-[#26472B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-8 space-y-5">
        <ErrorBox error={error} />

        {/* Quick stats row — shown once data is loaded */}
        {bookings !== null && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Showing',   value: bookings.length },
              { label: 'Pending',   value: countPending,   accent: countPending > 0 ? 'text-amber-600' : '' },
              { label: 'Active',    value: countActive,    accent: countActive > 0 ? 'text-[#26472B]' : '' },
              { label: 'Completed', value: countCompleted },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className="bg-white border border-[#E5F1E2] rounded-xl p-3 shadow-[0_1px_3px_rgba(38,71,43,0.04)]"
              >
                <div className="text-[11px] uppercase text-[#909090] tracking-wider font-open-sauce-semibold">
                  {label}
                </div>
                <div className={`text-xl font-open-sauce-bold mt-1 ${accent || 'text-[#26472B]'}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {bookings === null && !error && (
          <Table columns={columns} rows={[]} loading={true} />
        )}

        {/* Table */}
        {bookings !== null && (
          <Table
            columns={columns}
            rows={bookings}
            keyField="_id"
            empty="No bookings found for this filter."
          />
        )}

        {/* Pagination */}
        {bookings !== null && total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5F1E2]">
            <span className="text-sm text-[#636363] font-open-sauce">
              Showing {fromRow}–{toRow} of {total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="subtle"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </Button>
              <span className="px-3 py-1.5 text-sm text-[#26472B] font-open-sauce-semibold select-none">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="subtle"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Assign PM Modal ───────────────────────────────────────────────── */}
      {assignModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setAssignModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#E5F1E2] w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-open-sauce-bold text-[#26472B]">
                  Assign Project Manager
                </h3>
                <p className="text-sm text-[#636363] mt-0.5 font-open-sauce">
                  Select a PM for booking #{String(assignModal).slice(-8)}
                </p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#909090] hover:bg-[#F2F9F1] hover:text-[#26472B] transition-all text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* PM select */}
            <div className="relative">
              <select
                value={selectedPmId}
                onChange={(e) => setSelectedPmId(e.target.value)}
                className="w-full appearance-none border border-[#D6EBCF] rounded-lg px-3 py-2.5 pr-9 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none transition-colors"
              >
                <option value="">Choose a PM…</option>
                {pms.map((pm) => (
                  <option key={pm._id} value={pm._id}>
                    {pm.name || pm.mobile}
                    {pm.mobile && pm.name ? ` · ${pm.mobile}` : ''}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#636363]">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            {pms.length === 0 && (
              <p className="text-xs text-[#909090] mt-2 font-open-sauce">
                No PMs found. Add PMs from the PM management page.
              </p>
            )}

            {/* Modal footer */}
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setAssignModal(null)} disabled={busyAssign}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={doAssign}
                disabled={!selectedPmId || busyAssign}
                loading={busyAssign}
              >
                Assign PM
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
