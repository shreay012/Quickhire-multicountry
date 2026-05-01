// /frontend/app/admin/cms/banners/page.jsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { showSuccess, showError } from '@/lib/utils/toast';
import {
  PageHeader,
  Spinner,
  ErrorBox,
  EmptyState,
  Table,
  Button,
} from '@/components/staff/ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLACEMENTS = [
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'homepage_mid',  label: 'Homepage Mid' },
  { value: 'services_top',  label: 'Services Top' },
  { value: 'checkout',      label: 'Checkout' },
  { value: 'sidebar',       label: 'Sidebar' },
];

const PLACEMENT_LABEL = Object.fromEntries(PLACEMENTS.map((p) => [p.value, p.label]));

const EMPTY_FORM = {
  title:     '',
  placement: 'homepage_hero',
  imageUrl:  '',
  linkUrl:   '',
  startsAt:  '',
  endsAt:    '',
  active:    true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
}

function inputCls(extra = '') {
  return `w-full px-3 py-2 rounded-lg border border-[#D6EBCF] bg-white text-sm font-open-sauce text-[#484848] placeholder-[#AEAEAE] focus:outline-none focus:ring-2 focus:ring-[#45A735]/40 focus:border-[#45A735] transition ${extra}`;
}

function labelCls() {
  return 'block text-xs font-open-sauce-semibold text-[#26472B] uppercase tracking-wider mb-1';
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-[#45A735]' : 'bg-[#D1D5DB]'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      {label && <span className="text-sm font-open-sauce text-[#484848]">{label}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Banner Modal (Create / Edit)
// ---------------------------------------------------------------------------

function BannerModal({ banner, onClose, onSaved }) {
  const isNew = !banner?._id;
  const [form, setForm] = useState(() =>
    isNew
      ? { ...EMPTY_FORM }
      : {
          title:     banner.title     || '',
          placement: banner.placement || 'homepage_hero',
          imageUrl:  banner.imageUrl  || '',
          linkUrl:   banner.linkUrl   || '',
          startsAt:  toDateInput(banner.startsAt),
          endsAt:    toDateInput(banner.endsAt),
          active:    banner.active ?? true,
        }
  );
  const [saving, setSaving] = useState(false);
  const [fieldErr, setFieldErr] = useState(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErr(null);
    if (!form.title.trim()) return setFieldErr('Title is required.');
    if (!form.placement)    return setFieldErr('Placement is required.');

    const body = {
      title:     form.title.trim(),
      placement: form.placement,
      imageUrl:  form.imageUrl.trim() || undefined,
      linkUrl:   form.linkUrl.trim()  || undefined,
      startsAt:  form.startsAt || undefined,
      endsAt:    form.endsAt   || undefined,
      active:    form.active,
    };

    setSaving(true);
    try {
      if (isNew) {
        await staffApi.post('/cms-x/banners', body);
        showSuccess('Banner created successfully.');
      } else {
        await staffApi.put(`/cms-x/banners/${banner._id}`, body);
        showSuccess('Banner updated successfully.');
      }
      onSaved();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to save banner.';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_16px_48px_rgba(38,71,43,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5F1E2] bg-[#F2F9F1]">
          <div>
            <h2 className="text-base font-open-sauce-bold text-[#26472B]">
              {isNew ? 'New Banner' : 'Edit Banner'}
            </h2>
            <p className="text-xs font-open-sauce text-[#636363] mt-0.5">
              {isNew ? 'Create a new promotional banner' : `Editing: ${banner.title}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#E5F1E2] transition-colors text-[#636363] hover:text-[#26472B]"
            aria-label="Close"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {fieldErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 font-open-sauce">
              {fieldErr}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelCls()}>Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Summer Sale Hero"
              className={inputCls()}
            />
          </div>

          {/* Placement */}
          <div>
            <label className={labelCls()}>Placement <span className="text-red-500">*</span></label>
            <select
              value={form.placement}
              onChange={(e) => set('placement', e.target.value)}
              className={inputCls()}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className={labelCls()}>Image URL</label>
            <input
              type="text"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://cdn.example.com/banner.jpg"
              className={inputCls()}
            />
          </div>

          {/* Link URL */}
          <div>
            <label className={labelCls()}>Link URL</label>
            <input
              type="text"
              value={form.linkUrl}
              onChange={(e) => set('linkUrl', e.target.value)}
              placeholder="https://example.com/promo"
              className={inputCls()}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls()}>Starts At</label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => set('startsAt', e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <label className={labelCls()}>Ends At</label>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => set('endsAt', e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-1">
            <span className={labelCls() + ' mb-0'}>Active</span>
            <Toggle checked={form.active} onChange={(v) => set('active', v)} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={saving}>
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                isNew ? 'Create Banner' : 'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------

function DeleteConfirm({ banner, onCancel, onConfirm, busy }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_16px_48px_rgba(38,71,43,0.15)] p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#EF4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-base font-open-sauce-bold text-[#26472B]">Delete Banner?</h3>
        </div>
        <p className="text-sm text-[#636363] font-open-sauce mb-6">
          Are you sure you want to delete <strong className="text-[#26472B]">{banner.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Deleting…
              </>
            ) : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminBannersPage() {
  const [banners, setBanners]         = useState(null);
  const [error, setError]             = useState(null);
  const [modalBanner, setModalBanner] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteBusy, setDeleteBusy]   = useState(false);
  const [togglingId, setTogglingId]   = useState(null);

  const load = useCallback(() => {
    setBanners(null);
    setError(null);
    staffApi
      .get('/cms-x/banners/all')
      .then((r) => setBanners(r.data?.data || []))
      .catch((e) => setError(e));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Active toggle
  const handleToggleActive = async (banner) => {
    setTogglingId(banner._id);
    try {
      await staffApi.put(`/cms-x/banners/${banner._id}`, { active: !banner.active });
      showSuccess(`Banner ${!banner.active ? 'activated' : 'deactivated'}.`);
      load();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await staffApi.delete(`/cms-x/banners/${deleteTarget._id}`);
      showSuccess('Banner deleted.');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showError(err?.response?.data?.error?.message || 'Failed to delete banner.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (r) => (
        <span className="font-open-sauce-semibold text-[#26472B] text-sm">{r.title || '—'}</span>
      ),
    },
    {
      key: 'placement',
      label: 'Placement',
      render: (r) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold bg-[#F2F9F1] text-[#26472B] border border-[#D6EBCF]">
          {PLACEMENT_LABEL[r.placement] || r.placement || '—'}
        </span>
      ),
    },
    {
      key: 'imageUrl',
      label: 'Image',
      render: (r) =>
        r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.title}
            className="h-10 w-16 object-cover rounded-md border border-[#E5F1E2]"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <span className="text-xs text-[#AEAEAE] font-open-sauce">No image</span>
        ),
    },
    {
      key: 'dates',
      label: 'Dates',
      render: (r) => (
        <div className="text-xs font-open-sauce text-[#636363] leading-relaxed">
          <div><span className="text-[#909090]">From:</span> {fmtDate(r.startsAt)}</div>
          <div><span className="text-[#909090]">To:</span> {fmtDate(r.endsAt)}</div>
        </div>
      ),
    },
    {
      key: 'active',
      label: 'Status',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Toggle
            checked={r.active}
            onChange={() => handleToggleActive(r)}
            label={r.active ? 'Active' : 'Inactive'}
          />
          {togglingId === r._id && (
            <span className="w-3.5 h-3.5 border-2 border-[#45A735] border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setModalBanner(r)}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path
                d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(r)}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Manage promotional banners across the site"
        action={
          <Button variant="primary" size="md" onClick={() => setModalBanner(null)}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
            New Banner
          </Button>
        }
      />

      <div className="p-4 sm:p-8 space-y-4">
        <ErrorBox error={error} />

        {banners === null && !error && <Spinner />}

        {banners !== null && banners.length === 0 && (
          <EmptyState message="No banners yet. Create your first promotional banner." />
        )}

        {banners !== null && banners.length > 0 && (
          <Table
            columns={columns}
            rows={banners}
            keyField="_id"
            empty="No banners found."
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalBanner !== undefined && (
        <BannerModal
          banner={modalBanner}
          onClose={() => setModalBanner(undefined)}
          onSaved={() => {
            setModalBanner(undefined);
            load();
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <DeleteConfirm
          banner={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          busy={deleteBusy}
        />
      )}
    </div>
  );
}
