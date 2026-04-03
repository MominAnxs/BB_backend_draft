'use client';
import { useState } from 'react';
import { Building2, AlertTriangle, MessageSquare, Heart, UserX, UserCircle2, Briefcase, CreditCard, Zap } from 'lucide-react';
import { AllClients } from './adminland/AllClients';
import { IncidentData } from './adminland/IncidentData';
import { FeedbackData } from './adminland/FeedbackData';
import { ClientRelationshipData } from './adminland/ClientRelationshipData';
import { EmployeesNew } from './adminland/EmployeesNew';
import { LostClients } from './adminland/LostClients';
import { OnboardingModule } from './adminland/OnboardingModule';
import { BillingDetails } from './adminland/BillingDetails';
import { Integrations } from './adminland/Integrations';

type AdminTab = 'all-clients' | 'lost-clients' | 'incidents' | 'feedback' | 'relationships' | 'employees' | 'services' | 'billing' | 'integrations';

export function Adminland() {
  const [activeTab, setActiveTab] = useState<AdminTab>('all-clients');

  const navItems = [
    { id: 'all-clients' as AdminTab, label: 'All Clients', icon: Building2 },
    { id: 'lost-clients' as AdminTab, label: 'Lost Clients', icon: UserX },
    { id: 'incidents' as AdminTab, label: 'Incidents', icon: AlertTriangle },
    { id: 'feedback' as AdminTab, label: 'Feedbacks', icon: MessageSquare },
    { id: 'relationships' as AdminTab, label: 'Client Relationships', icon: Heart },
    { id: 'employees' as AdminTab, label: 'Employees', icon: UserCircle2 },
    { id: 'services' as AdminTab, label: 'Onboarding', icon: Briefcase },
    { id: 'billing' as AdminTab, label: 'Billing', icon: CreditCard },
    { id: 'integrations' as AdminTab, label: 'Integrations', icon: Zap },
  ];

  return (
    <div className="flex h-[calc(100vh-89px)]">
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
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-body ${
                    isActive
                      ? 'bg-[#EEF1FB] text-[#204CC7]'
                      : 'text-black/65 hover:text-black/90 hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </button>
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
        <div className="p-6">
          {activeTab === 'all-clients' && <AllClients onNavigateToIncidents={() => setActiveTab('incidents')} />}
          {activeTab === 'lost-clients' && <LostClients />}
          {activeTab === 'incidents' && <IncidentData />}
          {activeTab === 'feedback' && <FeedbackData />}
          {activeTab === 'relationships' && <ClientRelationshipData />}
          {activeTab === 'employees' && <EmployeesNew />}
          {activeTab === 'services' && <OnboardingModule />}
          {activeTab === 'billing' && <BillingDetails />}
          {activeTab === 'integrations' && <Integrations />}
        </div>
      </main>
    </div>
  );
}