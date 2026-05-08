'use client';
import { useState, useRef, useEffect } from 'react';
import { Users, Search, Plus, X, AlertTriangle, Filter, UserPlus, ChevronDown, Check } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';

interface Employee {
  id: number;
  code: string;
  name: string;
  email: string;
  role: string;
  designation: string;
  joiningDate: string;
  department: string;
  status: 'Confirmed' | 'Probation' | 'Intern';
  workstation: string;
  coreTeam: boolean;
  house: string;
  reportingManager: string;
  monthlySalary: number;
  relationshipTejas: string;
  relationshipHOD: string;
  hrRelationship: string;
  communication: string;
  situationHandling: string;
  businessKnowledge: string;
  techKnowledge: string;
  excelSkill: string;
  campaignOptimization: string;
  websiteAudit: string;
  mediaPlanningStrategy: string;
  adCreativeUnderstanding: string;
  industryKnowledge: string;
  googlePlatform: string;
  onboardingStatus: 'Onboarded' | 'Settled' | 'Unsettled';
  isCLA: boolean;
  claType: 'CLA' | 'NTF' | '';
  claReason: string;
  assignedClients: string[];
}

const DEPARTMENTS = [
  'All',
  'Performance Marketing',
  'Accounts & Taxation',
  'Finance',
  'Operations',
  'HR',
  'Sales',
  'Design',
  'Development',
];

const ROLES = [
  'Admin',
  'HOD',
  'Manager',
  'Executive',
  'Intern',
];

type DeptFilter = 'All' | typeof DEPARTMENTS[number];
type StatusFilter = 'All' | 'Confirmed' | 'Probation' | 'Intern';
type RoleFilter = 'All' | typeof ROLES[number];

interface EmployeeFilters {
  department: DeptFilter;
  status: StatusFilter;
  role: RoleFilter;
}

const DEFAULT_FILTERS: EmployeeFilters = { department: 'All', status: 'All', role: 'All' };

