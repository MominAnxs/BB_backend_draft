'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  Users, Briefcase, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Clock, Building2, UserPlus, UserMinus, GraduationCap,
  PartyPopper, Megaphone, Shield, Target, Phone, FileText, Award, Eye, BarChart3,
  ArrowUp, ArrowDown, Minus, Filter, X,
} from 'lucide-react';

// ════════════════════════════════════════════
// ─── TYPES ──────────────────────────────────
// ════════════════════════════════════════════

type HRSection = 'overview' | 'resource' | 'efforts' | 'performance' | 'engagement' | 'onboarding' | 'incidents';

interface ResourceRequirement {
  id: number;
  head: 'Product' | 'Growth';
  team: string;
  company: string;
  department: string;
  position: string;
  experience: string;
  budget: string;
  status: 'Active' | 'Offer Sent' | 'Interviewing' | 'On Hold';
  comments: string[];
}

interface EffortsMISRow {
  metric: string;
  jan: number | null;
  janPct: string | null;
  feb: number | null;
  febPct: string | null;
  mar: number | null;
  marPct: string | null;
  apr: number | null;
  aprPct: string | null;
}

interface RecruiterEfforts {
  name: string;
  initials: string;
  color: string;
  rows: EffortsMISRow[];
}

interface PerformanceRow {
  month: string;
  poojaActive: number; poojaFired: number; poojaResigned: number; poojaTotal: number;
  priyankaActive: number;
  ravinaActive: number; ravinaFired: number; ravinaResigned: number; ravinaTotal: number;
  grandTotal: number;
}

interface EngagementEvent {
  id: number;
  month: string;
  event: string;
  date: string;
  plan: string;
  totalCost: number | null;
  status: 'Completed' | 'Upcoming' | 'TBD';
}

interface OnboardingEmployee {
  name: string;
  department: string;
  status: 'Settled' | 'Settling';
  comments: string;
}

interface Incident {
  month: string;
  priority: 'High' | 'Low';
  count: number;
}

// ════════════════════════════════════════════
// ─── MOCK DATA ──────────────────────────────
// ════════════════════════════════════════════

const resourceRequirements: ResourceRequirement[] = [
  { id: 1, head: 'Product', team: 'Pooja', company: 'Brego Group', department: 'Finance', position: 'Floaters - 4/5', experience: '3+ yrs', budget: '25k-35k', status: 'Active', comments: ['Chetan — Will be moved from 10th April', 'Parul Offered: Joined', 'Nisha Offered: 33.2K, DOJ: 06th April 2026, DOCS: Done', 'Jyoti Offered: 41.5K, DOJ: 04th May 2026, DOCS: Pending', 'Amisha shortlisted for final round — Scheduled for Friday evening with Irshad'] },
  { id: 2, head: 'Product', team: 'Pooja', company: 'Brego Group', department: 'Finance', position: '1x Manager', experience: '6+ yrs', budget: '45k-55k', status: 'Interviewing', comments: ['No shortlist for final round'] },
  { id: 3, head: 'Growth', team: 'Ujwal / Priyanka', company: 'Forsyth', department: 'Sales', position: '7x BDE - 0/7', experience: '2-5 years', budget: '30k-50k', status: 'Active', comments: ['No shortlist for final round'] },
  { id: 4, head: 'Growth', team: 'Ujwal / Priyanka', company: 'Brego Land', department: 'Sales', position: '1x BDE - 0/1', experience: '2-5 years', budget: '30k-50k', status: 'Active', comments: ['No shortlist for final round'] },
  { id: 5, head: 'Growth', team: 'Ujwal / Priyanka', company: 'Brego Business', department: 'Sales', position: '8x Business Dev Execs', experience: '2-5 years', budget: '30k-50k', status: 'Offer Sent', comments: ['Maaz offered: 54k, DOJ: 02nd April 2026, DOCS — Done', 'Vaishnavi offered: 45k, DOJ: 20th April 2026, DOCS — Done', 'Arya Offered: 60k, DOJ: Yet to confirm, DOCS — Done'] },
  { id: 6, head: 'Product', team: 'Ravina', company: 'Brego Group', department: 'SEM', position: 'Floaters - 0/3', experience: '3+ years', budget: '45-50K', status: 'Active', comments: ['No shortlist for final round'] },
  { id: 7, head: 'Product', team: 'Ravina', company: 'Brego Group', department: 'SEM', position: '2x SEM Manager / QC', experience: '3+ years', budget: '70-85K', status: 'Interviewing', comments: ['Harsh Offered: 83k, DOJ: 1st May 2026, Docs: Pending', 'Nachiket to be interviewed on Tuesday at 6:00 PM (Virtual)', 'Ashish to be interviewed on Tuesday at 6:00 PM (Virtual)'] },
  { id: 8, head: 'Product', team: 'Ravina', company: 'Brego Group', department: 'Technology', position: 'Full Stack Developer', experience: '3+', budget: '80k-1.2L', status: 'Offer Sent', comments: ['Sadashiav offered 15 lac, DOJ: 13th April 2026, Docs: Pending'] },
];

