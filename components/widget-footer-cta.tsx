/**
 * WidgetFooterCTA — the standard "View all X →" footer that lives at the
 * bottom of every overview widget on /home (Customers tab, Employees tab,
 * and any future tab that follows the same widget chrome).
 *
 * Why this lives in /components instead of inline:
 *   • 8 widgets across 2 files were duplicating the same footer strip.
 *   • The previous design (70%-opacity blue text + &rarr; HTML entity) read as
 *     a stale link tucked under the table. This version turns the entire
 *     footer strip into the button, gives full primary-blue affordance, uses
 *     a real ChevronRight icon, and animates the icon on hover — matching
 *     the "obvious next action" pattern from Linear / Stripe / Vercel.
 *
 * Behavior:
 *   • Whole strip is the button (44px+ tall) — bigger tap target, easier hit.
 *   • Hover: tints the strip with a faint primary-blue wash + slides the
 *     chevron 2px to the right.
 *   • Focus-visible: standard ring for keyboard users.
 *   • Uses `mt-auto` so it always sticks to the bottom of a flex column card.
 */

'use client';

import { ChevronRight } from 'lucide-react';

interface WidgetFooterCTAProps {
  label: string;
  onClick: () => void;
  /** Optional aria-label override when `label` alone isn't descriptive enough. */
  ariaLabel?: string;
}

export function WidgetFooterCTA({ label, onClick, ariaLabel }: WidgetFooterCTAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="
        group mt-auto w-full flex items-center justify-between
        px-5 py-3 border-t border-black/[0.05]
        bg-black/[0.01] hover:bg-[#204CC7]/[0.04]
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#204CC7]/30
      "
    >
      <span className="text-caption font-semibold text-[#204CC7]">
        {label}
      </span>
      <ChevronRight
        className="w-3.5 h-3.5 text-[#204CC7] transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  );
}
