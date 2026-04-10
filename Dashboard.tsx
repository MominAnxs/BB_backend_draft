'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowRight,
  MessageSquare, Cake,
  FileText, Users, Target, Megaphone,
  AlertCircle, TrendingUp, Shield, Clock, Circle,
  ChevronDown, Check, Eye,
  Star, Repeat, Award, UserMinus, BarChart3, DollarSign, Sparkles,
  UserPlus, CalendarDays, Briefcase, GraduationCap, UserCheck, UserX, PartyPopper, CheckCircle2,
  Activity, Zap, Hash,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

// ═══════════════════════════════════════════════
// ─── SERVICE DISPLAY LABELS ──────────────────
// ═══════════════════════════════════════════════

const SERVICE_LABEL: Record<string, string> = { PM: 'SEM', 'A&T': 'A&T', Internal: 'Internal' };
const svcLabel = (s: string) => SERVICE_LABEL[s] ?? s;

// ═══════════════════════════════════════════════
// ─── ROLE PREVIEW TOGGLE ──────────────────────
// ═══════════════════════════════════════════════

type DashboardRole = 'hod' | 'manager' | 'executive' | 'hr';

const ROLE_OPTIONS: { value: DashboardRole; label: string }[] = [
  { value: 'hod', label: 'HOD' },
  { value: 'manager', label: 'Manager' },
  { value: 'executive', label: 'Executive' },
  { value: 'hr', label: 'HR' },
];

// ═══════════════════════════════════════════════
// ─── DASHBOARD DATA (from Workspace modules) ──
// ═══════════════════════════════════════════════

const todayISO = '2026-04-04';
const greeting = 'Good morning';

// My Assignments (from task-data.ts — user's own tasks grouped by priority)
interface MyTask {
  id: string;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  status: 'Pending' | 'Done';
  dueDate: string;
  dueDateISO: string;
  group: string;
  groupColor: string;
  project: 'BG' | 'A&T' | 'PM';
  projectColor: string;
  assignee: { initials: string; color: string };
}

