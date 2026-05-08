'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Share, ChevronLeft, ChevronRight, MoreVertical, ChevronDown, LayoutGrid, FileText, BarChart3, Globe, Camera, Link2, Play, ArrowUpDown, Calendar, Users, Target, X, Check, Trash2, Tag, Plus, GripVertical, Pencil, Trash, Copy, UserPlus, ArrowRight, CircleCheck, User, Megaphone, MessageSquareText, Send, Eye, Hash, CalendarCheck2, CheckCircle2, Building2, ExternalLink, Package, Star, Crosshair, MapPin, Briefcase, Phone, Zap, MessageCircle, AlertCircle, Sparkles, Clock as ClockIcon } from 'lucide-react';
import { MonthNavigator, MONTHS } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';
import { ClientDetailView } from './ClientDetailView';

type View = 'clientList' | 'creativeWorkflow' | 'mediaPlan' | 'reports';
type SortField = 'name' | 'clientType' | 'ksmTarget';
type SortDir = 'asc' | 'desc';
type ClientType = 'Ecommerce' | 'Lead generation';
type KSMStatus = 'Miss' | 'Hit';
type KickoffStatus = 'Pending' | 'Onboarding' | 'Done';
type OnboardingStatus = 'Pending' | 'In Progress' | 'Complete';
type GrowthPlanStatus = 'Not Started' | 'In Progress' | 'Sent';

// ── Growth Plan types ──
interface GrowthPlanTask {
  id: string;
  title: string;
  description: string;
  done: boolean;
}

interface GrowthPlanWeek {
  whatsHappening: string;
  tasks: GrowthPlanTask[];
}

// Keyed by week index (0-based), dynamic number of weeks per month
type GrowthPlanData = Record<number, GrowthPlanWeek>;

// ── Week range computed from planStartDate ──
interface WeekRange {
  index: number;       // 0-based
  start: Date;         // Monday or planStart (whichever is later)
  end: Date;           // Sunday or month-end (whichever is earlier)
  label: string;       // e.g. "Apr 15–21"
  isCurrent: boolean;  // contains today
}

/** Compute rolling 7-day week ranges for the current viewing month,
 *  anchored from the client's planStartDate.
 *
 *  - If client started mid-month, Week 1 starts on planStartDate
 *  - Each subsequent week is the next 7 days
 *  - Final week may be shorter (truncated at month end)
 *  - For months after the start month, weeks run 1–7, 8–14, etc. from day 1
 */
