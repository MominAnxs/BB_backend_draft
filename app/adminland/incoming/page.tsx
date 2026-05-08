import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — Incoming moved to the Home Employees tab.
export default function IncomingPage() {
  redirect(SUPER_ADMIN_HOME_ROUTES.employees.incoming);
}
