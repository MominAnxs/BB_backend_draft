/**
 * Holistic per-domain compliance list views for A&T.
 *
 * One sub-tab per compliance domain (TDS, GST, PTRC/PTEC, Income Tax,
 * E-Com Reco). Each view is a single sortable table with one row per
 * (client × business), surfacing the credentials + return statuses
 * for that domain across the entire book.
 *
 * The HOD opens these when the question is "who's still pending TDS
 * this month?" rather than "what's the state of this one client?".
 * The same row-level data is editable in two places: here (cheap
 * pivot across the book) and in the per-business Recurring Checklist
 * row 3-dots menu (deep-dive into a single client). Both paths open
 * the same drawer.
 *
 * Layout convention mirrors the Recurring Checklist list view:
 *   • Sticky white top bar with title + count subtitle on the left,
 *     search + filter chrome on the right.
 *   • -mx-8 -mt-6 / px-8 py-6 bleed so the bar sits flush with the
 *     SuperAdminHome page chrome.
 *   • Table renders below the top bar, rounded-xl, h-[60px] rows,
 *     bg-[#FAFBFC] header strip, divide-y divide-black/[0.04].
 *
 * Data shape note — the per-domain records (TdsRecord, GstRecord,
 * PtRecord, IncomeTaxRecord, EcomRecoRecord) live in component-local
 * state on each list view. They start with deterministic seed data
 * (so the page has realistic content without a backend) and persist
 * for the session as the admin edits inline. The drawer that opens
 * from each row writes back into the same state map.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';

import {
  clients,
  Client,
  Business,
  BusinessType,
  ReturnStatus,
  TdsRecord,
  GstRecord,
  GstEntry,
  PtRecord,
  IncomeTaxRecord,
  EcomRecoRecord,
  EMPTY_TDS,
  EMPTY_PT,
  EMPTY_IT,
  GST_RETURN_OPTIONS,
  PT_RETURN_OPTIONS,
  IT_RETURN_OPTIONS,
  TdsDrawer,
  GstDrawer,
  PtDrawer,
  IncomeTaxDrawer,
  EcomRecoDrawer,
  ReturnStatusDropdown,
  TeamPopover,
  newGstEntryId,
  CURRENT_MONTH,
  monthFromISO,
  monthToISO,
} from './AccountsTaxation';
import { MonthNavigator } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';

// ════════════════════════════════════════════════════════════════════════════
// FLATTENED ROWS — one per (client × business)
// ════════════════════════════════════════════════════════════════════════════

interface FlatRow {
  client: Client;
  business: Business;
}

const ALL_ROWS: FlatRow[] = clients.flatMap(c =>
  c.businesses.map(b => ({ client: c, business: b }))
);
const ECOM_ROWS: FlatRow[] = ALL_ROWS.filter(r => r.business.type === 'E-Commerce');

// ════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC SEEDING — same businessId always seeds the same status
// ════════════════════════════════════════════════════════════════════════════

/** Hash a string into a stable 0..1 number. We use this everywhere a
 *  list-view cell needs a "plausible but consistent" value derived
 *  from the businessId — return statuses, last-updated dates, fake
 *  PAN/TAN identifiers, etc. */
function hash01(s: string, salt = ''): number {
  let h = 0;
  for (const c of s + salt) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) / 2147483648;
}

/** Compare two YYYY-MM-DD month ISOs. Negative when `a < b`. */
function compareMonth(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Random-but-deterministic return-status that adapts to whether the
 *  active month is in the past, current, or future. Past months
 *  trend overwhelmingly Done (compliance was completed before
 *  deadline, with a small missed tail); the current month (May
 *  5 — early in the cycle) carries the realistic in-flight mix; the
 *  future is uniformly Pending because the work simply hasn't
 *  started. The month travels through the hash as a salt so each
 *  month gets a different randomization seed.
 *
 *  Setting `allowNa` lets a small slice return 'N/A' (used for PT
 *  where registration genuinely doesn't apply to ~5% of the book). */
function seedStatus(id: string, salt: string, month: string, allowNa = false): ReturnStatus {
  const r = hash01(id, salt + month);
  if (allowNa && r < 0.05) return 'N/A';
  const cmp = compareMonth(month, CURRENT_MONTH);
  if (cmp > 0) return 'Pending';                         // future month
  if (cmp < 0) {                                         // past month
    if (r < 0.93) return 'Done';
    if (r < 0.97) return 'WIP';
    return 'Pending';
  }
  // Current month — early-cycle mix
  if (r < 0.60) return 'Done';
  if (r < 0.80) return 'WIP';
  return 'Pending';
}

/** ITR cells track only Pending/Done — no WIP, no N/A. Past AYs trend
 *  Done; the current AY (and future ones) trend Pending because
 *  filing is open but not done. */
function seedItStatus(id: string, salt: string, month: string): ReturnStatus {
  const r = hash01(id, salt + month);
  const cmp = compareMonth(month, CURRENT_MONTH);
  if (cmp > 0) return 'Pending';
  if (cmp < 0) return r < 0.95 ? 'Done' : 'Pending';
  return r < 0.45 ? 'Done' : 'Pending';
}

/** "Last updated" — anchored within the active month, with a small
 *  tail rolling back into the prior month for variety. */
function seedLastUpdated(id: string, month: string): string {
  const monthStart = new Date(month + 'T00:00:00Z');
  const daysInMonth = new Date(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0).getUTCDate();
  const isCurrent = month === CURRENT_MONTH;
  // Within the active month, scatter days across 0..28; for the
  // current month cap at today (5).
  const max = isCurrent ? 5 : Math.min(daysInMonth, 28);
  const day = 1 + Math.floor(hash01(id, 'lu' + month) * max);
  const d = new Date(monthStart);
  d.setUTCDate(day);
  return d.toISOString().slice(0, 10);
}

/** TAN — 4 letters + 5 digits + 1 letter. Indian convention. */
function seedTan(id: string): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pick = (salt: string) => A[Math.floor(hash01(id, salt) * 26)];
  const num = Math.floor(hash01(id, 't-num') * 90000) + 10000;
  return `${pick('t1')}${pick('t2')}${pick('t3')}${pick('t4')}${num}${pick('t5')}`;
}

/** PAN — 5 letters + 4 digits + 1 letter. */
function seedPan(id: string): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pick = (salt: string) => A[Math.floor(hash01(id, salt) * 26)];
  const num = Math.floor(hash01(id, 'p-num') * 9000) + 1000;
  return `${pick('p1')}${pick('p2')}${pick('p3')}${pick('p4')}${pick('p5')}${num}${pick('p6')}`;
}

