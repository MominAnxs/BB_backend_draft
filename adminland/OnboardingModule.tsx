'use client';
import { useState } from 'react';
import { Search, CheckCircle2, Circle, ChevronDown, ChevronRight, Clock } from 'lucide-react';

// ═══════════════════════════════════════════════
// ─── DATA MODEL ───────────────────────────────
// ═══════════════════════════════════════════════

interface OnboardingStep {
  label: string;
  done: boolean;
}

interface OnboardingClient {
  id: string;
  name: string;
  service: 'PM' | 'A&T' | 'Both';
  assignee: { name: string; initials: string; color: string };
  startDate: string;
  onboarding: {
    status: 'Done' | 'Pending';
    progress: number; // 0–100
    steps: OnboardingStep[];
  };
  kickoff: {
    status: 'Done' | 'Pending';
    date?: string; // scheduled or completed date
  };
}

const clients: OnboardingClient[] = [
  {
    id: '1',
    name: 'Nor Black Nor White',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '18 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 20,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Competitor analysis completed', done: false },
        { label: 'Ad accounts access received', done: false },
        { label: 'Platform setup (Google/Meta)', done: false },
        { label: 'Tracking & analytics configured', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '2',
    name: 'Enagenbio',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '22 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 0,
      steps: [
        { label: 'Brand brief & USPs collected', done: false },
        { label: 'Competitor analysis completed', done: false },
        { label: 'Ad accounts access received', done: false },
        { label: 'Platform setup (Google/Meta)', done: false },
        { label: 'Tracking & analytics configured', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '3',
    name: 'Una Homes LLP',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '25 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 60,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Competitor analysis completed', done: true },
        { label: 'Ad accounts access received', done: true },
        { label: 'Platform setup (Google/Meta)', done: false },
        { label: 'Tracking & analytics configured', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '4',
    name: 'Alpine Group',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '05 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Competitor analysis completed', done: true },
        { label: 'Ad accounts access received', done: true },
        { label: 'Platform setup (Google/Meta)', done: true },
        { label: 'Tracking & analytics configured', done: true },
      ],
    },
    kickoff: { status: 'Done', date: '12 Mar 2026' },
  },
  {
    id: '5',
    name: 'Knickgasm',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '10 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Competitor analysis completed', done: true },
        { label: 'Ad accounts access received', done: true },
        { label: 'Platform setup (Google/Meta)', done: true },
        { label: 'Tracking & analytics configured', done: true },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '6',
    name: 'TechCorp India',
    service: 'A&T',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '01 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      steps: [
        { label: 'Company documents collected', done: true },
        { label: 'GST/TDS portal credentials received', done: true },
        { label: 'Tally backup & login received', done: true },
        { label: 'Bank statements uploaded', done: true },
        { label: 'Financial data verified', done: true },
      ],
    },
    kickoff: { status: 'Done', date: '08 Mar 2026' },
  },
  {
    id: '7',
    name: 'Green Energy Industries',
    service: 'A&T',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '15 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 40,
      steps: [
        { label: 'Company documents collected', done: true },
        { label: 'GST/TDS portal credentials received', done: true },
        { label: 'Tally backup & login received', done: false },
        { label: 'Bank statements uploaded', done: false },
        { label: 'Financial data verified', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '8',
    name: 'RetailMax',
    service: 'A&T',
    assignee: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
    startDate: '20 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 80,
      steps: [
        { label: 'Company documents collected', done: true },
        { label: 'GST/TDS portal credentials received', done: true },
        { label: 'Tally backup & login received', done: true },
        { label: 'Bank statements uploaded', done: true },
        { label: 'Financial data verified', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '9',
    name: 'Fashion Forward Ltd',
    service: 'Both',
    assignee: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
    startDate: '28 Feb 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Company documents collected', done: true },
        { label: 'All portal credentials received', done: true },
        { label: 'Platform setup completed', done: true },
        { label: 'Financial data verified', done: true },
      ],
    },
    kickoff: { status: 'Done', date: '10 Mar 2026' },
  },
  {
    id: '10',
    name: 'UrbanNest Realty',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '28 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 40,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Competitor analysis completed', done: true },
        { label: 'Ad accounts access received', done: false },
        { label: 'Platform setup (Google/Meta)', done: false },
        { label: 'Tracking & analytics configured', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '11',
    name: 'Skin Essentials',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '01 Apr 2026',
    onboarding: {
      status: 'Pending',
      progress: 0,
      steps: [
        { label: 'Brand brief & USPs collected', done: false },
        { label: 'Competitor analysis completed', done: false },
        { label: 'Ad accounts access received', done: false },
        { label: 'Platform setup (Google/Meta)', done: false },
        { label: 'Tracking & analytics configured', done: false },
      ],
    },
    kickoff: { status: 'Pending' },
  },
  {
    id: '12',
    name: 'Bio Basket',
    service: 'Both',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '10 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      steps: [
        { label: 'Brand brief & USPs collected', done: true },
        { label: 'Company documents collected', done: true },
        { label: 'All portal credentials received', done: true },
        { label: 'Platform setup completed', done: true },
        { label: 'Financial data verified', done: true },
      ],
    },
    kickoff: { status: 'Done', date: '18 Mar 2026' },
  },
];

