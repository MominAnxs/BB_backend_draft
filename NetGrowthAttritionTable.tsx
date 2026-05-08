/**
 * Net Growth & Attrition — FY overview table.
 *
 * Lives below the 15-widget grid on /home. Audience is the founder
 * + COO: a single dense, scannable surface that answers "how did the
 * book move month-by-month, what's growing, what's churning, and how
 * does that compare to last year?"
 *
 * Particulars rows (top to bottom):
 *   1. Opening Client Value   — MRR at the start of each month
 *      (expandable → A&T, PM)
 *   2. New Kickoff             — MRR added from new clients
 *      (expandable → A&T, PM)
 *   3. Clients Lost            — MRR lost to churn
 *      (expandable → A&T, PM)
 *   4. Closing Client Value    — MRR at the end of each month
 *      (expandable → A&T, PM)
 *   5. Net Growth              — Closing − Opening, rendered as both
 *      absolute ₹ delta and a % growth line beneath it
 *   6. Attrition               — Lost MRR as both absolute ₹ and a
 *      % churn rate beneath it (lost / opening)
 *
 * Columns:
 *   • A column per month within the active range (default: Apr'25–
 *     Mar'26 == FY 2025-26).
 *   • A trailing FY-total column with smart aggregation:
 *       Opening = first month's opening
 *       Closing = last month's closing
 *       Kickoff = sum across months
 *       Lost    = sum across months
 *       Net Growth = Closing − Opening
 *       Attrition  = sum lost / first opening (rate over the period)
 *
 * Top-bar controls:
 *   • Range selector — FY 2025-26 (default) / FY 2024-25 / Last 6
 *     months / Last 3 months / Custom (start + end month picker).
 *   • Compare with PY toggle — when on, each cell adds a small
 *     caption beneath the absolute value: "↑ +12% YoY" or "↓ −3%
 *     YoY", colour-graded by direction.
 *
 * Layout:
 *   • First column (Particulars) is sticky-left so the row label is
 *     always visible while the user scrolls horizontally through 12+
 *     months.
 *   • The header row is sticky-top within its scroll container.
 *   • Numerics use tabular-nums and a tight monospace feel so the
 *     columns line up cleanly.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Minus, ArrowUpRight, ArrowDownRight, Diamond, Sparkles, X } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface MonthlyClientValue {
  /** Display label, e.g. "May'25". */
  month: string;
  /** ISO key for sorting / range filtering, e.g. "2025-05". */
  iso: string;
  /** MRR at the start of the month, split by service line. */
  opening: { at: number; pm: number };
  /** MRR added from new clients during the month. */
  kickoff: { at: number; pm: number };
  /** MRR lost from churn during the month. */
  lost:    { at: number; pm: number };
  /** MRR at the end of the month — canonical, since it's also the
   *  next month's opening. */
  closing: { at: number; pm: number };
}

interface NetGrowthAttritionTableProps {
  /** Current FY data — one entry per month, oldest first. */
  data: MonthlyClientValue[];
  /** Same-shape data for the prior FY, used by the YoY comparison
   *  toggle. Optional; when missing, the toggle is hidden. */
  dataPY?: MonthlyClientValue[];
}

// ════════════════════════════════════════════════════════════════════════════
// FORMATTING
// ════════════════════════════════════════════════════════════════════════════

/** Format an Indian rupee value into a human-readable abbreviation:
 *  ≥1 Cr → "₹1.2Cr", ≥1 L → "₹14L", smaller → "₹50K". Negative is
 *  passed through with a leading minus, e.g. "−₹14L". */
function formatLakh(v: number): string {
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)     return `${sign}₹${Math.round(abs / 1000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/** "+₹12L" / "−₹3.4L" / "₹0" — same units as `formatLakh` but always
 *  carries a sign so the eye reads the direction without thinking. */
function formatDeltaLakh(v: number): string {
  if (v === 0) return '₹0';
  const f = formatLakh(v);
  return v > 0 ? `+${f}` : f;
}

function formatPct(v: number, withSign = false): string {
  const rounded = Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
  if (!withSign) return `${rounded}%`;
  if (v === 0)   return `0%`;
  return v > 0 ? `+${rounded}%` : `${rounded}%`;
}

// ════════════════════════════════════════════════════════════════════════════
// AGGREGATION HELPERS
// ════════════════════════════════════════════════════════════════════════════

interface RowTotals {
  opening: number;
  kickoff: number;
  lost: number;
  closing: number;
  /** First-month opening — the FY's opening anchor. */
  fyOpening: number;
  /** Last-month closing — the FY's closing anchor. */
  fyClosing: number;
}

function totalsFor(rows: MonthlyClientValue[], pick: (r: MonthlyClientValue) => { at: number; pm: number }, lane: 'all' | 'at' | 'pm'): number[] {
  return rows.map(r => {
    const v = pick(r);
    return lane === 'at' ? v.at : lane === 'pm' ? v.pm : v.at + v.pm;
  });
}

function rangeTotals(rows: MonthlyClientValue[], lane: 'all' | 'at' | 'pm'): RowTotals {
  if (rows.length === 0) {
    return { opening: 0, kickoff: 0, lost: 0, closing: 0, fyOpening: 0, fyClosing: 0 };
  }
  const sumPick = (pick: (r: MonthlyClientValue) => { at: number; pm: number }) =>
    totalsFor(rows, pick, lane).reduce((s, v) => s + v, 0);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const op = lane === 'at' ? first.opening.at : lane === 'pm' ? first.opening.pm : first.opening.at + first.opening.pm;
  const cl = lane === 'at' ? last.closing.at  : lane === 'pm' ? last.closing.pm  : last.closing.at + last.closing.pm;
  return {
    opening:   op,
    kickoff:   sumPick(r => r.kickoff),
    lost:      sumPick(r => r.lost),
    closing:   cl,
    fyOpening: op,
    fyClosing: cl,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED CHROME — small UI primitives reused by every cell
// ════════════════════════════════════════════════════════════════════════════

function YoyDelta({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) return null;
  const isFlat = Math.abs(pct) < 0.5;
  const dir = isFlat ? 'flat' : pct > 0 ? 'up' : 'down';
  const color =
    dir === 'up'   ? 'text-emerald-600'
    : dir === 'down' ? 'text-rose-600'
                     : 'text-black/40';
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-caption font-medium tabular-nums ${color}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {formatPct(Math.abs(pct))} YoY
    </span>
  );
}

function NumberCell({
  value,
  yoy,
  emphasis = 'normal',
  signed = false,
}: {
  value: number;
  yoy?: number | null;
  emphasis?: 'normal' | 'strong' | 'muted';
  signed?: boolean;
}) {
  const text = signed ? formatDeltaLakh(value) : formatLakh(value);
  const cls =
    emphasis === 'strong' ? 'text-body font-semibold text-black/90 tabular-nums'
    : emphasis === 'muted'  ? 'text-caption text-black/70 tabular-nums'
                            : 'text-caption font-medium text-black/80 tabular-nums';
  return (
    <div className="flex flex-col items-end gap-0.5 leading-tight">
      <span className={cls}>{text}</span>
      {yoy != null && <YoyDelta pct={yoy} />}
    </div>
  );
}

function MonthHeaderCell({ label }: { label: string }) {
  return (
    <th
      scope="col"
      className="px-3 py-3 text-right text-caption font-semibold text-black/65 uppercase tracking-wider whitespace-nowrap bg-[#FAFBFC]"
    >
      {label}
    </th>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-ROW (service split) — A&T / PM under each expandable parent
// ════════════════════════════════════════════════════════════════════════════

function SubRow({
  label,
  values,
  total,
  yoy,
}: {
  label: string;
  values: number[];
  total: number;
  yoy?: (number | null)[];
}) {
  return (
    <tr className="bg-[#FAFBFC] border-b border-black/[0.04]">
      <td
        className="sticky left-0 z-10 bg-[#FAFBFC] px-5 py-2.5 pl-12"
        style={STICKY_LEFT_W}
      >
        <span className="text-caption font-medium text-black/65">{label}</span>
      </td>
      <td
        className={`sticky z-10 bg-[#F7F9FE] px-3 py-2.5 align-middle ${STICKY_RIGHT_SHADOW}`}
        style={{ ...TOTAL_COL_W, ...TOTAL_COL_LEFT }}
      >
        <div className="flex justify-end leading-tight">
          <span className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(total)}</span>
        </div>
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 align-middle">
          <NumberCell value={v} yoy={yoy?.[i] ?? null} emphasis="muted" />
        </td>
      ))}
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FIXED COLUMN WIDTHS — locked so the table renders with table-layout:fixed
// ════════════════════════════════════════════════════════════════════════════
//
// Sticky-left cells look smooth only when the underlying table has a
// committed layout. We lock the Particulars column to 260px and every
// month column to 110px so the browser doesn't recompute widths
// during scroll (which is what produces the shaky / glitchy feel).

