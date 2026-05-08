import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — CLAs moved to the Home Customers tab.
export default function AdminCLAPage() {
  redirect(SUPER_ADMIN_HOME_ROUTES.customers.cla);
}
