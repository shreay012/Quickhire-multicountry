'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import staffApi from '@/lib/axios/staffApi';
import { Spinner, ErrorBox } from '@/components/staff/ui';
import ServiceFormPage from '../../_form';

export default function EditServicePage() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!id) return;
    staffApi.get(`/admin/services/${id}`)
      .then((r) => setService(r.data?.data || r.data))
      .catch(setError);
  }, [id]);

  if (error) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <ErrorBox error={error} />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <ServiceFormPage serviceId={id} initialData={service} />;
}
