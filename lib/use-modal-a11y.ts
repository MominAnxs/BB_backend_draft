'use client';
import { useEffect, useRef } from 'react';

/**
 * Wires the standard accessibility behaviours every modal / drawer in this
 * codebase needs:
 *
 *   1. **Escape closes** — the user can dismiss without grabbing the mouse.
 *   2. **Focus trap** — Tab / Shift-Tab cycle inside the dialog so keyboard
 *      users don't accidentally tab out into the muted page behind.
 *   3. **Initial focus** — the first focusable element (or the dialog wrapper
 *      itself, if no children are focusable) is focused on open. This is
 *      important for screen readers, otherwise focus stays on the trigger
 *      button and the dialog never gets announced.
 *   4. **Focus restore** — when the dialog closes, focus returns to whatever
 *      element opened it. Prevents the SR / keyboard cursor from getting
 *      orphaned at the document start.
 *
 * The hook ONLY handles behaviour. The caller is still responsible for the
 * static markup contract:
 *
 * ```tsx
 * const dialogRef = useModalA11y(isOpen, onClose);
 * return (
 *   <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="my-title" tabIndex={-1}>
 *     <h2 id="my-title">…</h2>
 *     …
 *   </div>
 * );
 * ```
 *
 * Pass `closeOnEscape={false}` if the dialog has unsaved-state warnings or
 * other reasons it shouldn't dismiss on Escape (rare).
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void,
  options: { closeOnEscape?: boolean } = {},
) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const { closeOnEscape = true } = options;

  // Keep the latest `onClose` in a ref so the keydown listener doesn't need
  // to re-bind every render — the callback identity often changes when the
  // parent component re-renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember who had focus before we opened, so we can restore it.
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;

    // 2. Move focus into the dialog. Defer to next tick so the dialog
    //    contents have mounted (parent may render the dialog conditionally).
    const focusFirst = () => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? node).focus();
    };
    const focusTimer = window.setTimeout(focusFirst, 0);

    // 3. Wire Escape + Tab handlers.
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const node = dialogRef.current;
      if (!node) return;
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (focusables.length === 0) {
        // No focusable children — keep focus on the wrapper itself.
        e.preventDefault();
        node.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || active === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKey);
      // 4. Restore focus to the launcher. Wrapped in a try because the node
      //    may have been unmounted (e.g. parent re-rendered it away).
      try { restoreFocusRef.current?.focus({ preventScroll: true }); } catch {}
    };
  }, [isOpen, closeOnEscape]);

  return dialogRef;
}

// Standard "focusable" selector used by every popular focus-trap library.
// Excludes `tabindex="-1"` (programmatically focusable but not in tab order).
const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
