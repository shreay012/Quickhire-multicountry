'use client';

// ─────────────────────────────────────────────────────────────────────────────
// QuickHire Admin UI Component Library
// Design System: #45A735 primary green / #26472B dark green / #F2F9F1 light bg
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

// ─── 1. PageHeader ────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, backHref }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#E5F1E2] bg-white px-4 sm:px-8 py-5">
      <div className="flex items-start gap-3">
        {backHref && (
          <a
            href={backHref}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#636363] hover:bg-[#F2F9F1] hover:text-[#26472B] transition-all duration-200 flex-shrink-0 mt-0.5"
            aria-label="Go back"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
        <div>
          <h1 className="text-2xl sm:text-[28px] font-open-sauce-bold text-[#26472B] leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[#636363] mt-1 font-open-sauce">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── 2. StatCard ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, hint, color = 'green', trend, icon }) {
  const variants = {
    slate:  'from-white to-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    green:  'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    indigo: 'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    emerald:'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    orange: 'from-[#FFF6EC] to-white text-[#7A4A0F] ring-[#FBE0BE]',
    red:    'from-[#FEF2F2] to-white text-[#7F1D1D] ring-[#FCA5A5]',
    blue:   'from-[#EFF6FF] to-white text-[#1E40AF] ring-blue-200',
    purple: 'from-[#F5F3FF] to-white text-[#5B21B6] ring-purple-200',
  };
  const accentDot = {
    slate:  'bg-[#909090]',
    green:  'bg-[#45A735]',
    indigo: 'bg-[#45A735]',
    emerald:'bg-[#45A735]',
    orange: 'bg-[#F59E0B]',
    red:    'bg-[#EF4444]',
    blue:   'bg-[#3B82F6]',
    purple: 'bg-[#8B5CF6]',
  };

  const v = variants[color] || variants.green;
  const dot = accentDot[color] || accentDot.green;

  const trendPositive = typeof trend === 'string' && trend.startsWith('+');
  const trendNegative = typeof trend === 'string' && trend.startsWith('-');

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${v} p-5 ring-1 shadow-[0_2px_8px_rgba(38,71,43,0.04)] hover:shadow-[0_8px_20px_rgba(69,167,53,0.10)] transition-shadow duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#636363] font-open-sauce-semibold">
          {label}
        </div>
        {icon ? (
          <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-base flex-shrink-0">
            {typeof icon === 'string' ? icon : icon}
          </div>
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${dot}`} />
        )}
      </div>
      <div className="mt-3 text-3xl font-open-sauce-bold text-[#26472B] leading-tight">
        {value}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {hint && (
          <span className="text-xs text-[#636363] font-open-sauce">{hint}</span>
        )}
        {trend && (
          <span
            className={`text-xs font-open-sauce-semibold ${
              trendPositive ? 'text-[#45A735]' : trendNegative ? 'text-[#EF4444]' : 'text-[#636363]'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 3. StatusBadge ───────────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }) {
  const map = {
    pending:         'bg-amber-50 text-amber-700 ring-amber-200',
    confirmed:       'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    assigned_to_pm:  'bg-violet-50 text-violet-700 ring-violet-200',
    in_progress:     'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    completed:       'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    cancelled:       'bg-red-50 text-red-700 ring-red-200',
    open:            'bg-blue-50 text-blue-700 ring-blue-200',
    active:          'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    suspended:       'bg-red-50 text-red-700 ring-red-200',
    escalated:       'bg-orange-50 text-orange-700 ring-orange-200',
    computed:        'bg-blue-50 text-blue-700 ring-blue-200',
    processed:       'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    approved:        'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    rejected:        'bg-red-50 text-red-700 ring-red-200',
    removed:         'bg-red-50 text-red-700 ring-red-200',
    flagged:         'bg-orange-50 text-orange-700 ring-orange-200',
    pending_approval:'bg-amber-50 text-amber-700 ring-amber-200',
  };

  const pulsing = status === 'in_progress' || status === 'active';
  const sizeClass = size === 'lg'
    ? 'px-3 py-1.5 text-xs gap-2'
    : 'px-2.5 py-1 text-[11px] gap-1.5';

  const label = status ? status.replace(/_/g, ' ') : '—';

  return (
    <span
      className={`inline-flex items-center rounded-full font-open-sauce-semibold ring-1 ${sizeClass} ${map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]'}`}
    >
      <span className="relative flex-shrink-0 w-1.5 h-1.5">
        {pulsing && (
          <span className="absolute inset-0 rounded-full bg-current opacity-40 animate-ping" />
        )}
        <span className="relative block w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      </span>
      {label}
    </span>
  );
}

// ─── 4. ErrorBox ──────────────────────────────────────────────────────────────
export function ErrorBox({ error }) {
  if (!error) return null;
  const msg =
    typeof error === 'string'
      ? error
      : error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Request failed';
  return (
    <div className="rounded-lg border border-red-200 bg-[#FFF5F5] px-4 py-3 text-sm text-red-700 font-open-sauce flex items-start gap-2">
      <svg className="flex-shrink-0 mt-0.5" width={14} height={14} viewBox="0 0 24 24" fill="none">
        <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={1.8} />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <span>{msg}</span>
    </div>
  );
}

// ─── 5. Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const dims = {
    sm: 'w-3 h-3 border-[1.5px]',
    md: 'w-4 h-4 border-2',
    lg: 'w-6 h-6 border-2',
  };
  const d = dims[size] || dims.md;

  if (size === 'md' || size === 'lg') {
    // Standalone centered spinner for page-level loading
    return (
      <div className="flex items-center justify-center py-12 gap-2.5 text-[#636363] text-sm font-open-sauce">
        <div className={`rounded-full border-[#45A735] border-t-transparent animate-spin ${d}`} />
        Loading…
      </div>
    );
  }

  // Inline sm spinner (no padding, no text — used inside buttons etc.)
  return (
    <div className={`rounded-full border-[#45A735] border-t-transparent animate-spin flex-shrink-0 ${d}`} />
  );
}

