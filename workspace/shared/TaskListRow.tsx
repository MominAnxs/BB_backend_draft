'use client';

/**
 * Shared task row for all Workspace views.
 *
 * Visual contract matches the My Tasks Basecamp-inspired layout:
 *   - Title on top (text-body, font-medium)
 *   - Meta below: avatar stack + name(s) · "added by X" · due date · P# pill
 *   - Left-edge accent bar in the context color (project / group / list)
 *
 * Used by:
 *   - MyAssignments               (currentUserPinned=true, no drag)
 *   - TaskManagement clientTodoList   (drag, click-to-open drawer)
 *   - BregoGroupDetail groupDetail    (click-to-open drawer)
 *
 * The row is intentionally generic: it accepts the minimal DrawerTask
 * shape plus optional dragging/clicking handlers so each caller can
 * decide how much behaviour it opts into.
 */

import { Circle, GripVertical } from 'lucide-react';
import { priorityConfig } from '../task-data';
import { DrawerTask } from './TaskDetailPanel';

const TODAY_ISO = '2026-03-18';
const CURRENT_USER = { name: 'You', initials: 'YO', color: '#204CC7' };

export interface TaskListRowProps {
  task: DrawerTask;
  /** Color of the 3px left accent bar (project / group / list color). */
  accentColor?: string;
  /** When true, the current user is prepended to the assignee roster. */
  currentUserPinned?: boolean;
  onToggle: () => void;
  onOpen: () => void;

  // Optional drag-and-drop
  draggable?: boolean;
  isDragging?: boolean;
  isDragTarget?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function TaskListRow({
  task, accentColor, currentUserPinned = false,
  onToggle, onOpen,
  draggable = false, isDragging = false, isDragTarget = false,
  onDragStart, onDragOver, onDragEnd,
}: TaskListRowProps) {
  const pc = priorityConfig[task.priority];
  const isCompleted = task.status === 'Completed';
  const isOverdue = task.dueDateISO < TODAY_ISO && !isCompleted;
  const assigner = task.assignedBy;
  const selfAdded = assigner.initials === CURRENT_USER.initials || assigner.name === 'You';

  // Build the assignee roster. On the My Tasks view the current user is
  // prepended; elsewhere the task's own assignedTo is the lead.
  const lead = currentUserPinned ? CURRENT_USER : task.assignedTo;
  const others = task.coAssignees ?? [];
  const assignees = [lead, ...others];
  const visibleAssignees = assignees.slice(0, 3);
  const overflowAssignees = assignees.length - visibleAssignees.length;

  // Meta name label
  const nameLabel =
    assignees.length === 1
      ? assignees[0].name
      : assignees.length <= 3
        ? assignees.map(a => a.name === 'You' ? 'You' : a.name.split(' ')[0]).join(', ')
        : `${assignees[0].name} + ${assignees.length - 1} others`;

  const rowBgClass =
    isDragging ? 'opacity-40 scale-[0.99] bg-black/[0.02]'
    : isDragTarget ? 'bg-[#EEF1FB]/40 border-t-2 border-t-[#204CC7]/20'
    : 'hover:bg-[#FAFBFC]';

  return (
    <div
      role="listitem"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      className={`group/row relative flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-[#F4F6FF] ${rowBgClass}`}
      style={draggable ? { cursor: 'grab' } : undefined}
    >
      {/* Left accent — takes the context color */}
      {accentColor && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Drag handle — only visible on hover when draggable */}
      {draggable && (
        <div
          className="flex-shrink-0 mt-[3px] opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        >
          <GripVertical className="w-4 h-4 text-black/25" />
        </div>
      )}

      {/* Checkbox — stop click bubbling so toggle doesn't open the drawer */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-pressed={isCompleted}
        aria-label={isCompleted ? `Mark "${task.title}" as incomplete` : `Mark "${task.title}" as complete`}
        className="flex-shrink-0 mt-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 rounded-full"
      >
        {isCompleted ? (
          <CompletedCheck />
        ) : (
          <Circle className="w-[18px] h-[18px] text-black/30 group-hover/row:text-[#204CC7]/70 transition-colors" aria-hidden="true" />
        )}
      </button>

      {/* Content — title on top, meta below */}
      <div className="flex-1 min-w-0">
        <p className={`text-body leading-snug ${isCompleted ? 'line-through text-black/50' : 'text-black/85'}`}>
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1.5 text-caption text-black/60 flex-wrap">
          {/* Assignees — stacked avatars + named chip */}
          <span
            className="inline-flex items-center gap-1.5"
            title={`Assigned to ${assignees.map(a => a.name).join(', ')}`}
          >
            <span className="flex -space-x-1.5" aria-hidden="true">
              {visibleAssignees.map(a => (
                <span key={a.initials} className="ring-2 ring-white rounded-full">
                  <MiniAvatar initials={a.initials} color={a.color} />
                </span>
              ))}
              {overflowAssignees > 0 && (
                <span
                  className="w-5 h-5 rounded-full ring-2 ring-white bg-black/[0.06] text-black/65 flex items-center justify-center font-bold"
                  style={{ fontSize: '10px' }}
                >
                  +{overflowAssignees}
                </span>
              )}
            </span>
            <span className="font-medium text-black/85">{nameLabel}</span>
          </span>

          {/* Added by — quiet chip, skipped when self */}
          {!selfAdded && (
            <>
              <Dot />
              <span className="text-black/60">
                added by <span className="text-black/80 font-medium">{assigner.name.split(' ')[0]}</span>
              </span>
            </>
          )}

          {/* Due date */}
          <Dot />
          <time
            dateTime={task.dueDateISO}
            className={`tabular-nums ${isOverdue ? 'text-rose-700 font-semibold' : isCompleted ? 'text-black/45' : 'text-black/65'}`}
          >
            {task.dueDate}{isOverdue && ' · overdue'}
          </time>

          {/* Priority pill */}
          <Dot />
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-semibold ${pc.bg} ${pc.text}`}
            aria-label={`Priority ${pc.label}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} aria-hidden="true" />
            {task.priority}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="text-black/25">·</span>;
}

/**
 * CompletedCheck — Google Material Symbols `check_circle` glyph in
 * its filled variant (FILL=1), tinted emerald. One self-contained
 * shape, optical-size-tuned by Google, no double-stroke artifact.
 */
export function CompletedCheck({ size = 20 }: { size?: number }) {
  return (
    <span
      className="material-symbols-outlined select-none text-emerald-500 leading-none"
      style={{ fontSize: size, fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
      aria-hidden="true"
    >
      check_circle
    </span>
  );
}

function MiniAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ backgroundColor: color, fontSize: '10px' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
