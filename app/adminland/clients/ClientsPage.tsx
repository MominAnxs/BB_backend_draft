// ClientsPage.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function ClientsPage() {
  const searchParams = useSearchParams();

  return <div>{searchParams.get('id')}</div>;
}