// ═══════════════════════════════════════════════
// ─── HELPERS ──────────────────────────────────
// ═══════════════════════════════════════════════

const serviceColors: Record<string, { bg: string; text: string }> = {
  PM: { bg: 'bg-purple-50', text: 'text-[#7C3AED]' },
  'A&T': { bg: 'bg-cyan-50', text: 'text-[#06B6D4]' },
  Both: { bg: 'bg-blue-50', text: 'text-[#204CC7]' },
};

type FilterType = 'all' | 'pending' | 'done';
type ServiceFilterType = 'all' | 'PM' | 'A&T' | 'Both';

// ═══════════════════════════════════════════════
// ─── COMPONENT ────────────────────────────────
// ═══════════════════════════════════════════════

export function OnboardingModule() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derived counts
  const pendingCount = clients.filter(c => c.onboarding.status === 'Pending').length;
  const doneCount = clients.filter(c => c.onboarding.status === 'Done').length;

  // Filter clients
  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending' && c.onboarding.status !== 'Pending') return false;
    if (statusFilter === 'done' && c.onboarding.status !== 'Done') return false;
    if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
    return true;
  });

  // Sort: Pending first, then by progress (low → high within pending), Done at bottom
  const sorted = [...filtered].sort((a, b) => {
    if (a.onboarding.status !== b.onboarding.status) {
      return a.onboarding.status === 'Pending' ? -1 : 1;
    }
    if (a.onboarding.status === 'Pending') {
      return a.onboarding.progress - b.onboarding.progress;
    }
    return 0;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-h1 text-black/90">Client Onboarding</h1>
        <p className="text-body text-black/50 mt-1">Track onboarding progress and kickoff status for all clients</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.04]">
          <p className="text-caption text-black/45 font-medium">Total Clients</p>
          <p className="text-h2 text-black/80 mt-0.5">{clients.length}</p>
        </div>
        <div className="px-4 py-3 rounded-xl bg-amber-50/60 border border-amber-100/60">
          <p className="text-caption text-amber-600 font-medium">Onboarding Pending</p>
          <p className="text-h2 text-amber-700 mt-0.5">{pendingCount}</p>
        </div>
        <div className="px-4 py-3 rounded-xl bg-emerald-50/60 border border-emerald-100/60">
          <p className="text-caption text-emerald-600 font-medium">Onboarding Done</p>
          <p className="text-h2 text-emerald-700 mt-0.5">{doneCount}</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Search */}
        <div className="relative flex-1 max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-black/[0.02] border border-black/[0.06] rounded-lg text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/20 transition-all"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterType)}
          className="px-3 py-2 bg-black/[0.02] border border-black/[0.06] rounded-lg text-body text-black/70 font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/20 transition-all cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>

        {/* Service Filter */}
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value as ServiceFilterType)}
          className="px-3 py-2 bg-black/[0.02] border border-black/[0.06] rounded-lg text-body text-black/70 font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/20 transition-all cursor-pointer"
        >
          <option value="all">All Services</option>
          <option value="PM">Performance Marketing</option>
          <option value="A&T">Accounts & Taxation</option>
          <option value="Both">Both</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-black/[0.06] rounded-xl overflow-hidden bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_90px_120px_150px_140px] gap-0 px-5 py-2.5 bg-black/[0.02] border-b border-black/[0.06]">
          <span className="text-caption font-semibold text-black/45">Client</span>
          <span className="text-caption font-semibold text-black/45">Service</span>
          <span className="text-caption font-semibold text-black/45">Onboarding</span>
          <span className="text-caption font-semibold text-black/45">Progress</span>
          <span className="text-caption font-semibold text-black/45">Assigned To</span>
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-body text-black/35">No clients match your filters</p>
          </div>
        ) : (
          <div>
            {sorted.map((client) => {
              const isExpanded = expandedId === client.id;
              const sc = serviceColors[client.service];
              const stepsCompleted = client.onboarding.steps.filter(s => s.done).length;
              const stepsTotal = client.onboarding.steps.length;
              const isOnboardingDone = client.onboarding.status === 'Done';

              return (
                <div key={client.id} className={`border-b border-black/[0.04] last:border-b-0 ${!isOnboardingDone ? 'bg-white' : 'bg-black/[0.008]'}`}>
                  {/* Main Row */}
                  <div
                    className="grid grid-cols-[1fr_90px_120px_150px_140px] gap-0 px-5 py-3 items-center hover:bg-black/[0.01] transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : client.id); } }}
                    aria-expanded={isExpanded}
                    aria-label={`${client.name}: Onboarding ${client.onboarding.status}`}
                  >
                    {/* Client Name */}
                    <div className="flex items-center gap-2.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-black/30 flex-shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-black/30 flex-shrink-0" />
                      }
                      <span className="text-body font-medium text-black/80 truncate">{client.name}</span>
                    </div>

                    {/* Service */}
                    <div>
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-md ${sc.bg} ${sc.text}`}>
                        {client.service}
                      </span>
                    </div>

                    {/* Onboarding Status */}
                    <div className="flex items-center gap-1.5">
                      {isOnboardingDone ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-caption font-semibold text-emerald-600">Done</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span className="text-caption font-semibold text-amber-600">Pending</span>
                        </>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-16 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOnboardingDone ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${client.onboarding.progress}%` }}
                        />
                      </div>
                      <span className="text-caption font-medium text-black/40 w-[36px]">{client.onboarding.progress}%</span>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: client.assignee.color }}
                      >
                        {client.assignee.initials}
                      </div>
                      <span className="text-caption text-black/50 truncate">{client.assignee.name.split(' ')[0]}</span>
                    </div>
                  </div>

                  {/* Expanded Checklist */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 ml-[22px] border-t border-black/[0.03]">
                      <div className="flex items-center gap-3 mb-3 mt-2">
                        <p className="text-caption font-semibold text-black/50">
                          Onboarding Checklist — {stepsCompleted}/{stepsTotal} completed
                        </p>
                        <span className="text-caption text-black/30">Started {client.startDate}</span>
                        {client.kickoff.date && (
                          <span className="text-caption text-emerald-500 font-medium">Kickoff: {client.kickoff.date}</span>
                        )}
                      </div>
                      <div className="space-y-0">
                        {client.onboarding.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2.5 py-1.5">
                            {step.done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-black/15 flex-shrink-0" />
                            )}
                            <span className={`text-body ${step.done ? 'text-black/40 line-through' : 'text-black/70'}`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <p className="text-caption text-black/30 mt-3 px-1">
        Showing {sorted.length} of {clients.length} clients
      </p>
    </div>
  );
}
