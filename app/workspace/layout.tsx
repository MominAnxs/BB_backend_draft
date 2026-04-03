"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileText, CheckSquare } from 'lucide-react';

const sidebarItems = [
  { id: 'taskManagement', label: 'Task Management', icon: CheckSquare, href: '/workspace/task-management' },
  { id: 'performanceMarketing', label: 'Performance Marketing', icon: BarChart3, href: '/workspace/performance-marketing' },
  { id: 'accountsTaxation', label: 'Accounts & taxation', icon: FileText, href: '/workspace/accounts-taxation' },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex h-[calc(100vh-59px)] bg-[#F8F9FB]">
      {/* Left Sidebar */}
      <div className="w-[240px] bg-white border-r border-black/[0.06] px-3 py-5 flex-shrink-0">
        <div className="mb-3">
          <h2 className="text-micro font-semibold text-black/60 mb-3 px-3">WORKSPACE</h2>
        </div>
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-body font-medium ${
                  active
                    ? 'bg-[#EEF1FB] text-[#204CC7]'
                    : 'text-black/60 hover:text-black/90 hover:bg-black/5'
                }`}
              >
                <Icon className="w-4 h-4" />
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