// ─── 6. EmptyState ────────────────────────────────────────────────────────────
export function EmptyState({ message, icon }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D6EBCF] bg-white py-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F2F9F1] flex items-center justify-center">
        {icon ? (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path d={icon} stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="text-sm text-[#636363] font-open-sauce">{message || 'No data yet.'}</div>
    </div>
  );
}

// ─── 7. Table ─────────────────────────────────────────────────────────────────
export function Table({ columns, rows, keyField = '_id', empty = 'No records', loading = false }) {
  if (loading) {
    return (
      <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
        <table className="min-w-full text-sm font-open-sauce">
          <thead className="bg-[#F2F9F1] text-[#26472B]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF5EC]">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((c, j) => (
                  <td key={c.key} className="px-4 py-3.5">
                    <div
                      className={`h-4 rounded-md bg-[#F2F9F1] animate-pulse ${
                        j === 0 ? 'w-32' : j === columns.length - 1 ? 'w-16' : 'w-24'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows || rows.length === 0) return <EmptyState message={empty} />;

  return (
    <div className="overflow-x-auto bg-white border border-[#E5F1E2] rounded-2xl shadow-[0_1px_3px_rgba(38,71,43,0.04)]">
      <table className="min-w-full text-sm font-open-sauce">
        <thead className="bg-[#F2F9F1] text-[#26472B]">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="text-left font-open-sauce-semibold text-[12px] uppercase tracking-wider px-4 py-3 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF5EC]">
          {rows.map((r) => (
            <tr key={r[keyField]} className="hover:bg-[#F7FBF6] transition-colors">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3.5 align-top text-[#484848]">
                  {c.render ? c.render(r) : r[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 8. Button ────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary: 'bg-[#45A735] text-white hover:bg-[#26472B] shadow-[0_4px_14px_rgba(120,235,84,0.35)]',
    outline: 'border border-[#45A735] text-[#45A735] bg-transparent hover:bg-[#45A735] hover:text-white',
    subtle:  'bg-[#F2F9F1] text-[#26472B] hover:bg-[#E5F1E2]',
    danger:  'bg-red-600 text-white hover:bg-red-700',
    ghost:   'text-[#26472B] hover:bg-[#F2F9F1]',
    warning: 'bg-[#F59E0B] text-white hover:bg-[#D97706]',
    success: 'bg-[#26472B] text-white hover:bg-[#1a3320]',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-open-sauce-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
    >
      {loading ? (
        <>
          <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0 opacity-70" />
          Loading…
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── 9. Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  if (!open) return null;

  const maxW = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-[#E5F1E2] w-full ${maxW[size] || maxW.md} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#E5F1E2] flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-lg font-open-sauce-bold text-[#26472B] leading-snug">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-[#636363] mt-0.5 font-open-sauce">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#909090] hover:bg-[#F2F9F1] hover:text-[#26472B] transition-all duration-200 text-lg leading-none font-open-sauce"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E5F1E2] flex justify-end gap-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 10. Input ────────────────────────────────────────────────────────────────
export function Input({ label, error, hint, prefix, suffix, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className={`w-full border rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none placeholder:text-[#909090] disabled:bg-[#F5F7F5] disabled:text-[#909090] transition-colors duration-150 ${borderClass} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-9' : ''} ${className}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#909090] text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#636363] mt-1 font-open-sauce">{hint}</p>
      )}
    </div>
  );
}

// ─── 11. Select ───────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none cursor-pointer disabled:bg-[#F5F7F5] disabled:text-[#909090] transition-colors duration-150 ${borderClass} ${className}`}
        >
          {children}
        </select>
        {/* Custom chevron arrow */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#636363]">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
    </div>
  );
}

// ─── 12. Textarea ─────────────────────────────────────────────────────────────
export function Textarea({ label, error, hint, rows = 3, className = '', ...props }) {
  const hasError = Boolean(error);
  const borderClass = hasError
    ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
    : 'border-[#D6EBCF] focus:ring-[#45A735]/30 focus:border-[#45A735]';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-open-sauce-semibold text-[#636363] uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        {...props}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:outline-none placeholder:text-[#909090] disabled:bg-[#F5F7F5] disabled:text-[#909090] resize-none transition-colors duration-150 ${borderClass} ${className}`}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1 font-open-sauce">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#636363] mt-1 font-open-sauce">{hint}</p>
      )}
    </div>
  );
}

