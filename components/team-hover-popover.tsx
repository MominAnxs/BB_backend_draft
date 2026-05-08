'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * TeamHoverPopover — a stacked-avatar trigger that pops a single list of
 * every team member with their role on hover or focus. Better than
 * per-circle `title` tooltips because the user reads the whole team in
 * one glance instead of having to hover each circle individually.
 *
 * Implementation notes:
 *   • Position is `fixed` with viewport coords (computed from the
 *     trigger's bounding rect on open). That escapes table / drawer
 *     `overflow-*` clipping so the popover never hides under a row edge.
 *   • Auto-flips upward when there isn't enough space below; clamps
 *     horizontally so it can't render off-screen on narrow viewports.
 *   • Mouse-leave starts a 140ms close timer so the user can move from
 *     trigger → popover without it snapping shut mid-traverse.
 *     Mouse-enter on the popover cancels that timer.
 *   • Closes on Escape, scroll, or window resize so it never drifts away
 *     from its anchor.
 *   • Works for keyboard users too: focus opens, blur closes.
 *
 * Role tinting on the chip is heuristic so callers can pass either short
 * roles ("HOD", "Manager", "Executive") or longer phrasings
 * ("SEM HOD", "A&T Manager", "A&T Specialist") without configuration:
 *   • role contains "HOD"     → brand-blue
 *   • role contains "Manager" → violet
 *   • everything else          → emerald
 *
 * Sort: HOD first, Manager next, everything else after — matches the
 * org-chart reading order and keeps ownership visible at the top.
 */

export interface TeamHoverMember {
  initials: string;
  name: string;
  role: string;
  /** Hex string used for the avatar circle background. */
  color: string;
}

function roleTint(role: string): string {
  const r = role.toLowerCase();
  if (r.includes('hod')) return 'bg-[#EEF1FB] text-[#204CC7]';
  if (r.includes('manager')) return 'bg-violet-50 text-violet-700';
  return 'bg-emerald-50 text-emerald-700';
}

function rolePriority(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('hod')) return 0;
  if (r.includes('manager')) return 1;
  return 2;
}

export function TeamHoverPopover({ team, max = 3 }: { team: TeamHoverMember[]; max?: number }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Sort by role priority — keeps the org chart reading top-down.
  const sorted = [...team].sort((a, b) => rolePriority(a.role) - rolePriority(b.role));

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);
  const openPopover = useCallback(() => {
    cancelClose();
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDismiss = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open]);
  useEffect(() => () => cancelClose(), [cancelClose]);

  // Estimated popover dimensions — used only for the auto-flip heuristic.
  // Slight over-estimate is fine; the actual height comes from content.
  const POPOVER_WIDTH = 260;
  const POPOVER_EST_HEIGHT = 44 + sorted.length * 40;
  const popoverStyle = rect ? (() => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < POPOVER_EST_HEIGHT + 16 && rect.top > POPOVER_EST_HEIGHT + 16;
    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
    if (left < 8) left = 8;
    return {
      position: 'fixed' as const,
      left,
      top: openUpward ? undefined : rect.bottom + 8,
      bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
      width: POPOVER_WIDTH,
      // Has to clear any drawer / modal in the codebase. The Overview
      // KPI drawer sits at z-[9999], so 60 (the original value) hid the
      // popover *behind* the drawer when triggered from the Recent
      // Churns table. 10001 sits one level above to guarantee the
      // popover always wins.
      zIndex: 10001,
    };
  })() : null;

  const visible = team.slice(0, max);
  const overflow = team.length - visible.length;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Team of ${team.length}: ${team.map(m => `${m.name} (${m.role})`).join(', ')}. Hover or focus for details.`}
        aria-expanded={open}
        className="inline-flex items-center -space-x-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:ring-offset-1"
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={scheduleClose}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) setOpen(false); else openPopover();
        }}
      >
        {visible.map(m => (
          <span
            key={m.initials}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0 box-content ring-2 ring-white"
            style={{ backgroundColor: m.color }}
            aria-hidden="true"
          >
            {m.initials}
          </span>
        ))}
        {overflow > 0 && (
          <span
            className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold bg-[#3F3F46] text-white ring-2 ring-white tabular-nums text-[11px] flex-shrink-0 box-content"
            aria-hidden="true"
          >
            +{overflow}
          </span>
        )}
      </button>

      {open && popoverStyle && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={popoverStyle}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-2"
        >
          <p className="px-4 pb-2 text-caption font-semibold text-black/60 uppercase tracking-wide border-b border-black/[0.04]">
            Team — {team.length}
          </p>
          <ul className="py-1.5">
            {sorted.map(m => (
              <li key={m.initials} className="flex items-center gap-2.5 px-4 py-1.5">
                <span
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0"
                  style={{ backgroundColor: m.color }}
                  aria-hidden="true"
                >
                  {m.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-medium text-black/85 truncate">{m.name}</div>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0 ${roleTint(m.role)}`}>
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