const myAssignments: MyTask[] = [
  // ── Client Tasks (various clients) ──
  // Alpine Group — PM
  { id: 't8', title: 'Set up Google Ads campaign for Alpine Group Q2 launch', priority: 'P1', status: 'Done', dueDate: '18 Mar', dueDateISO: '2026-03-18', group: 'Alpine Group', groupColor: '#2563EB', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'CP', color: '#7C3AED' } },
  { id: 't12', title: 'Submit monthly performance report to Alpine Group', priority: 'P1', status: 'Pending', dueDate: '01 Apr', dueDateISO: '2026-04-01', group: 'Alpine Group', groupColor: '#2563EB', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'CP', color: '#7C3AED' } },
  { id: 't30', title: 'Review and optimize Alpine Group landing page conversion funnel', priority: 'P2', status: 'Pending', dueDate: '08 Apr', dueDateISO: '2026-04-08', group: 'Alpine Group', groupColor: '#2563EB', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'HR', color: '#10B981' } },
  // TechCorp India — A&T
  { id: 't1', title: 'Prepare and file monthly GST returns for active client accounts', priority: 'P1', status: 'Done', dueDate: '24 Mar', dueDateISO: '2026-03-24', group: 'TechCorp India', groupColor: '#6366F1', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  { id: 't31', title: 'Reconcile TDS credit ledger with Form 26AS for Q4', priority: 'P1', status: 'Pending', dueDate: '03 Apr', dueDateISO: '2026-04-03', group: 'TechCorp India', groupColor: '#6366F1', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  // 99 Pancakes — PM
  { id: 't9', title: 'Create Meta Ads creative variants for 99 Pancakes', priority: 'P1', status: 'Pending', dueDate: '02 Apr', dueDateISO: '2026-04-02', group: '99 Pancakes', groupColor: '#F97316', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'CP', color: '#7C3AED' } },
  { id: 't32', title: 'Prepare April media plan and budget allocation', priority: 'P2', status: 'Pending', dueDate: '07 Apr', dueDateISO: '2026-04-07', group: '99 Pancakes', groupColor: '#F97316', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'HR', color: '#10B981' } },
  // Green Energy Industries — A&T
  { id: 't2', title: 'Submit Q4 bank reconciliation statements', priority: 'P1', status: 'Pending', dueDate: '31 Mar', dueDateISO: '2026-03-31', group: 'Green Energy Industries', groupColor: '#10B981', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  { id: 't33', title: 'Prepare advance tax computation for FY 2025-26', priority: 'P2', status: 'Pending', dueDate: '10 Apr', dueDateISO: '2026-04-10', group: 'Green Energy Industries', groupColor: '#10B981', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ML', color: '#F59E0B' } },
  // RetailMax — A&T
  { id: 't4', title: 'Complete compliance audit checklist for RetailMax onboarding', priority: 'P2', status: 'Done', dueDate: '27 Mar', dueDateISO: '2026-03-27', group: 'RetailMax', groupColor: '#14B8A6', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ML', color: '#F59E0B' } },
  { id: 't34', title: 'Set up accounting ledger and chart of accounts', priority: 'P1', status: 'Pending', dueDate: '05 Apr', dueDateISO: '2026-04-05', group: 'RetailMax', groupColor: '#14B8A6', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  // Fashion Forward Ltd — A&T
  { id: 't6', title: 'Generate P&L statement and balance sheet for Q3 board review', priority: 'P2', status: 'Done', dueDate: '10 Mar', dueDateISO: '2026-03-10', group: 'Fashion Forward Ltd', groupColor: '#F59E0B', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ML', color: '#F59E0B' } },
  // UrbanNest Realty — PM
  { id: 't35', title: 'Launch Google Performance Max campaign for UrbanNest Q2', priority: 'P1', status: 'Pending', dueDate: '06 Apr', dueDateISO: '2026-04-06', group: 'UrbanNest Realty', groupColor: '#8B5CF6', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'CP', color: '#7C3AED' } },
  { id: 't36', title: 'Audit existing ad account structure and negative keywords', priority: 'P2', status: 'Pending', dueDate: '09 Apr', dueDateISO: '2026-04-09', group: 'UrbanNest Realty', groupColor: '#8B5CF6', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'HR', color: '#10B981' } },
  // ── Brego Internal Tasks ──
  { id: 't22', title: 'Standardize GST filing templates across all A&T clients', priority: 'P1', status: 'Done', dueDate: '23 Mar', dueDateISO: '2026-03-23', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  { id: 't23', title: 'Conduct internal audit of Q4 tax filings for compliance gaps', priority: 'P1', status: 'Pending', dueDate: '02 Apr', dueDateISO: '2026-04-02', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ZS', color: '#06B6D4' } },
  { id: 't26', title: 'Build cross-client performance benchmarking dashboard', priority: 'P1', status: 'Pending', dueDate: '04 Apr', dueDateISO: '2026-04-04', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'CP', color: '#7C3AED' } },
  { id: 't25', title: 'Train new team members on TDS computation and filing process', priority: 'P2', status: 'Pending', dueDate: '07 Apr', dueDateISO: '2026-04-07', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'ML', color: '#F59E0B' } },
  { id: 't27', title: 'Define and document paid media SOP for new client onboarding', priority: 'P2', status: 'Pending', dueDate: '08 Apr', dueDateISO: '2026-04-08', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'PM', projectColor: '#3B82F6', assignee: { initials: 'HR', color: '#10B981' } },
  { id: 't37', title: 'Review and update employee KRA targets for Q2', priority: 'P2', status: 'Pending', dueDate: '11 Apr', dueDateISO: '2026-04-11', group: 'Brego Delivery Team', groupColor: '#204CC7', project: 'A&T', projectColor: '#10B981', assignee: { initials: 'TA', color: '#3B82F6' } },
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
  { channel: '#alpine-group', unread: 4, lastSender: 'Harshal R.', lastSenderInitials: 'HR', lastSenderColor: '#10B981', preview: 'Landing page bounce rate dropped to 38% after the redesign. Sharing report.', time: '9:05 AM' },
  { channel: '#elan-aanchal', unread: 1, lastSender: 'Chinmay P.', lastSenderInitials: 'CP', lastSenderColor: '#7C3AED', preview: 'Meta Ads creative v3 approved by client. Launching tomorrow morning.', time: '8:48 AM' },
  { channel: '#urbanest-realty', unread: 3, lastSender: 'Mihir L.', lastSenderInitials: 'ML', lastSenderColor: '#F59E0B', preview: 'Client wants to add Google Ads for their new Goa project. Setting up a call.', time: '8:30 AM' },
  { channel: '#green-valley', unread: 0, lastSender: 'Zubear S.', lastSenderInitials: 'ZS', lastSenderColor: '#06B6D4', preview: 'Annual audit documents uploaded. Ready for review whenever you are.', time: 'Yesterday' },
];

const teamChannelMentions: InboxMention[] = [
  { channel: '#sem', unread: 3, lastSender: 'Chinmay P.', lastSenderInitials: 'CP', lastSenderColor: '#7C3AED', preview: 'Q2 ad spend allocation — review the shared sheet before Friday standup', time: '9:35 AM' },
  { channel: '#accounts', unread: 1, lastSender: 'Zubear S.', lastSenderInitials: 'ZS', lastSenderColor: '#06B6D4', preview: 'Updated TDS templates uploaded to Dataroom. Please verify.', time: '8:55 AM' },
  { channel: '#general', unread: 7, lastSender: 'Tejas A.', lastSenderInitials: 'TA', lastSenderColor: '#3B82F6', preview: 'Town hall moved to 3 PM today. Updated invite sent. Please confirm attendance.', time: '8:40 AM' },
  { channel: '#hod-sync', unread: 2, lastSender: 'Tejas A.', lastSenderInitials: 'TA', lastSenderColor: '#3B82F6', preview: 'Need Q1 margin numbers from all HODs by EOD for the board deck.', time: '8:15 AM' },
  { channel: '#dev-requests', unread: 0, lastSender: 'Harshal R.', lastSenderInitials: 'HR', lastSenderColor: '#10B981', preview: 'CRM dashboard export feature is live. Test and flag any issues.', time: 'Yesterday' },
  { channel: '#random', unread: 0, lastSender: 'Mihir L.', lastSenderInitials: 'ML', lastSenderColor: '#F59E0B', preview: 'Who\'s up for Alibag office this weekend? Planning a team outing.', time: 'Yesterday' },
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
  { client: 'Enagenbio', type: 'onboarding', stage: 'Awaiting Proposal', detail: 'No teams assigned yet', urgency: 'high', daysPending: 8 },
  { client: 'Una Homes LLP', type: 'onboarding', stage: 'Team Assigned', detail: 'Onboarding in progress', urgency: 'medium', daysPending: 5 },
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
  type: 'overdue' | 'onboarding';
  taskType: string;        // "Income Tax", "GST", "TDS", etc.
  detail: string;
  urgency: 'high' | 'medium';
  progress?: number;       // 0-100, for overdue items
  daysSinceUpdate?: number;
  onboardingStatus?: 'in-progress' | 'pending';
}

const atAttention: ATAttentionItem[] = [
  // Overdue
  { client: 'Bilawala & Co (Heena)', type: 'overdue', taskType: 'Income Tax', detail: '5 days since last update', urgency: 'high', daysSinceUpdate: 5 },
  { client: 'CEO Rules', type: 'overdue', taskType: 'Compliance', detail: '4 days since last update', urgency: 'high', daysSinceUpdate: 4 },
  { client: 'FRR (BLOGS)', type: 'overdue', taskType: 'TDS', detail: 'No progress in 7 days', urgency: 'high', daysSinceUpdate: 7 },
  { client: 'Green Valley Enterprises', type: 'overdue', taskType: 'Bookkeeping', detail: 'Stalled for 6 days', urgency: 'high', daysSinceUpdate: 6 },
  // Onboarding
  { client: 'Alpine Group', type: 'onboarding', taskType: 'GST', detail: 'Documents not yet received', urgency: 'medium', onboardingStatus: 'pending' },
  { client: 'Coast and Bloom', type: 'onboarding', taskType: 'GST', detail: 'Credentials collected, configuring portal', urgency: 'medium', onboardingStatus: 'in-progress' },
  { client: 'Infinity Solutions', type: 'onboarding', taskType: 'Audit', detail: 'Awaiting client KYC submission', urgency: 'medium', onboardingStatus: 'pending' },
];

// A&T category config for grouped rendering
const atCategoryConfig: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  overdue:     { label: 'Overdue Work', accent: '#E2445C', bg: 'bg-rose-50', text: 'text-rose-600' },
  onboarding:  { label: 'Onboarding', accent: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' },
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

// ═══════════════════════════════════════════════
// ─── HOD WIDGETS DATA ─────────────────────────
// ═══════════════════════════════════════════════

// ── Customer Ratings ──
interface CustomerRating {
  client: string;
  rating: number;         // 1-5
  service: 'PM' | 'A&T';
  feedback: string;
  date: string;
}

const customerRatings: CustomerRating[] = [
  { client: 'Elan by Aanchal', rating: 5, service: 'PM', feedback: 'Exceptional ROI this quarter', date: '02 Apr' },
  { client: 'True Diamond', rating: 5, service: 'PM', feedback: 'Great campaign execution', date: '01 Apr' },
  { client: 'TechCorp India', rating: 4, service: 'A&T', feedback: 'Timely GST filing, very reliable', date: '31 Mar' },
  { client: 'Alpine Group', rating: 4, service: 'PM', feedback: 'Good results, needs faster reporting', date: '30 Mar' },
  { client: 'Bilawala & Co', rating: 3, service: 'A&T', feedback: 'Delays in reconciliation', date: '28 Mar' },
  { client: '99 Pancakes', rating: 4, service: 'PM', feedback: 'Solid creatives, strong leads', date: '27 Mar' },
  { client: 'Green Valley', rating: 2, service: 'A&T', feedback: 'Missed compliance deadline', date: '25 Mar' },
];

// ── Attrition Performance ──
interface AttritionEntry {
  month: string;
  lost: number;
  retained: number;
  rate: number;  // attrition % = lost / (lost + retained) * 100
  revLost: number; // ₹ revenue lost that month
}

type ChartPeriod = 'Q1-26' | 'Q4-25' | 'Q3-25' | 'Q2-25' | 'H2-25' | 'Last 6M' | 'Last 12M';

const CHART_PERIOD_OPTIONS: { value: ChartPeriod; label: string }[] = [
  { value: 'Q1-26', label: 'Q1 2026' },
  { value: 'Q4-25', label: 'Q4 2025' },
  { value: 'Q3-25', label: 'Q3 2025' },
  { value: 'Q2-25', label: 'Q2 2025' },
  { value: 'H2-25', label: 'H2 2025' },
  { value: 'Last 6M', label: 'Last 6 months' },
  { value: 'Last 12M', label: 'Last 12 months' },
];

type AttritionPeriodData = { data: AttritionEntry[]; retentionRate: number; lost: number; revenueLost: number; periodLabel: string; trend: string };

const attritionByPeriod: Record<ChartPeriod, AttritionPeriodData> = {
  'Q1-26': {
    data: [
      { month: 'Jan', lost: 1, retained: 49, rate: 2.0, revLost: 180000 },
      { month: 'Feb', lost: 2, retained: 48, rate: 4.0, revLost: 320000 },
      { month: 'Mar', lost: 1, retained: 49, rate: 2.0, revLost: 180000 },
    ],
    retentionRate: 94, lost: 4, revenueLost: 680000, periodLabel: 'Q1 \'26', trend: 'Improving',
  },
  'Q4-25': {
    data: [
      { month: 'Oct', lost: 2, retained: 48, rate: 4.0, revLost: 340000 },
      { month: 'Nov', lost: 1, retained: 49, rate: 2.0, revLost: 210000 },
      { month: 'Dec', lost: 3, retained: 47, rate: 6.0, revLost: 570000 },
    ],
    retentionRate: 88, lost: 6, revenueLost: 1120000, periodLabel: 'Q4 \'25', trend: '-4% vs Q3',
  },
  'Q3-25': {
    data: [
      { month: 'Jul', lost: 1, retained: 48, rate: 2.0, revLost: 190000 },
      { month: 'Aug', lost: 0, retained: 48, rate: 0, revLost: 0 },
      { month: 'Sep', lost: 1, retained: 47, rate: 2.1, revLost: 150000 },
    ],
    retentionRate: 96, lost: 2, revenueLost: 340000, periodLabel: 'Q3 \'25', trend: 'Stable',
  },
  'Q2-25': {
    data: [
      { month: 'Apr', lost: 2, retained: 46, rate: 4.2, revLost: 280000 },
      { month: 'May', lost: 1, retained: 47, rate: 2.1, revLost: 130000 },
      { month: 'Jun', lost: 0, retained: 48, rate: 0, revLost: 0 },
    ],
    retentionRate: 94, lost: 3, revenueLost: 510000, periodLabel: 'Q2 \'25', trend: '+2% vs Q1',
  },
  'H2-25': {
    data: [
      { month: 'Jul', lost: 1, retained: 48, rate: 2.0, revLost: 190000 },
      { month: 'Aug', lost: 0, retained: 48, rate: 0, revLost: 0 },
      { month: 'Sep', lost: 1, retained: 47, rate: 2.1, revLost: 150000 },
      { month: 'Oct', lost: 2, retained: 48, rate: 4.0, revLost: 340000 },
      { month: 'Nov', lost: 1, retained: 49, rate: 2.0, revLost: 210000 },
      { month: 'Dec', lost: 3, retained: 47, rate: 6.0, revLost: 570000 },
    ],
    retentionRate: 92, lost: 8, revenueLost: 1460000, periodLabel: 'H2 \'25', trend: '-2% vs H1',
  },
  'Last 6M': {
    data: [
      { month: 'Oct', lost: 2, retained: 48, rate: 4.0, revLost: 340000 },
      { month: 'Nov', lost: 1, retained: 49, rate: 2.0, revLost: 210000 },
      { month: 'Dec', lost: 3, retained: 47, rate: 6.0, revLost: 570000 },
      { month: 'Jan', lost: 1, retained: 49, rate: 2.0, revLost: 180000 },
      { month: 'Feb', lost: 2, retained: 48, rate: 4.0, revLost: 320000 },
      { month: 'Mar', lost: 1, retained: 49, rate: 2.0, revLost: 180000 },
    ],
    retentionRate: 92, lost: 10, revenueLost: 1800000, periodLabel: '6M', trend: 'Improving',
  },
  'Last 12M': {
    data: [
      { month: 'Apr', lost: 2, retained: 46, rate: 4.2, revLost: 280000 },
      { month: 'Jun', lost: 1, retained: 47, rate: 2.1, revLost: 130000 },
      { month: 'Aug', lost: 0, retained: 48, rate: 0, revLost: 0 },
      { month: 'Oct', lost: 2, retained: 48, rate: 4.0, revLost: 340000 },
      { month: 'Dec', lost: 3, retained: 47, rate: 6.0, revLost: 570000 },
      { month: 'Mar', lost: 1, retained: 49, rate: 2.0, revLost: 180000 },
    ],
    retentionRate: 91, lost: 18, revenueLost: 3240000, periodLabel: 'FY', trend: 'Stable',
  },
};

// ── Margin Performance ──
interface MarginEntry {
  month: string;
  revenue: number;
  cost: number;
  margin: number;  // percentage
}

type MarginPeriodData = { data: MarginEntry[]; avgMargin: number; totalRevenue: number; periodLabel: string; trend: string };

const marginByPeriod: Record<ChartPeriod, MarginPeriodData> = {
  'Q1-26': {
    data: [
      { month: 'Jan', revenue: 3400000, cost: 2312000, margin: 32.0 },
      { month: 'Feb', revenue: 3200000, cost: 2144000, margin: 33.0 },
      { month: 'Mar', revenue: 3600000, cost: 2376000, margin: 34.0 },
    ],
    avgMargin: 33.0, totalRevenue: 10200000, periodLabel: 'Q1 \'26', trend: '+3.2% vs Q4',
  },
  'Q4-25': {
    data: [
      { month: 'Oct', revenue: 2800000, cost: 1960000, margin: 30.0 },
      { month: 'Nov', revenue: 3100000, cost: 2108000, margin: 32.0 },
      { month: 'Dec', revenue: 2600000, cost: 1846000, margin: 29.0 },
    ],
    avgMargin: 30.3, totalRevenue: 8500000, periodLabel: 'Q4 \'25', trend: '-1.5% vs Q3',
  },
  'Q3-25': {
    data: [
      { month: 'Jul', revenue: 2900000, cost: 1972000, margin: 32.0 },
      { month: 'Aug', revenue: 2700000, cost: 1863000, margin: 31.0 },
      { month: 'Sep', revenue: 3000000, cost: 2040000, margin: 32.0 },
    ],
    avgMargin: 31.7, totalRevenue: 8600000, periodLabel: 'Q3 \'25', trend: '+0.8% vs Q2',
  },
  'Q2-25': {
    data: [
      { month: 'Apr', revenue: 2500000, cost: 1750000, margin: 30.0 },
      { month: 'May', revenue: 2800000, cost: 1932000, margin: 31.0 },
      { month: 'Jun', revenue: 2900000, cost: 1972000, margin: 32.0 },
    ],
    avgMargin: 31.0, totalRevenue: 8200000, periodLabel: 'Q2 \'25', trend: '+1% vs Q1',
  },
  'H2-25': {
    data: [
      { month: 'Jul', revenue: 2900000, cost: 1972000, margin: 32.0 },
      { month: 'Aug', revenue: 2700000, cost: 1863000, margin: 31.0 },
      { month: 'Sep', revenue: 3000000, cost: 2040000, margin: 32.0 },
      { month: 'Oct', revenue: 2800000, cost: 1960000, margin: 30.0 },
      { month: 'Nov', revenue: 3100000, cost: 2108000, margin: 32.0 },
      { month: 'Dec', revenue: 2600000, cost: 1846000, margin: 29.0 },
    ],
    avgMargin: 31.0, totalRevenue: 17100000, periodLabel: 'H2 \'25', trend: '+0.5% vs H1',
  },
  'Last 6M': {
    data: [
      { month: 'Oct', revenue: 2800000, cost: 1960000, margin: 30.0 },
      { month: 'Nov', revenue: 3100000, cost: 2108000, margin: 32.0 },
      { month: 'Dec', revenue: 2600000, cost: 1846000, margin: 29.0 },
      { month: 'Jan', revenue: 3400000, cost: 2312000, margin: 32.0 },
      { month: 'Feb', revenue: 3200000, cost: 2144000, margin: 33.0 },
      { month: 'Mar', revenue: 3600000, cost: 2376000, margin: 34.0 },
    ],
    avgMargin: 31.8, totalRevenue: 18700000, periodLabel: '6M', trend: '+4% vs prior',
  },
  'Last 12M': {
    data: [
      { month: 'Apr', revenue: 2500000, cost: 1750000, margin: 30.0 },
      { month: 'Jun', revenue: 2900000, cost: 1972000, margin: 32.0 },
      { month: 'Aug', revenue: 2700000, cost: 1863000, margin: 31.0 },
      { month: 'Oct', revenue: 2800000, cost: 1960000, margin: 30.0 },
      { month: 'Dec', revenue: 2600000, cost: 1846000, margin: 29.0 },
      { month: 'Mar', revenue: 3600000, cost: 2376000, margin: 34.0 },
    ],
    avgMargin: 31.0, totalRevenue: 35800000, periodLabel: 'FY', trend: '+3% YoY',
  },
};

// ── CLA/NTF Nominations ──
type NominationStatus = 'nominated' | 'approved' | 'rejected' | 'pending-review';

interface ClientNomination {
  client: string;
  reason: string;
  claStatus: 'sureshot' | 'can-be-saved';
  responsible: string;
}

interface EmployeeNomination {
  employee: string;
  initials: string;
  color: string;
  reason: string;
  dateAdded: string;
  clients: string[];
}

const clientNominations: ClientNomination[] = [
  { client: 'Bio Basket', reason: 'ROAS dropped 40% over 2 months, unresponsive to strategy changes', claStatus: 'sureshot', responsible: 'Chinmay P.' },
  { client: 'Valiente Caps', reason: 'Budget cuts planned, considering in-house marketing', claStatus: 'can-be-saved', responsible: 'Harshal R.' },
  { client: 'Green Valley Enterprises', reason: 'Missed 2 compliance deadlines, trust eroding', claStatus: 'can-be-saved', responsible: 'Zubear S.' },
  { client: 'FRR (BLOGS)', reason: 'No engagement in 30 days, all tasks stalled', claStatus: 'sureshot', responsible: 'Mihir L.' },
  { client: 'Meeami Fashion', reason: 'Competitor offering lower rates, exploring options', claStatus: 'can-be-saved', responsible: 'Chinmay P.' },
];

const employeeNominations: EmployeeNomination[] = [
  { employee: 'Harshal R.', initials: 'HR', color: '#10B981', reason: 'Consistent missed deadlines across accounts', dateAdded: '01 Apr', clients: ['Bio Basket', 'Valiente Caps', '99 Pancakes'] },
  { employee: 'Mihir L.', initials: 'ML', color: '#F59E0B', reason: 'Slow response time, client escalations rising', dateAdded: '28 Mar', clients: ['FRR (BLOGS)', 'Green Valley'] },
  { employee: 'Chinmay P.', initials: 'CP', color: '#7C3AED', reason: 'Below target ROAS on 3 accounts', dateAdded: '25 Mar', clients: ['Bio Basket', 'Meeami Fashion', 'Valiente Caps', 'July Issue'] },
  { employee: 'Zubear S.', initials: 'ZS', color: '#06B6D4', reason: 'Compliance filings delayed twice in Q1', dateAdded: '30 Mar', clients: ['Green Valley', 'Bilawala & Co'] },
];

const nominationStatusConfig: Record<NominationStatus, { label: string; bg: string; text: string }> = {
  'nominated':      { label: 'Nominated', bg: 'bg-[#204CC7]/[0.06]', text: 'text-[#204CC7]' },
  'approved':       { label: 'Approved', bg: 'bg-[#00C875]/[0.08]', text: 'text-[#00C875]' },
  'rejected':       { label: 'Rejected', bg: 'bg-[#E2445C]/[0.06]', text: 'text-[#E2445C]' },
  'pending-review': { label: 'In Review', bg: 'bg-[#FDAB3D]/[0.08]', text: 'text-[#FDAB3D]' },
};

// ── Upsell / Cross-sell Opportunities ──
interface UpsellOpportunity {
  client: string;
  currentService: 'PM' | 'A&T';
  opportunity: string;
  potentialRevenue: number;
  confidence: 'high' | 'medium' | 'low';
}

const upsellOpportunities: UpsellOpportunity[] = [
  { client: 'Elan by Aanchal', currentService: 'PM', opportunity: 'Add A&T — client asked about tax planning', potentialRevenue: 180000, confidence: 'high' },
  { client: 'TechCorp India', currentService: 'A&T', opportunity: 'Add PM (Google Ads) — launching new product line', potentialRevenue: 250000, confidence: 'high' },
  { client: '99 Pancakes', currentService: 'PM', opportunity: 'Upgrade to Premium — hitting all targets, ready to scale', potentialRevenue: 120000, confidence: 'medium' },
  { client: 'Green Valley', currentService: 'A&T', opportunity: 'Add Audit Services — annual audit period approaching', potentialRevenue: 90000, confidence: 'medium' },
  { client: 'Alpine Group', currentService: 'PM', opportunity: 'Website Redesign — low PageSpeed scores affecting conversions', potentialRevenue: 350000, confidence: 'low' },
];

const confidenceConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  high:   { label: 'High', bg: 'bg-[#00C875]/[0.06]', text: 'text-[#00C875]', dot: 'bg-[#00C875]' },
  medium: { label: 'Medium', bg: 'bg-[#FDAB3D]/[0.06]', text: 'text-[#FDAB3D]', dot: 'bg-[#FDAB3D]' },
  low:    { label: 'Low', bg: 'bg-black/[0.04]', text: 'text-black/50', dot: 'bg-black/30' },
};

const priorityStyles: Record<string, { dot: string; bg: string; text: string }> = {
  P1: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-600' },
  P2: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
  P3: { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-500' },
};

// ═══════════════════════════════════════════════
// ─── CLIENT CIRCLES GROUP WITH PORTAL TOOLTIP ─
// ═══════════════════════════════════════════════

const CIRCLE_COLORS = ['bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600', 'bg-purple-100 text-purple-600', 'bg-cyan-100 text-cyan-600'];

function ClientCirclesGroup({ clients }: { clients: string[] }) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const showTip = useCallback(() => {
    if (groupRef.current) {
      const r = groupRef.current.getBoundingClientRect();
      setCoords({ x: r.left + r.width / 2, y: r.top });
    }
    setHover(true);
  }, []);

  return (
    <>
      <div
        ref={groupRef}
        onMouseEnter={showTip}
        onMouseLeave={() => setHover(false)}
        className="flex items-center -space-x-1.5 cursor-default"
        aria-label={`Clients: ${clients.join(', ')}`}
      >
        {clients.slice(0, 3).map((client, ci) => (
          <div key={ci} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold ${CIRCLE_COLORS[ci % CIRCLE_COLORS.length]}`}>
            {client.charAt(0)}
          </div>
        ))}
        {clients.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-black/55">
            +{clients.length - 3}
          </div>
        )}
      </div>
      {hover && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div className="px-3 py-2 rounded-lg bg-gray-900 text-white shadow-lg max-w-[240px]">
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-1">Assigned Clients</p>
            <div className="flex flex-col gap-0.5">
              {clients.map((c, i) => (
                <span key={i} className="text-caption font-medium leading-snug">{c}</span>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════════
// ─── HR HOME DATA ────────────────────────────
// ═══════════════════════════════════════════════

// Resource Requests — sourced from HRReport resourceRequirements
const hrResourceRequests = [
  { id: 1, dept: 'Finance', position: 'Floaters - 4/5', head: 'Product', team: 'Pooja', budget: '25k-35k', status: 'Active' as const, comments: ['Chetan — Will be moved from 10th April', 'Parul Offered: Joined', 'Nisha Offered: 33.2K, DOJ: 06th April 2026'] },
  { id: 2, dept: 'Finance', position: '1x Manager', head: 'Product', team: 'Pooja', budget: '45k-55k', status: 'Interviewing' as const, comments: ['No shortlist for final round'] },
  { id: 3, dept: 'Sales', position: '7x BDE - 0/7', head: 'Growth', team: 'Ujwal / Priyanka', budget: '30k-50k', status: 'Active' as const, comments: ['No shortlist for final round'] },
  { id: 4, dept: 'Sales', position: '1x BDE - 0/1', head: 'Growth', team: 'Ujwal / Priyanka', budget: '30k-50k', status: 'Active' as const, comments: ['No shortlist for final round'] },
  { id: 5, dept: 'Sales', position: '8x Business Dev Execs', head: 'Growth', team: 'Ujwal / Priyanka', budget: '30k-50k', status: 'Offer Sent' as const, comments: ['Maaz offered: 54k, DOJ: 02nd April', 'Vaishnavi offered: 45k, DOJ: 20th April', 'Arya Offered: 60k, DOJ: Yet to confirm'] },
  { id: 6, dept: 'SEM', position: 'Floaters - 0/3', head: 'Product', team: 'Ravina', budget: '45-50K', status: 'Active' as const, comments: ['No shortlist for final round'] },
  { id: 7, dept: 'SEM', position: '2x SEM Manager / QC', head: 'Product', team: 'Ravina', budget: '70-85K', status: 'Interviewing' as const, comments: ['Harsh Offered: 83k, DOJ: 1st May', 'Nachiket interview scheduled Tue 6 PM', 'Ashish interview scheduled Tue 6 PM'] },
  { id: 8, dept: 'Technology', position: '1x Full Stack Dev', head: 'Product', team: 'Ravina', budget: '80k-1.2L', status: 'Offer Sent' as const, comments: ['Sadashiv offered 15 lac, DOJ: 13th April'] },
];
const hrResourceTotal = { open: 8, filled: 6, pipeline: 22 };

// Efforts MIS — full monthly data per recruiter (sourced from HRReport)
const hrRecruiters = [
  {
    name: 'Pooja', initials: 'PJ', color: '#7C3AED',
    rows: [
      { metric: 'Sourced Candidates', jan: null, feb: null, mar: 300, apr: 200, janPct: null, febPct: null, marPct: null, aprPct: null },
      { metric: 'Calls Connected', jan: 1188, feb: 933, mar: 883, apr: 194, janPct: null, febPct: null, marPct: null, aprPct: '97%' },
      { metric: 'Interviews Set', jan: 226, feb: 77, mar: 66, apr: 14, janPct: '19%', febPct: '8%', marPct: '7%', aprPct: '7%' },
      { metric: 'Interviews Done', jan: 56, feb: 63, mar: 50, apr: 5, janPct: '25%', febPct: '82%', marPct: '76%', aprPct: '36%' },
      { metric: 'Offers Sent', jan: 10, feb: 3, mar: 6, apr: 0, janPct: '18%', febPct: '5%', marPct: '12%', aprPct: '0%' },
      { metric: 'Hired', jan: 4, feb: 3, mar: 1, apr: 0, janPct: '40%', febPct: '100%', marPct: null, aprPct: '0%' },
    ],
  },
  {
    name: 'Ravina', initials: 'RV', color: '#06B6D4',
    rows: [
      { metric: 'Sourced Candidates', jan: null, feb: null, mar: null, apr: 200, janPct: null, febPct: null, marPct: null, aprPct: null },
      { metric: 'Calls Connected', jan: null, feb: null, mar: 969, apr: 149, janPct: null, febPct: null, marPct: null, aprPct: '75%' },
      { metric: 'Interviews Set', jan: 110, feb: 879, mar: 136, apr: 13, janPct: null, febPct: null, marPct: null, aprPct: '9%' },
      { metric: 'Interviews Done', jan: 80, feb: 442, mar: 68, apr: 10, janPct: '73%', febPct: '50%', marPct: '50%', aprPct: '77%' },
      { metric: 'Offers Sent', jan: 3, feb: 4, mar: 0, apr: 0, janPct: '4%', febPct: '1%', marPct: '0%', aprPct: '0%' },
      { metric: 'Hired', jan: 3, feb: 4, mar: 3, apr: 0, janPct: '100%', febPct: '100%', marPct: null, aprPct: '0%' },
    ],
  },
  {
    name: 'Priyanka', initials: 'PK', color: '#F59E0B',
    rows: [
      { metric: 'Sourced Candidates', jan: null, feb: null, mar: 0, apr: 0, janPct: null, febPct: null, marPct: null, aprPct: null },
      { metric: 'Calls Connected', jan: 1235, feb: 981, mar: 792, apr: 0, janPct: null, febPct: null, marPct: null, aprPct: '0%' },
      { metric: 'Interviews Set', jan: 151, feb: 54, mar: 105, apr: 0, janPct: '13%', febPct: '6%', marPct: '13%', aprPct: '0%' },
      { metric: 'Interviews Done', jan: 27, feb: 48, mar: 74, apr: 0, janPct: '18%', febPct: '89%', marPct: '70%', aprPct: '0%' },
      { metric: 'Offers Sent', jan: 7, feb: 5, mar: 4, apr: 0, janPct: '25%', febPct: '11%', marPct: '5%', aprPct: '0%' },
      { metric: 'Hired', jan: 3, feb: 0, mar: 0, apr: 0, janPct: '43%', febPct: '0%', marPct: null, aprPct: '0%' },
    ],
  },
];

// Hiring performance — stacked area chart data
const hrPerfChartData = [
  { month: "Jun'25", Active: 0, Fired: 0, Resigned: 1, total: 1 },
  { month: "Jul'25", Active: 2, Fired: 3, Resigned: 2, total: 7 },
  { month: "Sep'25", Active: 1, Fired: 5, Resigned: 4, total: 10 },
  { month: "Oct'25", Active: 1, Fired: 4, Resigned: 2, total: 7 },
  { month: "Nov'25", Active: 2, Fired: 2, Resigned: 2, total: 6 },
  { month: "Dec'25", Active: 4, Fired: 3, Resigned: 1, total: 8 },
  { month: "Jan'26", Active: 6, Fired: 1, Resigned: 1, total: 8 },
  { month: "Feb'26", Active: 4, Fired: 2, Resigned: 1, total: 7 },
  { month: "Mar'26", Active: 2, Fired: 0, Resigned: 2, total: 4 },
  { month: "Apr'26", Active: 1, Fired: 0, Resigned: 0, total: 1 },
];
const hrPerfTotals = { active: 23, fired: 20, resigned: 16, grand: 59 };

// CLA/NTF employees
const hrCLAEmployees = [
  { name: 'John Doe', dept: 'Performance Marketing', type: 'CLA' as const, reason: 'Not meeting monthly targets for 3 consecutive months' },
  { name: 'Sarah Johnson', dept: 'Performance Marketing', type: 'CLA' as const, reason: 'Late submissions affecting team deliverables consistently' },
  { name: 'Kavya Iyer', dept: 'Accounts & Taxation', type: 'NTF' as const, reason: 'Resigned — accepted offer from competitor firm' },
  { name: 'Rahul Nair', dept: 'Performance Marketing', type: 'NTF' as const, reason: 'Contract ended — not renewed due to budget cuts' },
];

// Engagement events
const hrEngagementEvents = [
  { event: 'Movie Screening — Dhurandhar 2', date: '3rd April', status: 'Completed' as const },
  { event: 'IPL Screening', date: '16th April', status: 'Upcoming' as const },
  { event: 'One Day Offsite — Alibaugh', date: 'TBD', status: 'TBD' as const },
  { event: 'Office Olympics — Indoor Games Night', date: '12th June', status: 'Upcoming' as const },
];

// Onboarding employees
const hrOnboarding = [
  { name: 'Chetan Nare', dept: 'Finance', status: 'Settling' as const },
  { name: 'Parul', dept: 'Finance', status: 'Settling' as const },
  { name: 'Naeela', dept: 'Finance', status: 'Settling' as const },
  { name: 'Prathamesh T.', dept: 'Finance', status: 'Settling' as const },
  { name: 'Ujjwal B.', dept: 'HR', status: 'Settling' as const },
  { name: 'Purva P.', dept: 'Operations', status: 'Settling' as const },
  { name: 'Luiza S.', dept: 'Perf. Marketing', status: 'Settling' as const },
  { name: 'Daniya S.', dept: 'Technology', status: 'Settling' as const },
];

// Incoming employees
const hrIncoming = [
  { name: 'Nisha Patil', dept: 'Finance', date: '6th Apr', status: 'Active' as const },
  { name: 'Jyoti Rane', dept: 'Finance', date: '4th May', status: 'Incoming' as const },
  { name: 'Amisha Desai', dept: 'Finance', date: 'TBD', status: 'Incoming' as const },
  { name: 'Rahul Kapoor', dept: 'Sales', date: '14th Apr', status: 'Incoming' as const },
  { name: 'Sneha K.', dept: 'SEM', date: '21st Apr', status: 'Incoming' as const },
  { name: 'Vishal Thakur', dept: 'Technology', date: '28th Apr', status: 'Incoming' as const },
  { name: 'Ankita Sharma', dept: 'Finance', date: '15th Mar', status: 'Backed Out' as const },
  { name: 'Ravi Menon', dept: 'Sales', date: '20th Mar', status: 'Backed Out' as const },
];

// Incidents summary
const hrIncidentList = [
  { id: 'INC-001', employee: 'Priya Sharma', department: 'Performance Marketing', priority: 'High' as const, status: 'Open' as const, description: 'ROAS dropped below 1.5x for Zenith Retail — client threatening to leave.' },
  { id: 'INC-002', employee: 'Rohan Desai', department: 'Accounts & Taxation', priority: 'High' as const, status: 'In Progress' as const, description: 'GST filing deadline missed for Meridian Healthcare. Potential ₹10K penalty.' },
  { id: 'INC-003', employee: 'Amit Verma', department: 'Internal', priority: 'Medium' as const, status: 'In Progress' as const, description: 'Harassment complaint reported against team lead. HR investigation required.' },
  { id: 'INC-004', employee: 'Akshay Mehta', department: 'Performance Marketing', priority: 'Medium' as const, status: 'Open' as const, description: 'Client not receiving weekly performance reports for 2 weeks.' },
  { id: 'INC-005', employee: 'Sneha Patel', department: 'Accounts & Taxation', priority: 'High' as const, status: 'In Progress' as const, description: 'Invoice of ₹1.2L overdue by 45 days — multiple follow-ups unanswered.' },
  { id: 'INC-008', employee: 'Priya Sharma', department: 'Performance Marketing', priority: 'High' as const, status: 'In Progress' as const, description: 'Facebook ad account suspended due to policy violation. All campaigns halted.' },
  { id: 'INC-011', employee: 'Ishaan Joshi', department: 'Internal', priority: 'Medium' as const, status: 'In Progress' as const, description: 'Suspected NDA breach — shared client data on personal social media.' },
  { id: 'INC-012', employee: 'Sneha Patel', department: 'Performance Marketing', priority: 'Medium' as const, status: 'Open' as const, description: 'Disputed invoice amount — client claims agreed fee was ₹80K, not ₹95K.' },
  { id: 'INC-007', employee: 'Kavya Iyer', department: 'Internal', priority: 'Low' as const, status: 'Open' as const, description: 'Request for role change from Executive to Sr. Executive. Pending review.' },
  { id: 'INC-013', employee: 'Sneha Patel', department: 'Accounts & Taxation', priority: 'High' as const, status: 'In Progress' as const, description: 'Annual return filing incomplete for TrueValue Finance. Missing documents.' },
];

// ═══════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────
// ═══════════════════════════════════════════════

export function Dashboard() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<DashboardRole>('hod');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) setRoleDropdownOpen(false);
      if (attritionPeriodRef.current && !attritionPeriodRef.current.contains(e.target as Node)) setAttritionPeriodOpen(false);
      if (marginPeriodRef.current && !marginPeriodRef.current.contains(e.target as Node)) setMarginPeriodOpen(false);
      if (rrDeptDropdownRef.current && !rrDeptDropdownRef.current.contains(e.target as Node)) setRrDeptDropdownOpen(false);
      if (recruiterDropdownRef.current && !recruiterDropdownRef.current.contains(e.target as Node)) setRecruiterDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [taskFilter, setTaskFilter] = useState<'all' | 'P1' | 'P2'>('all');
  const [incidentTab, setIncidentTab] = useState<'client' | 'employee'>('client');
  const [pmTab, setPmTab] = useState<'onboarding' | 'kickoff' | 'growth-plan'>('onboarding');
  const [atTab, setAtTab] = useState<'overdue' | 'onboarding'>('overdue');
  const [pmPerfTab, setPmPerfTab] = useState<'ecommerce' | 'leadgen'>('ecommerce');
  const [attritionPeriod, setAttritionPeriod] = useState<ChartPeriod>('Q1-26');
  const [marginPeriod, setMarginPeriod] = useState<ChartPeriod>('Q1-26');
  const [attritionPeriodOpen, setAttritionPeriodOpen] = useState(false);
  const [marginPeriodOpen, setMarginPeriodOpen] = useState(false);
  const [expandedRR, setExpandedRR] = useState<number | null>(null);
  const [rrDeptFilter, setRrDeptFilter] = useState<string>('All');
  const [rrDeptDropdownOpen, setRrDeptDropdownOpen] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState(0);
  const [recruiterDropdownOpen, setRecruiterDropdownOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const attritionPeriodRef = useRef<HTMLDivElement>(null);
  const marginPeriodRef = useRef<HTMLDivElement>(null);
  const rrDeptDropdownRef = useRef<HTMLDivElement>(null);
  const recruiterDropdownRef = useRef<HTMLDivElement>(null);

  const activeRoleLabel = ROLE_OPTIONS.find(r => r.value === activeRole)!.label;

  const pendingAssignments = myAssignments.filter(t => t.status === 'Pending');
  const filteredAssignments = taskFilter === 'all' ? pendingAssignments : pendingAssignments.filter(t => t.priority === taskFilter);

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

  // HOD KPI computations
  const activeAttrition = attritionByPeriod['Q1-26'];
  const activeMargin = marginByPeriod['Q1-26'];
  const claCount = clientNominations.filter(n => n.claStatus === 'sureshot').length;
  const upsellTotal = upsellOpportunities.reduce((s, o) => s + o.potentialRevenue, 0);
  const avgRating = customerRatings.reduce((s, r) => s + r.rating, 0) / customerRatings.length;

  return (
    <main className="h-[calc(100vh-53px)] overflow-y-auto bg-[#FAFBFC]" aria-label="Home">
      {/* ── Top Bar: Greeting + Insights + Role Toggle ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-black/[0.04]">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-h2 text-black/85">{greeting}, Sufyan</h1>
              <p className="text-caption text-black/35">Wednesday, 18 March 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(activeRole === 'hr' || activeRole === 'hod' || activeRole === 'manager' || activeRole === 'executive') && (
            <button
              onClick={() => setInsightsOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-colors text-caption font-medium ${insightsOpen ? 'bg-[#204CC7]/5 border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] hover:border-black/[0.15] text-black/60 hover:text-black/75'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
              Insights
            </button>
            )}
            {/* Role Preview Toggle */}
            <div className="relative" ref={roleDropdownRef}>
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                aria-expanded={roleDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Switch dashboard role preview"
                className="flex items-center gap-2.5 pl-3 pr-2.5 py-2 rounded-lg border border-dashed border-black/[0.15] bg-white hover:border-black/[0.25] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <Eye className="w-3.5 h-3.5 text-black/35 group-hover:text-black/50 transition-colors" aria-hidden="true" />
                <span className="text-caption font-semibold text-black/60 group-hover:text-black/75 transition-colors">
                  Viewing as <span className="text-[#204CC7]">{activeRoleLabel}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-black/35 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            {roleDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-[220px] bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-30" role="listbox" aria-label="Dashboard role options">
                <p className="px-3.5 py-2 text-caption text-black/40 font-medium">Preview dashboard as</p>
                {ROLE_OPTIONS.map((role) => {
                  const isActive = activeRole === role.value;
                  return (
                    <button
                      key={role.value}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => { setActiveRole(role.value); setRoleDropdownOpen(false); setInsightsOpen(false); }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                        isActive ? 'bg-[#204CC7]/[0.04]' : 'hover:bg-black/[0.02]'
                      }`}
                    >
                      <span className={`text-caption font-semibold ${isActive ? 'text-[#204CC7]' : 'text-black/70'}`}>{role.label}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-6 pt-6 pb-12">

        {/* ═══ ROLE-SPECIFIC CONTENT ═══ */}
        {activeRole === 'hr' && (
          <div className="mt-2 mb-8 space-y-5" style={{ animation: 'dashUp 0.3s ease-out' }}>

            {/* ── KPI Strip ── */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-caption font-semibold text-blue-700">{hrResourceTotal.open} Open Positions</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-caption font-semibold text-emerald-700">{hrResourceTotal.filled} Filled</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-caption font-semibold text-amber-700">{hrOnboarding.length} Onboarding</span>
              </div>
              <div className="w-px h-5 bg-black/[0.08] mx-0.5" />
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-100">
                <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-caption font-semibold text-purple-700">{hrIncoming.filter(i => i.status === 'Incoming').length} Incoming</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-caption font-semibold text-rose-600">{hrCLAEmployees.length} CLA/NTF</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-100">
                <Shield className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-caption font-semibold text-orange-700">{hrIncidentList.length} Active Incidents</span>
              </div>
            </div>

            {/* ── ROW 1: Resource Requests + Efforts ── */}
            <div className="grid grid-cols-2 gap-5">

              {/* Resource Requests */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#204CC7]" />
                    <h3 className="text-body font-semibold text-black/80">Resource Requests</h3>
                  </div>
                  {/* Department filter dropdown */}
                  <div className="relative" ref={rrDeptDropdownRef}>
                    <button
                      onClick={() => setRrDeptDropdownOpen(!rrDeptDropdownOpen)}
                      aria-haspopup="listbox"
                      aria-expanded={rrDeptDropdownOpen}
                      aria-label={`Filter by department: ${rrDeptFilter === 'All' ? 'All Departments' : rrDeptFilter}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-caption font-medium border border-black/10 text-black/60 hover:bg-black/[0.02] transition-all"
                    >
                      <span>{rrDeptFilter === 'All' ? 'All Departments' : rrDeptFilter}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${rrDeptDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {rrDeptDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                        {['All', ...Array.from(new Set(hrResourceRequests.map(r => r.dept)))].map(dept => (
                          <button
                            key={dept}
                            onClick={() => { setRrDeptFilter(dept); setRrDeptDropdownOpen(false); setExpandedRR(null); }}
                            className={`w-full text-left px-3 py-2 text-caption transition-all ${rrDeptFilter === dept ? 'bg-[#204CC7]/5 text-[#204CC7] font-medium' : 'text-black/70 hover:bg-black/[0.02]'}`}
                          >{dept === 'All' ? 'All Departments' : dept}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Pipeline summary */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-caption text-black/35">{hrResourceRequests.length} positions</span>
                  <span className="text-black/10">·</span>
                  <span className="text-caption text-black/35">{hrResourceTotal.pipeline} in pipeline</span>
                </div>
                {/* Position list */}
                <div className="overflow-y-auto max-h-[360px] flex-1 space-y-1">
                  {(() => {
                    const filtered = rrDeptFilter === 'All' ? hrResourceRequests : hrResourceRequests.filter(r => r.dept === rrDeptFilter);
                    // Group by department
                    const grouped: Record<string, typeof filtered> = {};
                    filtered.forEach(r => { if (!grouped[r.dept]) grouped[r.dept] = []; grouped[r.dept].push(r); });
                    const deptStyles: Record<string, { bg: string; text: string; border: string }> = {
                      Finance: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
                      Sales: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                      SEM: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
                      Technology: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                    };
                    return Object.entries(grouped).map(([dept, items]) => {
                      const ds = deptStyles[dept] || deptStyles.Technology;
                      return (
                        <div key={dept} className={`rounded-xl border ${ds.border} overflow-hidden`}>
                          {/* Department header */}
                          <div className={`px-3 py-2 ${ds.bg} flex items-center justify-between`}>
                            <span className={`text-caption font-bold ${ds.text}`}>{dept}</span>
                            <span className="text-caption text-black/35">{items.length} position{items.length > 1 ? 's' : ''}</span>
                          </div>
                          {/* Rows */}
                          <div className="divide-y divide-black/[0.04]">
                            {items.map(rr => {
                              const isOpen = expandedRR === rr.id;
                              return (
                                <div key={rr.id}>
                                  <button
                                    onClick={() => setExpandedRR(isOpen ? null : rr.id)}
                                    aria-expanded={isOpen}
                                    aria-label={`${rr.position} — ${rr.status}`}
                                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${isOpen ? 'bg-black/[0.015]' : 'hover:bg-black/[0.008]'}`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-caption font-semibold text-black/75 truncate">{rr.position}</p>
                                      <p className="text-caption text-black/35 mt-0.5">Team: {rr.team} · {rr.budget}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md text-caption font-medium border flex-shrink-0 ${
                                      rr.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      rr.status === 'Offer Sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      rr.status === 'Interviewing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      'bg-black/[0.03] text-black/50 border-black/10'
                                    }`}>{rr.status}</span>
                                    <ChevronDown className={`w-3 h-3 text-black/25 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isOpen && (
                                    <div className="px-3 pb-2.5 bg-black/[0.015]">
                                      <div className="space-y-1">
                                        {rr.comments.map((c, ci) => {
                                          const isOffer = /offered|joined/i.test(c);
                                          const isPending = /pending|scheduled|yet to/i.test(c);
                                          return (
                                            <div key={ci} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-caption leading-relaxed ${
                                              isOffer ? 'bg-emerald-50/80 text-emerald-800/70' :
                                              isPending ? 'bg-amber-50/80 text-amber-800/70' :
                                              'bg-white text-black/50'
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px] ${
                                                isOffer ? 'bg-emerald-500' : isPending ? 'bg-amber-400' : 'bg-black/15'
                                              }`} />
                                              <span>{c}</span>
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
                    });
                  })()}
                </div>
              </div>

              {/* Recruiter Efforts MIS */}
              {(() => {
                const rec = hrRecruiters[selectedRecruiter];
                return (
                <div className="rounded-2xl border border-black/[0.06] bg-white p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#204CC7]" />
                      <h3 className="text-body font-semibold text-black/80">Recruiter Efforts</h3>
                    </div>
                    {/* Recruiter selector */}
                    <div className="relative" ref={recruiterDropdownRef}>
                      <button
                        onClick={() => setRecruiterDropdownOpen(!recruiterDropdownOpen)}
                        aria-haspopup="listbox"
                        aria-expanded={recruiterDropdownOpen}
                        aria-label={`Recruiter: ${rec.name}`}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-black/10 hover:bg-black/[0.02] transition-all"
                      >
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: rec.color }}>{rec.initials}</div>
                        <span className="text-caption font-medium text-black/70">{rec.name}</span>
                        <ChevronDown className={`w-3 h-3 text-black/30 transition-transform ${recruiterDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {recruiterDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                          {hrRecruiters.map((r, i) => (
                            <button
                              key={r.name}
                              onClick={() => { setSelectedRecruiter(i); setRecruiterDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-all ${selectedRecruiter === i ? 'bg-[#204CC7]/5' : 'hover:bg-black/[0.02]'}`}
                            >
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: r.color }}>{r.initials}</div>
                              <span className={`text-caption font-medium ${selectedRecruiter === i ? 'text-[#204CC7]' : 'text-black/70'}`}>{r.name}</span>
                              {selectedRecruiter === i && <Check className="w-3.5 h-3.5 text-[#204CC7] ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* MIS Table */}
                  <div className="overflow-hidden rounded-xl border border-black/[0.06] flex-1">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-black/[0.02] border-b border-black/[0.06]">
                          <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5">Metric</th>
                          <th className="text-right text-caption font-semibold text-black/50 px-2 py-2.5">Jan&apos;26</th>
                          <th className="text-right text-caption font-semibold text-black/30 px-1 py-2.5">%</th>
                          <th className="text-right text-caption font-semibold text-black/50 px-2 py-2.5">Feb&apos;26</th>
                          <th className="text-right text-caption font-semibold text-black/30 px-1 py-2.5">%</th>
                          <th className="text-right text-caption font-semibold text-black/50 px-2 py-2.5">Mar&apos;26</th>
                          <th className="text-right text-caption font-semibold text-black/30 px-1 py-2.5">%</th>
                          <th className="text-right text-caption font-semibold text-black/50 px-2 py-2.5">Apr&apos;26</th>
                          <th className="text-right text-caption font-semibold text-black/30 px-1 py-2.5">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rec.rows.map((row, ri) => {
                          const isHired = row.metric === 'Hired';
                          return (
                            <tr key={ri} className={`border-b border-black/[0.04] last:border-0 ${isHired ? 'bg-emerald-50/30' : 'hover:bg-black/[0.008]'} transition-colors`}>
                              <td className={`px-3 py-5 text-caption whitespace-nowrap ${isHired ? 'font-semibold text-emerald-700' : 'font-medium text-black/70'}`}>{row.metric}</td>
                              <td className="px-2 py-5 text-caption text-right tabular-nums text-black/50">{row.jan ?? '—'}</td>
                              <td className="px-1 py-5 text-caption text-right tabular-nums text-black/30">{row.janPct ?? ''}</td>
                              <td className="px-2 py-5 text-caption text-right tabular-nums text-black/50">{row.feb ?? '—'}</td>
                              <td className="px-1 py-5 text-caption text-right tabular-nums text-black/30">{row.febPct ?? ''}</td>
                              <td className="px-2 py-5 text-caption text-right tabular-nums text-black/50">{row.mar ?? '—'}</td>
                              <td className="px-1 py-5 text-caption text-right tabular-nums text-black/30">{row.marPct ?? ''}</td>
                              <td className={`px-2 py-5 text-caption text-right tabular-nums font-semibold ${isHired ? 'text-emerald-700' : 'text-[#204CC7]'}`}>{row.apr ?? '—'}</td>
                              <td className="px-1 py-5 text-caption text-right tabular-nums text-black/30">{row.aprPct ?? ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })()}
            </div>

            {/* ── ROW 2: Hiring Performance Chart + CLA/NTF ── */}
            <div className="grid grid-cols-5 gap-5">

              {/* Hiring Performance — stacked area (3 cols) */}
              <div className="col-span-3 rounded-2xl border border-black/[0.06] bg-white p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#204CC7]" />
                    <h3 className="text-body font-semibold text-black/80">Hiring Performance</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    {[{ l: 'Active', c: '#00C875' }, { l: 'Fired', c: '#E2445C' }, { l: 'Resigned', c: '#FDAB3D' }].map(s => (
                      <div key={s.l} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.c }} />
                        <span className="text-caption text-black/35">{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-caption text-black/35 mb-3">59 hires · Jun &apos;25 — Apr &apos;26</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={hrPerfChartData} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hrGradActive" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00C875" stopOpacity={0.3} /><stop offset="100%" stopColor="#00C875" stopOpacity={0.03} /></linearGradient>
                      <linearGradient id="hrGradFired" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E2445C" stopOpacity={0.3} /><stop offset="100%" stopColor="#E2445C" stopOpacity={0.03} /></linearGradient>
                      <linearGradient id="hrGradResigned" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FDAB3D" stopOpacity={0.3} /><stop offset="100%" stopColor="#FDAB3D" stopOpacity={0.03} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.4)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'rgba(0,0,0,0.3)' }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload as { Active: number; Fired: number; Resigned: number; total: number };
                      return (
                        <div className="bg-white rounded-xl shadow-lg border border-black/[0.06] px-4 py-3 text-caption" style={{ minWidth: 150 }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-semibold text-black/75">{label}</span>
                            <span className="font-bold text-[#204CC7]">{d.total}</span>
                          </div>
                          {d.Active > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50">Active</span><span className="ml-auto font-semibold">{d.Active}</span></div>}
                          {d.Fired > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50">Fired</span><span className="ml-auto font-semibold">{d.Fired}</span></div>}
                          {d.Resigned > 0 && <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#FDAB3D]" /><span className="text-black/50">Resigned</span><span className="ml-auto font-semibold">{d.Resigned}</span></div>}
                        </div>
                      );
                    }} />
                    <Area type="monotone" dataKey="Active" stackId="1" stroke="#00C875" strokeWidth={2} fill="url(#hrGradActive)" />
                    <Area type="monotone" dataKey="Fired" stackId="1" stroke="#E2445C" strokeWidth={2} fill="url(#hrGradFired)" />
                    <Area type="monotone" dataKey="Resigned" stackId="1" stroke="#FDAB3D" strokeWidth={2} fill="url(#hrGradResigned)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* CLA/NTF (2 cols) */}
              <div
                className="col-span-2 rounded-2xl border border-black/[0.06] bg-white p-5 flex flex-col cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/cla"
                onClick={() => router.push('/adminland/employees?tab=cla')}
                onKeyDown={(e) => handleKeyNav(e, () => router.push('/adminland/employees?tab=cla'))}
                tabIndex={0}
                role="link"
                aria-label="View CLA/NTF employees in Adminland"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <h3 className="text-body font-semibold text-black/80">CLA / NTF</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/cla:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-caption font-medium border border-amber-200">{hrCLAEmployees.filter(e => e.type === 'CLA').length} CLA</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-caption font-medium border border-rose-200">{hrCLAEmployees.filter(e => e.type === 'NTF').length} NTF</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-black/[0.06] flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/[0.06]">
                        <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5">Employee</th>
                        <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5">Status</th>
                        <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hrCLAEmployees.map((e, i) => (
                        <tr key={i} className={`${i !== hrCLAEmployees.length - 1 ? 'border-b border-black/[0.04]' : ''} hover:bg-black/[0.01] transition-colors`}>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <p className="text-caption font-medium text-black/80">{e.name}</p>
                            <p className="text-caption text-black/35 mt-0.5">{e.dept}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                              e.type === 'CLA' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>{e.type}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="text-caption text-black/55 line-clamp-1">{e.reason}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── ROW 3: Engagement + Onboarding ── */}
            <div className="grid grid-cols-2 gap-5">

              {/* Engagement Calendar */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="w-4 h-4 text-purple-600" />
                    <h3 className="text-body font-semibold text-black/80">Engagement Calendar</h3>
                  </div>
                  <span className="text-caption text-black/35">Apr — Jun 2026</span>
                </div>
                <div className="space-y-2">
                  {hrEngagementEvents.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-black/[0.015] hover:bg-black/[0.025] transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        ev.status === 'Completed' ? 'bg-emerald-50' : ev.status === 'Upcoming' ? 'bg-blue-50' : 'bg-black/[0.04]'
                      }`}>
                        {ev.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : ev.status === 'Upcoming' ? <CalendarDays className="w-4 h-4 text-blue-500" /> : <Clock className="w-4 h-4 text-black/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption font-semibold text-black/75 truncate">{ev.event}</p>
                        <p className="text-caption text-black/40">{ev.date}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-caption font-medium ${
                        ev.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : ev.status === 'Upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-black/[0.04] text-black/40'
                      }`}>{ev.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding Report */}
              <div
                className="rounded-2xl border border-black/[0.06] bg-white p-5 cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/onboard"
                onClick={() => router.push('/adminland/employees')}
                onKeyDown={(e) => handleKeyNav(e, () => router.push('/adminland/employees'))}
                tabIndex={0}
                role="link"
                aria-label="View employees in Adminland"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-amber-600" />
                    <h3 className="text-body font-semibold text-black/80">Onboarding</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/onboard:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-caption font-semibold border border-amber-100">{hrOnboarding.length} settling</span>
                </div>
                <div className="space-y-1.5">
                  {hrOnboarding.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2 rounded-xl hover:bg-black/[0.015] transition-colors">
                      <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-700 text-caption font-bold">{e.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption font-medium text-black/75">{e.name}</p>
                      </div>
                      <span className="text-caption text-black/40">{e.dept}</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ROW 4: Incoming + Incidents ── */}
            <div className="grid grid-cols-2 gap-5">

              {/* Incoming Report */}
              <div
                className="rounded-2xl border border-black/[0.06] bg-white p-5 cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/incoming"
                onClick={() => router.push('/adminland/employees?tab=incoming')}
                onKeyDown={(e) => handleKeyNav(e, () => router.push('/adminland/employees?tab=incoming'))}
                tabIndex={0}
                role="link"
                aria-label="View incoming employees in Adminland"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-purple-600" />
                    <h3 className="text-body font-semibold text-black/80">Incoming Employees</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/incoming:opacity-100 transition-opacity" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-caption font-medium">{hrIncoming.filter(i => i.status === 'Incoming').length} incoming</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-caption font-medium">{hrIncoming.filter(i => i.status === 'Backed Out').length} backed out</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {hrIncoming.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-3.5 py-2 rounded-xl hover:bg-black/[0.015] transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        e.status === 'Active' ? 'bg-emerald-50' : e.status === 'Backed Out' ? 'bg-rose-50' : 'bg-blue-50'
                      }`}>
                        <span className={`text-caption font-bold ${
                          e.status === 'Active' ? 'text-emerald-600' : e.status === 'Backed Out' ? 'text-rose-500' : 'text-blue-600'
                        }`}>{e.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-caption font-medium ${e.status === 'Backed Out' ? 'text-black/40 line-through' : 'text-black/75'}`}>{e.name}</p>
                      </div>
                      <span className="text-caption text-black/35">{e.date}</span>
                      <span className={`px-2 py-0.5 rounded-md text-caption font-medium border ${
                        e.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        e.status === 'Backed Out' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>{e.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Incidents */}
              <div
                onClick={() => router.push('/adminland/incidents')}
                className="rounded-2xl border border-black/[0.06] bg-white p-5 flex flex-col cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all"
                role="link"
                aria-label="View all incidents in Adminland"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-600" />
                    <h3 className="text-body font-semibold text-black/80">Employee Incidents</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-black/25" />
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { label: 'High', count: hrIncidentList.filter(i => i.priority === 'High').length, color: 'bg-[#E2445C]' },
                      { label: 'Medium', count: hrIncidentList.filter(i => i.priority === 'Medium').length, color: 'bg-[#FDAB3D]' },
                      { label: 'Low', count: hrIncidentList.filter(i => i.priority === 'Low').length, color: 'bg-[#00C875]' },
                    ].map(p => (
                      <div key={p.label} className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${p.color}`} />
                        <span className="text-caption text-black/45">{p.label}: {p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-black/[0.06] flex-1 overflow-y-auto max-h-[400px]">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5 bg-[#f8f8f9] border-b border-black/[0.06]">Employee</th>
                          <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5 bg-[#f8f8f9] border-b border-black/[0.06]">Priority</th>
                          <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5 bg-[#f8f8f9] border-b border-black/[0.06]">Status</th>
                          <th className="text-left text-caption font-semibold text-black/50 px-3 py-2.5 bg-[#f8f8f9] border-b border-black/[0.06]">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hrIncidentList.map((inc, idx) => (
                          <tr key={inc.id} className={`${idx !== hrIncidentList.length - 1 ? 'border-b border-black/[0.04]' : ''} hover:bg-black/[0.01] transition-colors`}>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <p className="text-caption font-medium text-black/80">{inc.employee}</p>
                              <p className="text-caption text-black/35 mt-0.5">{inc.department}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                                inc.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                inc.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>{inc.priority}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 text-caption font-medium whitespace-nowrap ${
                                inc.status === 'Open' ? 'text-rose-600' : 'text-blue-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inc.status === 'Open' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                {inc.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="text-caption text-black/55 line-clamp-1">{inc.description}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── HOD Dashboard Content ── */}
        {(activeRole === 'hod' || activeRole === 'manager' || activeRole === 'executive') && (<>

        {/* ── HOD Quick Summary Strip ── */}
        <div className="flex items-center gap-2.5 mb-7 flex-wrap" role="status" aria-label="Dashboard summary" style={{ animation: 'dashUp 0.3s ease-out' }}>
          {/* — Operational KPIs — */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-black/[0.06]">
            <div className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            <span className="text-caption font-semibold text-black/70">{p1Count} P1 tasks</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-100">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
              <span className="text-caption font-semibold text-rose-600">{overdueCount} overdue</span>
            </div>
          )}
          {allIncidents.length > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span className="text-caption font-semibold text-amber-700">{allIncidents.length} open incidents</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <MessageSquare className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
            <span className="text-caption font-semibold text-[#204CC7]">{clientChannelMentions.reduce((s, c) => s + c.unread, 0) + teamChannelMentions.reduce((s, c) => s + c.unread, 0)} unread</span>
          </div>
          {/* — Divider — */}
          <div className="w-px h-5 bg-black/[0.08] mx-0.5" aria-hidden="true" />
          {/* — Business Health KPIs — */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="w-2 h-2 rounded-full bg-[#00C875]" aria-hidden="true" />
            <span className="text-caption font-semibold text-emerald-700">{activeAttrition.retentionRate}% Retention</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span className="text-caption font-semibold text-emerald-700">{activeMargin.avgMargin}% Margin</span>
          </div>
          {activeRole === 'hod' && claCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-100">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
              <span className="text-caption font-semibold text-rose-600">{claCount} sureshot CLA</span>
            </div>
          )}
          {activeRole === 'hod' && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
            <span className="text-caption font-semibold text-[#204CC7]">{formatLakh(upsellTotal)} upsell</span>
          </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-100">
            <Star className="w-3.5 h-3.5 text-[#FDAB3D]" aria-hidden="true" />
            <span className="text-caption font-semibold text-amber-700">{avgRating.toFixed(1)} rating</span>
          </div>
        </div>

        {/* ── Row-Based Symmetric Grid ── */}
        <div className="space-y-6">

          {/* ═══ ROW 1: Client Tasks + Brego Group — Two Equal Columns ═══ */}
          <div className="grid grid-cols-2 gap-6" style={{ animation: 'dashUp 0.3s ease-out 0.05s both' }}>

            {/* ── Shared Priority Filter (above both widgets) ── */}
            {/* Rendered inside each widget header for visual cohesion */}

            {/* ── Client Tasks Widget (Basecamp-style) ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" aria-label="Client task assignments">
              {/* Header */}
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
                <div className="flex items-center gap-0.5 bg-black/[0.03] rounded-lg p-0.5" role="radiogroup" aria-label="Filter client tasks by priority">
                  {(['all', 'P1', 'P2'] as const).map(f => (
                    <button
                      key={f}
                      role="radio"
                      aria-checked={taskFilter === f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-caption font-semibold transition-all ${
                        taskFilter === f ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'
                      }`}
                    >
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task List — grouped by client */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
                {clientSortedGroups.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-body text-black/30">No {taskFilter === 'all' ? '' : taskFilter + ' '}pending client tasks</p>
                  </div>
                ) : (
                  <div>
                    {clientSortedGroups.map(([groupName, tasks]) => (
                      <div key={groupName}>
                        {/* Group header */}
                        <div className="px-5 py-2 bg-black/[0.018] flex items-center justify-between border-b border-black/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: tasks[0].groupColor }} aria-hidden="true" />
                            <span className="text-caption font-bold text-black/55">{groupName}</span>
                            <span className="text-caption font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${tasks[0].projectColor}10`, color: tasks[0].projectColor }}>
                              {svcLabel(tasks[0].project)}
                            </span>
                          </div>
                          <span className="text-caption font-medium text-black/30">{tasks.length}</span>
                        </div>
                        {/* Task rows */}
                        {tasks.map(task => {
                          const days = daysUntil(task.dueDateISO);
                          const overdue = days < 0;
                          const today = days === 0;
                          const urgent = days <= 2 && days >= 0;
                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] hover:bg-black/[0.01] transition-colors cursor-pointer group ${
                                overdue ? 'bg-rose-50/40' : ''
                              }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => router.push('/workspace')}
                              onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                              aria-label={`${task.priority} task: ${task.title}. Pending. ${overdue ? `${Math.abs(days)} days overdue` : today ? 'Due today' : `Due ${task.dueDate}`}`}
                            >
                              {/* Basecamp-style circle checkbox */}
                              <Circle className={`w-[18px] h-[18px] flex-shrink-0 ${overdue ? 'text-rose-300' : 'text-black/15'} group-hover:text-[#204CC7]/40 transition-colors`} strokeWidth={2} />
                              {/* Task content */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-body leading-snug ${overdue ? 'text-black/80' : 'text-black/70'}`}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-caption font-bold ${task.priority === 'P1' ? 'text-red-500' : 'text-amber-500'}`}>{task.priority}</span>
                                  <span className="text-black/10">·</span>
                                  <span className={`text-caption font-medium ${
                                    overdue ? 'text-rose-500' : today ? 'text-amber-600' : urgent ? 'text-amber-500' : 'text-black/35'
                                  }`}>
                                    {overdue ? `${Math.abs(days)}d overdue` : today ? 'Due today' : urgent ? `${days}d left` : `Due ${task.dueDate}`}
                                  </span>
                                  <span className="text-black/10">·</span>
                                  <span className="inline-flex items-center gap-1 text-caption text-black/35">
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-semibold text-[11px] leading-none">Pending</span>
                                  </span>
                                </div>
                              </div>
                              {/* Assignee avatar */}
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                                style={{ backgroundColor: task.assignee.color }}
                                title={task.assignee.initials}
                              >
                                {task.assignee.initials}
                              </div>
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
                  View all tasks <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* ── Brego Group Widget (Basecamp-style) ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" aria-label="Brego internal task assignments">
              {/* Header */}
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
                <div className="flex items-center gap-0.5 bg-black/[0.03] rounded-lg p-0.5" role="radiogroup" aria-label="Filter internal tasks by priority">
                  {(['all', 'P1', 'P2'] as const).map(f => (
                    <button
                      key={f}
                      role="radio"
                      aria-checked={taskFilter === f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-caption font-semibold transition-all ${
                        taskFilter === f ? 'bg-white shadow-sm text-[#204CC7]' : 'text-black/35 hover:text-black/55'
                      }`}
                    >
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task List — grouped by department (A&T / PM) */}
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
                {bregoSortedGroups.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-body text-black/30">No {taskFilter === 'all' ? '' : taskFilter + ' '}pending internal tasks</p>
                  </div>
                ) : (
                  <div>
                    {bregoSortedGroups.map(([groupName, tasks]) => {
                      const deptColor = groupName === 'Accounts & Taxation' ? '#06B6D4' : '#7C3AED';
                      const deptLabel = groupName === 'Accounts & Taxation' ? 'A&T' : 'SEM';
                      return (
                        <div key={groupName}>
                          {/* Group header */}
                          <div className="px-5 py-2 bg-black/[0.018] flex items-center justify-between border-b border-black/[0.04]">
                            <div className="flex items-center gap-2">
                              <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: deptColor }} aria-hidden="true" />
                              <span className="text-caption font-bold text-black/55">{groupName}</span>
                              <span className="text-caption font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${deptColor}10`, color: deptColor }}>
                                {deptLabel}
                              </span>
                            </div>
                            <span className="text-caption font-medium text-black/30">{tasks.length}</span>
                          </div>
                          {/* Task rows */}
                          {tasks.map(task => {
                            const days = daysUntil(task.dueDateISO);
                            const overdue = days < 0;
                            const today = days === 0;
                            const urgent = days <= 2 && days >= 0;
                            return (
                              <div
                                key={task.id}
                                className={`flex items-center gap-3 px-5 py-3 border-b border-black/[0.03] hover:bg-black/[0.01] transition-colors cursor-pointer group ${
                                  overdue ? 'bg-rose-50/40' : ''
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push('/workspace')}
                                onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                                aria-label={`${task.priority} task: ${task.title}. Pending. ${overdue ? `${Math.abs(days)} days overdue` : today ? 'Due today' : `Due ${task.dueDate}`}`}
                              >
                                {/* Basecamp-style circle checkbox */}
                                <Circle className={`w-[18px] h-[18px] flex-shrink-0 ${overdue ? 'text-rose-300' : 'text-black/15'} group-hover:text-[#204CC7]/40 transition-colors`} strokeWidth={2} />
                                {/* Task content */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-body leading-snug ${overdue ? 'text-black/80' : 'text-black/70'}`}>{task.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-caption font-bold ${task.priority === 'P1' ? 'text-red-500' : 'text-amber-500'}`}>{task.priority}</span>
                                    <span className="text-black/10">·</span>
                                    <span className={`text-caption font-medium ${
                                      overdue ? 'text-rose-500' : today ? 'text-amber-600' : urgent ? 'text-amber-500' : 'text-black/35'
                                    }`}>
                                      {overdue ? `${Math.abs(days)}d overdue` : today ? 'Due today' : urgent ? `${days}d left` : `Due ${task.dueDate}`}
                                    </span>
                                    <span className="text-black/10">·</span>
                                    <span className="inline-flex items-center gap-1 text-caption text-black/35">
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-semibold text-[11px] leading-none">Pending</span>
                                    </span>
                                  </div>
                                </div>
                                {/* Assignee avatar */}
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                                  style={{ backgroundColor: task.assignee.color }}
                                  title={task.assignee.initials}
                                >
                                  {task.assignee.initials}
                                </div>
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
                <button onClick={() => router.push('/workspace/task-management/brego-group')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  View all tasks <ArrowRight className="w-3 h-3" />
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
                        }`}>{inc.service === 'Internal' ? 'HR / Internal' : svcLabel(inc.service)}</span>
                        <span className="text-caption text-black/30">·</span>
                        <span className="text-caption text-black/50">{inc.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer CTA — matches PM & A&T */}
              <div className="mt-auto px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/adminland/incidents?type=Client')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  View all incidents <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>

            {/* ── SEM (tabbed) ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.35s ease-out 0.15s both' }} aria-label="SEM attention items">
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
                      aria-label={`${item.urgency} urgency: ${item.client}. Pending. ${item.detail}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-body font-medium text-black/75 truncate">{item.client}</span>
                        <span className="text-caption font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 bg-amber-50 text-amber-600">Pending</span>
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
                <button onClick={() => router.push('/workspace/performance-marketing')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  SEM Workspace <ArrowRight className="w-3 h-3" />
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

              {/* Overdue / Onboarding Tabs */}
              <div className="px-5 py-0 border-b border-black/[0.04] flex items-center gap-0" role="tablist" aria-label="A&T category">
                {([
                  { key: 'overdue' as const, label: 'Overdue Work' },
                  { key: 'onboarding' as const, label: 'Onboarding' },
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
                    <div className="px-5 py-8 text-center text-caption text-black/50">No items</div>
                  );
                  return items.map((item, i) => (
                    <div
                      key={i}
                      className={`px-5 py-3.5 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer border-l-[3px] ${
                        item.urgency === 'high' ? 'border-l-rose-400' : 'border-l-transparent'
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push('/workspace')}
                      onKeyDown={(e) => handleKeyNav(e, () => router.push('/workspace'))}
                      aria-label={`${item.client}. ${item.taskType}. ${item.detail}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body font-medium text-black/80 truncate">{item.client}</span>
                        <span className="text-caption font-semibold px-1.5 py-0.5 rounded bg-cyan-50 text-[#06B6D4] flex-shrink-0 ml-2">{item.taskType}</span>
                      </div>
                      <p className="text-caption text-black/55 leading-relaxed">{item.detail}</p>
                      {item.type === 'overdue' && item.daysSinceUpdate && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Clock className="w-3 h-3 text-rose-400" aria-hidden="true" />
                          <span className="text-caption font-medium text-rose-500">{item.daysSinceUpdate}d stalled</span>
                        </div>
                      )}
                      {item.type === 'onboarding' && item.onboardingStatus && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {item.onboardingStatus === 'in-progress' ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-[#204CC7] animate-pulse" aria-hidden="true" />
                              <span className="text-caption font-semibold text-[#204CC7]">In Progress</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
                              <span className="text-caption font-semibold text-amber-500">Pending</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-auto px-5 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                <button onClick={() => router.push('/workspace/accounts-taxation')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
                  Accounts & Taxation Workspace <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </section>
          </div>

          {/* ═══ ROW 3: Client Channels + Team Channels — Two Equal Columns ═══ */}
          <div className="grid grid-cols-2 gap-6">

            {/* Client Channel Mentions */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.4s ease-out 0.2s both' }} aria-label="Client channel mentions">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center" aria-hidden="true">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Client Channels</h2>
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-500">{clientChannelMentions.reduce((s, c) => s + c.unread, 0)}</span>
                </div>
                <button onClick={() => router.push('/inbox')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] transition-colors">
                  Open Inbox
                </button>
              </div>
              <div className="divide-y divide-black/[0.03] overflow-y-auto" style={{ maxHeight: '380px' }}>
                {clientChannelMentions.map((ch, i) => (
                  <div key={i} className={`px-5 py-3.5 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer ${ch.unread > 0 ? '' : 'opacity-50'}`} role="button" tabIndex={0} onClick={() => router.push('/inbox')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/inbox'))} aria-label={`${ch.channel}, ${ch.unread} unread messages. Last from ${ch.lastSender}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {ch.unread > 0 && <div className="w-2 h-2 rounded-full bg-[#204CC7] flex-shrink-0" aria-hidden="true" />}
                        <span className={`text-body font-semibold ${ch.unread > 0 ? 'text-black/80' : 'text-black/55'}`}>{ch.channel}</span>
                        {ch.unread > 0 && (
                          <span className="text-caption font-bold text-white bg-[#204CC7] px-1.5 py-0.5 rounded-md min-w-[20px] text-center" aria-label={`${ch.unread} unread`}>{ch.unread}</span>
                        )}
                      </div>
                      <span className="text-caption text-black/35">{ch.time}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ch.lastSenderColor }}>{ch.lastSenderInitials}</span>
                      <p className="text-caption text-black/45 truncate leading-relaxed">{ch.preview}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Team Channel Mentions */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.4s ease-out 0.22s both' }} aria-label="Team channel mentions">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-hidden="true">
                    <Users className="w-3.5 h-3.5 text-[#204CC7]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Team Channels</h2>
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#204CC7]">{teamChannelMentions.reduce((s, c) => s + c.unread, 0)}</span>
                </div>
                <button onClick={() => router.push('/inbox')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] transition-colors">
                  Open Inbox
                </button>
              </div>
              <div className="divide-y divide-black/[0.03] overflow-y-auto" style={{ maxHeight: '380px' }}>
                {teamChannelMentions.map((ch, i) => (
                  <div key={i} className={`px-5 py-3.5 hover:bg-black/[0.008] focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:outline-none transition-colors cursor-pointer ${ch.unread > 0 ? '' : 'opacity-50'}`} role="button" tabIndex={0} onClick={() => router.push('/inbox')} onKeyDown={(e) => handleKeyNav(e, () => router.push('/inbox'))} aria-label={`${ch.channel}, ${ch.unread} unread messages. Last from ${ch.lastSender}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {ch.unread > 0 && <div className="w-2 h-2 rounded-full bg-[#204CC7] flex-shrink-0" aria-hidden="true" />}
                        <span className={`text-body font-semibold ${ch.unread > 0 ? 'text-black/80' : 'text-black/55'}`}>{ch.channel}</span>
                        {ch.unread > 0 && (
                          <span className="text-caption font-bold text-white bg-[#204CC7] px-1.5 py-0.5 rounded-md min-w-[20px] text-center" aria-label={`${ch.unread} unread`}>{ch.unread}</span>
                        )}
                      </div>
                      <span className="text-caption text-black/35">{ch.time}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: ch.lastSenderColor }}>{ch.lastSenderInitials}</span>
                      <p className="text-caption text-black/45 truncate leading-relaxed">{ch.preview}</p>
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
                    <button onClick={() => router.push('/workspace/performance-marketing')} className="text-caption font-semibold text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 transition-colors">
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

          {/* ═══ ROW 5: Attrition + Margin Performance — Two Charts ═══ */}
          <div className="grid grid-cols-2 gap-6">

            {/* ── Attrition Performance ── */}
            {(() => {
              const ap = attritionByPeriod[attritionPeriod];
              const apLabel = CHART_PERIOD_OPTIONS.find(o => o.value === attritionPeriod)?.label ?? attritionPeriod;
              return (
                <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.5s ease-out 0.26s both' }} aria-label="Client attrition performance">
                  <div className="px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center" aria-hidden="true">
                        <UserMinus className="w-4 h-4 text-[#E2445C]" />
                      </div>
                      <h2 className="text-body font-bold text-black/80">Client Attrition</h2>
                      <div ref={attritionPeriodRef} className="relative ml-1">
                        <button onClick={() => setAttritionPeriodOpen(!attritionPeriodOpen)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.08] bg-black/[0.015] hover:bg-black/[0.03] transition-colors">
                          <span className="text-caption font-medium text-black/60">{apLabel}</span>
                          <ChevronDown className={`w-3 h-3 text-black/35 transition-transform ${attritionPeriodOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {attritionPeriodOpen && (
                          <div className="absolute top-full left-0 mt-1 w-[160px] bg-white rounded-lg border border-black/[0.08] shadow-lg py-1 z-50">
                            {CHART_PERIOD_OPTIONS.map(o => (
                              <button key={o.value} onClick={() => { setAttritionPeriod(o.value); setAttritionPeriodOpen(false); }} className={`w-full text-left px-3 py-1.5 text-caption transition-colors flex items-center justify-between ${attritionPeriod === o.value ? 'bg-black/[0.03] font-semibold text-black/80' : 'text-black/60 hover:bg-black/[0.02]'}`}>
                                {o.label}
                                {attritionPeriod === o.value && <Check className="w-3 h-3 text-[#204CC7]" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-h3 font-bold text-[#00C875]">{ap.retentionRate}%</p>
                        <p className="text-caption text-black/50">Retention</p>
                      </div>
                      <div className="w-px h-8 bg-black/[0.06]" />
                      <div className="text-right">
                        <p className="text-h3 font-bold text-[#E2445C]">{formatLakh(ap.revenueLost)}</p>
                        <p className="text-caption text-black/50">Rev. Lost</p>
                      </div>
                      <div className="w-px h-8 bg-black/[0.06]" />
                      <div className="text-right">
                        <p className="text-h3 font-bold text-black/75">{ap.lost}</p>
                        <p className="text-caption text-black/50">Lost ({ap.periodLabel})</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pt-4 pb-2 flex-1" style={{ minHeight: '200px' }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={ap.data} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as AttritionEntry;
                            return (
                              <div className="bg-white rounded-xl border border-black/[0.06] shadow-lg px-3.5 py-2.5 text-caption" style={{ minWidth: 140 }}>
                                <p className="font-semibold text-black/70 mb-1.5">{label}</p>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-black/50">Lost</span>
                                  <span className="font-bold text-[#E2445C]">{d.lost}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-black/50">Rev. Lost</span>
                                  <span className="font-bold text-[#E2445C]">{d.revLost > 0 ? formatLakh(d.revLost) : '—'}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-black/[0.06]">
                                  <span className="text-black/50">Attrition</span>
                                  <span className="font-bold text-black/70">{d.rate}%</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="retained" stackId="a" fill="#00C875" radius={[0, 0, 4, 4]} name="retained" />
                        <Bar dataKey="lost" stackId="a" fill="#E2445C" radius={[4, 4, 0, 0]} name="lost" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="px-6 py-3 border-t border-black/[0.04] flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#00C875]" aria-hidden="true" />
                      <span className="text-caption text-black/50">Retained</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#E2445C]" aria-hidden="true" />
                      <span className="text-caption text-black/50">Lost</span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#00C875]" aria-hidden="true" />
                      <span className="text-caption font-medium text-[#00C875]">{ap.trend}</span>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* ── Margin Performance ── */}
            {(() => {
              const mp = marginByPeriod[marginPeriod];
              const revDisplay = mp.totalRevenue >= 10000000 ? `₹${(mp.totalRevenue / 10000000).toFixed(1)}Cr` : `₹${(mp.totalRevenue / 100000).toFixed(1)}L`;
              const mpLabel = CHART_PERIOD_OPTIONS.find(o => o.value === marginPeriod)?.label ?? marginPeriod;
              return (
                <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.5s ease-out 0.28s both' }} aria-label="Client margin performance">
                  <div className="px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center" aria-hidden="true">
                        <DollarSign className="w-4 h-4 text-[#00C875]" />
                      </div>
                      <h2 className="text-body font-bold text-black/80">Margin Performance</h2>
                      <div ref={marginPeriodRef} className="relative ml-1">
                        <button onClick={() => setMarginPeriodOpen(!marginPeriodOpen)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-black/[0.08] bg-black/[0.015] hover:bg-black/[0.03] transition-colors">
                          <span className="text-caption font-medium text-black/60">{mpLabel}</span>
                          <ChevronDown className={`w-3 h-3 text-black/35 transition-transform ${marginPeriodOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {marginPeriodOpen && (
                          <div className="absolute top-full left-0 mt-1 w-[160px] bg-white rounded-lg border border-black/[0.08] shadow-lg py-1 z-50">
                            {CHART_PERIOD_OPTIONS.map(o => (
                              <button key={o.value} onClick={() => { setMarginPeriod(o.value); setMarginPeriodOpen(false); }} className={`w-full text-left px-3 py-1.5 text-caption transition-colors flex items-center justify-between ${marginPeriod === o.value ? 'bg-black/[0.03] font-semibold text-black/80' : 'text-black/60 hover:bg-black/[0.02]'}`}>
                                {o.label}
                                {marginPeriod === o.value && <Check className="w-3 h-3 text-[#204CC7]" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-h3 font-bold text-[#00C875]">{mp.avgMargin}%</p>
                        <p className="text-caption text-black/50">Avg. Margin</p>
                      </div>
                      <div className="w-px h-8 bg-black/[0.06]" />
                      <div className="text-right">
                        <p className="text-h3 font-bold text-black/75">{revDisplay}</p>
                        <p className="text-caption text-black/50">Revenue ({mp.periodLabel})</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pt-4 pb-2 flex-1" style={{ minHeight: '200px' }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mp.data} barCategoryGap="25%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} width={28} unit="%" />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.[0]) return null;
                            const d = payload[0].payload as MarginEntry;
                            return (
                              <div className="bg-white rounded-xl border border-black/[0.06] shadow-lg px-3.5 py-2.5 text-caption" style={{ minWidth: 140 }}>
                                <p className="font-semibold text-black/70 mb-1.5">{label}</p>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-black/50">Revenue</span>
                                  <span className="font-bold text-black/75">{formatLakh(d.revenue)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-black/50">Cost</span>
                                  <span className="font-medium text-black/60">{formatLakh(d.cost)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 pt-1 border-t border-black/[0.06]">
                                  <span className="text-black/50">Margin</span>
                                  <span className="font-bold" style={{ color: d.margin >= 32 ? '#00C875' : d.margin >= 30 ? '#FDAB3D' : '#E2445C' }}>{d.margin}%</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="margin" radius={[6, 6, 0, 0]} name="margin">
                          {mp.data.map((entry, idx) => (
                            <Cell key={idx} fill={entry.margin >= 32 ? '#00C875' : entry.margin >= 30 ? '#FDAB3D' : '#E2445C'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="px-6 py-3 border-t border-black/[0.04] flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#00C875]" aria-hidden="true" />
                      <span className="text-caption text-black/50">&ge;32%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#FDAB3D]" aria-hidden="true" />
                      <span className="text-caption text-black/50">30-31%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#E2445C]" aria-hidden="true" />
                      <span className="text-caption text-black/50">&lt;30%</span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#00C875]" aria-hidden="true" />
                      <span className="text-caption font-medium text-[#00C875]">{mp.trend}</span>
                    </div>
                  </div>
                </section>
              );
            })()}

          </div>

          {/* ═══ ROW 6: Customer Ratings + Upsell (HOD) / Birthdays (Manager) ═══ */}
          <div className="grid grid-cols-2 gap-6">

            {/* ── Customer Ratings ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.55s ease-out 0.30s both' }} aria-label="Customer ratings">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center" aria-hidden="true">
                    <Star className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Customer Ratings</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-h3 font-bold text-[#FDAB3D]">
                    {(customerRatings.reduce((s, r) => s + r.rating, 0) / customerRatings.length).toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className="w-3 h-3" aria-hidden="true"
                        fill={s <= Math.round(customerRatings.reduce((sum, r) => sum + r.rating, 0) / customerRatings.length) ? '#FDAB3D' : 'none'}
                        stroke={s <= Math.round(customerRatings.reduce((sum, r) => sum + r.rating, 0) / customerRatings.length) ? '#FDAB3D' : 'rgba(0,0,0,0.15)'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto divide-y divide-black/[0.03]" style={{ maxHeight: '340px' }}>
                {customerRatings.map((r, i) => (
                  <div key={i} className="px-5 py-3 hover:bg-black/[0.008] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-body font-medium text-black/75">{r.client}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-caption font-semibold px-1.5 py-0.5 rounded ${r.service === 'PM' ? 'bg-purple-50 text-[#7C3AED]' : 'bg-cyan-50 text-[#06B6D4]'}`}>{svcLabel(r.service)}</span>
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className="w-3 h-3" aria-hidden="true"
                              fill={s <= r.rating ? '#FDAB3D' : 'none'}
                              stroke={s <= r.rating ? '#FDAB3D' : 'rgba(0,0,0,0.15)'}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-caption text-black/50">{r.feedback}</p>
                  </div>
                ))}
              </div>
            </section>

            {activeRole === 'hod' && (
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.55s ease-out 0.32s both' }} aria-label="Upsell and cross-sell opportunities">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center" aria-hidden="true">
                    <Sparkles className="w-3.5 h-3.5 text-[#00C875]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Upsell / Cross-sell</h2>
                </div>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#00C875]">
                  ₹{(upsellOpportunities.reduce((s, o) => s + o.potentialRevenue, 0) / 100000).toFixed(1)}L potential
                </span>
              </div>
              {/* Table header */}
              <div className="px-5 py-2 bg-black/[0.015] flex items-center text-caption font-semibold text-black/45">
                <span className="flex-1">Client</span>
                <span className="w-[80px] text-right">Revenue</span>
                <span className="w-[80px] text-right">Confidence</span>
              </div>
              <div className="overflow-y-auto divide-y divide-black/[0.03]" style={{ maxHeight: '320px' }}>
                {upsellOpportunities.map((opp, i) => {
                  const conf = confidenceConfig[opp.confidence];
                  return (
                    <div key={i} className="px-5 py-3 flex items-center hover:bg-black/[0.006] transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-body font-medium text-black/80 truncate">{opp.client}</p>
                          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${opp.currentService === 'PM' ? 'bg-purple-50 text-[#7C3AED]' : 'bg-cyan-50 text-[#06B6D4]'}`}>{svcLabel(opp.currentService)}</span>
                        </div>
                        <p className="text-caption text-black/50 truncate mt-0.5">{opp.opportunity}</p>
                      </div>
                      <span className="w-[80px] text-right text-body font-bold text-[#00C875] tabular-nums flex-shrink-0">{formatLakh(opp.potentialRevenue)}</span>
                      <span className={`w-[80px] text-right text-caption font-semibold flex-shrink-0 ${conf.text}`}>{conf.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            )}

            {/* Manager/Executive: Birthdays widget sits beside Customer Ratings */}
            {(activeRole === 'manager' || activeRole === 'executive') && (
              <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.55s ease-out 0.32s both' }} aria-label="Upcoming birthdays">
                <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center" aria-hidden="true">
                    <Cake className="w-3.5 h-3.5 text-pink-500" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Upcoming Birthdays</h2>
                </div>
                <div className="divide-y divide-black/[0.03] overflow-y-auto flex-1">
                  {upcomingBirthdays.map((bd, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: bd.color }}
                      >
                        {bd.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-medium text-black/70">{bd.name}</p>
                        <p className="text-caption text-black/50">{bd.role}</p>
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
            )}

          </div>

          {activeRole === 'hod' && (
          <>
          {/* ═══ ROW 7: CLA / NTF Nominations — Two Columns ═══ */}
          <div className="grid grid-cols-2 gap-6">

            {/* ── Client - CLA ── */}
            <section
              className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/clientcla"
              style={{ animation: 'dashUp 0.6s ease-out 0.34s both' }}
              aria-label="Client CLA nominations"
              onClick={() => router.push('/adminland/clients?tab=cla')}
              onKeyDown={(e) => handleKeyNav(e, () => router.push('/adminland/clients?tab=cla'))}
              tabIndex={0}
              role="link"
            >
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-hidden="true">
                    <Award className="w-3.5 h-3.5 text-[#204CC7]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Client - CLA</h2>
                  <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/clientcla:opacity-100 transition-opacity" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-[#E2445C]/[0.08] text-[#E2445C]">{clientNominations.filter(n => n.claStatus === 'sureshot').length} sureshot</span>
                  <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-[#FDAB3D]/[0.08] text-[#FDAB3D]">{clientNominations.filter(n => n.claStatus === 'can-be-saved').length} saveable</span>
                </div>
              </div>
              {/* Table header */}
              <div className="px-5 py-2 bg-black/[0.015] flex items-center text-caption font-semibold text-black/45">
                <span className="flex-1">Client</span>
                <span className="w-[110px] text-center">Responsible</span>
                <span className="w-[110px] text-right">Status</span>
              </div>
              <div className="overflow-y-auto divide-y divide-black/[0.03]" style={{ maxHeight: '320px' }}>
                {clientNominations.map((n, i) => (
                  <div key={i} className="px-5 py-3 flex items-center hover:bg-black/[0.006] transition-colors">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-body font-medium text-black/80 truncate">{n.client}</p>
                      <p className="text-caption text-black/50 truncate">{n.reason}</p>
                    </div>
                    <span className="w-[110px] text-center text-caption font-medium text-black/65">{n.responsible}</span>
                    <span className="w-[110px] text-right">
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
                        n.claStatus === 'sureshot'
                          ? 'bg-[#E2445C]/[0.08] text-[#E2445C]'
                          : 'bg-[#FDAB3D]/[0.08] text-[#FDAB3D]'
                      }`}>
                        {n.claStatus === 'sureshot' ? 'Sureshot' : 'Can Be Saved'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Employee - CLA/NTF ── */}
            <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col" style={{ animation: 'dashUp 0.6s ease-out 0.36s both' }} aria-label="Employee CLA and NTF list">
              <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center" aria-hidden="true">
                    <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                  </div>
                  <h2 className="text-body font-bold text-black/80">Employee - CLA/NTF</h2>
                </div>
                <span className="text-caption font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7C3AED]">{employeeNominations.length}</span>
              </div>
              {/* Table header */}
              <div className="px-5 py-2 bg-black/[0.015] flex items-center text-caption font-semibold text-black/45">
                <span className="w-[60px]">Date</span>
                <span className="flex-1">Employee</span>
                <span className="w-[120px] text-right">Assigned Clients</span>
              </div>
              <div className="divide-y divide-black/[0.03]" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {employeeNominations.map((n, rowIdx) => (
                  <div key={rowIdx} className="px-5 py-3 flex items-center hover:bg-black/[0.006] transition-colors">
                    <span className="w-[60px] text-caption text-black/50 flex-shrink-0">{n.dateAdded}</span>
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="text-body font-medium text-black/80 truncate">{n.employee}</p>
                      <p className="text-caption text-black/50 truncate">{n.reason}</p>
                    </div>
                    <div className="w-[120px] flex justify-end flex-shrink-0">
                      <ClientCirclesGroup clients={n.clients} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
          </>
          )}

          {/* ═══ ROW 8: Upcoming Birthdays — Full Width (HOD only) ═══ */}
          {activeRole === 'hod' && (
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
                    <p className="text-caption text-black/50">{bd.role}</p>
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
          )}
        </div>
      </>)}
      </div>

      {/* ── HR Insights Drawer ── */}
      {insightsOpen && activeRole === 'hr' && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setInsightsOpen(false)} style={{ animation: 'insightsFadeIn 0.2s ease-out' }} />
          {/* Drawer */}
          <aside
            className="fixed top-0 right-0 z-50 h-full w-[420px] bg-white border-l border-black/[0.08] shadow-2xl flex flex-col"
            style={{ animation: 'insightsSlideIn 0.25s ease-out' }}
            role="dialog"
            aria-label="HR Insights"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <BarChart3 className="w-[18px] h-[18px] text-[#204CC7]" />
                </div>
                <div>
                  <h2 className="text-h3 text-black/85">HR Insights</h2>
                  <p className="text-caption text-black/35 mt-0.5">Dashboard Summary</p>
                </div>
              </div>
              <button onClick={() => setInsightsOpen(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all">
                <span className="text-black/40 text-body" aria-hidden="true">&times;</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── AI Insights ── */}
              <div className="rounded-xl border border-[#204CC7]/15 bg-gradient-to-br from-[#204CC7]/[0.03] to-[#7C3AED]/[0.03] p-4" style={{ animation: 'insightsFadeUp 0.25s ease-out' }}>
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#204CC7] to-[#7C3AED] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h3 className="text-caption font-bold text-[#204CC7] uppercase tracking-wide">AI Insights</h3>
                  <span className="ml-auto text-caption text-black/30">Updated today</span>
                </div>
                <div className="space-y-3">

                  {/* Insight 1 — Retention crisis alert */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-[#E2445C]/10">
                    <div className="w-5 h-5 rounded-full bg-[#E2445C]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-3 h-3 text-[#E2445C]" />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/80">Retention rate at {Math.round((hrPerfTotals.active / hrPerfTotals.grand) * 100)}% — critically below 60% benchmark</p>
                      <p className="text-caption text-black/50 mt-0.5">{hrPerfTotals.fired + hrPerfTotals.resigned} of {hrPerfTotals.grand} hires have exited since Jun &apos;25. Fired ({hrPerfTotals.fired}) outnumber resignations ({hrPerfTotals.resigned}), suggesting screening or onboarding gaps.</p>
                    </div>
                  </div>

                  {/* Insight 2 — Hiring pipeline bottleneck */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-[#FDAB3D]/10">
                    <div className="w-5 h-5 rounded-full bg-[#FDAB3D]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-[#FDAB3D]" />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/80">Sales hiring stalled — 0 of 8 BDE roles filled</p>
                      <p className="text-caption text-black/50 mt-0.5">Sales has {hrResourceRequests.filter(r => r.dept === 'Sales').length} open positions with no shortlisted candidates for final rounds. Consider expanding sourcing channels or revisiting budget bands.</p>
                    </div>
                  </div>

                  {/* Insight 3 — People risk correlation */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-[#7C3AED]/10">
                    <div className="w-5 h-5 rounded-full bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-3 h-3 text-[#7C3AED]" />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/80">{hrCLAEmployees.length} employees flagged — {hrCLAEmployees.filter(e => e.type === 'NTF').length} NTF exits imminent</p>
                      <p className="text-caption text-black/50 mt-0.5">{hrCLAEmployees.filter(e => e.dept === 'Performance Marketing').length} of {hrCLAEmployees.length} flagged employees are in Performance Marketing. Combined with {hrResourceRequests.filter(r => r.dept === 'SEM').length} open SEM roles, this department is at capacity risk.</p>
                    </div>
                  </div>

                  {/* Insight 4 — Positive signal */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-[#00C875]/10">
                    <div className="w-5 h-5 rounded-full bg-[#00C875]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-3 h-3 text-[#00C875]" />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/80">Hiring quality improving — zero exits in Apr &apos;26 so far</p>
                      <p className="text-caption text-black/50 mt-0.5">After peaking at 10 exits in Sep &apos;25, monthly attrition has trended down. Recent Jan-Mar cohorts show stronger retention — onboarding improvements may be working.</p>
                    </div>
                  </div>

                  {/* Insight 5 — Actionable recommendation */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/80 border border-[#204CC7]/10">
                    <div className="w-5 h-5 rounded-full bg-[#204CC7]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-3 h-3 text-[#204CC7]" />
                    </div>
                    <div>
                      <p className="text-caption font-semibold text-black/80">Recommended: Prioritize {hrIncidentList.filter(i => i.priority === 'High' && i.status === 'Open').length} high-priority incidents</p>
                      <p className="text-caption text-black/50 mt-0.5">{hrIncidentList.filter(i => i.status === 'Open').length} of {hrIncidentList.length} incidents remain open. Unresolved escalations correlate with higher CLA nominations — early resolution can reduce churn risk by up to 30%.</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Headline Numbers ── */}
              <div className="grid grid-cols-3 gap-3" style={{ animation: 'insightsFadeUp 0.3s ease-out' }}>
                {[
                  { label: 'Open Positions', value: hrResourceTotal.open, color: 'text-[#204CC7]', bg: 'bg-[#204CC7]/5' },
                  { label: 'Active Incidents', value: hrIncidentList.length, color: 'text-[#E2445C]', bg: 'bg-[#E2445C]/5' },
                  { label: 'Onboarding', value: hrOnboarding.length, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(kpi => (
                  <div key={kpi.label} className={`rounded-xl ${kpi.bg} p-3.5 text-center`}>
                    <p className={`text-h2 font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-caption text-black/40 mt-0.5">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Hiring Pipeline ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.35s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-[#204CC7]" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Hiring Pipeline</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Total openings</span>
                    <span className="text-caption font-bold text-black/75">{hrResourceRequests.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Active sourcing</span>
                    <span className="text-caption font-bold text-blue-600">{hrResourceRequests.filter(r => r.status === 'Active').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Interviewing</span>
                    <span className="text-caption font-bold text-amber-600">{hrResourceRequests.filter(r => r.status === 'Interviewing').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Offers sent</span>
                    <span className="text-caption font-bold text-emerald-600">{hrResourceRequests.filter(r => r.status === 'Offer Sent').length}</span>
                  </div>
                  {/* Pipeline bar */}
                  <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04] mt-1">
                    <div className="bg-blue-500 rounded-l-full" style={{ width: `${(hrResourceRequests.filter(r => r.status === 'Active').length / hrResourceRequests.length) * 100}%` }} />
                    <div className="bg-amber-400" style={{ width: `${(hrResourceRequests.filter(r => r.status === 'Interviewing').length / hrResourceRequests.length) * 100}%` }} />
                    <div className="bg-emerald-500 rounded-r-full" style={{ width: `${(hrResourceRequests.filter(r => r.status === 'Offer Sent').length / hrResourceRequests.length) * 100}%` }} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1.5 text-caption text-black/35"><span className="w-2 h-2 rounded-full bg-blue-500" />Active</span>
                    <span className="flex items-center gap-1.5 text-caption text-black/35"><span className="w-2 h-2 rounded-full bg-amber-400" />Interviewing</span>
                    <span className="flex items-center gap-1.5 text-caption text-black/35"><span className="w-2 h-2 rounded-full bg-emerald-500" />Offer Sent</span>
                  </div>
                </div>
              </div>

              {/* ── Hiring Performance ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.4s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Hiring Performance</h3>
                </div>
                <p className="text-caption text-black/45 mb-3">{hrPerfTotals.grand} hires tracked · Jun &apos;25 — Apr &apos;26</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-h3 font-bold text-emerald-700">{hrPerfTotals.active}</p>
                    <p className="text-caption text-emerald-600/60 mt-0.5">Active</p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 text-center">
                    <p className="text-h3 font-bold text-red-700">{hrPerfTotals.fired}</p>
                    <p className="text-caption text-red-600/60 mt-0.5">Fired</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 text-center">
                    <p className="text-h3 font-bold text-amber-700">{hrPerfTotals.resigned}</p>
                    <p className="text-caption text-amber-600/60 mt-0.5">Resigned</p>
                  </div>
                </div>
                <div className="mt-3 px-1">
                  <div className="flex items-center justify-between text-caption text-black/40">
                    <span>Retention rate</span>
                    <span className="font-bold text-emerald-600">{Math.round((hrPerfTotals.active / hrPerfTotals.grand) * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.04] mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(hrPerfTotals.active / hrPerfTotals.grand) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* ── People at Risk ── */}
              <div className="rounded-xl border border-[#E2445C]/15 bg-[#E2445C]/[0.02] p-4" style={{ animation: 'insightsFadeUp 0.45s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-[#E2445C]" />
                  <h3 className="text-caption font-bold text-[#E2445C]/80 uppercase tracking-wide">People at Risk</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">CLA employees</span>
                    <span className="text-caption font-bold text-amber-700">{hrCLAEmployees.filter(e => e.type === 'CLA').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">NTF employees</span>
                    <span className="text-caption font-bold text-rose-600">{hrCLAEmployees.filter(e => e.type === 'NTF').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Backed out (incoming)</span>
                    <span className="text-caption font-bold text-rose-600">{hrIncoming.filter(e => e.status === 'Backed Out').length}</span>
                  </div>
                </div>
                {hrCLAEmployees.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E2445C]/10 space-y-1.5">
                    {hrCLAEmployees.map((e, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/60">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${e.type === 'CLA' ? 'bg-amber-500' : 'bg-[#E2445C]'}`}>{e.type}</span>
                        <span className="text-caption font-medium text-black/70">{e.name}</span>
                        <span className="text-caption text-black/30 ml-auto">{e.dept}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Incidents Overview ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.5s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-orange-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Incidents</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Open</span>
                    <span className="text-caption font-bold text-rose-600">{hrIncidentList.filter(i => i.status === 'Open').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">In Progress</span>
                    <span className="text-caption font-bold text-blue-600">{hrIncidentList.filter(i => i.status === 'In Progress').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">High priority</span>
                    <span className="text-caption font-bold text-[#E2445C]">{hrIncidentList.filter(i => i.priority === 'High').length}</span>
                  </div>
                  {/* Top high-priority incidents */}
                  <div className="mt-2 pt-2 border-t border-black/[0.04] space-y-1.5">
                    <p className="text-caption font-semibold text-black/40 uppercase tracking-wide">Needs Attention</p>
                    {hrIncidentList.filter(i => i.priority === 'High' && i.status === 'Open').map(inc => (
                      <div key={inc.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-red-50/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E2445C] mt-[6px] flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-caption font-medium text-black/70">{inc.employee}</p>
                          <p className="text-caption text-black/40 line-clamp-1">{inc.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Incoming & Onboarding ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.55s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-purple-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Incoming & Onboarding</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <p className="text-h3 font-bold text-blue-700">{hrIncoming.filter(e => e.status === 'Incoming').length}</p>
                    <p className="text-caption text-blue-600/60 mt-0.5">Incoming</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 text-center">
                    <p className="text-h3 font-bold text-emerald-700">{hrIncoming.filter(e => e.status === 'Active').length}</p>
                    <p className="text-caption text-emerald-600/60 mt-0.5">Joined</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-caption text-black/55">Currently settling in</span>
                  <span className="text-caption font-bold text-amber-600">{hrOnboarding.length} employees</span>
                </div>
              </div>

              {/* ── Engagement ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.6s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <PartyPopper className="w-4 h-4 text-purple-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Engagement</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Completed events</span>
                    <span className="text-caption font-bold text-emerald-600">{hrEngagementEvents.filter(e => e.status === 'Completed').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Upcoming events</span>
                    <span className="text-caption font-bold text-blue-600">{hrEngagementEvents.filter(e => e.status === 'Upcoming').length}</span>
                  </div>
                  {hrEngagementEvents.filter(e => e.status === 'Upcoming').length > 0 && (
                    <div className="mt-2 pt-2 border-t border-black/[0.04]">
                      <p className="text-caption font-semibold text-black/40 uppercase tracking-wide mb-1.5">Coming Up</p>
                      {hrEngagementEvents.filter(e => e.status === 'Upcoming').map((ev, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-blue-50/50">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          <span className="text-caption font-medium text-black/70">{ev.event}</span>
                          <span className="text-caption text-black/30 ml-auto">{ev.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </aside>
        </>
      )}

      {/* ── HOD Insights Drawer ── */}
      {insightsOpen && (activeRole === 'hod' || activeRole === 'manager' || activeRole === 'executive') && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setInsightsOpen(false)} style={{ animation: 'insightsFadeIn 0.2s ease-out' }} />
          {/* Drawer */}
          <aside
            className="fixed top-0 right-0 z-50 h-full w-[420px] bg-white border-l border-black/[0.08] shadow-2xl flex flex-col"
            style={{ animation: 'insightsSlideIn 0.25s ease-out' }}
            role="dialog"
            aria-label="HOD Insights"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <Activity className="w-[18px] h-[18px] text-[#204CC7]" />
                </div>
                <div>
                  <h2 className="text-h3 text-black/85">HOD Insights</h2>
                  <p className="text-caption text-black/35 mt-0.5">Business Overview</p>
                </div>
              </div>
              <button onClick={() => setInsightsOpen(false)} className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center transition-all">
                <span className="text-black/40 text-body" aria-hidden="true">&times;</span>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* ── Headline KPIs ── */}
              <div className="grid grid-cols-4 gap-2.5" style={{ animation: 'insightsFadeUp 0.3s ease-out' }}>
                {[
                  { label: 'P1 Tasks', value: p1Count, color: 'text-[#E2445C]', bg: 'bg-[#E2445C]/5' },
                  { label: 'Overdue', value: overdueCount, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: 'Incidents', value: allIncidents.length, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Unread', value: clientChannelMentions.reduce((s, c) => s + c.unread, 0) + teamChannelMentions.reduce((s, c) => s + c.unread, 0), color: 'text-[#204CC7]', bg: 'bg-[#204CC7]/5' },
                ].map(kpi => (
                  <div key={kpi.label} className={`rounded-xl ${kpi.bg} p-3 text-center`}>
                    <p className={`text-h2 font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-caption text-black/40 mt-0.5">{kpi.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Task Summary ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.35s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Task Summary</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Total active tasks</span>
                    <span className="text-caption font-bold text-black/75">{myAssignments.filter(t => t.status === 'Pending').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Client tasks</span>
                    <span className="text-caption font-bold text-indigo-600">{myAssignments.filter(t => t.status === 'Pending' && t.group !== 'Brego Delivery Team').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Internal (Brego) tasks</span>
                    <span className="text-caption font-bold text-[#204CC7]">{myAssignments.filter(t => t.status === 'Pending' && t.group === 'Brego Delivery Team').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Completed</span>
                    <span className="text-caption font-bold text-emerald-600">{myAssignments.filter(t => t.status === 'Done').length}</span>
                  </div>
                  {/* Priority split bar */}
                  {(() => {
                    const pending = myAssignments.filter(t => t.status === 'Pending');
                    const p1 = pending.filter(t => t.priority === 'P1').length;
                    const p2 = pending.filter(t => t.priority === 'P2').length;
                    const total = p1 + p2 || 1;
                    return (
                      <>
                        <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04] mt-1">
                          <div className="bg-[#E2445C] rounded-l-full" style={{ width: `${(p1 / total) * 100}%` }} />
                          <div className="bg-amber-400 rounded-r-full" style={{ width: `${(p2 / total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1.5 text-caption text-black/35"><span className="w-2 h-2 rounded-full bg-[#E2445C]" />P1 ({p1})</span>
                          <span className="flex items-center gap-1.5 text-caption text-black/35"><span className="w-2 h-2 rounded-full bg-amber-400" />P2 ({p2})</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* ── Active Incidents ── */}
              <div className="rounded-xl border border-[#E2445C]/15 bg-[#E2445C]/[0.02] p-4" style={{ animation: 'insightsFadeUp 0.4s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-[#E2445C]" />
                  <h3 className="text-caption font-bold text-[#E2445C]/80 uppercase tracking-wide">Active Incidents</h3>
                  <span className="ml-auto text-caption font-bold text-[#E2445C]">{allIncidents.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <div className="rounded-lg bg-[#E2445C]/5 p-2.5 text-center">
                    <p className="text-h3 font-bold text-[#E2445C]">{allIncidents.filter(i => i.severity === 'Critical').length}</p>
                    <p className="text-caption text-[#E2445C]/50 mt-0.5">Critical</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-center">
                    <p className="text-h3 font-bold text-amber-700">{allIncidents.filter(i => i.severity === 'High').length}</p>
                    <p className="text-caption text-amber-600/50 mt-0.5">High</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-center">
                    <p className="text-h3 font-bold text-blue-700">{allIncidents.filter(i => i.severity === 'Medium').length}</p>
                    <p className="text-caption text-blue-600/50 mt-0.5">Medium</p>
                  </div>
                </div>
                {/* Critical incidents detail */}
                {allIncidents.filter(i => i.severity === 'Critical').length > 0 && (
                  <div className="pt-3 border-t border-[#E2445C]/10 space-y-1.5">
                    <p className="text-caption font-semibold text-[#E2445C]/50 uppercase tracking-wide">Needs Immediate Action</p>
                    {allIncidents.filter(i => i.severity === 'Critical').map(inc => (
                      <div key={inc.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E2445C] mt-[6px] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-caption font-medium text-black/70">{inc.relatedTo}</p>
                            <span className="text-caption text-black/30">{inc.daysOpen}d open</span>
                          </div>
                          <p className="text-caption text-black/40 line-clamp-1">{inc.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Business Health ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.45s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Business Health</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Retention */}
                  <div className="rounded-xl bg-emerald-50 p-3.5">
                    <p className="text-caption text-emerald-600/60 mb-1">Client Retention</p>
                    <p className="text-h1 font-bold text-emerald-700">{activeAttrition.retentionRate}%</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      <span className="text-caption font-medium text-emerald-600">{activeAttrition.trend}</span>
                    </div>
                  </div>
                  {/* Margin */}
                  <div className="rounded-xl bg-blue-50 p-3.5">
                    <p className="text-caption text-blue-600/60 mb-1">Avg Margin</p>
                    <p className="text-h1 font-bold text-blue-700">{activeMargin.avgMargin}%</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <TrendingUp className="w-3 h-3 text-blue-500" />
                      <span className="text-caption font-medium text-blue-600">{activeMargin.trend}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Total Q1 revenue</span>
                    <span className="text-caption font-bold text-black/75">{formatLakh(activeMargin.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Revenue lost (attrition)</span>
                    <span className="text-caption font-bold text-rose-600">{formatLakh(activeAttrition.revenueLost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Clients lost Q1</span>
                    <span className="text-caption font-bold text-rose-600">{activeAttrition.lost}</span>
                  </div>
                </div>
              </div>

              {/* ── PM & A&T Attention ── */}
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-4" style={{ animation: 'insightsFadeUp 0.5s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Needs Attention</h3>
                </div>
                <div className="space-y-3">
                  {/* PM Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                      <span className="text-caption font-bold text-[#7C3AED]">Performance Marketing</span>
                      <span className="text-caption font-medium text-black/30 ml-auto">{pmAttention.length} items</span>
                    </div>
                    <div className="space-y-1.5">
                      {pmAttention.filter(p => p.urgency === 'high').slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2445C] flex-shrink-0" />
                          <span className="text-caption font-medium text-black/70 truncate">{item.client}</span>
                          <span className="text-caption text-black/30 ml-auto flex-shrink-0">{item.stage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* A&T Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                      <span className="text-caption font-bold text-[#06B6D4]">Accounts & Taxation</span>
                      <span className="text-caption font-medium text-black/30 ml-auto">{atAttention.length} items</span>
                    </div>
                    <div className="space-y-1.5">
                      {atAttention.filter(a => a.urgency === 'high').slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/70">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E2445C] flex-shrink-0" />
                          <span className="text-caption font-medium text-black/70 truncate">{item.client}</span>
                          <span className="text-caption text-black/30 ml-auto flex-shrink-0">{item.taskType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Client Performance Snapshot ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.55s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-4 h-4 text-[#7C3AED]" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">PM Client Performance</h3>
                </div>
                {(() => {
                  const hitClients = pmClientPerformance.filter(c => c.ksmTarget === 'Hit');
                  const missClients = pmClientPerformance.filter(c => c.ksmTarget === 'Miss');
                  const hitPct = Math.round((hitClients.length / pmClientPerformance.length) * 100);
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-lg bg-emerald-50 p-3 text-center">
                          <p className="text-h3 font-bold text-emerald-700">{hitClients.length}</p>
                          <p className="text-caption text-emerald-600/60 mt-0.5">KSM Hit</p>
                        </div>
                        <div className="rounded-lg bg-rose-50 p-3 text-center">
                          <p className="text-h3 font-bold text-rose-700">{missClients.length}</p>
                          <p className="text-caption text-rose-600/60 mt-0.5">KSM Miss</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-caption text-black/40">
                        <span>KSM hit rate</span>
                        <span className={`font-bold ${hitPct >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>{hitPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${hitPct}%` }} />
                      </div>
                      {/* Bottom performers */}
                      {missClients.length > 0 && (
                        <div className="pt-2.5 border-t border-black/[0.04] space-y-1.5">
                          <p className="text-caption font-semibold text-black/40 uppercase tracking-wide">Underperforming</p>
                          {missClients.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                              <span className="text-caption font-medium text-black/70">{c.client}</span>
                              <span className="text-caption text-rose-500 ml-auto">
                                {c.clientType === 'Ecommerce' ? `${(c as PMPerfEcommerce).achievedROAS}x ROAS` : `${(c as PMPerfLeadGen).achievedLeads} leads`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── CLA/NTF & Upsell ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.6s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#204CC7]" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">CLA/NTF & Growth</h3>
                </div>
                <div className="space-y-3">
                  {/* CLA nominations summary */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-caption font-semibold text-black/50">Client Nominations</span>
                      <span className="text-caption font-bold text-rose-600">{clientNominations.length} clients</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-caption font-bold text-white bg-[#E2445C]">{claCount} sureshot</span>
                      <span className="px-2 py-0.5 rounded text-caption font-bold text-amber-700 bg-amber-100">{clientNominations.length - claCount} can be saved</span>
                    </div>
                  </div>
                  {/* Employee nominations summary */}
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Employee nominations</span>
                    <span className="text-caption font-bold text-amber-700">{employeeNominations.length} employees</span>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-black/[0.04]" />
                  {/* Upsell */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-caption font-semibold text-black/50">Upsell Pipeline</span>
                      <span className="text-caption font-bold text-emerald-600">{formatLakh(upsellTotal)}</span>
                    </div>
                    <div className="space-y-1.5">
                      {upsellOpportunities.filter(u => u.confidence === 'high').map((u, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00C875] flex-shrink-0" />
                          <span className="text-caption font-medium text-black/70 truncate">{u.client}</span>
                          <span className="text-caption text-emerald-600 ml-auto flex-shrink-0">{formatLakh(u.potentialRevenue)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-caption text-black/35">{upsellOpportunities.length} total opportunities</span>
                      <span className="text-caption font-bold text-[#00C875]">{upsellOpportunities.filter(u => u.confidence === 'high').length} high confidence</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Communication ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.65s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-[#204CC7]" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Communication</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-blue-50 p-3 text-center">
                    <p className="text-h3 font-bold text-blue-700">{clientChannelMentions.reduce((s, c) => s + c.unread, 0)}</p>
                    <p className="text-caption text-blue-600/60 mt-0.5">Client Unread</p>
                  </div>
                  <div className="rounded-lg bg-purple-50 p-3 text-center">
                    <p className="text-h3 font-bold text-purple-700">{teamChannelMentions.reduce((s, c) => s + c.unread, 0)}</p>
                    <p className="text-caption text-purple-600/60 mt-0.5">Team Unread</p>
                  </div>
                </div>
                {/* Top unread channels */}
                <div className="space-y-1.5">
                  <p className="text-caption font-semibold text-black/40 uppercase tracking-wide">Top Channels</p>
                  {[...clientChannelMentions, ...teamChannelMentions]
                    .filter(c => c.unread > 0)
                    .sort((a, b) => b.unread - a.unread)
                    .slice(0, 4)
                    .map((ch, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/[0.02]">
                        <span className="text-caption font-bold text-[#204CC7]">{ch.channel}</span>
                        <span className="text-caption text-black/30 truncate flex-1">{ch.preview}</span>
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#204CC7] text-white text-caption font-bold flex items-center justify-center">{ch.unread}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* ── Customer Ratings ── */}
              <div className="rounded-xl border border-black/[0.06] p-4" style={{ animation: 'insightsFadeUp 0.7s ease-out' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-[#FDAB3D]" />
                  <h3 className="text-caption font-bold text-black/70 uppercase tracking-wide">Customer Ratings</h3>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-h1 font-bold text-amber-600">{avgRating.toFixed(1)}</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? 'text-[#FDAB3D] fill-[#FDAB3D]' : 'text-black/10'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-caption text-black/35 ml-auto">{customerRatings.length} ratings</span>
                </div>
                {/* Rating distribution */}
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = customerRatings.filter(r => r.rating === star).length;
                    const pct = Math.round((count / customerRatings.length) * 100);
                    return (
                      <div key={star} className="flex items-center gap-2.5">
                        <span className="text-caption font-medium text-black/40 w-3">{star}</span>
                        <Star className="w-3 h-3 text-[#FDAB3D] fill-[#FDAB3D]" />
                        <div className="flex-1 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                          <div className="h-full rounded-full bg-[#FDAB3D]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-caption text-black/30 w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Low-rated clients */}
                {customerRatings.filter(r => r.rating <= 3).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-black/[0.04] space-y-1.5">
                    <p className="text-caption font-semibold text-black/40 uppercase tracking-wide">At Risk</p>
                    {customerRatings.filter(r => r.rating <= 3).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-caption font-medium text-black/70">{r.client}</span>
                        <span className="text-caption text-black/30 ml-auto">{r.rating}/5 — {r.feedback}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        @keyframes dashUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes insightsSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes insightsFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes insightsFadeUp {
          from { opacity: 0; transform: translateY(12px); }
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
