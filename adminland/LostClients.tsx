'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, ChevronDown, ChevronUp, TrendingDown, DollarSign, Users, Calendar, Filter, X, Check, AlertTriangle, Clock, Building2 } from 'lucide-react';
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
  exitChecklist: 'Pending' | 'In Progress' | 'Done';
  lastContact: string; // YYYY-MM-DD
  recoverable: boolean;
}

type SortField = 'lostDate' | 'monthlyBilling' | 'tenure' | 'companyName';
type SortDir = 'asc' | 'desc';
type ServiceFilter = 'All' | 'Performance Marketing' | 'Accounts & Taxation';
type ReasonFilter = 'All' | LostClient['reason'];
type ChecklistFilter = 'All' | 'Pending' | 'In Progress' | 'Done';
type RecoverableFilter = 'All' | 'Recoverable' | 'Not Recoverable';

interface Filters {
  service: ServiceFilter;
  reason: ReasonFilter;
  checklist: ChecklistFilter;
  recoverable: RecoverableFilter;
}

const DEFAULT_FILTERS: Filters = { service: 'All', reason: 'All', checklist: 'All', recoverable: 'All' };

// ── Realistic Mock Data ──
const lostClients: LostClient[] = [
  { id: '1', companyName: 'Zenith Retail Pvt Ltd', ownerName: 'Rahul Jain', service: 'Performance Marketing', lostDate: '2025-03-18', monthlyBilling: 85000, reason: 'Budget Cuts', accountManager: 'Priya Sharma', tenure: 14, exitChecklist: 'Pending', lastContact: '2025-03-20', recoverable: true },
  { id: '2', companyName: 'NovaTech Solutions', ownerName: 'Ankit Gupta', service: 'Accounts & Taxation', lostDate: '2025-03-12', monthlyBilling: 42000, reason: 'Switched to Competitor', accountManager: 'Rohan Desai', tenure: 8, exitChecklist: 'Done', lastContact: '2025-03-15', recoverable: false },
  { id: '3', companyName: 'Bloom Botanics', ownerName: 'Sneha Agarwal', service: 'Performance Marketing', lostDate: '2025-03-05', monthlyBilling: 65000, reason: 'Poor Results', accountManager: 'Akshay Mehta', tenure: 6, exitChecklist: 'In Progress', lastContact: '2025-03-08', recoverable: true },
  { id: '4', companyName: 'Meridian Healthcare', ownerName: 'Dr. Vikram Rao', service: 'Accounts & Taxation', lostDate: '2025-02-28', monthlyBilling: 38000, reason: 'In-House Team', accountManager: 'Priya Sharma', tenure: 22, exitChecklist: 'Done', lastContact: '2025-03-01', recoverable: false },
  { id: '5', companyName: 'UrbanNest Realty', ownerName: 'Kavita Deshmukh', service: 'Performance Marketing', lostDate: '2025-02-20', monthlyBilling: 120000, reason: 'Budget Cuts', accountManager: 'Sneha Patel', tenure: 18, exitChecklist: 'Done', lastContact: '2025-02-25', recoverable: true },
  { id: '6', companyName: 'FreshBite Foods', ownerName: 'Arjun Malhotra', service: 'Performance Marketing', lostDate: '2025-02-15', monthlyBilling: 55000, reason: 'Switched to Competitor', accountManager: 'Rohan Desai', tenure: 10, exitChecklist: 'Pending', lastContact: '2025-02-18', recoverable: false },
  { id: '7', companyName: 'CloudSphere IT', ownerName: 'Meera Iyer', service: 'Accounts & Taxation', lostDate: '2025-02-10', monthlyBilling: 30000, reason: 'Business Closed', accountManager: 'Akshay Mehta', tenure: 4, exitChecklist: 'Done', lastContact: '2025-02-12', recoverable: false },
  { id: '8', companyName: 'SparkEdge Media', ownerName: 'Nikhil Choudhary', service: 'Performance Marketing', lostDate: '2025-01-28', monthlyBilling: 95000, reason: 'Poor Results', accountManager: 'Priya Sharma', tenure: 12, exitChecklist: 'In Progress', lastContact: '2025-02-01', recoverable: true },
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
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.04] text-black/40"><X className="w-4 h-4" /></button>
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
            {(['All', 'Pending', 'In Progress', 'Done'] as ChecklistFilter[]).map(opt => (
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
    let result = lostClients.filter(c => {
      const q = searchQuery.toLowerCase();
      if (q && !(c.companyName.toLowerCase().includes(q) || c.ownerName.toLowerCase().includes(q) || c.accountManager.toLowerCase().includes(q) || c.reason.toLowerCase().includes(q))) return false;
      if (filters.service !== 'All' && c.service !== filters.service) return false;
      if (filters.reason !== 'All' && c.reason !== filters.reason) return false;
      if (filters.checklist !== 'All' && c.exitChecklist !== filters.checklist) return false;
      if (filters.recoverable === 'Recoverable' && !c.recoverable) return false;
      if (filters.recoverable === 'Not Recoverable' && c.recoverable) return false;
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
  }, [searchQuery, filters, sortField, sortDir]);

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

  // Reason breakdown for top reason
  const reasonCounts: Record<string, number> = {};
  filteredClients.forEach(c => { reasonCounts[c.reason] = (reasonCounts[c.reason] || 0) + 1; });
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide cursor-pointer hover:text-black/80 transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 text-black/25" />
        )}
      </div>
    </th>
  );

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
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-black/[0.04] text-black/60 border-black/10';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-h2 font-bold text-black/90">Lost Clients</h2>
          <p className="text-caption font-normal text-black/50 mt-0.5">Track client attrition and recover revenue</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Result count */}
          {(filterCount > 0 || searchQuery) && (
            <span className="text-caption font-medium text-black/40">{filteredClients.length} of {lostClients.length} results</span>
          )}

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-all text-caption ${
                filterCount > 0
                  ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                  : 'border-black/10 bg-white text-black/70 hover:bg-black/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
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

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/40">Filtered by:</span>
          {filters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.service === 'Performance Marketing' ? 'PM' : 'A&T'}
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
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-4 gap-4">
        {/* Clients Lost */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Clients Lost</p>
              <p className="text-[#E2445C] text-h1 font-bold">{totalLost}</p>
            </div>
            <div className="w-10 h-10 bg-[#E2445C]/[0.06] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#E2445C]/60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {pmLost > 0 && <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${(pmLost / Math.max(totalLost, 1)) * 100}%` }} />}
              {atLost > 0 && <div className="bg-[#06B6D4]" style={{ width: `${(atLost / Math.max(totalLost, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#7C3AED]" /><span className="text-black/50 text-caption font-normal">PM: {pmLost}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#06B6D4]" /><span className="text-black/50 text-caption font-normal">A&T: {atLost}</span></div>
            </div>
          </div>
        </div>

        {/* Billing Lost */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Monthly Billing Lost</p>
              <p className="text-[#E2445C] text-h1 font-bold">{formatCurrency(totalBillingLost)}</p>
            </div>
            <div className="w-10 h-10 bg-[#E2445C]/[0.06] rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#E2445C]/60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {pmBilling > 0 && <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${(pmBilling / Math.max(totalBillingLost, 1)) * 100}%` }} />}
              {atBilling > 0 && <div className="bg-[#06B6D4]" style={{ width: `${(atBilling / Math.max(totalBillingLost, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#7C3AED]" /><span className="text-black/50 text-caption font-normal">PM: {formatCurrency(pmBilling)}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#06B6D4]" /><span className="text-black/50 text-caption font-normal">A&T: {formatCurrency(atBilling)}</span></div>
            </div>
          </div>
        </div>

        {/* Pending Checklists */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Pending Exit Checklists</p>
              <p className={`text-h1 font-bold ${pendingChecklists > 0 ? 'text-[#FDAB3D]' : 'text-[#00C875]'}`}>{pendingChecklists}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pendingChecklists > 0 ? 'bg-[#FDAB3D]/[0.08]' : 'bg-[#00C875]/[0.08]'}`}>
              <Clock className={`w-5 h-5 ${pendingChecklists > 0 ? 'text-[#FDAB3D]/70' : 'text-[#00C875]/70'}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#00C875] rounded-l-full" style={{ width: `${totalLost > 0 ? ((totalLost - pendingChecklists) / totalLost) * 100 : 0}%` }} />
              <div className="bg-[#FDAB3D]" style={{ width: `${totalLost > 0 ? (pendingChecklists / totalLost) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Done: {totalLost - pendingChecklists}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FDAB3D]" /><span className="text-black/50 text-caption font-normal">Pending: {pendingChecklists}</span></div>
            </div>
          </div>
        </div>

        {/* Recoverable */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Recoverable</p>
              <p className="text-[#204CC7] text-h1 font-bold">{recoverableCount}</p>
            </div>
            <div className="w-10 h-10 bg-[#204CC7]/[0.06] rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#204CC7]/60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#204CC7] rounded-l-full" style={{ width: `${totalLost > 0 ? (recoverableCount / totalLost) * 100 : 0}%` }} />
              <div className="bg-black/10" style={{ width: `${totalLost > 0 ? ((totalLost - recoverableCount) / totalLost) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#204CC7]" /><span className="text-black/50 text-caption font-normal">Yes: {recoverableCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-black/15" /><span className="text-black/50 text-caption font-normal">No: {totalLost - recoverableCount}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Reason Insight */}
      {topReason && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50/50 border border-amber-100 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-caption font-medium text-amber-800">
            Top loss reason: <span className="font-semibold">{topReason[0]}</span> — accounts for {topReason[1]} of {totalLost} lost clients ({totalLost > 0 ? Math.round((topReason[1] / totalLost) * 100) : 0}%)
          </p>
        </div>
      )}

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
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Manager</th>
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
                        <p className="text-caption font-normal text-black/45 mt-0.5">{client.ownerName}</p>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                        client.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}>
                        {client.service === 'Performance Marketing' ? 'PM' : 'A&T'}
                      </span>
                    </td>

                    {/* Lost Date */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-caption font-normal text-black/65">{formatDate(client.lostDate)}</p>
                        <p className="text-caption font-normal text-black/35 mt-0.5">{daysAgo}d ago</p>
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

                    {/* Manager */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-black/70 to-black/50 flex items-center justify-center border-2 border-white">
                          <span className="text-white text-[10px] font-semibold">{client.accountManager.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <span className="text-caption font-normal text-black/65">{client.accountManager.split(' ')[0]}</span>
                      </div>
                    </td>

                    {/* Recovery */}
                    <td className="px-4 py-3">
                      {client.recoverable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-caption font-medium bg-[#204CC7]/[0.06] text-[#204CC7] border border-[#204CC7]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#204CC7]" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-caption font-normal text-black/35">—</span>
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