const STICKY_LEFT_PX = 260;
const TOTAL_COL_PX   = 140;
const MONTH_COL_PX   = 110;
const STICKY_LEFT_W: React.CSSProperties = { width: `${STICKY_LEFT_PX}px`, minWidth: `${STICKY_LEFT_PX}px` };
const TOTAL_COL_W:   React.CSSProperties = { width: `${TOTAL_COL_PX}px`,   minWidth: `${TOTAL_COL_PX}px` };
const MONTH_COL_W:   React.CSSProperties = { width: `${MONTH_COL_PX}px`,   minWidth: `${MONTH_COL_PX}px` };
/** Inline `left` offset for the second sticky column — flush against
 *  the Particulars column's right edge. Tailwind's JIT can't pick up
 *  dynamic `left-[...]` from a template, so the offset travels via
 *  inline style. */
const TOTAL_COL_LEFT: React.CSSProperties = { left: `${STICKY_LEFT_PX}px` };
/** Soft right-edge shadow on the second sticky column — telegraphs
 *  that there's more content scrolled off to the right. */
const STICKY_RIGHT_SHADOW = 'shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]';

// ════════════════════════════════════════════════════════════════════════════
// RANGE PRESETS
// ════════════════════════════════════════════════════════════════════════════

type RangePreset = 'fy-current' | 'fy-prior' | 'last-6' | 'last-3' | 'custom';

