'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, ChevronDown, ChevronUp, TrendingDown, DollarSign, Users, Calendar, Filter, X, Check, Clock, Building2, CalendarRange } from 'lucide-react';
import { TeamHoverPopover } from '@/components/team-hover-popover';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──
interface LostClient {
  id: string;
  companyName: string;
  ownerName: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  lostDate: string; // YYYY-MM-DD
  monthlyBilling: number;
  reason: 'Budget Cuts' | 'Poor Results' | 'Switched to Competitor' | 'In-House Team' | 'Business Closed' | 'Service Not Needed';
  accountManager: string;
  tenure: number; // months with Brego
  exitChecklist: 'Pending' | 'Done';
  lastContact: string; // YYYY-MM-DD
  recoverable: boolean;
}

type SortField = 'lostDate' | 'monthlyBilling' | 'tenure' | 'companyName';
type SortDir = 'asc' | 'desc';
type ServiceFilter = 'All' | 'Performance Marketing' | 'Accounts & Taxation';
type ReasonFilter = 'All' | LostClient['reason'];
type ChecklistFilter = 'All' | 'Pending' | 'Done';
type RecoverableFilter = 'All' | 'Recoverable' | 'Not Recoverable';

interface Filters {
  service: ServiceFilter;
  reason: ReasonFilter;
  checklist: ChecklistFilter;
  recoverable: RecoverableFilter;
}

const DEFAULT_FILTERS: Filters = { service: 'All', reason: 'All', checklist: 'All', recoverable: 'All' };

// ── Date range filter ─────────────────────────────────────────────────────────
//
// The trigger pill on the top bar shows the current selection (e.g.
// "Last 30 days"). Clicking opens a popover with preset shortcuts plus a
// custom-range section that admins can use for anything outside the
// presets. The filter applies to `lostDate`.
type DatePreset = 'all' | '30d' | '3m' | '6m' | '12m' | 'ytd' | 'lastYear' | 'custom';

interface DateFilter {
  preset: DatePreset;
  customFrom?: string; // YYYY-MM-DD, only used when preset === 'custom'
  customTo?: string;
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all',      label: 'All time' },
  { id: '30d',      label: 'Last 30 days' },
  { id: '3m',       label: 'Last 3 months' },
  { id: '6m',       label: 'Last 6 months' },
  { id: '12m',      label: 'Last 12 months' },
  { id: 'ytd',      label: 'This year' },
  { id: 'lastYear', label: 'Last year' },
];

const DEFAULT_DATE_FILTER: DateFilter = { preset: 'all' };

/** Compute a {start, end} range for the active filter, or `null` for "all time". */
function dateRangeFor(f: DateFilter): { start: Date; end: Date } | null {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  switch (f.preset) {
    case 'all':       return null;
    case '30d':       return { start: startOfDay(addDays(today, -30)), end: today };
    case '3m':        return { start: startOfDay(addMonths(today, -3)), end: today };
    case '6m':        return { start: startOfDay(addMonths(today, -6)), end: today };
    case '12m':       return { start: startOfDay(addMonths(today, -12)), end: today };
    case 'ytd':       return { start: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0), end: today };
    case 'lastYear': {
      const y = today.getFullYear() - 1;
      return { start: new Date(y, 0, 1, 0, 0, 0, 0), end: new Date(y, 11, 31, 23, 59, 59, 999) };
    }
    case 'custom':
      if (!f.customFrom || !f.customTo) return null;
      return { start: startOfDay(parseDate(f.customFrom)), end: (() => { const x = parseDate(f.customTo); x.setHours(23, 59, 59, 999); return x; })() };
  }
}

/** Short human-readable label for the trigger pill. */
function dateFilterLabel(f: DateFilter): string {
  if (f.preset === 'custom') {
    if (f.customFrom && f.customTo) {
      const fmt = (s: string) => {
        const d = parseDate(s);
        return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      };
      return `${fmt(f.customFrom)} – ${fmt(f.customTo)}`;
    }
    return 'Custom range';
  }
  return DATE_PRESETS.find(p => p.id === f.preset)?.label ?? 'All time';
}

// ── Team directory ───────────────────────────────────────────────────────────
//
// Each lost-client row used to surface only the Account Manager, but the
// real engagement always includes an HOD on top, a Manager owning the
// relationship, and 1–2 Executives doing the day-to-day work. The
// Employees column now shows a small avatar stack assembled from this
// directory — service-specific HOD on the left, the data-driven Manager
// next, and a deterministic pair of Executives picked from the pool by
// client id so the team stays stable across renders. Hovering any
// avatar reveals the person's name + role.
type TeamRole = 'HOD' | 'Manager' | 'Executive';
interface TeamMember {
  initials: string;
  name: string;
  role: TeamRole;
  color: string;
}