const recruiterEfforts: RecruiterEfforts[] = [
  {
    name: 'Pooja', initials: 'PJ', color: '#7C3AED',
    rows: [
      { metric: 'Sourced Candidates', jan: null, janPct: null, feb: null, febPct: null, mar: 300, marPct: null, apr: 200, aprPct: null },
      { metric: 'Calls Connected', jan: 1188, janPct: null, feb: 933, febPct: null, mar: 883, marPct: null, apr: 194, aprPct: '97%' },
      { metric: 'Interviews Set', jan: 226, janPct: '19%', feb: 77, febPct: '8%', mar: 66, marPct: '7%', apr: 14, aprPct: '7%' },
      { metric: 'Interviews Done', jan: 56, janPct: '25%', feb: 63, febPct: '82%', mar: 50, marPct: '76%', apr: 5, aprPct: '36%' },
      { metric: 'Offers Sent', jan: 10, janPct: '18%', feb: 3, febPct: '5%', mar: 6, marPct: '12%', apr: 0, aprPct: '0%' },
      { metric: 'Hired', jan: 4, janPct: '40%', feb: 3, febPct: '100%', mar: 1, marPct: null, apr: 0, aprPct: '0%' },
    ],
  },
  {
    name: 'Ravina', initials: 'RV', color: '#06B6D4',
    rows: [
      { metric: 'Sourced Candidates', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 200, aprPct: null },
      { metric: 'Calls Connected', jan: null, janPct: null, feb: null, febPct: null, mar: 969, marPct: null, apr: 149, aprPct: '75%' },
      { metric: 'Interviews Set', jan: 110, janPct: null, feb: 879, febPct: null, mar: 136, marPct: null, apr: 13, aprPct: '9%' },
      { metric: 'Interviews Done', jan: 80, janPct: '73%', feb: 442, febPct: '50%', mar: 68, marPct: '50%', apr: 10, aprPct: '77%' },
      { metric: 'Offers Sent', jan: 3, janPct: '4%', feb: 4, febPct: '1%', mar: 0, marPct: '0%', apr: 0, aprPct: '0%' },
      { metric: 'Hired', jan: 3, janPct: '100%', feb: 4, febPct: '100%', mar: 3, marPct: null, apr: 0, aprPct: '0%' },
    ],
  },
  {
    name: 'Priyanka', initials: 'PK', color: '#F59E0B',
    rows: [
      { metric: 'Sourced Candidates', jan: null, janPct: null, feb: null, febPct: null, mar: 0, marPct: null, apr: 0, aprPct: null },
      { metric: 'Calls Connected', jan: 1235, janPct: null, feb: 981, febPct: null, mar: 792, marPct: null, apr: 0, aprPct: '0%' },
      { metric: 'Interviews Set', jan: 151, janPct: '13%', feb: 54, febPct: '6%', mar: 105, marPct: '13%', apr: 0, aprPct: '0%' },
      { metric: 'Interviews Done', jan: 27, janPct: '18%', feb: 48, febPct: '89%', mar: 74, marPct: '70%', apr: 0, aprPct: '0%' },
      { metric: 'Offers Sent', jan: 7, janPct: '25%', feb: 5, febPct: '11%', mar: 4, marPct: '5%', apr: 0, aprPct: '0%' },
      { metric: 'Hired', jan: 3, janPct: '43%', feb: 0, febPct: '0%', mar: 0, marPct: null, apr: 0, aprPct: '0%' },
    ],
  },
  {
    name: 'Ujjwal', initials: 'UB', color: '#10B981',
    rows: [
      { metric: 'Sourced Candidates', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 100, aprPct: null },
      { metric: 'Calls Connected', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 86, aprPct: '86%' },
      { metric: 'Interviews Set', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 6, aprPct: '7%' },
      { metric: 'Interviews Done', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 3, aprPct: '50%' },
      { metric: 'Offers Sent', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 0, aprPct: '0%' },
      { metric: 'Hired', jan: null, janPct: null, feb: null, febPct: null, mar: null, marPct: null, apr: 0, aprPct: '0%' },
    ],
  },
];

const performanceData: PerformanceRow[] = [
  { month: 'Jun-25', poojaActive: 0, poojaFired: 0, poojaResigned: 1, poojaTotal: 1, priyankaActive: 0, ravinaActive: 0, ravinaFired: 0, ravinaResigned: 0, ravinaTotal: 0, grandTotal: 1 },
  { month: 'Jul-25', poojaActive: 1, poojaFired: 2, poojaResigned: 1, poojaTotal: 4, priyankaActive: 0, ravinaActive: 1, ravinaFired: 1, ravinaResigned: 1, ravinaTotal: 3, grandTotal: 7 },
  { month: 'Sep-25', poojaActive: 1, poojaFired: 3, poojaResigned: 2, poojaTotal: 6, priyankaActive: 0, ravinaActive: 0, ravinaFired: 2, ravinaResigned: 2, ravinaTotal: 4, grandTotal: 10 },
  { month: 'Oct-25', poojaActive: 1, poojaFired: 1, poojaResigned: 2, poojaTotal: 4, priyankaActive: 0, ravinaActive: 0, ravinaFired: 3, ravinaResigned: 0, ravinaTotal: 3, grandTotal: 7 },
  { month: 'Nov-25', poojaActive: 2, poojaFired: 1, poojaResigned: 1, poojaTotal: 4, priyankaActive: 0, ravinaActive: 0, ravinaFired: 1, ravinaResigned: 1, ravinaTotal: 2, grandTotal: 6 },
  { month: 'Dec-25', poojaActive: 2, poojaFired: 0, poojaResigned: 0, poojaTotal: 2, priyankaActive: 0, ravinaActive: 2, ravinaFired: 3, ravinaResigned: 1, ravinaTotal: 6, grandTotal: 8 },
  { month: 'Jan-26', poojaActive: 3, poojaFired: 0, poojaResigned: 1, poojaTotal: 4, priyankaActive: 3, ravinaActive: 0, ravinaFired: 1, ravinaResigned: 0, ravinaTotal: 1, grandTotal: 8 },
  { month: 'Feb-26', poojaActive: 2, poojaFired: 1, poojaResigned: 0, poojaTotal: 3, priyankaActive: 0, ravinaActive: 2, ravinaFired: 1, ravinaResigned: 1, ravinaTotal: 4, grandTotal: 7 },
  { month: 'Mar-26', poojaActive: 1, poojaFired: 0, poojaResigned: 0, poojaTotal: 1, priyankaActive: 0, ravinaActive: 1, ravinaFired: 0, ravinaResigned: 2, ravinaTotal: 3, grandTotal: 4 },
  { month: 'Apr-26', poojaActive: 1, poojaFired: 0, poojaResigned: 0, poojaTotal: 1, priyankaActive: 0, ravinaActive: 0, ravinaFired: 0, ravinaResigned: 0, ravinaTotal: 0, grandTotal: 1 },
];

const performanceTotals = { poojaActive: 14, poojaFired: 8, poojaResigned: 8, poojaTotal: 30, priyankaActive: 3, ravinaActive: 6, ravinaFired: 12, ravinaResigned: 8, ravinaTotal: 26, grandTotal: 59 };

