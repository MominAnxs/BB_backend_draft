import { redirect } from 'next/navigation';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

// Workspace lands on the My Tasks tab by default — the most personally
// relevant first view for any user of the module.
export default function WorkspacePage() {
  redirect(WORKSPACE_ROUTES.myTasks);
}
