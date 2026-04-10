'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Search, Plus, Filter, Eye, X, Calendar, User, Building2, FileText, TrendingDown, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Clock, Shield, CheckCircle2 } from 'lucide-react';

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
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  assignedTo: string;
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
  { id: 'INC-001', date: '2025-03-28', type: 'Client', relatedTo: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', category: 'Service Quality', priority: 'High', description: 'ROAS dropped below 1.5x for 3 consecutive weeks. Client threatening to leave.', status: 'Open', assignedTo: 'Priya Sharma' },
  { id: 'INC-002', date: '2025-03-26', type: 'Client', relatedTo: 'Meridian Healthcare', service: 'Accounts & Taxation', category: 'Compliance', priority: 'High', description: 'GST filing deadline missed for February. Potential penalty of ₹10,000.', status: 'In Progress', assignedTo: 'Rohan Desai' },
  { id: 'INC-003', date: '2025-03-25', type: 'Employee', relatedTo: 'Amit Verma', service: 'Internal', category: 'HR Issue', priority: 'Medium', description: 'Reported harassment complaint against team lead. Requires immediate HR investigation.', status: 'In Progress', assignedTo: 'HR Team' },
  { id: 'INC-004', date: '2025-03-24', type: 'Client', relatedTo: 'UrbanNest Realty', service: 'Performance Marketing', category: 'Communication', priority: 'Medium', description: 'Client not receiving weekly performance reports. Issue persists for 2 weeks.', status: 'Open', assignedTo: 'Akshay Mehta' },
  { id: 'INC-005', date: '2025-03-22', type: 'Client', relatedTo: 'NovaTech Solutions', service: 'Accounts & Taxation', category: 'Payment', priority: 'High', description: 'Invoice of ₹1.2L overdue by 45 days. Multiple follow-ups unanswered.', status: 'In Progress', assignedTo: 'Accounts Team' },
  { id: 'INC-006', date: '2025-03-20', type: 'Client', relatedTo: 'Bloom Botanics', service: 'Performance Marketing', category: 'Deliverables', priority: 'High', description: 'March campaign creatives not delivered. Launch delayed by 5 days causing revenue loss.', status: 'Resolved', assignedTo: 'Sneha Patel', resolution: 'Creatives delivered and campaign launched. Offered 1 week free extension.' },
  { id: 'INC-007', date: '2025-03-18', type: 'Employee', relatedTo: 'Kavya Iyer', service: 'Internal', category: 'HR Issue', priority: 'Low', description: 'Request for role change from Executive to Sr. Executive. Pending manager review.', status: 'Open', assignedTo: 'HR Team' },
  { id: 'INC-008', date: '2025-03-15', type: 'Client', relatedTo: 'FreshBite Foods', service: 'Performance Marketing', category: 'Technical', priority: 'High', description: 'Facebook ad account suspended due to policy violation. All campaigns halted.', status: 'In Progress', assignedTo: 'Priya Sharma' },
  { id: 'INC-009', date: '2025-03-12', type: 'Client', relatedTo: 'GreenLeaf Organics', service: 'Accounts & Taxation', category: 'Service Quality', priority: 'Medium', description: 'Bookkeeping errors found in Q3 statements. Client requesting re-audit.', status: 'Resolved', assignedTo: 'Rohan Desai', resolution: 'Statements corrected and verified. Apology letter sent to client.' },
  { id: 'INC-010', date: '2025-03-10', type: 'Client', relatedTo: 'AutoPrime Motors', service: 'Performance Marketing', category: 'Communication', priority: 'Low', description: 'Client POC changed but team was not informed for 2 weeks.', status: 'Closed', assignedTo: 'Akshay Mehta', resolution: 'CRM updated. Process implemented for POC change notifications.' },
  { id: 'INC-011', date: '2025-03-08', type: 'Employee', relatedTo: 'Ishaan Joshi', service: 'Internal', category: 'Compliance', priority: 'Medium', description: 'NDA breach suspected — shared client data screenshots on personal social media.', status: 'In Progress', assignedTo: 'Legal Team' },
  { id: 'INC-012', date: '2025-03-05', type: 'Client', relatedTo: 'SparkEdge Media', service: 'Performance Marketing', category: 'Payment', priority: 'Medium', description: 'Disputed invoice amount. Client claims agreed fee was ₹80K, not ₹95K.', status: 'Open', assignedTo: 'Accounts Team' },
  { id: 'INC-013', date: '2025-03-02', type: 'Client', relatedTo: 'TrueValue Finance', service: 'Accounts & Taxation', category: 'Deliverables', priority: 'High', description: 'Annual return filing incomplete. Missing documents from client side.', status: 'In Progress', assignedTo: 'Sneha Patel' },
  { id: 'INC-014', date: '2025-02-28', type: 'Client', relatedTo: 'PeakFit Wellness', service: 'Performance Marketing', category: 'Service Quality', priority: 'Medium', description: 'Lead quality issues — 60% of leads generated are unqualified.', status: 'Resolved', assignedTo: 'Priya Sharma', resolution: 'Targeting refined, negative keywords added. Quality improved to 78% qualified.' },
  { id: 'INC-015', date: '2025-02-25', type: 'Employee', relatedTo: 'Neha Kapoor', service: 'Internal', category: 'HR Issue', priority: 'Low', description: 'Frequent late arrivals reported by manager. 8 instances in February.', status: 'Closed', assignedTo: 'HR Team', resolution: 'Warning issued. Flexible timing approved for medical reasons.' },
  { id: 'INC-016', date: '2025-02-20', type: 'Client', relatedTo: 'PixelCraft Studios', service: 'Performance Marketing', category: 'Technical', priority: 'High', description: 'Google Ads conversion tracking broken for 2 weeks. Data accuracy compromised.', status: 'Resolved', assignedTo: 'Akshay Mehta', resolution: 'Tracking pixel reinstalled and verified. Historical data reconciled.' },
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
function IncidentFilterPanel({ filters, onChange, onClose, onReset, activeCount }: {
  filters: Filters; onChange: (f: Filters) => void; onClose: () => void; onReset: () => void; activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.04] text-black/40"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="p-3 space-y-4 max-h-[480px] overflow-y-auto">
        {/* Type */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Type</p>
          <div className="space-y-0.5">
            {(['All', 'Client', 'Employee'] as TypeFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Types' : opt} value={opt} selected={filters.type === opt} onSelect={v => onChange({ ...filters, type: v })} />
            ))}
          </div>
        </div>
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
            {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as StatusFilter[]).map(opt => (
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
const STATUS_OPTIONS: Incident['status'][] = ['Open', 'In Progress', 'Resolved', 'Closed'];

const STATUS_DOT_COLORS: Record<Incident['status'], string> = {
  Open: 'bg-rose-400',
  'In Progress': 'bg-blue-400',
  Resolved: 'bg-emerald-400',
  Closed: 'bg-black/30',
};

export function IncidentData() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const initialTypeFilter: TypeFilter = (typeParam === 'Client' || typeParam === 'Employee') ? typeParam : 'All';
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
  const [formData, setFormData] = useState({
    type: 'Client' as Incident['type'],
    relatedTo: '',
    service: 'Performance Marketing' as Incident['service'],
    category: 'Service Quality' as Incident['category'],
    priority: 'Medium' as Incident['priority'],
    description: '',
    assignedTo: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setFormData({ type: 'Client', relatedTo: '', service: 'Performance Marketing', category: 'Service Quality', priority: 'Medium', description: '', assignedTo: '' });
    setFormErrors({});
  };

  const handleAddIncident = () => {
    // Validate
    const errors: Record<string, boolean> = {};
    if (!formData.relatedTo.trim()) errors.relatedTo = true;
    if (!formData.description.trim()) errors.description = true;
    if (!formData.assignedTo.trim()) errors.assignedTo = true;
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
      assignedTo: formData.assignedTo.trim(),
    };

    setIncidents(prev => [newIncident, ...prev]);
    setShowAddModal(false);
    resetForm();
  };

  // Status dropdown
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setOpenStatusDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (incidentId: string, newStatus: Incident['status']) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
    setOpenStatusDropdown(null);
  };

  const filterCount = (filters.type !== 'All' ? 1 : 0) + (filters.service !== 'All' ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + (filters.priority !== 'All' ? 1 : 0) + (filters.status !== 'All' ? 1 : 0);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'relatedTo' ? 'asc' : 'desc'); }
  };

  const filteredIncidents = useMemo(() => {
    let result = incidents.filter(inc => {
      const q = searchQuery.toLowerCase();
      if (q && !(inc.relatedTo.toLowerCase().includes(q) || inc.id.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || inc.category.toLowerCase().includes(q) || inc.assignedTo.toLowerCase().includes(q))) return false;
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
  }, [searchQuery, filters, sortField, sortDir]);

  // ── KPIs (reactive) ──
  const totalIncidents = filteredIncidents.length;
  const openIncidents = filteredIncidents.filter(i => i.status === 'Open').length;
  const inProgressIncidents = filteredIncidents.filter(i => i.status === 'In Progress').length;
  const resolvedIncidents = filteredIncidents.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
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
      case 'Closed': return 'bg-black/[0.04] text-black/50 border-black/10';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getTypeColor = (type: string) => type === 'Client' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200';

  const getServiceLabel = (s: string) => s === 'Performance Marketing' ? 'SEM' : s === 'Accounts & Taxation' ? 'A&T' : 'Internal';

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide cursor-pointer hover:text-black/80 transition-colors select-none ${className}`} onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-black/25" />}
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-h2 font-bold text-black/90">Incidents</h2>
          <p className="text-caption font-normal text-black/50 mt-0.5">Track and resolve client &amp; employee incidents</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Result count */}
          {(filterCount > 0 || searchQuery) && (
            <span className="text-caption font-medium text-black/40">{filteredIncidents.length} of {incidents.length} results</span>
          )}

          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
            <input type="text" placeholder="Search incidents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all" />
          </div>

          {/* Filter */}
          <div className="relative">
            <button onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-all text-caption ${filterCount > 0 ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold' : 'border-black/10 bg-white text-black/70 hover:bg-black/5'}`}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {filterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>}
            </button>
            {showFilterPanel && (
              <IncidentFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilterPanel(false)} onReset={() => setFilters(DEFAULT_FILTERS)} activeCount={filterCount} />
            )}
          </div>

          {/* Add Incident */}
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-all text-caption">
            <Plus className="w-3.5 h-3.5" />
            <span>Raise Incident</span>
          </button>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/40">Filtered by:</span>
          {filters.type !== 'All' && (
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
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Incidents — breakdown by type */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Total Incidents</p>
              <p className="text-black/90 text-h1 font-bold">{totalIncidents}</p>
            </div>
            <div className="w-10 h-10 bg-black/[0.04] rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-black/40" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {clientCount > 0 && <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${(clientCount / Math.max(totalIncidents, 1)) * 100}%` }} />}
              {employeeCount > 0 && <div className="bg-[#06B6D4]" style={{ width: `${(employeeCount / Math.max(totalIncidents, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#7C3AED]" /><span className="text-black/50 text-caption font-normal">Client: {clientCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#06B6D4]" /><span className="text-black/50 text-caption font-normal">Employee: {employeeCount}</span></div>
            </div>
          </div>
        </div>

        {/* Needs Attention — open + in progress, the ones your team must act on */}
        {(() => {
          const needsAttention = openIncidents + inProgressIncidents;
          return (
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Needs Attention</p>
                  <p className={`text-h1 font-bold ${needsAttention > 0 ? 'text-[#E2445C]' : 'text-[#00C875]'}`}>{needsAttention}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${needsAttention > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
                  <AlertTriangle className={`w-5 h-5 ${needsAttention > 0 ? 'text-[#E2445C]/60' : 'text-[#00C875]/70'}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                  {openIncidents > 0 && <div className="bg-[#E2445C] rounded-l-full" style={{ width: `${(openIncidents / Math.max(needsAttention, 1)) * 100}%` }} />}
                  {inProgressIncidents > 0 && <div className="bg-[#204CC7]" style={{ width: `${(inProgressIncidents / Math.max(needsAttention, 1)) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50 text-caption font-normal">Open: {openIncidents}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#204CC7]" /><span className="text-black/50 text-caption font-normal">In Progress: {inProgressIncidents}</span></div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Priority Breakdown — full picture of how serious the incidents are */}
        {(() => {
          const highCount = filteredIncidents.filter(i => i.priority === 'High').length;
          const medCount = filteredIncidents.filter(i => i.priority === 'Medium').length;
          const lowCount = filteredIncidents.filter(i => i.priority === 'Low').length;
          return (
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Priority Breakdown</p>
                  <p className={`text-h1 font-bold ${highPriorityCount > 0 ? 'text-[#E2445C]' : 'text-black/90'}`}>{highPriorityCount > 0 ? `${highPriorityCount} High` : 'All Clear'}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highPriorityCount > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
                  <Shield className={`w-5 h-5 ${highPriorityCount > 0 ? 'text-[#E2445C]/60' : 'text-[#00C875]/70'}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                  {highCount > 0 && <div className="bg-[#E2445C] rounded-l-full" style={{ width: `${(highCount / Math.max(totalIncidents, 1)) * 100}%` }} />}
                  {medCount > 0 && <div className="bg-[#FDAB3D]" style={{ width: `${(medCount / Math.max(totalIncidents, 1)) * 100}%` }} />}
                  {lowCount > 0 && <div className="bg-[#00C875]" style={{ width: `${(lowCount / Math.max(totalIncidents, 1)) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50 text-caption font-normal">High: {highCount}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FDAB3D]" /><span className="text-black/50 text-caption font-normal">Medium: {medCount}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Low: {lowCount}</span></div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Resolution Rate — stacked bar showing all statuses */}
        {(() => {
          const resolvedCount = filteredIncidents.filter(i => i.status === 'Resolved').length;
          const closedCount = filteredIncidents.filter(i => i.status === 'Closed').length;
          const total = Math.max(totalIncidents, 1);
          const resolutionRate = totalIncidents > 0 ? Math.round(((resolvedCount + closedCount) / totalIncidents) * 100) : 0;
          const rateColor = resolutionRate >= 60 ? 'text-[#00C875]' : resolutionRate >= 30 ? 'text-[#FDAB3D]' : 'text-[#E2445C]';
          return (
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Resolution Rate</p>
                  <p className={`${rateColor} text-h1 font-bold`}>{resolutionRate}%</p>
                </div>
                <div className="w-10 h-10 bg-[#00C875]/[0.08] rounded-xl flex items-center justify-center">
                  <Check className="w-5 h-5 text-[#00C875]/70" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                  {closedCount > 0 && <div className="bg-black/20" style={{ width: `${(closedCount / total) * 100}%` }} />}
                  {resolvedCount > 0 && <div className="bg-[#00C875]" style={{ width: `${(resolvedCount / total) * 100}%` }} />}
                  {inProgressIncidents > 0 && <div className="bg-[#204CC7]" style={{ width: `${(inProgressIncidents / total) * 100}%` }} />}
                  {openIncidents > 0 && <div className="bg-[#E2445C]/40" style={{ width: `${(openIncidents / total) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-black/20" /><span className="text-black/50 text-caption font-normal">Closed: {closedCount}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Resolved: {resolvedCount}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#204CC7]" /><span className="text-black/50 text-caption font-normal">In Progress: {inProgressIncidents}</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]/40" /><span className="text-black/50 text-caption font-normal">Open: {openIncidents}</span></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Incident Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">ID</th>
                <SortHeader field="date">Date</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Type</th>
                <SortHeader field="relatedTo">Related To</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Category</th>
                <SortHeader field="priority">Priority</SortHeader>
                <SortHeader field="status">Status</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Assigned To</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
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
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getTypeColor(incident.type)}`}>
                        {incident.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body font-medium text-black/90">{incident.relatedTo}</p>
                        <p className="text-caption font-normal text-black/40 mt-0.5">{getServiceLabel(incident.service)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-caption font-normal text-black/65">{incident.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getPriorityColor(incident.priority)}`}>
                        {incident.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative" ref={openStatusDropdown === incident.id ? statusDropdownRef : undefined}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenStatusDropdown(openStatusDropdown === incident.id ? null : incident.id); }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-caption font-semibold cursor-pointer ${getStatusColor(incident.status)}`}
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
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-black/70 to-black/50 flex items-center justify-center border-2 border-white">
                          <span className="text-white text-[10px] font-semibold">{incident.assignedTo.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <span className="text-caption font-normal text-black/65">{incident.assignedTo.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedIncident(incident); setShowDrawer(true); }} className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-all">
                        <Eye className="w-3.5 h-3.5" />
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
                <div>
                  <h2 className="text-h3 font-bold text-black/90">Raise New Incident</h2>
                  <p className="text-caption font-normal text-black/45 mt-0.5">Fill in the details to create a new incident report</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-black/[0.04] text-black/40 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Row 1: Incident Type */}
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
                      <div className="px-3.5 py-2.5 rounded-xl border border-black/10 bg-black/[0.02] text-caption text-black/40">Internal (auto-assigned)</div>
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

                {/* Row 5: Assigned To */}
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Assign To <span className="text-[#E2445C]">*</span></label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={e => { setFormData(f => ({ ...f, assignedTo: e.target.value })); setFormErrors(fe => ({ ...fe, assignedTo: false })); }}
                    placeholder="e.g., Priya Sharma, HR Team, Accounts Team"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all ${
                      formErrors.assignedTo ? 'border-[#E2445C] bg-rose-50/30' : 'border-black/10'
                    }`}
                  />
                  {formErrors.assignedTo && <p className="text-caption font-medium text-[#E2445C] mt-1">Assignee is required</p>}
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
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 rounded-lg border border-black/10 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                  Cancel
                </button>
                <button onClick={handleAddIncident} className="px-5 py-2.5 rounded-lg bg-[#204CC7] text-white hover:bg-[#1a3fa8] transition-all text-caption font-semibold flex items-center gap-2">
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
        const isClosed = selectedIncident.status === 'Closed';

        // Next logical status action
        const nextStatus: Incident['status'] | null = isOpen ? 'In Progress' : isInProgress ? 'Resolved' : isResolved ? 'Closed' : null;
        const nextLabel = isOpen ? 'Start Investigation' : isInProgress ? 'Mark as Resolved' : isResolved ? 'Close Incident' : null;
        const nextColors = isOpen ? 'bg-[#204CC7] hover:bg-[#1a3d9f] text-white' : isInProgress ? 'bg-[#00C875] hover:bg-[#00a85f] text-white' : isResolved ? 'bg-black/80 hover:bg-black/70 text-white' : '';

        // Severity header color
        const priorityHeaderBg = selectedIncident.priority === 'High' ? 'bg-[#E2445C]' : selectedIncident.priority === 'Medium' ? 'bg-[#FDAB3D]' : 'bg-[#204CC7]';

        return (
          <div className="fixed inset-0 z-[60]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Header — color-coded by priority */}
                <div className={`${priorityHeaderBg} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedIncident.id}</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedIncident.priority}</span>
                      </div>
                      <h2 className="text-white text-h2 font-bold truncate">{selectedIncident.relatedTo}</h2>
                      <p className="text-white/70 text-caption font-normal mt-1">{selectedIncident.category} · {getServiceLabel(selectedIncident.service)} · Reported {formatDate(selectedIncident.date)}</p>
                    </div>
                    <button onClick={() => setShowDrawer(false)} className="ml-3 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0">
                      <X className="w-4 h-4 text-white" />
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
                      <p className="text-black/45 text-caption font-medium mb-1.5">Status</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getStatusColor(selectedIncident.status)}`}>{selectedIncident.status}</span>
                    </div>
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/45 text-caption font-medium mb-1.5">Priority</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getPriorityColor(selectedIncident.priority)}`}>{selectedIncident.priority}</span>
                    </div>
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/45 text-caption font-medium mb-1.5">Age</p>
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
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Assigned To</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{selectedIncident.assignedTo}</p>
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
                      {isResolved && <Check className="w-4 h-4" />}
                      {nextLabel}
                    </button>
                  )}

                  {/* Closed state message */}
                  {isClosed && (
                    <div className="w-full px-4 py-3 rounded-xl bg-black/[0.03] text-center">
                      <p className="text-black/40 text-caption font-medium">This incident has been closed</p>
                    </div>
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

                    {/* Reopen — only for resolved/closed incidents */}
                    {(isResolved || isClosed) && (
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

                    {/* Close button — always visible for non-closed */}
                    {!isClosed && (
                      <button onClick={() => setShowDrawer(false)} className="flex-1 px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium">
                        Dismiss
                      </button>
                    )}

                    {isClosed && (
                      <button onClick={() => setShowDrawer(false)} className="flex-1 px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium">
                        Close
                      </button>
                    )}
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
