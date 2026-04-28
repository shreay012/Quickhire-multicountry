'use client';

import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Spinner, ErrorBox, Button, Table } from '@/components/staff/ui';

const empty = { name: '', mobile: '', email: '', specialization: '', skills: '' };

function StaffPage({ role, basePath, title, subtitle }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setItems(null); setError(null);
    try {
      const r = await staffApi.get(`/admin/${basePath}`);
      setItems(r.data?.data || []);
    } catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, []);

  const open = (s) => {
    if (s) {
      setEdit(s);
      setForm({
        name: s.name || '',
        mobile: s.mobile || '',
        email: s.email || '',
        specialization: (s.specialization || []).join(', '),
        skills: (s.skills || []).join(', '),
      });
    } else { setEdit({}); setForm(empty); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name,
        mobile: form.mobile,
        email: form.email,
        specialization: form.specialization.split(',').map((s) => s.trim()).filter(Boolean),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (edit?._id) await staffApi.put(`/admin/${basePath}/${edit._id}`, body);
      else await staffApi.post(`/admin/${basePath}`, body);
      setEdit(null);
      await load();
    } catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name || s.mobile}?`)) return;
    try { await staffApi.delete(`/admin/${basePath}/${s._id}`); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
  };

  const cols = [
    { key: 'name', label: 'Name', render: (s) => <div className="font-open-sauce-semibold text-[#26472B]">{s.name || '—'}</div> },
    { key: 'mobile', label: 'Mobile' },
    { key: 'email', label: 'Email', render: (s) => s.email || '—' },
    { key: role === 'pm' ? 'specialization' : 'skills', label: role === 'pm' ? 'Specialization' : 'Skills', render: (s) => (s[role === 'pm' ? 'specialization' : 'skills'] || []).slice(0, 4).join(', ') || '—' },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex gap-2">
        <Button size="sm" variant="subtle" onClick={() => open(s)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => remove(s)}>Remove</Button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={<Button variant="primary" onClick={() => open(null)}>+ Add {role === 'pm' ? 'PM' : 'Resource'}</Button>}
      />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={cols} rows={items} empty={`No ${role === 'pm' ? 'PMs' : 'resources'} yet.`} />}
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-open-sauce-bold text-[#26472B] mb-4">
              {edit?._id ? `Edit ${role === 'pm' ? 'PM' : 'Resource'}` : `New ${role === 'pm' ? 'PM' : 'Resource'}`}
            </h3>
            <div className="space-y-3">
              {[
                ['name', 'Name'],
                ['mobile', 'Mobile (10 digits)'],
                ['email', 'Email'],
                [role === 'pm' ? 'specialization' : 'skills', role === 'pm' ? 'Specialization (comma-separated)' : 'Skills (comma-separated)'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="block text-xs font-open-sauce-semibold text-[#636363] mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="subtle" onClick={() => setEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={busy || !form.name || !form.mobile}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PmsPage() {
  return <StaffPage role="pm" basePath="pms" title="Project Managers" subtitle="Onboard and manage PMs" />;
}
