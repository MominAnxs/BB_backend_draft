"use client";
import { TaskManagement } from '@/workspace/TaskManagement';

// The Workspace module is now purely Task Management. This route renders
// TaskManagement scoped to the A&T project — the client-groups view with
// all A&T client groups plus the Brego Delivery Team special group.
// The A&T *service workspace* (the deliverables checklist, client detail
// etc.) now lives exclusively inside the Super Admin Home sub-tabs at
// /home?tab=accounts-taxation&sub=deliverables — not in the workspace.
export default function AccountsTaxationWorkspacePage() {
  return <TaskManagement initialProjectId="at" />;
}
