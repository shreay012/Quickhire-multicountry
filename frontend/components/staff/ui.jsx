'use client';

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[#E5F1E2] bg-white px-4 sm:px-8 py-5">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-open-sauce-bold text-[#26472B]">{title}</h1>
        {subtitle && <p className="text-sm text-[#636363] mt-1 font-open-sauce">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, color = 'green' }) {
  // color presets aligned to QuickHire palette
  const variants = {
    slate: 'from-white to-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    green: 'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    indigo: 'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]', // mapped to brand
    emerald: 'from-[#F2F9F1] to-white text-[#26472B] ring-[#D6EBCF]',
    orange: 'from-[#FFF6EC] to-white text-[#7A4A0F] ring-[#FBE0BE]',
    red: 'from-[#FEF2F2] to-white text-[#7F1D1D] ring-[#FCA5A5]',
  };
  const accentDot = {
    slate: 'bg-[#909090]',
    green: 'bg-[#45A735]',
    indigo: 'bg-[#45A735]',
    emerald: 'bg-[#45A735]',
    orange: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
  };
  const v = variants[color] || variants.green;
  const dot = accentDot[color] || accentDot.green;

  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${v} p-5 ring-1 shadow-[0_2px_8px_rgba(38,71,43,0.04)] hover:shadow-[0_8px_20px_rgba(69,167,53,0.10)] transition-shadow duration-200`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#636363] font-open-sauce-semibold">
          {label}
        </div>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
      </div>
      <div className="mt-3 text-3xl font-open-sauce-bold text-[#26472B] leading-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-[#636363] font-open-sauce">{hint}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    confirmed: 'bg-[#F2F9F1] text-[#26472B] ring-[#D6EBCF]',
    assigned_to_pm: 'bg-violet-50 text-violet-700 ring-violet-200',
    in_progress: 'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    completed: 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
    open: 'bg-blue-50 text-blue-700 ring-blue-200',
    active: 'bg-[#F2F9F1] text-[#26472B] ring-[#45A735]/40',
    suspended: 'bg-red-50 text-red-700 ring-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-open-sauce-semibold ring-1 ${map[status] || 'bg-[#F5F7F5] text-[#484848] ring-[#E5E7EB]'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status || '—'}
    </span>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  const msg = error?.response?.data?.error?.message || error?.message || 'Request failed';
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-open-sauce">
      {msg}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 gap-2.5 text-[#636363] text-sm font-open-sauce">
      <div className="w-4 h-4 rounded-full border-2 border-[#45A735] border-t-transparent animate-spin" />
      Loading…
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#D6EBCF] bg-white py-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#F2F9F1] flex items-center justify-center">
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#45A735" strokeWidth={1.6} strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-sm text-[#636363] font-open-sauce">{message || 'No data yet.'}</div>
    </div>
  );
}

export function Table({ columns, rows, keyField = '_id', empty = 'No records' }) {
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

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  const variants = {
    primary:
      'bg-[#45A735] text-white hover:bg-[#26472B] shadow-[0_4px_14px_rgba(120,235,84,0.35)]',
    outline:
      'border border-[#45A735] text-[#45A735] bg-transparent hover:bg-[#45A735] hover:text-white',
    subtle:
      'bg-[#F2F9F1] text-[#26472B] hover:bg-[#E5F1E2]',
    danger:
      'bg-red-600 text-white hover:bg-red-700',
    ghost:
      'text-[#26472B] hover:bg-[#F2F9F1]',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-open-sauce-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
