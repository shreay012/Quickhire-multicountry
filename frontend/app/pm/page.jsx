'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, StatCard, Spinner, ErrorBox } from '@/components/staff/ui';

export default function PmDashboard() {
  const t = useTranslations('pm.dashboard');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    staffApi.get('/pm/dashboard')
      .then((r) => setData(r.data?.data))
      .catch(setError);
  }, []);

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <div className="p-4 sm:p-8 space-y-6">
        <ErrorBox error={error} />
        {!data && !error && <Spinner />}
        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={t('assigned')} value={data.assigned} color="green" />
              <StatCard label={t('inProgress')} value={data.inProgress} color="orange" />
              <StatCard label={t('paused')} value={data.paused || 0} color="orange" />
              <StatCard label={t('completed')} value={data.completed} color="slate" />
            </div>
            <div className="bg-white rounded-2xl border border-[#E5F1E2] p-5">
              <h3 className="text-sm font-open-sauce-bold text-[#26472B] mb-4">Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(data.byStatus || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-[#E5F1E2] bg-[#F7FBF6] p-3">
                    <div className="text-[11px] text-[#636363] font-open-sauce-semibold uppercase tracking-wider truncate">{k}</div>
                    <div className="text-2xl font-open-sauce-bold text-[#26472B] mt-1">{v}</div>
                  </div>
                ))}
                {Object.keys(data.byStatus || {}).length === 0 && (
                  <div className="text-sm text-[#909090] font-open-sauce">Nothing assigned yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
