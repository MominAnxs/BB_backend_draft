'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users, IndianRupee, TrendingUp, Star, AlertCircle, Briefcase,
  AlertTriangle, Sparkles, ArrowUp, ArrowDown, ArrowUpRight, Calendar,
  ChevronDown, ChevronLeft, ChevronRight, X, ListTodo, Target,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
// Import from the leaf routes module rather than from SuperAdminHome —
// SuperAdminHome imports this component, so importing back from it would
// form a circular dependency (Turbopack: "Cannot access
// 'SUPER_ADMIN_HOME_ROUTES' before initialization").
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';

// ══════════════════════════════════════════════════════════════════════════════
// Performance Marketing Overview — parity refactor with Customers / Employees.
//
// Design pattern (per the design-critique we just shipped):
//   1. The page surfaces 8 metric cards in a 4×2 grid, grouped under two
//      labelled sections — SNAPSHOT (state of the SEM business) and
//      ACTION QUEUE (what needs attention right now).
//   2. Each card opens an 880px right drawer with: Hero → Insights → Chart →
//      Table. Filter state lives inside the drawer body, not on the page.
//   3. The within-service split is E-Com vs Lead Gen (the two PM client
//      types), instead of A&T vs SEM as on Customers/Employees — that's the
//      cross-cut a Super Admin cares about *within* the SEM book.
//   4. KpiCard chrome, drawer chrome, focus-management, Esc + Tab-trap, and
//      the section-label pattern are 1:1 copies of CustomersOverview so the
//      Super Admin moves between tabs without re-learning the surface.
//
// What was here before this refactor:
//   A dense HOD-style operator dashboard (task lists + attention list +
//   per-client performance tables + charts + birthdays). That belongs in
//   the SEM workspace / Deliverables sub-tab — the Super Admin Overview
//   should answer "is SEM healthy?" in two seconds, not show every cell.
//
// The deeper Deliverables view is one click away via the left nav sub-tab,
// so we lost no information — we re-organised it.
// ══════════════════════════════════════════════════════════════════════════════

const BLUE = '#204CC7';
const C_ECOM = '#6366F1';   // E-Commerce — indigo
const C_LG = '#F59E0B';     // Lead Gen — amber
const C_SEM = '#7C3AED';    // PM brand purple — used for SEM-only icons
const RED = '#E2445C';
const GREEN = '#00C875';
const AMBER = '#FDAB3D';

// ─── Helper formatters ─────────────────────────────────────────────────────────

