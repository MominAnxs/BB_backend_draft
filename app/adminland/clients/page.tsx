'use client';

import { Suspense } from 'react';
import ClientsPage from './ClientsPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientsPage />
    </Suspense>
  );
}