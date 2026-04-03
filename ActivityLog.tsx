"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Filter, X, ChevronDown, Calendar, Clock,
  FileText, BarChart3, MessageSquare, Upload, Settings,
  UserPlus, CheckCircle2, Target, Shield, FolderOpen,
  ArrowRightLeft, Pencil, Trash2, Eye, Send, Users,
  AlertCircle, Building2, Layers,
} from 'lucide-react';

// ── Types ──

type ActivityModule = 'reports' | 'inbox' | 'workspace' | 'dataroom' | 'adminland';
type ActivityAction =
  | 'created' | 'updated' | 'deleted' | 'uploaded' | 'downloaded'
  | 'commented' | 'assigned' | 'completed' | 'approved' | 'rejected'
  | 'sent' | 'viewed' | 'shared' | 'moved' | 'archived'
  | 'target_changed' | 'status_changed' | 'logged_in' | 'setting_changed';

interface ActivityEntry {
  id: string;
  timestamp: string;       // ISO string
  user: { name: string; initials: string; color: string; role: string };
  module: ActivityModule;
  action: ActivityAction;
  title: string;
  detail?: string;
  client?: string;
  metadata?: Record<string, string>;
}

// ── Config ──

const MODULE_CONFIG: Record<ActivityModule, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  reports:    { label: 'Reports',    icon: BarChart3,     color: 'text-[#204CC7]', bg: 'bg-[#EEF1FB]' },
  inbox:      { label: 'Inbox',      icon: MessageSquare, color: 'text-[#7C3AED]', bg: 'bg-[#F3EEFF]' },
  workspace:  { label: 'Workspace',  icon: Layers,        color: 'text-[#06B6D4]', bg: 'bg-[#ECFEFF]' },
  dataroom:   { label: 'Dataroom',   icon: FolderOpen,    color: 'text-[#00C875]', bg: 'bg-[#E8F8F5]' },
  adminland:  { label: 'Adminland',  icon: Shield,        color: 'text-[#E2445C]', bg: 'bg-[#FFF0F1]' },
};

const ACTION_CONFIG: Record<ActivityAction, { label: string; icon: typeof FileText; verb: string }> = {
  created:         { label: 'Created',         icon: FileText,       verb: 'created' },
  updated:         { label: 'Updated',         icon: Pencil,         verb: 'updated' },
  deleted:         { label: 'Deleted',         icon: Trash2,         verb: 'deleted' },
  uploaded:        { label: 'Uploaded',        icon: Upload,         verb: 'uploaded' },
  downloaded:      { label: 'Downloaded',      icon: Eye,            verb: 'downloaded' },
  commented:       { label: 'Commented',       icon: MessageSquare,  verb: 'commented on' },
  assigned:        { label: 'Assigned',        icon: UserPlus,       verb: 'assigned' },
  completed:       { label: 'Completed',       icon: CheckCircle2,   verb: 'completed' },
  approved:        { label: 'Approved',        icon: CheckCircle2,   verb: 'approved' },
  rejected:        { label: 'Rejected',        icon: AlertCircle,    verb: 'rejected' },
  sent:            { label: 'Sent',            icon: Send,           verb: 'sent' },
  viewed:          { label: 'Viewed',          icon: Eye,            verb: 'viewed' },
  shared:          { label: 'Shared',          icon: Users,          verb: 'shared' },
  moved:           { label: 'Moved',           icon: ArrowRightLeft, verb: 'moved' },
  archived:        { label: 'Archived',        icon: FolderOpen,     verb: 'archived' },
  target_changed:  { label: 'Target Changed',  icon: Target,         verb: 'changed targets for' },
  status_changed:  { label: 'Status Changed',  icon: ArrowRightLeft, verb: 'changed status of' },
  logged_in:       { label: 'Logged In',       icon: Shield,         verb: 'logged in' },
  setting_changed: { label: 'Setting Changed', icon: Settings,       verb: 'changed settings' },
};

// ── Team ──

const TEAM = {
  tejas:   { name: 'Tejas Atha',     initials: 'TA', color: '#3B82F6', role: 'COO' },
  chinmay: { name: 'Chinmay Pawar',  initials: 'CP', color: '#7C3AED', role: 'PM HOD' },
  zubear:  { name: 'Zubear Shaikh',  initials: 'ZS', color: '#06B6D4', role: 'A&T HOD' },
  mihir:   { name: 'Mihir L.',       initials: 'ML', color: '#F59E0B', role: 'Admin' },
  harshal: { name: 'Harshal R.',     initials: 'HR', color: '#10B981', role: 'Operations' },
};

