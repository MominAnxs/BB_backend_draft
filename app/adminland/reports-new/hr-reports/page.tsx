"use client";
import { HRReport } from '@/HRReport';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HRReportPage() {
  const searchParams = useSearchParams();
  const section = (searchParams.get('section') || 'overview') as 'overview' | 'resource' | 'efforts' | 'performance' | 'engagement' | 'onboarding' | 'incidents';
  return <HRReport activeSection={section} />;
}

export default function AdminHRReportsPage() {
  return (
    <Suspense fallback={null}>
      <HRReportPage />
    </Suspense>
  );
}
