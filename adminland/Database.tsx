'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Search, Filter, Download, Plus, X, ChevronDown, Check, MoreVertical,
  Building2, User, Mail, Phone, MapPin, Calendar, Briefcase, Users,
  ArrowUpDown, Eye, Archive, Clock, IndianRupee, ExternalLink,
  UserPlus, FileText, ChevronRight, Star, Tag, Globe, Hash,
  Send, AlertCircle, AlertTriangle, CheckCircle, CheckCircle2, Circle,
  Timer, Layers, Upload, Trash2, Shield, Sparkles, ArrowRight,
} from 'lucide-react';
import { AddToCLA } from './AddToCLA';
import { NewResourceRequestModal } from './NewResourceRequestModal';
import { useModalA11y } from '@/lib/use-modal-a11y';
import {
  useResourceRequests,
  updateResourceRequestStatus,
  updateResourceRequestRecruiter,
  approveResourceRequest,
  rejectResourceRequest,
  RECRUITERS,
  type RequestStatus,
  type RequestPriority,
  type ResourceRequest,
  type RecruiterName,
} from './resource-requests-store';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

type DatabaseTab = 'customers' | 'employees' | 'resource-request';

// ── Customers ──
export type CustomerStatus = 'Active' | 'Inactive';
export type CustomerService = 'Performance Marketing' | 'Accounts & Taxation' | 'Both';

interface TeamMemberDB {
  name: string;
  role: string;
  color: string;
}

export type PaymentTerms = 'Prepaid' | 'Postpaid';
// Five-tier delivery hierarchy used for staffing each customer's
// account. `podHead` (formerly "HOD Team Member") is the HOD's right
// hand on the engagement; `manager` and `assistantManager` are the
// day-to-day delivery leads; `executive` owns execution.
type TeamRoleKey = 'hod' | 'podHead' | 'manager' | 'assistantManager' | 'executive';
// Three-tier health rating for customer relationships, synced from
// the Client app. Kept intentionally short: stakeholders get an
// at-a-glance read without parsing four similar-sounding adjectives.
type RelationshipLevel = 'Excellent' | 'Good' | 'Needs Attention';

interface TeamSlot {
  name: string;  // '' = unassigned
  hours: number;
}

interface TeamStructure {
  hod: TeamSlot;
  podHead: TeamSlot;            // Senior delivery (was "HOD Team Member")
  manager: TeamSlot;
  assistantManager: TeamSlot;
  executive: TeamSlot;
}

interface KeyRelationship {
  name: string;
  role: string;     // 'COO' | 'SEM HOD' | 'A&T HOD'
  status: RelationshipLevel;
}

export interface Customer {
  id: string;
  customerId: string;        // Person-level grouping key (one person can own multiple businesses)
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  service: CustomerService;
  status: CustomerStatus;
  joinedDate: string;
  exitDate: string | null;
  monthlyRetainer: number;
  sector: string;
  assignedTeam: string[];
  location: string;
  totalRevenue: number;
  lastActivityDate: string;
  // Enriched fields
  address: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  businessModel: string;
  businessSize: string;
  channel: string;
  relationshipStatus: RelationshipLevel;
  onboardingProgress: number;
  onboardingStage: string;
  slaStatus: 'Active' | 'Inactive';
  paymentMethod: string;
  kickoffDate: string;
  mainServiceHead: string;
  teamDetails: TeamMemberDB[];
  invoicesPaid: number;
  invoicesPending: number;
  pendingAmount: number;
  notes: string;
  // Extended admin fields
  brandName: string;
  subSector: string;
  finalBilling: number;
  paymentTerms: PaymentTerms;
  teamStructure: TeamStructure;
  keyRelationships: KeyRelationship[];
  // A&T subscription tier — only meaningful when the customer's
  // service includes Accounts & Taxation. Optional because pure SEM
  // customers don't subscribe to an A&T plan. Defaults to 'Growing
  // Business' (the most common tier) when missing for an A&T-eligible
  // customer; admins flip via the Change-plan modal on the Overview
  // and Financials tabs.
  atPlan?: ATPlan;
}

// ── A&T plans (subscription tiers on the client-facing app) ──
//
// Brego sells A&T in three tiers, gated by transaction volume per
// month. Setup fee + monthly fee are fixed for the first two; the
// Enterprise tier is custom-priced via Sales. Mirrored from the
// client-facing pricing page so admins see the same numbers the
// client signed up against.

export type ATPlan = 'Startup' | 'Growing Business' | 'Enterprise';

export interface ATPlanDetails {
  name: ATPlan;
  tagline: string;
  /** One-time setup fee in INR. `null` = custom (Enterprise). */
  setupFee: number | null;
  /** Monthly fee in INR. `null` = custom. */
  monthlyFee: number | null;
  /** Display label for the transaction-volume bracket. */
  transactionsLabel: string;
}

export const AT_PLAN_DETAILS: Record<ATPlan, ATPlanDetails> = {
  'Startup': {
    name: 'Startup',
    tagline: 'For small businesses',
    setupFee: 35000,
    monthlyFee: 35000,
    transactionsLabel: '0 – 500',
  },
  'Growing Business': {
    name: 'Growing Business',
    tagline: 'For scaling operations',
    setupFee: 60000,
    monthlyFee: 60000,
    transactionsLabel: '500 – 1,000',
  },
  'Enterprise': {
    name: 'Enterprise',
    tagline: 'For large enterprises',
    setupFee: null,
    monthlyFee: null,
    transactionsLabel: '1,000+',
  },
};

/** Resolves the effective plan for an A&T-eligible customer.
 *  Defaults to 'Growing Business' when the field is missing. Returns
 *  `null` for pure SEM customers so callers can branch cleanly. */
export function resolveAtPlan(c: Customer): ATPlan | null {
  if (c.service !== 'Accounts & Taxation' && c.service !== 'Both') return null;
  return c.atPlan ?? 'Growing Business';
}

// ── Employees ──
export type EmployeeStatus = 'Active' | 'Resigned' | 'Terminated' | 'On Notice';

// Legal entities under the Brego umbrella.
//   • Brego Group  — the parent / holding entity. The Founder/CEO and
//     COO sit here because they oversee every operating company.
//   • Brego Business — the operating SaaS & services business (most of
//     the headcount).
//   • Brego Land  — the realty arm.
//   • Forsyth Lodge — the hospitality property.
// Surfacing this as a top-level grouping lets HR scan "who works for
// which entity" without opening a drawer.
type Company = 'Brego Group' | 'Brego Business' | 'Brego Land' | 'Forsyth Lodge';

// Canonical department options the admin can assign an employee to.
// "All Departments" is reserved for cross-functional executives (CEO,
// COO) who span every functional area. Same list across the platform
// — keeps the inline Department editor, the Department filter, and
// the New Resource Request form's department dropdown in sync.
const DEPARTMENT_OPTIONS = [
  'Operations',
  'Performance Marketing',
  'Accounts & Taxation',
  'Sales',
  'HR',
  'Design',
  'Finance',
  'Technology',
  'All Departments',
] as const;

// House cohorts — internal team-spirit groupings used across the
// company. Four houses, evenly distributed across the roster.
type House = 'Palmer' | 'Savage' | 'Bahram' | 'Wilson';

// CLA/NTF flag mirrored from the EmployeeCLA workflow. `None` is the
// default for healthy performers; `CLA` (Caution Letter Action) and
// `NTF` (Notice To Fix) are HR escalation states.
type CLAStatus = 'None' | 'CLA' | 'NTF';

export interface EmployeeRecord {
  id: string;
  empCode: string;
  name: string;
  email: string;
  phone: string;
  company: Company;
  department: string;
  designation: string;
  role: string;
  status: EmployeeStatus;
  joiningDate: string;
  exitDate: string | null;
  reportingManager: string;
  workstation: string;
  monthlySalary: number;
  house: House;
  claStatus: CLAStatus;
  /** Why this employee was placed on CLA / NTF. Required when
   *  claStatus !== 'None'; empty otherwise. */
  claReason?: string;
  /** Why this employee left (free-form). Surfaces on the Past
   *  Employees screen as the "Reason" column. Set when status
   *  transitions to Resigned or Terminated; left undefined for
   *  active / on-notice employees. */
  exitReason?: string;
  /** Month + year when this employee's next appraisal is scheduled. */
  appraisalMonth: string;
}

// One uploaded employee document — ID proofs, certificates,
// agreements, etc. In mock we only track metadata (no actual file
// bytes); a real backend would store the file blob in S3 or similar.
interface EmployeeDocument {
  id: string;
  name: string;        // original filename, e.g. "aadhaar_back.pdf"
  type: string;        // tagged category, e.g. "Aadhaar Card"
  sizeBytes: number;   // for display
  uploadedAt: string;  // ISO timestamp
  uploadedBy: string;  // admin who uploaded
}

// Document type vocabulary — covers the standard Indian HR/onboarding
// document set. "Other" is the catch-all for anything else.
const DOCUMENT_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Passport',
  'Driving License',
  'Voter ID',
  'Educational Certificate',
  'Offer Letter',
  'Experience Letter',
  'Resume',
  'Bank Proof',
  'Photo',
  'Other',
] as const;

// Personal details stored as a sidecar map keyed by employee id —
// keeps the main MOCK_EMPLOYEES list focused on identity / role data
// while the drawer can pull the full profile (DOB, blood group, home
// address, emergency contact, uploaded docs) on demand.
interface PersonalInfo {
  dob: string;             // ISO date
  bloodGroup: string;      // e.g. 'O+', 'AB-'
  gender: string;          // 'Male' | 'Female' | 'Non-binary' (free text for flexibility)
  address: string;         // multi-line OK
  emergency: { name: string; relation: string; phone: string };
  documents: EmployeeDocument[];
}

// ── Resource Requests ──
// Resource Request types are imported from `./resource-requests-store`
// so the same shape is shared with NewResourceRequestModal and any other
// surface that raises hiring requests.

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const TEAM_COLORS: Record<string, string> = {
  'Chinmay P.': '#7C3AED',
  'Arjun M.': '#3B82F6',
  'Zubear S.': '#06B6D4',
  'Irshad O.': '#F59E0B',
  'Kavya I.': '#10B981',
  'Meera N.': '#EC4899',
};

export function getTeamColor(name: string): string {
  return TEAM_COLORS[name] || '#6B7280';
}

/* ═══════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════ */

const enrichCustomer = (base: Partial<Customer> & { id: string; companyName: string; contactPerson: string; email: string; phone: string; service: CustomerService; status: CustomerStatus; joinedDate: string; monthlyRetainer: number; sector: string; assignedTeam: string[]; location: string; totalRevenue: number; lastActivityDate: string }): Customer => ({
  customerId: base.id,  // Default: each business its own customer. Override to group siblings.
  exitDate: null, address: `${base.location}, India`, website: `www.${base.companyName.toLowerCase().replace(/\s+/g, '')}.com`, gstNumber: `27AAAC${Math.random().toString(36).slice(2, 6).toUpperCase()}1Z5`, panNumber: `AAAC${Math.random().toString(36).slice(2, 6).toUpperCase()}K`, businessModel: 'B2B', businessSize: 'Mid-Market', channel: 'Direct', relationshipStatus: 'Good' as const, onboardingProgress: 100, onboardingStage: 'Completed', slaStatus: 'Active' as const, paymentMethod: 'Bank Transfer', kickoffDate: base.joinedDate, mainServiceHead: base.assignedTeam[0] || 'Unassigned', teamDetails: base.assignedTeam.map(n => ({ name: n, role: 'Manager', color: getTeamColor(n) })), invoicesPaid: Math.floor(Math.random() * 20) + 5, invoicesPending: Math.floor(Math.random() * 3), pendingAmount: Math.floor(Math.random() * 200000), notes: '',
  brandName: base.companyName,
  subSector: '—',
  finalBilling: base.monthlyRetainer,
  paymentTerms: 'Postpaid' as const,
  teamStructure: {
    hod:              { name: base.assignedTeam[0] || '', hours: base.assignedTeam[0] ? 8  : 0 },
    podHead:          { name: base.assignedTeam[1] || '', hours: base.assignedTeam[1] ? 16 : 0 },
    manager:          { name: base.assignedTeam[2] || '', hours: base.assignedTeam[2] ? 24 : 0 },
    assistantManager: { name: base.assignedTeam[3] || '', hours: base.assignedTeam[3] ? 16 : 0 },
    executive:        { name: '',                          hours: 0 },
  },
  keyRelationships: (() => {
    const overall = (base.relationshipStatus ?? 'Good') as RelationshipLevel;
    const rels: KeyRelationship[] = [
      { name: 'Tejas Atha', role: 'COO', status: overall },
    ];
    if (base.service === 'Performance Marketing' || base.service === 'Both') {
      rels.push({ name: 'Chinmay Pawar', role: 'SEM HOD', status: overall });
    }
    if (base.service === 'Accounts & Taxation' || base.service === 'Both') {
      rels.push({ name: 'Zubear Shaikh', role: 'A&T HOD', status: overall });
    }
    return rels;
  })(),
  ...base,
});

export const MOCK_CUSTOMERS: Customer[] = [
  enrichCustomer({ id: 'c1', customerId: 'cust-rahul-desai', companyName: 'Acme Corp', contactPerson: 'Rahul Desai', email: 'rahul@acmegroup.in', phone: '+91 98765 43210', service: 'Performance Marketing', status: 'Active', joinedDate: '2024-03-15', monthlyRetainer: 150000, sector: 'E-commerce', assignedTeam: ['Chinmay P.', 'Arjun M.'], location: 'Mumbai', totalRevenue: 2700000, lastActivityDate: '2026-04-14', address: '402, Bandra Kurla Complex, Mumbai 400051', website: 'www.acmecorp.in', businessModel: 'D2C', businessSize: 'Mid-Market', channel: 'Direct', relationshipStatus: 'Excellent', onboardingProgress: 100, onboardingStage: 'Completed', invoicesPaid: 24, invoicesPending: 0, pendingAmount: 0, notes: 'Long-term client. Scaling ad spend in Q2. Rahul also owns Acme Wellness and Acme Logistics — same person, separate engagements.' }),
  enrichCustomer({ id: 'c1b', customerId: 'cust-rahul-desai', companyName: 'Acme Wellness', contactPerson: 'Rahul Desai', email: 'rahul@acmegroup.in', phone: '+91 98765 43210', service: 'Accounts & Taxation', status: 'Active', joinedDate: '2024-09-01', monthlyRetainer: 75000, sector: 'Wellness', assignedTeam: ['Zubear S.', 'Irshad O.'], location: 'Mumbai', totalRevenue: 1275000, lastActivityDate: '2026-04-15', address: '402, Bandra Kurla Complex, Mumbai 400051', website: 'www.acmewellness.in', businessModel: 'D2C', businessSize: 'SMB', channel: 'Direct', relationshipStatus: 'Excellent', onboardingProgress: 100, onboardingStage: 'Completed', invoicesPaid: 18, invoicesPending: 0, pendingAmount: 0, notes: 'Second business under Rahul Desai. Books & compliance only.' }),
  enrichCustomer({ id: 'c1c', customerId: 'cust-rahul-desai', companyName: 'Acme Logistics', contactPerson: 'Rahul Desai', email: 'rahul@acmegroup.in', phone: '+91 98765 43210', service: 'Both', status: 'Active', joinedDate: '2025-07-01', monthlyRetainer: 195000, sector: 'Logistics', assignedTeam: ['Chinmay P.', 'Zubear S.', 'Meera N.'], location: 'Mumbai', totalRevenue: 1950000, lastActivityDate: '2026-04-16', address: '402, Bandra Kurla Complex, Mumbai 400051', website: 'www.acmelogistics.in', businessModel: 'B2B', businessSize: 'Mid-Market', channel: 'Direct', relationshipStatus: 'Good', onboardingProgress: 80, onboardingStage: 'In Progress', invoicesPaid: 9, invoicesPending: 1, pendingAmount: 195000, notes: 'Third business under Rahul Desai. Fleet-tech play — still onboarding SEM side.' }),
  enrichCustomer({ id: 'c2', companyName: 'FinTech Solutions', contactPerson: 'Priya Malhotra', email: 'priya@fintech.co', phone: '+91 98765 43211', service: 'Accounts & Taxation', status: 'Active', joinedDate: '2023-11-01', monthlyRetainer: 80000, sector: 'FinTech', assignedTeam: ['Zubear S.', 'Irshad O.'], location: 'Bangalore', totalRevenue: 1920000, lastActivityDate: '2026-04-15', address: 'Whitefield Tech Park, Bangalore 560066', businessModel: 'B2B', businessSize: 'Startup', channel: 'Referral', relationshipStatus: 'Good', invoicesPaid: 28, invoicesPending: 1, pendingAmount: 80000 }),
  enrichCustomer({ id: 'c3', companyName: 'Urban Living', contactPerson: 'Sameer Joshi', email: 'sameer@urbanliving.com', phone: '+91 98765 43212', service: 'Both', status: 'Active', joinedDate: '2024-06-20', monthlyRetainer: 220000, sector: 'Real Estate', assignedTeam: ['Chinmay P.', 'Zubear S.'], location: 'Pune', totalRevenue: 2640000, lastActivityDate: '2026-04-13', address: 'Hinjewadi IT Park, Pune 411057', businessModel: 'B2C', businessSize: 'Enterprise', channel: 'Direct', relationshipStatus: 'Excellent', invoicesPaid: 22, invoicesPending: 0, pendingAmount: 0 }),
  enrichCustomer({ id: 'c4', companyName: 'Sunrise Retail', contactPerson: 'Neha Kapoor', email: 'neha@sunriseretail.in', phone: '+91 98765 43213', service: 'Performance Marketing', status: 'Inactive', joinedDate: '2024-01-10', monthlyRetainer: 100000, sector: 'Retail', assignedTeam: ['Arjun M.'], location: 'Delhi', totalRevenue: 1500000, lastActivityDate: '2026-03-28', address: 'Connaught Place, New Delhi 110001', businessModel: 'B2C', businessSize: 'SMB', channel: 'Outbound', relationshipStatus: 'Good', slaStatus: 'Inactive', onboardingProgress: 100, onboardingStage: 'Completed', notes: 'Paused due to budget freeze. Re-engagement planned for Q3.' }),
  enrichCustomer({ id: 'c5', companyName: 'Global Exports', contactPerson: 'Vikram Singh', email: 'vikram@globalexports.in', phone: '+91 98765 43214', service: 'Accounts & Taxation', status: 'Inactive', joinedDate: '2023-05-01', exitDate: '2025-12-31', monthlyRetainer: 60000, sector: 'Import/Export', assignedTeam: ['Zubear S.'], location: 'Mumbai', totalRevenue: 1860000, lastActivityDate: '2025-12-28', address: 'Nariman Point, Mumbai 400021', businessModel: 'B2B', businessSize: 'Mid-Market', channel: 'Referral', relationshipStatus: 'Needs Attention', slaStatus: 'Inactive', notes: 'Churned — moved to in-house accounting.' }),
  enrichCustomer({ id: 'c6', companyName: 'Digital Dynamics', contactPerson: 'Ananya Rao', email: 'ananya@digitaldynamics.io', phone: '+91 98765 43215', service: 'Performance Marketing', status: 'Active', joinedDate: '2025-01-15', monthlyRetainer: 175000, sector: 'SaaS', assignedTeam: ['Chinmay P.', 'Kavya I.'], location: 'Hyderabad', totalRevenue: 2625000, lastActivityDate: '2026-04-16', address: 'HITEC City, Hyderabad 500081', businessModel: 'B2B SaaS', businessSize: 'Startup', channel: 'Inbound', relationshipStatus: 'Good', invoicesPaid: 15, invoicesPending: 0, pendingAmount: 0 }),
  enrichCustomer({ id: 'c7', companyName: 'MedCare Plus', contactPerson: 'Dr. Anil Gupta', email: 'anil@medcareplus.com', phone: '+91 98765 43216', service: 'Both', status: 'Active', joinedDate: '2024-08-01', monthlyRetainer: 200000, sector: 'Healthcare', assignedTeam: ['Chinmay P.', 'Zubear S.', 'Meera N.'], location: 'Mumbai', totalRevenue: 4000000, lastActivityDate: '2026-04-15', address: 'Andheri East, Mumbai 400069', businessModel: 'B2C', businessSize: 'Enterprise', channel: 'Direct', relationshipStatus: 'Excellent', invoicesPaid: 20, invoicesPending: 0, pendingAmount: 0, notes: 'High-value client. Monthly review calls with Dr. Gupta.' }),
  enrichCustomer({ id: 'c8', companyName: 'EcoGreen Energy', contactPerson: 'Sanjay Patel', email: 'sanjay@ecogreen.co.in', phone: '+91 98765 43217', service: 'Accounts & Taxation', status: 'Inactive', joinedDate: '2023-09-01', exitDate: '2025-08-15', monthlyRetainer: 45000, sector: 'Energy', assignedTeam: ['Irshad O.'], location: 'Ahmedabad', totalRevenue: 1080000, lastActivityDate: '2025-08-10', address: 'SG Highway, Ahmedabad 380054', businessModel: 'B2B', businessSize: 'SMB', channel: 'Outbound', relationshipStatus: 'Needs Attention', slaStatus: 'Inactive' }),
  enrichCustomer({ id: 'c9', companyName: 'Smart Solutions', contactPerson: 'Kavita Reddy', email: 'kavita@smartsol.in', phone: '+91 98765 43218', service: 'Performance Marketing', status: 'Active', joinedDate: '2025-06-01', monthlyRetainer: 130000, sector: 'Technology', assignedTeam: ['Arjun M.', 'Kavya I.'], location: 'Chennai', totalRevenue: 1430000, lastActivityDate: '2026-04-12', address: 'OMR Tech Corridor, Chennai 600096', businessModel: 'B2B', businessSize: 'Mid-Market', channel: 'Referral', relationshipStatus: 'Good', onboardingProgress: 85, onboardingStage: 'In Progress', invoicesPaid: 10, invoicesPending: 1, pendingAmount: 130000 }),
  enrichCustomer({ id: 'c10', companyName: 'Cloud Systems', contactPerson: 'Rohit Mehra', email: 'rohit@cloudsystems.io', phone: '+91 98765 43219', service: 'Both', status: 'Active', joinedDate: '2024-04-01', monthlyRetainer: 250000, sector: 'Cloud/IT', assignedTeam: ['Chinmay P.', 'Zubear S.'], location: 'Mumbai', totalRevenue: 6000000, lastActivityDate: '2026-04-16', address: 'Powai, Mumbai 400076', businessModel: 'B2B SaaS', businessSize: 'Enterprise', channel: 'Direct', relationshipStatus: 'Excellent', invoicesPaid: 24, invoicesPending: 0, pendingAmount: 0, notes: 'Largest retainer client. Quarterly business reviews.' }),
  enrichCustomer({ id: 'c11', companyName: 'FreshBites', contactPerson: 'Aisha Khan', email: 'aisha@freshbites.in', phone: '+91 98765 43220', service: 'Performance Marketing', status: 'Inactive', joinedDate: '2024-02-01', exitDate: '2025-11-30', monthlyRetainer: 90000, sector: 'F&B', assignedTeam: ['Arjun M.'], location: 'Goa', totalRevenue: 1980000, lastActivityDate: '2025-11-25', address: 'Panjim, Goa 403001', businessModel: 'D2C', businessSize: 'SMB', channel: 'Inbound', relationshipStatus: 'Good', slaStatus: 'Inactive' }),
  enrichCustomer({ id: 'c12', companyName: 'Enagenbio Pharma', contactPerson: 'Dr. Shruti Verma', email: 'shruti@enagenbio.com', phone: '+91 98765 43221', service: 'Performance Marketing', status: 'Active', joinedDate: '2025-09-01', monthlyRetainer: 160000, sector: 'Pharma', assignedTeam: ['Chinmay P.'], location: 'Mumbai', totalRevenue: 1120000, lastActivityDate: '2026-04-10', address: 'Worli, Mumbai 400018', businessModel: 'B2B', businessSize: 'Enterprise', channel: 'Direct', relationshipStatus: 'Good', onboardingProgress: 60, onboardingStage: 'In Progress', invoicesPaid: 7, invoicesPending: 0, pendingAmount: 0, notes: 'New client — onboarding media plans.' }),
  enrichCustomer({ id: 'c13', companyName: 'BookMyTrip', contactPerson: 'Manish Agarwal', email: 'manish@bookmytrip.co', phone: '+91 98765 43222', service: 'Both', status: 'Inactive', joinedDate: '2024-05-15', monthlyRetainer: 180000, sector: 'Travel', assignedTeam: ['Kavya I.', 'Irshad O.'], location: 'Delhi', totalRevenue: 3960000, lastActivityDate: '2026-03-15', address: 'Nehru Place, New Delhi 110019', businessModel: 'B2C', businessSize: 'Mid-Market', channel: 'Outbound', relationshipStatus: 'Good', notes: 'Seasonal engagement — peaks during holiday season.' }),
  enrichCustomer({ id: 'c14', companyName: 'PropEase', contactPerson: 'Nitin Deshmukh', email: 'nitin@propease.in', phone: '+91 98765 43223', service: 'Accounts & Taxation', status: 'Active', joinedDate: '2025-03-01', monthlyRetainer: 70000, sector: 'PropTech', assignedTeam: ['Zubear S.'], location: 'Pune', totalRevenue: 910000, lastActivityDate: '2026-04-14', address: 'Kothrud, Pune 411038', businessModel: 'B2B', businessSize: 'Startup', channel: 'Referral', relationshipStatus: 'Good', invoicesPaid: 13, invoicesPending: 1, pendingAmount: 70000 }),
];

