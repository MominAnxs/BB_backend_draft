"use client";
import { BregoGroupDetail } from '@/workspace/BregoGroupDetail';

// "Brego Group" tab — internal delivery departments
// (Ops & Finance · Sales · Marketing · Technology).
// URL now matches the tab label. The old /workspace/task-management path
// is preserved as a legacy redirect so existing cross-module links work.
export default function BregoGroupPage() {
  return <BregoGroupDetail />;
}
