'use client';
import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Search, Plus, X, AlertTriangle, CheckCircle, Clock, Award, TrendingUp, Filter, UserPlus, Building2, User, Briefcase, DollarSign, Home, ChevronDown, Check, Mail, RotateCcw, Trash2, Send, Shield, Eye, MessageSquare, FolderOpen, ListTodo, BarChart3, Settings } from 'lucide-react';

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
  // PM-specific skills (only relevant when department === 'Performance Marketing')
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

type IncomingStatus = 'Incoming' | 'Backed Out' | 'Active';

interface IncomingEmployee {
  id: number;
  code: string;
  name: string;
  department: string;
  role: string;
  joiningDate: string;
  incomingStatus: IncomingStatus;
  note?: string;
}

// Available options for dropdowns
const ROLES = [
  'Admin',
  'HOD',
  'Manager',
  'Executive',
  'Intern',
];

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

const STATUSES: ('Confirmed' | 'Probation' | 'Intern')[] = ['Confirmed', 'Probation', 'Intern'];

const WORKSTATIONS = [
  'Mumbai HQ',
  'Remote',
  'Goa Office',
  'Alibag Office',
  'Hybrid',
];

const REPORTING_MANAGERS = [
  'Tejas (COO)',
  'Mihir L.',
  'Zeel M.',
  'Hooshang B.',
  'Zubear S.',
  'Irshad O.',
  'Harshal R.',
];

// Mock clients list with service categorization
interface ClientInfo {
  name: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
}

const AVAILABLE_CLIENTS: ClientInfo[] = [
  // Performance Marketing clients
  { name: 'Acme Corp', service: 'Performance Marketing' },
  { name: 'Tech Innovations', service: 'Performance Marketing' },
  { name: 'Global Exports', service: 'Performance Marketing' },
  { name: 'Sunrise Retail', service: 'Performance Marketing' },
  { name: 'Urban Living', service: 'Performance Marketing' },
  { name: 'Digital Dynamics', service: 'Performance Marketing' },
  { name: 'Smart Solutions', service: 'Performance Marketing' },
  // Accounts & Taxation clients
  { name: 'FinTech Solutions', service: 'Accounts & Taxation' },
  { name: 'Retail Solutions', service: 'Accounts & Taxation' },
  { name: 'Media House Inc', service: 'Accounts & Taxation' },
  { name: 'Cloud Systems', service: 'Accounts & Taxation' },
  { name: 'Enterprise Plus', service: 'Accounts & Taxation' },
];

// --- Rating Options ---
const RELATIONSHIP_OPTIONS = ['Very Strong', 'Strong', 'Average', 'Weak'];
const SKILL_OPTIONS = ['Fantastic', 'Good', 'Average', 'Need to improve'];

const RATING_COLORS: Record<string, string> = {
  'Very Strong': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Fantastic': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Strong': 'bg-blue-50 text-blue-700 border-blue-200',
  'Good': 'bg-blue-50 text-blue-700 border-blue-200',
  'Average': 'bg-amber-50 text-amber-700 border-amber-200',
  'Weak': 'bg-red-50 text-red-700 border-red-200',
  'Need to improve': 'bg-red-50 text-red-700 border-red-200',
  'Below Average': 'bg-red-50 text-red-700 border-red-200',
};

function getRatingColor(value: string) {
  return RATING_COLORS[value] || 'bg-black/5 text-black/60 border-black/10';
}

