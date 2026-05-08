import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — Incidents moved to the Home Customers tab.
export default function IncidentsPage() {
  redirect(SUPER_ADMIN_HOME_ROUTES.customers.incidents);
}
