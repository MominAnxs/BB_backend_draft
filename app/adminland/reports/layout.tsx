"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import {
  ReportsChrome,
  reportTabs,
  type ReportsDateRange,
  type ReportsDepartment,
} from '@/components/reports-chrome';

function getActiveTab(pathname: string): string {
  if (pathname === '/adminland/reports') return 'overview';
  if (pathname.startsWith('/adminland/reports/growth-pl')) return 'growth-pl';
  if (pathname.startsWith('/adminland/reports/attrition')) return 'attrition';
  if (pathname.startsWith('/adminland/reports/cla')) return 'cla';
  if (pathname.startsWith('/adminland/reports/sales')) return 'sales';
  if (pathname.startsWith('/adminland/reports/hr-reports')) return 'hr-reports';
  return 'overview';
}

function ReportsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [globalDateRange, setGlobalDateRange] = useState<ReportsDateRange>('ytd');
  const [globalDepartment, setGlobalDepartment] = useState<ReportsDepartment>('All');

  const activeTab = getActiveTab(pathname);
  const hrSection = searchParams.get('section') || 'overview';

  const handleTabChange = (tabId: string) => {
    const tab = reportTabs.find((t) => t.id === tabId);
    if (tab) router.push(tab.href);
  };

  const handleHRSectionChange = (sectionKey: string) => {
    router.push(`/adminland/reports/hr-reports?section=${sectionKey}`);
  };

  return (
    <ReportsChrome
      activeTab={activeTab}
      hrSection={hrSection}
      onTabChange={handleTabChange}
      onHRSectionChange={handleHRSectionChange}
      globalDateRange={globalDateRange}
      onDateRangeChange={setGlobalDateRange}
      globalDepartment={globalDepartment}
      onDepartmentChange={setGlobalDepartment}
    >
      {children}
    </ReportsChrome>
  );
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ReportsLayoutInner>{children}</ReportsLayoutInner>
    </Suspense>
  );
}
