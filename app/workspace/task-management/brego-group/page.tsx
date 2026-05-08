import { redirect } from 'next/navigation';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

// Legacy alias: /workspace/task-management/brego-group redirects to the
// Brego Group tab (which IS /workspace/task-management). Kept so
// existing cross-module links (Dashboard etc.) continue to work.
export default function BregoGroupLegacyAlias() {
  redirect(WORKSPACE_ROUTES.bregoGroup);
}
