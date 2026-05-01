'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import {
  PageHeader,
  StatusBadge,
  Spinner,
  ErrorBox,
  Button,
  Table,
} from '@/components/staff/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_PILLS = [
  { key: '',            label: 'All' },
  { key: 'open',        label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved',   label: 'Resolved' },
  { key: 'closed',     label: 'Closed' },
  { key: 'escalated',  label: 'Escalated' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtShortDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return String(d);
  }
}

function PriorityBadge({ priority }) {
  const p = (priority || 'normal').toLowerCase();
  const styles = {
    high:   'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low:    'bg-[#F2F9F1] text-[#26472B]',
  };
  const cls = styles[p] || 'bg-[#F5F7F5] text-[#636363]';
  const label = p.charAt(0).toUpperCase() + p.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTicketsPage() {
  const router = useRouter();

  const [items, setItems]     = useState(null);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('');
  const [search, setSearch]   = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const params = filter ? { status: filter } : {};
      const r = await staffApi.get('/admin/tickets', { params });
      setItems(r.data?.data || []);
    } catch (e) {
      setError(e);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // ── Quick status update ───────────────────────────────────────────────────

  const quickUpdateStatus = async (id, status) => {
    try {
      await staffApi.patch(`/admin/tickets/${id}/status`, { status });
      showSuccess('Status updated');
      setItems(prev => prev.map(t => t._id === id ? { ...t, status } : t));
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed');
    }
  };

  // ── Derived stats ─────────────────────────────────────────────────────────

  const all = items || [];
  const stats = {
    open:        all.filter(t => t.status === 'open').length,
    in_progress: all.filter(t => t.status === 'in_progress').length,
    escalated:   all.filter(t => t.status === 'escalated').length,
    resolved:    all.filter(t => t.status === 'resolved').length,
  };

  // ── Search filter ─────────────────────────────────────────────────────────

  const visible = search.trim()
    ? all.filter(t => {
        const q = search.toLowerCase();
        return (
          (t.subject || '').toLowerCase().includes(q) ||
          (t.customerName || '').toLowerCase().includes(q)
        );
      })
    : all;

  // ── Table columns ─────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'ticket',
      label: 'Ticket',
      render: (t) => (
        <div className="min-w-[160px]">
          <div className="text-[#909090] font-mono text-xs">#{String(t._id).slice(-8)}</div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm max-w-xs truncate mt-0.5">
            {t.subject || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (t) => (
        <span className="text-sm text-[#484848] font-open-sauce">{t.customerName || '—'}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (t) => (
        <span className="text-sm text-[#636363] font-open-sauce whitespace-nowrap">
          {fmtShortDate(t.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (t) => (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="subtle"
            onClick={() => router.push(`/admin/tickets/${t._id}`)}
          >
            Open →
          </Button>
          <select
            value={t.status}
            onChange={e => quickUpdateStatus(t._id, e.target.value)}
            onClick={e => e.stopPropagation()}
            className="text-xs border border-[#E5F1E2] rounded-lg px-2 py-1 text-[#484848] bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#45A735]/40"
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle="Manage customer support requests"
      />

      {/* Status filter pills */}
      <div className="px-4 sm:px-8 pt-4 flex flex-wrap gap-2">
        {FILTER_PILLS.map(pill => {
          const active = filter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setFilter(pill.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-open-sauce-semibold transition-all duration-150 ${
                active
                  ? 'bg-[#45A735] text-white'
                  : 'bg-white text-[#636363] border border-[#E5F1E2] hover:border-[#45A735]'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-8 space-y-4">

        {/* Mini stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatMini label="Open" value={stats.open} dot="bg-blue-400" />
          <StatMini label="In Progress" value={stats.in_progress} dot="bg-[#45A735]" />
          <StatMini label="Escalated" value={stats.escalated} dot="bg-amber-400" amber />
          <StatMini label="Resolved" value={stats.resolved} dot="bg-[#909090]" />
        </div>

        <ErrorBox error={error} />

        {items === null && !error && <Spinner />}

        {items !== null && (
          <>
            {/* Search bar */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] pointer-events-none">
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-full border border-[#D6EBCF] rounded-xl pl-9 pr-4 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090] transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909090] hover:text-[#484848]"
                  aria-label="Clear search"
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <Table
              columns={columns}
              rows={visible}
              keyField="_id"
              empty="No tickets match your filters."
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Mini stat card ───────────────────────────────────────────────────────────

function StatMini({ label, value, dot, amber }) {
  return (
    <div className="bg-white border border-[#E5F1E2] rounded-xl p-3 flex items-center gap-2.5">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <div className="min-w-0">
        <div className={`text-xl font-open-sauce-bold leading-tight ${amber ? 'text-amber-600' : 'text-[#26472B]'}`}>
          {value}
        </div>
        <div className="text-[11px] text-[#909090] font-open-sauce-semibold uppercase tracking-wide truncate">
          {label}
        </div>
      </div>
    </div>
  );
}