// ─── 13. Toggle ───────────────────────────────────────────────────────────────
export function Toggle({ checked = false, onChange, label, disabled = false }) {
  const handleClick = () => {
    if (!disabled && onChange) onChange(!checked);
  };

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={handleClick}
    >
      {/* Track */}
      <div
        className={`relative w-10 h-6 rounded-full transition-all duration-200 ${
          checked ? 'bg-[#45A735]' : 'bg-[#D9D9D9]'
        }`}
      >
        {/* Thumb */}
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      {label && (
        <span className="text-sm font-open-sauce text-[#484848] select-none">{label}</span>
      )}
    </div>
  );
}

// ─── 14. Tabs ─────────────────────────────────────────────────────────────────
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex gap-1 bg-[#F5F7F5] rounded-xl p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange && onChange(tab.key)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'bg-white text-[#26472B] font-open-sauce-semibold shadow-[0_1px_3px_rgba(38,71,43,0.08)]'
                : 'text-[#636363] font-open-sauce-medium hover:text-[#26472B] hover:bg-white/60'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`inline-flex items-center ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-open-sauce-semibold ${
                  isActive
                    ? 'bg-[#45A735] text-white'
                    : 'bg-[#E5E7EB] text-[#636363]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── 15. Pagination ───────────────────────────────────────────────────────────
export function Pagination({ page = 1, total = 0, pageSize = 10, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Build page number list: current ± 2, capped to [1, totalPages]
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('…-start');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('…-end');
    pages.push(totalPages);
  }

  const btnBase =
    'px-2.5 py-1.5 rounded-lg text-sm font-open-sauce-medium transition-all duration-150 select-none';

  return (
    <div className="flex items-center justify-between text-sm">
      {/* Info */}
      <span className="text-[#636363] font-open-sauce">
        Showing {from}–{to} of {total} results
      </span>

      {/* Buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => page > 1 && onChange && onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Previous page"
        >
          ←
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={p} className="px-1 text-[#909090] select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => p !== page && onChange && onChange(p)}
              className={`${btnBase} ${
                p === page
                  ? 'bg-[#45A735] text-white'
                  : 'text-[#636363] hover:bg-[#F2F9F1]'
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => page < totalPages && onChange && onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} text-[#636363] hover:bg-[#F2F9F1] disabled:opacity-40 disabled:cursor-not-allowed`}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── 16. SearchInput ──────────────────────────────────────────────────────────
export function SearchInput({ value = '', onChange, placeholder = 'Search…' }) {
  return (
    <div className="relative">
      {/* Magnifier icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#909090] pointer-events-none">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#D6EBCF] rounded-lg pl-9 pr-8 py-2.5 text-sm font-open-sauce text-[#242424] bg-white focus:ring-2 focus:ring-[#45A735]/30 focus:border-[#45A735] focus:outline-none placeholder:text-[#909090] transition-colors duration-150"
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={() => onChange && onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#909090] hover:text-[#484848] rounded transition-colors"
          aria-label="Clear search"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── 17. SectionCard ──────────────────────────────────────────────────────────
export function SectionCard({ title, subtitle, children, action, className = '' }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_3px_rgba(38,71,43,0.04)] ${className}`}
    >
      {title && (
        <div className="px-5 pt-4 pb-3 border-b border-[#E5F1E2] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-open-sauce-bold text-[#26472B] leading-snug">{title}</div>
            {subtitle && (
              <div className="text-xs text-[#636363] mt-0.5 font-open-sauce">{subtitle}</div>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ─── 18. InfoRow ──────────────────────────────────────────────────────────────
export function InfoRow({ label, value, mono = false, copy = false }) {
  const handleCopy = () => {
    if (value != null && navigator?.clipboard) {
      navigator.clipboard.writeText(String(value));
    }
  };

  return (
    <div className="flex items-start justify-between py-2.5 border-b border-[#F2F9F1] last:border-0">
      <span className="text-xs text-[#909090] font-open-sauce-semibold uppercase tracking-wider w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div className="flex items-start gap-1.5 flex-1 justify-end min-w-0">
        <span
          className={`text-sm text-[#242424] text-right break-all ${
            mono ? 'font-mono text-xs' : 'font-open-sauce'
          }`}
        >
          {value ?? '—'}
        </span>
        {copy && value != null && (
          <button
            onClick={handleCopy}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#909090] hover:text-[#45A735] transition-colors mt-0.5"
            title="Copy to clipboard"
            aria-label="Copy"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <rect x={9} y={9} width={13} height={13} rx={2} stroke="currentColor" strokeWidth={1.8} />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 19. Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ name = '', size = 'md', src }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  // Derive initials: first letter of each word, up to 2
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const sizeClass = sizes[size] || sizes.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] text-white font-open-sauce-bold flex items-center justify-center flex-shrink-0 select-none`}
      aria-label={name || 'User'}
    >
      {initials || '?'}
    </div>
  );
}
