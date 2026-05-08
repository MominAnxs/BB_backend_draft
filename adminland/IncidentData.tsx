'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, AlertCircle, Search, Plus, Filter, Eye, X, Calendar, User, Building2, FileText, TrendingDown, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';

// ── Types ──
interface Incident {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Client' | 'Employee';
  relatedTo: string;
  service: 'Performance Marketing' | 'Accounts & Taxation' | 'Internal';
  category: 'Service Quality' | 'Communication' | 'Payment' | 'Technical' | 'HR Issue' | 'Compliance' | 'Deliverables';
  priority: 'Low' | 'Medium' | 'High';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  resolution?: string;
}

type TypeFilter = 'All' | 'Client' | 'Employee';
type ServiceFilter = 'All' | 'Performance Marketing' | 'Accounts & Taxation' | 'Internal';
type CategoryFilter = 'All' | Incident['category'];
type PriorityFilter = 'All' | Incident['priority'];
type StatusFilter = 'All' | Incident['status'];
type SortField = 'date' | 'priority' | 'status' | 'relatedTo';
type SortDir = 'asc' | 'desc';

interface Filters {
  type: TypeFilter;
  service: ServiceFilter;
  category: CategoryFilter;
  priority: PriorityFilter;
  status: StatusFilter;
}

const DEFAULT_FILTERS: Filters = { type: 'All', service: 'All', category: 'All', priority: 'All', status: 'All' };

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER: Record<string, number> = { Open: 0, 'In Progress': 1, Resolved: 2, Closed: 3 };