export const MOCK_EMPLOYEES: EmployeeRecord[] = [
  { id: 'emp1', empCode: 'BB-001', name: 'Mihir Lunia',   email: 'mihir@bregobusiness.com',   phone: '+91 98765 11001', company: 'Brego Group',    department: 'All Departments',      designation: 'Founder & CEO', role: 'Admin', status: 'Active', joiningDate: '2020-01-01', exitDate: null, reportingManager: '—',            workstation: 'Mumbai HQ', monthlySalary: 500000, house: 'Palmer', claStatus: 'None', appraisalMonth: 'January 2027' },
  { id: 'emp2', empCode: 'BB-002', name: 'Tejas Atha',    email: 'tejas@bregobusiness.com',   phone: '+91 98765 11002', company: 'Brego Group',    department: 'All Departments',      designation: 'COO',           role: 'Admin', status: 'Active', joiningDate: '2022-01-10', exitDate: null, reportingManager: 'Mihir Lunia',  workstation: 'Mumbai HQ', monthlySalary: 250000, house: 'Bahram', claStatus: 'None', appraisalMonth: 'January 2027' },
  { id: 'emp3', empCode: 'BB-003', name: 'Zeel Mehta',    email: 'zeel@bregobusiness.com',    phone: '+91 98765 11003', company: 'Brego Group',    department: 'All Departments',       designation: 'Co-Founder & CPO', role: 'Admin', status: 'Active', joiningDate: '2022-02-01', exitDate: null, reportingManager: 'Mihir Lunia',  workstation: 'Mumbai HQ', monthlySalary: 200000, house: 'Palmer', claStatus: 'None', appraisalMonth: 'February 2027' },
  { id: 'emp4', empCode: 'BB-004', name: 'Hooshang Bhakt', email: 'hooshang@bregobusiness.com', phone: '+91 98765 11004', company: 'Brego Business', department: 'Sales', designation: 'HOD', role: 'HOD', status: 'Active', joiningDate: '2022-02-15', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 175000, house: 'Savage', claStatus: 'None', appraisalMonth: 'February 2027' },
  { id: 'emp5', empCode: 'BB-005', name: 'Harshal Rane', email: 'harshal@bregobusiness.com', phone: '+91 98765 11005', company: 'Brego Business', department: 'Operations', designation: 'Operations Lead', role: 'Admin', status: 'Active', joiningDate: '2022-08-01', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 110000, house: 'Palmer', claStatus: 'None', appraisalMonth: 'August 2026' },
  { id: 'emp6', empCode: 'BB-006', name: 'Arjun Mehta', email: 'arjun@bregobusiness.com', phone: '+91 98765 11006', company: 'Brego Business', department: 'Performance Marketing', designation: 'Sr. Manager', role: 'Manager', status: 'Active', joiningDate: '2023-01-15', exitDate: null, reportingManager: 'Chinmay Pawar', workstation: 'Mumbai HQ', monthlySalary: 95000, house: 'Wilson', claStatus: 'None', appraisalMonth: 'January 2027' },
  { id: 'emp7', empCode: 'BB-007', name: 'Kavya Iyer', email: 'kavya@bregobusiness.com', phone: '+91 98765 11007', company: 'Brego Business', department: 'Performance Marketing', designation: 'Manager', role: 'Manager', status: 'Active', joiningDate: '2023-04-01', exitDate: null, reportingManager: 'Chinmay Pawar', workstation: 'Remote', monthlySalary: 85000, house: 'Bahram', claStatus: 'None', appraisalMonth: 'April 2026' },
  { id: 'emp8', empCode: 'BB-008', name: 'Irshad Olkar', email: 'irshad@bregobusiness.com', phone: '+91 98765 11008', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Sr. Executive', role: 'Executive', status: 'Active', joiningDate: '2023-06-01', exitDate: null, reportingManager: 'Zubear Shaikh', workstation: 'Mumbai HQ', monthlySalary: 65000, house: 'Savage', claStatus: 'None', appraisalMonth: 'June 2026' },
  { id: 'emp9', empCode: 'BB-009', name: 'Meera Nair', email: 'meera@bregobusiness.com', phone: '+91 98765 11009', company: 'Brego Business', department: 'Performance Marketing', designation: 'Sr. Manager', role: 'Manager', status: 'Active', joiningDate: '2023-02-01', exitDate: null, reportingManager: 'Chinmay Pawar', workstation: 'Hybrid', monthlySalary: 90000, house: 'Wilson', claStatus: 'None', appraisalMonth: 'February 2027' },
  { id: 'emp10', empCode: 'BB-010', name: 'Priya Sharma', email: 'priya@bregobusiness.com', phone: '+91 98765 11010', company: 'Brego Land', department: 'Sales', designation: 'Manager', role: 'Manager', status: 'Active', joiningDate: '2023-07-01', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 80000, house: 'Wilson', claStatus: 'None', appraisalMonth: 'July 2026' },
  { id: 'emp11', empCode: 'BB-011', name: 'Chinmay Pawar', email: 'chinmay@bregobusiness.com', phone: '+91 98765 11011', company: 'Brego Business', department: 'Performance Marketing', designation: 'HOD', role: 'HOD', status: 'Active', joiningDate: '2022-03-01', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 180000, house: 'Savage', claStatus: 'None', appraisalMonth: 'March 2027' },
  { id: 'emp12', empCode: 'BB-012', name: 'Ravi Kulkarni', email: 'ravi@bregobusiness.com', phone: '+91 98765 11012', company: 'Brego Business', department: 'Performance Marketing', designation: 'Executive', role: 'Executive', status: 'Active', joiningDate: '2024-01-15', exitDate: null, reportingManager: 'Arjun Mehta', workstation: 'Mumbai HQ', monthlySalary: 50000, house: 'Savage', claStatus: 'None', appraisalMonth: 'January 2027' },
  { id: 'emp13', empCode: 'BB-013', name: 'Deepak Tiwari', email: 'deepak@bregobusiness.com', phone: '+91 98765 11013', company: 'Brego Land', department: 'Sales', designation: 'Sales Lead', role: 'Manager', status: 'Active', joiningDate: '2023-11-01', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 85000, house: 'Bahram', claStatus: 'None', appraisalMonth: 'November 2026' },
  { id: 'emp14', empCode: 'BB-014', name: 'Sneha Patil', email: 'sneha@bregobusiness.com', phone: '+91 98765 11014', company: 'Forsyth Lodge', department: 'Design', designation: 'Sr. Designer', role: 'Executive', status: 'Active', joiningDate: '2024-03-01', exitDate: null, reportingManager: 'Harshal Rane', workstation: 'Remote', monthlySalary: 70000, house: 'Wilson', claStatus: 'CLA', claReason: 'Missed three consecutive design review deadlines. Behaviour improvement plan in progress.', appraisalMonth: 'March 2027' },
  // Past employees
  { id: 'emp15', empCode: 'BB-015', name: 'Amit Verma', email: 'amit@bregobusiness.com', phone: '+91 98765 11015', company: 'Brego Business', department: 'Performance Marketing', designation: 'Executive', role: 'Executive', status: 'Resigned', joiningDate: '2023-03-01', exitDate: '2025-09-30', reportingManager: 'Chinmay Pawar', workstation: 'Mumbai HQ', monthlySalary: 55000, house: 'Bahram', claStatus: 'None', exitReason: 'Better growth opportunity at competing agency', appraisalMonth: '—' },
  { id: 'emp16', empCode: 'BB-016', name: 'Pooja Deshmukh', email: 'pooja@bregobusiness.com', phone: '+91 98765 11016', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Executive', role: 'Executive', status: 'Resigned', joiningDate: '2023-08-01', exitDate: '2025-06-15', reportingManager: 'Zubear Shaikh', workstation: 'Mumbai HQ', monthlySalary: 48000, house: 'Savage', claStatus: 'NTF', claReason: 'Repeated client compliance errors despite multiple corrections.', exitReason: 'Resigned after NTF — repeated client compliance errors', appraisalMonth: '—' },
  { id: 'emp17', empCode: 'BB-017', name: 'Kunal Jain', email: 'kunal@bregobusiness.com', phone: '+91 98765 11017', company: 'Forsyth Lodge', department: 'Operations', designation: 'Property Manager', role: 'Manager', status: 'Terminated', joiningDate: '2024-02-01', exitDate: '2025-04-20', reportingManager: 'Harshal Rane', workstation: 'Goa Office', monthlySalary: 65000, house: 'Bahram', claStatus: 'None', exitReason: 'Performance issues — missed property handover deadlines', appraisalMonth: '—' },
  { id: 'emp18', empCode: 'BB-018', name: 'Aditi Nayak', email: 'aditi@bregobusiness.com', phone: '+91 98765 11018', company: 'Brego Business', department: 'Performance Marketing', designation: 'Intern', role: 'Intern', status: 'On Notice', joiningDate: '2025-10-01', exitDate: null, reportingManager: 'Kavya Iyer', workstation: 'Mumbai HQ', monthlySalary: 25000, house: 'Wilson', claStatus: 'None', appraisalMonth: 'October 2026' },
  { id: 'emp19', empCode: 'BB-019', name: 'Zubear Shaikh', email: 'zubear@bregobusiness.com', phone: '+91 98765 11019', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'HOD', role: 'HOD', status: 'Active', joiningDate: '2022-03-15', exitDate: null, reportingManager: 'Tejas Atha', workstation: 'Mumbai HQ', monthlySalary: 170000, house: 'Palmer', claStatus: 'None', appraisalMonth: 'March 2027' },
  // ── Additional A&T staff so the team-assignment dropdowns have
  //    real candidates per role (HOD, POD Head, Manager, Assistant
  //    Manager, Executive). Mirrors the depth the PM department has.
  { id: 'emp20', empCode: 'BB-020', name: 'Saksham Verma',  email: 'saksham@bregobusiness.com',  phone: '+91 98765 11020', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'POD Head',           role: 'POD Head',          status: 'Active', joiningDate: '2022-09-01', exitDate: null, reportingManager: 'Zubear Shaikh', workstation: 'Mumbai HQ', monthlySalary: 130000, house: 'Wilson', claStatus: 'None', appraisalMonth: 'September 2026' },
  { id: 'emp21', empCode: 'BB-021', name: 'Rashi Iyer',     email: 'rashi@bregobusiness.com',     phone: '+91 98765 11021', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Sr. Manager',        role: 'Manager',           status: 'Active', joiningDate: '2023-02-20', exitDate: null, reportingManager: 'Zubear Shaikh', workstation: 'Mumbai HQ', monthlySalary: 95000,  house: 'Palmer', claStatus: 'None', appraisalMonth: 'February 2027' },
  { id: 'emp22', empCode: 'BB-022', name: 'Karan Mehta',    email: 'karan@bregobusiness.com',    phone: '+91 98765 11022', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Manager',            role: 'Manager',           status: 'Active', joiningDate: '2023-06-15', exitDate: null, reportingManager: 'Zubear Shaikh', workstation: 'Hybrid',     monthlySalary: 82000,  house: 'Bahram', claStatus: 'None', appraisalMonth: 'June 2026' },
  { id: 'emp23', empCode: 'BB-023', name: 'Anjali Joshi',   email: 'anjali@bregobusiness.com',   phone: '+91 98765 11023', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Assistant Manager',  role: 'Assistant Manager', status: 'Active', joiningDate: '2023-11-01', exitDate: null, reportingManager: 'Rashi Iyer',    workstation: 'Mumbai HQ', monthlySalary: 65000,  house: 'Savage', claStatus: 'None', appraisalMonth: 'November 2026' },
  { id: 'emp24', empCode: 'BB-024', name: 'Devansh Kapoor', email: 'devansh@bregobusiness.com',  phone: '+91 98765 11024', company: 'Brego Business', department: 'Accounts & Taxation', designation: 'Executive',          role: 'Executive',         status: 'Active', joiningDate: '2024-04-01', exitDate: null, reportingManager: 'Karan Mehta',   workstation: 'Mumbai HQ', monthlySalary: 50000,  house: 'Wilson', claStatus: 'None', appraisalMonth: 'April 2027' },
  // ── Additional PM staff to round out the same five-role coverage:
  //    PM already had HOD, Managers, Executive, Intern but no POD
  //    Head or Assistant Manager. Filling the gap so SEM lanes
  //    auto-fill cleanly without falling back to the senior bench.
  { id: 'emp25', empCode: 'BB-025', name: 'Vikram Joshi',   email: 'vikram@bregobusiness.com',   phone: '+91 98765 11025', company: 'Brego Business', department: 'Performance Marketing', designation: 'POD Head',          role: 'POD Head',          status: 'Active', joiningDate: '2022-10-01', exitDate: null, reportingManager: 'Chinmay Pawar', workstation: 'Mumbai HQ', monthlySalary: 135000, house: 'Bahram', claStatus: 'None', appraisalMonth: 'October 2026' },
  { id: 'emp26', empCode: 'BB-026', name: 'Tara Bose',      email: 'tara@bregobusiness.com',     phone: '+91 98765 11026', company: 'Brego Business', department: 'Performance Marketing', designation: 'Assistant Manager', role: 'Assistant Manager', status: 'Active', joiningDate: '2023-09-10', exitDate: null, reportingManager: 'Arjun Mehta',   workstation: 'Hybrid',     monthlySalary: 68000,  house: 'Savage', claStatus: 'None', appraisalMonth: 'September 2026' },
];

// Shape of the form payload from <AddEmployeeModal>. Fields that the
// page-level addEmployee helper auto-derives (id, empCode, status,
// claStatus, exitDate, appraisalMonth) are intentionally omitted.
// Personal info + uploaded documents are bundled in so the admin
// can capture everything in one go during onboarding.
interface NewEmployeeInput {
  name: string;
  email: string;
  phone: string;
  company: Company;
  department: string;
  designation: string;
  role: string;
  joiningDate: string;
  reportingManager: string;
  workstation: string;
  monthlySalary: number;
  house: House;
  personal: PersonalInfo;
}

/** Compute an employee's first-year appraisal month from their
 *  joining date. Format: "Month YYYY" (e.g. "April 2027"). The
 *  appraisal cadence is annual; this returns the next anniversary. */
function computeAppraisalMonth(joiningDate: string): string {
  const d = new Date(joiningDate);
  if (Number.isNaN(d.getTime())) return '—';
  const year = d.getFullYear() + 1;
  const monthName = d.toLocaleString('en-IN', { month: 'long' });
  return `${monthName} ${year}`;
}

// Personal info — keyed by employee id. Realistic Indian mock data
// (DOB, blood group, address, emergency contact). Keeps the main
// EmployeeRecord rows lean while making the full profile available
// to the drawer.
const PERSONAL_DETAILS_SEED: Record<string, PersonalInfo> = {
  emp1:  { dob: '1985-08-12', bloodGroup: 'O+',  gender: 'Male',   address: 'Apt 1402, Sea Crest, Bandra West, Mumbai 400050',     emergency: { name: 'Aditi Lunia',     relation: 'Spouse',  phone: '+91 99201 14201' }, documents: [] },
  emp2:  { dob: '1988-03-22', bloodGroup: 'A+',  gender: 'Male',   address: 'Apt 705, Pinnacle Heights, Andheri East, Mumbai 400069', emergency: { name: 'Anil Atha',       relation: 'Father',  phone: '+91 99201 14202' }, documents: [
    { id: 'doc-tejas-1', name: 'aadhaar_tejas.pdf', type: 'Aadhaar Card', sizeBytes: 412000, uploadedAt: '2022-01-12T09:30:00.000Z', uploadedBy: 'Mihir Lunia' },
    { id: 'doc-tejas-2', name: 'pan_tejas.pdf',     type: 'PAN Card',     sizeBytes: 186000, uploadedAt: '2022-01-12T09:32:00.000Z', uploadedBy: 'Mihir Lunia' },
    { id: 'doc-tejas-3', name: 'offer_letter.pdf',  type: 'Offer Letter', sizeBytes: 540000, uploadedAt: '2022-01-08T14:00:00.000Z', uploadedBy: 'Mihir Lunia' },
    { id: 'doc-tejas-4', name: 'resume_tejas.pdf',  type: 'Resume',       sizeBytes: 320000, uploadedAt: '2022-01-05T11:15:00.000Z', uploadedBy: 'Mihir Lunia' },
  ] },
  emp3:  { dob: '1990-11-04', bloodGroup: 'B+',  gender: 'Female', address: 'Apt 302, Juhu Versova Link Road, Mumbai 400061',         emergency: { name: 'Rohan Mehta',     relation: 'Spouse',  phone: '+91 99201 14203' }, documents: [] },
  emp4:  { dob: '1986-06-18', bloodGroup: 'AB+', gender: 'Male',   address: 'Bungalow 12, Pali Hill, Bandra West, Mumbai 400050',     emergency: { name: 'Farah Bhakt',     relation: 'Spouse',  phone: '+91 99201 14204' }, documents: [] },
  emp5:  { dob: '1989-09-25', bloodGroup: 'O-',  gender: 'Male',   address: 'Apt 506, Ashok Towers, Worli, Mumbai 400018',            emergency: { name: 'Priya Rane',      relation: 'Spouse',  phone: '+91 99201 14205' }, documents: [] },
  emp6:  { dob: '1992-04-14', bloodGroup: 'B-',  gender: 'Male',   address: 'Apt 1208, Vivarea, Mahalaxmi, Mumbai 400011',            emergency: { name: 'Kiran Mehta',     relation: 'Spouse',  phone: '+91 99201 14206' }, documents: [] },
  emp7:  { dob: '1993-07-30', bloodGroup: 'A-',  gender: 'Female', address: '4B, Lotus Apartments, Lower Parel, Mumbai 400013',       emergency: { name: 'Lakshmi Iyer',    relation: 'Mother',  phone: '+91 99201 14207' }, documents: [] },
  emp8:  { dob: '1991-12-08', bloodGroup: 'O+',  gender: 'Male',   address: 'Plot 28, Kandivali East, Mumbai 400101',                 emergency: { name: 'Ayesha Olkar',    relation: 'Spouse',  phone: '+91 99201 14208' }, documents: [] },
  emp9:  { dob: '1990-05-19', bloodGroup: 'B+',  gender: 'Female', address: 'Flat 909, One Avighna Park, Curry Road, Mumbai 400012',  emergency: { name: 'Anil Nair',       relation: 'Father',  phone: '+91 99201 14209' }, documents: [] },
  emp10: { dob: '1992-02-11', bloodGroup: 'AB-', gender: 'Female', address: 'Apt 1505, Oberoi Esquire, Goregaon East, Mumbai 400063', emergency: { name: 'Manish Sharma',   relation: 'Spouse',  phone: '+91 99201 14210' }, documents: [] },
  emp11: { dob: '1989-10-02', bloodGroup: 'O+',  gender: 'Male',   address: 'Bungalow 4, Khar West, Mumbai 400052',                   emergency: { name: 'Trupti Pawar',    relation: 'Spouse',  phone: '+91 99201 14211' }, documents: [] },
  emp12: { dob: '1996-01-27', bloodGroup: 'A+',  gender: 'Male',   address: 'Apt 304, Garden Apartments, Powai, Mumbai 400076',       emergency: { name: 'Suresh Kulkarni', relation: 'Father',  phone: '+91 99201 14212' }, documents: [] },
  emp13: { dob: '1991-08-16', bloodGroup: 'B+',  gender: 'Male',   address: 'Apt 1103, Hiranandani Gardens, Powai, Mumbai 400076',    emergency: { name: 'Reena Tiwari',    relation: 'Spouse',  phone: '+91 99201 14213' }, documents: [] },
  emp14: { dob: '1995-03-09', bloodGroup: 'O+',  gender: 'Female', address: 'Apt 207, Lake Pleasant, Aundh, Pune 411007',             emergency: { name: 'Pratik Patil',    relation: 'Brother', phone: '+91 99201 14214' }, documents: [] },
  emp15: { dob: '1993-11-23', bloodGroup: 'A+',  gender: 'Male',   address: '12/B, Akshay Apartments, Vile Parle East, Mumbai 400057',emergency: { name: 'Shalini Verma',   relation: 'Mother',  phone: '+91 99201 14215' }, documents: [] },
  emp16: { dob: '1994-06-05', bloodGroup: 'O-',  gender: 'Female', address: 'Flat 1801, Lodha Bellissimo, Mahalaxmi, Mumbai 400011',  emergency: { name: 'Sandeep Deshmukh',relation: 'Father',  phone: '+91 99201 14216' }, documents: [] },
  emp17: { dob: '1990-04-21', bloodGroup: 'B-',  gender: 'Male',   address: 'Plot 7, Anjuna Beach Road, Anjuna, Goa 403509',          emergency: { name: 'Neha Jain',       relation: 'Spouse',  phone: '+91 99201 14217' }, documents: [] },
  emp18: { dob: '2003-09-15', bloodGroup: 'AB+', gender: 'Female', address: 'Hostel Block C, IIT Bombay Campus, Powai, Mumbai 400076',emergency: { name: 'Anjali Nayak',    relation: 'Mother',  phone: '+91 99201 14218' }, documents: [] },
  emp19: { dob: '1988-12-30', bloodGroup: 'O+',  gender: 'Male',   address: 'Apt 605, Marathon Era, Mulund West, Mumbai 400080',      emergency: { name: 'Saira Shaikh',    relation: 'Spouse',  phone: '+91 99201 14219' }, documents: [] },
};

// Resource Request seed data lives in `./resource-requests-store` so it can
// be mutated (via `addResourceRequest`) and observed (via the
// `useResourceRequests` hook) by both this page and the A&T deliverables
// page. The `useResourceRequests` hook returns the live list.

/* ═══════════════════════════════════════════════════════════════════
   HELPERS (continued)
   ═══════════════════════════════════════════════════════════════════ */

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function formatCurrency(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════════
   STATUS / PRIORITY PILLS
   ═══════════════════════════════════════════════════════════════════ */

export function CustomerStatusPill({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-black/[0.04] text-black/50 border-black/[0.08]',
  };
  const dots: Record<CustomerStatus, string> = {
    Active: 'bg-emerald-500',
    Inactive: 'bg-black/30',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

function EmployeeStatusPill({ status }: { status: EmployeeStatus }) {
  const styles: Record<EmployeeStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Resigned: 'bg-black/[0.04] text-black/50 border-black/[0.08]',
    Terminated: 'bg-red-50 text-red-600 border-red-200',
    'On Notice': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const dots: Record<EmployeeStatus, string> = {
    Active: 'bg-emerald-500',
    Resigned: 'bg-black/30',
    Terminated: 'bg-red-400',
    'On Notice': 'bg-amber-500',
  };
  // `rounded-md` (6px) matches the Priority + Status pill vocabulary
  // used everywhere else on the platform (Incidents, CLA/NTF, etc.) so
  // the table reads as one consistent system.
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

// Status palette is shared between the static pill (used in summary
// surfaces) and the interactive menu (used inline in the table) so the
// colours never drift.
// Status palette. Each state has its own semantic colour so the table
// reads at a glance:
//   Pending   → amber  (admin's attention required)
//   Open      → blue   (recruiter pipeline, in flight)
//   Fulfilled → green  (closed, success)
//   Rejected  → grey   (terminal, not actionable)
// The inline status pill on a row exposes only Open/Fulfilled — the
// recruiter-flippable states. Approve / Reject (Pending → Open / Rejected)
// are admin verbs and surface as inline buttons on Pending rows.
const REQUEST_STATUS_STYLES: Record<RequestStatus, { pill: string; dot: string; text: string }> = {
  Pending:   { pill: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   text: 'text-amber-700' },
  Open:      { pill: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    text: 'text-blue-700' },
  Fulfilled: { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  Rejected:  { pill: 'bg-zinc-100 text-zinc-600 border-zinc-200',         dot: 'bg-zinc-400',    text: 'text-zinc-600' },
};

// Recruiter-only options for the inline status pill dropdown. Pending
// and Rejected are intentionally excluded — those transitions are
// admin actions and live as their own buttons.
const REQUEST_STATUS_OPTIONS: RequestStatus[] = ['Open', 'Fulfilled'];

function RequestStatusPill({ status }: { status: RequestStatus }) {
  const styles = REQUEST_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border ${styles.pill}`}>
      {status}
    </span>
  );
}

// Interactive status pill — same look as RequestStatusPill, but clicking
// it opens a fixed-position listbox so the admin can flip between the
// five status states (Open / In Review / Approved / Fulfilled / Rejected)
// directly from the table row without opening a drawer.
//
// The popover uses the same anchored-portal pattern as LostClients'
// Recovery dropdown — it captures the trigger's viewport coords on
// click and renders position:fixed, so it escapes the table's
// `overflow-x-auto` clipping. Click-outside, Escape, scroll, and
// resize all close it.
function RequestStatusMenu({ request }: { request: ResourceRequest }) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setAnchor(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnchor(null); };
    const handleViewportChange = () => setAnchor(null);
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
  }, [anchor]);

  const styles = REQUEST_STATUS_STYLES[request.status];
  const isOpen = anchor !== null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setAnchor(null);
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setAnchor({ top: rect.bottom + 6, left: rect.left });
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Status: ${request.status} — change for ${request.requestId}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 hover:brightness-95 ${styles.pill}`}
      >
        {request.status}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label={`Status options for ${request.requestId}`}
          style={{ position: 'fixed', top: anchor.top, left: anchor.left }}
          className="bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-[60] min-w-[160px]"
        >
          {REQUEST_STATUS_OPTIONS.map(opt => {
            const optStyles = REQUEST_STATUS_STYLES[opt];
            const isSelected = request.status === opt;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelected) updateResourceRequestStatus(request.id, opt);
                  setAnchor(null);
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                  isSelected
                    ? `bg-[#204CC7]/[0.04] ${optStyles.text} font-semibold`
                    : 'text-black/70 hover:bg-black/[0.03]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${optStyles.dot}`} aria-hidden="true" />
                <span className="flex-1 text-left">{opt}</span>
                {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * Approve / Reject button cluster for Pending requests. Lives in the
 * Status column position so the visual real-estate stays consistent
 * across every row — the table reads as one column whether the row's
 * state is actionable (buttons) or stable (pill).
 *
 * Two compact buttons, brand-blue Approve and ghost Reject. We keep
 * Reject visually quieter so the safe, common action (approve) is the
 * dominant affordance and admins don't fat-finger a rejection.
 */
function RequestApprovalActions({ request }: { request: ResourceRequest }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); approveResourceRequest(request.id); }}
        aria-label={`Approve ${request.requestId}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-caption font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
      >
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        Approve
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); rejectResourceRequest(request.id); }}
        aria-label={`Reject ${request.requestId}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-caption font-medium text-black/60 hover:text-red-700 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
        Reject
      </button>
    </div>
  );
}

// Per-recruiter colour palette — matches the recruiter-funnel colours in
// EmployeesOverview so the same person reads the same wherever they
// appear (avatar tile colour, drawer cell colour, and now this menu).
const RECRUITER_COLORS: Record<RecruiterName, string> = {
  Pooja:    '#7C3AED',  // A&T-focused recruiter
  Ravina:   '#06B6D4',  // SEM-focused recruiter
  Priyanka: '#F59E0B',  // Sales-focused recruiter
};

function RecruiterAvatar({ name, size = 24 }: { name: RecruiterName; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: RECRUITER_COLORS[name],
        fontSize: size <= 22 ? 9 : 10,
        letterSpacing: '0.02em',
      }}
      aria-hidden="true"
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Interactive recruiter cell — same anchored-portal pattern as
// RequestStatusMenu. Click opens a dropdown with the three recruiters
// (Pooja / Ravina / Priyanka) plus an "Unassigned" option for routing
// the request away from anyone. Selection writes through the shared
// store via updateResourceRequestRecruiter so other surfaces (the
// EmployeesOverview drawer) re-render with the new owner.
function RecruiterMenu({ request }: { request: ResourceRequest }) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setAnchor(null);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAnchor(null); };
    const handleViewportChange = () => setAnchor(null);
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
  }, [anchor]);

  const isOpen = anchor !== null;
  const isAssigned = !!request.recruiter;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setAnchor(null);
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setAnchor({ top: rect.bottom + 6, left: rect.left });
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Recruiter: ${request.recruiter ?? 'Unassigned'} — change for ${request.requestId}`}
        className={`inline-flex items-center gap-2 px-2 py-1 rounded-md transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 hover:bg-black/[0.04] ${
          isAssigned ? 'text-black/80' : 'text-black/55'
        }`}
      >
        {isAssigned ? (
          <>
            <RecruiterAvatar name={request.recruiter as RecruiterName} size={22} />
            <span className="text-caption font-medium whitespace-nowrap">{request.recruiter}</span>
          </>
        ) : (
          <span className="text-caption font-medium italic whitespace-nowrap">Unassigned</span>
        )}
        <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="listbox"
          aria-label={`Recruiter options for ${request.requestId}`}
          style={{ position: 'fixed', top: anchor.top, left: anchor.left }}
          className="bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-[60] min-w-[180px]"
        >
          {RECRUITERS.map((name) => {
            const isSelected = request.recruiter === name;
            return (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isSelected) updateResourceRequestRecruiter(request.id, name);
                  setAnchor(null);
                }}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2.5 transition-colors text-caption font-medium ${
                  isSelected ? 'bg-[#204CC7]/[0.04] text-black/85 font-semibold' : 'text-black/70 hover:bg-black/[0.03]'
                }`}
              >
                <RecruiterAvatar name={name} size={22} />
                <span className="flex-1 text-left">{name}</span>
                {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
          {/* Divider then the "Unassigned" option so it reads as a
              deliberate choice rather than an empty fourth slot. */}
          <div className="my-1 border-t border-black/[0.05]" />
          <button
            type="button"
            role="option"
            aria-selected={!request.recruiter}
            onClick={(e) => {
              e.stopPropagation();
              if (request.recruiter) updateResourceRequestRecruiter(request.id, null);
              setAnchor(null);
            }}
            className={`w-full px-3 py-1.5 text-left flex items-center gap-2.5 transition-colors text-caption font-medium ${
              !request.recruiter ? 'bg-[#204CC7]/[0.04] text-black/85 font-semibold' : 'text-black/65 hover:bg-black/[0.03]'
            }`}
          >
            <span className="w-[22px] h-[22px] rounded-full border border-dashed border-black/25 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left italic">Unassigned</span>
            {!request.recruiter && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>
      )}
    </>
  );
}

function PriorityPill({ priority }: { priority: RequestPriority }) {
  // Three-step priority palette — same vocabulary used elsewhere for
  // task / incident severity so colours read consistently across the app.
  const styles: Record<RequestPriority, string> = {
    Low:    'bg-black/[0.04] text-black/50',
    Medium: 'bg-blue-50 text-blue-600',
    High:   'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium ${styles[priority]}`}>
      {priority}
    </span>
  );
}

export function ServicePill({ service }: { service: CustomerService }) {
  // Both service pills share the same SEM-style desaturated blue
  // treatment (#EEF1FB bg + #5B7FD6 text) so the family reads as a
  // single, consistent tag pattern across the admin surface — only the
  // label distinguishes them. Picked SEM's chip as the canonical look
  // because it sits more comfortably alongside the rest of the
  // primary-blue UI than the heavier saturated cyan ever did.
  if (service === 'Both') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 rounded-md text-caption font-medium bg-[#EEF1FB] text-[#5B7FD6]">SEM</span>
        <span className="px-2 py-0.5 rounded-md text-caption font-medium bg-[#EEF1FB] text-[#5B7FD6]">A&T</span>
      </div>
    );
  }
  return service === 'Performance Marketing'
    ? <span className="px-2.5 py-1 rounded-md text-caption font-medium bg-[#EEF1FB] text-[#5B7FD6]">SEM</span>
    : <span className="px-2.5 py-1 rounded-md text-caption font-medium bg-[#EEF1FB] text-[#5B7FD6]">A&T</span>;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function Database() {
  // Live resource-request list from the shared store. The `Database` shell
  // component (legacy admin view) reads from the same source as the
  // standalone DatabaseResourceRequestPage so any new entry added from
  // either surface shows up here too.
  const requests = useResourceRequests();
  const [activeTab, setActiveTab] = useState<DatabaseTab>('customers');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [customerServiceFilter, setCustomerServiceFilter] = useState<'All' | CustomerService>('All');

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<'All' | EmployeeStatus>('All');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState<string>('All');
  // Mutable employees so inline edits (Department, etc.) persist.
  const [employeesData, setEmployeesData] = useState<EmployeeRecord[]>(MOCK_EMPLOYEES);
  const [personalDetails, setPersonalDetails] = useState<Record<string, PersonalInfo>>(PERSONAL_DETAILS_SEED);

  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'All' | RequestStatus>('Pending');
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<'All' | RequestPriority>('All');
  const [requestMonthFilter, setRequestMonthFilter] = useState<'All' | string>('All');

  // Sort state
  const [customerSort, setCustomerSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'companyName', dir: 'asc' });
  // Default sort by employee code (BB-001, BB-002, …) so the table
  // reads as a chronological roster of who joined when, rather than an
  // alphabetised name list — codes were issued in joining order.
  const [employeeSort, setEmployeeSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'empCode', dir: 'asc' });

  // Detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);

  // ── Filtered & sorted data ──
  const filteredCustomers = useMemo(() => {
    let list = MOCK_CUSTOMERS.filter(c => {
      if (customerStatusFilter !== 'All' && c.status !== customerStatusFilter) return false;
      if (customerServiceFilter !== 'All' && c.service !== customerServiceFilter) return false;
      if (customerSearch) {
        const q = customerSearch.toLowerCase();
        return c.companyName.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      }
      return true;
    });
    list.sort((a, b) => {
      const k = customerSort.key as keyof Customer;
      const av = a[k], bv = b[k];
      if (typeof av === 'string' && typeof bv === 'string') return customerSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === 'number' && typeof bv === 'number') return customerSort.dir === 'asc' ? av - bv : bv - av;
      return 0;
    });
    return list;
  }, [customerSearch, customerStatusFilter, customerServiceFilter, customerSort]);

  const filteredEmployees = useMemo(() => {
    let list = employeesData.filter(e => {
      if (employeeStatusFilter !== 'All' && e.status !== employeeStatusFilter) return false;
      if (employeeDeptFilter !== 'All' && e.department !== employeeDeptFilter) return false;
      if (employeeSearch) {
        const q = employeeSearch.toLowerCase();
        return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.empCode.toLowerCase().includes(q);
      }
      return true;
    });
    list.sort((a, b) => {
      const k = employeeSort.key as keyof EmployeeRecord;
      const av = a[k], bv = b[k];
      if (typeof av === 'string' && typeof bv === 'string') return employeeSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === 'number' && typeof bv === 'number') return employeeSort.dir === 'asc' ? av - bv : bv - av;
      return 0;
    });
    return list;
  }, [employeesData, employeeSearch, employeeStatusFilter, employeeDeptFilter, employeeSort]);

  const updateEmployeeDept = (id: string, department: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, department } : e)));
    setSelectedEmployee(prev => (prev && prev.id === id ? { ...prev, department } : prev));
  };
  const updateEmployeeCompany = (id: string, company: Company) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, company } : e)));
    setSelectedEmployee(prev => (prev && prev.id === id ? { ...prev, company } : prev));
  };
  const updateEmployeeRole = (id: string, role: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, role } : e)));
    setSelectedEmployee(prev => (prev && prev.id === id ? { ...prev, role } : prev));
  };
  const updateEmployeeCLA = (id: string, claStatus: CLAStatus, claReason?: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, claStatus, claReason: claStatus === 'None' ? undefined : (claReason ?? e.claReason) } : e)));
    setSelectedEmployee(prev => (prev && prev.id === id ? { ...prev, claStatus, claReason: claStatus === 'None' ? undefined : (claReason ?? prev.claReason) } : prev));
  };
  const addEmployee = (input: NewEmployeeInput) => {
    setEmployeesData(prev => {
      const maxNum = prev.reduce((m, e) => {
        const n = parseInt(e.empCode.replace('BB-', ''), 10);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      const nextNum = maxNum + 1;
      const newId = `emp${nextNum}`;
      const newEmp: EmployeeRecord = {
        id: newId,
        empCode: `BB-${String(nextNum).padStart(3, '0')}`,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        company: input.company,
        department: input.department,
        designation: input.designation.trim(),
        role: input.role,
        status: 'Active',
        joiningDate: input.joiningDate,
        exitDate: null,
        reportingManager: input.reportingManager.trim() || '—',
        workstation: input.workstation,
        monthlySalary: input.monthlySalary,
        house: input.house,
        claStatus: 'None',
        appraisalMonth: computeAppraisalMonth(input.joiningDate),
      };
      setPersonalDetails(prevP => ({ ...prevP, [newId]: input.personal }));
      return [...prev, newEmp];
    });
  };
  const addDocuments = (empId: string, docs: EmployeeDocument[]) => {
    setPersonalDetails(prev => {
      const existing = prev[empId];
      if (!existing) return prev;
      return { ...prev, [empId]: { ...existing, documents: [...existing.documents, ...docs] } };
    });
  };
  const removeDocument = (empId: string, docId: string) => {
    setPersonalDetails(prev => {
      const existing = prev[empId];
      if (!existing) return prev;
      return { ...prev, [empId]: { ...existing, documents: existing.documents.filter(d => d.id !== docId) } };
    });
  };
  const removeEmployee = (id: string) => {
    setEmployeesData(prev => prev.filter(e => e.id !== id));
    setPersonalDetails(prev => { const next = { ...prev }; delete next[id]; return next; });
    setSelectedEmployee(prev => (prev && prev.id === id ? null : prev));
  };
  // Backfill a historical exit — same shape as the dedicated
  // DatabaseEmployeesPage version below; mirrored here so the
  // legacy single-page parent (used by older surfaces that mount
  // the whole Database tab in one place) keeps the same Past
  // Employees CTA wiring without diverging behavior.
  const addPastEmployee = (input: PastEmployeeFormPayload) => {
    setEmployeesData(prev => {
      const maxNum = prev.reduce((m, e) => {
        const n = parseInt(e.empCode.replace('BB-', ''), 10);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      const nextNum = maxNum + 1;
      const newId = `emp${nextNum}`;
      const exit = new Date(input.exitDate);
      const joining = new Date(exit);
      joining.setFullYear(exit.getFullYear() - 1);
      const joiningISO = joining.toISOString().slice(0, 10);
      const slug = input.name.trim().toLowerCase().split(/\s+/).join('.');
      const newEmp: EmployeeRecord = {
        id: newId,
        empCode: `BB-${String(nextNum).padStart(3, '0')}`,
        name: input.name.trim(),
        email: `${slug}@bregobusiness.com`,
        phone: '',
        company: 'Brego Business',
        department: input.department,
        designation: input.role,
        role: input.role,
        status: input.exitType,
        joiningDate: joiningISO,
        exitDate: input.exitDate,
        exitReason: input.reason,
        reportingManager: '—',
        workstation: 'Mumbai HQ',
        monthlySalary: 0,
        house: 'Bahram',
        claStatus: 'None',
        appraisalMonth: '—',
      };
      return [newEmp, ...prev];
    });
  };

  // Month buckets derived from request dates, newest first.
  const requestMonthOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) {
      const d = new Date(r.requestDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (requestStatusFilter !== 'All' && r.status !== requestStatusFilter) return false;
      if (requestPriorityFilter !== 'All' && r.priority !== requestPriorityFilter) return false;
      if (requestMonthFilter !== 'All') {
        const d = new Date(r.requestDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== requestMonthFilter) return false;
      }
      if (requestSearch) {
        const q = requestSearch.toLowerCase();
        return r.requestId.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
      }
      return true;
    });
  }, [requests, requestSearch, requestStatusFilter, requestPriorityFilter, requestMonthFilter]);

  // Stats
  const customerStats = useMemo(() => ({
    total: MOCK_CUSTOMERS.length,
    active: MOCK_CUSTOMERS.filter(c => c.status === 'Active').length,
    inactive: MOCK_CUSTOMERS.filter(c => c.status === 'Inactive').length,
    totalRevenue: MOCK_CUSTOMERS.filter(c => c.status === 'Active').reduce((s, c) => s + c.monthlyRetainer, 0),
  }), []);

  const employeeStats = useMemo(() => ({
    total: MOCK_EMPLOYEES.length,
    active: MOCK_EMPLOYEES.filter(e => e.status === 'Active').length,
    past: MOCK_EMPLOYEES.filter(e => e.status === 'Resigned' || e.status === 'Terminated').length,
    onNotice: MOCK_EMPLOYEES.filter(e => e.status === 'On Notice').length,
  }), []);

  const requestStats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending').length,
    open: requests.filter(r => r.status === 'Open').length,
    fulfilled: requests.filter(r => r.status === 'Fulfilled').length,
    totalPositions: requests.filter(r => r.status === 'Open').reduce((s, r) => s + r.positions, 0),
  }), []);

  const toggleCustomerSort = (key: string) => {
    setCustomerSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };
  const toggleEmployeeSort = (key: string) => {
    setEmployeeSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const tabs: { id: DatabaseTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'customers', label: 'All Customers', icon: Building2, count: customerStats.total },
    { id: 'employees', label: 'All Employees', icon: Users, count: employeeStats.total },
    { id: 'resource-request', label: 'Resource Requests', icon: UserPlus, count: requestStats.total },
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#EEF1FB] flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-[#204CC7]" />
          </div>
          <div>
            <h1 className="text-h1 text-black/90">Database</h1>
            <p className="text-caption text-black/50 font-normal">Master Data Directory — Customers, Employees & Resources</p>
          </div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-1 mb-6 bg-black/[0.03] rounded-xl p-1 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-caption font-medium transition-all ${
                isActive
                  ? 'bg-white text-[#204CC7] shadow-sm'
                  : 'text-black/50 hover:text-black/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${
                isActive ? 'bg-[#EEF1FB] text-[#204CC7]' : 'bg-black/[0.06] text-black/40'
              }`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'customers' && (
        <CustomersTab
          customers={filteredCustomers}
          stats={customerStats}
          search={customerSearch}
          onSearch={setCustomerSearch}
          statusFilter={customerStatusFilter}
          onStatusFilter={setCustomerStatusFilter}
          serviceFilter={customerServiceFilter}
          onServiceFilter={setCustomerServiceFilter}
          sort={customerSort}
          onSort={toggleCustomerSort}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={setSelectedCustomer}
        />
      )}

      {activeTab === 'employees' && (
        <EmployeesTab
          employees={filteredEmployees}
          stats={employeeStats}
          search={employeeSearch}
          onSearch={setEmployeeSearch}
          statusFilter={employeeStatusFilter}
          onStatusFilter={setEmployeeStatusFilter}
          deptFilter={employeeDeptFilter}
          onDeptFilter={setEmployeeDeptFilter}
          sort={employeeSort}
          onSort={toggleEmployeeSort}
          selectedEmployee={selectedEmployee}
          onSelectEmployee={setSelectedEmployee}
          onUpdateDepartment={updateEmployeeDept}
          onUpdateCompany={updateEmployeeCompany}
          onUpdateRole={updateEmployeeRole}
          onUpdateCLA={updateEmployeeCLA}
          onAddEmployee={addEmployee}
          onAddPastEmployee={addPastEmployee}
          personalDetails={personalDetails}
          onAddDocuments={addDocuments}
          onRemoveDocument={removeDocument}
          onRemoveEmployee={removeEmployee}
        />
      )}

      {activeTab === 'resource-request' && (
        <ResourceRequestsTab
          requests={filteredRequests}
          stats={requestStats}
          totalCount={requests.length}
          search={requestSearch}
          onSearch={setRequestSearch}
          statusFilter={requestStatusFilter}
          onStatusFilter={setRequestStatusFilter}
          priorityFilter={requestPriorityFilter}
          onPriorityFilter={setRequestPriorityFilter}
          monthOptions={requestMonthOptions}
          monthFilter={requestMonthFilter}
          onMonthFilter={setRequestMonthFilter}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════════════════ */

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-4 flex-1 min-w-[140px]">
      <p className="text-caption text-black/45 font-medium mb-1">{label}</p>
      <p className={`text-h2 font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-caption text-black/35 font-normal mt-0.5">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMERS TAB
   ═══════════════════════════════════════════════════════════════════ */

function CustomersTab({
  customers, stats, search, onSearch, statusFilter, onStatusFilter, serviceFilter, onServiceFilter, sort, onSort, selectedCustomer, onSelectCustomer, hideServiceFilter = false,
}: {
  customers: Customer[];
  stats: { total: number; active: number; inactive: number; totalRevenue: number };
  search: string;
  onSearch: (v: string) => void;
  statusFilter: 'All' | CustomerStatus;
  onStatusFilter: (v: 'All' | CustomerStatus) => void;
  serviceFilter: 'All' | CustomerService;
  onServiceFilter: (v: 'All' | CustomerService) => void;
  sort: { key: string; dir: 'asc' | 'desc' };
  onSort: (key: string) => void;
  selectedCustomer: Customer | null;
  onSelectCustomer: (c: Customer | null) => void;
  /** Drop the Service dropdown when the parent has locked the
   *  service scope (e.g. HOD view = A&T-only). */
  hideServiceFilter?: boolean;
}) {
  return (
    <div>
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on CustomersOverview, EmployeesOverview, and the
        SubTabTopBar wrapper in SuperAdminHome. Title + subtitle anchor
        the left; Search, Status, Service, and Export hang on the right
        so the page-control real estate lives in one consistent strip
        across the Customers section instead of scattered below the stats.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">All Customers</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">The full client roster — every active and inactive account</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search */}
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              <label htmlFor="customers-search" className="sr-only">Search customers</label>
              <input
                id="customers-search"
                type="text"
                placeholder="Search by company, contact, or email…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/35 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => onSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Status dropdown */}
            <div className="relative">
              <label htmlFor="customers-status-filter" className="sr-only">Status filter</label>
              <select
                id="customers-status-filter"
                value={statusFilter}
                onChange={(e) => onStatusFilter(e.target.value as 'All' | CustomerStatus)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Service dropdown — hidden when the parent has locked
                the scope to a single service (HOD role). The
                underlying state still exists so the filter logic
                doesn't break; we just don't surface the picker. */}
            {!hideServiceFilter && (
              <div className="relative">
                <label htmlFor="customers-service-filter" className="sr-only">Service filter</label>
                <select
                  id="customers-service-filter"
                  value={serviceFilter}
                  onChange={(e) => onServiceFilter(e.target.value as 'All' | CustomerService)}
                  className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                >
                  <option value="All">All Services</option>
                  <option value="Performance Marketing">SEM</option>
                  <option value="Accounts & Taxation">A&T</option>
                  <option value="Both">Both</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            )}

            {/* Export */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 text-caption font-medium text-black/70 bg-white hover:bg-black/[0.02] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-stretch gap-4 mb-5">
        <StatCard label="Total Customers" value={stats.total} color="text-black/85" />
        <StatCard label="Active" value={stats.active} sub={`${Math.round((stats.active / stats.total) * 100)}% of total`} color="text-emerald-600" />
        <StatCard label="Inactive" value={stats.inactive} sub="Past customers" color="text-black/40" />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.totalRevenue)} sub="From active clients" color="text-[#204CC7]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortTh label="Company" sortKey="companyName" current={sort} onSort={onSort} className="pl-5" />
                <th className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Contact</span></th>
                <th className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Service</span></th>
                <th className="text-center py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Status</span></th>
                <SortTh label="Joined" sortKey="joinedDate" current={sort} onSort={onSort} />
                <SortTh label="Retainer" sortKey="monthlyRetainer" current={sort} onSort={onSort} align="right" />
                <th className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Team</span></th>
                <SortTh label="Total Rev" sortKey="totalRevenue" current={sort} onSort={onSort} align="right" />
                <th className="py-3 pr-5 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                  }`}
                >
                  <td className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#204CC7]/10 to-[#204CC7]/5 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#204CC7]">{c.companyName.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-body font-medium text-black/85 whitespace-nowrap">{c.companyName}</p>
                        <p className="text-caption text-black/40 font-normal">{c.sector}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-body text-black/70 font-medium whitespace-nowrap">{c.contactPerson}</p>
                    <p className="text-caption text-black/35 font-normal">{c.email}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <ServicePill service={c.service} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <CustomerStatusPill status={c.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-caption text-black/60 font-medium whitespace-nowrap">{formatDate(c.joinedDate)}</span>
                    {c.exitDate && <p className="text-caption text-red-400 font-normal whitespace-nowrap">Exit: {formatDate(c.exitDate)}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-body font-semibold text-black/75 tabular-nums">{formatCurrency(c.monthlyRetainer)}</span>
                    <span className="text-caption text-black/30 font-normal">/mo</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {c.assignedTeam.slice(0, 3).map((t, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white text-[9px] font-bold text-white"
                          style={{ backgroundColor: getTeamColor(t) }}
                          title={t}
                        >
                          {getInitials(t)}
                        </div>
                      ))}
                      {c.assignedTeam.length > 3 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white bg-black/[0.08] text-[9px] font-bold text-black/50">
                          +{c.assignedTeam.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-body font-semibold text-black/70 tabular-nums">{formatCurrency(c.totalRevenue)}</span>
                  </td>
                  <td className="py-3.5 pr-5">
                    <button className="w-7 h-7 rounded-full hover:bg-black/[0.05] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical className="w-4 h-4 text-black/40" />
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                    <p className="text-black/50 text-body font-medium">No customers match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
          <span className="text-black/50 text-caption font-normal">
            Showing {customers.length} of {MOCK_CUSTOMERS.length} customers
          </span>
        </div>
      </div>

      {/* Customer detail drawer */}
      {selectedCustomer && (
        <CustomerDrawer
          customer={selectedCustomer}
          onSwitchCustomer={onSelectCustomer}
          onClose={() => onSelectCustomer(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPLOYEES TAB
   ═══════════════════════════════════════════════════════════════════ */

const DEPARTMENTS_LIST = ['All', 'All Departments', 'Performance Marketing', 'Accounts & Taxation', 'Operations', 'HR', 'Sales', 'Design', 'Finance', 'Technology'];

// ── Employees Filter helpers ──────────────────────────────────────
//
// One filter button on the All Employees top bar replaces the
// previous status + department dropdowns. Same pattern used on the
// All Customers screen and every Customers Overview drawer — open
// the panel, pick from each grouped section, see an active count
// badge on the trigger. Mirrors AllClients.ClientFilterPanel and
// keeps the controls lean: search · filter · past-employees toggle ·
// export · add.

function EmployeesFilterOption<T extends string>({
  label, value, selected, onSelect,
}: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all text-caption ${
        selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/65 hover:bg-black/[0.03] font-normal'
      }`}
    >
      {label}
      {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
    </button>
  );
}

function EmployeesFilterPanel({
  mode = 'live',
  statusFilter, onStatusFilter,
  deptFilter, onDeptFilter,
  onClose, onReset, activeCount,
}: {
  /** Drives the Status section's vocabulary: live mode shows
   *  Active / On Notice, past mode renames the section to "Exit
   *  Type" and lists Resigned / Terminated. Both write to the
   *  same upstream statusFilter state — the screens are mutually
   *  exclusive (the live table never shows past employees and
   *  vice versa) so there's no risk of mode bleed. */
  mode?: 'live' | 'past';
  statusFilter: 'All' | EmployeeStatus;
  onStatusFilter: (v: 'All' | EmployeeStatus) => void;
  deptFilter: string;
  onDeptFilter: (v: string) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] z-50 w-[320px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-black/50" aria-hidden="true" />
          <span className="text-body font-semibold text-black/80">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[20px] text-center">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset</button>
          )}
          <button onClick={onClose} aria-label="Close filters" className="p-1 rounded-lg hover:bg-black/[0.04] text-black/40">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4 max-h-[420px] overflow-y-auto">
        {/* Status / Exit Type — vocabulary swaps with mode.
            • Live: Active / On Notice. Resigned + Terminated are
              intentionally not surfaced here; they live on the
              Past Employees screen reachable from the top-bar
              toggle, keeping "live roster" and "exit history" as
              two distinct surfaces.
            • Past: Resigned / Terminated. The section header
              renames to "Exit Type" so the slice reads naturally
              against the table's Exit Type column. */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">
            {mode === 'past' ? 'Exit Type' : 'Status'}
          </p>
          <div className="space-y-0.5">
            {mode === 'past'
              ? (['All', 'Resigned', 'Terminated'] as const).map(opt => (
                  <EmployeesFilterOption
                    key={opt}
                    label={opt === 'All' ? 'All exit types' : opt}
                    value={opt}
                    selected={statusFilter === opt}
                    onSelect={(v) => onStatusFilter(v as 'All' | EmployeeStatus)}
                  />
                ))
              : (['All', 'Active', 'On Notice'] as const).map(opt => (
                  <EmployeesFilterOption
                    key={opt}
                    label={opt === 'All' ? 'All statuses' : opt}
                    value={opt}
                    selected={statusFilter === opt}
                    onSelect={(v) => onStatusFilter(v as 'All' | EmployeeStatus)}
                  />
                ))}
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Department</p>
          <div className="space-y-0.5">
            {DEPARTMENTS_LIST.map(d => (
              <EmployeesFilterOption
                key={d}
                label={d === 'All' ? 'Any department' : d}
                value={d}
                selected={deptFilter === d}
                onSelect={(v) => onDeptFilter(v)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Past Employees Table ──────────────────────────────────────────
//
// Dedicated read-only table for resigned / terminated employees.
// Columns prescribed by the brief: Employee Name · Exit Date ·
// Role · Department · Service · Exit Type · Reason. Service is
// derived from department (Performance Marketing → SEM, Accounts &
// Taxation → A&T, anything else → "—") since EmployeeRecord doesn't
// carry a service field directly. Exit Type maps from `status`.

function getServiceFromDept(dept: string): string {
  if (dept === 'Performance Marketing') return 'SEM';
  if (dept === 'Accounts & Taxation') return 'A&T';
  return '—';
}

function PastEmployeesTable({ rows }: { rows: EmployeeRecord[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/[0.06] py-16 text-center">
        <Archive className="w-8 h-8 text-black/15 mx-auto mb-2.5" aria-hidden="true" />
        <p className="text-body font-medium text-black/60">No past employees match your search</p>
        <p className="text-caption text-black/40 mt-1">The roster of resigned and terminated team members is up to date</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="border-b border-black/[0.06]">
              <th scope="col" className="text-left py-3 pl-5 pr-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Employee</span></th>
              <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Exit Date</span></th>
              <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Role</span></th>
              <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Department</span></th>
              <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Service</span></th>
              <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Exit Type</span></th>
              <th scope="col" className="text-left py-3 pl-4 pr-5"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Reason</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((emp, idx) => {
              const initials = emp.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const service = getServiceFromDept(emp.department);
              return (
                <tr key={emp.id} className={`border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'}`}>
                  <td className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#204CC7]/15 to-[#204CC7]/5 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#204CC7]">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-black/85 truncate">{emp.name}</p>
                        <p className="text-caption text-black/55 truncate">{emp.designation} · {emp.empCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-caption text-black/75 tabular-nums">{emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-caption font-medium bg-black/[0.04] text-black/70">{emp.role}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-caption text-black/75">{emp.department}</p>
                    <p className="text-caption text-black/40 mt-0.5">{emp.company}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    {service === '—' ? (
                      <span className="text-caption text-black/35">—</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-caption font-medium bg-purple-50 text-[#7C3AED]">{service}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium border ${
                      emp.status === 'Terminated' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Terminated' ? 'bg-rose-500' : 'bg-slate-400'}`} aria-hidden="true" />
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 pr-5">
                    <p className="text-caption text-black/70 leading-snug max-w-[280px]">
                      {emp.exitReason ?? emp.claReason ?? <span className="text-black/35">Not specified</span>}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeesTab({
  view = 'live', employees, stats, search, onSearch, statusFilter, onStatusFilter, deptFilter, onDeptFilter, sort, onSort, selectedEmployee, onSelectEmployee, onUpdateDepartment, onUpdateCompany, onUpdateRole, onUpdateCLA, onAddEmployee, onAddPastEmployee, personalDetails, onAddDocuments, onRemoveDocument, onRemoveEmployee,
}: {
  /** Drives Live (Active + On Notice) vs Past (Resigned + Terminated)
   *  rendering. Sourced from the App Router URL upstream
   *  (?sub=all-employees vs ?sub=past-employees) so the past view is
   *  a real route — bookmarkable, deep-linkable, back-button friendly. */
  view?: 'live' | 'past';
  employees: EmployeeRecord[];
  stats: { total: number; active: number; past: number; onNotice: number };
  search: string;
  onSearch: (v: string) => void;
  statusFilter: 'All' | EmployeeStatus;
  onStatusFilter: (v: 'All' | EmployeeStatus) => void;
  deptFilter: string;
  onDeptFilter: (v: string) => void;
  sort: { key: string; dir: 'asc' | 'desc' };
  onSort: (key: string) => void;
  selectedEmployee: EmployeeRecord | null;
  onSelectEmployee: (e: EmployeeRecord | null) => void;
  /** Reassign the employee to a new department. Mutates the parent's
   *  employees state, which propagates through filters / stats. */
  onUpdateDepartment: (id: string, dept: string) => void;
  /** Reassign the employee to a different legal entity (Brego Group /
   *  Brego Business / Brego Land / Forsyth Lodge). */
  onUpdateCompany: (id: string, company: Company) => void;
  /** Promote / demote between role tiers (Admin / HOD / Manager /
   *  Executive / Intern). */
  onUpdateRole: (id: string, role: string) => void;
  /** Place / remove an employee from the CLA / NTF watchlist with an
   *  optional reason. Passing 'None' removes the flag and clears the
   *  reason; passing 'CLA' or 'NTF' requires a reason. */
  onUpdateCLA: (id: string, status: CLAStatus, reason?: string) => void;
  /** Append a new employee. Form payload from the Add Employee modal. */
  onAddEmployee: (input: NewEmployeeInput) => void;
  /** Backfill a historical exit. Payload from the Add Past Employee
   *  modal opened via the Past Employees screen's top-bar CTA. */
  onAddPastEmployee: (input: PastEmployeeFormPayload) => void;
  /** Sidecar map of personal info, keyed by employee id. The drawer
   *  reads from this to render Personal Information + Documents. */
  personalDetails: Record<string, PersonalInfo>;
  /** Append uploaded docs to an employee (after-the-fact uploads
   *  from inside the drawer, not the create flow). */
  onAddDocuments: (empId: string, docs: EmployeeDocument[]) => void;
  /** Remove an uploaded doc from an employee. */
  onRemoveDocument: (empId: string, docId: string) => void;
  /** Hard-delete an employee from the system. The drawer's Danger
   *  Zone calls this after admin confirmation. */
  onRemoveEmployee: (id: string) => void;
}) {
  // Add Employee modal — local to the tab. Opens via the +Add button
  // in the top bar, closes on cancel / submit.
  const [showAddModal, setShowAddModal] = useState(false);
  // Add Past Employee modal — opens from the Past Employees screen's
  // top-bar "Add Employee" CTA. Used to backfill historical exits
  // that pre-date the platform's off-boarding tracking.
  const [showAddPastModal, setShowAddPastModal] = useState(false);
  // Top-bar single-button filter panel — replaces the two
  // Status/Department dropdowns. Same shape as AllClients.
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // View mode is now URL-driven via the `view` prop (sourced from
  // ?sub=all-employees vs ?sub=past-employees in SuperAdminHome).
  // The two view aliases below keep the existing render branches
  // readable; they're plain booleans derived from the prop.
  const viewMode = view;
  const filterCount = (statusFilter !== 'All' ? 1 : 0) + (deptFilter !== 'All' ? 1 : 0);

  // Derived rosters — keep the live table from showing past
  // employees and feed the past screen its own subset. Both
  // partitions inherit `search` from the parent's filter, so the
  // search box works in both modes without parent changes.
  const visibleEmployees = useMemo(
    () => employees.filter(e => e.status === 'Active' || e.status === 'On Notice'),
    [employees],
  );
  const pastEmployees = useMemo(
    () => employees.filter(e => e.status === 'Resigned' || e.status === 'Terminated'),
    [employees],
  );

  // App Router navigation — Past Employees is its own URL
  // (?tab=employees&sub=past-employees) so the screen is
  // bookmarkable, back-button-aware, and the browser address bar
  // reflects what's on screen. When entering Past Employees we
  // also clear the live status + department filters — they don't
  // apply to the past roster, and leaving them set would silently
  // filter out exits that match neither.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const buildHref = (sub: 'all-employees' | 'past-employees'): string => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.set('tab', 'employees');
    next.set('sub', sub);
    // `client` / `business` are only meaningful on Customers /
    // Accounts-Taxation surfaces — strip them on the way in to
    // keep the URL hygienic.
    next.delete('client');
    next.delete('business');
    return `${pathname}?${next.toString()}`;
  };
  const goToPast = () => {
    // Clear live-mode filter state on entry — past mode reuses
    // statusFilter/deptFilter for its own slice (Exit Type +
    // Department), so leaving an Active/On-Notice value set
    // would silently filter out everything in the past view.
    onStatusFilter('All');
    onDeptFilter('All');
    setShowFilterPanel(false);
    router.push(buildHref('past-employees'));
  };
  const goToLive = () => {
    // Mirror image of goToPast — clear past-mode filter state on
    // exit so a Resigned/Terminated value can't bleed into the
    // live screen and silently hide everything.
    onStatusFilter('All');
    onDeptFilter('All');
    setShowFilterPanel(false);
    router.push(buildHref('all-employees'));
  };
  // Tracks which row's pill is open as a dropdown, and which field it
  // edits. Single source of truth so only one menu can be open at a
  // time across the whole table.
  const [openDropdown, setOpenDropdown] = useState<{ id: string; field: 'department' | 'company' | 'role' } | null>(null);
  // Close on Escape / outside-click. Same pattern used in EmployeeCLA's
  // Onboarding switcher — the menu's own clicks call stopPropagation
  // so they don't trip the dismiss handler.
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

  // Department pill colour vocabulary — every department now wears
  // the same violet treatment used by Operations. The previous per-
  // department colour map (cyan for A&T, blue for SEM, amber for
  // Sales, etc.) was retired for consistency: department is one
  // attribute on a row, not a multi-axis identity, so a single
  // colour reads as a single class of label distinguished only by
  // the department name. Fallback (unknown department) keeps the
  // muted black/[0.04] tint so misclassified data stays visible
  // without claiming to belong to the violet family.
  const deptStyles = (_dept: string): { pill: string; dot: string } => {
    return { pill: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' };
  };

  // Company pill colour vocabulary — four legal entities. Brego Group
  // (parent) reads as slate, Brego Business (operating co) wears the
  // brand blue, the realty arm gets emerald, hospitality gets amber.
  const companyStyles = (co: Company): { pill: string; dot: string } => {
    if (co === 'Brego Group')    return { pill: 'bg-slate-100 text-slate-800',  dot: 'bg-slate-500'   };
    if (co === 'Brego Business') return { pill: 'bg-[#EEF1FB] text-[#204CC7]',  dot: 'bg-[#204CC7]'   };
    if (co === 'Brego Land')     return { pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
    return                              { pill: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500'   };
  };
  const COMPANY_OPTIONS: Company[] = ['Brego Group', 'Brego Business', 'Brego Land', 'Forsyth Lodge'];

  // Role pill colour vocabulary — every role now wears the same
  // violet treatment, matching the Department pill unification.
  // The previous per-tier palette (brand-blue for Admin, indigo for
  // POD Head, cyan for Manager, amber for Asst Manager, slate for
  // Executive, rose for Intern) was retired for consistency: role
  // is one attribute on a row, not a multi-axis identity, so a
  // single colour reads as a single class of label distinguished
  // only by the role label itself.
  const roleStyles = (_role: string): { pill: string; dot: string } => {
    return { pill: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' };
  };
  const ROLE_OPTIONS = ['Admin', 'HOD', 'POD Head', 'Manager', 'Assistant Manager', 'Executive', 'Intern'] as const;

  return (
    <div>
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on All Customers and the rest of the Customers /
        Employees sub-pages. Title + subtitle anchor the left; Search,
        Status, Department, and Export hang on the right so the page
        controls live in one consistent strip across the section.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          {/* Title strip — text shifts when the screen flips to the
              Past Employees view. In past mode a back-arrow button
              prefixes the title so the admin can return to the live
              roster without losing search state. */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            {viewMode === 'past' && (
              <button
                type="button"
                onClick={goToLive}
                aria-label="Back to All Employees"
                className="w-8 h-8 rounded-md hover:bg-black/[0.04] flex items-center justify-center text-black/65 hover:text-black/85 transition-colors focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
              >
                <ChevronRight className="w-4 h-4 rotate-180" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-black/90 text-body font-semibold">
                {viewMode === 'live' ? 'All Employees' : 'Past Employees'}
              </p>
              <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
                {viewMode === 'live'
                  ? 'The live team roster — active and on notice'
                  : 'Resigned and terminated team members'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search — stays in both modes; placeholder copy adapts. */}
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              <label htmlFor="employees-search" className="sr-only">Search employees</label>
              <input
                id="employees-search"
                type="text"
                placeholder={viewMode === 'live' ? 'Search by name, email, or code…' : 'Search past employees…'}
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => onSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" />
                </button>
              )}
            </div>

            {/* Past-mode-only controls — Filter (Exit Type +
                Department), then Add Employee. The Filter button
                reuses the live-mode panel with mode='past' so the
                Status section becomes "Exit Type" and lists
                Resigned / Terminated. Same visual rhythm as the
                live top bar so muscle memory carries over. */}
            {viewMode === 'past' && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(p => !p)}
                    aria-expanded={showFilterPanel}
                    aria-haspopup="dialog"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
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
                    <EmployeesFilterPanel
                      mode="past"
                      statusFilter={statusFilter}
                      onStatusFilter={onStatusFilter}
                      deptFilter={deptFilter}
                      onDeptFilter={onDeptFilter}
                      onClose={() => setShowFilterPanel(false)}
                      onReset={() => { onStatusFilter('All'); onDeptFilter('All'); }}
                      activeCount={filterCount}
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddPastModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add Employee
                </button>
              </>
            )}

            {/* Live-mode-only controls — Filter, Past Employees toggle, Export, Add. */}
            {viewMode === 'live' && (
              <>
                {/* Single Filter button — replaces the two dropdowns
                    (Status + Department). Same shape as AllClients. */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel(p => !p)}
                    aria-expanded={showFilterPanel}
                    aria-haspopup="dialog"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
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
                    <EmployeesFilterPanel
                      statusFilter={statusFilter}
                      onStatusFilter={onStatusFilter}
                      deptFilter={deptFilter}
                      onDeptFilter={onDeptFilter}
                      onClose={() => setShowFilterPanel(false)}
                      onReset={() => { onStatusFilter('All'); onDeptFilter('All'); }}
                      activeCount={filterCount}
                    />
                  )}
                </div>

                {/* Past Employees toggle — flips the screen into the
                    dedicated past-employees view with its 7-column
                    table. Clears live filters via goToPast so the
                    parent's filter state doesn't bleed into a
                    surface that has no filter UI. */}
                <button
                  type="button"
                  onClick={goToPast}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 text-caption font-medium text-black/70 bg-white hover:bg-black/[0.02] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
                >
                  <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                  Past Employees
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/65 text-caption font-semibold min-w-[18px] text-center leading-none">{stats.past}</span>
                </button>

                {/* Export */}
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 text-caption font-medium text-black/70 bg-white hover:bg-black/[0.02] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  Export
                </button>

                {/* Add Employee — primary CTA, brand-blue solid */}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add Employee
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats row — live mode only. The Past Employees screen is
          its own focused read; the live-roster stats above wouldn't
          add information and would compete with the table for
          attention. */}
      {viewMode === 'live' && (
        <div className="flex items-stretch gap-4 mb-5">
          <StatCard label="Total Employees" value={stats.total} color="text-black/85" />
          <StatCard label="Active" value={stats.active} sub={`${Math.round((stats.active / stats.total) * 100)}% of total`} color="text-emerald-600" />
          <StatCard label="Past" value={stats.past} sub="Resigned / Terminated" color="text-black/55" />
          <StatCard label="On Notice" value={stats.onNotice} color="text-amber-600" />
        </div>
      )}

      {/* Table — live roster (Active + On Notice). Past employees
          render below in their own 7-column read-only table. */}
      {viewMode === 'live' && (
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortTh label="Code" sortKey="empCode" current={sort} onSort={onSort} className="pl-5 pr-3" />
                <SortTh label="Name" sortKey="name" current={sort} onSort={onSort} />
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Company</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Department</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Role</span></th>
                <th scope="col" className="text-center py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Status</span></th>
                <SortTh label="Joined" sortKey="joiningDate" current={sort} onSort={onSort} />
                {/* Manager + Workstation columns moved into the
                    EmployeeDrawer's "Work details" grid — they're
                    secondary attributes that belong on the detail
                    surface, not in the at-a-glance row. */}
                <th scope="col" className="py-3 pr-5 w-[50px]"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleEmployees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEmployee(emp);
                    }
                  }}
                  aria-label={`View ${emp.name} (${emp.empCode}) — ${emp.designation}`}
                  className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                  }`}
                >
                  <td className="py-3.5 pl-5 pr-3">
                    <span className="text-caption font-mono text-black/40 font-medium">{emp.empCode}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#204CC7]/15 to-[#204CC7]/5 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#204CC7]">{emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-body font-medium text-black/85 whitespace-nowrap">{emp.name}</p>
                        <p className="text-caption text-black/55 font-normal">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  {(() => {
                    // BB-001 is the founder/CEO — his Company,
                    // Department, and Role are all locked. Render the
                    // pills as static spans (no chevron, no click
                    // handler) so the row reads as "this is fixed" at
                    // a glance.
                    const isLocked = emp.empCode === 'BB-001';
                    const companyCurrent = companyStyles(emp.company);
                    const deptCurrent = deptStyles(emp.department);
                    const roleCurrent = roleStyles(emp.role);
                    const isCompanyOpen = openDropdown?.id === emp.id && openDropdown.field === 'company';
                    const isDeptOpen = openDropdown?.id === emp.id && openDropdown.field === 'department';
                    const isRoleOpen = openDropdown?.id === emp.id && openDropdown.field === 'role';
                    return (
                      <>
                        {/* Company */}
                        <td className="py-3.5 px-4 relative" onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-caption font-medium whitespace-nowrap ${companyCurrent.pill}`}
                              title="Founder & CEO — locked"
                            >
                              {emp.company}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(isCompanyOpen ? null : { id: emp.id, field: 'company' });
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={isCompanyOpen}
                                aria-label={`Company: ${emp.company}. Activate to change.`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium transition-all hover:brightness-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${companyCurrent.pill}`}
                              >
                                {emp.company}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isCompanyOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </button>
                              {isCompanyOpen && (
                                <div role="listbox" aria-label={`Company options for ${emp.name}`} className="absolute left-4 top-full mt-1 z-30 min-w-[200px] bg-white rounded-md border border-black/[0.08] shadow-lg py-1" onClick={(e) => e.stopPropagation()}>
                                  {COMPANY_OPTIONS.map(opt => {
                                    const isSelected = opt === emp.company;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => { onUpdateCompany(emp.id, opt); setOpenDropdown(null); }}
                                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-caption font-medium transition-colors ${isSelected ? 'bg-[#204CC7]/[0.04] text-black/85' : 'text-black/70 hover:bg-black/[0.03]'}`}
                                      >
                                        <span className={`w-2 h-2 rounded-full ${companyStyles(opt).dot}`} aria-hidden="true" />
                                        <span className="flex-1">{opt}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        {/* Department */}
                        <td className="py-3.5 px-4 relative" onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-caption font-medium whitespace-nowrap ${deptCurrent.pill}`}
                              title="Founder & CEO — locked"
                            >
                              {emp.department}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(isDeptOpen ? null : { id: emp.id, field: 'department' });
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={isDeptOpen}
                                aria-label={`Department: ${emp.department}. Activate to change.`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium transition-all hover:brightness-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${deptCurrent.pill}`}
                              >
                                {emp.department}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isDeptOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </button>
                              {isDeptOpen && (
                                <div role="listbox" aria-label={`Department options for ${emp.name}`} className="absolute left-4 top-full mt-1 z-30 min-w-[200px] bg-white rounded-md border border-black/[0.08] shadow-lg py-1" onClick={(e) => e.stopPropagation()}>
                                  {DEPARTMENT_OPTIONS.map(opt => {
                                    const isSelected = opt === emp.department;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => { onUpdateDepartment(emp.id, opt); setOpenDropdown(null); }}
                                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-caption font-medium transition-colors ${isSelected ? 'bg-[#204CC7]/[0.04] text-black/85' : 'text-black/70 hover:bg-black/[0.03]'}`}
                                      >
                                        <span className={`w-2 h-2 rounded-full ${deptStyles(opt).dot}`} aria-hidden="true" />
                                        <span className="flex-1">{opt}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        {/* Role */}
                        <td className="py-3.5 px-4 relative" onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-caption font-medium whitespace-nowrap ${roleCurrent.pill}`}
                              title="Founder & CEO — locked"
                            >
                              {emp.role}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(isRoleOpen ? null : { id: emp.id, field: 'role' });
                                }}
                                aria-haspopup="listbox"
                                aria-expanded={isRoleOpen}
                                aria-label={`Role: ${emp.role}. Activate to change.`}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium transition-all hover:brightness-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${roleCurrent.pill}`}
                              >
                                {emp.role}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </button>
                              {isRoleOpen && (
                                <div role="listbox" aria-label={`Role options for ${emp.name}`} className="absolute left-4 top-full mt-1 z-30 min-w-[160px] bg-white rounded-md border border-black/[0.08] shadow-lg py-1" onClick={(e) => e.stopPropagation()}>
                                  {ROLE_OPTIONS.map(opt => {
                                    const isSelected = opt === emp.role;
                                    return (
                                      <button
                                        key={opt}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => { onUpdateRole(emp.id, opt); setOpenDropdown(null); }}
                                        className={`w-full px-3 py-1.5 text-left flex items-center gap-2 text-caption font-medium transition-colors ${isSelected ? 'bg-[#204CC7]/[0.04] text-black/85' : 'text-black/70 hover:bg-black/[0.03]'}`}
                                      >
                                        <span className={`w-2 h-2 rounded-full ${roleStyles(opt).dot}`} aria-hidden="true" />
                                        <span className="flex-1">{opt}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </>
                    );
                  })()}
                  <td className="py-3.5 px-4 text-center">
                    <EmployeeStatusPill status={emp.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-caption text-black/60 font-medium whitespace-nowrap">{formatDate(emp.joiningDate)}</span>
                    {emp.exitDate && <p className="text-caption text-red-400 font-normal whitespace-nowrap">Exit: {formatDate(emp.exitDate)}</p>}
                  </td>
                  <td className="py-3.5 pr-5">
                    <button
                      aria-label={`More actions for ${emp.name}`}
                      className="w-7 h-7 rounded-full hover:bg-black/[0.05] flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
                    >
                      <MoreVertical className="w-4 h-4 text-black/40" />
                    </button>
                  </td>
                </tr>
              ))}
              {visibleEmployees.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                    <p className="text-black/50 text-body font-medium">No employees match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
          <span className="text-black/50 text-caption font-normal">
            Showing {visibleEmployees.length} of {MOCK_EMPLOYEES.filter(e => e.status === 'Active' || e.status === 'On Notice').length} employees
          </span>
        </div>
      </div>
      )}

      {/* Past Employees screen — dedicated 7-column read-only
          table. Reuses the parent's `search` filter so the search
          box still narrows the past roster, but the live-mode
          status / department filters were cleared on entry by
          goToPast (they don't apply here). */}
      {viewMode === 'past' && (
        <PastEmployeesTable rows={pastEmployees} />
      )}

      {/* Employee detail drawer */}
      {selectedEmployee && (
        <EmployeeDrawer
          employee={selectedEmployee}
          personal={personalDetails[selectedEmployee.id]}
          onClose={() => onSelectEmployee(null)}
          onUpdateCLA={onUpdateCLA}
          onAddDocuments={onAddDocuments}
          onRemoveDocument={onRemoveDocument}
          onRemoveEmployee={onRemoveEmployee}
        />
      )}

      {/* Add Employee modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(input) => {
            onAddEmployee(input);
            setShowAddModal(false);
          }}
        />
      )}

      {/* Add Past Employee modal — opens from the Past Employees
          screen's top-bar CTA. Closes on cancel / submit. */}
      {showAddPastModal && (
        <AddPastEmployeeModal
          onCancel={() => setShowAddPastModal(false)}
          onSubmit={(payload) => {
            onAddPastEmployee(payload);
            setShowAddPastModal(false);
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RESOURCE REQUESTS TAB
   ═══════════════════════════════════════════════════════════════════ */

function ResourceRequestsTab({
  requests, stats, totalCount, search, onSearch, statusFilter, onStatusFilter, priorityFilter, onPriorityFilter,
  monthOptions, monthFilter, onMonthFilter,
}: {
  requests: ResourceRequest[];
  stats: { total: number; pending: number; open: number; fulfilled: number; totalPositions: number };
  totalCount: number;
  search: string;
  onSearch: (v: string) => void;
  statusFilter: 'All' | RequestStatus;
  onStatusFilter: (v: 'All' | RequestStatus) => void;
  priorityFilter: 'All' | RequestPriority;
  onPriorityFilter: (v: 'All' | RequestPriority) => void;
  /** Available months derived from request data, newest first. Used by the Month filter. */
  monthOptions: { value: string; label: string }[];
  monthFilter: 'All' | string;
  onMonthFilter: (v: 'All' | string) => void;
}) {
  // Modal open/close. Form state + a11y + submission are owned by the
  // shared <NewResourceRequestModal> component — it writes directly to
  // the resource-requests store.
  const [showNewModal, setShowNewModal] = useState(false);

  return (
    <div>
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on All Customers / All Employees / CLA-NTF /
        Incoming. Title + subtitle anchor the left; Search, Status
        filter, and the primary New Request CTA hang on the right.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Resource Request</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Open hiring requests by department and priority</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search */}
            <div className="relative w-[260px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="resource-request-search" className="sr-only">Search resource requests</label>
              <input
                id="resource-request-search"
                type="text"
                placeholder="Search by ID, requester, or department…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => onSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" />
                </button>
              )}
            </div>

            {/* Month dropdown — month-on-month history. Defaults to "All
                months" so the page lands showing the freshest activity;
                pick any month to scope the table (and the stats below)
                to that period. Same chrome as the Status / Priority
                filters so they read as one tight cluster. */}
            <div className="relative">
              <label htmlFor="resource-request-month-filter" className="sr-only">Month filter</label>
              <select
                id="resource-request-month-filter"
                value={monthFilter}
                onChange={(e) => onMonthFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All months</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Status dropdown */}
            <div className="relative">
              <label htmlFor="resource-request-status-filter" className="sr-only">Status filter</label>
              <select
                id="resource-request-status-filter"
                value={statusFilter}
                onChange={(e) => onStatusFilter(e.target.value as 'All' | RequestStatus)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending approval</option>
                <option value="Open">Open</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Rejected">Rejected</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Priority dropdown — same chrome as Status so the two read
                as a paired filter set. */}
            <div className="relative">
              <label htmlFor="resource-request-priority-filter" className="sr-only">Priority filter</label>
              <select
                id="resource-request-priority-filter"
                value={priorityFilter}
                onChange={(e) => onPriorityFilter(e.target.value as 'All' | RequestPriority)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All Priority</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* New Request — primary CTA, brand-blue solid */}
            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* Stats row — ordered by what demands attention first.
          Pending = admin's inbox, the only number that's actionable
          right now. Then the in-flight counts (Open / Fulfilled), then
          the headline (Open Positions). Pending uses a coloured value
          when > 0 to draw the eye without adding chrome. */}
      <div className="flex items-stretch gap-4 mb-5">
        <StatCard label="Total Requests" value={stats.total} color="text-black/85" />
        <StatCard label="Pending approval" value={stats.pending} sub={stats.pending > 0 ? 'Awaiting your decision' : 'All caught up'} color={stats.pending > 0 ? 'text-amber-600' : 'text-black/40'} />
        <StatCard label="Open" value={stats.open} color="text-blue-600" />
        <StatCard label="Fulfilled" value={stats.fulfilled} color="text-emerald-600" />
        <StatCard label="Open Positions" value={stats.totalPositions} sub="Across open requests" color="text-[#204CC7]" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1000 }}>
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th scope="col" className="text-left py-3 pl-5 pr-3"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Request ID</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Requested By</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Department</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Role</span></th>
                <th scope="col" className="text-center py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Positions</span></th>
                <th scope="col" className="text-center py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Priority</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Requested</span></th>
                <th scope="col" className="text-left py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Recruiter</span></th>
                {/* Status sits at the end so the row reads as a journey:
                    identity → ask → context → decision. The actionable
                    cell is the last thing the eye lands on. */}
                <th scope="col" className="text-center py-3 px-4"><span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Status</span></th>
                <th scope="col" className="py-3 pr-5 w-[50px]"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                  }`}
                >
                  <td className="py-3.5 pl-5 pr-3">
                    <span className="text-caption font-mono text-[#204CC7] font-semibold">{r.requestId}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-body text-black/75 font-medium whitespace-nowrap">{r.requestedBy}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-caption font-medium ${
                      r.department === 'Performance Marketing' ? 'bg-[#EEF1FB] text-[#5B7FD6]' :
                      r.department === 'Accounts & Taxation' ? 'bg-cyan-50 text-cyan-700' :
                      'bg-black/[0.04] text-black/55'
                    }`}>{r.department}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-body text-black/65 font-medium">{r.role}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#EEF1FB] text-[#204CC7] text-caption font-bold tabular-nums">{r.positions}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <PriorityPill priority={r.priority} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-caption text-black/60 font-medium whitespace-nowrap">{formatDate(r.requestDate)}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <RecruiterMenu request={r} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {/*
                      Status cell branches by lifecycle stage so each row
                      shows exactly the action that's available right now:
                      • Pending  → admin's Approve / Reject buttons
                      • Open / Fulfilled → recruiter's status dropdown
                      • Rejected → terminal pill (no menu, no actions)
                      Single column, three states, zero ambiguity.
                    */}
                    {r.status === 'Pending' ? (
                      <RequestApprovalActions request={r} />
                    ) : r.status === 'Rejected' ? (
                      <RequestStatusPill status={r.status} />
                    ) : (
                      <RequestStatusMenu request={r} />
                    )}
                  </td>
                  <td className="py-3.5 pr-5">
                    <button
                      aria-label={`More actions for ${r.requestId}`}
                      className="w-7 h-7 rounded-full hover:bg-black/[0.05] flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100 transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
                    >
                      <MoreVertical className="w-4 h-4 text-black/40" />
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                    <p className="text-black/50 text-body font-medium">No requests match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
          <span className="text-black/50 text-caption font-normal">
            Showing {requests.length} of {totalCount} requests
          </span>
        </div>
      </div>

      {/*
        New Request modal — extracted into a shared component so the same
        form is also reachable from the A&T deliverables page. The modal
        owns its own form state + a11y; submission writes through the
        shared resource-requests store.
      */}
      <NewResourceRequestModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED: SORTABLE TABLE HEADER
   ═══════════════════════════════════════════════════════════════════ */

export function SortTh({ label, sortKey, current, onSort, className = '', align = 'left' }: {
  label: string;
  sortKey: string;
  current: { key: string; dir: 'asc' | 'desc' };
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right';
}) {
  const isActive = current.key === sortKey;
  const ariaSort = isActive ? (current.dir === 'asc' ? 'ascending' : 'descending') : undefined;
  return (
    <th scope="col" aria-sort={ariaSort} className={`text-${align} py-3 px-4 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 hover:text-black/70 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 rounded transition-colors group/sort ${align === 'right' ? 'ml-auto' : ''}`}
      >
        <span className={`text-caption font-semibold uppercase tracking-wider ${isActive ? 'text-[#204CC7]' : 'text-black/50'}`}>{label}</span>
        <ArrowUpDown className={`w-3 h-3 transition-colors ${isActive ? 'text-[#204CC7]' : 'text-black/30 group-hover/sort:text-black/40'}`} aria-hidden="true" />
      </button>
    </th>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════════ */

function RelationshipBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    'Excellent':       { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-100' },
    'Good':            { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-100'    },
    'Needs Attention': { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-100'   },
  };
  const s = map[status] || map['Good'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

type CustomerTab = 'overview' | 'onboarding' | 'details' | 'team' | 'financials';

type EditableCustomerForm = {
  companyName: string;
  brandName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  channel: string;
  finalBilling: number;
  sector: string;
  subSector: string;
  service: CustomerService;
  paymentTerms: PaymentTerms;
};

const CHANNEL_OPTIONS = ['Direct', 'Referral', 'Inbound', 'Outbound', 'Partner'];
const PAYMENT_TERMS_OPTIONS: PaymentTerms[] = ['Prepaid', 'Postpaid'];
const SERVICE_OPTIONS: CustomerService[] = ['Performance Marketing', 'Accounts & Taxation', 'Both'];
// Stage is a high-level state indicator only. The granular sub-states
// (Signed, KYC, Kickoff, etc.) that used to live here are now expressed
// by the sectioned checklist itself — keeping them in the dropdown
// duplicated the read and made admins ask "what's the difference
// between 'Kickoff' and the Kickoff section being done?". Three states
// cover the lifecycle cleanly: hasn't started, in flight, finished.
const ONBOARDING_STAGES = ['Not Started', 'In Progress', 'Completed'] as const;
const ONBOARDING_STAGE_PCT: Record<string, number> = {
  'Not Started': 0,
  'In Progress': 50,
  'Completed': 100,
};

// ═══════════════════════════════════════════════════════════════════
//  ONBOARDING CHECKLIST — section templates + helpers
// ═══════════════════════════════════════════════════════════════════
//
// The customer detail page renders the same rich, sectioned
// onboarding checklist that lives on `/home → Customers → Onboarding`.
// Templates are kept locally in sync with `adminland/OnboardingModule`
// so editing them in one place doesn't accidentally drift the other —
// if Brego changes its onboarding playbook, both surfaces ship the
// new wording together.

interface OnboardingStep {
  label: string;
  done: boolean;
  completedDate?: string;
}
interface OnboardingSection {
  title: string;
  items: OnboardingStep[];
}

// SEM (Performance Marketing) — single Setup section.
const PM_SETUP_LABELS = [
  'Brand brief & USPs collected',
  'Competitor analysis completed',
  'Ad accounts access received',
  'Platform setup (Google/Meta)',
  'Tracking & analytics configured',
];

// A&T (Accounts & Taxation) — three sections.
const AT_KICKOFF_LABELS = [
  'Kickoff done',
  'Minutes of the meetings shared',
];
const AT_DATA_SHARING_LABELS = [
  'Audited Financial Statement',
  'Latest Tally Backup',
  'Company/LLP Document',
  'Latest Bank Statement',
  'NBFC (Loan re-payment schedule/statement)',
  'Purchase/Expenses Data',
  'Credit Card Statement',
  'Reimbursement Data',
  'Salary Register',
  'Past TDS & GST workings',
  'Petty Cash Register',
  'Sales Data',
  'GAP Analysis shared on data',
  'Pending backlog discussion',
];
const AT_LOG_IDS_LABELS = [
  'GST portal login received',
  'TDS portal login received',
  'ITR login received',
  'PT/CPT Credentials (PTEC/PTRC)',
  'E-invoice login (Website & Software)',
  'Internal Software Credentials',
  'Tally Login ID',
  'Payment credentials',
  'POS System',
  'Payroll login ID',
  'Prepaid Partner Credentials',
  'COD Payment Credentials',
  'E-commerce portals login received',
];

/** Build a service-aware onboarding checklist for a single business.
 *  Done counts are seeded from the customer's existing
 *  `onboardingProgress` % so the UI starts in a believable state.
 *  Admins can then toggle individual items. */
function buildOnboardingSections(c: Customer): OnboardingSection[] {
  const ratio = Math.max(0, Math.min(1, (c.onboardingProgress ?? 0) / 100));
  const completedDate = c.kickoffDate ? formatDate(c.kickoffDate) : '';
  const fill = (labels: string[], doneCount: number): OnboardingStep[] =>
    labels.map((label, i) => ({
      label,
      done: i < doneCount,
      completedDate: i < doneCount ? completedDate : undefined,
    }));

  const sections: OnboardingSection[] = [];
  const isPM = c.service === 'Performance Marketing' || c.service === 'Both';
  const isAT = c.service === 'Accounts & Taxation' || c.service === 'Both';

  if (isPM) {
    const total = PM_SETUP_LABELS.length;
    const done = Math.round(ratio * total);
    sections.push({
      title: c.service === 'Both' ? 'SEM Setup' : 'Setup',
      items: fill(PM_SETUP_LABELS, done),
    });
  }

  if (isAT) {
    // Distribute the customer's overall progress proportionally
    // across the three A&T sections, in order. So an A&T client at
    // 40% lands with kickoff fully done + ~9 items into Data Sharing
    // — which matches how onboarding actually progresses (you can't
    // start collecting logs before kickoff is done, etc.).
    const totalAT = AT_KICKOFF_LABELS.length + AT_DATA_SHARING_LABELS.length + AT_LOG_IDS_LABELS.length;
    let remaining = Math.round(ratio * totalAT);
    const kickoffDone = Math.min(remaining, AT_KICKOFF_LABELS.length); remaining -= kickoffDone;
    const dataDone    = Math.min(remaining, AT_DATA_SHARING_LABELS.length); remaining -= dataDone;
    const logsDone    = Math.min(remaining, AT_LOG_IDS_LABELS.length);

    sections.push({ title: c.service === 'Both' ? 'A&T Kickoff' : 'Kickoff', items: fill(AT_KICKOFF_LABELS, kickoffDone) });
    sections.push({ title: 'Data Sharing', items: fill(AT_DATA_SHARING_LABELS, dataDone) });
    sections.push({ title: 'Log IDs',      items: fill(AT_LOG_IDS_LABELS,      logsDone) });
  }

  return sections;
}

function sectionsTotal(sections: OnboardingSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}
function sectionsDone(sections: OnboardingSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.filter(i => i.done).length, 0);
}
function computeSectionsProgress(sections: OnboardingSection[]): number {
  const total = sectionsTotal(sections);
  return total === 0 ? 0 : Math.round((sectionsDone(sections) / total) * 100);
}

/** Days between today and the customer's kickoff (or joined) date.
 *  Anchored to the project's mock "today" so the number stays stable
 *  alongside the rest of the dataset. */
function daysSinceKickoff(c: Customer): number {
  const startStr = c.kickoffDate || c.joinedDate;
  if (!startStr) return 0;
  const start = new Date(startStr);
  if (Number.isNaN(start.getTime())) return 0;
  const today = new Date('2026-05-05T00:00:00Z');
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

// ════════════════════════════════════════════════════════════════════
// TEAM ASSIGNMENT — pool resolver + auto-fill helper
// ════════════════════════════════════════════════════════════════════
//
// Department-aware role pools. SEM picks come from Performance
// Marketing employees; A&T picks come from Accounts & Taxation. POD
// Head and Assistant Manager broaden their pools to senior Managers
// (and strong Executives for AM) so admins always have useful options.
function buildPoolsForDept(dept: string): Record<TeamRoleKey, EmployeeRecord[]> {
  const pool = MOCK_EMPLOYEES.filter(e =>
    e.status === 'Active' && (e.department === dept || e.department === 'All Departments')
  );
  return {
    hod:              pool.filter(e => e.role === 'HOD'),
    podHead:          pool.filter(e => e.role === 'POD Head' || e.role === 'Manager' || e.role === 'HOD'),
    manager:          pool.filter(e => e.role === 'Manager'),
    assistantManager: pool.filter(e => e.role === 'Assistant Manager' || e.role === 'Manager' || e.role === 'Executive'),
    executive:        pool.filter(e => e.role === 'Executive' || e.role === 'Intern'),
  };
}

// Default monthly hours per role — escalates with seniority since
// junior roles do more delivery work, senior roles do oversight.
const DEFAULT_TEAM_HOURS: Record<TeamRoleKey, number> = {
  hod: 8,
  podHead: 16,
  manager: 24,
  assistantManager: 32,
  executive: 40,
};

// Build a department-pure team for a single service lane.
// SEM and A&T are entirely separate departments at Brego — their HODs
// are different people, their managers don't overlap, the team rosters
// are disjoint. So when we seed a lane:
//   1. Keep names from the customer's existing teamStructure ONLY if
//      they belong to the lane's department pool. Foreign names are
//      dropped (the slot resets to empty), not labelled "cross-
//      department" — that concept doesn't exist in the real org.
//   2. Auto-fill every empty slot with a department-matched person.
//      Default hours escalate by role seniority.
//   3. Track used names within the lane so the same person doesn't
//      land on two slots in one team.
function autoFillTeamForLane(
  seed: TeamStructure,
  pools: Record<TeamRoleKey, EmployeeRecord[]>,
): TeamStructure {
  const usedNames = new Set<string>();

  // Step 1: filter the seed — keep slot only when the assigned
  // person is in this lane's department pool.
  const isInLane = (key: TeamRoleKey, name: string) =>
    pools[key].some(e => e.name === name);
  const keepIfInLane = (slot: TeamSlot, key: TeamRoleKey): TeamSlot => {
    if (slot.name && isInLane(key, slot.name)) {
      usedNames.add(slot.name);
      return slot;
    }
    return { name: '', hours: 0 };
  };
  const filtered: TeamStructure = {
    hod:              keepIfInLane(seed.hod,              'hod'),
    podHead:          keepIfInLane(seed.podHead,          'podHead'),
    manager:          keepIfInLane(seed.manager,          'manager'),
    assistantManager: keepIfInLane(seed.assistantManager, 'assistantManager'),
    executive:        keepIfInLane(seed.executive,        'executive'),
  };

  // Step 2: auto-fill every empty slot.
  const fill = (key: TeamRoleKey, slot: TeamSlot): TeamSlot => {
    if (slot.name) return slot;
    for (const candidate of pools[key]) {
      if (!usedNames.has(candidate.name)) {
        usedNames.add(candidate.name);
        return { name: candidate.name, hours: DEFAULT_TEAM_HOURS[key] };
      }
    }
    return pools[key][0]
      ? { name: pools[key][0].name, hours: DEFAULT_TEAM_HOURS[key] }
      : slot;
  };
  return {
    hod:              fill('hod',              filtered.hod),
    podHead:          fill('podHead',          filtered.podHead),
    manager:          fill('manager',          filtered.manager),
    assistantManager: fill('assistantManager', filtered.assistantManager),
    executive:        fill('executive',        filtered.executive),
  };
}

/**
 * Customer detail surface — used in two presentations:
 *
 *   1. As a drawer (default) — slide-in panel from the right with a
 *      backdrop, max-width 760px. This is how the legacy
 *      DatabaseCustomersPage opens a customer.
 *
 *   2. As a page (`surface='page'`) — same hero, tabs, and tab content
 *      rendered as a full-width page-level surface. Used by the new
 *      client-grouped All Customers flow (CustomersByClient) so a
 *      multi-business client gets a dedicated route instead of a
 *      drawer. The caller is responsible for providing breadcrumb /
 *      back affordances via `pageHeader`.
 *
 * Both surfaces share *every* internal piece — same state, same hero
 * markup, same Overview/Details/Team/Financials tab content. Only the
 * outer chrome differs (dialog wrapper vs page-level container) and
 * the close button is suppressed in page mode (the page provides its
 * own back affordance).
 */
export function CustomerDrawer({
  customer,
  onSwitchCustomer,
  onClose,
  surface = 'drawer',
  pageHeader,
  onDeactivateBusiness,
  onDeactivateClient,
  onChangeAtPlan,
}: {
  customer: Customer;
  onSwitchCustomer?: (c: Customer) => void;
  /** Drawer mode: required (closes the drawer). Page mode: ignored — the
   *  page chrome handles back navigation. Defaults to a no-op so the
   *  prop is optional in page mode. */
  onClose?: () => void;
  /** Visual presentation. 'drawer' renders a fixed slide-in dialog;
   *  'page' renders an inline page-level surface inside the parent
   *  scroll container. */
  surface?: 'drawer' | 'page';
  /** Slot rendered on the left of the sticky top bar in page mode
   *  (typically a back button + breadcrumb). Falls back to the
   *  default "Customer" title when omitted. Ignored in drawer mode. */
  pageHeader?: React.ReactNode;
  /** Soft-delete the active business — flip its status to Inactive
   *  and let the parent reroute the admin back to the list. */
  onDeactivateBusiness?: (businessId: string) => void;
  /** Soft-delete the entire client — flip every business they own
   *  to Inactive. */
  onDeactivateClient?: (customerId: string) => void;
  /** Change the A&T plan tier for a specific business. The parent
   *  writes the override into its planOverrides map so the change
   *  persists across sibling switches and tab flips. */
  onChangeAtPlan?: (businessId: string, plan: ATPlan) => void;
}) {
  const handleClose = onClose ?? (() => {});
  const c = customer;
  const [showCLAModal, setShowCLAModal] = useState(false);
  // Deactivate-customer modal mode — null when closed; 'business'
  // moves just this engagement to Inactive, 'client' moves every
  // business owned by this customer to Inactive. Reversible by
  // design — the records stay, only the status flips.
  const [deactivateMode, setDeactivateMode] = useState<null | 'business' | 'client'>(null);
  // A&T plan-change modal — null when closed; otherwise carries the
  // business whose plan the admin is editing.
  const [planEditingBusiness, setPlanEditingBusiness] = useState<Customer | null>(null);
  const [isCLA, setIsCLA] = useState(false);
  const [tab, setTab] = useState<CustomerTab>('overview');
  const [editing, setEditing] = useState(false);
  const [businessSwitcherOpen, setBusinessSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  // "More options" menu in the top bar — always reachable, every tab.
  // Houses the destructive removal entries so the admin doesn't have
  // to navigate to Details → scroll → Danger Zone every time.
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // All businesses owned by the same person (across all statuses/services).
  // Computed from the full directory — not the filtered list — so siblings
  // remain reachable even when the table is filtered.
  const allBusinesses = useMemo(
    () => MOCK_CUSTOMERS.filter(x => x.customerId === c.customerId),
    [c.customerId]
  );
  const siblings = useMemo(
    () => allBusinesses.filter(x => x.id !== c.id),
    [allBusinesses, c.id]
  );
  const hasSiblings = siblings.length > 0;
  const totalBusinesses = allBusinesses.length;
  const businessPosition = useMemo(
    () => allBusinesses.findIndex(x => x.id === c.id) + 1,
    [allBusinesses, c.id]
  );

  // Customer-wide billing totals (sum across all businesses owned by this person).
  // Used for resource-utilization and account-value reporting.
  const customerTotals = useMemo(() => ({
    finalBilling: allBusinesses.reduce((s, b) => s + (b.finalBilling || 0), 0),
    monthlyRetainer: allBusinesses.reduce((s, b) => s + (b.monthlyRetainer || 0), 0),
    totalRevenue: allBusinesses.reduce((s, b) => s + (b.totalRevenue || 0), 0),
  }), [allBusinesses]);

  const [form, setForm] = useState<EditableCustomerForm>({
    companyName: c.companyName,
    brandName: c.brandName,
    contactPerson: c.contactPerson,
    email: c.email,
    phone: c.phone,
    address: c.address,
    channel: c.channel,
    finalBilling: c.finalBilling,
    sector: c.sector,
    subSector: c.subSector,
    service: c.service,
    paymentTerms: c.paymentTerms,
  });

  // Two service-line teams. Each lane runs an independent 5-role
  // structure (HOD / POD Head / Manager / AM / Executive) because at
  // Brego SEM and A&T are separate operational departments — their
  // HODs are different people (Chinmay vs Zubear), their managers
  // are different, the assignments don't overlap. Seeded from the
  // customer's existing teamStructure with auto-fill applied so any
  // empty slots get a department-matched person — at Brego nearly
  // every active engagement runs all 5 roles, so the default is
  // "fully staffed" and the admin tweaks from there.
  const [semTeam, setSemTeam] = useState<TeamStructure>(
    () => autoFillTeamForLane(c.teamStructure, buildPoolsForDept('Performance Marketing'))
  );
  const [atTeam, setAtTeam] = useState<TeamStructure>(
    () => autoFillTeamForLane(c.teamStructure, buildPoolsForDept('Accounts & Taxation'))
  );

  // For backward-compat with the Overview team summary (and any old
  // call-sites still referencing `team`), expose the active service's
  // team as `team`. For "Both" customers this defaults to the SEM
  // team — the Overview's full read uses combined stats below.
  const team = c.service === 'Accounts & Taxation' ? atTeam : semTeam;

  const [onbStage, setOnbStage] = useState<string>(c.onboardingStage);
  const [onbProgress, setOnbProgress] = useState<number>(c.onboardingProgress);

  const handleStageChange = (stage: string) => {
    setOnbStage(stage);
    if (stage in ONBOARDING_STAGE_PCT) setOnbProgress(ONBOARDING_STAGE_PCT[stage]);
  };

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = 'customer-drawer-title';

  // ESC to close + initial focus — only in drawer mode (page mode
  // doesn't have a modal context, so ESC shouldn't navigate away).
  useEffect(() => {
    if (surface !== 'drawer') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, surface]);

  // Close Business Switcher on outside click
  useEffect(() => {
    if (!businessSwitcherOpen) return;
    const onDown = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setBusinessSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [businessSwitcherOpen]);

  // Close More menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [moreOpen]);

  const tenure = useMemo(() => {
    const start = new Date(c.joinedDate);
    const end = c.exitDate ? new Date(c.exitDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months}m`;
  }, [c.joinedDate, c.exitDate]);

  // Service-aware employee pools (resolved by `buildPoolsForDept`
  // at module scope so the team auto-fill seed and the dropdown
  // options share the same source of truth).
  const semEmployeesByRole = useMemo(() => buildPoolsForDept('Performance Marketing'), []);
  const atEmployeesByRole  = useMemo(() => buildPoolsForDept('Accounts & Taxation'), []);

  // Combined stats across active service-line teams — used by the
  // Overview team summary so it reflects the full workforce on the
  // engagement (not just one lane).
  const teamStats = useMemo(() => {
    const lanes: { team: TeamStructure; service: 'SEM' | 'A&T' }[] = [];
    if (c.service === 'Performance Marketing' || c.service === 'Both') lanes.push({ team: semTeam, service: 'SEM' });
    if (c.service === 'Accounts & Taxation' || c.service === 'Both')   lanes.push({ team: atTeam,  service: 'A&T' });

    let assignedCount = 0;
    let totalHours = 0;
    const slots: { slot: TeamSlot; service: 'SEM' | 'A&T' }[] = [];
    for (const { team: t, service } of lanes) {
      for (const slot of [t.hod, t.podHead, t.manager, t.assistantManager, t.executive]) {
        if (slot.name) {
          assignedCount += 1;
          slots.push({ slot, service });
        }
        totalHours += slot.hours || 0;
      }
    }
    return { assignedCount, totalHours, slots, lanes };
  }, [c.service, semTeam, atTeam]);

  // Backwards-compat aliases for anywhere the legacy single-lane
  // values are still referenced (e.g. Overview team summary).
  const totalHours = teamStats.totalHours;
  const assignedCount = teamStats.assignedCount;

  const updateSemSlot = (key: TeamRoleKey, field: keyof TeamSlot, value: string | number) => {
    setSemTeam(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };
  const updateAtSlot = (key: TeamRoleKey, field: keyof TeamSlot, value: string | number) => {
    setAtTeam(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSaveDetails = () => {
    // In a real app, persist to backend. For now, just exit edit mode.
    setEditing(false);
  };

  const handleCancelDetails = () => {
    setForm({
      companyName: c.companyName,
      brandName: c.brandName,
      contactPerson: c.contactPerson,
      email: c.email,
      phone: c.phone,
      address: c.address,
      channel: c.channel,
      finalBilling: c.finalBilling,
      sector: c.sector,
      subSector: c.subSector,
      service: c.service,
      paymentTerms: c.paymentTerms,
    });
    setEditing(false);
  };

  // ── Page-surface centering rail ──────────────────────────────────
  // In page mode the entire customer surface lives inside a calm
  // 960px reading column centered on a soft canvas. The chrome (top
  // bar) extends edge-to-edge for visual continuity with the rest of
  // the admin shell, but its content (title / CLA controls) snaps to
  // the same centered rail as the body so vertical alignment between
  // the two reads cleanly. In drawer mode the rail is a no-op — the
  // panel's max-w-[760px] already does the constraint.
  const PAGE_RAIL = 'max-w-[960px] mx-auto';
  const railWrap = surface === 'page' ? PAGE_RAIL : '';

  // ── Top bar (shared between drawer + page modes) ─────────────────
  // Same sticky top bar pattern: title/page header on the left, CLA
  // controls on the right, optional close button in drawer mode only.
  const topBar = (
    <div className="sticky top-0 z-20 bg-white border-b border-black/[0.06] h-14 shrink-0">
      <div className={`${railWrap} h-full px-6 flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          {surface === 'page' && pageHeader ? (
            pageHeader
          ) : (
            <h2 id={titleId} className="text-h3 font-semibold text-black truncate">
              Customer
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCLA ? (
            <span className="h-9 px-3 rounded-md bg-[#E2445C]/[0.08] border border-[#E2445C]/25 text-[#E2445C] inline-flex items-center gap-1.5 text-caption font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              On CLA List
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowCLAModal(true)}
              className="h-9 px-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 transition-all inline-flex items-center gap-1.5 text-caption font-semibold"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Add to CLA
            </button>
          )}

          {/* More options — destructive actions live here (and the
              Danger Zone in Details). Always reachable from any tab,
              tucked behind a kebab so it doesn't compete with CLA. */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(o => !o)}
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              className="w-9 h-9 rounded-md border border-black/10 hover:bg-black/5 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
            >
              <MoreVertical className="w-4 h-4 text-black/60" aria-hidden="true" />
            </button>
            {moreOpen && (
              <div
                role="menu"
                aria-label="Customer actions"
                className="absolute right-0 top-full mt-2 w-[260px] bg-white rounded-md border border-black/[0.08] shadow-[0_8px_24px_-6px_rgba(0,0,0,0.18)] overflow-hidden z-30"
                style={{ animation: 'slideIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMoreOpen(false); setDeactivateMode('business'); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:bg-amber-100/50"
                >
                  <Archive className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-amber-900">Mark business inactive</p>
                    <p className="text-caption text-black/55 truncate">{c.companyName}</p>
                  </div>
                </button>
                {hasSiblings && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); setDeactivateMode('client'); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:bg-amber-100/50 border-t border-black/[0.06]"
                  >
                    <Archive className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-caption font-semibold text-amber-900">Mark client inactive</p>
                      <p className="text-caption text-black/55 truncate">{c.contactPerson} · {totalBusinesses} businesses</p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {surface === 'drawer' && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close customer details"
              className="w-9 h-9 rounded-md border border-black/10 hover:bg-black/5 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
            >
              <X className="w-4 h-4 text-black/60" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Scrollable body (shared between drawer + page modes) ─────────
  // The body itself spans the full scroll area so the scrollbar lives
  // on the page edge (a familiar admin-tool affordance), but in page
  // mode the actual content is constrained to the 960px reading rail
  // and rendered on a white surface flanked by the canvas — the
  // "document on a calm canvas" idiom. In drawer mode the rail wrap
  // is empty so behaviour is identical to before.
  const scrollableBody = (
    <div className="flex-1 overflow-y-auto">
      <div className={surface === 'page' ? `${PAGE_RAIL} bg-white border-x border-black/[0.06]` : ''}>
          {/* ── Tabs (sticky to top of body scroll) ──
              Tabs come first so they're the primary navigation read.
              Sticky `top-0` keeps them pinned as the hero + tab
              content scroll away beneath them — admins always have
              the section nav within reach without losing context. */}
          <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-6">
            <div className="flex items-center gap-1" role="tablist" aria-label="Customer sections">
              {([
                ['overview', 'Overview'],
                ['onboarding', 'Onboarding'],
                ['details', 'Details'],
                ['team', 'Team & Efforts'],
                ['financials', 'Financials'],
              ] as const).map(([key, label]) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    onClick={() => { setTab(key); if (key !== 'details') setEditing(false); }}
                    className={`h-11 px-3.5 text-caption font-semibold transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded-md ${
                      active ? 'text-[#204CC7]' : 'text-black/55 hover:text-black/80'
                    }`}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute left-1 right-1 -bottom-px h-0.5 bg-[#204CC7] rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Calm Hero (identity only) ──
              Hidden on the Overview tab — that tab now leads with a
              client-level summary card (multi-business) or a 3-KPI
              grid (single-business), and includes a Businesses list
              that handles sibling-switching directly. The per-
              business hero is redundant there. The other tabs
              (Onboarding / Details / Team / Financials) keep the
              hero as a per-business identity anchor + switcher. */}
          {tab !== 'overview' && (
          <div className="px-6 py-4 border-b border-black/[0.06]">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Identity */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0 ring-1 ring-black/[0.04]" aria-hidden="true">
                  <span className="text-h3 font-semibold text-black/55">{c.companyName.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-h2 font-bold text-black truncate leading-tight">{c.companyName}</h3>
                  <p className="text-caption text-black/55 truncate leading-snug">
                    {c.brandName && c.brandName !== c.companyName ? `Brand: ${c.brandName} · ` : ''}{c.sector}
                  </p>
                </div>
              </div>
              {/* State + switcher */}
              <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
                <CustomerStatusPill status={c.status} />
                <ServicePill service={c.service} />
                {c.exitDate && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border bg-red-50 text-red-700 border-red-200">
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    Churned {formatDate(c.exitDate)}
                  </span>
                )}
                {hasSiblings && (
                  <div className="relative" ref={switcherRef}>
                      <button
                        type="button"
                        onClick={() => setBusinessSwitcherOpen(v => !v)}
                        aria-haspopup="menu"
                        aria-expanded={businessSwitcherOpen}
                        aria-label={`Viewing ${c.companyName}, business ${businessPosition} of ${totalBusinesses} owned by ${c.contactPerson}. Switch business.`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium border bg-[#204CC7]/[0.06] text-[#204CC7] border-[#204CC7]/20 hover:bg-[#204CC7]/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors max-w-[260px]"
                      >
                        <Layers className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="font-semibold truncate">{c.companyName}</span>
                        <span className="text-[#204CC7]/65 tabular-nums shrink-0">
                          {businessPosition}/{totalBusinesses}
                        </span>
                        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${businessSwitcherOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {businessSwitcherOpen && (
                        <div
                          role="menu"
                          aria-label={`Businesses owned by ${c.contactPerson}`}
                          className="absolute left-0 top-full mt-2 w-[320px] bg-white rounded-xl border border-black/[0.08] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] overflow-hidden z-30"
                          style={{ animation: 'slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
                        >
                          {/* Person header */}
                          <div className="px-3.5 py-3 bg-black/[0.025] border-b border-black/[0.06]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#204CC7]/10 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-caption font-semibold text-black truncate">{c.contactPerson}</p>
                                <p className="text-caption text-black/55 truncate">{c.email}</p>
                              </div>
                            </div>
                          </div>
                          {/* Sibling list */}
                          <ul className="py-1 max-h-[320px] overflow-y-auto">
                            {[c, ...siblings].map((biz) => {
                              const isActive = biz.id === c.id;
                              return (
                                <li key={biz.id}>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={isActive}
                                    onClick={() => {
                                      if (!isActive && onSwitchCustomer) {
                                        onSwitchCustomer(biz);
                                        setBusinessSwitcherOpen(false);
                                      }
                                    }}
                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:bg-black/[0.04] ${
                                      isActive ? 'bg-[#204CC7]/[0.06] cursor-default' : 'hover:bg-black/[0.03]'
                                    }`}
                                    aria-current={isActive ? 'true' : undefined}
                                  >
                                    <div className="w-7 h-7 rounded-md bg-black/[0.04] flex items-center justify-center shrink-0">
                                      <Building2 className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <p className={`text-caption font-semibold truncate ${isActive ? 'text-[#204CC7]' : 'text-black'}`}>
                                          {biz.companyName}
                                        </p>
                                        {isActive && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#204CC7] shrink-0" aria-hidden="true" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <ServicePill service={biz.service} />
                                        <span className="text-caption text-black/55 truncate">
                                          {formatCurrency(biz.monthlyRetainer)}/mo
                                        </span>
                                      </div>
                                    </div>
                                    {!isActive && (
                                      <ChevronRight className="w-3.5 h-3.5 text-black/35 shrink-0" aria-hidden="true" />
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          {/* Footer note */}
                          <div className="px-3.5 py-2 bg-black/[0.02] border-t border-black/[0.06]">
                            <p className="text-caption text-black/60 leading-relaxed">
                              <span className="font-medium text-black/75">Same person</span> · Each business has its own service, team, billing, and onboarding.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
          )}

          {/* ── Tab content ── */}
          <div className="px-6 py-6">
            {tab === 'overview' && (
              <div className="space-y-5">
                {/* ── Client-level summary ─────────────────────────
                    For multi-business clients the Overview reads as
                    a *client* roll-up: combined retainer / billing /
                    revenue + business count + the earliest joined
                    date (true client tenure). Per-business numbers
                    move to the Businesses list below.
                    Single-business clients fall through to the
                    cleaner 3-KPI grid since "this business" IS the
                    client. */}
                {hasSiblings ? (
                  <ClientSummaryCard
                    contactPerson={c.contactPerson}
                    allBusinesses={allBusinesses}
                    customerTotals={customerTotals}
                  />
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <SimpleKpi label="Monthly Retainer" value={formatCurrency(c.monthlyRetainer)} accent />
                    <SimpleKpi label="Final Billing" value={formatCurrency(c.finalBilling)} />
                    <SimpleKpi label="Client Tenure" value={tenure} sub={`Since ${formatDate(c.joinedDate)}`} />
                  </div>
                )}

                {/* ── Businesses list (multi-business only) ───────
                    Read-only roster of every engagement under this
                    client: name + sector caption + service chip +
                    status pill + monthly retainer. Static by design
                    — sibling switching happens via the in-hero
                    business switcher on the other tabs, not from
                    here. The Overview's job is to show the client's
                    book at a glance. */}
                {hasSiblings && (
                  <BusinessesListCard allBusinesses={allBusinesses} />
                )}

                {/* Onboarding — at-a-glance status only on Overview.
                    Done or Pending; if any business is still pending,
                    name the offenders so the admin knows where the
                    work sits without leaving the Overview tab. The
                    full sectioned checklist + holistic band lives on
                    the dedicated Onboarding tab one tap away. */}
                <CustomerOnboardingSummary
                  customer={c}
                  allBusinesses={allBusinesses}
                  onOpenOnboarding={() => setTab('onboarding')}
                />

                {/* A&T Plans — one card per A&T-applicable business
                    so the admin can see and change every engagement's
                    subscription tier from a single view. Pure-SEM
                    customers don't surface here (the helper's null
                    return short-circuits the row). */}
                {allBusinesses.some(b => resolveAtPlan(b) !== null) && (
                  <div className="space-y-3">
                    {allBusinesses
                      .filter(b => resolveAtPlan(b) !== null)
                      .map(b => (
                        <ClientPlanCard
                          key={b.id}
                          business={b}
                          onChangePlan={(biz) => setPlanEditingBusiness(biz)}
                        />
                      ))}
                  </div>
                )}

                {/* Key Relationships (read-only — synced from Client app) */}
                <div className="rounded-xl border border-black/[0.06] bg-white">
                  <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-caption font-semibold text-black">Key Relationships</h4>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-caption text-black/55 shrink-0" title="Relationship status is maintained by the client in the Client app and cannot be edited here.">
                      <Globe className="w-3 h-3 text-black/55" aria-hidden="true" />
                      Synced from Client app
                    </span>
                  </div>
                  <ul className="divide-y divide-black/[0.06]">
                    {c.keyRelationships.map((r) => (
                      <li key={r.name} className="px-4 py-3 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-caption font-semibold"
                          style={{ backgroundColor: getTeamColor(r.name) }}
                          aria-hidden="true"
                        >
                          {getInitials(r.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-caption font-semibold text-black truncate">{r.name}</p>
                          <p className="text-caption text-black/60">{r.role}</p>
                        </div>
                        <RelationshipBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Team summary — person-level aggregation across
                    every business the client owns. One row per
                    unique person (deduped by name), showing which
                    service lines they cover and total hours/mo
                    across all engagements. Avoids the matrix of
                    business × service teams that would otherwise
                    overwhelm a multi-business "Both" client. */}
                <ClientTeamSummary
                  allBusinesses={allBusinesses}
                  defaultBusinessId={c.id}
                  onManage={() => setTab('team')}
                />

                {/* Notes section retired — its main signal ("long-term
                    client") now lives as a status pill in the page
                    breadcrumb, where it can be read at a glance from
                    any tab. Free-form text notes were only being used
                    to flag tenure / shared-ownership context, both of
                    which read more naturally as structured signals
                    elsewhere on the page. */}
              </div>
            )}

            {tab === 'onboarding' && (
              <CustomerOnboardingPanel
                customer={c}
                allBusinesses={allBusinesses}
                onSwitchCustomer={onSwitchCustomer}
                onbStage={onbStage}
                onbProgress={onbProgress}
                onChangeStage={handleStageChange}
              />
            )}

            {tab === 'details' && (
              <div className="space-y-5">
                {/* Edit toggle strip (Jakob's Law: familiar edit pattern) */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-body font-semibold text-black">Customer Details</h4>
                    <p className="text-caption text-black/55 mt-0.5">{editing ? 'Editing fields — save to confirm changes.' : 'Core information admins maintain for this customer.'}</p>
                  </div>
                  {!editing && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="h-9 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.03] text-caption font-semibold text-black/75 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      Edit
                    </button>
                  )}
                </div>

                {/* Group 1: Identity */}
                <FieldGroup title="Identity">
                  <FieldInput label="Company Name" value={form.companyName} editing={editing} onChange={v => setForm({ ...form, companyName: v })} required />
                  <FieldInput label="Brand Name" value={form.brandName} editing={editing} onChange={v => setForm({ ...form, brandName: v })} />
                </FieldGroup>

                {/* Group 2: Contact */}
                <FieldGroup title="Contact">
                  {hasSiblings && (
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#204CC7]/[0.04] border border-[#204CC7]/15">
                      <div className="w-6 h-6 rounded-md bg-[#204CC7]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Layers className="w-3 h-3 text-[#204CC7]" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption font-semibold text-black/85 leading-snug">
                          Shared with {siblings.length} other business{siblings.length === 1 ? '' : 'es'}
                        </p>
                        <p className="text-caption text-black/65 leading-relaxed mt-0.5">
                          This customer owns {totalBusinesses} businesses — name, email, phone, and address are the same person across all of them. Editing here updates all.
                        </p>
                      </div>
                    </div>
                  )}
                  <FieldInput label="Customer Name" value={form.contactPerson} editing={editing} onChange={v => setForm({ ...form, contactPerson: v })} required />
                  <FieldInput label="Email ID" type="email" value={form.email} editing={editing} onChange={v => setForm({ ...form, email: v })} required />
                  <FieldInput label="Phone Number" type="tel" value={form.phone} editing={editing} onChange={v => setForm({ ...form, phone: v })} required />
                  <FieldTextarea label="Address" value={form.address} editing={editing} onChange={v => setForm({ ...form, address: v })} />
                </FieldGroup>

                {/* Group 3: Classification */}
                <FieldGroup title="Classification">
                  <FieldInput label="Sector" value={form.sector} editing={editing} onChange={v => setForm({ ...form, sector: v })} />
                  <FieldInput label="Sub-Sector" value={form.subSector} editing={editing} onChange={v => setForm({ ...form, subSector: v })} placeholder="e.g. D2C Fashion" />
                  <FieldSelect label="Channel" value={form.channel} options={CHANNEL_OPTIONS} editing={editing} onChange={v => setForm({ ...form, channel: v })} />
                  <FieldSelect label="Service" value={form.service} options={SERVICE_OPTIONS} editing={editing} onChange={v => setForm({ ...form, service: v as CustomerService })} />
                </FieldGroup>

                {/* Group 4: Commercial */}
                <FieldGroup title="Commercial">
                  <FieldInput
                    label="Final Billing (monthly)"
                    type="number"
                    value={String(form.finalBilling)}
                    editing={editing}
                    onChange={v => setForm({ ...form, finalBilling: Number(v) || 0 })}
                    prefix="₹"
                  />
                  <FieldSelect
                    label="Payment Terms"
                    value={form.paymentTerms}
                    options={PAYMENT_TERMS_OPTIONS}
                    editing={editing}
                    onChange={v => setForm({ ...form, paymentTerms: v as PaymentTerms })}
                  />
                </FieldGroup>

                {editing && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                    <button
                      type="button"
                      onClick={handleCancelDetails}
                      className="h-10 px-4 rounded-md text-caption font-semibold text-black/70 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      className="h-11 px-5 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3d9f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#204CC7] transition-all inline-flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Save Changes
                    </button>
                  </div>
                )}

                {/* ── Deactivation Zone ──────────────────────────
                    Soft-delete actions live at the bottom of the
                    Details tab, below the editable fields. Two
                    graded actions: mark JUST this business inactive,
                    or mark the entire client (every business they
                    own) inactive. Records stay intact — only the
                    status flips — so the admin can reactivate them
                    later from the All Customers list. The
                    confirmation modal captures a reason for the
                    audit trail. */}
                <DangerZoneCard
                  customer={c}
                  hasSiblings={hasSiblings}
                  totalBusinesses={totalBusinesses}
                  contactPerson={c.contactPerson}
                  onDeactivateBusiness={() => setDeactivateMode('business')}
                  onDeactivateClient={() => setDeactivateMode('client')}
                />
              </div>
            )}

            {tab === 'team' && (
              <CustomerTeamPanel
                service={c.service}
                semTeam={semTeam}
                atTeam={atTeam}
                semEmployeesByRole={semEmployeesByRole}
                atEmployeesByRole={atEmployeesByRole}
                onUpdateSem={updateSemSlot}
                onUpdateAt={updateAtSlot}
              />
            )}

            {tab === 'financials' && (
              <div className="space-y-5">
                {/* Customer-Wide Billing — pinned to the TOP of the
                    Financials tab. When a contact owns multiple
                    businesses, the customer-level roll-up is the most
                    important read: it tells the admin the full
                    commercial relationship at a glance and frames every
                    per-business number that follows. The "This
                    business" KPIs and the Invoices / Compliance cards
                    drill into the active engagement beneath it. */}
                {hasSiblings && (
                  <div className="rounded-xl border border-[#204CC7]/20 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#204CC7]/15 bg-[#204CC7]/[0.04] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-3.5 h-3.5 text-[#204CC7] shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <h4 className="text-caption font-semibold text-black">Customer-Wide Billing</h4>
                          <p className="text-caption text-black/60 truncate">
                            Combined across {totalBusinesses} businesses owned by {c.contactPerson}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Per-business breakdown */}
                    <ul className="divide-y divide-black/[0.06]">
                      {allBusinesses.map((biz) => {
                        const isCurrent = biz.id === c.id;
                        const canSwitch = !isCurrent && !!onSwitchCustomer;
                        return (
                          <li key={biz.id}>
                            <button
                              type="button"
                              disabled={!canSwitch}
                              onClick={() => { if (canSwitch) onSwitchCustomer!(biz); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:bg-black/[0.03] ${
                                isCurrent ? 'bg-[#204CC7]/[0.04] cursor-default' : canSwitch ? 'hover:bg-black/[0.02]' : 'cursor-default'
                              }`}
                              aria-current={isCurrent ? 'true' : undefined}
                            >
                              <div className="w-8 h-8 rounded-md bg-black/[0.04] flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4 text-black/55" aria-hidden="true" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-caption font-semibold truncate ${isCurrent ? 'text-[#204CC7]' : 'text-black'}`}>
                                    {biz.companyName}
                                  </p>
                                  {isCurrent && (
                                    <span className="inline-flex items-center text-caption font-semibold text-[#204CC7] bg-[#204CC7]/10 px-1.5 py-0.5 rounded">
                                      Viewing
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <ServicePill service={biz.service} />
                                  <span className="text-caption text-black/55">{biz.paymentTerms}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-caption font-bold text-black tabular-nums">
                                  {formatCurrency(biz.finalBilling)}
                                </p>
                                <p className="text-caption text-black/55">per month</p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {/* Totals footer */}
                    <div className="px-4 py-3.5 bg-[#204CC7]/[0.04] border-t border-[#204CC7]/15">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-caption text-black/60">Total Final Billing</p>
                          <p className="text-h3 font-bold text-[#204CC7] tabular-nums leading-tight">
                            {formatCurrency(customerTotals.finalBilling)}
                          </p>
                          <p className="text-caption text-black/60 mt-0.5">per month</p>
                        </div>
                        <div>
                          <p className="text-caption text-black/60">Monthly Retainer</p>
                          <p className="text-h3 font-bold text-black tabular-nums leading-tight">
                            {formatCurrency(customerTotals.monthlyRetainer)}
                          </p>
                          <p className="text-caption text-black/60 mt-0.5">combined</p>
                        </div>
                        <div>
                          <p className="text-caption text-black/60">Total Revenue</p>
                          <p className="text-h3 font-bold text-black tabular-nums leading-tight">
                            {formatCurrency(customerTotals.totalRevenue)}
                          </p>
                          <p className="text-caption text-black/60 mt-0.5">lifetime</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2.5">
                    This business
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <SimpleKpi label="Monthly Retainer" value={formatCurrency(c.monthlyRetainer)} accent />
                    <SimpleKpi label="Final Billing" value={formatCurrency(c.finalBilling)} sub={c.paymentTerms} />
                    <SimpleKpi label="Total Revenue" value={formatCurrency(c.totalRevenue)} />
                    <SimpleKpi label="Payment Method" value={c.paymentMethod} />
                  </div>
                </div>

                {/* A&T Plan card — only renders for A&T-eligible
                    customers (PM-only customers don't subscribe to
                    an A&T tier). Same component used on Overview,
                    same Change-plan modal, single source of truth. */}
                {resolveAtPlan(c) !== null && (
                  <ClientPlanCard
                    business={c}
                    onChangePlan={(biz) => setPlanEditingBusiness(biz)}
                  />
                )}

                <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/[0.06]">
                    <h4 className="text-caption font-semibold text-black">Invoices</h4>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-black/[0.06]">
                    <InvoiceStat
                      icon={<CheckCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" />}
                      tint="bg-emerald-500/10"
                      label="Paid"
                      value={String(c.invoicesPaid)}
                    />
                    <InvoiceStat
                      icon={<Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />}
                      tint="bg-amber-500/10"
                      label="Pending"
                      value={String(c.invoicesPending)}
                    />
                    <InvoiceStat
                      icon={<IndianRupee className="w-4 h-4 text-red-500" aria-hidden="true" />}
                      tint="bg-red-500/10"
                      label="Outstanding"
                      value={c.pendingAmount > 0 ? formatCurrency(c.pendingAmount) : '—'}
                      alert={c.pendingAmount > 0}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-black/[0.06]">
                    <h4 className="text-caption font-semibold text-black">Compliance</h4>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4">
                    <DetailRow icon={<Hash className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />} label="GST" value={c.gstNumber} mono />
                    <DetailRow icon={<FileText className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />} label="PAN" value={c.panNumber} mono />
                  </dl>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );

  // ── Add to CLA modal (shared) ─────────────────────────────────────
  const claModal = showCLAModal && (
    <AddToCLA
      clientName={c.companyName}
      onClose={() => setShowCLAModal(false)}
      onSave={() => { setIsCLA(true); setShowCLAModal(false); }}
    />
  );

  const planModal = planEditingBusiness && (
    <ChangePlanModal
      business={planEditingBusiness}
      onClose={() => setPlanEditingBusiness(null)}
      onConfirm={(plan) => {
        if (onChangeAtPlan && planEditingBusiness) {
          onChangeAtPlan(planEditingBusiness.id, plan);
        }
        setPlanEditingBusiness(null);
      }}
    />
  );

  const deactivateModal = deactivateMode && (
    <DeactivateCustomerModal
      mode={deactivateMode}
      customer={c}
      siblings={siblings}
      onClose={() => setDeactivateMode(null)}
      onConfirm={() => {
        // Soft-delete: flip status to Inactive on the affected
        // record(s). The parent (`CustomersByClient`) writes the
        // override into its statusOverrides map and routes the admin
        // back to the All Customers list. Reversible — the records
        // stay, only their status changes.
        if (deactivateMode === 'business' && onDeactivateBusiness) {
          onDeactivateBusiness(c.id);
        } else if (deactivateMode === 'client' && onDeactivateClient) {
          onDeactivateClient(c.customerId);
        }
        setDeactivateMode(null);
        handleClose();
      }}
    />
  );

  // ── Page surface ─────────────────────────────────────────────────
  // Inline page-level container that fills the viewport below the
  // top nav. The wrapper paints a calm off-white canvas (#FAFBFC) so
  // the centered 960px reading rail (white, with subtle side rules)
  // reads as a contained "document on a canvas" — the same idiom
  // Notion / Linear use for their centered detail surfaces.
  // The same top bar + body markup is reused; we only swap the outer
  // chrome. The inner overflow on `scrollableBody` keeps the sticky
  // tabs working identically to the drawer (they stick below the
  // top bar via their own scroll container).
  if (surface === 'page') {
    return (
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-[#FAFBFC] flex flex-col outline-none"
        style={{ height: 'calc(100vh - 53px)' }}
      >
        {topBar}
        {scrollableBody}
        {claModal}
        {deactivateModal}
        {planModal}
      </div>
    );
  }

  // ── Drawer surface (default) ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close customer details"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-default"
        onClick={handleClose}
      />

      {/* Drawer Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-[760px] h-full bg-white shadow-2xl flex flex-col outline-none"
        style={{ animation: 'slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {topBar}
        {scrollableBody}
      </div>

      {claModal}
      {deactivateModal}
      {planModal}
    </div>
  );
}

/* ── Customer Drawer sub-components ── */

function SimpleKpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-3">
      <p className="text-caption text-black/55">{label}</p>
      <p className={`text-h3 font-bold tabular-nums mt-1 ${accent ? 'text-[#204CC7]' : 'text-black'}`}>{value}</p>
      {sub && <p className="text-caption text-black/55 mt-0.5">{sub}</p>}
    </div>
  );
}

function InvoiceStat({
  icon, tint, label, value, alert,
}: {
  icon: React.ReactNode; tint: string; label: string; value: string; alert?: boolean;
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${tint} flex items-center justify-center shrink-0`} aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-black/55">{label}</p>
        <p className={`text-body font-bold tabular-nums ${alert ? 'text-red-600' : 'text-black'}`}>{value}</p>
      </div>
    </div>
  );
}

function DetailRow({
  icon, label, value, mono,
}: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-caption text-black/55 mb-1">{label}</dt>
      <dd className="flex items-center gap-2 text-body text-black/85">
        {icon}
        <span className={mono ? 'font-mono text-caption truncate' : 'truncate'}>{value}</span>
      </dd>
    </div>
  );
}

/* Inline form primitives */

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-black/[0.06] bg-white">
      <div className="px-4 py-3 border-b border-black/[0.06]">
        <h5 className="text-caption font-semibold text-black">{title}</h5>
      </div>
      <div className="px-4 py-4 grid grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </div>
    </section>
  );
}

function FieldLabel({ htmlFor, required, children }: { htmlFor: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-caption text-black/55 mb-1 block">
      {children}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

function FieldInput({
  label, value, editing, onChange, type = 'text', required, placeholder, prefix,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; prefix?: string;
}) {
  const id = `fld-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      {editing ? (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caption text-black/55 pointer-events-none">{prefix}</span>
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            aria-required={required}
            className={`w-full h-10 rounded-md border border-black/10 bg-white ${prefix ? 'pl-7' : 'pl-3'} pr-3 text-body text-black placeholder:text-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors`}
          />
        </div>
      ) : (
        <p className="text-body text-black/85 min-h-[24px]">{prefix && value ? `${prefix}${value}` : value || <span className="text-black/35">—</span>}</p>
      )}
    </div>
  );
}

function FieldTextarea({
  label, value, editing, onChange, required,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; required?: boolean;
}) {
  const id = `fld-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="col-span-2">
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      {editing ? (
        <textarea
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-required={required}
          rows={2}
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-body text-black placeholder:text-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors resize-none"
        />
      ) : (
        <p className="text-body text-black/85">{value || <span className="text-black/35">—</span>}</p>
      )}
    </div>
  );
}

function FieldSelect({
  label, value, options, editing, onChange, required,
}: {
  label: string; value: string; options: readonly string[]; editing: boolean;
  onChange: (v: string) => void; required?: boolean;
}) {
  const id = `fld-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
      {editing ? (
        <div className="relative">
          <select
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            aria-required={required}
            className="w-full h-10 rounded-md border border-black/10 bg-white pl-3 pr-9 text-body text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors appearance-none"
          >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 pointer-events-none" aria-hidden="true" />
        </div>
      ) : (
        <p className="text-body text-black/85">{value || <span className="text-black/35">—</span>}</p>
      )}
    </div>
  );
}

function TeamSlotRow({
  label, subtitle, slot, employees, onChange,
}: {
  label: string;
  subtitle: string;
  slot: TeamSlot;
  employees: EmployeeRecord[];
  onChange: (field: keyof TeamSlot, value: string | number) => void;
}) {
  const personId = `team-${label.replace(/\s+/g, '-').toLowerCase()}-person`;
  const hoursId = `team-${label.replace(/\s+/g, '-').toLowerCase()}-hours`;
  const hasPerson = !!slot.name;

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <p className="text-caption font-semibold text-black">{label}</p>
          <p className="text-caption text-black/55">{subtitle}</p>
        </div>
        {hasPerson && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-semibold"
            style={{ backgroundColor: getTeamColor(slot.name) }}
            aria-hidden="true"
          >
            {getInitials(slot.name)}
          </div>
        )}
      </div>
      <div className="grid grid-cols-[1fr_140px] gap-2">
        <div className="relative">
          <label htmlFor={personId} className="sr-only">{label} person</label>
          <select
            id={personId}
            value={slot.name}
            onChange={e => {
              onChange('name', e.target.value);
              if (!e.target.value) onChange('hours', 0);
            }}
            className="w-full h-10 rounded-md border border-black/10 bg-white pl-3 pr-9 text-body text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors appearance-none"
          >
            {/* Empty state placeholder — only shows up before any
                assignment is made. Once a person is on the slot the
                admin can change them by selecting another option;
                we don't expose a "Set back to unassigned" path here
                because 90% of slots stay assigned across the
                engagement's lifetime. */}
            {!hasPerson && <option value="">Choose a person…</option>}
            {employees.map(e => (
              <option key={e.id} value={e.name}>{e.name} · {e.designation}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/45 pointer-events-none" aria-hidden="true" />
        </div>
        <div className="relative">
          <label htmlFor={hoursId} className="sr-only">{label} hours per month</label>
          <input
            id={hoursId}
            type="number"
            min={0}
            step={1}
            value={slot.hours || ''}
            onChange={e => onChange('hours', Number(e.target.value) || 0)}
            placeholder="0"
            disabled={!hasPerson}
            // Hide browser-native spinner arrows so they don't crowd
            // the `h/mo` suffix label. Everything else stays as the
            // original input — same padding, alignment, and weight.
            className="w-full h-10 rounded-md border border-black/10 bg-white pl-3 pr-10 text-body text-black tabular-nums placeholder:text-black/35 disabled:bg-black/[0.03] disabled:text-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-black/45 pointer-events-none">h/mo</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER ONBOARDING PANEL — service-aware sectioned checklist
   ═══════════════════════════════════════════════════════════════════
   Replaces the legacy "stage dropdown + thin progress bar" Onboarding
   card with the rich design used on the Customers → Onboarding drawer:

   • A *holistic* band at the top when this client owns multiple
     businesses — overall progress, plus a one-row read of each
     business with a mini progress bar and click-to-switch.
   • A *header strip* showing the active business's status (Done /
     Overdue / In progress / Not started), days since kickoff, and
     a stage override dropdown so the admin retains the same one-tap
     stage control they had before.
   • A *next-step highlight* surfacing the very next pending item
     across all sections, so the admin always knows what to chase.
   • A *sectioned checklist*: collapsible cards (Setup for SEM;
     Kickoff / Data Sharing / Log IDs for A&T; both for "Both"
     clients), each item clickable to flip done/undone with a
     completion-date caption when done. Total control, every item
     editable inline.

   State lives entirely inside the panel — switching siblings remounts
   the panel (key={customer.id}) so each business's checklist stays
   independent without leaking edits across siblings.
*/

/* ─────────────────────────────────────────────────────────────────
   ONBOARDING SUMMARY — compact at-a-glance card on the Overview tab
   ─────────────────────────────────────────────────────────────────
   The Overview tab is meant to be a calm, scannable read of the
   client. The full sectioned checklist would dwarf every other tile,
   so Overview gets just two truths: is onboarding **Done** for the
   whole client, or is it still **Pending** — and if pending, which
   businesses are holding it up. A "View →" affordance on the right
   jumps to the dedicated Onboarding tab one tap away. */

/* ─────────────────────────────────────────────────────────────────
   CLIENT SUMMARY CARD — top of Overview for multi-business clients
   ─────────────────────────────────────────────────────────────────
   The headline read for a client who owns more than one business.
   Names the client at the top with their true tenure (earliest
   joined date across all businesses), then four big stats below:
   businesses count, combined monthly retainer, combined final
   billing, combined lifetime revenue. The per-business detail moves
   to the Businesses list card below — Overview no longer shows
   "this business" numbers for multi-business clients because the
   Overview is the *client*, not the engagement. */

/* ─────────────────────────────────────────────────────────────────
   CLIENT TEAM SUMMARY — person-level aggregation on Overview
   ─────────────────────────────────────────────────────────────────
   Brego's "team" model is awkward at the client level: one client
   can own multiple businesses, each business has 1–2 service lines
   (SEM / A&T), and each service line runs its own 5-role team. A
   "Both" client with 3 businesses can have up to 4 distinct teams.
   Listing them as a matrix overwhelms the read.

   The fix is to aggregate by *person*: one row per unique human
   working with the client, regardless of which business or service
   they sit on. Each row carries:
     • Avatar + name
     • Service chips (which lines they cover across the engagements)
     • Highest role they hold (HOD reads as more senior than
       Executive — surface the title that matters)
     • Total hours / mo summed across every assignment

   The header line tells the founder/COO the client's total team
   commitment in one glance: "Across N businesses · X people ·
   Yh/mo". Click "Manage →" to drill into Team & Efforts where
   per-business per-service editing lives.
*/

interface ClientTeamPerson {
  name: string;
  services: Set<'SEM' | 'A&T'>;
  hours: number;
  /** Highest-seniority role this person holds across all
   *  engagements. Ranking: HOD > POD Head > Manager >
   *  Assistant Manager > Executive. */
  topRole: string;
}

const ROLE_RANK: Record<string, number> = {
  'HOD': 0,
  'POD Head': 1,
  'Manager': 2,
  'Assistant Manager': 3,
  'Executive': 4,
};

function aggregateClientTeam(
  scopedBusinesses: Customer[],
  service: 'SEM' | 'A&T',
): {
  people: ClientTeamPerson[];
  totalHours: number;
} {
  // Build lane-pure pools once. This is the single source of truth
  // for who can sit on this service's team — anyone outside the
  // lane's department won't appear, regardless of what the seed
  // teamStructure says. Mirrors the same auto-fill pipeline the
  // Team & Efforts tab uses, so Overview reads + edit reads agree.
  const dept = service === 'SEM' ? 'Performance Marketing' : 'Accounts & Taxation';
  const pools = buildPoolsForDept(dept);

  const map = new Map<string, ClientTeamPerson>();
  let totalHours = 0;

  for (const biz of scopedBusinesses) {
    // Resolve the lane's team for this business: drop any seed
    // names not in the department pool, then auto-fill empty
    // slots with department-matched picks. The result is always
    // a fully-staffed lane-pure 5-role team.
    const team = autoFillTeamForLane(biz.teamStructure, pools);
    const slots: Array<{ slot: TeamSlot; role: string }> = [
      { slot: team.hod,              role: 'HOD' },
      { slot: team.podHead,          role: 'POD Head' },
      { slot: team.manager,          role: 'Manager' },
      { slot: team.assistantManager, role: 'Assistant Manager' },
      { slot: team.executive,        role: 'Executive' },
    ];
    for (const { slot, role } of slots) {
      if (!slot.name) continue;
      const existing = map.get(slot.name);
      if (existing) {
        existing.services.add(service);
        existing.hours += slot.hours || 0;
        if (ROLE_RANK[role] < ROLE_RANK[existing.topRole]) {
          existing.topRole = role;
        }
      } else {
        map.set(slot.name, {
          name: slot.name,
          services: new Set([service]),
          hours: slot.hours || 0,
          topRole: role,
        });
      }
      totalHours += slot.hours || 0;
    }
  }

  // Sort: most senior role first, then by hours desc.
  const people = Array.from(map.values()).sort((a, b) => {
    const r = ROLE_RANK[a.topRole] - ROLE_RANK[b.topRole];
    if (r !== 0) return r;
    return b.hours - a.hours;
  });

  return { people, totalHours };
}

function ClientTeamSummary({
  allBusinesses,
  defaultBusinessId,
  onManage,
}: {
  allBusinesses: Customer[];
  /** Which business to land on by default — typically the active
   *  customer being viewed. Falls back to the first business if the
   *  default is missing from the list. */
  defaultBusinessId: string;
  onManage: () => void;
}) {
  // ── Filter state ────────────────────────────────────────────────
  // Business: a single-select dropdown (no "All" option) — admins
  // always read one business at a time, deliberately. Service: a
  // segmented toggle so SEM ↔ A&T flips with one tap. The Overview
  // is meant to give a *focused* read; the holistic across-everyone
  // aggregate moves to the Team & Efforts tab via "Manage →".
  const initialBiz = allBusinesses.some(b => b.id === defaultBusinessId)
    ? defaultBusinessId
    : (allBusinesses[0]?.id ?? '');
  const [businessFilter, setBusinessFilter] = useState<string>(initialBiz);

  const selectedBusiness = useMemo(
    () => allBusinesses.find(b => b.id === businessFilter) ?? allBusinesses[0],
    [allBusinesses, businessFilter]
  );

  // Service availability is derived from the selected business.
  // SEM-only customers can't toggle to A&T (and vice versa) — the
  // disabled tab reads as a transparent signal that this business
  // doesn't run that lane.
  const availableServices: Array<'SEM' | 'A&T'> = useMemo(() => {
    if (!selectedBusiness) return [];
    if (selectedBusiness.service === 'Performance Marketing') return ['SEM'];
    if (selectedBusiness.service === 'Accounts & Taxation') return ['A&T'];
    return ['SEM', 'A&T'];
  }, [selectedBusiness]);

  const [serviceFilter, setServiceFilter] = useState<'SEM' | 'A&T'>(availableServices[0] ?? 'SEM');

  // When the admin switches business, snap service to one that
  // exists for that business so we never render an empty list
  // because the previous service is unavailable.
  useEffect(() => {
    if (availableServices.length === 0) return;
    if (!availableServices.includes(serviceFilter)) {
      setServiceFilter(availableServices[0]);
    }
  }, [availableServices, serviceFilter]);

  const scopedBusinesses = useMemo(() => {
    if (!selectedBusiness) return [];
    const includesSvc =
      serviceFilter === 'SEM'
        ? (selectedBusiness.service === 'Performance Marketing' || selectedBusiness.service === 'Both')
        : (selectedBusiness.service === 'Accounts & Taxation' || selectedBusiness.service === 'Both');
    return includesSvc ? [selectedBusiness] : [];
  }, [selectedBusiness, serviceFilter]);

  const { people, totalHours } = useMemo(
    () => aggregateClientTeam(scopedBusinesses, serviceFilter),
    [scopedBusinesses, serviceFilter]
  );

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/[0.06] flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="text-caption font-semibold text-black">Team</h4>
          <p className="text-caption text-black/60 mt-0.5">
            <span className="font-semibold text-black/75">{selectedBusiness?.companyName}</span>
            <span className="text-black/30 mx-1.5">·</span>
            <span className="font-bold text-[#5B21B6]">{serviceFilter}</span>
            <span className="text-black/30 mx-1.5">·</span>
            {people.length} {people.length === 1 ? 'person' : 'people'}
            <span className="text-black/30 mx-1.5">·</span>
            <span className="font-semibold text-black/75 tabular-nums">{totalHours}h / mo</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Business dropdown */}
          <div className="relative">
            <label htmlFor="team-biz-filter" className="sr-only">Business</label>
            <select
              id="team-biz-filter"
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="appearance-none h-8 pl-2.5 pr-7 rounded-md border border-black/10 bg-white text-caption font-medium text-black/75 hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors"
            >
              {allBusinesses.map(b => (
                <option key={b.id} value={b.id}>{b.companyName}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/45 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Service segmented toggle — SEM ↔ A&T. Disabled state
              when the selected business doesn't run that lane. */}
          <div className="inline-flex items-center gap-1 p-1 rounded-md bg-black/[0.04]" role="tablist" aria-label="Service line">
            {(['SEM', 'A&T'] as const).map(s => {
              const enabled = availableServices.includes(s);
              const active = serviceFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={!enabled}
                  onClick={() => enabled && setServiceFilter(s)}
                  className={`inline-flex items-center h-6 px-2.5 rounded text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                    active
                      ? 'bg-[#7C3AED]/10 text-[#5B21B6] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                      : enabled
                        ? 'text-black/55 hover:text-black/80'
                        : 'text-black/30 cursor-not-allowed'
                  }`}
                  title={enabled ? `Switch to ${s}` : `${selectedBusiness?.companyName} doesn't run ${s}`}
                >
                  {s === 'SEM' ? 'SEM' : 'A&T'}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onManage}
            className="inline-flex items-center gap-0.5 text-caption font-semibold text-[#204CC7] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded-md px-1"
          >
            Manage
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* People list */}
      {people.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-caption text-black/55">
            No team assigned for {selectedBusiness?.companyName} · {serviceFilter}.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-black/[0.04]">
          {people.map(p => (
            <li key={p.name} className="px-4 py-3 flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-semibold shrink-0"
                style={{ backgroundColor: getTeamColor(p.name) }}
                aria-hidden="true"
              >
                {getInitials(p.name)}
              </div>
              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <p className="text-caption font-semibold text-black truncate">{p.name}</p>
                <p className="text-caption text-black/55">{p.topRole}</p>
              </div>
              {/* Hours */}
              <span className="text-caption font-semibold text-black/85 tabular-nums shrink-0 w-[64px] text-right">
                {p.hours}h <span className="text-black/55 font-normal">/ mo</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientSummaryCard({
  contactPerson,
  allBusinesses,
  customerTotals,
}: {
  contactPerson: string;
  allBusinesses: Customer[];
  customerTotals: { finalBilling: number; monthlyRetainer: number; totalRevenue: number };
}) {
  // Earliest joined date across all businesses — that's when the
  // client actually started with Brego, regardless of which business
  // is being viewed right now.
  const tenure = useMemo(() => {
    const dates = allBusinesses.map(b => new Date(b.joinedDate)).filter(d => !Number.isNaN(d.getTime()));
    if (dates.length === 0) return { label: '—', sinceLabel: '' };
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const today = new Date('2026-05-05T00:00:00Z');
    let years = today.getUTCFullYear() - earliest.getUTCFullYear();
    let months = today.getUTCMonth() - earliest.getUTCMonth();
    if (months < 0) { years -= 1; months += 12; }
    if (today.getUTCDate() < earliest.getUTCDate()) months -= 1;
    if (months < 0) { years -= 1; months += 12; }
    const label = years > 0
      ? (months > 0 ? `${years}y ${months}m` : `${years}y`)
      : `${Math.max(0, months)}m`;
    const sinceLabel = earliest.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    // "Long-term" = 12+ months with Brego since the earliest engagement.
    // Surfaces a small emerald pill in the identity strip so the
    // founder/COO can spot loyal accounts at a glance.
    const isLongTerm = (today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24) >= 365;
    return { label, sinceLabel, isLongTerm };
  }, [allBusinesses]);

  const activeCount = allBusinesses.filter(b => b.status === 'Active').length;
  const inactiveCount = allBusinesses.length - activeCount;

  return (
    <div className="rounded-xl border border-[#204CC7]/15 bg-[#204CC7]/[0.03] overflow-hidden">
      {/* Identity strip */}
      <div className="px-4 py-3 border-b border-[#204CC7]/15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#204CC7]/10 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-caption font-semibold text-black/85 truncate">
                {contactPerson}&apos;s combined account
              </p>
              {tenure.isLongTerm && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-caption font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  Long-term client
                </span>
              )}
            </div>
            <p className="text-caption text-black/60">
              Client since {tenure.sinceLabel} · {tenure.label}
            </p>
          </div>
        </div>
      </div>

      {/* 4-stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#204CC7]/10 bg-white">
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Businesses</p>
          <p className="mt-1 text-h2 font-bold text-black tabular-nums leading-tight">{allBusinesses.length}</p>
          <p className="text-caption text-black/60 mt-0.5">
            {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
          </p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Monthly Retainer</p>
          <p className="mt-1 text-h2 font-bold text-[#204CC7] tabular-nums leading-tight">
            {formatCurrency(customerTotals.monthlyRetainer)}
          </p>
          <p className="text-caption text-black/60 mt-0.5">Combined / mo</p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Final Billing</p>
          <p className="mt-1 text-h2 font-bold text-black tabular-nums leading-tight">
            {formatCurrency(customerTotals.finalBilling)}
          </p>
          <p className="text-caption text-black/60 mt-0.5">Combined / mo</p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Lifetime Revenue</p>
          <p className="mt-1 text-h2 font-bold text-black tabular-nums leading-tight">
            {formatCurrency(customerTotals.totalRevenue)}
          </p>
          <p className="text-caption text-black/60 mt-0.5">All engagements</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BUSINESSES LIST CARD — per-engagement breakdown on Overview
   ─────────────────────────────────────────────────────────────────
   One row per business: name + sector + service chip + status pill +
   monthly retainer + click-to-switch chevron. The active business
   gets a tinted highlight and "Viewing" tag so the admin always
   knows where they are. Disabled cursor on the active row prevents
   accidental no-op switches. */

function BusinessesListCard({
  allBusinesses,
}: {
  allBusinesses: Customer[];
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/[0.06]">
        <h4 className="text-caption font-semibold text-black">Businesses</h4>
      </div>
      <ul className="divide-y divide-black/[0.06]">
        {allBusinesses.map(biz => (
          <li key={biz.id} className="flex items-center gap-3 px-4 py-3">
            {/* Identity */}
            <div className="w-8 h-8 rounded-md bg-black/[0.04] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-black/55" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-caption font-semibold text-black truncate">
                {biz.companyName}
              </p>
              <p className="text-caption text-black/55 truncate">{biz.sector}</p>
            </div>
            {/* Service · Status · Retainer — read-only meta strip */}
            <ServicePill service={biz.service} />
            <CustomerStatusPill status={biz.status} />
            <span className="text-caption font-semibold text-black tabular-nums shrink-0 w-[80px] text-right">
              {formatCurrency(biz.monthlyRetainer)}
              <span className="text-black/55 font-normal"> / mo</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   A&T PLAN — subscription tier card + change-plan modal
   ─────────────────────────────────────────────────────────────────
   Brego's client-facing app sells A&T in three tiers (Startup /
   Growing Business / Enterprise). The admin needs to see which
   tier each business is on and have one-tap access to change it.
   Two surfaces:
     • A list/card view inside Overview + Financials that names the
       current plan + setup/monthly fees + transaction range.
     • A `ChangePlanModal` with all three tiers as radio cards,
       current tier preselected, "Save changes" commits the flip.
   Single-business clients see the card directly; multi-business
   clients see one card per A&T-eligible business so the admin can
   manage each engagement's tier independently from one place. */

function ClientPlanCard({
  business,
  onChangePlan,
}: {
  business: Customer;
  /** Opens the Change-plan modal pre-loaded with this business. */
  onChangePlan: (business: Customer) => void;
}) {
  const plan = resolveAtPlan(business);
  if (!plan) return null;
  const details = AT_PLAN_DETAILS[plan];
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-caption font-semibold text-black">A&amp;T Plan</h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-caption font-bold bg-[#06B6D4]/10 text-[#0E7490]">
              A&amp;T
            </span>
          </div>
          <p className="text-caption text-black/60 mt-0.5 truncate">
            {business.companyName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChangePlan(business)}
          className="inline-flex items-center gap-0.5 text-caption font-semibold text-[#204CC7] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded-md px-1 shrink-0"
        >
          Change plan
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      {/* Plan summary */}
      <div className="px-4 py-3.5">
        <p className="text-h3 font-bold text-black">{details.name}</p>
        <p className="text-caption text-black/60">{details.tagline}</p>
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-black/[0.04]">
          <div>
            <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Setup fee</p>
            <p className="text-body font-bold text-black tabular-nums mt-0.5">
              {details.setupFee != null ? formatCurrency(details.setupFee) : 'Custom'}
            </p>
            {details.setupFee != null && (
              <p className="text-caption text-black/55">+18% GST</p>
            )}
          </div>
          <div>
            <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Monthly fee</p>
            <p className="text-body font-bold text-black tabular-nums mt-0.5">
              {details.monthlyFee != null ? formatCurrency(details.monthlyFee) : 'Custom'}
            </p>
            {details.monthlyFee != null && (
              <p className="text-caption text-black/55">+18% GST</p>
            )}
          </div>
          <div>
            <p className="text-caption text-black/55 uppercase tracking-wider font-semibold">Transactions</p>
            <p className="text-body font-bold text-black tabular-nums mt-0.5">
              {details.transactionsLabel}
            </p>
            <p className="text-caption text-black/55">per month</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePlanModal({
  business,
  onClose,
  onConfirm,
}: {
  business: Customer;
  onClose: () => void;
  onConfirm: (plan: ATPlan) => void;
}) {
  const current = resolveAtPlan(business) ?? 'Growing Business';
  const [selected, setSelected] = useState<ATPlan>(current);
  const titleId = 'change-plan-title';

  // ESC to dismiss + initial focus
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const planOrder: ATPlan[] = ['Startup', 'Growing Business', 'Enterprise'];
  const dirty = selected !== current;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-[560px] bg-white rounded-xl shadow-2xl outline-none"
        style={{ animation: 'slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-h3 font-bold text-black">
              Change A&amp;T plan
            </h3>
            <p className="text-caption text-black/60 mt-1 leading-relaxed">
              Pick the right tier for <span className="font-semibold text-black/80">{business.companyName}</span>.
              The setup + monthly fees apply on the next billing cycle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="w-8 h-8 rounded-md hover:bg-black/5 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
          >
            <X className="w-4 h-4 text-black/55" aria-hidden="true" />
          </button>
        </div>

        {/* Plan options — radio cards */}
        <div className="px-5 pb-4 space-y-2.5">
          {planOrder.map(planName => {
            const details = AT_PLAN_DETAILS[planName];
            const isSelected = selected === planName;
            const isCurrent = current === planName;
            return (
              <button
                key={planName}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(planName)}
                className={`w-full text-left rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                  isSelected
                    ? 'border-[#204CC7] bg-[#204CC7]/[0.03]'
                    : 'border-black/[0.08] bg-white hover:border-black/15'
                }`}
              >
                <div className="px-4 py-3 flex items-start gap-3">
                  {/* Radio */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-[#204CC7]' : 'border-black/25'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-[#204CC7]" />}
                  </div>
                  {/* Plan content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-bold text-black">{details.name}</p>
                      {isCurrent && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-caption font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-black/60 mt-0.5">
                      {details.tagline} · {details.transactionsLabel} txns / mo
                    </p>
                    <p className="text-caption text-black/75 font-medium mt-1.5 tabular-nums">
                      {details.setupFee != null && details.monthlyFee != null
                        ? `${formatCurrency(details.setupFee)} setup · ${formatCurrency(details.monthlyFee)} / mo (+18% GST)`
                        : 'Custom pricing — Sales follows up after the change.'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.06] flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md text-caption font-semibold text-black/70 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => onConfirm(selected)}
            className="h-9 px-3.5 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3d9f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:ring-offset-2 transition-colors disabled:bg-[#204CC7]/40 disabled:cursor-not-allowed"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerOnboardingSummary({
  customer,
  allBusinesses,
  onOpenOnboarding,
}: {
  customer: Customer;
  allBusinesses: Customer[];
  onOpenOnboarding: () => void;
}) {
  // For each business under this client, compute its done-ness from
  // the same section seed the panel uses — so the summary stays
  // truthful with the underlying checklist (admins can't see "Done"
  // here while the panel still has unchecked items).
  const summary = useMemo(() => {
    const rows = allBusinesses.map(b => {
      const secs = buildOnboardingSections(b);
      const pct = computeSectionsProgress(secs);
      return { business: b, pct, done: pct === 100 };
    });
    const pendingRows = rows.filter(r => !r.done);
    const allDone = pendingRows.length === 0;
    return { rows, pendingRows, allDone };
  }, [allBusinesses]);

  return (
    <button
      type="button"
      onClick={onOpenOnboarding}
      aria-label="Open onboarding tab"
      className="w-full rounded-xl border border-black/[0.06] bg-white hover:border-black/[0.12] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            summary.allDone ? 'bg-emerald-100' : 'bg-amber-100'
          }`} aria-hidden="true">
            {summary.allDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-caption font-semibold text-black">Onboarding</p>
              {summary.allDone ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Done
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                  Pending
                </span>
              )}
            </div>
            {/* Pending-business summary line — only when something is
                still in flight. Single-business clients name the lone
                business; multi-business clients list the offenders
                (or "all N businesses pending" when none are done). */}
            {!summary.allDone && (
              <p className="text-caption text-black/60 mt-0.5 truncate">
                {summary.pendingRows.length === summary.rows.length && summary.rows.length > 1 ? (
                  <>All {summary.rows.length} businesses pending</>
                ) : (
                  <>
                    Pending:{' '}
                    <span className="font-medium text-black/80">
                      {summary.pendingRows.map(r => r.business.companyName).join(', ')}
                    </span>
                  </>
                )}
              </p>
            )}
            {summary.allDone && (
              <p className="text-caption text-black/55 mt-0.5">
                {summary.rows.length === 1
                  ? 'Onboarding complete — client is live'
                  : `All ${summary.rows.length} businesses live`}
              </p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-caption font-semibold text-[#204CC7] shrink-0">
          View
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
}

type OnboardingStatusKey = 'done' | 'overdue' | 'progress' | 'notstarted';

function CustomerOnboardingPanel({
  customer,
  allBusinesses,
  onSwitchCustomer,
  onbStage,
  onbProgress,
  onChangeStage,
}: {
  customer: Customer;
  allBusinesses: Customer[];
  onSwitchCustomer?: (c: Customer) => void;
  onbStage: string;
  onbProgress: number;
  onChangeStage: (stage: string) => void;
}) {
  const c = customer;

  // ── Sections live in panel state so admins can toggle items ─────
  // Reset whenever the customer changes (sibling switch).
  const [sections, setSections] = useState<OnboardingSection[]>(() => buildOnboardingSections(c));
  useEffect(() => {
    setSections(buildOnboardingSections(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  // ── Section expand state — collapsed by default per the redesign;
  // the admin opens only what they want to look at. Keyed per-business
  // so siblings keep their own open/closed snapshots.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleSection = (sectionTitle: string) =>
    setExpanded(prev => ({ ...prev, [`${c.id}::${sectionTitle}`]: !prev[`${c.id}::${sectionTitle}`] }));

  // Toggle a single item's done state.
  const toggleItem = (sectionIdx: number, itemIdx: number) => {
    setSections(prev => prev.map((s, sIdx) => {
      if (sIdx !== sectionIdx) return s;
      return {
        ...s,
        items: s.items.map((item, iIdx) => {
          if (iIdx !== itemIdx) return item;
          const nextDone = !item.done;
          return {
            ...item,
            done: nextDone,
            completedDate: nextDone ? formatDate('2026-05-05') : undefined,
          };
        }),
      };
    }));
  };

  // ── Derived state ────────────────────────────────────────────────
  const total = sectionsTotal(sections);
  const done = sectionsDone(sections);
  const livePct = computeSectionsProgress(sections);
  const days = daysSinceKickoff(c);
  const isDone = livePct === 100;
  const isOverdue = !isDone && days > 14;
  const status: OnboardingStatusKey =
    isDone ? 'done' : isOverdue ? 'overdue' : livePct > 0 ? 'progress' : 'notstarted';

  // Next pending step across all sections.
  const nextStep = useMemo(() => {
    for (const s of sections) {
      const item = s.items.find(i => !i.done);
      if (item) return { section: s.title, label: item.label, sIdx: sections.indexOf(s), iIdx: s.items.indexOf(item) };
    }
    return null;
  }, [sections]);

  // ── Service-line lanes (only meaningful for "Both" customers) ──
  // Single-service customers get one untitled lane. "Both" customers
  // get a SEM lane and an A&T lane, but only ONE lane renders at a
  // time — a service switcher above the section list flips between
  // them. This keeps the page calm and the visual balance honest:
  // you're never looking at two unrelated workstreams side-by-side.
  const isMultiService = c.service === 'Both';
  type LaneKey = 'all' | 'sem' | 'at';
  const sectionLanes = useMemo(() => {
    if (!isMultiService) {
      return [{ key: 'all' as LaneKey, label: null, sections: sections.map((s, idx) => ({ section: s, idx })) }];
    }
    const semSections = sections.map((s, idx) => ({ section: s, idx })).filter(({ section }) => section.title.startsWith('SEM'));
    const atSections  = sections.map((s, idx) => ({ section: s, idx })).filter(({ section }) => !section.title.startsWith('SEM'));
    return [
      { key: 'sem' as LaneKey, label: 'SEM', sections: semSections },
      { key: 'at'  as LaneKey, label: 'A&T', sections: atSections  },
    ];
  }, [sections, isMultiService]);

  // Pick a sensible default lane for "Both" customers: whichever has
  // outstanding work. If both are done, just default to SEM.
  const defaultLane: LaneKey = useMemo(() => {
    if (!isMultiService) return 'all';
    const sem = sectionLanes.find(l => l.key === 'sem')!;
    const at  = sectionLanes.find(l => l.key === 'at')!;
    const semOpen = sectionsTotal(sem.sections.map(x => x.section)) - sectionsDone(sem.sections.map(x => x.section));
    const atOpen  = sectionsTotal(at.sections.map(x => x.section))  - sectionsDone(at.sections.map(x => x.section));
    if (semOpen > 0 && atOpen === 0) return 'sem';
    if (atOpen  > 0 && semOpen === 0) return 'at';
    return 'sem';
  }, [isMultiService, sectionLanes]);

  const [activeLane, setActiveLane] = useState<LaneKey>(defaultLane);
  // Reset lane when the customer changes (sibling switch).
  useEffect(() => {
    setActiveLane(defaultLane);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const visibleLane = isMultiService
    ? sectionLanes.find(l => l.key === activeLane) ?? sectionLanes[0]
    : sectionLanes[0];

  // Holistic strip — slim, single-row pills per business.
  const hasSiblings = allBusinesses.length > 1;
  const businessSummaries = useMemo(() => {
    return allBusinesses.map(b => {
      const secs = b.id === c.id ? sections : buildOnboardingSections(b);
      const pct = computeSectionsProgress(secs);
      const d = daysSinceKickoff(b);
      const bDone = pct === 100;
      const bOverdue = !bDone && d > 14;
      const bStatus: OnboardingStatusKey = bDone ? 'done' : bOverdue ? 'overdue' : pct > 0 ? 'progress' : 'notstarted';
      return { business: b, pct, status: bStatus };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBusinesses, c.id, sections]);

  // ── One status colour — applied to the progress bar only ────────
  const statusBar = STATUS_BAR_COLOR[status];
  const statusInk = STATUS_INK_COLOR[status];
  const statusDot = STATUS_DOT_COLOR[status];

  return (
    <section className="space-y-4" aria-label="Onboarding">
      {/* ───────────────────────────────────────────────────────────
         HEADER — one calm line.
         Identity on the left (business · service · days), the live
         percentage on the right. Below it: stage selector inline
         with the progress bar, both compressed into a single row.
         No tinted background, no stack of pills — colour lives only
         on the progress bar (the single status carrier).
         ─────────────────────────────────────────────────────────── */}
      <header className="rounded-xl border border-black/[0.06] bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-caption text-black/55">
              <span className="font-semibold text-black/85">{c.companyName}</span>
              <span className="text-black/30 mx-1.5">·</span>
              <span className="text-black/65">{svcLabelInline(c.service)}</span>
              {days > 0 && (
                <>
                  <span className="text-black/30 mx-1.5">·</span>
                  <span className={isOverdue ? 'text-[#E2445C] font-semibold' : 'text-black/65'}>
                    {days}d since kickoff{isOverdue ? ' (overdue)' : ''}
                  </span>
                </>
              )}
            </p>
            <h4 className="text-h2 font-bold text-black mt-0.5 leading-tight">
              {STATUS_LABEL[status]}
              <span className="text-caption font-semibold text-black/55 ml-2">
                · {done} of {total} steps
              </span>
            </h4>
          </div>
          <p className={`text-h1 font-bold tabular-nums ${statusInk} shrink-0 leading-none`}>
            {livePct}<span className="text-h3 font-semibold text-black/30">%</span>
          </p>
        </div>

        {/* Progress bar + stage selector — single row */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={livePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Onboarding progress: ${livePct}%`}
          >
            <div
              className={`h-full transition-all duration-500 ${statusBar}`}
              style={{ width: `${livePct}%` }}
            />
          </div>
          <div className="relative shrink-0">
            <label htmlFor="onb-stage" className="sr-only">Onboarding stage</label>
            <select
              id="onb-stage"
              value={onbStage}
              onChange={(e) => onChangeStage(e.target.value)}
              className="appearance-none h-8 pl-3 pr-8 rounded-md border border-black/10 bg-white text-caption font-semibold text-black/80 hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:border-[#204CC7]/40 transition-colors"
            >
              {ONBOARDING_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {!ONBOARDING_STAGES.includes(onbStage as typeof ONBOARDING_STAGES[number]) && (
                <option value={onbStage}>{onbStage}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/45 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────
         HOLISTIC STRIP — one row per sibling, click to switch.
         No avatars, no two-line captions: just a status dot, the
         business name, a service chip, a thin progress bar, %, and
         a chevron when not active. Tight enough that even five
         siblings fit without stealing focus from the active panel.
         ─────────────────────────────────────────────────────────── */}
      {hasSiblings && (
        <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-3.5">
          <p className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-2">
            All {allBusinesses.length} businesses
          </p>
          <ul className="space-y-1">
            {businessSummaries.map(({ business: b, pct, status: s }) => {
              const isActive = b.id === c.id;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={isActive || !onSwitchCustomer}
                    onClick={() => { if (!isActive && onSwitchCustomer) onSwitchCustomer(b); }}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-left focus-visible:outline-none focus-visible:bg-black/[0.04] ${
                      isActive ? 'bg-[#EEF1FB]/60 cursor-default' : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_COLOR[s]}`} aria-hidden="true" />
                    <p className={`text-caption font-medium truncate flex-1 ${isActive ? 'text-[#204CC7] font-semibold' : 'text-black/80'}`}>
                      {b.companyName}
                    </p>
                    <span className="text-caption text-black/55 font-medium shrink-0 w-12 text-right tabular-nums">
                      {svcLabelInline(b.service)}
                    </span>
                    <div className="hidden sm:block flex-1 max-w-[140px] h-1 rounded-full bg-black/[0.06] overflow-hidden shrink-0">
                      <div className={`h-full ${STATUS_BAR_COLOR[s]}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-caption font-semibold text-black/75 tabular-nums w-9 text-right shrink-0">
                      {pct}%
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-transparent' : 'text-black/35'}`} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
         NEXT STEP — quiet inline prompt instead of its own card.
         Sits above the section list as a one-line callout. Only
         shown while there's still work to do.
         ─────────────────────────────────────────────────────────── */}
      {nextStep && !isDone && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#EEF1FB] text-[#204CC7]">
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          <p className="text-caption">
            <span className="font-semibold">Next:</span>
            <span className="ml-1.5">{nextStep.label}</span>
            <span className="text-[#204CC7]/65 ml-1.5">· {nextStep.section}</span>
          </p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
         SERVICE SWITCHER — only for "Both" customers.
         A two-pill segmented control. The active pill takes the
         service's brand colour; the inactive sits muted alongside.
         Each pill shows its lane's done/total so the admin can see
         the trade-off before they switch. Single-service customers
         skip the switcher entirely and read straight into sections.
         ─────────────────────────────────────────────────────────── */}
      {isMultiService && (() => {
        const semLane = sectionLanes.find(l => l.key === 'sem')!;
        const atLane  = sectionLanes.find(l => l.key === 'at')!;
        const semDone  = sectionsDone(semLane.sections.map(x => x.section));
        const semTotal = sectionsTotal(semLane.sections.map(x => x.section));
        const atDone   = sectionsDone(atLane.sections.map(x => x.section));
        const atTotal  = sectionsTotal(atLane.sections.map(x => x.section));
        return (
          <div className="inline-flex items-center gap-1 p-1 rounded-md bg-black/[0.04]" role="tablist" aria-label="Service line">
            <ServiceLaneTab
              label="SEM"
              done={semDone}
              total={semTotal}
              active={activeLane === 'sem'}
              activeColor="bg-[#7C3AED]/10 text-[#5B21B6]"
              onClick={() => setActiveLane('sem')}
            />
            <ServiceLaneTab
              label="A&T"
              done={atDone}
              total={atTotal}
              active={activeLane === 'at'}
              activeColor="bg-[#7C3AED]/10 text-[#5B21B6]"
              onClick={() => setActiveLane('at')}
            />
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────
         SECTIONS — collapsed by default, single column.
         Whichever lane is active for "Both" customers is the only
         one rendered, which keeps the layout balanced and the eye
         focused on one workstream at a time.
         ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {visibleLane.sections.map(({ section, idx }) => {
          const sDone = section.items.filter(i => i.done).length;
          const sTotal = section.items.length;
          const sComplete = sDone === sTotal && sTotal > 0;
          const isExpanded = expanded[`${c.id}::${section.title}`] === true;

          // Strip "SEM " / "A&T " prefix from the title since the
          // active service is already established by the switcher
          // above (or by the customer being single-service).
          const displayTitle = section.title.replace(/^(SEM|A&T)\s+/, '');

          return (
            <div
              key={section.title}
              className={`rounded-lg border overflow-hidden transition-colors ${
                sComplete ? 'border-emerald-200 bg-emerald-50/20' : 'border-black/[0.06] bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={isExpanded}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors focus-visible:outline-none focus-visible:bg-black/[0.03]"
              >
                <ChevronDown
                  className={`w-4 h-4 text-black/40 transition-transform shrink-0 ${isExpanded ? '' : '-rotate-90'}`}
                  aria-hidden="true"
                />
                <p className={`flex-1 text-left text-caption font-semibold ${sComplete ? 'text-emerald-700' : 'text-black/80'}`}>
                  {displayTitle}
                </p>
                {/* Mini progress bar embedded in the section header
                    so the admin reads each section's state at a
                    glance without expanding it. */}
                <div className="hidden sm:block w-20 h-1 rounded-full bg-black/[0.06] overflow-hidden shrink-0">
                  <div
                    className={`h-full ${sComplete ? 'bg-emerald-500' : sDone > 0 ? 'bg-[#204CC7]' : 'bg-black/15'}`}
                    style={{ width: `${sTotal === 0 ? 0 : (sDone / sTotal) * 100}%` }}
                  />
                </div>
                <span className={`text-caption font-semibold tabular-nums shrink-0 w-12 text-right ${
                  sComplete ? 'text-emerald-700' : sDone > 0 ? 'text-[#204CC7]' : 'text-black/55'
                }`}>
                  {sDone}/{sTotal}
                </span>
                {sComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />}
              </button>

              {isExpanded && (
                <ul className="border-t border-black/[0.05]">
                  {section.items.map((item, iIdx) => (
                    <li
                      key={iIdx}
                      role="checkbox"
                      aria-checked={item.done}
                      tabIndex={0}
                      onClick={() => toggleItem(idx, iIdx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleItem(idx, iIdx);
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-black/[0.04] last:border-b-0"
                    >
                      {item.done ? (
                        <div className="w-4 h-4 rounded bg-[#00C875] flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" aria-hidden="true" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border-2 border-black/15 bg-white shrink-0" aria-hidden="true" />
                      )}
                      <p className={`flex-1 text-caption ${item.done ? 'text-black/55 line-through' : 'text-black/75'}`}>
                        {item.label}
                      </p>
                      {item.done && item.completedDate && (
                        <span className="text-caption text-black/55 tabular-nums shrink-0 hidden sm:inline">
                          {item.completedDate}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Done celebration — minimal, sits at the very bottom */}
      {isDone && (
        <div className="px-4 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <p className="text-caption font-semibold text-emerald-700">
            Onboarding complete — {c.companyName} is live
          </p>
        </div>
      )}
    </section>
  );
}

/** Segmented-control pill used by the Onboarding panel's service
 *  switcher. Active pill takes the service's brand colour; inactive
 *  pill stays muted so the eye snaps to the live lane. The
 *  done/total caption inside each pill lets the admin compare the
 *  two workstreams' progress before they switch. */
function ServiceLaneTab({
  label,
  done,
  total,
  active,
  activeColor,
  onClick,
}: {
  label: string;
  done: number;
  total: number;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-7 px-3 rounded text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
        active
          ? `${activeColor} shadow-[0_1px_2px_rgba(0,0,0,0.04)]`
          : 'text-black/55 hover:text-black/80'
      }`}
    >
      {label}
      <span className={`text-caption tabular-nums ${active ? 'opacity-80' : 'opacity-60'}`}>
        {done}/{total}
      </span>
    </button>
  );
}

/** Single source of truth for the four onboarding states. The
 *  progress-bar colour is the ONLY place the status colour appears
 *  in the redesigned panel — pills, badges, and tints have all
 *  been removed in favour of one calm carrier. */
const STATUS_BAR_COLOR: Record<OnboardingStatusKey, string> = {
  done:       'bg-emerald-500',
  overdue:    'bg-[#E2445C]',
  progress:   'bg-[#204CC7]',
  notstarted: 'bg-black/25',
};
const STATUS_INK_COLOR: Record<OnboardingStatusKey, string> = {
  done:       'text-emerald-600',
  overdue:    'text-[#E2445C]',
  progress:   'text-[#204CC7]',
  notstarted: 'text-black/50',
};
const STATUS_DOT_COLOR: Record<OnboardingStatusKey, string> = {
  done:       'bg-emerald-500',
  overdue:    'bg-[#E2445C]',
  progress:   'bg-[#204CC7]',
  notstarted: 'bg-black/30',
};
const STATUS_LABEL: Record<OnboardingStatusKey, string> = {
  done:       'Done',
  overdue:    'Overdue',
  progress:   'In progress',
  notstarted: 'Not started',
};

/** Service label resolver — keeps user-facing copy aligned with the
 *  CLAUDE.md SEM/A&T convention regardless of internal discriminant. */
function svcLabelInline(s: CustomerService): string {
  if (s === 'Performance Marketing') return 'SEM';
  if (s === 'Accounts & Taxation') return 'A&T';
  return 'Both';
}

/* ═══════════════════════════════════════════════════════════════════
   DANGER ZONE — quarantined removal controls on Details tab
   ═══════════════════════════════════════════════════════════════════
   Lives at the bottom of the Details tab so the admin has to
   deliberately scroll past every other field before encountering
   destructive actions. The dashed red border + red ink visually
   isolates this card from the rest of the form. We offer two graded
   actions: remove just THIS business, or wipe the entire client (all
   businesses they own). Single-business clients only see the
   single-button variant — there's no "client" to remove that's
   distinct from the lone business. */

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER TEAM PANEL — service-aware team & efforts editor
   ═══════════════════════════════════════════════════════════════════
   Brego runs SEM and A&T as separate operational departments — their
   HODs are different people, their managers don't overlap, their
   delivery hours come from different pools. So a customer with both
   service lines actually has *two* teams under one engagement, not
   one shared team.

   This panel handles all three customer shapes:

     • SEM-only customer  → render the SEM team's 5-role grid,
       employee pool filtered to Performance Marketing.
     • A&T-only customer  → same shape, A&T pool.
     • "Both" customer    → a service switcher (segmented control)
       at the top + a combined banner showing total roles & hours
       across services. The active service's team + summary bar +
       5-role grid render below the switcher. Switching flips the
       view; the *other* service's edits are preserved in state so
       the admin can hop back without losing work.

   Employee dropdowns are filtered by department per service line so
   the admin can never accidentally assign an A&T executive to a SEM
   role. */

function CustomerTeamPanel({
  service,
  semTeam,
  atTeam,
  semEmployeesByRole,
  atEmployeesByRole,
  onUpdateSem,
  onUpdateAt,
}: {
  service: CustomerService;
  semTeam: TeamStructure;
  atTeam: TeamStructure;
  semEmployeesByRole: Record<TeamRoleKey, EmployeeRecord[]>;
  atEmployeesByRole: Record<TeamRoleKey, EmployeeRecord[]>;
  onUpdateSem: (key: TeamRoleKey, field: keyof TeamSlot, value: string | number) => void;
  onUpdateAt:  (key: TeamRoleKey, field: keyof TeamSlot, value: string | number) => void;
}) {
  const isMulti = service === 'Both';
  const hasSEM = service === 'Performance Marketing' || service === 'Both';
  const hasAT  = service === 'Accounts & Taxation'   || service === 'Both';

  // Pick the default active lane for "Both" customers — whichever
  // one has fewer assigned roles (the lane that needs admin attention
  // surfaces first). Single-service customers don't see the switcher.
  const semAssigned = countAssigned(semTeam);
  const atAssigned  = countAssigned(atTeam);
  const defaultActive: 'sem' | 'at' =
    !hasSEM ? 'at'
    : !hasAT ? 'sem'
    : semAssigned <= atAssigned ? 'sem' : 'at';

  const [activeLane, setActiveLane] = useState<'sem' | 'at'>(defaultActive);

  // The lane currently being edited. For single-service customers
  // this is always the relevant lane; for "Both" it follows the
  // switcher.
  const lane: 'sem' | 'at' = isMulti
    ? activeLane
    : (service === 'Performance Marketing' ? 'sem' : 'at');

  const team = lane === 'sem' ? semTeam : atTeam;
  const pools = lane === 'sem' ? semEmployeesByRole : atEmployeesByRole;
  const onUpdate = lane === 'sem' ? onUpdateSem : onUpdateAt;

  const roleHours = teamHours(team);
  const roleAssigned = countAssigned(team);

  // Combined summary across both lanes for "Both" customers — this
  // is the line that tells the founder/COO what total workforce is
  // sitting on the engagement before they drill into a specific lane.
  const combined = useMemo(() => {
    let assigned = 0;
    let hours = 0;
    if (hasSEM) { assigned += semAssigned; hours += teamHours(semTeam); }
    if (hasAT)  { assigned += atAssigned;  hours += teamHours(atTeam); }
    return { assigned, hours };
  }, [hasSEM, hasAT, semTeam, atTeam, semAssigned, atAssigned]);

  return (
    <div className="space-y-4">
      {/* ── Banner ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#204CC7]/15 bg-[#204CC7]/[0.04] p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-md bg-[#204CC7]/10 flex items-center justify-center shrink-0" aria-hidden="true">
          <Users className="w-4 h-4 text-[#204CC7]" />
        </div>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-black">Assign the team &amp; monthly efforts</p>
          <p className="text-caption text-black/65 mt-0.5 leading-relaxed">
            {isMulti
              ? 'SEM and A&T run separate teams. Switch between services below — each lane keeps its own assignments and hours.'
              : 'Only set hours for roles you\'ve actually assigned. Efforts feed into business reports.'}
          </p>
        </div>
      </div>

      {/* ── Combined summary (only for "Both") ─────────────────── */}
      {isMulti && (
        <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 text-[#204CC7] shrink-0" aria-hidden="true" />
            <p className="text-caption font-semibold text-black/80 truncate">Across both services</p>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <div className="text-right">
              <p className="text-caption text-black/55 font-medium uppercase tracking-wider">Roles assigned</p>
              <p className="text-h3 font-bold text-black tabular-nums leading-tight">{combined.assigned} <span className="text-caption font-normal text-black/55">/ 10</span></p>
            </div>
            <div className="w-px h-9 bg-black/[0.08]" aria-hidden="true" />
            <div className="text-right">
              <p className="text-caption text-black/55 font-medium uppercase tracking-wider">Total efforts</p>
              <p className="text-h3 font-bold text-[#204CC7] tabular-nums leading-tight">{combined.hours}h <span className="text-caption font-normal text-black/45">/ mo</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ── Service switcher (only for "Both") ─────────────────── */}
      {isMulti && (
        <div className="inline-flex items-center gap-1 p-1 rounded-md bg-black/[0.04]" role="tablist" aria-label="Service team">
          <ServiceLaneTab
            label="SEM"
            done={semAssigned}
            total={5}
            active={lane === 'sem'}
            activeColor="bg-[#7C3AED]/10 text-[#5B21B6]"
            onClick={() => setActiveLane('sem')}
          />
          <ServiceLaneTab
            label="A&T"
            done={atAssigned}
            total={5}
            active={lane === 'at'}
            activeColor="bg-[#7C3AED]/10 text-[#5B21B6]"
            onClick={() => setActiveLane('at')}
          />
        </div>
      )}

      {/* ── Active service summary bar ─────────────────────────── */}
      <div className="rounded-xl border border-black/[0.06] bg-white grid grid-cols-2 divide-x divide-black/[0.06]">
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55">{isMulti ? `${lane === 'sem' ? 'SEM' : 'A&T'} roles assigned` : 'Roles assigned'}</p>
          <p className="text-h2 font-bold text-black tabular-nums mt-0.5">{roleAssigned} <span className="text-caption text-black/55 font-normal">/ 5</span></p>
        </div>
        <div className="px-4 py-3.5">
          <p className="text-caption text-black/55">{isMulti ? `${lane === 'sem' ? 'SEM' : 'A&T'} efforts` : 'Total efforts'}</p>
          <p className="text-h2 font-bold text-[#204CC7] tabular-nums mt-0.5">{roleHours}h <span className="text-caption text-black/55 font-normal">/ mo</span></p>
        </div>
      </div>

      {/* ── 5 role rows ────────────────────────────────────────── */}
      <div className="space-y-2">
        <TeamSlotRow
          label="HOD"
          subtitle="Head of Department"
          slot={team.hod}
          employees={pools.hod}
          onChange={(f, v) => onUpdate('hod', f, v)}
        />
        <TeamSlotRow
          label="POD Head"
          subtitle="HOD's right hand on the engagement"
          slot={team.podHead}
          employees={pools.podHead}
          onChange={(f, v) => onUpdate('podHead', f, v)}
        />
        <TeamSlotRow
          label="Manager"
          subtitle="Day-to-day delivery lead"
          slot={team.manager}
          employees={pools.manager}
          onChange={(f, v) => onUpdate('manager', f, v)}
        />
        <TeamSlotRow
          label="Assistant Manager"
          subtitle="Supports the Manager on delivery"
          slot={team.assistantManager}
          employees={pools.assistantManager}
          onChange={(f, v) => onUpdate('assistantManager', f, v)}
        />
        <TeamSlotRow
          label="Executive"
          subtitle="Execution owner"
          slot={team.executive}
          employees={pools.executive}
          onChange={(f, v) => onUpdate('executive', f, v)}
        />
      </div>
    </div>
  );
}

/** Counts how many of the 5 role slots have an assigned name. */
function countAssigned(t: TeamStructure): number {
  return (
    (t.hod.name ? 1 : 0) +
    (t.podHead.name ? 1 : 0) +
    (t.manager.name ? 1 : 0) +
    (t.assistantManager.name ? 1 : 0) +
    (t.executive.name ? 1 : 0)
  );
}
/** Sums monthly hours across all 5 slots. */
function teamHours(t: TeamStructure): number {
  return (
    (t.hod.hours || 0) +
    (t.podHead.hours || 0) +
    (t.manager.hours || 0) +
    (t.assistantManager.hours || 0) +
    (t.executive.hours || 0)
  );
}

function DangerZoneCard({
  customer,
  hasSiblings,
  totalBusinesses,
  contactPerson,
  onDeactivateBusiness,
  onDeactivateClient,
}: {
  customer: Customer;
  hasSiblings: boolean;
  totalBusinesses: number;
  contactPerson: string;
  onDeactivateBusiness: () => void;
  onDeactivateClient: () => void;
}) {
  // Soft-delete: amber accent (reversible warning) instead of red.
  // The admin can flip the customer back to Active later from the
  // All Customers list, so the visual treatment doesn't shout
  // "destruction" — it shouts "caution, status change."
  return (
    <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/40 px-4 py-3.5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Archive className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <p className="text-caption font-semibold text-amber-900">Mark as Inactive</p>
          <span className="text-caption text-black/55">
            ·{' '}
            {hasSiblings
              ? `Move this business, or move ${contactPerson} + all ${totalBusinesses} businesses to Inactive. Reversible.`
              : 'Move this business to Inactive. Reversible — record stays.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDeactivateBusiness}
            className="h-9 px-3.5 rounded-md border border-amber-300 bg-white text-amber-900 text-caption font-semibold hover:bg-amber-50 hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 transition-colors inline-flex items-center gap-1.5"
          >
            <Archive className="w-3.5 h-3.5" aria-hidden="true" />
            Mark business inactive
          </button>
          {hasSiblings && (
            <button
              type="button"
              onClick={onDeactivateClient}
              className="h-9 px-3.5 rounded-md bg-amber-600 text-white text-caption font-semibold hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 transition-colors inline-flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" aria-hidden="true" />
              Mark client inactive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DEACTIVATE CUSTOMER MODAL — soft-delete confirmation flow
   ═══════════════════════════════════════════════════════════════════
   Replaces the previous "high-friction permanent delete" dialog with
   a calm soft-delete: the customer record stays, only its status
   flips to Inactive. Reversible from the All Customers list later.

   The flow keeps two safety controls:
     1. A clear summary of *what* moves to Inactive (this business
        only, or every business under the client). The admin sees
        scope before they commit.
     2. A required reason — captured for the audit trail so finance
        / ops can review *why* a customer was deactivated.

   The previous "type-the-name" friction is dropped. It made sense
   for permanent deletion; for a reversible status flip it's
   ceremony, not safety.

   ESC + outside-click dismiss without firing. */

function DeactivateCustomerModal({
  mode,
  customer,
  siblings,
  onClose,
  onConfirm,
}: {
  mode: 'business' | 'client';
  customer: Customer;
  siblings: Customer[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const isClientWide = mode === 'client';
  const titleTarget = isClientWide ? customer.contactPerson : customer.companyName;
  const titleId = 'deactivate-customer-title';

  const [reason, setReason] = useState('');

  // ESC to dismiss + initial focus management
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canSubmit = reason.trim().length > 0;

  // One-line scope blurb. For client-wide deactivation we name the
  // contact person and the count of businesses being moved; for a
  // single-business action we just name the business.
  const scopeBlurb = isClientWide
    ? `${customer.contactPerson} and all ${siblings.length + 1} businesses they own will be moved to Inactive. Team assignments, invoices, and onboarding history stay intact — you can reactivate them later from the All Customers list.`
    : `${customer.companyName} will be moved to Inactive. Team assignments, invoices, and onboarding history stay intact — you can reactivate it later from the All Customers list.`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-[480px] bg-white rounded-xl shadow-2xl outline-none"
        style={{ animation: 'slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="px-5 pt-4 pb-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 id={titleId} className="text-h3 font-bold text-black inline-flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-700" aria-hidden="true" />
              Mark {titleTarget} as Inactive?
            </h3>
            <p className="text-caption text-black/60 mt-1.5 leading-relaxed">
              {scopeBlurb}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="w-8 h-8 rounded-md hover:bg-black/5 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
          >
            <X className="w-4 h-4 text-black/55" aria-hidden="true" />
          </button>
        </div>

        {/* Body — single audit-trail input, no high-friction
            type-to-confirm (the action is reversible). */}
        <div className="px-5 pb-4">
          <label htmlFor="deactivate-reason" className="block text-caption font-semibold text-black/80 mb-1.5">
            Reason <span className="text-amber-700">*</span>
          </label>
          <textarea
            id="deactivate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Engagement paused, client requested off-boarding, contract expired"
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-black/15 bg-white text-caption text-black placeholder:text-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:border-amber-400/60 transition-colors resize-none"
          />
          <p className="text-caption text-black/55 mt-1">
            Stored on the audit log so finance / ops know why this customer was deactivated.
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-black/[0.06] flex items-center justify-end gap-2 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md text-caption font-semibold text-black/70 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => canSubmit && onConfirm(reason.trim())}
            className="h-9 px-3.5 rounded-md bg-amber-600 text-white text-caption font-semibold hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:ring-offset-2 transition-colors inline-flex items-center gap-1.5 disabled:bg-amber-300 disabled:cursor-not-allowed"
          >
            <Archive className="w-3.5 h-3.5" aria-hidden="true" />
            Mark as Inactive
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPLOYEE DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   STANDALONE PAGE EXPORTS
   Each wraps its tab with self-contained state so it works as a
   standalone route under /adminland/database/*
   ═══════════════════════════════════════════════════════════════════ */

export function DatabaseCustomersPage({
  forceService,
}: {
  /** When set, locks the service filter to this value and removes
   *  customers from other service lines from the underlying source.
   *  Used by the HOD role view where the "Customers" tab is scoped
   *  to A&T only — the HOD never sees pure-SEM clients here. */
  forceService?: CustomerService;
} = {}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [serviceFilter, setServiceFilter] = useState<'All' | CustomerService>('All');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'companyName', dir: 'asc' });
  const [selected, setSelected] = useState<Customer | null>(null);

  // When `forceService` is set, the source list is pre-filtered to
  // that service (or 'Both', which spans both lines). The user-
  // facing service dropdown is hidden in CustomersTab when the prop
  // is present so the locked scope is unambiguous.
  const sourceCustomers = useMemo(() => {
    if (!forceService) return MOCK_CUSTOMERS;
    return MOCK_CUSTOMERS.filter(c => c.service === forceService || c.service === 'Both');
  }, [forceService]);

  const filtered = useMemo(() => {
    let list = sourceCustomers.filter(c => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (serviceFilter !== 'All' && c.service !== serviceFilter) return false;
      if (search) { const q = search.toLowerCase(); return c.companyName.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q) || c.email.toLowerCase().includes(q); }
      return true;
    });
    list.sort((a, b) => { const k = sort.key as keyof Customer; const av = a[k], bv = b[k]; if (typeof av === 'string' && typeof bv === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av; return 0; });
    return list;
  }, [sourceCustomers, search, statusFilter, serviceFilter, sort]);

  const stats = useMemo(() => ({
    total:        sourceCustomers.length,
    active:       sourceCustomers.filter(c => c.status === 'Active').length,
    inactive:     sourceCustomers.filter(c => c.status === 'Inactive').length,
    totalRevenue: sourceCustomers.filter(c => c.status === 'Active').reduce((s, c) => s + c.monthlyRetainer, 0),
  }), [sourceCustomers]);

  const toggleSort = (key: string) => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  return <CustomersTab customers={filtered} stats={stats} search={search} onSearch={setSearch} statusFilter={statusFilter} onStatusFilter={setStatusFilter} serviceFilter={serviceFilter} onServiceFilter={setServiceFilter} sort={sort} onSort={toggleSort} selectedCustomer={selected} onSelectCustomer={setSelected} hideServiceFilter={!!forceService} />;
}

export function DatabaseEmployeesPage({ view = 'live' }: { view?: 'live' | 'past' } = {}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | EmployeeStatus>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  // Default sort by employee code so the roster reads in joining
  // order (BB-001, BB-002, …) rather than alphabetised by name.
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'empCode', dir: 'asc' });
  const [selected, setSelected] = useState<EmployeeRecord | null>(null);
  // Mutable copy of the seed data so inline edits (Department, etc.)
  // persist across renders. The seed remains the source of truth on
  // first mount; the admin's edits live in this state until the page
  // unmounts. A real backend wiring would call the API in the helper
  // below and refetch on success.
  const [employeesData, setEmployeesData] = useState<EmployeeRecord[]>(MOCK_EMPLOYEES);
  // Sidecar state for personal info — same lifecycle as employeesData.
  // Add/edit personal data here when the admin saves the form.
  const [personalDetails, setPersonalDetails] = useState<Record<string, PersonalInfo>>(PERSONAL_DETAILS_SEED);

  const updateEmployeeDept = (id: string, department: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, department } : e)));
    // Mirror onto the open drawer's snapshot so the drawer's "Work
    // Details → Department" cell reflects the change immediately if
    // the row was clicked open before editing.
    setSelected(prev => (prev && prev.id === id ? { ...prev, department } : prev));
  };
  const updateEmployeeCompany = (id: string, company: Company) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, company } : e)));
    setSelected(prev => (prev && prev.id === id ? { ...prev, company } : prev));
  };
  const updateEmployeeRole = (id: string, role: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, role } : e)));
    setSelected(prev => (prev && prev.id === id ? { ...prev, role } : prev));
  };
  const updateEmployeeCLA = (id: string, claStatus: CLAStatus, claReason?: string) => {
    setEmployeesData(prev => prev.map(e => (e.id === id ? { ...e, claStatus, claReason: claStatus === 'None' ? undefined : (claReason ?? e.claReason) } : e)));
    setSelected(prev => (prev && prev.id === id ? { ...prev, claStatus, claReason: claStatus === 'None' ? undefined : (claReason ?? prev.claReason) } : prev));
  };
  /** Append a new employee + their personal info. Auto-generates id +
   *  empCode (next BB-NNN in sequence) and appraisalMonth (one year
   *  after joining date, same month). Status defaults to Active,
   *  claStatus to None. */
  const addEmployee = (input: NewEmployeeInput) => {
    setEmployeesData(prev => {
      const maxNum = prev.reduce((m, e) => {
        const n = parseInt(e.empCode.replace('BB-', ''), 10);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      const nextNum = maxNum + 1;
      const newId = `emp${nextNum}`;
      const newEmp: EmployeeRecord = {
        id: newId,
        empCode: `BB-${String(nextNum).padStart(3, '0')}`,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        company: input.company,
        department: input.department,
        designation: input.designation.trim(),
        role: input.role,
        status: 'Active',
        joiningDate: input.joiningDate,
        exitDate: null,
        reportingManager: input.reportingManager.trim() || '—',
        workstation: input.workstation,
        monthlySalary: input.monthlySalary,
        house: input.house,
        claStatus: 'None',
        appraisalMonth: computeAppraisalMonth(input.joiningDate),
      };
      // Sidecar personal info written in the same tick.
      setPersonalDetails(prevP => ({ ...prevP, [newId]: input.personal }));
      return [...prev, newEmp];
    });
  };
  /** Backfill a historical exit. Builds an EmployeeRecord with the
   *  exit-type as status, sensible defaults for the live-only fields
   *  (salary 0, phone empty, company defaults to Brego Business), and
   *  prepends it to employeesData so the new row appears at the top
   *  of the Past Employees table. Auto-generates id + empCode in the
   *  same `BB-NNN` sequence as the live roster so the past records
   *  fit alongside the live ones in any cross-roster reads. */
  const addPastEmployee = (input: PastEmployeeFormPayload) => {
    setEmployeesData(prev => {
      const maxNum = prev.reduce((m, e) => {
        const n = parseInt(e.empCode.replace('BB-', ''), 10);
        return Number.isNaN(n) ? m : Math.max(m, n);
      }, 0);
      const nextNum = maxNum + 1;
      const newId = `emp${nextNum}`;
      // Joining date defaults to one year before the captured exit
      // date so tenure-style reports don't choke on a NULL — admin
      // can edit later if they recall the actual joining date.
      const exit = new Date(input.exitDate);
      const joining = new Date(exit);
      joining.setFullYear(exit.getFullYear() - 1);
      const joiningISO = joining.toISOString().slice(0, 10);
      // Email auto-gen from name — lowercase, dotted, @bregobusiness.com.
      const slug = input.name.trim().toLowerCase().split(/\s+/).join('.');
      const newEmp: EmployeeRecord = {
        id: newId,
        empCode: `BB-${String(nextNum).padStart(3, '0')}`,
        name: input.name.trim(),
        email: `${slug}@bregobusiness.com`,
        phone: '',
        company: 'Brego Business',
        department: input.department,
        designation: input.role,
        role: input.role,
        status: input.exitType,
        joiningDate: joiningISO,
        exitDate: input.exitDate,
        exitReason: input.reason,
        reportingManager: '—',
        workstation: 'Mumbai HQ',
        monthlySalary: 0,
        house: 'Bahram',
        claStatus: 'None',
        appraisalMonth: '—',
      };
      return [newEmp, ...prev];
    });
  };
  /** Append one or more uploaded documents to an existing employee
   *  (used by the Documents card inside the drawer for after-the-fact
   *  uploads). New employees collect docs at create-time via the
   *  Add Employee modal, which routes through addEmployee above. */
  const addDocuments = (empId: string, docs: EmployeeDocument[]) => {
    setPersonalDetails(prev => {
      const existing = prev[empId];
      if (!existing) return prev;
      return {
        ...prev,
        [empId]: { ...existing, documents: [...existing.documents, ...docs] },
      };
    });
  };
  const removeDocument = (empId: string, docId: string) => {
    setPersonalDetails(prev => {
      const existing = prev[empId];
      if (!existing) return prev;
      return {
        ...prev,
        [empId]: { ...existing, documents: existing.documents.filter(d => d.id !== docId) },
      };
    });
  };
  /** Hard-remove an employee from the system. Wipes the main record,
   *  the personal-info sidecar, and closes the drawer if it was
   *  showing this employee. Reserved for full off-boarding cases —
   *  most exits should be marked Resigned/Terminated instead. */
  const removeEmployee = (id: string) => {
    setEmployeesData(prev => prev.filter(e => e.id !== id));
    setPersonalDetails(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelected(prev => (prev && prev.id === id ? null : prev));
  };

  const filtered = useMemo(() => {
    let list = employeesData.filter(e => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (deptFilter !== 'All' && e.department !== deptFilter) return false;
      if (search) { const q = search.toLowerCase(); return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.empCode.toLowerCase().includes(q); }
      return true;
    });
    list.sort((a, b) => { const k = sort.key as keyof EmployeeRecord; const av = a[k], bv = b[k]; if (typeof av === 'string' && typeof bv === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); if (typeof av === 'number' && typeof bv === 'number') return sort.dir === 'asc' ? av - bv : bv - av; return 0; });
    return list;
  }, [employeesData, search, statusFilter, deptFilter, sort]);

  const stats = useMemo(() => ({ total: employeesData.length, active: employeesData.filter(e => e.status === 'Active').length, past: employeesData.filter(e => e.status === 'Resigned' || e.status === 'Terminated').length, onNotice: employeesData.filter(e => e.status === 'On Notice').length }), [employeesData]);

  const toggleSort = (key: string) => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  return <EmployeesTab view={view} employees={filtered} stats={stats} search={search} onSearch={setSearch} statusFilter={statusFilter} onStatusFilter={setStatusFilter} deptFilter={deptFilter} onDeptFilter={setDeptFilter} sort={sort} onSort={toggleSort} selectedEmployee={selected} onSelectEmployee={setSelected} onUpdateDepartment={updateEmployeeDept} onUpdateCompany={updateEmployeeCompany} onUpdateRole={updateEmployeeRole} onUpdateCLA={updateEmployeeCLA} onAddEmployee={addEmployee} onAddPastEmployee={addPastEmployee} personalDetails={personalDetails} onAddDocuments={addDocuments} onRemoveDocument={removeDocument} onRemoveEmployee={removeEmployee} />;
}

export function DatabaseResourceRequestPage() {
  const [search, setSearch] = useState('');
  // Default to Pending so the admin lands on what needs action. Easy
  // to flip to "All Status" or any other slice via the top-bar filter.
  const [statusFilter, setStatusFilter] = useState<'All' | RequestStatus>('Pending');
  const [priorityFilter, setPriorityFilter] = useState<'All' | RequestPriority>('All');
  const [monthFilter, setMonthFilter] = useState<'All' | string>('All');
  // Live list from the shared resource-requests store. Mutations made
  // anywhere (this page's New Request modal, the A&T deliverables page's
  // Request Resource modal, etc.) propagate through here.
  const requests = useResourceRequests();

  // Derive month bucket options from the request dates, newest first.
  // Each request is bucketed by `YYYY-MM`; the dropdown shows a friendly
  // label like "April 2026" while the value matches the bucket key.
  const monthOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) {
      const d = new Date(r.requestDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && r.priority !== priorityFilter) return false;
      if (monthFilter !== 'All') {
        const d = new Date(r.requestDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== monthFilter) return false;
      }
      if (search) { const q = search.toLowerCase(); return r.requestId.toLowerCase().includes(q) || r.requestedBy.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.role.toLowerCase().includes(q); }
      return true;
    });
  }, [requests, search, statusFilter, priorityFilter, monthFilter]);

  // Stats are scoped to the *filtered* set so the cards and the table
  // tell the same story. When the admin scopes to "April 2026" the
  // numbers reflect April; when they're on "All months" the numbers
  // reflect the whole history. This is what gives the page its
  // month-on-month feel without an extra surface.
  const stats = useMemo(() => ({
    total: filtered.length,
    pending: filtered.filter(r => r.status === 'Pending').length,
    open: filtered.filter(r => r.status === 'Open').length,
    fulfilled: filtered.filter(r => r.status === 'Fulfilled').length,
    totalPositions: filtered.filter(r => r.status === 'Open').reduce((s, r) => s + r.positions, 0),
  }), [filtered]);

  return (
    <ResourceRequestsTab
      requests={filtered}
      stats={stats}
      totalCount={requests.length}
      search={search}
      onSearch={setSearch}
      statusFilter={statusFilter}
      onStatusFilter={setStatusFilter}
      priorityFilter={priorityFilter}
      onPriorityFilter={setPriorityFilter}
      monthOptions={monthOptions}
      monthFilter={monthFilter}
      onMonthFilter={setMonthFilter}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EMPLOYEE DETAIL DRAWER
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Employee detail drawer — redesigned, world-class layout.
 *
 * Structure (top → bottom):
 *   1. Sticky brand-blue header with avatar, name, code · designation,
 *      status pill, and close X
 *   2. Featured Appraisal CTA card (the next review month + a primary
 *      action button)
 *   3. Definition-list sections — Contact, Organization, Employment,
 *      Workplace — each rendered as a clean key/value list with hairline
 *      separators between rows (no boxy 2-col grid), so the eye scans
 *      vertically without visual noise
 *
 * Width is bumped from 400 → 520px so labels and values both breathe
 * without truncation on long values like "Performance Marketing".
 */
function EmployeeDrawer({ employee, personal, onClose, onUpdateCLA, onAddDocuments, onRemoveDocument, onRemoveEmployee }: {
  employee: EmployeeRecord;
  personal: PersonalInfo | undefined;
  onClose: () => void;
  onUpdateCLA: (id: string, status: CLAStatus, reason?: string) => void;
  onAddDocuments: (empId: string, docs: EmployeeDocument[]) => void;
  onRemoveDocument: (empId: string, docId: string) => void;
  onRemoveEmployee: (id: string) => void;
}) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const initials = employee.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const isPast = employee.status === 'Resigned' || employee.status === 'Terminated';
  // The Founder/CEO doesn't run through the appraisal cycle — hide
  // the CTA card on his row. Past employees also skip it.
  const isFounder = employee.empCode === 'BB-001';
  const hasAppraisal = !isFounder && employee.appraisalMonth && employee.appraisalMonth !== '—';

  // CLA/NTF inline form open/closed state. The form itself is a
  // self-contained `<ClaForm>` child component — it owns its own type
  // + reason state internally with uncontrolled refs, so keystrokes
  // can't be lost to parent re-renders. The drawer only knows
  // "is the form open or closed".
  const [claFormOpen, setClaFormOpen] = useState(false);
  const closeClaForm = () => setClaFormOpen(false);
  const submitClaForm = (type: 'CLA' | 'NTF', reason: string) => {
    onUpdateCLA(employee.id, type, reason);
    setClaFormOpen(false);
  };

  // Reset form when switching employees.
  useEffect(() => { setClaFormOpen(false); }, [employee.id]);

  // Indian salary formatter — renders like ₹1,80,000.
  const formatINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  // Annual CTC = monthly × 12. In Indian payroll, monthly salary is
  // typically take-home before deductions; this is a simple
  // back-of-the-envelope total compensation that's accurate enough
  // for an admin overview.
  const annualCTC = employee.monthlySalary * 12;

  // Compute appraisal urgency for the CTA card. "Due this month"
  // (today's month + year matches `appraisalMonth`) gets the amber
  // alert treatment; "next month" reads as soon; further out reads
  // as later. Past employees skip the CTA entirely.
  const appraisalContext = (() => {
    if (!hasAppraisal || isPast) return null;
    const target = new Date(`${employee.appraisalMonth} 1`);
    if (Number.isNaN(target.getTime())) return null;
    const now = new Date();
    const monthsAway = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    if (monthsAway < 0)  return { label: 'overdue',         tone: 'urgent' as const };
    if (monthsAway === 0) return { label: 'due this month', tone: 'urgent' as const };
    if (monthsAway === 1) return { label: 'next month',     tone: 'soon'   as const };
    if (monthsAway <= 3)  return { label: `in ${monthsAway} months`, tone: 'soon' as const };
    return                       { label: `in ${monthsAway} months`, tone: 'later' as const };
  })();

  // CLA/NTF pill palette — None reads neutral, CLA amber, NTF rose.
  const claPill = (s: CLAStatus): string => {
    if (s === 'CLA') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'NTF') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-black/[0.03] text-black/55 border-black/[0.08]';
  };

  // Single key-value row used by every section. Label sits left in
  // muted caption type, value sits right in body type. Subtle bottom
  // hairline between rows for legibility without weight. The value
  // cell wraps to multi-line for long content (addresses, reasons)
  // rather than truncating, since this is an admin reference view.
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-6 py-2.5 border-b border-black/[0.05] last:border-b-0">
      <span className="text-caption text-black/55 font-medium shrink-0 pt-0.5">{label}</span>
      <span className="text-body text-black/85 font-medium text-right min-w-0">{value}</span>
    </div>
  );

  /**
   * Section card — every information block on the drawer renders inside
   * one of these. White surface on the soft-gray drawer tray. Iconified
   * header + uppercase eyebrow title + optional right-aligned action,
   * then content area below. Same chrome across every section so the
   * drawer reads as one consistent design system.
   */
  const Section = ({
    icon: Icon, title, action, children,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(15,29,77,0.03)]">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-black/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-black/[0.04] flex items-center justify-center" aria-hidden="true">
            <Icon className="w-3.5 h-3.5 text-black/55" />
          </div>
          <h4 className="text-[11px] font-semibold text-black/55 uppercase tracking-[0.08em]">{title}</h4>
        </div>
        {action ?? null}
      </header>
      <div className="px-5 py-1.5">{children}</div>
    </section>
  );

  return (
    <>
      {/* Backdrop sits at z-[9998] (above the global nav at z-50) so
          the dim covers the entire viewport and the nav recedes behind
          the modal context, matching the Financial Data Upload drawer
          pattern across the app. */}
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed right-0 top-0 h-full w-[600px] max-w-[92vw] bg-white shadow-2xl z-[9999] overflow-y-auto"
        style={{ animation: 'slideIn 0.25s ease-out' }}
        role="dialog"
        aria-modal="true"
        aria-label={`${employee.name} details`}
      >
        {/* ── Sticky header — brand-blue gradient, large avatar ── */}
        <header className="sticky top-0 z-10 px-7 pt-6 pb-5 bg-gradient-to-br from-[#3B82F6] to-[#204CC7] text-white shadow-[0_2px_12px_-4px_rgba(15,29,77,0.35)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0" aria-hidden="true">
                <span className="text-[15px] font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-h2 font-bold text-white truncate">{employee.name}</h3>
                <p className="text-caption text-white/80 mt-0.5 font-medium">
                  {employee.empCode} · {employee.designation}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Close"
            >
              <X className="w-[18px] h-[18px] text-white" aria-hidden="true" />
            </button>
          </div>

          {/* Status chip — compact, stays inside the header */}
          <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 text-white text-caption font-semibold">
            <span className={`w-1.5 h-1.5 rounded-full ${
              employee.status === 'Active'     ? 'bg-emerald-300' :
              employee.status === 'On Notice'  ? 'bg-amber-300'   :
              employee.status === 'Terminated' ? 'bg-red-300'     :
                                                  'bg-white/60'
            }`} aria-hidden="true" />
            {employee.status}
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════
            BODY TRAY — soft-gray surface that the white section cards
            sit on. Generous gap between cards (12px) gives each card
            its own breathing room without feeling spaced out.
            ══════════════════════════════════════════════════════════ */}
        <div className="bg-[#F7F8FB] px-5 py-5 space-y-3">

        {/* ── Contact ── */}
        <Section icon={Mail} title="Contact">
          <div className="flex items-center gap-2.5 py-2 border-b border-black/[0.05]">
            <Mail className="w-3.5 h-3.5 text-black/35 shrink-0" aria-hidden="true" />
            <span className="text-body text-black/85 truncate">{employee.email}</span>
          </div>
          <div className="flex items-center gap-2.5 py-2">
            <Phone className="w-3.5 h-3.5 text-black/35 shrink-0" aria-hidden="true" />
            <span className="text-body text-black/85 tabular-nums">{employee.phone}</span>
          </div>
        </Section>

        {/* ── Organization — Company / Department / Reporting line ── */}
        <Section icon={Building2} title="Organization">
          <Row label="Company" value={employee.company} />
          <Row label="Department" value={employee.department} />
          <Row label="Reporting to" value={employee.reportingManager} />
        </Section>

        {/* ── Employment — Status / CLA-NTF (interactive) / Joined ── */}
        <Section icon={Briefcase} title="Employment">
          <Row
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  employee.status === 'Active'     ? 'bg-emerald-500' :
                  employee.status === 'On Notice'  ? 'bg-amber-500'   :
                  employee.status === 'Terminated' ? 'bg-red-500'     :
                                                      'bg-black/30'
                }`} aria-hidden="true" />
                {employee.status}
              </span>
            }
          />

          {/* CLA / NTF — interactive row + form panel.
              The display row stays in the standard rhythm; the editor
              opens as a self-contained <ClaForm> below when toggled.
              That child component owns its own input state internally
              (uncontrolled refs), which makes it impossible for parent
              re-renders to interrupt typing. */}
          <div className="flex items-center justify-between gap-6 py-2.5 border-b border-black/[0.05]">
            <span className="text-caption text-black/55 font-medium shrink-0 pt-0.5">CLA / NTF</span>
            <div className="min-w-0 flex items-center justify-end gap-3 flex-wrap">
              {employee.claStatus === 'None' ? (
                <>
                  <span className="text-body text-black/55">Not flagged</span>
                  {!isFounder && !claFormOpen && (
                    <button
                      type="button"
                      onClick={() => setClaFormOpen(true)}
                      className="inline-flex items-center gap-1 text-caption font-semibold text-[#204CC7] hover:text-[#1A3FA8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded px-1"
                    >
                      <Plus className="w-3 h-3" aria-hidden="true" />
                      Add to CLA / NTF
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-caption font-semibold ${claPill(employee.claStatus)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${employee.claStatus === 'CLA' ? 'bg-amber-500' : 'bg-rose-500'}`} aria-hidden="true" />
                    {employee.claStatus}
                  </span>
                  {!claFormOpen && (
                    <>
                      <button
                        type="button"
                        onClick={() => setClaFormOpen(true)}
                        className="text-caption font-semibold text-[#204CC7] hover:text-[#1A3FA8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded px-1"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateCLA(employee.id, 'None')}
                        className="text-caption font-semibold text-rose-600 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 rounded px-1"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Reason readout when status is set and the form is closed */}
          {employee.claStatus !== 'None' && !claFormOpen && employee.claReason && (
            <div className="py-2.5 border-b border-black/[0.05]">
              <p className="text-caption text-black/70 leading-relaxed pl-3 border-l-2 border-black/[0.1]">
                {employee.claReason}
              </p>
            </div>
          )}

          {/* Self-contained inline editor */}
          {claFormOpen && (
            <ClaForm
              initialType={(employee.claStatus === 'NTF' ? 'NTF' : 'CLA') as 'CLA' | 'NTF'}
              initialReason={employee.claReason ?? ''}
              isEdit={employee.claStatus !== 'None'}
              onCancel={closeClaForm}
              onSubmit={submitClaForm}
            />
          )}

          <Row label="Joined on" value={formatDate(employee.joiningDate)} />
          {employee.exitDate && <Row label="Exit date" value={<span className="text-rose-600">{formatDate(employee.exitDate)}</span>} />}
        </Section>

        {/* ── Compensation — Monthly + Annual CTC + Next appraisal.
             Hidden for the Founder/CEO (he doesn't run on payroll
             through this admin module). ── */}
        {!isFounder && (
        <Section icon={IndianRupee} title="Compensation">
          <Row
            label="Monthly salary"
            value={<span className="tabular-nums">{formatINR(employee.monthlySalary)}</span>}
          />
          <Row
            label="Annual CTC"
            value={<span className="tabular-nums font-semibold text-black/90">{formatINR(annualCTC)}</span>}
          />

          {/* Next appraisal — a clean key-value row, sitting in the
              same rhythm as Monthly salary / Annual CTC above. The
              urgency context (in 3 months / due this month / etc.)
              renders on a second line in tone-appropriate color so
              admins still get the at-a-glance temperature read.
              Hidden for the founder and past employees. */}
          {hasAppraisal && (
            <Row
              label="Next appraisal"
              value={
                <span className="block">
                  <span className="text-body font-semibold text-black/90 tabular-nums">{employee.appraisalMonth}</span>
                  {appraisalContext && (
                    <span className={`block text-caption mt-0.5 ${
                      appraisalContext.tone === 'urgent' ? 'text-amber-700 font-semibold' :
                      appraisalContext.tone === 'soon'   ? 'text-[#204CC7] font-semibold' :
                                                            'text-black/55'
                    }`}>{appraisalContext.label}</span>
                  )}
                </span>
              }
            />
          )}
        </Section>
        )}

        {/* ── Workplace — Workstation + House ── */}
        <Section icon={MapPin} title="Workplace">
          <Row label="Workstation" value={employee.workstation} />
          <Row label="House" value={employee.house} />
        </Section>

        {/* ── Documents — uploaded soft copies of ID proofs and HR
             paperwork. Admin can upload more / remove via the inline
             controls. Renders even when there are zero docs (so the
             upload affordance is always accessible). Hidden for the
             Founder/CEO — his paperwork sits outside this admin
             surface. */}
        {!isFounder && (
          <DocumentsSection
            employee={employee}
            documents={personal?.documents ?? []}
            onAdd={(docs) => onAddDocuments(employee.id, docs)}
            onRemove={(docId) => onRemoveDocument(employee.id, docId)}
          />
        )}

        {/* ── Personal Information — DOB / Blood / Gender / Address /
             Emergency contact. Lives at the bottom — secondary info,
             reference-only. Falls back gracefully when the sidecar is
             missing the employee. */}
        {personal && (
          <Section icon={User} title="Personal Information">
            <Row label="Date of birth" value={<span className="tabular-nums">{formatDate(personal.dob)}</span>} />
            <Row label="Blood group" value={<span className="tabular-nums font-semibold">{personal.bloodGroup}</span>} />
            <Row label="Gender" value={personal.gender} />
            <Row
              label="Address"
              value={<span className="text-right whitespace-normal text-black/85 leading-relaxed text-caption">{personal.address}</span>}
            />
            <Row
              label="Emergency contact"
              value={
                <span className="text-right text-caption">
                  <span className="block font-semibold text-black/85">{personal.emergency.name}</span>
                  <span className="block text-black/55">{personal.emergency.relation} · <span className="tabular-nums">{personal.emergency.phone}</span></span>
                </span>
              }
            />
          </Section>
        )}

        {/* ── Remove employee — irreversible action. Locked off for
             the Founder/CEO (BB-001) since you don't kick the founder
             out of his own company through an admin panel. The
             previous "DANGER ZONE" header band was retired (the
             rose-tinted card + the Remove employee CTA already make
             the destructiveness obvious); the action fires a
             confirmation modal before anything is removed. */}
        {!isFounder && (
          <section className="rounded-xl border border-rose-200 bg-rose-50/40 shadow-[0_1px_2px_rgba(15,29,77,0.03)]">
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-black/85">Remove employee</p>
                  <p className="text-caption text-black/60 mt-1 leading-relaxed">
                    Permanently delete {employee.name} ({employee.empCode}) and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-white border border-rose-300 text-caption font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Remove employee
                </button>
              </div>
            </div>
          </section>
        )}

        </div>{/* /tray */}
      </div>

      {/* Confirmation modal — must explicitly type the employee's
          empCode to confirm. Sits on top of the drawer (z-[10000])
          so it visually supersedes the drawer below. */}
      {showRemoveConfirm && (
        <RemoveEmployeeConfirmModal
          employee={employee}
          onCancel={() => setShowRemoveConfirm(false)}
          onConfirm={() => {
            setShowRemoveConfirm(false);
            onRemoveEmployee(employee.id);
          }}
        />
      )}
    </>
  );
}

/**
 * RemoveEmployeeConfirmModal — destructive confirmation dialog.
 *
 * Removing an employee deletes the entire record (organization,
 * compensation, personal info, uploaded documents) and cannot be
 * undone. To prevent fat-finger accidents, the admin must TYPE the
 * employee's empCode (e.g. "BB-005") before the destructive button
 * unlocks. This is the same "type to confirm" pattern GitHub and
 * Vercel use for repo / project deletion.
 */
function RemoveEmployeeConfirmModal({
  employee,
  onCancel,
  onConfirm,
}: {
  employee: EmployeeRecord;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === employee.empCode;
  const dialogRef = useModalA11y(true, onCancel);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[10000]" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-emp-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[92vw] z-[10001] bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header — rose alert band */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 bg-rose-50 border-b border-rose-100">
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0" aria-hidden="true">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-700" />
          </div>
          <div className="min-w-0">
            <h2 id="remove-emp-title" className="text-h3 font-bold text-black/90">
              Remove {employee.name}?
            </h2>
            <p className="text-caption text-black/65 mt-1 leading-relaxed">
              This permanently deletes <span className="font-semibold text-black/80">{employee.empCode}</span> and all associated records — organization, compensation, personal information, and uploaded documents. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Body — type-to-confirm */}
        <div className="px-6 py-5">
          <label htmlFor="confirm-empcode" className="block text-caption font-medium text-black/70 mb-2">
            Type <span className="font-mono font-semibold text-rose-700">{employee.empCode}</span> to confirm.
          </label>
          <input
            id="confirm-empcode"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={employee.empCode}
            autoFocus
            className="w-full h-10 px-3 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/30 font-mono tracking-wide focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20"
          />
        </div>

        {/* Footer — actions */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-black/[0.02] border-t border-black/[0.05]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-9 text-caption font-medium text-black/70 rounded-md hover:bg-black/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches}
            className="inline-flex items-center gap-1.5 px-4 h-9 text-caption font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:ring-offset-2"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Remove employee
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * AddPastEmployeeModal — backfill a past-employee record.
 *
 * Used on the Past Employees screen via the top-bar "Add Employee"
 * CTA when an admin wants to register someone who left BEFORE the
 * platform was tracking off-boarding — i.e. a historical exit that
 * never had a live record on the system. The result is an
 * EmployeeRecord with status set to Resigned / Terminated, the
 * captured exit date + reason, and sensible defaults for all the
 * live-only fields (salary 0, phone empty, company defaults to
 * Brego Business, designation mirrors role) so the row renders
 * cleanly in the Past Employees table without polluting the live
 * roster.
 *
 * Form fields mirror the Past Employees columns:
 *   • Employee Name
 *   • Role           — 7 platform roles
 *   • Department     — same DEPARTMENTS_LIST as the live filter,
 *                       minus the "All" / "All Departments" sentinels
 *   • Exit Date      — defaults to today
 *   • Exit Type      — Resigned (default) or Terminated
 *   • Reason         — free-form, required
 *
 * Service is auto-derived from Department on render (PM → SEM,
 * A&T → A&T, anything else → "—") — same rule as the table.
 */
type PastEmployeeFormPayload = {
  name: string;
  role: string;
  department: string;
  exitType: 'Resigned' | 'Terminated';
  exitDate: string;
  reason: string;
};

function AddPastEmployeeModal({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (payload: PastEmployeeFormPayload) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('Executive');
  const [department, setDepartment] = useState<string>('Performance Marketing');
  const [exitType, setExitType] = useState<'Resigned' | 'Terminated'>('Resigned');
  const [exitDate, setExitDate] = useState<string>(today);
  const [reason, setReason] = useState<string>('');
  const dialogRef = useModalA11y(true, onCancel);

  // Department options — strip the "All" sentinel and the exec-only
  // "All Departments" literal (cross-functional executives are not
  // typical past-employee records).
  const departmentOptions = DEPARTMENTS_LIST.filter(d => d !== 'All' && d !== 'All Departments');

  // Submit gate — name and reason are required, the others have
  // defaults. Trim before checking so whitespace-only doesn't pass.
  const canSubmit = name.trim().length > 0 && reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      role,
      department,
      exitType,
      exitDate,
      reason: reason.trim(),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[10000]" onClick={onCancel} aria-hidden="true" />
      <form
        ref={dialogRef as React.RefObject<HTMLFormElement>}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-past-emp-title"
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[92vw] z-[10001] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header — calm, no alert band. This is a record-keeping
            action, not a destructive one. */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <div className="min-w-0">
            <h2 id="add-past-emp-title" className="text-h3 font-bold text-black/90">
              Add past employee
            </h2>
            <p className="text-caption text-black/60 mt-1 leading-relaxed">
              Backfill a historical exit. The record lands on the Past Employees screen with the captured details.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:text-black/80 hover:bg-black/[0.04] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form body — fields stack from top to bottom in the same
            order as the Past Employees table columns: Employee
            Name → Role → Department (Service derived) → Exit Date
            → Exit Type → Reason. */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Employee Name */}
          <div>
            <label htmlFor="add-past-name" className="block text-caption font-semibold text-black/70 mb-2">
              Employee name <span className="text-rose-600">*</span>
            </label>
            <input
              id="add-past-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Mehta"
              autoFocus
              className="w-full h-10 px-3 rounded-md border border-black/[0.10] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
            />
          </div>

          {/* Role + Department — paired in a 2-up grid so the form
              stays compact. */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="add-past-role" className="block text-caption font-semibold text-black/70 mb-2">Role</label>
              <select
                id="add-past-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-black/[0.10] bg-white text-body text-black/85 cursor-pointer focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              >
                {ROLE_OPTIONS_FORM.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="add-past-dept" className="block text-caption font-semibold text-black/70 mb-2">Department</label>
              <select
                id="add-past-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-black/[0.10] bg-white text-body text-black/85 cursor-pointer focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              >
                {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Exit Date */}
          <div>
            <label htmlFor="add-past-date" className="block text-caption font-semibold text-black/70 mb-2">Exit date</label>
            <input
              id="add-past-date"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              max={today}
              className="w-full h-10 px-3 rounded-md border border-black/[0.10] bg-white text-body text-black/85 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
            />
          </div>

          {/* Exit Type — radio cards, same shape as the previous
              form modal so the visual stays familiar. */}
          <fieldset>
            <legend className="text-caption font-semibold text-black/70 mb-2">Exit type</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Resigned', 'Terminated'] as const).map(opt => {
                const selected = exitType === opt;
                const isTerm = opt === 'Terminated';
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExitType(opt)}
                    aria-pressed={selected}
                    className={`flex items-center gap-2 px-3 h-10 rounded-md border text-caption font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                      selected
                        ? isTerm
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-[#204CC7]/30 bg-[#204CC7]/[0.06] text-[#204CC7]'
                        : 'border-black/[0.10] bg-white text-black/70 hover:border-black/20 hover:bg-black/[0.02]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selected ? (isTerm ? 'bg-rose-500' : 'bg-[#204CC7]') : 'bg-black/25'}`} aria-hidden="true" />
                    {opt}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Reason — required */}
          <div>
            <label htmlFor="add-past-reason" className="block text-caption font-semibold text-black/70 mb-2">
              Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="add-past-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={exitType === 'Terminated'
                ? 'Performance issues, repeated client compliance errors…'
                : 'Better growth opportunity, relocating, switched fields…'}
              className="w-full px-3 py-2.5 rounded-md border border-black/[0.10] bg-white text-body text-black/85 placeholder:text-black/35 leading-relaxed focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer — Cancel + brand-blue Add CTA. */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-black/[0.015] border-t border-black/[0.05]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 h-9 text-caption font-medium text-black/70 rounded-md hover:bg-black/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-4 h-9 text-caption font-semibold rounded-md bg-[#204CC7] text-white hover:bg-[#1a3d9f] disabled:bg-[#204CC7]/30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:ring-offset-2"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Add employee
          </button>
        </div>
      </form>
    </>
  );
}

// Roles surfaced in the AddPastEmployeeModal Role dropdown. Lifted
// out of the EmployeesTab function scope so the modal (sibling
// component) can read it without prop drilling. Mirrors the
// ROLE_OPTIONS array used inside the live-table inline editor.
const ROLE_OPTIONS_FORM = ['Admin', 'HOD', 'POD Head', 'Manager', 'Assistant Manager', 'Executive', 'Intern'] as const;

/**
 * ClaForm — self-contained CLA/NTF editor.
 *
 * Why this is a separate component: keeping the form's input state
 * (selected type + reason text) INSIDE the form means parent re-renders
 * can never interrupt typing or reset the textarea. The reason text
 * uses an UNCONTROLLED textarea (defaultValue + ref) — the DOM owns
 * the value while the user is editing, and we only read it on submit.
 * This eliminates the entire class of "controlled-component lost a
 * keystroke" issues.
 */
function ClaForm({
  initialType,
  initialReason,
  isEdit,
  onCancel,
  onSubmit,
}: {
  initialType: 'CLA' | 'NTF';
  initialReason: string;
  isEdit: boolean;
  onCancel: () => void;
  onSubmit: (type: 'CLA' | 'NTF', reason: string) => void;
}) {
  const [type, setType] = useState<'CLA' | 'NTF'>(initialType);
  // Track whether the reason has any non-whitespace content so the
  // submit button can be enabled/disabled. Uses a small piece of
  // local state that updates on each keystroke; the textarea itself
  // remains uncontrolled (its value lives in the DOM).
  const [hasReason, setHasReason] = useState(initialReason.trim().length > 0);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const reason = reasonRef.current?.value.trim() ?? '';
    if (!reason) return;
    onSubmit(type, reason);
  };

  return (
    <div
      className="my-3 p-4 rounded-lg border border-[#204CC7]/20 bg-[#EEF1FB]/40"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-caption font-semibold text-black/80 mb-3">
        {isEdit ? 'Edit flag' : 'Flag this employee'}
      </p>

      {/* Type selector — segmented buttons (controlled, since
          highlighting the active state is essential UX). */}
      <div className="flex items-center gap-1.5 mb-3">
        {(['CLA', 'NTF'] as const).map(opt => {
          const active = type === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setType(opt)}
              className={`flex-1 h-9 rounded-md text-caption font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                active
                  ? (opt === 'CLA'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300')
                  : 'bg-white text-black/55 border-black/[0.1] hover:border-black/20 hover:text-black/70'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Reason — UNCONTROLLED textarea. defaultValue seeds the
          initial content, the ref reads the value at submit time.
          onInput just toggles the disabled state of the submit
          button — never touches the textarea's value. */}
      <p className="text-caption font-medium text-black/65 mb-1">Reason</p>
      <textarea
        ref={reasonRef}
        defaultValue={initialReason}
        onInput={(e) => setHasReason((e.target as HTMLTextAreaElement).value.trim().length > 0)}
        placeholder="What triggered this flag? Be specific — this becomes part of the HR record."
        rows={3}
        autoFocus
        className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-caption text-black/85 placeholder:text-black/35 leading-relaxed resize-none focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15"
      />

      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 h-9 text-caption font-medium text-black/65 rounded-md hover:bg-black/[0.05] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasReason}
          className="px-4 h-9 text-caption font-semibold rounded-md bg-[#204CC7] text-white hover:bg-[#1A3FA8] disabled:bg-[#204CC7]/30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:ring-offset-2"
        >
          {isEdit ? 'Save changes' : 'Flag employee'}
        </button>
      </div>
    </div>
  );
}

/**
 * DocumentsSection — secure soft-copy storage for an employee's
 * paperwork. Renders inside the EmployeeDrawer's body tray as a
 * normal Section card.
 *
 * Behaviour:
 *  • Always renders, even when the employee has zero documents — the
 *    upload affordance is the empty state.
 *  • Click the dropzone or the "Add document" button → file picker.
 *    Selecting one or more files immediately appends them to the
 *    employee's documents list (admin can change type tags afterward
 *    via the per-row dropdown).
 *  • Each document row shows: icon, filename, type tag (editable),
 *    size, uploader + uploaded-at relative time, and a remove button.
 *
 * Persistence is handled by the parent via `onAdd` / `onRemove`
 * callbacks; this component is purely presentational + UX glue.
 */
function DocumentsSection({
  employee,
  documents,
  onAdd,
  onRemove,
}: {
  employee: EmployeeRecord;
  documents: EmployeeDocument[];
  onAdd: (docs: EmployeeDocument[]) => void;
  onRemove: (docId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date().toISOString();
    const next: EmployeeDocument[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      next.push({
        id: `doc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        type: 'Other',
        sizeBytes: f.size,
        uploadedAt: now,
        uploadedBy: 'You',
      });
    }
    onAdd(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatRelative = (iso: string): string => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <section className="rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(15,29,77,0.03)]">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-black/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-black/[0.04] flex items-center justify-center" aria-hidden="true">
            <Shield className="w-3.5 h-3.5 text-black/55" />
          </div>
          <h4 className="text-[11px] font-semibold text-black/55 uppercase tracking-[0.08em]">Documents</h4>
          {documents.length > 0 && (
            <span className="text-caption text-black/45 tabular-nums">· {documents.length}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1 text-caption font-semibold text-[#204CC7] hover:text-[#1A3FA8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded px-1"
        >
          <Plus className="w-3 h-3" aria-hidden="true" /> Add document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          aria-label={`Upload documents for ${employee.name}`}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </header>
      <div className="px-5 py-3">
        {documents.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="block w-full cursor-pointer rounded-lg border-2 border-dashed border-black/15 bg-black/[0.015] hover:bg-[#204CC7]/[0.04] hover:border-[#204CC7]/40 transition-colors px-4 py-6 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <Upload className="w-5 h-5 text-black/40 mx-auto mb-1.5" aria-hidden="true" />
            <p className="text-caption font-medium text-black/70">Upload soft copies</p>
            <p className="text-caption text-black/45 mt-0.5">Aadhaar, PAN, offer letter, certificates · PDF / JPG / PNG</p>
          </button>
        ) : (
          <ul className="space-y-1.5">
            {documents.map(d => (
              <li key={d.id} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-black/[0.06] bg-black/[0.015] hover:bg-black/[0.025] transition-colors">
                <FileText className="w-4 h-4 text-black/40 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-black/85 truncate">{d.name}</p>
                  <p className="text-caption text-black/45 mt-0.5">
                    {formatSize(d.sizeBytes)} · {d.uploadedBy} · {formatRelative(d.uploadedAt)}
                  </p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#EEF1FB] text-[#204CC7] text-[11px] font-semibold whitespace-nowrap shrink-0">
                  {d.type}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(d.id)}
                  aria-label={`Remove ${d.name}`}
                  className="w-7 h-7 rounded-md text-black/45 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * AddEmployeeModal — single-screen form to create a new employee
 * record. The fields here are the minimum an admin needs to add
 * someone to the org chart; richer attributes (DOB, blood group,
 * address, emergency contact) can be filled in afterwards via the
 * detail drawer.
 *
 * Layout: 2-column grid for paired inputs, single column for the few
 * fields that benefit from extra width (Name, Reporting to). Required
 * fields validate locally — Submit stays disabled until they're set
 * + the email looks like an @bregobusiness.com address.
 */
function AddEmployeeModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (input: NewEmployeeInput) => void;
}) {
  const dialogRef = useModalA11y(true, onClose);
  // Form state — kept locally; only reaches the parent on submit.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState<Company>('Brego Business');
  const [department, setDepartment] = useState<string>('Performance Marketing');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState<string>('Executive');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportingManager, setReportingManager] = useState('');
  const [workstation, setWorkstation] = useState('Mumbai HQ');
  const [monthlySalary, setMonthlySalary] = useState<string>('');
  const [house, setHouse] = useState<House>('Palmer');

  // Personal info — optional but admin-friendly to collect at create.
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Document uploads — staged in local state until submit. Each
  // staged doc carries the original file metadata + the admin's
  // chosen type tag. We don't actually upload bytes anywhere in this
  // mock — a real backend would PUT each file to S3 here.
  const [stagedDocs, setStagedDocs] = useState<Array<{ tempId: string; name: string; type: string; sizeBytes: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    const next: typeof stagedDocs = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      next.push({
        tempId: `staged-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        type: 'Other',
        sizeBytes: f.size,
      });
    }
    setStagedDocs(prev => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const updateStagedDocType = (tempId: string, newType: string) => {
    setStagedDocs(prev => prev.map(d => (d.tempId === tempId ? { ...d, type: newType } : d)));
  };
  const removeStagedDoc = (tempId: string) => {
    setStagedDocs(prev => prev.filter(d => d.tempId !== tempId));
  };

  const emailLooksValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const isValid =
    name.trim().length > 0 &&
    emailLooksValid &&
    phone.trim().length > 0 &&
    designation.trim().length > 0 &&
    joiningDate.length > 0;

  // Indian file size formatter (KB / MB / GB).
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const now = new Date().toISOString();
    const documents: EmployeeDocument[] = stagedDocs.map(d => ({
      id: d.tempId,
      name: d.name,
      type: d.type,
      sizeBytes: d.sizeBytes,
      uploadedAt: now,
      uploadedBy: 'You',
    }));
    onSubmit({
      name,
      email,
      phone,
      company,
      department,
      designation,
      role,
      joiningDate,
      reportingManager,
      workstation,
      monthlySalary: parseInt(monthlySalary, 10) || 0,
      house,
      personal: {
        dob,
        bloodGroup,
        gender,
        address: address.trim(),
        emergency: {
          name: emergencyName.trim(),
          relation: emergencyRelation,
          phone: emergencyPhone.trim(),
        },
        documents,
      },
    });
  };

  const labelClass = 'block text-caption font-medium text-black/65 mb-1.5';
  const inputClass = 'w-full h-10 px-3 rounded-md border border-black/10 bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 transition-all';
  const selectClass = `${inputClass} appearance-none pr-9 cursor-pointer`;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-employee-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[92vw] max-h-[88vh] bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col focus:outline-none"
      >
        {/* Header */}
        <header className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h2 id="add-employee-title" className="text-h3 font-bold text-black/90">Add Employee</h2>
            <p className="text-caption text-black/55 mt-0.5">Create a new record. The next employee code will be auto-assigned.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md hover:bg-black/[0.04] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <X className="w-4 h-4 text-black/55" aria-hidden="true" />
          </button>
        </header>

        {/* Body — scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          {/* Identity */}
          <div className="space-y-4 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">Identity</p>
            <div>
              <label htmlFor="ae-name" className={labelClass}>Full name <span className="text-rose-500" aria-hidden="true">*</span></label>
              <input id="ae-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Riya Kapoor" autoFocus className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ae-email" className={labelClass}>Work email <span className="text-rose-500" aria-hidden="true">*</span></label>
                <input id="ae-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="riya@bregobusiness.com" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-phone" className={labelClass}>Phone <span className="text-rose-500" aria-hidden="true">*</span></label>
                <input id="ae-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Org placement */}
          <div className="space-y-4 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">Organization</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ae-company" className={labelClass}>Company <span className="text-rose-500" aria-hidden="true">*</span></label>
                <div className="relative">
                  <select id="ae-company" value={company} onChange={e => setCompany(e.target.value as Company)} className={selectClass}>
                    {(['Brego Group', 'Brego Business', 'Brego Land', 'Forsyth Lodge'] as Company[]).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div>
                <label htmlFor="ae-dept" className={labelClass}>Department <span className="text-rose-500" aria-hidden="true">*</span></label>
                <div className="relative">
                  <select id="ae-dept" value={department} onChange={e => setDepartment(e.target.value)} className={selectClass}>
                    {DEPARTMENT_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ae-desig" className={labelClass}>Designation <span className="text-rose-500" aria-hidden="true">*</span></label>
                <input id="ae-desig" type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Sr. Executive" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-role" className={labelClass}>Role <span className="text-rose-500" aria-hidden="true">*</span></label>
                <div className="relative">
                  <select id="ae-role" value={role} onChange={e => setRole(e.target.value)} className={selectClass}>
                    {['Admin', 'HOD', 'Manager', 'Executive', 'Intern'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="ae-mgr" className={labelClass}>Reporting to</label>
              <input id="ae-mgr" type="text" value={reportingManager} onChange={e => setReportingManager(e.target.value)} placeholder="e.g. Tejas Atha (leave blank if none)" className={inputClass} />
            </div>
          </div>

          {/* Employment */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">Employment</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ae-join" className={labelClass}>Joining date <span className="text-rose-500" aria-hidden="true">*</span></label>
                <input id="ae-join" type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-station" className={labelClass}>Workstation</label>
                <div className="relative">
                  <select id="ae-station" value={workstation} onChange={e => setWorkstation(e.target.value)} className={selectClass}>
                    {['Mumbai HQ', 'Remote', 'Hybrid', 'Goa Office', 'Alibag Office'].map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ae-salary" className={labelClass}>Monthly salary (₹)</label>
                <input id="ae-salary" type="number" value={monthlySalary} onChange={e => setMonthlySalary(e.target.value)} placeholder="50000" min={0} step={1000} className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-house" className={labelClass}>House</label>
                <div className="relative">
                  <select id="ae-house" value={house} onChange={e => setHouse(e.target.value as House)} className={selectClass}>
                    {(['Palmer', 'Savage', 'Bahram', 'Wilson'] as House[]).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information — optional but encouraged at create.
              Captured for HR / compliance / emergency-contact lookup. */}
          <div className="space-y-4 mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">Personal Information</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="ae-dob" className={labelClass}>Date of birth</label>
                <input id="ae-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-blood" className={labelClass}>Blood group</label>
                <div className="relative">
                  <select id="ae-blood" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className={selectClass}>
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div>
                <label htmlFor="ae-gender" className={labelClass}>Gender</label>
                <div className="relative">
                  <select id="ae-gender" value={gender} onChange={e => setGender(e.target.value)} className={selectClass}>
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="ae-address" className={labelClass}>Home address</label>
              <textarea
                id="ae-address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Building, street, locality, city, PIN"
                rows={2}
                className={`${inputClass} h-auto py-2 leading-relaxed resize-none`}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="ae-ec-name" className={labelClass}>Emergency contact</label>
                <input id="ae-ec-name" type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Full name" className={inputClass} />
              </div>
              <div>
                <label htmlFor="ae-ec-rel" className={labelClass}>Relation</label>
                <div className="relative">
                  <select id="ae-ec-rel" value={emergencyRelation} onChange={e => setEmergencyRelation(e.target.value)} className={selectClass}>
                    {['Spouse', 'Parent', 'Sibling', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div>
                <label htmlFor="ae-ec-phone" className={labelClass}>Phone</label>
                <input id="ae-ec-phone" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Documents — admin-uploaded soft copies of ID proofs &
              HR paperwork. Stored as metadata only in this mock; a
              real backend would put each file in S3 and store URLs. */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">Documents</p>
              <p className="text-caption text-black/45">PDF, JPG, PNG · up to 10 MB each</p>
            </div>

            {/* Upload dropzone */}
            <label
              htmlFor="ae-files"
              className="block cursor-pointer rounded-lg border-2 border-dashed border-black/15 bg-black/[0.015] hover:bg-[#204CC7]/[0.04] hover:border-[#204CC7]/40 transition-colors px-4 py-5 text-center"
            >
              <Upload className="w-5 h-5 text-black/40 mx-auto mb-1.5" aria-hidden="true" />
              <p className="text-caption font-medium text-black/70">Click to upload documents</p>
              <p className="text-caption text-black/45 mt-0.5">Aadhaar, PAN, offer letter, certificates, etc.</p>
              <input
                id="ae-files"
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
            </label>

            {/* Staged docs list */}
            {stagedDocs.length > 0 && (
              <ul className="space-y-1.5">
                {stagedDocs.map(d => (
                  <li key={d.tempId} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-black/[0.08] bg-white">
                    <FileText className="w-4 h-4 text-black/40 shrink-0" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-caption text-black/85 truncate">{d.name}</p>
                      <p className="text-caption text-black/45 mt-0.5">{formatSize(d.sizeBytes)}</p>
                    </div>
                    <div className="relative shrink-0">
                      <select
                        value={d.type}
                        onChange={(e) => updateStagedDocType(d.tempId, e.target.value)}
                        aria-label={`Document type for ${d.name}`}
                        className="appearance-none bg-white pl-2.5 pr-7 py-1 rounded-md text-caption text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 cursor-pointer"
                      >
                        {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStagedDoc(d.tempId)}
                      aria-label={`Remove ${d.name}`}
                      className="w-7 h-7 rounded-md text-black/45 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between gap-3 shrink-0 bg-[#FAFBFC]">
          <p className="text-caption text-black/45">
            <span className="text-rose-500" aria-hidden="true">*</span> required fields
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-md text-caption font-medium text-black/65 hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className="h-10 px-5 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1A3FA8] disabled:bg-[#204CC7]/30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:ring-offset-2"
            >
              Add employee
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
