'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Spinner, ErrorBox, Button, Table } from '@/components/staff/ui';

const empty = { name: '', description: '', technologies: '', hourlyRate: '', imageUrl: '' };

// Tag input component for technologies
function TagInput({ value, onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const addTag = (raw) => {
    const newTags = raw.split(',').map(t => t.trim()).filter(Boolean);
    const merged = [...new Set([...tags, ...newTags])];
    onChange(merged.join(', '));
    setInput('');
  };

  const removeTag = (idx) => {
    const next = tags.filter((_, i) => i !== idx);
    onChange(next.join(', '));
  };

  const handleKey = (e) => {
    if (['Enter', ',', 'Tab'].includes(e.key) && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[42px] w-full border border-[#E5F1E2] rounded-lg px-2 py-1.5 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 bg-[#E5F1E2] text-[#26472B] text-xs font-medium px-2 py-1 rounded-md">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="hover:text-red-500 leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Type a technology and press Enter or comma' : 'Add more…'}
        className="flex-1 min-w-[140px] text-sm outline-none bg-transparent py-0.5"
      />
    </div>
  );
}

export default function AdminServicesPage() {
  const t = useTranslations('admin.services');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [edit, setEdit] = useState(null); // null | {} (new) | service obj
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setItems(null); setError(null);
    try {
      const r = await staffApi.get('/admin/services');
      setItems(r.data?.data || []);
    } catch (e) { setError(e); }
  };
  useEffect(() => { load(); }, []);

  const open = (s) => {
    if (s) {
      setEdit(s);
      // Normalize technologies — could be string[] or object[]
      const techs = (s.technologies || []).map(t =>
        typeof t === 'string' ? t : (t?.name || t?.id || '')
      ).filter(Boolean);
      setForm({
        name: s.name || '',
        description: s.description || '',
        technologies: techs.join(', '),
        hourlyRate: s.hourlyRate ?? s.pricing?.hourly ?? '',
        imageUrl: s.imageUrl || s.image || '',
      });
    } else {
      setEdit({});
      setForm(empty);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        technologies: form.technologies.split(',').map((s) => s.trim()).filter(Boolean),
        hourlyRate: Number(form.hourlyRate) || 0,
        imageUrl: form.imageUrl,
      };
      if (edit?._id) await staffApi.put(`/admin/services/${edit._id}`, body);
      else await staffApi.post('/admin/services', body);
      setEdit(null);
      await load();
    } catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete service "${s.name}"?`)) return;
    try { await staffApi.delete(`/admin/services/${s._id}`); await load(); }
    catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
  };

  const cols = [
    { key: 'name', label: 'Name', render: (s) => <div className="font-open-sauce-semibold text-[#26472B]">{s.name}</div> },
    { key: 'hourlyRate', label: 'Rate', render: (s) => `₹${s.hourlyRate || s.pricing?.hourly || 0}/h` },
    { key: 'technologies', label: 'Tech', render: (s) => (s.technologies || []).slice(0, 4).join(', ') || '—' },
    { key: 'active', label: 'Active', render: (s) => s.active === false ? '—' : '✓' },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex gap-2">
        <Button size="sm" variant="subtle" onClick={() => open(s)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => remove(s)}>Delete</Button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={<Button variant="primary" onClick={() => open(null)}>+ New Service</Button>}
      />
      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />
        {items === null && !error && <Spinner />}
        {items !== null && <Table columns={cols} rows={items} empty={t('noResults')} />}
      </div>

      {edit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-open-sauce-bold text-[#26472B] mb-4">{edit?._id ? 'Edit Service' : 'New Service'}</h3>
            <div className="space-y-3">
              {[
                ['name', 'Name'],
                ['description', 'Description', 'textarea'],
                ['hourlyRate', 'Hourly Rate (₹)', 'number'],
                ['imageUrl', 'Image URL'],
              ].map(([k, label, type]) => (
                <div key={k}>
                  <label className="block text-xs font-open-sauce-semibold text-[#636363] mb-1 uppercase tracking-wider">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm h-24"
                    />
                  ) : (
                    <input
                      type={type || 'text'}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      className="w-full border border-[#E5F1E2] rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-open-sauce-semibold text-[#636363] mb-1 uppercase tracking-wider">
                  Technologies <span className="normal-case text-[#999] font-normal">(type &amp; press Enter)</span>
                </label>
                <TagInput
                  value={form.technologies}
                  onChange={(val) => setForm({ ...form, technologies: val })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="subtle" onClick={() => setEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={save} disabled={busy || !form.name}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