/** PTEC No. — 11-digit numeric registration. */
function seedPtec(id: string): string {
  const a = Math.floor(hash01(id, 'pt-a') * 90000000) + 10000000;
  const b = Math.floor(hash01(id, 'pt-b') * 900) + 100;
  return `${a}${b}`;
}

/** Format a YYYY-MM-DD ISO string into "5 May 2026" for the table. */
function fmtIsoDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ════════════════════════════════════════════════════════════════════════════
// STICKY-LEFT COLUMNS — every list locks Client/Business + Team to the left
// ════════════════════════════════════════════════════════════════════════════
//
// Wide compliance tables (TDS / GST / PT / IT / E-Com Reco) all have
// more columns than fit on a 1280-px viewport, so the table scrolls
// horizontally inside its container. The first two columns are
// sticky to the left so the row's identity (which client + which
// team) stays visible while the admin scans the rest of the row.
//
// The two sticky columns share fixed widths (280 + 140) so the
// `left-[280px]` offset on column 2 lines up perfectly with column
// 1's right edge. A subtle right shadow on column 2 telegraphs that
// there's more content scrolled off-screen on the right.
//
// Cells need their own background colour because the row's hover bg
// would otherwise show *under* the sticky cell — wiring the cell
// through the row's `group` lets us track hover state from the
// outside in.

const STICKY_COL_1_W = 280;
const STICKY_COL_2_W = 140;
const STICKY_COL_2_LEFT = STICKY_COL_1_W;

// Tailwind classes carry the static parts (positioning, background,
// z-index, shadow) — width + left offset travel via inline `style`
// because dynamic `w-[Npx]` wouldn't be picked up by Tailwind's JIT.
const STICKY_HEAD_1 = 'sticky left-0 z-20 bg-[#FAFBFC]';
const STICKY_HEAD_2 = 'sticky z-20 bg-[#FAFBFC] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)]';
const STICKY_CELL_1 = 'sticky left-0 z-10 bg-white group-hover:bg-[#F8F9FF]/60 transition-colors';
const STICKY_CELL_2 = 'sticky z-10 bg-white group-hover:bg-[#F8F9FF]/60 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.06)]';
const STICKY_LEFT_2 = { left: `${STICKY_COL_2_LEFT}px` } as const;
const STICKY_W_1 = { width: `${STICKY_COL_1_W}px`, minWidth: `${STICKY_COL_1_W}px` } as const;
const STICKY_W_2 = { width: `${STICKY_COL_2_W}px`, minWidth: `${STICKY_COL_2_W}px` } as const;

// ════════════════════════════════════════════════════════════════════════════
// SHARED CHROME — top bar that mirrors Recurring Checklist's exactly
// ════════════════════════════════════════════════════════════════════════════

interface ListTopBarProps {
  title: string;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  /** Domain status filter — Pending / Done / WIP / N/A (some domains
   *  may opt out of N/A). Each option carries a count badge. */
  statusFilter: 'all' | ReturnStatus;
  onStatusFilter: (v: 'all' | ReturnStatus) => void;
  statusCounts: Partial<Record<ReturnStatus, number>>;
  statusOptions: ReturnStatus[];
  /** Service-type filter — All / E-Commerce / Non E-Commerce. */
  typeFilter: 'all' | BusinessType;
  onTypeFilter: (v: 'all' | BusinessType) => void;
  /** Active month (YYYY-MM-01) + change handler. Drives the in-bar
   *  MonthNavigator + PeriodLabel chrome — same components and same
   *  behaviour as the Recurring Checklist top bar. */
  activeMonth: string;
  onMonthChange: (month: string) => void;
  /** Subtitle below the title (e.g. "TAN credentials + payment &
   *  return status"). Optional — when omitted only the title shows. */
  subtitleLeading?: string;
}