function applyRange(
  preset: RangePreset,
  fyData: MonthlyClientValue[],
  pyData: MonthlyClientValue[] | undefined,
  customStart: string | null,
  customEnd: string | null,
): MonthlyClientValue[] {
  if (preset === 'fy-current') return fyData;
  if (preset === 'fy-prior')   return pyData ?? [];
  if (preset === 'last-6')     return fyData.slice(-6);
  if (preset === 'last-3')     return fyData.slice(-3);
  // Custom — clamp by ISO month strings within the current FY range.
  if (preset === 'custom' && customStart && customEnd) {
    const lo = customStart;
    const hi = customEnd;
    return fyData.filter(r => r.iso >= lo && r.iso <= hi);
  }
  return fyData;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN TABLE
// ════════════════════════════════════════════════════════════════════════════

export function NetGrowthAttritionTable({ data, dataPY }: NetGrowthAttritionTableProps) {
  // ── Range state ──
  const [preset, setPreset] = useState<RangePreset>('fy-current');
  const [customStart, setCustomStart] = useState<string | null>(data[0]?.iso ?? null);
  const [customEnd, setCustomEnd]     = useState<string | null>(data[data.length - 1]?.iso ?? null);
  const [showPY, setShowPY] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);

  // ── Expand state ──
  // Each parent row (opening / kickoff / lost / closing) tracks its
  // own expanded flag so the user can open one without disturbing
  // the others. Closing the table back up is just toggling them off.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (id: string) => !!expanded[id];
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Filtered rows ──
  const rows = useMemo(
    () => applyRange(preset, data, dataPY, customStart, customEnd),
    [preset, data, dataPY, customStart, customEnd],
  );

  // ── PY alignment for YoY ──
  // For each row in the active range, find the PY month with the
  // same calendar month (year shifted back by one) and snap to it.
  // Returns a parallel array so per-month YoY is a constant-time
  // lookup at render time.
  const pyAligned = useMemo(() => {
    if (!showPY || !dataPY) return null;
    const byIso = new Map(dataPY.map(r => [r.iso, r] as const));
    return rows.map(r => {
      const [y, m] = r.iso.split('-');
      const pyIso = `${parseInt(y, 10) - 1}-${m}`;
      return byIso.get(pyIso) ?? null;
    });
  }, [showPY, dataPY, rows]);

  /** Compute YoY % (current vs PY) for a value pulled at a given
   *  month. Returns null if PY is missing or the PY value is 0. */
  const yoyPct = (curr: number, pyValue: number | undefined): number | null => {
    if (pyValue == null || pyValue === 0) return null;
    return ((curr - pyValue) / pyValue) * 100;
  };

  // ── Per-row per-month value extractors ──
  // Each returns the array of month values for the active range,
  // optionally limited to a service lane (at / pm / all).
  const lane = (key: 'opening' | 'kickoff' | 'lost' | 'closing', l: 'all' | 'at' | 'pm'): number[] =>
    rows.map(r => l === 'at' ? r[key].at : l === 'pm' ? r[key].pm : r[key].at + r[key].pm);

  /** Same shape as `lane` but for the PY-aligned data — used for the
   *  YoY-on-top mode. */
  const laneYoY = (key: 'opening' | 'kickoff' | 'lost' | 'closing', l: 'all' | 'at' | 'pm'): (number | null)[] | undefined => {
    if (!pyAligned) return undefined;
    return rows.map((_r, i) => {
      const py = pyAligned[i];
      if (!py) return null;
      const curr = l === 'at' ? rows[i][key].at : l === 'pm' ? rows[i][key].pm : rows[i][key].at + rows[i][key].pm;
      const pyVal = l === 'at' ? py[key].at  : l === 'pm' ? py[key].pm  : py[key].at + py[key].pm;
      return yoyPct(curr, pyVal);
    });
  };

  // ── FY totals (current range) ──
  // The Total column on the table renders one of these per row.
  // Service-split totals (fyAt / fyPm) feed the sub-rows on expand;
  // the all-up totals (fyAll) feed every parent row + Net Growth /
  // Attrition derived rows.
  const fyAll = rangeTotals(rows, 'all');
  const fyAt  = rangeTotals(rows, 'at');
  const fyPm  = rangeTotals(rows, 'pm');

  // ── Net growth + attrition derived values ──
  // Net growth (₹) = closing − opening per month.
  // Net growth (%) = (closing − opening) / opening per month.
  // Attrition (₹) = lost MRR per month.
  // Attrition (%) = lost / opening per month.
  const netGrowthValue: number[] = rows.map(r => (r.closing.at + r.closing.pm) - (r.opening.at + r.opening.pm));
  const netGrowthPct:   number[] = rows.map(r => {
    const op = r.opening.at + r.opening.pm;
    if (op === 0) return 0;
    return (((r.closing.at + r.closing.pm) - op) / op) * 100;
  });
  const attritionValue: number[] = rows.map(r => r.lost.at + r.lost.pm);
  const attritionPct:   number[] = rows.map(r => {
    const op = r.opening.at + r.opening.pm;
    if (op === 0) return 0;
    return ((r.lost.at + r.lost.pm) / op) * 100;
  });

  const fyNetGrowthValue = fyAll.fyClosing - fyAll.fyOpening;
  const fyNetGrowthPct   = fyAll.fyOpening === 0 ? 0 : (fyNetGrowthValue / fyAll.fyOpening) * 100;
  const fyAttritionValue = fyAll.lost;
  const fyAttritionPct   = fyAll.fyOpening === 0 ? 0 : (fyAll.lost / fyAll.fyOpening) * 100;

  // Per-service derived totals — feed the A&T / PM sub-rows under
  // Net Growth and Attrition when expanded.
  const fyNetGrowthValueAt = fyAt.fyClosing - fyAt.fyOpening;
  const fyNetGrowthPctAt   = fyAt.fyOpening === 0 ? 0 : (fyNetGrowthValueAt / fyAt.fyOpening) * 100;
  const fyNetGrowthValuePm = fyPm.fyClosing - fyPm.fyOpening;
  const fyNetGrowthPctPm   = fyPm.fyOpening === 0 ? 0 : (fyNetGrowthValuePm / fyPm.fyOpening) * 100;
  const fyAttritionValueAt = fyAt.lost;
  const fyAttritionPctAt   = fyAt.fyOpening === 0 ? 0 : (fyAt.lost / fyAt.fyOpening) * 100;
  const fyAttritionValuePm = fyPm.lost;
  const fyAttritionPctPm   = fyPm.fyOpening === 0 ? 0 : (fyPm.lost / fyPm.fyOpening) * 100;

  // ── Service-split derived rows ──
  // When the user expands Net Growth or Attrition, we drop A&T and PM
  // sub-rows underneath that apply the same formulas constrained to
  // each service line. Lets the founder/COO read "where is the
  // movement coming from?" at a glance — A&T net-growth or PM net-
  // growth, A&T churn rate vs. PM churn rate.
  const netGrowthValueByLane = (l: 'at' | 'pm'): number[] =>
    rows.map(r => (l === 'at' ? r.closing.at - r.opening.at : r.closing.pm - r.opening.pm));
  const netGrowthPctByLane = (l: 'at' | 'pm'): number[] =>
    rows.map(r => {
      const op = l === 'at' ? r.opening.at : r.opening.pm;
      const cl = l === 'at' ? r.closing.at : r.closing.pm;
      if (op === 0) return 0;
      return ((cl - op) / op) * 100;
    });
  const attritionValueByLane = (l: 'at' | 'pm'): number[] =>
    rows.map(r => (l === 'at' ? r.lost.at : r.lost.pm));
  const attritionPctByLane = (l: 'at' | 'pm'): number[] =>
    rows.map(r => {
      const op = l === 'at' ? r.opening.at : r.opening.pm;
      const lo = l === 'at' ? r.lost.at    : r.lost.pm;
      if (op === 0) return 0;
      return (lo / op) * 100;
    });


  // YoY for the derived rows
  const netGrowthValueYoY = pyAligned ? rows.map((_r, i) => {
    const py = pyAligned[i];
    if (!py) return null;
    const cur = (rows[i].closing.at + rows[i].closing.pm) - (rows[i].opening.at + rows[i].opening.pm);
    const pyV = (py.closing.at + py.closing.pm) - (py.opening.at + py.opening.pm);
    return yoyPct(cur, pyV);
  }) : undefined;
  const attritionValueYoY = pyAligned ? rows.map((_r, i) => {
    const py = pyAligned[i];
    if (!py) return null;
    const cur = rows[i].lost.at + rows[i].lost.pm;
    const pyV = py.lost.at + py.lost.pm;
    return yoyPct(cur, pyV);
  }) : undefined;

  // ── Custom range bounds (clamped to FY data) ──
  const allIsos = data.map(r => r.iso);

  return (
    // Card has only top/bottom borders so the Net Growth + Attrition
    // rails (border-l on the sticky cell) sit flush against the card's
    // outer left edge. With a full `border` on all sides, the 1px
    // left border was creating a visible white gap between the card
    // edge and the rail. Rounded corners + bg-white still demarcate
    // the card on the page.
    <div className="bg-white rounded-xl border-y border-black/[0.06]">
      {/* Header — title block + control cluster (range, PY toggle) */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-black/[0.04]">
        <div className="min-w-0">
          <h3 className="text-h3 font-bold text-black/90">Net Growth & Attrition</h3>
          <p className="text-caption text-black/70 mt-1">
            How the book moved month-by-month — opening MRR, new kickoffs, churn, and the closing total.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Range preset */}
          <div className="relative">
            <label htmlFor="ngat-range" className="sr-only">Range</label>
            <select
              id="ngat-range"
              value={preset}
              onChange={(e) => setPreset(e.target.value as RangePreset)}
              className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/75 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
            >
              <option value="fy-current">FY 2025-26</option>
              {dataPY && <option value="fy-prior">FY 2024-25 (previous)</option>}
              <option value="last-6">Last 6 months</option>
              <option value="last-3">Last 3 months</option>
              <option value="custom">Custom…</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>

          {/* Custom range pickers — only render when 'custom' preset */}
          {preset === 'custom' && (
            <>
              <div className="relative">
                <label htmlFor="ngat-custom-start" className="sr-only">From month</label>
                <select
                  id="ngat-custom-start"
                  value={customStart ?? ''}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/75 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                >
                  {allIsos.map(iso => {
                    const match = data.find(r => r.iso === iso);
                    return <option key={iso} value={iso}>{match?.month ?? iso}</option>;
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
              <span className="text-caption text-black/40">to</span>
              <div className="relative">
                <label htmlFor="ngat-custom-end" className="sr-only">To month</label>
                <select
                  id="ngat-custom-end"
                  value={customEnd ?? ''}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/75 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                >
                  {allIsos.map(iso => {
                    const match = data.find(r => r.iso === iso);
                    return <option key={iso} value={iso}>{match?.month ?? iso}</option>;
                  })}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            </>
          )}

          {/* PY toggle */}
          {dataPY && (
            <button
              type="button"
              onClick={() => setShowPY(p => !p)}
              aria-pressed={showPY}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-caption font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                showPY
                  ? 'bg-[#EEF1FB] border-[#204CC7]/30 text-[#204CC7]'
                  : 'bg-white border-black/10 text-black/65 hover:border-black/20'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                showPY ? 'bg-[#204CC7] border-[#204CC7]' : 'border-black/20'
              }`} aria-hidden="true">
                {showPY && <span className="block w-1.5 h-1.5 bg-white rounded-[1px]" />}
              </span>
              Compare with PY
            </button>
          )}

          {/* Insight — opens a side drawer with the editorial summary
              of the active range. Soft brand-blue chrome to read as a
              "go deeper" affordance without competing with the data
              filters to its left. */}
          <button
            type="button"
            onClick={() => setInsightOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={insightOpen}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-caption font-semibold text-[#204CC7] bg-white border border-[#204CC7]/25 hover:bg-[#EEF1FB] hover:border-[#204CC7]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Insight
          </button>
        </div>
      </div>

      {/* Table wrapper — horizontal scroll when months overflow.
          `table-fixed` + explicit colgroup widths is what makes the
          sticky column scroll smoothly. Without a committed layout
          the browser recomputes widths during scroll and the sticky
          cell appears to flicker / drift. */}
      <div className="overflow-x-auto">
        <table
          className="w-full table-fixed border-collapse"
          style={{ minWidth: `${STICKY_LEFT_PX + TOTAL_COL_PX + rows.length * MONTH_COL_PX}px` }}
          role="table"
          aria-label="Net growth and attrition by month"
        >
          <colgroup>
            <col style={STICKY_LEFT_W} />
            <col style={TOTAL_COL_W} />
            {rows.map(r => <col key={r.iso} style={MONTH_COL_W} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-black/[0.06]">
              <th
                scope="col"
                className="sticky left-0 z-20 bg-[#FAFBFC] px-5 py-3 text-left text-caption font-semibold text-black/65 uppercase tracking-wider"
                style={STICKY_LEFT_W}
              >
                Particulars
              </th>
              <th
                scope="col"
                className={`sticky z-20 bg-[#EEF1FB] px-3 py-3 text-right text-caption font-bold text-[#204CC7] uppercase tracking-wider whitespace-nowrap ${STICKY_RIGHT_SHADOW}`}
                style={{ ...TOTAL_COL_W, ...TOTAL_COL_LEFT }}
              >
                FY Total
              </th>
              {rows.map(r => <MonthHeaderCell key={r.iso} label={r.month} />)}
            </tr>
          </thead>
          <tbody>

            {/* ── 1. Opening Client Value (expandable) ── */}
            <ParentRow
              label="Opening Client Value"
              expanded={isExpanded('opening')}
              onToggle={() => toggle('opening')}
              cells={lane('opening', 'all').map((v, i) => ({
                value: v,
                yoy: laneYoY('opening', 'all')?.[i] ?? null,
              }))}
              total={fyAll.fyOpening}
            />
            {isExpanded('opening') && (
              <>
                <SubRow label="Accounts & Taxation"   values={lane('opening', 'at')} total={fyAt.fyOpening} yoy={laneYoY('opening', 'at')} />
                <SubRow label="Performance Marketing" values={lane('opening', 'pm')} total={fyPm.fyOpening} yoy={laneYoY('opening', 'pm')} />
              </>
            )}

            {/* ── 2. New Kickoff (expandable) ── */}
            <ParentRow
              label="New Kickoff"
              expanded={isExpanded('kickoff')}
              onToggle={() => toggle('kickoff')}
              cells={lane('kickoff', 'all').map((v, i) => ({
                value: v,
                yoy: laneYoY('kickoff', 'all')?.[i] ?? null,
              }))}
              total={fyAll.kickoff}
              tone="positive"
            />
            {isExpanded('kickoff') && (
              <>
                <SubRow label="Accounts & Taxation"   values={lane('kickoff', 'at')} total={fyAt.kickoff} yoy={laneYoY('kickoff', 'at')} />
                <SubRow label="Performance Marketing" values={lane('kickoff', 'pm')} total={fyPm.kickoff} yoy={laneYoY('kickoff', 'pm')} />
              </>
            )}

            {/* ── 3. Clients Lost (expandable) ── */}
            <ParentRow
              label="Clients Lost"
              expanded={isExpanded('lost')}
              onToggle={() => toggle('lost')}
              cells={lane('lost', 'all').map((v, i) => ({
                value: v,
                yoy: laneYoY('lost', 'all')?.[i] ?? null,
              }))}
              total={fyAll.lost}
              tone="negative"
            />
            {isExpanded('lost') && (
              <>
                <SubRow label="Accounts & Taxation"   values={lane('lost', 'at')} total={fyAt.lost} yoy={laneYoY('lost', 'at')} />
                <SubRow label="Performance Marketing" values={lane('lost', 'pm')} total={fyPm.lost} yoy={laneYoY('lost', 'pm')} />
              </>
            )}

            {/* ── 4. Closing Client Value (expandable) ── */}
            <ParentRow
              label="Closing Client Value"
              expanded={isExpanded('closing')}
              onToggle={() => toggle('closing')}
              cells={lane('closing', 'all').map((v, i) => ({
                value: v,
                yoy: laneYoY('closing', 'all')?.[i] ?? null,
              }))}
              total={fyAll.fyClosing}
              tone="strong"
            />
            {isExpanded('closing') && (
              <>
                <SubRow label="Accounts & Taxation"   values={lane('closing', 'at')} total={fyAt.fyClosing} yoy={laneYoY('closing', 'at')} />
                <SubRow label="Performance Marketing" values={lane('closing', 'pm')} total={fyPm.fyClosing} yoy={laneYoY('closing', 'pm')} />
              </>
            )}

            {/* ── 5. Net Growth (₹ + %) ── */}
            <DerivedRow
              label="Net Growth"
              caption="Closing − Opening"
              tone="growth"
              valueCells={netGrowthValue.map((v, i) => ({ value: v, yoy: netGrowthValueYoY?.[i] ?? null }))}
              pctCells={netGrowthPct}
              totalValue={fyNetGrowthValue}
              totalPct={fyNetGrowthPct}
              expanded={isExpanded('net-growth')}
              onToggle={() => toggle('net-growth')}
            />
            {isExpanded('net-growth') && (
              <>
                <DerivedSubRow
                  label="Accounts & Taxation"
                  tone="growth"
                  values={netGrowthValueByLane('at')}
                  pcts={netGrowthPctByLane('at')}
                  totalValue={fyNetGrowthValueAt}
                  totalPct={fyNetGrowthPctAt}
                />
                <DerivedSubRow
                  label="Performance Marketing"
                  tone="growth"
                  values={netGrowthValueByLane('pm')}
                  pcts={netGrowthPctByLane('pm')}
                  totalValue={fyNetGrowthValuePm}
                  totalPct={fyNetGrowthPctPm}
                />
              </>
            )}

            {/* ── 6. Attrition (₹ + %) ── */}
            <DerivedRow
              label="Attrition"
              caption="Lost / Opening"
              tone="attrition"
              valueCells={attritionValue.map((v, i) => ({ value: v, yoy: attritionValueYoY?.[i] ?? null }))}
              pctCells={attritionPct}
              totalValue={fyAttritionValue}
              totalPct={fyAttritionPct}
              valueIsNegative
              expanded={isExpanded('attrition')}
              onToggle={() => toggle('attrition')}
            />
            {isExpanded('attrition') && (
              <>
                <DerivedSubRow
                  label="Accounts & Taxation"
                  tone="attrition"
                  values={attritionValueByLane('at')}
                  pcts={attritionPctByLane('at')}
                  totalValue={fyAttritionValueAt}
                  totalPct={fyAttritionPctAt}
                  valueIsNegative
                />
                <DerivedSubRow
                  label="Performance Marketing"
                  tone="attrition"
                  values={attritionValueByLane('pm')}
                  pcts={attritionPctByLane('pm')}
                  totalValue={fyAttritionValuePm}
                  totalPct={fyAttritionPctPm}
                  valueIsNegative
                />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── At-a-glance insight drawer ──
          Triggered by the "Insight" button on the top bar. Lives at
          the document body via a portal so the side-slide doesn't
          fight the table card's overflow. Same editorial story as
          before, just behind a click — keeps the table surface
          uncluttered and gives the read more breathing room. */}
      <InsightDrawer
        rows={rows}
        open={insightOpen}
        onClose={() => setInsightOpen(false)}
      />

    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// AT-A-GLANCE INSIGHT DRAWER — editorial narrative in a side drawer
// ════════════════════════════════════════════════════════════════════════════
//
// Built for the founder + COO. The principle: an exec shouldn't read
// a 12-month grid to know how the year went. The drawer reads like a
// short editorial — one hero number that lands the headline, then
// three short stories that explain *what worked, what didn't, and
// what it means*. Restrained typography and generous whitespace
// over chrome and color. Modern 2026 aesthetic — no card grid, no
// chart-gauge clutter, no jargon.
//
// Lives behind the "Insight" button on the table's top bar so the
// data surface itself stays uncluttered. Portal-rendered at body so
// the side slide can't be clipped by any parent's overflow.

interface MonthlyAggregate {
  iso:     string;
  month:   string;
  opening: number;
  kickoff: number;
  lost:    number;
  closing: number;
}

function InsightDrawer({
  rows,
  open,
  onClose,
}: {
  rows: MonthlyClientValue[];
  open: boolean;
  onClose: () => void;
}) {
  // Esc closes the drawer; body scroll locks while open so the
  // table behind doesn't drift.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  // Empty-state — quietly say "nothing to show" inside the drawer
  // chrome rather than failing on the index lookups below.
  if (rows.length === 0) {
    return createPortal(
      <InsightDrawerShell rangeLabel="—" onClose={onClose}>
        <p className="text-body text-black/65">
          Pick a range with at least one month to see the summary.
        </p>
      </InsightDrawerShell>,
      document.body,
    );
  }

  // Flatten each row to all-up totals for the 4 metrics that matter.
  const flat: MonthlyAggregate[] = rows.map(r => ({
    iso:     r.iso,
    month:   r.month,
    opening: r.opening.at + r.opening.pm,
    kickoff: r.kickoff.at + r.kickoff.pm,
    lost:    r.lost.at    + r.lost.pm,
    closing: r.closing.at + r.closing.pm,
  }));

  const first = flat[0];
  const last  = flat[flat.length - 1];

  // ── Hero numbers ──
  const fyOpening      = first.opening;
  const fyClosing      = last.closing;
  const fyNetGrowth    = fyClosing - fyOpening;
  const fyNetGrowthPct = fyOpening === 0 ? 0 : (fyNetGrowth / fyOpening) * 100;
  const direction =
    fyNetGrowth > 0 ? 'up' :
    fyNetGrowth < 0 ? 'down' : 'flat';

  // ── Story 1 — service comparison + best month, woven into one
  //              "what won" paragraph ──
  const atGrowthPct = rows[0].opening.at === 0 ? 0 : ((rows[rows.length - 1].closing.at - rows[0].opening.at) / rows[0].opening.at) * 100;
  const pmGrowthPct = rows[0].opening.pm === 0 ? 0 : ((rows[rows.length - 1].closing.pm - rows[0].opening.pm) / rows[0].opening.pm) * 100;
  const fasterFullName = atGrowthPct >= pmGrowthPct ? 'Accounts & Taxation' : 'Performance Marketing';
  const slowerFullName = atGrowthPct >= pmGrowthPct ? 'Performance Marketing' : 'Accounts & Taxation';
  const fasterPct = Math.max(atGrowthPct, pmGrowthPct);
  const slowerPct = Math.min(atGrowthPct, pmGrowthPct);
  const bestKickoff = flat.reduce((b, r) => r.kickoff > b.kickoff ? r : b, flat[0]);

  // ── Story 2 — toughest month, with concentration callout if
  //              service mix tells a clear story ──
  const worstLost = flat.reduce((w, r) => r.lost > w.lost ? r : w, flat[0]);
  const worstLostRow = rows.find(r => r.iso === worstLost.iso);
  const worstAt = worstLostRow ? worstLostRow.lost.at : 0;
  const worstPm = worstLostRow ? worstLostRow.lost.pm : 0;
  const worstConcentration =
    worstAt > worstPm * 1.5 ? 'A&T' :
    worstPm > worstAt * 1.5 ? 'SEM' : null;

  // ── Story 3 — kickoff:lost ratio with health verdict ──
  const totalKickoff = flat.reduce((s, r) => s + r.kickoff, 0);
  const totalLost    = flat.reduce((s, r) => s + r.lost,    0);
  const ratio = totalLost === 0 ? Infinity : totalKickoff / totalLost;
  const ratioVerdict =
    ratio === Infinity   ? 'No churn at all this period — exceptional.'
    : ratio >= 1.5       ? 'Healthy buffer. Keep the kickoff engine running.'
    : ratio >= 1         ? 'Net positive, but the gap is narrow — kickoffs are barely outpacing churn.'
                         : 'Churn is outpacing new wins. The book is shrinking.';

  // ── Range label ──
  const rangeLabel = flat.length === 1
    ? flat[0].month
    : `${first.month} → ${last.month}`;

  // ── Hero copy: direction-aware, single sentence ──
  const heroSubhead =
    direction === 'flat'
      ? `Closing client value sits flat at ${formatLakh(fyClosing)}.`
      : direction === 'up'
        ? `Client value grew from ${formatLakh(fyOpening)} to ${formatLakh(fyClosing)} over ${flat.length} ${flat.length === 1 ? 'month' : 'months'}.`
        : `Client value contracted from ${formatLakh(fyOpening)} to ${formatLakh(fyClosing)} over ${flat.length} ${flat.length === 1 ? 'month' : 'months'}.`;

  // Hero text colour — direction-tinted so the eye reads the mood
  // before parsing the digits.
  const heroColor =
    direction === 'up'   ? 'text-emerald-700'
    : direction === 'down' ? 'text-rose-700'
                           : 'text-black/85';

  return createPortal(
    <InsightDrawerShell rangeLabel={rangeLabel} onClose={onClose}>
      {/* Hero metric — the one number the founder takes away.
          Outsized by design. Sub-heading underneath gives one-line
          context. */}
      <div className="mb-10">
        <h2 className={`font-bold leading-none tracking-tight tabular-nums text-[44px] ${heroColor}`}>
          {direction === 'flat' ? formatLakh(fyClosing) : formatDeltaLakh(fyNetGrowth)}
        </h2>
        {direction !== 'flat' && (
          <p className={`mt-2 text-h3 font-semibold tabular-nums ${heroColor}`}>
            {formatPct(fyNetGrowthPct, true)}
          </p>
        )}
        <p className="mt-4 text-body text-black/75 leading-relaxed">
          {heroSubhead}
        </p>
      </div>

      {/* Hairline divider — quietly signals "now the story". */}
      <div className="h-px bg-black/[0.06] mb-8" aria-hidden="true" />

      {/* Story stack — three short paragraphs, vertically rhythmed.
          Each leads with a tiny eyebrow + directional icon so the
          mood is set before the eye reads the copy. */}
      <div className="space-y-7">

        {/* The Win — what drove growth */}
        <Story
          tone="positive"
          icon={<ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />}
          eyebrow="The win"
        >
          <strong className="text-black/90 font-semibold">{fasterFullName}</strong> pulled ahead this period, growing
          {' '}<NumberMark tone="positive">{formatPct(fasterPct, true)}</NumberMark>
          {' '}vs. {' '}<NumberMark tone="neutral">{formatPct(slowerPct, true)}</NumberMark>{' '}on {slowerFullName}.
          {' '}<strong className="text-black/90 font-semibold">{bestKickoff.month}</strong> was the strongest single month —
          {' '}<NumberMark tone="positive">{formatLakh(bestKickoff.kickoff)}</NumberMark> in new client value added.
        </Story>

        {/* The Watch — where the book leaked */}
        <Story
          tone="negative"
          icon={<ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />}
          eyebrow="The watch"
        >
          <strong className="text-black/90 font-semibold">{worstLost.month}</strong> was the toughest —
          {' '}<NumberMark tone="negative">{formatLakh(worstLost.lost)}</NumberMark> walked out the door,
          the single biggest leak this period{worstConcentration ? `, concentrated in ${worstConcentration}` : ''}.
          {' '}Worth a retro on what triggered it.
        </Story>

        {/* The Bottom Line — verdict on net momentum */}
        <Story
          tone="neutral"
          icon={<Diamond className="w-3 h-3" aria-hidden="true" />}
          eyebrow="The bottom line"
        >
          For every <NumberMark tone="negative">₹1</NumberMark> lost to churn, you brought in
          {' '}<NumberMark tone="positive">{ratio === Infinity ? 'unlimited' : `₹${ratio.toFixed(2)}`}</NumberMark> in new business.
          {' '}{ratioVerdict}
        </Story>
      </div>
    </InsightDrawerShell>,
    document.body,
  );
}

// ════════════════════════════════════════════════════════════════════════════
// INSIGHT DRAWER SHELL — backdrop + side-slide panel + header chrome
// ════════════════════════════════════════════════════════════════════════════
//
// Encapsulates the chrome so the body of the drawer (`children`) can
// stay focused on the editorial copy. Used by both the regular path
// and the empty-state branch.

function InsightDrawerShell({
  rangeLabel,
  onClose,
  children,
}: {
  rangeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop — soft tint + faint blur so the table behind reads
          as "background" without disappearing entirely. Click-through
          dismisses the drawer. */}
      <div
        className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-[1px] animate-[fadeIn_160ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — slides in from the right. Capped at 90vw on small
          viewports so it never fully covers the page on a phone. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-drawer-title"
        className="fixed right-0 top-0 z-[81] h-screen w-[600px] max-w-[92vw] bg-white shadow-[-12px_0_32px_-12px_rgba(0,0,0,0.18)] flex flex-col"
        style={{ animation: 'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header — eyebrow + range + close. Sticky so it stays
            visible if the body needs to scroll on tall content. */}
        <div className="px-8 py-5 border-b border-black/[0.06] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <p
              id="insight-drawer-title"
              className="text-caption font-bold text-[#204CC7] uppercase tracking-[0.12em] flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              At a glance
            </p>
            <p className="text-caption text-black/65 mt-1 tabular-nums">{rangeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close insight"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-black/55 hover:text-black/85 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body — generous padding, scroll if content overflows. */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </div>
      </div>

      {/* Inline keyframes so we don't need a global stylesheet
          touchpoint just for this drawer. Slide-in is right-to-left
          with a soft easing curve; the backdrop fades in alongside. */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%) }
          to   { transform: translateX(0)    }
        }
      `}</style>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STORY — one editorial paragraph: tiny eyebrow + body copy
// ════════════════════════════════════════════════════════════════════════════

function Story({
  tone,
  icon,
  eyebrow,
  children,
}: {
  tone: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const eyebrowColor =
    tone === 'positive' ? 'text-emerald-700'
    : tone === 'negative' ? 'text-rose-700'
                          : 'text-[#204CC7]';
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-caption font-bold uppercase tracking-[0.1em] mb-2 ${eyebrowColor}`}>
        {icon}
        {eyebrow}
      </p>
      <p className="text-body text-black/80 leading-relaxed">
        {children}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// NUMBER MARK — inline highlighted figure inside body copy
// ════════════════════════════════════════════════════════════════════════════
//
// A small typographic device: numbers in body copy get a subtle
// tone-coloured weight bump so they jump off the line without needing
// pills, badges, or boxes. Keeps the editorial feel intact.

function NumberMark({
  tone,
  children,
}: {
  tone: 'positive' | 'negative' | 'neutral';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'positive' ? 'text-emerald-700 font-semibold'
    : tone === 'negative' ? 'text-rose-700 font-semibold'
                          : 'text-black/90 font-semibold';
  return <span className={`tabular-nums ${cls}`}>{children}</span>;
}

// ════════════════════════════════════════════════════════════════════════════
// PARENT ROW — expandable header row with chevron, value per month + total
// ════════════════════════════════════════════════════════════════════════════

interface ParentRowProps {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  cells: { value: number; yoy: number | null }[];
  /** FY total for this row — surfaced in the second sticky column
   *  so the headline number is visible even while the months scroll
   *  off-screen on the right. */
  total: number;
  /** Visual tone — default neutral, "positive" tints green, "negative"
   *  rose, "strong" bumps weight (used for Closing as the headline). */
  tone?: 'neutral' | 'positive' | 'negative' | 'strong';
}

function ParentRow({ label, expanded, onToggle, cells, total, tone = 'neutral' }: ParentRowProps) {
  const valueClass =
    tone === 'positive' ? 'text-emerald-700'
    : tone === 'negative' ? 'text-rose-700'
    : tone === 'strong'   ? 'text-black/90'
                          : 'text-black/85';
  return (
    // `group` + group-hover on the sticky cell keeps the hover tint
    // from showing through as a stripe — both the sticky cell and the
    // rest of the row tint together. No transition on the sticky cell
    // (which would re-paint during scroll).
    <tr className="group border-b border-black/[0.04] hover:bg-[#F8F9FF]/40">
      <td
        className="sticky left-0 z-10 bg-white group-hover:bg-[#F8F9FF] px-5 py-3"
        style={STICKY_LEFT_W}
      >
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-body font-semibold text-black/85 hover:text-[#204CC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded -mx-1 px-1"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
        >
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-black/55 shrink-0" aria-hidden="true" />
            : <ChevronRight className="w-3.5 h-3.5 text-black/55 shrink-0" aria-hidden="true" />
          }
          {label}
        </button>
      </td>
      <td
        className={`sticky z-10 bg-[#F4F6FF] group-hover:bg-[#E8EDFB] px-3 py-3 align-middle ${STICKY_RIGHT_SHADOW}`}
        style={{ ...TOTAL_COL_W, ...TOTAL_COL_LEFT }}
      >
        <div className="flex justify-end leading-tight">
          <span className={`text-body font-bold tabular-nums ${valueClass}`}>{formatLakh(total)}</span>
        </div>
      </td>
      {cells.map((c, i) => (
        <td key={i} className="px-3 py-3 align-middle">
          <div className="flex flex-col items-end gap-0.5 leading-tight">
            <span className={`text-caption font-semibold tabular-nums ${valueClass}`}>{formatLakh(c.value)}</span>
            {c.yoy != null && <YoyDelta pct={c.yoy} />}
          </div>
        </td>
      ))}
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DERIVED ROW — Net Growth and Attrition. Always shows ₹ + % stacked.
// ════════════════════════════════════════════════════════════════════════════

interface DerivedRowProps {
  label: string;
  caption: string;
  tone: 'growth' | 'attrition';
  valueCells: { value: number; yoy: number | null }[];
  pctCells: number[];
  /** FY total ₹ + % for the row — surfaced in the second sticky
   *  column so the headline movement (or churn rate) is always
   *  visible regardless of horizontal scroll. */
  totalValue: number;
  totalPct: number;
  /** Attrition is naturally a "loss", so its ₹ value is shown as a
   *  positive number with the rose treatment. Net Growth shows ₹
   *  with a leading sign so positive vs. negative is obvious. */
  valueIsNegative?: boolean;
  /** Same chevron-driven expand pattern as ParentRow — clicking the
   *  label drops A&T / PM sub-rows beneath the headline. */
  expanded?: boolean;
  onToggle?: () => void;
}

function DerivedRow({ label, caption, tone, valueCells, pctCells, totalValue, totalPct, valueIsNegative = false, expanded, onToggle }: DerivedRowProps) {
  const labelTint = tone === 'growth' ? 'border-l-emerald-500' : 'border-l-rose-500';
  const chevron = expanded
    ? <ChevronDown className="w-3.5 h-3.5 text-black/55 shrink-0" aria-hidden="true" />
    : <ChevronRight className="w-3.5 h-3.5 text-black/55 shrink-0" aria-hidden="true" />;
  return (
    <tr className="border-t-2 border-black/[0.08] bg-[#FAFBFC]">
      <td
        className={`sticky left-0 z-10 bg-[#FAFBFC] px-5 py-3.5 border-l-2 ${labelTint}`}
        style={STICKY_LEFT_W}
      >
        <div className="flex flex-col gap-0.5">
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!!expanded}
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${label}`}
              className="inline-flex items-center gap-1.5 text-body font-bold text-black/90 hover:text-[#204CC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded -mx-1 px-1"
            >
              {chevron}
              {label}
            </button>
          ) : (
            <span className="text-body font-bold text-black/90">{label}</span>
          )}
          <span className="text-caption text-black/65 tabular-nums pl-5">{caption}</span>
        </div>
      </td>
      <td
        className={`sticky z-10 bg-[#EEF1FB] px-3 py-3.5 align-middle ${STICKY_RIGHT_SHADOW}`}
        style={{ ...TOTAL_COL_W, ...TOTAL_COL_LEFT }}
      >
        <div className="flex flex-col items-end gap-0.5 leading-tight">
          <ValuePill value={totalValue} tone={tone} signed={!valueIsNegative} strong />
          <PctPill pct={totalPct} tone={tone} signedPct={!valueIsNegative} strong />
        </div>
      </td>
      {valueCells.map((c, i) => {
        const pct = pctCells[i];
        return (
          <td key={i} className="px-3 py-3.5 align-middle">
            <div className="flex flex-col items-end gap-0.5 leading-tight">
              <ValuePill value={c.value} tone={tone} signed={!valueIsNegative} />
              <PctPill pct={pct} tone={tone} signedPct={!valueIsNegative} />
              {c.yoy != null && <YoyDelta pct={c.yoy} />}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DERIVED SUB-ROW — A&T / PM split under Net Growth and Attrition
// ════════════════════════════════════════════════════════════════════════════

function DerivedSubRow({
  label,
  tone,
  values,
  pcts,
  totalValue,
  totalPct,
  valueIsNegative = false,
}: {
  label: string;
  tone: 'growth' | 'attrition';
  values: number[];
  pcts: number[];
  totalValue: number;
  totalPct: number;
  valueIsNegative?: boolean;
}) {
  const labelTint = tone === 'growth' ? 'border-l-emerald-500/50' : 'border-l-rose-500/50';
  // Tone-aware text color helper for value + pct cells.
  const valueClassFor = (v: number): string => tone === 'growth'
    ? (v > 0 ? 'text-emerald-700' : v < 0 ? 'text-rose-700' : 'text-black/70')
    : 'text-rose-700';
  const pctClassFor = (p: number): string => tone === 'growth'
    ? (p > 0 ? 'text-emerald-700' : p < 0 ? 'text-rose-700' : 'text-black/65')
    : 'text-rose-700';
  return (
    <tr className="bg-[#F4F6FF]/40 border-b border-black/[0.04]">
      <td
        className={`sticky left-0 z-10 bg-[#F4F6FF] px-5 py-2.5 pl-12 border-l-2 ${labelTint}`}
        style={STICKY_LEFT_W}
      >
        <span className="text-caption font-medium text-black/70">{label}</span>
      </td>
      <td
        className={`sticky z-10 bg-[#F7F9FE] px-3 py-2.5 align-middle ${STICKY_RIGHT_SHADOW}`}
        style={{ ...TOTAL_COL_W, ...TOTAL_COL_LEFT }}
      >
        <div className="flex flex-col items-end gap-0.5 leading-tight">
          <span className={`tabular-nums text-caption font-semibold ${valueClassFor(totalValue)}`}>
            {valueIsNegative ? formatLakh(totalValue) : formatDeltaLakh(totalValue)}
          </span>
          <span className={`tabular-nums text-caption font-semibold ${pctClassFor(totalPct)}`}>
            {formatPct(totalPct, !valueIsNegative)}
          </span>
        </div>
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 align-middle">
          <div className="flex flex-col items-end gap-0.5 leading-tight">
            <span className={`tabular-nums text-caption font-medium ${valueClassFor(v)}`}>
              {valueIsNegative ? formatLakh(v) : formatDeltaLakh(v)}
            </span>
            <span className={`tabular-nums text-caption font-medium ${pctClassFor(pcts[i])}`}>
              {formatPct(pcts[i], !valueIsNegative)}
            </span>
          </div>
        </td>
      ))}
    </tr>
  );
}

function ValuePill({ value, tone, signed, strong = false }: { value: number; tone: 'growth' | 'attrition'; signed: boolean; strong?: boolean }) {
  const positive = value > 0;
  const negative = value < 0;
  const cls = tone === 'growth'
    ? (positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-black/65')
    : 'text-rose-700';
  return (
    <span className={`tabular-nums ${strong ? 'text-body font-bold' : 'text-caption font-semibold'} ${cls}`}>
      {signed ? formatDeltaLakh(value) : formatLakh(value)}
    </span>
  );
}

function PctPill({ pct, tone, signedPct, strong = false }: { pct: number; tone: 'growth' | 'attrition'; signedPct: boolean; strong?: boolean }) {
  const positive = pct > 0;
  const negative = pct < 0;
  const cls = tone === 'growth'
    ? (positive ? 'text-emerald-700' : negative ? 'text-rose-700' : 'text-black/70')
    : 'text-rose-600';
  return (
    <span className={`tabular-nums text-caption ${strong ? 'font-bold' : 'font-medium'} ${cls}`}>
      {formatPct(pct, signedPct)}
    </span>
  );
}
