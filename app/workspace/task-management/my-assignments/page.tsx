import { redirect } from 'next/navigation';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

// Legacy alias: /workspace/task-management/my-assignments redirects to
// the My Tasks tab. Kept so existing in-app router pushes and bookmarked
// URLs continue to work after the "My Tasks becomes a top-level tab"
// refactor.
export default function MyAssignmentsLegacyAlias() {
  redirect(WORKSPACE_ROUTES.myTasks);
}