function ListTopBar({
  title,
  search,
  onSearch,
  searchPlaceholder = 'Search clients, businesses…',
  statusFilter,
  onStatusFilter,
  statusCounts,
  statusOptions,
  typeFilter,
  onTypeFilter,
  activeMonth,
  onMonthChange,
  subtitleLeading,
}: ListTopBarProps) {
  const m = monthFromISO(activeMonth);
  return (
    <div className="bg-white border-b border-black/5 sticky top-0 z-30 px-6">
      <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
        {/* Left — title + descriptive subtitle, then a vertical
            divider, then the MonthNavigator + PeriodLabel pill.
            Same hierarchy and chrome as the Recurring Checklist top
            bar: text-body title, text-caption subtitle, divider, h-9
            month nav, period status pill. Past months stay reachable
            and edits made on a past month persist for that month. */}
        <div className="flex items-center gap-4 shrink-0 min-w-0">
          <div className="min-w-0">
            <p className="text-black/90 text-body font-semibold truncate">{title}</p>
            {subtitleLeading && (
              <p className="text-black/60 mt-0.5 text-caption font-normal truncate">
                {subtitleLeading}
              </p>
            )}
          </div>
          <div className="w-px h-8 bg-black/[0.08]" aria-hidden="true" />
          <MonthNavigator
            monthIdx={m.idx}
            year={m.year}
            onMonthChange={(idx) => onMonthChange(monthToISO(idx, m.year))}
            onYearChange={(y) => onMonthChange(monthToISO(m.idx, y))}
            minYear={2025}
          />
          <PeriodLabel monthIdx={m.idx} year={m.year} />
        </div>

        {/* Right — search + status filter + type filter. Locked to h-9
            so the strip reads as a single clean row. */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center w-64 h-9">
            <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" aria-hidden="true" />
            <label htmlFor="ax-list-search" className="sr-only">Search clients or businesses</label>
            <input
              id="ax-list-search"
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full h-full pl-9 pr-3 bg-[#F6F7FF] border border-black/5 rounded-md placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
            />
          </div>

          <div className="relative">
            <label htmlFor="ax-list-status" className="sr-only">Filter by status</label>
            <select
              id="ax-list-status"
              value={statusFilter}
              onChange={(e) => onStatusFilter(e.target.value as 'all' | ReturnStatus)}
              className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
            >
              <option value="all">All status</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>
                  {s} · {statusCounts[s] ?? 0}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>

          <div className="relative">
            <label htmlFor="ax-list-type" className="sr-only">Filter by business type</label>
            <select
              id="ax-list-type"
              value={typeFilter}
              onChange={(e) => onTypeFilter(e.target.value as 'all' | BusinessType)}
              className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
            >
              <option value="all">All types</option>
              <option value="E-Commerce">E-Commerce</option>
              <option value="Non E-Commerce">Non E-Commerce</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED CELLS — Client/Business identity and a "credentials configured" pill
// ════════════════════════════════════════════════════════════════════════════

/** First column on every list view: business name (primary) + client
 *  caption when different. Mirrors the (business, client) hierarchy
 *  used on the Recurring Checklist + Dashboard tables. */
function ClientBusinessCell({ row }: { row: FlatRow }) {
  const { client, business } = row;
  const showClient = business.name !== client.name;
  return (
    <div className="min-w-0">
      <div className="text-body font-medium text-black/85 truncate">{business.name}</div>
      {showClient && (
        <div className="text-caption text-black/55 truncate mt-0.5">{client.name}</div>
      )}
    </div>
  );
}

/** Service-type chip — same colors used in the Recurring Checklist and
 *  Dashboard. E-Com / Trading. Compact pill. */
function TypeChip({ type }: { type: BusinessType }) {
  const isEcom = type === 'E-Commerce';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium whitespace-nowrap ${
      isEcom
        ? 'bg-[#00C875]/[0.10] text-[#0A8F5E]'
        : 'bg-[#06B6D4]/[0.10] text-[#0E7490]'
    }`}>
      {isEcom ? 'E-Com' : 'Non E-Com'}
    </span>
  );
}

/** Credentials configured pill — used on TDS list view to surface
 *  "is the credential record set up at all?" without the admin
 *  having to open every drawer. Reads as a quiet badge so it doesn't
 *  compete with status pills nearby. */
function CredentialsPill({ filled }: { filled: boolean }) {
  return filled ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-medium whitespace-nowrap bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" aria-hidden="true" />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-medium whitespace-nowrap bg-amber-50 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" aria-hidden="true" />
      Setup pending
    </span>
  );
}

/** "Last updated" — relative-readable date shown in the table. We pair
 *  the formatted date with a "X days ago" caption when relevant for
 *  scannability. */
function LastUpdatedCell({ iso }: { iso: string }) {
  const today = new Date('2026-05-05T00:00:00Z');
  const d = new Date(iso);
  const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
  const hint = diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : `${diff}d ago`;
  return (
    <div>
      <div className="text-caption font-medium text-black/75 tabular-nums">{fmtIsoDate(iso)}</div>
      <div className="text-caption text-black/45">{hint}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED TABLE SHELL — wraps every list view in a consistent shell
// ════════════════════════════════════════════════════════════════════════════

function ListShell({ children }: { children: React.ReactNode }) {
  return <div className="-mx-8 -mt-6">{children}</div>;
}

/** Hook — handles the shared month-routing chrome every list view
 *  needs. Reads `?month=YYYY-MM-01` from the URL, defaults to the
 *  current month, and exposes `setActiveMonth` that pushes the new
 *  month back to the URL while preserving every other search param.
 *  Same pattern Recurring Checklist uses, factored once so the five
 *  list views stay in lock-step. */
function useActiveMonth(): { activeMonth: string; setActiveMonth: (m: string) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const activeMonth = monthParam ?? CURRENT_MONTH;
  const setActiveMonth = (m: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (m === CURRENT_MONTH) p.delete('month');
    else p.set('month', m);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return { activeMonth, setActiveMonth };
}

/** Build a stable per-(business, month) key for record stores. Every
 *  list view's edits / lazy-seeded records use this so navigating
 *  between months persists user changes for each month independently. */
const monthKey = (businessId: string, month: string): string => `${businessId}-${month}`;

function TableEmpty({ totalCount, onClear }: { totalCount: number; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={99} className="px-5 py-12 text-center">
        <p className="text-body font-medium text-black/70">No rows match your filters.</p>
        <p className="text-caption text-black/55 mt-1">
          <button
            type="button"
            onClick={onClear}
            className="text-[#204CC7] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded px-1"
          >
            Clear all filters
          </button>
          {' '}to see all {totalCount} {totalCount === 1 ? 'row' : 'rows'}.
        </p>
      </td>
    </tr>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TDS — Income Tax (TDS) LIST VIEW
// ════════════════════════════════════════════════════════════════════════════
//
// Per (client × business): TAN + credentials + monthly TDS payment +
// quarterly return status + TCS return status. Click row → opens the
// TDS drawer (credentials editor); status pills are inline-editable.
// ════════════════════════════════════════════════════════════════════════════

interface TdsRowExtra {
  /** Status of the monthly TDS payment (due 7th of every month). */
  payment: ReturnStatus;
  /** Status of the quarterly TDS return (24Q salary / 26Q non-salary). */
  returnStatus: ReturnStatus;
  /** Status of the TCS quarterly return — only meaningful for
   *  e-commerce businesses but surfaced on every row to keep the
   *  table layout consistent (Non E-Com defaults to N/A). */
  tcs: ReturnStatus;
  lastUpdated: string;
}

function buildTdsExtra(business: Business, month: string): TdsRowExtra {
  return {
    payment:      seedStatus(business.id, 'tds-pay', month),
    returnStatus: seedStatus(business.id, 'tds-ret', month),
    tcs:          business.type === 'E-Commerce' ? seedStatus(business.id, 'tds-tcs', month) : 'N/A',
    lastUpdated:  seedLastUpdated(business.id, month),
  };
}

export function TdsListView() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const isCurrent = activeMonth === CURRENT_MONTH;

  // Credentials (TAN, User ID, Password) are global — they describe
  // the business's TDS registration, not a per-month snapshot — so
  // they're keyed by businessId only and seeded once with a TAN.
  // Per-month records (extras) carry the payment/return/TCS state
  // for the active month and are keyed by `${id}-${month}` so each
  // month preserves its own edits.
  const [records, setRecords] = useState<Record<string, TdsRecord>>(() => {
    const m: Record<string, TdsRecord> = {};
    for (const r of ALL_ROWS) {
      m[r.business.id] = { ...EMPTY_TDS, tan: seedTan(r.business.id) };
    }
    return m;
  });
  const [extraEdits, setExtraEdits] = useState<Record<string, TdsRowExtra>>({});
  const [openDrawerFor, setOpenDrawerFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');

  // Resolve the row's TdsRowExtra for the active month — user edits
  // win over the deterministic seed.
  const extraFor = useCallback((b: Business): TdsRowExtra => {
    const k = monthKey(b.id, activeMonth);
    return extraEdits[k] ?? buildTdsExtra(b, activeMonth);
  }, [extraEdits, activeMonth]);

  // For the status filter we look at the "primary" status — Payment.
  // Most TDS conversations are about payment cadence; an HOD asking
  // "who's pending?" is asking who's late on the monthly payment.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(r => {
      if (typeFilter !== 'all' && r.business.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        if (extraFor(r.business).payment !== statusFilter) return false;
      }
      if (q) {
        const hay = `${r.client.name} ${r.business.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, typeFilter, extraFor]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ReturnStatus, number>> = {};
    for (const r of ALL_ROWS) {
      const s = extraFor(r.business).payment;
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [extraFor]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // "Last updated" snaps to the active month's anchor day so an edit
  // on Apr 2026 reads "edit happened during Apr". Current-month edits
  // anchor to today; past-month edits anchor to the last day of that
  // month (a sensible fallback — admins are usually correcting late).
  const editTimestamp = useMemo(() => {
    if (isCurrent) return '2026-05-05';
    const m = monthFromISO(activeMonth);
    const last = new Date(m.year, m.idx + 1, 0).getDate();
    return `${activeMonth.slice(0, 8)}${String(last).padStart(2, '0')}`;
  }, [activeMonth, isCurrent]);

  const updateExtra = (b: Business, patch: Partial<TdsRowExtra>) => {
    const k = monthKey(b.id, activeMonth);
    const current = extraFor(b);
    setExtraEdits(prev => ({ ...prev, [k]: { ...current, ...patch, lastUpdated: editTimestamp } }));
  };

  const openRow = ALL_ROWS.find(r => r.business.id === openDrawerFor);

  return (
    <ListShell>
      <ListTopBar
        title="TDS — Income Tax"
        subtitleLeading="TAN credentials + payment & return status"
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        statusOptions={['Pending', 'WIP', 'Done']}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
      />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full min-w-[1280px]" role="table" aria-label="TDS — Income Tax across all clients">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" style={STICKY_W_1}                       className={`${STICKY_HEAD_1} px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Client / Business</th>
                <th scope="col" style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_HEAD_2} px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Team</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">TAN</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Credentials</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">TDS Payment</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">TDS Return</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">TCS Return</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.length === 0 && (
                <TableEmpty totalCount={ALL_ROWS.length} onClear={clearFilters} />
              )}
              {filtered.map(row => {
                const id = row.business.id;
                const rec = records[id] ?? EMPTY_TDS;
                const ext = extraFor(row.business);
                const credsFilled = !!(rec.tan.trim() && rec.userId.trim() && rec.password.trim());
                const isEcom = row.business.type === 'E-Commerce';
                return (
                  <tr
                    key={id}
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer"
                    onClick={() => setOpenDrawerFor(id)}
                  >
                    <td style={STICKY_W_1}                         className={`${STICKY_CELL_1} px-5`}><ClientBusinessCell row={row} /></td>
                    <td style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_CELL_2} px-4`} onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={row.client.team} />
                    </td>
                    <td className="px-4"><TypeChip type={row.business.type} /></td>
                    <td className="px-4">
                      <span className="text-caption font-medium text-black/80 tabular-nums tracking-wider">{rec.tan || '—'}</span>
                    </td>
                    <td className="px-4"><CredentialsPill filled={credsFilled} /></td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={ext.payment}
                        options={GST_RETURN_OPTIONS}
                        onChange={(s) => updateExtra(row.business, { payment: s })}
                        ariaLabel={`${row.business.name} TDS payment status`}
                      />
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={ext.returnStatus}
                        options={GST_RETURN_OPTIONS}
                        onChange={(s) => updateExtra(row.business, { returnStatus: s })}
                        ariaLabel={`${row.business.name} TDS return status`}
                      />
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={ext.tcs}
                        options={isEcom ? GST_RETURN_OPTIONS : PT_RETURN_OPTIONS}
                        onChange={(s) => updateExtra(row.business, { tcs: s })}
                        ariaLabel={`${row.business.name} TCS return status`}
                      />
                    </td>
                    <td className="px-5"><LastUpdatedCell iso={ext.lastUpdated} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openRow && (
        <TdsDrawer
          client={openRow.client}
          business={openRow.business}
          value={records[openRow.business.id]}
          onChange={(v) => setRecords(prev => ({ ...prev, [openRow.business.id]: v }))}
          onClose={() => setOpenDrawerFor(null)}
        />
      )}
    </ListShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// GST LIST VIEW
// ════════════════════════════════════════════════════════════════════════════
//
// Per (client × business): GSTN count + 4 monthly returns (worst-case
// roll-up across multiple GSTNs when a business is multi-state).
// Click row → opens the GST drawer (GSTN cards + credentials + per-
// entry returns). Inline status edits land on the first GSTN entry
// (or seed one if the business has none yet).
// ════════════════════════════════════════════════════════════════════════════

/** Worst-case status across an array of returns: any Pending wins,
 *  then any WIP, otherwise Done (or N/A if every entry is N/A). */
function rollupStatus(values: ReturnStatus[]): ReturnStatus {
  if (values.some(v => v === 'Pending')) return 'Pending';
  if (values.some(v => v === 'WIP'))     return 'WIP';
  if (values.every(v => v === 'N/A'))    return 'N/A';
  return 'Done';
}

function buildSeedGstRecord(business: Business, month: string): GstRecord {
  // Most businesses register in just one state (Maharashtra here, per
  // the seed GSTN). A small slice of multi-state clients get a
  // second registration. Status seeds are deterministic per-GSTN
  // *and* per-month — past months trend Done, future months all
  // Pending, current month carries the realistic in-flight mix.
  const isMulti = hash01(business.id, 'gst-multi') < 0.18;
  const entry1: GstEntry = {
    id:       newGstEntryId(),
    gstn:     business.gstNumber,
    userId:   '',
    password: '',
    gstr1:    seedStatus(business.id, 'gst1-1', month),
    gstr2b:   seedStatus(business.id, 'gst2b-1', month),
    gstr3b:   seedStatus(business.id, 'gst3b-1', month),
    tcs:      business.type === 'E-Commerce' ? seedStatus(business.id, 'gtcs-1', month) : 'N/A',
  };
  const entries = [entry1];
  if (isMulti) {
    // Seed a Karnataka-state GSTN (29… prefix) for the multi-state
    // case. Realistic identifier shape; admin will fill in real
    // values when actually configuring.
    const altGstn = `29${business.gstNumber.slice(2)}`;
    entries.push({
      id:       newGstEntryId(),
      gstn:     altGstn,
      userId:   '',
      password: '',
      gstr1:    seedStatus(business.id, 'gst1-2', month),
      gstr2b:   seedStatus(business.id, 'gst2b-2', month),
      gstr3b:   seedStatus(business.id, 'gst3b-2', month),
      tcs:      business.type === 'E-Commerce' ? seedStatus(business.id, 'gtcs-2', month) : 'N/A',
    });
  }
  return { entries, notes: '' };
}

export function GstListView() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const isCurrent = activeMonth === CURRENT_MONTH;

  // Edits keyed by `${id}-${month}` so each month preserves its own
  // user changes. First read of a (business, month) combo seeds
  // lazily via buildSeedGstRecord. Same model the per-business
  // history snapshot pattern uses on the Recurring Checklist.
  const [edits, setEdits] = useState<Record<string, GstRecord>>({});
  const [lastUpdatedEdits, setLastUpdatedEdits] = useState<Record<string, string>>({});
  const [openDrawerFor, setOpenDrawerFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');

  const recordFor = useCallback((b: Business): GstRecord => {
    const k = monthKey(b.id, activeMonth);
    return edits[k] ?? buildSeedGstRecord(b, activeMonth);
  }, [edits, activeMonth]);

  const lastUpdatedFor = useCallback((id: string): string => {
    const k = monthKey(id, activeMonth);
    return lastUpdatedEdits[k] ?? seedLastUpdated(id, activeMonth);
  }, [lastUpdatedEdits, activeMonth]);

  // Roll up the four returns into a single "row status" — used by the
  // status filter and lets the HOD scan "what's the overall state of
  // GST for this business this month?". Worst-case wins.
  const rowStatus = useCallback((rec: GstRecord): ReturnStatus => {
    const all: ReturnStatus[] = [];
    for (const e of rec.entries) all.push(e.gstr1, e.gstr2b, e.gstr3b, e.tcs);
    return all.length ? rollupStatus(all) : 'Pending';
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(r => {
      if (typeFilter !== 'all' && r.business.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const rs = rowStatus(recordFor(r.business));
        if (rs !== statusFilter) return false;
      }
      if (q) {
        const hay = `${r.client.name} ${r.business.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, statusFilter, typeFilter, rowStatus, recordFor]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ReturnStatus, number>> = {};
    for (const r of ALL_ROWS) {
      const s = rowStatus(recordFor(r.business));
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [rowStatus, recordFor]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const editTimestamp = useMemo(() => {
    if (isCurrent) return '2026-05-05';
    const m = monthFromISO(activeMonth);
    const last = new Date(m.year, m.idx + 1, 0).getDate();
    return `${activeMonth.slice(0, 8)}${String(last).padStart(2, '0')}`;
  }, [activeMonth, isCurrent]);

  // Inline status edits land on the first GSTN entry — that's the
  // primary registration, and the drawer is the right place to
  // manage multi-state nuance. Fast for the common case (one GSTN)
  // and never mis-applies to a secondary state.
  const updateFirstEntry = (b: Business, patch: Partial<GstEntry>) => {
    const k = monthKey(b.id, activeMonth);
    const cur = recordFor(b);
    const next: GstRecord = cur.entries.length === 0
      ? cur
      : { ...cur, entries: cur.entries.map((e, i) => i === 0 ? { ...e, ...patch } : e) };
    setEdits(prev => ({ ...prev, [k]: next }));
    setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
  };

  const rolledUpForRow = (rec: GstRecord, key: 'gstr1' | 'gstr2b' | 'gstr3b' | 'tcs'): ReturnStatus => {
    if (rec.entries.length === 0) return 'Pending';
    return rollupStatus(rec.entries.map(e => e[key]));
  };

  const openRow = ALL_ROWS.find(r => r.business.id === openDrawerFor);

  return (
    <ListShell>
      <ListTopBar
        title="GST"
        subtitleLeading="GSTN credentials + monthly returns (GSTR 1 / 2B / 3B / TCS)"
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        statusOptions={['Pending', 'WIP', 'Done']}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
      />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full min-w-[1280px]" role="table" aria-label="GST across all clients">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" style={STICKY_W_1}                       className={`${STICKY_HEAD_1} px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Client / Business</th>
                <th scope="col" style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_HEAD_2} px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Team</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[180px]">GSTN</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">GSTR 1</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">GSTR 2B</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">GSTR 3B</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">TCS</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.length === 0 && (
                <TableEmpty totalCount={ALL_ROWS.length} onClear={clearFilters} />
              )}
              {filtered.map(row => {
                const id = row.business.id;
                const rec = recordFor(row.business);
                const primary = rec.entries[0];
                const count = rec.entries.length;
                const isEcom = row.business.type === 'E-Commerce';
                return (
                  <tr
                    key={id}
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer"
                    onClick={() => setOpenDrawerFor(id)}
                  >
                    <td style={STICKY_W_1}                         className={`${STICKY_CELL_1} px-5`}><ClientBusinessCell row={row} /></td>
                    <td style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_CELL_2} px-4`} onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={row.client.team} />
                    </td>
                    <td className="px-4"><TypeChip type={row.business.type} /></td>
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-caption font-medium text-black/80 tabular-nums tracking-wider truncate">
                          {primary?.gstn || '—'}
                        </span>
                        {count > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EEF1FB] text-[#204CC7] tabular-nums">
                            +{count - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      {count > 1 ? (
                        <RolledUpStatusBadge value={rolledUpForRow(rec, 'gstr1')} count={count} />
                      ) : (
                        <ReturnStatusDropdown
                          value={primary?.gstr1 ?? 'Pending'}
                          options={GST_RETURN_OPTIONS}
                          onChange={(s) => updateFirstEntry(row.business, { gstr1: s })}
                          ariaLabel={`${row.business.name} GSTR 1 status`}
                        />
                      )}
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      {count > 1 ? (
                        <RolledUpStatusBadge value={rolledUpForRow(rec, 'gstr2b')} count={count} />
                      ) : (
                        <ReturnStatusDropdown
                          value={primary?.gstr2b ?? 'Pending'}
                          options={GST_RETURN_OPTIONS}
                          onChange={(s) => updateFirstEntry(row.business, { gstr2b: s })}
                          ariaLabel={`${row.business.name} GSTR 2B status`}
                        />
                      )}
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      {count > 1 ? (
                        <RolledUpStatusBadge value={rolledUpForRow(rec, 'gstr3b')} count={count} />
                      ) : (
                        <ReturnStatusDropdown
                          value={primary?.gstr3b ?? 'Pending'}
                          options={GST_RETURN_OPTIONS}
                          onChange={(s) => updateFirstEntry(row.business, { gstr3b: s })}
                          ariaLabel={`${row.business.name} GSTR 3B status`}
                        />
                      )}
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      {count > 1 ? (
                        <RolledUpStatusBadge value={rolledUpForRow(rec, 'tcs')} count={count} />
                      ) : (
                        <ReturnStatusDropdown
                          value={primary?.tcs ?? (isEcom ? 'Pending' : 'N/A')}
                          options={isEcom ? GST_RETURN_OPTIONS : PT_RETURN_OPTIONS}
                          onChange={(s) => updateFirstEntry(row.business, { tcs: s })}
                          ariaLabel={`${row.business.name} TCS status`}
                        />
                      )}
                    </td>
                    <td className="px-5"><LastUpdatedCell iso={lastUpdatedFor(id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openRow && (
        <GstDrawer
          client={openRow.client}
          business={openRow.business}
          value={recordFor(openRow.business)}
          onChange={(v) => {
            const k = monthKey(openRow.business.id, activeMonth);
            setEdits(prev => ({ ...prev, [k]: v }));
            setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
          }}
          onClose={() => setOpenDrawerFor(null)}
        />
      )}
    </ListShell>
  );
}

/** Read-only roll-up badge — used in the GST list when a business has
 *  more than one GSTN. The cell can't safely host an editable picker
 *  (changing it would silently mutate one entry while the others
 *  drift), so we render a tinted badge instead. The trailing "+N"
 *  count makes the multi-entry case visually obvious. Click-through
 *  the row still opens the drawer where each entry's status is
 *  editable per-card. */
function RolledUpStatusBadge({ value, count }: { value: ReturnStatus; count: number }) {
  const palette =
    value === 'Done'    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : value === 'WIP'   ? 'bg-blue-50 text-blue-700 ring-blue-200'
    : value === 'N/A'   ? 'bg-slate-100 text-slate-600 ring-slate-200'
                        : 'bg-amber-50 text-amber-700 ring-amber-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-semibold ring-1 ${palette}`}
      title={`Worst-case across ${count} GSTNs — open drawer to edit per entry`}
    >
      {value}
      <span className="text-[10px] opacity-70 tabular-nums">×{count}</span>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PTRC / PTEC LIST VIEW
// ════════════════════════════════════════════════════════════════════════════

function buildSeedPtRecord(business: Business, month: string): PtRecord {
  return {
    ...EMPTY_PT,
    ptec:        seedPtec(business.id),
    ptecStatus:  seedStatus(business.id, 'pt-ec', month, true),
    ptrcStatus:  seedStatus(business.id, 'pt-rc', month, true),
  };
}

export function PtListView() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const isCurrent = activeMonth === CURRENT_MONTH;

  const [edits, setEdits] = useState<Record<string, PtRecord>>({});
  const [lastUpdatedEdits, setLastUpdatedEdits] = useState<Record<string, string>>({});
  const [openDrawerFor, setOpenDrawerFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');

  const recordFor = useCallback((b: Business): PtRecord => {
    const k = monthKey(b.id, activeMonth);
    return edits[k] ?? buildSeedPtRecord(b, activeMonth);
  }, [edits, activeMonth]);

  const lastUpdatedFor = useCallback((id: string): string => {
    const k = monthKey(id, activeMonth);
    return lastUpdatedEdits[k] ?? seedLastUpdated(id, activeMonth);
  }, [lastUpdatedEdits, activeMonth]);

  const rowStatus = (rec: PtRecord): ReturnStatus => rollupStatus([rec.ptecStatus, rec.ptrcStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(r => {
      if (typeFilter !== 'all' && r.business.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const rs = rowStatus(recordFor(r.business));
        if (rs !== statusFilter) return false;
      }
      if (q) {
        const hay = `${r.client.name} ${r.business.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recordFor, search, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ReturnStatus, number>> = {};
    for (const r of ALL_ROWS) {
      const s = rowStatus(recordFor(r.business));
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [recordFor]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const editTimestamp = useMemo(() => {
    if (isCurrent) return '2026-05-05';
    const m = monthFromISO(activeMonth);
    const last = new Date(m.year, m.idx + 1, 0).getDate();
    return `${activeMonth.slice(0, 8)}${String(last).padStart(2, '0')}`;
  }, [activeMonth, isCurrent]);

  const updateRecord = (b: Business, patch: Partial<PtRecord>) => {
    const k = monthKey(b.id, activeMonth);
    setEdits(prev => ({ ...prev, [k]: { ...recordFor(b), ...patch } }));
    setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
  };

  const openRow = ALL_ROWS.find(r => r.business.id === openDrawerFor);

  return (
    <ListShell>
      <ListTopBar
        title="PTRC / PTEC"
        subtitleLeading="Profession-tax registration + return status"
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        statusOptions={['Pending', 'WIP', 'Done', 'N/A']}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
      />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full min-w-[1100px]" role="table" aria-label="PTRC and PTEC across all clients">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" style={STICKY_W_1}                       className={`${STICKY_HEAD_1} px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Client / Business</th>
                <th scope="col" style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_HEAD_2} px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Team</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[160px]">PTEC No.</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">PTEC Return</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">PTRC Return</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.length === 0 && (
                <TableEmpty totalCount={ALL_ROWS.length} onClear={clearFilters} />
              )}
              {filtered.map(row => {
                const id = row.business.id;
                const rec = recordFor(row.business);
                return (
                  <tr
                    key={id}
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer"
                    onClick={() => setOpenDrawerFor(id)}
                  >
                    <td style={STICKY_W_1}                         className={`${STICKY_CELL_1} px-5`}><ClientBusinessCell row={row} /></td>
                    <td style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_CELL_2} px-4`} onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={row.client.team} />
                    </td>
                    <td className="px-4"><TypeChip type={row.business.type} /></td>
                    <td className="px-4">
                      <span className="text-caption font-medium text-black/80 tabular-nums tracking-wider">
                        {rec.ptec || '—'}
                      </span>
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={rec.ptecStatus}
                        options={PT_RETURN_OPTIONS}
                        onChange={(s) => updateRecord(row.business, { ptecStatus: s })}
                        ariaLabel={`${row.business.name} PTEC status`}
                      />
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={rec.ptrcStatus}
                        options={PT_RETURN_OPTIONS}
                        onChange={(s) => updateRecord(row.business, { ptrcStatus: s })}
                        ariaLabel={`${row.business.name} PTRC status`}
                      />
                    </td>
                    <td className="px-5"><LastUpdatedCell iso={lastUpdatedFor(id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openRow && (
        <PtDrawer
          client={openRow.client}
          business={openRow.business}
          value={recordFor(openRow.business)}
          onChange={(v) => {
            const k = monthKey(openRow.business.id, activeMonth);
            setEdits(prev => ({ ...prev, [k]: v }));
            setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
          }}
          onClose={() => setOpenDrawerFor(null)}
        />
      )}
    </ListShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// INCOME TAX LIST VIEW
// ════════════════════════════════════════════════════════════════════════════

function buildSeedItRecord(business: Business, month: string): IncomeTaxRecord {
  return {
    ...EMPTY_IT,
    pan:         seedPan(business.id),
    itrFiled:    seedItStatus(business.id, 'it-filed', month),
    itrVerified: seedItStatus(business.id, 'it-verified', month),
  };
}

/** ITR filing follows India's Assessment Year — Apr 1 to Mar 31. The
 *  AY a given month falls into is "next year" for Apr+ and "current
 *  year" for Jan-Mar. So May 2026 is AY 2026-27 (filing income
 *  earned during FY 2025-26 / Apr 2025 to Mar 2026). */
function ayForMonth(month: string): string {
  const d = new Date(month + 'T00:00:00Z');
  const monthIdx = d.getUTCMonth(); // 0=Jan
  const year = d.getUTCFullYear();
  const startYear = monthIdx >= 3 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

export function IncomeTaxListView() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const isCurrent = activeMonth === CURRENT_MONTH;

  const [edits, setEdits] = useState<Record<string, IncomeTaxRecord>>({});
  const [lastUpdatedEdits, setLastUpdatedEdits] = useState<Record<string, string>>({});
  const [openDrawerFor, setOpenDrawerFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');

  const recordFor = useCallback((b: Business): IncomeTaxRecord => {
    const k = monthKey(b.id, activeMonth);
    return edits[k] ?? buildSeedItRecord(b, activeMonth);
  }, [edits, activeMonth]);

  const lastUpdatedFor = useCallback((id: string): string => {
    const k = monthKey(id, activeMonth);
    return lastUpdatedEdits[k] ?? seedLastUpdated(id, activeMonth);
  }, [lastUpdatedEdits, activeMonth]);

  // Row-level "Filed?" — both Filed and Verified must be Done for the
  // row to count as fully Done; otherwise Pending. (Mirrors the way
  // the IT drawer's two binary fields combine: Done = filed AND
  // verified, Pending = anything else.)
  const rowStatus = (rec: IncomeTaxRecord): ReturnStatus =>
    rec.itrFiled === 'Done' && rec.itrVerified === 'Done' ? 'Done' : 'Pending';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_ROWS.filter(r => {
      if (typeFilter !== 'all' && r.business.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const rs = rowStatus(recordFor(r.business));
        if (rs !== statusFilter) return false;
      }
      if (q) {
        const hay = `${r.client.name} ${r.business.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recordFor, search, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ReturnStatus, number>> = {};
    for (const r of ALL_ROWS) {
      const s = rowStatus(recordFor(r.business));
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [recordFor]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const editTimestamp = useMemo(() => {
    if (isCurrent) return '2026-05-05';
    const m = monthFromISO(activeMonth);
    const last = new Date(m.year, m.idx + 1, 0).getDate();
    return `${activeMonth.slice(0, 8)}${String(last).padStart(2, '0')}`;
  }, [activeMonth, isCurrent]);

  const updateRecord = (b: Business, patch: Partial<IncomeTaxRecord>) => {
    const k = monthKey(b.id, activeMonth);
    setEdits(prev => ({ ...prev, [k]: { ...recordFor(b), ...patch } }));
    setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
  };

  const openRow = ALL_ROWS.find(r => r.business.id === openDrawerFor);

  // Assessment Year follows the active month — switching months
  // shifts the AY at the year boundary.
  const ay = ayForMonth(activeMonth);

  return (
    <ListShell>
      <ListTopBar
        title="Income Tax"
        subtitleLeading={`PAN + ITR filing & verification · AY ${ay}`}
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        statusOptions={['Pending', 'Done']}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
      />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full min-w-[1180px]" role="table" aria-label="Income Tax across all clients">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" style={STICKY_W_1}                       className={`${STICKY_HEAD_1} px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Client / Business</th>
                <th scope="col" style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_HEAD_2} px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Team</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">PAN</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">AY</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">ITR Filed</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">ITR Verified</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.length === 0 && (
                <TableEmpty totalCount={ALL_ROWS.length} onClear={clearFilters} />
              )}
              {filtered.map(row => {
                const id = row.business.id;
                const rec = recordFor(row.business);
                return (
                  <tr
                    key={id}
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer"
                    onClick={() => setOpenDrawerFor(id)}
                  >
                    <td style={STICKY_W_1}                         className={`${STICKY_CELL_1} px-5`}><ClientBusinessCell row={row} /></td>
                    <td style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_CELL_2} px-4`} onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={row.client.team} />
                    </td>
                    <td className="px-4"><TypeChip type={row.business.type} /></td>
                    <td className="px-4">
                      <span className="text-caption font-medium text-black/80 tabular-nums tracking-wider">
                        {rec.pan || '—'}
                      </span>
                    </td>
                    <td className="px-4">
                      <span className="text-caption font-medium text-black/70 tabular-nums">{ay}</span>
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={rec.itrFiled}
                        options={IT_RETURN_OPTIONS}
                        onChange={(s) => updateRecord(row.business, { itrFiled: s })}
                        ariaLabel={`${row.business.name} ITR filed`}
                      />
                    </td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <ReturnStatusDropdown
                        value={rec.itrVerified}
                        options={IT_RETURN_OPTIONS}
                        onChange={(s) => updateRecord(row.business, { itrVerified: s })}
                        ariaLabel={`${row.business.name} ITR verified`}
                      />
                    </td>
                    <td className="px-5"><LastUpdatedCell iso={lastUpdatedFor(id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openRow && (
        <IncomeTaxDrawer
          client={openRow.client}
          business={openRow.business}
          value={recordFor(openRow.business)}
          onChange={(v) => {
            const k = monthKey(openRow.business.id, activeMonth);
            setEdits(prev => ({ ...prev, [k]: v }));
            setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
          }}
          onClose={() => setOpenDrawerFor(null)}
        />
      )}
    </ListShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// E-COM RECO LIST VIEW
// ════════════════════════════════════════════════════════════════════════════
//
// Restricted to E-Commerce businesses (the only ones that have
// portal reconciliations). Each row surfaces the per-portal
// reconciliation roll-up: portal count, done/total, an overall
// status pill (worst-case across portals).
// ════════════════════════════════════════════════════════════════════════════

const SEED_ECOM_PORTALS = ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Shopify'];
const SEED_ECOM_URLS: Record<string, string> = {
  Amazon:   'sellercentral.amazon.in',
  Flipkart: 'seller.flipkart.com',
  Myntra:   'partners.myntra.com',
  Meesho:   'supplier.meesho.com',
  Shopify:  'admin.shopify.com',
};

function buildSeedEcom(business: Business, month: string): EcomRecoRecord {
  // 1–3 portals per E-Commerce business, deterministic. The portal
  // list itself is stable across months (same business sells through
  // the same marketplaces); only the per-portal reconciliation
  // status varies month-to-month — past months trend Done, future
  // months all Pending.
  const portalCount = 1 + Math.floor(hash01(business.id, 'ec-cnt') * 3);
  const portals = [];
  for (let i = 0; i < portalCount; i++) {
    const idx = Math.floor(hash01(business.id, `ec-pick-${i}`) * SEED_ECOM_PORTALS.length);
    const name = SEED_ECOM_PORTALS[idx];
    portals.push({
      id: `${business.id}-portal-${i}`,
      name,
      url: SEED_ECOM_URLS[name] ?? '',
      username: '',
      password: '',
      status: seedStatus(business.id, `ec-stat-${i}`, month),
    });
  }
  return { portals, notes: '' };
}

export function EcomRecoListView() {
  const { activeMonth, setActiveMonth } = useActiveMonth();
  const isCurrent = activeMonth === CURRENT_MONTH;

  const [edits, setEdits] = useState<Record<string, EcomRecoRecord>>({});
  const [lastUpdatedEdits, setLastUpdatedEdits] = useState<Record<string, string>>({});
  const [openDrawerFor, setOpenDrawerFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');

  const recordFor = useCallback((b: Business): EcomRecoRecord => {
    const k = monthKey(b.id, activeMonth);
    return edits[k] ?? buildSeedEcom(b, activeMonth);
  }, [edits, activeMonth]);

  const lastUpdatedFor = useCallback((id: string): string => {
    const k = monthKey(id, activeMonth);
    return lastUpdatedEdits[k] ?? seedLastUpdated(id, activeMonth);
  }, [lastUpdatedEdits, activeMonth]);

  // Roll-up: worst-case across portals. An empty record is treated
  // as Pending so the "needs setup" row sorts correctly.
  const rowStatus = (rec: EcomRecoRecord): ReturnStatus =>
    rec.portals.length === 0 ? 'Pending' : rollupStatus(rec.portals.map(p => p.status));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ECOM_ROWS.filter(r => {
      // Type filter is a noop here (every row is E-Commerce) — we
      // still wire it through ListTopBar for visual consistency,
      // but in practice the only useful selection is "all".
      if (typeFilter !== 'all' && r.business.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const rs = rowStatus(recordFor(r.business));
        if (rs !== statusFilter) return false;
      }
      if (q) {
        const hay = `${r.client.name} ${r.business.name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [recordFor, search, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    const c: Partial<Record<ReturnStatus, number>> = {};
    for (const r of ECOM_ROWS) {
      const s = rowStatus(recordFor(r.business));
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [recordFor]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const editTimestamp = useMemo(() => {
    if (isCurrent) return '2026-05-05';
    const m = monthFromISO(activeMonth);
    const last = new Date(m.year, m.idx + 1, 0).getDate();
    return `${activeMonth.slice(0, 8)}${String(last).padStart(2, '0')}`;
  }, [activeMonth, isCurrent]);

  const openRow = ECOM_ROWS.find(r => r.business.id === openDrawerFor);

  return (
    <ListShell>
      <ListTopBar
        title="E-Com Reco"
        subtitleLeading="Per-portal reconciliation across e-commerce businesses"
        search={search}
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusCounts={statusCounts}
        statusOptions={['Pending', 'WIP', 'Done']}
        typeFilter={typeFilter}
        onTypeFilter={setTypeFilter}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
      />

      <div className="px-8 py-6">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table className="w-full min-w-[1200px]" role="table" aria-label="E-Com Reco across all clients">
            <thead>
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" style={STICKY_W_1}                       className={`${STICKY_HEAD_1} px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Client / Business</th>
                <th scope="col" style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_HEAD_2} px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider`}>Team</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[110px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">Portals</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">Reconciled</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Status</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.length === 0 && (
                <TableEmpty totalCount={ECOM_ROWS.length} onClear={clearFilters} />
              )}
              {filtered.map(row => {
                const id = row.business.id;
                const rec = recordFor(row.business);
                const total = rec.portals.length;
                const done = rec.portals.filter(p => p.status === 'Done').length;
                const wip = rec.portals.filter(p => p.status === 'WIP').length;
                const pending = rec.portals.filter(p => p.status === 'Pending').length;
                const status = rowStatus(rec);
                return (
                  <tr
                    key={id}
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer"
                    onClick={() => setOpenDrawerFor(id)}
                  >
                    <td style={STICKY_W_1}                         className={`${STICKY_CELL_1} px-5`}><ClientBusinessCell row={row} /></td>
                    <td style={{ ...STICKY_W_2, ...STICKY_LEFT_2 }} className={`${STICKY_CELL_2} px-4`} onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={row.client.team} />
                    </td>
                    <td className="px-4"><TypeChip type={row.business.type} /></td>
                    <td className="px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rec.portals.length === 0 ? (
                          <span className="text-caption text-black/40">—</span>
                        ) : (
                          rec.portals.slice(0, 3).map(p => (
                            <span
                              key={p.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium bg-black/[0.04] text-black/70"
                            >
                              {p.name || 'Portal'}
                            </span>
                          ))
                        )}
                        {rec.portals.length > 3 && (
                          <span className="text-caption font-medium text-black/55 tabular-nums">+{rec.portals.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-body font-semibold text-black/85 tabular-nums">{done}</span>
                          <span className="text-caption text-black/45">/</span>
                          <span className="text-caption text-black/55 tabular-nums">{total}</span>
                        </div>
                        {/* Mini progress bar — width derives from done/total
                            so the column reads as a glance-able stack of
                            completion meters. */}
                        <div className="flex-1 max-w-[80px] h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: total > 0 ? `${(done / total) * 100}%` : '0%' }}
                            aria-hidden="true"
                          />
                        </div>
                        {(wip > 0 || pending > 0) && (
                          <span className="text-[10px] text-black/55 tabular-nums">
                            {wip > 0 && <span className="text-blue-700 font-medium">WIP {wip}</span>}
                            {wip > 0 && pending > 0 && <span className="mx-1 text-black/30">·</span>}
                            {pending > 0 && <span className="text-amber-700 font-medium">P {pending}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4">
                      <RolledUpStatusBadge value={status} count={Math.max(total, 1)} />
                    </td>
                    <td className="px-5"><LastUpdatedCell iso={lastUpdatedFor(id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openRow && (
        <EcomRecoDrawer
          client={openRow.client}
          business={openRow.business}
          value={recordFor(openRow.business)}
          onChange={(v) => {
            const k = monthKey(openRow.business.id, activeMonth);
            setEdits(prev => ({ ...prev, [k]: v }));
            setLastUpdatedEdits(prev => ({ ...prev, [k]: editTimestamp }));
          }}
          onClose={() => setOpenDrawerFor(null)}
        />
      )}
    </ListShell>
  );
}