const formatLakh = (v: number): string =>
  v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` :
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` :
  v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` :
  `₹${v}`;

// ─── KpiCard ───────────────────────────────────────────────────────────────────
// Mirrors CustomersOverview/KpiCard, with E-Com / Lead Gen as the split
// instead of A&T / SEM. Color tokens swapped via C_ECOM / C_LG.

type KpiCardProps = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  splitEcom: React.ReactNode;
  splitLeadgen: React.ReactNode;
  splitEcomNum: number;
  splitLeadgenNum: number;
  /** Suppress the proportion bar for averaged/categorical metrics. */
  splitBar?: boolean;
  splitEcomLabel?: string;
  splitLeadgenLabel?: string;
  /** Color overrides — defaults to the E-Com indigo / Lead Gen amber tokens.
      Override when the split is semantically *not* E-Com/Lead Gen (e.g.
      Tasks: Client/Internal; Targets: Hit/Miss with green/red semantics). */
  splitEcomColor?: string;
  splitLeadgenColor?: string;
  onClick: () => void;
  ariaLabel: string;
};

function KpiCard({
  Icon,
  title,
  value,
  delta,
  splitEcom,
  splitLeadgen,
  splitEcomNum,
  splitLeadgenNum,
  splitBar = true,
  splitEcomLabel = 'E-Com',
  splitLeadgenLabel = 'Lead Gen',
  splitEcomColor = C_ECOM,
  splitLeadgenColor = C_LG,
  onClick,
  ariaLabel,
}: KpiCardProps) {
  const total = Math.abs(splitEcomNum) + Math.abs(splitLeadgenNum);
  const ecomPct = total > 0 ? (Math.abs(splitEcomNum) / total) * 100 : 50;
  const lgPct = total > 0 ? (Math.abs(splitLeadgenNum) / total) * 100 : 50;

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative bg-white rounded-xl p-5 border border-black/[0.06] hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#204CC7]/[0.025] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Top row: icon + label + chevron */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08]">
            <Icon className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <span className="text-black/65 text-caption font-semibold truncate">{title}</span>
        </div>
        <ChevronRight
          className="w-4 h-4 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Headline + delta */}
      <div className="relative">
        <div className="text-h1 leading-none">{value}</div>
        {delta && <div className="mt-2.5">{delta}</div>}
      </div>

      {/* Split — E-Com / Lead Gen */}
      <div className="relative mt-5 pt-4 border-t border-black/[0.05]">
        {splitBar && (
          <div
            className="flex h-1.5 rounded-full overflow-hidden mb-2.5 bg-black/[0.04]"
            role="img"
            aria-label={`${splitEcomLabel} ${ecomPct.toFixed(0)} percent, ${splitLeadgenLabel} ${lgPct.toFixed(0)} percent`}
          >
            <div style={{ width: `${ecomPct}%`, backgroundColor: splitEcomColor }} />
            <div style={{ width: `${lgPct}%`, backgroundColor: splitLeadgenColor }} />
          </div>
        )}
        {/* Split values — single row with both segments side by side.
            Label truncates to ellipsis when space is tight; the value is
            flex-shrink-0 so the number is ALWAYS visible. */}
        <div className="flex items-center justify-between text-caption gap-3">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: splitEcomColor }} aria-hidden="true" />
            <span className="text-black/60 truncate">{splitEcomLabel}</span>
            <span className="text-black/85 font-semibold tabular-nums flex-shrink-0">{splitEcom}</span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: splitLeadgenColor }} aria-hidden="true" />
            <span className="text-black/60 truncate">{splitLeadgenLabel}</span>
            <span className="text-black/85 font-semibold tabular-nums flex-shrink-0">{splitLeadgen}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── DeltaPill ─────────────────────────────────────────────────────────────────

type DeltaDirection = 'positive' | 'negative' | 'neutral';

function DeltaPill({
  value,
  suffix = '%',
  label,
  direction,
}: {
  value: number | string;
  suffix?: string;
  label?: string;
  direction: DeltaDirection;
}) {
  const cls =
    direction === 'positive' ? 'bg-emerald-50 text-emerald-700'
    : direction === 'negative' ? 'bg-rose-50 text-rose-700'
    : 'bg-black/[0.04] text-black/70';
  const Arrow = direction === 'positive' ? ArrowUp
              : direction === 'negative' ? ArrowDown
              : null;
  return (
    <span className={`inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold ${cls}`}>
      {Arrow && <Arrow className="w-2.5 h-2.5" aria-hidden="true" />}
      <span className="tabular-nums">{value}{suffix}</span>
      {label && <span className="font-normal opacity-70 ml-0.5">{label}</span>}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PM OVERVIEW — Default screen for ?tab=performance-marketing&sub=overview
// ══════════════════════════════════════════════════════════════════════════════

type KpiId =
  | 'active'
  | 'revenue'
  | 'margin'
  | 'ratings'
  | 'incidents'
  | 'onboarding'
  | 'cla'
  | 'upsell'
  | 'targets';
// Note: 'tasks' is intentionally NOT a KpiId. The Tasks card navigates
// directly to /workspace/task-management and never opens a drawer.

type KsmFilter = 'All' | 'Hit' | 'Miss';

type ClientType = 'E-Com' | 'Lead Gen';
type TypeFilter = 'All' | ClientType;
type TaskScope = 'Client' | 'Internal';
type TaskPriority = 'P1' | 'P2' | 'P3';
// (TaskScopeFilter / TaskPriorityFilter were used by the removed
// TasksDrawerBody filter selects — the drawer is gone, so are they.)
type DateRange = 'ytd' | 'mtd' | 'weekly' | 'q1' | 'q2' | 'q3' | 'q4';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — PM-scoped, single source of truth
// All headline numbers are derived from / consistent with these objects so
// the cards and the drawer hero values can never drift.
// ─────────────────────────────────────────────────────────────────────────────

// HEADLINE OBJECTS — drive both card and drawer hero. Every headline below
// (margin, ratings, incidents, onboarding, claData, upsell, activeClients,
// revenue, targets) is *derived* from the corresponding row-level list (or
// from activeClientList directly). Headlines and tables can never disagree
// at any scale. See the IIFE block below the lists for the derivations.
// `change` / `prevTotal` (historical context) stay hardcoded since they
// aren't derivable from the current snapshot.

// Tasks summary — drives the WORKLOAD hero card and the tasks drawer hero.
// Numbers are derived from `pmTasksList` below so the strip can never lie.
const TODAY_ISO = '2026-04-04';
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - new Date(TODAY_ISO).getTime()) / 86400000);

// Tenure formatter — converts a "MMM YYYY" engagement-start string into a
// human-readable duration like "8m" or "1y 8m" relative to TODAY_ISO.
// Designed for table cells: short, scannable, tabular-nums-friendly. The
// raw start date is preserved as a `title` tooltip on the rendering site
// so the original information isn't lost — hover the cell to see it.
const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
const formatTenure = (since: string): string => {
  const [mon, yearStr] = since.split(' ');
  const startMonth = MONTH_INDEX[mon];
  const startYear = parseInt(yearStr, 10);
  if (startMonth === undefined || Number.isNaN(startYear)) return since;
  const today = new Date(TODAY_ISO);
  const months = Math.max(0, (today.getFullYear() - startYear) * 12 + (today.getMonth() - startMonth));
  if (months < 1) return 'New';
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths === 0 ? `${years}y` : `${years}y ${remMonths}m`;
};

// 6-MONTH TRENDS — last data point matches the headline above
const activeTrend = [
  { month: 'Nov', total: 49, ecom: 26, leadgen: 23 },
  { month: 'Dec', total: 50, ecom: 27, leadgen: 23 },
  { month: 'Jan', total: 50, ecom: 27, leadgen: 23 },
  { month: 'Feb', total: 51, ecom: 28, leadgen: 23 },
  { month: 'Mar', total: 49, ecom: 26, leadgen: 23 },
  { month: 'Apr', total: 52, ecom: 28, leadgen: 24 },
];

// Trend backfill — last data point matches the derived `revenue` headline
// (which sums activeClientList) so the chart's Apr bar can never disagree
// with the card. Earlier months are seeded for a believable growth curve.
const revenueTrend = [
  { month: 'Nov', ecom: 17500000, leadgen: 7300000 },
  { month: 'Dec', ecom: 18000000, leadgen: 7500000 },
  { month: 'Jan', ecom: 18800000, leadgen: 7800000 },
  { month: 'Feb', ecom: 19500000, leadgen: 8100000 },
  { month: 'Mar', ecom: 20200000, leadgen: 8300000 },
  { month: 'Apr', ecom: 21005000, leadgen: 8605000 },
];

// All trend Apr values match the derived headlines computed from the lists
// further down. Earlier months are seeded for believable curves; the final
// data point is the one that shows up next to the headline number in each
// drawer hero, so it must agree.

// Margin: improving curve crossing the 30% target in Jan, ending at 31.5%.
const marginTrend = [
  { month: 'Nov', rate: 28.0, ecom: 29.5, leadgen: 25.8 },
  { month: 'Dec', rate: 28.8, ecom: 30.2, leadgen: 26.5 },
  { month: 'Jan', rate: 29.6, ecom: 31.0, leadgen: 27.2 },
  { month: 'Feb', rate: 30.4, ecom: 31.8, leadgen: 27.9 },
  { month: 'Mar', rate: 30.5, ecom: 31.9, leadgen: 28.0 },
  { month: 'Apr', rate: 31.5, ecom: 32.7, leadgen: 28.8 },
];

// Rating distribution sized for the 18-rating sample (1+2+3+7+5 = 18).
const ratingsDistribution = [
  { stars: '1★', count: 1 },
  { stars: '2★', count: 2 },
  { stars: '3★', count: 3 },
  { stars: '4★', count: 7 },
  { stars: '5★', count: 5 },
];

// Incidents: peaked at 11 in Mar, dropping to 9 in Apr (improving). Severity
// counts at Apr (3/3/3) match the derived `incidents` headline.
const incidentTrend = [
  { month: 'Nov', critical: 1, high: 2, medium: 3 },
  { month: 'Dec', critical: 2, high: 2, medium: 3 },
  { month: 'Jan', critical: 2, high: 3, medium: 3 },
  { month: 'Feb', critical: 2, high: 3, medium: 4 },
  { month: 'Mar', critical: 4, high: 4, medium: 3 },
  { month: 'Apr', critical: 3, high: 3, medium: 3 },
];

// Onboarding throughput sized for the 52-client book — 8 new in pipe + 4
// completed this month matches the derived `onboarding` headline.
const onboardingTrend = [
  { month: 'Nov', new: 5, completed: 4 },
  { month: 'Dec', new: 5, completed: 4 },
  { month: 'Jan', new: 6, completed: 5 },
  { month: 'Feb', new: 7, completed: 5 },
  { month: 'Mar', new: 7, completed: 4 },
  { month: 'Apr', new: 8, completed: 4 },
];

// CLA: peaked at 11 (3+8) in Mar, dropping to 9 (3+6) in Apr (improving).
const claTrend = [
  { month: 'Nov', sureshot: 1, saveable: 4 },
  { month: 'Dec', sureshot: 2, saveable: 5 },
  { month: 'Jan', sureshot: 2, saveable: 5 },
  { month: 'Feb', sureshot: 3, saveable: 6 },
  { month: 'Mar', sureshot: 4, saveable: 7 },
  { month: 'Apr', sureshot: 3, saveable: 6 },
];

// Upsell pipeline value, climbing as the SEM book grew. Apr matches the
// derived sum of upsellList potentials.
const upsellTrend = [
  { month: 'Nov', potential:  800000 },
  { month: 'Dec', potential:  950000 },
  { month: 'Jan', potential: 1100000 },
  { month: 'Feb', potential: 1200000 },
  { month: 'Mar', potential: 1280000 },
  { month: 'Apr', potential: 1365000 },
];

// ROW-LEVEL DATA — single source of truth for every client-level drawer table.
// 52 entries (28 E-Com + 24 Lead Gen) sized to match the SEM book the Super
// Admin actually owns. Each entry carries:
//   - identity:    client, type, hod, since, billing
//   - performance: ksm, revenue, cost, margin (drives Hit-rate, Revenue, Margin drawers)
// `revenueClientList` and `marginClientList` were merged into this list — every
// drawer that needs revenue/margin data derives it inline. One list, one truth.
type ClientRow = {
  client: string;
  type: ClientType;
  ksm: 'Hit' | 'Miss';
  hod: string;
  billing: number;     // monthly retainer fee (₹)
  since: string;       // engagement start
  revenue: number;     // monthly gross revenue this client drives (₹)
  cost: number;        // monthly cost-of-service for this client (₹)
  margin: number;      // % margin on this client (computed = (rev-cost)/rev*100)
};

const activeClientList: ClientRow[] = [
  // ─── E-Com · KSM Hit (10) ──────────────────────────────────────────────
  { client: 'Elan by Aanchal',    type: 'E-Com', ksm: 'Hit',  hod: 'Chinmay P.', billing: 295000, since: 'Aug 2024', revenue: 1534000, cost:  970000, margin: 36.8 },
  { client: 'True Diamond',       type: 'E-Com', ksm: 'Hit',  hod: 'Amisha J.',  billing: 340000, since: 'Mar 2024', revenue: 1972000, cost: 1232500, margin: 37.5 },
  { client: 'Atharv Couture',     type: 'E-Com', ksm: 'Hit',  hod: 'Chinmay P.', billing: 285000, since: 'Apr 2024', revenue: 1480000, cost:  925000, margin: 37.5 },
  { client: 'Velora Jewels',      type: 'E-Com', ksm: 'Hit',  hod: 'Amisha J.',  billing: 320000, since: 'Feb 2024', revenue: 1810000, cost: 1140000, margin: 37.0 },
  { client: 'Saanjh Activewear',  type: 'E-Com', ksm: 'Hit',  hod: 'Chinmay P.', billing: 245000, since: 'Jun 2024', revenue: 1280000, cost:  812000, margin: 36.6 },
  { client: 'Pristine Diamonds',  type: 'E-Com', ksm: 'Hit',  hod: 'Amisha J.',  billing: 410000, since: 'Nov 2023', revenue: 2150000, cost: 1335000, margin: 37.9 },
  { client: 'Aksha Skincare',     type: 'E-Com', ksm: 'Hit',  hod: 'Chinmay P.', billing: 165000, since: 'Sep 2024', revenue:  890000, cost:  570000, margin: 35.9 },
  { client: 'Indra Fragrance',    type: 'E-Com', ksm: 'Hit',  hod: 'Amisha J.',  billing: 195000, since: 'Jul 2024', revenue: 1050000, cost:  670000, margin: 36.2 },
  { client: 'Verda Wellness',     type: 'E-Com', ksm: 'Hit',  hod: 'Chinmay P.', billing: 145000, since: 'Oct 2024', revenue:  790000, cost:  510000, margin: 35.4 },
  { client: 'Yara Footwear',      type: 'E-Com', ksm: 'Hit',  hod: 'Amisha J.',  billing: 220000, since: 'Jan 2025', revenue: 1140000, cost:  725000, margin: 36.4 },
  // ─── E-Com · KSM Miss (18) ─────────────────────────────────────────────
  { client: 'July Issue',         type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 245000, since: 'Jan 2024', revenue:  686000, cost:  480000, margin: 30.0 },
  { client: 'Bio Basket',         type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 175000, since: 'Jul 2024', revenue:  420000, cost:  320000, margin: 23.8 },
  { client: 'Meeami Fashion',     type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 190000, since: 'Sep 2024', revenue:  570000, cost:  410000, margin: 28.1 },
  { client: 'Valiente Caps',      type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 115000, since: 'Nov 2024', revenue:  253000, cost:  195000, margin: 22.9 },
  { client: 'Kavi & Co Apparel',  type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 145000, since: 'Mar 2024', revenue:  385000, cost:  292000, margin: 24.2 },
  { client: 'BrewBuddy Coffee',   type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 125000, since: 'Aug 2024', revenue:  310000, cost:  240000, margin: 22.6 },
  { client: 'Saffron Square',     type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 165000, since: 'May 2024', revenue:  445000, cost:  340000, margin: 23.6 },
  { client: 'Naya Drinks',        type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 195000, since: 'Apr 2024', revenue:  520000, cost:  390000, margin: 25.0 },
  { client: 'Vaani Books',        type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing:  95000, since: 'Dec 2024', revenue:  205000, cost:  165000, margin: 19.5 },
  { client: 'Nimbu Mocktails',    type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 135000, since: 'Jul 2024', revenue:  340000, cost:  265000, margin: 22.1 },
  { client: 'Gulmohar Decor',     type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 175000, since: 'Feb 2024', revenue:  475000, cost:  365000, margin: 23.2 },
  { client: 'Shubh Sweets Co',    type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 110000, since: 'Oct 2024', revenue:  265000, cost:  210000, margin: 20.8 },
  { client: 'Dhanya Ayurveda',    type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 155000, since: 'Jun 2024', revenue:  395000, cost:  305000, margin: 22.8 },
  { client: 'Khadi Hub',          type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 120000, since: 'Aug 2024', revenue:  290000, cost:  225000, margin: 22.4 },
  { client: 'Mumbai Mithai Co',   type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 105000, since: 'Nov 2024', revenue:  240000, cost:  195000, margin: 18.8 },
  { client: 'Anaya Saree Studio', type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 165000, since: 'Jan 2025', revenue:  410000, cost:  315000, margin: 23.2 },
  { client: 'Plum Organics IN',   type: 'E-Com', ksm: 'Miss', hod: 'Chinmay P.', billing: 145000, since: 'Mar 2024', revenue:  365000, cost:  285000, margin: 21.9 },
  { client: 'Bombay Beard Co',    type: 'E-Com', ksm: 'Miss', hod: 'Amisha J.',  billing: 135000, since: 'Sep 2024', revenue:  335000, cost:  260000, margin: 22.4 },
  // ─── Lead Gen · KSM Hit (11) ───────────────────────────────────────────
  { client: 'Mahesh Interior',    type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 215000, since: 'May 2024', revenue:  580000, cost:  380000, margin: 34.5 },
  { client: 'Third Eye Brands',   type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 158000, since: 'Feb 2024', revenue:  415000, cost:  285000, margin: 31.3 },
  { client: 'Pinnacle Realty',    type: 'Lead Gen', ksm: 'Hit', hod: 'Amisha J.',  billing: 240000, since: 'Apr 2024', revenue:  650000, cost:  420000, margin: 35.4 },
  { client: 'UrbanNest Realty',   type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 195000, since: 'Aug 2024', revenue:  520000, cost:  340000, margin: 34.6 },
  { client: 'Coastline Edu',      type: 'Lead Gen', ksm: 'Hit', hod: 'Amisha J.',  billing: 165000, since: 'Jul 2024', revenue:  430000, cost:  285000, margin: 33.7 },
  { client: 'NorthStar Health',   type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 185000, since: 'Mar 2024', revenue:  490000, cost:  320000, margin: 34.7 },
  { client: 'Vivid Insurance',    type: 'Lead Gen', ksm: 'Hit', hod: 'Amisha J.',  billing: 220000, since: 'Jan 2024', revenue:  595000, cost:  385000, margin: 35.3 },
  { client: 'Skyline Fitness',    type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 145000, since: 'Sep 2024', revenue:  370000, cost:  248000, margin: 33.0 },
  { client: 'Acme Legal LLP',     type: 'Lead Gen', ksm: 'Hit', hod: 'Amisha J.',  billing: 175000, since: 'Jun 2024', revenue:  455000, cost:  300000, margin: 34.1 },
  { client: 'Greenfield Tech',    type: 'Lead Gen', ksm: 'Hit', hod: 'Chinmay P.', billing: 200000, since: 'Feb 2024', revenue:  535000, cost:  350000, margin: 34.6 },
  { client: 'Vista Architects',   type: 'Lead Gen', ksm: 'Hit', hod: 'Amisha J.',  billing: 155000, since: 'Oct 2024', revenue:  410000, cost:  275000, margin: 32.9 },
  // ─── Lead Gen · KSM Miss (13) ──────────────────────────────────────────
  { client: 'Pytheos Health',     type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 175000, since: 'Oct 2024', revenue:  280000, cost:  220000, margin: 21.4 },
  { client: 'TREC',               type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 148000, since: 'Jun 2024', revenue:  240000, cost:  195000, margin: 18.8 },
  { client: 'Praxis Coaching',    type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 125000, since: 'May 2024', revenue:  205000, cost:  165000, margin: 19.5 },
  { client: 'Solitaire Estates',  type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 185000, since: 'Mar 2024', revenue:  295000, cost:  235000, margin: 20.3 },
  { client: 'Marigold Ed-Tech',   type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 145000, since: 'Aug 2024', revenue:  235000, cost:  190000, margin: 19.1 },
  { client: 'Sentinel Insurance', type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 165000, since: 'Apr 2024', revenue:  265000, cost:  215000, margin: 18.9 },
  { client: 'Vista Loans',        type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 135000, since: 'Sep 2024', revenue:  220000, cost:  180000, margin: 18.2 },
  { client: 'Konark Builders',    type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 195000, since: 'Feb 2024', revenue:  315000, cost:  250000, margin: 20.6 },
  { client: 'Saral Tax LLP',      type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 115000, since: 'Nov 2024', revenue:  185000, cost:  152000, margin: 17.8 },
  { client: 'Apex Recruiters',    type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 105000, since: 'Jul 2024', revenue:  175000, cost:  142000, margin: 18.9 },
  { client: 'Healify Clinics',    type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 155000, since: 'Jan 2025', revenue:  250000, cost:  200000, margin: 20.0 },
  { client: 'EcoBuild Realty',    type: 'Lead Gen', ksm: 'Miss', hod: 'Chinmay P.', billing: 175000, since: 'Mar 2024', revenue:  280000, cost:  225000, margin: 19.6 },
  { client: 'Stellar Coaching',   type: 'Lead Gen', ksm: 'Miss', hod: 'Amisha J.',  billing: 125000, since: 'Aug 2024', revenue:  210000, cost:  170000, margin: 19.0 },
];

// ─── Headlines derived from activeClientList ────────────────────────────
// `change` and `prevTotal` (historical context) stay hardcoded — they're
// month-over-month deltas, not derivable from the current snapshot.
const activeClients = (() => {
  const total = activeClientList.length;
  const ecom = activeClientList.filter(c => c.type === 'E-Com').length;
  const leadgen = activeClientList.filter(c => c.type === 'Lead Gen').length;
  return { total, ecom, leadgen, change: 3, prevTotal: total - 3 };
})();

const revenue = (() => {
  const total = activeClientList.reduce((s, c) => s + c.revenue, 0);
  const ecom = activeClientList.filter(c => c.type === 'E-Com').reduce((s, c) => s + c.revenue, 0);
  const leadgen = activeClientList.filter(c => c.type === 'Lead Gen').reduce((s, c) => s + c.revenue, 0);
  // Prior-month revenue from the Mar entry of revenueTrend (kept in sync
  // with the chart so the MoM-change pill matches what the trend shows).
  const prevTotal = 20200000 + 8300000; // = revenueTrend[Mar].ecom + .leadgen
  const change = +(((total - prevTotal) / prevTotal) * 100).toFixed(1);
  return { total, ecom, leadgen, prevTotal, change };
})();

// Sized for a 52-client SEM book — 18 ratings collected this month is a
// realistic ~35% response rate. Every client name resolves to an entry in
// activeClientList so the table never shows a phantom client.
const ratingsList: { client: string; type: ClientType; rating: number; feedback: string; date: string }[] = [
  // 5★ — top performers
  { client: 'Elan by Aanchal',     type: 'E-Com',    rating: 5, feedback: 'Exceptional ROI this quarter — campaigns consistently exceed ROAS targets.', date: '02 Apr 2026' },
  { client: 'True Diamond',        type: 'E-Com',    rating: 5, feedback: 'Great campaign execution and proactive optimisation.', date: '01 Apr 2026' },
  { client: 'Pristine Diamonds',   type: 'E-Com',    rating: 5, feedback: 'Consistent performance, transparent reporting cadence.', date: '03 Apr 2026' },
  { client: 'Atharv Couture',      type: 'E-Com',    rating: 5, feedback: 'Strong creative direction; ROAS holding above 4.0x for two quarters.', date: '28 Mar 2026' },
  { client: 'Vivid Insurance',     type: 'Lead Gen', rating: 5, feedback: 'Lead quality has noticeably improved over the last 90 days.', date: '29 Mar 2026' },
  // 4★ — happy
  { client: 'Velora Jewels',       type: 'E-Com',    rating: 4, feedback: 'Solid performance, would like more frequent A/B test reports.', date: '04 Apr 2026' },
  { client: 'Saanjh Activewear',   type: 'E-Com',    rating: 4, feedback: 'Good creative output, hoping for more aggressive scaling next month.', date: '02 Apr 2026' },
  { client: 'Yara Footwear',       type: 'E-Com',    rating: 4, feedback: 'Reliable team, deliverables on time without exception.', date: '01 Apr 2026' },
  { client: 'Indra Fragrance',     type: 'E-Com',    rating: 4, feedback: 'Festive campaign exceeded expectations; need similar push for Q2.', date: '31 Mar 2026' },
  { client: 'Mahesh Interior',     type: 'Lead Gen', rating: 4, feedback: 'Strong lead quality this month, CPL well under target.', date: '24 Mar 2026' },
  { client: 'Pinnacle Realty',     type: 'Lead Gen', rating: 4, feedback: 'Great results from the new audience segments — please keep iterating.', date: '26 Mar 2026' },
  { client: 'NorthStar Health',    type: 'Lead Gen', rating: 4, feedback: 'Lead volume is up; conversion still needs work but trajectory is right.', date: '27 Mar 2026' },
  // 3★ — neutral, watch
  { client: 'Meeami Fashion',      type: 'E-Com',    rating: 3, feedback: 'Performance is okay; reporting could be more proactive.', date: '30 Mar 2026' },
  { client: 'Acme Legal LLP',      type: 'Lead Gen', rating: 3, feedback: 'Onboarding was slow; campaigns just started showing traction.', date: '31 Mar 2026' },
  { client: 'Praxis Coaching',     type: 'Lead Gen', rating: 3, feedback: 'Need clearer attribution on the lead source mix.', date: '25 Mar 2026' },
  // 2★ — at risk
  { client: 'Bio Basket',          type: 'E-Com',    rating: 2, feedback: 'ROAS missed target two months running. Need urgent strategy review.', date: '18 Mar 2026' },
  { client: 'July Issue',          type: 'E-Com',    rating: 2, feedback: 'Revenue 31% under target; weekly reporting often delayed.', date: '20 Mar 2026' },
  // 1★ — escalation
  { client: 'TREC',                type: 'Lead Gen', rating: 1, feedback: 'CPL 44% over target; communication breakdowns are not acceptable.', date: '15 Mar 2026' },
];

const incidentsList: { id: string; client: string; type: ClientType; severity: 'Critical' | 'High' | 'Medium'; category: string; daysOpen: number; description: string }[] = [
  // Critical (3)
  { id: 'PMI-001', client: 'Bio Basket',       type: 'E-Com',    severity: 'Critical', category: 'ROAS Drop',         daysOpen: 14, description: 'ROAS dropped to 2.4 vs 3.5 target for 6 weeks. Client escalated to leadership.' },
  { id: 'PMI-002', client: 'July Issue',       type: 'E-Com',    severity: 'Critical', category: 'Revenue Miss',      daysOpen:  9, description: 'Monthly revenue 31% under target — creative refresh delayed by team.' },
  { id: 'PMI-003', client: 'TREC',             type: 'Lead Gen', severity: 'Critical', category: 'Client Escalation', daysOpen: 11, description: 'Client CEO escalated; CPL 44% over target with no improvement in 4 weeks.' },
  // High (3)
  { id: 'PMI-004', client: 'Meeami Fashion',   type: 'E-Com',    severity: 'High',     category: 'Deliverable Delay', daysOpen:  5, description: 'Monthly performance report delayed by 5 business days.' },
  { id: 'PMI-005', client: 'Bombay Beard Co',  type: 'E-Com',    severity: 'High',     category: 'ROAS Drop',         daysOpen:  6, description: 'ROAS slipped from 3.2 to 2.1 over the last month; pacing not recovering.' },
  { id: 'PMI-006', client: 'Saral Tax LLP',    type: 'Lead Gen', severity: 'High',     category: 'CPL Inflation',     daysOpen:  8, description: 'CPL up 38% MoM; current targeting attracting low-intent leads.' },
  // Medium (3)
  { id: 'PMI-007', client: 'Pytheos Health',   type: 'Lead Gen', severity: 'Medium',   category: 'CPL Inflation',     daysOpen:  7, description: 'CPL inflated 46% above target, audience refinement in progress.' },
  { id: 'PMI-008', client: 'Vaani Books',      type: 'E-Com',    severity: 'Medium',   category: 'Low Engagement',    daysOpen:  4, description: 'Engagement metrics down 22%; testing new creative variants.' },
  { id: 'PMI-009', client: 'Mumbai Mithai Co', type: 'E-Com',    severity: 'Medium',   category: 'Creative Quality',  daysOpen:  3, description: 'Festive creatives not converting; need fresh batch by next week.' },
];

const onboardingList: { client: string; type: ClientType; status: 'Pending' | 'Done'; days: number; assignee: string; stage: string }[] = [
  { client: 'Nor Black Nor White', type: 'E-Com', status: 'Pending', days: 12, assignee: 'Unassigned', stage: 'Not Started' },
  { client: 'Enagenbio', type: 'E-Com', status: 'Pending', days: 8, assignee: 'Unassigned', stage: 'Awaiting Proposal' },
  { client: 'Knickgasm', type: 'E-Com', status: 'Pending', days: 6, assignee: 'Aanya S.', stage: 'Counter-proposal' },
  { client: 'Una Homes LLP',       type: 'Lead Gen', status: 'Pending', days:  5, assignee: 'Priya S.',     stage: 'Team Assigned' },
  { client: 'Skin Essentials',     type: 'E-Com',    status: 'Pending', days:  3, assignee: 'Karan M.',     stage: 'Kickoff scheduled' },
  { client: 'Sahara Textiles',     type: 'E-Com',    status: 'Pending', days:  9, assignee: 'Unassigned',   stage: 'Awaiting Proposal' },
  { client: 'Coastal Realty Grp',  type: 'Lead Gen', status: 'Pending', days:  4, assignee: 'Priya S.',     stage: 'Kickoff scheduled' },
  { client: 'Indra Flora',         type: 'E-Com',    status: 'Pending', days:  2, assignee: 'Karan M.',     stage: 'Team Assigned' },
  { client: 'Bloom Wellness',      type: 'E-Com',    status: 'Done',    days:  9, assignee: 'Amisha J.',    stage: 'Live' },
  { client: 'UrbanNest Realty',    type: 'Lead Gen', status: 'Done',    days: 11, assignee: 'Chinmay P.',   stage: 'Live' },
  { client: 'Pinnacle Realty',     type: 'Lead Gen', status: 'Done',    days:  8, assignee: 'Chinmay P.',   stage: 'Live' },
  { client: 'Aksha Skincare',      type: 'E-Com',    status: 'Done',    days: 10, assignee: 'Amisha J.',    stage: 'Live' },
];

// CLA list sized for 52 clients — ~17% at-risk rate is realistic given the
// 40% KSM-miss rate. Billing numbers sourced from activeClientList where the
// client exists there; Zenith and FreshBite are recent churn candidates not
// yet removed from the roster (they show up here but not in activeClientList
// because they've been effectively frozen).
const claList: { client: string; type: ClientType; claStatus: 'sureshot' | 'can-be-saved'; reason: string; responsible: string; billing: number }[] = [
  // Sureshot (3)
  { client: 'Zenith Retail Pvt Ltd', type: 'E-Com',    claStatus: 'sureshot',     reason: 'ROAS below 1.5x for 3 weeks, client unresponsive to calls.',           responsible: 'Chinmay P.', billing: 145000 },
  { client: 'FreshBite Foods',       type: 'E-Com',    claStatus: 'sureshot',     reason: 'Ad account suspension, all campaigns halted indefinitely.',              responsible: 'Harshal R.', billing: 110000 },
  { client: 'Saral Tax LLP',         type: 'Lead Gen', claStatus: 'sureshot',     reason: 'Client verbally confirmed they will not renew in May.',                  responsible: 'Mihir L.',   billing: 115000 },
  // Can be saved (6)
  { client: 'Bio Basket',            type: 'E-Com',    claStatus: 'can-be-saved', reason: 'KSM target missed two months running — strategy reset in progress.',    responsible: 'Chinmay P.', billing: 175000 },
  { client: 'July Issue',            type: 'E-Com',    claStatus: 'can-be-saved', reason: 'Revenue 31% under target — creative refresh planned for next sprint.',  responsible: 'Chinmay P.', billing: 245000 },
  { client: 'TREC',                  type: 'Lead Gen', claStatus: 'can-be-saved', reason: 'CPL inflated 44% above target; audience refinement in progress.',        responsible: 'Mihir L.',   billing: 148000 },
  { client: 'Vaani Books',           type: 'E-Com',    claStatus: 'can-be-saved', reason: 'Low engagement across all placements; testing new hooks.',               responsible: 'Karan M.',   billing:  95000 },
  { client: 'Mumbai Mithai Co',      type: 'E-Com',    claStatus: 'can-be-saved', reason: 'Festive creatives not converting; awaiting new batch from design.',      responsible: 'Aanya S.',   billing: 105000 },
  { client: 'Pytheos Health',        type: 'Lead Gen', claStatus: 'can-be-saved', reason: 'CPL issues for 4 weeks; client patient but frustrated.',                  responsible: 'Amisha J.',  billing: 175000 },
];

// Upsell pipeline sized for 52 clients — 12 active opportunities. Every
// candidate is an existing activeClientList entry (mostly KSM Hits, since
// happy clients are receptive to expansion). The previous 99 Pancakes /
// Alpine Group entries were holdovers from the 10-client mock and didn't
// resolve to actual clients — replaced.
const upsellList: { client: string; type: ClientType; opportunity: string; potentialRevenue: number; confidence: 'high' | 'medium' | 'low' }[] = [
  { client: 'Pristine Diamonds',  type: 'E-Com',    opportunity: 'Influencer marketing layer — micro & mid-tier creators',  potentialRevenue: 220000, confidence: 'high'   },
  { client: 'Elan by Aanchal',    type: 'E-Com',    opportunity: 'Add Meta Reels production retainer',                       potentialRevenue: 180000, confidence: 'high'   },
  { client: 'Atharv Couture',     type: 'E-Com',    opportunity: 'Black Friday / festive scaling push (Oct–Dec)',            potentialRevenue: 145000, confidence: 'high'   },
  { client: 'Pinnacle Realty',    type: 'Lead Gen', opportunity: 'LinkedIn ABM budget bump for enterprise leads',            potentialRevenue: 120000, confidence: 'high'   },
  { client: 'True Diamond',       type: 'E-Com',    opportunity: 'Expand to YouTube Shorts ad creative',                     potentialRevenue: 120000, confidence: 'high'   },
  { client: 'Velora Jewels',      type: 'E-Com',    opportunity: 'Pinterest Ads — high-intent jewellery audience',           potentialRevenue:  95000, confidence: 'medium' },
  { client: 'Yara Footwear',      type: 'E-Com',    opportunity: 'Quick-commerce listing & Blinkit ads',                     potentialRevenue:  95000, confidence: 'medium' },
  { client: 'Vivid Insurance',    type: 'Lead Gen', opportunity: 'Performance Max test alongside existing Search',           potentialRevenue:  95000, confidence: 'medium' },
  { client: 'Indra Fragrance',    type: 'E-Com',    opportunity: 'Influencer micro-tier seeding programme',                  potentialRevenue:  90000, confidence: 'medium' },
  { client: 'Saanjh Activewear',  type: 'E-Com',    opportunity: 'Spotify / podcast ad placements for brand recall',         potentialRevenue:  70000, confidence: 'medium' },
  { client: 'Mahesh Interior',    type: 'Lead Gen', opportunity: 'Layer LinkedIn Lead Gen on top of Meta',                   potentialRevenue:  75000, confidence: 'high'   },
  { client: 'Aksha Skincare',     type: 'E-Com',    opportunity: 'WhatsApp re-engagement + abandoned-cart flow',             potentialRevenue:  60000, confidence: 'low'    },
];

// ─── PM Tasks (open work across the SEM team) ───────────────────────────────
// `scope` discriminates work that touches a client account vs internal SEM
// operations (SOPs, hiring, tooling). The Super Admin's typical question is
// "how much PM work is in flight, and is any of it on fire?" — that's what
// the WORKLOAD card and the tasks drawer surface.
type PmTask = {
  id: string;
  title: string;
  scope: TaskScope;
  /** Client name for Client-scope tasks; team for Internal-scope tasks. */
  context: string;
  priority: TaskPriority;
  assignee: string;
  dueDateISO: string;
  status: 'In Progress' | 'Pending' | 'Blocked';
};

const pmTasksList: PmTask[] = [
  // Client-scope — overdue (most urgent)
  { id: 'PT-101', title: 'Refresh creative bank for May campaigns', scope: 'Client', context: 'Bio Basket', priority: 'P1', assignee: 'Karan M.', dueDateISO: '2026-04-01', status: 'In Progress' },
  { id: 'PT-102', title: 'ROAS recovery plan — submit to client', scope: 'Client', context: 'July Issue', priority: 'P1', assignee: 'Chinmay P.', dueDateISO: '2026-04-02', status: 'Blocked' },
  { id: 'PT-103', title: 'Monthly performance report (Mar)', scope: 'Client', context: 'Meeami Fashion', priority: 'P2', assignee: 'Aanya S.', dueDateISO: '2026-04-03', status: 'In Progress' },
  // Client-scope — due this week
  { id: 'PT-104', title: 'CPL audit + audience refinement', scope: 'Client', context: 'Pytheos Health', priority: 'P1', assignee: 'Amisha J.', dueDateISO: '2026-04-08', status: 'In Progress' },
  { id: 'PT-105', title: 'YouTube Shorts asset production', scope: 'Client', context: 'True Diamond', priority: 'P2', assignee: 'Karan M.', dueDateISO: '2026-04-10', status: 'In Progress' },
  { id: 'PT-106', title: 'Meta Reels retainer SOW draft', scope: 'Client', context: 'Elan by Aanchal', priority: 'P2', assignee: 'Chinmay P.', dueDateISO: '2026-04-09', status: 'In Progress' },
  { id: 'PT-107', title: 'Programmatic display test — kickoff', scope: 'Client', context: 'Alpine Group', priority: 'P2', assignee: 'Aanya S.', dueDateISO: '2026-04-11', status: 'Pending' },
  { id: 'PT-108', title: 'Counter-proposal review', scope: 'Client', context: 'Knickgasm', priority: 'P2', assignee: 'Chinmay P.', dueDateISO: '2026-04-07', status: 'Pending' },
  // Client-scope — later
  { id: 'PT-109', title: 'Q2 strategy doc — present to client', scope: 'Client', context: 'Mahesh Interior', priority: 'P3', assignee: 'Chinmay P.', dueDateISO: '2026-04-15', status: 'In Progress' },
  { id: 'PT-110', title: 'Quick-commerce listing setup', scope: 'Client', context: '99 Pancakes', priority: 'P3', assignee: 'Karan M.', dueDateISO: '2026-04-18', status: 'Pending' },
  { id: 'PT-111', title: 'WhatsApp retention flow design', scope: 'Client', context: 'Third Eye Brands', priority: 'P3', assignee: 'Aanya S.', dueDateISO: '2026-04-20', status: 'Pending' },
  { id: 'PT-112', title: 'Onboarding kickoff call', scope: 'Client', context: 'Skin Essentials', priority: 'P2', assignee: 'Karan M.', dueDateISO: '2026-04-08', status: 'Pending' },
  { id: 'PT-113', title: 'Send weekly plan', scope: 'Client', context: 'Una Homes LLP', priority: 'P3', assignee: 'Aanya S.', dueDateISO: '2026-04-09', status: 'Pending' },
  { id: 'PT-114', title: 'Audience expansion test setup', scope: 'Client', context: 'TREC', priority: 'P2', assignee: 'Mihir L.', dueDateISO: '2026-04-12', status: 'In Progress' },
  { id: 'PT-115', title: 'Black Friday creative brief', scope: 'Client', context: 'Valiente Caps', priority: 'P3', assignee: 'Karan M.', dueDateISO: '2026-04-22', status: 'Pending' },
  { id: 'PT-116', title: 'Performance review meeting prep', scope: 'Client', context: 'Bloom Wellness', priority: 'P3', assignee: 'Amisha J.', dueDateISO: '2026-04-14', status: 'Pending' },
  // Internal-scope
  { id: 'PT-201', title: 'Define paid-media SOP for new client onboarding', scope: 'Internal', context: 'SEM Operations', priority: 'P2', assignee: 'Harshal R.', dueDateISO: '2026-04-08', status: 'In Progress' },
  { id: 'PT-202', title: 'Hire 2 SEM Performance Managers', scope: 'Internal', context: 'SEM Hiring', priority: 'P1', assignee: 'Tejas A.', dueDateISO: '2026-04-15', status: 'In Progress' },
  { id: 'PT-203', title: 'Q2 OKR planning session', scope: 'Internal', context: 'SEM Leadership', priority: 'P2', assignee: 'Chinmay P.', dueDateISO: '2026-04-10', status: 'Pending' },
  { id: 'PT-204', title: 'Review tooling spend — Meta + GA + Hyros', scope: 'Internal', context: 'SEM Operations', priority: 'P3', assignee: 'Mihir L.', dueDateISO: '2026-04-18', status: 'Pending' },
  { id: 'PT-205', title: 'Update creative review checklist', scope: 'Internal', context: 'SEM Quality', priority: 'P3', assignee: 'Aanya S.', dueDateISO: '2026-04-25', status: 'Pending' },
  { id: 'PT-206', title: 'KSM target recalibration for Q2', scope: 'Internal', context: 'SEM Leadership', priority: 'P1', assignee: 'Chinmay P.', dueDateISO: '2026-04-04', status: 'In Progress' },
  { id: 'PT-207', title: 'Roll out new client reporting template', scope: 'Internal', context: 'SEM Operations', priority: 'P2', assignee: 'Harshal R.', dueDateISO: '2026-04-12', status: 'Pending' },
  { id: 'PT-208', title: 'Performance Manager performance reviews', scope: 'Internal', context: 'SEM Leadership', priority: 'P2', assignee: 'Chinmay P.', dueDateISO: '2026-04-20', status: 'Pending' },
  { id: 'PT-209', title: 'Documentation: ROAS recovery playbook', scope: 'Internal', context: 'SEM Quality', priority: 'P3', assignee: 'Karan M.', dueDateISO: '2026-04-28', status: 'Pending' },
  { id: 'PT-210', title: 'Vendor contract renewal — SEMrush', scope: 'Internal', context: 'SEM Operations', priority: 'P3', assignee: 'Mihir L.', dueDateISO: '2026-04-30', status: 'Pending' },
  { id: 'PT-211', title: 'Team offsite agenda finalisation', scope: 'Internal', context: 'SEM Leadership', priority: 'P3', assignee: 'Aanya S.', dueDateISO: '2026-04-25', status: 'Pending' },
];

// Tasks summary — derived from pmTasksList so the strip and the drawer hero
// can never disagree with the table below.
const tasks = (() => {
  const total = pmTasksList.length;
  const overdue = pmTasksList.filter(t => daysUntil(t.dueDateISO) < 0).length;
  const dueThisWeek = pmTasksList.filter(t => { const d = daysUntil(t.dueDateISO); return d >= 0 && d <= 7; }).length;
  const p1 = pmTasksList.filter(t => t.priority === 'P1').length;
  const client = pmTasksList.filter(t => t.scope === 'Client').length;
  const internal = pmTasksList.filter(t => t.scope === 'Internal').length;
  const blocked = pmTasksList.filter(t => t.status === 'Blocked').length;
  return { total, overdue, dueThisWeek, p1, client, internal, blocked };
})();

// (topPmAssignees was used by the old TasksHeroCard footer preview — that
// component was removed in the design critique pass. The drawer table now
// surfaces the assignee column directly, which is the right place for it.)

// ─── Client KSM Target Performance ──────────────────────────────────────────
// Derived entirely from activeClientList so the EXECUTION hero card and the
// drawer table can never disagree. Tracks `Hit` vs `Miss` against the
// Key-Success-Metric target each PM client has agreed for the month.
const targets = (() => {
  const all = activeClientList; // every active SEM client has a KSM record
  const total = all.length;
  const hit = all.filter(c => c.ksm === 'Hit').length;
  const miss = all.filter(c => c.ksm === 'Miss').length;
  const hitRate = total > 0 ? Math.round((hit / total) * 100) : 0;
  const ecomTotal = all.filter(c => c.type === 'E-Com').length;
  const ecomHit = all.filter(c => c.type === 'E-Com' && c.ksm === 'Hit').length;
  const ecomMiss = ecomTotal - ecomHit;
  const lgTotal = all.filter(c => c.type === 'Lead Gen').length;
  const lgHit = all.filter(c => c.type === 'Lead Gen' && c.ksm === 'Hit').length;
  const lgMiss = lgTotal - lgHit;
  // Internal target — we want >= 70% of clients to hit each month.
  const target = 70;
  return { total, hit, miss, hitRate, ecomTotal, ecomHit, ecomMiss, lgTotal, lgHit, lgMiss, target };
})();

// 6-month KSM hit-rate trend — same 10-client portfolio tracked monthly.
// Last datapoint matches the headline (targets.hitRate) so the chart and the
// hero card can never disagree. Tells a clear story: hit rate has slipped
// from 60% to 40% over the quarter — that's exactly what the Super Admin
// needs to notice in two seconds.
const ksmTrend = [
  { month: 'Nov', rate: 60, hit: 6, miss: 4 },
  { month: 'Dec', rate: 60, hit: 6, miss: 4 },
  { month: 'Jan', rate: 50, hit: 5, miss: 5 },
  { month: 'Feb', rate: 50, hit: 5, miss: 5 },
  { month: 'Mar', rate: 40, hit: 4, miss: 6 },
  { month: 'Apr', rate: targets.hitRate, hit: targets.hit, miss: targets.miss },
];

// (worstMisses preview line was used by the rejected hero-card design.
// The current Targets KpiCard surfaces hit/miss counts directly via the
// split bar, and the per-client list lives in the drawer table — same
// information, fewer competing visual zones.)

// ─── Derived headlines from row-level lists ─────────────────────────────────
// Every headline below is computed once from its source list so the card
// and the drawer table can never disagree as the data scales.

// Margin — sums revenue / cost across the 52-client roster.
const margin = (() => {
  const totalRev = activeClientList.reduce((s, c) => s + c.revenue, 0);
  const totalCost = activeClientList.reduce((s, c) => s + c.cost, 0);
  const ecomRev = activeClientList.filter(c => c.type === 'E-Com').reduce((s, c) => s + c.revenue, 0);
  const ecomCost = activeClientList.filter(c => c.type === 'E-Com').reduce((s, c) => s + c.cost, 0);
  const lgRev = activeClientList.filter(c => c.type === 'Lead Gen').reduce((s, c) => s + c.revenue, 0);
  const lgCost = activeClientList.filter(c => c.type === 'Lead Gen').reduce((s, c) => s + c.cost, 0);
  const rate = +(((totalRev - totalCost) / totalRev) * 100).toFixed(1);
  const ecomRate = +(((ecomRev - ecomCost) / ecomRev) * 100).toFixed(1);
  const leadgenRate = +(((lgRev - lgCost) / lgRev) * 100).toFixed(1);
  // prevRate kept consistent with marginTrend's Mar entry — see trend below.
  return { rate, ecomRate, leadgenRate, prevRate: 30.5, target: 30.0 };
})();

// Ratings — averages and counts derived from ratingsList.
const ratings = (() => {
  const total = ratingsList.length;
  const avg = +(ratingsList.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const ecomList = ratingsList.filter(r => r.type === 'E-Com');
  const lgList = ratingsList.filter(r => r.type === 'Lead Gen');
  const ecomAvg = +(ecomList.reduce((s, r) => s + r.rating, 0) / ecomList.length).toFixed(1);
  const leadgenAvg = +(lgList.reduce((s, r) => s + r.rating, 0) / lgList.length).toFixed(1);
  const lowCount = ratingsList.filter(r => r.rating <= 2).length;
  // prevAvg kept slightly above current avg to express a mild downward trend.
  return { avg, prevAvg: +(avg + 0.2).toFixed(1), ecomAvg, leadgenAvg, total, lowCount };
})();

// Incidents — counts and severity breakdown from incidentsList.
const incidents = (() => {
  const total = incidentsList.length;
  const critical = incidentsList.filter(i => i.severity === 'Critical').length;
  const high = incidentsList.filter(i => i.severity === 'High').length;
  const medium = incidentsList.filter(i => i.severity === 'Medium').length;
  const ecom = incidentsList.filter(i => i.type === 'E-Com').length;
  const leadgen = incidentsList.filter(i => i.type === 'Lead Gen').length;
  // prevTotal seeded slightly higher to keep the "improving" delta narrative.
  return { total, prevTotal: total + 2, critical, high, medium, ecom, leadgen };
})();

// Onboarding — pipeline counts from onboardingList.
const onboarding = (() => {
  const total = onboardingList.length;
  const pending = onboardingList.filter(o => o.status === 'Pending').length;
  const done = onboardingList.filter(o => o.status === 'Done').length;
  const stuck = onboardingList.filter(o => o.status === 'Pending' && o.days > 7).length;
  const ecom = onboardingList.filter(o => o.type === 'E-Com').length;
  const leadgen = onboardingList.filter(o => o.type === 'Lead Gen').length;
  const avgDays = Math.round(onboardingList.reduce((s, o) => s + o.days, 0) / total);
  return { total, pending, done, stuck, avgDays, ecom, leadgen };
})();

// CLA — at-risk counts and revenue at risk from claList.
const claData = (() => {
  const total = claList.length;
  const sureshot = claList.filter(c => c.claStatus === 'sureshot').length;
  const saveable = claList.filter(c => c.claStatus === 'can-be-saved').length;
  const revAtRisk = claList.reduce((s, c) => s + c.billing, 0);
  const ecom = claList.filter(c => c.type === 'E-Com').length;
  const leadgen = claList.filter(c => c.type === 'Lead Gen').length;
  return { total, prevTotal: total + 2, sureshot, saveable, revAtRisk, ecom, leadgen };
})();

// Upsell — pipeline counts and total potential from upsellList.
const upsell = (() => {
  const total = upsellList.length;
  const sumPotential = upsellList.reduce((s, u) => s + u.potentialRevenue, 0);
  const highConf = upsellList.filter(u => u.confidence === 'high').length;
  const ecom = upsellList.filter(u => u.type === 'E-Com').length;
  const leadgen = upsellList.filter(u => u.type === 'Lead Gen').length;
  return { total, sumPotential, highConf, ecom, leadgen };
})();

// KPI META — drives drawer header and the "View full" route
const kpiMeta: Record<KpiId, { title: string; subtitle: string; routeLabel: string }> = {
  'active': {
    title: 'Active SEM Clients',
    subtitle: 'Clients with billable SEM engagement this month',
    routeLabel: 'View all SEM clients',
  },
  'revenue': {
    title: 'Monthly Revenue',
    subtitle: 'Billed SEM revenue this month, by client type',
    routeLabel: 'View revenue report',
  },
  'margin': {
    title: 'Net Margin',
    subtitle: 'SEM gross margin this month vs the 30% internal target',
    routeLabel: 'View margin report',
  },
  'ratings': {
    title: 'Customer Ratings',
    subtitle: 'Latest client feedback collected for the SEM team',
    routeLabel: 'View all SEM feedback',
  },
  'incidents': {
    title: 'Open Incidents',
    subtitle: 'Client-flagged issues currently in triage on SEM accounts',
    routeLabel: 'View all SEM incidents',
  },
  'onboarding': {
    title: 'Onboarding Pipeline',
    subtitle: 'New SEM clients in the kickoff & onboarding queue',
    routeLabel: 'View onboarding pipeline',
  },
  'cla': {
    title: 'At-Risk SEM Clients (CLA)',
    subtitle: 'Client-Level Alerts on SEM accounts — sureshot exits and saveable',
    routeLabel: 'View all SEM CLAs',
  },
  'upsell': {
    title: 'Upsell Pipeline',
    subtitle: 'Identified expansion opportunities across the SEM book',
    routeLabel: 'View all upsell opportunities',
  },
  'targets': {
    title: 'Client Target Performance',
    subtitle: 'KSM Hit vs Miss across every SEM client this month',
    routeLabel: 'Open Deliverables',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function PerformanceMarketingHome() {
  const router = useRouter();
  const PM_DELIVERABLES_HREF = SUPER_ADMIN_HOME_ROUTES.performanceMarketing.deliverables;

  const [dateRange, setDateRange] = useState<DateRange>('mtd');

  // Drawer state — single drawer instance, body switches on openKPI
  const [openKPI, setOpenKPI] = useState<KpiId | null>(null);
  // Filter state lives inside the drawer, resets on close.
  const [drawerType, setDrawerType] = useState<TypeFilter>('All');
  const [drawerSeverity, setDrawerSeverity] = useState<'All' | 'Critical' | 'High' | 'Medium'>('All');
  const [drawerClaStatus, setDrawerClaStatus] = useState<'All' | 'sureshot' | 'can-be-saved'>('All');
  // Targets-drawer-only filter: Hit / Miss.
  const [drawerKsm, setDrawerKsm] = useState<KsmFilter>('All');

  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);

  // Reset drawer-local filters whenever a different KPI opens.
  useEffect(() => {
    if (openKPI) {
      setDrawerType('All');
      setDrawerSeverity('All');
      setDrawerClaStatus('All');
      setDrawerKsm('All');
    }
  }, [openKPI]);

  // Esc closes; Tab cycles within the drawer.
  useEffect(() => {
    if (!openKPI) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenKPI(null); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [openKPI]);

  // Move focus into the drawer on open; restore to opener on close.
  useEffect(() => {
    if (openKPI) {
      drawerOpenerRef.current = (document.activeElement as HTMLElement) ?? null;
      const t = window.setTimeout(() => drawerCloseBtnRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    if (drawerOpenerRef.current) {
      drawerOpenerRef.current.focus();
      drawerOpenerRef.current = null;
    }
  }, [openKPI]);

  const goToDeliverables = () => {
    setOpenKPI(null);
    router.push(PM_DELIVERABLES_HREF);
  };

  // Drawer footer CTA — every KPI drawer routes to the Deliverables sub-tab
  // where the underlying client / pipeline detail lives. (Tasks doesn't open
  // a drawer at all; the Tasks card navigates directly to /workspace/task-management.)

  return (
    <div>
      {/* Top filter bar — same chrome as Reports / Customers / Employees */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-8 -mt-6 px-8 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Performance Marketing</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">SEM business overview · across all SEM clients and team</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <label htmlFor="pm-date-range-filter" className="sr-only">Date range</label>
              <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="pm-date-range-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="appearance-none bg-white pl-8 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="ytd">YTD</option>
                <option value="mtd">MTD</option>
                <option value="weekly">Weekly</option>
                <option value="q1">Q1</option>
                <option value="q2">Q2</option>
                <option value="q3">Q3</option>
                <option value="q4">Q4</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* SNAPSHOT — state of the SEM business */}
      <SectionLabel title="Snapshot" hint="State of the SEM business this month" />
      <div className="grid grid-cols-4 gap-5 mb-8">

        <KpiCard
          Icon={Users}
          title="Active SEM Clients"
          value={activeClients.total}
          delta={<DeltaPill direction="positive" value={`+${activeClients.change}`} suffix="" label="this month" />}
          splitEcom={activeClients.ecom}
          splitLeadgen={activeClients.leadgen}
          splitEcomNum={activeClients.ecom}
          splitLeadgenNum={activeClients.leadgen}
          onClick={() => setOpenKPI('active')}
          ariaLabel={`Active SEM Clients ${activeClients.total}, plus ${activeClients.change} this month. E-Com ${activeClients.ecom}, Lead Gen ${activeClients.leadgen}. Activate to view details.`}
        />

        <KpiCard
          Icon={IndianRupee}
          title="Monthly Revenue"
          value={formatLakh(revenue.total)}
          delta={<DeltaPill direction="positive" value={`+${revenue.change}`} label="vs last month" />}
          splitEcom={formatLakh(revenue.ecom)}
          splitLeadgen={formatLakh(revenue.leadgen)}
          splitEcomNum={revenue.ecom}
          splitLeadgenNum={revenue.leadgen}
          onClick={() => setOpenKPI('revenue')}
          ariaLabel={`Monthly Revenue ${formatLakh(revenue.total)}, up ${revenue.change} percent vs last month. E-Com ${formatLakh(revenue.ecom)}, Lead Gen ${formatLakh(revenue.leadgen)}. Activate to view details.`}
        />

        <KpiCard
          Icon={TrendingUp}
          title="Net Margin"
          value={<span className="text-emerald-600">{margin.rate}%</span>}
          delta={<DeltaPill direction="positive" value={`+${(margin.rate - margin.prevRate).toFixed(1)}%`} suffix="" label="vs last month" />}
          splitEcom={`${margin.ecomRate}%`}
          splitLeadgen={`${margin.leadgenRate}%`}
          splitEcomNum={margin.ecomRate}
          splitLeadgenNum={margin.leadgenRate}
          splitBar={false}
          onClick={() => setOpenKPI('margin')}
          ariaLabel={`Net Margin ${margin.rate} percent, target ${margin.target} percent. E-Com ${margin.ecomRate} percent, Lead Gen ${margin.leadgenRate} percent. Activate to view trend.`}
        />

        <KpiCard
          Icon={Star}
          title="Customer Ratings"
          value={
            <span className="flex items-baseline gap-1.5">
              <span className="tabular-nums">{ratings.avg.toFixed(1)}</span>
              <Star className="w-5 h-5 self-center" fill={AMBER} stroke={AMBER} aria-hidden="true" />
            </span>
          }
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{(ratings.prevAvg - ratings.avg).toFixed(1)}</span>
              <span className="font-normal opacity-70 ml-0.5">vs last month</span>
            </span>
          }
          splitEcom={`${ratings.ecomAvg.toFixed(1)}★`}
          splitLeadgen={`${ratings.leadgenAvg.toFixed(1)}★`}
          splitEcomNum={ratings.ecomAvg}
          splitLeadgenNum={ratings.leadgenAvg}
          splitBar={false}
          onClick={() => setOpenKPI('ratings')}
          ariaLabel={`Customer Ratings ${ratings.avg.toFixed(1)} stars from ${ratings.total} responses, ${ratings.lowCount} below 3 stars. E-Com ${ratings.ecomAvg.toFixed(1)} stars, Lead Gen ${ratings.leadgenAvg.toFixed(1)} stars. Activate to view details.`}
        />
      </div>

      {/* ACTION QUEUE — work and risks needing attention */}
      <SectionLabel title="Action Queue" hint="Open work and risks that need attention" />
      <div className="grid grid-cols-4 gap-5 mb-6">

        <KpiCard
          Icon={AlertCircle}
          title="Open Incidents"
          value={incidents.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{incidents.critical} critical</span>
              <span className="font-normal opacity-70 ml-0.5">· {incidents.high} high</span>
            </span>
          }
          splitEcom={incidents.ecom}
          splitLeadgen={incidents.leadgen}
          splitEcomNum={incidents.ecom}
          splitLeadgenNum={incidents.leadgen}
          onClick={() => setOpenKPI('incidents')}
          ariaLabel={`Open Incidents ${incidents.total}: ${incidents.critical} critical, ${incidents.high} high, ${incidents.medium} medium. E-Com ${incidents.ecom}, Lead Gen ${incidents.leadgen}. Activate to view details.`}
        />

        <KpiCard
          Icon={Briefcase}
          title="Onboarding Pipeline"
          value={onboarding.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-amber-50 text-amber-700">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{onboarding.stuck} stuck</span>
              <span className="font-normal opacity-70 ml-0.5">&gt; 7 days</span>
            </span>
          }
          splitEcom={onboarding.ecom}
          splitLeadgen={onboarding.leadgen}
          splitEcomNum={onboarding.ecom}
          splitLeadgenNum={onboarding.leadgen}
          onClick={() => setOpenKPI('onboarding')}
          ariaLabel={`Onboarding Pipeline ${onboarding.total}: ${onboarding.pending} pending, ${onboarding.done} done, ${onboarding.stuck} stuck more than 7 days. E-Com ${onboarding.ecom}, Lead Gen ${onboarding.leadgen}. Activate to view details.`}
        />

        <KpiCard
          Icon={AlertTriangle}
          title="At-Risk (CLA)"
          value={claData.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{claData.sureshot} sureshot</span>
              <span className="font-normal opacity-70 ml-0.5">· {formatLakh(claData.revAtRisk)} at risk</span>
            </span>
          }
          splitEcom={claData.ecom}
          splitLeadgen={claData.leadgen}
          splitEcomNum={claData.ecom}
          splitLeadgenNum={claData.leadgen}
          onClick={() => setOpenKPI('cla')}
          ariaLabel={`At-Risk Clients ${claData.total}: ${claData.sureshot} sureshot, ${claData.saveable} can be saved, ${formatLakh(claData.revAtRisk)} revenue at risk. E-Com ${claData.ecom}, Lead Gen ${claData.leadgen}. Activate to view details.`}
        />

        <KpiCard
          Icon={Sparkles}
          title="Upsell Pipeline"
          value={formatLakh(upsell.sumPotential)}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="tabular-nums">{upsell.highConf} high confidence</span>
              <span className="font-normal opacity-70 ml-0.5">· {upsell.total} deals</span>
            </span>
          }
          splitEcom={upsell.ecom}
          splitLeadgen={upsell.leadgen}
          splitEcomNum={upsell.ecom}
          splitLeadgenNum={upsell.leadgen}
          onClick={() => setOpenKPI('upsell')}
          ariaLabel={`Upsell Pipeline ${formatLakh(upsell.sumPotential)} potential across ${upsell.total} deals, ${upsell.highConf} high confidence. E-Com ${upsell.ecom}, Lead Gen ${upsell.leadgen}. Activate to view details.`}
        />
      </div>

      {/* EXECUTION — workload + delivery. Same KpiCard chrome as everything
          above; just a 2-col grid since these two cards form a logical pair.
          Tasks uses Client/Internal as the split (default indigo/amber), and
          Targets uses Hit/Miss with green/red so the bar carries semantic
          meaning at a glance. */}
      <SectionLabel title="Execution" hint="Workload and delivery against client KSM targets" />
      <div className="grid grid-cols-2 gap-5 mb-6">

        <TasksCard
          tasks={tasks}
          onClick={() => router.push(WORKSPACE_ROUTES.myTasks)}
        />

        <KpiCard
          Icon={Target}
          title="Client KSM Hit Rate"
          value={
            <span className={targets.hitRate >= targets.target ? 'text-emerald-600' : 'text-rose-600'}>
              {targets.hitRate}%
            </span>
          }
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{targets.miss} missed</span>
              <span className="font-normal opacity-70 ml-0.5">· {targets.target}% target</span>
            </span>
          }
          splitEcom={targets.hit}
          splitLeadgen={targets.miss}
          splitEcomNum={targets.hit}
          splitLeadgenNum={targets.miss}
          splitEcomLabel="Hit"
          splitLeadgenLabel="Miss"
          splitEcomColor={GREEN}
          splitLeadgenColor={RED}
          onClick={() => setOpenKPI('targets')}
          ariaLabel={`Client KSM Hit Rate ${targets.hitRate} percent, target ${targets.target} percent. ${targets.hit} of ${targets.total} clients hit, ${targets.miss} missed. Activate to view per-client breakdown.`}
        />
      </div>

      {/* DRAWER — single instance, body switches on openKPI */}
      {openKPI && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[9998]"
            aria-hidden="true"
            onClick={() => setOpenKPI(null)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pm-drawer-title"
            className="fixed top-0 right-0 h-screen w-[880px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
            style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Drawer top bar */}
            <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 bg-white relative z-10 gap-4">
              <div className="min-w-0 flex-1">
                <h2 id="pm-drawer-title" className="text-h2 font-bold text-black/90">{kpiMeta[openKPI].title}</h2>
                <p className="text-caption text-black/60 mt-1.5">{kpiMeta[openKPI].subtitle}</p>
              </div>
              <button
                ref={drawerCloseBtnRef}
                onClick={() => setOpenKPI(null)}
                className="w-9 h-9 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                aria-label="Close drawer"
              >
                <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
              </button>
            </div>

            {/* Drawer body — switches on openKPI */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {openKPI === 'active' && (
                <ActiveDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'revenue' && (
                <RevenueDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'margin' && (
                <MarginDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'ratings' && (
                <RatingsDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'incidents' && (
                <IncidentsDrawerBody
                  type={drawerType}
                  setType={setDrawerType}
                  severity={drawerSeverity}
                  setSeverity={setDrawerSeverity}
                />
              )}
              {openKPI === 'onboarding' && (
                <OnboardingDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'cla' && (
                <ClaDrawerBody
                  type={drawerType}
                  setType={setDrawerType}
                  status={drawerClaStatus}
                  setStatus={setDrawerClaStatus}
                />
              )}
              {openKPI === 'upsell' && (
                <UpsellDrawerBody type={drawerType} setType={setDrawerType} />
              )}
              {openKPI === 'targets' && (
                <TargetsDrawerBody
                  type={drawerType}
                  setType={setDrawerType}
                  ksm={drawerKsm}
                  setKsm={setDrawerKsm}
                />
              )}

              {/* Drawer footer — link out to Deliverables sub-tab */}
              <div className="px-7 py-4 border-t border-black/[0.06] bg-[#FAFBFC] flex justify-end">
                <button
                  onClick={goToDeliverables}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                >
                  {kpiMeta[openKPI].routeLabel}
                  <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION LABEL — divider between SNAPSHOT and ACTION QUEUE
// ══════════════════════════════════════════════════════════════════════════════

function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="text-caption font-bold text-black/70 uppercase tracking-[0.08em]">{title}</h2>
      <span className="text-caption text-black/45 font-normal">{hint}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED DRAWER PIECES
// ══════════════════════════════════════════════════════════════════════════════

function DrawerHero({
  value,
  label,
  delta,
}: {
  value: React.ReactNode;
  label: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="px-7 pt-6 pb-6">
      <p className="text-caption text-black/60 mb-1.5">{label}</p>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-display text-black/90 tabular-nums">{value}</span>
        {delta}
      </div>
    </div>
  );
}

function DrawerInsights({ items }: { items: { label: string; text: string }[] }) {
  return (
    <div className="px-7 pb-5">
      <div className="rounded-xl border border-black/[0.06] bg-[#FAFBFC] overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-caption font-semibold text-black/60 uppercase tracking-wider">What this means</p>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {items.map((ins, idx) => (
            <li key={idx} className="flex gap-3.5 px-5 py-3.5">
              <span
                className="shrink-0 w-5 h-5 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-caption font-semibold text-black/70 tabular-nums"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-semibold text-black/75">{ins.label}</p>
                <p className="text-caption text-black/60 leading-[1.6] mt-1">{ins.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DrawerSectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="px-7 pt-2 pb-3 flex items-center justify-between gap-4">
      <h3 className="text-body font-bold text-black/85">{title}</h3>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

function TypeFilterSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: TypeFilter;
  onChange: (v: TypeFilter) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by client type</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as TypeFilter)}
        className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All client types</option>
        <option value="E-Com">E-Commerce</option>
        <option value="Lead Gen">Lead Generation</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function TypeTag({ type }: { type: ClientType }) {
  return (
    <span className={`text-caption font-medium px-1.5 py-0.5 rounded ${
      type === 'E-Com' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-700'
    }`}>{type}</span>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className="w-3 h-3"
          fill={s <= rating ? AMBER : 'none'}
          stroke={s <= rating ? AMBER : 'rgba(0,0,0,0.15)'}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function DrawerTable({
  ariaLabel,
  head,
  rows,
  align,
  rowHighlight,
  pageSize,
}: {
  ariaLabel: string;
  head: string[];
  rows: React.ReactNode[][];
  align: ('left' | 'right')[];
  rowHighlight?: (idx: number) => string;
  /** When set, table paginates internally with N rows per page and renders
      a Prev / Page X of Y / Next footer. Default: render all rows. */
  pageSize?: number;
}) {
  // Local pagination state. Keyed implicitly to the parent caller — when the
  // caller passes a different `rows` array (e.g. filters changed), we reset
  // back to page 1 so the user isn't stranded on an empty page.
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows.length]);

  const paginated = pageSize !== undefined && rows.length > pageSize;
  const totalPages = paginated ? Math.max(1, Math.ceil(rows.length / pageSize!)) : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = paginated ? (currentPage - 1) * pageSize! : 0;
  const endIdx = paginated ? Math.min(startIdx + pageSize!, rows.length) : rows.length;
  const visible = paginated ? rows.slice(startIdx, endIdx) : rows;

  // Map page-local index → global index so rowHighlight (which is keyed off
  // the caller's full rows array) keeps highlighting the correct rows after
  // pagination slices.
  const globalIdx = (pageLocalIdx: number) => paginated ? startIdx + pageLocalIdx : pageLocalIdx;

  return (
    <div className="px-7 pb-7">
      <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={ariaLabel}>
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                {head.map((h, idx) => (
                  <th
                    key={idx}
                    className={`px-5 py-3 text-caption font-semibold text-black/55 uppercase tracking-wide ${align[idx] === 'right' ? 'text-right' : 'text-left'}`}
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={head.length} className="px-5 py-8 text-center text-caption text-black/45">
                    No matching records.
                  </td>
                </tr>
              )}
              {visible.map((cells, ridx) => (
                <tr key={`${currentPage}-${ridx}`} className={`hover:bg-black/[0.015] transition-colors ${rowHighlight ? rowHighlight(globalIdx(ridx)) : ''}`}>
                  {cells.map((c, cidx) => (
                    <td key={cidx} className={`px-5 py-3 align-middle ${align[cidx] === 'right' ? 'text-right' : 'text-left'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination footer — only rendered when there's more than one page.
            Style mirrors Stripe / Linear: "Showing X–Y of N" on the left,
            Prev / page indicator / Next on the right. */}
        {paginated && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-3 border-t border-black/5 bg-[#FAFBFC]"
            role="navigation"
            aria-label={`${ariaLabel} pagination`}
          >
            <span className="text-caption text-black/55 tabular-nums">
              Showing <span className="font-semibold text-black/75">{startIdx + 1}–{endIdx}</span> of{' '}
              <span className="font-semibold text-black/75">{rows.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 bg-white text-black/65 hover:border-black/20 hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-black/10 disabled:hover:text-black/65 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="text-caption font-semibold text-black/70 tabular-nums px-2 min-w-[64px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-black/10 bg-white text-black/65 hover:border-black/20 hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-black/10 disabled:hover:text-black/65 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable tooltip with E-Com / Lead Gen split
function SplitTooltip({ active, payload, label, fmt }: {
  active?: boolean;
  payload?: { value?: number | string; dataKey?: string | number; }[];
  label?: string | number;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const ecom = payload.find(p => p.dataKey === 'ecom')?.value as number | undefined;
  const lg = payload.find(p => p.dataKey === 'leadgen')?.value as number | undefined;
  const total = (ecom ?? 0) + (lg ?? 0);
  const f = fmt ?? ((v: number) => v.toString());
  return (
    <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
      <p className="font-bold text-black/75 mb-1">{label} '26</p>
      {ecom !== undefined && <p className="text-indigo-600 font-semibold">E-Com: {f(ecom)}</p>}
      {lg !== undefined && <p className="text-amber-600 font-semibold">Lead Gen: {f(lg)}</p>}
      {ecom !== undefined && lg !== undefined && <p className="text-black/55 mt-0.5">Total: {f(total)}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER BODIES
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. Active SEM Clients ────────────────────────────────────────────────────

function ActiveDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? activeClientList : activeClientList.filter(c => c.type === type);
  const momPct = activeClients.prevTotal > 0 ? ((activeClients.total - activeClients.prevTotal) / activeClients.prevTotal) * 100 : 0;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={activeClients.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{momPct.toFixed(1)}% vs Mar
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Net SEM book is growing', text: `Client base expanded by ${activeClients.change} this month, ending at ${activeClients.total} active SEM clients. The growth came primarily from new E-Com retainers; Lead Gen has been flat-to-up.` },
        { label: 'E-Com is the larger book', text: `${activeClients.ecom} E-Com (${Math.round((activeClients.ecom / activeClients.total) * 100)}%) and ${activeClients.leadgen} Lead Gen (${Math.round((activeClients.leadgen / activeClients.total) * 100)}%). E-Com continues to drive the bulk of SEM revenue.` },
        { label: 'Watch retention before celebrating', text: 'Net growth assumes the 5 At-Risk accounts (CLA card) don\'t convert to exits next month. Two of those are sureshot.' },
      ]} />

      <DrawerSectionTitle title="6-month client trend by type" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="ecom-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_ECOM} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_ECOM} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="lg-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_LG} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_LG} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip cursor={{ stroke: 'rgba(0,0,0,0.08)' }} content={<SplitTooltip />} />
            <Area type="monotone" dataKey="ecom" stackId="1" stroke={C_ECOM} fill="url(#ecom-grad)" strokeWidth={2} />
            <Area type="monotone" dataKey="leadgen" stackId="1" stroke={C_LG} fill="url(#lg-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Active client list — ${filtered.length} client${filtered.length === 1 ? '' : 's'}`}
        right={<TypeFilterSelect id="active-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Active SEM clients"
        pageSize={10}
        head={['Client', 'Type', 'KSM', 'HOD', 'Billing', 'Tenure']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="k" className={`text-caption font-semibold ${c.ksm === 'Hit' ? 'text-emerald-600' : 'text-rose-600'}`}>{c.ksm}</span>,
          <span key="h" className="text-caption text-black/65">{c.hod}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
          <span
            key="d"
            className="text-caption font-semibold text-black/75 tabular-nums"
            title={`Onboarded ${c.since}`}
            aria-label={`${formatTenure(c.since)} tenure, onboarded ${c.since}`}
          >
            {formatTenure(c.since)}
          </span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 2. Monthly Revenue ───────────────────────────────────────────────────────

function RevenueDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? activeClientList : activeClientList.filter(c => c.type === type);
  const filteredSum = filtered.reduce((s, r) => s + r.revenue, 0);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={formatLakh(revenue.total)}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{revenue.change}% vs Mar
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Both books grew this month', text: `Total SEM revenue rose ~${revenue.change}% MoM. E-Com landed at ${formatLakh(revenue.ecom)} and Lead Gen at ${formatLakh(revenue.leadgen)}, with E-Com still the larger book by a wide margin.` },
        { label: 'E-Com is ~65% of the SEM book', text: `${formatLakh(revenue.ecom)} of ${formatLakh(revenue.total)} comes from E-Com — concentration risk if a single E-Com retainer churns. True Diamond and Elan by Aanchal alone account for ${formatLakh(1972000 + 1534000)}.` },
        { label: 'Top 2 clients drive 25% of revenue', text: 'True Diamond + Elan by Aanchal contribute disproportionately. Diversifying into more mid-tier accounts would reduce dependency.' },
      ]} />

      <DrawerSectionTitle title="6-month revenue by type" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatLakh(v as number)} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<SplitTooltip fmt={formatLakh} />} />
            <Bar dataKey="ecom" stackId="1" fill={C_ECOM} radius={[0, 0, 0, 0]} />
            <Bar dataKey="leadgen" stackId="1" fill={C_LG} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Top revenue clients — ${formatLakh(filteredSum)}`}
        right={<TypeFilterSelect id="rev-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Top revenue clients"
        pageSize={10}
        head={['Client', 'Type', 'Revenue', 'Cost', 'Margin %']}
        rows={filtered.sort((a, b) => b.revenue - a.revenue).map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="r" className="text-caption font-semibold text-black/85 tabular-nums">{formatLakh(c.revenue)}</span>,
          <span key="x" className="text-caption text-black/55 tabular-nums">{formatLakh(c.cost)}</span>,
          <span key="m" className={`text-caption font-semibold tabular-nums ${c.margin >= 30 ? 'text-emerald-600' : c.margin >= 25 ? 'text-amber-600' : 'text-rose-600'}`}>{c.margin.toFixed(1)}%</span>,
        ])}
        align={['left', 'left', 'right', 'right', 'right']}
      />
    </>
  );
}

// ─── 3. Net Margin ────────────────────────────────────────────────────────────

function MarginDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? activeClientList : activeClientList.filter(c => c.type === type);
  const sortedByMargin = [...filtered].sort((a, b) => b.margin - a.margin);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-emerald-600">{margin.rate}%</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{(margin.rate - margin.prevRate).toFixed(1)}% vs Mar ({margin.prevRate}%)
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${(margin.rate - margin.target).toFixed(1)}% above the ${margin.target}% target`, text: `Blended margin is ${margin.rate}% — ${(margin.rate - margin.target).toFixed(1)}% above the ${margin.target}% internal target. E-Com runs at ${margin.ecomRate}% (well above target), Lead Gen at ${margin.leadgenRate}% (still under) — Lead Gen is what's pulling the blended number down.` },
        { label: 'E-Com pulls the average up', text: `E-Com margin is ${margin.ecomRate}% (well above target), Lead Gen is ${margin.leadgenRate}% (just over target). The Lead Gen book runs leaner and is more sensitive to ad-spend efficiency.` },
        { label: 'Two clients drag Lead Gen down', text: 'Pytheos Health (21.4%) and TREC (18.8%) sit well below the 30% target. Either renegotiate retainers or improve campaign efficiency before next quarter.' },
      ]} />

      <DrawerSectionTitle title="6-month margin (%) with target" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={marginTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} unit="%" />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-emerald-600 font-semibold">{payload[0]?.value}% blended</p>
                </div>
              ) : null}
            />
            <ReferenceLine y={margin.target} stroke="#00C875" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={32}>
              {marginTrend.map((d, idx) => (
                <Cell key={idx} fill={d.rate >= margin.target ? GREEN : RED} opacity={idx === marginTrend.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title="Margin by client (best to worst)"
        right={<TypeFilterSelect id="margin-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Client margin breakdown"
        pageSize={10}
        head={['Client', 'Type', 'Revenue', 'Cost', 'Margin %']}
        rows={sortedByMargin.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="r" className="text-caption text-black/65 tabular-nums">{formatLakh(c.revenue)}</span>,
          <span key="x" className="text-caption text-black/55 tabular-nums">{formatLakh(c.cost)}</span>,
          <span key="m" className={`text-caption font-semibold tabular-nums ${c.margin >= 30 ? 'text-emerald-600' : c.margin >= 25 ? 'text-amber-600' : 'text-rose-600'}`}>{c.margin.toFixed(1)}%</span>,
        ])}
        rowHighlight={(idx) => sortedByMargin[idx].margin < margin.target ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'right', 'right', 'right']}
      />
    </>
  );
}

