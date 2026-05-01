'use client';

import { useEffect, useState, useCallback } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showError, showSuccess } from '@/lib/utils/toast';
import { PageHeader, Table, Spinner, ErrorBox, Button } from '@/components/staff/ui';

export default function ResourceTimeLogsPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [bookingId, setBookingId] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setItems(null); setError(null);
    staffApi.get('/resource/time-logs')
      .then((r) => setItems(r.data?.data || []))
      .catch(setError);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await staffApi.post('/resource/time-log', {
        bookingId,
        hours: Number(hours),
        note,
      });
      setBookingId(''); setHours(''); setNote('');
      showSuccess('Time logged successfully!');
      load();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to log time');
    } finally { setBusy(false); }
  };

  const columns = [
    { key: 'createdAt', label: 'Logged at', render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: 'bookingId', label: 'Booking', render: (r) => <code className="text-xs font-mono text-[#909090]">{String(r.bookingId).slice(-8)}</code> },
    { key: 'hours', label: 'Hours', render: (r) => <span className="font-open-sauce-semibold text-[#26472B]">{r.hours}</span> },
    { key: 'note', label: 'Note', render: (r) => <span className="text-[#636363]">{r.note || '—'}</span> },
  ];

  const inputCls = 'w-full px-3 py-2.5 border border-[#D6EBCF] rounded-lg text-sm font-open-sauce text-[#242424] focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] focus:outline-none';

  return (
    <div>
      <PageHeader title="Time Logs" subtitle="Log hours against your assignments" />
      <div className="p-4 sm:p-8 space-y-6">
        <form onSubmit={submit} className="bg-white border border-[#E5F1E2] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">Booking ID</label>
            <input value={bookingId} onChange={(e) => setBookingId(e.target.value.trim())} required placeholder="24-char ObjectId" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">Hours</label>
            <input type="number" step="0.25" min="0.25" max="24" value={hours} onChange={(e) => setHours(e.target.value)} required className={inputCls} />
          </div>
          <div className="sm:col-span-1">
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Saving…' : 'Add log'}
            </Button>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-open-sauce-semibold text-[#26472B] mb-1.5">Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className={inputCls} />
          </div>
        </form>

        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={columns} rows={items} empty="No time logs yet." />}
      </div>
    </div>
  );
}
