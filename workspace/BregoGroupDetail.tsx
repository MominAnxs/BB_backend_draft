'use client';
import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Plus, Search, Clock,
  CheckCircle2, Circle, AlertCircle, LayoutGrid, Filter,
  X, MoreVertical, FolderPlus, ChevronDown, FileText
} from 'lucide-react';

// ─────────────────────────────────────────
//  Types
// ─────────────────────────────────────────
type Priority = 'P1' | 'P2' | 'P3';
type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
type View = 'groups' | 'groupDetail';
type QuickFilter = 'all' | 'thisWeek' | 'overdue';

interface TeamMember {
  initials: string;
  name: string;
  color: string;
  role: string;
}

interface Group {
  id: string;
  name: string;
  tagline: string;
  color: string;
  team: TeamMember[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  dueDateISO: string;
  assignedTo: TeamMember;
  assignedBy: TeamMember;
  groupId: string;
}

// ─────────────────────────────────────────
//  Seed data
// ─────────────────────────────────────────
const PRESET_COLORS = ['#204CC7', '#10B981', '#F59E0B', '#8B5CF6', '#E11D48', '#0EA5E9'];

const teamRoster: TeamMember[] = [
  { initials: 'HP', name: 'Harish P.', color: '#E11D48', role: 'COO' },
  { initials: 'RK', name: 'Ritika K.', color: '#7C3AED', role: 'HR Manager' },
  { initials: 'VT', name: 'Vivek T.', color: '#0EA5E9', role: 'Ops Lead' },
  { initials: 'NP', name: 'Neha P.', color: '#F59E0B', role: 'Finance Lead' },
  { initials: 'AF', name: 'Arjun F.', color: '#6366F1', role: 'Sales Manager' },
  { initials: 'JN', name: 'Jaya N.', color: '#F97316', role: 'Sales Executive' },
  { initials: 'PD', name: 'Priya D.', color: '#EC4899', role: 'BD Executive' },
  { initials: 'MG', name: 'Meera G.', color: '#14B8A6', role: 'Marketing Lead' },
  { initials: 'AK', name: 'Anil K.', color: '#84CC16', role: 'Content Manager' },
  { initials: 'KB', name: 'Kiran B.', color: '#2563EB', role: 'Tech Lead' },
  { initials: 'SI', name: 'Suresh I.', color: '#059669', role: 'Full Stack Dev' },
  { initials: 'DN', name: 'Deepa N.', color: '#DC2626', role: 'Product Designer' },
  { initials: 'RS', name: 'Rahul S.', color: '#8B5CF6', role: 'QA Engineer' },
  { initials: 'TG', name: 'Tanvi G.', color: '#0891B2', role: 'Data Analyst' },
  { initials: 'AM', name: 'Aman M.', color: '#EA580C', role: 'DevOps Engineer' },
  { initials: 'SK', name: 'Sneha K.', color: '#4F46E5', role: 'UI Engineer' },
  { initials: 'RD', name: 'Rohit D.', color: '#B91C1C', role: 'Backend Dev' },
  { initials: 'PS', name: 'Priya S.', color: '#A855F7', role: 'Copywriter' },
  { initials: 'KR', name: 'Kavita R.', color: '#0D9488', role: 'SEO Specialist' },
  { initials: 'GT', name: 'Gaurav T.', color: '#CA8A04', role: 'Growth Analyst' },
  { initials: 'NM', name: 'Nisha M.', color: '#DB2777', role: 'Social Media Mgr' },
  { initials: 'AS', name: 'Aditya S.', color: '#65A30D', role: 'Account Manager' },
  { initials: 'LB', name: 'Lakshmi B.', color: '#7C3AED', role: 'Compliance Officer' },
];

const initialGroups: Group[] = [
  {
    id: 'ops-finance',
    name: 'Operations & Finance',
    tagline: 'Finance · HR · Compliance · Office Ops',
    color: '#204CC7',
    team: [teamRoster[0], teamRoster[1], teamRoster[2], teamRoster[3], teamRoster[13], teamRoster[14], teamRoster[15], teamRoster[22], teamRoster[19], teamRoster[20], teamRoster[21]],
  },
  {
    id: 'sales',
    name: 'Sales',
    tagline: 'Pipeline · Outreach · BD · Partnerships',
    color: '#10B981',
    team: [teamRoster[4], teamRoster[5], teamRoster[6], teamRoster[0], teamRoster[19], teamRoster[20], teamRoster[21], teamRoster[13], teamRoster[17], teamRoster[18], teamRoster[22]],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    tagline: 'Campaigns · Content · Branding · Social',
    color: '#F59E0B',
    team: [teamRoster[7], teamRoster[8], teamRoster[17], teamRoster[18], teamRoster[19], teamRoster[20], teamRoster[4], teamRoster[13], teamRoster[15], teamRoster[21], teamRoster[16]],
  },
  {
    id: 'technology',
    name: 'Technology',
    tagline: 'Product · Engineering · Design · QA',
    color: '#8B5CF6',
    team: [teamRoster[9], teamRoster[10], teamRoster[11], teamRoster[12], teamRoster[14], teamRoster[15], teamRoster[16], teamRoster[13], teamRoster[3], teamRoster[17], teamRoster[22]],
  },
];

const todayISO = '2026-03-27';

const initialTasks: Task[] = [
  // Operations & Finance
  { id: 'bf1', title: 'Reconcile Q4 expense reports and flag discrepancies', status: 'In Progress', priority: 'P1', dueDate: 'Mon, 24 Mar', dueDateISO: '2026-03-24', assignedTo: teamRoster[3], assignedBy: teamRoster[0], groupId: 'ops-finance' },
  { id: 'bf2', title: 'Finalise Q1 hiring pipeline and schedule interviews', status: 'Pending', priority: 'P2', dueDate: 'Thu, 27 Mar', dueDateISO: '2026-03-27', assignedTo: teamRoster[1], assignedBy: teamRoster[0], groupId: 'ops-finance' },
  { id: 'bf3', title: 'Prepare resource allocation plan for Q2', status: 'Pending', priority: 'P1', dueDate: 'Mon, 31 Mar', dueDateISO: '2026-03-31', assignedTo: teamRoster[2], assignedBy: teamRoster[0], groupId: 'ops-finance' },
  { id: 'bf4', title: 'Update client onboarding SOP with new compliance checklist', status: 'In Progress', priority: 'P2', dueDate: 'Tue, 1 Apr', dueDateISO: '2026-04-01', assignedTo: teamRoster[0], assignedBy: teamRoster[0], groupId: 'ops-finance' },
  { id: 'bf5', title: 'Complete monthly payroll processing for March', status: 'Completed', priority: 'P1', dueDate: 'Mon, 24 Mar', dueDateISO: '2026-03-24', assignedTo: teamRoster[3], assignedBy: teamRoster[0], groupId: 'ops-finance' },
  { id: 'bf6', title: 'File GST returns for March billing cycle', status: 'Pending', priority: 'P1', dueDate: 'Fri, 28 Mar', dueDateISO: '2026-03-28', assignedTo: teamRoster[3], assignedBy: teamRoster[0], groupId: 'ops-finance' },

  // Sales
  { id: 'bs1', title: 'Follow up with Alpine Group for Q2 contract renewal', status: 'Pending', priority: 'P1', dueDate: 'Fri, 28 Mar', dueDateISO: '2026-03-28', assignedTo: teamRoster[4], assignedBy: teamRoster[0], groupId: 'sales' },
  { id: 'bs2', title: 'Review Q1 sales pipeline and update CRM records', status: 'Pending', priority: 'P2', dueDate: 'Fri, 28 Mar', dueDateISO: '2026-03-28', assignedTo: teamRoster[5], assignedBy: teamRoster[4], groupId: 'sales' },
  { id: 'bs3', title: 'Prepare proposal deck for RetailMax partnership', status: 'In Progress', priority: 'P1', dueDate: 'Wed, 26 Mar', dueDateISO: '2026-03-26', assignedTo: teamRoster[6], assignedBy: teamRoster[4], groupId: 'sales' },
  { id: 'bs4', title: 'Conduct discovery call with NovaTech prospects', status: 'Completed', priority: 'P2', dueDate: 'Tue, 25 Mar', dueDateISO: '2026-03-25', assignedTo: teamRoster[4], assignedBy: teamRoster[0], groupId: 'sales' },
  { id: 'bs5', title: 'Send revised SOW to CloudFirst Technologies', status: 'Pending', priority: 'P2', dueDate: 'Mon, 31 Mar', dueDateISO: '2026-03-31', assignedTo: teamRoster[5], assignedBy: teamRoster[4], groupId: 'sales' },

  // Marketing
  { id: 'bm1', title: 'Launch Q2 social media content calendar', status: 'In Progress', priority: 'P1', dueDate: 'Fri, 28 Mar', dueDateISO: '2026-03-28', assignedTo: teamRoster[8], assignedBy: teamRoster[7], groupId: 'marketing' },
  { id: 'bm2', title: 'Design updated brand guidelines deck for client pitches', status: 'Pending', priority: 'P2', dueDate: 'Mon, 31 Mar', dueDateISO: '2026-03-31', assignedTo: teamRoster[7], assignedBy: teamRoster[0], groupId: 'marketing' },
  { id: 'bm3', title: 'Write case studies for top 3 Q1 client wins', status: 'Pending', priority: 'P2', dueDate: 'Wed, 2 Apr', dueDateISO: '2026-04-02', assignedTo: teamRoster[8], assignedBy: teamRoster[7], groupId: 'marketing' },
  { id: 'bm4', title: 'Set up email drip campaign for new leads', status: 'Completed', priority: 'P1', dueDate: 'Mon, 24 Mar', dueDateISO: '2026-03-24', assignedTo: teamRoster[7], assignedBy: teamRoster[0], groupId: 'marketing' },

  // Technology
  { id: 'bt1', title: 'Deploy updated client portal to staging environment', status: 'In Progress', priority: 'P1', dueDate: 'Wed, 26 Mar', dueDateISO: '2026-03-26', assignedTo: teamRoster[10], assignedBy: teamRoster[9], groupId: 'technology' },
  { id: 'bt2', title: 'Conduct security audit for production infrastructure', status: 'Pending', priority: 'P1', dueDate: 'Wed, 2 Apr', dueDateISO: '2026-04-02', assignedTo: teamRoster[9], assignedBy: teamRoster[0], groupId: 'technology' },
  { id: 'bt3', title: 'Design onboarding flow wireframes for new portal', status: 'Completed', priority: 'P3', dueDate: 'Sun, 22 Mar', dueDateISO: '2026-03-22', assignedTo: teamRoster[11], assignedBy: teamRoster[9], groupId: 'technology' },
  { id: 'bt4', title: 'Fix critical bug in invoice generation module', status: 'Pending', priority: 'P1', dueDate: 'Thu, 27 Mar', dueDateISO: '2026-03-27', assignedTo: teamRoster[10], assignedBy: teamRoster[9], groupId: 'technology' },
  { id: 'bt5', title: 'Write integration tests for billing API endpoints', status: 'Pending', priority: 'P2', dueDate: 'Fri, 28 Mar', dueDateISO: '2026-03-28', assignedTo: teamRoster[12], assignedBy: teamRoster[9], groupId: 'technology' },
  { id: 'bt6', title: 'Set up CI/CD pipeline for mobile app repository', status: 'In Progress', priority: 'P2', dueDate: 'Mon, 31 Mar', dueDateISO: '2026-03-31', assignedTo: teamRoster[9], assignedBy: teamRoster[0], groupId: 'technology' },
];

// ─────────────────────────────────────────
//  Config
// ─────────────────────────────────────────
const prioConfig: Record<Priority, { dot: string; text: string; label: string }> = {
  P1: { dot: 'bg-red-500', text: 'text-red-600', label: 'Urgent' },
  P2: { dot: 'bg-amber-500', text: 'text-amber-600', label: 'Medium' },
  P3: { dot: 'bg-slate-400', text: 'text-slate-500', label: 'Low' },
};

// ─────────────────────────────────────────
//  Reusable: Breadcrumb
// ─────────────────────────────────────────
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-caption" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3 text-black/25" aria-hidden="true" />}
          {item.onClick ? (
            <button type="button" onClick={item.onClick} className="text-black/55 hover:text-[#204CC7] transition-colors font-medium">{item.label}</button>
          ) : (
            <span className="text-black/90 font-bold">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────
//  Reusable: Avatar stack with +N overflow
// ─────────────────────────────────────────
function AvatarStack({ members, max = 5, size = 'md' }: { members: TeamMember[]; max?: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-6 h-6 text-[8px]' : 'w-7 h-7 text-micro';
  const overlap = size === 'sm' ? '-space-x-1.5' : '-space-x-[7px]';
  const border = 'border-2 border-white';
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div className={`flex ${overlap}`}>
      {visible.map(m => (
        <div key={m.initials} className={`${s} ${border} rounded-full flex items-center justify-center text-white font-bold`} style={{ backgroundColor: m.color }} title={m.name}>
          {m.initials}
        </div>
      ))}
      {overflow > 0 && (
        <div className={`${s} ${border} rounded-full bg-black/10 flex items-center justify-center text-black/70 font-bold`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────
interface BregoGroupDetailProps {
  onBack?: () => void;
}

export function BregoGroupDetail({ onBack }: BregoGroupDetailProps) {
  const router = useRouter();

  // State
  const [view, setView] = useState<View>('groups');
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'Due Date' | 'Priority' | 'Status' | 'Assignee'>('Due Date');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);

  // ── Derived data ──
  const getGroupStats = (groupId: string) => {
    const groupTasks = tasks.filter(t => t.groupId === groupId);
    return {
      total: groupTasks.length,
      completed: groupTasks.filter(t => t.status === 'Completed').length,
      inProgress: groupTasks.filter(t => t.status === 'In Progress').length,
      overdue: groupTasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length,
      pending: groupTasks.filter(t => t.status === 'Pending').length,
    };
  };

  const totalStats = useMemo(() => {
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Completed').length,
      inProgress: tasks.filter(t => t.status === 'In Progress').length,
      overdue: tasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length,
    };
  }, [tasks]);

  // ── Group detail tasks (filtered) ──
  const filteredTasks = useMemo(() => {
    if (!selectedGroup) return [];
    let list = tasks.filter(t => t.groupId === selectedGroup.id);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q));
    }
    if (quickFilter === 'thisWeek') {
      list = list.filter(t => t.dueDateISO >= '2026-03-24' && t.dueDateISO <= '2026-03-30');
    }
    if (quickFilter === 'overdue') {
      list = list.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed');
    }
    if (statusFilter !== 'All') list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'All') list = list.filter(t => t.priority === priorityFilter);
    if (assigneeFilter !== 'All') list = list.filter(t => t.assignedTo.initials === assigneeFilter);

    list.sort((a, b) => {
      if (sortBy === 'Due Date') return a.dueDateISO.localeCompare(b.dueDateISO);
      if (sortBy === 'Priority') return a.priority.localeCompare(b.priority);
      if (sortBy === 'Status') return a.status.localeCompare(b.status);
      if (sortBy === 'Assignee') return a.assignedTo.name.localeCompare(b.assignedTo.name);
      return 0;
    });

    return list;
  }, [tasks, selectedGroup, searchQuery, quickFilter, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  // Unique assignees for the current group (for filter dropdown)
  const groupAssignees = useMemo(() => {
    if (!selectedGroup) return [];
    const groupTasks = tasks.filter(t => t.groupId === selectedGroup.id);
    return [...new Map(groupTasks.map(t => [t.assignedTo.initials, t.assignedTo])).values()];
  }, [tasks, selectedGroup]);

  const activeFilterCount = [statusFilter !== 'All', priorityFilter !== 'All', assigneeFilter !== 'All'].filter(Boolean).length;

  // ── Actions ──
  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' as TaskStatus }
        : t
    ));
  };

  const openGroup = (group: Group) => {
    setSelectedGroup(group);
    setView('groupDetail');
    setQuickFilter('all');
    setSearchQuery('');
  };

  const backToGroups = () => {
    setView('groups');
    setSelectedGroup(null);
    setSearchQuery(''); setQuickFilter('all'); setStatusFilter('All'); setPriorityFilter('All'); setAssigneeFilter('All'); setSortBy('Due Date');
  };

  // ─────────────────────────────────────────
  //  RENDER: Groups Overview
  // ─────────────────────────────────────────
  if (view === 'groups') {
    return (
      <div className="-mx-8 -mt-6">
        {/* ═══ STICKY TOP BAR — consistent with A&T / PM ═══ */}
        <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
          {/* Breadcrumb */}
          <div className="px-8 pt-5 pb-0">
            <nav className="flex items-center gap-1.5 text-caption text-muted-fg" aria-label="Breadcrumb">
              <button onClick={() => onBack ? onBack() : router.push('/workspace/task-management')} className="hover:text-[#204CC7] transition-colors font-medium">Task Management</button>
              <ChevronRight className="w-3 h-3 text-black/25" />
              <span className="text-foreground font-semibold">Brego Group</span>
            </nav>
          </div>

          {/* Row 1: Back + Title | Search + Status + CTA */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => onBack ? onBack() : router.push('/workspace/task-management')} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95" aria-label="Back to Task Management">
                  <ChevronLeft className="w-5 h-5 text-black/60" />
                </button>
                <h1 className="text-black/90 text-h2 font-bold">Brego Group</h1>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative flex items-center w-52">
                  <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                  <input
                    placeholder="Search departments..."
                    aria-label="Search departments"
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                  />
                </div>

                <div className="w-px h-8 bg-black/8" />

                {/* New Group CTA */}
                <button
                  onClick={() => setShowNewGroupModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium"
                >
                  <FolderPlus className="w-3.5 h-3.5" /> New Group
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group Cards */}
        <div className="p-8 grid grid-cols-2 gap-5">
          {groups.map(group => {
            const stats = getGroupStats(group.id);
            const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

            return (
              <div
                key={group.id}
                onClick={() => openGroup(group)}
                className="bg-white rounded-xl border border-black/[0.06] p-6 cursor-pointer hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 relative overflow-hidden group"
              >
                {/* Left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: group.color }} />

                {/* Header row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                    <h3 className="text-body font-bold text-black/90 truncate">{group.name}</h3>
                    <span className="text-caption text-black/40 font-medium flex-shrink-0">·</span>
                    <span className="text-caption text-black/55 font-medium flex-shrink-0">{getGroupStats(group.id).total} tasks</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-black/15 group-hover:text-black/55 group-hover:translate-x-[2px] transition-all flex-shrink-0 ml-2" />
                </div>

                {/* Team */}
                <div className="flex items-center gap-2.5 mb-4">
                  <AvatarStack members={group.team} max={5} />
                  <span className="text-caption text-black/55 font-medium">{group.team.length} member{group.team.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Stats row */}
                <div className="flex pt-4 border-t border-black/[0.04]">
                  {[
                    { val: stats.overdue, label: 'Overdue', color: 'text-red-600' },
                    { val: stats.inProgress, label: 'In Progress', color: 'text-amber-600' },
                    { val: stats.pending, label: 'Pending', color: 'text-black/65' },
                    { val: stats.completed, label: 'Done', color: 'text-emerald-600' },
                  ].map((s, i) => (
                    <div key={s.label} className={`flex-1 text-center ${i > 0 ? 'border-l border-black/[0.04]' : ''}`}>
                      <div className={`text-h3 font-bold ${s.color}`}>{s.val}</div>
                      <div className="text-black/55 text-micro mt-[2px]">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* New Group Modal */}
        {showNewGroupModal && (
          <NewGroupModal
            onClose={() => setShowNewGroupModal(false)}
            onCreate={(name, tagline, color) => {
              const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              setGroups(prev => [...prev, { id, name, tagline, color, team: [] }]);
              setShowNewGroupModal(false);
            }}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────
  //  RENDER: Group Detail (Todo List)
  // ─────────────────────────────────────────
  if (view === 'groupDetail' && selectedGroup) {
    const stats = getGroupStats(selectedGroup.id);
    const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
      <div className="-mx-8 -mt-6">
        {/* ═══ STICKY TOP BAR ═══ */}
        <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
          {/* Primary row: Back + Title | Search + Filter + Add To-Do */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-shrink-0">
                <button onClick={backToGroups} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95" aria-label="Back to groups">
                  <ChevronLeft className="w-5 h-5 text-black/60" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedGroup.color }} />
                  <h1 className="text-black/90 text-h2 font-bold">{selectedGroup.name}</h1>
                </div>
                <div className="w-px h-5 bg-black/8" />
                <div className="flex items-center gap-2">
                  <AvatarStack members={selectedGroup.team} max={5} size="sm" />
                  <span className="text-caption text-black/55 font-medium">{selectedGroup.team.length} members</span>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-black/55 font-medium">
                  <div className="w-20 h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: selectedGroup.color }} />
                  </div>
                  {pct}%
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex items-center w-52">
                  <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search to-dos..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-[0.98] text-caption font-medium ${
                    showFilters || activeFilterCount > 0
                      ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                      : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>

                <div className="w-px h-8 bg-black/8" />

                {/* Add To-Do CTA */}
                <button
                  onClick={() => setShowAddTodoModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add To-Do
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible filter panel — single row */}
          {showFilters && (
            <div className="px-6 pb-3 border-t border-black/[0.04]">
              <div className="pt-3 flex items-center justify-between gap-3">
                {/* Left: Quick filters + Dropdowns + Clear */}
                <div className="flex items-center gap-2 flex-wrap">
                  {([
                    { key: 'all' as QuickFilter, label: `All (${stats.total})` },
                    { key: 'thisWeek' as QuickFilter, label: 'This Week' },
                    { key: 'overdue' as QuickFilter, label: `Overdue (${stats.overdue})` },
                  ]).map(f => (
                    <button key={f.key} onClick={() => setQuickFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${quickFilter === f.key ? 'bg-[#EEF1FB] text-[#204CC7]' : 'text-black/55 hover:bg-black/[0.03]'}`}>{f.label}</button>
                  ))}

                  <div className="w-px h-5 bg-black/8" />

                  <div className="relative">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'All' | TaskStatus)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${statusFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                      <option value="All">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'All' | Priority)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${priorityFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                      <option value="All">All Priority</option>
                      <option value="P1">P1 — Urgent</option>
                      <option value="P2">P2 — High</option>
                      <option value="P3">P3 — Normal</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${assigneeFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                      <option value="All">All Members</option>
                      {groupAssignees.map(a => (
                        <option key={a.initials} value={a.initials}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                  </div>

                  {activeFilterCount > 0 && (
                    <button onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setAssigneeFilter('All'); setQuickFilter('all'); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-caption font-medium text-red-500 hover:bg-red-50 transition-all">
                      <X className="w-3 h-3" /> Clear
                    </button>
                  )}
                </div>

                {/* Right: Sort */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-micro text-black/40 font-medium">Sort by</span>
                  <div className="relative">
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-black/[0.08] bg-white text-caption font-medium text-black/60 cursor-pointer hover:border-black/15 transition-all focus:outline-none">
                      <option value="Due Date">Due Date</option>
                      <option value="Priority">Priority</option>
                      <option value="Status">Status</option>
                      <option value="Assignee">Assignee</option>
                    </select>
                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Task List Card */}
        <div className="mx-8 mt-5 bg-white rounded-xl border border-black/[0.06] overflow-hidden">

          {/* Task List */}
          <div>
            {filteredTasks.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                <p className="text-body font-medium text-black/55 mb-1">No to-dos found</p>
                <p className="text-caption text-black/55">Try a different filter or add a new to-do</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const isOverdue = task.dueDateISO < todayISO && task.status !== 'Completed';
                const isDone = task.status === 'Completed';
                const prio = prioConfig[task.priority];

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.04] last:border-b-0 hover:bg-black/[0.015] transition-colors group/row"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                        isDone ? 'bg-emerald-500 border-emerald-500' : 'border-black/15 hover:border-[#204CC7]'
                      }`}
                      aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isDone && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-body leading-snug mb-0.5 ${isDone ? 'line-through text-black/30' : 'text-black/85 font-medium'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 text-micro">
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : isDone ? 'text-black/30' : 'text-black/55'}`}>
                          <Clock className="w-[10px] h-[10px]" />
                          {task.dueDate}
                          {isOverdue && ' (overdue)'}
                        </span>
                        <span className="text-black/15">·</span>
                        <span className="text-black/55">by {task.assignedBy.name}</span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Priority */}
                      <div className={`flex items-center gap-1 text-micro font-bold ${prio.text}`}>
                        <span className={`w-[5px] h-[5px] rounded-full ${prio.dot}`} />
                        {task.priority}
                      </div>
                      {/* Assignee */}
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-micro font-bold"
                        style={{ backgroundColor: task.assignedTo.color }}
                        title={task.assignedTo.name}
                      >
                        {task.assignedTo.initials}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Add To-Do Modal */}
        {showAddTodoModal && selectedGroup && (
          <AddTodoModal
            group={selectedGroup}
            teamRoster={teamRoster}
            onClose={() => setShowAddTodoModal(false)}
            onCreate={(title, priority, assignee) => {
              const newTask: Task = {
                id: `bt-${Date.now()}`,
                title,
                status: 'Pending',
                priority,
                dueDate: 'Mon, 31 Mar',
                dueDateISO: '2026-03-31',
                assignedTo: assignee,
                assignedBy: teamRoster[0],
                groupId: selectedGroup.id,
              };
              setTasks(prev => [...prev, newTask]);
              setShowAddTodoModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────
//  Modal: New Group
// ─────────────────────────────────────────
function NewGroupModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, tagline: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#204CC7]" />
            <h3 className="text-h3 text-black/90">New Group</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-black/5 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-black/55" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-1.5">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Customer Success"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-black/10 rounded-lg text-body placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/30 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="e.g. Retention · Support · Onboarding"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full px-3 py-2 border border-black/10 rounded-lg text-body placeholder:text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Color</label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-black/20 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/5 bg-black/[0.01]">
          <button onClick={onClose} className="px-4 py-2 text-caption font-semibold text-black/65 hover:bg-black/5 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), tagline.trim(), color)}
            disabled={!name.trim()}
            className="px-4 py-2 bg-[#204CC7] text-white text-caption font-semibold rounded-lg hover:bg-[#1a3fa8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
//  Modal: Add To-Do
// ─────────────────────────────────────────
function AddTodoModal({ group, teamRoster, onClose, onCreate }: {
  group: Group;
  teamRoster: TeamMember[];
  onClose: () => void;
  onCreate: (title: string, priority: Priority, assignee: TeamMember) => void;
}) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assignee, setAssignee] = useState(group.team[0] || teamRoster[0]);
  const [dueDate, setDueDate] = useState('');
  const [notifyTo, setNotifyTo] = useState('');
  const members = group.team.length > 0 ? group.team : teamRoster;
  const canSubmit = title.trim().length > 0;

  const prioOptions: { key: Priority; label: string; activeBg: string; activeText: string; activeBorder: string }[] = [
    { key: 'P1', label: 'P1 Urgent', activeBg: 'bg-red-50', activeText: 'text-red-600', activeBorder: 'border-red-200' },
    { key: 'P2', label: 'P2 High', activeBg: 'bg-amber-50', activeText: 'text-amber-600', activeBorder: 'border-amber-200' },
    { key: 'P3', label: 'P3 Normal', activeBg: 'bg-slate-50', activeText: 'text-slate-600', activeBorder: 'border-slate-200' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#F8F9FB] rounded-2xl w-[540px] shadow-2xl border border-black/[0.06] overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-black/[0.06]">
          <h3 className="text-h2 font-bold text-black/90">Add a To-Do</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">
            <X className="w-4.5 h-4.5 text-black/40" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">

          {/* Task */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Task <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter task"
              autoFocus
              className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 placeholder:text-black/30 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all"
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Assign To</label>
            <div className="relative">
              <select
                value={assignee.initials}
                onChange={e => {
                  const found = members.find(m => m.initials === e.target.value);
                  if (found) setAssignee(found);
                }}
                className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all appearance-none cursor-pointer"
              >
                {members.map(m => <option key={m.initials} value={m.initials}>{m.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/35 pointer-events-none" />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 placeholder:text-black/30 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all"
            />
          </div>

          {/* Notify To */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Notify To</label>
            <input
              type="email"
              value={notifyTo}
              onChange={e => setNotifyTo(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 placeholder:text-black/30 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 placeholder:text-black/30 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all resize-none"
            />
          </div>

          {/* Attach Files */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Attach Files</label>
            <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl border-2 border-dashed border-black/[0.1] hover:border-[#204CC7]/25 hover:bg-[#EEF1FB]/30 transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center mb-2.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/35"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <p className="text-caption font-medium text-black/60">Click to upload or drag and drop</p>
              <p className="text-micro text-black/35 mt-0.5">PDF, DOC, PNG, JPG up to 10MB</p>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-caption font-semibold text-black/70 mb-2">Priority</label>
            <div className="grid grid-cols-3 gap-2.5">
              {prioOptions.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`py-3 rounded-xl border text-caption font-semibold transition-all ${
                    priority === p.key
                      ? `${p.activeBg} ${p.activeText} ${p.activeBorder}`
                      : 'bg-white border-black/[0.08] text-black/50 hover:border-black/15'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 bg-white border-t border-black/[0.06] flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-black/[0.08] text-caption font-semibold text-black/60 hover:bg-black/[0.03] transition-all">
            Cancel
          </button>
          <button
            onClick={() => { if (canSubmit) onCreate(title.trim(), priority, assignee); }}
            disabled={!canSubmit}
            className={`px-6 py-2.5 rounded-xl text-caption font-semibold transition-all ${
              canSubmit
                ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa8] shadow-sm'
                : 'bg-black/[0.06] text-black/30 cursor-not-allowed'
            }`}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
