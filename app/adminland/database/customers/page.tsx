import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — All Customers moved under the Customers tab on Home.
// Old /adminland/database/customers links land on the new canonical URL.
export default function Page() {
  redirect(SUPER_ADMIN_HOME_ROUTES.customers.allCustomers);
}