function computeWeekRanges(planStartISO: string, viewMonth: number, viewYear: number): WeekRange[] {
  const planStart = new Date(planStartISO + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // Determine the anchor day for this month
  const startOfMonth = new Date(viewYear, viewMonth, 1);
  const endOfMonth = new Date(viewYear, viewMonth + 1, 0); // last day

  // If the plan started in a future month relative to viewMonth, no weeks
  if (planStart > endOfMonth) return [];

  // Anchor: planStartDate if same month, otherwise 1st of the month
  const anchor = (planStart.getFullYear() === viewYear && planStart.getMonth() === viewMonth)
    ? planStart
    : startOfMonth;

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = MONTHS_SHORT[viewMonth];

  const weeks: WeekRange[] = [];
  let cursor = new Date(anchor);
  let idx = 0;

  while (cursor <= endOfMonth) {
    const weekStart = new Date(cursor);
    const weekEndRaw = new Date(cursor);
    weekEndRaw.setDate(weekEndRaw.getDate() + 6);
    const weekEnd = weekEndRaw > endOfMonth ? endOfMonth : weekEndRaw;

    const isCurrent = today >= weekStart && today <= weekEnd;
    const label = weekStart.getMonth() === weekEnd.getMonth()
      ? `${mon} ${weekStart.getDate()}–${weekEnd.getDate()}`
      : `${mon} ${weekStart.getDate()}–${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}`;

    weeks.push({ index: idx, start: weekStart, end: weekEnd, label, isCurrent });

    // Advance cursor to next day after weekEnd
    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    idx++;
  }

  return weeks;
}

// Kickoff data persisted on the client when Onboarding
interface KickoffData {
  assignments: Record<string, string>; // role → employee id
  proposedMetrics: KickoffMetrics;     // Brego-proposed targets
  clientMetrics?: KickoffMetrics;      // Client counter-proposal (if any)
  clientNotes?: Partial<Record<keyof KickoffMetrics, string>>; // Per-metric client notes
  hasClientResponse?: boolean;         // true once client responds
}

interface Client {
  id: string;
  name: string;
  team: { initials: string; color: string }[];
  /**
   * Business types this client runs with us.
   * A client may engage Brego for multiple business motions
   * (e.g. an Ayurveda hospital chain that runs both a D2C ecom store
   * and a lead-gen funnel for hospital appointments).
   * The first entry is treated as the *primary* type — used for
   * single-type surfaces (KSM drawer headline, kickoff metric set,
   * business-info template). Use `primaryType(c)` and `hasType(c, t)`
   * helpers instead of touching the array directly.
   * Invariant: at least one entry; no duplicates.
   */
  clientTypes: ClientType[];
  onboardingStatus: OnboardingStatus;  // Client-side business info submission
  kickoffStatus: KickoffStatus;
  kickoffData?: KickoffData;
  lastQC: string;             // ISO date string e.g. '2025-03-03'
  ksmTarget: KSMStatus;
  growthPlanStatus: GrowthPlanStatus;
  planStartDate?: string;     // ISO date — set when kickoff completes (triggers growth plan)
  comments: string;
}

// ── Client business-type helpers ──────────────────────────────────────
// A client may have multiple clientTypes. Until per-type drawers exist,
// surfaces that need a single type should use `primaryType` (the first
// entry — the type the client was *first* onboarded with). Filtering
// should use `hasType` so a multi-type client appears in BOTH segments.
const primaryType = (c: Pick<Client, 'clientTypes'>): ClientType => c.clientTypes[0];
const hasType     = (c: Pick<Client, 'clientTypes'>, t: ClientType): boolean => c.clientTypes.includes(t);

// ── Brego SEM team roster (single source of truth) ─────────────────
// Used by:
//   • FilterPanel — search/select team members for filtering
//   • Active filter chips — render avatar + name when a member is selected
//   • Table avatar stack — show name + role on hover
// Order is intentional: HOD → Manager → Sr. Exec → Executive → Jr. Exec.
// Adding/removing a team member is a one-line change here.
type TeamMember = { initials: string; name: string; color: string; role: string };
const SEM_TEAM: TeamMember[] = [
  { initials: 'CP', name: 'Chinmay Pawar',  color: '#7c3aed', role: 'HOD' },
  { initials: 'JD', name: 'Jay Desai',      color: '#1e293b', role: 'Manager' },
  { initials: 'AS', name: 'Aarti Shah',     color: '#475569', role: 'Manager' },
  { initials: 'PM', name: 'Priya Mehta',    color: '#7c3aed', role: 'Sr. Executive' },
  { initials: 'RK', name: 'Rahul Kumar',    color: '#0891b2', role: 'Sr. Executive' },
  { initials: 'PS', name: 'Pooja Sharma',   color: '#f59e0b', role: 'Executive' },
  { initials: 'NV', name: 'Nikhil Verma',   color: '#10b981', role: 'Executive' },
  { initials: 'SR', name: 'Sneha Reddy',    color: '#ec4899', role: 'Executive' },
  { initials: 'AK', name: 'Arjun Kapoor',   color: '#3b82f6', role: 'Jr. Executive' },
  { initials: 'DM', name: 'Diya Malhotra',  color: '#8b5cf6', role: 'Jr. Executive' },
  { initials: 'KI', name: 'Kabir Iyer',     color: '#06b6d4', role: 'Jr. Executive' },
  { initials: 'TG', name: 'Tanvi Gupta',    color: '#f97316', role: 'Jr. Executive' },
];
// Lookup by initials — used by hover popover and active filter chips.
const semMemberByInitials = (initials: string): TeamMember | undefined =>
  SEM_TEAM.find(t => t.initials === initials);

// ── TeamAvatarStack ────────────────────────────────────────────────
// Avatar stack with a hover/focus popover that lists every member's
// name + role. Two design constraints drove this implementation:
//   1. The table lives inside an `overflow-x-auto` container, which
//      clips absolutely-positioned children. So the popover renders
//      via React Portal to <body> with `position: fixed` — it can
//      escape any ancestor scroll boundary and never gets clipped.
//   2. Hover triggers must not fire row-click. onClick stops
//      propagation; pointer events on the popover let the user move
//      the cursor onto it without dismissing.
// Flip logic: if the trigger sits in the bottom 240px of the viewport,
// the popover renders above the stack instead of below. Keeps it on
// screen for last-row clients without needing a layout effect.
function TeamAvatarStack({ team }: { team: Array<{ initials: string; color: string }> }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; flip: boolean } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const recompute = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flip = r.bottom + 220 > window.innerHeight;
    setCoords({
      top: flip ? r.top - 6 : r.bottom + 6,
      left: r.left,
      flip,
    });
  };

  const show = () => { recompute(); setOpen(true); };
  const hide = () => setOpen(false);

  // Reposition on scroll/resize while open — keeps the popover glued
  // to the trigger if the user scrolls the table or window.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const accessibleLabel = `Team: ${team.map(m => semMemberByInitials(m.initials)?.name ?? m.initials).join(', ')}`;
  const visible = team.slice(0, 4);
  const overflow = team.length - visible.length;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex items-center"
        role="group"
        aria-label={accessibleLabel}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center -space-x-1.5">
          {visible.map((member, mIdx) => (
            <div
              key={mIdx}
              className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white text-caption font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: member.color, zIndex: 4 - mIdx }}
            >
              {member.initials}
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white text-caption font-semibold text-black/65 bg-black/[0.06] flex-shrink-0"
              aria-label={`${overflow} more team members`}
            >
              +{overflow}
            </div>
          )}
        </div>
      </div>

      {open && coords && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: coords.flip ? 'translateY(-100%)' : undefined,
            zIndex: 9999,
          }}
          className="w-[240px] bg-white rounded-xl shadow-xl shadow-black/[0.14] border border-black/[0.08] py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-black/[0.05] flex items-center justify-between">
            <span className="text-caption text-black/45 uppercase tracking-[0.06em] font-semibold">Team</span>
            <span className="text-caption text-black/55 font-medium tabular-nums">{team.length} {team.length === 1 ? 'member' : 'members'}</span>
          </div>
          <ul className="py-1">
            {team.map((member, i) => {
              const meta = semMemberByInitials(member.initials);
              return (
                <li key={i} className="flex items-center gap-2.5 px-3 py-1.5">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-caption font-semibold flex-shrink-0"
                    style={{ backgroundColor: member.color }}
                    aria-hidden="true"
                  >
                    {member.initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-caption font-semibold text-black/85 truncate leading-snug">
                      {meta?.name ?? member.initials}
                    </span>
                    <span className="block text-caption text-black/45 truncate leading-snug">
                      {meta?.role ?? 'Team member'}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Platform performance metrics for expandable rows ──
// ── Platform breakdown metric types (matching ReportingModule pattern) ──
type MetricCell = { value: number; change: number; target: number };
interface EcomPlatformMetrics {
  adSpend: MetricCell;
  roas: MetricCell;
  revenue: MetricCell;
  orders: MetricCell;
  aov: MetricCell;
}
interface LeadGenPlatformMetrics {
  adSpend: MetricCell;
  leads: MetricCell;
  cpl: MetricCell;
  ctr: MetricCell;
}
type PlatformRow = { platform: string; metrics: EcomPlatformMetrics | LeadGenPlatformMetrics };
type PlatformBreakdownData = { overall: PlatformRow; meta: PlatformRow; google: PlatformRow };

function generatePlatformBreakdown(clientId: string, clientType: ClientType): PlatformBreakdownData {
  const seed = parseInt(clientId) || 1;
  const metaRatio = 0.55 + (seed % 5) * 0.04;
  const googleRatio = 1 - metaRatio;

  if (clientType === 'Ecommerce') {
    const tSpend = 600000 + seed * 140000;
    const spend = Math.round(tSpend * (0.78 + (seed % 4) * 0.06));
    const tRoas = +(4.5 + (seed % 5) * 0.5).toFixed(2);
    const roas = +(tRoas * (0.85 + (seed % 3) * 0.08)).toFixed(2);
    const tRevenue = Math.round(tSpend * tRoas);
    const revenue = Math.round(spend * roas);
    const tOrders = Math.round(tRevenue / (2800 + seed * 80));
    const orders = Math.round(revenue / (2800 + seed * 80));
    const tAov = Math.round(tRevenue / tOrders);
    const aov = Math.round(revenue / orders);

    const mkEcom = (s: number, ts: number, ro: number, tro: number, rev: number, trev: number, ord: number, tord: number, av: number, tav: number, chSeed: number): EcomPlatformMetrics => ({
      adSpend: { value: Math.round(s), target: Math.round(ts), change: Math.round(-12 + chSeed * 3) },
      roas: { value: +ro.toFixed(2), target: +tro.toFixed(2), change: Math.round(5 + chSeed * 2.5) },
      revenue: { value: Math.round(rev), target: Math.round(trev), change: Math.round(8 + chSeed * 3) },
      orders: { value: Math.round(ord), target: Math.round(tord), change: Math.round(10 + chSeed * 4) },
      aov: { value: Math.round(av), target: Math.round(tav), change: Math.round(-5 + chSeed * 1.5) },
    });

    return {
      overall: { platform: 'Overall', metrics: mkEcom(spend, tSpend, roas, tRoas, revenue, tRevenue, orders, tOrders, aov, tAov, seed % 4) },
      meta: { platform: 'Meta Ads', metrics: mkEcom(spend * metaRatio, tSpend * metaRatio, roas * (1 + (seed % 3) * 0.04), tRoas * 1.05, revenue * metaRatio, tRevenue * metaRatio, orders * metaRatio, tOrders * metaRatio, Math.round((revenue * metaRatio) / (orders * metaRatio)), Math.round((tRevenue * metaRatio) / (tOrders * metaRatio)), (seed + 1) % 5) },
      google: { platform: 'Google Ads', metrics: mkEcom(spend * googleRatio, tSpend * googleRatio, roas * (1 - (seed % 3) * 0.03), tRoas * 0.95, revenue * googleRatio, tRevenue * googleRatio, orders * googleRatio, tOrders * googleRatio, Math.round((revenue * googleRatio) / (orders * googleRatio)), Math.round((tRevenue * googleRatio) / (tOrders * googleRatio)), (seed + 2) % 5) },
    };
  } else {
    const tSpend = 300000 + seed * 70000;
    const spend = Math.round(tSpend * (0.80 + (seed % 4) * 0.05));
    const tLeads = Math.round(tSpend / (500 + seed * 20));
    const leads = Math.round(spend / (550 + seed * 25));
    const tCpl = Math.round(tSpend / tLeads);
    const cpl = Math.round(spend / leads);
    const tCtr = +(2.2 + (seed % 5) * 0.3).toFixed(1);
    const ctr = +(1.6 + (seed % 5) * 0.35).toFixed(1);

    const mkLead = (s: number, ts: number, ld: number, tld: number, cp: number, tcp: number, ct: number, tct: number, chSeed: number): LeadGenPlatformMetrics => ({
      adSpend: { value: Math.round(s), target: Math.round(ts), change: Math.round(-4 + chSeed * 2.5) },
      leads: { value: Math.round(ld), target: Math.round(tld), change: Math.round(6 + chSeed * 3) },
      cpl: { value: Math.round(cp), target: Math.round(tcp), change: Math.round(-8 + chSeed * 2) },
      ctr: { value: +ct.toFixed(1), target: +tct.toFixed(1), change: Math.round(2 + chSeed * 2) },
    });

    return {
      overall: { platform: 'Overall', metrics: mkLead(spend, tSpend, leads, tLeads, cpl, tCpl, ctr, tCtr, seed % 4) },
      meta: { platform: 'Meta Ads', metrics: mkLead(spend * metaRatio, tSpend * metaRatio, leads * metaRatio, tLeads * metaRatio, Math.round(cpl * 0.9), Math.round(tCpl * 0.92), +(ctr * 1.1).toFixed(1), +(tCtr * 1.08).toFixed(1), (seed + 1) % 5) },
      google: { platform: 'Google Ads', metrics: mkLead(spend * googleRatio, tSpend * googleRatio, leads * googleRatio, tLeads * googleRatio, Math.round(cpl * 1.12), Math.round(tCpl * 1.08), +(ctr * 0.88).toFixed(1), +(tCtr * 0.9).toFixed(1), (seed + 2) % 5) },
    };
  }
}

// ── Change indicator (same as ReportingModule) ──
function PmChangeIndicator({ value }: { value: number }) {
  const isGood = value >= 0;
  return (
    <span className={`text-caption font-medium tabular-nums ${isGood ? 'text-[#0A8F5E]' : 'text-[#D03050]'}`}>
      {value >= 0 ? '+' : ''}{value}%
    </span>
  );
}

function formatPmCurrency(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

// ── Editable platform targets ──
// Drivers users can edit per platform; Overall row auto-derives via simple,
// consistent formulas (sum for absolutes, weighted recompute for ratios).
type EcomTargets    = { adSpend: number; roas: number; revenue: number; orders: number; aov: number };
type LeadGenTargets = { adSpend: number; leads: number; cpl: number; ctr: number };
type EditableTargets =
  | { type: 'Ecommerce';      meta: EcomTargets;    google: EcomTargets    }
  | { type: 'Lead generation'; meta: LeadGenTargets; google: LeadGenTargets };

type MetricKey = keyof EcomTargets | keyof LeadGenTargets;
type MetricUnit = 'currency-large' | 'currency-small' | 'count' | 'multiplier' | 'percent';

const metricUnit: Record<MetricKey, MetricUnit> = {
  adSpend: 'currency-large',
  revenue: 'currency-large',
  orders:  'count',
  aov:     'currency-small',
  roas:    'multiplier',
  leads:   'count',
  cpl:     'currency-small',
  ctr:     'percent',
};

// Display formatter for a target value
function formatTarget(v: number, unit: MetricUnit): string {
  if (!isFinite(v) || v === 0) return '—';
  switch (unit) {
    case 'currency-large': return formatPmCurrency(Math.round(v));
    case 'currency-small': return `₹${Math.round(v).toLocaleString('en-IN')}`;
    case 'count':          return Math.round(v).toLocaleString('en-IN');
    case 'multiplier':     return `${(Math.round(v * 10) / 10)}x`;
    case 'percent':        return `${(Math.round(v * 10) / 10)}%`;
  }
}

// Convert raw stored value -> string the user types in input
function rawToInput(v: number, unit: MetricUnit): string {
  if (!isFinite(v) || v === 0) return '';
  switch (unit) {
    case 'currency-large': return (v / 100000).toFixed(v >= 1000000 ? 2 : 1).replace(/\.?0+$/, '');
    case 'currency-small': return Math.round(v).toString();
    case 'count':          return Math.round(v).toString();
    case 'multiplier':     return (Math.round(v * 100) / 100).toString();
    case 'percent':        return (Math.round(v * 10) / 10).toString();
  }
}

// Parse user-typed string -> raw stored value
function inputToRaw(s: string, unit: MetricUnit): number {
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return 0;
  return unit === 'currency-large' ? Math.round(n * 100000) : n;
}

// Per-unit input affordances
const inputSuffix: Record<MetricUnit, string> = {
  'currency-large': 'L',
  'currency-small': '₹',
  'count':          '',
  'multiplier':     'x',
  'percent':        '%',
};
const inputPrefix: Record<MetricUnit, string> = {
  'currency-large': '₹',
  'currency-small': '₹',
  'count':          '',
  'multiplier':     '',
  'percent':        '',
};

// Build seed targets (full set of editable + derived) from generated breakdown.
function seedEditableTargets(clientType: ClientType, brk: PlatformBreakdownData): EditableTargets {
  if (clientType === 'Ecommerce') {
    const m = brk.meta.metrics   as EcomPlatformMetrics;
    const g = brk.google.metrics as EcomPlatformMetrics;
    return {
      type: 'Ecommerce',
      meta:   { adSpend: m.adSpend.target, roas: m.roas.target, revenue: m.revenue.target, orders: m.orders.target, aov: m.aov.target },
      google: { adSpend: g.adSpend.target, roas: g.roas.target, revenue: g.revenue.target, orders: g.orders.target, aov: g.aov.target },
    };
  }
  const m = brk.meta.metrics   as LeadGenPlatformMetrics;
  const g = brk.google.metrics as LeadGenPlatformMetrics;
  return {
    type: 'Lead generation',
    meta:   { adSpend: m.adSpend.target, leads: m.leads.target, cpl: m.cpl.target, ctr: m.ctr.target },
    google: { adSpend: g.adSpend.target, leads: g.leads.target, cpl: g.cpl.target, ctr: g.ctr.target },
  };
}

// ── 6-month history snapshot for a client ──
// Each historical month carries the *full* metric set for the business type so
// the drawer can surface every relevant KPI (ecom: 5, lead-gen: 4) — not just
// a single headline.
type MonthMetric = {
  key: MetricKey;
  label: string;
  value: string;     // pre-formatted for display
  hit: boolean;      // met / missed target this month
};

type MonthSnapshot = {
  monthLabel: string;     // e.g. "Apr 2026"
  monthShort: string;     // e.g. "Apr"
  year: number;
  status: KSMStatus;      // overall Hit / Miss for the month
  hitMetrics: number;     // count of metrics on target
  totalMetrics: number;
  spend: number;          // convenience headline (matches metrics[0])
  primaryKpi: { label: string; value: string };  // ROAS for ecom, CPL for leadgen
  metrics: MonthMetric[]; // every metric for the business type
};

function generateClientHistory(clientId: string, clientType: ClientType): MonthSnapshot[] {
  const seed = parseInt(clientId) || 1;
  const months = [
    { label: 'Apr 2026', short: 'Apr', year: 2026 },
    { label: 'Mar 2026', short: 'Mar', year: 2026 },
    { label: 'Feb 2026', short: 'Feb', year: 2026 },
    { label: 'Jan 2026', short: 'Jan', year: 2026 },
    { label: 'Dec 2025', short: 'Dec', year: 2025 },
    { label: 'Nov 2025', short: 'Nov', year: 2025 },
  ];

  return months.map((m, i) => {
    const driftSeed = (seed + i * 7) % 11;
    // Bias toward Hit on recent months (current month follows live ksmTarget for most clients)
    const recentBias = i === 0 ? (seed % 5 !== 0 ? 4 : -2) : 0;
    // Per-metric hit flag — deterministic, varies by metric+month
    const flag = (idx: number) =>
      (((driftSeed + idx * 3 + (seed % 5)) % 7) + recentBias) > 2;

    if (clientType === 'Ecommerce') {
      const spend   = Math.max(200000, 1500000 + (driftSeed - 5) * 80000 + (seed % 3) * 50000);
      const roas    = +(4.2 + (driftSeed * 0.13) + (recentBias > 0 ? 0.4 : 0)).toFixed(2);
      const revenue = Math.round(spend * roas);
      const aov     = 2800 + (seed % 5) * 200 + (driftSeed - 5) * 80;
      const orders  = Math.max(1, Math.round(revenue / Math.max(aov, 800)));
      const aovDisp = Math.max(800, aov);

      const metrics: MonthMetric[] = [
        { key: 'adSpend', label: 'Spend',   value: formatPmCurrency(spend),                       hit: flag(0) },
        { key: 'roas',    label: 'ROAS',    value: `${roas.toFixed(1)}x`,                         hit: flag(1) },
        { key: 'revenue', label: 'Revenue', value: formatPmCurrency(revenue),                     hit: flag(2) },
        { key: 'orders',  label: 'Orders',  value: orders.toLocaleString('en-IN'),                hit: flag(3) },
        { key: 'aov',     label: 'AOV',     value: `₹${aovDisp.toLocaleString('en-IN')}`,         hit: flag(4) },
      ];
      const hitMetrics = metrics.filter(x => x.hit).length;
      return {
        monthLabel: m.label,
        monthShort: m.short,
        year: m.year,
        status: hitMetrics >= 4 ? 'Hit' : 'Miss',
        hitMetrics,
        totalMetrics: metrics.length,
        spend,
        primaryKpi: { label: 'ROAS', value: `${roas.toFixed(1)}x` },
        metrics,
      };
    }

    // Lead generation
    const spend = Math.max(150000, 800000 + (driftSeed - 5) * 50000 + (seed % 3) * 30000);
    const cpl   = Math.max(120, Math.round(450 + driftSeed * 18 - (recentBias > 0 ? 60 : 0)));
    const leads = Math.max(1, Math.round(spend / cpl));
    const ctr   = +(1.6 + (driftSeed * 0.18) + (recentBias > 0 ? 0.4 : 0)).toFixed(1);

    const metrics: MonthMetric[] = [
      { key: 'adSpend', label: 'Spend', value: formatPmCurrency(spend),                hit: flag(0) },
      { key: 'leads',   label: 'Leads', value: leads.toLocaleString('en-IN'),          hit: flag(1) },
      { key: 'cpl',     label: 'CPL',   value: `₹${cpl.toLocaleString('en-IN')}`,      hit: flag(2) },
      { key: 'ctr',     label: 'CTR',   value: `${ctr.toFixed(1)}%`,                   hit: flag(3) },
    ];
    const hitMetrics = metrics.filter(x => x.hit).length;
    return {
      monthLabel: m.label,
      monthShort: m.short,
      year: m.year,
      status: hitMetrics >= 3 ? 'Hit' : 'Miss',
      hitMetrics,
      totalMetrics: metrics.length,
      spend,
      primaryKpi: { label: 'CPL', value: `₹${cpl.toLocaleString('en-IN')}` },
      metrics,
    };
  });
}

// Compute the Overall target row as a roll-up of Meta + Google targets.
// Sum-aggregables literally add; ratios recompute from sums.
function rollupOverall(t: EditableTargets): EcomTargets | LeadGenTargets {
  if (t.type === 'Ecommerce') {
    const adSpend = t.meta.adSpend + t.google.adSpend;
    const revenue = t.meta.revenue + t.google.revenue;
    const orders  = t.meta.orders  + t.google.orders;
    return {
      adSpend,
      revenue,
      orders,
      roas: adSpend > 0 ? +(revenue / adSpend).toFixed(2) : 0,
      aov:  orders  > 0 ? Math.round(revenue / orders)    : 0,
    };
  }
  const adSpend = t.meta.adSpend + t.google.adSpend;
  const leads   = t.meta.leads   + t.google.leads;
  // CTR weighted by spend (best proxy without impressions data)
  const ctr = adSpend > 0 ? +((t.meta.ctr * t.meta.adSpend + t.google.ctr * t.google.adSpend) / adSpend).toFixed(1) : 0;
  return {
    adSpend,
    leads,
    cpl: leads > 0 ? Math.round(adSpend / leads) : 0,
    ctr,
  };
}

// ── Inline editable target chip ──
// Renders as a quiet inline value with a hover affordance that swaps to an
// input on click. Commit on Enter or blur; revert on Escape.
function TargetEditor({
  value,
  unit,
  onChange,
  ariaLabel,
}: {
  value: number;
  unit: MetricUnit;
  onChange: (raw: number) => void;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(rawToInput(value, unit));
      // Focus + select on next tick
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    }
  }, [editing, value, unit]);

  const commit = () => {
    const next = inputToRaw(draft, unit);
    if (next !== value) onChange(next);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  if (editing) {
    const prefix = inputPrefix[unit];
    const suffix = inputSuffix[unit];
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-white ring-1 ring-[#204CC7]/40 shadow-sm shadow-[#204CC7]/[0.08] px-1.5 py-0.5">
        {prefix && <span className="text-caption text-black/40">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          aria-label={ariaLabel}
          className="bg-transparent text-caption font-semibold text-black/80 tabular-nums outline-none w-12"
        />
        {suffix && unit !== 'currency-small' && <span className="text-caption text-black/40">{suffix}</span>}
      </span>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      aria-label={`${ariaLabel}: ${formatTarget(value, unit)}, click to edit`}
      title="Click to edit target"
      className="inline-flex items-center gap-1 -mx-1 px-1 py-0.5 rounded-md text-caption font-medium tabular-nums text-black/55 hover:text-[#204CC7] hover:bg-[#EEF1FB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors"
    >
      <span className="text-black/35">→</span>
      <span>{formatTarget(value, unit)}</span>
    </button>
  );
}

// ── Read-only computed target chip (Overall row) ──
function TargetReadout({ value, unit, ariaLabel }: { value: number; unit: MetricUnit; ariaLabel: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 -mx-1 px-1 py-0.5 text-caption font-medium tabular-nums text-black/65"
      aria-label={`${ariaLabel}: ${formatTarget(value, unit)} (auto-computed)`}
      title="Auto-computed from Meta + Google"
    >
      <span className="text-black/35">Σ</span>
      <span>{formatTarget(value, unit)}</span>
    </span>
  );
}

// ── Brand-coloured platform glyph ──
function PlatformGlyph({ platform }: { platform: 'meta' | 'google' | 'overall' }) {
  if (platform === 'meta') {
    // Meta blue M
    return (
      <span className="w-5 h-5 rounded-md flex items-center justify-center bg-[#1877F2]/[0.12] shrink-0">
        <span className="text-[10px] font-bold text-[#1877F2]" aria-hidden="true">f</span>
      </span>
    );
  }
  if (platform === 'google') {
    // Google G
    return (
      <span className="w-5 h-5 rounded-md flex items-center justify-center bg-white ring-1 ring-black/[0.08] shrink-0" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-3 h-3" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.54-.2-2.27H12v4.51h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.32z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.97 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.16C1.42 8.55 1 10.22 1 12s.42 3.45 1.16 4.93l3.68-2.83z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.97 3.47 2.16 7.07l3.68 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
      </span>
    );
  }
  // Overall — neutral
  return (
    <span className="w-5 h-5 rounded-md flex items-center justify-center bg-[#204CC7]/[0.10] shrink-0">
      <span className="text-[9px] font-bold text-[#204CC7]" aria-hidden="true">Σ</span>
    </span>
  );
}

// ── KSM Drawer ──
// Right-side drawer that opens when the user clicks the Hit/Miss chip.
// Two zones: (1) per-platform target editor (Meta + Google → Overall auto-rolled up)
// and (2) 6-month performance history with Hit/Miss verdict per month.
// Metrics where lower-actual-than-target = good (CPL only).
const lowerIsBetterMetric: Set<MetricKey> = new Set(['cpl']);

function isHittingTarget(actual: number, target: number, key: MetricKey): boolean {
  if (target <= 0) return true;
  return lowerIsBetterMetric.has(key) ? actual <= target : actual >= target;
}
// Returns 0–100 fill for the progress bar. For lower-is-better, fill represents
// "how much of the target budget you've used" (less = better → bar mostly empty).
function pctOfTargetForBar(actual: number, target: number, key: MetricKey): number {
  if (target <= 0) return 0;
  const raw = (actual / target) * 100;
  if (lowerIsBetterMetric.has(key)) {
    return Math.min(100, raw);
  }
  return Math.min(100, raw);
}
// Format actuals — same formatter family as targets, just resilient to NaN.
function formatActualValue(v: number, unit: MetricUnit): string {
  if (!isFinite(v)) return '—';
  switch (unit) {
    case 'currency-large': return formatPmCurrency(Math.round(v));
    case 'currency-small': return `₹${Math.round(v).toLocaleString('en-IN')}`;
    case 'count':          return Math.round(v).toLocaleString('en-IN');
    case 'multiplier':     return `${(Math.round(v * 100) / 100)}x`;
    case 'percent':        return `${(Math.round(v * 10) / 10)}%`;
  }
}

function KsmDrawer({
  client,
  businessType,
  targets,
  history,
  current,
  onUpdateTarget,
  onClose,
}: {
  client: Client;
  businessType: ClientType;
  targets: EditableTargets;
  history: MonthSnapshot[];
  current: PlatformBreakdownData;
  onUpdateTarget: (platform: 'meta' | 'google', key: MetricKey, raw: number) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // Drawer is scoped to a single (client, businessType) row. Lead Gen and
  // E-commerce are entirely separate KPI families (CPL/leads vs. ROAS/spend),
  // so each row owns its own drawer instance — no "+1" affordance needed.
  const isEcom = businessType === 'Ecommerce';

  // Selected month for the streak strip (0 = most recent).
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  // Per-metric expanded state (revealing platform editors).
  const [expandedMetric, setExpandedMetric] = useState<MetricKey | null>(null);

  // Escape closes the drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const overallTargets = rollupOverall(targets);
  const metricKeys: MetricKey[] = isEcom
    ? ['adSpend', 'roas', 'revenue', 'orders', 'aov']
    : ['adSpend', 'leads', 'cpl', 'ctr'];
  const metricLabels: Record<MetricKey, string> = {
    adSpend: 'Ad Spend', roas: 'ROAS', revenue: 'Revenue', orders: 'Orders', aov: 'AOV',
    leads: 'Leads', cpl: 'CPL', ctr: 'CTR',
  };

  const currentMonth   = history[0];
  const previousMonth  = history[1];
  const selectedMonth  = history[selectedMonthIdx];
  const trendDelta     = currentMonth && previousMonth
    ? currentMonth.hitMetrics - previousMonth.hitMetrics
    : 0;

  // Pull actuals from PlatformBreakdownData.overall for current month
  const overallActuals = current.overall.metrics as unknown as Record<string, MetricCell | undefined>;
  const metaActuals    = current.meta.metrics    as unknown as Record<string, MetricCell | undefined>;
  const googleActuals  = current.google.metrics  as unknown as Record<string, MetricCell | undefined>;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${client.name} performance drawer`}>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        style={{ animation: 'fadeIn 150ms ease-out' }}
      />
      {/* Panel */}
      <div
        className="absolute right-0 top-0 bottom-0 w-[720px] max-w-full bg-white shadow-2xl shadow-black/20 flex flex-col"
        style={{ animation: 'slideIn 220ms ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>

        {/* ── Header ── */}
        <div className="px-7 pt-5 pb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h3 font-bold text-black/85 truncate">{client.name}</h2>
            {/* The drawer is scoped to one business motion. Type chip is the
                first signal so admins instantly know which KPI family they're
                looking at (Lead Gen → CPL/Leads, E-com → ROAS/Spend). */}
            <p className="text-caption text-black/50 mt-1 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-caption font-semibold ${
                  businessType === 'Ecommerce'
                    ? 'bg-[#EEF1FB] text-[#3D5EC7]'
                    : 'bg-violet-50 text-violet-700'
                }`}
              >
                {businessType}
              </span>
              <span aria-hidden="true" className="text-black/25">·</span>
              <span>{currentMonth.monthLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 -mr-1 rounded-md flex items-center justify-center text-black/50 hover:bg-black/[0.05] hover:text-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Hero: status + trend ── */}
        <div className="px-7 pb-5 border-b border-black/[0.05]">
          <div className="flex items-center gap-3.5">
            <span className={`w-2.5 h-2.5 rounded-full ${currentMonth.status === 'Hit' ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-rose-500 ring-4 ring-rose-500/15'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-h3 font-bold ${currentMonth.status === 'Hit' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {currentMonth.status === 'Hit' ? 'On track' : 'Behind target'}
                </span>
                <span className="text-body font-medium text-black/55 tabular-nums">
                  {currentMonth.hitMetrics}/{currentMonth.totalMetrics} metrics
                </span>
              </div>
              {previousMonth && (
                <p className="text-caption text-black/50 mt-0.5">
                  {trendDelta > 0 && (
                    <span className="text-emerald-600 font-medium">↑ +{trendDelta} </span>
                  )}
                  {trendDelta < 0 && (
                    <span className="text-rose-500 font-medium">↓ {trendDelta} </span>
                  )}
                  {trendDelta === 0 && (
                    <span className="text-black/55 font-medium">— no change </span>
                  )}
                  vs {previousMonth.monthShort} {previousMonth.year} ({previousMonth.hitMetrics}/{previousMonth.totalMetrics})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          {/* PERFORMANCE — actuals + targets */}
          <section className="px-7 pt-6 pb-7">
            <header className="flex items-baseline justify-between mb-3.5">
              <h3 className="text-caption font-semibold text-black/75 uppercase tracking-wider">This month's performance</h3>
              <span className="text-caption text-black/45">Click a metric to set platform targets</span>
            </header>

            <div className="rounded-xl border border-black/[0.06] overflow-hidden bg-white">
              {metricKeys.map((k, idx) => {
                const unit       = metricUnit[k];
                const label      = metricLabels[k];
                const overallCell = overallActuals[k];
                const actualVal  = overallCell?.value ?? 0;
                const targetVal  = (overallTargets as unknown as Record<string, number>)[k] ?? 0;
                const hit        = isHittingTarget(actualVal, targetVal, k);
                const pct        = pctOfTargetForBar(actualVal, targetVal, k);
                const pctRounded = Math.round(pct);
                const isOpen     = expandedMetric === k;
                const metaVal    = (targets.meta   as unknown as Record<string, number>)[k] ?? 0;
                const googleVal  = (targets.google as unknown as Record<string, number>)[k] ?? 0;
                const metaActual   = metaActuals[k]?.value ?? 0;
                const googleActual = googleActuals[k]?.value ?? 0;

                return (
                  <div key={k} className={idx > 0 ? 'border-t border-black/[0.04]' : ''}>
                    <button
                      type="button"
                      onClick={() => setExpandedMetric(isOpen ? null : k)}
                      aria-expanded={isOpen}
                      aria-label={`${label} — ${formatActualValue(actualVal, unit)} of ${formatTarget(targetVal, unit)} target`}
                      className="w-full text-left px-4 py-3.5 hover:bg-[#FAFBFC] transition-colors focus:outline-none focus:bg-[#FAFBFC]"
                    >
                      {/* Top line: label · big actual · status icon */}
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-caption font-semibold text-black/70 uppercase tracking-wide">{label}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-black/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </div>
                        <div className="flex items-baseline gap-2.5">
                          <span className="text-h2 font-bold text-black/85 tabular-nums leading-none">
                            {formatActualValue(actualVal, unit)}
                          </span>
                          <span className="text-caption text-black/45 tabular-nums">/ {formatTarget(targetVal, unit)}</span>
                        </div>
                      </div>

                      {/* Progress bar + pct + tone chip */}
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${hit ? 'bg-emerald-500' : 'bg-rose-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-caption font-semibold tabular-nums ${hit ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {pctRounded}%
                        </span>
                      </div>
                    </button>

                    {/* Expanded: per-platform targets editor + actuals */}
                    {isOpen && (
                      <div className="px-4 pt-1 pb-4 bg-[#FAFBFC] border-t border-black/[0.04]">
                        <div className="rounded-lg bg-white border border-black/[0.06] divide-y divide-black/[0.04]">
                          <div className="px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] items-center gap-3">
                            <PlatformGlyph platform="meta" />
                            <span className="text-caption font-medium text-black/70">Meta</span>
                            <span className="text-caption text-black/55 tabular-nums">
                              {formatActualValue(metaActual, unit)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-micro text-black/40 uppercase tracking-wide">Target</span>
                              <TargetEditor
                                value={metaVal}
                                unit={unit}
                                onChange={(v) => onUpdateTarget('meta', k, v)}
                                ariaLabel={`Meta ${label} target`}
                              />
                            </div>
                          </div>
                          <div className="px-3.5 py-2.5 grid grid-cols-[28px_1fr_auto_auto] items-center gap-3">
                            <PlatformGlyph platform="google" />
                            <span className="text-caption font-medium text-black/70">Google</span>
                            <span className="text-caption text-black/55 tabular-nums">
                              {formatActualValue(googleActual, unit)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-micro text-black/40 uppercase tracking-wide">Target</span>
                              <TargetEditor
                                value={googleVal}
                                unit={unit}
                                onChange={(v) => onUpdateTarget('google', k, v)}
                                ariaLabel={`Google ${label} target`}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-micro text-black/40 px-1">
                          Overall <span className="font-medium text-[#204CC7]">auto-rolls up</span> from Meta + Google.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* HISTORY — visual streak strip + selected detail */}
          <section className="px-7 pt-1 pb-8 border-t border-black/[0.05]">
            <header className="flex items-baseline justify-between mb-3.5 mt-5">
              <h3 className="text-caption font-semibold text-black/75 uppercase tracking-wider">6-Month trend</h3>
              <span className="text-caption text-black/45">Tap a month for details</span>
            </header>

            {/* Streak strip — oldest → newest, left-to-right */}
            <div className="grid grid-cols-6 gap-2">
              {[...history].reverse().map((m, i) => {
                const realIdx = history.length - 1 - i; // map back to history[] index (0 = newest)
                const isSelected = realIdx === selectedMonthIdx;
                const isHit = m.status === 'Hit';
                return (
                  <button
                    key={m.monthLabel}
                    type="button"
                    onClick={() => setSelectedMonthIdx(realIdx)}
                    aria-pressed={isSelected}
                    aria-label={`${m.monthLabel}: ${m.status}, ${m.hitMetrics} of ${m.totalMetrics} metrics on target`}
                    className={`group relative rounded-xl border px-2.5 py-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/25
                      ${isSelected
                        ? 'border-[#204CC7]/40 bg-[#EEF1FB]/60 shadow-sm shadow-[#204CC7]/10'
                        : 'border-black/[0.06] bg-white hover:border-black/[0.12] hover:bg-black/[0.015]'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-micro font-semibold uppercase tracking-wider ${isSelected ? 'text-[#204CC7]' : 'text-black/55'}`}>
                        {m.monthShort}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isHit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    {/* Mini score bar */}
                    <div className="mt-2.5 h-1 rounded-full bg-black/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isHit ? 'bg-emerald-500' : 'bg-rose-400'}`}
                        style={{ width: `${(m.hitMetrics / m.totalMetrics) * 100}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-caption font-semibold text-black/80 tabular-nums">
                      {m.hitMetrics}/{m.totalMetrics}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected month detail card — every metric for the business type */}
            <div className="mt-4 rounded-xl bg-[#FAFBFC] border border-black/[0.05] px-4 pt-3.5 pb-4">
              <div className="flex items-center justify-between gap-3 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedMonth.status === 'Hit' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-body font-semibold text-black/80">{selectedMonth.monthLabel}</span>
                  <span className={`text-caption font-semibold px-2 py-0.5 rounded-full ${selectedMonth.status === 'Hit' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                    {selectedMonth.status}
                  </span>
                </div>
                <span className="text-caption font-medium text-black/55 tabular-nums">
                  {selectedMonth.hitMetrics} of {selectedMonth.totalMetrics} on target
                </span>
              </div>
              <div
                className="grid gap-x-3 gap-y-3"
                style={{ gridTemplateColumns: `repeat(${selectedMonth.metrics.length}, minmax(0, 1fr))` }}
              >
                {selectedMonth.metrics.map((metric) => (
                  <div key={metric.key} className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-micro text-black/45 uppercase tracking-wider">{metric.label}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${metric.hit ? 'bg-emerald-500' : 'bg-rose-400'}`}
                        title={metric.hit ? 'On target' : 'Below target'}
                        aria-label={metric.hit ? 'On target' : 'Below target'}
                      />
                    </div>
                    <span className={`text-body font-semibold tabular-nums mt-0.5 truncate ${metric.hit ? 'text-black/85' : 'text-rose-600'}`}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Business Info Types (collected from client-facing onboarding app) ──
interface BusinessProduct {
  name: string;
  category: string;
  priceRange: string;
  description: string;
}

interface BusinessCompetitor {
  name: string;
  website: string;
}

interface BusinessInfoData {
  companyName: string;
  website: string;
  industry: string;
  targetAudience: string;
  monthlyAdBudget: string;
  targetLocation: string[];
  primaryGoal: string;
  competitors: BusinessCompetitor[];
  products: BusinessProduct[];
  usps: string[];
}

// ── Lead Generation Business Info Types ──
interface LeadGenService {
  name: string;
  avgDealValue: string;
  avgSalesCycle: string;
}

interface LeadGenCompetitor {
  name: string;
  website: string;
  keyOffering: string;
}

interface LeadGenBusinessInfoData {
  companyName: string;
  website: string;
  industry: string;
  // Lead Generation Details
  primaryServiceOffered: string;
  serviceAreas: string[];
  monthlyAdBudget: string;
  averageDealValue: string;
  monthlyLeadVolumeTarget: string;
  // Competitors
  competitors: LeadGenCompetitor[];
  // Lead Funnel
  services: LeadGenService[];
  leadQualificationCriteria: { label: string; active: boolean }[];
  followUpChannels: string[];
}

// Business info keyed by client id — E-Commerce clients
// (Lead Gen clients are in clientLeadGenBusinessInfo below)
const clientBusinessInfo: Record<string, BusinessInfoData> = {
  '1': {
    companyName: 'Elan by Aanchal',
    website: 'https://elanbyanachal.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 22-40, Urban India, Fashion-conscious',
    monthlyAdBudget: '₹3L - ₹4.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Pune'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Nykaa Fashion', website: 'https://nykaa.com/fashion' },
      { name: 'Libas', website: 'https://libas.in' },
      { name: 'FabIndia', website: 'https://fabindia.com' },
    ],
    products: [
      { name: 'Silk Saree Collection', category: 'Ethnic Wear', priceRange: '₹3,500 - ₹12,000', description: 'Premium handloom silk sarees with contemporary prints and traditional borders.' },
      { name: 'Festive Kurta Sets', category: 'Ethnic Wear', priceRange: '₹1,800 - ₹4,500', description: 'Designer kurta sets for festive and wedding occasions.' },
    ],
    usps: ['Handcrafted by artisans', 'Sustainable fabrics only', 'Free alterations on all orders'],
  },
  '2': {
    companyName: 'July Issue',
    website: 'https://julyissue.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 18-32, Metro cities, Trend-forward',
    monthlyAdBudget: '₹2L - ₹3L',
    targetLocation: ['Pan India', 'Metro cities'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Zara India', website: 'https://zara.com/in' },
      { name: 'H&M India', website: 'https://hm.com/in' },
      { name: 'Urbanic', website: 'https://urbanic.com' },
    ],
    products: [
      { name: 'Summer Dresses', category: 'Western Wear', priceRange: '₹1,200 - ₹3,500', description: 'Trendy summer dresses with bold prints and flattering silhouettes.' },
      { name: 'Co-ord Sets', category: 'Western Wear', priceRange: '₹1,500 - ₹2,800', description: 'Matching top-and-bottom sets perfect for brunches and casual outings.' },
    ],
    usps: ['New drops every Friday', 'Size-inclusive range (XS-3XL)', 'Easy 15-day returns'],
  },
  '5': {
    companyName: 'Skin Essentials',
    website: 'https://skinessentials.co.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 25-45, Skincare enthusiasts, Premium segment',
    monthlyAdBudget: '₹2.5L - ₹3.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Minimalist', website: 'https://beminimalist.co' },
      { name: 'Plum Goodness', website: 'https://plumgoodness.com' },
      { name: 'Dot & Key', website: 'https://dotandkey.com' },
    ],
    products: [
      { name: 'Premium Skincare Kit', category: 'Skincare', priceRange: '₹2,500 - ₹5,000', description: 'Curated skincare routines with cleanser, serum, moisturiser, and SPF.' },
      { name: 'Vitamin C Serum', category: 'Skincare', priceRange: '₹800 - ₹1,500', description: 'Brightening serum with 15% Vitamin C and Hyaluronic Acid.' },
      { name: 'Anti-Ageing Night Cream', category: 'Skincare', priceRange: '₹1,200 - ₹2,200', description: 'Retinol-infused night cream for fine lines and wrinkle reduction.' },
    ],
    usps: ['100% organic ingredients', 'Dermatologist-tested', '30-day money-back guarantee'],
  },
  '6': {
    companyName: 'True Diamond',
    website: 'https://truediamond.in',
    industry: 'E-Commerce',
    targetAudience: 'Women 28-50, HNI segment, Jewellery buyers',
    monthlyAdBudget: '₹5L - ₹8L',
    targetLocation: ['Mumbai', 'Delhi', 'Surat', 'Ahmedabad'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'CaratLane', website: 'https://caratlane.com' },
      { name: 'Melorra', website: 'https://melorra.com' },
      { name: 'BlueStone', website: 'https://bluestone.com' },
    ],
    products: [
      { name: 'Diamond Solitaire Rings', category: 'Fine Jewellery', priceRange: '₹25,000 - ₹2,00,000', description: 'Certified natural diamond solitaires with IGI certification.' },
      { name: 'Everyday Gold Earrings', category: 'Fine Jewellery', priceRange: '₹8,000 - ₹35,000', description: 'Lightweight 18K gold earrings for daily wear.' },
    ],
    usps: ['IGI-certified diamonds', 'Lifetime exchange policy', 'Free insured shipping'],
  },
  '8': {
    companyName: 'Crystallicious',
    website: 'https://crystallicious.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 20-35, Fashion jewellery lovers, Budget-conscious',
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    targetLocation: ['Pan India'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Zaveri Pearls', website: 'https://zaveripearls.com' },
      { name: 'Priyaasi', website: 'https://priyaasi.com' },
      { name: 'Jewelmaze', website: 'https://jewelmaze.in' },
    ],
    products: [
      { name: 'Crystal Statement Necklace', category: 'Fashion Jewellery', priceRange: '₹500 - ₹2,000', description: 'Eye-catching crystal necklaces for parties and events.' },
      { name: 'Layered Bracelet Set', category: 'Fashion Jewellery', priceRange: '₹350 - ₹1,200', description: 'Stackable bracelet sets in gold and silver finishes.' },
    ],
    usps: ['Free shipping on all orders', 'Tarnish-proof guarantee', 'New arrivals weekly'],
  },
  '9': {
    companyName: 'Bio Basket',
    website: 'https://biobasket.in',
    industry: 'E-Commerce',
    targetAudience: 'Health-conscious families, 28-50, Tier 1-2 cities',
    monthlyAdBudget: '₹1.5L - ₹2L',
    targetLocation: ['Mumbai', 'Pune', 'Bangalore', 'Hyderabad'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Organic Tattva', website: 'https://organictattva.com' },
      { name: '24 Mantra', website: 'https://24mantra.com' },
      { name: 'Farm2Fork', website: 'https://farm2fork.in' },
    ],
    products: [
      { name: 'Organic Grocery Box', category: 'Organic Food', priceRange: '₹800 - ₹2,500', description: 'Monthly curated box with organic pulses, grains, and cold-pressed oils.' },
      { name: 'Cold-Pressed Juice Pack', category: 'Beverages', priceRange: '₹400 - ₹900', description: 'Pack of 6 cold-pressed juices with no added sugar or preservatives.' },
    ],
    usps: ['100% certified organic', 'Farm-to-door in 48 hours', 'Subscription discounts'],
  },
  '12': {
    companyName: 'JM Group',
    website: 'https://jmgroup.co.in',
    industry: 'E-Commerce',
    targetAudience: 'Men & Women 25-45, Home decor enthusiasts',
    monthlyAdBudget: '₹2L - ₹3.5L',
    targetLocation: ['Mumbai', 'Delhi NCR', 'Bangalore'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Pepperfry', website: 'https://pepperfry.com' },
      { name: 'Urban Ladder', website: 'https://urbanladder.com' },
      { name: 'Wooden Street', website: 'https://woodenstreet.com' },
    ],
    products: [
      { name: 'Modular Furniture Sets', category: 'Home & Living', priceRange: '₹15,000 - ₹60,000', description: 'Space-saving modular furniture with customisable configurations.' },
      { name: 'Decorative Lighting', category: 'Home & Living', priceRange: '₹2,000 - ₹8,000', description: 'Contemporary pendant lights and floor lamps.' },
    ],
    usps: ['Custom-made options available', '10-year warranty', 'Free interior consultation'],
  },
  '14': {
    companyName: 'House of Saloni',
    website: 'https://houseofsaloni.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 24-40, Premium ethnic wear, Wedding shoppers',
    monthlyAdBudget: '₹3L - ₹5L',
    targetLocation: ['Pan India', 'NRI markets'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Kalki Fashion', website: 'https://kalkifashion.com' },
      { name: 'Meena Bazaar', website: 'https://meenabazaar.com' },
      { name: 'BIBA', website: 'https://biba.in' },
    ],
    products: [
      { name: 'Bridal Lehengas', category: 'Bridal Wear', priceRange: '₹15,000 - ₹75,000', description: 'Exquisite bridal lehengas with hand embroidery and mirror work.' },
      { name: 'Designer Anarkalis', category: 'Ethnic Wear', priceRange: '₹3,500 - ₹12,000', description: 'Floor-length anarkali suits with dupatta sets.' },
    ],
    usps: ['Handcrafted embroidery', 'International shipping', 'Virtual styling sessions'],
  },
  '19': {
    companyName: 'Knickgasm',
    website: 'https://knickgasm.com',
    industry: 'E-Commerce',
    targetAudience: 'Women 18-35, Lingerie & innerwear, Comfort-first',
    monthlyAdBudget: '₹3.5L - ₹4.5L',
    targetLocation: ['Pan India'],
    primaryGoal: 'E-Commerce Sales',
    competitors: [
      { name: 'Clovia', website: 'https://clovia.com' },
      { name: 'Zivame', website: 'https://zivame.com' },
      { name: 'Amante', website: 'https://amante.in' },
    ],
    products: [
      { name: 'Everyday Bralette', category: 'Innerwear', priceRange: '₹500 - ₹1,200', description: 'Wire-free bralettes designed for all-day comfort and support.' },
      { name: 'Loungewear Sets', category: 'Sleepwear', priceRange: '₹800 - ₹1,800', description: 'Soft cotton loungewear sets in pastel shades.' },
    ],
    usps: ['Size calculator with 98% accuracy', 'Discreet packaging', 'Easy 30-day exchange'],
  },
};

// Lead Gen business info keyed by client id
const clientLeadGenBusinessInfo: Record<string, LeadGenBusinessInfoData> = {
  '3': {
    companyName: 'Mahesh Interior',
    website: 'https://maheshinterior.com',
    industry: 'Interior Design',
    primaryServiceOffered: 'Residential & Commercial Interior Design',
    serviceAreas: ['Mumbai', 'Navi Mumbai', 'Thane', 'Pune'],
    monthlyAdBudget: '₹2L - ₹3L',
    averageDealValue: '₹5L - ₹15L',
    monthlyLeadVolumeTarget: '80-120 leads',
    competitors: [
      { name: 'Livspace', website: 'https://livspace.com', keyOffering: 'End-to-end interior design with modular solutions' },
      { name: 'HomeLane', website: 'https://homelane.com', keyOffering: 'Budget-friendly modular interiors with financing' },
      { name: 'Design Cafe', website: 'https://designcafe.com', keyOffering: 'Premium turnkey interior solutions' },
    ],
    services: [
      { name: 'Full Home Interior', avgDealValue: '₹12L', avgSalesCycle: '2-3 months' },
      { name: 'Modular Kitchen', avgDealValue: '₹3.5L', avgSalesCycle: '3-4 weeks' },
      { name: 'Office Interior', avgDealValue: '₹8L', avgSalesCycle: '1-2 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Email', 'Site Visit'],
  },
  '7': {
    companyName: 'Una Homes LLP',
    website: 'https://unahomes.in',
    industry: 'Real Estate',
    primaryServiceOffered: 'Premium Residential Properties',
    serviceAreas: ['Mumbai', 'Alibag', 'Goa'],
    monthlyAdBudget: '₹5L - ₹8L',
    averageDealValue: '₹50L - ₹2Cr',
    monthlyLeadVolumeTarget: '40-60 leads',
    competitors: [
      { name: 'Lodha Group', website: 'https://lodhagroup.in', keyOffering: 'Luxury high-rise apartments' },
      { name: 'Godrej Properties', website: 'https://godrejproperties.com', keyOffering: 'Trust factor with sustainable developments' },
      { name: 'Oberoi Realty', website: 'https://oberoirealty.com', keyOffering: 'Ultra-premium residences' },
    ],
    services: [
      { name: 'Luxury Villa Sales', avgDealValue: '₹1.5Cr', avgSalesCycle: '3-6 months' },
      { name: 'Premium Apartments', avgDealValue: '₹75L', avgSalesCycle: '2-4 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: false },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit'],
  },
  '10': {
    companyName: 'Third Eye Brands & Concepts',
    website: 'https://thirdeyebrands.com',
    industry: 'Branding & Marketing',
    primaryServiceOffered: 'Brand Strategy & Creative Consulting',
    serviceAreas: ['Pan India', 'International'],
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    averageDealValue: '₹2L - ₹8L',
    monthlyLeadVolumeTarget: '30-50 leads',
    competitors: [
      { name: 'WATConsult', website: 'https://watconsult.com', keyOffering: 'Digital-first brand solutions' },
      { name: 'Schbang', website: 'https://schbang.com', keyOffering: 'Integrated creative + performance marketing' },
      { name: 'Social Beat', website: 'https://socialbeat.in', keyOffering: 'Data-driven digital marketing' },
    ],
    services: [
      { name: 'Brand Identity Package', avgDealValue: '₹5L', avgSalesCycle: '3-4 weeks' },
      { name: 'Creative Campaign', avgDealValue: '₹3L', avgSalesCycle: '2-3 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call'],
  },
  '11': {
    companyName: 'Bybit Technologies',
    website: 'https://bybit.tech',
    industry: 'Technology',
    primaryServiceOffered: 'Enterprise Software Solutions',
    serviceAreas: ['Mumbai', 'Bangalore', 'Hyderabad', 'Delhi NCR'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹10L - ₹25L',
    monthlyLeadVolumeTarget: '20-35 leads',
    competitors: [
      { name: 'TCS Digital', website: 'https://tcs.com', keyOffering: 'Large-scale enterprise transformation' },
      { name: 'Zoho', website: 'https://zoho.com', keyOffering: 'Affordable SaaS business suite' },
      { name: 'Freshworks', website: 'https://freshworks.com', keyOffering: 'Modern cloud-native CRM & ITSM' },
    ],
    services: [
      { name: 'Custom ERP Development', avgDealValue: '₹20L', avgSalesCycle: '2-3 months' },
      { name: 'Cloud Migration', avgDealValue: '₹8L', avgSalesCycle: '4-6 weeks' },
      { name: 'SaaS Product Development', avgDealValue: '₹15L', avgSalesCycle: '3-4 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call', 'LinkedIn'],
  },
  '18': {
    companyName: 'ISPAN Services',
    website: 'https://ispanservices.com',
    industry: 'IT Services',
    primaryServiceOffered: 'Managed IT & Cloud Infrastructure',
    serviceAreas: ['Mumbai', 'Pune', 'Bangalore'],
    monthlyAdBudget: '₹2L - ₹3.5L',
    averageDealValue: '₹5L - ₹12L',
    monthlyLeadVolumeTarget: '25-40 leads',
    competitors: [
      { name: 'Rackspace', website: 'https://rackspace.com', keyOffering: 'Multi-cloud managed services' },
      { name: 'Ctrl S', website: 'https://ctrls.in', keyOffering: 'Tier 4 data centre hosting' },
      { name: 'Netmagic (NTT)', website: 'https://netmagic.com', keyOffering: 'Hybrid cloud & colocation' },
    ],
    services: [
      { name: 'Managed Cloud Hosting', avgDealValue: '₹8L', avgSalesCycle: '3-4 weeks' },
      { name: 'IT Infrastructure Setup', avgDealValue: '₹6L', avgSalesCycle: '2-3 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'WhatsApp'],
  },
  '20': {
    companyName: 'Maharishi Ayurveda Hospitals',
    website: 'https://maharishiayurveda.in',
    industry: 'Healthcare',
    primaryServiceOffered: 'Ayurvedic Treatment & Wellness Programs',
    serviceAreas: ['Delhi NCR', 'Noida', 'Gurgaon', 'Jaipur'],
    monthlyAdBudget: '₹3L - ₹4.5L',
    averageDealValue: '₹30K - ₹2L',
    monthlyLeadVolumeTarget: '150-250 leads',
    competitors: [
      { name: 'Jiva Ayurveda', website: 'https://jiva.com', keyOffering: 'Online Ayurveda consultations' },
      { name: 'Kottakkal Arya Vaidya Sala', website: 'https://aryavaidyasala.com', keyOffering: 'Heritage Ayurveda treatments' },
      { name: 'Patanjali Wellness', website: 'https://patanjaliayurved.net', keyOffering: 'Affordable Ayurveda at scale' },
    ],
    services: [
      { name: 'Panchakarma Therapy', avgDealValue: '₹1.2L', avgSalesCycle: '1-2 weeks' },
      { name: 'Chronic Disease Management', avgDealValue: '₹80K', avgSalesCycle: '1-2 weeks' },
      { name: 'Wellness Retreat Packages', avgDealValue: '₹50K', avgSalesCycle: '3-5 days' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'SMS'],
  },
  '23': {
    companyName: 'Mercury Air Conditioners',
    website: 'https://mercuryac.in',
    industry: 'HVAC',
    primaryServiceOffered: 'AC Sales, Installation & AMC',
    serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune'],
    monthlyAdBudget: '₹1.5L - ₹2.5L',
    averageDealValue: '₹50K - ₹3L',
    monthlyLeadVolumeTarget: '100-180 leads',
    competitors: [
      { name: 'Daikin India', website: 'https://daikinindia.com', keyOffering: 'Energy-efficient inverter ACs' },
      { name: 'Blue Star', website: 'https://bluestarindia.com', keyOffering: 'Commercial HVAC expertise' },
      { name: 'Voltas', website: 'https://voltas.com', keyOffering: 'Affordable cooling solutions' },
    ],
    services: [
      { name: 'Commercial HVAC Installation', avgDealValue: '₹2.5L', avgSalesCycle: '2-3 weeks' },
      { name: 'Residential AC Sales', avgDealValue: '₹60K', avgSalesCycle: '3-5 days' },
      { name: 'Annual Maintenance Contracts', avgDealValue: '₹35K', avgSalesCycle: '1 week' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: false },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit'],
  },
  '25': {
    companyName: 'MyScaai Bharat Construction',
    website: 'https://myscaai.com',
    industry: 'Construction',
    primaryServiceOffered: 'Residential & Commercial Construction',
    serviceAreas: ['Mumbai', 'Pune', 'Nashik', 'Nagpur'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹20L - ₹1Cr',
    monthlyLeadVolumeTarget: '30-50 leads',
    competitors: [
      { name: 'Shapoorji Pallonji', website: 'https://shapoorjipallonji.com', keyOffering: 'Legacy construction with trusted brand' },
      { name: 'L&T Construction', website: 'https://lntecc.com', keyOffering: 'Large-scale infrastructure projects' },
      { name: 'Hiranandani Builders', website: 'https://hiranandani.com', keyOffering: 'Township development expertise' },
    ],
    services: [
      { name: 'Custom Home Construction', avgDealValue: '₹50L', avgSalesCycle: '2-4 months' },
      { name: 'Commercial Building Projects', avgDealValue: '₹80L', avgSalesCycle: '3-6 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Site Visit', 'Email'],
  },
  '27': {
    companyName: 'Pytheos Health Systems',
    website: 'https://pytheos.in',
    industry: 'HealthTech',
    primaryServiceOffered: 'Hospital Management Software & Digital Health',
    serviceAreas: ['Pan India'],
    monthlyAdBudget: '₹2.5L - ₹4L',
    averageDealValue: '₹8L - ₹20L',
    monthlyLeadVolumeTarget: '15-30 leads',
    competitors: [
      { name: 'Practo', website: 'https://practo.com', keyOffering: 'Doctor discovery + clinic management' },
      { name: 'eHospital Systems', website: 'https://ehospital.in', keyOffering: 'Affordable HMS for small hospitals' },
      { name: 'Insta by Practo', website: 'https://insta.practo.com', keyOffering: 'Enterprise hospital ERP' },
    ],
    services: [
      { name: 'Hospital Management System', avgDealValue: '₹15L', avgSalesCycle: '2-3 months' },
      { name: 'Telemedicine Platform', avgDealValue: '₹6L', avgSalesCycle: '4-6 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Email', 'Phone Call', 'Video Call', 'LinkedIn'],
  },
  '32': {
    companyName: 'Thai naam',
    website: 'https://thaiinaam.com',
    industry: 'Food & Beverage',
    primaryServiceOffered: 'Thai Restaurant & Cloud Kitchen',
    serviceAreas: ['Mumbai', 'Pune'],
    monthlyAdBudget: '₹1L - ₹2L',
    averageDealValue: '₹800 - ₹2,500',
    monthlyLeadVolumeTarget: '500-800 leads',
    competitors: [
      { name: 'Mamagoto', website: 'https://mamagoto.in', keyOffering: 'Pan-Asian dining experience' },
      { name: 'Busaba', website: 'https://busaba.in', keyOffering: 'Authentic Thai street food' },
      { name: 'Soy Street', website: 'https://soystreet.in', keyOffering: 'Budget Asian cuisine' },
    ],
    services: [
      { name: 'Dine-in Reservations', avgDealValue: '₹1,500', avgSalesCycle: 'Same day' },
      { name: 'Catering Orders', avgDealValue: '₹15K', avgSalesCycle: '3-5 days' },
      { name: 'Corporate Meal Plans', avgDealValue: '₹40K', avgSalesCycle: '1-2 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: false },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['WhatsApp', 'Phone Call', 'Instagram DM'],
  },
  '33': {
    companyName: 'The Derm Clinic',
    website: 'https://thedermclinic.in',
    industry: 'Dermatology',
    primaryServiceOffered: 'Skin & Hair Treatment Consultations',
    serviceAreas: ['Mumbai', 'Thane', 'Navi Mumbai'],
    monthlyAdBudget: '₹2.5L - ₹3.5L',
    averageDealValue: '₹15K - ₹1L',
    monthlyLeadVolumeTarget: '200-350 leads',
    competitors: [
      { name: 'Kaya Skin Clinic', website: 'https://kaya.in', keyOffering: 'Nationwide chain with standardised treatments' },
      { name: 'VLCC', website: 'https://vlccwellness.com', keyOffering: 'Wellness + beauty combo packages' },
      { name: 'Oliva Clinic', website: 'https://olivaclinic.com', keyOffering: 'Advanced laser dermatology' },
    ],
    services: [
      { name: 'Laser Hair Removal', avgDealValue: '₹60K', avgSalesCycle: '1-2 weeks' },
      { name: 'Acne & Scar Treatment', avgDealValue: '₹35K', avgSalesCycle: '1 week' },
      { name: 'Hair Loss Consultation', avgDealValue: '₹25K', avgSalesCycle: '3-5 days' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: false },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'SMS'],
  },
  '34': {
    companyName: 'Unigo',
    website: 'https://unigo.co.in',
    industry: 'Education',
    primaryServiceOffered: 'Study Abroad Counselling & Visa Assistance',
    serviceAreas: ['Mumbai', 'Delhi NCR', 'Bangalore', 'Hyderabad', 'Chennai'],
    monthlyAdBudget: '₹3L - ₹5L',
    averageDealValue: '₹1L - ₹3L',
    monthlyLeadVolumeTarget: '300-500 leads',
    competitors: [
      { name: 'IDP Education', website: 'https://idp.com', keyOffering: 'IELTS testing + global university partnerships' },
      { name: 'Leverage Edu', website: 'https://leverageedu.com', keyOffering: 'AI-driven university matching' },
      { name: 'Yocket', website: 'https://yocket.com', keyOffering: 'Community-driven study abroad platform' },
    ],
    services: [
      { name: 'University Admissions', avgDealValue: '₹2L', avgSalesCycle: '2-4 weeks' },
      { name: 'Visa Processing', avgDealValue: '₹50K', avgSalesCycle: '2-3 weeks' },
      { name: 'Test Prep (IELTS/GRE)', avgDealValue: '₹30K', avgSalesCycle: '1-2 weeks' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: true },
      { label: 'Location match', active: false },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'WhatsApp', 'Email', 'Video Call'],
  },
  '37': {
    companyName: 'TREC',
    website: 'https://trec.co.in',
    industry: 'Real Estate',
    primaryServiceOffered: 'Commercial & Retail Real Estate Consulting',
    serviceAreas: ['Mumbai', 'Pune', 'Bangalore'],
    monthlyAdBudget: '₹2L - ₹3.5L',
    averageDealValue: '₹25L - ₹1Cr',
    monthlyLeadVolumeTarget: '20-40 leads',
    competitors: [
      { name: 'CBRE India', website: 'https://cbre.co.in', keyOffering: 'Global commercial real estate network' },
      { name: 'JLL India', website: 'https://jll.co.in', keyOffering: 'End-to-end property management' },
      { name: 'Cushman & Wakefield', website: 'https://cushmanwakefield.com', keyOffering: 'Corporate real estate advisory' },
    ],
    services: [
      { name: 'Commercial Leasing', avgDealValue: '₹50L', avgSalesCycle: '2-4 months' },
      { name: 'Retail Space Consulting', avgDealValue: '₹30L', avgSalesCycle: '1-3 months' },
    ],
    leadQualificationCriteria: [
      { label: 'Budget confirmed', active: true },
      { label: 'Decision-maker identified', active: true },
      { label: 'Timeline within 30 days', active: false },
      { label: 'Location match', active: true },
      { label: 'Service need validated', active: true },
    ],
    followUpChannels: ['Phone Call', 'Email', 'Site Visit', 'Video Call'],
  },
};

// ── Kickoff Modal Types ──
interface KickoffMetrics {
  adSpend: string;
  roas: string;
  revenue: string;
  orders: string;
  aov: string;
  leads: string;
  cpl: string;
  ctr: string;
}

const pmEmployeePool = [
  { id: 'e1', name: 'Rajesh Kumar', role: 'HOD/Sr. Manager' },
  { id: 'e2', name: 'Meera Nair', role: 'HOD/Sr. Manager' },
  { id: 'e3', name: 'Priya Sharma', role: 'Manager' },
  { id: 'e4', name: 'Kavya Iyer', role: 'Manager' },
  { id: 'e5', name: 'Arjun Mehta', role: 'Manager' },
  { id: 'e6', name: 'Rohan Desai', role: 'Sr. Executive' },
  { id: 'e7', name: 'Ishaan Joshi', role: 'Sr. Executive' },
  { id: 'e8', name: 'Aditya Verma', role: 'Sr. Executive' },
  { id: 'e9', name: 'Sneha Patel', role: 'Jr. Executive' },
  { id: 'e10', name: 'Vikram Singh', role: 'Jr. Executive' },
  { id: 'e11', name: 'Ananya Reddy', role: 'Graphic Designer' },
  { id: 'e12', name: 'Karan Malhotra', role: 'Graphic Designer' },
  { id: 'e13', name: 'Neha Kapoor', role: 'Video Editor' },
  { id: 'e14', name: 'Siddharth Shah', role: 'Video Editor' },
  { id: 'e15', name: 'Amit Verma', role: 'Video Shooter' },
  { id: 'e16', name: 'Akash Patel', role: 'Motion Graphics' },
];

const pmRoleSlots = [
  { role: 'HOD/Sr. Manager', required: true },
  { role: 'Manager', required: true },
  { role: 'Sr. Executive', required: true },
  { role: 'Jr. Executive', required: true },
  { role: 'Graphic Designer', required: false },
  { role: 'Video Editor', required: false },
  { role: 'Video Shooter', required: false },
  { role: 'Motion Graphics', required: false },
];

// ── Date helpers ──
function formatQCDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${day}${suffix} ${month}`;
}

function addDays(iso: string, days: number): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Today as ISO (yyyy-mm-dd) — local-time, midnight-aligned
function todayISO(): string {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return t.toISOString().split('T')[0];
}

// Signed days between today and target ISO (positive = future, negative = past)
function daysFromToday(iso: string): number | null {
  if (!iso) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

// Plain-English relative label + tone for Next QC.
// Always uses "days" — no abbreviations, no unit-switching to months. A QC that
// is more than ~30 days overdue would never happen in practice (someone would
// have escalated long before), but we still degrade gracefully by capping the
// label at "30+ days overdue" instead of showing nonsensical month counts.
type QCTone = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'normal';
function getQCStatus(nextISO: string): { label: string; tone: QCTone } {
  const diff = daysFromToday(nextISO);
  if (diff === null) return { label: '', tone: 'normal' };
  if (diff < 0) {
    const past = Math.abs(diff);
    if (past > 30) return { label: '30+ days overdue', tone: 'overdue' };
    return { label: past === 1 ? '1 day overdue' : `${past} days overdue`, tone: 'overdue' };
  }
  if (diff === 0) return { label: 'Today', tone: 'today' };
  if (diff === 1) return { label: 'Tomorrow', tone: 'tomorrow' };
  if (diff <= 7) return { label: `in ${diff} days`, tone: 'soon' };
  if (diff <= 30) return { label: `in ${diff} days`, tone: 'normal' };
  return { label: '', tone: 'normal' };
}

// Long-form date for the popover preview ("3 Mar 2025")
function formatLongDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

const mockClients: Client[] = [
  // Clients with businessInfo data → Complete | Pending kickoff → Pending | Some mid-way → In Progress
  { id: '1', name: 'Elan by Aanchal', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-09', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-03', comments: '' },
  { id: '2', name: 'July Issue', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-15', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '3', name: 'Mahesh Interior', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-10', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '4', name: 'Nor Black Nor White', team: [], clientTypes: ['Ecommerce'], onboardingStatus: 'Pending', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '5', name: 'Skin Essentials', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-20', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-18', comments: '' },
  { id: '6', name: 'True Diamond', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-05', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '7', name: 'Una Homes LLP', team: [], clientTypes: ['Lead generation'], onboardingStatus: 'In Progress', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '8', name: 'Crystallicious', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-12', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '9', name: 'Bio Basket', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-22', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-24', comments: '' },
  { id: '10', name: 'Third Eye Brands & Concepts', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-04', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '11', name: 'Bybit Technologies', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-09', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', planStartDate: '2026-03-01', comments: '' },
  { id: '12', name: 'JM Group', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-18', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '13', name: 'Enagenbio', team: [], clientTypes: ['Lead generation'], onboardingStatus: 'Pending', kickoffStatus: 'Pending', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '' },
  { id: '14', name: 'House of Saloni', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-11', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '15', name: 'Inkling & Co.', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-01', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '16', name: 'Ivaana Ventures (Aerome)', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-14', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '17', name: 'Ivaana Ventures (Scentitude)', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-21', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '18', name: 'ISPAN Services', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-07', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '19', name: 'Knickgasm', team: [{ initials: 'RK', color: '#0891b2' }, { initials: 'PS', color: '#f59e0b' }, { initials: 'SR', color: '#ec4899' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Onboarding', lastQC: '', ksmTarget: 'Miss', growthPlanStatus: 'Not Started', comments: '', kickoffData: { assignments: { 'HOD/Sr. Manager': 'e1', 'Manager': 'e3', 'Sr. Executive': 'e6', 'Jr. Executive': 'e9' }, proposedMetrics: { adSpend: '400000', roas: '4.5', revenue: '1800000', orders: '800', aov: '2250', leads: '', cpl: '', ctr: '' }, clientMetrics: { adSpend: '350000', roas: '5.0', revenue: '1750000', orders: '700', aov: '2500', leads: '', cpl: '', ctr: '' }, clientNotes: { adSpend: 'We\'d prefer starting conservative on spend and scaling once we see consistent results.', roas: 'We expect a higher return ratio to justify the investment to our board.', revenue: 'Slightly lower is fine if we maintain better margins.', orders: 'Fewer orders is acceptable if AOV is higher.' }, hasClientResponse: true } },
  // Multi-type: Lead-gen for hospital appointments (primary) + D2C ecom for Ayurveda products
  { id: '20', name: 'Maharishi Ayurveda Hospitals', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Lead generation', 'Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-16', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '21', name: 'Meeami Fashion', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-13', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '22', name: 'Littlewoods Kidswear', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-09', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '23', name: 'Mercury Air Conditioners', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-06', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '24', name: 'Mood Lift', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-19', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '25', name: 'MyScaai Bharat Construction', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-03-30', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  // Multi-type: D2C supplement ecom (primary) + lead-gen for clinic/distributor enquiries
  { id: '26', name: 'Nuvida Lifescience', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce', 'Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-17', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '27', name: 'Pytheos Health Systems', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-22', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '28', name: 'J Pearls', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-08', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '29', name: 'Runwave Creations', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-10', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '30', name: 'SVVAYAM', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-12', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '31', name: 'The Anaya Collections', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-21', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '32', name: 'Thai naam', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-03', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  // Multi-type: Consultation lead-gen (primary) + skincare product ecom
  { id: '33', name: 'The Derm Clinic', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'AK', color: '#3b82f6' }], clientTypes: ['Lead generation', 'Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-15', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '34', name: 'Unigo', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'RK', color: '#0891b2' }, { initials: 'TG', color: '#f97316' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-20', ksmTarget: 'Hit', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
  { id: '35', name: 'Valiente Caps', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'AS', color: '#475569' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Ecommerce'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-10', ksmTarget: 'Miss', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  // Multi-type: Wellness product ecom (primary) + lead-gen for retreats/programs
  { id: '36', name: 'Veya Wellness', team: [{ initials: 'JD', color: '#1e293b' }, { initials: 'AS', color: '#475569' }, { initials: 'KI', color: '#06b6d4' }], clientTypes: ['Ecommerce', 'Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-18', ksmTarget: 'Hit', growthPlanStatus: 'Sent', planStartDate: '2026-03-01', comments: '' },
  { id: '37', name: 'TREC', team: [{ initials: 'PM', color: '#7c3aed' }, { initials: 'RK', color: '#0891b2' }, { initials: 'DM', color: '#8b5cf6' }], clientTypes: ['Lead generation'], onboardingStatus: 'Complete', kickoffStatus: 'Done', lastQC: '2026-04-02', ksmTarget: 'Miss', growthPlanStatus: 'In Progress', planStartDate: '2026-03-01', comments: '' },
];

// MonthPicker and MonthNavigator are now shared from ./shared/

// ── Filter Panel Component ───────────────────────────────────────────
// Design notes (post-critique rewrite):
//   • State applies live on every click — there is NO Apply/Cancel because
//     the previous footer was misleading (both buttons just closed the panel).
//     Outside-click and Escape close the panel.
//   • Each section has its own "Clear" affordance, surfaced only when the
//     section is narrowing the table. Reset all sits in the sticky header.
//   • Team Member is multi-select (state is string[]). A HOD can scope to
//     "Aarti OR Priya" in one go. Each row is an avatar list item with a
//     checkbox-style indicator — same visual language as the table cell.
//   • Body is `max-h` + `overflow-y-auto` so adding more sections (workstation,
//     vertical, HOD…) doesn't break the panel. Header stays sticky.
//   • Typography uses `text-caption` (13px) per design system — no `text-micro`.
//   • a11y: every toggle exposes `aria-pressed`, every Clear has `aria-label`,
//     focus rings are visible, dialog has `role="dialog"` + `aria-label`.
function FilterPanel({
  filters,
  onChange,
  onClose,
  onReset,
  activeCount,
}: {
  filters: { clientType: ClientType | 'All'; ksmTarget: KSMStatus | 'All'; team: string[]; kickoffStatus: KickoffStatus | 'All'; onboarding: OnboardingStatus | 'All' };
  onChange: (f: typeof filters) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Outside-click closes the panel (state already applied live).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Escape also closes — pairs with outside-click for keyboard users.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Roster comes from the module-level SEM_TEAM constant — one source of
  // truth shared with the table's hover popover and active filter chips.
  const teamMembers = SEM_TEAM;

  // Local search query for the team list. Type-ahead is the single biggest
  // scalability lever: at 12+ members linear scan stops being viable.
  const [teamSearch, setTeamSearch] = useState('');

  // Multi-select team: toggle one initial in/out of the selection array.
  const toggleTeam = (initials: string) => {
    const next = filters.team.includes(initials)
      ? filters.team.filter(i => i !== initials)
      : [...filters.team, initials];
    onChange({ ...filters, team: next });
  };

  // Build the visible list. Search matches against name OR initials (case-
  // insensitive). When the query is empty we render selected-first so the
  // user's picks never scroll out of view; with a query we sort by relevance
  // (initials prefix > name prefix > substring) so the obvious match leads.
  const roleOrder = ['HOD', 'Manager', 'Sr. Executive', 'Executive', 'Jr. Executive'];
  const q = teamSearch.trim().toLowerCase();
  const matches = q
    ? teamMembers.filter(tm => tm.name.toLowerCase().includes(q) || tm.initials.toLowerCase().includes(q))
    : teamMembers;
  const teamSelected = matches.filter(tm => filters.team.includes(tm.initials));
  const teamRest = matches.filter(tm => !filters.team.includes(tm.initials));
  const byRoleThenName = (a: typeof teamMembers[number], b: typeof teamMembers[number]) => {
    const ar = roleOrder.indexOf(a.role); const br = roleOrder.indexOf(b.role);
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  };
  teamSelected.sort(byRoleThenName);
  teamRest.sort(byRoleThenName);

  // Section header with optional inline "Clear" — appears only when the
  // section is currently narrowing results. Keeps the panel calm by default
  // and gives a faster reset path than the global "Reset all".
  const SectionHeader = ({
    label,
    count,
    onClear,
  }: { label: string; count?: number; onClear?: () => void }) => (
    <div className="flex items-center justify-between mb-2.5 min-h-[18px]">
      <div className="flex items-center gap-1.5">
        <span className="text-black/45 text-caption font-semibold uppercase tracking-[0.06em]">{label}</span>
        {typeof count === 'number' && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#204CC7] text-white text-caption font-bold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          aria-label={`Clear ${label} filter`}
          className="text-[#204CC7] hover:bg-[#EEF1FB] rounded-md px-1.5 py-0.5 text-caption font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
        >
          Clear
        </button>
      )}
    </div>
  );

  // Pill button shared shape — keeps every section visually consistent and
  // makes adding new filter dimensions a one-call affair.
  const Pill = ({
    active, onClick, ariaLabel, activeClass, children,
  }: {
    active: boolean;
    onClick: () => void;
    ariaLabel?: string;
    activeClass: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-caption font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 ${
        active ? activeClass : 'bg-black/[0.03] text-black/65 hover:bg-black/[0.06]'
      }`}
    >
      {children}
    </button>
  );

  // Team list row — extracted because we render it in two passes
  // (pinned-selected, then the rest) and inlining the markup twice would
  // make the section impossible to reason about. Same row shape works at
  // any roster size because role label + truncation prevent overflow.
  const TeamRow = ({
    tm, active, onToggle,
  }: {
    tm: { initials: string; name: string; color: string; role: string };
    active: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`${active ? 'Deselect' : 'Select'} ${tm.name}, ${tm.role}`}
      className={`flex items-center gap-2.5 pl-1.5 pr-2 py-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 ${
        active ? 'bg-[#EEF1FB]' : 'hover:bg-black/[0.03]'
      }`}
    >
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-caption font-semibold flex-shrink-0"
        style={{ backgroundColor: tm.color }}
        aria-hidden="true"
      >
        {tm.initials}
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-caption font-semibold truncate leading-snug ${active ? 'text-[#204CC7]' : 'text-black/85'}`}>
          {tm.name}
        </span>
        <span className="block text-caption text-black/45 truncate leading-snug">
          {tm.role}
        </span>
      </span>
      <span
        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
          active ? 'bg-[#204CC7] border-[#204CC7]' : 'border-black/15 bg-white'
        }`}
        aria-hidden="true"
      >
        {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
    </button>
  );

  // "All" reset class — used for every section's "All" pill so the default
  // state has a single, recognizable look across the panel.
  const ALL_ACTIVE = 'bg-[#EEF1FB] text-[#204CC7]';

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Filter clients"
      className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-black/[0.10] border border-black/[0.06] z-50 w-[360px] flex flex-col max-h-[min(560px,calc(100vh-140px))] overflow-hidden"
    >
      {/* ── Sticky header ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-black/65" aria-hidden="true" />
          <span className="text-black/85 text-body font-semibold">Filters</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#204CC7] text-white text-caption font-bold tabular-nums">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onReset}
            disabled={activeCount === 0}
            className="px-2.5 h-7 text-[#204CC7] hover:bg-[#EEF1FB] rounded-lg transition-colors text-caption font-medium disabled:text-black/25 disabled:hover:bg-transparent disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="w-7 h-7 flex items-center justify-center hover:bg-black/[0.04] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
          >
            <X className="w-4 h-4 text-black/55" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────── */}
      <div className="overflow-y-auto px-5 py-4 space-y-5">

        {/* CLIENT TYPE — single-select. Multi-type clients (e.g. Maharishi
            Ayurveda) appear in BOTH Ecommerce and Lead generation segments. */}
        <section>
          <SectionHeader
            label="Client type"
            onClear={filters.clientType !== 'All' ? () => onChange({ ...filters, clientType: 'All' }) : undefined}
          />
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Ecommerce', 'Lead generation'] as const).map(opt => (
              <Pill
                key={opt}
                active={filters.clientType === opt}
                onClick={() => onChange({ ...filters, clientType: opt })}
                activeClass={ALL_ACTIVE}
              >
                {opt}
              </Pill>
            ))}
          </div>
        </section>

        {/* ONBOARDING — drives the row's left-side status pill. */}
        <section>
          <SectionHeader
            label="Onboarding"
            onClear={filters.onboarding !== 'All' ? () => onChange({ ...filters, onboarding: 'All' }) : undefined}
          />
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'In Progress', 'Complete'] as const).map(opt => {
              const active = filters.onboarding === opt;
              const dot = opt === 'Complete' ? 'bg-emerald-500' : opt === 'In Progress' ? 'bg-amber-500' : '';
              const activeClass =
                opt === 'Complete' ? 'bg-emerald-50 text-emerald-700'
                : opt === 'In Progress' ? 'bg-amber-50 text-amber-700'
                : ALL_ACTIVE;
              return (
                <Pill key={opt} active={active} onClick={() => onChange({ ...filters, onboarding: opt })} activeClass={activeClass}>
                  {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />}
                  {opt}
                </Pill>
              );
            })}
          </div>
        </section>

        {/* KSM TARGET — Hit/Miss matches the table's pill colors. */}
        <section>
          <SectionHeader
            label="KSM target"
            onClear={filters.ksmTarget !== 'All' ? () => onChange({ ...filters, ksmTarget: 'All' }) : undefined}
          />
          <div className="flex flex-wrap gap-1.5">
            {(['All', 'Hit', 'Miss'] as const).map(opt => {
              const active = filters.ksmTarget === opt;
              const dot = opt === 'Hit' ? 'bg-emerald-500' : opt === 'Miss' ? 'bg-rose-500' : '';
              const activeClass =
                opt === 'Hit' ? 'bg-emerald-50 text-emerald-700'
                : opt === 'Miss' ? 'bg-rose-50 text-rose-700'
                : ALL_ACTIVE;
              return (
                <Pill key={opt} active={active} onClick={() => onChange({ ...filters, ksmTarget: opt })} activeClass={activeClass}>
                  {opt !== 'All' && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />}
                  {opt}
                </Pill>
              );
            })}
          </div>
        </section>

        {/* TEAM — multi-select, scales to 30+ members.
            Layered scalability stack:
              1. Search input (initials OR name, case-insensitive).
              2. Selected members pinned to the top — they never scroll out
                 of view, so you can always read what you've narrowed by.
              3. Inner scroll container (max-h ≈ 6 rows) keeps the panel
                 compact regardless of roster size.
              4. Role label next to name disambiguates duplicate first names
                 ("Priya M (Sr. Exec)" vs "Pooja S (Exec)") at a glance.
              5. Empty state for failed searches with a one-click reset. */}
        <section>
          <SectionHeader
            label="Team"
            count={filters.team.length}
            onClear={filters.team.length > 0 ? () => { onChange({ ...filters, team: [] }); setTeamSearch(''); } : undefined}
          />

          {/* Search input — visible always; below 5 members it's harmless,
              above 10 it's essential. Clear button surfaces only with input. */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search by name or initials"
              aria-label="Search team members"
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-black/[0.03] border border-transparent text-caption text-black/85 placeholder:text-black/40 focus:outline-none focus:bg-white focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
            />
            {teamSearch && (
              <button
                onClick={() => setTeamSearch('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md hover:bg-black/[0.06] text-black/55 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Helper text only when nothing is selected and no search — keeps
              the panel quiet during active narrowing. */}
          {filters.team.length === 0 && !teamSearch && (
            <p className="text-caption text-black/45 mb-1.5">Pick one or more — results match any selected member.</p>
          )}

          {/* Inner scroll container — caps the section's vertical footprint
              so the team list never dominates the panel even at 30+ rows.
              Items render in two visually-separated groups: pinned-selected
              first, then the remainder. The divider only shows when both
              groups have content (otherwise it would be a stray line). */}
          <div
            role="group"
            aria-label="Team member"
            className="max-h-[280px] overflow-y-auto -mx-1 px-1 flex flex-col gap-0.5"
          >
            {/* Empty state — search returned nothing. Action button so the
                user can reset without hunting for the X. */}
            {matches.length === 0 && (
              <div className="px-2 py-6 text-center">
                <p className="text-caption text-black/55">
                  No teammates match <span className="font-semibold text-black/75">"{teamSearch}"</span>
                </p>
                <button
                  onClick={() => setTeamSearch('')}
                  className="mt-1.5 text-caption font-medium text-[#204CC7] hover:underline focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 rounded-sm px-1"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Pinned: selected members. Always visible, never scrolled away. */}
            {teamSelected.map(tm => (
              <TeamRow
                key={`sel-${tm.initials}`}
                tm={tm}
                active
                onToggle={() => toggleTeam(tm.initials)}
              />
            ))}

            {/* Subtle divider — only when both groups have content. */}
            {teamSelected.length > 0 && teamRest.length > 0 && (
              <div className="my-1 border-t border-black/[0.06]" role="separator" aria-hidden="true" />
            )}

            {/* The rest of the (filtered) roster. */}
            {teamRest.map(tm => (
              <TeamRow
                key={tm.initials}
                tm={tm}
                active={false}
                onToggle={() => toggleTeam(tm.initials)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}


// ── Kickoff Modal Component ──
// ── Metric field config helper ──
type MetricFieldDef = { key: keyof KickoffMetrics; label: string; prefix?: string; suffix?: string; placeholder: string };
function getMetricFields(businessType: 'ecommerce' | 'leadgen'): MetricFieldDef[] {
  const common: MetricFieldDef = { key: 'adSpend', label: 'Ad Spend', prefix: '₹', placeholder: 'e.g. 500000' };
  if (businessType === 'ecommerce') {
    return [common, { key: 'roas', label: 'ROAS', suffix: 'x', placeholder: 'e.g. 5.0' }, { key: 'revenue', label: 'Revenue', prefix: '₹', placeholder: 'e.g. 2500000' }, { key: 'orders', label: 'Orders', placeholder: 'e.g. 1500' }, { key: 'aov', label: 'AOV', prefix: '₹', placeholder: 'e.g. 3500' }];
  }
  return [common, { key: 'leads', label: 'Leads', placeholder: 'e.g. 600' }, { key: 'cpl', label: 'CPL', prefix: '₹', placeholder: 'e.g. 700' }, { key: 'ctr', label: 'CTR', suffix: '%', placeholder: 'e.g. 3.0' }];
}
function formatMetricVal(val: string, prefix?: string, suffix?: string) {
  if (!val) return '—';
  const num = Number(val);
  const formatted = isNaN(num) ? val : (prefix === '₹' ? `₹${num.toLocaleString('en-IN')}` : num.toLocaleString('en-IN'));
  return suffix ? `${formatted}${suffix}` : formatted;
}

// ── Seed data for clients that already have a plan (keyed by 0-based week index) ──
const seedGrowthPlans: Record<string, GrowthPlanData> = {
  // Elan by Aanchal — established client, full-month April plan
  '1': {
    0: {
      whatsHappening: 'Kicking off April strong — launching fresh campaigns and refreshing creatives across all channels.',
      tasks: [
        { id: 't1', title: 'Launch Meta lookalike campaign', description: 'Target lookalike audiences based on top 5% of existing buyers by LTV.', done: true },
        { id: 't2', title: 'Google Shopping feed optimisation', description: 'Fix disapproved products and optimise titles and images for better CTR.', done: true },
        { id: 't3', title: 'CPA analysis — weekly report', description: 'Weekly CPA tracking helps us catch rising costs early.', done: true },
        { id: 't4', title: 'Audience segmentation refresh', description: 'Re-segment audiences by purchase recency and frequency for better targeting.', done: false },
        { id: 't5', title: 'Banner ad design — seasonal promo', description: 'Create new banner creatives for the spring/summer collection push.', done: false },
      ],
    },
    1: {
      whatsHappening: 'Scaling what works and cutting what doesn\'t — mid-month optimisation sprint.',
      tasks: [
        { id: 't6', title: 'Pause underperforming ad sets', description: 'Identify and pause ad sets with CPA 2x above target.', done: false },
        { id: 't7', title: 'Scale top 3 campaigns by 25%', description: 'Increase daily budgets on campaigns exceeding ROAS targets.', done: false },
        { id: 't8', title: 'A/B test new landing page', description: 'Test the updated product page against the current version for conversion rate.', done: false },
      ],
    },
    2: { whatsHappening: 'Retargeting push and creative refresh for the second half of the month.', tasks: [
      { id: 't9', title: 'Launch retargeting campaign', description: 'Target cart abandoners and product page visitors from the last 14 days.', done: false },
      { id: 't10', title: 'New video ad creatives', description: 'Produce 3 short-form video ads for Instagram Reels and YouTube Shorts.', done: false },
    ] },
    3: { whatsHappening: 'Month-end wrap-up — reporting, insights, and planning for next month.', tasks: [
      { id: 't11', title: 'Monthly performance report', description: 'Compile full-month metrics: spend, ROAS, revenue, orders, CPA by channel.', done: false },
      { id: 't12', title: 'Client review meeting prep', description: 'Prepare the deck with insights, wins, learnings, and next month recommendations.', done: false },
    ] },
  },
  // Skin Essentials — mid-month start (Mar 18). April is first full month.
  '5': {
    0: {
      whatsHappening: 'First full month — setting up campaign infrastructure and launching initial test campaigns.',
      tasks: [
        { id: 't13', title: 'Set up Meta Ads Manager structure', description: 'Create campaign hierarchy with proper naming conventions.', done: false },
        { id: 't14', title: 'Install and verify tracking pixels', description: 'Ensure Meta Pixel, Google Tag, and conversion events are firing correctly.', done: false },
        { id: 't15', title: 'Launch 3 test ad sets', description: 'Test different audience segments with ₹5K daily budget each.', done: false },
      ],
    },
  },
};

// ────────────── Business Info Modal ──────────────
function BusinessInfoModal({ client, onClose }: {
  client: Client;
  onClose: () => void;
}) {
  // Business-info modal currently surfaces one template at a time. Use the
  // client's primary type — adding a per-type tab is a future enhancement.
  const isLeadGen = primaryType(client) === 'Lead generation';
  const ecomInfo = !isLeadGen ? clientBusinessInfo[client.id] : null;
  const leadGenInfo = isLeadGen ? clientLeadGenBusinessInfo[client.id] : null;
  const hasInfo = !!(ecomInfo || leadGenInfo);

  const [activeTab, setActiveTab] = useState<'basic' | 'competitors' | 'products' | 'funnel'>('basic');
  const [showNudgeOverlay, setShowNudgeOverlay] = useState(false);
  const [nudgeSent, setNudgeSent] = useState(false);
  const [nudgeSending, setNudgeSending] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const accent = isLeadGen ? '#7C3AED' : '#204CC7';
  const accentBg = isLeadGen ? 'bg-purple-50' : 'bg-[#EEF1FB]';

  // ── Nudge System: detect incomplete onboarding sections ──
  const pendingItems: { label: string; category: string }[] = [];

  if (ecomInfo) {
    if (!ecomInfo.website) pendingItems.push({ label: 'Website URL', category: 'Basic Info' });
    if (!ecomInfo.targetAudience) pendingItems.push({ label: 'Target Audience', category: 'Basic Info' });
    if (!ecomInfo.monthlyAdBudget) pendingItems.push({ label: 'Monthly Ad Budget', category: 'Basic Info' });
    if (ecomInfo.targetLocation.length === 0) pendingItems.push({ label: 'Target Locations', category: 'Basic Info' });
    if (ecomInfo.competitors.length === 0) pendingItems.push({ label: 'Competitor Analysis', category: 'Competitors' });
    if (ecomInfo.products.length === 0) pendingItems.push({ label: 'Product Catalogue', category: 'Products & USPs' });
    if (ecomInfo.usps.length === 0) pendingItems.push({ label: 'Unique Selling Points', category: 'Products & USPs' });
  }
  if (leadGenInfo) {
    if (!leadGenInfo.website) pendingItems.push({ label: 'Website URL', category: 'Basic Info' });
    if (!leadGenInfo.primaryServiceOffered) pendingItems.push({ label: 'Primary Service', category: 'Basic Info' });
    if (leadGenInfo.serviceAreas.length === 0) pendingItems.push({ label: 'Service Areas', category: 'Basic Info' });
    if (!leadGenInfo.monthlyAdBudget) pendingItems.push({ label: 'Monthly Ad Budget', category: 'Basic Info' });
    if (leadGenInfo.competitors.length === 0) pendingItems.push({ label: 'Competitor Analysis', category: 'Competitors' });
    if (leadGenInfo.services.length === 0) pendingItems.push({ label: 'Services & Deal Values', category: 'Lead Funnel' });
    if (leadGenInfo.leadQualificationCriteria.length === 0) pendingItems.push({ label: 'Lead Qualification Criteria', category: 'Lead Funnel' });
    if (leadGenInfo.followUpChannels.length === 0) pendingItems.push({ label: 'Follow-up Channels', category: 'Lead Funnel' });
  }

  // Also flag if onboarding not yet complete at client level
  const onboardingIncomplete = client.onboardingStatus !== 'Complete';
  const showNudgeBanner = onboardingIncomplete || pendingItems.length > 0;

  const nudgeCompanyName = ecomInfo?.companyName || leadGenInfo?.companyName || client.name;
  const clientChannelSlug = nudgeCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const generatePMNudgeMessage = () => {
    const lines: string[] = [];
    lines.push(`Hi ${nudgeCompanyName} team! 👋`);
    lines.push('');

    if (pendingItems.length > 0) {
      lines.push(`We're reviewing your business profile and noticed a few sections still need your input to get your ${isLeadGen ? 'lead generation' : 'e-commerce'} campaigns off the ground.`);
      lines.push('');
      lines.push(`📋 Pending Sections (${pendingItems.length}):`);
      pendingItems.forEach(item => lines.push(`  • ${item.label}`));
    } else if (onboardingIncomplete) {
      lines.push(`We noticed your onboarding is still ${client.onboardingStatus === 'Pending' ? 'pending — we haven\'t received your business information yet' : 'in progress'}.`);
      lines.push('');
      lines.push('Completing your business profile helps us:');
      lines.push('  • Set up campaigns faster');
      lines.push('  • Target the right audience from day one');
      lines.push('  • Benchmark against your competitors');
    }

    lines.push('');
    lines.push('You can complete everything directly in the Brego Client App under Business Info. Let us know if you have any questions!');
    return lines.join('\n');
  };

  const handlePMSendNudge = () => {
    setNudgeSending(true);
    setTimeout(() => {
      setNudgeSending(false);
      setNudgeSent(true);
      setTimeout(() => {
        setShowNudgeOverlay(false);
        setTimeout(() => setNudgeSent(false), 300);
      }, 2000);
    }, 1200);
  };

  if (!hasInfo) {
    return (
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" style={{ animation: 'biFadeIn 0.2s ease-out' }} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bi-empty-title"
          className="absolute top-0 right-0 bottom-0 bg-white shadow-2xl w-full max-w-[640px] flex flex-col"
          style={{ animation: 'biSlideInRight 0.28s cubic-bezier(0.32, 0.72, 0, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Minimal header */}
          <div className="flex items-center justify-between h-[56px] px-6 border-b border-black/[0.06]">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
                <Building2 className="w-4 h-4" style={{ color: accent }} />
              </div>
              <h2 id="bi-empty-title" className="text-h3 font-bold text-black/85">{client.name}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-black/[0.04] transition-colors" aria-label="Close drawer">
              <X className="w-[18px] h-[18px] text-black/35" />
            </button>
          </div>
          {/* Empty body */}
          <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-black/[0.03] flex items-center justify-center mb-5">
              <Building2 className="w-8 h-8 text-black/20" />
            </div>
            <h2 className="text-h2 font-bold text-black/80 mb-2">No business info yet</h2>
            <p className="text-body text-black/40 mb-7 max-w-[340px] leading-relaxed">This client hasn&apos;t completed the onboarding form on the client app yet.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-black/[0.04] text-black/55 text-body font-medium hover:bg-black/[0.07] transition-colors">Close</button>
          </div>
        </div>
        <style jsx>{`
          @keyframes biSlideInRight {
            from { transform: translateX(24px); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
          @keyframes biFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Shared values
  const companyName = ecomInfo?.companyName || leadGenInfo?.companyName || client.name;
  const industry = ecomInfo?.industry || leadGenInfo?.industry || '';
  const websiteUrl = ecomInfo?.website || leadGenInfo?.website || '';

  // Build tabs based on client type
  const tabs = isLeadGen
    ? [
        { key: 'basic' as const, label: 'Basic Info', icon: Building2 },
        { key: 'competitors' as const, label: 'Competitors', icon: Crosshair },
        { key: 'funnel' as const, label: 'Lead Funnel', icon: Zap },
      ]
    : [
        { key: 'basic' as const, label: 'Basic Info', icon: Building2 },
        { key: 'competitors' as const, label: 'Competitors', icon: Crosshair },
        { key: 'products' as const, label: 'Products & USPs', icon: Package },
      ];

  // Reusable field card component
  const FieldCard = ({ label, value, accent: fieldAccent, isBold }: { label: string; value: string; accent?: boolean; isBold?: boolean }) => (
    <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
      <label className="text-caption text-black/35 font-medium block mb-1">{label}</label>
      <p className={`text-body font-medium ${fieldAccent ? `text-[${accent}]` : 'text-black/75'} ${isBold ? 'font-semibold' : ''}`}>{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1.5px]" style={{ animation: 'biFadeIn 0.2s ease-out' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bi-modal-title"
        className="absolute top-0 right-0 bottom-0 bg-white shadow-2xl w-full max-w-[640px] flex flex-col"
        style={{ animation: 'biSlideInRight 0.28s cubic-bezier(0.32, 0.72, 0, 1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky Header ── */}
        <div className="flex-shrink-0 border-b border-black/[0.06] bg-white">
          {/* Top row: identity + close */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className={`w-11 h-11 rounded-xl ${accentBg} flex items-center justify-center flex-shrink-0`}>
                <Building2 className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 id="bi-modal-title" className="text-h2 font-bold text-black/90 truncate">{companyName}</h2>
                  <span
                    className="text-caption font-semibold px-2 py-0.5 rounded-md border flex-shrink-0"
                    style={{
                      color: accent,
                      backgroundColor: isLeadGen ? 'rgba(124,58,237,0.06)' : 'rgba(32,76,199,0.06)',
                      borderColor: isLeadGen ? 'rgba(124,58,237,0.12)' : 'rgba(32,76,199,0.12)',
                    }}
                  >
                    {isLeadGen ? 'Lead Gen' : 'E-Commerce'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-caption text-black/45">{industry}</span>
                  <span className="text-black/15">·</span>
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-caption font-medium flex items-center gap-1 hover:underline transition-colors" style={{ color: accent }}>
                    {websiteUrl.replace('https://', '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-black/[0.04] transition-colors flex-shrink-0 -mr-1" aria-label="Close drawer">
              <X className="w-[18px] h-[18px] text-black/35" />
            </button>
          </div>

          {/* Tab bar (segmented) */}
          <div className="px-6 pb-4">
            <div className="flex items-stretch bg-black/[0.025] rounded-xl p-1 gap-1" role="tablist">
              {tabs.map(tab => {
                const isActive = activeTab === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-body font-semibold transition-all text-center flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-white shadow-sm'
                        : 'text-black/35 hover:text-black/55 hover:bg-white/40'
                    }`}
                    style={isActive ? { color: accent } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

          {/* ══════════ E-COMMERCE BASIC INFO ══════════ */}
          {activeTab === 'basic' && ecomInfo && (
            <div className="space-y-6" style={{ animation: 'biFadeIn 0.18s ease-out' }}>
              {/* Company details in bordered cards */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#204CC7]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <FieldCard label="Company Name" value={ecomInfo.companyName} />
                  <FieldCard label="Industry" value={ecomInfo.industry} />
                  <div className="col-span-2">
                    <FieldCard label="Primary Goal" value={ecomInfo.primaryGoal} />
                  </div>
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Marketing details */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-[#204CC7]" />
                  Marketing Details
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                    <label className="text-caption text-black/35 font-medium block mb-1">Target Audience</label>
                    <p className="text-body text-black/70 leading-relaxed">{ecomInfo.targetAudience}</p>
                  </div>
                  <div className="rounded-xl bg-[#EEF1FB]/40 border border-[#204CC7]/8 px-4 py-3.5">
                    <label className="text-caption text-[#204CC7]/50 font-medium block mb-1">Monthly Ad Budget</label>
                    <p className="text-body text-[#204CC7] font-bold">{ecomInfo.monthlyAdBudget}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                  <label className="text-caption text-black/35 font-medium block mb-2">Target Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {ecomInfo.targetLocation.map(loc => (
                      <span key={loc} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-caption text-black/55 font-medium border border-black/[0.05] shadow-sm">
                        <MapPin className="w-3 h-3 text-black/25" />
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ LEAD GEN BASIC INFO ══════════ */}
          {activeTab === 'basic' && leadGenInfo && (
            <div className="space-y-6" style={{ animation: 'biFadeIn 0.18s ease-out' }}>
              {/* Company details */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Company Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <FieldCard label="Company Name" value={leadGenInfo.companyName} />
                  <FieldCard label="Industry" value={leadGenInfo.industry} />
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Lead Generation Details */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Target className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Lead Generation Details
                </h3>
                {/* Primary service — full width highlight card */}
                <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5 mb-3">
                  <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Primary Service Offered</label>
                  <p className="text-body text-black/75 font-semibold">{leadGenInfo.primaryServiceOffered}</p>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-3">
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Monthly Ad Budget</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.monthlyAdBudget}</p>
                  </div>
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Average Deal Value</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.averageDealValue}</p>
                  </div>
                  <div className="rounded-xl bg-purple-50/40 border border-[#7C3AED]/8 px-4 py-3.5">
                    <label className="text-caption text-[#7C3AED]/50 font-medium block mb-1">Lead Volume / Month</label>
                    <p className="text-body text-[#7C3AED] font-bold">{leadGenInfo.monthlyLeadVolumeTarget}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-black/[0.018] border border-black/[0.04] px-4 py-3.5">
                  <label className="text-caption text-black/35 font-medium block mb-2">Service Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {leadGenInfo.serviceAreas.map(area => (
                      <span key={area} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg text-caption text-[#7C3AED]/70 font-medium border border-purple-100/60 shadow-sm">
                        <MapPin className="w-3 h-3 text-[#7C3AED]/40" />
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ COMPETITORS — E-COMMERCE ══════════ */}
          {activeTab === 'competitors' && ecomInfo && (
            <div className="space-y-3" style={{ animation: 'biFadeIn 0.18s ease-out' }}>
              <p className="text-caption text-black/40 mb-1">{ecomInfo.competitors.length} competitor{ecomInfo.competitors.length !== 1 ? 's' : ''} tracked</p>
              {ecomInfo.competitors.map((comp, i) => (
                <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center text-caption font-bold text-black/30">{i + 1}</span>
                      <div>
                        <p className="text-body text-black/80 font-semibold">{comp.name}</p>
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-caption text-[#204CC7]/70 hover:text-[#204CC7] flex items-center gap-1 mt-0.5 transition-colors">
                          {comp.website.replace('https://', '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="text-caption text-black/45 font-semibold bg-black/[0.035] px-2.5 py-1 rounded-lg">Primary</span>
                    )}
                  </div>
                </div>
              ))}
              {ecomInfo.competitors.length === 0 && (
                <p className="text-center text-caption text-black/30 py-10">No competitors listed</p>
              )}
            </div>
          )}

          {/* ══════════ COMPETITORS — LEAD GEN ══════════ */}
          {activeTab === 'competitors' && leadGenInfo && (
            <div className="space-y-3" style={{ animation: 'biFadeIn 0.18s ease-out' }}>
              <p className="text-caption text-black/40 mb-1">{leadGenInfo.competitors.length} competitor{leadGenInfo.competitors.length !== 1 ? 's' : ''} tracked</p>
              {leadGenInfo.competitors.map((comp, i) => (
                <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <span className="w-8 h-8 rounded-lg bg-purple-50/70 flex items-center justify-center text-caption font-bold text-[#7C3AED]/55">{i + 1}</span>
                      <div>
                        <p className="text-body text-black/80 font-semibold">{comp.name}</p>
                        <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-caption text-[#7C3AED]/70 hover:text-[#7C3AED] flex items-center gap-1 mt-0.5 transition-colors">
                          {comp.website.replace('https://', '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    {i === 0 && (
                      <span className="text-caption text-[#7C3AED]/65 font-semibold bg-purple-50/60 px-2.5 py-1 rounded-lg border border-purple-100/50">Primary</span>
                    )}
                  </div>
                  {/* Key Offering row */}
                  <div className="mt-3 ml-[46px] rounded-lg bg-black/[0.02] border border-black/[0.04] px-3.5 py-2.5">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#FDAB3D]/70 mt-0.5 flex-shrink-0" />
                      <div>
                        <label className="text-caption text-black/45 font-semibold uppercase tracking-wider block mb-0.5">Key Offering</label>
                        <p className="text-caption text-black/65 leading-relaxed">{comp.keyOffering}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {leadGenInfo.competitors.length === 0 && (
                <p className="text-center text-caption text-black/30 py-10">No competitors listed</p>
              )}
            </div>
          )}

          {/* ══════════ PRODUCTS & USPs — E-COMMERCE ══════════ */}
          {activeTab === 'products' && ecomInfo && (
            <div className="space-y-6" style={{ animation: 'biFadeIn 0.18s ease-out' }}>
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5 text-[#204CC7]" />
                  Products ({ecomInfo.products.length})
                </h3>
                <div className="space-y-3">
                  {ecomInfo.products.map((prod, i) => (
                    <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#EEF1FB] flex items-center justify-center">
                          <Package className="w-4 h-4 text-[#204CC7]" />
                        </div>
                        <span className="text-body text-black/80 font-bold">{prod.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 ml-12 mb-3">
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-caption text-black/45 font-semibold uppercase tracking-wider">Category</label>
                          <p className="text-caption text-black/70 font-medium mt-0.5">{prod.category}</p>
                        </div>
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-caption text-black/45 font-semibold uppercase tracking-wider">Price Range</label>
                          <p className="text-caption text-black/70 font-medium mt-0.5">{prod.priceRange}</p>
                        </div>
                      </div>
                      {prod.description && (
                        <p className="text-caption text-black/55 leading-relaxed ml-12">{prod.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Star className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  Unique Selling Points ({ecomInfo.usps.length})
                </h3>
                <div className="space-y-2">
                  {ecomInfo.usps.map((usp, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/40 border border-amber-100/50">
                      <span className="w-6 h-6 rounded-lg bg-[#FDAB3D]/15 flex items-center justify-center text-caption font-bold text-[#FDAB3D] flex-shrink-0 mt-px">{i + 1}</span>
                      <p className="text-body text-black/70 font-medium leading-relaxed">{usp}</p>
                    </div>
                  ))}
                  {ecomInfo.usps.length === 0 && (
                    <p className="text-center text-caption text-black/30 py-8">No USPs listed</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ LEAD FUNNEL — LEAD GEN ══════════ */}
          {activeTab === 'funnel' && leadGenInfo && (
            <div className="space-y-7" style={{ animation: 'biFadeIn 0.18s ease-out' }}>

              {/* Services You Offer */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5 text-[#7C3AED]" />
                  Services You Offer ({leadGenInfo.services.length})
                </h3>
                <div className="space-y-3">
                  {leadGenInfo.services.map((svc, i) => (
                    <div key={i} className="border border-black/[0.06] rounded-xl px-5 py-4 hover:border-black/10 transition-colors hover:shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-50/70 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-[#7C3AED]/70" />
                        </div>
                        <span className="text-body text-black/80 font-bold">{svc.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 ml-12">
                        <div className="rounded-lg bg-purple-50/30 border border-[#7C3AED]/6 px-3 py-2">
                          <label className="text-caption text-[#7C3AED]/55 font-semibold uppercase tracking-wider">Avg. Deal Value</label>
                          <p className="text-caption text-[#7C3AED] font-bold mt-0.5">{svc.avgDealValue}</p>
                        </div>
                        <div className="rounded-lg bg-black/[0.02] border border-black/[0.04] px-3 py-2">
                          <label className="text-caption text-black/45 font-semibold uppercase tracking-wider">Avg. Sales Cycle</label>
                          <p className="text-caption text-black/70 font-medium mt-0.5">{svc.avgSalesCycle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Lead Qualification Criteria */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-1 flex items-center gap-2 uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-[#FDAB3D]" />
                  Lead Qualification Criteria
                </h3>
                <p className="text-caption text-black/40 mb-3.5">Which signals indicate a quality lead?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {leadGenInfo.leadQualificationCriteria.map((crit, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        crit.active
                          ? 'bg-[#EEF1FB]/40 border-[#204CC7]/12 shadow-sm'
                          : 'bg-black/[0.012] border-black/[0.04]'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        crit.active
                          ? 'bg-[#204CC7] text-white'
                          : 'bg-black/[0.06]'
                      }`}>
                        {crit.active && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-body font-medium ${crit.active ? 'text-black/70' : 'text-black/30'}`}>
                        {crit.label}
                      </span>
                      {crit.active && (
                        <Zap className="w-3.5 h-3.5 text-[#204CC7]/30 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/[0.04]" />

              {/* Follow-up Channels */}
              <div>
                <h3 className="text-caption font-bold text-black/55 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <MessageCircle className="w-3.5 h-3.5 text-[#00C875]" />
                  Follow-up Channels
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {leadGenInfo.followUpChannels.map(channel => {
                    const channelIcon: Record<string, typeof Phone> = {
                      'Phone Call': Phone,
                      'WhatsApp': MessageCircle,
                      'Email': Send,
                      'Video Call': Camera,
                      'Site Visit': MapPin,
                      'LinkedIn': Globe,
                      'SMS': MessageSquareText,
                      'Instagram DM': Eye,
                    };
                    const ChannelIcon = channelIcon[channel] || MessageCircle;
                    return (
                      <span
                        key={channel}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50/40 border border-emerald-100/50 rounded-xl text-body text-black/60 font-medium shadow-sm"
                      >
                        <ChannelIcon className="w-4 h-4 text-[#00C875]/70" />
                        {channel}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Footer — Smart Nudge Banner or Simple Close ── */}
        <div className="flex-shrink-0 border-t border-black/[0.06] bg-white">
          {showNudgeBanner ? (
            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-4 bg-amber-50/70 border border-amber-200/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-100/80 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-[18px] h-[18px] text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body text-amber-900/85 font-semibold">
                      {pendingItems.length > 0
                        ? `${pendingItems.length} section${pendingItems.length !== 1 ? 's' : ''} incomplete in business profile`
                        : `Onboarding ${client.onboardingStatus === 'Pending' ? 'not started' : 'in progress'}`
                      }
                    </p>
                    <p className="text-caption text-amber-700/60 mt-0.5 truncate">
                      {pendingItems.length > 0
                        ? `${[...new Set(pendingItems.map(i => i.category))].join(' · ')} need client input`
                        : 'Business information submission still pending from client'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNudgeOverlay(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-body font-semibold transition-all shadow-sm hover:shadow flex-shrink-0"
                  style={{ backgroundColor: '#D97706' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#B45309')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D97706')}
                >
                  <Send className="w-3.5 h-3.5" />
                  Nudge Client
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2 text-caption text-emerald-600/80">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">Onboarding complete — all sections filled</span>
              </div>
              <button onClick={onClose} className="px-5 py-2 rounded-xl text-body font-medium text-black/45 hover:text-black/65 hover:bg-black/[0.03] transition-all">
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Nudge Client Overlay ── */}
      {showNudgeOverlay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => !nudgeSending && setShowNudgeOverlay(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden"
            style={{ animation: 'biSlideUp 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success State */}
            {nudgeSent ? (
              <div className="flex flex-col items-center justify-center py-16 px-8" style={{ animation: 'biSlideUp 0.25s ease-out' }}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-h2 font-bold text-black/85 mb-2">Reminder Sent!</h3>
                <p className="text-body text-black/40 text-center max-w-[320px] leading-relaxed">
                  Your onboarding reminder has been shared to <span className="font-semibold text-black/55">#{clientChannelSlug}</span>
                </p>
              </div>
            ) : (
              <>
                {/* Overlay Header */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isLeadGen ? '#7C3AED10' : '#204CC710' }}>
                        <Megaphone className="w-5 h-5" style={{ color: accent }} />
                      </div>
                      <div>
                        <h3 className="text-h3 font-bold text-black/85">Send Onboarding Reminder</h3>
                        <p className="text-caption text-black/35 mt-0.5">Encourage {companyName} to complete their setup</p>
                      </div>
                    </div>
                    <button onClick={() => !nudgeSending && setShowNudgeOverlay(false)} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/[0.04] transition-colors" aria-label="Close">
                      <X className="w-4 h-4 text-black/30" />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-black/[0.06]" />

                {/* Overlay Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* Channel Target */}
                  <div>
                    <label className="text-caption font-semibold text-black/55 uppercase tracking-wider block mb-2">Sending to</label>
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-black/[0.02] border border-black/[0.05]">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}15` }}>
                        <Hash className="w-3.5 h-3.5" style={{ color: accent }} />
                      </div>
                      <span className="text-body text-black/75 font-semibold">{clientChannelSlug}</span>
                      <span className="text-caption text-black/35 ml-1">Client Channel</span>
                      <ExternalLink className="w-3 h-3 text-black/25 ml-auto" />
                    </div>
                  </div>

                  {/* Pending Items */}
                  {pendingItems.length > 0 ? (
                    <div>
                      <label className="text-caption font-semibold text-black/55 uppercase tracking-wider block mb-2">Incomplete sections flagged ({pendingItems.length})</label>
                      <div className="space-y-1.5">
                        {pendingItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-body text-amber-900/75 font-medium flex-1 min-w-0 truncate">{item.label}</span>
                            <span className="text-caption text-amber-700/65 font-medium flex-shrink-0">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : onboardingIncomplete && (
                    <div>
                      <label className="text-caption font-semibold text-black/55 uppercase tracking-wider block mb-2">Onboarding status</label>
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50/50 border border-amber-100/60">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-body text-amber-900/75 font-medium">Business information form — {client.onboardingStatus}</span>
                      </div>
                    </div>
                  )}

                  {/* Message Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-caption font-semibold text-black/55 uppercase tracking-wider">Message preview</label>
                      <div className="flex items-center gap-1 text-caption font-medium" style={{ color: `${accent}90` }}>
                        <Sparkles className="w-3 h-3" />
                        Auto-generated
                      </div>
                    </div>
                    <div className="rounded-xl bg-black/[0.015] border border-black/[0.05] px-5 py-4">
                      <pre className="text-body text-black/60 leading-relaxed whitespace-pre-wrap font-sans">{generatePMNudgeMessage()}</pre>
                    </div>
                  </div>
                </div>

                {/* Overlay Footer */}
                <div className="h-px bg-black/[0.06]" />
                <div className="flex items-center justify-between px-6 py-4">
                  <p className="text-caption text-black/25 flex items-center gap-1.5">
                    <MessageSquareText className="w-3.5 h-3.5" />
                    Visible to all channel members
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setShowNudgeOverlay(false)}
                      disabled={nudgeSending}
                      className="px-4 py-2.5 rounded-xl text-body font-medium text-black/35 hover:text-black/55 hover:bg-black/[0.03] transition-all disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePMSendNudge}
                      disabled={nudgeSending}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-body font-semibold transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#D97706' }}
                      onMouseEnter={e => !nudgeSending && (e.currentTarget.style.backgroundColor = '#B45309')}
                      onMouseLeave={e => !nudgeSending && (e.currentTarget.style.backgroundColor = '#D97706')}
                    >
                      {nudgeSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Send to Channel
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes biSlideInRight {
          from { transform: translateX(24px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes biSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes biFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ────────────── Growth Plan Modal ──────────────
function GrowthPlanModal({ client, onClose, onStatusChange }: {
  client: Client;
  onClose: () => void;
  onStatusChange: (clientId: string, status: GrowthPlanStatus) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const viewMonth = today.getMonth();
  const viewYear = today.getFullYear();

  // Compute dynamic week ranges from planStartDate
  const weekRanges = useMemo(() => {
    if (!client.planStartDate) return [];
    return computeWeekRanges(client.planStartDate, viewMonth, viewYear);
  }, [client.planStartDate, viewMonth, viewYear]);

  // Find the current week index (the one that contains today), default to 0
  const currentWeekIdx = useMemo(() => {
    const idx = weekRanges.findIndex(w => w.isCurrent);
    return idx >= 0 ? idx : 0;
  }, [weekRanges]);

  const [activeWeek, setActiveWeek] = useState<number>(currentWeekIdx);
  const [plan, setPlan] = useState<GrowthPlanData>(() => {
    const seed = seedGrowthPlans[client.id];
    if (seed) return seed;
    // Create empty plan entries for each week range
    const empty: GrowthPlanData = {};
    weekRanges.forEach(w => { empty[w.index] = { whatsHappening: '', tasks: [] }; });
    return empty;
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingHappening, setEditingHappening] = useState(false);
  const [happeningDraft, setHappeningDraft] = useState('');
  const addTaskRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (showAddTask) setTimeout(() => addTaskRef.current?.focus(), 50);
  }, [showAddTask]);

  // Ensure plan has entries for all week ranges (handles month navigation edge cases)
  useEffect(() => {
    setPlan(prev => {
      let updated = false;
      const next = { ...prev };
      weekRanges.forEach(w => {
        if (!next[w.index]) {
          next[w.index] = { whatsHappening: '', tasks: [] };
          updated = true;
        }
      });
      return updated ? next : prev;
    });
  }, [weekRanges]);

  // Safe access: if no week ranges (kickoff not done), show a placeholder
  const hasWeeks = weekRanges.length > 0;
  const weekData = plan[activeWeek] || { whatsHappening: '', tasks: [] };
  const allTasks = Object.values(plan).flatMap(w => w.tasks);
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter(t => t.done).length;
  const monthProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const weekTasks = weekData.tasks;
  const weekDone = weekTasks.filter(t => t.done).length;
  const weekPending = weekTasks.length - weekDone;

  const [taskFilter, setTaskFilter] = useState<'all' | 'done' | 'pending'>('all');
  const filteredTasks = taskFilter === 'all' ? weekTasks
    : taskFilter === 'done' ? weekTasks.filter(t => t.done)
    : weekTasks.filter(t => !t.done);

  const toggleTask = (taskId: string) => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: week.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) },
      };
    });
  };

  const removeTask = (taskId: string) => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: week.tasks.filter(t => t.id !== taskId) },
      };
    });
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: GrowthPlanTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim(),
      done: false,
    };
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, tasks: [...week.tasks, newTask] },
      };
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setShowAddTask(false);
  };

  const saveHappening = () => {
    setPlan(prev => {
      const week = prev[activeWeek] || { whatsHappening: '', tasks: [] };
      return {
        ...prev,
        [activeWeek]: { ...week, whatsHappening: happeningDraft.trim() },
      };
    });
    setEditingHappening(false);
  };

  const handleSendToClient = () => {
    onStatusChange(client.id, 'Sent');
    onClose();
  };

  const hasContent = totalTasks > 0 || Object.values(plan).some(w => w.whatsHappening.trim());

  // Compute status from plan content
  useEffect(() => {
    if (hasContent && client.growthPlanStatus === 'Not Started') {
      onStatusChange(client.id, 'In Progress');
    }
  }, [hasContent, client.growthPlanStatus, client.id, onStatusChange]);

  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = `${MONTHS_SHORT[viewMonth]} ${viewYear}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gp-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'gpSlideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-0">
          {/* Top row: icon + title + close */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#EEF1FB] flex items-center justify-center">
                <CalendarCheck2 className="w-[18px] h-[18px] text-[#204CC7]" />
              </div>
              <div>
                <h2 id="gp-modal-title" className="text-[18px] font-bold text-black/90 leading-none">{client.name}</h2>
                <p className="text-caption text-black/40 mt-1">Growth Plan · {monthLabel} · {doneTasks}/{totalTasks} tasks</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/[0.04] transition-colors -mr-1" aria-label="Close">
              <X className="w-4 h-4 text-black/35" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-caption text-black/40 font-medium">Monthly progress</span>
              <span className="text-caption font-bold text-[#204CC7]">{monthProgress}%</span>
            </div>
            <div className="h-[5px] bg-black/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-[#204CC7] rounded-full transition-all duration-500 ease-out" style={{ width: `${monthProgress}%` }} />
            </div>
          </div>

          {/* Week tabs — dynamic, date-anchored */}
          {hasWeeks ? (
            <div className="flex items-stretch bg-black/[0.025] rounded-lg p-[3px] gap-[3px] mb-0">
              {weekRanges.map(wr => {
                const isActive = activeWeek === wr.index;
                return (
                  <button
                    key={wr.index}
                    onClick={() => { setActiveWeek(wr.index); setTaskFilter('all'); setShowAddTask(false); setExpandedTask(null); }}
                    className={`flex-1 py-1.5 rounded-md text-caption font-semibold transition-all text-center relative ${
                      isActive
                        ? 'bg-white text-[#204CC7] shadow-sm'
                        : 'text-black/35 hover:text-black/55 hover:bg-white/40'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {wr.isCurrent && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#204CC7]' : 'bg-black/20'}`} />}
                      Wk {wr.index + 1}
                    </span>
                    <span className={`block text-[11px] font-medium leading-none mt-0.5 ${isActive ? 'opacity-60' : 'opacity-40'}`}>{wr.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-3 text-center text-caption text-black/30">
              Complete kickoff to start planning
            </div>
          )}
        </div>

        <div className="h-px bg-black/[0.05] mt-4" />

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* What's happening card */}
          {editingHappening ? (
            <div className="space-y-2.5">
              <label className="text-caption font-semibold text-[#204CC7] flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5" />
                What&apos;s happening
              </label>
              <textarea
                autoFocus
                value={happeningDraft}
                onChange={(e) => setHappeningDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveHappening(); } }}
                placeholder="Describe this week's focus for the client..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#204CC7]/20 bg-white text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/10 focus:border-[#204CC7]/30 resize-none transition-all"
              />
              <div className="flex items-center gap-2">
                <button onClick={saveHappening} className="px-3.5 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3fa8] transition-colors">Save</button>
                <button onClick={() => setEditingHappening(false)} className="px-3 py-1.5 rounded-lg text-black/40 text-caption font-medium hover:bg-black/[0.04] transition-colors">Cancel</button>
              </div>
            </div>
          ) : weekData.whatsHappening ? (
            <button
              onClick={() => { setHappeningDraft(weekData.whatsHappening); setEditingHappening(true); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-[#EEF1FB]/50 border border-[#204CC7]/[0.06] hover:border-[#204CC7]/15 transition-all group/wh"
            >
              <p className="text-caption font-semibold text-[#204CC7] mb-1 flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5" />
                What&apos;s happening
                <Pencil className="w-3 h-3 ml-auto text-black/15 opacity-0 group-hover/wh:opacity-100 transition-opacity" />
              </p>
              <p className="text-body text-black/60 leading-relaxed">{weekData.whatsHappening}</p>
            </button>
          ) : (
            <button
              onClick={() => { setHappeningDraft(''); setEditingHappening(true); }}
              className="w-full text-left px-4 py-3 rounded-xl bg-black/[0.015] hover:bg-black/[0.03] transition-all group/wh"
            >
              <p className="text-caption font-medium text-black/25 flex items-center gap-1.5 group-hover/wh:text-black/40 transition-colors">
                <MessageSquareText className="w-3.5 h-3.5" />
                Add a &quot;What&apos;s happening&quot; note for this week...
              </p>
            </button>
          )}

          {/* Divider */}
          <div className="h-px bg-black/[0.04]" />

          {/* Task section header + filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-body font-bold text-black/75">This week&apos;s tasks</h3>
              <div className="flex items-center rounded-lg border border-black/[0.06] overflow-hidden">
                {([
                  { key: 'all' as const, label: 'All', count: weekTasks.length },
                  { key: 'done' as const, label: 'Done', count: weekDone },
                  { key: 'pending' as const, label: 'Pending', count: weekPending },
                ]).map((f, i) => (
                  <button
                    key={f.key}
                    onClick={() => setTaskFilter(f.key)}
                    className={`px-2.5 py-1 text-caption font-medium transition-all ${
                      i > 0 ? 'border-l border-black/[0.06]' : ''
                    } ${
                      taskFilter === f.key
                        ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold'
                        : 'text-black/35 hover:text-black/55 hover:bg-black/[0.02]'
                    }`}
                  >
                    {f.label} {f.count}
                  </button>
                ))}
              </div>
            </div>

            {/* Hint text for empty state */}
            {weekTasks.length === 0 && !showAddTask && taskFilter === 'all' && (
              <p className="text-center text-caption text-black/20 py-6">No tasks added yet — tap below to get started</p>
            )}
            {filteredTasks.length === 0 && weekTasks.length > 0 && !showAddTask && (
              <p className="text-center text-caption text-black/20 py-6">No {taskFilter} tasks this week</p>
            )}

            {/* Task rows */}
            <div className="space-y-px">
              {filteredTasks.map((task, tIdx) => (
                <div key={task.id} className="group/task">
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                      expandedTask === task.id ? 'bg-[#EEF1FB]/40' : 'hover:bg-black/[0.02]'
                    } ${tIdx > 0 ? 'border-t border-black/[0.03]' : ''}`}
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`w-[20px] h-[20px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                        task.done
                          ? 'bg-[#00C875] border-[#00C875] text-white'
                          : 'border-black/12 hover:border-[#204CC7]/30 bg-white'
                      }`}
                      aria-label={task.done ? 'Mark as pending' : 'Mark as done'}
                    >
                      {task.done && <Check className="w-3 h-3" />}
                    </button>

                    {/* Title */}
                    <span className={`flex-1 text-body leading-snug ${
                      task.done ? 'line-through text-black/25' : 'text-black/70 font-medium'
                    }`}>
                      {task.title}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTask(task.id); }}
                        className="p-1 rounded-md opacity-0 group-hover/task:opacity-100 hover:bg-rose-50 hover:text-rose-500 text-black/15 transition-all"
                        aria-label="Remove task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={`w-3.5 h-3.5 text-black/15 transition-transform ${expandedTask === task.id ? 'rotate-180 text-black/30' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded description */}
                  {expandedTask === task.id && task.description && (
                    <div className="mx-3 mb-1.5 ml-[44px] pl-3 py-2 border-l-2 border-[#204CC7]/10 rounded-r-md bg-[#EEF1FB]/20">
                      <p className="text-body text-black/45 leading-relaxed">{task.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add task */}
            {showAddTask ? (
              <div className="mt-3 p-4 rounded-xl bg-black/[0.015] border border-black/[0.05] space-y-2.5" style={{ animation: 'gpSlideUp 0.15s ease-out' }}>
                <input
                  ref={addTaskRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) addTask(); if (e.key === 'Escape') setShowAddTask(false); }}
                  placeholder="Task title"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-body text-black/80 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/8 transition-all"
                />
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Short description for the client (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.07] bg-white text-body text-black/70 placeholder:text-black/25 focus:outline-none focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/8 resize-none transition-all"
                />
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={addTask}
                    disabled={!newTaskTitle.trim()}
                    className={`px-4 py-1.5 rounded-lg text-caption font-semibold transition-all ${
                      newTaskTitle.trim()
                        ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa8]'
                        : 'bg-black/[0.05] text-black/20 cursor-not-allowed'
                    }`}
                  >
                    Add Task
                  </button>
                  <button onClick={() => { setShowAddTask(false); setNewTaskTitle(''); setNewTaskDesc(''); }} className="px-3 py-1.5 rounded-lg text-black/35 text-caption font-medium hover:bg-black/[0.04] transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddTask(true)}
                className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/[0.015] hover:bg-[#EEF1FB]/50 hover:text-[#204CC7] text-black/25 transition-all text-caption font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add task
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.05]" />
        <div className="flex items-center justify-between px-6 py-3.5">
          <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/35 hover:text-black/55 hover:bg-black/[0.03] transition-all">
            Close
          </button>
          {client.growthPlanStatus !== 'Sent' && hasContent && (
            <button
              onClick={handleSendToClient}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md text-body font-semibold bg-[#204CC7] text-white hover:bg-[#1a3fa8] shadow-sm shadow-[#204CC7]/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Send to Client
            </button>
          )}
          {client.growthPlanStatus === 'Sent' && (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-caption font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sent to Client
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes gpSlideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function KickoffModal({ client, mode, onClose, onLaunch, onApprove }: {
  client: Client;
  mode: 'initial' | 'review';
  onClose: () => void;
  onLaunch: (assignments: Record<string, string>, metrics: KickoffMetrics) => void;
  onApprove: (finalMetrics: KickoffMetrics) => void;
}) {
  // Kickoff captures one set of metrics per session — anchor on the primary
  // motion. Multi-type clients will get a follow-up kickoff for their second
  // motion (handled outside this modal today).
  const businessType: 'ecommerce' | 'leadgen' = primaryType(client) === 'Ecommerce' ? 'ecommerce' : 'leadgen';
  const fields = getMetricFields(businessType);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  // ─── INITIAL MODE STATE (3-step wizard) ───
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<KickoffMetrics>({ adSpend: '', roas: '', revenue: '', orders: '', aov: '', leads: '', cpl: '', ctr: '' });

  // ─── REVIEW MODE STATE ───
  const kd = client.kickoffData;
  const hasResponse = kd?.hasClientResponse ?? false;
  const [reviewTab, setReviewTab] = useState<'comparison' | 'team'>(hasResponse ? 'comparison' : 'comparison');
  // Revised metrics = start from client's proposal if exists, else proposed
  const [revisedMetrics, setRevisedMetrics] = useState<KickoffMetrics>(
    kd?.clientMetrics ?? kd?.proposedMetrics ?? { adSpend: '', roas: '', revenue: '', orders: '', aov: '', leads: '', cpl: '', ctr: '' }
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ─── INITIAL MODE: validation ───
  const requiredSlotsFilled = pmRoleSlots.filter(s => s.required).every(s => assignments[s.role]);
  const metricsAllFilled = (m: KickoffMetrics) => businessType === 'ecommerce'
    ? !!(m.adSpend && m.roas && m.revenue && m.orders && m.aov)
    : !!(m.adSpend && m.leads && m.cpl && m.ctr);
  const canProceed = step === 1 ? requiredSlotsFilled : step === 2 ? metricsAllFilled(metrics) : true;

  // ─── REVIEW MODE: split metrics into agreed vs. disputed ───
  const disputedFields = hasResponse ? fields.filter(f => {
    const p = kd?.proposedMetrics[f.key]; const c = kd?.clientMetrics?.[f.key];
    return p && c && p !== c;
  }) : [];
  const agreedFields = hasResponse ? fields.filter(f => {
    const p = kd?.proposedMetrics[f.key]; const c = kd?.clientMetrics?.[f.key];
    return !p || !c || p === c;
  }) : [];
  // Track which metric note is expanded (progressive disclosure)
  const [expandedNote, setExpandedNote] = useState<string | null>(disputedFields.length > 0 ? disputedFields[0].key : null);
  // ─── Discuss-in-Channel flow ───
  const clientChannelName = client.name; // Channel is derived from the client name
  const [discussOpen, setDiscussOpen] = useState<string | null>(null); // metric key with composer open
  const [discussMsg, setDiscussMsg] = useState('');
  const [sentToast, setSentToast] = useState<{ channel: string; metric: string; finalVal: string } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Store last sent discussion payload so handleGoToChannel can pass it to Inbox
  const lastDiscussionRef = useRef<{ message: string; metric: string; proposed: string; client: string; finalTarget: string } | null>(null);

  const handleSendDiscussion = (metricLabel: string, metricKey: keyof KickoffMetrics, prefix?: string, suffix?: string) => {
    if (!discussMsg.trim()) return;
    const finalDisplay = revisedMetrics[metricKey] ? formatMetricVal(revisedMetrics[metricKey], prefix, suffix) : '—';
    const proposedDisplay = client.kickoffData?.proposedMetrics[metricKey] != null
      ? formatMetricVal(client.kickoffData.proposedMetrics[metricKey], prefix, suffix) : '—';
    const clientDisplay = client.kickoffData?.clientMetrics?.[metricKey] != null
      ? formatMetricVal(client.kickoffData.clientMetrics![metricKey], prefix, suffix) : '—';
    lastDiscussionRef.current = {
      message: discussMsg.trim(),
      metric: metricLabel,
      proposed: proposedDisplay,
      client: clientDisplay,
      finalTarget: finalDisplay,
    };
    setSentToast({ channel: clientChannelName, metric: metricLabel, finalVal: finalDisplay });
    setDiscussOpen(null);
    setDiscussMsg('');
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setSentToast(null), 5000);
  };

  const handleGoToChannel = () => {
    // Prefer the client's own channel in the Inbox (e.g. client-acme-corp).
    // If the Inbox doesn't have a channel for this client yet, the Inbox will
    // gracefully fall back to the SEM team channel using the `service` hint.
    const clientSlug = clientChannelName
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '')      // strip parentheticals
      .replace(/[^a-z0-9]+/g, '-')         // non-alnum → hyphen
      .replace(/(^-|-$)/g, '');            // trim hyphens
    const targetChannel = `client-${clientSlug}`;
    if (lastDiscussionRef.current) {
      sessionStorage.setItem('inbox_discussion_msg', JSON.stringify({
        channelId: targetChannel,
        clientName: clientChannelName,
        service: 'PM',
        ...lastDiscussionRef.current,
        sender: 'You',
      }));
    }
    setSentToast(null);
    onClose();
    window.location.href = `/inbox?channel=${targetChannel}`;
  };

  // ─── Reusable: role slot row (initial mode only) ───
  const renderSlotRow = (slot: { role: string; required: boolean }) => {
    const assigned = assignments[slot.role];
    const assignedEmp = pmEmployeePool.find(e => e.id === assigned);
    const isOpen = openDropdown === slot.role;
    const available = pmEmployeePool.filter(e => e.role === slot.role && !Object.values(assignments).includes(e.id));
    return (
      <div key={slot.role} className="relative">
        <button onClick={() => setOpenDropdown(isOpen ? null : slot.role)} aria-expanded={isOpen} aria-haspopup="listbox"
          aria-label={`${slot.role}${assignedEmp ? `, assigned to ${assignedEmp.name}` : ', unassigned'}`}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${assignedEmp ? 'border-[#00C875]/25 bg-[#00C875]/[0.03]' : isOpen ? 'border-[#7C3AED]/25 bg-[#7C3AED]/[0.02]' : 'border-black/[0.06] hover:border-black/[0.1] bg-white'}`}>
          <div className="flex items-center gap-3">
            {assignedEmp ? (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold bg-[#7C3AED]" aria-hidden="true">{getInitials(assignedEmp.name)}</div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-black/[0.03] flex items-center justify-center"><User className="w-3.5 h-3.5 text-black/30" aria-hidden="true" /></div>
            )}
            <div>
              <p className={`text-body font-medium leading-tight ${assignedEmp ? 'text-black/80' : 'text-black/45'}`}>{assignedEmp ? assignedEmp.name : 'Select employee'}</p>
              <p className="text-caption text-black/45 mt-0.5">{slot.role}{slot.required ? <span className="text-[#E2445C]/70 ml-1" aria-label="required">*</span> : ''}</p>
            </div>
          </div>
          {assignedEmp ? (
            <Check className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-black/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          )}
        </button>
        {isOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 max-h-[200px] overflow-y-auto" role="listbox" aria-label={`Employees for ${slot.role}`}>
            {available.length === 0 ? (
              <p className="px-4 py-3 text-caption text-black/30">No available employees</p>
            ) : available.map(emp => (
              <button key={emp.id} role="option" aria-selected={false} onClick={() => { setAssignments(prev => ({ ...prev, [slot.role]: emp.id })); setOpenDropdown(null); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.025] transition-colors text-left">
                <div className="w-7 h-7 rounded-full bg-black/[0.04] flex items-center justify-center text-caption font-bold text-black/50" aria-hidden="true">{getInitials(emp.name)}</div>
                <span className="text-body text-black/65">{emp.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── Reusable: metric input field ───
  const renderMetricInput = (field: MetricFieldDef, m: KickoffMetrics, setM: (fn: (p: KickoffMetrics) => KickoffMetrics) => void, idPrefix: string) => (
    <div key={field.key}>
      <label htmlFor={`${idPrefix}-${field.key}`} className="text-caption font-medium text-black/50 block mb-1.5">{field.label}</label>
      <div className="relative">
        {field.prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body text-black/40" aria-hidden="true">{field.prefix}</span>}
        <input id={`${idPrefix}-${field.key}`} type="text" placeholder={field.placeholder} value={m[field.key]}
          onChange={e => setM(prev => ({ ...prev, [field.key]: e.target.value }))}
          className={`w-full ${field.prefix ? 'pl-7' : 'px-3.5'} ${field.suffix ? 'pr-8' : 'pr-3.5'} py-2.5 rounded-lg border border-black/[0.08] text-body text-black/80 placeholder:text-black/30 focus:outline-none focus:border-[#7C3AED]/30 focus:ring-2 focus:ring-[#7C3AED]/8 transition-all bg-white`} />
        {field.suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-caption text-black/40" aria-hidden="true">{field.suffix}</span>}
      </div>
    </div>
  );

  // Accent colour based on mode
  const accent = mode === 'initial' ? '#7C3AED' : '#204CC7';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
      <div role="dialog" aria-modal="true" aria-labelledby="kickoff-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'modalSlideUp 0.22s ease-out' }} onClick={(e) => e.stopPropagation()}>


        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <h2 id="kickoff-modal-title" className="text-h2 text-black/90 leading-tight truncate">{client.name}</h2>
              {mode === 'review' && hasResponse && disputedFields.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-amber-50 text-amber-600 flex-shrink-0">
                  {disputedFields.length} {disputedFields.length === 1 ? 'change' : 'changes'}
                </span>
              )}
              {mode === 'review' && hasResponse && disputedFields.length === 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-emerald-50 text-emerald-600 flex-shrink-0">
                  <Check className="w-3 h-3" />Agreed
                </span>
              )}
              {mode === 'review' && !hasResponse && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium bg-blue-50 text-blue-500 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Pending
                </span>
              )}
            </div>
            <p className="text-caption text-black/50">
              {businessType === 'ecommerce' ? 'E-Commerce' : 'Lead Generation'} · Performance Marketing
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/[0.04] transition-colors -mt-0.5 -mr-1 flex-shrink-0" aria-label="Close modal">
            <X className="w-4 h-4 text-black/30" />
          </button>
        </div>

        {/* ── INITIAL MODE: Step Progress ── */}
        {mode === 'initial' && (
          <div className="px-6 pb-4">
            <div className="flex items-center" role="navigation" aria-label="Kickoff steps">
              {['Assign Team', 'Set Targets', 'Review & Send'].map((label, i) => {
                const stepNum = i + 1; const isActive = step === stepNum; const isDone = step > stepNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold transition-all ${isDone ? 'bg-[#00C875] text-white' : isActive ? 'bg-[#7C3AED] text-white' : 'bg-black/[0.06] text-black/45'}`} aria-current={isActive ? 'step' : undefined}>
                        {isDone ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : stepNum}
                      </div>
                      <span className={`text-caption font-medium whitespace-nowrap ${isActive ? 'text-black/70' : isDone ? 'text-[#00C875]' : 'text-black/45'}`}>{label}</span>
                    </div>
                    {i < 2 && <div className={`flex-1 h-px mx-3 transition-colors ${isDone ? 'bg-[#00C875]/50' : 'bg-black/[0.06]'}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── REVIEW MODE: Tab bar ── */}
        {mode === 'review' && (
          <div className="px-6">
            <div className="flex gap-0" role="tablist" aria-label="Review sections">
              {([
                { id: 'comparison' as const, label: 'Targets', icon: <Target className="w-3.5 h-3.5" aria-hidden="true" /> },
                { id: 'team' as const, label: 'Team', icon: <Users className="w-3.5 h-3.5" aria-hidden="true" /> },
              ]).map(tab => (
                <button key={tab.id} role="tab" aria-selected={reviewTab === tab.id} onClick={() => setReviewTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-caption font-medium border-b-2 transition-all ${
                    reviewTab === tab.id ? 'border-[#204CC7] text-[#204CC7]' : 'border-transparent text-black/45 hover:text-black/60'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-black/[0.06]" />

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ═══ INITIAL MODE STEPS ═══ */}
          {mode === 'initial' && step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Assign Service Team</h3>
                <p className="text-body text-black/40">Select team members who will manage campaigns and creatives.</p>
              </div>
              <div className="space-y-2">{pmRoleSlots.map(slot => renderSlotRow(slot))}</div>
            </div>
          )}

          {mode === 'initial' && step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Propose Monthly Targets</h3>
                <p className="text-body text-black/40">Set targets for the client to review. They can accept or suggest changes.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {fields.map(f => renderMetricInput(f, metrics, setMetrics, 'km'))}
              </div>
            </div>
          )}

          {mode === 'initial' && step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-h3 text-black/80 mb-1">Review &amp; Send</h3>
                <p className="text-body text-black/40">Confirm everything looks good before sending to the client.</p>
              </div>

              {/* Team summary */}
              <div>
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-2.5">Team</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(assignments).filter(([, v]) => v).map(([role, empId]) => {
                    const emp = pmEmployeePool.find(e => e.id === empId);
                    return emp ? (
                      <div key={role} className="flex items-center gap-2 px-2.5 py-1.5 bg-black/[0.02] rounded-lg border border-black/[0.05]">
                        <div className="w-6 h-6 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-caption font-bold" aria-hidden="true">{getInitials(emp.name)}</div>
                        <span className="text-caption font-medium text-black/65">{emp.name}</span>
                        <span className="text-caption text-black/45">{role}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Targets summary */}
              <div>
                <p className="text-caption font-semibold text-black/45 uppercase tracking-wider mb-2.5">Targets</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {fields.map(f => metrics[f.key] && (
                    <div key={f.key} className="p-3 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                      <p className="text-caption text-black/45 mb-0.5">{f.label}</p>
                      <p className="text-body font-semibold text-black/70">{formatMetricVal(metrics[f.key], f.prefix, f.suffix)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#204CC7]/[0.03] border border-[#204CC7]/[0.08]">
                <MessageSquareText className="w-4 h-4 text-[#204CC7]/50 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-caption text-[#204CC7]/70 leading-relaxed">The client can review and either accept these targets or propose preferred numbers with a note.</p>
              </div>
            </div>
          )}

          {/* ═══ REVIEW MODE: Target Review Tab ═══ */}
          {mode === 'review' && reviewTab === 'comparison' && kd && (
            <div className="space-y-5" role="tabpanel" aria-label="Targets">

              {/* ── Waiting state ── */}
              {!hasResponse && (
                <>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-black/[0.015] border border-black/[0.05]">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-blue-500" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-body font-medium text-black/70">Waiting for client response</p>
                      <p className="text-caption text-black/45 mt-0.5">Targets sent. The client can accept or suggest changes.</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2.5">Proposed Targets</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {fields.map(f => kd.proposedMetrics[f.key] && (
                        <div key={f.key} className="p-3 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                          <p className="text-caption text-black/45 mb-0.5">{f.label}</p>
                          <p className="text-body font-semibold text-black/70">{formatMetricVal(kd.proposedMetrics[f.key], f.prefix, f.suffix)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Client responded: disputed metrics ── */}
              {hasResponse && disputedFields.length > 0 && (
                <div>
                  <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-3">
                    Needs review <span className="text-amber-500 font-bold ml-1">{disputedFields.length}</span>
                  </p>
                  <div className="space-y-2">
                    {disputedFields.map(f => {
                      const proposed = kd.proposedMetrics[f.key];
                      const clientVal = kd.clientMetrics?.[f.key] ?? '';
                      const note = kd.clientNotes?.[f.key];
                      const isExpanded = expandedNote === f.key;
                      return (
                        <div key={f.key}
                          className={`rounded-xl border transition-all ${isExpanded ? 'border-black/[0.08] bg-white shadow-sm shadow-black/[0.04]' : 'border-black/[0.05] bg-white hover:border-black/[0.1]'}`}>
                          {/* Collapsed row */}
                          <button onClick={() => setExpandedNote(isExpanded ? null : f.key)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left gap-4" aria-expanded={isExpanded} aria-label={`${f.label}: proposed ${formatMetricVal(proposed, f.prefix, f.suffix)}, client prefers ${formatMetricVal(clientVal, f.prefix, f.suffix)}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isExpanded ? 'bg-amber-400' : 'bg-amber-300'}`} />
                              <p className="text-body font-medium text-black/75">{f.label}</p>
                              {note && !isExpanded && <MessageSquareText className="w-3 h-3 text-black/40 flex-shrink-0" aria-hidden="true" />}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-body text-black/45 tabular-nums line-through decoration-black/20">{formatMetricVal(proposed, f.prefix, f.suffix)}</span>
                              <span className="text-body font-semibold text-black/80 tabular-nums">{formatMetricVal(clientVal, f.prefix, f.suffix)}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-black/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </div>
                          </button>

                          {/* Expanded */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3">
                              {/* Three-column comparison: Proposed → Client → Final */}
                              <div className="flex items-stretch gap-2">
                                <div className="flex-1 p-2.5 rounded-lg bg-black/[0.02] border border-black/[0.04]">
                                  <p className="text-caption text-black/40 mb-0.5">Brego proposed</p>
                                  <p className="text-body font-semibold text-black/50 tabular-nums">{formatMetricVal(proposed, f.prefix, f.suffix)}</p>
                                </div>
                                <div className="flex items-center"><ArrowRight className="w-3 h-3 text-black/15" aria-hidden="true" /></div>
                                <div className="flex-1 p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/30">
                                  <p className="text-caption text-amber-600/80 mb-0.5">Client wants</p>
                                  <p className="text-body font-semibold text-amber-700 tabular-nums">{formatMetricVal(clientVal, f.prefix, f.suffix)}</p>
                                </div>
                                <div className="flex items-center"><ArrowRight className="w-3 h-3 text-black/15" aria-hidden="true" /></div>
                                <div className="flex-1 p-2.5 rounded-lg bg-[#204CC7]/[0.04] border border-[#204CC7]/[0.12]">
                                  <label htmlFor={`rv-${f.key}`} className="text-caption text-[#204CC7]/60 mb-0.5 block">Final target</label>
                                  <div className="relative">
                                    {f.prefix && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-body text-[#204CC7]/30" aria-hidden="true">{f.prefix}</span>}
                                    <input id={`rv-${f.key}`} type="text" value={revisedMetrics[f.key]}
                                      onChange={e => setRevisedMetrics(prev => ({ ...prev, [f.key]: e.target.value }))}
                                      className={`w-full ${f.prefix ? 'pl-4' : ''} ${f.suffix ? 'pr-5' : ''} py-0 text-body font-semibold text-[#204CC7] tabular-nums bg-transparent border-none focus:outline-none placeholder:text-[#204CC7]/25`}
                                      placeholder="Set"
                                    />
                                    {f.suffix && <span className="absolute right-0 top-1/2 -translate-y-1/2 text-caption text-[#204CC7]/30" aria-hidden="true">{f.suffix}</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Client note */}
                              {note && (
                                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-black/[0.015]">
                                  <MessageSquareText className="w-3.5 h-3.5 text-black/30 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                  <p className="text-caption text-black/50 leading-relaxed italic">&ldquo;{note}&rdquo;</p>
                                </div>
                              )}

                              {/* Discuss in Channel — inline composer or CTA */}
                              {discussOpen !== f.key ? (
                                <button
                                  onClick={() => { setDiscussOpen(f.key); setDiscussMsg(''); setTimeout(() => composerRef.current?.focus(), 50); }}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-black/[0.08] text-caption font-medium text-black/40 hover:text-[#204CC7] hover:border-[#204CC7]/20 hover:bg-[#204CC7]/[0.02] transition-all"
                                  aria-label={`Discuss ${f.label} in ${clientChannelName} channel`}
                                >
                                  <Hash className="w-3 h-3" aria-hidden="true" />
                                  Discuss in {clientChannelName}
                                </button>
                              ) : (
                                <div className="rounded-xl border border-[#204CC7]/12 bg-white overflow-hidden shadow-sm shadow-black/[0.03]">
                                  {/* Composer header */}
                                  <div className="flex items-center justify-between px-3.5 py-2 bg-[#204CC7]/[0.025] border-b border-[#204CC7]/8">
                                    <div className="flex items-center gap-1.5">
                                      <Hash className="w-3.5 h-3.5 text-[#204CC7]/40" aria-hidden="true" />
                                      <span className="text-caption font-medium text-[#204CC7]/60">{clientChannelName}</span>
                                    </div>
                                    <button onClick={() => { setDiscussOpen(null); setDiscussMsg(''); }} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.05] transition-colors" aria-label="Cancel">
                                      <X className="w-3 h-3 text-black/30" />
                                    </button>
                                  </div>

                                  {/* Auto-attached context card — shows all three values */}
                                  <div className="mx-3.5 mt-3 p-2.5 rounded-lg bg-black/[0.015] border border-black/[0.04]">
                                    <div className="flex items-center gap-3 text-caption tabular-nums">
                                      <span className="font-semibold text-black/60">{f.label}</span>
                                      <span className="text-black/30">·</span>
                                      <span className="text-black/40">Proposed {formatMetricVal(proposed, f.prefix, f.suffix)}</span>
                                      <span className="text-black/20">→</span>
                                      <span className="text-amber-600">Client {formatMetricVal(clientVal, f.prefix, f.suffix)}</span>
                                      <span className="text-black/20">→</span>
                                      <span className="font-semibold text-[#204CC7]">Final {revisedMetrics[f.key] ? formatMetricVal(revisedMetrics[f.key], f.prefix, f.suffix) : '—'}</span>
                                    </div>
                                  </div>

                                  {/* Textarea + send */}
                                  <div className="px-3.5 pt-2.5 pb-3">
                                    <textarea
                                      ref={composerRef}
                                      value={discussMsg}
                                      onChange={e => setDiscussMsg(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDiscussion(f.label, f.key, f.prefix, f.suffix); } }}
                                      placeholder="Add context for the team..."
                                      rows={2}
                                      className="w-full text-body text-black/70 placeholder:text-black/30 bg-transparent border-none resize-none focus:outline-none leading-relaxed"
                                    />
                                    <div className="flex items-center justify-between mt-1.5">
                                      <p className="text-caption text-black/30">Enter to send</p>
                                      <button
                                        onClick={() => handleSendDiscussion(f.label, f.key, f.prefix, f.suffix)}
                                        disabled={!discussMsg.trim()}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-caption font-semibold transition-all ${discussMsg.trim() ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm shadow-[#204CC7]/20' : 'bg-black/[0.04] text-black/30 cursor-not-allowed'}`}
                                        aria-label="Send to channel"
                                      >
                                        <Send className="w-3 h-3" aria-hidden="true" />Send
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Agreed metrics ── */}
              {hasResponse && (() => {
                const agreed = agreedFields.filter(f => !!kd.proposedMetrics[f.key]);
                return agreed.length > 0 ? (
                  <div>
                    <p className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2.5">
                      Agreed <span className="text-[#00C875] font-bold ml-1">{agreed.length}</span>
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {agreed.map(f => (
                        <div key={f.key} className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.01] border border-black/[0.04]">
                          <span className="text-caption text-black/40">{f.label}</span>
                          <span className="text-caption font-semibold text-black/60 tabular-nums">{formatMetricVal(kd.proposedMetrics[f.key], f.prefix, f.suffix)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* ── All agreed message ── */}
              {hasResponse && disputedFields.length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[#00C875]/[0.04] border border-[#00C875]/[0.12]">
                  <div className="w-9 h-9 rounded-full bg-[#00C875]/10 flex items-center justify-center flex-shrink-0">
                    <CircleCheck className="w-4 h-4 text-[#00C875]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-black/70">All targets agreed</p>
                    <p className="text-caption text-black/50 mt-0.5">The client accepted all proposed targets. Ready to finalize.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ REVIEW MODE: Team Tab ═══ */}
          {mode === 'review' && reviewTab === 'team' && kd && (
            <div className="space-y-2" role="tabpanel" aria-label="Team">
              {Object.entries(kd.assignments).filter(([, v]) => v).map(([role, empId]) => {
                const emp = pmEmployeePool.find(e => e.id === empId);
                return emp ? (
                  <div key={role} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.05] bg-white">
                    <div className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-caption font-bold flex-shrink-0" aria-hidden="true">{getInitials(emp.name)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-black/75 truncate">{emp.name}</p>
                      <p className="text-caption text-black/45">{role}</p>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="h-px bg-black/[0.06]" />
        <div className="flex items-center justify-between px-6 py-3.5">
          {mode === 'initial' ? (
            <>
              {step > 1 ? (
                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all" aria-label="Go back">
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />Back
                </button>
              ) : (
                <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all">Cancel</button>
              )}
              {step < 3 ? (
                <button onClick={() => setStep(s => s + 1)} disabled={!canProceed} aria-disabled={!canProceed}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold transition-all ${canProceed ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm shadow-[#7C3AED]/20' : 'bg-black/[0.04] text-black/30 cursor-not-allowed'}`}>
                  Continue<ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button onClick={() => onLaunch(assignments, metrics)} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#7C3AED] text-white hover:bg-[#6D28D9] shadow-sm shadow-[#7C3AED]/20 transition-all">
                  <Send className="w-4 h-4" aria-hidden="true" />Send to Client
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={onClose} className="px-3 py-2 rounded-lg text-body font-medium text-black/40 hover:text-black/60 hover:bg-black/[0.025] transition-all">Close</button>
              {hasResponse && reviewTab === 'comparison' && (
                <button onClick={() => onApprove(revisedMetrics)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-body font-semibold bg-[#00C875] text-white hover:bg-[#00b368] shadow-sm shadow-[#00C875]/20 transition-all">
                  <Check className="w-4 h-4" aria-hidden="true" />Approve
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Sent-to-channel toast ── */}
        {sentToast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[340px] rounded-xl bg-[#1a1a1a] text-white shadow-2xl shadow-black/30 overflow-hidden" style={{ animation: 'modalSlideUp 0.2s ease-out' }} role="status" aria-live="polite">
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#00C875]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-[#00C875]" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-white/90 leading-tight">Sent to #{sentToast.channel}</p>
                <p className="text-caption text-white/40 mt-0.5">{sentToast.metric} · Final target: {sentToast.finalVal}</p>
              </div>
            </div>
            <button
              onClick={handleGoToChannel}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-white/[0.06] text-caption font-medium text-[#7CB3FF] hover:bg-white/[0.04] transition-colors"
            >
              Go to #{sentToast.channel}<ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes modalSlideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Clock icon needed for review mode waiting state
function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

interface PerformanceMarketingProps {
  onBack?: () => void;
}

export function PerformanceMarketing({ onBack }: PerformanceMarketingProps) {
  const [currentView, setCurrentView] = useState<View>('clientList');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientMenu, setShowClientMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [clients, setClients] = useState<Client[]>(mockClients);
  // Per-client editable platform targets (Meta + Google). Seeded lazily when
  // the KSM drawer is first opened so opens don't blow away prior edits.
  const [clientPlatformTargets, setClientPlatformTargets] = useState<Record<string, EditableTargets>>({});
  const updatePlatformTarget = useCallback((clientId: string, platform: 'meta' | 'google', key: MetricKey, raw: number) => {
    setClientPlatformTargets(prev => {
      const cur = prev[clientId];
      if (!cur) return prev;
      // Type-narrow + spread
      if (cur.type === 'Ecommerce') {
        const k = key as keyof EcomTargets;
        return { ...prev, [clientId]: { ...cur, [platform]: { ...cur[platform], [k]: raw } } };
      }
      const k = key as keyof LeadGenTargets;
      return { ...prev, [clientId]: { ...cur, [platform]: { ...cur[platform], [k]: raw } } };
    });
  }, []);

  // KSM drawer — opens when user clicks a Hit/Miss chip on a per-type row.
  // Identity is the (client, businessType) tuple: Lead Gen and E-commerce
  // are entirely separate KPI families, so each row owns its own drawer
  // instance keyed on the type the user clicked.
  const [ksmDrawer, setKsmDrawer] = useState<{ client: Client; businessType: ClientType } | null>(null);
  const openKsmDrawer = (c: Client, businessType: ClientType) => {
    setClientPlatformTargets(prev => {
      if (prev[c.id]) return prev;
      return { ...prev, [c.id]: seedEditableTargets(businessType, generatePlatformBreakdown(c.id, businessType)) };
    });
    setKsmDrawer({ client: c, businessType });
  };
  const [kickoffClient, setKickoffClient] = useState<Client | null>(null);
  const [kickoffMode, setKickoffMode] = useState<'initial' | 'review'>('initial');
  const [growthPlanClient, setGrowthPlanClient] = useState<Client | null>(null);
  const [businessInfoClient, setBusinessInfoClient] = useState<Client | null>(null);

  const handleGrowthPlanStatusChange = useCallback((clientId: string, status: GrowthPlanStatus) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, growthPlanStatus: status } : c));
    // Also update the growthPlanClient ref if open
    setGrowthPlanClient(prev => prev && prev.id === clientId ? { ...prev, growthPlanStatus: status } : prev);
  }, []);

  const [clientComments, setClientComments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    mockClients.forEach(c => { map[c.id] = c.comments; });
    return map;
  });
  const [clientQCDates, setClientQCDates] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    mockClients.forEach(c => { map[c.id] = c.lastQC; });
    return map;
  });
  const [editingQC, setEditingQC] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  // Filter state. `team` is a multi-select array — empty means "no team filter".
  // `growthPlan` was removed (Weekly Plan concept retired from the table).
  const [filters, setFilters] = useState<{ clientType: ClientType | 'All'; ksmTarget: KSMStatus | 'All'; team: string[]; kickoffStatus: KickoffStatus | 'All'; onboarding: OnboardingStatus | 'All' }>({ clientType: 'All', ksmTarget: 'All', team: [], kickoffStatus: 'All', onboarding: 'All' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const menuRef = useRef<HTMLDivElement>(null);
  const qcPopoverRef = useRef<HTMLDivElement>(null);

  // Active filter count — each section that's narrowing the table contributes 1.
  // Team is multi-select; any non-empty selection counts as a single active filter
  // (the panel + chip row will surface the per-member detail).
  const activeFilterCount =
    (filters.clientType !== 'All' ? 1 : 0)
    + (filters.ksmTarget !== 'All' ? 1 : 0)
    + (filters.team.length > 0 ? 1 : 0)
    + (filters.onboarding !== 'All' ? 1 : 0);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowClientMenu(null);
    };
    if (showClientMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showClientMenu]);

  // Close QC scheduler popover on outside click + Escape key
  useEffect(() => {
    if (!editingQC) return;
    const handleClick = (e: MouseEvent) => {
      if (qcPopoverRef.current && !qcPopoverRef.current.contains(e.target as Node)) {
        // Don't close if click is on the trigger button (its onClick toggles state itself)
        const target = e.target as Element;
        if (target.closest('[aria-haspopup="dialog"]')) return;
        setEditingQC(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditingQC(null); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [editingQC]);

  // Pending clients (no team, onboarding not started) live in the onboarding queue,
  // not the main client table. Exclude them from the universe of rows here.
  const activeClients = useMemo(
    () => clients.filter(c => c.onboardingStatus !== 'Pending'),
    [clients]
  );

  // ── Per-type row model ────────────────────────────────────────────────
  // Lead Gen and E-commerce are entirely separate KPI families (CPL/leads
  // vs. ROAS/spend) — comparing them in a single row destroys the user's
  // ability to read performance at a glance. So a client that runs both
  // motions appears as TWO independent rows, each tracked, filtered, and
  // sorted on its own. Row identity = `${clientId}::${businessType}`.
  type ClientRow = Client & { businessType: ClientType; rowKey: string };
  const allRows = useMemo<ClientRow[]>(
    () => activeClients.flatMap(c =>
      c.clientTypes.map(bt => ({ ...c, businessType: bt, rowKey: `${c.id}::${bt}` }))
    ),
    [activeClients]
  );

  const filteredRows = useMemo<ClientRow[]>(() => {
    return allRows
      .filter(row => {
        if (!row.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        // Type filter narrows to rows of the chosen motion — a multi-type
        // client with one Lead-Gen row + one E-com row will keep only the
        // matching one when filtered.
        if (filters.clientType !== 'All' && row.businessType !== filters.clientType) return false;
        if (filters.ksmTarget !== 'All' && row.ksmTarget !== filters.ksmTarget) return false;
        if (filters.team.length > 0 && !row.team.some(t => filters.team.includes(t.initials))) return false;
        if (filters.onboarding !== 'All' && row.onboardingStatus !== filters.onboarding) return false;
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        // Stable secondary key by businessType keeps a client's two rows
        // adjacent when sorting by name.
        if (sortField === 'name') {
          const byName = a.name.localeCompare(b.name) * dir;
          return byName !== 0 ? byName : a.businessType.localeCompare(b.businessType);
        }
        if (sortField === 'clientType') {
          const byType = a.businessType.localeCompare(b.businessType) * dir;
          return byType !== 0 ? byType : a.name.localeCompare(b.name);
        }
        if (sortField === 'ksmTarget') return a.ksmTarget.localeCompare(b.ksmTarget) * dir;
        return 0;
      });
  }, [allRows, searchQuery, filters, sortField, sortDir]);

  const totalClients = activeClients.length;
  const totalRows = allRows.length;
  const hitCount = filteredRows.filter(r => r.ksmTarget === 'Hit').length;
  const missCount = filteredRows.filter(r => r.ksmTarget === 'Miss').length;
  const hitRate = filteredRows.length > 0 ? Math.round((hitCount / filteredRows.length) * 100) : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleClientClick = (client: Client, rowKey: string) => {
    setSelectedClient(client);
    setShowClientMenu(rowKey);
  };

  const handleViewSelect = (view: View) => {
    setCurrentView(view);
    setShowClientMenu(null);
  };

  const handleBackToList = () => {
    setCurrentView('clientList');
    setSelectedClient(null);
  };

  // Bulk select helpers — selection is per-row (rowKey), so a multi-type
  // client can have its E-com row selected without auto-selecting its
  // Lead-Gen row. Each motion is tracked independently.
  const allVisibleSelected = filteredRows.length > 0 && filteredRows.every(r => selectedIds.has(r.rowKey));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRows.map(r => r.rowKey)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const resetFilters = () => setFilters({ clientType: 'All', ksmTarget: 'All', team: [], kickoffStatus: 'All', onboarding: 'All' });

  // ─── CLIENT LIST VIEW ─────────────────────────────────────────
  if (currentView === 'clientList') {
    return (
      <div className="-mx-8 -mt-6">
        {/* ── Sticky Top Header Bar ── */}
        <div className="bg-white border-b border-black/5 sticky -top-6 z-30 px-6">
          <div className="flex items-center justify-between py-4 gap-4">
            {/* Left: Title + Count + Month Nav + Period */}
            <div className="flex items-center gap-4 shrink-0">
              <div>
                <h1 className="text-black/90 text-h2 font-bold">Performance Marketing</h1>
                <p className="text-black/50 mt-0.5 text-caption font-normal">
                  {filteredRows.length} {filteredRows.length === 1 ? 'entry' : 'entries'}
                  <span className="text-black/30 mx-1.5">·</span>
                  {totalClients} {totalClients === 1 ? 'client' : 'clients'}
                </p>
              </div>
              <div className="w-px h-8 bg-black/8" />
              <MonthNavigator
                monthIdx={selectedMonthIdx}
                year={selectedYear}
                onMonthChange={setSelectedMonthIdx}
                onYearChange={setSelectedYear}
                minYear={2024}
              />
              <PeriodLabel monthIdx={selectedMonthIdx} year={selectedYear} />
            </div>

            {/* Right: Search + Filter + Export */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Search */}
              <div className="relative flex items-center w-44">
                <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F6F7FF] border border-black/5 rounded-md placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
                />
              </div>

              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterPanel(p => !p)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md border transition-all active:scale-[0.98] text-caption font-medium ${
                    showFilterPanel || activeFilterCount > 0
                      ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                      : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                {showFilterPanel && (
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    onClose={() => setShowFilterPanel(false)}
                    onReset={resetFilters}
                    activeCount={activeFilterCount}
                  />
                )}
              </div>

              {/* Export / Share */}
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium" title="Export">
                <Share className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* ── Active Filter Tags ──
              Echoes the panel's selections as dismissible chips above the table.
              Team is multi-select: render one chip per selected member so admins
              can drop one without losing the others. */}
          {activeFilterCount > 0 && (() => {
            // Lookup uses module-level SEM_TEAM — adding a member there
            // automatically lights up here without further edits.
            const teamRoster = SEM_TEAM;
            return (
              <div className="flex items-center gap-2 pb-3 flex-wrap">
                <span className="text-black/55 text-caption font-medium">Active filters:</span>
                {filters.clientType !== 'All' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF1FB] text-[#3D5EC7] rounded-lg text-caption font-medium">
                    <Tag className="w-3 h-3" aria-hidden="true" />
                    {filters.clientType}
                    <button
                      onClick={() => setFilters(f => ({ ...f, clientType: 'All' }))}
                      aria-label={`Clear ${filters.clientType} filter`}
                      className="hover:bg-[#204CC7]/10 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.onboarding !== 'All' && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                    filters.onboarding === 'Complete' ? 'bg-emerald-50 text-emerald-700'
                    : filters.onboarding === 'In Progress' ? 'bg-amber-50 text-amber-700'
                    : 'bg-black/[0.04] text-black/60'
                  }`}>
                    <Building2 className="w-3 h-3" aria-hidden="true" />
                    {filters.onboarding}
                    <button
                      onClick={() => setFilters(f => ({ ...f, onboarding: 'All' }))}
                      aria-label={`Clear ${filters.onboarding} filter`}
                      className="hover:bg-black/5 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.ksmTarget !== 'All' && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium ${
                    filters.ksmTarget === 'Hit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                  }`}>
                    <Target className="w-3 h-3" aria-hidden="true" />
                    {filters.ksmTarget}
                    <button
                      onClick={() => setFilters(f => ({ ...f, ksmTarget: 'All' }))}
                      aria-label={`Clear ${filters.ksmTarget} filter`}
                      className="hover:bg-black/5 rounded p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {/* One chip per selected team member — independently dismissible. */}
                {filters.team.map(initials => {
                  const tm = teamRoster.find(t => t.initials === initials);
                  if (!tm) return null;
                  return (
                    <span
                      key={initials}
                      className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 bg-violet-50 text-violet-700 rounded-lg text-caption font-medium"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-caption font-semibold"
                        style={{ backgroundColor: tm.color }}
                        aria-hidden="true"
                      >
                        {tm.initials}
                      </span>
                      {tm.name}
                      <button
                        onClick={() => setFilters(f => ({ ...f, team: f.team.filter(i => i !== initials) }))}
                        aria-label={`Remove ${tm.name} from filter`}
                        className="hover:bg-violet-100 rounded p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                <button onClick={resetFilters} className="text-[#204CC7] hover:underline text-caption font-medium">Clear all</button>
              </div>
            );
          })()}
        </div>

        {/* ── Content ── */}
        <div className="p-6">

        {/* ── Bulk Action Bar ── */}
        {someSelected && (
          <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-[#204CC7] rounded-xl text-white animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 flex-1">
              <Check className="w-4 h-4" />
              <span className="text-caption font-medium">{selectedIds.size} entr{selectedIds.size > 1 ? 'ies' : 'y'} selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Share className="w-3.5 h-3.5" />
                Share
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Tag className="w-3.5 h-3.5" />
                Bulk Tag
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors text-caption font-medium">
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
              <div className="w-px h-5 bg-white/20 mx-1" />
              <button onClick={clearSelection} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Data Table ── */}
        <div className="bg-white rounded-xl border border-black/5 overflow-hidden min-w-0 relative">
          <div className="overflow-x-auto">
            <table style={{ minWidth: 1276, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 220 }} />  {/* 1: client    — sticky left */}
                <col style={{ width: 156 }} />  {/* 2: team — fits up to 4 circles + overflow chip */}
                <col style={{ width: 144 }} />  {/* 3: type */}
                <col style={{ width: 138 }} />  {/* 4: onboarding */}
                <col style={{ width: 130 }} />  {/* 5: last QC */}
                <col style={{ width: 126 }} />  {/* 6: next QC */}
                <col style={{ width: 112 }} />  {/* 7: KSM */}
                <col style={{ width: 200 }} />  {/* 8: comments */}
                <col style={{ width: 56 }} />   {/* 9: actions  — sticky right */}
              </colgroup>
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="text-left py-3.5 pl-5 pr-4 sticky left-0 z-[31] bg-white">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 hover:text-black/70 transition-colors group">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Clients</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-left py-3.5 px-4">
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Team</span>
                  </th>
                  <th className="text-left py-3.5 px-4">
                    <button onClick={() => handleSort('clientType')} className="flex items-center gap-1.5 hover:text-black/70 transition-colors group">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Type</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-center py-3.5 px-4">
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Onboarding</span>
                  </th>
                  <th className="text-left py-3.5 px-4" colSpan={2}>
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Next QC</span>
                  </th>
                  <th className="text-center py-3.5 px-4">
                    <button onClick={() => handleSort('ksmTarget')} className="flex items-center gap-1.5 justify-center hover:text-black/70 transition-colors group mx-auto">
                      <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">KSM</span>
                      <ArrowUpDown className="w-3 h-3 text-black/20 group-hover:text-black/50 transition-colors" />
                    </button>
                  </th>
                  <th className="text-left py-3.5 px-4">
                    <span className="text-black/50 text-micro font-semibold uppercase tracking-wider">Comments</span>
                  </th>
                  <th className="py-3.5 pr-4 sticky right-0 z-[31] bg-white" style={{ boxShadow: '-2px 0 6px -2px rgba(0,0,0,0.04)' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => {
                  const client = row;
                  const isSelected = selectedIds.has(row.rowKey);
                  // A multi-type client renders as two adjacent rows. Each
                  // row is fully self-describing and visually identical —
                  // the type chip is what differentiates them. Acting on a
                  // row only ever affects that (client × business type)
                  // pair.
                  return (
                    <tr
                      key={row.rowKey}
                      className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#EEF1FB]/40' : idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                      }`}
                    >
                      {/* Client name (sticky) — rendered identically on
                          every row, including the second row of a
                          multi-type client. The type chip carries the
                          differentiation; the name does not need to. */}
                      <td className={`py-3.5 pl-5 pr-4 sticky left-0 z-20 ${isSelected ? 'bg-[#EEF1FB]/40' : idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'} group-hover:bg-[#F6F7FF]/50`}>
                        <span className="text-black/85 text-body font-medium whitespace-nowrap">{client.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {client.team.length > 0 ? (
                          <TeamAvatarStack team={client.team} />
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBusinessInfoClient(client); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-black/15 text-black/55 text-caption font-medium hover:bg-black/[0.03] hover:text-black/75 hover:border-black/25 transition-colors"
                            aria-label={`Assign team to ${client.name}`}
                          >
                            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                            Assign
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {/* Single chip — this row IS one (client × type)
                            tuple. Lead Gen and E-commerce are completely
                            separate KPI families (CPL/leads vs. ROAS/spend),
                            so a multi-type client appears as two independent
                            rows and KSM, history, and targets are scoped to
                            this row's businessType. */}
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium whitespace-nowrap ${
                            row.businessType === 'Ecommerce'
                              ? 'bg-[#EEF1FB] text-[#3D5EC7]'
                              : 'bg-violet-50 text-violet-600'
                          }`}
                          title={row.businessType}
                        >
                          {row.businessType}
                        </span>
                      </td>
                      {/* ONBOARDING STATUS — binary by design.
                          A client is either fully live (business info
                          complete AND kickoff signed off → Complete) or
                          they're somewhere in the onboarding pipeline
                          (→ In Progress). The intermediate states
                          (kickoff pending, in review) live in the row's
                          ⋮ menu as direct actions, not as visual states
                          that compete with KSM for the eye. */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {client.onboardingStatus === 'Complete' && client.kickoffStatus === 'Done' ? (
                          <button
                            onClick={() => setBusinessInfoClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-caption font-medium hover:bg-emerald-100/80 hover:border-emerald-300 transition-all whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Complete
                          </button>
                        ) : (
                          <button
                            onClick={() => setBusinessInfoClient(client)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-700 text-caption font-medium hover:bg-amber-100/80 hover:border-amber-300 transition-all whitespace-nowrap"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            In Progress
                          </button>
                        )}
                      </td>
                      {/* ───────────────────────────────────────────────────────
                          Next QC cell — one line: date + subtle relative label.
                          Click opens a tiny popover with just a date input and a
                          "Today" shortcut. Next QC is auto-derived (+15 days) so
                          editing happens against the Last QC date.
                          ─────────────────────────────────────────────────────── */}
                      <td className="py-3.5 px-4 relative" colSpan={2} onClick={(e) => e.stopPropagation()}>
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : (() => {
                          const lastISO = clientQCDates[client.id] || client.lastQC;
                          const nextISO = addDays(lastISO, 15);
                          const status = getQCStatus(nextISO);
                          const toneClass: Record<QCTone, string> = {
                            overdue: 'text-rose-600',
                            today:   'text-[#204CC7]',
                            tomorrow:'text-amber-600',
                            soon:    'text-black/50',
                            normal:  'text-black/40',
                          };
                          const isOpen = editingQC === client.id;
                          return (
                            <>
                              <button
                                onClick={() => setEditingQC(isOpen ? null : client.id)}
                                aria-haspopup="dialog"
                                aria-expanded={isOpen}
                                className="inline-flex items-center gap-1.5 -mx-1.5 px-1.5 py-1 rounded-lg hover:bg-black/[0.03] transition-colors text-left whitespace-nowrap"
                                title="Click to reschedule"
                              >
                                <span className="text-caption font-medium text-black/70 tabular-nums">
                                  {formatQCDate(nextISO)}
                                </span>
                                {status.label && (
                                  <span className={`text-caption font-medium ${toneClass[status.tone]}`}>
                                    · {status.label}
                                  </span>
                                )}
                              </button>

                              {isOpen && (
                                <div
                                  ref={qcPopoverRef}
                                  role="dialog"
                                  aria-label="Set last QC date"
                                  className="absolute top-full left-3 mt-1 z-50 w-[230px] bg-white rounded-xl border border-black/[0.08] shadow-xl shadow-black/[0.10] p-3"
                                >
                                  <span className="text-caption text-black/50 font-medium mb-1.5 block">Last QC</span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="date"
                                      value={lastISO}
                                      max={todayISO()}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) setClientQCDates(prev => ({ ...prev, [client.id]: val }));
                                      }}
                                      className="flex-1 min-w-0 px-2.5 py-1.5 border border-black/[0.12] rounded-lg outline-none text-caption font-medium text-black/75 bg-white focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                                    />
                                    <button
                                      onClick={() => setClientQCDates(prev => ({ ...prev, [client.id]: todayISO() }))}
                                      className="text-caption font-semibold text-[#204CC7] px-2.5 py-1.5 rounded-lg bg-[#EEF1FB]/60 hover:bg-[#EEF1FB] transition-colors whitespace-nowrap"
                                    >
                                      Today
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {client.kickoffStatus === 'Pending' ? (
                          <span className="text-black/20 text-body">—</span>
                        ) : client.ksmTarget === 'Hit' ? (
                          <button
                            onClick={() => openKsmDrawer(client, row.businessType)}
                            aria-label={`Open ${client.name} (${row.businessType}) performance drawer — KSM Hit`}
                            title={`View ${row.businessType} performance breakdown`}
                            className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-caption font-semibold whitespace-nowrap hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-sm hover:-translate-y-px active:translate-y-0 active:shadow-none transition-all group/ksm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Hit
                            <ChevronRight className="w-3 h-3 text-emerald-500/55 group-hover/ksm:text-emerald-700 group-hover/ksm:translate-x-0.5 transition-all" aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openKsmDrawer(client, row.businessType)}
                            aria-label={`Open ${client.name} (${row.businessType}) performance drawer — KSM Miss`}
                            title={`View ${row.businessType} performance breakdown`}
                            className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-rose-50 border border-rose-200/70 text-rose-700 text-caption font-semibold whitespace-nowrap hover:bg-rose-100 hover:border-rose-300 hover:shadow-sm hover:-translate-y-px active:translate-y-0 active:shadow-none transition-all group/ksm focus:outline-none focus:ring-2 focus:ring-rose-500/30 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                            Miss
                            <ChevronRight className="w-3 h-3 text-rose-500/55 group-hover/ksm:text-rose-700 group-hover/ksm:translate-x-0.5 transition-all" aria-hidden="true" />
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="Add a note..."
                          value={clientComments[client.id] || ''}
                          onChange={(e) => setClientComments(prev => ({ ...prev, [client.id]: e.target.value }))}
                          className="w-full bg-transparent border-none outline-none text-black/65 placeholder:text-black/25 hover:placeholder:text-black/35 focus:placeholder:text-black/30 transition-colors text-caption font-normal"
                        />
                      </td>
                      <td className={`py-3.5 pr-4 relative sticky right-0 z-20 ${isSelected ? 'bg-[#EEF1FB]' : 'bg-white'} group-hover:bg-[#F6F7FF]`} style={{ boxShadow: '-2px 0 6px -2px rgba(0,0,0,0.04)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClientClick(client, row.rowKey); }}
                          className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                          aria-label={`Open actions for ${client.name} (${row.businessType})`}
                        >
                          <MoreVertical className="w-4 h-4 text-black/50" />
                        </button>
                        {showClientMenu === row.rowKey && (
                          <div ref={menuRef} className="absolute right-10 top-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 min-w-[220px]">
                            {/* Kickoff actions surface only when actionable.
                                A row in the kickoff pipeline sees the next
                                step at the top of the menu so it's always
                                one click away. */}
                            {client.kickoffStatus === 'Pending' && (
                              <>
                                <button
                                  onClick={() => { setKickoffMode('initial'); setKickoffClient(client); setShowClientMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left"
                                >
                                  <Zap className="w-4 h-4 text-violet-600" />
                                  <span className="text-black/75 text-caption font-medium">Start kickoff</span>
                                </button>
                                <div className="my-1 border-t border-black/[0.05]" />
                              </>
                            )}
                            {client.kickoffStatus === 'Onboarding' && (
                              <>
                                <button
                                  onClick={() => { setKickoffMode('review'); setKickoffClient(client); setShowClientMenu(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left"
                                >
                                  <Eye className="w-4 h-4 text-blue-600" />
                                  <span className="text-black/75 text-caption font-medium">Review for HOD sign-off</span>
                                </button>
                                <div className="my-1 border-t border-black/[0.05]" />
                              </>
                            )}
                            <button onClick={() => { setBusinessInfoClient(client); setShowClientMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left">
                              <Building2 className="w-4 h-4 text-[#5B7FD6]" />
                              <span className="text-black/75 text-caption font-medium">Business Info</span>
                            </button>
                            <button onClick={() => handleViewSelect('mediaPlan')} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F6F7FF] transition-colors text-left">
                              <FileText className="w-4 h-4 text-[#5B7FD6]" />
                              <span className="text-black/75 text-caption font-medium">Planning</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                      <p className="text-black/55 text-body font-medium">No entries match your filters</p>
                      <button onClick={resetFilters} className="mt-2 text-[#204CC7] hover:underline text-caption font-medium">Reset filters</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
            <span className="text-black/55 text-caption font-normal">
              Showing {filteredRows.length} of {totalRows} {totalRows === 1 ? 'entry' : 'entries'}
              <span className="text-black/30 mx-1.5">·</span>
              {totalClients} {totalClients === 1 ? 'client' : 'clients'}
            </span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3 py-1.5 rounded-lg border border-black/8 text-black/60 hover:bg-black/[0.03] transition-all disabled:opacity-30 text-caption font-medium">
                Previous
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-[#EEF1FB] text-[#204CC7] text-caption font-semibold">1</span>
              <button className="px-3 py-1.5 rounded-lg border border-black/8 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                Next
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* ── Business Info Modal ── */}
        {businessInfoClient && (
          <BusinessInfoModal
            client={businessInfoClient}
            onClose={() => setBusinessInfoClient(null)}
          />
        )}

        {/* ── Growth Plan Modal ── */}
        {growthPlanClient && (
          <GrowthPlanModal
            client={growthPlanClient}
            onClose={() => setGrowthPlanClient(null)}
            onStatusChange={handleGrowthPlanStatusChange}
          />
        )}

        {/* ── KSM Drawer (Hit/Miss chip → performance + targets + history) ── */}
        {ksmDrawer && clientPlatformTargets[ksmDrawer.client.id] && (
          <KsmDrawer
            client={ksmDrawer.client}
            businessType={ksmDrawer.businessType}
            targets={clientPlatformTargets[ksmDrawer.client.id]}
            history={generateClientHistory(ksmDrawer.client.id, ksmDrawer.businessType)}
            current={generatePlatformBreakdown(ksmDrawer.client.id, ksmDrawer.businessType)}
            onUpdateTarget={(platform, key, raw) =>
              updatePlatformTarget(ksmDrawer.client.id, platform, key, raw)
            }
            onClose={() => setKsmDrawer(null)}
          />
        )}

        {/* ── Kickoff Modal ── */}
        {kickoffClient && (
          <KickoffModal
            client={kickoffClient}
            mode={kickoffMode}
            onClose={() => setKickoffClient(null)}
            onLaunch={(assignments, metrics) => {
              // Pending → Onboarding: store kickoff data and assign team avatars
              setClients(prev => prev.map(c => {
                if (c.id !== kickoffClient.id) return c;
                const assignedTeam = Object.entries(assignments)
                  .filter(([, v]) => v)
                  .map(([, empId]) => {
                    const emp = pmEmployeePool.find(e => e.id === empId);
                    const initials = emp ? emp.name.split(' ').map(n => n[0]).join('') : '';
                    return { initials, color: '#7c3aed' };
                  });
                return {
                  ...c,
                  kickoffStatus: 'Onboarding' as KickoffStatus,
                  team: assignedTeam,
                  kickoffData: { assignments, proposedMetrics: metrics },
                };
              }));
              setKickoffClient(null);
            }}
            onApprove={(finalMetrics) => {
              // HOD approves → Done + set planStartDate for Growth Plan
              const today = new Date().toISOString().split('T')[0];
              setClients(prev => prev.map(c => {
                if (c.id !== kickoffClient.id) return c;
                return {
                  ...c,
                  kickoffStatus: 'Done' as KickoffStatus,
                  lastQC: today,
                  planStartDate: c.planStartDate || today, // Set plan start only if not already set
                  kickoffData: c.kickoffData ? { ...c.kickoffData, proposedMetrics: finalMetrics } : undefined,
                };
              }));
              setClientQCDates(prev => ({ ...prev, [kickoffClient.id]: today }));
              setKickoffClient(null);
            }}
          />
        )}
      </div>
    );
  }

  // ─── CLIENT DETAIL VIEW ──────────────────────────────────────
  if ((currentView === 'creativeWorkflow' || currentView === 'mediaPlan') && selectedClient) {
    return (
      <ClientDetailView
        client={selectedClient}
        onBack={handleBackToList}
        monthIdx={selectedMonthIdx}
        year={selectedYear}
        onMonthChange={setSelectedMonthIdx}
        onYearChange={setSelectedYear}
      />
    );
  }

  // ─── REPORTS VIEW ──────────────────────────────────────────────
  if (currentView === 'reports' && selectedClient) {
    return (
      <div className="-mx-8 -mt-6">
        <div className="bg-white border-b border-black/5 px-6 py-4 sticky -top-6 z-30">
          <div className="flex items-center gap-3">
            <button onClick={handleBackToList} className="p-2 hover:bg-black/[0.04] rounded-md transition-colors">
              <ChevronLeft className="w-5 h-5 text-black/60" />
            </button>
            <div>
              <h1 className="text-black/90 text-h2 font-bold">{selectedClient.name}</h1>
              <p className="text-black/55 text-caption font-normal">Reports</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-black/5 p-20 text-center mx-6 mt-4 mb-6">
          <BarChart3 className="w-16 h-16 text-black/10 mx-auto mb-4" />
          <h3 className="text-black/80 mb-2 text-h3 font-semibold">Reports</h3>
          <p className="text-black/55 text-caption font-normal">Client reports interface coming soon</p>
        </div>
      </div>
    );
  }

  return null;
}
