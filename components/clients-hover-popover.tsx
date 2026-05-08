'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users } from 'lucide-react';

/**
 * ClientsHoverPopover — a single compact pill that summarises an employee's
 * assigned clients ("5 clients") and opens a popover on hover or focus
 * listing every client by name.
 *
 * Why this exists: the Employee CLA widget on Home was wrapping every
 * client onto its own pill in the row. With 10+ assignments per employee
 * the column blew up vertically and crowded the rest of the row. A single
 * count-pill keeps the row to one line; the names are still one hover away.
 *
 * Behaviour mirrors TeamHoverPopover (same component shape used elsewhere
 * in the app — keeps the pattern recognisable):
 *   • Position is `fixed` with viewport coords from the trigger's rect, so
 *     the popover escapes any table / drawer overflow clipping.
 *   • Auto-flips upward when there isn't enough room below; horizontally
 *     clamps so it can't render off-screen on narrow viewports.
 *   • Mouse-leave starts a 140ms close timer; mouse-enter on the popover
 *     cancels the timer so the cursor can travel from trigger → popover
 *     without it snapping shut.
 *   • Closes on Escape, scroll, or window resize so it never drifts away
 *     from its anchor.
 *   • Keyboard-accessible: focus opens, blur closes.
 */

export function ClientsHoverPopover({ clients }: { clients: string[] }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const total = clients.length;

  // Alphabetical inside the popover for predictable scanning.
  const sorted = [...clients].sort((a, b) => a.localeCompare(b));

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

  // Estimated popover dimensions — used for the auto-flip heuristic only;
  // the actual height comes from content.
  const POPOVER_WIDTH = 240;
  const POPOVER_EST_HEIGHT = 56 + sorted.length * 28;
  const popoverStyle = rect ? (() => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < POPOVER_EST_HEIGHT + 16 && rect.top > POPOVER_EST_HEIGHT + 16;
    let left = rect.right - POPOVER_WIDTH; // anchor right-edge of trigger
    if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
    if (left < 8) left = 8;
    return {
      position: 'fixed' as const,
      left,
      top: openUpward ? undefined : rect.bottom + 8,
      bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
      width: POPOVER_WIDTH,
      // Same z-index as TeamHoverPopover. Has to clear any drawer / modal
      // in the app (the Home KPI drawer sits at z-[9999]); 10001 keeps the
      // popover one level above so it always wins.
      zIndex: 10001,
    };
  })() : null;

  // Empty state — render a muted dash so the column never looks broken.
  if (total === 0) {
    return <span className="text-caption text-black/45">—</span>;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${total} assigned client${total === 1 ? '' : 's'}: ${clients.join(', ')}. Hover or focus for details.`}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold border bg-black/[0.04] border-black/[0.06] text-black/70 hover:bg-black/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:ring-offset-1"
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
        <Users className="w-3 h-3" aria-hidden="true" />
        <span className="tabular-nums">{total}</span>
        <span className="font-medium opacity-90">{total === 1 ? 'client' : 'clients'}</span>
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
            Assigned clients · {total}
          </p>
          <ul className="py-1.5 max-h-[280px] overflow-y-auto">
            {sorted.map(name => (
              <li key={name} className="flex items-center gap-2 px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-black/25" aria-hidden="true" />
                <span className="flex-1 min-w-0 text-caption truncate text-black/80">{name}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}