const HOD_BY_SERVICE: Record<LostClient['service'], TeamMember> = {
  'Performance Marketing': { initials: 'CP', name: 'Chinmay Pawar', role: 'HOD', color: '#7C3AED' },
  'Accounts & Taxation':   { initials: 'ZS', name: 'Zubear Shaikh', role: 'HOD', color: '#06B6D4' },
};

const MANAGER_LOOKUP: Record<string, { initials: string; color: string }> = {
  'Priya Sharma': { initials: 'PS', color: '#3B82F6' },
  'Rohan Desai':  { initials: 'RD', color: '#10B981' },
  'Akshay Mehta': { initials: 'AM', color: '#F59E0B' },
  'Sneha Patel':  { initials: 'SP', color: '#E2445C' },
};

const EXECUTIVE_POOL: { initials: string; name: string; color: string }[] = [
  { initials: 'KI', name: 'Kavya Iyer',    color: '#06B6D4' },
  { initials: 'NA', name: 'Nisha Agarwal', color: '#0EA5E9' },
  { initials: 'IM', name: 'Irshad Mulla',  color: '#EC4899' },
  { initials: 'ND', name: 'Neha Desai',    color: '#8B5CF6' },
  { initials: 'RK', name: 'Rohan Kapoor',  color: '#14B8A6' },
  { initials: 'AS', name: 'Aanya Sharma',  color: '#F97316' },
];

function buildTeamFor(client: LostClient): TeamMember[] {
  const hod = HOD_BY_SERVICE[client.service];
  const m = MANAGER_LOOKUP[client.accountManager];
  const manager: TeamMember = m
    ? { initials: m.initials, name: client.accountManager, role: 'Manager', color: m.color }
    : {
        // Fallback for any account manager not in the lookup — derive
        // initials from the first letters of each word in the name.
        initials: client.accountManager.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        name: client.accountManager,
        role: 'Manager',
        color: '#3B82F6',
      };
  // Deterministic executive pair — id-based seed keeps the team stable
  // for a given client across re-renders. `+3` offsets so the two execs
  // don't collide on small ids.
  const seed = parseInt(client.id, 10) || 0;
  const e1 = EXECUTIVE_POOL[seed % EXECUTIVE_POOL.length];
  const e2 = EXECUTIVE_POOL[(seed + 3) % EXECUTIVE_POOL.length];
  return [
    hod,
    manager,
    { initials: e1.initials, name: e1.name, role: 'Executive', color: e1.color },
    { initials: e2.initials, name: e2.name, role: 'Executive', color: e2.color },
  ];
}

