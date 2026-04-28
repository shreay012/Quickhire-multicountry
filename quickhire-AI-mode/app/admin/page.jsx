'use client';

import { useEffect, useState } from 'react';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, StatCard, Spinner, ErrorBox } from '@/components/staff/ui';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    staffApi.get('/admin/dashboard')
      .then((r) => setData(r.data?.data))
      .catch(setError);
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of platform activity" />
      <div className="p-4 sm:p-8 space-y-6">
        <ErrorBox error={error} />
        {!data && !error && <Spinner />}
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={data.totalUsers} color="green" />
              <StatCard label="Total Bookings" value={data.totalBookings} color="green" />
              <StatCard label="Revenue (paid)" value={`₹${(data.revenue?.total || 0).toLocaleString('en-IN')}`} hint={`${data.revenue?.count || 0} payments`} color="orange" />
              <StatCard label="Active Bookings" value={(data.bookingsByStatus?.confirmed || 0) + (data.bookingsByStatus?.assigned_to_pm || 0) + (data.bookingsByStatus?.in_progress || 0)} color="green" />
            </div>
            <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-4">Bookings by status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(data.bookingsByStatus || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-[#E5F1E2] bg-[#F7FBF6] p-3">
                    <div className="text-[11px] text-[#636363] font-open-sauce-semibold uppercase tracking-wider truncate">{k}</div>
                    <div className="text-2xl font-open-sauce-bold text-[#26472B] mt-1">{v}</div>
                  </div>
                ))}
                {Object.keys(data.bookingsByStatus || {}).length === 0 && (
                  <div className="col-span-full text-sm text-[#909090] font-open-sauce">No bookings yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
