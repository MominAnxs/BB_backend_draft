import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — the Database group was retired. Its sub-tabs split
// between the Customers tab (All Customers) and the Employees tab
// (All Employees, Resource Request). The bare /adminland/database URL
// lands on the Employees Overview as the closest analogue.
export default function AdminlandDatabaseLegacyAlias() {
  redirect(SUPER_ADMIN_HOME_ROUTES.employees.root);
}
