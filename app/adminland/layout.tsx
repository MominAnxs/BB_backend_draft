"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, Users, ChevronDown, Building2, UserCircle2 } from 'lucide-react';

// ── Navigation structure ──

interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  href?: string;           // Direct link (no dropdown)
  subItems?: NavSubItem[]; // Dropdown children
  comingSoon?: boolean;
}

const navGroups: NavGroup[] = [
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    color: '#204CC7',
    href: '/adminland/reports',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Building2,
    color: '#06B6D4',
    href: '/adminland/customers',
    subItems: [
      // Only Active Customers stays in Adminland; the rest of the
      // operational customer pages (CLAs, Lost Clients, Incidents,
      // Feedbacks, Relationships, Onboarding) moved to the Home
      // sidebar under Customers.
      { id: 'active-customers', label: 'Active Customers', href: '/adminland/clients', icon: Building2 },
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: Users,
    color: '#7C3AED',
    href: '/adminland/employees-overview',
    subItems: [
      // Only Active Employees stays here; CLA/NTF and Incoming moved
      // to the Home Employees tab. Database (All Employees + Resource
      // Request) was retired and split between Home Customers (All
      // Customers) and Home Employees (the rest).
      { id: 'active-employees', label: 'Active Employees', href: '/adminland/employees', icon: UserCircle2 },
    ],
  },
];

// ── Helpers ──

function isGroupActive(group: NavGroup, pathname: string): boolean {
  if (group.href && pathname.startsWith(group.href)) return true;
  if (group.subItems) return group.subItems.some(s => pathname.startsWith(s.href));
  return false;
}

function isSubItemActive(href: string, pathname: string): boolean {
  // Exact match for root-level pages, startsWith for nested
  if (href === '/adminland/clients') return pathname === '/adminland/clients';
  if (href === '/adminland/employees') return pathname === '/adminland/employees';
  return pathname.startsWith(href);
}

export default function AdminlandLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Auto-expand groups that have an active sub-item
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(g => {
      if (g.subItems && (isGroupActive(g, pathname) || (g.href && pathname === g.href))) {
        initial[g.id] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-[calc(100vh-53px)]">
      {/* Left Sidebar Navigation */}
      <aside className="w-[252px] bg-white border-r border-black/[0.06] flex flex-col shrink-0" role="complementary" aria-label="Adminland sidebar">
        <div className="px-5 pt-6 pb-4">
          <h2 className="text-h2 text-black/90">Adminland</h2>
          <p className="text-caption font-normal text-black/50 mt-0.5">Command Centre</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Adminland navigation">
          <div className="space-y-0.5">
            {navGroups.map((group) => {
              const Icon = group.icon;
              const active = isGroupActive(group, pathname);
              const expanded = expandedGroups[group.id] ?? false;
              const hasDropdown = !!group.subItems;

              // Direct link (Reports, Database)
              if (!hasDropdown) {
                return (
                  <Link
                    key={group.id}
                    href={group.comingSoon ? '#' : group.href!}
                    aria-current={active ? 'page' : undefined}
                    onClick={group.comingSoon ? (e) => e.preventDefault() : undefined}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                      active
                        ? 'bg-[#204CC7]/[0.07]'
                        : group.comingSoon ? 'opacity-50 cursor-default' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? `bg-[${group.color}]/15` : 'bg-black/[0.04]'}`}
                      style={active ? { backgroundColor: `${group.color}15` } : {}}
                    >
                      <Icon className="w-4 h-4" style={{ color: active ? group.color : 'rgba(0,0,0,0.5)' }} />
                    </div>
                    <span className={`text-body font-semibold flex-1 ${active ? 'text-[#204CC7]' : 'text-black/70'}`}>{group.label}</span>
                    {group.comingSoon && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30 bg-black/[0.04] px-1.5 py-0.5 rounded">Soon</span>
                    )}
                  </Link>
                );
              }

              // Dropdown group (Customers, Employees)
              const groupIsOverview = group.href && pathname === group.href;
              return (
                <div key={group.id}>
                  <button
                    onClick={() => {
                      if (!expanded) {
                        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
                        if (group.href) router.push(group.href);
                      } else {
                        toggleGroup(group.id);
                      }
                    }}
                    aria-expanded={expanded}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${
                      groupIsOverview ? 'bg-[#204CC7]/[0.07]' : active && !expanded ? 'bg-black/[0.03]' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: active ? `${group.color}12` : 'rgba(0,0,0,0.04)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: active ? group.color : 'rgba(0,0,0,0.5)' }} />
                    </div>
                    <span className={`text-body font-semibold flex-1 ${active ? 'text-black/85' : 'text-black/70'}`}>{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-black/35 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Sub-items */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-out ${expanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="ml-[22px] pl-4 border-l border-black/[0.06] py-1 space-y-0.5">
                      {group.subItems!.map((sub) => {
                        const subActive = isSubItemActive(sub.href, pathname);
                        return (
                          <Link
                            key={sub.id}
                            href={sub.href}
                            aria-current={subActive ? 'page' : undefined}
                            className={`flex items-center gap-2 px-3 py-[7px] rounded-lg transition-all text-left ${
                              subActive
                                ? 'bg-[#204CC7]/[0.07] text-[#204CC7]'
                                : 'text-black/55 hover:text-black/80 hover:bg-black/[0.03]'
                            }`}
                          >
                            <span className={`text-caption font-medium ${subActive ? 'font-semibold' : ''}`}>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Sidebar footer stats */}
        <div className="px-5 py-4 border-t border-black/[0.06]">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-h3 text-black/85">127</p>
              <p className="text-[11px] text-black/45 mt-0.5">Clients</p>
            </div>
            <div>
              <p className="text-h3 text-[#00C875]">89</p>
              <p className="text-[11px] text-black/45 mt-0.5">Active</p>
            </div>
            <div>
              <p className="text-h3 text-black/85">45</p>
              <p className="text-[11px] text-black/45 mt-0.5">Team</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="px-6 pt-6 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