// ─── 4. Customer Ratings ──────────────────────────────────────────────────────

function RatingsDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? ratingsList : ratingsList.filter(r => r.type === type);
  const filteredAvg = filtered.length > 0 ? filtered.reduce((s, r) => s + r.rating, 0) / filtered.length : 0;
  const filteredLow = filtered.filter(r => r.rating <= 2).length;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={
          <span className="flex items-baseline gap-2">
            <span className="tabular-nums">{ratings.avg.toFixed(1)}</span>
            <Star className="w-7 h-7 self-center" fill={AMBER} stroke={AMBER} aria-hidden="true" />
          </span>
        }
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {(ratings.prevAvg - ratings.avg).toFixed(1)} vs Mar ({ratings.prevAvg.toFixed(1)})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'E-Com leads on satisfaction', text: `E-Com averages ${ratings.ecomAvg.toFixed(1)}★ vs Lead Gen at ${ratings.leadgenAvg.toFixed(1)}★. Lead Gen is dragging the blended SEM average down.` },
        { label: `${ratings.lowCount} account in the danger zone`, text: `${ratings.lowCount} of ${ratings.total} clients rated 2★ or below — Bio Basket is the immediate flight risk and is also flagged on the CLA card.` },
        { label: 'Small sample, watch the trend', text: `${ratings.total} responses isn't a survey panel — it's the most recent feedback. The E-Com / Lead Gen gap has been consistent for 3 months.` },
      ]} />

      <DrawerSectionTitle title="Rating distribution" />
      <div className="px-7 pb-6 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ratingsDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="stars" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label}</p>
                  <p className="text-black/65">{payload[0]?.value} {(payload[0]?.value as number) === 1 ? 'response' : 'responses'}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
              {ratingsDistribution.map((d, idx) => {
                const stars = idx + 1;
                const color = stars <= 2 ? RED : stars === 3 ? AMBER : GREEN;
                return <Cell key={idx} fill={color} opacity={d.count === 0 ? 0.2 : 1} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Feedback — ${filteredAvg.toFixed(1)}★ avg, ${filteredLow} below 3★`}
        right={<TypeFilterSelect id="ratings-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Customer feedback"
        head={['Client', 'Rating', 'Feedback', 'Type', 'Date']}
        rows={filtered.map((r) => [
          <span key="c" className="text-body font-medium text-black/80">{r.client}</span>,
          <StarRow key="r" rating={r.rating} />,
          <span key="f" className="text-caption text-black/60 line-clamp-2 leading-relaxed">{r.feedback}</span>,
          <TypeTag key="t" type={r.type} />,
          <span key="d" className="text-caption text-black/55">{r.date}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].rating <= 2 ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'left']}
      />
    </>
  );
}

// ─── 5. Open Incidents ────────────────────────────────────────────────────────

function IncidentsDrawerBody({
  type, setType, severity, setSeverity,
}: {
  type: TypeFilter;
  setType: (v: TypeFilter) => void;
  severity: 'All' | 'Critical' | 'High' | 'Medium';
  setSeverity: (v: 'All' | 'Critical' | 'High' | 'Medium') => void;
}) {
  let filtered = incidentsList;
  if (type !== 'All') filtered = filtered.filter(i => i.type === type);
  if (severity !== 'All') filtered = filtered.filter(i => i.severity === severity);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={incidents.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {Math.abs(incidents.total - incidents.prevTotal)} fewer than Mar ({incidents.prevTotal})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: '2 critical incidents need attention today', text: `${incidents.critical} critical-severity issues are open: Bio Basket (ROAS drop, ${14}d) and July Issue (revenue miss, ${9}d). Both are E-Com accounts with KSM misses.` },
        { label: 'E-Com bears the load', text: `${incidents.ecom} of ${incidents.total} incidents are on E-Com clients — consistent with E-Com being the larger book, but the severity skew is what to worry about.` },
        { label: 'Trend is improving', text: `Total incidents dropped from ${incidents.prevTotal} in March to ${incidents.total} in April. Critical count held flat — the same accounts (Bio Basket, July Issue, TREC) have been escalated for two consecutive months.` },
      ]} />

      <DrawerSectionTitle title="6-month incident trend" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={incidentTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-rose-600 font-semibold">Critical: {payload.find(p => p.dataKey === 'critical')?.value ?? 0}</p>
                  <p className="text-amber-600 font-semibold">High: {payload.find(p => p.dataKey === 'high')?.value ?? 0}</p>
                  <p className="text-black/55 font-semibold">Medium: {payload.find(p => p.dataKey === 'medium')?.value ?? 0}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="medium" stackId="1" fill="rgba(0,0,0,0.25)" />
            <Bar dataKey="high" stackId="1" fill={AMBER} />
            <Bar dataKey="critical" stackId="1" fill={RED} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Open incidents — ${filtered.length} matching`}
        right={
          <>
            <div className="relative">
              <label htmlFor="inc-sev" className="sr-only">Severity</label>
              <select
                id="inc-sev"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as typeof severity)}
                className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <TypeFilterSelect id="inc-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="Open SEM incidents"
        head={['ID', 'Client', 'Type', 'Severity', 'Category', 'Days Open']}
        rows={filtered.map((i) => [
          <span key="id" className="text-caption font-mono text-black/55">{i.id}</span>,
          <div key="c">
            <span className="text-body font-medium text-black/80 block">{i.client}</span>
            <span className="text-caption text-black/55 block leading-relaxed mt-0.5">{i.description}</span>
          </div>,
          <TypeTag key="t" type={i.type} />,
          <span key="s" className={`text-caption font-semibold px-1.5 py-0.5 rounded ${
            i.severity === 'Critical' ? 'bg-rose-50 text-rose-700'
            : i.severity === 'High' ? 'bg-amber-50 text-amber-700'
            : 'bg-black/[0.04] text-black/65'
          }`}>{i.severity}</span>,
          <span key="cat" className="text-caption text-black/65">{i.category}</span>,
          <span key="d" className="text-caption font-semibold text-black/75 tabular-nums">{i.daysOpen}d</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].severity === 'Critical' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'left', 'right']}
      />
    </>
  );
}

