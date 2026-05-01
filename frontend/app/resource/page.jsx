'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import staffApi from '@/lib/axios/staffApi';
import { PageHeader, StatCard, Spinner, ErrorBox } from '@/components/staff/ui';

export default function ResourceDashboard() {
  const t = useTranslations('resource.dashboard');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    staffApi.get('/resource/dashboard')
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={t('activeAssignments')} value={data.activeAssignments} color="orange" />
            <StatCard label={t('completed')} value={data.completedAssignments} color="green" />
            <StatCard label={t('hoursLogged')} value={data.totalHoursLogged} hint={t('lifetime')} color="slate" />
          </div>
        )}
      </div>
    </div>
  );
}
