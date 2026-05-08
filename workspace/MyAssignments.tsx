'use client';

/**
 * My Tasks — Basecamp-inspired To-Dos layout.
 *
 *   Grouping:    by project (Brego Group · Accounts & Taxation ·
 *                Performance Marketing) — answers "which team?" first,
 *                then lets the user scan within each list.
 *   Row:         single-line, calm. Checkbox · Title · right-aligned
 *                meta (assignee face · added by · due date) · priority.
 *   No chrome:   no project badge inside the row (group owns that),
 *                no "N people" count, no drag handle, no big header
 *                progress bar.
 */

import { useState, useMemo } from 'react';
import {
  Search, ChevronDown, CheckCircle2,
  Filter, X,
} from 'lucide-react';
import {
  Task, TaskStatus, QuickFilter, SortOption,
  generateTasks, mockProjects,
} from './task-data';
import { TaskDetailPanel } from './shared/TaskDetailPanel';
import { TaskListRow } from './shared/TaskListRow';

const TODAY_ISO = '2026-03-18';
const WEEK_END_ISO = '2026-03-22';

// ─────────────────────────────────────────────────────────────────────
export function MyAssignments() {
  const [tasks, setTasks] = useState<Task[]>(generateTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('Due Date');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: (t.status === 'Completed' ? 'Pending' : 'Completed') as TaskStatus }
        : t
    ));
    // Keep the selected-task view in sync if the drawer is open.
    setSelectedTask(prev => prev && prev.id === taskId
      ? { ...prev, status: (prev.status === 'Completed' ? 'Pending' : 'Completed') as TaskStatus }
      : prev
    );
  };

  // ── Stats ──
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const overdueCount = tasks.filter(t => t.dueDateISO < TODAY_ISO && t.status !== 'Completed').length;
  const pendingCount = tasks.length - completedCount;

  const activeFilterCount = [
    quickFilter !== 'all', statusFilter !== 'All', priorityFilter !== 'All', sourceFilter !== 'All',
  ].filter(Boolean).length;

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (searchQuery) filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (sourceFilter !== 'All') {
      switch (sourceFilter) {
        case 'My Team':             filtered = filtered.filter(t => t.tags?.includes('My Team') || t.assignedBy.name === 'You'); break;
        case 'Brego PM':            filtered = filtered.filter(t => t.projectId === 'pm'); break;
        case 'Brego Group':         filtered = filtered.filter(t => t.projectId === 'bg'); break;
        case 'Accounts & Taxation': filtered = filtered.filter(t => t.projectId === 'at'); break;
      }
    }
    if (statusFilter !== 'All') filtered = filtered.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'All') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (quickFilter === 'thisWeek') filtered = filtered.filter(t => t.dueDateISO >= '2026-03-16' && t.dueDateISO <= WEEK_END_ISO);
    if (quickFilter === 'overdue')  filtered = filtered.filter(t => t.dueDateISO < TODAY_ISO && t.status !== 'Completed');

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

  // ── Group by project — Basecamp's "to-do list per project" pattern ──
  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      if (!map[t.projectId]) map[t.projectId] = [];
      map[t.projectId].push(t);
    }
    return map;
  }, [filteredTasks]);

  // Render projects in a stable order, only if they have tasks
  const renderProjects = mockProjects.filter(p => (grouped[p.id]?.length ?? 0) > 0);

  return (
    <div className="-mx-8 -mt-6">
      {/* ═══ STICKY TOP BAR ═══ */}
      <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: title + verdict line */}
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="text-black/90 text-h2 font-bold">My Tasks</h1>
              <div className="w-px h-5 bg-black/8" aria-hidden="true" />
              <p className="text-caption text-black/65 font-medium tabular-nums">
                {overdueCount > 0 && (
                  <>
                    <span className="text-rose-700 font-semibold">{overdueCount} overdue</span>
                    <span className="text-black/25 mx-2" aria-hidden="true">·</span>
                  </>
                )}
                <span>{pendingCount} pending</span>
                <span className="text-black/25 mx-2" aria-hidden="true">·</span>
                <span className="text-emerald-700">{completedCount} complete</span>
              </p>
            </div>

            {/* Right: search + filter + GPT */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative flex items-center w-52">
                <Search className="absolute left-3 w-4 h-4 text-black/45 pointer-events-none" aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/45 focus:outline-none focus:bg-white focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/15 transition-all text-caption font-normal"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                aria-pressed={showFilters}
                aria-expanded={showFilters}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-[0.98] text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-[#EEF1FB] border-[#204CC7]/25 text-[#204CC7]'
                    : 'border-black/10 hover:bg-black/[0.03] hover:border-black/20 text-black/70'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div className="px-6 pb-3 border-t border-black/[0.05]">
            <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {([
                  { key: 'all' as QuickFilter,      label: `All (${tasks.length})` },
                  { key: 'thisWeek' as QuickFilter, label: 'This Week' },
                  { key: 'overdue' as QuickFilter,  label: `Overdue (${overdueCount})` },
                ] as const).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setQuickFilter(f.key)}
                    aria-pressed={quickFilter === f.key}
                    className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 ${
                      quickFilter === f.key
                        ? 'bg-[#EEF1FB] text-[#204CC7]'
                        : 'text-black/65 hover:bg-black/[0.04]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <div className="w-px h-5 bg-black/[0.08]" aria-hidden="true" />

                <FilterSelect value={sourceFilter} onChange={setSourceFilter} ariaLabel="Source"
                  options={[
                    { value: 'All', label: 'All sources' },
                    { value: 'My Team', label: 'My Team' },
                    { value: 'Brego Group', label: 'Brego Group' },
                    { value: 'Accounts & Taxation', label: 'Accounts & Taxation' },
                    { value: 'Brego PM', label: 'Performance Marketing' },
                  ]}
                />
                <FilterSelect value={statusFilter} onChange={setStatusFilter} ariaLabel="Status"
                  options={[
                    { value: 'All', label: 'All statuses' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Completed', label: 'Completed' },
                  ]}
                />
                <FilterSelect value={priorityFilter} onChange={setPriorityFilter} ariaLabel="Priority"
                  options={[
                    { value: 'All', label: 'All priorities' },
                    { value: 'P1', label: 'P1 — Urgent' },
                    { value: 'P2', label: 'P2 — High' },
                    { value: 'P3', label: 'P3 — Normal' },
                  ]}
                />

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setSourceFilter('All'); setQuickFilter('all'); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-caption font-medium text-rose-600 hover:bg-rose-50 transition-all"
                  >
                    <X className="w-3 h-3" aria-hidden="true" /> Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-caption text-black/55 font-medium">Sort by</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort by"
                    className="appearance-none pl-2.5 pr-6 py-1.5 rounded-lg border border-black/[0.10] bg-white text-caption font-medium text-black/70 cursor-pointer hover:border-black/20 transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20"
                  >
                    <option value="Due Date">Due Date</option>
                    <option value="Priority">Priority</option>
                    <option value="Status">Status</option>
                    <option value="Recently Added">Recently Added</option>
                  </select>
                  <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/45 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Project groups — Basecamp "to-do lists" ═══ */}
      <div className="px-8 py-6 space-y-8">
        {renderProjects.length === 0 ? (
          <EmptyState />
        ) : (
          renderProjects.map(project => {
            const list = grouped[project.id];
            return (
              <section key={project.id} aria-labelledby={`group-${project.id}`}>
                {/* Group header — project name + count, calm */}
                <div className="flex items-baseline gap-2.5 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
                  <h2 id={`group-${project.id}`} className="text-h3 font-semibold text-black/85">{project.name}</h2>
                  <span className="text-caption text-black/55 font-normal tabular-nums">
                    {list.length} {list.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {/* Task list */}
                <div
                  role="list"
                  aria-label={`${project.name} tasks`}
                  className="bg-white rounded-xl border border-black/[0.06] overflow-hidden divide-y divide-black/[0.04]"
                >
                  {list.map(task => (
                    <TaskListRow
                      key={task.id}
                      task={task}
                      accentColor={project.color}
                      currentUserPinned
                      onToggle={() => toggleTaskComplete(task.id)}
                      onOpen={() => setSelectedTask(task)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Task detail drawer — same format as the client-group todo view.
          currentUserPinned=true ensures "You" appears as the lead
          assignee in the drawer's Assigned-to roster. */}
      {selectedTask && (() => {
        const project = mockProjects.find(p => p.id === selectedTask.projectId);
        if (!project) return null;
        return (
          <TaskDetailPanel
            task={selectedTask}
            project={project}
            onClose={() => setSelectedTask(null)}
            onToggle={() => toggleTaskComplete(selectedTask.id)}
            currentUserPinned
          />
        );
      })()}
    </div>
  );
}

function FilterSelect({
  value, onChange, ariaLabel, options,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  options: { value: string; label: string }[];
}) {
  const isActive = value !== 'All';
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
          isActive
            ? 'bg-[#EEF1FB] border-[#204CC7]/25 text-[#204CC7]'
            : 'bg-white border-black/[0.10] text-black/70 hover:border-black/20'
        }`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/45 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] py-16 text-center">
      <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" aria-hidden="true" />
      <p className="text-body font-medium text-black/70">Nothing matches your filters</p>
      <p className="text-caption font-normal text-black/55 mt-1">Try loosening a filter or clearing the search.</p>
    </div>
  );
}
