'use client';

import { useSearchParams } from 'next/navigation';

export default function EmployeesPage() {
  const searchParams = useSearchParams();

  const id = searchParams.get('id');

  return (
    <div>
      Employee ID: {id}
    </div>
  );
}