/** Clickable pill with inline dropdown for admins to change ratings. */
function EditablePill({
  value,
  options,
  employeeId,
  field,
  openDropdown,
  setOpenDropdown,
  onUpdate,
}: {
  value: string;
  options: string[];
  employeeId: number;
  field: string;
  openDropdown: { id: number; field: string } | null;
  setOpenDropdown: (v: { id: number; field: string } | null) => void;
  onUpdate: (id: number, field: string, value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = openDropdown?.id === employeeId && openDropdown?.field === field;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        if (isOpen) setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpenDropdown]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpenDropdown(isOpen ? null : { id: employeeId, field }); }}
        className={`px-3 py-1 text-caption font-medium rounded-lg border cursor-pointer transition-all hover:shadow-sm ${getRatingColor(value)}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {value}
        <ChevronDown className={`inline-block w-3 h-3 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-[60] min-w-[160px] bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden"
          role="listbox"
          aria-label={`Select ${field}`}
        >
          <div className="py-1">
            {options.map(opt => (
              <button
                key={opt}
                role="option"
                aria-selected={value === opt}
                onClick={(e) => { e.stopPropagation(); onUpdate(employeeId, field, opt); }}
                className={`w-full text-left px-3 py-2 text-caption transition-all flex items-center justify-between ${
                  value === opt ? 'bg-[#204CC7]/5 font-medium' : 'hover:bg-black/[0.02]'
                }`}
              >
                <span className={`px-2 py-0.5 rounded-md text-caption font-medium border ${getRatingColor(opt)}`}>{opt}</span>
                {value === opt && <Check className="w-3.5 h-3.5 text-[#204CC7]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pending Invites ---
interface PendingInvite {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  invitedOn: string;
  invitedBy: string;
  status: 'Pending' | 'Expired';
}

function parseInviteDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysAgo(dateStr: string): number {
  const d = parseInviteDate(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const INITIAL_INVITES: PendingInvite[] = [
  { id: 101, name: 'Priya Sharma', email: 'priya.sharma@bregobusiness.com', role: 'Executive', department: 'Performance Marketing', invitedOn: '2026-03-28', invitedBy: 'Mihir L.', status: 'Pending' },
  { id: 102, name: 'Arjun Mehta', email: 'arjun.mehta@bregobusiness.com', role: 'Executive', department: 'Finance', invitedOn: '2026-03-25', invitedBy: 'Zubear S.', status: 'Pending' },
  { id: 103, name: 'Neha Desai', email: 'neha.desai@bregobusiness.com', role: 'Intern', department: 'Performance Marketing', invitedOn: '2026-03-18', invitedBy: 'Hooshang B.', status: 'Expired' },
  { id: 104, name: 'Rohan Kulkarni', email: 'rohan.k@bregobusiness.com', role: 'Executive', department: 'Design', invitedOn: '2026-03-30', invitedBy: 'Harshal R.', status: 'Pending' },
];

// --- Filter Types ---
type DeptFilter = 'All' | typeof DEPARTMENTS[number];
type StatusFilter = 'All' | 'Confirmed' | 'Probation' | 'Intern';
type RoleFilter = 'All' | typeof ROLES[number];
type WorkstationFilter = 'All' | typeof WORKSTATIONS[number];

interface EmployeeFilters {
  department: DeptFilter;
  status: StatusFilter;
  role: RoleFilter;
  workstation: WorkstationFilter;
}

const DEFAULT_FILTERS: EmployeeFilters = { department: 'All', status: 'All', role: 'All', workstation: 'All' };

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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all border ${isActive ? 'bg-[#204CC7]/[0.07] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/10 text-black/60 hover:bg-black/[0.02]'}`}>
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

export function EmployeesNew() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialView = (tabParam === 'cla' || tabParam === 'incoming') ? tabParam : 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeView, setActiveView] = useState<'all' | 'cla' | 'incoming'>(initialView);
  const [showAddIncomingModal, setShowAddIncomingModal] = useState(false);
  const [incomingForm, setIncomingForm] = useState({ name: '', department: 'Finance', role: 'Executive', joiningDate: '', note: '' });
  const [incomingFormErrors, setIncomingFormErrors] = useState({ name: false });
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [isAddingCLA, setIsAddingCLA] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(INITIAL_INVITES);

  // Client assignment modal
  const [assignModalEmployee, setAssignModalEmployee] = useState<Employee | null>(null);
  const [assignSearch, setAssignSearch] = useState('');

  // State for inline editing
  const [openDropdown, setOpenDropdown] = useState<{ id: number; field: string } | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  const [employees, setEmployees] = useState<Employee[]>([
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
  ]);

  const [incomingEmployees, setIncomingEmployees] = useState<IncomingEmployee[]>([
    { id: 101, code: 'BRG020', name: 'Nisha Patil', department: 'Finance', role: 'Executive', joiningDate: '6th Apr, 2026', incomingStatus: 'Active', note: 'Offered ₹33.2K, DOJ: 6th April, DOCS: Done' },
    { id: 102, code: 'BRG021', name: 'Jyoti Rane', department: 'Finance', role: 'Executive', joiningDate: '4th May, 2026', incomingStatus: 'Incoming', note: 'Offered ₹41.5K, DOJ: 4th May, DOCS: Pending' },
    { id: 103, code: 'BRG022', name: 'Amisha Desai', department: 'Finance', role: 'Executive', joiningDate: 'TBD', incomingStatus: 'Incoming', note: 'Shortlisted for final round — scheduled Friday evening with Irshad' },
    { id: 104, code: 'BRG023', name: 'Rahul Kapoor', department: 'Sales', role: 'Sr. Executive', joiningDate: '14th Apr, 2026', incomingStatus: 'Incoming', note: 'Referred by Chinmay, 4 yrs exp in B2B sales' },
    { id: 105, code: 'BRG024', name: 'Sneha Kulkarni', department: 'Performance Marketing', role: 'Executive', joiningDate: '21st Apr, 2026', incomingStatus: 'Incoming', note: 'Google Ads certified, previously at iProspect' },
    { id: 106, code: 'BRG025', name: 'Vishal Thakur', department: 'Technology', role: 'Executive', joiningDate: '28th Apr, 2026', incomingStatus: 'Incoming', note: 'Full-stack developer, React + Node background' },
    { id: 107, code: 'BRG026', name: 'Ankita Sharma', department: 'Finance', role: 'Executive', joiningDate: '15th Mar, 2026', incomingStatus: 'Backed Out', note: 'Accepted counter-offer from current employer' },
    { id: 108, code: 'BRG027', name: 'Ravi Menon', department: 'Sales', role: 'Executive', joiningDate: '20th Mar, 2026', incomingStatus: 'Backed Out', note: 'Relocated to Bangalore, no longer available' },
  ]);

  const getIncomingStatusColor = (status: IncomingStatus) => {
    switch (status) {
      case 'Incoming': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Backed Out': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const getDepartmentColor = (dept: string) => {
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
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'All').length;

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = searchQuery === '' || (
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesDept = filters.department === 'All' || emp.department === filters.department;
    const matchesStatus = filters.status === 'All' || emp.status === filters.status;
    const matchesRole = filters.role === 'All' || emp.role === filters.role;
    const matchesWorkstation = filters.workstation === 'All' || emp.workstation === filters.workstation;
    return matchesSearch && matchesDept && matchesStatus && matchesRole && matchesWorkstation;
  });

  // Calculate insights
  const totalEmployees = employees.length;
  const confirmedCount = employees.filter(e => e.status === 'Confirmed').length;
  const probationCount = employees.filter(e => e.status === 'Probation').length;
  const internCount = employees.filter(e => e.status === 'Intern').length;
  const coreTeamCount = employees.filter(e => e.coreTeam).length;
  const claCount = employees.filter(e => e.isCLA).length;

  // Generate next employee code
  const generateEmployeeCode = () => {
    const maxId = Math.max(...employees.map(emp => {
      const num = parseInt(emp.code.replace('BRG', ''));
      return isNaN(num) ? 0 : num;
    }));
    return `BRG${String(maxId + 1).padStart(3, '0')}`;
  };

  // State for Add Employee Form
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    code: generateEmployeeCode(),
    role: 'Executive',
    designation: '',
    department: 'Performance Marketing',
    status: 'Probation' as 'Confirmed' | 'Probation' | 'Intern',
    joiningDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
    workstation: 'Mumbai HQ',
    reportingManager: 'Tejas (COO)',
  });

  // State for CLA Assignment Form
  const [claForm, setClaForm] = useState({
    selectedEmployeeId: 0,
    claType: 'CLA' as 'CLA' | 'NTF',
    reason: '',
  });

  // Get non-CLA employees for selection
  const nonCLAEmployees = employees.filter(emp => !emp.isCLA);

  // Update employee field (syncs both employees list and selectedEmployee)
  const updateEmployee = (id: number, field: keyof Employee | string, value: any) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const updates: Partial<Employee> = { [field]: value };

        // If role is changed to Admin, automatically set department to "All" and assign "All" client
        if (field === 'role' && value === 'Admin') {
          updates.department = 'All';
          if (!emp.assignedClients.includes('All')) {
            updates.assignedClients = ['All', ...emp.assignedClients];
          }
        }

        const updated = { ...emp, ...updates };
        // Keep selectedEmployee in sync
        if (selectedEmployee?.id === id) {
          setSelectedEmployee(updated);
        }
        return updated;
      }
      return emp;
    }));
    setOpenDropdown(null);
  };

  // Add client to employee
  const addClientToEmployee = (id: number, client: string) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id && !emp.assignedClients.includes(client)
        ? { ...emp, assignedClients: [...emp.assignedClients, client] } 
        : emp
    ));
  };

  // Remove client from employee
  const removeClientFromEmployee = (id: number, client: string) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, assignedClients: emp.assignedClients.filter(c => c !== client) } : emp
    ));
  };

  // Toggle client assignment
  const toggleClientAssignment = (id: number, client: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === id) {
        const isAssigned = emp.assignedClients.includes(client);
        return {
          ...emp,
          assignedClients: isAssigned
            ? emp.assignedClients.filter(c => c !== client)
            : [...emp.assignedClients, client]
        };
      }
      return emp;
    }));
  };

  // Clear all clients for employee
  const clearAllClients = (id: number) => {
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, assignedClients: [] } : emp
    ));
  };

  // Handle Add Employee Form Submission
  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.code) {
      alert('Please fill in all required fields');
      return;
    }

    const employeeToAdd: Employee = {
      id: employees.length + 1,
      code: newEmployee.code,
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role,
      designation: newEmployee.designation || '',
      department: newEmployee.role === 'Admin' ? 'All' : newEmployee.department,
      status: newEmployee.status,
      joiningDate: newEmployee.joiningDate,
      workstation: newEmployee.workstation,
      reportingManager: newEmployee.reportingManager,
      coreTeam: false,
      house: 'Savage',
      monthlySalary: 50000,
      relationshipTejas: 'Average',
      relationshipHOD: 'Average',
      hrRelationship: 'Average',
      communication: 'Average',
      situationHandling: 'Average',
      businessKnowledge: 'Average',
      techKnowledge: 'Average',
      excelSkill: 'Average',
      campaignOptimization: 'Average',
      websiteAudit: 'Average',
      mediaPlanningStrategy: 'Average',
      adCreativeUnderstanding: 'Average',
      industryKnowledge: 'Average',
      googlePlatform: 'Average',
      onboardingStatus: 'Unsettled',
      isCLA: false,
      claType: '' as const,
      claReason: '',
      assignedClients: newEmployee.role === 'Admin' ? ['All'] : [],
    };

    setEmployees(prev => [...prev, employeeToAdd]);
    setShowAddEmployeeModal(false);
    
    // Reset form
    setNewEmployee({
      name: '',
      email: '',
      code: generateEmployeeCode(),
      role: 'Executive',
      designation: '',
      department: 'Performance Marketing',
      status: 'Probation',
      joiningDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
      workstation: 'Mumbai HQ',
      reportingManager: 'Tejas (COO)',
    });
  };

  // Handle CLA Assignment
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

    setShowAddEmployeeModal(false);

    // Reset form
    setClaForm({
      selectedEmployeeId: 0,
      claType: 'CLA',
      reason: '',
    });
  };

  const displayedEmployees = activeView === 'cla' 
    ? filteredEmployees.filter(emp => emp.isCLA)
    : filteredEmployees;

  return (
    <div>
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-4 bg-white border-b border-black/[0.06]">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center bg-black/5 rounded-xl p-0.5">
            <button
              onClick={() => setActiveView('all')}
              className={`px-4 py-1.5 text-caption font-medium rounded-lg transition-all ${
                activeView === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/50 hover:text-black/70'
              }`}
            >
              All Employees
            </button>
            <button
              onClick={() => setActiveView('cla')}
              className={`px-4 py-1.5 text-caption font-medium rounded-lg transition-all ${
                activeView === 'cla'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/50 hover:text-black/70'
              }`}
            >
              CLA/NTF
            </button>
            <button
              onClick={() => setActiveView('incoming')}
              className={`px-4 py-1.5 text-caption font-medium rounded-lg transition-all ${
                activeView === 'incoming'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/50 hover:text-black/70'
              }`}
            >
              Incoming
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-all text-caption font-medium ${showFilters || activeFilterCount > 0 ? 'bg-[#204CC7]/[0.07] border-[#204CC7]/20 text-[#204CC7]' : 'border-black/10 bg-white text-black/70 hover:bg-black/5'}`}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4.5 h-4.5 rounded-full bg-[#204CC7] text-white text-[11px] font-bold flex items-center justify-center leading-none min-w-[18px] px-1">{activeFilterCount}</span>
              )}
            </button>
            {activeView === 'all' && (
              <>
                <button onClick={() => setShowPendingInvites(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-black/10 rounded-lg bg-white text-black/70 hover:bg-black/5 transition-all text-caption font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Pending Invites</span>
                  {pendingInvites.length > 0 && (
                    <span className="min-w-[18px] h-[18px] rounded-full bg-[#FDAB3D] text-white text-[11px] font-bold flex items-center justify-center leading-none px-1">{pendingInvites.length}</span>
                  )}
                </button>
                <button onClick={() => setShowPermissions(true)}
                  className="flex items-center gap-1.5 px-3 py-2 border border-black/10 rounded-lg bg-white text-black/70 hover:bg-black/5 transition-all text-caption font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Permissions</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                if (activeView === 'incoming') {
                  setShowAddIncomingModal(true);
                } else {
                  setIsAddingCLA(activeView === 'cla');
                  setShowAddEmployeeModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-all text-caption font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{activeView === 'incoming' ? 'Incoming Employee' : activeView === 'cla' ? 'Add to CLA/NTF' : 'Add Employee'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-black/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-black/40" />
              <span className="text-caption font-semibold text-black/70">Filter Employees</span>
              <span className="text-caption text-black/40">·</span>
              <span className="text-caption text-black/50">{filteredEmployees.length} of {employees.length} employees</span>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption text-[#E2445C] hover:text-[#d13a4f] font-medium transition-all">
                Clear All
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FilterOption<DeptFilter> label="Department" value={filters.department} onChange={v => setFilters({ ...filters, department: v })}
              options={['All', ...DEPARTMENTS.filter(d => d !== 'All')] as DeptFilter[]} />
            <FilterOption<StatusFilter> label="Status" value={filters.status} onChange={v => setFilters({ ...filters, status: v })}
              options={['All', 'Confirmed', 'Probation', 'Intern']} />
            <FilterOption<RoleFilter> label="Role" value={filters.role} onChange={v => setFilters({ ...filters, role: v })}
              options={['All', ...ROLES] as RoleFilter[]} />
            <FilterOption<WorkstationFilter> label="Workstation" value={filters.workstation} onChange={v => setFilters({ ...filters, workstation: v })}
              options={['All', ...WORKSTATIONS] as WorkstationFilter[]} />
          </div>
          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-black/[0.06]">
              <span className="text-caption text-black/40 mr-1">Active:</span>
              {filters.department !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#204CC7]/[0.07] text-[#204CC7] text-caption font-medium">
                  {filters.department}
                  <button onClick={() => setFilters({ ...filters, department: 'All' })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.status !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#204CC7]/[0.07] text-[#204CC7] text-caption font-medium">
                  {filters.status}
                  <button onClick={() => setFilters({ ...filters, status: 'All' })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.role !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#204CC7]/[0.07] text-[#204CC7] text-caption font-medium">
                  {filters.role}
                  <button onClick={() => setFilters({ ...filters, role: 'All' })}><X className="w-3 h-3" /></button>
                </span>
              )}
              {filters.workstation !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#204CC7]/[0.07] text-[#204CC7] text-caption font-medium">
                  {filters.workstation}
                  <button onClick={() => setFilters({ ...filters, workstation: 'All' })}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Total Employees</p>
          <p className="text-black text-h1 font-semibold">{totalEmployees}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Confirmed</p>
          <p className="text-emerald-600 text-h1 font-semibold">{confirmedCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Probation</p>
          <p className="text-amber-600 text-h1 font-semibold">{probationCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Interns</p>
          <p className="text-[#204CC7] text-h1 font-semibold">{internCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Core Team</p>
          <p className="text-purple-600 text-h1 font-semibold">{coreTeamCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">CLA/NTF</p>
          <p className="text-rose-600 text-h1 font-semibold">{claCount}</p>
        </div>
      </div>

      {/* Incoming Employees Table */}
      {activeView === 'incoming' && (
        <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 bg-black/[0.01]">
                  <th className="pl-5 pr-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Code</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Name</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Department</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Role</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Joining Date</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody>
                {incomingEmployees.map((emp, index) => (
                  <tr key={emp.id} className={`border-b border-black/[0.04] last:border-0 transition-colors hover:bg-black/[0.015] ${index % 2 === 1 ? 'bg-black/[0.01]' : ''}`}>
                    <td className="pl-5 pr-3 py-3">
                      <span className="text-[#204CC7]/70 text-caption font-mono">{emp.code}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-black/[0.04] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-black/50 text-caption font-semibold">{emp.name.charAt(0)}</span>
                        </div>
                        <span className="text-black/85 text-caption font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-caption font-medium whitespace-nowrap ${getDepartmentColor(emp.department)}`}>{emp.department}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-caption font-medium bg-black/[0.03] text-black/70 whitespace-nowrap">{emp.role}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-black/50 text-caption whitespace-nowrap">{emp.joiningDate}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(
                              openDropdown?.id === emp.id && openDropdown?.field === 'incomingStatus'
                                ? null
                                : { id: emp.id, field: 'incomingStatus' }
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium border whitespace-nowrap transition-all cursor-pointer ${getIncomingStatusColor(emp.incomingStatus)}`}
                        >
                          <span>{emp.incomingStatus}</span>
                          <ChevronDown className="w-3 h-3 flex-shrink-0" />
                        </button>
                        {openDropdown?.id === emp.id && openDropdown?.field === 'incomingStatus' && (
                          <div className="absolute top-full left-0 mt-1 z-50 min-w-[150px]">
                            <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                              {(['Incoming', 'Backed Out', 'Active'] as IncomingStatus[]).map(s => (
                                <button
                                  key={s}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIncomingEmployees(prev => prev.map(ie => ie.id === emp.id ? { ...ie, incomingStatus: s } : ie));
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-caption hover:bg-black/[0.02] transition-all flex items-center gap-2 ${
                                    emp.incomingStatus === s ? 'font-medium' : 'text-black/70'
                                  }`}
                                >
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-caption font-medium border ${getIncomingStatusColor(s)}`}>{s}</span>
                                  {emp.incomingStatus === s && <Check className="w-3.5 h-3.5 text-[#204CC7] ml-auto" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 max-w-[280px]">
                      {emp.note ? (
                        <p className="text-caption text-black/55 leading-relaxed line-clamp-2">{emp.note}</p>
                      ) : (
                        <span className="text-caption text-black/25">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {incomingEmployees.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-black/10 mx-auto mb-3" />
              <p className="text-black/55 text-body">No incoming employees</p>
            </div>
          )}
        </div>
      )}

      {/* World-Class Table */}
      {activeView !== 'incoming' && (
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.01]">
                <th className="pl-5 pr-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Code</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Name</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Department</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Role</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Joined</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Onboarding</th>
                <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">{activeView === 'cla' ? 'Status' : 'Clients'}</th>
                {activeView === 'cla' && (
                  <th className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Reason/Brief</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((employee, index) => {
                const isFounder = employee.id === 1;
                return (
                <tr
                  key={employee.id}
                  onClick={() => !isFounder && setSelectedEmployee(employee)}
                  className={`border-b border-black/[0.04] last:border-0 transition-colors ${isFounder ? 'bg-black/[0.02] opacity-60 cursor-default' : 'hover:bg-black/[0.015] cursor-pointer group/row'}`}
                >
                  {/* Employee Code */}
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
                    {activeView === 'cla' || isFounder ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-caption font-medium whitespace-nowrap ${getDepartmentColor(employee.department)}`}>{employee.department}</span>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(
                              openDropdown?.id === employee.id && openDropdown?.field === 'department'
                                ? null
                                : { id: employee.id, field: 'department' }
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium whitespace-nowrap transition-all ${getDepartmentColor(employee.department)}`}
                        >
                          <span>{employee.department}</span>
                          <ChevronDown className="w-3 h-3 flex-shrink-0" />
                        </button>
                        {openDropdown?.id === employee.id && openDropdown?.field === 'department' && (
                          <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px]">
                            <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                              <div className="max-h-60 overflow-y-auto">
                                {DEPARTMENTS.map((dept) => (
                                  <button key={dept} onClick={() => updateEmployee(employee.id, 'department', dept)}
                                    className={`w-full text-left px-3 py-2 text-caption hover:bg-black/[0.02] transition-all ${employee.department === dept ? 'bg-[#204CC7]/5 text-[#204CC7] font-medium' : 'text-black/70'}`}>{dept}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-3 py-3">
                    {activeView === 'cla' || isFounder ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-caption font-medium bg-[#204CC7]/8 text-[#204CC7] whitespace-nowrap">{isFounder ? 'Founder & CEO' : employee.role}</span>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(
                              openDropdown?.id === employee.id && openDropdown?.field === 'role'
                                ? null
                                : { id: employee.id, field: 'role' }
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium bg-black/[0.03] text-black/70 hover:bg-black/[0.06] whitespace-nowrap transition-all"
                        >
                          <span>{employee.role}</span>
                          <ChevronDown className="w-3 h-3 flex-shrink-0" />
                        </button>
                        {openDropdown?.id === employee.id && openDropdown?.field === 'role' && (
                          <div className="absolute top-full left-0 mt-1 z-50 min-w-[200px]">
                            <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                              <div className="max-h-60 overflow-y-auto">
                                {ROLES.map((role) => (
                                  <button key={role} onClick={() => updateEmployee(employee.id, 'role', role)}
                                    className={`w-full text-left px-3 py-2 text-caption hover:bg-black/[0.02] transition-all ${employee.role === role ? 'bg-[#204CC7]/5 text-[#204CC7] font-medium' : 'text-black/70'}`}>{role}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="px-3 py-3">
                    <span className="text-black/50 text-caption whitespace-nowrap">{employee.joiningDate}</span>
                  </td>

                  {/* Onboarding Status */}
                  <td className="px-3 py-3">
                    {isFounder ? (
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${
                        employee.onboardingStatus === 'Onboarded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        employee.onboardingStatus === 'Settled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{employee.onboardingStatus}</span>
                    ) : (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(
                              openDropdown?.id === employee.id && openDropdown?.field === 'onboardingStatus'
                                ? null
                                : { id: employee.id, field: 'onboardingStatus' }
                            );
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium border cursor-pointer transition-all hover:shadow-sm ${
                            employee.onboardingStatus === 'Onboarded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            employee.onboardingStatus === 'Settled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          aria-expanded={openDropdown?.id === employee.id && openDropdown?.field === 'onboardingStatus'}
                          aria-haspopup="listbox"
                        >
                          <span>{employee.onboardingStatus}</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${openDropdown?.id === employee.id && openDropdown?.field === 'onboardingStatus' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown?.id === employee.id && openDropdown?.field === 'onboardingStatus' && (
                          <div className="absolute top-full left-0 mt-1 z-50 min-w-[150px]">
                            <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                              <div className="py-1">
                                {(['Onboarded', 'Settled', 'Unsettled'] as const).map((opt) => (
                                  <button
                                    key={opt}
                                    role="option"
                                    aria-selected={employee.onboardingStatus === opt}
                                    onClick={(e) => { e.stopPropagation(); updateEmployee(employee.id, 'onboardingStatus', opt); }}
                                    className={`w-full text-left px-3 py-2 text-caption transition-all flex items-center justify-between ${
                                      employee.onboardingStatus === opt ? 'bg-[#204CC7]/5 font-medium' : 'hover:bg-black/[0.02]'
                                    }`}
                                  >
                                    <span className={`px-2 py-0.5 rounded-md text-caption font-medium border ${
                                      opt === 'Onboarded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      opt === 'Settled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>{opt}</span>
                                    {employee.onboardingStatus === opt && <Check className="w-3.5 h-3.5 text-[#204CC7]" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Clients / Status */}
                  <td className="px-3 py-3">
                    {activeView === 'cla' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = employee.claType === 'CLA' ? 'NTF' : 'CLA';
                          updateEmployee(employee.id, 'claType', next);
                        }}
                        className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border cursor-pointer transition-all ${
                          employee.claType === 'CLA' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                          employee.claType === 'NTF' ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' :
                          'bg-black/[0.03] text-black/50 border-black/10 hover:bg-black/[0.05]'
                        }`}>{employee.claType || '—'}</button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssignModalEmployee(employee); setAssignSearch(''); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 whitespace-nowrap transition-all"
                      >
                        <span>
                          {employee.role === 'Admin'
                            ? 'All'
                            : employee.assignedClients.length > 0
                              ? employee.assignedClients[0]
                              : 'Assign'}
                        </span>
                        {employee.assignedClients.length > 1 && (
                          <span className="text-blue-500 text-caption font-semibold">+{employee.assignedClients.length - 1}</span>
                        )}
                        <ChevronDown className="w-3 h-3 flex-shrink-0" />
                      </button>
                    )}
                  </td>

                  {/* Reason/Brief - Only for CLA view (read-only) */}
                  {activeView === 'cla' && (
                    <td className="px-3 py-3 max-w-[320px]">
                      {employee.claReason ? (
                        <p className="text-caption text-red-700 leading-relaxed line-clamp-2 bg-red-50 rounded-lg px-3 py-1.5">{employee.claReason}</p>
                      ) : (
                        <p className="text-caption text-black/30">—</p>
                      )}
                    </td>
                  )}
                </tr>
              ); })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {displayedEmployees.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/55 text-body">No employees found</p>
          </div>
        )}
      </div>
      )}

      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-black/5 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#204CC7]" />
                </div>
                <div>
                  <h3 className="text-black font-semibold">{isAddingCLA ? 'Add to CLA/NTF' : 'Add New Employee'}</h3>
                  <p className="text-black/50 text-caption mt-0.5">
                    {isAddingCLA ? 'Select an employee and provide a reason for CLA/NTF status' : 'Fill in the details to add a new employee'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* CLA Type + Reason Section - Only show when adding CLA */}
              {isAddingCLA && (
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
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Reason/Brief</h4>
                    </div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Why is this employee being added to CLA/NTF? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={claForm.reason}
                      onChange={(e) => setClaForm({ ...claForm, reason: e.target.value })}
                      placeholder="e.g., Performance issues - Not meeting monthly targets for 3 consecutive months"
                      className="w-full h-28 px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none"
                    />
                    <p className="text-caption text-black/55 mt-1.5">Provide detailed context for documentation and review purposes</p>
                  </div>
                </div>
              )}

              {/* Auto-Populated Section */}
              <div className="bg-gradient-to-br from-[#204CC7]/5 to-blue-50 border border-[#204CC7]/20 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Employee Code - Auto Generated */}
                  <div>
                    <label className="block text-caption font-medium text-black/50 mb-1.5 uppercase tracking-wide">
                      Employee Code
                    </label>
                    <div className="px-3 py-2.5 text-body border border-[#204CC7]/20 rounded-xl bg-white/50 text-black/60 font-mono flex items-center gap-2">
                      <span>{newEmployee.code}</span>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>

                  {/* Joining Date - Auto Generated */}
                  <div>
                    <label className="block text-caption font-medium text-black/50 mb-1.5 uppercase tracking-wide">
                      Joining Date
                    </label>
                    <div className="px-3 py-2.5 text-body border border-[#204CC7]/20 rounded-xl bg-white/50 text-black/60 flex items-center gap-2">
                      <span>{newEmployee.joiningDate}</span>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-black/55" />
                  <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Personal Information</h4>
                </div>
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      placeholder="e.g., John Doe"
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      placeholder="e.g., john@bregobusiness.com"
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Role & Department Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-black/55" />
                  <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Position Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Role */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Role
                    </label>
                    <select
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value, department: e.target.value === 'Admin' ? 'All' : newEmployee.department })}
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={newEmployee.designation}
                      onChange={(e) => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                      placeholder="e.g. Marketing Executive"
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Department
                    </label>
                    <select
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      disabled={newEmployee.role === 'Admin'}
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all disabled:bg-black/5 disabled:cursor-not-allowed appearance-none cursor-pointer"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Workstation */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Workstation
                    </label>
                    <select
                      value={newEmployee.workstation}
                      onChange={(e) => setNewEmployee({ ...newEmployee, workstation: e.target.value })}
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      {WORKSTATIONS.map((station) => (
                        <option key={station} value={station}>{station}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reporting Manager */}
                  <div>
                    <label className="block text-caption font-medium text-black/70 mb-2">
                      Reporting Manager
                    </label>
                    <select
                      value={newEmployee.reportingManager}
                      onChange={(e) => setNewEmployee({ ...newEmployee, reportingManager: e.target.value })}
                      className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                    >
                      {REPORTING_MANAGERS.map((manager) => (
                        <option key={manager} value={manager}>{manager}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Employment Status Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-black/55" />
                  <h4 className="text-caption font-semibold text-black/70 uppercase tracking-wide">Employment Status</h4>
                </div>
                <div>
                  <label className="block text-caption font-medium text-black/70 mb-2">
                    Status
                  </label>
                  <select
                    value={newEmployee.status}
                    onChange={(e) => setNewEmployee({ ...newEmployee, status: e.target.value as 'Confirmed' | 'Probation' | 'Intern' })}
                    className="w-full px-3 py-2.5 text-body border border-black/10 rounded-xl bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Role Notice */}
              {newEmployee.role === 'Admin' && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-caption text-blue-900 font-semibold mb-1">Admin Role Privileges</p>
                    <p className="text-caption text-blue-700 leading-relaxed">
                      This employee will have full access to all departments and clients. Department is automatically set to "All" and cannot be changed.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-black/5 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="px-4 py-2.5 text-body text-black/70 hover:text-black hover:bg-black/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2.5 text-body bg-[#204CC7] text-white rounded-xl hover:bg-[#1a3d9f] transition-all font-medium"
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Incoming Employee Modal */}
      {showAddIncomingModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddIncomingModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#204CC7]" />
                </div>
                <div>
                  <h3 className="text-black font-semibold">Add Incoming Employee</h3>
                  <p className="text-black/50 text-caption mt-0.5">Track a new hire expected to join</p>
                </div>
              </div>
              <button onClick={() => setShowAddIncomingModal(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Full Name <span className="text-[#E2445C]">*</span></label>
                <input
                  type="text"
                  value={incomingForm.name}
                  onChange={e => { setIncomingForm(f => ({ ...f, name: e.target.value })); setIncomingFormErrors(fe => ({ ...fe, name: false })); }}
                  placeholder="e.g., Jyoti Rane"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all ${
                    incomingFormErrors.name ? 'border-[#E2445C] bg-rose-50/30' : 'border-black/10'
                  }`}
                />
                {incomingFormErrors.name && <p className="text-caption font-medium text-[#E2445C] mt-1">Name is required</p>}
              </div>

              {/* Department + Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Department</label>
                  <select
                    value={incomingForm.department}
                    onChange={e => setIncomingForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Role</label>
                  <select
                    value={incomingForm.role}
                    onChange={e => setIncomingForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {ROLES.filter(r => r !== 'Admin').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Expected Joining Date</label>
                <input
                  type="text"
                  value={incomingForm.joiningDate}
                  onChange={e => setIncomingForm(f => ({ ...f, joiningDate: e.target.value }))}
                  placeholder="e.g., 15th May, 2026 or TBD"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
                />
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Note</label>
                <textarea
                  value={incomingForm.note}
                  onChange={e => setIncomingForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g., Offered ₹33.2K, documents pending, referred by Pooja..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between">
              <button onClick={() => setShowAddIncomingModal(false)} className="px-4 py-2.5 rounded-lg border border-black/10 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!incomingForm.name.trim()) {
                    setIncomingFormErrors({ name: true });
                    return;
                  }
                  const nextId = Math.max(...incomingEmployees.map(e => e.id), 200) + 1;
                  const nextCode = `BRG${String(Math.max(...incomingEmployees.map(e => parseInt(e.code.replace('BRG', ''), 10)), 27) + 1).padStart(3, '0')}`;
                  setIncomingEmployees(prev => [
                    ...prev,
                    {
                      id: nextId,
                      code: nextCode,
                      name: incomingForm.name.trim(),
                      department: incomingForm.department,
                      role: incomingForm.role,
                      joiningDate: incomingForm.joiningDate.trim() || 'TBD',
                      incomingStatus: 'Incoming',
                      note: incomingForm.note.trim() || undefined,
                    },
                  ]);
                  setIncomingForm({ name: '', department: 'Finance', role: 'Executive', joiningDate: '', note: '' });
                  setIncomingFormErrors({ name: false });
                  setShowAddIncomingModal(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-[#204CC7] text-white hover:bg-[#1a3d9f] transition-all text-caption font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Assignment Modal removed — now inline in drawer */}

      {/* Pending Invites Modal */}
      {showPendingInvites && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPendingInvites(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="invite-modal-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FDAB3D]/10 flex items-center justify-center" aria-hidden="true">
                  <Mail className="w-5 h-5 text-[#FDAB3D]" />
                </div>
                <div>
                  <h3 id="invite-modal-title" className="text-black text-h3 font-semibold">Pending Invites</h3>
                  <p className="text-black/60 text-caption mt-0.5">
                    {pendingInvites.filter(i => i.status === 'Pending').length} pending · {pendingInvites.filter(i => i.status === 'Expired').length} expired
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPendingInvites(false)} aria-label="Close pending invites"
                className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-black/60" />
              </button>
            </div>

            {/* Invite List */}
            <div className="flex-1 overflow-y-auto">
              {pendingInvites.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle className="w-12 h-12 text-[#00C875]/40 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-black/75 text-body font-medium">All caught up!</p>
                  <p className="text-black/55 text-caption mt-1">No pending invites right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-black/[0.06]">
                  {pendingInvites.map(invite => {
                    const days = daysAgo(invite.invitedOn);
                    const isExpired = invite.status === 'Expired';
                    return (
                      <div key={invite.id} className={`px-6 py-4 ${isExpired ? 'bg-black/[0.015]' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: Person info */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isExpired ? 'bg-black/[0.05]' : 'bg-[#204CC7]/[0.08]'}`} aria-hidden="true">
                              <span className={`text-caption font-semibold ${isExpired ? 'text-black/50' : 'text-[#204CC7]'}`}>{invite.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-body font-medium truncate ${isExpired ? 'text-black/55' : 'text-black/85'}`}>{invite.name}</p>
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0 ${isExpired ? 'bg-[#E2445C]/10 text-[#D03030]' : 'bg-[#FDAB3D]/15 text-[#B07415]'}`}>
                                  {isExpired ? 'Expired' : 'Pending'}
                                </span>
                              </div>
                              <p className={`text-caption truncate mt-0.5 ${isExpired ? 'text-black/45' : 'text-black/55'}`}>{invite.email}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-caption text-black/55">{invite.role}</span>
                                <span className="text-black/25">·</span>
                                <span className="text-caption text-black/55">{invite.department}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Time + Actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <p className="text-caption text-black/55">{days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}</p>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPendingInvites(prev => prev.map(i => i.id === invite.id ? { ...i, status: 'Pending', invitedOn: new Date().toISOString().split('T')[0] } : i));
                                }}
                                aria-label={`Resend invite to ${invite.name}`}
                                title="Resend invite"
                                className="w-8 h-8 rounded-lg border border-black/10 hover:bg-[#204CC7]/[0.05] hover:border-[#204CC7]/20 flex items-center justify-center transition-all group">
                                <RotateCcw className="w-3.5 h-3.5 text-black/45 group-hover:text-[#204CC7]" />
                              </button>
                              <button
                                onClick={() => {
                                  setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
                                }}
                                aria-label={`Revoke invite for ${invite.name}`}
                                title="Revoke invite"
                                className="w-8 h-8 rounded-lg border border-black/10 hover:bg-[#E2445C]/[0.05] hover:border-[#E2445C]/20 flex items-center justify-center transition-all group">
                                <Trash2 className="w-3.5 h-3.5 text-black/45 group-hover:text-[#E2445C]" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-caption text-black/50 mt-2 pl-12">Invited by {invite.invitedBy}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-black/[0.06] flex-shrink-0">
              <button onClick={() => setShowPendingInvites(false)}
                className="w-full px-3 py-2.5 border border-black/10 text-black/70 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissions && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPermissions(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-black/[0.06] flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-black text-h3 font-semibold">Role Permissions</h3>
                  <p className="text-caption text-black/50 mt-0.5">Control what each role can do across the platform</p>
                </div>
                <button onClick={() => setShowPermissions(false)} aria-label="Close permissions"
                  className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-black/40 hover:text-black/70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Column Headers */}
              <div className="grid grid-cols-[1fr_72px_72px_72px_72px_72px] gap-0 pb-2 mb-1 border-b border-black/[0.06]">
                <span className="text-caption font-semibold text-black/40">Module</span>
                {['Admin', 'HOD', 'Manager', 'Executive', 'Intern'].map(role => (
                  <span key={role} className="text-caption font-semibold text-black/40 text-center">{role}</span>
                ))}
              </div>

              {/* Permission Rows */}
              {[
                {
                  module: 'Client Channels',
                  icon: MessageSquare,
                  desc: 'Message & call clients in Inbox',
                  admin: 'full', hod: 'full', manager: 'full', executive: 'view', others: 'view',
                },
                {
                  module: 'Internal Channels',
                  icon: Users,
                  desc: 'Team messaging & huddles',
                  admin: 'full', hod: 'full', manager: 'full', executive: 'full', others: 'full',
                },
                {
                  module: 'Client Tasks',
                  icon: ListTodo,
                  desc: 'Create & manage client tasks',
                  admin: 'full', hod: 'full', manager: 'full', executive: 'view', others: 'none',
                },
                {
                  module: 'Dataroom',
                  icon: FolderOpen,
                  desc: 'Upload & manage client files',
                  admin: 'full', hod: 'full', manager: 'full', executive: 'view', others: 'view',
                },
                {
                  module: 'Reports',
                  icon: BarChart3,
                  desc: 'View & export reports',
                  admin: 'full', hod: 'full', manager: 'view', executive: 'view', others: 'none',
                },
                {
                  module: 'Adminland',
                  icon: Settings,
                  desc: 'Employee mgmt, incidents, billing',
                  admin: 'full', hod: 'view', manager: 'none', executive: 'none', others: 'none',
                },
                {
                  module: 'Onboarding',
                  icon: Briefcase,
                  desc: 'Manage client onboarding',
                  admin: 'full', hod: 'full', manager: 'full', executive: 'view', others: 'none',
                },
              ].map((row) => {
                const Icon = row.icon;
                const levels = [row.admin, row.hod, row.manager, row.executive, row.others];
                return (
                  <div key={row.module} className="grid grid-cols-[1fr_72px_72px_72px_72px_72px] gap-0 py-3 border-b border-black/[0.03] items-center">
                    {/* Module info */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-black/[0.03] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-black/40" />
                      </div>
                      <div>
                        <p className="text-body font-medium text-black/75">{row.module}</p>
                        <p className="text-caption text-black/40">{row.desc}</p>
                      </div>
                    </div>
                    {/* Access levels */}
                    {levels.map((level, i) => (
                      <div key={i} className="flex justify-center">
                        {level === 'full' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold leading-none">
                            Full
                          </span>
                        ) : level === 'view' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[11px] font-semibold leading-none">
                            View
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.03] text-black/25 text-[11px] font-semibold leading-none">
                            None
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-black/[0.04]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[11px] font-semibold leading-none">Full</span>
                  <span className="text-caption text-black/40">Create, edit, delete</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[11px] font-semibold leading-none">View</span>
                  <span className="text-caption text-black/40">Read only</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/[0.03] text-black/25 text-[11px] font-semibold leading-none">None</span>
                  <span className="text-caption text-black/40">No access</span>
                </div>
              </div>

              {/* Key Rule Callout */}
              <div className="mt-4 px-4 py-3 rounded-xl bg-[#F6F7FF] border border-[#204CC7]/10">
                <div className="flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#204CC7] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-body font-medium text-[#204CC7]">Client communication is restricted</p>
                    <p className="text-caption text-black/50 mt-0.5">Only Admins, HODs, and Managers can message or call clients in Inbox. Executives and other roles have view-only access to client channels, tasks, and files.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-black/[0.06] flex-shrink-0">
              <button onClick={() => setShowPermissions(false)}
                className="w-full px-3 py-2.5 border border-black/10 text-black/70 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => { setSelectedEmployee(null); setAssignModalEmployee(null); }}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-black/10 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-h2 font-semibold text-black">Employee Details</h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEmployee(null);
                  setAssignModalEmployee(null);
                }}
                className="w-8 h-8 rounded-lg border border-black/10 hover:bg-black/5 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Employee Card */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-black/5 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-black/50 text-h2 font-medium">{selectedEmployee.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-h3 font-semibold text-black">{selectedEmployee.name}</h3>
                  {selectedEmployee.designation && (
                    <p className="text-body text-black/70 mt-0.5">{selectedEmployee.designation}</p>
                  )}
                  <p className={`text-caption text-black/40 ${selectedEmployee.designation ? 'mt-0.5' : 'mt-1'}`}>
                    {selectedEmployee.code} • {selectedEmployee.role}
                  </p>
                </div>
              </div>

              {selectedEmployee.role === 'Admin' ? (
                // ADMIN/FOUNDER SPECIAL VIEW
                <>
                  {/* Founder Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 text-caption font-medium rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                      Founder & CEO
                    </span>
                    <span className="px-3 py-1.5 text-caption font-medium rounded-lg bg-black/5 text-black/70 border border-black/10">
                      Master Admin
                    </span>
                  </div>

                  {/* Basic Information - Simplified for Admin */}
                  <div className="bg-[#F6F7FF] rounded-lg p-4">
                    <h3 className="text-body font-semibold text-black mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Workstation</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Building2 className="w-4 h-4 text-black/55" />
                          {selectedEmployee.workstation}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">House</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Home className="w-4 h-4 text-black/55" />
                          {selectedEmployee.house}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Reporting Manager</p>
                        <div className="flex items-center gap-2 text-body text-black/55">
                          <User className="w-4 h-4 text-black/55" />
                          -
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Department</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Briefcase className="w-4 h-4 text-black/55" />
                          {selectedEmployee.department}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // REGULAR EMPLOYEE VIEW
                <>
                  {/* Status Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1.5 text-caption font-medium rounded-lg ${
                      selectedEmployee.status === 'Confirmed' ? 'bg-emerald-500 text-white' :
                      selectedEmployee.status === 'Probation' ? 'bg-amber-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {selectedEmployee.status}
                    </span>
                    {selectedEmployee.coreTeam && (
                      <span className="px-3 py-1.5 text-caption font-medium rounded-lg bg-black/5 text-black/70 border border-black/10">
                        Core Team
                      </span>
                    )}
                    <span className={`px-3 py-1.5 text-caption font-medium rounded-lg ${
                      selectedEmployee.onboardingStatus === 'Onboarded' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedEmployee.onboardingStatus === 'Settled' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {selectedEmployee.onboardingStatus}
                    </span>
                    {selectedEmployee.isCLA && (
                      <span className={`px-3 py-1.5 text-caption font-medium rounded-lg text-white ${
                        selectedEmployee.claType === 'NTF' ? 'bg-[#E2445C]' : 'bg-amber-500'
                      }`}>
                        {selectedEmployee.claType || 'CLA/NTF'}
                      </span>
                    )}
                  </div>

                  {/* CLA Reason Banner */}
                  {selectedEmployee.isCLA && selectedEmployee.claReason && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-[#E2445C]/[0.05] border border-[#E2445C]/15 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-[#E2445C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-caption font-semibold text-[#E2445C] mb-0.5">{selectedEmployee.claType || 'CLA/NTF'} Reason</p>
                        <p className="text-caption text-black/60 leading-relaxed">{selectedEmployee.claReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="bg-[#F6F7FF] rounded-lg p-4">
                    <h3 className="text-body font-semibold text-black mb-3">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Workstation</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Building2 className="w-4 h-4 text-black/55" />
                          {selectedEmployee.workstation}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">House</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Home className="w-4 h-4 text-black/55" />
                          {selectedEmployee.house}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Reporting Manager</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <User className="w-4 h-4 text-black/55" />
                          {selectedEmployee.reportingManager}
                        </div>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Department</p>
                        <div className="flex items-center gap-2 text-body text-black">
                          <Briefcase className="w-4 h-4 text-black/55" />
                          {selectedEmployee.department}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Clients — with inline manage panel */}
                  <div className="bg-[#F6F7FF] rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-body font-semibold text-black">Assigned Clients</h3>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          if (assignModalEmployee?.id === selectedEmployee.id) {
                            setAssignModalEmployee(null);
                          } else {
                            setAssignModalEmployee(selectedEmployee);
                            setAssignSearch('');
                          }
                        }}
                          className={`text-caption font-medium transition-all ${assignModalEmployee?.id === selectedEmployee.id ? 'text-black/45 hover:text-black/60' : 'text-[#204CC7] hover:text-[#1a3d9f]'}`}>
                          {assignModalEmployee?.id === selectedEmployee.id ? 'Close' : 'Manage'}
                        </button>
                      </div>
                      {selectedEmployee.assignedClients.filter(c => c !== 'All').length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedEmployee.assignedClients.filter(c => c !== 'All').map((clientName) => {
                            const clientInfo = AVAILABLE_CLIENTS.find(c => c.name === clientName);
                            const isPM = clientInfo?.service === 'Performance Marketing';
                            return (
                              <span
                                key={clientName}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-caption font-medium rounded-lg ${
                                  isPM ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'bg-[#06B6D4]/10 text-[#06B6D4]'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${isPM ? 'bg-[#7C3AED]' : 'bg-[#06B6D4]'}`} />
                                {clientName}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-caption text-black/45">No clients assigned</p>
                      )}
                    </div>

                    {/* Inline Client Assignment Panel */}
                    {assignModalEmployee?.id === selectedEmployee.id && (() => {
                      const emp = employees.find(e => e.id === selectedEmployee.id) ?? selectedEmployee;
                      const assignedSet = new Set(emp.assignedClients);
                      const searchLower = assignSearch.toLowerCase();
                      const filteredClients = AVAILABLE_CLIENTS.filter(c => c.name.toLowerCase().includes(searchLower));
                      const pmClients = filteredClients.filter(c => c.service === 'Performance Marketing');
                      const atClients = filteredClients.filter(c => c.service === 'Accounts & Taxation');
                      const pmAssignedCount = AVAILABLE_CLIENTS.filter(c => c.service === 'Performance Marketing' && assignedSet.has(c.name)).length;
                      const atAssignedCount = AVAILABLE_CLIENTS.filter(c => c.service === 'Accounts & Taxation' && assignedSet.has(c.name)).length;

                      const toggleAll = (service: 'Performance Marketing' | 'Accounts & Taxation') => {
                        const serviceClients = AVAILABLE_CLIENTS.filter(c => c.service === service).map(c => c.name);
                        const allAssigned = serviceClients.every(name => assignedSet.has(name));
                        setEmployees(prev => prev.map(e => {
                          if (e.id !== emp.id) return e;
                          const updated = allAssigned
                            ? e.assignedClients.filter(c => !serviceClients.includes(c))
                            : [...new Set([...e.assignedClients, ...serviceClients])];
                          return { ...e, assignedClients: updated };
                        }));
                      };

                      const InlineClientRow = ({ client }: { client: ClientInfo }) => {
                        const isAssigned = assignedSet.has(client.name);
                        return (
                          <button onClick={() => toggleClientAssignment(emp.id, client.name)}
                            className={`w-full flex items-center gap-3 px-4 py-2 transition-all rounded-lg ${isAssigned ? 'bg-[#204CC7]/[0.05]' : 'hover:bg-white/60'}`}>
                            <div className={`w-[16px] h-[16px] rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isAssigned ? 'border-[#204CC7] bg-[#204CC7]' : 'border-black/20'}`}>
                              {isAssigned && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={`text-caption flex-1 text-left ${isAssigned ? 'text-black font-medium' : 'text-black/60'}`}>{client.name}</span>
                          </button>
                        );
                      };

                      return (
                        <div className="border-t border-black/[0.06]">
                          {/* Search */}
                          <div className="px-4 pt-3 pb-2">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="text" placeholder="Search clients..." value={assignSearch}
                                onChange={e => setAssignSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
                                autoFocus
                              />
                            </div>
                          </div>

                          {/* Client List */}
                          <div className="max-h-[240px] overflow-y-auto px-2 pb-2">
                            {filteredClients.length === 0 ? (
                              <div className="py-6 text-center">
                                <p className="text-black/40 text-caption">No clients match your search</p>
                              </div>
                            ) : (
                              <>
                                {pmClients.length > 0 && (
                                  <div>
                                    <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                                        <span className="text-[11px] font-semibold text-black/60">Performance Marketing</span>
                                        <span className="text-[11px] text-black/30">{pmAssignedCount}/{pmClients.length}</span>
                                      </div>
                                      <button onClick={() => toggleAll('Performance Marketing')}
                                        className="text-[11px] font-medium text-[#204CC7] hover:text-[#1a3d9f] transition-all">
                                        {pmClients.every(c => assignedSet.has(c.name)) ? 'Deselect all' : 'Select all'}
                                      </button>
                                    </div>
                                    {pmClients.map(client => <InlineClientRow key={client.name} client={client} />)}
                                  </div>
                                )}
                                {atClients.length > 0 && (
                                  <div className={pmClients.length > 0 ? 'border-t border-black/[0.04] mt-1 pt-1' : ''}>
                                    <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                                        <span className="text-[11px] font-semibold text-black/60">Accounts & Taxation</span>
                                        <span className="text-[11px] text-black/30">{atAssignedCount}/{atClients.length}</span>
                                      </div>
                                      <button onClick={() => toggleAll('Accounts & Taxation')}
                                        className="text-[11px] font-medium text-[#204CC7] hover:text-[#1a3d9f] transition-all">
                                        {atClients.every(c => assignedSet.has(c.name)) ? 'Deselect all' : 'Select all'}
                                      </button>
                                    </div>
                                    {atClients.map(client => <InlineClientRow key={client.name} client={client} />)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Footer actions */}
                          <div className="px-4 py-2.5 border-t border-black/[0.06] flex items-center justify-between">
                            {emp.assignedClients.filter(c => c !== 'All').length > 0 ? (
                              <button onClick={() => clearAllClients(emp.id)} className="text-[11px] text-[#E2445C] font-medium hover:text-[#d13a4f] transition-all">
                                Remove All
                              </button>
                            ) : <div />}
                            <button onClick={() => setAssignModalEmployee(null)}
                              className="px-4 py-1.5 bg-[#204CC7] text-white rounded-lg text-caption font-medium hover:bg-[#1a3d9f] transition-all">
                              Done
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Relationship Status */}
                  <div className="bg-[#F6F7FF] rounded-lg p-4">
                    <h3 className="text-body font-semibold text-black mb-3">Relationship Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body text-black/70">Relationship with Tejas</span>
                        <EditablePill value={selectedEmployee.relationshipTejas} options={RELATIONSHIP_OPTIONS} employeeId={selectedEmployee.id} field="relationshipTejas" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onUpdate={(id, f, v) => updateEmployee(id, f as keyof Employee, v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body text-black/70">Relationship with HOD</span>
                        <EditablePill value={selectedEmployee.relationshipHOD} options={RELATIONSHIP_OPTIONS} employeeId={selectedEmployee.id} field="relationshipHOD" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onUpdate={(id, f, v) => updateEmployee(id, f as keyof Employee, v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-body text-black/70">Relationship with HR</span>
                        <EditablePill value={selectedEmployee.hrRelationship} options={RELATIONSHIP_OPTIONS} employeeId={selectedEmployee.id} field="hrRelationship" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onUpdate={(id, f, v) => updateEmployee(id, f as keyof Employee, v)} />
                      </div>
                    </div>
                  </div>

                  {/* Compensation & Appraisal */}
                  <div className="bg-[#F6F7FF] rounded-lg p-4">
                    <h3 className="text-body font-semibold text-black mb-3">Compensation & Appraisal</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Joining Month</p>
                        <p className="text-body font-medium text-black">{selectedEmployee.joiningDate}</p>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Date of Appraisal</p>
                        <p className="text-body font-medium text-black">2023-06-01</p>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">Current Monthly Salary</p>
                        <p className="text-h2 font-semibold text-black">₹{selectedEmployee.monthlySalary.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-caption text-black/50 mb-1.5">To be Offered Salary</p>
                        <p className="text-h2 font-semibold text-emerald-600">
                          ₹{Math.round(selectedEmployee.monthlySalary * 1.1).toLocaleString()} 
                          <span className="text-caption ml-1">(10.29%)</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Core Skills & Performance */}
                  <div className="bg-[#F6F7FF] rounded-lg p-4">
                    <h3 className="text-body font-semibold text-black mb-3">Core Skills & Performance</h3>
                    <div className="space-y-2.5">
                      {([
                        ['Communication', 'communication'],
                        ['Business Knowledge', 'businessKnowledge'],
                        ['Situation Handling', 'situationHandling'],
                        ['Excel/Google Sheets', 'excelSkill'],
                        ['Technology Knowledge', 'techKnowledge'],
                      ] as [string, keyof Employee][]).map(([label, field]) => (
                        <div key={field} className="flex items-center justify-between">
                          <span className="text-body text-black/70">{label}</span>
                          <EditablePill value={selectedEmployee[field] as string} options={SKILL_OPTIONS} employeeId={selectedEmployee.id} field={field} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onUpdate={(id, f, v) => updateEmployee(id, f as keyof Employee, v)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Marketing Skills - Department Specific */}
                  {selectedEmployee.department === 'Performance Marketing' && (
                    <div className="bg-[#F6F7FF] rounded-lg p-4">
                      <h3 className="text-body font-semibold text-black mb-3">Performance Marketing Skills</h3>
                      <div className="space-y-2.5">
                        {([
                          ['Campaign Optimization', 'campaignOptimization'],
                          ['Website Audit', 'websiteAudit'],
                          ['Media Planning & Strategy', 'mediaPlanningStrategy'],
                          ['Ad Creative Understanding', 'adCreativeUnderstanding'],
                          ['Industry Knowledge', 'industryKnowledge'],
                          ['Google Platform', 'googlePlatform'],
                        ] as [string, keyof Employee][]).map(([label, field]) => (
                          <div key={field} className="flex items-center justify-between">
                            <span className="text-body text-black/70">{label}</span>
                            <EditablePill value={selectedEmployee[field] as string} options={RELATIONSHIP_OPTIONS} employeeId={selectedEmployee.id} field={field} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} onUpdate={(id, f, v) => updateEmployee(id, f as keyof Employee, v)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remove from CLA/NTF action */}
                  {selectedEmployee.isCLA && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? { ...emp, isCLA: false, claReason: '' } : emp));
                        setSelectedEmployee({ ...selectedEmployee, isCLA: false, claReason: '' });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-[#00C875]/30 bg-[#00C875]/[0.05] text-[#00C875] hover:bg-[#00C875]/[0.1] transition-all text-body font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Remove from CLA/NTF
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}