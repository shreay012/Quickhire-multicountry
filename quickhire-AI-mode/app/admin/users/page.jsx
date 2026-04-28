'use client';

import { useEffect, useState, useCallback } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Table, StatusBadge, Spinner, ErrorBox, Button } from '@/components/staff/ui';

const ROLES = ['', 'user', 'pm', 'admin', 'resource'];

export default function AdminUsersPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState({});

  const load = useCallback(() => {
    setItems(null); setError(null);
    staffApi.get('/admin/users', { params: { ...(role ? { role } : {}), pageSize: 50 } })
      .then((r) => setItems(r.data?.data || []))
      .catch(setError);
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await staffApi.patch(`/admin/users/${id}/status`, { status }); load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => r.name || '—' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    { key: 'role', label: 'Role', render: (r) => <span className="text-[11px] px-2 py-0.5 bg-[#F2F9F1] text-[#26472B] rounded font-open-sauce-semibold uppercase tracking-wider">{r.role}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.meta?.status || 'active'} /> },
    {
      key: 'actions', label: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          {r.meta?.status === 'suspended' ? (
            <Button size="sm" variant="primary" onClick={() => setStatus(r._id, 'active')} disabled={busy[r._id]}>Activate</Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setStatus(r._id, 'suspended')} disabled={busy[r._id]}>Suspend</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage all platform users"
        action={
          <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 border border-[#D6EBCF] bg-white rounded-lg text-sm font-open-sauce text-[#26472B] focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] focus:outline-none">
            {ROLES.map((r) => <option key={r} value={r}>{r || 'All roles'}</option>)}
          </select>
        }
      />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={columns} rows={items} empty="No users." />}
      </div>
    </div>
  );
}