// ── Realistic Mock Data ──
const INITIAL_LOST_CLIENTS: LostClient[] = [
  { id: '1', companyName: 'Zenith Retail Pvt Ltd', ownerName: 'Rahul Jain', service: 'Performance Marketing', lostDate: '2025-03-18', monthlyBilling: 85000, reason: 'Budget Cuts', accountManager: 'Priya Sharma', tenure: 14, exitChecklist: 'Pending', lastContact: '2025-03-20', recoverable: true },
  { id: '2', companyName: 'NovaTech Solutions', ownerName: 'Ankit Gupta', service: 'Accounts & Taxation', lostDate: '2025-03-12', monthlyBilling: 42000, reason: 'Switched to Competitor', accountManager: 'Rohan Desai', tenure: 8, exitChecklist: 'Done', lastContact: '2025-03-15', recoverable: false },
  { id: '3', companyName: 'Bloom Botanics', ownerName: 'Sneha Agarwal', service: 'Performance Marketing', lostDate: '2025-03-05', monthlyBilling: 65000, reason: 'Poor Results', accountManager: 'Akshay Mehta', tenure: 6, exitChecklist: 'Pending', lastContact: '2025-03-08', recoverable: true },
  { id: '4', companyName: 'Meridian Healthcare', ownerName: 'Dr. Vikram Rao', service: 'Accounts & Taxation', lostDate: '2025-02-28', monthlyBilling: 38000, reason: 'In-House Team', accountManager: 'Priya Sharma', tenure: 22, exitChecklist: 'Done', lastContact: '2025-03-01', recoverable: false },
  { id: '5', companyName: 'UrbanNest Realty', ownerName: 'Kavita Deshmukh', service: 'Performance Marketing', lostDate: '2025-02-20', monthlyBilling: 120000, reason: 'Budget Cuts', accountManager: 'Sneha Patel', tenure: 18, exitChecklist: 'Done', lastContact: '2025-02-25', recoverable: true },
  { id: '6', companyName: 'FreshBite Foods', ownerName: 'Arjun Malhotra', service: 'Performance Marketing', lostDate: '2025-02-15', monthlyBilling: 55000, reason: 'Switched to Competitor', accountManager: 'Rohan Desai', tenure: 10, exitChecklist: 'Pending', lastContact: '2025-02-18', recoverable: false },
  { id: '7', companyName: 'CloudSphere IT', ownerName: 'Meera Iyer', service: 'Accounts & Taxation', lostDate: '2025-02-10', monthlyBilling: 30000, reason: 'Business Closed', accountManager: 'Akshay Mehta', tenure: 4, exitChecklist: 'Done', lastContact: '2025-02-12', recoverable: false },
  { id: '8', companyName: 'SparkEdge Media', ownerName: 'Nikhil Choudhary', service: 'Performance Marketing', lostDate: '2025-01-28', monthlyBilling: 95000, reason: 'Poor Results', accountManager: 'Priya Sharma', tenure: 12, exitChecklist: 'Pending', lastContact: '2025-02-01', recoverable: true },
  { id: '9', companyName: 'GreenLeaf Organics', ownerName: 'Pooja Shetty', service: 'Accounts & Taxation', lostDate: '2025-01-20', monthlyBilling: 25000, reason: 'Service Not Needed', accountManager: 'Sneha Patel', tenure: 3, exitChecklist: 'Done', lastContact: '2025-01-22', recoverable: false },
  { id: '10', companyName: 'AutoPrime Motors', ownerName: 'Suresh Nair', service: 'Performance Marketing', lostDate: '2025-01-15', monthlyBilling: 150000, reason: 'In-House Team', accountManager: 'Akshay Mehta', tenure: 24, exitChecklist: 'Done', lastContact: '2025-01-18', recoverable: false },
  { id: '11', companyName: 'PeakFit Wellness', ownerName: 'Divya Kapoor', service: 'Performance Marketing', lostDate: '2025-01-08', monthlyBilling: 48000, reason: 'Budget Cuts', accountManager: 'Rohan Desai', tenure: 7, exitChecklist: 'Pending', lastContact: '2025-01-10', recoverable: true },
  { id: '12', companyName: 'TrueValue Finance', ownerName: 'Amit Saxena', service: 'Accounts & Taxation', lostDate: '2024-12-22', monthlyBilling: 60000, reason: 'Switched to Competitor', accountManager: 'Priya Sharma', tenure: 16, exitChecklist: 'Done', lastContact: '2024-12-28', recoverable: false },
  { id: '13', companyName: 'PixelCraft Studios', ownerName: 'Ravi Menon', service: 'Performance Marketing', lostDate: '2024-12-15', monthlyBilling: 72000, reason: 'Poor Results', accountManager: 'Sneha Patel', tenure: 9, exitChecklist: 'Done', lastContact: '2024-12-20', recoverable: true },
  { id: '14', companyName: 'SilverLine Logistics', ownerName: 'Harsh Pandey', service: 'Accounts & Taxation', lostDate: '2024-12-08', monthlyBilling: 35000, reason: 'Business Closed', accountManager: 'Akshay Mehta', tenure: 5, exitChecklist: 'Done', lastContact: '2024-12-10', recoverable: false },
  { id: '15', companyName: 'CraftBrew Co', ownerName: 'Ishaan Bhat', service: 'Performance Marketing', lostDate: '2024-11-25', monthlyBilling: 40000, reason: 'Budget Cuts', accountManager: 'Rohan Desai', tenure: 11, exitChecklist: 'Done', lastContact: '2024-11-30', recoverable: true },
  { id: '16', companyName: 'EcoHaven Interiors', ownerName: 'Nisha Reddy', service: 'Accounts & Taxation', lostDate: '2024-11-18', monthlyBilling: 28000, reason: 'Service Not Needed', accountManager: 'Priya Sharma', tenure: 6, exitChecklist: 'Done', lastContact: '2024-11-22', recoverable: false },
  { id: '17', companyName: 'QuickServe Retail', ownerName: 'Manish Tiwari', service: 'Performance Marketing', lostDate: '2024-11-10', monthlyBilling: 58000, reason: 'Switched to Competitor', accountManager: 'Sneha Patel', tenure: 13, exitChecklist: 'Done', lastContact: '2024-11-15', recoverable: false },
  { id: '18', companyName: 'BrightPath Education', ownerName: 'Lakshmi Pillai', service: 'Performance Marketing', lostDate: '2024-10-28', monthlyBilling: 45000, reason: 'In-House Team', accountManager: 'Akshay Mehta', tenure: 19, exitChecklist: 'Done', lastContact: '2024-11-02', recoverable: false },
];