// ─── 6. Onboarding Pipeline ───────────────────────────────────────────────────

function OnboardingDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? onboardingList : onboardingList.filter(o => o.type === type);
  const stuckCount = filtered.filter(o => o.status === 'Pending' && o.days > 7).length;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={onboarding.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {onboarding.stuck} stuck &gt; 7 days
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${onboarding.pending} clients pending kickoff`, text: `${onboarding.pending} of ${onboarding.total} are still in the pre-live queue. Average time to kickoff is ${onboarding.avgDays} days — comfortable, but the long tail is a problem.` },
        { label: `${onboarding.stuck} accounts stuck > 7 days`, text: `Nor Black Nor White (12d, no team), Sahara Textiles (9d, no team), and Enagenbio (8d, awaiting proposal) need a Super Admin nudge. Two have no assignee yet.` },
        { label: 'E-Com volume is heavier', text: `${onboarding.ecom} E-Com vs ${onboarding.leadgen} Lead Gen in the pipe — typical for our book. The Lead Gen onboardings are tracking faster (avg 5d vs E-Com 9d).` },
      ]} />

      <DrawerSectionTitle title="6-month onboarding throughput" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={onboardingTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-indigo-600 font-semibold">New: {payload.find(p => p.dataKey === 'new')?.value ?? 0}</p>
                  <p className="text-emerald-600 font-semibold">Completed: {payload.find(p => p.dataKey === 'completed')?.value ?? 0}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="new" fill={C_ECOM} radius={[6, 6, 0, 0]} barSize={20} />
            <Bar dataKey="completed" fill={GREEN} radius={[6, 6, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Pipeline — ${filtered.length} client${filtered.length === 1 ? '' : 's'}, ${stuckCount} stuck`}
        right={<TypeFilterSelect id="onb-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Onboarding pipeline"
        head={['Client', 'Type', 'Stage', 'Status', 'Days', 'Assignee']}
        rows={filtered.map((o) => [
          <span key="c" className="text-body font-medium text-black/80">{o.client}</span>,
          <TypeTag key="t" type={o.type} />,
          <span key="st" className="text-caption text-black/65">{o.stage}</span>,
          <span key="s" className={`text-caption font-semibold px-1.5 py-0.5 rounded ${o.status === 'Done' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{o.status}</span>,
          <span key="d" className={`text-caption font-semibold tabular-nums ${o.status === 'Pending' && o.days > 7 ? 'text-rose-600' : 'text-black/75'}`}>{o.days}d</span>,
          <span key="a" className={`text-caption ${o.assignee === 'Unassigned' ? 'text-rose-600 font-semibold' : 'text-black/65'}`}>{o.assignee}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].status === 'Pending' && filtered[idx].days > 7 ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 7. At-Risk (CLA) ─────────────────────────────────────────────────────────

function ClaDrawerBody({
  type, setType, status, setStatus,
}: {
  type: TypeFilter;
  setType: (v: TypeFilter) => void;
  status: 'All' | 'sureshot' | 'can-be-saved';
  setStatus: (v: 'All' | 'sureshot' | 'can-be-saved') => void;
}) {
  let filtered = claList;
  if (type !== 'All') filtered = filtered.filter(c => c.type === type);
  if (status !== 'All') filtered = filtered.filter(c => c.claStatus === status);
  const filteredRev = filtered.reduce((s, c) => s + c.billing, 0);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-rose-600">{claData.total}</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-rose-600">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {formatLakh(claData.revAtRisk)} at risk
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${claData.sureshot} sureshot exits — assume they're gone`, text: `Zenith Retail, FreshBite Foods, and Saral Tax LLP are the three sureshot CLAs. Combined billing of ${formatLakh(claList.filter(c => c.claStatus === 'sureshot').reduce((s, c) => s + c.billing, 0))}/mo walks out next quarter unless something changes today.` },
        { label: `${claData.saveable} can be saved — but not for free`, text: 'Bio Basket, July Issue, and TREC are recoverable but require active intervention — strategy resets and creative refreshes. Two of these are also flagged on the Open Incidents card.' },
        { label: 'Concentration is in E-Com', text: `${claData.ecom} of ${claData.total} CLAs are E-Com (~${Math.round((claData.ecom / claData.total) * 100)}%). The book that produces ${Math.round((revenue.ecom / revenue.total) * 100)}% of revenue also produces the bulk of the at-risk count — the dependency cuts both ways.` },
      ]} />

      <DrawerSectionTitle title="6-month CLA trend by status" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={claTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-rose-600 font-semibold">Sureshot: {payload.find(p => p.dataKey === 'sureshot')?.value ?? 0}</p>
                  <p className="text-amber-600 font-semibold">Saveable: {payload.find(p => p.dataKey === 'saveable')?.value ?? 0}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="saveable" stackId="1" fill={AMBER} />
            <Bar dataKey="sureshot" stackId="1" fill={RED} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`At-risk clients — ${filtered.length} matching, ${formatLakh(filteredRev)} at risk`}
        right={
          <>
            <div className="relative">
              <label htmlFor="cla-status" className="sr-only">CLA status</label>
              <select
                id="cla-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All statuses</option>
                <option value="sureshot">Sureshot</option>
                <option value="can-be-saved">Can be saved</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <TypeFilterSelect id="cla-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="At-risk SEM clients"
        head={['Client', 'Type', 'Status', 'Reason', 'Owner', 'Billing']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="s" className={`text-caption font-semibold px-1.5 py-0.5 rounded ${c.claStatus === 'sureshot' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{c.claStatus === 'sureshot' ? 'Sureshot' : 'Saveable'}</span>,
          <span key="r" className="text-caption text-black/65 leading-relaxed">{c.reason}</span>,
          <span key="o" className="text-caption text-black/65">{c.responsible}</span>,
          <span key="b" className="text-caption font-semibold text-rose-600 tabular-nums">{formatLakh(c.billing)}/mo</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].claStatus === 'sureshot' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'left', 'right']}
      />
    </>
  );
}

// ─── 8. Upsell Pipeline ───────────────────────────────────────────────────────

function UpsellDrawerBody({
  type, setType,
}: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
  const filtered = type === 'All' ? upsellList : upsellList.filter(u => u.type === type);
  const filteredSum = filtered.reduce((s, u) => s + u.potentialRevenue, 0);
  const confColors: Record<string, string> = {
    high: 'bg-emerald-50 text-emerald-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-black/[0.04] text-black/65',
  };

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={formatLakh(upsell.sumPotential)}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-700">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {upsell.highConf} high confidence
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${upsell.total} active opportunities`, text: `${formatLakh(upsell.sumPotential)} of potential monthly revenue is on the upsell board — ${formatLakh(upsellList.filter(u => u.confidence === 'high').reduce((s, u) => s + u.potentialRevenue, 0))} of that sits in the high-confidence bucket and is realistically closable this quarter.` },
        { label: 'Concentrated in top accounts', text: `Pristine Diamonds (${formatLakh(220000)}), Elan by Aanchal (${formatLakh(180000)}), and Atharv Couture (${formatLakh(145000)}) are the biggest upsell targets — all three are 5★ rated, so the relationship runway is there.` },
        { label: 'Lead Gen is under-explored', text: `Only ${upsell.leadgen} of the ${upsell.total} opportunities are Lead Gen. The Lead Gen book is healthier than the conversion rate suggests — this is a sales motion gap, not a product gap.` },
      ]} />

      <DrawerSectionTitle title="6-month upsell pipeline value" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={upsellTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="upsell-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.45} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatLakh(v as number)} />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-emerald-600 font-semibold">{formatLakh(payload[0]?.value as number)}</p>
                </div>
              ) : null}
            />
            <Area type="monotone" dataKey="potential" stroke={GREEN} fill="url(#upsell-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Opportunities — ${filtered.length} deals, ${formatLakh(filteredSum)} potential`}
        right={<TypeFilterSelect id="up-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Upsell opportunities"
        head={['Client', 'Type', 'Opportunity', 'Confidence', 'Potential']}
        rows={filtered.sort((a, b) => b.potentialRevenue - a.potentialRevenue).map((u) => [
          <span key="c" className="text-body font-medium text-black/80">{u.client}</span>,
          <TypeTag key="t" type={u.type} />,
          <span key="o" className="text-caption text-black/65 leading-relaxed">{u.opportunity}</span>,
          <span key="cf" className={`text-caption font-semibold px-1.5 py-0.5 rounded capitalize ${confColors[u.confidence]}`}>{u.confidence}</span>,
          <span key="p" className="text-caption font-semibold text-emerald-700 tabular-nums">{formatLakh(u.potentialRevenue)}/mo</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right']}
      />
    </>
  );
}

// (TasksHeroCard, HeroStatPill and SplitRow lived here before the design
// critique — replaced by two standard KpiCards in the EXECUTION grid above
// for tighter visual parity with the rest of the page.)

// (TasksDrawerBody removed: the Tasks card now navigates directly to
// /workspace/task-management instead of opening a drawer. The drawer flow
// would have been one extra click for no extra information.)

// ─── 9. Client KSM Target Performance (drawer body) ───────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// TasksCard — custom EXECUTION card (NOT a KpiCard).
//
// Why custom and not a KpiCard variant:
//   1. The card promotes 3 actionable numbers (Overdue · P1 · Due this week)
//      into a triptych. KpiCard's single-headline + delta-pill layout buries
//      these signals.
//   2. Click navigates to /workspace/task-management — there's no drawer,
//      so the chevron-right of KpiCard would be the wrong affordance.
//   3. The chrome (border, padding, hover, focus ring, group hover sheen)
//      is copied from KpiCard so it visually belongs in the EXECUTION grid
//      next to the Targets KpiCard.
//
// What earns its space:
//   - 3 hero stats, color-coded by urgency (rose / amber / neutral).
//   - One quiet bottom strip with total + Client/Internal split as context.
//   - "Open Task Management →" affordance on the right signals navigation
//     (not "expand drawer" like a chevron would).
// ══════════════════════════════════════════════════════════════════════════════

function TasksCard({
  tasks,
  onClick,
}: {
  tasks: {
    total: number; overdue: number; dueThisWeek: number;
    p1: number; client: number; internal: number; blocked: number;
  };
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`SEM Tasks: ${tasks.total} open (${tasks.client} client, ${tasks.internal} internal). ${tasks.overdue} overdue, ${tasks.p1} P1, ${tasks.dueThisWeek} due this week. Activate to open My Tasks.`}
      className="group relative bg-white rounded-xl p-5 border border-black/[0.06] hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#204CC7]/[0.025] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Header: icon + title + chevron — mirrors KpiCard for visual parity
          with the KSM Hit/Miss card sitting next to it. */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08]">
            <ListTodo className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <span className="text-black/65 text-caption font-semibold truncate">SEM Tasks</span>
        </div>
        <ChevronRight
          className="w-4 h-4 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Hero metric + audience caption */}
      <div className="relative">
        <p className="flex items-baseline gap-2">
          <span className="text-h1 leading-none font-bold text-black/90 tabular-nums">{tasks.total}</span>
          <span className="text-caption text-black/55">open</span>
        </p>
        <p className="text-caption text-black/60 mt-1.5">
          <span className="text-black/80 font-semibold tabular-nums">{tasks.client}</span> client
          <span className="text-black/25 mx-1.5">·</span>
          <span className="text-black/80 font-semibold tabular-nums">{tasks.internal}</span> internal
        </p>
      </div>

      {/* Urgency chips */}
      <div className="relative mt-5 pt-4 border-t border-black/[0.05] flex items-center gap-2 flex-wrap">
        <UrgencyChip count={tasks.overdue} label="Overdue" tone="rose" />
        <UrgencyChip count={tasks.p1} label="P1" tone="amber" />
        <UrgencyChip count={tasks.dueThisWeek} label="Due this week" tone="neutral" />
      </div>
    </button>
  );
}

// Small tonal pill for an urgency dimension. When count is 0 we render the
// chip in a quiet neutral state so the card preserves rhythm without shouting.
// Tones: rose = needs action today; amber = priority, watch closely;
// neutral = informational only.
function UrgencyChip({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'rose' | 'amber' | 'neutral';
}) {
  const isOn = count > 0;
  const tones = {
    rose:    { bg: 'bg-rose-50',  text: 'text-rose-700',  dot: 'bg-rose-500'  },
    amber:   { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    neutral: { bg: 'bg-black/[0.04]', text: 'text-black/70', dot: 'bg-black/45' },
  } as const;
  const off = { bg: 'bg-black/[0.03]', text: 'text-black/55', dot: 'bg-black/30' };
  const styles = isOn ? tones[tone] : off;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-caption font-medium ${styles.bg} ${styles.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      <span className="font-semibold tabular-nums">{count}</span>
      <span>{label}</span>
    </span>
  );
}

function TargetsDrawerBody({
  type, setType, ksm, setKsm,
}: {
  type: TypeFilter;
  setType: (v: TypeFilter) => void;
  ksm: KsmFilter;
  setKsm: (v: KsmFilter) => void;
}) {
  let filtered = activeClientList;
  if (type !== 'All') filtered = filtered.filter(c => c.type === type);
  if (ksm !== 'All') filtered = filtered.filter(c => c.ksm === ksm);

  // Sort: Miss first (the actionable rows), then by client.
  filtered = [...filtered].sort((a, b) => {
    if (a.ksm !== b.ksm) return a.ksm === 'Miss' ? -1 : 1;
    return a.client.localeCompare(b.client);
  });

  const filteredHit = filtered.filter(c => c.ksm === 'Hit').length;
  const filteredMiss = filtered.filter(c => c.ksm === 'Miss').length;
  const filteredHitRate = filtered.length > 0 ? Math.round((filteredHit / filtered.length) * 100) : 0;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={
          <span className={targets.hitRate >= targets.target ? 'text-emerald-600' : 'text-rose-600'}>
            {targets.hitRate}%
          </span>
        }
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-rose-700">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {targets.target - targets.hitRate}% below {targets.target}% target
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${targets.miss} of ${targets.total} clients missed KSM this month`, text: `Hit rate is ${targets.hitRate}% — ${targets.target - targets.hitRate}% below the ${targets.target}% internal target. ${targets.ecomMiss} E-Com account${targets.ecomMiss === 1 ? '' : 's'} and ${targets.lgMiss} Lead Gen account${targets.lgMiss === 1 ? '' : 's'} are off-target.` },
        { label: `E-Com is dragging the average`, text: `E-Com hits at ${Math.round((targets.ecomHit / targets.ecomTotal) * 100)}% (${targets.ecomHit} of ${targets.ecomTotal}); Lead Gen at ${Math.round((targets.lgHit / targets.lgTotal) * 100)}% (${targets.lgHit} of ${targets.lgTotal}). The E-Com book is twice as likely to miss — that's where intervention pays off most.` },
        { label: `Trend has slipped 20% this quarter`, text: `Hit rate fell from 60% in Nov–Dec to 40% in Mar–Apr. Two consecutive months at 40% is no longer a blip — it's the new baseline unless something changes.` },
      ]} />

      <DrawerSectionTitle title="6-month KSM hit rate (%) with target" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ksmTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} unit="%" />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="font-semibold" style={{ color: (payload[0]?.value as number) >= targets.target ? GREEN : RED }}>
                    {payload[0]?.value}% hit rate
                  </p>
                </div>
              ) : null}
            />
            <ReferenceLine y={targets.target} stroke="#00C875" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={32}>
              {ksmTrend.map((d, idx) => (
                <Cell key={idx} fill={d.rate >= targets.target ? GREEN : RED} opacity={idx === ksmTrend.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Per-client KSM — ${filtered.length} matching, ${filteredHitRate}% hit rate`}
        right={
          <>
            <div className="relative">
              <label htmlFor="targets-ksm" className="sr-only">KSM status</label>
              <select
                id="targets-ksm"
                value={ksm}
                onChange={(e) => setKsm(e.target.value as KsmFilter)}
                className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All KSM statuses</option>
                <option value="Hit">Hit only</option>
                <option value="Miss">Miss only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <TypeFilterSelect id="targets-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="Client KSM target performance"
        pageSize={10}
        head={['Client', 'Type', 'KSM', 'HOD', 'Billing']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span
            key="k"
            className={`text-caption font-semibold px-1.5 py-0.5 rounded ${c.ksm === 'Hit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
          >
            {c.ksm}
          </span>,
          <span key="h" className="text-caption text-black/65">{c.hod}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].ksm === 'Miss' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'right']}
      />

      <p className="px-7 pb-4 -mt-2 text-caption text-black/45">
        Showing {filteredHit} hit · {filteredMiss} miss across {filtered.length} client{filtered.length === 1 ? '' : 's'}.
      </p>
    </>
  );
}
