'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, Filter, Building2, TrendingUp, AlertTriangle, Users, ChevronRight, FileText, DollarSign, Clock, Layers, X, MoreVertical, User, Mail, MapPin, Phone, Calendar, ExternalLink, Check, ChevronLeft, Target, UserPlus, ArrowRight, CircleCheck, Megaphone, IndianRupee } from 'lucide-react';
import { ClientDetailsDrawer } from './ClientDetailsDrawer';

interface ServiceTag {
  id: string;
  name: 'Performance Marketing' | 'Accounts & Taxation';
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface TeamMember {
  role: string;
  name: string | null;
  required: boolean;
}

interface Client {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  serviceTags: ServiceTag[];
  assignedEmployees: Employee[];
  joinedDate: string;
  incidentCount: number;
  onboardingStatus: 'OBC' | 'Pending' | 'Done';
  value: number;
  sector: 'Technology' | 'Healthcare' | 'Education' | 'Energy' | 'E-commerce';
  // Extended fields for drawer
  contactNumber: string;
  address: string;
  clientRelationshipStatus: string;
  relationshipStatusChinmay: string;
  onboardingProgress: number;
  onboardingStage: string;
  teamMembers: TeamMember[];
  kickoffDate: string;
  slaStatus: 'Active' | 'Inactive';
  paymentMethod: string;
  mainServiceHead: string;
  serviceType: string;
  businessValue: number;
  businessModel: string;
  businessSize: string;
  businessCategory: string;
  channel: string;
  logo?: string;
}

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
type SectorFilterOption = 'All' | 'Technology' | 'Healthcare' | 'Education' | 'Energy' | 'E-commerce';
type OnboardingFilterOption = 'All' | 'OBC' | 'Pending' | 'Done';
type IncidentFilterOption = 'All' | 'Has Incidents' | 'No Incidents';
type CLAStatusFilterOption = 'All' | 'Sureshot' | 'Can be Saved';

interface ClientFilters {
  service: ServiceFilterOption;
  sector: SectorFilterOption;
  onboarding: OnboardingFilterOption;
  incidents: IncidentFilterOption;
}

interface CLAFilters {
  service: ServiceFilterOption;
  status: CLAStatusFilterOption;
}

const DEFAULT_CLIENT_FILTERS: ClientFilters = { service: 'All', sector: 'All', onboarding: 'All', incidents: 'All' };
const DEFAULT_CLA_FILTERS: CLAFilters = { service: 'All', status: 'All' };

/* ═══════════════════════════════════════════════════════════
   ONBOARDING MODAL
   ═══════════════════════════════════════════════════════════ */

const pmEmployeePool = [
  { id: 'e1', name: 'Rajesh Kumar', role: 'HOD/Sr. Manager' },
  { id: 'e2', name: 'Meera Nair', role: 'HOD/Sr. Manager' },
  { id: 'e3', name: 'Priya Sharma', role: 'Manager' },
  { id: 'e4', name: 'Kavya Iyer', role: 'Manager' },
  { id: 'e5', name: 'Arjun Mehta', role: 'Manager' },
  { id: 'e6', name: 'Rohan Desai', role: 'Sr. Executive' },
  { id: 'e7', name: 'Ishaan Joshi', role: 'Sr. Executive' },
  { id: 'e8', name: 'Aditya Verma', role: 'Sr. Executive' },
  { id: 'e9', name: 'Sneha Patel', role: 'Jr. Executive' },
  { id: 'e10', name: 'Vikram Singh', role: 'Jr. Executive' },
  { id: 'e11', name: 'Ananya Reddy', role: 'Graphic Designer' },
  { id: 'e12', name: 'Karan Malhotra', role: 'Graphic Designer' },
  { id: 'e13', name: 'Neha Kapoor', role: 'Video Editor' },
  { id: 'e14', name: 'Siddharth Shah', role: 'Video Editor' },
  { id: 'e15', name: 'Amit Verma', role: 'Video Shooter' },
  { id: 'e16', name: 'Akash Patel', role: 'Motion Graphics' },
];

const atEmployeePool = [
  { id: 'a1', name: 'Zubear Shaikh', role: 'HOD' },
  { id: 'a2', name: 'Rohan Desai', role: 'Sr. Manager' },
  { id: 'a3', name: 'Sneha Patel', role: 'Executive' },
  { id: 'a4', name: 'Vikram Singh', role: 'Jr. Executive' },
  { id: 'a5', name: 'Rahul Gupta', role: 'Jr. Executive' },
  { id: 'a6', name: 'Deepak Jain', role: 'Tax Analyst' },
  { id: 'a7', name: 'Nisha Agarwal', role: 'Compliance Officer' },
];

const pmRoleSlots = [
  { role: 'HOD/Sr. Manager', required: true },
  { role: 'Manager', required: true },
  { role: 'Sr. Executive', required: true },
  { role: 'Jr. Executive', required: true },
  { role: 'Graphic Designer', required: false },
  { role: 'Video Editor', required: false },
  { role: 'Video Shooter', required: false },
  { role: 'Motion Graphics', required: false },
];

const atRoleSlots = [
  { role: 'HOD', required: true },
  { role: 'Sr. Manager', required: true },
  { role: 'Executive', required: true },
  { role: 'Jr. Executive', required: false },
];

interface OnboardingMetrics {
  adSpend: string;
  roas: string;
  revenue: string;
  orders: string;
  aov: string;
  leads: string;
  cpl: string;
  ctr: string;
}

function OnboardingModal({ client, onClose, onComplete }: {
  client: Client;
  onClose: () => void;
  onComplete: (assignments: Record<string, string>, metrics?: OnboardingMetrics) => void;
}) {
  const isPM = client.serviceTags.some(t => t.name === 'Performance Marketing');
  const isAT = client.serviceTags.some(t => t.name === 'Accounts & Taxation');
  const hasBothServices = isPM && isAT;

  // Derive business type from client sector (not a toggle — it's a fixed trait)
  const businessType: 'ecommerce' | 'leadgen' = client.sector === 'E-commerce' ? 'ecommerce' : 'leadgen';

  // Steps: assign-team → (set-targets if PM) → review
  const totalSteps = isPM ? 3 : 2;
  const [step, setStep] = useState(1);

  // Team assignment state
  const roleSlots = isPM ? pmRoleSlots : atRoleSlots;
  const employeePool = isPM ? pmEmployeePool : atEmployeePool;
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // A&T team (only if hasBothServices)
  const [atAssignments, setAtAssignments] = useState<Record<string, string>>({});
  const [openAtDropdown, setOpenAtDropdown] = useState<string | null>(null);

  // Target metrics state (PM only)
  const [metrics, setMetrics] = useState<OnboardingMetrics>({
    adSpend: '', roas: '', revenue: '', orders: '', aov: '', leads: '', cpl: '', ctr: '',
  });

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const requiredSlotsFilled = roleSlots.filter(s => s.required).every(s => assignments[s.role]);
  const atRequiredFilled = !hasBothServices || atRoleSlots.filter(s => s.required).every(s => atAssignments[s.role]);

  const canProceed = step === 1
    ? (requiredSlotsFilled && atRequiredFilled)
    : step === 2 && isPM
      ? (businessType === 'ecommerce'
        ? metrics.adSpend && metrics.roas && metrics.revenue && metrics.orders && metrics.aov
        : metrics.adSpend && metrics.leads && metrics.cpl && metrics.ctr)
      : true;

  const stepLabels = isPM
    ? ['Assign Team', 'Set Targets', 'Review & Launch']
    : ['Assign Team', 'Review & Launch'];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  /* ── Reusable role-slot row ── */
  const renderSlotRow = (
    slot: { role: string; required: boolean },
    pool: typeof pmEmployeePool,
    assignMap: Record<string, string>,
    setAssignMap: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    dropdownKey: string | null,
    setDropdownKey: React.Dispatch<React.SetStateAction<string | null>>,
    accentColor: string,
  ) => {
    const assigned = assignMap[slot.role];
    const assignedEmp = pool.find(e => e.id === assigned);
    const isOpen = dropdownKey === slot.role;
    const available = pool.filter(e => e.role === slot.role && !Object.values(assignMap).includes(e.id));
    return (
      <div key={slot.role} className="relative">
        <button
          onClick={() => setDropdownKey(isOpen ? null : slot.role)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={`${slot.role}${assignedEmp ? `, assigned to ${assignedEmp.name}` : ', unassigned'}`}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left ${
            assignedEmp
              ? 'border-[#00C875]/30 bg-[#00C875]/[0.04]'
              : isOpen
                ? `border-[${accentColor}]/30 ring-2 ring-[${accentColor}]/10 bg-white`
                : 'border-black/[0.08] hover:border-black/15 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            {assignedEmp ? (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold`} style={{ backgroundColor: accentColor }}>
                {getInitials(assignedEmp.name)}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-black/[0.04] flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-black/25" aria-hidden="true" />
              </div>
            )}
            <div>
              <p className={`text-body font-medium ${assignedEmp ? 'text-black/80' : 'text-black/35'}`}>
                {assignedEmp ? assignedEmp.name : 'Select employee'}
              </p>
              <p className="text-caption text-black/40">
                {slot.role}
                <span className={`ml-1.5 ${slot.required ? 'text-[#E2445C]/60' : 'text-black/25'}`}>
                  {slot.required ? '· Required' : '· Optional'}
                </span>
              </p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-black/25 transition-transform ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-black/[0.08] shadow-lg py-1 max-h-[180px] overflow-y-auto" role="listbox" aria-label={`Employees for ${slot.role}`}>
            {available.length === 0 ? (
              <p className="px-4 py-3 text-caption text-black/35">No available employees for this role</p>
            ) : available.map(emp => (
              <button
                key={emp.id}
                role="option"
                aria-selected={false}
                onClick={() => {
                  setAssignMap(prev => ({ ...prev, [slot.role]: emp.id }));
                  setDropdownKey(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-black/[0.06] flex items-center justify-center text-[10px] font-bold text-black/50">
                  {getInitials(emp.name)}
                </div>
                <span className="text-body text-black/70">{emp.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4">
          <div>
            <p className="text-caption font-semibold text-[#204CC7] uppercase tracking-wider mb-1">Client Onboarding</p>
            <h2 id="onboarding-modal-title" className="text-h2 text-black/90 leading-tight">{client.companyName}</h2>
            <div className="flex items-center gap-2 mt-2">
              {client.serviceTags.map(tag => (
                <span key={tag.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium ${
                  tag.name === 'Performance Marketing'
                    ? 'bg-violet-50 text-violet-700'
                    : 'bg-cyan-50 text-cyan-700'
                }`}>
                  {tag.name === 'Performance Marketing' ? <Megaphone className="w-3 h-3" aria-hidden="true" /> : <IndianRupee className="w-3 h-3" aria-hidden="true" />}
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors" aria-label="Close onboarding modal">
            <X className="w-4 h-4 text-black/40" />
          </button>
        </div>

        {/* ── Step Progress ── */}
        <div className="px-7 pb-5">
          <div className="flex items-center" role="navigation" aria-label="Onboarding steps">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold transition-all ${
                      isDone ? 'bg-[#00C875] text-white' : isActive ? 'bg-[#204CC7] text-white' : 'bg-black/[0.06] text-black/35'
                    }`} aria-current={isActive ? 'step' : undefined}>
                      {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : stepNum}
                    </div>
                    <span className={`text-caption font-medium whitespace-nowrap ${isActive ? 'text-black/80' : isDone ? 'text-[#00C875]' : 'text-black/35'}`}>{label}</span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-px mx-3 ${isDone ? 'bg-[#00C875]' : 'bg-black/[0.08]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-black/[0.06]" />

        {/* ── Step Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* STEP 1: Assign Team */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
                  <h3 className="text-h3 text-black/80">
                    {hasBothServices ? 'Performance Marketing Team' : isPM ? 'Assign Service Team' : 'Assign Accounts & Taxation Team'}
                  </h3>
                </div>
                <p className="text-body text-black/45 mb-4 -mt-1">
                  {isPM
                    ? 'Assign team members who will manage this client\'s campaigns and creatives.'
                    : 'Assign the team responsible for this client\'s accounts and tax filings.'
                  }
                </p>
                <div className="space-y-2">
                  {roleSlots.map(slot => renderSlotRow(slot, employeePool, assignments, setAssignments, openDropdown, setOpenDropdown, isPM ? '#204CC7' : '#06B6D4'))}
                </div>
              </div>

              {hasBothServices && (
                <div>
                  <div className="flex items-center gap-2 mb-4 mt-2">
                    <IndianRupee className="w-4 h-4 text-[#06B6D4]" aria-hidden="true" />
                    <h3 className="text-h3 text-black/80">Accounts & Taxation Team</h3>
                  </div>
                  <div className="space-y-2">
                    {atRoleSlots.map(slot => renderSlotRow(slot, atEmployeePool, atAssignments, setAtAssignments, openAtDropdown, setOpenAtDropdown, '#06B6D4'))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Set Target Metrics (PM only) */}
          {step === 2 && isPM && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
                  <h3 className="text-h3 text-black/80">Monthly Target Metrics</h3>
                </div>
                <p className="text-body text-black/45 mt-1">Set the performance targets that will be tracked in the Reports module.</p>
              </div>

              {/* Business type tag (read-only, derived from client sector) */}
              <div className="flex items-center gap-2">
                <span className="text-caption font-medium text-black/45">Business type</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-semibold border ${
                  businessType === 'ecommerce'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {businessType === 'ecommerce' ? 'E-Commerce' : 'Lead Generation'}
                </span>
              </div>

              {/* Metric inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adspend" className="text-caption font-medium text-black/50 block mb-1.5">Monthly Ad Spend Budget</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/30" aria-hidden="true">₹</span>
                    <input
                      id="adspend"
                      type="text"
                      placeholder="e.g. 500000"
                      value={metrics.adSpend}
                      onChange={e => setMetrics(prev => ({ ...prev, adSpend: e.target.value }))}
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                    />
                  </div>
                </div>

                {businessType === 'ecommerce' ? (
                  <>
                    <div>
                      <label htmlFor="roas" className="text-caption font-medium text-black/50 block mb-1.5">Target ROAS</label>
                      <div className="relative">
                        <input
                          id="roas"
                          type="text"
                          placeholder="e.g. 5.0"
                          value={metrics.roas}
                          onChange={e => setMetrics(prev => ({ ...prev, roas: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-caption text-black/25" aria-hidden="true">x</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="revenue" className="text-caption font-medium text-black/50 block mb-1.5">Target Revenue</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/30" aria-hidden="true">₹</span>
                        <input
                          id="revenue"
                          type="text"
                          placeholder="e.g. 2500000"
                          value={metrics.revenue}
                          onChange={e => setMetrics(prev => ({ ...prev, revenue: e.target.value }))}
                          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="orders" className="text-caption font-medium text-black/50 block mb-1.5">Target Orders / Month</label>
                      <input
                        id="orders"
                        type="text"
                        placeholder="e.g. 1500"
                        value={metrics.orders}
                        onChange={e => setMetrics(prev => ({ ...prev, orders: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="aov" className="text-caption font-medium text-black/50 block mb-1.5">Target AOV</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/30" aria-hidden="true">₹</span>
                        <input
                          id="aov"
                          type="text"
                          placeholder="e.g. 3500"
                          value={metrics.aov}
                          onChange={e => setMetrics(prev => ({ ...prev, aov: e.target.value }))}
                          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label htmlFor="leads" className="text-caption font-medium text-black/50 block mb-1.5">Target Leads / Month</label>
                      <input
                        id="leads"
                        type="text"
                        placeholder="e.g. 600"
                        value={metrics.leads}
                        onChange={e => setMetrics(prev => ({ ...prev, leads: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="cpl" className="text-caption font-medium text-black/50 block mb-1.5">Target CPL</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/30" aria-hidden="true">₹</span>
                        <input
                          id="cpl"
                          type="text"
                          placeholder="e.g. 700"
                          value={metrics.cpl}
                          onChange={e => setMetrics(prev => ({ ...prev, cpl: e.target.value }))}
                          className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="ctr" className="text-caption font-medium text-black/50 block mb-1.5">Target CTR</label>
                      <div className="relative">
                        <input
                          id="ctr"
                          type="text"
                          placeholder="e.g. 3.0"
                          value={metrics.ctr}
                          onChange={e => setMetrics(prev => ({ ...prev, ctr: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-caption text-black/25" aria-hidden="true">%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* FINAL STEP: Review & Launch */}
          {step === totalSteps && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <CircleCheck className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
                <h3 className="text-h3 text-black/80">Review & Launch Onboarding</h3>
              </div>

              {/* Team summary */}
              <div className="p-4 rounded-lg bg-black/[0.015] border border-black/[0.05]">
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-3">
                  {hasBothServices ? 'Performance Marketing Team' : isPM ? 'Assigned Team' : 'Accounts & Taxation Team'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(assignments).filter(([, v]) => v).map(([role, empId]) => {
                    const emp = employeePool.find(e => e.id === empId);
                    return emp ? (
                      <div key={role} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-black/[0.06]">
                        <div className="w-5 h-5 rounded-full bg-[#204CC7] flex items-center justify-center text-white text-[10px] font-bold" aria-hidden="true">
                          {getInitials(emp.name)}
                        </div>
                        <span className="text-caption font-medium text-black/70">{emp.name}</span>
                        <span className="text-caption text-black/30">{role}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {hasBothServices && (
                <div className="p-4 rounded-lg bg-black/[0.015] border border-black/[0.05]">
                  <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-3">Accounts & Taxation Team</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(atAssignments).filter(([, v]) => v).map(([role, empId]) => {
                      const emp = atEmployeePool.find(e => e.id === empId);
                      return emp ? (
                        <div key={role} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-black/[0.06]">
                          <div className="w-5 h-5 rounded-full bg-[#06B6D4] flex items-center justify-center text-white text-[10px] font-bold" aria-hidden="true">
                            {getInitials(emp.name)}
                          </div>
                          <span className="text-caption font-medium text-black/70">{emp.name}</span>
                          <span className="text-caption text-black/30">{role}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Targets summary (PM only) */}
              {isPM && (
                <div className="p-4 rounded-lg bg-black/[0.015] border border-black/[0.05]">
                  <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-3">
                    Monthly Targets · {businessType === 'ecommerce' ? 'E-Commerce' : 'Lead Generation'}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {metrics.adSpend && (
                      <div>
                        <p className="text-caption text-black/40">Ad Spend</p>
                        <p className="text-body font-semibold text-black/75 mt-0.5">₹{Number(metrics.adSpend).toLocaleString('en-IN')}</p>
                      </div>
                    )}
                    {businessType === 'ecommerce' ? (
                      <>
                        {metrics.roas && (
                          <div>
                            <p className="text-caption text-black/40">ROAS</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">{metrics.roas}x</p>
                          </div>
                        )}
                        {metrics.revenue && (
                          <div>
                            <p className="text-caption text-black/40">Revenue</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">₹{Number(metrics.revenue).toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        {metrics.orders && (
                          <div>
                            <p className="text-caption text-black/40">Orders</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">{Number(metrics.orders).toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        {metrics.aov && (
                          <div>
                            <p className="text-caption text-black/40">AOV</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">₹{Number(metrics.aov).toLocaleString('en-IN')}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {metrics.leads && (
                          <div>
                            <p className="text-caption text-black/40">Leads</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">{metrics.leads}</p>
                          </div>
                        )}
                        {metrics.cpl && (
                          <div>
                            <p className="text-caption text-black/40">CPL</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">₹{Number(metrics.cpl).toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        {metrics.ctr && (
                          <div>
                            <p className="text-caption text-black/40">CTR</p>
                            <p className="text-body font-semibold text-black/75 mt-0.5">{metrics.ctr}%</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.06]" />
        <div className="flex items-center justify-between px-7 py-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-body font-medium text-black/50 hover:bg-black/[0.03] transition-colors"
              aria-label="Go back to previous step"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-body font-medium text-black/50 hover:bg-black/[0.03] transition-colors"
            >
              Cancel
            </button>
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed}
              aria-disabled={!canProceed}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold transition-all ${
                canProceed
                  ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa8] shadow-sm'
                  : 'bg-black/[0.06] text-black/25 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              onClick={() => onComplete(assignments, isPM ? metrics : undefined)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#00C875] text-white hover:bg-[#00b368] shadow-sm transition-all"
            >
              <CircleCheck className="w-4 h-4" aria-hidden="true" />
              Launch Onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Filter Option Row ──
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
function ClientFilterPanel({
  filters, onChange, onClose, onReset, activeCount,
}: {
  filters: ClientFilters;
  onChange: (f: ClientFilters) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[360px]">
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.04] text-black/40"><X className="w-4 h-4" /></button>
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

        {/* Sector */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Sector</p>
          <div className="space-y-0.5">
            {(['All', 'Technology', 'Healthcare', 'Education', 'Energy', 'E-commerce'] as SectorFilterOption[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Sectors' : opt} value={opt} selected={filters.sector === opt} onSelect={(v) => onChange({ ...filters, sector: v })} />
            ))}
          </div>
        </div>

        {/* Onboarding Status */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Onboarding</p>
          <div className="space-y-0.5">
            {(['All', 'Done', 'OBC', 'Pending'] as OnboardingFilterOption[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt === 'OBC' ? 'Onboarding' : opt} value={opt} selected={filters.onboarding === opt} onSelect={(v) => onChange({ ...filters, onboarding: v })} />
            ))}
          </div>
        </div>

        {/* Incidents */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Incidents</p>
          <div className="space-y-0.5">
            {(['All', 'Has Incidents', 'No Incidents'] as IncidentFilterOption[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Clients' : opt} value={opt} selected={filters.incidents === opt} onSelect={(v) => onChange({ ...filters, incidents: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/[0.04] text-black/40"><X className="w-4 h-4" /></button>
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

interface AllClientsProps {
  onNavigateToIncidents?: () => void;
}

export function AllClients({ onNavigateToIncidents }: AllClientsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'clients' | 'cla'>(tabParam === 'cla' ? 'cla' : 'clients');
  const [showAddCLAModal, setShowAddCLAModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  // Filter state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [clientFilters, setClientFilters] = useState<ClientFilters>(DEFAULT_CLIENT_FILTERS);
  const [claFilters, setClaFilters] = useState<CLAFilters>(DEFAULT_CLA_FILTERS);

  const clientFilterCount = (clientFilters.service !== 'All' ? 1 : 0) + (clientFilters.sector !== 'All' ? 1 : 0) + (clientFilters.onboarding !== 'All' ? 1 : 0) + (clientFilters.incidents !== 'All' ? 1 : 0);
  const claFilterCount = (claFilters.service !== 'All' ? 1 : 0) + (claFilters.status !== 'All' ? 1 : 0);
  const activeFilterCount = viewMode === 'clients' ? clientFilterCount : claFilterCount;

  // Form state for Add CLA modal
  const [formData, setFormData] = useState({
    creationDate: new Date().toISOString().slice(0, 16), // Default to current date/time
    clientName: '',
    briefOrReason: '',
    service: 'Performance Marketing' as 'Performance Marketing' | 'Accounts & Taxation',
    status: 'Can be Saved' as 'Sureshot' | 'Can be Saved',
    billingPerMonth: '',
    hod: '' as string,
    employeeResponsible: '',
    category: "Brego's Fault" as "Brego's Fault" | "Client's Fault",
  });

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientDrawer(true);
  };

  // Sample data
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      companyName: 'Tech Solutions Pvt Ltd',
      ownerName: 'Rajesh Kumar',
      email: 'rajesh@techsolutions.com',
      serviceTags: [
        { id: '1', name: 'Performance Marketing' },
        { id: '2', name: 'Accounts & Taxation' }
      ],
      assignedEmployees: [
        { id: '1', name: 'Priya Sharma', role: 'Manager' },
        { id: '2', name: 'Amit Verma', role: 'Executive' }
      ],
      joinedDate: '2024-01-15',
      incidentCount: 2,
      onboardingStatus: 'Done',
      value: 500000,
      sector: 'Technology',
      // Extended fields for drawer
      contactNumber: '9876543210',
      address: '123 Tech Park, New Delhi, India',
      clientRelationshipStatus: 'Active',
      relationshipStatusChinmay: 'Good',
      onboardingProgress: 100,
      onboardingStage: 'Completed',
      teamMembers: [
        { role: 'Manager', name: 'Priya Sharma', required: true },
        { role: 'Executive', name: 'Amit Verma', required: true },
      ],
      kickoffDate: '2024-01-15',
      slaStatus: 'Active',
      paymentMethod: 'Credit Card',
      mainServiceHead: 'Performance Marketing',
      serviceType: 'Digital Marketing',
      businessValue: 500000,
      businessModel: 'Subscription',
      businessSize: 'Medium',
      businessCategory: 'IT Services',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
    {
      id: '2',
      companyName: 'Green Energy Industries',
      ownerName: 'Priya Malhotra',
      email: 'priya@greenenergy.com',
      serviceTags: [
        { id: '1', name: 'Accounts & Taxation' }
      ],
      assignedEmployees: [
        { id: '3', name: 'Rohan Desai', role: 'Sr. Manager' },
        { id: '4', name: 'Sneha Patel', role: 'Executive' },
        { id: '5', name: 'Vikram Singh', role: 'Jr. Executive' }
      ],
      joinedDate: '2024-03-20',
      incidentCount: 0,
      onboardingStatus: 'Pending',
      value: 300000,
      sector: 'Energy',
      // Extended fields for drawer
      contactNumber: '9876543210',
      address: '456 Green Park, Mumbai, India',
      clientRelationshipStatus: 'Active',
      relationshipStatusChinmay: 'Good',
      onboardingProgress: 50,
      onboardingStage: 'In Progress',
      teamMembers: [
        { role: 'Sr. Manager', name: 'Rohan Desai', required: true },
        { role: 'Executive', name: 'Sneha Patel', required: true },
        { role: 'Jr. Executive', name: 'Vikram Singh', required: true },
      ],
      kickoffDate: '2024-03-20',
      slaStatus: 'Active',
      paymentMethod: 'Credit Card',
      mainServiceHead: 'Accounts & Taxation',
      serviceType: 'Tax Services',
      businessValue: 300000,
      businessModel: 'Subscription',
      businessSize: 'Medium',
      businessCategory: 'Energy Services',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
    {
      id: '3',
      companyName: 'Fashion Forward Ltd',
      ownerName: 'Amit Patel',
      email: 'amit@fashionforward.com',
      serviceTags: [
        { id: '1', name: 'Performance Marketing' }
      ],
      assignedEmployees: [
        { id: '6', name: 'Kavya Iyer', role: 'Manager' }
      ],
      joinedDate: '2024-06-10',
      incidentCount: 5,
      onboardingStatus: 'OBC',
      value: 200000,
      sector: 'E-commerce',
      // Extended fields for drawer
      contactNumber: '9876543210',
      address: '789 Fashion Park, Bangalore, India',
      clientRelationshipStatus: 'Active',
      relationshipStatusChinmay: 'Good',
      onboardingProgress: 75,
      onboardingStage: 'In Progress',
      teamMembers: [
        { role: 'Manager', name: 'Kavya Iyer', required: true },
      ],
      kickoffDate: '2024-06-10',
      slaStatus: 'Active',
      paymentMethod: 'Credit Card',
      mainServiceHead: 'Performance Marketing',
      serviceType: 'Digital Marketing',
      businessValue: 200000,
      businessModel: 'Subscription',
      businessSize: 'Medium',
      businessCategory: 'Fashion Retail',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
    {
      id: '4',
      companyName: 'HealthCare Plus',
      ownerName: 'Dr. Sneha Reddy',
      email: 'sneha@healthcareplus.com',
      serviceTags: [
        { id: '1', name: 'Performance Marketing' },
        { id: '2', name: 'Accounts & Taxation' }
      ],
      assignedEmployees: [
        { id: '7', name: 'Arjun Mehta', role: 'Manager' },
        { id: '8', name: 'Neha Kapoor', role: 'Executive' }
      ],
      joinedDate: '2024-02-28',
      incidentCount: 1,
      onboardingStatus: 'Done',
      value: 400000,
      sector: 'Healthcare',
      // Extended fields for drawer
      contactNumber: '9876543210',
      address: '101 Healthcare Park, Chennai, India',
      clientRelationshipStatus: 'Active',
      relationshipStatusChinmay: 'Good',
      onboardingProgress: 100,
      onboardingStage: 'Completed',
      teamMembers: [
        { role: 'Manager', name: 'Arjun Mehta', required: true },
        { role: 'Executive', name: 'Neha Kapoor', required: true },
      ],
      kickoffDate: '2024-02-28',
      slaStatus: 'Active',
      paymentMethod: 'Credit Card',
      mainServiceHead: 'Performance Marketing',
      serviceType: 'Digital Marketing',
      businessValue: 400000,
      businessModel: 'Subscription',
      businessSize: 'Medium',
      businessCategory: 'Healthcare Services',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
    {
      id: '5',
      companyName: 'EduTech Innovators',
      ownerName: 'Vikram Singh',
      email: 'vikram@edutech.com',
      serviceTags: [
        { id: '1', name: 'Performance Marketing' }
      ],
      assignedEmployees: [
        { id: '9', name: 'Ishaan Joshi', role: 'Sr. Manager' }
      ],
      joinedDate: '2024-08-15',
      incidentCount: 0,
      onboardingStatus: 'Done',
      value: 150000,
      sector: 'Education',
      // Extended fields for drawer
      contactNumber: '9876543210',
      address: '102 EduTech Park, Hyderabad, India',
      clientRelationshipStatus: 'Active',
      relationshipStatusChinmay: 'Good',
      onboardingProgress: 100,
      onboardingStage: 'Completed',
      teamMembers: [
        { role: 'Sr. Manager', name: 'Ishaan Joshi', required: true },
      ],
      kickoffDate: '2024-08-15',
      slaStatus: 'Active',
      paymentMethod: 'Credit Card',
      mainServiceHead: 'Performance Marketing',
      serviceType: 'Digital Marketing',
      businessValue: 150000,
      businessModel: 'Subscription',
      businessSize: 'Medium',
      businessCategory: 'EduTech Services',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
    {
      id: '6',
      companyName: 'Nova Retail Group',
      ownerName: 'Rishi Kapoor',
      email: 'rishi@novaretail.com',
      serviceTags: [
        { id: '1', name: 'Performance Marketing' }
      ],
      assignedEmployees: [],
      joinedDate: '2026-03-28',
      incidentCount: 0,
      onboardingStatus: 'Pending',
      value: 350000,
      sector: 'E-commerce',
      contactNumber: '9812345678',
      address: '12 Commerce Tower, Pune, India',
      clientRelationshipStatus: 'New',
      relationshipStatusChinmay: 'N/A',
      onboardingProgress: 0,
      onboardingStage: 'Not Started',
      teamMembers: [],
      kickoffDate: '',
      slaStatus: 'Inactive',
      paymentMethod: 'Bank Transfer',
      mainServiceHead: 'Performance Marketing',
      serviceType: 'Digital Marketing',
      businessValue: 350000,
      businessModel: 'E-commerce',
      businessSize: 'Large',
      businessCategory: 'Retail',
      channel: 'Online',
      logo: 'https://via.placeholder.com/50'
    },
  ]);

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

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search
      const q = searchQuery.toLowerCase();
      if (q && !(
        client.companyName.toLowerCase().includes(q) ||
        client.ownerName.toLowerCase().includes(q) ||
        client.email.toLowerCase().includes(q)
      )) return false;

      // Service filter
      if (clientFilters.service !== 'All' && !client.serviceTags.some(t => t.name === clientFilters.service)) return false;

      // Sector filter
      if (clientFilters.sector !== 'All' && client.sector !== clientFilters.sector) return false;

      // Onboarding filter
      if (clientFilters.onboarding !== 'All' && client.onboardingStatus !== clientFilters.onboarding) return false;

      // Incidents filter
      if (clientFilters.incidents === 'Has Incidents' && client.incidentCount === 0) return false;
      if (clientFilters.incidents === 'No Incidents' && client.incidentCount > 0) return false;

      return true;
    });
  }, [clients, searchQuery, clientFilters]);

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

  const getOnboardingColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OBC':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-black/5 text-black/65 border-black/10';
    }
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
    switch (serviceName) {
      case 'Performance Marketing':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Accounts & Taxation':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';

      default:
        return 'bg-black/5 text-black/65 border-black/10';
    }
  };

  // ── KPI calculations (reactive to filters) ──
  const totalClients = filteredClients.length;
  const activeClients = filteredClients.filter(c => c.onboardingStatus === 'Done').length;
  const totalIncidents = filteredClients.reduce((sum, c) => sum + c.incidentCount, 0);
  const avgEmployeesPerClient = filteredClients.length > 0 ? (filteredClients.reduce((sum, c) => sum + c.assignedEmployees.length, 0) / filteredClients.length).toFixed(1) : '0';

  // CLA insights
  const totalCLAs = filteredCLAs.length;
  const approvedCLAs = filteredCLAs.filter(c => c.status === 'Sureshot').length;
  const pendingCLAs = filteredCLAs.filter(c => c.status === 'Can be Saved').length;
  const totalCLAAmount = filteredCLAs.filter(c => c.status !== 'Can be Saved').reduce((sum, c) => sum + c.billingPerMonth, 0);

  // CLA KPI calculations
  const totalAtRisk = filteredCLAs.length;
  const canBeSavedCount = filteredCLAs.filter(c => c.status === 'Can be Saved').length;
  const sureshotLossCount = filteredCLAs.filter(c => c.status === 'Sureshot').length;

  // Service-wise breakdown for Total Clients
  const totalClientsByService = {
    'Performance Marketing': filteredClients.filter(c => c.serviceTags.some(t => t.name === 'Performance Marketing')).length,
    'Accounts & Taxation': filteredClients.filter(c => c.serviceTags.some(t => t.name === 'Accounts & Taxation')).length,
  };
  const totalClientsServiceTotal = totalClientsByService['Performance Marketing'] + totalClientsByService['Accounts & Taxation'];

  // Service-wise breakdown for Total at Risk
  const atRiskByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.service === 'Accounts & Taxation').length,
  };

  // Service-wise breakdown for Can Be Saved
  const canBeSavedByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.status === 'Can be Saved' && c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.status === 'Can be Saved' && c.service === 'Accounts & Taxation').length,
  };

  // Service-wise breakdown for Sureshot Loss
  const sureshotLossByService = {
    'Performance Marketing': filteredCLAs.filter(c => c.status === 'Sureshot' && c.service === 'Performance Marketing').length,
    'Accounts & Taxation': filteredCLAs.filter(c => c.status === 'Sureshot' && c.service === 'Accounts & Taxation').length,
  };

  // Clients view KPIs
  const totalValue = filteredClients.reduce((sum, c) => sum + c.value, 0);
  const valueByService = {
    'Performance Marketing': filteredClients.filter(c => c.serviceTags.some(t => t.name === 'Performance Marketing')).reduce((sum, c) => sum + c.value, 0),
    'Accounts & Taxation': filteredClients.filter(c => c.serviceTags.some(t => t.name === 'Accounts & Taxation')).reduce((sum, c) => sum + c.value, 0),
  };
  const valueServiceTotal = valueByService['Performance Marketing'] + valueByService['Accounts & Taxation'];

  const activeOnboarding = filteredClients.filter(c => c.onboardingStatus !== 'Done').length;
  const onboardingByStatus = {
    'OBC': filteredClients.filter(c => c.onboardingStatus === 'OBC').length,
    'Pending': filteredClients.filter(c => c.onboardingStatus === 'Pending').length,
  };
  const onboardingStatusTotal = onboardingByStatus['OBC'] + onboardingByStatus['Pending'];

  const sectorCounts = {
    'Technology': filteredClients.filter(c => c.sector === 'Technology').length,
    'Healthcare': filteredClients.filter(c => c.sector === 'Healthcare').length,
    'Education': filteredClients.filter(c => c.sector === 'Education').length,
    'Energy': filteredClients.filter(c => c.sector === 'Energy').length,
    'E-commerce': filteredClients.filter(c => c.sector === 'E-commerce').length,
  };
  const sectorTotal = totalClients;

  return (
    <div className="space-y-4">
      {/* Toggle Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center bg-black/5 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('clients')}
            className={`px-4 py-1.5 text-caption font-medium rounded-lg transition-all ${
              viewMode === 'clients'
                ? 'bg-white text-black shadow-sm'
                : 'text-black/65 hover:text-black/70'
            }`}
          >
            All Clients
          </button>
          <button
            onClick={() => setViewMode('cla')}
            className={`px-4 py-1.5 text-caption font-medium rounded-lg transition-all ${
              viewMode === 'cla'
                ? 'bg-white text-black shadow-sm'
                : 'text-black/65 hover:text-black/70'
            }`}
          >
            CLA
          </button>
        </div>

        {/* Search and Actions remain in the same spot */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          {/* Result count */}
          {(activeFilterCount > 0 || searchQuery) && (
            <span className="text-caption font-medium text-black/40">
              {viewMode === 'clients' ? `${filteredClients.length} of ${clients.length}` : `${filteredCLAs.length} of ${clas.length}`} results
            </span>
          )}

          {/* Search */}
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-black/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={viewMode === 'clients' ? 'Search clients...' : 'Search CLAs...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/60 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-all text-caption ${
                activeFilterCount > 0
                  ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                  : 'border-black/10 bg-white text-black/70 hover:bg-black/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{activeFilterCount}</span>
              )}
            </button>

            {/* Filter Panel Dropdown */}
            {showFilterPanel && viewMode === 'clients' && (
              <ClientFilterPanel
                filters={clientFilters}
                onChange={setClientFilters}
                onClose={() => setShowFilterPanel(false)}
                onReset={() => setClientFilters(DEFAULT_CLIENT_FILTERS)}
                activeCount={clientFilterCount}
              />
            )}
            {showFilterPanel && viewMode === 'cla' && (
              <CLAFilterPanel
                filters={claFilters}
                onChange={setClaFilters}
                onClose={() => setShowFilterPanel(false)}
                onReset={() => setClaFilters(DEFAULT_CLA_FILTERS)}
                activeCount={claFilterCount}
              />
            )}
          </div>

          {viewMode === 'cla' && (
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-all text-caption" onClick={() => setShowAddCLAModal(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add CLA</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/40">Filtered by:</span>
          {viewMode === 'clients' && (
            <>
              {clientFilters.service !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
                  {clientFilters.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
                  <button onClick={() => setClientFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              )}
              {clientFilters.sector !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
                  {clientFilters.sector}
                  <button onClick={() => setClientFilters(f => ({ ...f, sector: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              )}
              {clientFilters.onboarding !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
                  {clientFilters.onboarding}
                  <button onClick={() => setClientFilters(f => ({ ...f, onboarding: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              )}
              {clientFilters.incidents !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
                  {clientFilters.incidents}
                  <button onClick={() => setClientFilters(f => ({ ...f, incidents: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button onClick={() => setClientFilters(DEFAULT_CLIENT_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">
                Clear all
              </button>
            </>
          )}
          {viewMode === 'cla' && (
            <>
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
              <button onClick={() => setClaFilters(DEFAULT_CLA_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">
                Clear all
              </button>
            </>
          )}
        </div>
      )}

      {/* Intelligence Section - Minimal insights */}
      {viewMode === 'clients' ? (
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

          {/* Total Value */}
          <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Total Value</p>
                <p className="text-[#204CC7] text-h1 font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <div className="w-10 h-10 bg-[#204CC7]/[0.06] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#204CC7]/60" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${valueServiceTotal > 0 ? (valueByService['Performance Marketing'] / valueServiceTotal) * 100 : 0}%` }} />
                <div className="bg-[#06B6D4]" style={{ width: `${valueServiceTotal > 0 ? (valueByService['Accounts & Taxation'] / valueServiceTotal) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                  <span className="text-black/50 text-caption font-normal">PM: {formatCurrency(valueByService['Performance Marketing'])}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                  <span className="text-black/50 text-caption font-normal">A&T: {formatCurrency(valueByService['Accounts & Taxation'])}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Onboarding */}
          <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Active Onboarding</p>
                <p className="text-[#204CC7] text-h1 font-bold">{activeOnboarding}</p>
              </div>
              <div className="w-10 h-10 bg-[#204CC7]/[0.06] rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-[#204CC7]/60" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                <div className="bg-[#204CC7] rounded-l-full" style={{ width: `${onboardingStatusTotal > 0 ? (onboardingByStatus['OBC'] / onboardingStatusTotal) * 100 : 0}%` }} />
                <div className="bg-[#FDAB3D]" style={{ width: `${onboardingStatusTotal > 0 ? (onboardingByStatus['Pending'] / onboardingStatusTotal) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#204CC7]" />
                  <span className="text-black/50 text-caption font-normal">Onboarding: {onboardingByStatus['OBC']}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FDAB3D]" />
                  <span className="text-black/50 text-caption font-normal">Pending: {onboardingByStatus['Pending']}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sectors */}
          <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Sectors</p>
                <p className="text-[#00C875] text-h1 font-bold">{Object.keys(sectorCounts).filter(s => sectorCounts[s as keyof typeof sectorCounts] > 0).length}</p>
              </div>
              <div className="w-10 h-10 bg-[#00C875]/[0.08] rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#00C875]/70" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                <div className="bg-indigo-500 rounded-l-full" style={{ width: `${sectorTotal > 0 ? (sectorCounts['Technology'] / sectorTotal) * 100 : 0}%` }} />
                <div className="bg-[#00C875]" style={{ width: `${sectorTotal > 0 ? (sectorCounts['Healthcare'] / sectorTotal) * 100 : 0}%` }} />
                <div className="bg-[#FDAB3D]" style={{ width: `${sectorTotal > 0 ? (sectorCounts['Education'] / sectorTotal) * 100 : 0}%` }} />
                <div className="bg-[#06B6D4]" style={{ width: `${sectorTotal > 0 ? (sectorCounts['Energy'] / sectorTotal) * 100 : 0}%` }} />
                <div className="bg-[#E2445C]" style={{ width: `${sectorTotal > 0 ? (sectorCounts['E-commerce'] / sectorTotal) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {sectorCounts['Technology'] > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-black/50 text-caption font-normal">Tech: {sectorCounts['Technology']}</span>
                  </div>
                )}
                {sectorCounts['Healthcare'] > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#00C875]" />
                    <span className="text-black/50 text-caption font-normal">HC: {sectorCounts['Healthcare']}</span>
                  </div>
                )}
                {sectorCounts['Education'] > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#FDAB3D]" />
                    <span className="text-black/50 text-caption font-normal">Edu: {sectorCounts['Education']}</span>
                  </div>
                )}
                {sectorCounts['Energy'] > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                    <span className="text-black/50 text-caption font-normal">Eng: {sectorCounts['Energy']}</span>
                  </div>
                )}
                {sectorCounts['E-commerce'] > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#E2445C]" />
                    <span className="text-black/50 text-caption font-normal">EC: {sectorCounts['E-commerce']}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
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
                <p className="text-[#FDAB3D] text-h1 font-bold">{canBeSavedCount}</p>
              </div>
              <div className="w-10 h-10 bg-[#FDAB3D]/[0.08] rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#FDAB3D]/70" />
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
      )}

      {/* Minimal Table */}
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === 'clients' ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Owner Name</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Service Tags</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Employees Assigned</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Joined Date</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Incidents</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Kickoff</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-8 h-8 text-black/20" />
                        <p className="text-body font-medium text-black/50">No clients match your filters</p>
                        <button onClick={() => { setClientFilters(DEFAULT_CLIENT_FILTERS); setSearchQuery(''); }} className="text-caption font-medium text-[#204CC7] hover:underline">Clear all filters</button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredClients.map((client, index) => (
                  <tr
                    key={client.id}
                    onClick={() => handleClientClick(client)}
                    className={`border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white' : 'bg-black/[0.01]'
                    }`}
                  >
                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-black text-body font-medium">{client.companyName}</p>
                    </td>

                    {/* Owner Name */}
                    <td className="px-4 py-3">
                      <p className="text-black/70 text-body">{client.ownerName}</p>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className="text-black/65 text-caption">{client.email}</p>
                    </td>

                    {/* Service Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.serviceTags.map((tag) => (
                          <span
                            key={tag.id}
                            className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getServiceTagColor(tag.name)}`}
                          >
                            {tag.name === 'Performance Marketing' ? 'SEM' : 'A&T'}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Employees Assigned */}
                    <td className="px-4 py-3">
                      {client.onboardingStatus === 'Pending' ? (
                        <span className="text-black/30 text-caption">—</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1">
                            {client.assignedEmployees.slice(0, 3).map((emp, idx) => (
                              <div
                                key={emp.id}
                                className="w-6 h-6 bg-gradient-to-br from-black to-black/70 rounded-full flex items-center justify-center border-2 border-white"
                                title={emp.name}
                              >
                                <span className="text-white text-[10px] font-semibold">
                                  {emp.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                            ))}
                          </div>
                          {client.assignedEmployees.length > 3 && (
                            <span className="text-black/60 text-caption">+{client.assignedEmployees.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-4 py-3">
                      <p className="text-black/65 text-caption">{formatDate(client.joinedDate)}</p>
                    </td>

                    {/* Incidents - Tappable */}
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToIncidents?.();
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-caption font-medium transition-all ${
                          client.incidentCount > 0
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <span>{client.incidentCount}</span>
                        {client.incidentCount > 0 && <ChevronRight className="w-3 h-3" />}
                      </button>
                    </td>

                    {/* Kickoff */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-caption font-medium border ${getOnboardingColor(client.onboardingStatus)}`}>
                        {client.onboardingStatus === 'OBC' ? 'Onboarding' : client.onboardingStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Creation Date</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Brief or Reason</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Service</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Billing / Mo</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">HOD</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Employee Responsible</th>
                  <th className="px-4 py-3 text-left text-black/65 text-caption font-medium">Category</th>
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
                    {/* Creation Date */}
                    <td className="px-4 py-3">
                      <p className="text-black/50 text-caption">{formatDate(cla.creationDate)}</p>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-black text-body font-medium">{cla.clientName}</p>
                    </td>

                    {/* Brief or Reason */}
                    <td className="px-4 py-3">
                      <p className="text-black/70 text-caption max-w-xs truncate" title={cla.briefOrReason}>
                        {cla.briefOrReason}
                      </p>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getServiceTagColor(cla.service)}`}>
                        {cla.service === 'Performance Marketing' ? 'SEM' : cla.service === 'Accounts & Taxation' ? 'A&T' : 'CM'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-caption font-medium border ${getCLAStatusColor(cla.status)}`}>
                        {cla.status}
                      </span>
                    </td>

                    {/* Billing / Mo */}
                    <td className="px-4 py-3">
                      <p className="text-body font-semibold text-[#E2445C]">
                        {formatCurrency(cla.billingPerMonth)}
                      </p>
                    </td>

                    {/* HOD */}
                    <td className="px-4 py-3">
                      <p className="text-black/70 text-body">{cla.hod}</p>
                    </td>

                    {/* Employee Responsible */}
                    <td className="px-4 py-3">
                      <p className="text-black/70 text-body">{cla.employeeResponsible}</p>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                        cla.category === "Brego's Fault" ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {cla.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Empty State */}
        {viewMode === 'clients' && filteredClients.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/60 text-body">No clients found</p>
          </div>
        )}
        
        {viewMode === 'cla' && filteredCLAs.length === 0 && (
          <div className="py-12 text-center">
            <FileText className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/60 text-body">No CLAs found</p>
          </div>
        )}
      </div>

      {/* Add CLA Modal */}
      {showAddCLAModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setShowAddCLAModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] flex flex-col max-h-[calc(100vh-48px)]" onClick={(e) => e.stopPropagation()}>

            {/* ── Sticky Header ── */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-black/[0.06] flex-shrink-0">
              <div>
                <h3 className="text-h2 font-bold text-black/90">Add New CLA</h3>
                <p className="text-caption text-black/40 mt-1">Client Loss Alert — Track at-risk clients</p>
              </div>
              <button
                className="w-9 h-9 rounded-xl hover:bg-black/[0.04] flex items-center justify-center transition-all"
                onClick={() => setShowAddCLAModal(false)}
                aria-label="Close modal"
              >
                <X className="w-4 h-4 text-black/40" />
              </button>
            </div>

            {/* ── Scrollable Form Body ── */}
            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="space-y-5">

                {/* Row 1: Date + Client — Two columns */}
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
                      onChange={(e) => {
                        const sc = clients.find(c => c.companyName === e.target.value);
                        setFormData({ ...formData, clientName: e.target.value, billingPerMonth: sc ? sc.value.toString() : '' });
                      }}
                      className="w-full px-3.5 py-2.5 text-body border border-black/[0.08] rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/40 transition-all appearance-none"
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.companyName}>{client.companyName}</option>
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

                {/* Row 3: Service + Status — Two columns */}
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

                {/* Row 4: Billing / Mo + HOD — Two columns */}
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

                {/* Row 5: Category + Employee — Two columns */}
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

            {/* ── Sticky Footer ── */}
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
                className="px-6 py-2.5 text-body font-semibold bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-all shadow-sm"
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

      {/* Client Details Drawer */}
      <ClientDetailsDrawer
        client={selectedClient}
        isOpen={showClientDrawer}
        onClose={() => setShowClientDrawer(false)}
        onAddToCLA={() => {
          if (selectedClient) {
            setFormData({
              ...formData,
              clientName: selectedClient.companyName,
              billingPerMonth: selectedClient.value.toString(),
            });
            setShowClientDrawer(false);
            setShowAddCLAModal(true);
          }
        }}
      />

    </div>
  );
}