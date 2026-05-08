"use client";
import { TaskManagement } from '@/workspace/TaskManagement';

// The Workspace module is now purely Task Management. This route renders
// TaskManagement scoped to the Performance Marketing (SEM) project —
// the client-groups view with all SEM client groups plus the Brego
// Delivery Team special group.
// The SEM *service workspace* (the deliverables, KSM flows, client
// detail) now lives exclusively inside the Super Admin Home sub-tabs at
// /home?tab=performance-marketing&sub=deliverables — not in the
// workspace.
export default function PerformanceMarketingWorkspacePage() {
  return <TaskManagement initialProjectId="pm" />;
}
