'use client';
import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, ChevronLeft, ChevronDown, ChevronRight, Circle, CheckCircle2,
  Calendar, Filter, ArrowUpDown, Clock, AlertTriangle, GripVertical,
  X, Paperclip, MessageSquare, Activity, MoreVertical, FileText,
  Sparkles, FolderPlus
} from 'lucide-react';
import { BregoGroupDetail } from './BregoGroupDetail';
import {
  Task, TaskStatus, Priority, SortOption, QuickFilter, Project,
  priorityConfig, statusConfig, teamMembers, mockProjects, generateTasks,
  ClientGroup, clientGroups
} from './task-data';

// ── Types ──
type View = 'overview' | 'serviceClients' | 'clientTodoList' | 'bregoGroupDetail';

// ── Progress Ring Component ──
function ProgressRing({ completed, total, size = 48, strokeWidth = 4 }: { completed: number; total: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? (completed / total) * circumference : 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#204CC7" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-500" />
    </svg>
  );
}

// ── Breadcrumb Component ──
function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-caption text-muted-fg mb-1" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-fg/50" aria-hidden="true" />}
          {item.onClick ? (
            <button onClick={item.onClick} className="hover:text-[#204CC7] transition-colors font-medium">{item.label}</button>
          ) : (
            <span className="text-foreground font-semibold">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

// ── Client Dropdown Component (rich, with task counts + overdue indicators) ──
function ClientDropdown({ groups, tasks, value, onChange, todayISO }: {
  groups: ClientGroup[];
  tasks: Task[];
  value: string;
  onChange: (id: string) => void;
  todayISO: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedGroup = groups.find(g => g.id === value);
  const isActive = value !== 'All';

  // Compute stats for each group
  const groupStats = useMemo(() => {
    const stats: Record<string, { total: number; overdue: number; completed: number }> = {};
    groups.forEach(g => {
      const groupTasks = tasks.filter(t => t.clientGroupId === g.id);
      stats[g.id] = {
        total: groupTasks.length,
        overdue: groupTasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length,
        completed: groupTasks.filter(t => t.status === 'Completed').length,
      };
    });
    return stats;
  }, [groups, tasks, todayISO]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-caption font-medium transition-all ${isActive ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/10 text-muted-fg hover:border-black/20'}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {isActive && selectedGroup && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedGroup.color }} aria-hidden="true" />
        )}
        {isActive && selectedGroup ? (
          <>
            <span className="opacity-60">Client:</span>
            <span className="font-semibold">{selectedGroup.name}</span>
          </>
        ) : (
          <span>Client</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-50" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-2 z-50 min-w-[280px]" role="listbox">
          {/* All option */}
          <button
            role="option"
            aria-selected={value === 'All'}
            onClick={() => { onChange('All'); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-caption font-medium transition-colors ${value === 'All' ? 'bg-[#EEF1FB] text-[#204CC7]' : 'text-foreground hover:bg-black/[0.03]'}`}
          >
            All Clients
          </button>

          <div className="border-t border-black/[0.05] my-1.5" aria-hidden="true" />

          {/* Client options */}
          {groups.map(group => {
            const stats = groupStats[group.id] || { total: 0, overdue: 0, completed: 0 };
            return (
              <button
                key={group.id}
                role="option"
                aria-selected={value === group.id}
                onClick={() => { onChange(group.id); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 transition-colors ${value === group.id ? 'bg-[#EEF1FB]' : 'hover:bg-black/[0.02]'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} aria-hidden="true" />
                    <span className={`text-caption font-medium ${value === group.id ? 'text-[#204CC7] font-semibold' : 'text-foreground'}`}>
                      {group.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-muted-fg">{stats.total} task{stats.total !== 1 ? 's' : ''}</span>
                    {stats.overdue > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold">
                        {stats.overdue}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Filter Dropdown Component ──
function FilterDropdown({ label, value, options, onChange, icon }: { label: string; value: string; options: string[]; onChange: (v: string) => void; icon?: React.ReactNode }) {
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
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-caption font-medium transition-all ${isActive ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/10 text-muted-fg hover:border-black/20'}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {icon}
        {isActive ? (
          <>
            <span className="opacity-60">{label}:</span>
            <span className="font-semibold">{value}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-50" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[160px]" role="listbox">
          {options.map(opt => (
            <button
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2 text-caption font-medium transition-colors ${value === opt ? 'bg-[#EEF1FB] text-[#204CC7]' : 'text-foreground hover:bg-black/[0.03]'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Add To-Do Modal ──
function AddTodoModal({ onClose, onAdd, projectName }: { onClose: () => void; onAdd: (task: Partial<Task>) => void; projectName: string }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('P2');
  const [assignedTo, setAssignedTo] = useState(teamMembers[0]);
  const [dueDate, setDueDate] = useState('');
  const [notifyTo, setNotifyTo] = useState('');

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
                value={assignedTo.initials}
                onChange={e => setAssignedTo(teamMembers.find(t => t.initials === e.target.value) || teamMembers[0])}
                className="w-full px-4 py-3 bg-white rounded-xl border border-black/[0.08] text-body text-black/85 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/8 transition-all appearance-none cursor-pointer"
              >
                {teamMembers.map(t => <option key={t.initials} value={t.initials}>{t.name}</option>)}
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
            onClick={() => { if (canSubmit) { onAdd({ title, description: notes, priority, assignedTo }); onClose(); } }}
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

// ── Task Detail Side Panel ──
function TaskDetailPanel({ task, project, onClose, onToggle }: { task: Task; project: Project; onClose: () => void; onToggle: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const pc = priorityConfig[task.priority];
  const sc = statusConfig[task.status];
  const isCompleted = task.status === 'Completed';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label="Task details">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="px-7 pt-7 pb-5 border-b border-black/[0.06]">
          {/* Top row: Priority + Project + Close */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ${pc.bg} ${pc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} aria-hidden="true" />{pc.label}
              </span>
              <span className="text-caption font-medium text-muted-fg">{project.name}</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors" aria-label="Close panel">
              <X className="w-4.5 h-4.5 text-muted-fg" aria-hidden="true" />
            </button>
          </div>

          {/* Title */}
          <h2 className="text-h3 font-bold text-foreground mb-5 leading-snug">{task.title}</h2>

          {/* Meta chips */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-caption font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{task.status}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.06] text-caption font-medium text-muted-fg">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <time dateTime={task.dueDateISO}>{task.dueDate}</time>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/[0.06] text-caption font-medium text-muted-fg">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: task.assignedTo.color }}>{task.assignedTo.initials}</span>
              {task.assignedTo.name}
            </span>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center px-7 border-b border-black/[0.06]" role="tablist">
          {[
            { id: 'details' as const, label: 'Details', icon: FileText },
            { id: 'activity' as const, label: 'Activity', icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3.5 border-b-2 text-caption font-medium transition-all ${
                activeTab === tab.id
                  ? 'border-[#204CC7] text-[#204CC7] font-semibold'
                  : 'border-transparent text-muted-fg hover:text-foreground'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6" role="tabpanel">

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-7">
              {/* Description */}
              <div>
                <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-3">Description</label>
                <p className="text-body font-normal text-foreground leading-relaxed">{task.description}</p>
              </div>

              {/* Assigned By */}
              <div>
                <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-3">Assigned By</label>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: task.assignedBy.color }}>{task.assignedBy.initials}</div>
                  <div>
                    <span className="text-body font-medium text-foreground block">{task.assignedBy.name}</span>
                    <span className="text-caption text-muted-fg">Task creator</span>
                  </div>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-3">Assigned To</label>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: task.assignedTo.color }}>{task.assignedTo.initials}</div>
                  <div>
                    <span className="text-body font-medium text-foreground block">{task.assignedTo.name}</span>
                    <span className="text-caption text-muted-fg">Responsible</span>
                  </div>
                </div>
              </div>


              {/* Attachments */}
              <div>
                <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-3">Attachments</label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-dashed border-black/10 text-caption font-medium text-muted-fg">
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  <span>No attachments yet — drop files here</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onToggle}
                className={`w-full py-3 rounded-xl border text-body font-semibold transition-all ${
                  isCompleted
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {isCompleted ? '↩ Reopen Task' : '✓ Mark as Completed'}
              </button>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-1">
              {[
                { action: 'Task created', by: task.assignedBy.name, time: '5 days ago', icon: '➕' },
                { action: `Assigned to ${task.assignedTo.name}`, by: task.assignedBy.name, time: '5 days ago', icon: '👤' },
                { action: `Priority set to ${task.priority}`, by: task.assignedBy.name, time: '5 days ago', icon: '🏷' },
                ...(isCompleted ? [{ action: 'Marked as completed', by: task.assignedTo.name, time: '1 day ago', icon: '✅' }] : []),
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-black/[0.03] last:border-0">
                  <span className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-[12px] flex-shrink-0 mt-0.5" aria-hidden="true">{log.icon}</span>
                  <div className="flex-1">
                    <p className="text-body font-normal text-foreground">
                      <span className="font-semibold">{log.by}</span> {log.action.toLowerCase().startsWith(log.by.toLowerCase()) ? log.action.slice(log.by.length) : `— ${log.action}`}
                    </p>
                    <span className="text-caption text-muted-fg">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── New Client Group Modal ──
function NewGroupModal({ projectId, onClose, onCreate }: { projectId: string; onClose: () => void; onCreate: (name: string, color: string) => void }) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const presetColors = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#2563EB', '#F97316'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[400px] p-7" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-h3 font-bold text-foreground">New Client Group</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-fg" />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-2">Client Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. TechCorp India"
              className="w-full px-4 py-3 rounded-xl border border-black/10 text-body font-normal text-foreground placeholder:text-muted-fg focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
              autoFocus
            />
          </div>
          <div>
            <label className="text-caption font-semibold text-muted-fg uppercase tracking-wider block mb-3">Color</label>
            <div className="flex gap-2.5">
              {presetColors.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-[#204CC7]' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => { if (name.trim()) { onCreate(name.trim(), selectedColor); onClose(); } }}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl bg-[#204CC7] text-white text-body font-semibold hover:bg-[#1a3fa8] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
interface TaskManagementProps {
  onBack?: () => void;
}

export function TaskManagement({ onBack }: TaskManagementProps) {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<View>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>(generateTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assignedByFilter, setAssignedByFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('Due Date');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [clientGroupFilter, setClientGroupFilter] = useState('All');
  const [clientSearch, setClientSearch] = useState('');
  const [localClientGroups, setLocalClientGroups] = useState<ClientGroup[]>(clientGroups);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [selectedClientGroup, setSelectedClientGroup] = useState<ClientGroup | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'today' | 'thisWeek'>('thisWeek');

  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const todayISO = '2026-03-18';

  // Filtered & sorted tasks for To-Do view
  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    let filtered = tasks.filter(t => t.projectId === selectedProject.id);

    if (searchQuery) filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (statusFilter !== 'All') filtered = filtered.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'All') filtered = filtered.filter(t => t.priority === priorityFilter);
    if (assignedByFilter !== 'All') {
      if (assignedByFilter === 'You') filtered = filtered.filter(t => t.assignedBy.name === 'You');
      else filtered = filtered.filter(t => t.assignedBy.name !== 'You');
    }
    if (quickFilter === 'thisWeek') {
      // Show tasks due this week (March 16 - March 22, 2026)
      filtered = filtered.filter(t => t.dueDateISO >= '2026-03-16' && t.dueDateISO <= '2026-03-22');
    }
    if (quickFilter === 'overdue') {
      filtered = filtered.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed');
    }

    // Client group filter
    if (clientGroupFilter !== 'All') {
      filtered = filtered.filter(t => t.clientGroupId === clientGroupFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'Due Date') return a.dueDateISO.localeCompare(b.dueDateISO);
      if (sortBy === 'Priority') return a.priority.localeCompare(b.priority);
      if (sortBy === 'Status') return a.status.localeCompare(b.status);
      return 0; // Recently Added = default order
    });

    return filtered;
  }, [tasks, selectedProject, searchQuery, statusFilter, priorityFilter, assignedByFilter, quickFilter, sortBy, clientGroupFilter]);

  const completedCount = selectedProject ? tasks.filter(t => t.projectId === selectedProject.id && t.status === 'Completed').length : 0;
  const totalCount = selectedProject ? tasks.filter(t => t.projectId === selectedProject.id).length : 0;
  const overdueCount = selectedProject ? tasks.filter(t => t.projectId === selectedProject.id && t.dueDateISO < todayISO && t.status !== 'Completed').length : 0;

  // Unique assignees for the current client group (for filter dropdown)
  const clientAssignees = useMemo(() => {
    if (!selectedProject || clientGroupFilter === 'All') return [...new Map(tasks.filter(t => t.projectId === selectedProject?.id).map(t => [t.assignedTo.initials, t.assignedTo])).values()];
    return [...new Map(tasks.filter(t => t.clientGroupId === clientGroupFilter).map(t => [t.assignedTo.initials, t.assignedTo])).values()];
  }, [tasks, selectedProject, clientGroupFilter]);

  const clientActiveFilterCount = [statusFilter !== 'All', priorityFilter !== 'All', assignedByFilter !== 'All'].filter(Boolean).length;

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: prev.status === 'Completed' ? 'Pending' : 'Completed' } : null);
    }
  };

  const handleAddTask = (partial: Partial<Task>) => {
    if (!selectedProject) return;
    const newTask: Task = {
      id: `t${Date.now()}`,
      title: partial.title || '',
      description: partial.description || '',
      status: 'Pending',
      priority: partial.priority || 'P2',
      dueDate: 'Thu, 19 Mar',
      dueDateISO: '2026-03-19',
      assignedBy: { name: 'You', initials: 'YO', color: '#204CC7' },
      assignedTo: partial.assignedTo || teamMembers[0],
      projectId: selectedProject.id,
      comments: 0,
    };
    setTasks(prev => [newTask, ...prev]);
  };

  // Unique "Assigned By" names for current project
  const assignedByOptions = useMemo(() => {
    if (!selectedProject) return ['All'];
    const names = [...new Set(tasks.filter(t => t.projectId === selectedProject.id).map(t => t.assignedBy.name))];
    return ['All', ...names];
  }, [tasks, selectedProject]);

  // Grouped tasks by client group
  const groupedProjectTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    const ungrouped: Task[] = [];
    projectTasks.forEach(task => {
      if (task.clientGroupId) {
        if (!groups[task.clientGroupId]) groups[task.clientGroupId] = [];
        groups[task.clientGroupId].push(task);
      } else {
        ungrouped.push(task);
      }
    });
    return { groups, ungrouped };
  }, [projectTasks]);

  // Client card stats for serviceClients view
  const clientCardStats = useMemo(() => {
    if (!selectedProject) return [];
    return localClientGroups
      .filter(g => g.projectId === selectedProject.id)
      .map((group, gi) => {
        const groupTasks = tasks.filter(t => t.clientGroupId === group.id);
        const completed = groupTasks.filter(t => t.status === 'Completed').length;
        const total = groupTasks.length;
        const overdue = groupTasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length;
        const taskAssignees = [...new Map(groupTasks.map(t => [t.assignedTo.initials, t.assignedTo])).values()];
        // Ensure 10+ members per card by filling from teamMembers roster
        const seen = new Set(taskAssignees.map(a => a.initials));
        const extra = teamMembers.filter(m => !seen.has(m.initials));
        const offset = (gi * 3) % extra.length;
        const needed = Math.max(0, 11 - taskAssignees.length);
        const filler = [...extra.slice(offset), ...extra.slice(0, offset)].slice(0, needed);
        const assignees = [...taskAssignees, ...filler];
        return { ...group, total, completed, overdue, assignees };
      });
  }, [selectedProject, localClientGroups, tasks, todayISO]);

  // Render a single task row (extracted for reuse in grouped rendering)
  const renderTaskRow = (task: Task) => {
    const pc = priorityConfig[task.priority];
    const isOverdue = task.dueDateISO < todayISO && task.status !== 'Completed';
    const isCompleted = task.status === 'Completed';

    return (
      <div
        key={task.id}
        role="listitem"
        draggable
        onDragStart={() => setDragTaskId(task.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOverTaskId(task.id); }}
        onDragEnd={() => {
          if (dragTaskId && dragOverTaskId && dragTaskId !== dragOverTaskId) {
            setTasks(prev => {
              const updated = [...prev];
              const from = updated.findIndex(t => t.id === dragTaskId);
              const to = updated.findIndex(t => t.id === dragOverTaskId);
              if (from === -1 || to === -1) return prev;
              const [moved] = updated.splice(from, 1);
              updated.splice(to, 0, moved);
              return updated;
            });
          }
          setDragTaskId(null);
          setDragOverTaskId(null);
        }}
        className={`group/row flex items-start gap-3 px-5 py-5 transition-all cursor-pointer select-none border-l-[3px] ${
          dragTaskId === task.id
            ? 'opacity-40 scale-[0.99]'
            : dragOverTaskId === task.id
              ? 'bg-[#EEF1FB]/40 border-t-2 border-t-[#204CC7]/20'
              : 'hover:bg-[#FAFBFF]'
        }`}
        style={{ borderLeftColor: isCompleted ? '#D4D4D8' : selectedProject?.color || '#999', cursor: 'grab' }}
        onClick={() => setSelectedTask(task)}
      >
        {/* Drag Handle */}
        <div className="flex-shrink-0 mt-1 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" aria-hidden="true">
          <GripVertical className="w-4 h-4 text-black/20" />
        </div>

        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); toggleTaskComplete(task.id); }}
          className="flex-shrink-0 mt-0.5"
          aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
          aria-pressed={isCompleted}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-[20px] h-[20px] text-emerald-500 fill-emerald-500" />
          ) : (
            <Circle className="w-[20px] h-[20px] text-black/25 group-hover/row:text-[#204CC7]/50 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-body font-medium leading-snug mb-2 ${isCompleted ? 'line-through text-muted-fg' : 'text-foreground'}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-3 text-caption text-muted-fg flex-wrap">
            <span className="font-medium">by {task.assignedBy.name}</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: task.assignedTo.color }} title={task.assignedTo.name}>{task.assignedTo.initials}</span>
              {task.assignedTo.name}
            </span>
            <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <time dateTime={task.dueDateISO}>{task.dueDate}</time>
              {isOverdue && <span aria-hidden="true"> (overdue)</span>}
            </span>
          </div>
        </div>

        {/* Right: Comments + Priority */}
        <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
          {task.comments > 0 && (
            <span className="flex items-center gap-1 text-caption text-muted-fg" aria-label={`${task.comments} comments`}>
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />{task.comments}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ${pc.bg} ${pc.text}`} aria-label={`Priority ${pc.label}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} aria-hidden="true" />{pc.label}
          </span>
        </div>
      </div>
    );
  };

  // Schedule mock data
  const mockSchedule = [
    { id: 's1', date: '2026-03-18', task: 'Set up Google Ads campaign for Alpine Group Q2 launch', project: 'Performance Marketing', projectColor: '#3B82F6' },
    { id: 's2', date: '2026-03-17', task: 'Update client onboarding SOP with new compliance checklist', project: 'Brego Group', projectColor: '#204CC7' },
    { id: 's3', date: '2026-03-19', task: 'Create Meta Ads creative variants for 99 Pancakes', project: 'Performance Marketing', projectColor: '#3B82F6' },
    { id: 's4', date: '2026-03-16', task: 'Verify vendor invoices and process pending payments', project: 'Accounts & Taxation', projectColor: '#10B981' },
    { id: 's5', date: '2026-03-20', task: 'Prepare resource allocation plan for Q2', project: 'Brego Group', projectColor: '#204CC7' },
  ];

  // ── Brego Group Detail ──
  if (currentView === 'bregoGroupDetail') {
    return <BregoGroupDetail onBack={() => setCurrentView('overview')} />;
  }

  // ── Overview ──
  if (currentView === 'overview') {
    const allPendingTasks = tasks.filter(t => t.status !== 'Completed');
    const upcomingTasks = [...allPendingTasks].sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO));
    const todayTasks = upcomingTasks.filter(t => t.dueDateISO === todayISO);
    const thisWeekTasks = upcomingTasks.filter(t => t.dueDateISO >= '2026-03-16' && t.dueDateISO <= '2026-03-22');

    return (
      <div>
        {/* Project Cards */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {mockProjects.map(project => {
            const pCompleted = tasks.filter(t => t.projectId === project.id && t.status === 'Completed').length;
            const pTotal = tasks.filter(t => t.projectId === project.id).length;
            const pct = pTotal > 0 ? (pCompleted / pTotal) * 100 : 0;

            return (
              <div
                key={project.id}
                onClick={() => {
                  if (project.id === 'bg') {
                    setCurrentView('bregoGroupDetail');
                    return;
                  }
                  setSelectedProject(project); setCurrentView('serviceClients'); setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setAssignedByFilter('All'); setQuickFilter('all'); setClientGroupFilter('All'); setSelectedClientGroup(null);
                }}
                className="bg-white border border-black/[0.06] rounded-xl px-6 py-5 hover:border-[#204CC7]/20 hover:shadow-[0_4px_20px_-4px_rgba(32,76,199,0.06)] transition-all duration-200 cursor-pointer group"
              >
                {/* Project Name with color dot */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-[10px] h-[10px] rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <h3 className="text-black/85 group-hover:text-[#204CC7] transition-colors truncate text-h3 font-semibold">{project.name}</h3>
                </div>

                {/* Team Avatars */}
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="flex -space-x-1.5">
                    {project.team.slice(0, 5).map(m => (
                      <div key={m.initials} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-micro font-bold" style={{ backgroundColor: m.color }}>{m.initials}</div>
                    ))}
                    {project.team.length > 5 && (
                      <div className="w-7 h-7 rounded-full border-2 border-white bg-black/10 flex items-center justify-center text-black/70 text-micro font-bold">
                        +{project.team.length - 5}
                      </div>
                    )}
                  </div>
                  <span className="text-black/55 text-caption font-normal">{project.team.length} members</span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-black/55 text-caption font-normal">Progress</span>
                    <span className="text-black/70 text-caption font-semibold">{pCompleted}/{pTotal}</span>
                  </div>
                  <div className="w-full h-[5px] bg-black/[0.05] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom: My Assignments + Schedule */}
        <div className="grid grid-cols-[1fr_340px] gap-5" style={{ maxHeight: '520px' }}>
          <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden flex flex-col max-h-[520px]" role="region" aria-label="My Assignments">
            {/* Header */}
            {(() => {
              const displayTasks = assignmentFilter === 'today' ? todayTasks : thisWeekTasks;
              const displayCount = displayTasks.length;
              return (<>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.05]">
              <div className="flex items-center gap-3">
                <h2 className="text-h3 font-bold text-foreground">My Assignments</h2>
                <span className="min-w-[24px] h-6 px-1.5 bg-black/[0.05] rounded-md text-caption font-semibold text-muted-fg flex items-center justify-center" aria-label={`${displayCount} tasks`}>{displayCount}</span>
              </div>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Filter by time">
                <button
                  role="tab"
                  aria-selected={assignmentFilter === 'today'}
                  onClick={() => setAssignmentFilter('today')}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                    assignmentFilter === 'today'
                      ? 'bg-[#EEF1FB] text-[#204CC7]'
                      : 'text-muted-fg hover:text-[#204CC7] hover:bg-[#EEF1FB]/50'
                  }`}
                >
                  Today ({todayTasks.length})
                </button>
                <button
                  role="tab"
                  aria-selected={assignmentFilter === 'thisWeek'}
                  onClick={() => setAssignmentFilter('thisWeek')}
                  className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                    assignmentFilter === 'thisWeek'
                      ? 'bg-[#EEF1FB] text-[#204CC7]'
                      : 'text-muted-fg hover:text-[#204CC7] hover:bg-[#EEF1FB]/50'
                  }`}
                >
                  This Week ({thisWeekTasks.length})
                </button>
                <div className="w-px h-5 bg-black/10 mx-1" aria-hidden="true" />
                <button
                  onClick={() => router.push('/workspace/task-management/my-assignments')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-caption font-semibold text-[#204CC7] hover:bg-[#EEF1FB] transition-all"
                  aria-label="See all assignments"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-black/[0.04] flex-1 overflow-y-auto" role="list" aria-label="Assignment list">
              {displayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-body font-semibold text-foreground mb-0.5">
                    {assignmentFilter === 'today' ? 'No tasks due today' : 'No tasks this week'}
                  </p>
                  <p className="text-caption text-muted-fg">
                    {assignmentFilter === 'today' ? 'You\'re all caught up for today!' : 'All clear for this week.'}
                  </p>
                </div>
              ) : displayTasks.slice(0, 5).map(task => {
                const pc = priorityConfig[task.priority];
                const isOverdue = task.dueDateISO < todayISO && task.status !== 'Completed';
                const isCompleted = task.status === 'Completed';
                const proj = mockProjects.find(p => p.id === task.projectId);
                return (
                  <div
                    key={task.id}
                    role="listitem"
                    className="group flex items-start gap-3.5 px-6 py-4 hover:bg-[#FAFBFF] transition-all cursor-pointer"
                    onClick={() => router.push('/workspace/task-management/my-assignments')}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleTaskComplete(task.id); }}
                      className="flex-shrink-0 mt-0.5"
                      aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
                      aria-pressed={isCompleted}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500 fill-emerald-500" />
                      ) : (
                        <Circle className="w-[18px] h-[18px] text-black/25 group-hover:text-[#204CC7]/50 transition-colors" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-body font-medium leading-snug mb-1.5 ${isCompleted ? 'line-through text-muted-fg' : 'text-foreground'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 text-caption text-muted-fg">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: proj?.color || '#999' }} aria-hidden="true" />
                          {proj?.name}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0" style={{ backgroundColor: task.assignedTo.color }} title={task.assignedTo.name}>{task.assignedTo.initials}</span>
                          {task.assignedTo.name.split(' ')[0]}
                        </span>
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                          <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                          <time dateTime={task.dueDateISO}>{task.dueDate}</time>
                          {isOverdue && <span aria-hidden="true"> (overdue)</span>}
                        </span>
                      </div>
                    </div>

                    {/* Priority pill */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold flex-shrink-0 mt-0.5 ${pc.bg} ${pc.text}`} aria-label={`Priority ${pc.label}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} aria-hidden="true" />
                      {pc.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {displayTasks.length > 5 && (
              <div className="px-6 py-3.5 border-t border-black/[0.05]">
                <button
                  onClick={() => router.push('/workspace/task-management/my-assignments')}
                  className="w-full text-center text-caption font-semibold text-[#204CC7] hover:text-[#1a3fa8] transition-colors"
                >
                  View all {displayCount} assignments →
                </button>
              </div>
            )}
              </>);
            })()}
          </div>

          {/* ═══ SCHEDULE WIDGET ═══ */}
          <div className="bg-white rounded-xl border border-black/[0.06] overflow-y-auto flex flex-col max-h-[520px]" role="region" aria-label="Schedule">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
              <h2 className="text-h3 font-bold text-foreground">Schedule</h2>
              <div className="flex items-center gap-1" role="group" aria-label="Month navigation">
                <button aria-label="Previous month" className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-fg" aria-hidden="true" />
                </button>
                <span className="text-caption font-semibold text-foreground px-1 min-w-[80px] text-center" aria-live="polite">Mar 2026</span>
                <button aria-label="Next month" className="w-7 h-7 flex items-center justify-center hover:bg-black/5 rounded-lg transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-fg" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="px-4 pt-3 pb-2" role="grid" aria-label="March 2026 calendar">
              {/* Day labels */}
              <div className="grid grid-cols-7 mb-1" role="row">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={idx} role="columnheader" className="text-center py-1 text-caption font-semibold text-muted-fg" aria-label={day}>
                    {day.charAt(0)}
                  </div>
                ))}
              </div>
              {/* Date cells */}
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }, (_, i) => {
                  const day = i + 1;
                  if (day > 31) return <div key={i} />;
                  const dateStr = `2026-03-${String(day).padStart(2, '0')}`;
                  const events = mockSchedule.filter(e => e.date === dateStr);
                  const isToday = day === 18;
                  const isPast = day < 18;
                  return (
                    <button
                      key={i}
                      role="gridcell"
                      aria-label={`March ${day}${isToday ? ', today' : ''}${events.length > 0 ? `, ${events.length} event${events.length > 1 ? 's' : ''}` : ''}`}
                      aria-current={isToday ? 'date' : undefined}
                      className={`relative flex items-center justify-center w-full aspect-square rounded-xl text-caption font-semibold transition-all ${
                        isToday
                          ? 'bg-[#EEF1FB] text-[#204CC7]'
                          : isPast
                            ? 'text-muted-fg'
                            : 'text-secondary-fg hover:bg-black/[0.04]'
                      }`}
                    >
                      {day}
                      {events.length > 0 && (
                        <div className="absolute bottom-[3px] flex gap-[2px]" aria-hidden="true">
                          {events.slice(0, 2).map((ev, j) => (
                            <div key={j} className="w-[4px] h-[4px] rounded-full" style={{ backgroundColor: ev.projectColor }} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="flex-1 px-5 pb-5">
              <div className="pt-3 border-t border-black/[0.05]">
                <h3 className="text-caption font-semibold text-muted-fg uppercase tracking-wider mb-3">Upcoming</h3>
                <div className="space-y-0.5" role="list" aria-label="Upcoming events">
                  {mockSchedule
                    .filter(e => e.date >= '2026-03-17')
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 4)
                    .map(event => {
                      const eventDate = new Date(event.date + 'T00:00:00');
                      const isEventToday = event.date === '2026-03-18';
                      const isTomorrow = event.date === '2026-03-19';
                      const dateLabel = isEventToday
                        ? 'Today'
                        : isTomorrow
                          ? 'Tomorrow'
                          : eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                      return (
                        <div key={event.id} role="listitem" className="flex items-start gap-3 py-2.5 rounded-lg hover:bg-black/[0.02] px-1 -mx-1 cursor-pointer group transition-colors">
                          <div className="w-[3px] rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: event.projectColor, height: '34px' }} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="text-caption font-medium text-foreground truncate group-hover:text-[#204CC7] transition-colors leading-snug">
                              {event.task}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="w-3 h-3 text-muted-fg flex-shrink-0" aria-hidden="true" />
                              <time dateTime={event.date} className={`text-caption font-medium ${isEventToday ? 'text-[#204CC7] font-semibold' : 'text-muted-fg'}`}>
                                {dateLabel}
                              </time>
                              <span className="text-black/15" aria-hidden="true">·</span>
                              <span className="text-caption font-medium text-muted-fg truncate">{event.project}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Service Clients View (Level 2) ──
  if (currentView === 'serviceClients' && selectedProject) {
    const projectTaskCount = tasks.filter(t => t.projectId === selectedProject.id).length;
    const projectCompletedCount = tasks.filter(t => t.projectId === selectedProject.id && t.status === 'Completed').length;
    const projectOverdueCount = tasks.filter(t => t.projectId === selectedProject.id && t.dueDateISO < todayISO && t.status !== 'Completed').length;
    const filteredClients = clientCardStats.filter(c => clientSearch === '' || c.name.toLowerCase().includes(clientSearch.toLowerCase()));

    return (
      <div className="-mx-8 -mt-6">
        {/* ═══ STICKY TOP BAR — matches Brego Group pattern ═══ */}
        <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => { setCurrentView('overview'); setSelectedProject(null); }} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95" aria-label="Back to Task Management">
                  <ChevronLeft className="w-5 h-5 text-black/60" />
                </button>
                <h1 className="text-black/90 text-h2 font-bold">{selectedProject.name}</h1>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative flex items-center w-52">
                  <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                  <input
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search clients..."
                    aria-label="Search clients"
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                  />
                </div>

                <div className="w-px h-8 bg-black/8" />

                {/* New Group CTA */}
                <button onClick={() => setShowNewGroupModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium">
                  <FolderPlus className="w-3.5 h-3.5" /> New Group
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="p-8">
          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/5 py-16 text-center">
              <FolderPlus className="w-10 h-10 text-black/10 mx-auto mb-3" />
              <p className="text-body font-medium text-muted-fg">No clients found</p>
              <p className="text-caption text-muted-fg mt-1">Try a different search or create a new group</p>
            </div>
          ) : (() => {
            const sortedClients = [...filteredClients].sort((a, b) => a.id.startsWith('cg-bdt-') ? -1 : b.id.startsWith('cg-bdt-') ? 1 : 0);
            return (
              <div className="grid grid-cols-2 gap-5">
                {sortedClients.map(client => {
                  const isBDT = client.id.startsWith('cg-bdt-');
                  const inProgress = client.total - client.completed - client.overdue;
                  const pending = client.total - client.completed - inProgress - client.overdue;
                  return (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClientGroup(client);
                        setClientGroupFilter(client.id);
                        setCurrentView('clientTodoList');
                        setSearchQuery(''); setStatusFilter('All'); setPriorityFilter('All'); setAssignedByFilter('All'); setQuickFilter('all');
                      }}
                      className={`rounded-xl p-6 cursor-pointer hover:-translate-y-[1px] transition-all duration-200 relative overflow-hidden group ${
                        isBDT
                          ? 'bg-[#EEF1FB] border border-[#204CC7]/10 hover:shadow-[0_4px_20px_-4px_rgba(32,76,199,0.12)]'
                          : 'bg-white border border-black/[0.06] hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]'
                      }`}
                      role="button"
                      aria-label={`${client.name} — ${client.total} tasks, ${client.overdue} overdue`}
                    >
                      {/* Left accent */}
                      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: client.color }} />

                      {/* Header row */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: client.color }} />
                          <h3 className={`text-body font-bold truncate transition-colors ${isBDT ? 'text-[#204CC7] group-hover:text-[#1a3fa8]' : 'text-black/90 group-hover:text-[#204CC7]'}`}>{client.name}</h3>
                          <span className="text-caption text-black/40 font-medium flex-shrink-0">·</span>
                          <span className={`text-caption font-medium flex-shrink-0 ${isBDT ? 'text-[#204CC7]/60' : 'text-black/55'}`}>{client.total} tasks</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-black/15 group-hover:text-black/55 group-hover:translate-x-[2px] transition-all flex-shrink-0 ml-2" />
                      </div>

                      {/* Team */}
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="flex -space-x-1.5">
                          {client.assignees.slice(0, 5).map((a: any) => (
                            <div key={a.initials} className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${isBDT ? 'border-2 border-[#EEF1FB]' : 'border-2 border-white'}`} style={{ backgroundColor: a.color }} title={a.name}>
                              {a.initials}
                            </div>
                          ))}
                          {client.assignees.length > 5 && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${isBDT ? 'border-2 border-[#EEF1FB] bg-[#204CC7]/10 text-[#204CC7]' : 'border-2 border-white bg-black/10 text-black/70'}`}>
                              +{client.assignees.length - 5}
                            </div>
                          )}
                        </div>
                        <span className={`text-caption font-medium ${isBDT ? 'text-[#204CC7]/50' : 'text-black/55'}`}>{client.assignees.length} member{client.assignees.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Stats row */}
                      <div className={`flex pt-4 border-t ${isBDT ? 'border-[#204CC7]/8' : 'border-black/[0.04]'}`}>
                        {[
                          { val: client.overdue, label: 'Overdue', color: 'text-red-600' },
                          { val: inProgress, label: 'In Progress', color: 'text-amber-600' },
                          { val: pending >= 0 ? pending : 0, label: 'Pending', color: 'text-black/65' },
                          { val: client.completed, label: 'Done', color: 'text-emerald-600' },
                        ].map((s, i) => (
                          <div key={s.label} className={`flex-1 text-center ${i > 0 ? (isBDT ? 'border-l border-[#204CC7]/8' : 'border-l border-black/[0.04]') : ''}`}>
                            <div className={`text-h3 font-bold ${s.color}`}>{s.val}</div>
                            <div className="text-black/55 text-micro mt-[2px]">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* New Group Modal */}
        {showNewGroupModal && selectedProject && (
          <NewGroupModal
            projectId={selectedProject.id}
            onClose={() => setShowNewGroupModal(false)}
            onCreate={(name, color) => {
              setLocalClientGroups(prev => [...prev, {
                id: `cg-${Date.now()}`,
                name,
                projectId: selectedProject.id,
                color,
              }]);
            }}
          />
        )}
      </div>
    );
  }

  // ── Client To-Do List View (Level 3) ──
  if (currentView === 'clientTodoList' && selectedProject) {
    return (
      <div className="-mx-8 -mt-6">
        {/* ═══ STICKY TOP BAR ═══ */}
        <div className="sticky -top-6 z-30 bg-white border-b border-black/5">
          {/* Primary row: Back + Title | Search + Filter + Add To-Do */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-shrink-0">
                <button onClick={() => { setCurrentView('serviceClients'); setSelectedClientGroup(null); setClientGroupFilter('All'); setShowFilters(false); }} className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95" aria-label="Back to client list">
                  <ChevronLeft className="w-5 h-5 text-black/60" />
                </button>
                <h1 className="text-black/90 text-h2 font-bold">{selectedClientGroup?.name || selectedProject.name}</h1>
                <div className="w-px h-5 bg-black/8" />
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {clientAssignees.slice(0, 5).map(a => (
                      <div key={a.initials} className="w-5 h-5 rounded-full border-[1.5px] border-white flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: a.color }} title={a.name}>{a.initials}</div>
                    ))}
                    {clientAssignees.length > 5 && (
                      <div className="w-5 h-5 rounded-full border-[1.5px] border-white bg-black/10 flex items-center justify-center text-black/70 text-[7px] font-bold">+{clientAssignees.length - 5}</div>
                    )}
                  </div>
                  <span className="text-caption text-black/55 font-medium">{clientAssignees.length} members</span>
                </div>
                {(() => {
                  const st = tasks.filter(t => t.projectId === selectedProject.id && (clientGroupFilter === 'All' || t.clientGroupId === clientGroupFilter));
                  const sp = st.length > 0 ? Math.round((st.filter(t => t.status === 'Completed').length / st.length) * 100) : 0;
                  return (
                    <div className="flex items-center gap-1.5 text-caption text-black/55 font-medium">
                      <div className="w-20 h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${sp}%`, backgroundColor: selectedProject.color }} />
                      </div>
                      {sp}%
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex items-center w-52">
                  <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    aria-label="Search tasks"
                    className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all active:scale-[0.98] text-caption font-medium ${
                    showFilters || clientActiveFilterCount > 0
                      ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                      : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{clientActiveFilterCount > 0 ? ` (${clientActiveFilterCount})` : ''}
                </button>

                <div className="w-px h-8 bg-black/8" />

                {/* Add To-Do CTA */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add To-Do
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible filter panel — single row */}
          {showFilters && (() => {
            const scopedTasks = tasks.filter(t => t.projectId === selectedProject.id && (clientGroupFilter === 'All' || t.clientGroupId === clientGroupFilter));
            const scopedTotal = scopedTasks.length;
            const scopedOverdue = scopedTasks.filter(t => t.dueDateISO < todayISO && t.status !== 'Completed').length;
            return (
              <div className="px-6 pb-3 border-t border-black/[0.04]">
                <div className="pt-3 flex items-center justify-between gap-3">
                  {/* Left: Quick filters + Dropdowns + Clear */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {([
                      { key: 'all' as QuickFilter, label: `All (${scopedTotal})` },
                      { key: 'thisWeek' as QuickFilter, label: 'This Week' },
                      { key: 'overdue' as QuickFilter, label: `Overdue (${scopedOverdue})` },
                    ]).map(f => (
                      <button key={f.key} onClick={() => setQuickFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-caption font-semibold transition-all ${quickFilter === f.key ? 'bg-[#EEF1FB] text-[#204CC7]' : 'text-black/55 hover:bg-black/[0.03]'}`}>{f.label}</button>
                    ))}

                    <div className="w-px h-5 bg-black/8" />

                    <div className="relative">
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${statusFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${priorityFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                        <option value="All">All Priority</option>
                        <option value="P1">P1 — Urgent</option>
                        <option value="P2">P2 — High</option>
                        <option value="P3">P3 — Normal</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                    </div>

                    <div className="relative">
                      <select value={assignedByFilter} onChange={e => setAssignedByFilter(e.target.value)} className={`appearance-none pl-3 pr-7 py-1.5 rounded-lg border text-caption font-medium cursor-pointer transition-all focus:outline-none ${assignedByFilter !== 'All' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'bg-white border-black/[0.08] text-black/60 hover:border-black/15'}`}>
                        <option value="All">All Assigned</option>
                        <option value="You">By You</option>
                        <option value="Others">By Others</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-black/35 pointer-events-none" />
                    </div>

                    {clientActiveFilterCount > 0 && (
                      <button onClick={() => { setStatusFilter('All'); setPriorityFilter('All'); setAssignedByFilter('All'); setQuickFilter('all'); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-caption font-medium text-red-500 hover:bg-red-50 transition-all">
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
            );
          })()}
        </div>

        {/* Task List */}
        <div className="p-8">
          {projectTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-black/5 py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-black/15 mx-auto mb-3" />
              <p className="text-body font-medium text-muted-fg">No tasks found</p>
              <p className="text-caption font-normal text-muted-fg mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-black/5 overflow-hidden divide-y divide-black/[0.04]" role="list" aria-label={`${selectedClientGroup?.name || selectedProject.name} tasks`}>
              {projectTasks.map(task => renderTaskRow(task))}
            </div>
          )}
        </div>

        {/* Modals */}
        {showNewGroupModal && selectedProject && (
          <NewGroupModal
            projectId={selectedProject.id}
            onClose={() => setShowNewGroupModal(false)}
            onCreate={(name, color) => {
              setLocalClientGroups(prev => [...prev, {
                id: `cg-${Date.now()}`,
                name,
                projectId: selectedProject.id,
                color,
              }]);
            }}
          />
        )}
        {showAddModal && selectedProject && (
          <AddTodoModal
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddTask}
            projectName={selectedProject.name}
          />
        )}
        {selectedTask && selectedProject && (
          <TaskDetailPanel
            task={selectedTask}
            project={selectedProject}
            onClose={() => setSelectedTask(null)}
            onToggle={() => toggleTaskComplete(selectedTask.id)}
          />
        )}
      </div>
    );
  }

  return null;
}