const engagementEvents: EngagementEvent[] = [
  { id: 1, month: 'April', event: 'Movie Screening — Dhurandhar 2', date: '3rd April', plan: 'Take whole Office for the Movie Screening', totalCost: 9000, status: 'Completed' },
  { id: 2, month: 'April', event: 'IPL Screening', date: '16th April', plan: 'GJ Titans vs KKR + Snacks', totalCost: 40000, status: 'Upcoming' },
  { id: 3, month: 'May', event: 'One Day Offsite — Alibaugh', date: 'TBD', plan: 'TBD', totalCost: null, status: 'TBD' },
  { id: 4, month: 'June', event: 'Office Olympics — Indoor Games Night', date: '12th June', plan: '4 teams to compete each other in school Olympics games + Food & Beverages', totalCost: 40000, status: 'Upcoming' },
];

const onboardingEmployees: OnboardingEmployee[] = [
  { name: 'Chetan Nare', department: 'Finance', status: 'Settling', comments: 'There is change in client, hence we need to see how he gets aligned with the new set of the client' },
  { name: 'Parul', department: 'Finance', status: 'Settling', comments: 'She joined on 1st of April, hence need time to understand and see the performance' },
  { name: 'Naeela', department: 'Finance', status: 'Settling', comments: 'We are moving her to P0, need time to observe and confirm by this month end' },
  { name: 'Prathamesh Tervankar', department: 'Finance', status: 'Settling', comments: 'Tricky client (Goglocal), hence need time for him to settle. We might replace him with Vinay and then check the performance' },
  { name: 'Ujjwal Bobhate', department: 'HR', status: 'Settling', comments: 'Have aligned her with the expectations and kept under observation till this month end' },
  { name: 'Purva Patankar', department: 'Operations', status: 'Settling', comments: 'Have moved her to Sales Ops completely and will be observing her till this month end then will take the decision' },
  { name: 'Luiza Shaikh', department: 'Performance Marketing', status: 'Settling', comments: 'Have aligned her with the expectations and kept under observation' },
  { name: 'Daniya Shaikh', department: 'Technology', status: 'Settling', comments: 'Have aligned her with the expectations and kept under observation by April end' },
];

const incidentData: Incident[] = [
  { month: 'Feb', priority: 'High', count: 1 },
  { month: 'Mar', priority: 'High', count: 8 },
  { month: 'Mar', priority: 'Low', count: 2 },
  { month: 'Apr', priority: 'Low', count: 3 },
];

// ════════════════════════════════════════════
// ─── DERIVED DATA FOR CHARTS ────────────────
// ════════════════════════════════════════════

// Hiring funnel for overview — aggregate Apr 2026 across all recruiters
const hiringFunnelData = [
  { stage: 'Sourced', value: 500, fill: '#204CC7' },
  { stage: 'Calls', value: 429, fill: '#3B82F6' },
  { stage: 'Interviews Set', value: 33, fill: '#60A5FA' },
  { stage: 'Interviews Done', value: 18, fill: '#93C5FD' },
  { stage: 'Offers', value: 0, fill: '#BFDBFE' },
  { stage: 'Hired', value: 0, fill: '#DBEAFE' },
];

// Performance chart data — stacked bar showing hires by type
const perfChartData = performanceData.map(row => ({
  month: row.month.replace('-25', "'25").replace('-26', "'26"),
  Active: row.poojaActive + row.priyankaActive + row.ravinaActive,
  Fired: row.poojaFired + row.ravinaFired,
  Resigned: row.poojaResigned + row.ravinaResigned,
}));

// Incidents chart data
const incidentChartData = [
  { month: 'Feb', high: 1, low: 0 },
  { month: 'Mar', high: 8, low: 2 },
  { month: 'Apr', high: 0, low: 3 },
];

// Onboarding status pie
const onboardingPieData = [
  { name: 'Settled', value: 16, fill: '#00C875' },
  { name: 'Settling', value: 8, fill: '#FDAB3D' },
];

// Open positions by department
const openByDeptData = [
  { dept: 'Finance', open: 2, filled: 3 },
  { dept: 'Sales', open: 3, filled: 3 },
  { dept: 'SEM', open: 2, filled: 1 },
  { dept: 'Technology', open: 1, filled: 1 },
];

// ════════════════════════════════════════════
// ─── SECTION NAV CONFIG ─────────────────────
// ════════════════════════════════════════════


// ════════════════════════════════════════════
// ─── COMPONENT ──────────────────────────────
// ════════════════════════════════════════════

