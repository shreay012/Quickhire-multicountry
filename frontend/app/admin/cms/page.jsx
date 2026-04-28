'use client';

import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, Spinner, ErrorBox, Button } from '@/components/staff/ui';

export default function AdminCmsPage() {
  const [keys, setKeys] = useState([]);
  const [active, setActive] = useState(null);
  const [items, setItems] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    staffApi.get('/cms')
      .then((r) => setKeys(r.data?.data?.keys || []))
      .catch(setError);
  }, []);

  const open = async (key) => {
    setActive(key); setItems(''); setSaved(false); setError(null);
    try {
      const r = await staffApi.get(`/cms/${key}`);
      setItems(JSON.stringify(r.data?.data?.items || [], null, 2));
    } catch (e) { setError(e); }
  };

  const save = async () => {
    let parsed;
    try { parsed = JSON.parse(items); }
    catch { alert('Invalid JSON — fix syntax errors first.'); return; }
    if (!Array.isArray(parsed)) { alert('Items must be an array.'); return; }
    setBusy(true); setSaved(false);
    try {
      await staffApi.put(`/admin/cms/${active}`, { items: parsed });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert(e?.response?.data?.error?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Content (CMS)" subtitle="Edit dynamic content blocks. Cache invalidates on save." />
      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#E5F1E2] p-3 lg:col-span-1 max-h-[600px] overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-[#909090] font-open-sauce-semibold px-2 mb-2">Content Keys</div>
          {keys.length === 0 && <div className="p-3 text-sm text-[#909090]">Loading…</div>}
          <ul className="space-y-1">
            {keys.map((k) => (
              <li key={k}>
                <button
                  onClick={() => open(k)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-open-sauce-medium transition-all ${active === k ? 'bg-[#F2F9F1] text-[#26472B] border-l-[3px] border-[#45A735]' : 'text-[#636363] hover:bg-[#F7FBF6]'}`}
                >
                  {k}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5F1E2] p-5">
          <ErrorBox error={error} />
          {!active && <div className="text-sm text-[#909090] py-12 text-center">Select a key from the left to edit.</div>}
          {active && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-open-sauce-bold text-[#26472B]">{active}</div>
                  <div className="text-[11px] text-[#909090]">Edit JSON array; click Save to publish.</div>
                </div>
                <div className="flex items-center gap-2">
                  {saved && <span className="text-xs text-[#26472B] font-open-sauce-semibold">✓ Saved</span>}
                  <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
                </div>
              </div>
              <textarea
                value={items}
                onChange={(e) => setItems(e.target.value)}
                className="w-full h-[450px] border border-[#E5F1E2] rounded-lg p-3 font-mono text-xs text-[#26472B] focus:outline-none focus:border-[#45A735]"
                spellCheck={false}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
