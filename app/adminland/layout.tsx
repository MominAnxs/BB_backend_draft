"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, AlertTriangle, MessageSquare, Heart, UserX, UserCircle2, Briefcase, CreditCard, Zap, BarChart3 } from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Overview', icon: BarChart3, href: '/adminland/overview' },
  { id: 'all-clients', label: 'All Clients', icon: Building2, href: '/adminland/clients' },
  { id: 'lost-clients', label: 'Lost Clients', icon: UserX, href: '/adminland/lost-clients' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, href: '/adminland/incidents' },
  { id: 'feedback', label: 'Feedbacks', icon: MessageSquare, href: '/adminland/feedbacks' },
  { id: 'relationships', label: 'Client Relationships', icon: Heart, href: '/adminland/relationships' },
  { id: 'employees', label: 'Employees', icon: UserCircle2, href: '/adminland/employees' },
  { id: 'services', label: 'Onboarding', icon: Briefcase, href: '/adminland/onboarding' },
  { id: 'billing', label: 'Billing', icon: CreditCard, href: '/adminland/billing' },
  { id: 'integrations', label: 'Integrations', icon: Zap, href: '/adminland/integrations' },
];

export default function AdminlandLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-[calc(100vh-53px)]">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-black/5" role="complementary" aria-label="Adminland sidebar">
        <div className="p-5">
          <div className="mb-6">
            <h2 className="text-black/90 text-h2">Adminland</h2>
            <p className="text-black/60 mt-0.5 text-caption font-normal">Command Centre</p>
          </div>

          <nav className="space-y-1" aria-label="Adminland navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-body ${
                    isActive
                      ? 'bg-[#EEF1FB] text-[#204CC7]'
                      : 'text-black/65 hover:text-black/90 hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Stats Card */}
          <div className="mt-6 p-4 bg-black/5 rounded-xl">
            <h3 className="text-black/70 text-caption font-semibold">Quick Stats</h3>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-black/60 text-caption font-normal">Total Clients</span>
                <span className="text-black/90 text-body font-semibold">127</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black/60 text-caption font-normal">Active Projects</span>
                <span className="text-emerald-600 text-body font-semibold">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-black/60 text-caption font-normal">Team Members</span>
                <span className="text-black/90 text-body font-semibold">45</span>
              </div>
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