// Monthly trend data
const monthlyTrends = [
  { month: 'Oct \'24', clients: 1, billing: 45 },
  { month: 'Nov \'24', clients: 3, billing: 126 },
  { month: 'Dec \'24', clients: 3, billing: 167 },
  { month: 'Jan \'25', clients: 4, billing: 318 },
  { month: 'Feb \'25', clients: 4, billing: 243 },
  { month: 'Mar \'25', clients: 3, billing: 192 },
];

// ── Helpers ──
function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(s: string): string {
  const d = parseDate(s);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function daysSince(s: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - parseDate(s).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Filter Option Component ──
function FilterOption<T extends string>({ label, value, selected, onSelect }: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-caption ${
        selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03] font-normal'
      }`}
    >
      {label}
      {selected && <Check className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Filter Panel ──
function LostClientsFilterPanel({ filters, onChange, onClose, onReset, activeCount }: {
  filters: Filters; onChange: (f: Filters) => void; onClose: () => void; onReset: () => void; activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[360px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-black/50" />
          <span className="text-body font-semibold text-black/80">Filters</span>
          {activeCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[20px] text-center">{activeCount}</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset</button>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 rounded-md hover:bg-black/[0.04] text-black/55 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-4 max-h-[420px] overflow-y-auto">
        {/* Service */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            {(['All', 'Performance Marketing', 'Accounts & Taxation'] as ServiceFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : opt} value={opt} selected={filters.service === opt} onSelect={v => onChange({ ...filters, service: v })} />
            ))}
          </div>
        </div>
        {/* Reason */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Loss Reason</p>
          <div className="space-y-0.5">
            {(['All', 'Budget Cuts', 'Poor Results', 'Switched to Competitor', 'In-House Team', 'Business Closed', 'Service Not Needed'] as ReasonFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Reasons' : opt} value={opt} selected={filters.reason === opt} onSelect={v => onChange({ ...filters, reason: v })} />
            ))}
          </div>
        </div>
        {/* Exit Checklist */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Exit Checklist</p>
          <div className="space-y-0.5">
            {(['All', 'Pending', 'Done'] as ChecklistFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt} value={opt} selected={filters.checklist === opt} onSelect={v => onChange({ ...filters, checklist: v })} />
            ))}
          </div>
        </div>
        {/* Recoverable */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Recovery Potential</p>
          <div className="space-y-0.5">
            {(['All', 'Recoverable', 'Not Recoverable'] as RecoverableFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Clients' : opt} value={opt} selected={filters.recoverable === opt} onSelect={v => onChange({ ...filters, recoverable: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export function LostClients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lostDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Date range filter — popover-driven. Default is "All time" so the demo
  // data is fully visible; admins can narrow via presets or set a custom
  // range from the popover.
  const [dateFilter, setDateFilter] = useState<DateFilter>(DEFAULT_DATE_FILTER);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const dateFilterRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showDateFilter) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target as Node)) {
        setShowDateFilter(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDateFilter(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showDateFilter]);
  const dateFilterActive = dateFilter.preset !== 'all';

  // Roster lives in state so the Recovery dropdown in the table can flip a
  // client between "Yes" (recoverable) and "No" inline. Resets on reload —
  // no backend wiring yet.
  const [lostClients, setLostClients] = useState<LostClient[]>(INITIAL_LOST_CLIENTS);
  const setRecoverable = (id: string, value: boolean) =>
    setLostClients(prev => prev.map(c => (c.id === id ? { ...c, recoverable: value } : c)));

  // Tracks which row's Recovery dropdown is open + the screen coords of
  // the trigger button. We position the popover with `position: fixed`
  // anchored to those coords so it escapes the table's `overflow-x-auto`
  // clipping (which would otherwise hide the dropdown below the row).
  const [openRecoveryDropdown, setOpenRecoveryDropdown] = useState<
    { id: string; top: number; left: number } | null
  >(null);
  const recoveryDropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openRecoveryDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (recoveryDropdownRef.current && !recoveryDropdownRef.current.contains(e.target as Node)) {
        setOpenRecoveryDropdown(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenRecoveryDropdown(null);
    };
    // Close on scroll / resize too — otherwise the fixed-position popover
    // detaches from its trigger as the page moves underneath it.
    const handleViewportChange = () => setOpenRecoveryDropdown(null);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [openRecoveryDropdown]);

  const filterCount = (filters.service !== 'All' ? 1 : 0) + (filters.reason !== 'All' ? 1 : 0) + (filters.checklist !== 'All' ? 1 : 0) + (filters.recoverable !== 'All' ? 1 : 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'companyName' ? 'asc' : 'desc');
    }
  };

  const filteredClients = useMemo(() => {
    const range = dateRangeFor(dateFilter);
    let result = lostClients.filter(c => {
      const q = searchQuery.toLowerCase();
      if (q && !(c.companyName.toLowerCase().includes(q) || c.ownerName.toLowerCase().includes(q) || c.accountManager.toLowerCase().includes(q) || c.reason.toLowerCase().includes(q))) return false;
      if (filters.service !== 'All' && c.service !== filters.service) return false;
      if (filters.reason !== 'All' && c.reason !== filters.reason) return false;
      if (filters.checklist !== 'All' && c.exitChecklist !== filters.checklist) return false;
      if (filters.recoverable === 'Recoverable' && !c.recoverable) return false;
      if (filters.recoverable === 'Not Recoverable' && c.recoverable) return false;
      if (range) {
        const lost = parseDate(c.lostDate);
        if (lost < range.start || lost > range.end) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'lostDate': cmp = parseDate(a.lostDate).getTime() - parseDate(b.lostDate).getTime(); break;
        case 'monthlyBilling': cmp = a.monthlyBilling - b.monthlyBilling; break;
        case 'tenure': cmp = a.tenure - b.tenure; break;
        case 'companyName': cmp = a.companyName.localeCompare(b.companyName); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [lostClients, searchQuery, filters, dateFilter, sortField, sortDir]);

  // ── KPIs (from filtered data) ──
  const totalLost = filteredClients.length;
  const totalBillingLost = filteredClients.reduce((s, c) => s + c.monthlyBilling, 0);
  const pendingChecklists = filteredClients.filter(c => c.exitChecklist !== 'Done').length;
  const recoverableCount = filteredClients.filter(c => c.recoverable).length;

  // Service breakdown
  const pmLost = filteredClients.filter(c => c.service === 'Performance Marketing').length;
  const atLost = filteredClients.filter(c => c.service === 'Accounts & Taxation').length;
  const pmBilling = filteredClients.filter(c => c.service === 'Performance Marketing').reduce((s, c) => s + c.monthlyBilling, 0);
  const atBilling = filteredClients.filter(c => c.service === 'Accounts & Taxation').reduce((s, c) => s + c.monthlyBilling, 0);

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isCurrent = sortField === field;
    const ariaSort = isCurrent ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;
    return (
      <th
        scope="col"
        aria-sort={ariaSort}
        className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide select-none ${className}`}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="inline-flex items-center gap-1 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 rounded transition-colors"
        >
          {children}
          {isCurrent ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />) : <ArrowUpDown className="w-3 h-3 text-black/30" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'Budget Cuts': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Poor Results': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Switched to Competitor': return 'bg-red-50 text-red-700 border-red-200';
      case 'In-House Team': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Business Closed': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'Service Not Needed': return 'bg-black/[0.04] text-black/60 border-black/10';
      default: return 'bg-black/[0.04] text-black/60 border-black/10';
    }
  };

  const getChecklistColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-black/[0.04] text-black/60 border-black/10';
    }
  };

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on CustomersOverview, All Customers, and CLAs.
        Title + subtitle anchor the left; the page-specific controls
        (result count, Search, Filter) hang on the right so every
        Customers sub-page reads with the same visual rhythm.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Lost Clients</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Track client attrition and recover revenue</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only when filters, search, or date range are narrowing the table */}
            {(filterCount > 0 || searchQuery || dateFilterActive) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/60">
                {filteredClients.length} of {lostClients.length} results
              </span>
            )}

            {/* Date range filter — preset shortcuts + custom range. Sits to
                the left of Search so it reads as a primary scope control. */}
            <div className="relative" ref={showDateFilter ? dateFilterRef : undefined}>
              <button
                type="button"
                onClick={() => setShowDateFilter(s => !s)}
                aria-expanded={showDateFilter}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  dateFilterActive
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{dateFilterLabel(dateFilter)}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {showDateFilter && (
                <div
                  role="dialog"
                  aria-label="Date range filter"
                  className="absolute top-full right-0 mt-2 w-[280px] bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 overflow-hidden"
                >
                  <div className="p-2">
                    {DATE_PRESETS.map(p => {
                      const isActive = dateFilter.preset === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setDateFilter({ preset: p.id }); setShowDateFilter(false); }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-caption transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                            isActive ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'
                          }`}
                        >
                          <span>{p.label}</span>
                          {isActive && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom range — admins can pick any date window. The
                      Apply button only enables once both ends are set and
                      the start isn't after the end. */}
                  <div className="border-t border-black/[0.05] p-3 space-y-2.5 bg-black/[0.015]">
                    <p className="text-caption font-semibold text-black/65 uppercase tracking-wide px-1">Custom range</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label htmlFor="lc-date-from" className="sr-only">From date</label>
                        <input
                          id="lc-date-from"
                          type="date"
                          value={dateFilter.preset === 'custom' ? (dateFilter.customFrom ?? '') : ''}
                          onChange={(e) => setDateFilter(f => ({
                            preset: 'custom',
                            customFrom: e.target.value,
                            customTo: f.preset === 'custom' ? f.customTo : '',
                          }))}
                          className="w-full px-2.5 py-1.5 rounded-md border border-black/10 bg-white text-caption text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all"
                        />
                      </div>
                      <span className="text-caption text-black/45" aria-hidden="true">→</span>
                      <div className="flex-1">
                        <label htmlFor="lc-date-to" className="sr-only">To date</label>
                        <input
                          id="lc-date-to"
                          type="date"
                          value={dateFilter.preset === 'custom' ? (dateFilter.customTo ?? '') : ''}
                          onChange={(e) => setDateFilter(f => ({
                            preset: 'custom',
                            customFrom: f.preset === 'custom' ? f.customFrom : '',
                            customTo: e.target.value,
                          }))}
                          className="w-full px-2.5 py-1.5 rounded-md border border-black/10 bg-white text-caption text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all"
                        />
                      </div>
                    </div>
                    {(() => {
                      const from = dateFilter.preset === 'custom' ? dateFilter.customFrom : undefined;
                      const to = dateFilter.preset === 'custom' ? dateFilter.customTo : undefined;
                      const ready = !!from && !!to;
                      const invalid = ready && from! > to!;
                      return (
                        <div className="flex items-center justify-end gap-2">
                          {invalid && (
                            <span className="text-caption text-[#E2445C]">From must be on or before To</span>
                          )}
                          <button
                            type="button"
                            disabled={!ready || invalid}
                            onClick={() => setShowDateFilter(false)}
                            className="px-3 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#204CC7] transition-all"
                          >
                            Apply
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="lost-clients-search" className="sr-only">Search lost clients</label>
              <input
                id="lost-clients-search"
                type="text"
                placeholder="Search clients…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/60 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                aria-expanded={showFilterPanel}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  filterCount > 0
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filter</span>
                {filterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>
                )}
              </button>
              {showFilterPanel && (
                <LostClientsFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onClose={() => setShowFilterPanel(false)}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  activeCount={filterCount}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/55">Filtered by:</span>
          {filters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
              <button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.reason !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.reason}
              <button onClick={() => setFilters(f => ({ ...f, reason: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.checklist !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              Checklist: {filters.checklist}
              <button onClick={() => setFilters(f => ({ ...f, checklist: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.recoverable !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.recoverable}
              <button onClick={() => setFilters(f => ({ ...f, recoverable: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/55 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/*
        KPI widgets — first two cards are info (the count + revenue
        headlines you want to see at a glance); the last two are clickable
        slices of the table's Recovery and Exit Checklist columns. Active
        card gets a brand-blue border so the user always sees which slice
        the table is filtered to.
      */}
      {(() => {
        const exitPendingCount = filteredClients.filter(c => c.exitChecklist === 'Pending').length;
        const isRecoverableActive = filters.recoverable === 'Recoverable';
        const isExitPendingActive = filters.checklist === 'Pending';

        const toneClasses = {
          good: { value: 'text-[#00C875]', iconBg: 'bg-[#00C875]/[0.08]', iconFg: 'text-[#00C875]/80' },
          warn: { value: 'text-[#FDAB3D]', iconBg: 'bg-[#FDAB3D]/[0.08]', iconFg: 'text-[#FDAB3D]/80' },
          bad:  { value: 'text-[#E2445C]', iconBg: 'bg-[#E2445C]/[0.08]', iconFg: 'text-[#E2445C]/80' },
        } as const;
        const labelCls = 'text-black/55 text-caption font-medium uppercase tracking-wide';
        const captionCls = 'text-black/60 text-caption';

        const buttonCard = (active: boolean) =>
          `bg-white border rounded-2xl p-5 flex flex-col gap-4 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
            active
              ? 'border-[#204CC7]/40 bg-[#204CC7]/[0.02] shadow-sm'
              : 'border-black/[0.06] hover:border-black/[0.12] hover:shadow-sm'
          }`;
        const staticCard = 'bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4';

        const toggleRecoverable = () =>
          setFilters(f => ({ ...f, recoverable: f.recoverable === 'Recoverable' ? 'All' : 'Recoverable' }));
        const toggleExitPending = () =>
          setFilters(f => ({ ...f, checklist: f.checklist === 'Pending' ? 'All' : 'Pending' }));

        return (
          <div className="grid grid-cols-4 gap-4">
            {/* Clients Lost — neutral counter, never red/green */}
            <div className={staticCard}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Clients Lost</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04]">
                  <Users className="w-4 h-4 text-black/55" aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="text-h1 font-bold text-black/90">{totalLost}</p>
                <p className={captionCls}>
                  {totalLost === 0 ? 'No churn on record' : `${pmLost} SEM · ${atLost} A&T`}
                </p>
              </div>
            </div>

            {/* Monthly Billing Lost — info, red since lost revenue is bad */}
            <div className={staticCard}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Monthly Billing Lost</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${totalBillingLost > 0 ? toneClasses.bad.iconBg : toneClasses.good.iconBg}`}>
                  <DollarSign className={`w-4 h-4 ${totalBillingLost > 0 ? toneClasses.bad.iconFg : toneClasses.good.iconFg}`} aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${totalBillingLost > 0 ? toneClasses.bad.value : toneClasses.good.value}`}>
                  {formatCurrency(totalBillingLost)}
                </p>
                <p className={captionCls}>
                  {totalBillingLost === 0
                    ? 'No revenue lost'
                    : `${formatCurrency(pmBilling)} SEM · ${formatCurrency(atBilling)} A&T`}
                </p>
              </div>
            </div>

            {/* Recoverable — clicks set Recovery filter to Recoverable */}
            <button
              type="button"
              onClick={toggleRecoverable}
              aria-pressed={isRecoverableActive}
              className={buttonCard(isRecoverableActive)}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <p className={labelCls}>Recoverable</p>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#204CC7]/[0.08]">
                  <TrendingDown className="w-4 h-4 text-[#204CC7]/80" aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="text-h1 font-bold text-[#204CC7]">{recoverableCount}</p>
                <p className={captionCls}>
                  {totalLost === 0 ? 'No clients to recover' : `of ${totalLost} lost`}
                </p>
              </div>
            </button>

            {/* Exit Pending — clicks set Exit Checklist filter to Pending */}
            <button
              type="button"
              onClick={toggleExitPending}
              aria-pressed={isExitPendingActive}
              className={buttonCard(isExitPendingActive)}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <p className={labelCls}>Exit Pending</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${exitPendingCount > 0 ? toneClasses.warn.iconBg : toneClasses.good.iconBg}`}>
                  {exitPendingCount > 0
                    ? <Clock className={`w-4 h-4 ${toneClasses.warn.iconFg}`} aria-hidden="true" />
                    : <Check className={`w-4 h-4 ${toneClasses.good.iconFg}`} aria-hidden="true" />}
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${exitPendingCount > 0 ? toneClasses.warn.value : toneClasses.good.value}`}>
                  {exitPendingCount}
                </p>
                <p className={captionCls}>
                  {totalLost === 0
                    ? 'No exits to process'
                    : exitPendingCount === 0
                    ? 'All exit checklists started'
                    : `${exitPendingCount} not yet started`}
                </p>
              </div>
            </button>
          </div>
        );
      })()}

      {/* Client Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortHeader field="companyName">Client</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                <SortHeader field="lostDate">Lost Date</SortHeader>
                <SortHeader field="monthlyBilling">Billing / mo</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Reason</th>
                <SortHeader field="tenure">Tenure</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Exit Checklist</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Team</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Recovery</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-black/20" />
                      <p className="text-body font-medium text-black/50">No lost clients match your filters</p>
                      <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearchQuery(''); }} className="text-caption font-medium text-[#204CC7] hover:underline">Clear all filters</button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredClients.map((client, index) => {
                const daysAgo = daysSince(client.lostDate);
                return (
                  <tr key={client.id} className={`border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors ${index % 2 === 1 ? 'bg-black/[0.01]' : ''}`}>
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-black/90">{client.companyName}</p>
                        <p className="text-caption font-normal text-black/60 mt-0.5">{client.ownerName}</p>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                        client.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}>
                        {client.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
                      </span>
                    </td>

                    {/* Lost Date */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-caption font-normal text-black/65">{formatDate(client.lostDate)}</p>
                        <p className="text-caption font-normal text-black/55 mt-0.5">{daysAgo}d ago</p>
                      </div>
                    </td>

                    {/* Billing */}
                    <td className="px-4 py-3">
                      <p className="text-body font-semibold text-[#E2445C]">{formatCurrency(client.monthlyBilling)}</p>
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-caption font-medium border ${getReasonColor(client.reason)}`}>
                        {client.reason}
                      </span>
                    </td>

                    {/* Tenure */}
                    <td className="px-4 py-3">
                      <p className="text-caption font-normal text-black/65">{client.tenure} {client.tenure === 1 ? 'month' : 'months'}</p>
                    </td>

                    {/* Exit Checklist */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-caption font-medium border ${getChecklistColor(client.exitChecklist)}`}>
                        {client.exitChecklist}
                      </span>
                    </td>

                    {/* Team — HOD + Manager + Executives. The whole avatar
                        stack is one hover trigger that pops a single list
                        of every member with their role, so the user reads
                        the team in one glance instead of having to hover
                        each circle individually. */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <TeamHoverPopover team={buildTeamFor(client)} />
                    </td>

                    {/* Recovery — inline Yes/No dropdown. The popover is
                        position-fixed (anchored to viewport coords captured
                        on click) so it escapes the table's `overflow-x-auto`
                        clipping. Click-outside, Escape, scroll, or resize
                        all close it without committing. */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openRecoveryDropdown?.id === client.id) {
                            setOpenRecoveryDropdown(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setOpenRecoveryDropdown({ id: client.id, top: rect.bottom + 6, left: rect.left });
                          }
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={openRecoveryDropdown?.id === client.id}
                        aria-label={`Recovery: ${client.recoverable ? 'Yes' : 'No'} — change for ${client.companyName}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-caption font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                          client.recoverable
                            ? 'bg-[#204CC7]/[0.06] text-[#204CC7] border-[#204CC7]/20 hover:bg-[#204CC7]/[0.1]'
                            : 'bg-black/[0.03] text-black/65 border-black/10 hover:bg-black/[0.06]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${client.recoverable ? 'bg-[#204CC7]' : 'bg-black/35'}`} aria-hidden="true" />
                        {client.recoverable ? 'Yes' : 'No'}
                        <ChevronDown className={`w-3 h-3 transition-transform ${openRecoveryDropdown?.id === client.id ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>

                      {openRecoveryDropdown?.id === client.id && (
                        <div
                          ref={recoveryDropdownRef}
                          role="listbox"
                          aria-label={`Recovery options for ${client.companyName}`}
                          style={{ position: 'fixed', top: openRecoveryDropdown.top, left: openRecoveryDropdown.left }}
                          className="bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-[60] min-w-[120px]"
                        >
                          {([
                            { value: true,  label: 'Yes', dot: 'bg-[#204CC7]', text: 'text-[#204CC7]' },
                            { value: false, label: 'No',  dot: 'bg-black/35',  text: 'text-black/70' },
                          ] as const).map(opt => (
                            <button
                              key={opt.label}
                              type="button"
                              role="option"
                              aria-selected={client.recoverable === opt.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecoverable(client.id, opt.value);
                                setOpenRecoveryDropdown(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                client.recoverable === opt.value
                                  ? `bg-[#204CC7]/[0.04] ${opt.text} font-semibold`
                                  : 'text-black/70 hover:bg-black/[0.03]'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${opt.dot}`} aria-hidden="true" />
                              <span className="flex-1 text-left">{opt.label}</span>
                              {client.recoverable === opt.value && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Lost Clients Trend */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-body font-semibold text-black/80">Lost Clients Trend</h3>
            <p className="text-caption font-normal text-black/45 mt-0.5">Clients lost per month (last 6 months)</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="lostClientsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E2445C" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#E2445C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.04} vertical={false} />
              <XAxis dataKey="month" stroke="#000" strokeOpacity={0.15} tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 12 }} axisLine={{ stroke: '#000', strokeOpacity: 0.08 }} />
              <YAxis stroke="none" tick={{ fill: 'rgba(0,0,0,0.35)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px' }} />
              <Area type="monotone" dataKey="clients" stroke="#E2445C" strokeWidth={2} fillOpacity={1} fill="url(#lostClientsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Billing Lost Trend */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-5">
          <div className="mb-4">
            <h3 className="text-body font-semibold text-black/80">Billing Lost Trend</h3>
            <p className="text-caption font-normal text-black/45 mt-0.5">Monthly billing lost (₹K, last 6 months)</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="billingLostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#204CC7" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#204CC7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.04} vertical={false} />
              <XAxis dataKey="month" stroke="#000" strokeOpacity={0.15} tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 12 }} axisLine={{ stroke: '#000', strokeOpacity: 0.08 }} />
              <YAxis stroke="none" tick={{ fill: 'rgba(0,0,0,0.35)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v}K`} />
              <Tooltip formatter={(value: number) => `₹${value}K`} contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '8px 12px', fontSize: '13px' }} />
              <Area type="monotone" dataKey="billing" stroke="#204CC7" strokeWidth={2} fillOpacity={1} fill="url(#billingLostGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
