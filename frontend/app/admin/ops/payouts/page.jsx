// /frontend/app/admin/ops/payouts/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import staffApi from '@/lib/axios/staffApi';
import {
  PageHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Button,
  StatCard,
} from '@/components/staff/ui';
import { showSuccess, showError } from '@/lib/utils/toast';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  SGD: 'S$',
};

function formatAmount(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency] || (currency ? currency + ' ' : '');
  return `${symbol}${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const STATUS_TABS = ['All', 'pending', 'processed', 'failed'];

// ── Status badge ──────────────────────────────────────────────────────────────
function PayoutStatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    processed: 'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    failed: 'bg-red-50 text-red-700 ring-red-200',
  };
  const cls = map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ring-1 ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
}

// ── Mark Processed Modal ──────────────────────────────────────────────────────
function MarkProcessedModal({ payout, onClose, onProcessed }) {
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      showError('UTR reference is required.');
      return;
    }
    setLoading(true);
    try {
      await staffApi.patch(`/admin-ops/payouts/${payout._id}/process`, {
        txnRef: utr.trim(),
      });
      showSuccess('Payout marked as processed.');
      onProcessed();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to process payout.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-open-sauce-bold text-[#26472B]">Mark Payout as Processed</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#484848] transition-colors cursor-pointer text-xl leading-none">&times;</button>
        </div>

        {/* Payout summary */}
        <div className="mb-5 p-3 rounded-lg bg-[#F2F9F1] border border-[#E5F1E2] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Resource</span>
            <span className="text-sm font-open-sauce-semibold text-[#26472B]">{payout.resourceName || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Amount</span>
            <span className="text-sm font-open-sauce-semibold text-[#45A735]">{formatAmount(payout.amount, payout.currency)}</span>
          </div>
          {payout.period && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#636363] font-open-sauce-semibold uppercase tracking-wider">Period</span>
              <span className="text-sm font-open-sauce text-[#484848]">{payout.period}</span>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
              UTR Reference Number
            </label>
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. UTR123456789012"
              className="w-full border border-[#D6EBCF] rounded-lg px-3 py-2 text-sm font-open-sauce text-[#484848] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] font-mono tracking-wide"
            />
            <p className="mt-1 text-[11px] text-[#909090] font-open-sauce">
              Enter the UTR / transaction reference from your payment gateway.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Processing…' : 'Confirm & Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOpsPayoutsPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('All');
  const [processing, setProcessing] = useState(null); // payout being acted on

  const load = useCallback(() => {
    setError(null);
    staffApi.get('/admin-ops/payouts')
      .then((r) => setItems(r.data?.data || []))
      .catch((err) => {
        setError(err);
        setItems([]);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items
    ? tab === 'All' ? items : items.filter((p) => p.status === tab)
    : [];

  // Stats derived from full list
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const pendingAmt = items
    ? items.filter((p) => p.status === 'pending').reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : 0;

  const processedCount = items
    ? items.filter((p) => p.status === 'processed').length
    : 0;

  const thisMonthAmt = items
    ? items
        .filter((p) => {
          const d = p.processedAt ? new Date(p.processedAt) : null;
          return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, p) => s + (Number(p.amount) || 0), 0)
    : 0;

  const cols = [
    {
      key: 'resourceName',
      label: 'Resource',
      render: (p) => (
        <div>
          <div className="font-open-sauce-semibold text-[#26472B] text-sm">{p.resourceName || '—'}</div>
          {p.resourceId && (
            <div className="text-[11px] text-[#909090] font-mono mt-0.5">{String(p.resourceId).slice(-8)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (p) => (
        <span className="font-open-sauce-semibold text-[#26472B]">
          {formatAmount(p.amount, p.currency)}
        </span>
      ),
    },
    {
      key: 'period',
      label: 'Period',
      render: (p) => (
        <span className="text-sm text-[#484848] font-open-sauce">
          {p.period || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (p) => <PayoutStatusBadge status={p.status} />,
    },
    {
      key: 'processedAt',
      label: 'Processed Date',
      render: (p) => p.processedAt
        ? new Date(p.processedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : <span className="text-[#909090]">—</span>,
    },
    {
      key: 'utr',
      label: 'UTR Ref',
      render: (p) => p.utr
        ? <code className="text-xs font-mono text-[#45A735] bg-[#F2F9F1] px-1.5 py-0.5 rounded">{p.utr}</code>
        : <span className="text-[#909090]">—</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => {
        if (p.status !== 'pending') {
          return (
            <span className="text-xs text-[#909090] font-open-sauce italic">
              {p.status === 'processed' ? 'Settled' : 'No action'}
            </span>
          );
        }
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setProcessing(p)}
          >
            Mark Processed
          </Button>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7FBF6]">
      <PageHeader
        title="Payouts"
        subtitle="Manage resource and PM payouts"
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Pending"
            value={items === null ? '…' : formatAmount(pendingAmt, 'INR')}
            hint="Sum of pending payouts"
            color="orange"
          />
          <StatCard
            label="Total Processed"
            value={items === null ? '…' : processedCount}
            hint="Payouts marked settled"
            color="green"
          />
          <StatCard
            label="This Month"
            value={items === null ? '…' : formatAmount(thisMonthAmt, 'INR')}
            hint="Processed in current month"
            color="slate"
          />
        </div>

        {/* Error */}
        <ErrorBox error={error} />

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#E5F1E2] rounded-xl p-1 w-fit">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-open-sauce-semibold transition-all duration-150 cursor-pointer ${
                tab === t
                  ? 'bg-[#45A735] text-white shadow-sm'
                  : 'text-[#636363] hover:text-[#26472B] hover:bg-[#F2F9F1]'
              }`}
            >
              {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        {items === null && !error && <Spinner />}
        {items !== null && (
          filtered.length === 0
            ? <EmptyState message={tab === 'All' ? 'No payouts found.' : `No ${tab} payouts.`} />
            : (
              <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
                <table className="min-w-full text-sm font-open-sauce">
                  <thead className="bg-[#F2F9F1] text-[#26472B]">
                    <tr>
                      {cols.map((c) => (
                        <th
                          key={c.key}
                          className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5EC]">
                    {filtered.map((p) => (
                      <tr key={p._id} className="hover:bg-[#F7FBF6] transition-colors">
                        {cols.map((c) => (
                          <td key={c.key} className="px-4 py-3.5 align-top text-[#484848]">
                            {c.render ? c.render(p) : p[c.key] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>

      {/* Mark Processed Modal */}
      {processing && (
        <MarkProcessedModal
          payout={processing}
          onClose={() => setProcessing(null)}
          onProcessed={() => { setProcessing(null); load(); }}
        />
      )}
    </div>
  );
}