// ── Realistic Mock Data ──
const initialIncidents: Incident[] = [
  { id: 'INC-001', date: '2025-03-28', type: 'Client', relatedTo: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', category: 'Service Quality', priority: 'High', description: 'ROAS dropped below 1.5x for 3 consecutive weeks. Client threatening to leave.', status: 'Open' },
  { id: 'INC-002', date: '2025-03-26', type: 'Client', relatedTo: 'Meridian Healthcare', service: 'Accounts & Taxation', category: 'Compliance', priority: 'High', description: 'GST filing deadline missed for February. Potential penalty of ₹10,000.', status: 'In Progress' },
  { id: 'INC-003', date: '2025-03-25', type: 'Employee', relatedTo: 'Amit Verma', service: 'Internal', category: 'HR Issue', priority: 'Medium', description: 'Reported harassment complaint against team lead. Requires immediate HR investigation.', status: 'In Progress' },
  { id: 'INC-004', date: '2025-03-24', type: 'Client', relatedTo: 'UrbanNest Realty', service: 'Performance Marketing', category: 'Communication', priority: 'Medium', description: 'Client not receiving weekly performance reports. Issue persists for 2 weeks.', status: 'Open' },
  { id: 'INC-005', date: '2025-03-22', type: 'Client', relatedTo: 'NovaTech Solutions', service: 'Accounts & Taxation', category: 'Payment', priority: 'High', description: 'Invoice of ₹1.2L overdue by 45 days. Multiple follow-ups unanswered.', status: 'In Progress' },
  { id: 'INC-006', date: '2025-03-20', type: 'Client', relatedTo: 'Bloom Botanics', service: 'Performance Marketing', category: 'Deliverables', priority: 'High', description: 'March campaign creatives not delivered. Launch delayed by 5 days causing revenue loss.', status: 'Resolved', resolution: 'Creatives delivered and campaign launched. Offered 1 week free extension.' },
  { id: 'INC-007', date: '2025-03-18', type: 'Employee', relatedTo: 'Kavya Iyer', service: 'Internal', category: 'HR Issue', priority: 'Low', description: 'Request for role change from Executive to Sr. Executive. Pending manager review.', status: 'Open' },
  { id: 'INC-008', date: '2025-03-15', type: 'Client', relatedTo: 'FreshBite Foods', service: 'Performance Marketing', category: 'Technical', priority: 'High', description: 'Facebook ad account suspended due to policy violation. All campaigns halted.', status: 'In Progress' },
  { id: 'INC-009', date: '2025-03-12', type: 'Client', relatedTo: 'GreenLeaf Organics', service: 'Accounts & Taxation', category: 'Service Quality', priority: 'Medium', description: 'Bookkeeping errors found in Q3 statements. Client requesting re-audit.', status: 'Resolved', resolution: 'Statements corrected and verified. Apology letter sent to client.' },
  { id: 'INC-010', date: '2025-03-10', type: 'Client', relatedTo: 'AutoPrime Motors', service: 'Performance Marketing', category: 'Communication', priority: 'Low', description: 'Client POC changed but team was not informed for 2 weeks.', status: 'Resolved', resolution: 'CRM updated. Process implemented for POC change notifications.' },
  { id: 'INC-011', date: '2025-03-08', type: 'Employee', relatedTo: 'Ishaan Joshi', service: 'Internal', category: 'Compliance', priority: 'Medium', description: 'NDA breach suspected — shared client data screenshots on personal social media.', status: 'In Progress' },
  { id: 'INC-012', date: '2025-03-05', type: 'Client', relatedTo: 'SparkEdge Media', service: 'Performance Marketing', category: 'Payment', priority: 'Medium', description: 'Disputed invoice amount. Client claims agreed fee was ₹80K, not ₹95K.', status: 'Open' },
  { id: 'INC-013', date: '2025-03-02', type: 'Client', relatedTo: 'TrueValue Finance', service: 'Accounts & Taxation', category: 'Deliverables', priority: 'High', description: 'Annual return filing incomplete. Missing documents from client side.', status: 'In Progress' },
  { id: 'INC-014', date: '2025-02-28', type: 'Client', relatedTo: 'PeakFit Wellness', service: 'Performance Marketing', category: 'Service Quality', priority: 'Medium', description: 'Lead quality issues — 60% of leads generated are unqualified.', status: 'Resolved', resolution: 'Targeting refined, negative keywords added. Quality improved to 78% qualified.' },
  { id: 'INC-015', date: '2025-02-25', type: 'Employee', relatedTo: 'Neha Kapoor', service: 'Internal', category: 'HR Issue', priority: 'Low', description: 'Frequent late arrivals reported by manager. 8 instances in February.', status: 'Resolved', resolution: 'Warning issued. Flexible timing approved for medical reasons.' },
  { id: 'INC-016', date: '2025-02-20', type: 'Client', relatedTo: 'PixelCraft Studios', service: 'Performance Marketing', category: 'Technical', priority: 'High', description: 'Google Ads conversion tracking broken for 2 weeks. Data accuracy compromised.', status: 'Resolved', resolution: 'Tracking pixel reinstalled and verified. Historical data reconciled.' },
];

// ── Helpers ──
function parseDate(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function formatDate(s: string): string {
  const d = parseDate(s);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function daysSince(s: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - parseDate(s).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Filter Option ──
function FilterOption<T extends string>({ label, value, selected, onSelect }: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button onClick={() => onSelect(value)} className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-caption ${selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03] font-normal'}`}>
      {label}
      {selected && <Check className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Filter Panel ──
// `forceType` (when present) suppresses the Type section since the
// hosting sub-tab has already locked the view to that kind. Without
// this, the section would still render with the locked option
// "selected" and the others disabled — visually confusing.
function IncidentFilterPanel({ filters, onChange, onClose, onReset, activeCount, forceType }: {
  filters: Filters; onChange: (f: Filters) => void; onClose: () => void; onReset: () => void; activeCount: number;
  forceType?: 'Client' | 'Employee';
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
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[380px]">
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
      <div className="p-3 space-y-4 max-h-[480px] overflow-y-auto">
        {/* Type — hidden when the page is locked to one kind via forceType. */}
        {!forceType && (
          <div>
            <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Type</p>
            <div className="space-y-0.5">
              {(['All', 'Client', 'Employee'] as TypeFilter[]).map(opt => (
                <FilterOption key={opt} label={opt === 'All' ? 'All Types' : opt} value={opt} selected={filters.type === opt} onSelect={v => onChange({ ...filters, type: v })} />
              ))}
            </div>
          </div>
        )}
        {/* Service */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            {(['All', 'Performance Marketing', 'Accounts & Taxation', 'Internal'] as ServiceFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : opt} value={opt} selected={filters.service === opt} onSelect={v => onChange({ ...filters, service: v })} />
            ))}
          </div>
        </div>
        {/* Priority */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Priority</p>
          <div className="space-y-0.5">
            {(['All', 'High', 'Medium', 'Low'] as PriorityFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Priorities' : opt} value={opt} selected={filters.priority === opt} onSelect={v => onChange({ ...filters, priority: v })} />
            ))}
          </div>
        </div>
        {/* Status */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Status</p>
          <div className="space-y-0.5">
            {(['All', 'Open', 'In Progress', 'Resolved'] as StatusFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt} value={opt} selected={filters.status === opt} onSelect={v => onChange({ ...filters, status: v })} />
            ))}
          </div>
        </div>
        {/* Category */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Category</p>
          <div className="space-y-0.5">
            {(['All', 'Service Quality', 'Communication', 'Payment', 'Technical', 'HR Issue', 'Compliance', 'Deliverables'] as CategoryFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Categories' : opt} value={opt} selected={filters.category === opt} onSelect={v => onChange({ ...filters, category: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
const STATUS_OPTIONS: Incident['status'][] = ['Open', 'In Progress', 'Resolved'];
// Priority is ordered High → Medium → Low so the dropdown reads from
// most-urgent to least, which matches how an admin scans triage state.
const PRIORITY_OPTIONS: Incident['priority'][] = ['High', 'Medium', 'Low'];

const STATUS_DOT_COLORS: Record<Incident['status'], string> = {
  Open: 'bg-rose-400',
  'In Progress': 'bg-blue-400',
  Resolved: 'bg-emerald-400',
};

const PRIORITY_DOT_COLORS: Record<Incident['priority'], string> = {
  High: 'bg-rose-500',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-500',
};

// `forceType` locks this surface to a single incident kind:
//   - "Client"   → renders only client incidents (Customers > Incidents)
//   - "Employee" → renders only employee incidents (Employees > Incidents)
//   - undefined  → renders everything (legacy /adminland route).
// When forced, the Type filter section, Type column, Type chip, and
// type-picker inside the New Incident form all collapse — there's
// nothing to choose between.
export function IncidentData({ forceType }: { forceType?: 'Client' | 'Employee' } = {}) {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  // forceType wins over the URL param so deep-links can't override the
  // sub-tab's contract.
  const initialTypeFilter: TypeFilter = forceType
    ? forceType
    : ((typeParam === 'Client' || typeParam === 'Employee') ? typeParam : 'All');
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, type: initialTypeFilter });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Add Incident modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Raise-Incident modal a11y: Escape closes, focus traps inside, focus
  // returns to the launcher (Raise Incident button) when the modal dismisses.
  const addIncidentDialogRef = useModalA11y(showAddModal, () => setShowAddModal(false));

  // Detail drawer a11y: same contract as the Add modal — Escape, focus
  // trap, focus restore to the row's Eye button.
  const detailDrawerRef = useModalA11y(showDrawer && !!selectedIncident, () => setShowDrawer(false));
  const [formData, setFormData] = useState({
    type: (forceType ?? 'Client') as Incident['type'],
    relatedTo: '',
    service: (forceType === 'Employee' ? 'Internal' : 'Performance Marketing') as Incident['service'],
    category: 'Service Quality' as Incident['category'],
    priority: 'Medium' as Incident['priority'],
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setFormData({
      type: forceType ?? 'Client',
      relatedTo: '',
      service: forceType === 'Employee' ? 'Internal' : 'Performance Marketing',
      category: 'Service Quality',
      priority: 'Medium',
      description: '',
    });
    setFormErrors({});
  };

  const handleAddIncident = () => {
    // Validate
    const errors: Record<string, boolean> = {};
    if (!formData.relatedTo.trim()) errors.relatedTo = true;
    if (!formData.description.trim()) errors.description = true;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newId = `INC-${String(incidents.length + 1).padStart(3, '0')}`;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const newIncident: Incident = {
      id: newId,
      date: dateStr,
      type: formData.type,
      relatedTo: formData.relatedTo.trim(),
      service: formData.type === 'Employee' ? 'Internal' : formData.service,
      category: formData.category,
      priority: formData.priority,
      description: formData.description.trim(),
      status: 'Open',
    };

    setIncidents(prev => [newIncident, ...prev]);
    setShowAddModal(false);
    resetForm();
  };

  // Status dropdown
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Priority dropdown — same shape as the status one so the two pills
  // in each row read as a paired control set.
  const [openPriorityDropdown, setOpenPriorityDropdown] = useState<string | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setOpenStatusDropdown(null);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(e.target as Node)) {
        setOpenPriorityDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (incidentId: string, newStatus: Incident['status']) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
    setOpenStatusDropdown(null);
  };

  const changePriority = (incidentId: string, newPriority: Incident['priority']) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, priority: newPriority } : inc));
    setOpenPriorityDropdown(null);
  };

  const filterCount = (filters.type !== 'All' ? 1 : 0) + (filters.service !== 'All' ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + (filters.priority !== 'All' ? 1 : 0) + (filters.status !== 'All' ? 1 : 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'relatedTo' ? 'asc' : 'desc'); }
  };

  const filteredIncidents = useMemo(() => {
    let result = incidents.filter(inc => {
      // forceType is the hard floor — when set, only that kind of
      // incident ever surfaces here, regardless of filters.type.
      if (forceType && inc.type !== forceType) return false;
      const q = searchQuery.toLowerCase();
      if (q && !(inc.relatedTo.toLowerCase().includes(q) || inc.id.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || inc.category.toLowerCase().includes(q))) return false;
      if (filters.type !== 'All' && inc.type !== filters.type) return false;
      if (filters.service !== 'All' && inc.service !== filters.service) return false;
      if (filters.category !== 'All' && inc.category !== filters.category) return false;
      if (filters.priority !== 'All' && inc.priority !== filters.priority) return false;
      if (filters.status !== 'All' && inc.status !== filters.status) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = parseDate(a.date).getTime() - parseDate(b.date).getTime(); break;
        case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case 'status': cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
        case 'relatedTo': cmp = a.relatedTo.localeCompare(b.relatedTo); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [forceType, incidents, searchQuery, filters, sortField, sortDir]);

  // ── KPIs (reactive) ──
  const totalIncidents = filteredIncidents.length;
  const openIncidents = filteredIncidents.filter(i => i.status === 'Open').length;
  const inProgressIncidents = filteredIncidents.filter(i => i.status === 'In Progress').length;
  const resolvedIncidents = filteredIncidents.filter(i => i.status === 'Resolved').length;
  const highPriorityCount = filteredIncidents.filter(i => i.priority === 'High').length;
  const clientCount = filteredIncidents.filter(i => i.type === 'Client').length;
  const employeeCount = filteredIncidents.filter(i => i.type === 'Employee').length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getTypeColor = (type: string) => type === 'Client' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200';

  const getServiceLabel = (s: string) => s === 'Performance Marketing' ? 'SEM' : s === 'Accounts & Taxation' ? 'A&T' : 'Internal';

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

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on CustomersOverview, All Customers, CLAs, and
        Lost Clients. Title + subtitle anchor the left; the page-specific
        controls (result count, Search, Filter, Raise Incident) hang on
        the right so every Customers sub-page reads with the same visual
        rhythm.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Incidents</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Track and resolve client &amp; employee incidents</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only when filters or search are narrowing the table */}
            {(filterCount > 0 || searchQuery) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/60">
                {filteredIncidents.length} of {incidents.length} results
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="incidents-search" className="sr-only">Search incidents</label>
              <input
                id="incidents-search"
                type="text"
                placeholder="Search incidents…"
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
                {filterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>}
              </button>
              {showFilterPanel && (
                <IncidentFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilterPanel(false)} onReset={() => setFilters({ ...DEFAULT_FILTERS, type: forceType ?? 'All' })} activeCount={filterCount} forceType={forceType} />
              )}
            </div>

            {/* Raise Incident */}
            <button
              type="button"
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#204CC7] text-white rounded-md hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all text-caption font-medium"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Raise Incident</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/55">Filtered by:</span>
          {/* Type chip is suppressed when forceType locks this view to a
              single kind — there's nothing to clear and the page header
              already communicates the scope. */}
          {!forceType && filters.type !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.type}
              <button onClick={() => setFilters(f => ({ ...f, type: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {getServiceLabel(filters.service)}
              <button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.priority !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.priority}
              <button onClick={() => setFilters(f => ({ ...f, priority: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.status !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.status}
              <button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.category !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.category}
              <button onClick={() => setFilters(f => ({ ...f, category: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/55 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/*
        KPI widgets — each card is a direct slice of the table below. Click
        a card to toggle that filter on the table; the active card gets a
        brand-blue border so you can see at a glance which slice is in play.
        Three cards mirror specific table columns (Status: Open · Status:
        In Progress · Priority: High); the fourth shows the derived
        Resolution Rate, which is informational only and isn't clickable.
      */}
      {(() => {
        const resolvedCount = filteredIncidents.filter(i => i.status === 'Resolved').length;
        const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;

        const isOpenActive = filters.status === 'Open';
        const isInProgressActive = filters.status === 'In Progress';
        const isHighActive = filters.priority === 'High';

        const resolutionTone =
          totalIncidents === 0 ? 'good'
          : resolutionRate >= 60 ? 'good'
          : resolutionRate >= 30 ? 'warn'
          : 'bad';

        const toneClasses = {
          good: { value: 'text-[#00C875]', iconBg: 'bg-[#00C875]/[0.08]', iconFg: 'text-[#00C875]/80' },
          warn: { value: 'text-[#FDAB3D]', iconBg: 'bg-[#FDAB3D]/[0.08]', iconFg: 'text-[#FDAB3D]/80' },
          bad:  { value: 'text-[#E2445C]', iconBg: 'bg-[#E2445C]/[0.08]', iconFg: 'text-[#E2445C]/80' },
        } as const;
        const labelCls = 'text-black/55 text-caption font-medium uppercase tracking-wide';
        const captionCls = 'text-black/60 text-caption';
        const suffixCls = 'text-caption font-medium text-black/55 ml-1.5';

        const buttonCard = (active: boolean) =>
          `bg-white border rounded-2xl p-5 flex flex-col gap-4 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
            active
              ? 'border-[#204CC7]/40 bg-[#204CC7]/[0.02] shadow-sm'
              : 'border-black/[0.06] hover:border-black/[0.12] hover:shadow-sm'
          }`;
        const staticCard = 'bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4';

        // Filter toggles: click again on an already-active filter to clear it.
        const toggleStatus = (s: 'Open' | 'In Progress') =>
          setFilters(f => ({ ...f, status: f.status === s ? 'All' : s }));
        const toggleHighPriority = () =>
          setFilters(f => ({ ...f, priority: f.priority === 'High' ? 'All' : 'High' }));

        return (
          <div className="grid grid-cols-4 gap-4">
            {/* Open — clicks set Status filter to Open */}
            <button
              type="button"
              onClick={() => toggleStatus('Open')}
              aria-pressed={isOpenActive}
              className={buttonCard(isOpenActive)}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <p className={labelCls}>Open</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${openIncidents > 0 ? toneClasses.bad.iconBg : toneClasses.good.iconBg}`}>
                  {openIncidents > 0
                    ? <AlertCircle className={`w-4 h-4 ${toneClasses.bad.iconFg}`} aria-hidden="true" />
                    : <CheckCircle2 className={`w-4 h-4 ${toneClasses.good.iconFg}`} aria-hidden="true" />}
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${openIncidents > 0 ? toneClasses.bad.value : toneClasses.good.value}`}>
                  {openIncidents}
                </p>
                <p className={captionCls}>
                  {totalIncidents === 0 ? 'No incidents' : `of ${totalIncidents} total`}
                </p>
              </div>
            </button>

            {/* In Progress — clicks set Status filter to In Progress */}
            <button
              type="button"
              onClick={() => toggleStatus('In Progress')}
              aria-pressed={isInProgressActive}
              className={buttonCard(isInProgressActive)}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <p className={labelCls}>In Progress</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${inProgressIncidents > 0 ? 'bg-[#204CC7]/[0.08]' : toneClasses.good.iconBg}`}>
                  {inProgressIncidents > 0
                    ? <Clock className="w-4 h-4 text-[#204CC7]/80" aria-hidden="true" />
                    : <CheckCircle2 className={`w-4 h-4 ${toneClasses.good.iconFg}`} aria-hidden="true" />}
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${inProgressIncidents > 0 ? 'text-[#204CC7]' : toneClasses.good.value}`}>
                  {inProgressIncidents}
                </p>
                <p className={captionCls}>
                  {totalIncidents === 0 ? 'No incidents' : `of ${totalIncidents} total`}
                </p>
              </div>
            </button>

            {/* High Priority — clicks set Priority filter to High */}
            <button
              type="button"
              onClick={toggleHighPriority}
              aria-pressed={isHighActive}
              className={buttonCard(isHighActive)}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <p className={labelCls}>High Priority</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${highPriorityCount > 0 ? toneClasses.bad.iconBg : toneClasses.good.iconBg}`}>
                  <Shield className={`w-4 h-4 ${highPriorityCount > 0 ? toneClasses.bad.iconFg : toneClasses.good.iconFg}`} aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${highPriorityCount > 0 ? toneClasses.bad.value : toneClasses.good.value}`}>
                  {highPriorityCount}
                </p>
                <p className={captionCls}>
                  {totalIncidents === 0 ? 'No incidents' : `of ${totalIncidents} total`}
                </p>
              </div>
            </button>

            {/* Resolution Rate — informational, NOT clickable */}
            <div className={staticCard}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Resolution Rate</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[resolutionTone].iconBg}`}>
                  <Check className={`w-4 h-4 ${toneClasses[resolutionTone].iconFg}`} aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${toneClasses[resolutionTone].value} flex items-baseline`}>
                  {totalIncidents === 0 ? (
                    <span>—</span>
                  ) : (
                    <>
                      <span>{resolutionRate}</span>
                      <span className={suffixCls}>%</span>
                    </>
                  )}
                </p>
                <p className={captionCls}>
                  {totalIncidents === 0
                    ? 'No incidents to resolve'
                    : `${resolvedCount} of ${totalIncidents} resolved`}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Incident Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">ID</th>
                <SortHeader field="date">Date</SortHeader>
                {/* Type column drops out when forceType locks the page
                    to one kind — the column would be a constant value. */}
                {!forceType && <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Type</th>}
                <SortHeader field="relatedTo">Related To</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Category</th>
                <SortHeader field="priority">Priority</SortHeader>
                <SortHeader field="status">Status</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={forceType ? 7 : 8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-black/20" />
                      <p className="text-body font-medium text-black/50">No incidents match your filters</p>
                      <button onClick={() => { setFilters(DEFAULT_FILTERS); setSearchQuery(''); }} className="text-caption font-medium text-[#204CC7] hover:underline">Clear all filters</button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredIncidents.map((incident, index) => {
                const daysAgo = daysSince(incident.date);
                return (
                  <tr key={incident.id} className={`border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors ${index % 2 === 1 ? 'bg-black/[0.01]' : ''} ${incident.priority === 'High' && incident.status === 'Open' ? 'bg-rose-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-[#204CC7] text-caption font-semibold">{incident.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-caption font-normal text-black/65">{formatDate(incident.date)}</p>
                        <p className="text-caption font-normal text-black/35 mt-0.5">{daysAgo}d ago</p>
                      </div>
                    </td>
                    {!forceType && (
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getTypeColor(incident.type)}`}>
                          {incident.type}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-black/90">{incident.relatedTo}</p>
                        <p className="text-caption font-normal text-black/55 mt-0.5">{getServiceLabel(incident.service)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-caption font-normal text-black/65">{incident.category}</p>
                    </td>
                    {/* Priority — clickable pill that opens a 3-option
                        dropdown (High / Medium / Low). Same anchored-
                        relative pattern as the Status pill so the two
                        controls feel like one set. */}
                    <td className="px-4 py-3">
                      <div className="relative" ref={openPriorityDropdown === incident.id ? priorityDropdownRef : undefined}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenPriorityDropdown(openPriorityDropdown === incident.id ? null : incident.id); }}
                          aria-haspopup="listbox"
                          aria-expanded={openPriorityDropdown === incident.id}
                          aria-label={`Priority: ${incident.priority} — change for ${incident.id}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-caption font-semibold cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${getPriorityColor(incident.priority)}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT_COLORS[incident.priority]}`} aria-hidden="true" />
                          {incident.priority}
                          <ChevronRight className={`w-3 h-3 transition-transform ${openPriorityDropdown === incident.id ? 'rotate-90' : ''}`} aria-hidden="true" />
                        </button>

                        {openPriorityDropdown === incident.id && (
                          <div
                            role="listbox"
                            aria-label={`Priority options for ${incident.id}`}
                            className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[140px]"
                          >
                            {PRIORITY_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                role="option"
                                aria-selected={incident.priority === opt}
                                onClick={(e) => { e.stopPropagation(); changePriority(incident.id, opt); }}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                  incident.priority === opt
                                    ? `${getPriorityColor(opt)} font-semibold`
                                    : 'text-black/70 hover:bg-black/[0.03]'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT_COLORS[opt]}`} aria-hidden="true" />
                                {opt}
                                {incident.priority === opt && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative" ref={openStatusDropdown === incident.id ? statusDropdownRef : undefined}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenStatusDropdown(openStatusDropdown === incident.id ? null : incident.id); }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all text-caption font-semibold cursor-pointer ${getStatusColor(incident.status)}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[incident.status]}`} />
                          {incident.status}
                          <ChevronRight className={`w-3 h-3 transition-transform ${openStatusDropdown === incident.id ? 'rotate-90' : ''}`} />
                        </button>

                        {openStatusDropdown === incident.id && (
                          <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[155px]">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt}
                                onClick={(e) => { e.stopPropagation(); changeStatus(incident.id, opt); }}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                  incident.status === opt
                                    ? `${getStatusColor(opt)} font-semibold`
                                    : 'text-black/70 hover:bg-black/[0.03]'
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[opt]}`} />
                                {opt}
                                {incident.status === opt && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelectedIncident(incident); setShowDrawer(true); }}
                        aria-label={`View incident ${incident.id} (${incident.relatedTo})`}
                        className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Incident Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div
              ref={addIncidentDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-incident-title"
              tabIndex={-1}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col focus:outline-none"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
                <div>
                  <h2 id="add-incident-title" className="text-h3 font-bold text-black/90">Raise New Incident</h2>
                  <p className="text-caption font-normal text-black/55 mt-0.5">Fill in the details to create a new incident report</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  aria-label="Close incident dialog"
                  className="p-1.5 rounded-md hover:bg-black/[0.04] text-black/55 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Row 1: Incident Type — collapsed when forceType
                    locks the page; the form already pre-fills the
                    correct type so there's nothing for the admin to
                    pick here. */}
                {!forceType && (
                  <div>
                    <label className="block text-caption font-semibold text-black/60 mb-1.5">Incident Type <span className="text-[#E2445C]">*</span></label>
                    <div className="flex gap-2">
                      {(['Client', 'Employee'] as Incident['type'][]).map(t => (
                        <button
                          key={t}
                          onClick={() => setFormData(f => ({ ...f, type: t, service: t === 'Employee' ? 'Internal' : f.service }))}
                          className={`flex-1 py-2.5 rounded-lg border text-caption font-medium transition-all flex items-center justify-center gap-2 ${
                            formData.type === t
                              ? t === 'Client' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                              : 'border-black/10 text-black/50 hover:bg-black/[0.02]'
                          }`}
                        >
                          {t === 'Client' ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: Related To */}
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">
                    {formData.type === 'Client' ? 'Client Name' : 'Employee Name'} <span className="text-[#E2445C]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.relatedTo}
                    onChange={e => { setFormData(f => ({ ...f, relatedTo: e.target.value })); setFormErrors(fe => ({ ...fe, relatedTo: false })); }}
                    placeholder={formData.type === 'Client' ? 'e.g., Zenith Retail Pvt Ltd' : 'e.g., Amit Verma'}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all ${
                      formErrors.relatedTo ? 'border-[#E2445C] bg-rose-50/30' : 'border-black/10'
                    }`}
                  />
                  {formErrors.relatedTo && <p className="text-caption font-medium text-[#E2445C] mt-1">This field is required</p>}
                </div>

                {/* Row 3: Service + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-black/60 mb-1.5">Service</label>
                    {formData.type === 'Employee' ? (
                      <div className="px-3.5 py-2.5 rounded-xl border border-black/10 bg-black/[0.02] text-caption text-black/55">Internal (auto-assigned)</div>
                    ) : (
                      <select
                        value={formData.service}
                        onChange={e => setFormData(f => ({ ...f, service: e.target.value as Incident['service'] }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                      >
                        <option value="Performance Marketing">Performance Marketing</option>
                        <option value="Accounts & Taxation">Accounts & Taxation</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-black/60 mb-1.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData(f => ({ ...f, category: e.target.value as Incident['category'] }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      {formData.type === 'Client' ? (
                        <>
                          <option value="Service Quality">Service Quality</option>
                          <option value="Communication">Communication</option>
                          <option value="Payment">Payment</option>
                          <option value="Technical">Technical</option>
                          <option value="Deliverables">Deliverables</option>
                          <option value="Compliance">Compliance</option>
                        </>
                      ) : (
                        <>
                          <option value="HR Issue">HR Issue</option>
                          <option value="Compliance">Compliance</option>
                          <option value="Communication">Communication</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Row 4: Description */}
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Description <span className="text-[#E2445C]">*</span></label>
                  <textarea
                    value={formData.description}
                    onChange={e => { setFormData(f => ({ ...f, description: e.target.value })); setFormErrors(fe => ({ ...fe, description: false })); }}
                    placeholder="Describe the incident in detail — what happened, when, and the impact..."
                    rows={3}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none ${
                      formErrors.description ? 'border-[#E2445C] bg-rose-50/30' : 'border-black/10'
                    }`}
                  />
                  {formErrors.description && <p className="text-caption font-medium text-[#E2445C] mt-1">Description is required</p>}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-2">Priority <span className="text-[#E2445C]">*</span></label>
                  <div className="flex gap-2">
                    {(['Low', 'Medium', 'High'] as Incident['priority'][]).map(s => {
                      const colors: Record<string, string> = { Low: 'bg-emerald-50 border-emerald-200 text-emerald-700', Medium: 'bg-amber-50 border-amber-200 text-amber-700', High: 'bg-rose-50 border-rose-200 text-rose-700' };
                      return <button key={s} type="button" onClick={() => setFormData(f => ({...f, priority: s}))} className={`flex-1 py-2.5 rounded-xl border text-caption font-medium transition-all ${formData.priority === s ? colors[s] : 'border-black/10 text-black/50 hover:bg-black/[0.02]'}`}>{s}</button>;
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-md border border-black/10 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                  Cancel
                </button>
                <button onClick={handleAddIncident} className="px-5 py-2.5 rounded-md bg-[#204CC7] text-white hover:bg-[#1a3fa8] transition-all text-caption font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Raise Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incident Details Drawer */}
      {showDrawer && selectedIncident && (() => {
        const daysOpen = daysSince(selectedIncident.date);
        const isUrgent = selectedIncident.priority === 'High' && (selectedIncident.status === 'Open' || selectedIncident.status === 'In Progress');
        const isOpen = selectedIncident.status === 'Open';
        const isInProgress = selectedIncident.status === 'In Progress';
        const isResolved = selectedIncident.status === 'Resolved';

        // Next logical status action — Resolved is the terminal state now
        // that Closed has been retired.
        const nextStatus: Incident['status'] | null = isOpen ? 'In Progress' : isInProgress ? 'Resolved' : null;
        const nextLabel = isOpen ? 'Start Investigation' : isInProgress ? 'Mark as Resolved' : null;
        const nextColors = isOpen ? 'bg-[#204CC7] hover:bg-[#1a3d9f] text-white' : isInProgress ? 'bg-[#00C875] hover:bg-[#00a85f] text-white' : '';

        // Severity header color
        const priorityHeaderBg = selectedIncident.priority === 'High' ? 'bg-[#E2445C]' : selectedIncident.priority === 'Medium' ? 'bg-[#FDAB3D]' : 'bg-[#204CC7]';

        return (
          <div className="fixed inset-0 z-[60]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} aria-hidden="true" />
            <div
              ref={detailDrawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="incident-drawer-title"
              tabIndex={-1}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-hidden focus:outline-none"
            >
              <div className="h-full flex flex-col">
                {/* Header — color-coded by priority */}
                <div className={`${priorityHeaderBg} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedIncident.id}</span>
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedIncident.priority}</span>
                      </div>
                      <h2 id="incident-drawer-title" className="text-white text-h2 font-bold truncate">{selectedIncident.relatedTo}</h2>
                      <p className="text-white/85 text-caption font-normal mt-1">{selectedIncident.category} · {getServiceLabel(selectedIncident.service)} · Reported {formatDate(selectedIncident.date)}</p>
                    </div>
                    <button
                      onClick={() => setShowDrawer(false)}
                      aria-label="Close incident details"
                      className="ml-3 w-8 h-8 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Urgency banner — only for critical/high open incidents */}
                {isUrgent && (
                  <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.06] border border-[#E2445C]/20 rounded-xl">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-[#E2445C]" />
                    </div>
                    <div>
                      <p className="text-[#E2445C] text-caption font-semibold">Open for {daysOpen} day{daysOpen !== 1 ? 's' : ''}</p>
                      <p className="text-black/50 text-caption font-normal">{selectedIncident.priority} priority — requires immediate attention</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Status + Severity + Age row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/60 text-caption font-medium mb-1.5">Status</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getStatusColor(selectedIncident.status)}`}>{selectedIncident.status}</span>
                    </div>
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/60 text-caption font-medium mb-1.5">Priority</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getPriorityColor(selectedIncident.priority)}`}>{selectedIncident.priority}</span>
                    </div>
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/60 text-caption font-medium mb-1.5">Age</p>
                      <p className={`text-body font-semibold ${daysOpen > 7 ? 'text-[#E2445C]' : daysOpen > 3 ? 'text-[#FDAB3D]' : 'text-black/80'}`}>{daysOpen} day{daysOpen !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <FileText className="w-3.5 h-3.5 text-[#204CC7]" />
                      <h3 className="text-black/90 text-body font-semibold">What Happened</h3>
                    </div>
                    <p className="text-black/65 text-body leading-relaxed">{selectedIncident.description}</p>
                  </div>

                  {/* Details grid */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <h3 className="text-black/90 text-body font-semibold mb-3.5">Details</h3>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedIncident.type === 'Client' ? <Building2 className="w-3.5 h-3.5 text-black/35" /> : <User className="w-3.5 h-3.5 text-black/35" />}
                          <span className="text-black/50 text-caption font-medium">{selectedIncident.type === 'Client' ? 'Client' : 'Employee'}</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{selectedIncident.relatedTo}</p>
                      </div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Service</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getTypeColor(selectedIncident.type)}`}>{selectedIncident.type}</span>
                          <span className="text-black/70 text-body font-medium">{getServiceLabel(selectedIncident.service)}</span>
                        </div>
                      </div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Reported</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{formatDate(selectedIncident.date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resolution — only if resolved/closed */}
                  {selectedIncident.resolution && (
                    <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <h3 className="text-emerald-900 text-body font-semibold">Resolution</h3>
                      </div>
                      <p className="text-emerald-700/80 text-body leading-relaxed">{selectedIncident.resolution}</p>
                    </div>
                  )}
                </div>

                {/* Footer — contextual CTAs based on current status */}
                <div className="px-6 py-4 border-t border-black/[0.06] space-y-3">
                  {/* Primary action — advances to next logical status */}
                  {nextStatus && nextLabel && (
                    <button
                      onClick={() => {
                        changeStatus(selectedIncident.id, nextStatus);
                        setSelectedIncident({ ...selectedIncident, status: nextStatus });
                      }}
                      className={`w-full px-4 py-3 rounded-xl transition-all text-body font-semibold flex items-center justify-center gap-2 ${nextColors}`}
                    >
                      {isOpen && <Clock className="w-4 h-4" />}
                      {isInProgress && <CheckCircle2 className="w-4 h-4" />}
                      {nextLabel}
                    </button>
                  )}

                  {/* Secondary actions row */}
                  <div className="flex gap-2.5">
                    {/* Escalate — only for open/in-progress non-high incidents */}
                    {(isOpen || isInProgress) && selectedIncident.priority !== 'High' && (
                      <button
                        onClick={() => {
                          const nextPriority: Record<string, Incident['priority']> = { Low: 'Medium', Medium: 'High' };
                          const upgraded = nextPriority[selectedIncident.priority];
                          if (upgraded) {
                            setIncidents(prev => prev.map(inc => inc.id === selectedIncident.id ? { ...inc, priority: upgraded } : inc));
                            setSelectedIncident({ ...selectedIncident, priority: upgraded });
                          }
                        }}
                        className="flex-1 px-3 py-2.5 border border-[#E2445C]/20 text-[#E2445C] rounded-xl hover:bg-[#E2445C]/[0.04] transition-all text-caption font-medium flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Escalate
                      </button>
                    )}

                    {/* Reopen — only for resolved incidents (Resolved is now the terminal state) */}
                    {isResolved && (
                      <button
                        onClick={() => {
                          changeStatus(selectedIncident.id, 'Open');
                          setSelectedIncident({ ...selectedIncident, status: 'Open', resolution: undefined });
                          setIncidents(prev => prev.map(inc => inc.id === selectedIncident.id ? { ...inc, status: 'Open' as Incident['status'], resolution: undefined } : inc));
                        }}
                        className="flex-1 px-3 py-2.5 border border-[#FDAB3D]/30 text-[#FDAB3D] rounded-xl hover:bg-[#FDAB3D]/[0.04] transition-all text-caption font-medium flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Reopen
                      </button>
                    )}

                    {/* Dismiss — close the drawer */}
                    <button onClick={() => setShowDrawer(false)} className="flex-1 px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
