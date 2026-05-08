"use client";
import { MyAssignments } from '@/workspace/MyAssignments';

// "My Tasks" — the default landing tab of the Workspace module. Renders
// the same screen that the "See all" button on the My Tasks widget opens.
// Content is unified: tasks assigned to the current user across ALL
// projects (Brego Group + A&T + SEM).
export default function MyTasksPage() {
  return <MyAssignments />;
}
