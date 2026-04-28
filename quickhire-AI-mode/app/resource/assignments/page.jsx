'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Table, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

export default function ResourceAssignmentsPage() {
  const router = useRouter();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    staffApi.get('/resource/assignments')
      .then((r) => setItems(r.data?.data || []))
      .catch(setError);
  }, []);

  const columns = [
    { key: '_id', label: 'ID', render: (r) => <code className="text-xs text-[#909090] font-mono">{String(r._id).slice(-8)}</code> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'customerName', label: 'Customer' },
    { key: 'serviceName', label: 'Service' },
    { key: 'startTime', label: 'Start', render: (r) => r.services?.[0]?.preferredStartDate ? new Date(r.services[0].preferredStartDate).toLocaleDateString() : (r.startTime ? new Date(r.startTime).toLocaleString() : '—') },
    { key: 'duration', label: 'Hours', render: (r) => r.services?.[0]?.durationTime || r.duration || '—' },
    { key: 'actions', label: '', render: (r) => (
      <Button size="sm" variant="subtle" onClick={() => router.push(`/resource/assignments/${r._id}`)}>Open</Button>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Bookings allocated to you by your PM" />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={columns} rows={items} empty="No assignments yet. Ask your PM to assign you to a booking." />}
      </div>
    </div>
  );
}
