import { FileText, BarChart3, Building2 } from 'lucide-react';

// ── Types ──
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type Priority = 'P1' | 'P2' | 'P3';
export type SortOption = 'Due Date' | 'Priority' | 'Status' | 'Recently Added';
export type QuickFilter = 'all' | 'thisWeek' | 'overdue';

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: typeof BarChart3;
  tasksCount: number;
  completedTasks: number;
  overdueTasks: number;
  team: { initials: string; name: string; color: string }[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  dueDateISO: string;
  assignedBy: { name: string; initials: string; color: string };
  assignedTo: { name: string; initials: string; color: string };
  projectId: string;
  clientGroupId?: string;
  tags?: string[];
  comments: number;
}

export interface ClientGroup {
  id: string;
  name: string;
  projectId: string;
  color: string;
}

// ── Color helpers ──
export const priorityConfig: Record<Priority, { bg: string; text: string; dot: string; label: string }> = {
  P1: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', label: 'P1' },
  P2: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', label: 'P2' },
  P3: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400', label: 'P3' },
};

export const statusConfig: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  'Pending': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

// ── Team Members ──
export const teamMembers = [
  { initials: 'AF', name: 'Arjun F.', color: '#3B82F6' },
  { initials: 'JN', name: 'Jaya N.', color: '#10B981' },
  { initials: 'SM', name: 'Sahil M.', color: '#8B5CF6' },
  { initials: 'RK', name: 'Ritika K.', color: '#EF4444' },
  { initials: 'MG', name: 'Meera G.', color: '#F59E0B' },
  { initials: 'DN', name: 'Deepa N.', color: '#EC4899' },
  { initials: 'VT', name: 'Vivek T.', color: '#6366F1' },
  { initials: 'KB', name: 'Kiran B.', color: '#14B8A6' },
  { initials: 'AJ', name: 'Anita J.', color: '#F97316' },
  { initials: 'SI', name: 'Suresh I.', color: '#22C55E' },
  { initials: 'PS', name: 'Priya S.', color: '#A855F7' },
  { initials: 'KR', name: 'Kavita R.', color: '#0EA5E9' },
  { initials: 'RD', name: 'Rohit D.', color: '#F43F5E' },
  { initials: 'SK', name: 'Sneha K.', color: '#84CC16' },
];

// ── Mock Projects ──
export const mockProjects: Project[] = [
  {
    id: 'bg', name: 'Brego Group', color: '#204CC7', icon: Building2,
    tasksCount: 9, completedTasks: 5, overdueTasks: 1,
    team: [teamMembers[3], teamMembers[6], teamMembers[7], teamMembers[0], teamMembers[2], teamMembers[5], teamMembers[8], teamMembers[10], teamMembers[11], teamMembers[13], teamMembers[12]],
  },
  {
    id: 'at', name: 'Accounts & Taxation', color: '#10B981', icon: FileText,
    tasksCount: 7, completedTasks: 1, overdueTasks: 3,
    team: [teamMembers[2], teamMembers[5], teamMembers[9], teamMembers[0], teamMembers[3], teamMembers[7], teamMembers[8], teamMembers[11], teamMembers[12], teamMembers[13], teamMembers[4]],
  },
  {
    id: 'pm', name: 'Performance Marketing', color: '#3B82F6', icon: BarChart3,
    tasksCount: 12, completedTasks: 4, overdueTasks: 2,
    team: [teamMembers[0], teamMembers[1], teamMembers[4], teamMembers[3], teamMembers[6], teamMembers[8], teamMembers[9], teamMembers[10], teamMembers[11], teamMembers[12], teamMembers[13]],
  },
];

