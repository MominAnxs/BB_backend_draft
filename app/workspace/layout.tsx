"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, BarChart3, FileText, CheckSquare } from 'lucide-react';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

/**
 * Workspace is now purely a Task Management module. Four tabs:
 *
 *   1. My Tasks (default)             — tasks assigned to the current
 *                                       user across ALL projects. Same
 *                                       screen as the "See all" button on
 *                                       the My Tasks widget.
 *   2. Brego Group                    — internal delivery groups
 *                                       (Ops & Finance, Sales, Marketing,
 *                                       Technology) + My Tasks +
 *                                       Schedule.
 *   3. Accounts & Taxation            — all A&T client groups + the
 *                                       Brego Delivery Team special group.
 *   4. Performance Marketing          — all SEM client groups + the
 *                                       Brego Delivery Team special group.
 *
 * The previous service-workspace tabs (the standalone A&T and PM service
 * views) are no longer in the workspace module — they live inside the
 * Super Admin Home sub-tabs, which is the right place for them.
 */
const sidebarItems = [
  { id: 'myTasks',              label: 'My Tasks',              icon: CheckSquare, href: WORKSPACE_ROUTES.myTasks },
  { id: 'bregoGroup',           label: 'Brego Group',           icon: Building2,   href: WORKSPACE_ROUTES.bregoGroup },
  { id: 'accountsTaxation',     label: 'Accounts & Taxation',   icon: FileText,    href: WORKSPACE_ROUTES.accountsTaxation },
  { id: 'performanceMarketing', label: 'Performance Marketing', icon: BarChart3,   href: WORKSPACE_ROUTES.performanceMarketing },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Each tab owns its own URL prefix. Legacy paths get caught here so
  // the correct sidebar tab still highlights during the brief redirect
  // blink on old cross-module links and bookmarks.
  const isActive = (href: string) => {
    if (href === WORKSPACE_ROUTES.myTasks) {
      return pathname.startsWith(WORKSPACE_ROUTES.myTasks)
        || pathname.startsWith('/workspace/task-management/my-assignments');
    }
    if (href === WORKSPACE_ROUTES.bregoGroup) {
      // Brego Group tab — new canonical /workspace/brego-group, plus
      // the legacy /workspace/task-management(/brego-group) redirects.
      return pathname.startsWith(WORKSPACE_ROUTES.bregoGroup)
        || (pathname.startsWith('/workspace/task-management')
            && !pathname.startsWith('/workspace/task-management/my-assignments'));
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-[calc(100vh-59px)] bg-[#F8F9FB]">
      {/* Left Sidebar */}
      <div className="w-[240px] bg-white border-r border-black/[0.06] px-3 py-5 flex-shrink-0">
        <div className="mb-3">
          <h2 className="text-caption font-semibold text-black/60 mb-3 px-3 uppercase tracking-wide">Workspace</h2>
        </div>
        <nav className="space-y-1" aria-label="Workspace navigation">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-body font-medium ${
                  active
                    ? 'bg-[#EEF1FB] text-[#204CC7]'
                    : 'text-black/65 hover:text-black/90 hover:bg-black/5'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto px-8 pt-6 pb-6 min-w-0">
        {children}
      </div>
    </div>
  );
}
