'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import {
  PageHeader,
  StatCard,
  Spinner,
  ErrorBox,
  Button,
  StatusBadge,
  EmptyState,
} from '@/components/staff/ui';

// ── Inline SectionCard ────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5F1E2] shadow-[0_1px_4px_rgba(38,71,43,0.04)] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 border-b border-[#EEF5EC]">
        <div>
          <h3 className="text-sm font-open-sauce-bold text-[#26472B]">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[#909090] font-open-sauce mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Avatar (initials) ─────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#45A735] to-[#26472B] flex items-center justify-center text-white font-open-sauce-bold text-xs flex-shrink-0">
      {initials}
    </div>
  );
}

// ── Month label helper ────────────────────────────────────────────────────────
function shortMonth(monthStr) {
  // monthStr like '2024-01'
  try {
    const [year, mon] = monthStr.split('-');
    const d = new Date(Number(year), Number(mon) - 1, 1);
    return d.toLocaleString('en-US', { month: 'short' });
  } catch {
    return monthStr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [bookingsByStatus, setBookingsByStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      staffApi.get('/admin/dashboard/stats'),
      staffApi.get('/admin/dashboard/revenue'),
      staffApi.get('/admin/dashboard/recent-activity'),
      staffApi.get('/admin/dashboard'),
    ]).then(([statsRes, revenueRes, activityRes, dashRes]) => {
      const errs = {};

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data || null);
      } else {
        errs.stats = statsRes.reason;
      }

      if (revenueRes.status === 'fulfilled') {
        const raw = revenueRes.value.data?.data || revenueRes.value.data;
        setRevenueData(Array.isArray(raw) ? raw : []);
      } else {
        errs.revenue = revenueRes.reason;
      }

      if (activityRes.status === 'fulfilled') {
        const raw = activityRes.value.data?.data || activityRes.value.data;
        setRecentActivity(Array.isArray(raw) ? raw : []);
      } else {
        errs.activity = activityRes.reason;
      }

      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value.data?.data || dashRes.value.data;
        setBookingsByStatus(raw?.bookingsByStatus || {});
        // Fill stats fallback from /admin/dashboard if /admin/dashboard/stats failed
        if (errs.stats && raw) {
          setStats({
            totalBookings: raw.totalBookings,
            pendingBookings: null,
            activeJobs: null,
            totalRevenue: raw.revenue?.total || 0,
            totalCustomers: raw.totalUsers,
            totalPMs: null,
            totalResources: null,
            revenue: raw.revenue,
          });
          delete errs.stats;
        }
      } else {
        errs.dash = dashRes.reason;
      }

      setErrors(errs);
      setLoading(false);
    });
  }, []);

  // Revenue chart values
  const maxRev = Math.max(...revenueData.map((r) => r.revenue ?? 0), 1);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of QuickHire platform operations"
      />

      <div className="p-4 sm:p-8 space-y-6">
        {/* ── ROW 1: Stat Cards ────────────────────────────────────────────── */}
        {loading && !stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-full">
              <Spinner />
            </div>
          </div>
        ) : (
          <>
            {errors.stats && <ErrorBox error={errors.stats} />}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Customers"
                  value={stats.totalCustomers ?? '—'}
                  color="green"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>👥</span> All registered customers
                    </span>
                  }
                />
                <StatCard
                  label="Total Bookings"
                  value={stats.totalBookings ?? '—'}
                  color="green"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>📋</span> Lifetime bookings
                    </span>
                  }
                />
                <StatCard
                  label="Active Jobs"
                  value={stats.activeJobs ?? '—'}
                  color="green"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>⚡</span> Currently in-progress
                    </span>
                  }
                />
                <StatCard
                  label="Revenue"
                  value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`}
                  color="orange"
                  hint={
                    stats.revenue?.count != null
                      ? `${stats.revenue.count} payments`
                      : undefined
                  }
                />
                <StatCard
                  label="Pending Approval"
                  value={stats.pendingBookings ?? '—'}
                  color="red"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>⏳</span> Awaiting action
                    </span>
                  }
                />
                <StatCard
                  label="Project Managers"
                  value={stats.totalPMs ?? '—'}
                  color="green"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>👤</span> Active PMs
                    </span>
                  }
                />
                <StatCard
                  label="Resources"
                  value={stats.totalResources ?? '—'}
                  color="green"
                  hint={
                    <span className="flex items-center gap-1">
                      <span>🛠</span> Field workers
                    </span>
                  }
                />
              </div>
            )}
          </>
        )}

        {/* ── ROW 2: Revenue Chart + Bookings by Status ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Bar Chart */}
          <SectionCard title="Revenue Trend (Last 6 months)">
            {errors.revenue ? (
              <ErrorBox error={errors.revenue} />
            ) : loading ? (
              <Spinner />
            ) : revenueData.length === 0 ? (
              <EmptyState message="No revenue data available." />
            ) : (
              <div>
                <div className="flex items-end gap-2 h-36 w-full">
                  {revenueData.map((r) => {
                    const barH = Math.max(4, (r.revenue / maxRev) * 136);
                    return (
                      <div
                        key={r.month}
                        className="flex flex-col items-center gap-1 flex-1 group relative"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#26472B] text-white text-[10px] font-open-sauce-semibold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                          ₹{(r.revenue || 0).toLocaleString('en-IN')}
                        </div>
                        <div
                          className="w-full bg-[#45A735] rounded-t-md hover:bg-[#26472B] transition-all duration-200 cursor-default"
                          style={{ height: `${barH}px`, minHeight: '4px' }}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* X-axis labels */}
                <div className="flex items-center gap-2 mt-2">
                  {revenueData.map((r) => (
                    <div
                      key={r.month}
                      className="flex-1 text-center text-[10px] text-[#909090] font-open-sauce"
                    >
                      {shortMonth(r.month)}
                    </div>
                  ))}
                </div>
                {/* Max value label */}
                <div className="text-right text-[10px] text-[#909090] font-open-sauce mt-1">
                  Max: ₹{maxRev.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </SectionCard>

          {/* Bookings by Status */}
          <SectionCard title="Bookings by Status">
            {errors.dash ? (
              <ErrorBox error={errors.dash} />
            ) : loading ? (
              <Spinner />
            ) : Object.keys(bookingsByStatus).length === 0 ? (
              <p className="text-sm text-[#909090] font-open-sauce">No bookings yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(bookingsByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="bg-[#F7FBF6] rounded-xl border border-[#E5F1E2] p-3"
                  >
                    <div className="text-[11px] text-[#636363] font-open-sauce-semibold uppercase tracking-wider truncate">
                      {status.replace(/_/g, ' ')}
                    </div>
                    <div className="text-2xl font-open-sauce-bold text-[#26472B] mt-1">
                      {count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── ROW 3: Recent Activity ───────────────────────────────────────── */}
        <SectionCard
          title="Recent Activity"
          subtitle="Last 10 bookings"
          action={
            <Button
              size="sm"
              variant="subtle"
              onClick={() => router.push('/admin/bookings')}
            >
              View all
            </Button>
          }
        >
          {errors.activity ? (
            <ErrorBox error={errors.activity} />
          ) : loading ? (
            <Spinner />
          ) : recentActivity.length === 0 ? (
            <EmptyState message="No recent bookings." />
          ) : (
            <div className="divide-y divide-[#EEF5EC]">
              {recentActivity.map((item) => (
                <div key={item._id} className="flex items-center justify-between py-3">
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={item.customerName} />
                    <div className="min-w-0">
                      <div className="text-sm font-open-sauce-semibold text-[#242424] truncate">
                        {item.customerName || '—'}
                      </div>
                      <div className="text-xs text-[#636363] font-open-sauce truncate">
                        {item.serviceName || '—'}
                        {' · '}
                        {item.startTime
                          ? new Date(item.startTime).toLocaleDateString()
                          : 'No date'}
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <StatusBadge status={item.status} />
                    <span className="text-sm font-open-sauce-semibold text-[#26472B] hidden sm:block">
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/bookings/${item._id}`)}
                    >
                      →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
