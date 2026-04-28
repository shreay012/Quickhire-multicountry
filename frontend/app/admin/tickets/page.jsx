'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Table, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketsPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setItems(null); setError(null);
    staffApi.get('/admin/tickets', { params: status ? { status } : {} })
      .then((r) => setItems(r.data?.data || []))
      .catch(setError);
  }, [status]);

  const cols = [
    { key: '_id', label: 'ID', render: (t) => <code className="text-xs font-mono text-[#909090]">{String(t._id).slice(-8)}</code> },
    { key: 'subject', label: 'Subject', render: (t) => <div className="font-open-sauce-semibold text-[#26472B]">{t.subject}</div> },
    { key: 'customerName', label: 'Customer' },
    { key: 'status', label: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'createdAt', label: 'Created', render: (t) => new Date(t.createdAt).toLocaleString() },
    { key: 'actions', label: '', render: (t) => (
      <Button size="sm" variant="subtle" onClick={() => router.push(`/admin/tickets/${t._id}`)}>Open</Button>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        subtitle="Customer support queue"
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-[#D6EBCF] bg-white rounded-lg text-sm">
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
        }
      />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={cols} rows={items} empty="No tickets." />}
      </div>
    </div>
  );
}
