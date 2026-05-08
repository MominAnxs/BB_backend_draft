'use client';

/**
 * Shared Task Detail right-side drawer.
 *
 * Originally lived inline in TaskManagement.tsx (used by the client-
 * group-todo view). Extracted here so other views (My Tasks, etc.) can
 * render the same drawer format when a task row is clicked — consistent
 * UX across the Workspace module.
 *
 * Enhancements over the original:
 *   - Renders the new `coAssignees` field as a stacked roster under the
 *     "Assigned To" label so collaborative tasks show every face, not
 *     just the lead assignee.
 *   - Optional `currentUserPinned` prop: when true, a "You" chip is
 *     prepended to the assignee list — used on My Tasks where the
 *     current user is implicitly an assignee on every row.
 */

import { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle2, Calendar, FileText, Activity, Paperclip,
} from 'lucide-react';
import { priorityConfig, statusConfig, Priority, TaskStatus } from '../task-data';

/**
 * Minimal task shape the drawer needs. Kept separate from the richer
 * `Task` interface in task-data.ts so the drawer also works with the
 * internal-department Task shape in BregoGroupDetail.tsx (which has
 * `groupId` instead of `projectId` but is otherwise compatible).
 */
export interface DrawerTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  dueDateISO: string;
  assignedBy: { name: string; initials: string; color: string };
  assignedTo: { name: string; initials: string; color: string };
  coAssignees?: { name: string; initials: string; color: string }[];
}

/** Minimal context label the drawer uses in its header (project / group / list). */
export interface DrawerContext {
  name: string;
  color: string;
}

interface TaskDetailPanelProps {
  task: DrawerTask;
  project: DrawerContext;
  onClose: () => void;
  onToggle: () => void;
  /** When true, a "You" chip is prepended to the assignee list. */
  currentUserPinned?: boolean;
}

export function TaskDetailPanel({ task, project, onClose, onToggle, currentUserPinned = false }: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const pc = priorityConfig[task.priority];
  const sc = statusConfig[task.status];
  const isCompleted = task.status === 'Completed';

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Escape to close + focus management
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);

  // Build the assignee roster for the Assigned To section. When the
  // current user is implicitly an assignee (e.g. on My Tasks), we
  // prepend a "You" entry.
  const roster = currentUserPinned
    ? [{ name: 'You', initials: 'YO', color: '#204CC7' }, ...(task.coAssignees ?? [])]
    : [task.assignedTo, ...(task.coAssignees ?? [])];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label="Task details">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-black/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ${pc.bg} ${pc.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} aria-hidden="true" />{pc.label}
              </span>
              <span className="text-caption font-medium text-black/65">{project.name}</span>
            </div>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
              aria-label="Close panel"
            >
              <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
            </button>
          </div>

          <h2 className="text-h3 font-bold text-black/85 mb-5 leading-snug">{task.title}</h2>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-caption font-medium ${sc.bg} ${sc.text} ${sc.border}`}>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />{task.status}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.08] text-caption font-medium text-black/65">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <time dateTime={task.dueDateISO}>{task.dueDate}</time>
            </span>
            {roster.length > 1 ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/[0.08] text-caption font-medium text-black/65">
                <span className="flex -space-x-1" aria-hidden="true">
                  {roster.slice(0, 3).map(m => (
                    <span key={m.initials} className="w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-white font-bold" style={{ backgroundColor: m.color, fontSize: '10px' }}>
                      {m.initials}
                    </span>
                  ))}
                </span>
                {roster.length} assigned
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/[0.08] text-caption font-medium text-black/65">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: roster[0].color, fontSize: '10px' }} aria-hidden="true">{roster[0].initials}</span>
                {roster[0].name}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
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
              className={`flex items-center gap-1.5 px-4 py-3.5 border-b-2 text-caption font-medium transition-all focus-visible:outline-none ${
                activeTab === tab.id
                  ? 'border-[#204CC7] text-[#204CC7] font-semibold'
                  : 'border-transparent text-black/60 hover:text-black/85'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />{tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6" role="tabpanel">
          {activeTab === 'details' && (
            <div className="space-y-7">
              {/* Description */}
              {task.description && (
                <div>
                  <label className="text-caption font-semibold text-black/60 uppercase tracking-wider block mb-3">Description</label>
                  <p className="text-body font-normal text-black/80 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* Added by (Assigned By) */}
              <div>
                <label className="text-caption font-semibold text-black/60 uppercase tracking-wider block mb-3">Added by</label>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: task.assignedBy.color, fontSize: '11px' }}>{task.assignedBy.initials}</div>
                  <div>
                    <span className="text-body font-medium text-black/85 block">{task.assignedBy.name}</span>
                    <span className="text-caption text-black/60">Task creator</span>
                  </div>
                </div>
              </div>

              {/* Assigned To — including co-assignees */}
              <div>
                <label className="text-caption font-semibold text-black/60 uppercase tracking-wider block mb-3">
                  Assigned to {roster.length > 1 && <span className="text-black/45 font-normal">· {roster.length} people</span>}
                </label>
                <ul className="space-y-2.5" role="list">
                  {roster.map(m => (
                    <li key={m.initials} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: m.color, fontSize: '11px' }} aria-hidden="true">
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <span className="text-body font-medium text-black/85 block truncate">{m.name}</span>
                        <span className="text-caption text-black/60">{m === roster[0] && currentUserPinned ? 'You · Lead' : m === roster[0] ? 'Lead' : 'Collaborator'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Attachments */}
              <div>
                <label className="text-caption font-semibold text-black/60 uppercase tracking-wider block mb-3">Attachments</label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-dashed border-black/10 text-caption font-medium text-black/60">
                  <Paperclip className="w-4 h-4" aria-hidden="true" />
                  <span>No attachments yet — drop files here</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={onToggle}
                className={`w-full py-3 rounded-xl border text-body font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                  isCompleted
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:ring-amber-500'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-emerald-500'
                }`}
              >
                {isCompleted ? '↩ Reopen Task' : '✓ Mark as Completed'}
              </button>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-1">
              {[
                { action: 'Task created', by: task.assignedBy.name, time: '5 days ago', icon: '➕' },
                { action: `Assigned to ${roster.map(r => r.name).join(', ')}`, by: task.assignedBy.name, time: '5 days ago', icon: '👤' },
                { action: `Priority set to ${task.priority}`, by: task.assignedBy.name, time: '5 days ago', icon: '🏷' },
                ...(isCompleted ? [{ action: 'Marked as completed', by: task.assignedTo.name, time: '1 day ago', icon: '✅' }] : []),
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-black/[0.03] last:border-0">
                  <span className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center text-caption flex-shrink-0 mt-0.5" aria-hidden="true">{log.icon}</span>
                  <div className="flex-1">
                    <p className="text-body font-normal text-black/85">
                      <span className="font-semibold">{log.by}</span> {log.action.toLowerCase().startsWith(log.by.toLowerCase()) ? log.action.slice(log.by.length) : `— ${log.action}`}
                    </p>
                    <span className="text-caption text-black/60">{log.time}</span>
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