export function HRReport({ activeSection = 'overview' }: { activeSection?: HRSection }) {
  const [expandedRR, setExpandedRR] = useState<number | null>(null);
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>('all');
  const [perfView, setPerfView] = useState<'table' | 'chart'>('chart');
  const [reportPeriod, setReportPeriod] = useState<'weekly' | 'monthly'>('monthly');

  // Overview KPI cards
  const totalOpenPositions = 8;
  const totalHiredThisMonth = 0;
  const totalHiredAllTime = 59;
  const settledPct = Math.round((16 / 24) * 100);
  const totalIncidents = 14;
  const highPriorityIncidents = 9;

  // ── Stat Card helper ──
  const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, sub, trend, accent }: {
    icon: React.ElementType; iconBg: string; iconColor: string;
    label: string; value: string | number; sub?: string;
    trend?: { direction: 'up' | 'down' | 'flat'; label: string; good?: boolean };
    accent?: string;
  }) => (
    <div className="rounded-xl border border-black/[0.06] bg-white px-5 py-5 hover:shadow-sm transition-shadow" role="group" aria-label={`${label}: ${value}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption text-black/45 font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
      </div>
      <p className={`text-[32px] font-bold leading-none ${accent || 'text-black/85'}`}>{value}</p>
      {sub && <p className="text-caption text-black/40 mt-2">{sub}</p>}
      {trend && (
        <div className={`inline-flex items-center gap-1 mt-3 px-2 py-1 rounded-md text-caption font-medium ${trend.good ? 'text-emerald-700 bg-emerald-50' : trend.direction === 'down' ? 'text-rose-600 bg-rose-50' : 'text-black/40 bg-black/[0.03]'}`}>
          {trend.direction === 'up' ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : trend.direction === 'down' ? <ArrowDown className="w-3 h-3" aria-hidden="true" /> : <Minus className="w-3 h-3" aria-hidden="true" />}
          {trend.label}
        </div>
      )}
    </div>
  );

  // ── Status badge helper ──
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      'Active': 'bg-blue-50 text-blue-700 border-blue-100',
      'Offer Sent': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Interviewing': 'bg-amber-50 text-amber-700 border-amber-100',
      'On Hold': 'bg-black/[0.03] text-black/40 border-black/[0.06]',
      'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Upcoming': 'bg-blue-50 text-blue-700 border-blue-100',
      'TBD': 'bg-amber-50 text-amber-700 border-amber-100',
      'Settled': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Settling': 'bg-amber-50 text-amber-700 border-amber-100',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-semibold border ${styles[status] || 'bg-black/[0.02] text-black/40 border-black/[0.05]'}`}>
        {status}
      </span>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white rounded-xl shadow-lg border border-black/[0.06] px-4 py-3 text-caption">
        <p className="font-semibold text-black/70 mb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-black/50">{entry.name}:</span>
            <span className="font-semibold text-black/70 ml-auto">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-0 pb-6">
      {/* Section navigation is now in the top bar dropdown */}

      {/* ════════════════ OVERVIEW ════════════════ */}
      {activeSection === 'overview' && (
        <div className="space-y-6" style={{ animation: 'hrSlideUp 0.2s ease-out' }} role="region" aria-label="HR Overview Dashboard">
          {/* Period toggle + heading */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h2 text-black/85">HR Overview</h2>
              <p className="text-caption text-black/40 mt-0.5">{reportPeriod === 'monthly' ? 'April 2026 — Monthly snapshot' : 'Week of 31 Mar — 4 Apr 2026'}</p>
            </div>
            <div className="flex items-center gap-1 bg-black/[0.03] rounded-lg p-1" role="radiogroup" aria-label="Report period">
              <button
                onClick={() => setReportPeriod('weekly')}
                role="radio"
                aria-checked={reportPeriod === 'weekly'}
                className={`px-4 py-1.5 rounded-md text-caption font-semibold transition-all ${reportPeriod === 'weekly' ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setReportPeriod('monthly')}
                role="radio"
                aria-checked={reportPeriod === 'monthly'}
                className={`px-4 py-1.5 rounded-md text-caption font-semibold transition-all ${reportPeriod === 'monthly' ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'}`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-4 gap-4" role="list" aria-label="Key HR metrics">
            <div role="listitem">
              <StatCard icon={Briefcase} iconBg="bg-blue-50" iconColor="text-[#204CC7]" label="Open Positions" value={totalOpenPositions} accent="text-[#204CC7]" sub="Across 4 departments" trend={{ direction: 'flat', label: '3 actively hiring' }} />
            </div>
            <div role="listitem">
              <StatCard icon={UserPlus} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Total Hired" value={totalHiredAllTime} accent="text-emerald-600" sub="Jun 2025 — Apr 2026" trend={{ direction: 'up', label: '+1 this month', good: true }} />
            </div>
            <div role="listitem">
              <StatCard icon={Users} iconBg="bg-amber-50" iconColor="text-amber-600" label="Onboarding Health" value={`${settledPct}%`} accent="text-amber-600" sub="16 settled · 8 settling" trend={{ direction: 'up', label: '16 of 24 settled', good: true }} />
            </div>
            <div role="listitem">
              <StatCard icon={AlertCircle} iconBg="bg-rose-50" iconColor="text-rose-500" label="Incidents" value={totalIncidents} accent="text-rose-500" sub={`${highPriorityIncidents} high · ${totalIncidents - highPriorityIncidents} low priority`} trend={{ direction: 'down', label: 'Salary issue resolved' }} />
            </div>
          </div>

          {/* Two-column charts */}
          <div className="grid grid-cols-2 gap-5">
            {/* Hiring Funnel */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-6" role="figure" aria-label="Hiring funnel chart for April 2026">
              <h3 className="text-body font-semibold text-black/75 mb-5 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
                Hiring Funnel
                <span className="text-caption text-black/25 font-medium ml-1">April 2026</span>
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hiringFunnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 13, fill: '#888' }} axisLine={{ stroke: '#e5e5e5' }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 13, fill: '#555' }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                    {hiringFunnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hires by Month — Stacked Bar */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-6" role="figure" aria-label="Monthly hire outcomes chart">
              <h3 className="text-body font-semibold text-black/75 mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                Monthly Hire Outcomes
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perfChartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#888' }} axisLine={{ stroke: '#e5e5e5' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Bar dataKey="Active" stackId="a" fill="#00C875" radius={[0, 0, 0, 0]} barSize={26} />
                  <Bar dataKey="Fired" stackId="a" fill="#E2445C" />
                  <Bar dataKey="Resigned" stackId="a" fill="#FDAB3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Onboarding Status Donut */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-6" role="figure" aria-label="Onboarding status breakdown: 16 settled, 8 settling">
              <h3 className="text-body font-semibold text-black/75 mb-5 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" aria-hidden="true" />
                Onboarding Status
              </h3>
              <div className="flex items-center gap-10">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={onboardingPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4} strokeWidth={0}>
                      {onboardingPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#00C875]" aria-hidden="true" />
                      <span className="text-body text-black/60">Settled</span>
                    </div>
                    <span className="text-h3 font-bold text-black/80">16</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#FDAB3D]" aria-hidden="true" />
                      <span className="text-body text-black/60">Settling</span>
                    </div>
                    <span className="text-h3 font-bold text-black/80">8</span>
                  </div>
                  <div className="h-px bg-black/[0.06]" aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <span className="text-body text-black/45 font-medium pl-[22px]">Total</span>
                    <span className="text-h3 font-bold text-black/80">24</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incidents by Month */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-6" role="figure" aria-label="Incidents trend chart by month">
              <h3 className="text-body font-semibold text-black/75 mb-5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-500" aria-hidden="true" />
                Incidents Trend
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={incidentChartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#888' }} axisLine={{ stroke: '#e5e5e5' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#888' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                  <Bar dataKey="high" name="High Priority" fill="#E2445C" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="low" name="Low Priority" fill="#FDAB3D" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ RESOURCE REQUIREMENT ════════════════ */}
      {activeSection === 'resource' && (() => {
        // Group RRs by department
        const deptGroups: Record<string, ResourceRequirement[]> = {};
        resourceRequirements.forEach(rr => {
          if (!deptGroups[rr.department]) deptGroups[rr.department] = [];
          deptGroups[rr.department].push(rr);
        });
        const deptColors: Record<string, { bg: string; text: string; textDark: string; border: string; iconBg: string; icon: React.ElementType }> = {
          'Finance': { bg: 'bg-violet-50/70', text: 'text-violet-600', textDark: 'text-violet-800', border: 'border-violet-200/60', iconBg: 'bg-violet-100', icon: Building2 },
          'Sales': { bg: 'bg-emerald-50/70', text: 'text-emerald-600', textDark: 'text-emerald-800', border: 'border-emerald-200/60', iconBg: 'bg-emerald-100', icon: TrendingUp },
          'SEM': { bg: 'bg-sky-50/70', text: 'text-sky-600', textDark: 'text-sky-800', border: 'border-sky-200/60', iconBg: 'bg-sky-100', icon: Target },
          'Technology': { bg: 'bg-amber-50/70', text: 'text-amber-600', textDark: 'text-amber-800', border: 'border-amber-200/60', iconBg: 'bg-amber-100', icon: Briefcase },
        };

        return (
          <div className="space-y-6" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>
            {/* KPI Strip */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard icon={Briefcase} iconBg="bg-blue-50" iconColor="text-[#204CC7]" label="Total Openings" value={8} sub="Across 4 departments" />
              <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Offers Sent" value={3} sub="Pending joins" />
              <StatCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" label="Interviewing" value={2} sub="In pipeline" />
              <StatCard icon={Target} iconBg="bg-purple-50" iconColor="text-purple-600" label="Active Sourcing" value={3} sub="No shortlist yet" />
            </div>

            {/* Department-grouped cards */}
            <div className="space-y-5">
              {Object.entries(deptGroups).map(([dept, items]) => {
                const dc = deptColors[dept] || deptColors['Technology'];
                const DeptIcon = dc.icon;
                const deptOpenings = items.length;
                const deptOffers = items.filter(r => r.status === 'Offer Sent').length;
                return (
                  <div key={dept} className={`rounded-xl border ${dc.border} bg-white overflow-hidden`}>
                    {/* Department header */}
                    <div className={`flex items-center justify-between px-6 py-4 ${dc.bg} border-b ${dc.border}`}>
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-lg ${dc.iconBg} flex items-center justify-center`} aria-hidden="true">
                          <DeptIcon className={`w-[18px] h-[18px] ${dc.text}`} />
                        </div>
                        <div>
                          <h3 className={`text-h3 font-bold ${dc.textDark}`}>{dept}</h3>
                          <p className="text-caption text-black/40 mt-0.5">
                            {deptOpenings} position{deptOpenings !== 1 ? 's' : ''}
                            {deptOffers > 0 ? ` · ${deptOffers} offer${deptOffers !== 1 ? 's' : ''} sent` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Position rows */}
                    <div className="divide-y divide-black/[0.05]" role="list" aria-label={`${dept} open positions`}>
                      {items.map(rr => {
                        const isOpen = expandedRR === rr.id;
                        return (
                          <div key={rr.id} role="listitem">
                            {/* Row */}
                            <button
                              onClick={() => setExpandedRR(isOpen ? null : rr.id)}
                              aria-expanded={isOpen}
                              aria-controls={`rr-detail-${rr.id}`}
                              className={`w-full text-left px-6 py-5 flex items-center gap-4 transition-colors ${isOpen ? 'bg-black/[0.018]' : 'hover:bg-black/[0.01]'}`}
                            >
                              {/* Left: Position info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-body font-bold text-black/85">{rr.position}</span>
                                  <span className={`text-caption font-semibold px-2 py-0.5 rounded-md ${rr.head === 'Product' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {rr.head}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 mt-1.5">
                                  <span className="text-caption text-black/40">{rr.company}</span>
                                  <span className="text-black/15" aria-hidden="true">·</span>
                                  <span className="text-caption text-black/40">Team: <span className="font-medium text-black/50">{rr.team}</span></span>
                                </div>
                              </div>

                              {/* Right: data columns + status + chevron */}
                              <div className="flex items-center gap-5 flex-shrink-0">
                                <div className="text-center w-[72px] py-1.5 px-2 rounded-lg bg-black/[0.02]">
                                  <p className="text-caption text-black/35 font-medium">Exp</p>
                                  <p className="text-body text-black/65 font-semibold mt-0.5">{rr.experience}</p>
                                </div>
                                <div className="text-center w-[80px] py-1.5 px-2 rounded-lg bg-black/[0.02]">
                                  <p className="text-caption text-black/35 font-medium">Budget</p>
                                  <p className="text-body text-black/75 font-bold mt-0.5">{rr.budget}</p>
                                </div>
                                <div className="w-[100px] flex justify-center">
                                  <StatusBadge status={rr.status} />
                                </div>
                                <ChevronDown className={`w-4 h-4 text-black/25 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                              </div>
                            </button>

                            {/* Expanded comments panel */}
                            {isOpen && (
                              <div id={`rr-detail-${rr.id}`} className="px-6 pb-5 pt-1 bg-black/[0.018] border-t border-black/[0.04]" style={{ animation: 'hrSlideUp 0.12s ease-out' }}>
                                <p className="text-caption font-bold text-black/35 uppercase tracking-wide mb-3">Updates &amp; Pipeline</p>
                                <div className="space-y-2">
                                  {rr.comments.map((c, i) => {
                                    const isOffer = /offered|joined/i.test(c);
                                    const isPending = /pending|scheduled|interviewed|yet to/i.test(c);
                                    const isDone = /done|joined/i.test(c);
                                    return (
                                      <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg text-body leading-relaxed ${
                                        isOffer ? 'bg-emerald-50/60 text-emerald-900/65 border border-emerald-200/40' :
                                        isPending ? 'bg-amber-50/50 text-amber-900/65 border border-amber-200/30' :
                                        'bg-white text-black/55 border border-black/[0.05]'
                                      }`}>
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-[6px] ${
                                          isDone ? 'bg-emerald-500' : isPending ? 'bg-amber-400' : 'bg-black/15'
                                        }`} aria-hidden="true" />
                                        <span className="flex-1">{c}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ════════════════ EFFORTS MIS ════════════════ */}
      {activeSection === 'efforts' && (
        <div className="space-y-5" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>

          {/* Single unified table */}
          <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
            {/* Table toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/[0.05] bg-black/[0.012]">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#204CC7]" />
                <h3 className="text-body font-semibold text-black/75">Recruitment Efforts</h3>
                <span className="text-caption text-black/25 font-medium ml-1">Jan — Apr 2026</span>
              </div>
              {/* Filter chips */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedRecruiter('all')}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                    selectedRecruiter === 'all' ? 'bg-[#204CC7] text-white shadow-sm' : 'bg-black/[0.03] text-black/40 hover:bg-black/[0.06] hover:text-black/55'
                  }`}
                >
                  All Recruiters
                </button>
                {recruiterEfforts.map(r => (
                  <button
                    key={r.name}
                    onClick={() => setSelectedRecruiter(r.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                      selectedRecruiter === r.name ? 'text-white shadow-sm' : 'bg-black/[0.03] text-black/40 hover:bg-black/[0.06] hover:text-black/55'
                    }`}
                    style={selectedRecruiter === r.name ? { backgroundColor: r.color } : undefined}
                  >
                    <span
                      className="w-[18px] h-[18px] rounded flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: selectedRecruiter !== r.name ? r.color : 'rgba(255,255,255,0.3)' }}
                    >
                      {r.initials}
                    </span>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    <th className="px-5 py-2.5 text-caption font-semibold text-black/40 uppercase tracking-wide w-[140px] sticky left-0 bg-white z-[1]">Recruiter</th>
                    <th className="px-4 py-2.5 text-caption font-semibold text-black/40 uppercase tracking-wide w-[170px]">Metric</th>
                    <th className="px-3 py-2.5 text-caption font-semibold text-black/35 uppercase tracking-wide text-right">Jan&apos;26</th>
                    <th className="px-2 py-2.5 text-caption font-semibold text-black/25 uppercase tracking-wide text-right w-[44px]">%</th>
                    <th className="px-3 py-2.5 text-caption font-semibold text-black/35 uppercase tracking-wide text-right">Feb&apos;26</th>
                    <th className="px-2 py-2.5 text-caption font-semibold text-black/25 uppercase tracking-wide text-right w-[44px]">%</th>
                    <th className="px-3 py-2.5 text-caption font-semibold text-black/35 uppercase tracking-wide text-right">Mar&apos;26</th>
                    <th className="px-2 py-2.5 text-caption font-semibold text-black/25 uppercase tracking-wide text-right w-[44px]">%</th>
                    <th className="px-3 py-2.5 text-caption font-semibold uppercase tracking-wide text-right" style={{ color: '#204CC7' }}>Apr&apos;26</th>
                    <th className="px-2 py-2.5 text-caption font-semibold uppercase tracking-wide text-right w-[44px] pr-5" style={{ color: '#204CC7', opacity: 0.6 }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {recruiterEfforts
                    .filter(r => selectedRecruiter === 'all' || selectedRecruiter === r.name)
                    .map((recruiter, rIdx) => (
                      recruiter.rows.map((row, i) => {
                        const isFirstRow = i === 0;
                        const isLastRow = i === recruiter.rows.length - 1;
                        const isHired = row.metric === 'Hired';
                        const isLastRecruiter = rIdx === recruiterEfforts.filter(r => selectedRecruiter === 'all' || selectedRecruiter === r.name).length - 1;
                        return (
                          <tr
                            key={`${recruiter.name}-${i}`}
                            className={`
                              ${isHired ? 'bg-emerald-50/25' : 'hover:bg-black/[0.008]'}
                              ${isLastRow && !isLastRecruiter ? 'border-b-[2px] border-black/[0.08]' : 'border-b border-black/[0.03]'}
                            `}
                          >
                            {/* Recruiter name — only on first row of each group, spans all 6 rows */}
                            {isFirstRow && (
                              <td
                                rowSpan={recruiter.rows.length}
                                className="px-5 py-3 sticky left-0 bg-white z-[1] align-top border-r border-black/[0.04]"
                              >
                                <div className="flex items-center gap-2.5 pt-0.5">
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                                    style={{ backgroundColor: recruiter.color }}
                                  >
                                    {recruiter.initials}
                                  </div>
                                  <span className="text-body text-black/70 font-semibold">{recruiter.name}</span>
                                </div>
                              </td>
                            )}
                            <td className={`px-4 py-2.5 text-body font-medium ${isHired ? 'text-emerald-700' : 'text-black/60'}`}>
                              {row.metric}
                            </td>
                            <td className="px-3 py-2.5 text-body text-black/50 text-right font-medium tabular-nums">{row.jan ?? '—'}</td>
                            <td className="px-2 py-2.5 text-caption text-black/25 text-right tabular-nums">{row.janPct ?? ''}</td>
                            <td className="px-3 py-2.5 text-body text-black/50 text-right font-medium tabular-nums">{row.feb ?? '—'}</td>
                            <td className="px-2 py-2.5 text-caption text-black/25 text-right tabular-nums">{row.febPct ?? ''}</td>
                            <td className="px-3 py-2.5 text-body text-black/50 text-right font-medium tabular-nums">{row.mar ?? '—'}</td>
                            <td className="px-2 py-2.5 text-caption text-black/25 text-right tabular-nums">{row.marPct ?? ''}</td>
                            <td className="px-3 py-2.5 text-body text-right font-bold tabular-nums" style={{ color: '#204CC7' }}>{row.apr ?? '—'}</td>
                            <td className="px-2 py-2.5 text-caption text-right tabular-nums pr-5" style={{ color: '#204CC7', opacity: 0.55 }}>{row.aprPct ?? ''}</td>
                          </tr>
                        );
                      })
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ PERFORMANCE ════════════════ */}
      {activeSection === 'performance' && (
        <div className="space-y-5" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <StatCard icon={UserPlus} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Total Active" value={performanceTotals.poojaActive + performanceTotals.priyankaActive + performanceTotals.ravinaActive} sub="Still employed" />
              <StatCard icon={UserMinus} iconBg="bg-rose-50" iconColor="text-rose-500" label="Total Exits" value={performanceTotals.poojaFired + performanceTotals.ravinaFired + performanceTotals.poojaResigned + performanceTotals.ravinaResigned} sub={`${performanceTotals.poojaFired + performanceTotals.ravinaFired} fired · ${performanceTotals.poojaResigned + performanceTotals.ravinaResigned} resigned`} />
              <StatCard icon={Users} iconBg="bg-blue-50" iconColor="text-[#204CC7]" label="Grand Total" value={performanceTotals.grandTotal} sub="Jun '25 — Apr '26" />
            </div>
            <div className="flex items-center gap-1 bg-black/[0.03] rounded-lg p-0.5">
              <button onClick={() => setPerfView('chart')} className={`px-3 py-1.5 rounded-md text-caption font-semibold transition-all ${perfView === 'chart' ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35'}`}>
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPerfView('table')} className={`px-3 py-1.5 rounded-md text-caption font-semibold transition-all ${perfView === 'table' ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35'}`}>
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {perfView === 'chart' ? (
            <div className="rounded-xl border border-black/[0.06] bg-white p-5">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={perfChartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#999' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Active" stackId="a" fill="#00C875" barSize={28} />
                  <Bar dataKey="Fired" stackId="a" fill="#E2445C" />
                  <Bar dataKey="Resigned" stackId="a" fill="#FDAB3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
              <table className="w-full text-center">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    <th rowSpan={2} className="px-4 py-2.5 text-caption font-semibold text-black/45 uppercase tracking-wide border-r border-black/[0.04] text-left">Month</th>
                    <th colSpan={4} className="px-2 py-1.5 text-caption font-semibold text-purple-600 uppercase tracking-wide border-r border-black/[0.04]">Pooja</th>
                    <th className="px-2 py-1.5 text-caption font-semibold text-amber-600 uppercase tracking-wide border-r border-black/[0.04]">Priyanka</th>
                    <th colSpan={4} className="px-2 py-1.5 text-caption font-semibold text-cyan-600 uppercase tracking-wide border-r border-black/[0.04]">Ravina</th>
                    <th rowSpan={2} className="px-4 py-2.5 text-caption font-bold text-black/60 uppercase tracking-wide">Total</th>
                  </tr>
                  <tr className="border-b border-black/[0.04] text-caption font-semibold text-black/30 uppercase">
                    <th className="px-2 py-1.5">Act</th><th className="px-2 py-1.5">Fir</th><th className="px-2 py-1.5">Res</th><th className="px-2 py-1.5 border-r border-black/[0.04]">Tot</th>
                    <th className="px-2 py-1.5 border-r border-black/[0.04]">Act</th>
                    <th className="px-2 py-1.5">Act</th><th className="px-2 py-1.5">Fir</th><th className="px-2 py-1.5">Res</th><th className="px-2 py-1.5 border-r border-black/[0.04]">Tot</th>
                  </tr>
                </thead>
                <tbody>
                  {performanceData.map((row, i) => (
                    <tr key={i} className="border-b border-black/[0.03] hover:bg-black/[0.008]">
                      <td className="px-4 py-2.5 text-body text-black/65 font-semibold text-left border-r border-black/[0.04]">{row.month}</td>
                      <td className="px-2 py-2.5 text-body text-black/50 tabular-nums">{row.poojaActive || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-rose-500/70 tabular-nums">{row.poojaFired || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-amber-600/70 tabular-nums">{row.poojaResigned || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-black/70 font-semibold tabular-nums border-r border-black/[0.04]">{row.poojaTotal || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-black/50 tabular-nums border-r border-black/[0.04]">{row.priyankaActive || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-black/50 tabular-nums">{row.ravinaActive || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-rose-500/70 tabular-nums">{row.ravinaFired || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-amber-600/70 tabular-nums">{row.ravinaResigned || '—'}</td>
                      <td className="px-2 py-2.5 text-body text-black/70 font-semibold tabular-nums border-r border-black/[0.04]">{row.ravinaTotal || '—'}</td>
                      <td className="px-4 py-2.5 text-body text-[#204CC7] font-bold tabular-nums">{row.grandTotal}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-black/[0.025] font-bold border-t border-black/[0.08]">
                    <td className="px-4 py-3 text-body text-black/75 text-left border-r border-black/[0.04]">Grand Total</td>
                    <td className="px-2 py-3 text-body text-black/60 tabular-nums">{performanceTotals.poojaActive}</td>
                    <td className="px-2 py-3 text-body text-rose-600 tabular-nums">{performanceTotals.poojaFired}</td>
                    <td className="px-2 py-3 text-body text-amber-600 tabular-nums">{performanceTotals.poojaResigned}</td>
                    <td className="px-2 py-3 text-body text-black/80 tabular-nums border-r border-black/[0.04]">{performanceTotals.poojaTotal}</td>
                    <td className="px-2 py-3 text-body text-black/60 tabular-nums border-r border-black/[0.04]">{performanceTotals.priyankaActive}</td>
                    <td className="px-2 py-3 text-body text-black/60 tabular-nums">{performanceTotals.ravinaActive}</td>
                    <td className="px-2 py-3 text-body text-rose-600 tabular-nums">{performanceTotals.ravinaFired}</td>
                    <td className="px-2 py-3 text-body text-amber-600 tabular-nums">{performanceTotals.ravinaResigned}</td>
                    <td className="px-2 py-3 text-body text-black/80 tabular-nums border-r border-black/[0.04]">{performanceTotals.ravinaTotal}</td>
                    <td className="px-4 py-3 text-body text-[#204CC7] tabular-nums">{performanceTotals.grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ ENGAGEMENT ════════════════ */}
      {activeSection === 'engagement' && (
        <div className="space-y-5" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>
          {/* Budget summary */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={PartyPopper} iconBg="bg-purple-50" iconColor="text-purple-600" label="Events Planned" value={4} sub="April — June 2026" />
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Budget Committed" value="₹89,000" sub="₹9K spent · ₹80K upcoming" />
            <StatCard icon={Calendar} iconBg="bg-blue-50" iconColor="text-[#204CC7]" label="Next Event" value="IPL Screening" sub="16th April — GJ Titans vs KKR" />
          </div>

          {/* Event cards — timeline style */}
          <div className="space-y-3">
            {engagementEvents.map(ev => (
              <div key={ev.id} className="rounded-xl border border-black/[0.06] bg-white px-5 py-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      ev.status === 'Completed' ? 'bg-emerald-50' : ev.status === 'Upcoming' ? 'bg-blue-50' : 'bg-amber-50'
                    }`}>
                      {ev.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                       ev.status === 'Upcoming' ? <Calendar className="w-5 h-5 text-[#204CC7]" /> :
                       <Clock className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div>
                      <h4 className="text-body font-semibold text-black/80">{ev.event}</h4>
                      <p className="text-caption text-black/40 mt-0.5">{ev.plan}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-caption text-black/40 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {ev.date}
                        </span>
                        <span className="text-black/10">·</span>
                        <span className="text-caption text-black/40">{ev.month}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={ev.status} />
                    <span className="text-body font-bold text-black/65">
                      {ev.totalCost ? `₹${ev.totalCost.toLocaleString('en-IN')}` : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total budget bar */}
          <div className="rounded-xl bg-black/[0.02] border border-black/[0.05] px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption text-black/45 font-medium">Total Engagement Budget</span>
              <span className="text-body font-bold text-black/70">₹89,000</span>
            </div>
            <div className="w-full h-2 bg-black/[0.05] rounded-full overflow-hidden">
              <div className="h-full bg-[#204CC7] rounded-full transition-all" style={{ width: `${(9000 / 89000) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-caption text-black/30">₹9,000 spent (10%)</span>
              <span className="text-caption text-black/30">₹80,000 remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ ONBOARDING ════════════════ */}
      {activeSection === 'onboarding' && (
        <div className="space-y-5" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Settled" value={16} sub="Performing well" trend={{ direction: 'up', label: '67% of total', good: true }} />
            <StatCard icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" label="Settling — Will Get There" value={8} sub="Under observation" />
            <StatCard icon={Users} iconBg="bg-blue-50" iconColor="text-[#204CC7]" label="Total in Onboarding" value={24} sub="Across all departments" />
          </div>

          {/* Donut + settling employee list side by side */}
          <div className="grid grid-cols-3 gap-5">
            {/* Donut */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-5">
              <h3 className="text-body font-semibold text-black/75 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#204CC7]" />
                Status Breakdown
              </h3>
              <div className="flex flex-col items-center">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={onboardingPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} strokeWidth={0}>
                      {onboardingPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00C875]" />
                    <span className="text-caption text-black/50">Settled (16)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FDAB3D]" />
                    <span className="text-caption text-black/50">Settling (8)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Settling employees detail */}
            <div className="col-span-2 rounded-xl border border-black/[0.06] bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] bg-amber-50/30 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-body font-semibold text-amber-900/70">Settling Employees — Under Observation</span>
                <span className="ml-auto text-caption text-amber-600/60 font-medium">{onboardingEmployees.length} employees</span>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {onboardingEmployees.map((emp, i) => (
                  <div key={i} className="px-5 py-3.5 hover:bg-black/[0.008] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-body text-black/75 font-semibold">{emp.name}</span>
                        <span className="text-caption font-medium text-black/30 px-2 py-0.5 rounded-md bg-black/[0.03]">{emp.department}</span>
                      </div>
                      <StatusBadge status={emp.status} />
                    </div>
                    <p className="text-caption text-black/40 leading-relaxed">{emp.comments}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ INCIDENTS ════════════════ */}
      {activeSection === 'incidents' && (
        <div className="space-y-5" style={{ animation: 'hrSlideUp 0.2s ease-out' }}>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={AlertCircle} iconBg="bg-rose-50" iconColor="text-rose-500" label="Total Incidents" value={14} sub="Feb — Apr 2026" />
            <StatCard icon={Shield} iconBg="bg-rose-50" iconColor="text-rose-600" label="High Priority" value={9} sub="Mostly salary-related" trend={{ direction: 'down', label: 'All resolved', good: true }} />
            <StatCard icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Low Priority" value={5} sub="Under monitoring" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Chart */}
            <div className="rounded-xl border border-black/[0.06] bg-white p-5">
              <h3 className="text-body font-semibold text-black/75 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-500" />
                Incidents by Month
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incidentChartData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#999' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="high" name="High Priority" fill="#E2445C" radius={[4, 4, 0, 0]} barSize={32} />
                  <Bar dataKey="low" name="Low Priority" fill="#FDAB3D" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown table */}
            <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-black/[0.04] bg-black/[0.015]">
                <span className="text-body font-semibold text-black/70">Incident Breakdown</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/[0.04]">
                    <th className="px-5 py-2.5 text-caption font-semibold text-black/40 uppercase tracking-wide">Month</th>
                    <th className="px-4 py-2.5 text-caption font-semibold text-black/40 uppercase tracking-wide">Priority</th>
                    <th className="px-4 py-2.5 text-caption font-semibold text-black/40 uppercase tracking-wide text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentData.map((inc, i) => (
                    <tr key={i} className="border-b border-black/[0.03] hover:bg-black/[0.008]">
                      <td className="px-5 py-3 text-body text-black/65 font-medium">{inc.month}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-caption font-semibold border ${
                          inc.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {inc.priority === 'High' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {inc.priority} Priority
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body text-black/70 font-bold text-right tabular-nums">{inc.count}</td>
                    </tr>
                  ))}
                  <tr className="bg-black/[0.025] font-bold border-t border-black/[0.08]">
                    <td className="px-5 py-3 text-body text-black/70" colSpan={2}>Grand Total</td>
                    <td className="px-4 py-3 text-body text-[#204CC7] font-bold text-right tabular-nums">14</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Resolution note */}
          <div className="rounded-xl bg-blue-50/50 border border-blue-200/40 px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100/70 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-body text-blue-900/70 font-semibold">Resolution Note</p>
              <p className="text-caption text-blue-800/50 mt-1 leading-relaxed">All salary-related incidents have been classified as high priority. The resolution has already been communicated to the respective employees, and the discrepant salary will be disbursed on Friday, 3rd April.</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes hrSlideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
