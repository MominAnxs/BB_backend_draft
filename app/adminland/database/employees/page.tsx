import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — All Employees moved under the Home Employees tab.
export default function Page() {
  redirect(SUPER_ADMIN_HOME_ROUTES.employees.allEmployees);
}
