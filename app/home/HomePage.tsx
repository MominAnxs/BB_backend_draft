'use client';

import { useSearchParams } from 'next/navigation';
import { Dashboard } from '@/Dashboard';

export default function HomePage() {
  const searchParams = useSearchParams();

  return <Dashboard />;
}