function FilterOption<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const isActive = value !== 'All';
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-medium transition-all border ${isActive ? 'bg-[#204CC7]/[0.07] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/10 text-black/60 hover:bg-black/[0.02]'}`}>
        <span>{label}{isActive ? `: ${value}` : ''}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[60] min-w-[180px] bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-caption transition-all ${value === opt ? 'bg-[#204CC7]/5 text-[#204CC7] font-medium' : 'text-black/70 hover:bg-black/[0.02]'}`}>
                {opt === 'All' ? `All` : opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const mockData: Employee[] = [
  {
    id: 1,
    code: 'BRG001',
    name: 'Mihir L. (Me)',
    email: 'mihir@bregobusiness.com',
    role: 'Admin',
    designation: 'Founder & CEO',
    joiningDate: '6th Nov, 2025',
    department: 'All',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Savage',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 150000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Fantastic',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: ['All'],
  },
  {
    id: 2,
    code: 'BRG002',
    name: 'Tejas A.',
    email: 'tejas@bregobusiness.com',
    role: 'HOD',
    designation: 'Chief Operating Officer',
    joiningDate: '6th Nov, 2025',
    department: 'All',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Palmer',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 200000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Fantastic',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: ['All'],
  },
  {
    id: 3,
    code: 'BRG003',
    name: 'Zeel M.',
    email: 'zeel@bregobusiness.com',
    role: 'HOD',
    designation: 'Head of Performance Marketing',
    joiningDate: '6th Nov, 2025',
    department: 'All',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Wilson',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 180000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Average',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: ['All'],
  },
  {
    id: 4,
    code: 'BRG004',
    name: 'Hooshang B.',
    email: 'hooshang@bregobusiness.com',
    role: 'HOD',
    designation: 'Head of Sales',
    joiningDate: '6th Nov, 2025',
    department: 'All',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Savage',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 170000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Average',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: ['All'],
  },
  {
    id: 5,
    code: 'BRG005',
    name: 'Zubear S.',
    email: 'zubear@bregobusiness.com',
    role: 'HOD',
    designation: 'Head of Accounts & Taxation',
    joiningDate: '6th Nov, 2025',
    department: 'Finance',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Palmer',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 160000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Average',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: [],
  },
  {
    id: 6,
    code: 'BRG006',
    name: 'Irshad O.',
    email: 'irshad@bregobusiness.com',
    role: 'HOD',
    designation: 'Head of Finance',
    joiningDate: '6th Nov, 2025',
    department: 'Finance',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Wilson',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 155000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Average',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: [],
  },
  {
    id: 7,
    code: 'BRG007',
    name: 'Harshal R.',
    email: 'harshal.rane@example.com',
    role: 'Manager',
    designation: 'Operations Manager',
    joiningDate: '6th Nov, 2025',
    department: 'All',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: true,
    house: 'Savage',
    reportingManager: 'Tejas (COO)',
    monthlySalary: 140000,
    relationshipTejas: 'Very Strong',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Very Strong',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Fantastic',
    techKnowledge: 'Average',
    excelSkill: 'Fantastic',
    campaignOptimization: 'Average',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Average',
    industryKnowledge: 'Average',
    googlePlatform: 'Average',
    onboardingStatus: 'Onboarded',
    isCLA: false,
    claType: '' as const,
    claReason: '',
    assignedClients: ['All'],
  },
  {
    id: 8,
    code: 'BRG008',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Executive',
    designation: 'Performance Marketing Executive',
    joiningDate: '6th Nov, 2025',
    department: 'Performance Marketing',
    status: 'Confirmed',
    workstation: 'Mumbai HQ',
    coreTeam: false,
    house: 'Palmer',
    reportingManager: 'Sneha Kumar',
    monthlySalary: 75000,
    relationshipTejas: 'Average',
    relationshipHOD: 'Very Strong',
    hrRelationship: 'Average',
    communication: 'Fantastic',
    situationHandling: 'Fantastic',
    businessKnowledge: 'Average',
    techKnowledge: 'Fantastic',
    excelSkill: 'Average',
    campaignOptimization: 'Very Strong',
    websiteAudit: 'Average',
    mediaPlanningStrategy: 'Very Strong',
    adCreativeUnderstanding: 'Very Strong',
    industryKnowledge: 'Very Strong',
    googlePlatform: 'Very Strong',
    onboardingStatus: 'Settled',
    isCLA: true,
    claType: 'CLA' as const,
    claReason: 'Performance issues - Not meeting monthly targets for 3 consecutive months',
    assignedClients: ['Acme Corp', 'Tech Innovations'],
  },
  {
    id: 9,
    code: 'BRG009',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    role: 'Executive',
    designation: 'Performance Marketing Executive',
    joiningDate: '15th Dec, 2025',
    department: 'Performance Marketing',
    status: 'Probation',
    workstation: 'Remote',
    coreTeam: false,
    house: 'Wilson',
    reportingManager: 'Zeel M.',
    monthlySalary: 55000,
    relationshipTejas: 'Weak',
    relationshipHOD: 'Average',
    hrRelationship: 'Weak',
    communication: 'Below Average',
    situationHandling: 'Average',
    businessKnowledge: 'Below Average',
    techKnowledge: 'Average',
    excelSkill: 'Below Average',
    campaignOptimization: 'Average',
    websiteAudit: 'Weak',
    mediaPlanningStrategy: 'Average',
    adCreativeUnderstanding: 'Strong',
    industryKnowledge: 'Average',
    googlePlatform: 'Weak',
    onboardingStatus: 'Unsettled',
    isCLA: true,
    claType: 'NTF' as const,
    claReason: 'Attendance and punctuality concerns - Late submissions affecting team deliverables',
    assignedClients: ['Sunrise Retail'],
  },
];

function getDepartmentColor(dept: string) {
  switch (dept) {
    case 'All':
      return 'bg-blue-50 text-blue-700';
    case 'Finance':
      return 'bg-emerald-50 text-emerald-700';
    case 'Performance Marketing':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-black/5 text-black/70';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Confirmed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Probation':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Intern':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-black/5 text-black/50 border-black/10';
  }
}

export function EmployeeCLA() {
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>(mockData);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS);
  const [openDropdown, setOpenDropdown] = useState<{ id: number; field: string } | null>(null);
  const [showAddCLAModal, setShowAddCLAModal] = useState(false);
  const [claForm, setClaForm] = useState({ selectedEmployeeId: 0, claType: 'CLA' as 'CLA' | 'NTF', reason: '' });
  const addCLADialogRef = useModalA11y(showAddCLAModal, () => setShowAddCLAModal(false));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === '' || (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesDept = filters.department === 'All' || emp.department === filters.department;
    const matchesStatus = filters.status === 'All' || emp.status === filters.status;
    const matchesRole = filters.role === 'All' || emp.role === filters.role;
    return matchesSearch && matchesDept && matchesStatus && matchesRole;
  });

  const claEmployees = filteredEmployees.filter(emp => emp.isCLA);
  const nonCLAEmployees = employees.filter(emp => !emp.isCLA);
  const activeFilterCount = Object.values(filters).filter(v => v !== 'All').length;
  const claCount = employees.filter(e => e.isCLA).length;
  const claTypeCount = employees.filter(e => e.claType === 'CLA').length;
  const ntfCount = employees.filter(e => e.claType === 'NTF').length;

  const updateEmployee = (id: number, field: keyof Employee | string, value: any) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, [field]: value } : emp));
    setOpenDropdown(null);
  };

  // Close any open inline dropdown (e.g. the Onboarding status menu) on
  // Escape or when the user clicks outside of it. Stop-propagation on
  // the dropdown itself prevents the click-outside handler from firing
  // while interacting with the menu.
  useEffect(() => {
    if (!openDropdown) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDropdown(null); };
    const onClick = () => setOpenDropdown(null);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [openDropdown]);

  const handleAddCLA = () => {
    if (!claForm.selectedEmployeeId || !claForm.reason) {
      alert('Please select an employee and provide a reason');
      return;
    }
    setEmployees(prev => prev.map(emp =>
      emp.id === claForm.selectedEmployeeId
        ? { ...emp, isCLA: true, claType: claForm.claType, claReason: claForm.reason }
        : emp
    ));
    setShowAddCLAModal(false);
    setClaForm({ selectedEmployeeId: 0, claType: 'CLA', reason: '' });
  };

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on All Customers / All Employees / etc. Title +
        subtitle anchor the left; result count, Search, Filter, and the
        primary Add CLA/NTF CTA hang on the right.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Employee CLA / NTF</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Performance watchlist (CLA) and unpaid termination flags (NTF)</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only when filters or search are narrowing the table */}
            {(activeFilterCount > 0 || searchQuery) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/55">
                {claEmployees.length} of {employees.filter(e => e.isCLA).length} results
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="cla-ntf-search" className="sr-only">Search CLA/NTF employees</label>
              <input
                id="cla-ntf-search"
                type="text"
                placeholder="Search CLA/NTF…"
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
                  <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" />
                </button>
              )}
            </div>

            {/* Filter button + popover */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  activeFilterCount > 0
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{activeFilterCount}</span>
                )}
              </button>

              {showFilters && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[320px]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
                      <span className="text-body font-semibold text-black/80">Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[20px] text-center">{activeFilterCount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-[#204CC7] hover:underline">Reset</button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        aria-label="Close filters"
                        className="p-1 rounded-md hover:bg-black/[0.04] text-black/55 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">
                    <div>
                      <p className="text-caption font-semibold text-black/60 uppercase tracking-wide mb-2 px-1">Department</p>
                      {(['All', ...DEPARTMENTS.filter(d => d !== 'All')] as DeptFilter[]).map(opt => (
                        <button key={opt} onClick={() => setFilters({ ...filters, department: opt })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-caption transition-all ${filters.department === opt ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/60 uppercase tracking-wide mb-2 px-1">Status</p>
                      {(['All', 'Confirmed', 'Probation', 'Intern'] as StatusFilter[]).map(opt => (
                        <button key={opt} onClick={() => setFilters({ ...filters, status: opt })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-caption transition-all ${filters.status === opt ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/60 uppercase tracking-wide mb-2 px-1">Role</p>
                      {(['All', ...ROLES] as RoleFilter[]).map(opt => (
                        <button key={opt} onClick={() => setFilters({ ...filters, role: opt })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-caption transition-all ${filters.role === opt ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add CLA/NTF — primary CTA, brand-blue solid */}
            <button
              type="button"
              onClick={() => setShowAddCLAModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#204CC7] text-white rounded-md hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all text-caption font-medium"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add CLA/NTF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-black/5 rounded-xl p-4">
            <p className="text-black/55 text-caption mb-1">Total CLA/NTF</p>
            <p className="text-rose-600 text-h1 font-semibold">{claCount}</p>
          </div>
          <div className="bg-white border border-black/5 rounded-xl p-4">
            <p className="text-black/55 text-caption mb-1">CLA</p>
            <p className="text-amber-600 text-h1 font-semibold">{claTypeCount}</p>
          </div>
          <div className="bg-white border border-black/5 rounded-xl p-4">
            <p className="text-black/55 text-caption mb-1">NTF</p>
            <p className="text-rose-600 text-h1 font-semibold">{ntfCount}</p>
          </div>
        </div>

        {/* CLA Employees Table */}
        <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.01]">
                  <th scope="col" className="pl-5 pr-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Department</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Joined</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Onboarding</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Reason/Brief</th>
                </tr>
              </thead>
              <tbody>
                {claEmployees.map((employee, index) => (
                  <tr
                    key={employee.id}
                    className={`border-b border-black/[0.04] last:border-0 transition-colors hover:bg-black/[0.015] cursor-pointer group/row ${index % 2 === 1 ? 'bg-black/[0.01]' : ''}`}
                  >
                    {/* Code */}
                    <td className="pl-5 pr-3 py-3">
                      <span className="text-[#204CC7]/70 text-caption font-mono">{employee.code}</span>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-black/[0.04] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-black/50 text-caption font-semibold">{employee.name.charAt(0)}</span>
                        </div>
                        <span className="text-black/85 text-caption font-medium">{employee.name}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-caption font-medium whitespace-nowrap ${getDepartmentColor(employee.department)}`}>{employee.department}</span>
                    </td>

                    {/* Role */}
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-caption font-medium bg-[#204CC7]/8 text-[#204CC7] whitespace-nowrap">{employee.role}</span>
                    </td>

                    {/* Joined Date */}
                    <td className="px-3 py-3">
                      <span className="text-black/50 text-caption whitespace-nowrap">{employee.joiningDate}</span>
                    </td>

                    {/* Onboarding Status — click the pill to switch.
                        Three valid states: Unsettled (still going through
                        induction), Settled (acclimating), Onboarded
                        (fully integrated). Same color vocabulary as the
                        static pill — only the click affordance is new. */}
                    <td className="px-3 py-3 relative">
                      {(() => {
                        const isOpen = openDropdown?.id === employee.id && openDropdown?.field === 'onboardingStatus';
                        const styles: Record<Employee['onboardingStatus'], { pill: string; dot: string }> = {
                          Onboarded: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                          Settled:   { pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500'    },
                          Unsettled: { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   },
                        };
                        const current = styles[employee.onboardingStatus];
                        return (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(isOpen ? null : { id: employee.id, field: 'onboardingStatus' });
                              }}
                              aria-haspopup="listbox"
                              aria-expanded={isOpen}
                              aria-label={`Onboarding status: ${employee.onboardingStatus}. Activate to change.`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border transition-all hover:brightness-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${current.pill}`}
                            >
                              {employee.onboardingStatus}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {isOpen && (
                              <div
                                role="listbox"
                                aria-label={`Onboarding status options for ${employee.name}`}
                                className="absolute left-3 top-full mt-1 z-30 min-w-[160px] bg-white rounded-md border border-black/[0.08] shadow-lg py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(['Unsettled', 'Settled', 'Onboarded'] as Employee['onboardingStatus'][]).map(opt => {
                                  const isSelected = opt === employee.onboardingStatus;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => updateEmployee(employee.id, 'onboardingStatus', opt)}
                                      className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-caption font-medium transition-colors ${
                                        isSelected ? 'bg-[#204CC7]/[0.04] text-black/85' : 'text-black/70 hover:bg-black/[0.03]'
                                      }`}
                                    >
                                      <span className={`w-2 h-2 rounded-full ${styles[opt].dot}`} aria-hidden="true" />
                                      <span className="flex-1">{opt}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>

                    {/* Status — CLA/NTF dropdown. Mirrors the
                        Onboarding column's pattern so both editable
                        columns feel like one consistent system: click
                        the pill, pick from the listbox, see the
                        coloured dot match the pill colour. */}
                    <td className="px-3 py-3 relative">
                      {(() => {
                        const isOpen = openDropdown?.id === employee.id && openDropdown?.field === 'claType';
                        const claStyles: Record<'CLA' | 'NTF', { pill: string; dot: string }> = {
                          CLA: { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
                          NTF: { pill: 'bg-rose-50 text-rose-600 border-rose-200',    dot: 'bg-rose-500'  },
                        };
                        const currentType = (employee.claType || 'CLA') as 'CLA' | 'NTF';
                        const current = claStyles[currentType];
                        return (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(isOpen ? null : { id: employee.id, field: 'claType' });
                              }}
                              aria-haspopup="listbox"
                              aria-expanded={isOpen}
                              aria-label={`Status: ${employee.claType || 'unset'}. Activate to change.`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border transition-all hover:brightness-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                                employee.claType ? current.pill : 'bg-black/[0.03] text-black/50 border-black/10'
                              }`}
                            >
                              {employee.claType || '—'}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {isOpen && (
                              <div
                                role="listbox"
                                aria-label={`Status options for ${employee.name}`}
                                className="absolute left-3 top-full mt-1 z-30 min-w-[160px] bg-white rounded-md border border-black/[0.08] shadow-lg py-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(['CLA', 'NTF'] as const).map(opt => {
                                  const isSelected = opt === employee.claType;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => updateEmployee(employee.id, 'claType', opt)}
                                      className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-caption font-medium transition-colors ${
                                        isSelected ? 'bg-[#204CC7]/[0.04] text-black/85' : 'text-black/70 hover:bg-black/[0.03]'
                                      }`}
                                    >
                                      <span className={`w-2 h-2 rounded-full ${claStyles[opt].dot}`} aria-hidden="true" />
                                      <span className="flex-1">{opt}</span>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>

                    {/* Reason/Brief */}
                    <td className="px-3 py-3 max-w-[320px]">
                      {employee.claReason ? (
                        <p className="text-caption text-red-700 leading-relaxed line-clamp-2 bg-red-50 rounded-lg px-3 py-1.5">{employee.claReason}</p>
                      ) : (
                        <p className="text-caption text-black/55">—</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {claEmployees.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-black/10 mx-auto mb-3" />
              <p className="text-black/55 text-body">No CLA/NTF employees found</p>
            </div>
          )}
        </div>

      {/* Add to CLA/NTF Modal */}
      {showAddCLAModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" aria-hidden="true">
          <div ref={addCLADialogRef} role="dialog" aria-modal="true" aria-labelledby="add-cla-ntf-title" tabIndex={-1} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto focus:outline-none">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#204CC7]" />
                </div>
                <div>
                  <h3 id="add-cla-ntf-title" className="text-black font-semibold">Add to CLA/NTF</h3>
                  <p className="text-black/50 text-caption mt-0.5">Select an employee and provide a reason for CLA/NTF status</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCLAModal(false)}
                aria-label="Close add CLA/NTF dialog"
                className="w-8 h-8 rounded-md hover:bg-black/5 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* CLA Type Selector */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Status Type</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['CLA', 'NTF'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setClaForm({ ...claForm, claType: t })}
                        className={`flex-1 py-2.5 rounded-xl border text-caption font-medium transition-all ${
                          claForm.claType === t
                            ? t === 'CLA' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-rose-50 text-rose-600 border-rose-300'
                            : 'border-black/10 text-black/50 hover:bg-black/[0.02]'
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Reason/Brief</h4>
                  </div>
                  <label className="block text-caption font-medium text-black/70 mb-2">
                    Why is this employee being added to CLA/NTF? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    aria-required="true"
                    value={claForm.reason}
                    onChange={(e) => setClaForm({ ...claForm, reason: e.target.value })}
                    placeholder="e.g., Performance issues - Not meeting monthly targets for 3 consecutive months"
                    className="w-full h-28 px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none"
                  />
                  <p className="text-caption text-black/55 mt-1.5">Provide detailed context for documentation and review purposes</p>
                </div>
              </div>

              {/* Employee Selection */}
              <div>
                <label className="block text-caption font-medium text-black/70 mb-2">
                  Select Employee <span className="text-red-500">*</span>
                </label>
                <select
                  aria-required="true"
                  value={claForm.selectedEmployeeId}
                  onChange={(e) => setClaForm({ ...claForm, selectedEmployeeId: parseInt(e.target.value) })}
                  className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value={0}>Choose an employee...</option>
                  {nonCLAEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                  ))}
                </select>
                <p className="text-caption text-black/55 mt-1.5">Only employees not currently in CLA/NTF are shown</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-black/5 px-6 py-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddCLAModal(false)}
                className="px-4 py-2 text-caption font-medium text-black/70 hover:bg-black/5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCLA}
                className="px-4 py-2 text-caption font-medium bg-[#204CC7] text-white hover:bg-[#1a3d9f] rounded-md transition-all"
              >
                Add to CLA/NTF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
