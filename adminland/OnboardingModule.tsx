'use client';
import { useState } from 'react';
import { Search, CheckCircle2, Circle, Clock, X, CalendarDays, User, Building2, Briefcase, ArrowRight, Sparkles, AlertTriangle, ChevronRight } from 'lucide-react';

// ═══════════════════════════════════════════════
// ─── DATA MODEL ───────────────────────────────
// ═══════════════════════════════════════════════

interface OnboardingStep {
  label: string;
  done: boolean;
  completedDate?: string; // e.g. '18 Mar 2026'
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '19 Mar 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '26 Mar 2026' },
        { label: 'Competitor analysis completed', done: true, completedDate: '28 Mar 2026' },
        { label: 'Ad accounts access received', done: true, completedDate: '30 Mar 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '06 Mar 2026' },
        { label: 'Competitor analysis completed', done: true, completedDate: '07 Mar 2026' },
        { label: 'Ad accounts access received', done: true, completedDate: '08 Mar 2026' },
        { label: 'Platform setup (Google/Meta)', done: true, completedDate: '10 Mar 2026' },
        { label: 'Tracking & analytics configured', done: true, completedDate: '11 Mar 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '11 Mar 2026' },
        { label: 'Competitor analysis completed', done: true, completedDate: '13 Mar 2026' },
        { label: 'Ad accounts access received', done: true, completedDate: '14 Mar 2026' },
        { label: 'Platform setup (Google/Meta)', done: true, completedDate: '16 Mar 2026' },
        { label: 'Tracking & analytics configured', done: true, completedDate: '17 Mar 2026' },
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
        { label: 'Company documents collected', done: true, completedDate: '02 Mar 2026' },
        { label: 'GST/TDS portal credentials received', done: true, completedDate: '03 Mar 2026' },
        { label: 'Tally backup & login received', done: true, completedDate: '04 Mar 2026' },
        { label: 'Bank statements uploaded', done: true, completedDate: '06 Mar 2026' },
        { label: 'Financial data verified', done: true, completedDate: '07 Mar 2026' },
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
        { label: 'Company documents collected', done: true, completedDate: '16 Mar 2026' },
        { label: 'GST/TDS portal credentials received', done: true, completedDate: '18 Mar 2026' },
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
        { label: 'Company documents collected', done: true, completedDate: '21 Mar 2026' },
        { label: 'GST/TDS portal credentials received', done: true, completedDate: '22 Mar 2026' },
        { label: 'Tally backup & login received', done: true, completedDate: '24 Mar 2026' },
        { label: 'Bank statements uploaded', done: true, completedDate: '26 Mar 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '01 Mar 2026' },
        { label: 'Company documents collected', done: true, completedDate: '02 Mar 2026' },
        { label: 'All portal credentials received', done: true, completedDate: '04 Mar 2026' },
        { label: 'Platform setup completed', done: true, completedDate: '06 Mar 2026' },
        { label: 'Financial data verified', done: true, completedDate: '08 Mar 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '29 Mar 2026' },
        { label: 'Competitor analysis completed', done: true, completedDate: '01 Apr 2026' },
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
        { label: 'Brand brief & USPs collected', done: true, completedDate: '11 Mar 2026' },
        { label: 'Company documents collected', done: true, completedDate: '12 Mar 2026' },
        { label: 'All portal credentials received', done: true, completedDate: '14 Mar 2026' },
        { label: 'Platform setup completed', done: true, completedDate: '16 Mar 2026' },
        { label: 'Financial data verified', done: true, completedDate: '17 Mar 2026' },
      ],
    },
    kickoff: { status: 'Done', date: '18 Mar 2026' },
  },
];

// ═══════════════════════════════════════════════
// ─── HELPERS ──────────────────────────────────
// ═══════════════════════════════════════════════

const serviceColors: Record<string, { bg: string; text: string; border: string }> = {
  PM: { bg: 'bg-purple-50', text: 'text-[#7C3AED]', border: 'border-purple-200' },
  'A&T': { bg: 'bg-cyan-50', text: 'text-[#06B6D4]', border: 'border-cyan-200' },
  Both: { bg: 'bg-blue-50', text: 'text-[#204CC7]', border: 'border-blue-200' },
};

const getServiceLabel = (s: string) => s === 'PM' ? 'SEM' : s;

type FilterType = 'all' | 'pending' | 'done';
type ServiceFilterType = 'all' | 'PM' | 'A&T' | 'Both';

// Calculate days since start
function daysSinceStart(startDate: string): number {
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = startDate.split(' ');
  const d = parseInt(parts[0]);
  const m = months[parts[1]];
  const y = parseInt(parts[2]);
  const start = new Date(y, m, d);
  const now = new Date(2026, 3, 9); // April 9, 2026
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════
// ─── COMPONENT ────────────────────────────────
// ═══════════════════════════════════════════════

export function OnboardingModule() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('all');
  const [selectedClient, setSelectedClient] = useState<OnboardingClient | null>(null);
  const [clientData, setClientData] = useState<OnboardingClient[]>(clients);

  // Toggle a step's done state
  const toggleStep = (clientId: string, stepIndex: number) => {
    setClientData(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newSteps = c.onboarding.steps.map((s, i) => {
        if (i !== stepIndex) return s;
        return {
          ...s,
          done: !s.done,
          completedDate: !s.done ? '09 Apr 2026' : undefined,
        };
      });
      const completed = newSteps.filter(s => s.done).length;
      const total = newSteps.length;
      const progress = Math.round((completed / total) * 100);
      const status: 'Done' | 'Pending' = progress === 100 ? 'Done' : 'Pending';
      const kickoff = progress === 100 && c.kickoff.status === 'Pending'
        ? { status: 'Done' as const, date: '09 Apr 2026' }
        : progress < 100 && c.kickoff.status === 'Done' && !c.kickoff.date
          ? { status: 'Pending' as const }
          : c.kickoff;
      const updated = {
        ...c,
        onboarding: { ...c.onboarding, steps: newSteps, progress, status },
        kickoff,
      };
      // Keep selectedClient in sync
      if (selectedClient?.id === clientId) {
        setSelectedClient(updated);
      }
      return updated;
    }));
  };

  // Derived counts
  const pendingCount = clientData.filter(c => c.onboarding.status === 'Pending').length;
  const doneCount = clientData.filter(c => c.onboarding.status === 'Done').length;

  // Filter clients
  const filtered = clientData.filter(c => {
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
      {/* Header Row — title left, search + filters right */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-h1 text-black/90">Client Onboarding</h1>
          <p className="text-body text-black/50 mt-1">Track onboarding progress and kickoff status for all clients</p>
        </div>

        <div className="flex items-center gap-2">
          {(search || statusFilter !== 'all' || serviceFilter !== 'all') && (
            <span className="text-caption font-medium text-black/40">{sorted.length} of {clientData.length} results</span>
          )}

          {/* Search */}
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterType)}
            className="px-2.5 py-1.5 border border-black/10 rounded-lg text-caption text-black/70 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all cursor-pointer appearance-none pr-7 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>

          {/* Service Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value as ServiceFilterType)}
            className="px-2.5 py-1.5 border border-black/10 rounded-lg text-caption text-black/70 font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all cursor-pointer appearance-none pr-7 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
          >
            <option value="all">All Services</option>
            <option value="PM">SEM</option>
            <option value="A&T">A&T</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.04]">
          <p className="text-caption text-black/45 font-medium">Total Clients</p>
          <p className="text-h2 text-black/80 mt-0.5">{clientData.length}</p>
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

      {/* Table */}
      <div className="border border-black/[0.06] rounded-xl overflow-hidden bg-white">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_90px_120px_150px_140px_36px] gap-0 px-5 py-2.5 bg-black/[0.02] border-b border-black/[0.06]">
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">Client</span>
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">Service</span>
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">Onboarding</span>
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">Progress</span>
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">Assigned To</span>
          <span />
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-body text-black/35">No clients match your filters</p>
          </div>
        ) : (
          <div>
            {sorted.map((client) => {
              const sc = serviceColors[client.service];
              const isOnboardingDone = client.onboarding.status === 'Done';

              return (
                <div
                  key={client.id}
                  className={`grid grid-cols-[1fr_90px_120px_150px_140px_36px] gap-0 px-5 py-3.5 items-center border-b border-black/[0.04] last:border-b-0 hover:bg-black/[0.015] transition-colors cursor-pointer ${!isOnboardingDone ? 'bg-white' : 'bg-black/[0.008]'}`}
                  onClick={() => setSelectedClient(client)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedClient(client); } }}
                  aria-label={`${client.name}: Onboarding ${client.onboarding.status}`}
                >
                  {/* Client Name */}
                  <div>
                    <span className="text-body font-medium text-black/80">{client.name}</span>
                    <p className="text-caption text-black/35 mt-0.5">Started {client.startDate}</p>
                  </div>

                  {/* Service */}
                  <div>
                    <span className={`text-caption font-semibold px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {getServiceLabel(client.service)}
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
                        className={`h-full rounded-full transition-all ${isOnboardingDone ? 'bg-emerald-400' : client.onboarding.progress >= 60 ? 'bg-amber-400' : client.onboarding.progress > 0 ? 'bg-orange-400' : 'bg-black/10'}`}
                        style={{ width: `${client.onboarding.progress}%` }}
                      />
                    </div>
                    <span className="text-caption font-medium text-black/40 w-[36px]">{client.onboarding.progress}%</span>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: client.assignee.color }}
                    >
                      {client.assignee.initials}
                    </div>
                    <span className="text-caption text-black/50 truncate">{client.assignee.name.split(' ')[0]}</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ChevronRight className="w-4 h-4 text-black/20" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer summary */}
      <p className="text-caption text-black/30 mt-3 px-1">
        Showing {sorted.length} of {clientData.length} clients
      </p>

      {/* ══════════════════════════════════════════ */}
      {/* ─── ONBOARDING TRACKER MODAL ──────────── */}
      {/* ══════════════════════════════════════════ */}
      {selectedClient && (() => {
        const client = selectedClient;
        const sc = serviceColors[client.service];
        const stepsCompleted = client.onboarding.steps.filter(s => s.done).length;
        const stepsTotal = client.onboarding.steps.length;
        const isOnboardingDone = client.onboarding.status === 'Done';
        const days = daysSinceStart(client.startDate);
        const nextStep = client.onboarding.steps.find(s => !s.done);
        const isOverdue = !isOnboardingDone && days > 14;

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setSelectedClient(null)}>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[540px] flex flex-col max-h-[calc(100vh-48px)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ── */}
              <div className={`px-7 py-5 rounded-t-2xl flex-shrink-0 ${isOnboardingDone ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : isOverdue ? 'bg-gradient-to-br from-[#E2445C] to-rose-600' : 'bg-gradient-to-br from-[#204CC7] to-blue-700'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {getServiceLabel(client.service)}
                      </span>
                      <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">
                        {days}d since start
                      </span>
                      {isOnboardingDone && (
                        <span className="text-white/90 text-caption font-semibold bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Complete
                        </span>
                      )}
                    </div>
                    <h2 className="text-white text-h2 font-bold truncate">{client.name}</h2>
                    <p className="text-white/60 text-caption font-normal mt-1">
                      Assigned to {client.assignee.name} · Started {client.startDate}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="ml-3 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Progress bar in header */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/70 text-caption font-medium">{stepsCompleted} of {stepsTotal} steps completed</span>
                    <span className="text-white text-caption font-bold">{client.onboarding.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${client.onboarding.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto px-7 py-5">

                {/* Overdue warning */}
                {isOverdue && !isOnboardingDone && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.05] border border-[#E2445C]/15 rounded-xl mb-4">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#E2445C]" />
                    </div>
                    <div>
                      <p className="text-[#E2445C] text-caption font-semibold">Onboarding overdue — {days} days since start</p>
                      <p className="text-black/45 text-caption font-normal">Target is 14 days. Please follow up with the client.</p>
                    </div>
                  </div>
                )}

                {/* Details row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-black/30" />
                      <p className="text-black/40 text-caption font-medium">Service</p>
                    </div>
                    <p className="text-black/80 text-body font-semibold">{getServiceLabel(client.service)}</p>
                  </div>
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-black/30" />
                      <p className="text-black/40 text-caption font-medium">Assigned To</p>
                    </div>
                    <p className="text-black/80 text-body font-semibold">{client.assignee.name}</p>
                  </div>
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-black/30" />
                      <p className="text-black/40 text-caption font-medium">Kickoff</p>
                    </div>
                    <p className={`text-body font-semibold ${client.kickoff.status === 'Done' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {client.kickoff.status === 'Done' ? client.kickoff.date : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Next Step highlight (only if pending) */}
                {nextStep && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#204CC7]/[0.04] border border-[#204CC7]/15 rounded-xl mb-5">
                    <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-[#204CC7]" />
                    </div>
                    <div>
                      <p className="text-[#204CC7] text-caption font-semibold">Next step</p>
                      <p className="text-black/70 text-body font-medium">{nextStep.label}</p>
                    </div>
                  </div>
                )}

                {/* Checklist */}
                <div className="mb-2">
                  <h3 className="text-body font-semibold text-black/80 mb-3">Onboarding Checklist</h3>
                  <div className="space-y-0">
                    {client.onboarding.steps.map((step, i) => {
                      const isLast = i === client.onboarding.steps.length - 1;
                      const doneCount = client.onboarding.steps.filter(s => s.done).length;
                      const isCurrent = !step.done && i === doneCount;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 py-3 cursor-pointer rounded-lg -mx-2 px-2 hover:bg-black/[0.02] transition-colors ${!isLast ? 'border-b border-black/[0.04]' : ''}`}
                          onClick={() => toggleStep(client.id, i)}
                          role="checkbox"
                          aria-checked={step.done}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStep(client.id, i); } }}
                        >
                          {/* Step indicator */}
                          <div className="flex flex-col items-center flex-shrink-0">
                            {step.done ? (
                              <div className="w-6 h-6 rounded-full bg-[#00C875] flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full border-2 border-[#204CC7] bg-[#204CC7]/[0.06] flex items-center justify-center">
                                <Circle className="w-3.5 h-3.5 text-[#204CC7]" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-black/10 bg-black/[0.02] flex items-center justify-center">
                                <Circle className="w-3.5 h-3.5 text-black/15" />
                              </div>
                            )}
                          </div>

                          {/* Step content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-body font-medium ${step.done ? 'text-black/40 line-through' : isCurrent ? 'text-[#204CC7]' : 'text-black/60'}`}>
                              {step.label}
                            </p>
                            {step.done && step.completedDate && (
                              <p className="text-caption text-black/30 mt-0.5 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                Completed {step.completedDate}
                              </p>
                            )}
                          </div>

                          {/* Status badge */}
                          <div className="flex-shrink-0">
                            {step.done ? (
                              <span className="text-caption font-medium text-[#00C875] bg-[#00C875]/[0.08] px-2 py-0.5 rounded-md">Done</span>
                            ) : isCurrent ? (
                              <span className="text-caption font-medium text-[#204CC7] bg-[#204CC7]/[0.08] px-2 py-0.5 rounded-md">Current</span>
                            ) : (
                              <span className="text-caption font-medium text-black/25 bg-black/[0.03] px-2 py-0.5 rounded-md">Pending</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              {isOnboardingDone && (
                <div className="px-7 py-4 border-t border-black/[0.06] flex-shrink-0 bg-white rounded-b-2xl">
                  <div className="w-full px-4 py-3 rounded-xl bg-[#00C875]/[0.06] text-center">
                    <p className="text-[#00C875] text-caption font-medium flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Onboarding complete — client is live
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
