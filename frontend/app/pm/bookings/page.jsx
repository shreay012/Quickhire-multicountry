'use client';
import { showError, showSuccess } from '@/lib/utils/toast';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Table, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

function formatDuration(ms) {
  if (!ms || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function liveWorked(row, tick) {
  const base = row.workedMs || 0;
  if (row.status === 'in_progress' && row.currentSessionStart) {
    return base + (tick - new Date(row.currentSessionStart).getTime());
  }
  return base;
}

export default function PmBookingsPage() {
  const t = useTranslations('pm.bookings');
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({});
  const [tick, setTick] = useState(Date.now());
  const tickRef = useRef(null);

  const load = useCallback(() => {
    setError(null);
    staffApi.get('/pm/bookings')
      .then((r) => setItems(r.data?.data || []))
      .catch(setError);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live ticker for in-progress timers.
  useEffect(() => {
    const hasActive = (items || []).some((j) => j.status === 'in_progress');
    if (hasActive) {
      tickRef.current = setInterval(() => setTick(Date.now()), 1000);
      return () => clearInterval(tickRef.current);
    }
  }, [items]);

  const action = async (id, kind) => {
    setBusy((b) => ({ ...b, [id]: kind }));
    try {
      await staffApi.post(`/pm/bookings/${id}/${kind}`, {});
      load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || `Failed to ${kind}`);
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  };

  const columns = [
    { key: '_id', label: 'ID', render: (r) => <code className="text-xs text-[#909090] font-mono">{String(r._id).slice(-8)}</code> },
    { key: 'customerName', label: 'Customer', render: (r) => (
      <div>
        <div className="text-sm text-[#26472B] font-open-sauce-semibold">{r.customerName || '—'}</div>
        {r.customerMobile && <div className="text-[11px] text-[#909090]">{r.customerMobile}</div>}
      </div>
    ) },
    { key: 'serviceName', label: 'Service', render: (r) => <span className="text-sm text-[#26472B]">{r.serviceName || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'time', label: 'Worked', render: (r) => (
      <code className="text-xs font-mono text-[#26472B]">{formatDuration(liveWorked(r, tick))}</code>
    ) },
    {
      key: 'actions', label: 'Actions',
      render: (r) => {
        const b = busy[r._id];
        return (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="subtle" onClick={() => router.push(`/pm/bookings/${r._id}`)}>
              Open
            </Button>
            {(r.status === 'assigned_to_pm' || r.status === 'paid' || r.status === 'confirmed') && (
              <Button size="sm" variant="primary" onClick={() => action(r._id, 'start')} disabled={!!b}>
                {b === 'start' ? '…' : 'Start'}
              </Button>
            )}
            {r.status === 'in_progress' && (
              <>
                <Button size="sm" variant="subtle" onClick={() => action(r._id, 'stop')} disabled={!!b}>
                  {b === 'stop' ? '…' : 'Stop'}
                </Button>
                <Button size="sm" variant="primary" onClick={() => action(r._id, 'complete')} disabled={!!b}>
                  {b === 'complete' ? '…' : 'Complete'}
                </Button>
              </>
            )}
            {r.status === 'paused' && (
              <>
                <Button size="sm" variant="primary" onClick={() => action(r._id, 'start')} disabled={!!b}>
                  {b === 'start' ? '…' : 'Resume'}
                </Button>
                <Button size="sm" variant="subtle" onClick={() => action(r._id, 'complete')} disabled={!!b}>
                  {b === 'complete' ? '…' : 'Complete'}
                </Button>
              </>
            )}
            {r.status === 'completed' && (
              <span className="text-xs text-[#909090]">Done</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={columns} rows={items} empty={t('noResults')} />}
      </div>
    </div>
  );
}
