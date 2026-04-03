'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowRight,
  MessageSquare, Cake,
  FileText, Users, Target, Megaphone,
  AlertCircle, TrendingUp, Shield, Clock,
} from 'lucide-react';

// ═══════════════════════════════════════════════
// ─── DASHBOARD DATA (from Workspace modules) ──
// ═══════════════════════════════════════════════

const todayISO = '2026-03-18';
const greeting = 'Good morning';

// My Assignments (from task-data.ts — user's own tasks grouped by priority)
interface MyTask {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'Pending' | 'In Progress';
  dueDate: string;
  dueDateISO: string;
  group: string;
  groupColor: string;
  project: 'BG' | 'A&T' | 'PM';
  projectColor: string;
}

const myAssignments: MyTask[] = [
  // P1
  { id: 't1', title: 'Prepare and file monthly GST returns for active client accounts', priority: 'P1', status: 'Pending', dueDate: '24 Feb', dueDateISO: '2026-02-24', group: 'TechCorp India', groupColor: '#6366F1', project: 'A&T', projectColor: '#10B981' },
  { id: 't8', title: 'Set up Google Ads campaign for Alpine Group Q2 launch', priority: 'P1', status: 'In Progress', dueDate: '18 Mar', dueDateISO: '2026-03-18', group: 'Alpine Group', groupColor: '#2563EB', project: 'PM', projectColor: '#3B82F6' },
  { id: 't12', title: 'Submit monthly performance report to Alpine Group', priority: 'P1', status: 'Pending', dueDate: '15 Mar', dueDateISO: '2026-03-15', group: 'Alpine Group', groupColor: '#2563EB', project: 'PM', projectColor: '#3B82F6' },
  { id: 't22', title: 'Standardize GST filing templates across all A&T clients', priority: 'P1', status: 'In Progress', dueDate: '23 Mar', dueDateISO: '2026-03-23', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981' },
  { id: 't23', title: 'Conduct internal audit of Q4 tax filings for compliance gaps', priority: 'P1', status: 'Pending', dueDate: '25 Mar', dueDateISO: '2026-03-25', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981' },
  { id: 't26', title: 'Build cross-client performance benchmarking dashboard', priority: 'P1', status: 'In Progress', dueDate: '23 Mar', dueDateISO: '2026-03-23', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'PM', projectColor: '#3B82F6' },
  // P2
  { id: 't2', title: 'Submit Q4 bank reconciliation statements', priority: 'P2', status: 'Pending', dueDate: '25 Feb', dueDateISO: '2026-02-25', group: 'Green Energy Industries', groupColor: '#10B981', project: 'A&T', projectColor: '#10B981' },
  { id: 't4', title: 'Complete compliance audit checklist for RetailMax onboarding', priority: 'P2', status: 'Pending', dueDate: '27 Feb', dueDateISO: '2026-02-27', group: 'RetailMax', groupColor: '#14B8A6', project: 'A&T', projectColor: '#10B981' },
  { id: 't9', title: 'Create Meta Ads creative variants for 99 Pancakes', priority: 'P2', status: 'Pending', dueDate: '19 Mar', dueDateISO: '2026-03-19', group: '99 Pancakes', groupColor: '#F97316', project: 'PM', projectColor: '#3B82F6' },
  { id: 't6', title: 'Generate P&L statement and balance sheet for Q3 board review', priority: 'P2', status: 'Pending', dueDate: '10 Mar', dueDateISO: '2026-03-10', group: 'Fashion Forward Ltd', groupColor: '#F59E0B', project: 'A&T', projectColor: '#10B981' },
  { id: 't25', title: 'Train new team members on TDS computation and filing process', priority: 'P2', status: 'Pending', dueDate: '26 Mar', dueDateISO: '2026-03-26', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981' },
  { id: 't27', title: 'Define and document paid media SOP for new client onboarding', priority: 'P2', status: 'Pending', dueDate: '25 Mar', dueDateISO: '2026-03-25', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'PM', projectColor: '#3B82F6' },
];

// Active Incidents (from IncidentData.tsx — Open/In Progress assigned to user)
interface ActiveIncident {
  id: string;
  type: 'Client' | 'Employee';
  relatedTo: string;             // Client name or employee name
  service: 'PM' | 'A&T' | 'Internal';
  severity: 'Critical' | 'High' | 'Medium';
  category: string;
  status: 'Open' | 'In Progress';
  date: string;
  daysOpen: number;
  description: string;
}

const clientIncidents: ActiveIncident[] = [
  { id: 'INC-001', type: 'Client', relatedTo: 'Zenith Retail Pvt Ltd', service: 'PM', severity: 'Critical', category: 'Service Quality', status: 'Open', date: '28 Mar', daysOpen: 9, description: 'Campaign ROAS dropped below 1.5x for 3 consecutive weeks. Client threatening to leave.' },
  { id: 'INC-004', type: 'Client', relatedTo: 'UrbanNest Realty', service: 'PM', severity: 'Medium', category: 'Communication', status: 'Open', date: '24 Mar', daysOpen: 5, description: 'Client escalation — weekly reports not shared on time' },
  { id: 'INC-008', type: 'Client', relatedTo: 'FreshBite Foods', service: 'PM', severity: 'Critical', category: 'Technical', status: 'In Progress', date: '15 Mar', daysOpen: 14, description: 'Facebook ad account suspended due to policy violation. All campaigns halted.' },
  { id: 'INC-012', type: 'Client', relatedTo: 'SparkEdge Media', service: 'PM', severity: 'Medium', category: 'Payment', status: 'Open', date: '5 Mar', daysOpen: 13, description: 'Invoice dispute — ad spend discrepancy of ₹28,000' },
];

const employeeIncidents: ActiveIncident[] = [
  { id: 'INC-003', type: 'Employee', relatedTo: 'Amit Verma', service: 'Internal', severity: 'High', category: 'HR Issue', status: 'In Progress', date: '25 Mar', daysOpen: 6, description: 'Reported harassment complaint against team lead. Requires HR investigation.' },
  { id: 'INC-011', type: 'Employee', relatedTo: 'Ishaan Joshi', service: 'Internal', severity: 'Medium', category: 'Compliance', status: 'In Progress', date: '8 Mar', daysOpen: 10, description: 'NDA breach suspected — shared client data screenshots on personal social media.' },
];

const allIncidents = [...clientIncidents, ...employeeIncidents];

// Inbox mentions — Client Channels (from Inbox.tsx)
interface InboxMention {
  channel: string;
  unread: number;
  lastSender: string;
  lastSenderInitials: string;
  lastSenderColor: string;
  preview: string;
  time: string;
}

const clientChannelMentions: InboxMention[] = [
  { channel: '#99-pancakes', unread: 5, lastSender: 'Chinmay P.', lastSenderInitials: 'CP', lastSenderColor: '#7C3AED', preview: 'Campaign ROAS is tracking 2.8x — can we push budget by 15%?', time: '9:42 AM' },
  { channel: '#bilawala-co', unread: 2, lastSender: 'Zubear S.', lastSenderInitials: 'ZS', lastSenderColor: '#06B6D4', preview: 'GST filing for March is pending. Need the data by Thursday.', time: '9:20 AM' },
];

const teamChannelMentions: InboxMention[] = [
  { channel: '#sem', unread: 3, lastSender: 'Chinmay P.', lastSenderInitials: 'CP', lastSenderColor: '#7C3AED', preview: 'Q2 ad spend allocation — review the shared sheet before Friday standup', time: '9:35 AM' },
  { channel: '#accounts', unread: 1, lastSender: 'Zubear S.', lastSenderInitials: 'ZS', lastSenderColor: '#06B6D4', preview: 'Updated TDS templates uploaded to Dataroom. Please verify.', time: '8:55 AM' },
];

// PM — Needs Attention (from PerformanceMarketing.tsx clients)
interface PMAttentionItem {
  client: string;
  type: 'onboarding' | 'kickoff' | 'growth-plan';
  stage: string;           // e.g. "Not Started", "Awaiting Proposal", "In Progress"
  detail: string;
  urgency: 'high' | 'medium';
  progress?: number;       // 0-100, for growth plans
  daysPending?: number;
}

const pmAttention: PMAttentionItem[] = [
  // Onboarding
  { client: 'Nor Black Nor White', type: 'onboarding', stage: 'Not Started', detail: 'No team assigned yet', urgency: 'high', daysPending: 12 },
  { client: 'Enagenbio', type: 'onboarding', stage: 'Awaiting Proposal', detail: 'Client waiting on proposal deck', urgency: 'high', daysPending: 8 },
  { client: 'Una Homes LLP', type: 'onboarding', stage: 'Team Assigned', detail: 'Kickoff not scheduled yet', urgency: 'medium', daysPending: 5 },
  // Kickoff
  { client: 'Knickgasm', type: 'kickoff', stage: 'Negotiation', detail: 'Counter-proposal received — needs review', urgency: 'high', daysPending: 6 },
  // Growth Plans
  { client: 'Skin Essentials', type: 'growth-plan', stage: 'Pending', detail: 'Send the weekly plan', urgency: 'high', daysPending: 3 },
  { client: 'Bio Basket', type: 'growth-plan', stage: 'Stalled', detail: 'KSM target missed — needs rework', urgency: 'high', daysPending: 7 },
];

// PM category config for grouped rendering
const pmCategoryConfig: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  onboarding: { label: 'Onboarding', accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' },
  kickoff:    { label: 'Kickoff', accent: '#E2445C', bg: 'bg-rose-50', text: 'text-rose-600' },
  'growth-plan': { label: 'Weekly Plan', accent: '#7C3AED', bg: 'bg-purple-50', text: 'text-purple-600' },
};

// A&T — Needs Attention (from AccountsTaxation.tsx clients)
interface ATAttentionItem {
  client: string;
  type: 'overdue' | 'pending-kickoff';
  taskType: string;        // "Income Tax", "GST", "TDS", etc.
  detail: string;
  urgency: 'high' | 'medium';
  progress?: number;       // 0-100, for overdue items
  daysSinceUpdate?: number;
}

const atAttention: ATAttentionItem[] = [
  // Overdue
  { client: 'Bilawala & Co (Heena)', type: 'overdue', taskType: 'Income Tax', detail: '5 days since last update', urgency: 'high', daysSinceUpdate: 5 },
  { client: 'CEO Rules', type: 'overdue', taskType: 'Compliance', detail: '4 days since last update', urgency: 'high', daysSinceUpdate: 4 },
  { client: 'FRR (BLOGS)', type: 'overdue', taskType: 'TDS', detail: 'No progress in 7 days', urgency: 'high', daysSinceUpdate: 7 },
  { client: 'Green Valley Enterprises', type: 'overdue', taskType: 'Bookkeeping', detail: 'Stalled for 6 days', urgency: 'high', daysSinceUpdate: 6 },
  // Pending Kickoff
  { client: 'Alpine Group', type: 'pending-kickoff', taskType: 'GST', detail: 'Setup not started', urgency: 'medium' },
  { client: 'Coast and Bloom', type: 'pending-kickoff', taskType: 'GST', detail: 'Onboarding in progress', urgency: 'medium' },
  { client: 'Infinity Solutions', type: 'pending-kickoff', taskType: 'Audit', detail: 'Setup not started', urgency: 'medium' },
];

// A&T category config for grouped rendering
const atCategoryConfig: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  overdue:         { label: 'Overdue Tasks', accent: '#E2445C', bg: 'bg-rose-50', text: 'text-rose-600' },
  'pending-kickoff': { label: 'New Client Setup', accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' },
};

// PM Client Performance — Target vs Achieved (from PerformanceMarketing.tsx KickoffMetrics)
// E-Commerce: Ad Spend → ROAS → Revenue → Orders → AOV
// Lead Gen:   Ad Spend → Leads → CPL → CTR

interface PMPerfBase {
  client: string;
  ksmTarget: 'Hit' | 'Miss';
  targetAdSpend: number;
  achievedAdSpend: number;
}

interface PMPerfEcommerce extends PMPerfBase {
  clientType: 'Ecommerce';
  targetROAS: number;
  achievedROAS: number;
  targetRevenue: number;
  achievedRevenue: number;
  targetOrders: number;
  achievedOrders: number;
  targetAOV: number;
  achievedAOV: number;
}

interface PMPerfLeadGen extends PMPerfBase {
  clientType: 'Lead generation';
  targetLeads: number;
  achievedLeads: number;
  targetCPL: number;
  achievedCPL: number;
  targetCTR: number;  // percentage
  achievedCTR: number;
}

type PMClientPerf = PMPerfEcommerce | PMPerfLeadGen;

const pmClientPerformance: PMClientPerf[] = [
  // ── E-Commerce Clients ──
  // KSM Miss
  { client: 'July Issue', clientType: 'Ecommerce', ksmTarget: 'Miss', targetAdSpend: 250000, achievedAdSpend: 245000, targetROAS: 4.0, achievedROAS: 2.8, targetRevenue: 1000000, achievedRevenue: 686000, targetOrders: 450, achievedOrders: 310, targetAOV: 2222, achievedAOV: 2213 },
  { client: 'Bio Basket', clientType: 'Ecommerce', ksmTarget: 'Miss', targetAdSpend: 180000, achievedAdSpend: 175000, targetROAS: 3.5, achievedROAS: 2.4, targetRevenue: 630000, achievedRevenue: 420000, targetOrders: 350, achievedOrders: 230, targetAOV: 1800, achievedAOV: 1826 },
  { client: 'Meeami Fashion', clientType: 'Ecommerce', ksmTarget: 'Miss', targetAdSpend: 200000, achievedAdSpend: 190000, targetROAS: 3.8, achievedROAS: 3.0, targetRevenue: 760000, achievedRevenue: 570000, targetOrders: 380, achievedOrders: 285, targetAOV: 2000, achievedAOV: 2000 },
  { client: 'Valiente Caps', clientType: 'Ecommerce', ksmTarget: 'Miss', targetAdSpend: 120000, achievedAdSpend: 115000, targetROAS: 3.0, achievedROAS: 2.2, targetRevenue: 360000, achievedRevenue: 253000, targetOrders: 200, achievedOrders: 140, targetAOV: 1800, achievedAOV: 1807 },
  // KSM Hit
  { client: 'Elan by Aanchal', clientType: 'Ecommerce', ksmTarget: 'Hit', targetAdSpend: 300000, achievedAdSpend: 295000, targetROAS: 4.5, achievedROAS: 5.2, targetRevenue: 1350000, achievedRevenue: 1534000, targetOrders: 600, achievedOrders: 680, targetAOV: 2250, achievedAOV: 2256 },
  { client: 'True Diamond', clientType: 'Ecommerce', ksmTarget: 'Hit', targetAdSpend: 350000, achievedAdSpend: 340000, targetROAS: 5.0, achievedROAS: 5.8, targetRevenue: 1750000, achievedRevenue: 1972000, targetOrders: 500, achievedOrders: 562, targetAOV: 3500, achievedAOV: 3510 },

  // ── Lead Generation Clients ──
  // KSM Miss
  { client: 'Pytheos Health', clientType: 'Lead generation', ksmTarget: 'Miss', targetAdSpend: 180000, achievedAdSpend: 175000, targetLeads: 420, achievedLeads: 280, targetCPL: 429, achievedCPL: 625, targetCTR: 3.2, achievedCTR: 2.1 },
  { client: 'TREC', clientType: 'Lead generation', ksmTarget: 'Miss', targetAdSpend: 150000, achievedAdSpend: 148000, targetLeads: 350, achievedLeads: 240, targetCPL: 429, achievedCPL: 617, targetCTR: 2.8, achievedCTR: 1.9 },
  // KSM Hit
  { client: 'Mahesh Interior', clientType: 'Lead generation', ksmTarget: 'Hit', targetAdSpend: 220000, achievedAdSpend: 215000, targetLeads: 500, achievedLeads: 580, targetCPL: 440, achievedCPL: 371, targetCTR: 3.5, achievedCTR: 4.2 },
  { client: 'Third Eye Brands', clientType: 'Lead generation', ksmTarget: 'Hit', targetAdSpend: 160000, achievedAdSpend: 158000, targetLeads: 380, achievedLeads: 415, targetCPL: 421, achievedCPL: 381, targetCTR: 3.0, achievedCTR: 3.6 },
];

// Upcoming Birthdays
interface Birthday {
  name: string;
  initials: string;
  color: string;
  role: string;
  date: string;
  daysAway: number;
}

const upcomingBirthdays: Birthday[] = [
  { name: 'Zubear S.', initials: 'ZS', color: '#06B6D4', role: 'A&T HOD', date: '20 Mar', daysAway: 2 },
  { name: 'Harshal R.', initials: 'HR', color: '#10B981', role: 'Operations', date: '24 Mar', daysAway: 6 },
  { name: 'Chinmay P.', initials: 'CP', color: '#7C3AED', role: 'PM HOD', date: '2 Apr', daysAway: 15 },
];

// ═══════════════════════════════════════════════
// ─── HELPERS ─────────────────────────────────
// ═══════════════════════════════════════════════

const daysUntil = (dateISO: string): number => {
  const d = new Date(dateISO).getTime();
  const t = new Date(todayISO).getTime();
  return Math.ceil((d - t) / (1000 * 60 * 60 * 24));
};

const formatLakh = (n: number): string => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

// Keyboard handler for clickable divs (WCAG 2.1.1)
const handleKeyNav = (e: React.KeyboardEvent, action: () => void) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    action();
  }
};

const priorityStyles: Record<string, { dot: string; bg: string; text: string }> = {
  P1: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  P2: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  P3: { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-500' },
};

// ═══════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────
// ═══════════════════════════════════════════════

export function Dashboard() {
  const router = useRouter();
  const [taskFilter, setTaskFilter] = useState<'all' | 'P1' | 'P2'>('all');
  const [incidentTab, setIncidentTab] = useState<'client' | 'employee'>('client');
  const [pmTab, setPmTab] = useState<'onboarding' | 'kickoff' | 'growth-plan'>('onboarding');
  const [atTab, setAtTab] = useState<'overdue' | 'pending-kickoff'>('overdue');
  const [pmPerfTab, setPmPerfTab] = useState<'ecommerce' | 'leadgen'>('ecommerce');

  const filteredAssignments = taskFilter === 'all' ? myAssignments : myAssignments.filter(t => t.priority === taskFilter);

  // Split: Client Tasks vs Brego Group
  const clientTasks = filteredAssignments.filter(t => t.group !== 'Brego Delivery Team');
  const bregoTasks = filteredAssignments.filter(t => t.group === 'Brego Delivery Team');

  // Helper: group, sort groups by urgency, sort tasks within groups
  const buildSortedGroups = (tasks: MyTask[], mode: 'client' | 'brego') => {
    const grouped = tasks.reduce<Record<string, MyTask[]>>((acc, task) => {
      const key = mode === 'client' ? task.group : task.project === 'A&T' ? 'Accounts & Taxation' : 'Performance Marketing';
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
    const sorted = Object.entries(grouped).sort(([, a], [, b]) => {
      const aOverdue = a.some(t => daysUntil(t.dueDateISO) < 0) ? 0 : 1;
      const bOverdue = b.some(t => daysUntil(t.dueDateISO) < 0) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return Math.min(...a.map(t => daysUntil(t.dueDateISO))) - Math.min(...b.map(t => daysUntil(t.dueDateISO)));
    });
    sorted.forEach(([, g]) => g.sort((a, b) => {
      const pOrd = { P1: 0, P2: 1, P3: 2 };
      if (pOrd[a.priority] !== pOrd[b.priority]) return pOrd[a.priority] - pOrd[b.priority];
      return daysUntil(a.dueDateISO) - daysUntil(b.dueDateISO);
    }));
    return sorted;
  };

  const clientSortedGroups = buildSortedGroups(clientTasks, 'client');
  const bregoSortedGroups = buildSortedGroups(bregoTasks, 'brego');

  const p1Count = myAssignments.filter(t => t.priority === 'P1').length;
  const overdueCount = myAssignments.filter(t => daysUntil(t.dueDateISO) < 0).length;
  const clientOverdue = clientTasks.filter(t => daysUntil(t.dueDateISO) < 0).length;
  const bregoOverdue = bregoTasks.filter(t => daysUntil(t.dueDateISO) < 0).length;

  return (
    <main className="h-[calc(100vh-53px)] overflow-y-auto bg-[#FAFBFC]" aria-label="Employee Dashboard">
      <div className="max-w-[1280px] mx-auto px-8 py-7 pb-12">

        {/* ── Greeting ── */}
        <div className="mb-7" style={{ animation: 'dashUp 0.25s ease-out' }}>
          <h1 className="text-h1 text-black/85">{greeting}, Sufyan</h1>
          <p className="text-body text-black/35 mt-1">Wednesday, 18 March 2026</p>
        </div>

        {/* ── Quick Summary Strip ── */}
        <div className="flex items-center gap-3 mb-7" role="status" aria-label="Dashboard summary" style={{ animation: 'dashUp 0.3s ease-out' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-black/[0.06]">
            <div className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-body font-semibold text-black/70">{p1Count} P1 tasks</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-100">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
              <span className="text-body font-semibold text-rose-600">{overdueCount} overdue</span>
            </div>
          )}
          {allIncidents.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span className="text-body font-semibold text-amber-700">{allIncidents.length} open incidents</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <MessageSquare className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
            <span className="text-body font-semibold text-[#204CC7]">{clientChannelMentions.reduce((s, c) => s + c.unread, 0) + teamChannelMentions.reduce((s, c) => s + c.unread, 0)} unread messages</span>
          </div>
        </div>

        {/* ── Row-Based Symmetric Grid ── */}
        <div className="space-y-6">

          {/* ═══ ROW 1: Client Tasks + Brego Group — Two Equal Columns ═══ */}
          <div className="grid grid-cols-2 gap-6" style={{ animation: 'dashUp 0.3s ease-out 0.05s both' }}>

            {/* ── Shared Priority Filter (above both widgets) ── */}
            {/* Rendered inside each widget header for visual cohesion */}

            {/* ── Client Tasks Widget ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" aria-label="Client task assignments">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center" aria-hidden="true">
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Client Tasks</h2>
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500">{clientTasks.length}</span>
                  {clientOverdue > 0 && (
                    <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500">{clientOverdue} overdue</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-black/[0.03] rounded-lg p-0.5" role="radiogroup" aria-label="Filter client tasks by priority">
                    {(['all', 'P1', 'P2'] as const).map(f => (
                      <button
                        key={f}
                        role="radio"
                        aria-checked={taskFilter === f}
                        onClick={() => setTaskFilter(f)}
                        className={`px-2 py-0.5 rounded-md text-caption font-semibold transition-all ${
                          taskFilter === f ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'
                        }`}
                      >
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Client Task List — grouped by client name */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
                {clientSortedGroups.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-body text-black/30">No {taskFilter} client tasks</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {clientSortedGroups.map(([groupName, tasks]) => (
                      <div key={groupName}>
                        <div className="px-5 py-2 bg-black/[0.015] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: tasks[0].groupColor }} aria-hidden="true" />
                            <span className="text-caption font-bold text-black/50">{groupName}</span>
                            <span className="text-caption font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${tasks[0].projectColor}10`, color: tasks[0].projectColor }}>
                              {tasks[0].project}
                            </span>
                          </div>
                          <span className="text-caption text-black/35">{tasks.length}</span>
                        </div>
                        {tasks.map(task => {
                          const days = daysUntil(task.dueDateISO);
                          const overdue = days < 0;
                          const today = days === 0;
                          const urgent = days <= 2 && days >= 0;
                          const ps = priorityStyles[task.priority];
                          return (
                            <div
                              key={task.id}
                              className={`flex items-start gap-2.5 px-5 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                                overdue ? 'border-l-rose-400 bg-rose-50/30' : urgent ? 'border-l-amber-400' : 'border-l-transparent'
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push('/workspace')}
                              onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                              aria-label={`${task.priority} task: ${task.title}. ${task.status}. ${overdue ? `${Math.abs(days)} days overdue` : today ? 'Due today' : `Due ${task.dueDate}`}`}
                            >
                              <span className={`flex-shrink-0 mt-0.5 text-caption font-bold px-1.5 py-0.5 rounded ${ps.bg} ${ps.text}`}>
                                {task.priority}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-body leading-snug ${overdue ? 'text-black/80 font-medium' : 'text-black/65'}`}>{task.title}</p>
                                <span className={`inline-block mt-1 text-caption font-medium px-1.5 py-0.5 rounded ${
                                  task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-black/[0.03] text-black/30'
                                }`}>{task.status === 'In Progress' ? 'Active' : 'Pending'}</span>
                              </div>
                              <span className={`flex-shrink-0 mt-0.5 text-caption font-semibold ${
                                overdue ? 'text-rose-500' : today ? 'text-amber-600' : urgent ? 'text-amber-500' : 'text-black/30'
                              }`}>
                                {overdue ? `${Math.abs(days)}d overdue` : today ? 'Today' : urgent ? `${days}d left` : task.dueDate}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/workspace')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  View all client tasks <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* ── Brego Group Widget ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" aria-label="Brego internal task assignments">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-hidden="true">
                    <Shield className="w-3.5 h-3.5 text-[#204CC7]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Brego Group</h2>
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#204CC7]">{bregoTasks.length}</span>
                  {bregoOverdue > 0 && (
                    <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500">{bregoOverdue} overdue</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 bg-black/[0.03] rounded-lg p-0.5" role="radiogroup" aria-label="Filter internal tasks by priority">
                    {(['all', 'P1', 'P2'] as const).map(f => (
                      <button
                        key={f}
                        role="radio"
                        aria-checked={taskFilter === f}
                        onClick={() => setTaskFilter(f)}
                        className={`px-2 py-0.5 rounded-md text-caption font-semibold transition-all ${
                          taskFilter === f ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'
                        }`}
                      >
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brego Task List — grouped by department (A&T / PM) */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: '340px' }}>
                {bregoSortedGroups.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-body text-black/30">No {taskFilter} internal tasks</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {bregoSortedGroups.map(([groupName, tasks]) => {
                      const deptColor = groupName === 'Accounts & Taxation' ? '#06B6D4' : '#7C3AED';
                      const deptLabel = groupName === 'Accounts & Taxation' ? 'A&T' : 'PM';
                      return (
                        <div key={groupName}>
                          <div className="px-5 py-2 bg-black/[0.015] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: deptColor }} aria-hidden="true" />
                              <span className="text-caption font-bold text-black/50">{groupName}</span>
                              <span className="text-caption font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${deptColor}10`, color: deptColor }}>
                                {deptLabel}
                              </span>
                            </div>
                            <span className="text-caption text-black/35">{tasks.length}</span>
                          </div>
                          {tasks.map(task => {
                            const days = daysUntil(task.dueDateISO);
                            const overdue = days < 0;
                            const today = days === 0;
                            const urgent = days <= 2 && days >= 0;
                            const ps = priorityStyles[task.priority];
                            return (
                              <div
                                key={task.id}
                                className={`flex items-start gap-2.5 px-5 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                                  overdue ? 'border-l-rose-400 bg-rose-50/30' : urgent ? 'border-l-amber-400' : 'border-l-transparent'
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push('/workspace')}
                                onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                                aria-label={`${task.priority} task: ${task.title}. ${task.status}. ${overdue ? `${Math.abs(days)} days overdue` : today ? 'Due today' : `Due ${task.dueDate}`}`}
                              >
                                <span className={`flex-shrink-0 mt-0.5 text-caption font-bold px-1.5 py-0.5 rounded ${ps.bg} ${ps.text}`}>
                                  {task.priority}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-body leading-snug ${overdue ? 'text-black/80 font-medium' : 'text-black/65'}`}>{task.title}</p>
                                  <span className={`inline-block mt-1 text-caption font-medium px-1.5 py-0.5 rounded ${
                                    task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-black/[0.03] text-black/30'
                                  }`}>{task.status === 'In Progress' ? 'Active' : 'Pending'}</span>
                                </div>
                                <span className={`flex-shrink-0 mt-0.5 text-caption font-semibold ${
                                  overdue ? 'text-rose-500' : today ? 'text-amber-600' : urgent ? 'text-amber-500' : 'text-black/30'
                                }`}>
                                  {overdue ? `${Math.abs(days)}d overdue` : today ? 'Today' : urgent ? `${days}d left` : task.dueDate}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/workspace')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  View all internal tasks <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>
          </div>

          {/* ═══ ROW 2: Incidents + PM + A&T — Three Equal Columns ═══ */}
          <div className="grid grid-cols-3 gap-6">

            {/* ── Incidents ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.35s ease-out 0.1s both' }} aria-label="Active incidents">
              {/* Header — consistent with PM & A&T */}
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center" aria-hidden="true">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Incidents</h2>
                </div>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500">{allIncidents.length}</span>
              </div>

              {/* Client / Employee Tabs */}
              <div className="px-5 py-0 border-b border-black/[0.04] flex items-center gap-0" role="tablist" aria-label="Incident type">
                {([
                  { key: 'client' as const, label: 'Client', count: clientIncidents.length, icon: AlertCircle, hasCritical: clientIncidents.some(i => i.severity === 'Critical') },
                  { key: 'employee' as const, label: 'Personal', count: employeeIncidents.length, icon: Shield, hasCritical: employeeIncidents.some(i => i.severity === 'Critical' || i.severity === 'High') },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={incidentTab === tab.key}
                    onClick={() => setIncidentTab(tab.key)}
                    className={`relative px-3.5 py-2.5 text-caption font-semibold transition-colors flex items-center gap-1.5 ${
                      incidentTab === tab.key ? 'text-rose-600' : 'text-black/45 hover:text-black/60'
                    }`}
                  >
                    <tab.icon className="w-3 h-3" />
                    {tab.label}
                    <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                      incidentTab === tab.key ? 'bg-rose-50 text-rose-500' : 'bg-black/[0.04] text-black/50'
                    }`}>{tab.count}</span>
                    {tab.hasCritical && incidentTab !== tab.key && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-label="Has critical incidents" />
                    )}
                    {incidentTab === tab.key && (
                      <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-rose-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Incident List — scrollable, consistent py-3, border-l-[3px] */}
              <div className="overflow-y-auto divide-y divide-black/[0.03]" role="tabpanel" style={{ maxHeight: '340px' }}>
                {(incidentTab === 'client' ? clientIncidents : employeeIncidents).map(inc => {
                  const isCritical = inc.severity === 'Critical';
                  const isHigh = inc.severity === 'High';
                  return (
                    <div
                      key={inc.id}
                      className={`px-5 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                        isCritical ? 'border-l-rose-400 bg-rose-50/20' : isHigh ? 'border-l-amber-400' : 'border-l-transparent'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push('/adminland/incidents')}
                      onKeyDown={(e) => handleKeyNav(e, () => router.push('/adminland/incidents'))}
                      aria-label={`${inc.severity} incident: ${inc.relatedTo}. ${inc.description}. ${inc.daysOpen} days open`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-body font-medium text-black/75 truncate">{inc.relatedTo}</span>
                        <span className={`text-caption font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                          isCritical ? 'bg-rose-50 text-rose-600' : isHigh ? 'bg-amber-50 text-amber-700' : 'bg-black/[0.04] text-black/55'
                        }`}>{inc.severity}</span>
                      </div>
                      <p className="text-caption text-black/55 leading-relaxed line-clamp-2">{inc.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-caption font-medium text-black/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" aria-hidden="true" />{inc.daysOpen}d open
                        </span>
                        <span className="text-caption text-black/30">·</span>
                        <span className={`text-caption font-medium px-1.5 py-0.5 rounded ${
                          inc.service === 'PM' ? 'bg-purple-50 text-[#7C3AED]' : inc.service === 'A&T' ? 'bg-cyan-50 text-[#06B6D4]' : 'bg-slate-50 text-black/55'
                        }`}>{inc.service === 'Internal' ? 'HR / Internal' : inc.service}</span>
                        <span className="text-caption text-black/30">·</span>
                        <span className="text-caption text-black/50">{inc.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer CTA — matches PM & A&T */}
              <div className="mt-auto px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/adminland/incidents')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  View all incidents <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* ── Performance Marketing (tabbed) ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.35s ease-out 0.15s both' }} aria-label="Performance Marketing attention items">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center" aria-hidden="true">
                    <Megaphone className="w-3.5 h-3.5 text-[#7C3AED]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Performance Marketing</h2>
                </div>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7C3AED]">{pmAttention.length}</span>
              </div>

              {/* Onboarding / Kickoff / Weekly Plan Tabs */}
              <div className="px-5 py-0 border-b border-black/[0.04] flex items-center gap-0" role="tablist" aria-label="PM category">
                {([
                  { key: 'onboarding' as const, label: 'Onboarding' },
                  { key: 'kickoff' as const, label: 'Kickoff' },
                  { key: 'growth-plan' as const, label: 'Weekly Plan' },
                ]).map(tab => {
                  const count = pmAttention.filter(i => i.type === tab.key).length;
                  const cat = pmCategoryConfig[tab.key];
                  return (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={pmTab === tab.key}
                      onClick={() => setPmTab(tab.key)}
                      className={`relative px-3.5 py-2.5 text-caption font-semibold transition-colors flex items-center gap-1.5 ${
                        pmTab === tab.key ? 'text-[#7C3AED]' : 'text-black/45 hover:text-black/60'
                      }`}
                    >
                      {tab.label}
                      <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                        pmTab === tab.key ? 'bg-purple-50 text-[#7C3AED]' : 'bg-black/[0.04] text-black/50'
                      }`}>{count}</span>
                      {pmTab === tab.key && (
                        <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#7C3AED] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto divide-y divide-black/[0.03]" role="tabpanel" style={{ maxHeight: '340px' }}>
                {(() => {
                  const items = pmAttention.filter(i => i.type === pmTab);
                  const cat = pmCategoryConfig[pmTab];
                  if (items.length === 0) return (
                    <div className="px-5 py-8 text-center text-caption text-black/40">No items</div>
                  );
                  return items.map((item, i) => (
                    <div
                      key={i}
                      className={`px-5 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                        item.urgency === 'high' ? 'border-l-rose-400' : 'border-l-transparent'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push('/workspace')}
                      onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                      aria-label={`${item.urgency} urgency: ${item.client}. ${item.stage}. ${item.detail}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-body font-medium text-black/75 truncate">{item.client}</span>
                        <span className={`text-caption font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${cat.bg} ${cat.text}`}>{item.stage}</span>
                      </div>
                      <p className="text-caption text-black/55 leading-relaxed">{item.detail}</p>
                      {item.daysPending && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-black/45" aria-hidden="true" />
                          <span className="text-caption font-medium text-black/50">{item.daysPending}d pending</span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-auto px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/workspace')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  Performance Marketing Workspace <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* ── Accounts & Taxation (tabbed) ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.35s ease-out 0.18s both' }} aria-label="Accounts and Taxation attention items">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center" aria-hidden="true">
                    <FileText className="w-3.5 h-3.5 text-[#06B6D4]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Accounts & Taxation</h2>
                </div>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-cyan-50 text-[#06B6D4]">{atAttention.length}</span>
              </div>

              {/* Overdue / New Client Setup Tabs */}
              <div className="px-5 py-0 border-b border-black/[0.04] flex items-center gap-0" role="tablist" aria-label="A&T category">
                {([
                  { key: 'overdue' as const, label: 'Overdue Tasks' },
                  { key: 'pending-kickoff' as const, label: 'New Client Setup' },
                ]).map(tab => {
                  const count = atAttention.filter(i => i.type === tab.key).length;
                  return (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={atTab === tab.key}
                      onClick={() => setAtTab(tab.key)}
                      className={`relative px-3.5 py-2.5 text-caption font-semibold transition-colors flex items-center gap-1.5 ${
                        atTab === tab.key ? 'text-[#06B6D4]' : 'text-black/45 hover:text-black/60'
                      }`}
                    >
                      {tab.label}
                      <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                        atTab === tab.key ? 'bg-cyan-50 text-[#06B6D4]' : 'bg-black/[0.04] text-black/50'
                      }`}>{count}</span>
                      {atTab === tab.key && (
                        <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#06B6D4] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto divide-y divide-black/[0.03]" role="tabpanel" style={{ maxHeight: '340px' }}>
                {(() => {
                  const items = atAttention.filter(i => i.type === atTab);
                  if (items.length === 0) return (
                    <div className="px-5 py-8 text-center text-caption text-black/40">No items</div>
                  );
                  return items.map((item, i) => (
                    <div
                      key={i}
                      className={`px-5 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                        item.urgency === 'high' ? 'border-l-rose-400' : 'border-l-transparent'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push('/workspace')}
                      onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                      aria-label={`${item.urgency} urgency: ${item.client}. ${item.taskType}. ${item.detail}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-body font-medium text-black/75 truncate">{item.client}</span>
                        <span className="text-caption font-semibold px-1.5 py-0.5 rounded bg-cyan-50 text-[#06B6D4] flex-shrink-0 ml-2">{item.taskType}</span>
                      </div>
                      <p className="text-caption text-black/55 leading-relaxed">{item.detail}</p>
                      {item.daysSinceUpdate && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-black/45" aria-hidden="true" />
                          <span className="text-caption font-medium text-black/50">{item.daysSinceUpdate}d stalled</span>
                        </div>
                      )}
                      {!item.daysSinceUpdate && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-3 h-3 text-amber-400" aria-hidden="true" />
                          <span className="text-caption font-medium text-amber-500">Awaiting setup</span>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-auto px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/workspace')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  Accounts & Taxation Workspace <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>
          </div>

          {/* ═══ ROW 3: Client Channels + Team Channels — Two Equal Columns ═══ */}
          <div className="grid grid-cols-2 gap-6">

            {/* Client Channel Mentions */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden" style={{ animation: 'dashUp 0.4s ease-out 0.2s both' }} aria-label="Client channel mentions">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center" aria-hidden="true">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Client Channels</h2>
                </div>
                <button onClick={() => router.push('/inbox')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] transition-colors">
                  Open Inbox
                </button>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {clientChannelMentions.map((ch, i) => (
                  <div key={i} className="px-5 py-3.5 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer" role="button" tabIndex={0} onClick={() => router.push('/inbox')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/inbox'))} aria-label={`${ch.channel}, ${ch.unread} unread messages. Last from ${ch.lastSender}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-semibold text-black/70">{ch.channel}</span>
                        {ch.unread > 0 && (
                          <span className="text-caption font-bold text-white bg-[#204CC7] px-1.5 py-0.5 rounded-md min-w-[20px] text-center" aria-label={`${ch.unread} unread`}>{ch.unread}</span>
                        )}
                      </div>
                      <span className="text-caption text-black/40">{ch.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ch.lastSenderColor }}>{ch.lastSenderInitials}</span>
                      <p className="text-caption text-black/40 truncate">{ch.lastSender}: {ch.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Team Channel Mentions */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden" style={{ animation: 'dashUp 0.4s ease-out 0.22s both' }} aria-label="Team channel mentions">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-hidden="true">
                    <Users className="w-3.5 h-3.5 text-[#204CC7]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Team Channels</h2>
                </div>
                <button onClick={() => router.push('/inbox')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] transition-colors">
                  Open Inbox
                </button>
              </div>
              <div className="divide-y divide-black/[0.03]">
                {teamChannelMentions.map((ch, i) => (
                  <div key={i} className="px-5 py-3.5 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer" role="button" tabIndex={0} onClick={() => router.push('/inbox')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/inbox'))} aria-label={`${ch.channel}, ${ch.unread} unread messages. Last from ${ch.lastSender}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-semibold text-black/70">{ch.channel}</span>
                        {ch.unread > 0 && (
                          <span className="text-caption font-bold text-white bg-[#204CC7] px-1.5 py-0.5 rounded-md min-w-[20px] text-center" aria-label={`${ch.unread} unread`}>{ch.unread}</span>
                        )}
                      </div>
                      <span className="text-caption text-black/40">{ch.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ch.lastSenderColor }}>{ch.lastSenderInitials}</span>
                      <p className="text-caption text-black/40 truncate">{ch.lastSender}: {ch.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ═══ ROW 4: PM Client Performance — Full Width ═══ */}
          {(() => {
            const ecomClients = pmClientPerformance.filter((c): c is PMPerfEcommerce => c.clientType === 'Ecommerce');
            const leadGenClients = pmClientPerformance.filter((c): c is PMPerfLeadGen => c.clientType === 'Lead generation');

            return (
              <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden" style={{ animation: 'dashUp 0.45s ease-out 0.24s both' }} aria-label="PM client performance — target vs achieved">
                <div className="px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center" aria-hidden="true">
                      <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <h2 className="text-body font-bold text-black/80">PM Client Performance</h2>
                    <span className="text-caption text-black/40 font-medium">Target vs Achieved</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true" />
                      <span className="text-caption text-black/35">KSM Miss</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
                      <span className="text-caption text-black/35">KSM Hit</span>
                    </div>
                    <button onClick={() => router.push('/adminland/reports')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                      Full Report <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── Tabs: E-Commerce / Lead Generation ── */}
                <div className="px-6 py-0 border-b border-black/[0.04] flex items-center gap-0" role="tablist" aria-label="Client type">
                  {([
                    { key: 'ecommerce' as const, label: 'E-Commerce', count: ecomClients.length, color: '#7C3AED' },
                    { key: 'leadgen' as const, label: 'Lead Generation', count: leadGenClients.length, color: '#06B6D4' },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={pmPerfTab === tab.key}
                      onClick={() => setPmPerfTab(tab.key)}
                      className={`relative px-4 py-2.5 text-caption font-semibold transition-colors flex items-center gap-1.5 ${
                        pmPerfTab === tab.key ? 'text-black/75' : 'text-black/45 hover:text-black/60'
                      }`}
                    >
                      {tab.label}
                      <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                        pmPerfTab === tab.key ? 'bg-black/[0.04] text-black/55' : 'bg-black/[0.04] text-black/45'
                      }`}>{tab.count}</span>
                      {pmPerfTab === tab.key && (
                        <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full" style={{ backgroundColor: tab.color }} />
                      )}
                    </button>
                  ))}
                </div>

                {/* ── E-Commerce Table ── */}
                {pmPerfTab === 'ecommerce' && (
                  <>
                    <div className="grid grid-cols-12 px-6 py-2 bg-black/[0.015] text-caption font-semibold text-black/45 border-b border-black/[0.04]" role="row" aria-label="E-Commerce table header">
                      <div className="col-span-3" role="columnheader">Client</div>
                      <div className="col-span-2 text-right" role="columnheader">Ad Spend</div>
                      <div className="col-span-2 text-center" role="columnheader">ROAS</div>
                      <div className="col-span-2 text-right">Revenue</div>
                      <div className="col-span-1 text-center">Orders</div>
                      <div className="col-span-2 text-center">KSM</div>
                    </div>
                    <div className="divide-y divide-black/[0.03]">
                      {ecomClients.map((c, i) => {
                        const isHit = c.ksmTarget === 'Hit';
                        const revPct = Math.round((c.achievedRevenue / c.targetRevenue) * 100);
                        return (
                          <div key={i} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer" role="button" tabIndex={0} onClick={() => router.push('/workspace')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))} aria-label={`${c.client}: ROAS ${c.achievedROAS}x of ${c.targetROAS}x target. Revenue ${formatLakh(c.achievedRevenue)} of ${formatLakh(c.targetRevenue)}. KSM ${isHit ? 'Hit' : 'Miss'}`}>
                            <div className="col-span-3 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isHit ? 'bg-emerald-400' : 'bg-rose-400'}`} aria-hidden="true" />
                              <span className="text-body font-medium text-black/70 truncate">{c.client}</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-body text-black/60">{formatLakh(c.achievedAdSpend)}</span>
                              <span className="text-caption text-black/35 ml-1">/ {formatLakh(c.targetAdSpend)}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`text-body font-semibold ${isHit ? 'text-emerald-600' : 'text-rose-500'}`}>{c.achievedROAS}x</span>
                              <span className="text-caption text-black/35 ml-1">/ {c.targetROAS}x</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-body text-black/60">{formatLakh(c.achievedRevenue)}</span>
                              <span className="text-caption text-black/35 ml-1">/ {formatLakh(c.targetRevenue)}</span>
                            </div>
                            <div className="col-span-1 text-center">
                              <span className="text-body text-black/55">{c.achievedOrders}</span>
                              <span className="text-caption text-black/35">/{c.targetOrders}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`text-caption font-semibold px-2.5 py-1 rounded-md ${
                                isHit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                              }`}>
                                {isHit ? `${revPct}% ↑` : `${revPct}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── Lead Generation Table ── */}
                {pmPerfTab === 'leadgen' && (
                  <>
                    <div className="grid grid-cols-12 px-6 py-2 bg-black/[0.015] text-caption font-semibold text-black/45 border-b border-black/[0.04]" role="row" aria-label="Lead Generation table header">
                      <div className="col-span-3" role="columnheader">Client</div>
                      <div className="col-span-2 text-right" role="columnheader">Ad Spend</div>
                      <div className="col-span-2 text-center" role="columnheader">Leads</div>
                      <div className="col-span-2 text-right" role="columnheader">CPL (₹)</div>
                      <div className="col-span-1 text-center" role="columnheader">CTR</div>
                      <div className="col-span-2 text-center">KSM</div>
                    </div>
                    <div className="divide-y divide-black/[0.03]">
                      {leadGenClients.map((c, i) => {
                        const isHit = c.ksmTarget === 'Hit';
                        const leadsPct = Math.round((c.achievedLeads / c.targetLeads) * 100);
                        const cplBetter = c.achievedCPL <= c.targetCPL;
                        return (
                          <div key={i} className="grid grid-cols-12 items-center px-6 py-3 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer" role="button" tabIndex={0} onClick={() => router.push('/workspace')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))} aria-label={`${c.client}: ${c.achievedLeads} of ${c.targetLeads} leads. CPL ₹${c.achievedCPL} vs ₹${c.targetCPL} target. KSM ${isHit ? 'Hit' : 'Miss'}`}>
                            <div className="col-span-3 flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isHit ? 'bg-emerald-400' : 'bg-rose-400'}`} aria-hidden="true" />
                              <span className="text-body font-medium text-black/70 truncate">{c.client}</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className="text-body text-black/60">{formatLakh(c.achievedAdSpend)}</span>
                              <span className="text-caption text-black/35 ml-1">/ {formatLakh(c.targetAdSpend)}</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`text-body font-semibold ${isHit ? 'text-emerald-600' : 'text-rose-500'}`}>{c.achievedLeads}</span>
                              <span className="text-caption text-black/35 ml-1">/ {c.targetLeads}</span>
                            </div>
                            <div className="col-span-2 text-right">
                              <span className={`text-body font-semibold ${cplBetter ? 'text-emerald-600' : 'text-rose-500'}`}>₹{c.achievedCPL}</span>
                              <span className="text-caption text-black/35 ml-1">/ ₹{c.targetCPL}</span>
                            </div>
                            <div className="col-span-1 text-center">
                              <span className={`text-body font-semibold ${c.achievedCTR >= c.targetCTR ? 'text-emerald-600' : 'text-rose-500'}`}>{c.achievedCTR}%</span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`text-caption font-semibold px-2.5 py-1 rounded-md ${
                                isHit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                              }`}>
                                {isHit ? `${leadsPct}% ↑` : `${leadsPct}%`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            );
          })()}

          {/* ═══ ROW 5: Upcoming Birthdays — Full Width Compact ═══ */}
          <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden" style={{ animation: 'dashUp 0.5s ease-out 0.28s both' }} aria-label="Upcoming birthdays">
            <div className="px-6 py-3.5 border-b border-black/[0.04] flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center" aria-hidden="true">
                <Cake className="w-3.5 h-3.5 text-pink-500" />
              </div>
              <h2 className="text-body font-bold text-black/80">Upcoming Birthdays</h2>
            </div>
            <div className="flex divide-x divide-black/[0.04]">
              {upcomingBirthdays.map((bd, i) => (
                <div key={i} className="flex-1 px-6 py-3.5 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: bd.color }}
                  >
                    {bd.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-black/70">{bd.name}</p>
                    <p className="text-caption text-black/30">{bd.role}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-body font-semibold text-black/60">{bd.date}</p>
                    <p className={`text-caption font-medium ${bd.daysAway <= 3 ? 'text-pink-500' : 'text-black/40'}`}>
                      {bd.daysAway === 0 ? 'Today!' : bd.daysAway === 1 ? 'Tomorrow' : `in ${bd.daysAway} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes dashUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