// ── Client Groups (clients within each service) ──
export const clientGroups: ClientGroup[] = [
  // Brego Delivery Teams (special internal groups — always first)
  { id: 'cg-bdt-at', name: 'Brego Delivery Team', projectId: 'at', color: '#204CC7' },
  { id: 'cg-bdt-pm', name: 'Brego Delivery Team', projectId: 'pm', color: '#204CC7' },
  // Accounts & Taxation clients
  { id: 'cg-tc', name: 'TechCorp India', projectId: 'at', color: '#6366F1' },
  { id: 'cg-ge', name: 'Green Energy Industries', projectId: 'at', color: '#10B981' },
  { id: 'cg-ff', name: 'Fashion Forward Ltd', projectId: 'at', color: '#F59E0B' },
  { id: 'cg-hc', name: 'HealthCare Plus', projectId: 'at', color: '#EC4899' },
  { id: 'cg-rm-at', name: 'RetailMax', projectId: 'at', color: '#14B8A6' },
  // Performance Marketing clients
  { id: 'cg-99', name: '99 Pancakes', projectId: 'pm', color: '#F97316' },
  { id: 'cg-ac', name: 'Anaya College', projectId: 'pm', color: '#8B5CF6' },
  { id: 'cg-ag', name: 'Alpine Group', projectId: 'pm', color: '#2563EB' },
  { id: 'cg-fh', name: 'Fashion Hub', projectId: 'pm', color: '#EC4899' },
  { id: 'cg-rm-pm', name: 'RetailMax', projectId: 'pm', color: '#10B981' },
];