// ── Mock Data (realistic, dense, platform-wide) ──

const mockActivities: ActivityEntry[] = [
  // Today
  { id: '1',  timestamp: '2026-04-03T14:32:00', user: TEAM.chinmay, module: 'reports',   action: 'target_changed',  title: 'Elan by Aanchal — PM E-Commerce targets', detail: 'Ad Spends: ₹10L → ₹12L, ROAS: 5.0x → 5.5x', client: 'Elan by Aanchal' },
  { id: '2',  timestamp: '2026-04-03T14:18:00', user: TEAM.harshal, module: 'workspace',  action: 'completed',       title: 'Google Ads campaign setup — July Issue', client: 'July Issue' },
  { id: '3',  timestamp: '2026-04-03T13:55:00', user: TEAM.tejas,   module: 'inbox',      action: 'sent',            title: 'Monthly performance summary', detail: 'Sent to #pm-reports channel' },
  { id: '4',  timestamp: '2026-04-03T13:42:00', user: TEAM.zubear,  module: 'dataroom',   action: 'uploaded',        title: 'Q1 2026 Tax Filing — Mahesh Interior', detail: 'ITR-3_Q1_2026.pdf (2.4 MB)', client: 'Mahesh Interior' },
  { id: '5',  timestamp: '2026-04-03T13:10:00', user: TEAM.mihir,   module: 'adminland',  action: 'setting_changed', title: 'Updated team access permissions', detail: 'PM team → Report editing enabled' },
  { id: '6',  timestamp: '2026-04-03T12:45:00', user: TEAM.chinmay, module: 'reports',   action: 'approved',        title: 'Target change request — Mahesh Interior', detail: 'Lead Gen targets approved: Leads 800 → 950, CPL ₹750 → ₹650', client: 'Mahesh Interior' },
  { id: '7',  timestamp: '2026-04-03T12:20:00', user: TEAM.harshal, module: 'workspace',  action: 'assigned',        title: 'Social media creatives → Priya M.', detail: 'Nor Black Nor White — Instagram Reels batch', client: 'Nor Black Nor White' },
  { id: '8',  timestamp: '2026-04-03T11:50:00', user: TEAM.tejas,   module: 'reports',    action: 'viewed',          title: 'Monthly overview — all PM clients' },
  { id: '9',  timestamp: '2026-04-03T11:30:00', user: TEAM.zubear,  module: 'reports',    action: 'updated',         title: 'True Diamond — A&T Q1 report', detail: 'Updated expense breakdown and creditor notes', client: 'True Diamond' },
  { id: '10', timestamp: '2026-04-03T11:05:00', user: TEAM.chinmay, module: 'dataroom',   action: 'created',         title: 'New folder: Skin Essentials / Q2 Campaigns', client: 'Skin Essentials' },
  { id: '11', timestamp: '2026-04-03T10:40:00', user: TEAM.mihir,   module: 'adminland',  action: 'setting_changed', title: 'Updated notification preferences', detail: 'Email digest → Weekly' },
  { id: '12', timestamp: '2026-04-03T10:15:00', user: TEAM.harshal, module: 'workspace',  action: 'created',         title: 'New task: Landing page redesign — Prism Wellness', client: 'Prism Wellness' },
  { id: '13', timestamp: '2026-04-03T09:50:00', user: TEAM.tejas,   module: 'inbox',      action: 'commented',       title: 'Re: Budget approval Q2', detail: 'Approved the revised ₹15L monthly budget' },
  { id: '14', timestamp: '2026-04-03T09:30:00', user: TEAM.zubear,  module: 'dataroom',   action: 'shared',          title: 'Sahara Exports — GST documents', detail: 'Shared with Mahesh Patel (client)', client: 'Sahara Exports' },
  { id: '15', timestamp: '2026-04-03T09:00:00', user: TEAM.chinmay, module: 'workspace',  action: 'status_changed',  title: 'Riviera Hospitality onboarding → In Progress', detail: 'Moved from Kickoff to In Progress', client: 'Riviera Hospitality' },

  // Yesterday
  { id: '16', timestamp: '2026-04-02T17:45:00', user: TEAM.tejas,   module: 'reports',    action: 'viewed',          title: 'Monthly overview — all PM clients' },
  { id: '17', timestamp: '2026-04-02T17:20:00', user: TEAM.harshal, module: 'workspace',  action: 'completed',       title: 'Meta pixel integration — Kala Threads', client: 'Kala Threads' },
  { id: '18', timestamp: '2026-04-02T16:50:00', user: TEAM.zubear,  module: 'reports',    action: 'updated',         title: 'Vistara Foods — A&T risk assessment', detail: 'Added high-severity cash flow warning', client: 'Vistara Foods' },
  { id: '19', timestamp: '2026-04-02T16:10:00', user: TEAM.chinmay, module: 'reports',    action: 'target_changed',  title: 'Zenith Textiles — PM E-Commerce targets', detail: 'Revenue: ₹60L → ₹65L', client: 'Zenith Textiles' },
  { id: '20', timestamp: '2026-04-02T15:30:00', user: TEAM.mihir,   module: 'adminland',  action: 'created',         title: 'New employee account: Priya Menon', detail: 'Role: Executive, Dept: Performance Marketing' },
  { id: '21', timestamp: '2026-04-02T14:55:00', user: TEAM.harshal, module: 'dataroom',   action: 'uploaded',        title: 'Craft & Bloom — Creative assets batch', detail: '12 files (48.6 MB)', client: 'Craft & Bloom' },
  { id: '22', timestamp: '2026-04-02T14:20:00', user: TEAM.tejas,   module: 'inbox',      action: 'sent',            title: 'Weekly standup recap', detail: 'Sent to #general channel' },
  { id: '23', timestamp: '2026-04-02T13:45:00', user: TEAM.zubear,  module: 'workspace',  action: 'assigned',        title: 'GST filing review → Mihir L.', detail: 'Orbit Digital — Q1 filing', client: 'Orbit Digital' },
  { id: '24', timestamp: '2026-04-02T12:30:00', user: TEAM.chinmay, module: 'reports',    action: 'approved',        title: 'Una Homes LLP — Lead Gen performance review', client: 'Una Homes LLP' },
  { id: '25', timestamp: '2026-04-02T11:00:00', user: TEAM.mihir,   module: 'adminland',  action: 'setting_changed', title: 'Updated employee onboarding checklist', detail: 'Added new compliance step for remote hires' },

  // 2 days ago
  { id: '26', timestamp: '2026-04-01T16:30:00', user: TEAM.tejas,   module: 'adminland',  action: 'setting_changed', title: 'Updated report visibility rules', detail: 'Executives can now view A&T reports' },
  { id: '27', timestamp: '2026-04-01T15:40:00', user: TEAM.harshal, module: 'workspace',  action: 'completed',       title: 'SEO audit — Elan by Aanchal', client: 'Elan by Aanchal' },
  { id: '28', timestamp: '2026-04-01T14:20:00', user: TEAM.zubear,  module: 'dataroom',   action: 'moved',           title: 'Relocated compliance docs to A&T vault', detail: 'Moved 8 files from General to A&T workspace' },
  { id: '29', timestamp: '2026-04-01T13:00:00', user: TEAM.chinmay, module: 'workspace',  action: 'created',         title: 'New task: Q2 strategy deck — July Issue', client: 'July Issue' },
  { id: '30', timestamp: '2026-04-01T11:30:00', user: TEAM.mihir,   module: 'adminland',  action: 'setting_changed', title: 'Enabled 2FA enforcement', detail: 'All admin accounts now require two-factor authentication' },

  // 3 days ago
  { id: '31', timestamp: '2026-03-31T17:00:00', user: TEAM.tejas,   module: 'reports',    action: 'viewed',          title: 'Skin Essentials — PM deep dive' },
  { id: '32', timestamp: '2026-03-31T15:20:00', user: TEAM.harshal, module: 'dataroom',   action: 'uploaded',        title: 'True Diamond — Ad creatives March batch', detail: '24 files (112 MB)', client: 'True Diamond' },
  { id: '33', timestamp: '2026-03-31T14:00:00', user: TEAM.zubear,  module: 'reports',    action: 'created',         title: 'Vistara Foods — A&T Q1 report draft', client: 'Vistara Foods' },
  { id: '34', timestamp: '2026-03-31T12:30:00', user: TEAM.chinmay, module: 'inbox',      action: 'sent',            title: 'Client onboarding checklist update', detail: 'Sent to #pm-ops channel' },
  { id: '35', timestamp: '2026-03-31T10:00:00', user: TEAM.mihir,   module: 'adminland',  action: 'created',         title: 'New role template: Team Lead', detail: 'Permissions: Edit tasks, View reports, Manage assignments' },
];

