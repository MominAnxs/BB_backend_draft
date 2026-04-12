import { Suspense } from 'react';
import EmployeesPage from './EmployeesPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeesPage />
    </Suspense>
  );
}