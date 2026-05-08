/**
 * App Router link constants for the four Workspace module tabs.
 *
 * Canonical paths (match each tab's visible label):
 *
 *   - My Tasks               /workspace/my-tasks                (default)
 *   - Brego Group            /workspace/brego-group
 *   - Accounts & Taxation    /workspace/accounts-taxation
 *   - Performance Marketing  /workspace/performance-marketing
 *
 * Kept as a standalone leaf module (no React, no component imports) so
 * both the client-side sidebar and server redirect pages can import it
 * without creating a circular dependency — same pattern we used for
 * SUPER_ADMIN_HOME_ROUTES in /lib/super-admin-home-routes.ts.
 *
 * Usage:
 *   import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';
 *   <Link href={WORKSPACE_ROUTES.myTasks}>…</Link>
 *   router.push(WORKSPACE_ROUTES.bregoGroup);
 */
export const WORKSPACE_ROUTES = {
  /** Default landing tab — personal task queue across all projects. */
  myTasks:              '/workspace/my-tasks',
  /** Brego Group tab — internal delivery departments (Ops/Sales/etc.). */
  bregoGroup:           '/workspace/brego-group',
  /** Accounts & Taxation tab — A&T client groups + Brego Delivery Team. */
  accountsTaxation:     '/workspace/accounts-taxation',
  /** Performance Marketing tab — SEM client groups + Brego Delivery Team. */
  performanceMarketing: '/workspace/performance-marketing',
} as const;

export type WorkspaceTabId = keyof typeof WORKSPACE_ROUTES;
export type WorkspaceRoute = typeof WORKSPACE_ROUTES[WorkspaceTabId];

/**
 * Legacy paths that silently redirect to the canonical tab routes. Kept
 * so older cross-module links (Dashboard callouts, bookmarked URLs) keep
 * working after each URL-rename.
 *
 *   /workspace                                    → myTasks        (root)
 *   /workspace/task-management                    → bregoGroup     (pre-rename)
 *   /workspace/task-management/brego-group        → bregoGroup     (pre-rename sub-route)
 *   /workspace/task-management/my-assignments     → myTasks        (pre-rename sub-route)
 */
export const WORKSPACE_LEGACY_ALIASES: Record<string, WorkspaceRoute> = {
  '/workspace':                                  WORKSPACE_ROUTES.myTasks,
  '/workspace/task-management':                  WORKSPACE_ROUTES.bregoGroup,
  '/workspace/task-management/brego-group':      WORKSPACE_ROUTES.bregoGroup,
  '/workspace/task-management/my-assignments':   WORKSPACE_ROUTES.myTasks,
};
