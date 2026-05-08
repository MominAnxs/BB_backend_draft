import { redirect } from 'next/navigation';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

// Legacy alias: /workspace/task-management was the Brego Group tab
// URL before it was renamed to /workspace/brego-group to match the
// visible tab label. Kept so bookmarked links and older cross-module
// links keep working.
export default function TaskManagementLegacyAlias() {
  redirect(WORKSPACE_ROUTES.bregoGroup);
}
