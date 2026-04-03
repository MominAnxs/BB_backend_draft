'use client';
"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronDown, Calendar, Sparkles, Circle, CheckCircle2,
  Building2, GripVertical, Filter, X, Clock
} from 'lucide-react';
import {
  Task, Priority, TaskStatus, QuickFilter, SortOption,
  generateTasks, mockProjects, teamMembers, priorityConfig
} from './task-data';

// ── Main Component ──
export function MyAssignments() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(generateTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('Due Date');
  const [showFilters, setShowFilters] = useState(false);

  const todayISO = '2026-03-18';

  // ── Drag & Drop state ──
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);

  const handleDragStart = (taskId: string, projectId: string) => {
    setDragTaskId(taskId);
    setDragProjectId(projectId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string, projectId: string) => {
    e.preventDefault();
    if (projectId === dragProjectId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragEnd = () => {
    if (dragTaskId && dragOverTaskId && dragTaskId !== dragOverTaskId && dragProjectId) {
      setTasks(prev => {
        const updated = [...prev];
        const dragIdx = updated.findIndex(t => t.id === dragTaskId);
        const dropIdx = updated.findIndex(t => t.id === dragOverTaskId);
        if (dragIdx === -1 || dropIdx === -1) return prev;
        const [dragged] = updated.splice(dragIdx, 1);
        updated.splice(dropIdx, 0, dragged);
        return updated;
      });
    }
    setDragTaskId(null);
    setDragOverTaskId(null);
    setDragProjectId(null);
  };

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: (t.status === 'Completed' ? 'Pending' : 'Completed') as TaskStatus } : t));
  };

  // ── Stats ──
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const totalCount = tasks.length;
  const overdueCount = tasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length;
  const pctComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // ── All unique assignees ──
  const allAssignees = useMemo(() => {
    const map = new Map<string, typeof teamMembers[0]>();
    tasks.forEach(t => {
      map.set(t.assignedTo.initials, t.assignedTo);
      if (t.assignedBy.initials !== 'YOU') map.set(t.assignedBy.initials, t.assignedBy);
    });
    // Fill from teamMembers
    teamMembers.forEach(m => { if (!map.has(m.initials)) map.set(m.initials, m); });
    return [...map.values()].slice(0, 15);
  }, [tasks]);

  // ── Active filter count ──
  const activeFilterCount = [
    quickFilter !== 'all',
    statusFilter !== 'All',
    priorityFilter !== 'All',
    sourceFilter !== 'All',
  ].filter(Boolean).length;

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    // Search
    if (searchQuery) {
      filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Source
    if (sourceFilter !== 'All') {
      switch (sourceFilter) {
        case 'My Team':
          filtered = filtered.filter(t => t.tags?.includes('My Team') || t.assignedBy.name === 'You');
          break;
        case 'Brego PM':
          filtered = filtered.filter(t => t.projectId === 'pm');
          break;
        case 'Brego Group - Sales':
          filtered = filtered.filter(t => t.projectId === 'bg' && t.tags?.includes('sales'));
          break;
        case 'Brego Group - Technology':
          filtered = filtered.filter(t => t.projectId === 'bg' && t.tags?.includes('technology'));
          break;
        case 'Brego Group - Operations & Finance':
          filtered = filtered.filter(t => t.projectId === 'bg' && t.tags?.includes('operations'));
          break;
        case 'Brego Group - Marketing':
          filtered = filtered.filter(t => (t.projectId === 'bg' && t.tags?.includes('marketing')) || (t.projectId === 'pm' && t.tags?.includes('marketing')));
          break;
      }
    }

    // Status
    if (statusFilter !== 'All') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Priority
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Quick filters
    if (quickFilter === 'thisWeek') {
      filtered = filtered.filter(t => t.dueDateISO >= '2026-03-16' && t.dueDateISO <= '2026-03-22');
    }
    if (quickFilter === 'overdue') {
      filtered = filtered.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed');
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Priority': {
          const order: Record<string, number> = { P1: 0, P2: 1, P3: 2 };
          return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
        }
        case 'Status': {
          const order: Record<string, number> = { 'In Progress': 0, Pending: 1, Completed: 2 };
          return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        }
        case 'Recently Added':
          return b.id.localeCompare(a.id);
        default:
          return a.dueDateISO.localeCompare(b.dueDateISO);
      }
    });

    return filtered;
  }, [tasks, searchQuery, sourceFilter, statusFilter, priorityFilter, quickFilter, sortBy]);

  // Group by project
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach(task => {
      if (!groups[task.projectId]) groups[task.projectId] = [];
      groups[task.projectId].push(task);
    });
    return groups;
  }, [filteredTasks]);

  return (
    <div className="-mx-8 -mt-6">
      {/* ═══ STICKY TOP BAR ═══ */}
      <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
        {/* Primary row: Back + Title + Meta | Search + Filter + Ask BregoGPT */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-shrink-0">
              <button onClick={() => router.push('/workspace/task-management')} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95" aria-label="Back to task management">
                <ChevronLeft className="w-5 h-5 text-black/60" />
              </button>
              <h1 className="text-black/90 text-h2 font-bold">Your Assignments</h1>
              <div className="w-px h-5 bg-black/8" />
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {allAssignees.slice(0, 5).map(a => (
                    <div key={a.initials} className="w-5 h-5 rounded-full border-[1.5px] border-white flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: a.color }} title={a.name}>{a.initials}</div>
                  ))}
                  {allAssignees.length > 5 && (
                    <div className="w-5 h-5 rounded-full border-[1.5px] border-white bg-black/10 flex items-center justify-center text-black/70 text-[7px] font-bold">+{allAssignees.length - 5}</div>
                  )}
                </div>
                <span className="text-caption text-black/55 font-medium">{allAssignees.length} members</span>
              </div>
              <div className="flex items-center gap-1.5 text-caption text-black/55 font-medium">
                <div className="w-20 h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#204CC7]" style={{ width: `${pctComplete}%` }} />
                </div>
                {pctComplete}%
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex items-center w-52">
                <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search assignments..."
                  aria-label="Search assignments"
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                />
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

              {/* Ask BregoGPT */}
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-all shadow-sm text-caption font-semibold active:scale-[0.98]">
                <Sparkles className="w-3.5 h-3.5" />
                Ask BregoGPT
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
                  { key: 'all' as QuickFilter, label: `All (${totalCount})` },
                  { key: 'thisWeek' as QuickFilter, label: 'This Week' },
                  { key: 'overdue' as QuickFilter, label: `Overdue (${overdueCount})` },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setQuickFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${quickFilter === f.key ? 'bg-[#EEF1FB] text-[#204CC7]' : 'text-black/55 hover:bg-black/[0.03]'}`}>{f.label}</button>
                ))}

                <div className="w-px h-5 bg-black/8" />

                {/* Source */}
                <div className="relative">
                  <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${sourceFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                    <option value="All">All Source</option>
                    <option value="My Team">My Team</option>
                    <option value="Brego PM">Brego PM</option>
                    <option value="Brego Group - Sales">Brego Group - Sales</option>
                    <option value="Brego Group - Technology">Brego Group - Technology</option>
                    <option value="Brego Group - Operations & Finance">Brego Group - Ops & Finance</option>
                    <option value="Brego Group - Marketing">Brego Group - Marketing</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                </div>

                {/* Status */}
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${statusFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                </div>

                {/* Priority */}
                <div className="relative">
                  <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${priorityFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                    <option value="All">All Priority</option>
                    <option value="P1">P1 — Urgent</option>
                    <option value="P2">P2 — High</option>
                    <option value="P3">P3 — Normal</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                </div>

                {activeFilterCount > 0 && (
                  <button onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setSourceFilter('All'); setQuickFilter('all'); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-caption font-medium text-red-500 hover:bg-red-50 transition-all">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {/* Right: Sort */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-micro text-black/40 font-medium">Sort by</span>
                <div className="relative">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-black/[0.08] bg-white text-caption font-medium text-black/60 cursor-pointer hover:border-black/15 transition-all focus:outline-none">
                    <option value="Due Date">Due Date</option>
                    <option value="Priority">Priority</option>
                    <option value="Status">Status</option>
                    <option value="Recently Added">Recently Added</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task List — Grouped by Project */}
      <div className="p-8 space-y-2">
        {Object.keys(groupedTasks).length === 0 ? (
          <div className="bg-white rounded-xl border border-black/5 py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-black/15 mx-auto mb-3" />
            <p className="text-body font-medium text-black/55">No tasks found</p>
            <p className="text-caption font-normal text-black/30 mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          Object.entries(groupedTasks).map(([projectId, projectTasks]) => {
            const project = mockProjects.find(p => p.id === projectId);
            if (!project) return null;

            return (
              <div key={projectId} className="mb-6">
                {/* Group Header */}
                <div className="flex items-center gap-2.5 px-4 py-3.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="text-micro font-semibold text-black/55 uppercase tracking-wide">{project.name}</span>
                  <span className="text-micro font-normal text-black/35">{projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Task Rows */}
                <div className="bg-white rounded-xl border border-black/5 overflow-hidden divide-y divide-black/[0.04]">
                  {projectTasks.map(task => {
                    const pc = priorityConfig[task.priority];
                    const isOverdue = task.dueDateISO < todayISO && task.status !== 'Completed';
                    const isCompleted = task.status === 'Completed';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id, projectId)}
                        onDragOver={(e) => handleDragOver(e, task.id, projectId)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-start gap-3 py-5 px-5 border-l-[3px] transition-all group/row select-none ${
                          dragTaskId === task.id
                            ? 'opacity-40 scale-[0.98] bg-black/[0.02]'
                            : dragOverTaskId === task.id && dragProjectId === projectId
                              ? 'border-t-2 border-t-[#204CC7]/30 bg-[#EEF1FB]/30'
                              : 'hover:bg-black/[0.015]'
                        }`}
                        style={{ borderLeftColor: project.color, cursor: 'grab' }}
                      >
                        {/* Drag Handle */}
                        <div className="flex-shrink-0 mt-1 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-black/25" />
                        </div>

                        {/* Checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
                          className="flex-shrink-0 mt-0.5"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-[20px] h-[20px] text-emerald-500 fill-emerald-500" />
                          ) : (
                            <Circle className="w-[20px] h-[20px] text-black/15 hover:text-[#204CC7]/40 transition-colors" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-body font-medium mb-2 ${isCompleted ? 'line-through text-black/40' : 'text-black/85'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2.5 text-caption text-black/50 flex-wrap">
                            {/* Source badge */}
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {project.name === 'Performance Marketing' ? 'Brego PM' : project.name}
                            </span>

                            <span>by {task.assignedBy.name}</span>
                            <span className="text-black/15">·</span>

                            {/* Assignee avatars */}
                            <div className="flex -space-x-1.5">
                              <div
                                className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[8px] font-bold"
                                style={{ backgroundColor: task.assignedTo.color }}
                              >
                                {task.assignedTo.initials}
                              </div>
                              {task.assignedBy.name !== 'You' && (
                                <div
                                  className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[8px] font-bold"
                                  style={{ backgroundColor: task.assignedBy.color }}
                                >
                                  {task.assignedBy.initials}
                                </div>
                              )}
                            </div>
                            <span>{task.assignedBy.name !== 'You' ? '2 people' : '1 person'}</span>
                            <span className="text-black/15">·</span>

                            {/* Due date */}
                            <Calendar className="w-3 h-3" />
                            <span className={isOverdue ? 'text-red-500 font-semibold' : ''}>{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Priority Tag */}
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 ${pc.bg} ${pc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                          {task.priority}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
