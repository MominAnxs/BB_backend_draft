import { redirect } from 'next/navigation';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// Legacy alias — Employee CLA / NTF moved to the Home Employees tab.
export default function EmployeeCLAPage() {
  redirect(SUPER_ADMIN_HOME_ROUTES.employees.claNtf);
}