// ── Helpers ──

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date('2026-04-03T23:59:59');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(entries: ActivityEntry[]): { label: string; entries: ActivityEntry[] }[] {
  const groups: Map<string, ActivityEntry[]> = new Map();
  entries.forEach(e => {
    const label = getDateLabel(e.timestamp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  });
  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

// ── Dropdown hook ──

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);
  return { open, setOpen, ref };
}

// ── Component ──

// Date period filter options
type PeriodFilter = 'today' | 'yesterday' | '7d' | '30d' | 'all';
const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

function isWithinPeriod(iso: string, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  const entry = new Date(iso);
  const now = new Date('2026-04-03T23:59:59');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  if (period === 'today') return diffDays === 0;
  if (period === 'yesterday') return diffDays === 1;
  if (period === '7d') return diffDays <= 7;
  if (period === '30d') return diffDays <= 30;
  return true;
}

export function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | ActivityModule>('all');
  const [teamFilter, setTeamFilter] = useState<'all' | string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
  const [visibleCount, setVisibleCount] = useState(20);

  const moduleDD = useDropdown();
  const teamDD = useDropdown();
  const periodDD = useDropdown();

  const teamMembers = Object.values(TEAM);

  const filtered = useMemo(() => {
    let result = mockActivities;
    result = result.filter(e => isWithinPeriod(e.timestamp, periodFilter));
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(s) ||
        e.user.name.toLowerCase().includes(s) ||
        e.detail?.toLowerCase().includes(s) ||
        e.client?.toLowerCase().includes(s)
      );
    }
    if (moduleFilter !== 'all') result = result.filter(e => e.module === moduleFilter);
    if (teamFilter !== 'all') result = result.filter(e => e.user.name === teamFilter);
    return result;
  }, [searchTerm, moduleFilter, teamFilter, periodFilter]);

  const grouped = useMemo(() => groupByDate(filtered.slice(0, visibleCount)), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const activeFilterCount = (moduleFilter !== 'all' ? 1 : 0) + (teamFilter !== 'all' ? 1 : 0);

  // Stats (scoped to period)
  const periodActivities = useMemo(() => mockActivities.filter(e => isWithinPeriod(e.timestamp, periodFilter)), [periodFilter]);
  const uniqueUsersInPeriod = new Set(periodActivities.map(e => e.user.name)).size;
  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    periodActivities.forEach(e => { counts[e.module] = (counts[e.module] || 0) + 1; });
    return counts;
  }, [periodActivities]);

  // Module breakdown sorted by count
  const moduleBreakdown = useMemo(() => {
    return (Object.keys(MODULE_CONFIG) as ActivityModule[])
      .map(mod => ({ mod, count: moduleCounts[mod] || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [moduleCounts]);

  return (
    <div className="h-[calc(100vh-53px)] bg-[#F8F9FC] overflow-y-auto">
      <div className="max-w-[960px] mx-auto px-6 py-8">

        {/* ── Hero Header ── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] mb-6">
          {/* Top row: title + search */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-h1 text-black/85">Activity Log</h1>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Period Dropdown */}
                <div ref={periodDD.ref} className="relative">
                  <button
                    onClick={() => { periodDD.setOpen(!periodDD.open); teamDD.setOpen(false); moduleDD.setOpen(false); }}
                    aria-expanded={periodDD.open}
                    aria-haspopup="listbox"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                      periodFilter !== '7d'
                        ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                        : 'border-black/8 hover:bg-white hover:border-black/12 text-black/55'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${periodDD.open ? 'rotate-180' : ''}`} />
                  </button>
                  {periodDD.open && (
                    <div role="listbox" aria-label="Filter by period" className="absolute top-full right-0 mt-1.5 w-44 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50">
                      {PERIOD_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          role="option"
                          aria-selected={periodFilter === opt.value}
                          onClick={() => { setPeriodFilter(opt.value); periodDD.setOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:bg-[#EEF1FB]/40 ${periodFilter === opt.value ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Dropdown */}
                <div ref={teamDD.ref} className="relative">
                  <button
                    onClick={() => { teamDD.setOpen(!teamDD.open); periodDD.setOpen(false); moduleDD.setOpen(false); }}
                    aria-expanded={teamDD.open}
                    aria-haspopup="listbox"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                      teamFilter !== 'all'
                        ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                        : 'border-black/8 hover:bg-white hover:border-black/12 text-black/55'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {teamFilter === 'all' ? 'All Team' : teamFilter}
                    <ChevronDown className={`w-3 h-3 transition-transform ${teamDD.open ? 'rotate-180' : ''}`} />
                  </button>
                  {teamDD.open && (
                    <div role="listbox" aria-label="Filter by team member" className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50">
                      <button
                        role="option"
                        aria-selected={teamFilter === 'all'}
                        onClick={() => { setTeamFilter('all'); teamDD.setOpen(false); }}
                        className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center gap-2.5 focus-visible:outline-none focus-visible:bg-[#EEF1FB]/40 ${teamFilter === 'all' ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                      >
                        <Users className="w-3.5 h-3.5 text-black/40" /> All Team
                      </button>
                      {teamMembers.map(member => (
                        <button
                          key={member.name}
                          role="option"
                          aria-selected={teamFilter === member.name}
                          onClick={() => { setTeamFilter(member.name); teamDD.setOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center gap-2.5 focus-visible:outline-none focus-visible:bg-[#EEF1FB]/40 ${teamFilter === member.name ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-caption font-bold shrink-0" style={{ backgroundColor: member.color }}>{member.initials}</div>
                          <span className="flex-1">{member.name}</span>
                          <span className="text-caption text-black/35">{member.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative w-52">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search activity…"
                    aria-label="Search activity log"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-[#F6F7FF] border border-black/[0.05] rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all text-caption"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/35 hover:text-black/70 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Timeline */}
        <div className="space-y-8">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-black/[0.06]">
                  <Calendar className="w-3.5 h-3.5 text-black/40" />
                  <span className="text-caption font-semibold text-black/70">{group.label}</span>
                  <span className="text-caption text-black/35">{group.entries.length}</span>
                </div>
                <div className="flex-1 h-px bg-black/[0.06]" />
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {group.entries.map((entry, idx) => {
                  const modCfg = MODULE_CONFIG[entry.module];
                  const actCfg = ACTION_CONFIG[entry.action];
                  const ActionIcon = actCfg.icon;

                  return (
                    <div
                      key={entry.id}
                      className="group flex items-start gap-4 px-4 py-3.5 rounded-xl hover:bg-white hover:shadow-sm hover:border-black/[0.04] border border-transparent transition-all"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-caption font-bold"
                          style={{ backgroundColor: entry.user.color }}
                        >
                          {entry.user.initials}
                        </div>
                        {/* Action icon badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#F8F9FC] group-hover:border-white ${modCfg.bg}`}>
                          <ActionIcon className={`w-2.5 h-2.5 ${modCfg.color}`} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-body text-black/80">
                              <span className="font-semibold">{entry.user.name}</span>
                              <span className="font-normal text-black/55"> {actCfg.verb} </span>
                              <span className="font-medium">{entry.title}</span>
                            </p>
                            {entry.detail && (
                              <p className="text-caption text-black/45 mt-0.5 leading-relaxed">{entry.detail}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-caption font-semibold ${modCfg.bg} ${modCfg.color}`}>
                                {modCfg.label}
                              </span>
                              {entry.client && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/[0.03] text-caption font-medium text-black/50">
                                  <Building2 className="w-2.5 h-2.5" /> {entry.client}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <Clock className="w-3 h-3 text-black/25" />
                            <span className="text-caption font-normal text-black/40 tabular-nums">{formatTime(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setVisibleCount(prev => prev + 15)}
              className="px-6 py-2.5 rounded-xl border border-black/[0.06] bg-white text-caption font-medium text-black/60 hover:text-[#204CC7] hover:border-[#204CC7]/20 hover:bg-[#EEF1FB]/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              Load more activity
            </button>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-20 text-center" role="status">
            <Search className="w-10 h-10 text-black/15 mx-auto mb-3" aria-hidden="true" />
            <p className="text-body font-medium text-black/60">No activity matches your filters</p>
            <button
              onClick={() => { setModuleFilter('all'); setTeamFilter('all'); setSearchTerm(''); }}
              className="mt-2 text-[#204CC7] hover:underline text-caption rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              Reset filters
            </button>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