// ── Mock Tasks ──
export const generateTasks = (): Task[] => [
  // Accounts & Taxation tasks
  { id: 't1', title: 'Prepare and file monthly GST returns for active client accounts', description: 'Review the task requirements, coordinate with assigned team members, and ensure timely completion. Update status and notify stakeholders upon completion.', status: 'Pending', priority: 'P1', dueDate: 'Tue, 24 Feb', dueDateISO: '2026-02-24', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[9], projectId: 'at', clientGroupId: 'cg-tc', comments: 2 },
  { id: 't2', title: 'Submit Q4 bank reconciliation statements', description: 'Reconcile all bank statements for Q4 and submit final reports.', status: 'Pending', priority: 'P2', dueDate: 'Wed, 25 Feb', dueDateISO: '2026-02-25', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[4], projectId: 'at', clientGroupId: 'cg-ge', comments: 0 },
  { id: 't3', title: 'Review and update TDS computation sheet for February payroll', description: 'Cross-verify TDS computations and update for February cycle.', status: 'Completed', priority: 'P3', dueDate: 'Thu, 26 Feb', dueDateISO: '2026-02-26', assignedBy: teamMembers[6], assignedTo: teamMembers[0], projectId: 'at', clientGroupId: 'cg-tc', tags: ['My Team'], comments: 1 },
  { id: 't4', title: 'Complete compliance audit checklist for RetailMax onboarding', description: 'Finalize audit checklist for new client onboarding process.', status: 'Pending', priority: 'P2', dueDate: 'Fri, 27 Feb', dueDateISO: '2026-02-27', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[5], projectId: 'at', clientGroupId: 'cg-rm-at', comments: 0 },
  { id: 't5', title: 'Reconcile Q4 expense reports and flag discrepancies', description: 'Review Q4 expense reports across departments and identify mismatches.', status: 'In Progress', priority: 'P1', dueDate: 'Mon, 2 Mar', dueDateISO: '2026-03-02', assignedBy: teamMembers[8], assignedTo: teamMembers[7], projectId: 'at', clientGroupId: 'cg-ge', tags: ['My Team'], comments: 3 },
  { id: 't6', title: 'Generate P&L statement and balance sheet for Q3 board review', description: 'Prepare financial statements for board presentation.', status: 'Pending', priority: 'P2', dueDate: 'Tue, 10 Mar', dueDateISO: '2026-03-10', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[2], projectId: 'at', clientGroupId: 'cg-ff', comments: 0 },
  { id: 't7', title: 'Verify vendor invoices and process pending payments', description: 'Cross-check all pending vendor invoices and initiate payment processing.', status: 'Pending', priority: 'P1', dueDate: 'Mon, 16 Mar', dueDateISO: '2026-03-16', assignedBy: teamMembers[6], assignedTo: teamMembers[9], projectId: 'at', clientGroupId: 'cg-hc', comments: 1 },

  // Performance Marketing tasks
  { id: 't8', title: 'Set up Google Ads campaign for Alpine Group Q2 launch', description: 'Configure campaign targeting, ad groups, and bidding strategy for Q2.', status: 'In Progress', priority: 'P1', dueDate: 'Wed, 18 Mar', dueDateISO: '2026-03-18', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-ag', comments: 4 },
  { id: 't9', title: 'Create Meta Ads creative variants for 99 Pancakes', description: 'Design 3 ad creative variants with different hooks for testing.', status: 'Pending', priority: 'P2', dueDate: 'Thu, 19 Mar', dueDateISO: '2026-03-19', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[1], projectId: 'pm', clientGroupId: 'cg-99', comments: 0 },
  { id: 't10', title: 'Analyze last 30 days ad spend vs ROAS for Anaya College', description: 'Pull analytics and prepare performance summary report.', status: 'Pending', priority: 'P2', dueDate: 'Mon, 16 Mar', dueDateISO: '2026-03-16', assignedBy: teamMembers[8], assignedTo: teamMembers[4], projectId: 'pm', clientGroupId: 'cg-ac', tags: ['My Team'], comments: 2 },
  { id: 't11', title: 'Review and approve landing page copy for Fashion Hub campaign', description: 'Proofread and approve landing page before campaign goes live.', status: 'Completed', priority: 'P3', dueDate: 'Sat, 14 Mar', dueDateISO: '2026-03-14', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-fh', comments: 1 },
  { id: 't12', title: 'Submit monthly performance report to Alpine Group', description: 'Compile and share monthly KPI report with client stakeholders.', status: 'Pending', priority: 'P1', dueDate: 'Sun, 15 Mar', dueDateISO: '2026-03-15', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[1], projectId: 'pm', clientGroupId: 'cg-ag', comments: 0 },

  // Brego Group tasks
  { id: 't13', title: 'Update client onboarding SOP with new compliance checklist', description: 'Revise the standard operating procedure to include updated compliance items.', status: 'In Progress', priority: 'P2', dueDate: 'Tue, 17 Mar', dueDateISO: '2026-03-17', assignedBy: teamMembers[6], assignedTo: teamMembers[3], projectId: 'bg', tags: ['operations'], comments: 2 },
  { id: 't14', title: 'Coordinate team standup schedule for March sprint', description: 'Align team availability and finalize daily standup timings.', status: 'Completed', priority: 'P3', dueDate: 'Mon, 9 Mar', dueDateISO: '2026-03-09', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[7], projectId: 'bg', tags: ['operations'], comments: 0 },
  { id: 't15', title: 'Prepare resource allocation plan for Q2', description: 'Map team capacity and project demands for the next quarter.', status: 'Pending', priority: 'P1', dueDate: 'Wed, 11 Mar', dueDateISO: '2026-03-11', assignedBy: teamMembers[8], assignedTo: teamMembers[6], projectId: 'bg', tags: ['operations'], comments: 1 },

  // Additional Brego Group + PM tasks with tags
  { id: 't16', title: 'Audit Google Ads account structure and reallocate budget to top-performing campaigns for Q1', description: 'Review all active campaigns, pause underperformers, and shift budget to highest ROAS campaigns.', status: 'Pending', priority: 'P1', dueDate: 'Thu, 19 Mar', dueDateISO: '2026-03-19', assignedBy: teamMembers[10], assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-rm-pm', tags: ['marketing'], comments: 3 },
  { id: 't17', title: 'Set up Meta conversion tracking pixels on all new landing pages and verify event firing', description: 'Install and test Meta pixel events across all recently published landing pages.', status: 'Pending', priority: 'P2', dueDate: 'Fri, 20 Mar', dueDateISO: '2026-03-20', assignedBy: teamMembers[11], assignedTo: teamMembers[1], projectId: 'pm', clientGroupId: 'cg-99', tags: ['technology'], comments: 1 },
  { id: 't18', title: 'Prepare monthly paid media performance report with ROAS and CAC breakdown', description: 'Compile cross-channel performance data with key metrics for stakeholder review.', status: 'Pending', priority: 'P3', dueDate: 'Mon, 23 Mar', dueDateISO: '2026-03-23', assignedBy: teamMembers[12], assignedTo: teamMembers[4], projectId: 'pm', clientGroupId: 'cg-ac', tags: ['marketing'], comments: 0 },
  { id: 't19', title: 'Create A/B test variants for LinkedIn lead gen ad creatives — copy and visual', description: 'Design two creative variants with different headlines and images for LinkedIn campaign testing.', status: 'Completed', priority: 'P1', dueDate: 'Wed, 11 Mar', dueDateISO: '2026-03-11', assignedBy: teamMembers[10], assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-fh', tags: ['marketing'], comments: 2 },
  { id: 't20', title: 'Reposition social media strategy as Content Marketing Services — update all service FAQs with the sales team', description: 'Coordinate with sales to rebrand social media offerings and update FAQ documentation.', status: 'Pending', priority: 'P2', dueDate: 'Mon, 2 Mar', dueDateISO: '2026-03-02', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[4], projectId: 'pm', clientGroupId: 'cg-99', tags: ['marketing'], comments: 1 },
  { id: 't21', title: 'Review Q4 campaign performance deck and share feedback with Brego team', description: 'Analyze Q4 results deck and provide actionable feedback to the internal Brego team.', status: 'Pending', priority: 'P2', dueDate: 'Tue, 17 Mar', dueDateISO: '2026-03-17', assignedBy: teamMembers[13], assignedTo: teamMembers[6], projectId: 'bg', tags: ['marketing'], comments: 0 },

  // Brego Delivery Team — Accounts & Taxation
  { id: 't22', title: 'Standardize GST filing templates across all A&T clients', description: 'Create a unified GST filing template to be used by the delivery team for all client accounts.', status: 'In Progress', priority: 'P1', dueDate: 'Mon, 23 Mar', dueDateISO: '2026-03-23', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[2], projectId: 'at', clientGroupId: 'cg-bdt-at', comments: 2 },
  { id: 't23', title: 'Conduct internal audit of Q4 tax filings for compliance gaps', description: 'Review all Q4 filings and flag any discrepancies or compliance risks.', status: 'Pending', priority: 'P1', dueDate: 'Wed, 25 Mar', dueDateISO: '2026-03-25', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[9], projectId: 'at', clientGroupId: 'cg-bdt-at', comments: 1 },
  { id: 't24', title: 'Update SOPs for monthly reconciliation workflows', description: 'Document and standardize the monthly reconciliation process for the team.', status: 'Completed', priority: 'P2', dueDate: 'Fri, 20 Mar', dueDateISO: '2026-03-20', assignedBy: teamMembers[8], assignedTo: teamMembers[5], projectId: 'at', clientGroupId: 'cg-bdt-at', comments: 0 },
  { id: 't25', title: 'Train new team members on TDS computation and filing process', description: 'Onboard and train incoming team members on TDS workflows.', status: 'Pending', priority: 'P2', dueDate: 'Thu, 26 Mar', dueDateISO: '2026-03-26', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[2], projectId: 'at', clientGroupId: 'cg-bdt-at', comments: 0 },

  // Brego Delivery Team — Performance Marketing
  { id: 't26', title: 'Build cross-client performance benchmarking dashboard', description: 'Create an internal dashboard comparing ROAS, CTR, and CPA across all PM clients.', status: 'In Progress', priority: 'P1', dueDate: 'Mon, 23 Mar', dueDateISO: '2026-03-23', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-bdt-pm', comments: 3 },
  { id: 't27', title: 'Define and document paid media SOP for new client onboarding', description: 'Standardize the onboarding process for new PM clients with a clear SOP.', status: 'Pending', priority: 'P2', dueDate: 'Wed, 25 Mar', dueDateISO: '2026-03-25', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[1], projectId: 'pm', clientGroupId: 'cg-bdt-pm', comments: 0 },
  { id: 't28', title: 'Review and optimize team ad spend allocation strategy for Q2', description: 'Analyze Q1 spend patterns and recommend Q2 budget distribution.', status: 'Pending', priority: 'P1', dueDate: 'Fri, 27 Mar', dueDateISO: '2026-03-27', assignedBy: teamMembers[10], assignedTo: teamMembers[4], projectId: 'pm', clientGroupId: 'cg-bdt-pm', comments: 1 },
  { id: 't29', title: 'Conduct weekly creative performance review meeting', description: 'Schedule and run weekly review of ad creative performance across all clients.', status: 'Completed', priority: 'P3', dueDate: 'Tue, 18 Mar', dueDateISO: '2026-03-18', assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' }, assignedTo: teamMembers[0], projectId: 'pm', clientGroupId: 'cg-bdt-pm', comments: 2 },
];

export { FileText, BarChart3, Building2 };
