'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Building2, TrendingUp, AlertTriangle, X, FileText } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';

interface CLA {
  id: string;
  creationDate: string;
  clientName: string;
  briefOrReason: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  status: 'Sureshot' | 'Can be Saved';
  billingPerMonth: number;
  hod: string;
  employeeResponsible: string;
  category: 'Brego\'s Fault' | 'Client\'s Fault';
}

// ── Filter Types ──
type ServiceFilterOption = 'All' | 'Performance Marketing' | 'Accounts & Taxation';
type CLAStatusFilterOption = 'All' | 'Sureshot' | 'Can be Saved';

interface CLAFilters {
  service: ServiceFilterOption;
  status: CLAStatusFilterOption;
}

const DEFAULT_CLA_FILTERS: CLAFilters = { service: 'All', status: 'All' };

// ── Reusable FilterOption ──
function FilterOption<T extends string>({ label, value, selected, onSelect }: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full text-left px-3 py-2 rounded-lg text-caption transition-all ${
        selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03]'
      }`}
    >
      {label}
    </button>
  );
}

// ── CLA Filter Panel ──
function CLAFilterPanel({
  filters, onChange, onClose, onReset, activeCount,
}: {
  filters: CLAFilters;
  onChange: (f: CLAFilters) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[320px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-black/50" />
          <span className="text-body font-semibold text-black/80">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[20px] text-center">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset</button>
          )}
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

      <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">
        {/* Service */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            {(['All', 'Performance Marketing', 'Accounts & Taxation'] as ServiceFilterOption[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : opt === 'Performance Marketing' ? 'Performance Marketing' : 'Accounts & Taxation'} value={opt} selected={filters.service === opt} onSelect={(v) => onChange({ ...filters, service: v })} />
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Status</p>
          <div className="space-y-0.5">
            {(['All', 'Sureshot', 'Can be Saved'] as CLAStatusFilterOption[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt} value={opt} selected={filters.status === opt} onSelect={(v) => onChange({ ...filters, status: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock client names for Add CLA form ──
const clientNames = [
  'Tech Solutions Pvt Ltd',
  'Green Energy Industries',
  'MediCorp International',
  'Fashion Forward Ltd',
  'HealthCare Plus',
  'EduTech Innovators',
  'Nova Retail Group',
];

export function CLAClients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCLAModal, setShowAddCLAModal] = useState(false);

  // Add-CLA modal a11y: Escape closes, focus traps inside, focus returns
  // to the launcher (Add CLA button) when the modal dismisses.
  const addCLADialogRef = useModalA11y(showAddCLAModal, () => setShowAddCLAModal(false));
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [claFilters, setClaFilters] = useState<CLAFilters>(DEFAULT_CLA_FILTERS);

  const claFilterCount = (claFilters.service !== 'All' ? 1 : 0) + (claFilters.status !== 'All' ? 1 : 0);

  // Form state for Add CLA modal
  const [formData, setFormData] = useState({
    creationDate: new Date().toISOString().slice(0, 16),
    clientName: '',
    briefOrReason: '',
    service: 'Performance Marketing' as 'Performance Marketing' | 'Accounts & Taxation',
    status: 'Can be Saved' as 'Sureshot' | 'Can be Saved',
    billingPerMonth: '',
    hod: '' as string,
    employeeResponsible: '',
    category: "Brego's Fault" as "Brego's Fault" | "Client's Fault",
  });

  // CLA Data
  const [clas] = useState<CLA[]>([
    {
      id: '1',
      creationDate: '2024-12-15',
      clientName: 'Tech Solutions Pvt Ltd',
      briefOrReason: 'Contract expiring in 30 days, no renewal discussions yet',
      service: 'Performance Marketing',
      status: 'Sureshot',
      billingPerMonth: 45000,
      hod: 'Chinmay P.',
      employeeResponsible: 'Priya Sharma',
      category: "Brego's Fault"
    },
    {
      id: '2',
      creationDate: '2024-12-20',
      clientName: 'Green Energy Industries',
      briefOrReason: 'Mentioned budget cuts for next quarter during last call',
      service: 'Accounts & Taxation',
      status: 'Can be Saved',
      billingPerMonth: 28000,
      hod: 'Zubear S.',
      employeeResponsible: 'Rohan Desai',
      category: "Client's Fault"
    },
    {
      id: '3',
      creationDate: '2024-12-22',
      clientName: 'Fashion Forward Ltd',
      briefOrReason: 'Dissatisfied with campaign results, considering competitor',
      service: 'Performance Marketing',
      status: 'Can be Saved',
      billingPerMonth: 65000,
      hod: 'Chinmay P.',
      employeeResponsible: 'Kavya Iyer',
      category: "Brego's Fault"
    },
    {
      id: '4',
      creationDate: '2024-12-18',
      clientName: 'HealthCare Plus',
      briefOrReason: 'Delayed payments for 45+ days, communication issues',
      service: 'Accounts & Taxation',
      status: 'Sureshot',
      billingPerMonth: 52000,
      hod: 'Zubear S.',
      employeeResponsible: 'Arjun Mehta',
      category: "Client's Fault"
    },
    {
      id: '5',
      creationDate: '2024-12-25',
      clientName: 'EduTech Innovators',
      briefOrReason: 'Internal restructuring, new management questioning ROI',
      service: 'Performance Marketing',
      status: 'Sureshot',
      billingPerMonth: 38000,
      hod: 'Chinmay P.',
      employeeResponsible: 'Ishaan Joshi',
      category: "Client's Fault"
    },
    {
      id: '6',
      creationDate: '2024-12-10',
      clientName: 'Tech Solutions Pvt Ltd',
      briefOrReason: 'Requested 40% budget reduction, exploring cheaper alternatives',
      service: 'Performance Marketing',
      status: 'Can be Saved',
      billingPerMonth: 0,
      hod: 'Chinmay P.',
      employeeResponsible: 'Priya Sharma',
      category: "Brego's Fault"
    },
  ]);

  const filteredCLAs = useMemo(() => {
    return clas.filter((cla) => {
      const q = searchQuery.toLowerCase();
      if (q && !(
        cla.clientName.toLowerCase().includes(q) ||
        cla.briefOrReason.toLowerCase().includes(q) ||
        cla.employeeResponsible.toLowerCase().includes(q)
      )) return false;

      if (claFilters.service !== 'All' && cla.service !== claFilters.service) return false;
      if (claFilters.status !== 'All' && cla.status !== claFilters.status) return false;

      return true;
    });
  }, [clas, searchQuery, claFilters]);

  // ── Helpers ──
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  const getCLAStatusColor = (status: string) => {
    switch (status) {
      case 'Sureshot':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Can be Saved':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-black/5 text-black/65 border-black/10';
    }
  };

  const getServiceTagColor = (serviceName: string) => {
    // PM and A&T share the same purple chip across the build —
    // A&T's brand-cyan tag was retired for consistency with SEM.
    // Same treatment applied in CustomersOverview / EmployeesOverview /
    // Dashboard / AllClients.
    switch (serviceName) {
      case 'Performance Marketing':
      case 'Accounts & Taxation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-black/5 text-black/65 border-black/10';
    }
  };

  // ── KPI calculations ──
  const totalClients = filteredCLAs.length;
  const totalAtRisk = filteredCLAs.length;
  const canBeSavedCount = filteredCLAs.filter(c => c.status === 'Can be Saved').length;
  const sureshotLossCount = filteredCLAs.filter(c => c.status === 'Sureshot').length;

  const totalClientsByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.service === 'Accounts & Taxation').length,
  };
  const totalClientsServiceTotal = totalClientsByService['Performance Marketing'] + totalClientsByService['Accounts & Taxation'];

  const atRiskByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.service === 'Accounts & Taxation').length,
  };

  const canBeSavedByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.status === 'Can be Saved' && c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.status === 'Can be Saved' && c.service === 'Accounts & Taxation').length,
  };

  const sureshotLossByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.status === 'Sureshot' && c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.status === 'Sureshot' && c.service === 'Accounts & Taxation').length,
  };

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on CustomersOverview, EmployeesOverview, and the
        sibling roster pages (All Customers etc.). Title + subtitle anchor
        the left; the page-specific controls (result count, Search,
        Filter, Add CLA) hang on the right so every Customers sub-page
        reads with the same visual rhythm.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">CLAs</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Client Loss Alerts — track at-risk clients and recovery efforts</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only shown when filters or search are narrowing the table */}
            {(claFilterCount > 0 || searchQuery) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/60">
                {filteredCLAs.length} of {clas.length} results
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="cla-search" className="sr-only">Search CLAs</label>
              <input
                id="cla-search"
                type="text"
                placeholder="Search CLAs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                aria-expanded={showFilterPanel}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  claFilterCount > 0
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filter</span>
                {claFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{claFilterCount}</span>
                )}
              </button>

              {showFilterPanel && (
                <CLAFilterPanel
                  filters={claFilters}
                  onChange={setClaFilters}
                  onClose={() => setShowFilterPanel(false)}
                  onReset={() => setClaFilters(DEFAULT_CLA_FILTERS)}
                  activeCount={claFilterCount}
                />
              )}
            </div>

            {/* Add CLA */}
            <button
              type="button"
              onClick={() => setShowAddCLAModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#204CC7] text-white rounded-md hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all text-caption font-medium"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add CLA</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {claFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/55">Filtered by:</span>
          {claFilters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {claFilters.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
              <button onClick={() => setClaFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {claFilters.status !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {claFilters.status}
              <button onClick={() => setClaFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => setClaFilters(DEFAULT_CLA_FILTERS)} className="text-caption font-medium text-black/55 hover:text-[#204CC7] transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Total Clients */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Total Clients</p>
              <p className="text-black/90 text-h1 font-bold">{totalClients}</p>
            </div>
            <div className="w-10 h-10 bg-black/[0.04] rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-black/40" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${totalClientsServiceTotal > 0 ? (totalClientsByService['Performance Marketing'] / totalClientsServiceTotal) * 100 : 0}%` }} />
              <div className="bg-[#06B6D4]" style={{ width: `${totalClientsServiceTotal > 0 ? (totalClientsByService['Accounts & Taxation'] / totalClientsServiceTotal) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-black/50 text-caption font-normal">PM: {totalClientsByService['Performance Marketing']}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                <span className="text-black/50 text-caption font-normal">A&T: {totalClientsByService['Accounts & Taxation']}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total at Risk */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Total at Risk</p>
              <p className="text-[#E2445C] text-h1 font-bold">{totalAtRisk}</p>
            </div>
            <div className="w-10 h-10 bg-[#E2445C]/[0.06] rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#E2445C]/60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${totalAtRisk > 0 ? (atRiskByService['Performance Marketing'] / totalAtRisk) * 100 : 0}%` }} />
              <div className="bg-[#06B6D4]" style={{ width: `${totalAtRisk > 0 ? (atRiskByService['Accounts & Taxation'] / totalAtRisk) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-black/50 text-caption font-normal">PM: {atRiskByService['Performance Marketing']}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                <span className="text-black/50 text-caption font-normal">A&T: {atRiskByService['Accounts & Taxation']}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Can Be Saved */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Can Be Saved</p>
              <p className="text-[#00C875] text-h1 font-bold">{canBeSavedCount}</p>
            </div>
            <div className="w-10 h-10 bg-[#00C875]/[0.08] rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#00C875]/70" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${canBeSavedCount > 0 ? (canBeSavedByService['Performance Marketing'] / canBeSavedCount) * 100 : 0}%` }} />
              <div className="bg-[#06B6D4]" style={{ width: `${canBeSavedCount > 0 ? (canBeSavedByService['Accounts & Taxation'] / canBeSavedCount) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-black/50 text-caption font-normal">PM: {canBeSavedByService['Performance Marketing']}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                <span className="text-black/50 text-caption font-normal">A&T: {canBeSavedByService['Accounts & Taxation']}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sureshot Loss */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Sureshot Loss</p>
              <p className="text-[#E2445C] text-h1 font-bold">{sureshotLossCount}</p>
            </div>
            <div className="w-10 h-10 bg-[#E2445C]/[0.06] rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#E2445C]/60" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${sureshotLossCount > 0 ? (sureshotLossByService['Performance Marketing'] / sureshotLossCount) * 100 : 0}%` }} />
              <div className="bg-[#06B6D4]" style={{ width: `${sureshotLossCount > 0 ? (sureshotLossByService['Accounts & Taxation'] / sureshotLossCount) * 100 : 0}%` }} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="text-black/50 text-caption font-normal">PM: {sureshotLossByService['Performance Marketing']}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                <span className="text-black/50 text-caption font-normal">A&T: {sureshotLossByService['Accounts & Taxation']}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLA Table — column headers and chip cells stay on a single
          line. The wrapping `overflow-x-auto` lets the table scroll
          horizontally if the viewport is narrower than the sum of
          column widths, so labels never wrap mid-word. */}
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1200 }}>
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Creation Date</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Client</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Brief or Reason</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Service</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Billing / Mo</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">HOD</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Employee Responsible</th>
                <th className="px-4 py-3 text-left text-black/65 text-caption font-medium whitespace-nowrap">Category</th>
              </tr>
            </thead>
            <tbody>
              {filteredCLAs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-black/20" />
                      <p className="text-body font-medium text-black/50">No CLAs match your filters</p>
                      <button onClick={() => { setClaFilters(DEFAULT_CLA_FILTERS); setSearchQuery(''); }} className="text-caption font-medium text-[#204CC7] hover:underline">Clear all filters</button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredCLAs.map((cla, index) => (
                <tr
                  key={cla.id}
                  className={`border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-black/[0.01]'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-black/50 text-caption">{formatDate(cla.creationDate)}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-black text-body font-medium">{cla.clientName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-black/70 text-caption max-w-xs truncate" title={cla.briefOrReason}>
                      {cla.briefOrReason}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border whitespace-nowrap ${getServiceTagColor(cla.service)}`}>
                      {cla.service === 'Performance Marketing' ? 'SEM' : cla.service === 'Accounts & Taxation' ? 'A&T' : 'CM'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-md text-caption font-medium border whitespace-nowrap ${getCLAStatusColor(cla.status)}`}>
                      {cla.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-body font-semibold text-[#E2445C]">
                      {formatCurrency(cla.billingPerMonth)}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-black/70 text-body">{cla.hod}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-black/70 text-body">{cla.employeeResponsible}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border whitespace-nowrap ${
                      cla.category === "Brego's Fault" ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {cla.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCLAs.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/60 text-body">No CLAs found</p>
          </div>
        )}
      </div>

      {/* Add CLA Modal */}
      {showAddCLAModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setShowAddCLAModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
          <div
            ref={addCLADialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-cla-title"
            tabIndex={-1}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] flex flex-col max-h-[calc(100vh-48px)] focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Sticky Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-black/[0.06] flex-shrink-0">
              <div>
                <h3 id="add-cla-title" className="text-h2 font-bold text-black/90">Add New CLA</h3>
                <p className="text-caption text-black/55 mt-1">Client Loss Alert — Track at-risk clients</p>
              </div>
              <button
                className="w-9 h-9 rounded-md hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 flex items-center justify-center transition-all"
                onClick={() => setShowAddCLAModal(false)}
                aria-label="Close add CLA dialog"
              >
                <X className="w-4 h-4 text-black/55" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="space-y-5">

                {/* Row 1: Date + Client */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Date & Time <span className="text-[#E2445C]">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.creationDate}
                      onChange={(e) => setFormData({ ...formData, creationDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Client <span className="text-[#E2445C]">*</span>
                    </label>
                    <select
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="">Select a client</option>
                      {clientNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Brief or Reason */}
                <div>
                  <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                    Brief or Reason <span className="text-[#E2445C]">*</span>
                  </label>
                  <textarea
                    placeholder="Describe the situation or reason for the CLA..."
                    value={formData.briefOrReason}
                    onChange={(e) => setFormData({ ...formData, briefOrReason: e.target.value })}
                    rows={2}
                    className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all resize-none"
                  />
                </div>

                {/* Row 3: Service + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Service <span className="text-[#E2445C]">*</span>
                    </label>
                    <select
                      value={formData.service}
                      onChange={(e) => setFormData({ ...formData, service: e.target.value as 'Performance Marketing' | 'Accounts & Taxation' })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="Performance Marketing">Performance Marketing</option>
                      <option value="Accounts & Taxation">Accounts & Taxation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Status <span className="text-[#E2445C]">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Sureshot' | 'Can be Saved' })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="Can be Saved">Can be Saved</option>
                      <option value="Sureshot">Sureshot Loss</option>
                    </select>
                  </div>
                </div>

                {/* Row 4: Billing / Mo + HOD */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Billing / Mo (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.billingPerMonth}
                      onChange={(e) => setFormData({ ...formData, billingPerMonth: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      HOD <span className="text-[#E2445C]">*</span>
                    </label>
                    <select
                      value={formData.hod}
                      onChange={(e) => setFormData({ ...formData, hod: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="">Select HOD</option>
                      <option value="Chinmay P.">Chinmay P.</option>
                      <option value="Zubear S.">Zubear S.</option>
                      <option value="Tejas A.">Tejas A.</option>
                      <option value="Hooshang B.">Hooshang B.</option>
                    </select>
                  </div>
                </div>

                {/* Row 5: Category + Employee */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Category <span className="text-[#E2445C]">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as "Brego's Fault" | "Client's Fault" })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="Brego's Fault">Brego&apos;s Fault</option>
                      <option value="Client's Fault">Client&apos;s Fault</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-caption font-semibold text-black/55 uppercase tracking-wide mb-2">
                      Employee Responsible <span className="text-[#E2445C]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter employee name"
                      value={formData.employeeResponsible}
                      onChange={(e) => setFormData({ ...formData, employeeResponsible: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-black/[0.06] flex-shrink-0 bg-white rounded-b-2xl">
              <button
                type="button"
                className="px-5 py-2.5 text-body font-medium text-black/60 hover:text-black/80 hover:bg-black/[0.04] rounded-lg transition-all"
                onClick={() => setShowAddCLAModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2.5 text-body font-semibold bg-[#204CC7] text-white rounded-md hover:bg-[#1a3d9f] transition-all shadow-sm"
                onClick={() => {
                  console.log('Adding CLA:', formData);
                  setShowAddCLAModal(false);
                  setFormData({
                    creationDate: new Date().toISOString().slice(0, 16),
                    clientName: '',
                    briefOrReason: '',
                    service: 'Performance Marketing',
                    status: 'Can be Saved',
                    billingPerMonth: '',
                    hod: '',
                    employeeResponsible: '',
                    category: "Brego's Fault",
                  });
                }}
              >
                Add CLA
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
