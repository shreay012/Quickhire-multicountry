'use client';
import { showError, showSuccess } from '@/lib/utils/toast';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Table, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

const STATUSES = ['', 'pending', 'confirmed', 'assigned_to_pm', 'in_progress', 'completed', 'cancelled'];

export default function AdminBookingsPage() {
  const router = useRouter();
  const t = useTranslations('admin.bookings');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState({});
  const [pms, setPms] = useState([]);
  const [showAssign, setShowAssign] = useState(null);
  const [pmId, setPmId] = useState('');

  const load = useCallback(() => {
    setItems(null); setError(null);
    staffApi.get('/admin/bookings', { params: status ? { status } : {} })
      .then((r) => {
        const d = r.data?.data;
        const arr = Array.isArray(d) ? d : (Array.isArray(d?.bookings) ? d.bookings : []);
        setItems(arr);
      })
      .catch(setError);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    staffApi.get('/admin/pms-list')
      .then((r) => setPms(r.data?.data || []))
      .catch(() => {});
  }, []);

  const confirm = async (id) => {
    setBusy((b) => ({ ...b, [id]: 'confirm' }));
    try { await staffApi.post(`/admin/bookings/${id}/confirm`); load(); }
    catch (e) { showError(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy((b) => ({ ...b, [id]: null })); }
  };

  const assign = async () => {
    if (!showAssign || !pmId) return;
    setBusy((b) => ({ ...b, [showAssign]: 'assign' }));
    try {
      await staffApi.post(`/admin/bookings/${showAssign}/assign-pm`, { pmId });
      setShowAssign(null); setPmId(''); load();
    } catch (e) {
      showError(e?.response?.data?.error?.message || 'Failed');
    } finally {
      setBusy((b) => ({ ...b, [showAssign]: null }));
    }
  };

  const columns = [
    { key: '_id', label: 'ID', render: (r) => <code className="text-xs text-[#909090] font-mono">{String(r._id).slice(-8)}</code> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'startTime', label: 'Start', render: (r) => r.startTime ? new Date(r.startTime).toLocaleString() : '—' },
    { key: 'duration', label: 'Hours', render: (r) => r.duration || '—' },
    { key: 'pricing', label: 'Total', render: (r) => <span className="font-open-sauce-semibold text-[#26472B]">₹{r.pricing?.total ?? 0}</span> },
    { key: 'pmId', label: 'PM', render: (r) => r.pmId ? <code className="text-xs font-mono text-[#636363]">{String(r.pmId).slice(-6)}</code> : '—' },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="subtle" onClick={() => router.push(`/admin/bookings/${r._id}`)}>Open</Button>
          {r.status === 'pending' && (
            <Button size="sm" variant="primary" onClick={() => confirm(r._id)} disabled={busy[r._id] === 'confirm'}>
              {busy[r._id] === 'confirm' ? '…' : 'Confirm'}
            </Button>
          )}
          {r.status === 'confirmed' && (
            <Button size="sm" variant="outline" onClick={() => { setShowAssign(r._id); setPmId(''); }}>
              Assign PM
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-[#D6EBCF] bg-white rounded-lg text-sm font-open-sauce text-[#26472B] focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] focus:outline-none"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        }
      />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={columns} rows={items} empty={t('noResults')} />}
      </div>

      {showAssign && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowAssign(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[#E5F1E2]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-open-sauce-bold text-[#26472B] mb-1">Assign Project Manager</h3>
            <p className="text-xs text-[#636363] mb-4 font-open-sauce">Choose a PM to take over this booking.</p>
            <select
              value={pmId}
              onChange={(e) => setPmId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#D6EBCF] rounded-lg text-sm font-open-sauce text-[#242424] focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] focus:outline-none"
            >
              <option value="">Choose a PM…</option>
              {pms.map((p) => (
                <option key={p._id} value={p._id}>{p.name || p.mobile} ({String(p._id).slice(-6)})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" onClick={() => setShowAssign(null)}>Cancel</Button>
              <Button variant="primary" onClick={assign} disabled={!pmId}>Assign</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
