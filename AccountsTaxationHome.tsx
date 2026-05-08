'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users, IndianRupee, TrendingUp, Star, AlertCircle, Briefcase,
  AlertTriangle, Sparkles, ArrowUp, ArrowDown, ArrowUpRight, Calendar,
  ChevronDown, ChevronLeft, ChevronRight, X, ListTodo, Target, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
// Import from the leaf routes module rather than from SuperAdminHome —
// SuperAdminHome imports this component, so importing back from it would
// form a circular dependency.
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';
import { WORKSPACE_ROUTES } from '@/lib/workspace-routes';
import { AtActivityButton } from '@/AtActivityDrawer';

// ══════════════════════════════════════════════════════════════════════════════
// Accounts & Taxation Overview — parity refactor with PerformanceMarketingHome.
//
// Design pattern (per the design-critique we just shipped for PM):
//   1. The page surfaces 8 metric cards in a 4×2 grid, grouped under two
//      labelled sections — SNAPSHOT (state of the A&T business) and
//      ACTION QUEUE (what needs attention right now). Plus an EXECUTION
//      section with two operational cards (Tasks + Compliance Status).
//   2. Each card opens an 880px right drawer with: Hero → Insights → Chart →
//      Table. Filter state lives inside the drawer body, not on the page.
//   3. The within-service split is Compliance vs Advisory (the two A&T
//      engagement types) — matches how PM Overview splits E-Com / Lead Gen.
//   4. Compliance Status (On Track / Behind) is the A&T equivalent of PM's
//      KSM Hit / Miss — a per-client health flag the Super Admin scans first.
//   5. KpiCard / drawer / focus-management chrome is 1:1 with the PM
//      Overview so the Super Admin doesn't re-learn the surface when they
//      switch service tabs.
//
// What was here before this refactor:
//   The A&T tab dropped the user straight into AccountsTaxation.tsx — the
//   operator workspace (client list + checklist board). Tactical, not
//   executive. That view still lives one click away under the Deliverables
//   sub-tab; this Overview is the new default.
// ══════════════════════════════════════════════════════════════════════════════

const BLUE = '#204CC7';
const C_ECOM = '#06B6D4';   // E-Commerce — cyan (matches A&T brand)
const C_NON = '#6366F1';    // Non E-Commerce — indigo (premium, strategic)
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
// Matches the unified subtle-blue widget identity used on the home Overview,
// Customers Overview, and Employees Overview surfaces. The previous
// E-Commerce / Non E-Commerce split block at the bottom was retired across
// all 10 cards — every card now ends on the headline value + delta line, and
// the per-business-type split still surfaces inside the drawer chart and
// table when the admin opens it.

type KpiCardProps = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
};

function KpiCard({
  Icon,
  title,
  value,
  delta,
  onClick,
  ariaLabel,
}: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      // Card chrome — same identity as the home / customers / employees
      // Overview widgets:
      //   • Surface #FAFBFD (≈0.7% blue tint), cool against page bg
      //   • Border #E5EAF7 (cool blue-tinted) instead of warm grey
      //   • Hover bumps border to brand-blue/30 + lifts the wash
      //     from 2.5% → 4.5%
      //   • p-6 (24px) padding for breathing space
      className="group relative bg-[#FAFBFD] rounded-xl p-6 border border-[#E5EAF7] hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#204CC7]/[0.045] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Top row — icon chip + title + chevron all locked to the
          chip's vertical centerline. items-center + no mt nudges,
          so the chevron sits exactly opposite the chip across the
          row. */}
      <div className="relative flex items-center justify-between mb-5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon chip — 36×36 with a thin inset ring so it reads as
              a properly anchored chip rather than a flat coloured
              rectangle. Ring is brand-blue at 10%. */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08] ring-1 ring-inset ring-[#204CC7]/[0.10]">
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
  // Neutral pills shifted to the brand-blue family so unsigned
  // deltas join the rest of the card's blue identity. Positive /
  // negative semantics stay green / rose so MoM signal still reads.
  const cls =
    direction === 'positive' ? 'bg-emerald-50 text-emerald-700'
    : direction === 'negative' ? 'bg-rose-50 text-rose-700'
    : 'bg-[#EEF1FB] text-[#3D5EC7]';
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
// A&T OVERVIEW — Default screen for ?tab=accounts-taxation&sub=overview
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
  | 'compliance';
// Note: 'tasks' is intentionally NOT a KpiId. The Tasks card navigates
// directly to /workspace/task-management and never opens a drawer.

type ClientType = 'E-Commerce' | 'Non E-Commerce';
type TypeFilter = 'All' | ClientType;
type ComplianceStatus = 'On Track' | 'Behind';
type ComplianceFilter = 'All' | ComplianceStatus;
type TaskPriority = 'P1' | 'P2' | 'P3';
type DateRange = 'ytd' | 'mtd' | 'weekly' | 'q1' | 'q2' | 'q3' | 'q4';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — A&T-scoped, single source of truth
// All headline numbers are derived from / consistent with these objects so
// the cards and the drawer hero values can never drift.
// ─────────────────────────────────────────────────────────────────────────────

const TODAY_ISO = '2026-05-05';
const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - new Date(TODAY_ISO).getTime()) / 86400000);

// Tenure formatter (same shape as PerformanceMarketingHome).
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

// HEADLINE OBJECTS — drive both card and drawer hero. Every headline below
// (margin, ratings, incidents, onboarding, claData, upsell, activeClients,
// revenue, complianceData) is *derived* from the corresponding row-level
// list. Headlines and tables can never disagree at any scale.
// `change` / `prevTotal` (historical context) stay hardcoded since they
// aren't derivable from the current snapshot.

// 6-MONTH TRENDS — last data point matches the derived headline (which is
// computed from activeClientList further down). All Apr values are sized
// for the 104-client A&T book; earlier months show believable growth.
const activeTrend = [
  { month: 'Nov', total:  98, ecom: 22, non: 76 },
  { month: 'Dec', total: 100, ecom: 23, non: 77 },
  { month: 'Jan', total: 101, ecom: 24, non: 77 },
  { month: 'Feb', total: 103, ecom: 25, non: 78 },
  { month: 'Mar', total: 102, ecom: 25, non: 77 },
  { month: 'Apr', total: 104, ecom: 26, non: 78 }, // = derived activeClients
];

// Revenue trend — Apr matches the derived `revenue.total` exactly (sum of
// every client's `revenue` field across the 104-client roster). Earlier
// months scaled to a steady ~3% MoM growth curve.
const revenueTrend = [
  { month: 'Nov', ecom: 1020000, non: 8150000 },
  { month: 'Dec', ecom: 1100000, non: 8400000 },
  { month: 'Jan', ecom: 1180000, non: 8650000 },
  { month: 'Feb', ecom: 1250000, non: 8900000 },
  { month: 'Mar', ecom: 1300000, non: 9150000 },
  { month: 'Apr', ecom: 1373000, non: 9430000 }, // = derived revenue.ecom + .non
];

// Margin trend — A&T runs healthier margins than SEM (no ad-spend pass-through).
// Apr blended rate matches the derived `margin.rate` exactly.
const marginTrend = [
  { month: 'Nov', rate: 41.5, ecom: 45.5, non: 41.0 },
  { month: 'Dec', rate: 41.8, ecom: 45.7, non: 41.3 },
  { month: 'Jan', rate: 42.1, ecom: 45.9, non: 41.6 },
  { month: 'Feb', rate: 42.4, ecom: 46.1, non: 41.9 },
  { month: 'Mar', rate: 42.5, ecom: 46.2, non: 42.0 },
  { month: 'Apr', rate: 42.8, ecom: 46.4, non: 42.3 }, // matches derived margin
];

// Ratings distribution — sum matches ratingsList.length (18).
const ratingsDistribution = [
  { stars: '1★', count: 0 },
  { stars: '2★', count: 1 },
  { stars: '3★', count: 3 },
  { stars: '4★', count: 8 },
  { stars: '5★', count: 6 },
];

// Incidents trend — peaked in Mar, dropping in Apr (improving narrative).
const incidentTrend = [
  { month: 'Nov', critical: 0, high: 2, medium: 4 },
  { month: 'Dec', critical: 1, high: 2, medium: 3 },
  { month: 'Jan', critical: 1, high: 3, medium: 3 },
  { month: 'Feb', critical: 1, high: 3, medium: 4 },
  { month: 'Mar', critical: 2, high: 4, medium: 4 },
  { month: 'Apr', critical: 2, high: 3, medium: 3 },
];

// Onboarding throughput — 7 in pipe + 4 completed this month.
const onboardingTrend = [
  { month: 'Nov', new: 4, completed: 3 },
  { month: 'Dec', new: 4, completed: 4 },
  { month: 'Jan', new: 5, completed: 4 },
  { month: 'Feb', new: 6, completed: 4 },
  { month: 'Mar', new: 6, completed: 5 },
  { month: 'Apr', new: 7, completed: 4 },
];

// CLA — peaked at 9 in Mar, dropping to 7 in Apr.
const claTrend = [
  { month: 'Nov', sureshot: 1, saveable: 3 },
  { month: 'Dec', sureshot: 1, saveable: 4 },
  { month: 'Jan', sureshot: 2, saveable: 4 },
  { month: 'Feb', sureshot: 2, saveable: 5 },
  { month: 'Mar', sureshot: 3, saveable: 6 },
  { month: 'Apr', sureshot: 2, saveable: 5 },
];

// Upsell pipeline value, climbing as the A&T book grew.
const upsellTrend = [
  { month: 'Nov', potential: 700000 },
  { month: 'Dec', potential: 780000 },
  { month: 'Jan', potential: 860000 },
  { month: 'Feb', potential: 920000 },
  { month: 'Mar', potential: 980000 },
  { month: 'Apr', potential: 1080000 },
];

// ROW-LEVEL DATA — single source of truth for every client-level drawer table.
// 52 entries (37 Compliance + 15 Advisory) sized to match the A&T book the
// Super Admin owns. Each entry carries:
//   - identity:    client, type, hod, since, billing
//   - performance: status (On Track / Behind), revenue, cost, margin
type ClientRow = {
  client: string;
  type: ClientType;
  status: ComplianceStatus;   // A&T equivalent of PM's KSM Hit/Miss
  hod: string;
  billing: number;            // monthly retainer fee (₹)
  since: string;              // engagement start
  revenue: number;            // monthly gross revenue (₹) — for A&T this is
                              //   close to billing since there's no ad-spend
                              //   pass-through, plus occasional advisory fees
  cost: number;               // monthly cost-of-service (₹)
  margin: number;             // % margin on this client
};

const activeClientList: ClientRow[] = [
  // ─── E-Commerce · On Track (22) ─────────────────────────────────────────
  // (Sectioning is now by business type + status, sized for a 104-client A&T book.)
  { client: '99 Pancakes',          type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  45000, since: 'Mar 2024', revenue:  45000, cost:  24000, margin: 46.7 },
  { client: 'Anaya Collections',    type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  38000, since: 'Aug 2024', revenue:  38000, cost:  20500, margin: 46.1 },
  { client: 'Fundmart India',       type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  62000, since: 'Jan 2024', revenue:  62000, cost:  32000, margin: 48.4 },
  { client: 'FRR',                  type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Apr 2023', revenue:  72000, cost:  37500, margin: 47.9 },
  { client: 'Jupiter Consulting',   type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  55000, since: 'Jul 2024', revenue:  55000, cost:  28500, margin: 48.2 },
  { client: 'Horizon Technologies', type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  85000, since: 'Feb 2024', revenue:  85000, cost:  44000, margin: 48.2 },
  { client: 'Bilawala & Co (Ayaz)', type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  48000, since: 'May 2024', revenue:  48000, cost:  25500, margin: 46.9 },
  { client: 'TechCorp India',       type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  92000, since: 'Sep 2023', revenue:  92000, cost:  47000, margin: 48.9 },
  { client: 'Greenfield Exports',   type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  65000, since: 'Jun 2023', revenue:  65000, cost:  33500, margin: 48.5 },
  { client: 'Coastal Realty',       type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  52000, since: 'Feb 2024', revenue:  52000, cost:  27000, margin: 48.1 },
  { client: 'PureWell Organics',    type: 'E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  48000, since: 'Aug 2024', revenue:  48000, cost:  25500, margin: 46.9 },
  { client: 'Dhanraj & Sons',       type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  58000, since: 'May 2024', revenue:  58000, cost:  30000, margin: 48.3 },
  { client: 'Patel Constructions',  type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing: 148000, since: 'Mar 2023', revenue: 148000, cost:  74000, margin: 50.0 },
  { client: 'Saraswati Books',      type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  42000, since: 'Oct 2024', revenue:  42000, cost:  22500, margin: 46.4 },
  { client: 'BlueWave Logistics',   type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  78000, since: 'Jul 2023', revenue:  78000, cost:  40000, margin: 48.7 },
  { client: 'Aryan Pharmaceuticals',type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  95000, since: 'Apr 2024', revenue:  95000, cost:  48000, margin: 49.5 },
  { client: 'Kavita Garments',      type: 'E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  35000, since: 'Nov 2024', revenue:  35000, cost:  19000, margin: 45.7 },
  { client: 'Mahalaxmi Traders',    type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  68000, since: 'Jan 2024', revenue:  68000, cost:  35000, margin: 48.5 },
  { client: 'Sahyadri Electronics', type: 'E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  82000, since: 'Sep 2024', revenue:  82000, cost:  42000, margin: 48.8 },
  { client: 'Vasudha Foods',        type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  45000, since: 'Jun 2024', revenue:  45000, cost:  24000, margin: 46.7 },
  { client: 'Indus Textiles',       type: 'E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  58000, since: 'Mar 2024', revenue:  58000, cost:  30000, margin: 48.3 },
  { client: 'Mehta Jewellers',      type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Aug 2023', revenue:  72000, cost:  37000, margin: 48.6 },
  { client: 'Pankaj & Associates',  type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  38000, since: 'Dec 2024', revenue:  38000, cost:  20500, margin: 46.1 },
  { client: 'Rama Hospitality',     type: 'E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  88000, since: 'Feb 2024', revenue:  88000, cost:  45000, margin: 48.9 },
  { client: 'Shubham Realtors',     type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  62000, since: 'Jul 2024', revenue:  62000, cost:  32000, margin: 48.4 },
  { client: 'Trident Auto Parts',   type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  75000, since: 'May 2024', revenue:  75000, cost:  39000, margin: 48.0 },
  { client: 'Veena Boutique',       type: 'E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  32000, since: 'Jan 2025', revenue:  32000, cost:  17500, margin: 45.3 },
  { client: 'Yash Industries',      type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  92000, since: 'Apr 2024', revenue:  92000, cost:  47000, margin: 48.9 },
  { client: 'Zenith Realty',        type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  68000, since: 'Sep 2024', revenue:  68000, cost:  35000, margin: 48.5 },
  // ─── Compliance · Behind (8) ────────────────────────────────────────────
  { client: 'Bilawala & Co (Heena)',type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  35000, since: 'Mar 2024', revenue:  35000, cost:  22000, margin: 37.1 },
  { client: 'CEO Rules',            type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  42000, since: 'Aug 2024', revenue:  42000, cost:  26000, margin: 38.1 },
  { client: 'FRR (BLOGS)',          type: 'E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  32000, since: 'Jul 2024', revenue:  32000, cost:  21000, margin: 34.4 },
  { client: 'Green Valley Ent.',    type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  45000, since: 'Feb 2024', revenue:  45000, cost:  28500, margin: 36.7 },
  { client: 'FRR (JAY + ADI)',      type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  58000, since: 'Sep 2024', revenue:  58000, cost:  36000, margin: 37.9 },
  { client: 'Sahara Constructions', type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  48000, since: 'May 2024', revenue:  48000, cost:  30000, margin: 37.5 },
  { client: 'Mira Pharmaceuticals', type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  55000, since: 'Jun 2024', revenue:  55000, cost:  34500, margin: 37.3 },
  { client: 'Konark Foods',         type: 'E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  38000, since: 'Oct 2024', revenue:  38000, cost:  24000, margin: 36.8 },
  // ─── Advisory · On Track (11) ───────────────────────────────────────────
  { client: 'Atlas Capital',        type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 185000, since: 'Mar 2024', revenue: 285000, cost: 165000, margin: 42.1 },
  { client: 'Meridian Holdings',    type: 'Non E-Commerce',   status: 'On Track', hod: 'Irshad Q.', billing: 220000, since: 'Jan 2024', revenue: 340000, cost: 195000, margin: 42.6 },
  { client: 'Crestone Ventures',    type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 165000, since: 'Aug 2024', revenue: 240000, cost: 140000, margin: 41.7 },
  { client: 'Anand Bullion',        type: 'Non E-Commerce',   status: 'On Track', hod: 'Irshad Q.', billing: 145000, since: 'May 2024', revenue: 215000, cost: 125000, margin: 41.9 },
  { client: 'Saurabh & Sons',       type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 135000, since: 'Feb 2024', revenue: 195000, cost: 115000, margin: 41.0 },
  { client: 'Westwood Holdings',    type: 'Non E-Commerce',   status: 'On Track', hod: 'Irshad Q.', billing: 195000, since: 'Jul 2024', revenue: 295000, cost: 170000, margin: 42.4 },
  { client: 'Nidhi Investments',    type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 110000, since: 'Sep 2024', revenue: 165000, cost:  98000, margin: 40.6 },
  { client: 'Shree Ram Capital',    type: 'Non E-Commerce',   status: 'On Track', hod: 'Irshad Q.', billing: 175000, since: 'Apr 2024', revenue: 265000, cost: 152000, margin: 42.6 },
  { client: 'Vijay Family Office',  type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 240000, since: 'Nov 2023', revenue: 365000, cost: 205000, margin: 43.8 },
  { client: 'Karan Ventures',       type: 'Non E-Commerce',   status: 'On Track', hod: 'Irshad Q.', billing: 155000, since: 'Jun 2024', revenue: 235000, cost: 138000, margin: 41.3 },
  { client: 'Ankit Industries',     type: 'Non E-Commerce',   status: 'On Track', hod: 'Zubear S.', billing: 125000, since: 'Oct 2024', revenue: 185000, cost: 110000, margin: 40.5 },
  // ─── Advisory · Behind (4) ──────────────────────────────────────────────
  { client: 'Patel Industries',     type: 'Non E-Commerce',   status: 'Behind',   hod: 'Zubear S.', billing: 145000, since: 'Mar 2024', revenue: 195000, cost: 130000, margin: 33.3 },
  { client: 'Sanghvi Holdings',     type: 'Non E-Commerce',   status: 'Behind',   hod: 'Irshad Q.', billing: 175000, since: 'Aug 2024', revenue: 235000, cost: 160000, margin: 31.9 },
  { client: 'Rajan Group',          type: 'Non E-Commerce',   status: 'Behind',   hod: 'Zubear S.', billing: 130000, since: 'May 2024', revenue: 175000, cost: 122000, margin: 30.3 },
  { client: 'Mehul Family Trust',   type: 'Non E-Commerce',   status: 'Behind',   hod: 'Irshad Q.', billing: 165000, since: 'Jul 2024', revenue: 220000, cost: 152000, margin: 30.9 },

  // ─── BOOK EXPANSION (52 → 104 clients, scaling for the growing A&T book) ───────
  // The original 52-entry roster was sized when the book was smaller. The
  // additional 52 entries below reflect the current 100+ client reality and
  // preserve the realistic ~25/75 E-Com/Non E-Com split alongside the 77%
  // on-track rate. Headlines remain derived; trends Apr-month figures are
  // updated to match.

  // ─── E-Commerce · On Track (+11) ────────────────────────────────────────
  { client: 'Saraswati Bakery',     type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  42000, since: 'May 2024', revenue:  42000, cost:  22000, margin: 47.6 },
  { client: 'Glow Cosmetics',       type: 'E-Commerce',     status: 'On Track', hod: 'Irshad Q.', billing:  55000, since: 'Aug 2024', revenue:  55000, cost:  29000, margin: 47.3 },
  { client: 'Aroma Cafe Co',        type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  65000, since: 'Mar 2024', revenue:  65000, cost:  34000, margin: 47.7 },
  { client: 'Naya Threads',         type: 'E-Commerce',     status: 'On Track', hod: 'Irshad Q.', billing:  38000, since: 'Sep 2024', revenue:  38000, cost:  21000, margin: 44.7 },
  { client: 'Brewberry Coffee',     type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Jun 2024', revenue:  72000, cost:  37000, margin: 48.6 },
  { client: 'Bombay Crockery',      type: 'E-Commerce',     status: 'On Track', hod: 'Irshad Q.', billing:  35000, since: 'Oct 2024', revenue:  35000, cost:  19000, margin: 45.7 },
  { client: 'Sundari Sarees',       type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  48000, since: 'Jul 2024', revenue:  48000, cost:  25000, margin: 47.9 },
  { client: 'SnackBox India',       type: 'E-Commerce',     status: 'On Track', hod: 'Irshad Q.', billing:  52000, since: 'Apr 2024', revenue:  52000, cost:  27000, margin: 48.1 },
  { client: 'Goli Soda',            type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  58000, since: 'Feb 2024', revenue:  58000, cost:  30000, margin: 48.3 },
  { client: 'Pinkberry Yogurt',     type: 'E-Commerce',     status: 'On Track', hod: 'Irshad Q.', billing:  78000, since: 'Jan 2024', revenue:  78000, cost:  40000, margin: 48.7 },
  { client: 'Tandoor Tales',        type: 'E-Commerce',     status: 'On Track', hod: 'Zubear S.', billing:  95000, since: 'Aug 2023', revenue:  95000, cost:  48000, margin: 49.5 },
  // ─── E-Commerce · Behind (+2) ───────────────────────────────────────────
  { client: 'EcoBliss Wellness',    type: 'E-Commerce',     status: 'Behind',   hod: 'Irshad Q.', billing:  42000, since: 'Sep 2024', revenue:  42000, cost:  27000, margin: 35.7 },
  { client: 'KrispyBite Snacks',    type: 'E-Commerce',     status: 'Behind',   hod: 'Zubear S.', billing:  38000, since: 'Oct 2024', revenue:  38000, cost:  25000, margin: 34.2 },

  // ─── Non E-Commerce · On Track (+31) — Compliance retainers (25) ─────────
  { client: 'Madhuri Steels',       type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  65000, since: 'Mar 2024', revenue:  65000, cost:  34000, margin: 47.7 },
  { client: 'Vikram Engineering',   type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  92000, since: 'Jul 2023', revenue:  92000, cost:  47000, margin: 48.9 },
  { client: 'Pioneer Logistics',    type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  75000, since: 'Aug 2024', revenue:  75000, cost:  39000, margin: 48.0 },
  { client: 'Sapphire Realty',      type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  58000, since: 'Feb 2024', revenue:  58000, cost:  30000, margin: 48.3 },
  { client: 'Akash Constructions',  type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  88000, since: 'Apr 2024', revenue:  88000, cost:  45000, margin: 48.9 },
  { client: 'Modi Pharma',          type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  82000, since: 'Sep 2024', revenue:  82000, cost:  42000, margin: 48.8 },
  { client: 'Ranjana Exports',      type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Jun 2024', revenue:  72000, cost:  37000, margin: 48.6 },
  { client: 'Gokul Cement',         type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  95000, since: 'Jan 2024', revenue:  95000, cost:  48000, margin: 49.5 },
  { client: 'Shankar Plywoods',     type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  65000, since: 'May 2024', revenue:  65000, cost:  34000, margin: 47.7 },
  { client: 'Sapna Trading Co',     type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  55000, since: 'Jul 2024', revenue:  55000, cost:  29000, margin: 47.3 },
  { client: 'Bhushan Industries',   type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  88000, since: 'Mar 2024', revenue:  88000, cost:  45000, margin: 48.9 },
  { client: 'Aakash Realtors',      type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  62000, since: 'Aug 2024', revenue:  62000, cost:  32000, margin: 48.4 },
  { client: 'Sunrise Mfg Ltd',      type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  78000, since: 'Feb 2024', revenue:  78000, cost:  40000, margin: 48.7 },
  { client: 'Westside Logistics',   type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  68000, since: 'Sep 2024', revenue:  68000, cost:  35000, margin: 48.5 },
  { client: 'Krishna Auto',         type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  95000, since: 'Apr 2024', revenue:  95000, cost:  48000, margin: 49.5 },
  { client: 'Heritage Builders',    type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  58000, since: 'Jun 2024', revenue:  58000, cost:  30000, margin: 48.3 },
  { client: 'Hindustan Wires',      type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Jan 2024', revenue:  72000, cost:  37000, margin: 48.6 },
  { client: 'Tirth Engineering',    type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  65000, since: 'Oct 2024', revenue:  65000, cost:  34000, margin: 47.7 },
  { client: 'Maharashtra Steel',    type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  85000, since: 'May 2024', revenue:  85000, cost:  44000, margin: 48.2 },
  { client: 'Pearl Insurance Brk',  type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  52000, since: 'Nov 2024', revenue:  52000, cost:  27000, margin: 48.1 },
  { client: 'Anand Pharmacy Ltd',   type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  75000, since: 'Mar 2024', revenue:  75000, cost:  39000, margin: 48.0 },
  { client: 'Vasundhara Mills',     type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  88000, since: 'Aug 2024', revenue:  88000, cost:  45000, margin: 48.9 },
  { client: 'Rishi Electronics',    type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  92000, since: 'Feb 2024', revenue:  92000, cost:  47000, margin: 48.9 },
  { client: 'Konkan Marine',        type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing:  68000, since: 'Sep 2024', revenue:  68000, cost:  35000, margin: 48.5 },
  { client: 'Surya Spinning',       type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing:  72000, since: 'Jul 2024', revenue:  72000, cost:  37000, margin: 48.6 },
  // ─── Non E-Commerce · On Track (+31) — Advisory engagements (6) ─────────
  { client: 'Dwivedi Capital',      type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing: 175000, since: 'Apr 2024', revenue: 265000, cost: 152000, margin: 42.6 },
  { client: 'Nadkarni Holdings',    type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing: 195000, since: 'Jul 2024', revenue: 295000, cost: 170000, margin: 42.4 },
  { client: 'Mehra Capital',        type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing: 165000, since: 'Sep 2024', revenue: 250000, cost: 145000, margin: 42.0 },
  { client: 'Shanti Trust',         type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing: 145000, since: 'Jun 2024', revenue: 220000, cost: 128000, margin: 41.8 },
  { client: 'Bhaskar & Associates', type: 'Non E-Commerce', status: 'On Track', hod: 'Zubear S.', billing: 125000, since: 'Mar 2024', revenue: 185000, cost: 108000, margin: 41.6 },
  { client: 'Niraj Investments',    type: 'Non E-Commerce', status: 'On Track', hod: 'Irshad Q.', billing: 155000, since: 'Aug 2024', revenue: 235000, cost: 138000, margin: 41.3 },

  // ─── Non E-Commerce · Behind (+8) — Compliance (5) ──────────────────────
  { client: 'Patel Tools',          type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  55000, since: 'Apr 2024', revenue:  55000, cost:  35000, margin: 36.4 },
  { client: 'Sushant Pharma',       type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  62000, since: 'Aug 2024', revenue:  62000, cost:  39000, margin: 37.1 },
  { client: 'Jindal Steel Trading', type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  48000, since: 'Jun 2024', revenue:  48000, cost:  31000, margin: 35.4 },
  { client: 'Gurukul Coaching',     type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing:  42000, since: 'Sep 2024', revenue:  42000, cost:  27000, margin: 35.7 },
  { client: 'Shahi Fabrics',        type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing:  52000, since: 'Oct 2024', revenue:  52000, cost:  33000, margin: 36.5 },
  // ─── Non E-Commerce · Behind (+8) — Advisory (3) ────────────────────────
  { client: 'Vinod Tractor Co',     type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing: 145000, since: 'Mar 2024', revenue: 195000, cost: 130000, margin: 33.3 },
  { client: 'Sai Construction Co',  type: 'Non E-Commerce', status: 'Behind',   hod: 'Zubear S.', billing: 165000, since: 'Aug 2024', revenue: 220000, cost: 152000, margin: 30.9 },
  { client: 'Pune Pharmaceuticals', type: 'Non E-Commerce', status: 'Behind',   hod: 'Irshad Q.', billing: 175000, since: 'Jun 2024', revenue: 235000, cost: 162000, margin: 31.1 },
];

// ─── Headlines derived from row-level lists ─────────────────────────────────
// Every headline below is computed once from its source list so the card
// and the drawer table can never disagree as the data scales.

const activeClients = (() => {
  const total = activeClientList.length;
  const ecom = activeClientList.filter(c => c.type === 'E-Commerce').length;
  const non = activeClientList.filter(c => c.type === 'Non E-Commerce').length;
  return { total, ecom, non, change: 2, prevTotal: total - 2 };
})();

const revenue = (() => {
  const total = activeClientList.reduce((s, c) => s + c.revenue, 0);
  const ecom = activeClientList.filter(c => c.type === 'E-Commerce').reduce((s, c) => s + c.revenue, 0);
  const non = activeClientList.filter(c => c.type === 'Non E-Commerce').reduce((s, c) => s + c.revenue, 0);
  // prevTotal seeded from the Mar entry of revenueTrend so MoM-change pill
  // matches the chart shown in the drawer (1300K + 9150K = 10,450K).
  const prevTotal = 1300000 + 9150000;
  const change = +(((total - prevTotal) / prevTotal) * 100).toFixed(1);
  return { total, ecom, non, prevTotal, change };
})();

const margin = (() => {
  const totalRev = activeClientList.reduce((s, c) => s + c.revenue, 0);
  const totalCost = activeClientList.reduce((s, c) => s + c.cost, 0);
  const ecomRev = activeClientList.filter(c => c.type === 'E-Commerce').reduce((s, c) => s + c.revenue, 0);
  const ecomCost = activeClientList.filter(c => c.type === 'E-Commerce').reduce((s, c) => s + c.cost, 0);
  const nonRev = activeClientList.filter(c => c.type === 'Non E-Commerce').reduce((s, c) => s + c.revenue, 0);
  const nonCost = activeClientList.filter(c => c.type === 'Non E-Commerce').reduce((s, c) => s + c.cost, 0);
  const rate = +(((totalRev - totalCost) / totalRev) * 100).toFixed(1);
  const ecomRate = +(((ecomRev - ecomCost) / ecomRev) * 100).toFixed(1);
  const nonRate = +(((nonRev - nonCost) / nonRev) * 100).toFixed(1);
  // prevRate matches Mar entry of marginTrend so the MoM-change pill on
  // the card and the chart in the drawer agree.
  return { rate, ecomRate, nonRate, prevRate: 42.5, target: 40.0 };
})();

// Compliance Status — A&T equivalent of PM's KSM Hit/Miss.
const complianceData = (() => {
  const total = activeClientList.length;
  const onTrack = activeClientList.filter(c => c.status === 'On Track').length;
  const behind = activeClientList.filter(c => c.status === 'Behind').length;
  const onTrackRate = total > 0 ? Math.round((onTrack / total) * 100) : 0;
  const ecomTotal = activeClientList.filter(c => c.type === 'E-Commerce').length;
  const ecomOnTrack = activeClientList.filter(c => c.type === 'E-Commerce' && c.status === 'On Track').length;
  const ecomBehind = ecomTotal - ecomOnTrack;
  const nonTotal = activeClientList.filter(c => c.type === 'Non E-Commerce').length;
  const nonOnTrack = activeClientList.filter(c => c.type === 'Non E-Commerce' && c.status === 'On Track').length;
  const nonBehind = nonTotal - nonOnTrack;
  const target = 85;
  return { total, onTrack, behind, onTrackRate, ecomTotal, ecomOnTrack, ecomBehind, nonTotal, nonOnTrack, nonBehind, target };
})();

// Monthly Reports — A&T employees upload one delivery report per
// active client every month (books closed, GST filed, advisory note,
// whatever the engagement covers). This widget tracks how many of
// those reports have hit the Dashboard module so far this month.
//
// Mocked on top of activeClientList so the numbers move with the
// rest of the page if the dataset is ever swapped. ~88% submitted is
// realistic for mid-month: most clients done early, a tail still
// closing books, a handful past the month-end deadline.
const reportsData = (() => {
  const total = activeClientList.length;
  // Service-aware submission rates — Compliance (E-Com) clients are
  // typically more deadline-driven; Advisory (Non E-Com) reports run
  // a bit looser.
  const ecomTotal = activeClientList.filter(c => c.type === 'E-Commerce').length;
  const nonTotal  = activeClientList.filter(c => c.type === 'Non E-Commerce').length;
  const ecomSubmitted = Math.round(ecomTotal * 0.91);
  const nonSubmitted  = Math.round(nonTotal  * 0.85);
  const submitted = ecomSubmitted + nonSubmitted;
  // ~5% of the remainder is past month-end — those are the rose
  // numbers the team has to chase. The rest are still in window.
  const remaining = total - submitted;
  const overdue = Math.max(0, Math.min(remaining, Math.round(total * 0.05)));
  const pending = Math.max(0, remaining - overdue);
  const submittedRate = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const target = 95;
  return { total, submitted, pending, overdue, submittedRate, ecomTotal, ecomSubmitted, nonTotal, nonSubmitted, target };
})();

// 6-month compliance on-track-rate trend, sized for the 104-client book.
// Last datapoint matches the derived `complianceData` headline.
const complianceTrend = [
  { month: 'Nov', rate: 76, onTrack: 75, behind: 23 },
  { month: 'Dec', rate: 77, onTrack: 77, behind: 23 },
  { month: 'Jan', rate: 76, onTrack: 77, behind: 24 },
  { month: 'Feb', rate: 77, onTrack: 79, behind: 24 },
  { month: 'Mar', rate: 75, onTrack: 77, behind: 25 },
  { month: 'Apr', rate: complianceData.onTrackRate, onTrack: complianceData.onTrack, behind: complianceData.behind },
];

// Ratings list — sized for 52-client A&T book (~35% response rate = 18).
// A&T tends to have higher satisfaction than SEM (less performance volatility).
const ratingsList: { client: string; type: ClientType; rating: number; feedback: string; date: string }[] = [
  // 5★
  { client: 'Atlas Capital',        type: 'Non E-Commerce',   rating: 5, feedback: 'Best advisory team we\'ve worked with — strategic and responsive.',          date: '02 Apr 2026' },
  { client: 'Meridian Holdings',    type: 'Non E-Commerce',   rating: 5, feedback: 'Excellent tax structuring saved us significant outflow this year.',         date: '01 Apr 2026' },
  { client: 'Vijay Family Office',  type: 'Non E-Commerce',   rating: 5, feedback: 'Comprehensive family-office support, very thorough.',                       date: '03 Apr 2026' },
  { client: 'Patel Constructions',  type: 'Non E-Commerce', rating: 5, feedback: 'GST and TDS filings always on time. No surprises.',                          date: '28 Mar 2026' },
  { client: 'TechCorp India',       type: 'Non E-Commerce', rating: 5, feedback: 'Reliable and proactive — flag risks before they become issues.',            date: '29 Mar 2026' },
  { client: 'Aryan Pharmaceuticals',type: 'Non E-Commerce', rating: 5, feedback: 'Audit cycle handled flawlessly, partner was hands-on throughout.',          date: '04 Apr 2026' },
  // 4★
  { client: 'Crestone Ventures',    type: 'Non E-Commerce',   rating: 4, feedback: 'Strong work overall, want sharper recommendations on M&A structuring.',     date: '02 Apr 2026' },
  { client: 'Westwood Holdings',    type: 'Non E-Commerce',   rating: 4, feedback: 'Solid advisory partnership; quarterly cadence works well.',                  date: '01 Apr 2026' },
  { client: 'FRR',                  type: 'Non E-Commerce', rating: 4, feedback: 'Filings always punctual, would like more proactive tax planning calls.',     date: '31 Mar 2026' },
  { client: 'Greenfield Exports',   type: 'Non E-Commerce', rating: 4, feedback: 'Good service, communication on GST circular updates could be faster.',      date: '24 Mar 2026' },
  { client: 'Horizon Technologies', type: 'Non E-Commerce', rating: 4, feedback: 'Reliable team, deliverables on time.',                                       date: '26 Mar 2026' },
  { client: 'BlueWave Logistics',   type: 'Non E-Commerce', rating: 4, feedback: 'Smooth quarterly compliance; advisory upsell could be valuable.',           date: '27 Mar 2026' },
  { client: 'Mehta Jewellers',      type: 'E-Commerce', rating: 4, feedback: 'Long partnership, very dependable through complex inventory cycles.',       date: '30 Mar 2026' },
  { client: 'Karan Ventures',       type: 'Non E-Commerce',   rating: 4, feedback: 'Strategic input on series A planning was very useful.',                     date: '02 Apr 2026' },
  // 3★
  { client: 'Bilawala & Co (Heena)',type: 'Non E-Commerce', rating: 3, feedback: 'GST filings often last-minute — need more lead time.',                       date: '20 Mar 2026' },
  { client: 'Sanghvi Holdings',     type: 'Non E-Commerce',   rating: 3, feedback: 'Onboarding was slow; relationship has improved but lost trust early.',      date: '25 Mar 2026' },
  { client: 'Rajan Group',          type: 'Non E-Commerce',   rating: 3, feedback: 'Quality of advisory output inconsistent across team members.',              date: '31 Mar 2026' },
  // 2★
  { client: 'Green Valley Ent.',    type: 'Non E-Commerce', rating: 2, feedback: 'Missed compliance deadline two months running. Unacceptable.',              date: '18 Mar 2026' },
];

// Incidents list — 8 open incidents for the 52-client A&T book.
const incidentsList: { id: string; client: string; type: ClientType; severity: 'Critical' | 'High' | 'Medium'; category: string; daysOpen: number; description: string }[] = [
  // Critical (2)
  { id: 'ATI-001', client: 'Green Valley Ent.',     type: 'Non E-Commerce', severity: 'Critical', category: 'Filing Delay',     daysOpen: 12, description: 'GSTR-3B for Mar overdue by 12 days; client received Notice. Penalty risk.' },
  { id: 'ATI-002', client: 'Bilawala & Co (Heena)', type: 'Non E-Commerce', severity: 'Critical', category: 'Income Tax',        daysOpen: 18, description: 'ITR for AY 2025-26 not filed; advance tax dues pending.' },
  // High (3)
  { id: 'ATI-003', client: 'CEO Rules',             type: 'Non E-Commerce', severity: 'High',     category: 'Compliance Lapse',  daysOpen:  9, description: 'TDS Q4 return delayed; client escalation received from CEO.' },
  { id: 'ATI-004', client: 'FRR (BLOGS)',           type: 'E-Commerce', severity: 'High',     category: 'TDS Reconciliation', daysOpen:  7, description: 'TDS reconciliation mismatch ₹4.2L — needs resolution before next filing.' },
  { id: 'ATI-005', client: 'Sanghvi Holdings',      type: 'Non E-Commerce',   severity: 'High',     category: 'Document Delay',    daysOpen:  6, description: 'Quarterly advisory report delayed; partner travelling.' },
  // Medium (3)
  { id: 'ATI-006', client: 'FRR (JAY + ADI)',       type: 'Non E-Commerce', severity: 'Medium',   category: 'Bookkeeping Lag',   daysOpen:  5, description: 'Monthly bookkeeping behind by 3 weeks; team capacity issue.' },
  { id: 'ATI-007', client: 'Sahara Constructions',  type: 'Non E-Commerce', severity: 'Medium',   category: 'GST Reconciliation', daysOpen:  4, description: 'GSTR-2A reconciliation pending for Feb–Mar; ₹1.8L mismatch.' },
  { id: 'ATI-008', client: 'Mehul Family Trust',    type: 'Non E-Commerce',   severity: 'Medium',   category: 'Communication',     daysOpen:  3, description: 'Weekly check-in calls missed; client requested escalation path.' },
];

// Onboarding pipeline — 11 entries, 7 in-progress + 4 live this month.
//
// Stage progress is structured exactly like the A&T onboarding
// checklist used in the OnboardingModule drawer — three sections in
// strict order: Kickoff (2 items) → Data Sharing (14 items) → Log IDs
// (13 items). 29 items total. A client is "Live" when all three
// sections are complete; until then they sit in the first section
// that still has unchecked items, which is what the Stage column
// surfaces below as section + per-section progress bar.
const ONB_KICKOFF_TOTAL = 2;
const ONB_DATA_TOTAL = 14;
const ONB_LOGS_TOTAL = 13;
const ONB_TOTAL_ITEMS = ONB_KICKOFF_TOTAL + ONB_DATA_TOTAL + ONB_LOGS_TOTAL;

interface OnboardingClient {
  client: string;
  type: ClientType;
  days: number;
  assignee: string;
  /** 0..2 — Kickoff section items completed (kickoff done, MoMs shared). */
  kickoffDone: number;
  /** 0..14 — Data Sharing items: financials, Tally, statements, etc. */
  dataDone: number;
  /** 0..13 — Log IDs items: GST/TDS/ITR/PT/POS/payroll credentials. */
  logsDone: number;
}

const onboardingList: OnboardingClient[] = [
  // ── In-progress (7) — ordered by days stuck so the long-tail
  //    clients sit at the top of the table where the HOD scans first.
  //    Progress is realistic: the longer they've been stuck, the
  //    earlier in the checklist they are.
  { client: 'Alpine Group',        type: 'Non E-Commerce', days: 14, assignee: 'Unassigned', kickoffDone: 0, dataDone:  0, logsDone:  0 },
  { client: 'Infinity Solutions',  type: 'Non E-Commerce', days: 11, assignee: 'Unassigned', kickoffDone: 1, dataDone:  0, logsDone:  0 },
  { client: 'Coast and Bloom',     type: 'E-Commerce',     days:  9, assignee: 'Sneha P.',   kickoffDone: 2, dataDone:  4, logsDone:  0 },
  { client: 'Sterling Estates',    type: 'Non E-Commerce', days:  6, assignee: 'Rohan D.',   kickoffDone: 2, dataDone:  8, logsDone:  0 },
  { client: 'Marathon Industries', type: 'Non E-Commerce', days:  4, assignee: 'Vikram S.',  kickoffDone: 2, dataDone: 12, logsDone:  0 },
  { client: 'Pioneer Realty',      type: 'Non E-Commerce', days:  3, assignee: 'Sneha P.',   kickoffDone: 2, dataDone: 14, logsDone:  4 },
  { client: 'Aryavart Capital',    type: 'Non E-Commerce', days:  2, assignee: 'Rohan D.',   kickoffDone: 2, dataDone: 14, logsDone:  9 },
  // ── Live (4) — every checklist item ticked, client is operational.
  { client: 'Yash Industries',     type: 'Non E-Commerce', days:  8, assignee: 'Zubear S.',  kickoffDone: 2, dataDone: 14, logsDone: 13 },
  { client: 'Veena Boutique',      type: 'E-Commerce',     days:  7, assignee: 'Irshad Q.',  kickoffDone: 2, dataDone: 14, logsDone: 13 },
  { client: 'Pankaj & Associates', type: 'Non E-Commerce', days:  9, assignee: 'Zubear S.',  kickoffDone: 2, dataDone: 14, logsDone: 13 },
  { client: 'Ankit Industries',    type: 'Non E-Commerce', days: 12, assignee: 'Rohan D.',   kickoffDone: 2, dataDone: 14, logsDone: 13 },
];

/** A client is Live (status=Done) only when every checklist item across
 *  all three sections has been ticked. Anything less is in-progress. */
const isOnbLive = (o: OnboardingClient): boolean =>
  o.kickoffDone >= ONB_KICKOFF_TOTAL &&
  o.dataDone   >= ONB_DATA_TOTAL &&
  o.logsDone   >= ONB_LOGS_TOTAL;

/** The current active stage = the first section in canonical order that
 *  still has unchecked items. Returns null once everything is done. */
function onbCurrentStage(o: OnboardingClient): { name: 'Kickoff' | 'Data Sharing' | 'Log IDs'; done: number; total: number } | null {
  if (o.kickoffDone < ONB_KICKOFF_TOTAL) return { name: 'Kickoff',      done: o.kickoffDone, total: ONB_KICKOFF_TOTAL };
  if (o.dataDone   < ONB_DATA_TOTAL)     return { name: 'Data Sharing', done: o.dataDone,    total: ONB_DATA_TOTAL    };
  if (o.logsDone   < ONB_LOGS_TOTAL)     return { name: 'Log IDs',      done: o.logsDone,    total: ONB_LOGS_TOTAL    };
  return null;
}

/** Overall % across all 29 items — used for the row's overall ribbon
 *  and for sorting / "stuck" detection if needed downstream. */
const onbOverallPct = (o: OnboardingClient): number =>
  Math.round(((o.kickoffDone + o.dataDone + o.logsDone) / ONB_TOTAL_ITEMS) * 100);

const onboarding = (() => {
  const total = onboardingList.length;
  const pending = onboardingList.filter(o => !isOnbLive(o)).length;
  const done = onboardingList.filter(o => isOnbLive(o)).length;
  const stuck = onboardingList.filter(o => !isOnbLive(o) && o.days > 7).length;
  const ecom = onboardingList.filter(o => o.type === 'E-Commerce').length;
  const non = onboardingList.filter(o => o.type === 'Non E-Commerce').length;
  const avgDays = Math.round(onboardingList.reduce((s, o) => s + o.days, 0) / total);
  return { total, pending, done, stuck, avgDays, ecom, non };
})();

const incidents = (() => {
  const total = incidentsList.length;
  const critical = incidentsList.filter(i => i.severity === 'Critical').length;
  const high = incidentsList.filter(i => i.severity === 'High').length;
  const medium = incidentsList.filter(i => i.severity === 'Medium').length;
  const ecom = incidentsList.filter(i => i.type === 'E-Commerce').length;
  const non = incidentsList.filter(i => i.type === 'Non E-Commerce').length;
  return { total, prevTotal: total + 2, critical, high, medium, ecom, non };
})();

const ratings = (() => {
  const total = ratingsList.length;
  const avg = +(ratingsList.reduce((s, r) => s + r.rating, 0) / total).toFixed(1);
  const ecomList = ratingsList.filter(r => r.type === 'E-Commerce');
  const nonList = ratingsList.filter(r => r.type === 'Non E-Commerce');
  const ecomAvg = +(ecomList.reduce((s, r) => s + r.rating, 0) / ecomList.length).toFixed(1);
  const nonAvg = +(nonList.reduce((s, r) => s + r.rating, 0) / nonList.length).toFixed(1);
  const lowCount = ratingsList.filter(r => r.rating <= 2).length;
  return { avg, prevAvg: +(avg - 0.1).toFixed(1), ecomAvg, nonAvg, total, lowCount };
})();

// CLA list — 7 at-risk A&T clients (~13% of the 52-client book).
const claList: { client: string; type: ClientType; claStatus: 'sureshot' | 'can-be-saved'; reason: string; responsible: string; billing: number }[] = [
  // Sureshot (2)
  { client: 'Konark Foods',         type: 'E-Commerce', claStatus: 'sureshot',     reason: 'Client moving to in-house finance team next quarter.',         responsible: 'Irshad Q.', billing:  38000 },
  { client: 'Mira Pharmaceuticals', type: 'Non E-Commerce', claStatus: 'sureshot',     reason: 'Scope conflict with new audit partner; will exit by Jun.',     responsible: 'Zubear S.', billing:  55000 },
  // Can be saved (5)
  { client: 'Green Valley Ent.',    type: 'Non E-Commerce', claStatus: 'can-be-saved', reason: 'Two missed deadlines; trust recovery plan in motion.',         responsible: 'Irshad Q.', billing:  45000 },
  { client: 'Bilawala & Co (Heena)',type: 'Non E-Commerce', claStatus: 'can-be-saved', reason: 'ITR delays; assigning senior partner to repair relationship.', responsible: 'Irshad Q.', billing:  35000 },
  { client: 'CEO Rules',            type: 'Non E-Commerce', claStatus: 'can-be-saved', reason: 'CEO escalation post TDS delay; weekly steering call set.',     responsible: 'Zubear S.', billing:  42000 },
  { client: 'Sanghvi Holdings',     type: 'Non E-Commerce',   claStatus: 'can-be-saved', reason: 'Onboarding friction; partner stepping in for Q2 review.',      responsible: 'Zubear S.', billing: 175000 },
  { client: 'Rajan Group',          type: 'Non E-Commerce',   claStatus: 'can-be-saved', reason: 'Inconsistent advisory quality; team re-org in progress.',      responsible: 'Irshad Q.', billing: 130000 },
];

const claData = (() => {
  const total = claList.length;
  const sureshot = claList.filter(c => c.claStatus === 'sureshot').length;
  const saveable = claList.filter(c => c.claStatus === 'can-be-saved').length;
  const revAtRisk = claList.reduce((s, c) => s + c.billing, 0);
  const ecom = claList.filter(c => c.type === 'E-Commerce').length;
  const non = claList.filter(c => c.type === 'Non E-Commerce').length;
  return { total, prevTotal: total + 2, sureshot, saveable, revAtRisk, ecom, non };
})();

// Upsell pipeline — 11 opportunities, biased toward Compliance → Advisory upgrades.
const upsellList: { client: string; type: ClientType; opportunity: string; potentialRevenue: number; confidence: 'high' | 'medium' | 'low' }[] = [
  { client: 'Aryan Pharmaceuticals', type: 'Non E-Commerce', opportunity: 'Add quarterly tax-advisory retainer on top of compliance.',         potentialRevenue: 145000, confidence: 'high'   },
  { client: 'Patel Constructions',   type: 'Non E-Commerce', opportunity: 'Upgrade to full statutory + advisory bundle for FY26.',             potentialRevenue: 185000, confidence: 'high'   },
  { client: 'Atlas Capital',         type: 'Non E-Commerce',   opportunity: 'Add transfer-pricing study for international subsidiaries.',         potentialRevenue: 165000, confidence: 'high'   },
  { client: 'TechCorp India',        type: 'Non E-Commerce', opportunity: 'Internal audit & process review engagement.',                        potentialRevenue: 125000, confidence: 'high'   },
  { client: 'Meridian Holdings',     type: 'Non E-Commerce',   opportunity: 'Family-office structuring & succession planning.',                   potentialRevenue: 220000, confidence: 'medium' },
  { client: 'Westwood Holdings',     type: 'Non E-Commerce',   opportunity: 'GST advisory & compliance cleanup project.',                         potentialRevenue:  95000, confidence: 'medium' },
  { client: 'Horizon Technologies',  type: 'Non E-Commerce', opportunity: 'Add ESOP advisory & share-cap restructuring.',                       potentialRevenue:  85000, confidence: 'medium' },
  { client: 'BlueWave Logistics',    type: 'Non E-Commerce', opportunity: 'GST audit & 26AS reconciliation engagement.',                        potentialRevenue:  75000, confidence: 'medium' },
  { client: 'Vijay Family Office',   type: 'Non E-Commerce',   opportunity: 'Estate planning & private trust structuring.',                       potentialRevenue: 180000, confidence: 'high'   },
  { client: 'Greenfield Exports',    type: 'Non E-Commerce', opportunity: 'Export incentive advisory (RoDTEP / DEPB).',                         potentialRevenue:  60000, confidence: 'medium' },
  { client: 'FRR',                   type: 'Non E-Commerce', opportunity: 'Add quarterly MIS & cash-flow advisory.',                            potentialRevenue:  55000, confidence: 'low'    },
];

const upsell = (() => {
  const total = upsellList.length;
  const sumPotential = upsellList.reduce((s, u) => s + u.potentialRevenue, 0);
  const highConf = upsellList.filter(u => u.confidence === 'high').length;
  const ecom = upsellList.filter(u => u.type === 'E-Commerce').length;
  const non = upsellList.filter(u => u.type === 'Non E-Commerce').length;
  return { total, sumPotential, highConf, ecom, non };
})();

// ─── Tasks (operational summary for the Tasks card) ──────────────────────────
type PmTask = {
  id: string;
  title: string;
  scope: 'Client' | 'Internal';
  context: string;
  priority: TaskPriority;
  assignee: string;
  dueDateISO: string;
  status: 'In Progress' | 'Pending' | 'Blocked';
};

const atTasksList: PmTask[] = [
  // Client-scope — overdue
  { id: 'ATT-101', title: 'Resolve TDS reconciliation mismatch ₹4.2L',  scope: 'Client',   context: 'FRR (BLOGS)',           priority: 'P1', assignee: 'Sneha P.',  dueDateISO: '2026-05-01', status: 'In Progress' },
  { id: 'ATT-102', title: 'File overdue GSTR-3B for April',             scope: 'Client',   context: 'Green Valley Ent.',     priority: 'P1', assignee: 'Vikram S.', dueDateISO: '2026-05-02', status: 'Blocked' },
  { id: 'ATT-103', title: 'File ITR AY 2025-26 + advance tax',          scope: 'Client',   context: 'Bilawala & Co (Heena)', priority: 'P1', assignee: 'Irshad Q.', dueDateISO: '2026-05-03', status: 'In Progress' },
  // Client-scope — due this week
  { id: 'ATT-104', title: 'TDS Q4 return submission',                   scope: 'Client',   context: 'CEO Rules',             priority: 'P1', assignee: 'Zubear S.', dueDateISO: '2026-05-08', status: 'In Progress' },
  { id: 'ATT-105', title: 'Quarterly advisory report delivery',          scope: 'Client',   context: 'Sanghvi Holdings',      priority: 'P2', assignee: 'Rohan D.',  dueDateISO: '2026-05-10', status: 'In Progress' },
  { id: 'ATT-106', title: 'Annual transfer-pricing study draft',         scope: 'Client',   context: 'Atlas Capital',         priority: 'P2', assignee: 'Rohan D.',  dueDateISO: '2026-05-09', status: 'In Progress' },
  { id: 'ATT-107', title: 'GSTR-2A reconciliation Mar–Apr',              scope: 'Client',   context: 'Sahara Constructions',  priority: 'P2', assignee: 'Sneha P.',  dueDateISO: '2026-05-11', status: 'Pending' },
  { id: 'ATT-108', title: 'Family-office structuring draft proposal',    scope: 'Client',   context: 'Vijay Family Office',   priority: 'P2', assignee: 'Zubear S.', dueDateISO: '2026-05-07', status: 'In Progress' },
  // Client-scope — later
  { id: 'ATT-109', title: 'Q1 MIS pack delivery',                       scope: 'Client',   context: 'Patel Constructions',   priority: 'P3', assignee: 'Vikram S.', dueDateISO: '2026-05-15', status: 'Pending' },
  { id: 'ATT-110', title: 'GST advisory audit kickoff',                 scope: 'Client',   context: 'Westwood Holdings',     priority: 'P3', assignee: 'Rohan D.',  dueDateISO: '2026-05-18', status: 'Pending' },
  { id: 'ATT-111', title: 'Internal audit fieldwork — week 1',          scope: 'Client',   context: 'TechCorp India',        priority: 'P2', assignee: 'Sneha P.',  dueDateISO: '2026-05-12', status: 'In Progress' },
  { id: 'ATT-112', title: 'Onboarding kickoff call',                    scope: 'Client',   context: 'Marathon Industries',   priority: 'P2', assignee: 'Vikram S.', dueDateISO: '2026-05-08', status: 'Pending' },
  { id: 'ATT-113', title: 'Engagement letter follow-up',                scope: 'Client',   context: 'Aryavart Capital',      priority: 'P3', assignee: 'Rohan D.',  dueDateISO: '2026-05-09', status: 'Pending' },
  // Internal-scope
  { id: 'ATT-201', title: 'Update GST circular tracker — May changes', scope: 'Internal', context: 'A&T Operations',       priority: 'P2', assignee: 'Nisha A.',  dueDateISO: '2026-05-08', status: 'In Progress' },
  { id: 'ATT-202', title: 'Hire 1 Sr. Tax Manager',                     scope: 'Internal', context: 'A&T Hiring',            priority: 'P1', assignee: 'Tejas A.',  dueDateISO: '2026-05-15', status: 'In Progress' },
  { id: 'ATT-203', title: 'Q2 OKR planning session',                    scope: 'Internal', context: 'A&T Leadership',        priority: 'P2', assignee: 'Zubear S.', dueDateISO: '2026-05-10', status: 'Pending' },
  { id: 'ATT-204', title: 'Internal compliance audit checklist refresh', scope: 'Internal', context: 'A&T Quality',          priority: 'P3', assignee: 'Nisha A.',  dueDateISO: '2026-05-25', status: 'Pending' },
  { id: 'ATT-205', title: 'Vendor contract renewal — Tally + ClearTax', scope: 'Internal', context: 'A&T Operations',        priority: 'P3', assignee: 'Deepak J.', dueDateISO: '2026-05-30', status: 'Pending' },
  { id: 'ATT-206', title: 'FY26 service-line restructure proposal',     scope: 'Internal', context: 'A&T Leadership',        priority: 'P1', assignee: 'Zubear S.', dueDateISO: '2026-05-04', status: 'In Progress' },
  { id: 'ATT-207', title: 'Roll out new client reporting template',     scope: 'Internal', context: 'A&T Operations',        priority: 'P2', assignee: 'Nisha A.',  dueDateISO: '2026-05-12', status: 'Pending' },
];

const tasks = (() => {
  const total = atTasksList.length;
  const overdue = atTasksList.filter(t => daysUntil(t.dueDateISO) < 0).length;
  const dueThisWeek = atTasksList.filter(t => { const d = daysUntil(t.dueDateISO); return d >= 0 && d <= 7; }).length;
  const p1 = atTasksList.filter(t => t.priority === 'P1').length;
  const client = atTasksList.filter(t => t.scope === 'Client').length;
  const internal = atTasksList.filter(t => t.scope === 'Internal').length;
  const blocked = atTasksList.filter(t => t.status === 'Blocked').length;
  return { total, overdue, dueThisWeek, p1, client, internal, blocked };
})();

// KPI META — drives drawer header and the "View full" route
const kpiMeta: Record<KpiId, { title: string; subtitle: string; routeLabel: string }> = {
  'active': {
    title: 'Active A&T Clients',
    subtitle: 'Clients with billable A&T engagement this month',
    routeLabel: 'View all A&T clients',
  },
  'revenue': {
    title: 'Monthly Revenue',
    subtitle: 'Billed A&T revenue this month, by business type',
    routeLabel: 'View revenue report',
  },
  'margin': {
    title: 'Net Margin',
    subtitle: 'A&T gross margin this month vs the 40% internal target',
    routeLabel: 'View margin report',
  },
  'ratings': {
    title: 'Customer Ratings',
    subtitle: 'Latest client feedback collected for the A&T team',
    routeLabel: 'View all A&T feedback',
  },
  'incidents': {
    title: 'Open Incidents',
    subtitle: 'Compliance lapses, filing delays, and escalations on A&T accounts',
    routeLabel: 'View all A&T incidents',
  },
  'onboarding': {
    title: 'Onboarding Pipeline',
    subtitle: 'New A&T clients in the kickoff & onboarding queue',
    routeLabel: 'View onboarding pipeline',
  },
  'cla': {
    title: 'At-Risk A&T Clients (CLA)',
    subtitle: 'Client-Level Alerts on A&T accounts — sureshot exits and saveable',
    routeLabel: 'View all A&T CLAs',
  },
  'upsell': {
    title: 'Upsell Pipeline',
    subtitle: 'Scope expansions and new service-line opportunities across the A&T book',
    routeLabel: 'View all upsell opportunities',
  },
  'compliance': {
    title: 'Compliance Status',
    subtitle: 'Per-client filing & deadline health across the A&T book',
    routeLabel: 'Open Recurring Checklist',
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function AccountsTaxationHome() {
  const router = useRouter();
  const AT_DELIVERABLES_HREF = SUPER_ADMIN_HOME_ROUTES.accountsTaxation.deliverables;

  const [dateRange, setDateRange] = useState<DateRange>('mtd');

  // Drawer state — single drawer instance, body switches on openKPI
  const [openKPI, setOpenKPI] = useState<KpiId | null>(null);
  const [drawerType, setDrawerType] = useState<TypeFilter>('All');
  const [drawerSeverity, setDrawerSeverity] = useState<'All' | 'Critical' | 'High' | 'Medium'>('All');
  const [drawerClaStatus, setDrawerClaStatus] = useState<'All' | 'sureshot' | 'can-be-saved'>('All');
  const [drawerCompliance, setDrawerCompliance] = useState<ComplianceFilter>('All');

  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (openKPI) {
      setDrawerType('All');
      setDrawerSeverity('All');
      setDrawerClaStatus('All');
      setDrawerCompliance('All');
    }
  }, [openKPI]);

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
    router.push(AT_DELIVERABLES_HREF);
  };

  return (
    <div>
      {/* Top filter bar — same chrome as Reports / Customers / Employees / PM */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-8 -mt-6 px-8 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Accounts &amp; Taxation</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">A&amp;T business overview · across all A&amp;T clients and team</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* A&T Activity — dedicated tracker for everything moving
                across the Recurring Checklist, King & Queen, Onboarding,
                and Workspace modules. Routes to the Activity sub-tab
                where the full feed has room to breathe. Pill carries
                today's event count so the HOD knows when there's
                traffic worth opening. */}
            <AtActivityButton />

            <div className="relative">
              <label htmlFor="at-date-range-filter" className="sr-only">Date range</label>
              <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="at-date-range-filter"
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

      {/* EXECUTION — sits at the top so the founder lands on
          "what's the team running on right now" before scrolling to
          headline stats. Three cards now: A&T Tasks (open work),
          Compliance Status (on-track rate), and Monthly Reports
          (delivery uploads). Together they answer "is the team on
          top of work, on top of deadlines, and shipping artefacts?"
          in one row. */}
      <SectionLabel title="Execution" hint="Workload, compliance, and report delivery health" />
      <div className="grid grid-cols-3 gap-5 mb-8">

        <TasksCard
          tasks={tasks}
          onClick={() => router.push(WORKSPACE_ROUTES.myTasks)}
        />

        <KpiCard
          Icon={Target}
          title="Compliance Status"
          value={
            <span className={complianceData.onTrackRate >= complianceData.target ? 'text-emerald-600' : 'text-rose-600'}>
              {complianceData.onTrackRate}%
            </span>
          }
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{complianceData.behind} behind</span>
              <span className="font-normal opacity-70 ml-0.5">· {complianceData.target}% target</span>
            </span>
          }
          onClick={goToDeliverables}
          ariaLabel={`Compliance Status ${complianceData.onTrackRate} percent on track, target ${complianceData.target} percent. ${complianceData.onTrack} of ${complianceData.total} clients on track, ${complianceData.behind} behind. Activate to open the Recurring Checklist.`}
        />

        {/* Monthly Reports — uploads to the Dashboard module.
            Crisp readout: "X of Y submitted" with the count of
            still-pending and overdue clients as the alert delta.
            Service split shows submission counts so the founder
            can spot if one side of the book is lagging. Routes to
            the A&T Dashboard module where the reports actually
            live. */}
        <KpiCard
          Icon={FileText}
          title="Monthly Reports"
          value={
            <span className="flex items-baseline gap-1.5">
              <span className={`tabular-nums ${reportsData.submittedRate >= reportsData.target ? 'text-emerald-600' : 'text-rose-600'}`}>
                {reportsData.submitted}
              </span>
              <span className="text-caption font-medium text-black/55 tabular-nums">
                of {reportsData.total}
              </span>
            </span>
          }
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{reportsData.overdue} overdue</span>
              <span className="font-normal opacity-70 ml-0.5">· {reportsData.pending} pending</span>
            </span>
          }
          onClick={() => router.push('/dashboard/accounts-taxation')}
          ariaLabel={`Monthly Reports ${reportsData.submitted} of ${reportsData.total} submitted (${reportsData.submittedRate}%). ${reportsData.pending} pending, ${reportsData.overdue} overdue. E-Commerce ${reportsData.ecomSubmitted} of ${reportsData.ecomTotal}, Non E-Commerce ${reportsData.nonSubmitted} of ${reportsData.nonTotal}. Activate to open the Dashboard module.`}
        />
      </div>

      {/* SNAPSHOT — state of the A&T business.
          Six cards in a 3 × 2 grid. The first row carries the
          health-of-business indicators (clients, revenue, margin);
          the second row reads forward — relationship risks (At-Risk
          CLA), revenue upside (Upsell), and customer voice (Ratings).
          Together they give the founder both the "where are we" and
          the "where is this going" reads in one section. */}
      <SectionLabel title="Snapshot" hint="State of the A&T business this month" />
      <div className="grid grid-cols-3 gap-5 mb-8">

        <KpiCard
          Icon={Users}
          title="Active A&T Clients"
          value={activeClients.total}
          delta={<DeltaPill direction="positive" value={`+${activeClients.change}`} suffix="" label="this month" />}
          onClick={() => setOpenKPI('active')}
          ariaLabel={`Active A&T Clients ${activeClients.total}, plus ${activeClients.change} this month. E-Commerce ${activeClients.ecom}, Non E-Commerce ${activeClients.non}. Activate to view details.`}
        />

        <KpiCard
          Icon={IndianRupee}
          title="Monthly Revenue"
          value={formatLakh(revenue.total)}
          delta={<DeltaPill direction="positive" value={`+${revenue.change}`} label="vs last month" />}
          onClick={() => setOpenKPI('revenue')}
          ariaLabel={`Monthly Revenue ${formatLakh(revenue.total)}, up ${revenue.change} percent vs last month. E-Commerce ${formatLakh(revenue.ecom)}, Non E-Commerce ${formatLakh(revenue.non)}. Activate to view details.`}
        />

        <KpiCard
          Icon={TrendingUp}
          title="Net Margin"
          value={<span className="text-emerald-600">{margin.rate}%</span>}
          delta={<DeltaPill direction="positive" value={`+${(margin.rate - margin.prevRate).toFixed(1)}%`} suffix="" label="vs last month" />}
          onClick={() => setOpenKPI('margin')}
          ariaLabel={`Net Margin ${margin.rate} percent, target ${margin.target} percent. E-Commerce ${margin.ecomRate} percent, Non E-Commerce ${margin.nonRate} percent. Activate to view trend.`}
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
          onClick={() => setOpenKPI('cla')}
          ariaLabel={`At-Risk Clients ${claData.total}: ${claData.sureshot} sureshot, ${claData.saveable} can be saved, ${formatLakh(claData.revAtRisk)} revenue at risk. Compliance ${claData.ecom}, Advisory ${claData.non}. Activate to view details.`}
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
          onClick={() => setOpenKPI('upsell')}
          ariaLabel={`Upsell Pipeline ${formatLakh(upsell.sumPotential)} potential across ${upsell.total} deals, ${upsell.highConf} high confidence. Compliance ${upsell.ecom}, Advisory ${upsell.non}. Activate to view details.`}
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
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-700">
              <ArrowUp className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">+{(ratings.avg - ratings.prevAvg).toFixed(1)}</span>
              <span className="font-normal opacity-70 ml-0.5">vs last month</span>
            </span>
          }
          onClick={() => setOpenKPI('ratings')}
          ariaLabel={`Customer Ratings ${ratings.avg.toFixed(1)} stars from ${ratings.total} responses, ${ratings.lowCount} below 3 stars. E-Commerce ${ratings.ecomAvg.toFixed(1)} stars, Non E-Commerce ${ratings.nonAvg.toFixed(1)} stars. Activate to view details.`}
        />
      </div>

      {/* ACTION QUEUE — open work that needs attention this week.
          Down to two cards now that At-Risk and Upsell moved into
          Snapshot (those read as state-of-the-business, not active
          work items). Two-column grid keeps the cards full-width
          rather than stranding them in a 4-column layout. */}
      <SectionLabel title="Action Queue" hint="Open work and risks that need attention" />
      <div className="grid grid-cols-2 gap-5 mb-6">

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
          onClick={() => setOpenKPI('incidents')}
          ariaLabel={`Open Incidents ${incidents.total}: ${incidents.critical} critical, ${incidents.high} high, ${incidents.medium} medium. Compliance ${incidents.ecom}, Advisory ${incidents.non}. Activate to view details.`}
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
          onClick={() => setOpenKPI('onboarding')}
          ariaLabel={`Onboarding Pipeline ${onboarding.total}: ${onboarding.pending} pending, ${onboarding.done} done, ${onboarding.stuck} stuck more than 7 days. Compliance ${onboarding.ecom}, Advisory ${onboarding.non}. Activate to view details.`}
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
            aria-labelledby="at-drawer-title"
            className="fixed top-0 right-0 h-screen w-[880px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
            style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 bg-white relative z-10 gap-4">
              <div className="min-w-0 flex-1">
                <h2 id="at-drawer-title" className="text-h2 font-bold text-black/90">{kpiMeta[openKPI].title}</h2>
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

            <div className="flex-1 overflow-y-auto min-h-0">
              {openKPI === 'active' && <ActiveDrawerBody type={drawerType} setType={setDrawerType} />}
              {openKPI === 'revenue' && <RevenueDrawerBody type={drawerType} setType={setDrawerType} />}
              {openKPI === 'margin' && <MarginDrawerBody type={drawerType} setType={setDrawerType} />}
              {openKPI === 'ratings' && <RatingsDrawerBody type={drawerType} setType={setDrawerType} />}
              {openKPI === 'incidents' && (
                <IncidentsDrawerBody
                  type={drawerType} setType={setDrawerType}
                  severity={drawerSeverity} setSeverity={setDrawerSeverity}
                />
              )}
              {openKPI === 'onboarding' && <OnboardingDrawerBody type={drawerType} setType={setDrawerType} onViewAll={goToDeliverables} />}
              {openKPI === 'cla' && (
                <ClaDrawerBody
                  type={drawerType} setType={setDrawerType}
                  status={drawerClaStatus} setStatus={setDrawerClaStatus}
                />
              )}
              {openKPI === 'upsell' && <UpsellDrawerBody type={drawerType} setType={setDrawerType} />}
              {openKPI === 'compliance' && (
                <ComplianceDrawerBody
                  type={drawerType} setType={setDrawerType}
                  compStatus={drawerCompliance} setCompStatus={setDrawerCompliance}
                />
              )}

              {/* Drawer footer — link out to the Deliverables / report page.
                  Suppressed for the Onboarding drawer since its CTA was
                  promoted up next to the All-business-types dropdown
                  above the table. */}
              {openKPI !== 'onboarding' && (
                <div className="px-7 py-4 border-t border-black/[0.06] bg-[#FAFBFC] flex justify-end">
                  <button
                    onClick={goToDeliverables}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                  >
                    {kpiMeta[openKPI].routeLabel}
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION LABEL
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

function DrawerHero({ value, label, delta }: { value: React.ReactNode; label: string; delta?: React.ReactNode; }) {
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
              <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-caption font-semibold text-black/70 tabular-nums" aria-hidden="true">{idx + 1}</span>
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

function TypeFilterSelect({ id, value, onChange }: { id: string; value: TypeFilter; onChange: (v: TypeFilter) => void; }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by engagement type</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as TypeFilter)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All business types</option>
        <option value="E-Commerce">E-Commerce</option>
        <option value="Non E-Commerce">Non E-Commerce</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function TypeTag({ type }: { type: ClientType }) {
  return (
    <span className={`text-caption font-medium px-1.5 py-0.5 rounded ${
      type === 'E-Commerce' ? 'bg-cyan-50 text-cyan-700' : 'bg-indigo-50 text-indigo-600'
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
  ariaLabel, head, rows, align, rowHighlight, pageSize,
}: {
  ariaLabel: string;
  head: string[];
  rows: React.ReactNode[][];
  align: ('left' | 'right')[];
  rowHighlight?: (idx: number) => string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows.length]);

  const paginated = pageSize !== undefined && rows.length > pageSize;
  const totalPages = paginated ? Math.max(1, Math.ceil(rows.length / pageSize!)) : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = paginated ? (currentPage - 1) * pageSize! : 0;
  const endIdx = paginated ? Math.min(startIdx + pageSize!, rows.length) : rows.length;
  const visible = paginated ? rows.slice(startIdx, endIdx) : rows;
  const globalIdx = (pageLocalIdx: number) => paginated ? startIdx + pageLocalIdx : pageLocalIdx;

  return (
    <div className="px-7 pb-7">
      <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={ariaLabel}>
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                {head.map((h, idx) => (
                  <th key={idx} className={`px-5 py-3 text-caption font-semibold text-black/55 uppercase tracking-wide ${align[idx] === 'right' ? 'text-right' : 'text-left'}`} scope="col">
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

        {paginated && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-black/5 bg-[#FAFBFC]" role="navigation" aria-label={`${ariaLabel} pagination`}>
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

function SplitTooltip({ active, payload, label, fmt }: {
  active?: boolean;
  payload?: { value?: number | string; dataKey?: string | number; }[];
  label?: string | number;
  fmt?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const ecom = payload.find(p => p.dataKey === 'ecom')?.value as number | undefined;
  const non = payload.find(p => p.dataKey === 'non')?.value as number | undefined;
  const total = (ecom ?? 0) + (non ?? 0);
  const f = fmt ?? ((v: number) => v.toString());
  return (
    <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
      <p className="font-bold text-black/75 mb-1">{label} '26</p>
      {ecom !== undefined && <p className="text-cyan-700 font-semibold">E-Commerce: {f(ecom)}</p>}
      {non !== undefined && <p className="text-indigo-600 font-semibold">Non E-Commerce: {f(non)}</p>}
      {ecom !== undefined && non !== undefined && <p className="text-black/55 mt-0.5">Total: {f(total)}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER BODIES
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. Active A&T Clients ────────────────────────────────────────────────────

function ActiveDrawerBody({ type, setType }: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
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
        { label: 'A&T book is steadily growing', text: `Client base expanded by ${activeClients.change} this month, ending at ${activeClients.total} active A&T clients. Non E-Commerce retainers continue to drive book volume; E-Commerce grows but is smaller in headcount with higher-stakes deadlines.` },
        { label: 'Non E-Commerce dominates by count', text: `${activeClients.ecom} E-Commerce (${Math.round((activeClients.ecom / activeClients.total) * 100)}%) and ${activeClients.non} Non E-Commerce (${Math.round((activeClients.non / activeClients.total) * 100)}%). Non E-Commerce is the volume engine; E-Commerce carries tighter compliance schedules.` },
        { label: 'Watch Non E-Commerce retention before celebrating', text: `Net growth assumes the ${claData.total} At-Risk accounts (CLA card) don't convert to exits next month. ${claData.sureshot} are sureshot.` },
      ]} />

      <DrawerSectionTitle title="6-month client trend by engagement type" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="ecom-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_ECOM} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_ECOM} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="non-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_NON} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_NON} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip cursor={{ stroke: 'rgba(0,0,0,0.08)' }} content={<SplitTooltip />} />
            <Area type="monotone" dataKey="ecom" stackId="1" stroke={C_ECOM} fill="url(#ecom-grad)" strokeWidth={2} />
            <Area type="monotone" dataKey="non" stackId="1" stroke={C_NON} fill="url(#non-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Active client list — ${filtered.length} client${filtered.length === 1 ? '' : 's'}`}
        right={<TypeFilterSelect id="active-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Active A&T clients"
        pageSize={10}
        head={['Client', 'Type', 'HOD', 'Billing', 'Tenure']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="h" className="text-caption text-black/65">{c.hod}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
          <span key="d" className="text-caption font-semibold text-black/75 tabular-nums" title={`Onboarded ${c.since}`} aria-label={`${formatTenure(c.since)} tenure, onboarded ${c.since}`}>{formatTenure(c.since)}</span>,
        ])}
        align={['left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 2. Monthly Revenue ───────────────────────────────────────────────────────

function RevenueDrawerBody({ type, setType }: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
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
        { label: 'Both books grew this month', text: `Total A&T revenue rose ~${revenue.change}% MoM. Non E-Commerce landed at ${formatLakh(revenue.non)} (${Math.round((revenue.non / revenue.total) * 100)}%) and E-Commerce at ${formatLakh(revenue.ecom)} (${Math.round((revenue.ecom / revenue.total) * 100)}%).` },
        { label: 'Non E-Commerce is the revenue concentration', text: `${activeClients.non} Non E-Commerce clients drive ${formatLakh(revenue.non)} — that's ${Math.round((revenue.non / activeClients.non / 1000))}K per client on average vs ~${Math.round((revenue.ecom / activeClients.ecom / 1000))}K for E-Commerce. The book economics are dominated by larger advisory mandates in the Non E-Commerce segment.` },
        { label: 'Top 3 clients hold disproportionate weight', text: 'Vijay Family Office, Meridian Holdings, and Atlas Capital alone contribute over ₹9.9L of monthly revenue — concentration risk worth monitoring.' },
      ]} />

      <DrawerSectionTitle title="6-month revenue by type" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => formatLakh(v as number)} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} content={<SplitTooltip fmt={formatLakh} />} />
            <Bar dataKey="ecom" stackId="1" fill={C_ECOM} radius={[0, 0, 0, 0]} />
            <Bar dataKey="non" stackId="1" fill={C_NON} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Top revenue clients — ${formatLakh(filteredSum)}`}
        right={<TypeFilterSelect id="rev-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="Top revenue A&T clients"
        pageSize={10}
        head={['Client', 'Type', 'Revenue', 'Cost', 'Margin %']}
        rows={[...filtered].sort((a, b) => b.revenue - a.revenue).map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="r" className="text-caption font-semibold text-black/85 tabular-nums">{formatLakh(c.revenue)}</span>,
          <span key="x" className="text-caption text-black/55 tabular-nums">{formatLakh(c.cost)}</span>,
          <span key="m" className={`text-caption font-semibold tabular-nums ${c.margin >= 40 ? 'text-emerald-600' : c.margin >= 35 ? 'text-amber-600' : 'text-rose-600'}`}>{c.margin.toFixed(1)}%</span>,
        ])}
        align={['left', 'left', 'right', 'right', 'right']}
      />
    </>
  );
}

// ─── 3. Net Margin ────────────────────────────────────────────────────────────

function MarginDrawerBody({ type, setType }: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
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
        { label: `${(margin.rate - margin.target).toFixed(1)}% above the ${margin.target}% target`, text: `Blended margin is ${margin.rate}% — ${(margin.rate - margin.target).toFixed(1)}% above the ${margin.target}% internal target. A&T enjoys cleaner economics than SEM (no ad-spend pass-through).` },
        { label: 'E-Commerce is the margin leader', text: `E-Commerce runs at ${margin.ecomRate}%, Non E-Commerce at ${margin.nonRate}%. E-Commerce clients have tighter, more standardized compliance workflows; Non E-Commerce advisory work carries higher partner-time costs.` },
        { label: 'Behind-status accounts are dragging margin', text: `The ${complianceData.behind} Behind clients average ~35% margin vs ~48% for On Track. Recovering compliance health here would lift the blended number 1–2 points.` },
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
        ariaLabel="A&T client margin breakdown"
        pageSize={10}
        head={['Client', 'Type', 'Revenue', 'Cost', 'Margin %']}
        rows={sortedByMargin.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="r" className="text-caption text-black/65 tabular-nums">{formatLakh(c.revenue)}</span>,
          <span key="x" className="text-caption text-black/55 tabular-nums">{formatLakh(c.cost)}</span>,
          <span key="m" className={`text-caption font-semibold tabular-nums ${c.margin >= 40 ? 'text-emerald-600' : c.margin >= 35 ? 'text-amber-600' : 'text-rose-600'}`}>{c.margin.toFixed(1)}%</span>,
        ])}
        rowHighlight={(idx) => sortedByMargin[idx].margin < margin.target ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'right', 'right', 'right']}
      />
    </>
  );
}

// ─── 4. Customer Ratings ──────────────────────────────────────────────────────

function RatingsDrawerBody({ type, setType }: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{(ratings.avg - ratings.prevAvg).toFixed(1)} vs Mar ({ratings.prevAvg.toFixed(1)})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Non E-Commerce leads on satisfaction', text: `Non E-Commerce averages ${ratings.nonAvg.toFixed(1)}★ vs E-Commerce at ${ratings.ecomAvg.toFixed(1)}★. The larger advisory client relationships generate more touchpoints and better perceived value than smaller transactional compliance work.` },
        { label: `${ratings.lowCount} account in the danger zone`, text: `${ratings.lowCount} of ${ratings.total} clients rated 2★ or below — Green Valley Enterprises is the immediate flight risk and is also flagged on the CLA card.` },
        { label: 'Trend is improving', text: `Average rose from ${ratings.prevAvg.toFixed(1)}★ to ${ratings.avg.toFixed(1)}★ MoM. Sustained 4★+ for three consecutive months would be a real signal of sticky satisfaction.` },
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
        ariaLabel="A&T customer feedback"
        pageSize={10}
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
        { label: '2 critical incidents need attention today', text: `${incidents.critical} critical-severity issues are open: Green Valley Enterprises (12d overdue GSTR-3B) and Bilawala & Co Heena (18d overdue ITR with advance-tax risk). Both carry penalty exposure.` },
        { label: 'Compliance bears the load', text: `${incidents.ecom} of ${incidents.total} incidents are on Compliance clients — typical for the larger book, but the severity skew (filings, not advisory delays) is what to worry about.` },
        { label: 'Trend is improving', text: `Total incidents dropped from ${incidents.prevTotal} in March to ${incidents.total} in April. Critical count held flat — the same accounts have been escalated for two consecutive months.` },
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
              <label htmlFor="at-inc-sev" className="sr-only">Severity</label>
              <select
                id="at-inc-sev"
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
            <TypeFilterSelect id="at-inc-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="Open A&T incidents"
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

function OnboardingDrawerBody({ type, setType, onViewAll }: { type: TypeFilter; setType: (v: TypeFilter) => void; onViewAll: () => void }) {
  const filtered = type === 'All' ? onboardingList : onboardingList.filter(o => o.type === type);
  const stuckCount = filtered.filter(o => !isOnbLive(o) && o.days > 7).length;

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
        { label: `${onboarding.pending} clients pending kickoff`, text: `${onboarding.pending} of ${onboarding.total} are still in the pre-live queue. Average time to live is ${onboarding.avgDays} days — the long tail (Alpine Group at 14d, Infinity Solutions at 11d) is what needs intervention.` },
        { label: `${onboarding.stuck} accounts stuck > 7 days`, text: 'Alpine Group (14d, kickoff not held), Infinity Solutions (11d, MoMs pending), and Coast and Bloom (9d, data sharing 4/14) need a Super Admin nudge. Two have no assignee yet.' },
        { label: 'Compliance volume is heavier', text: `${onboarding.ecom} Compliance vs ${onboarding.non} Advisory in the pipe — typical for an A&T book. Compliance onboardings tend to take longer because of statutory document collection.` },
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
                  <p className="text-cyan-700 font-semibold">New: {payload.find(p => p.dataKey === 'new')?.value ?? 0}</p>
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
        right={
          <>
            <TypeFilterSelect id="at-onb-type" value={type} onChange={setType} />
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View onboarding pipeline
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="A&T onboarding pipeline"
        pageSize={10}
        head={['Client', 'Type', 'Stage', 'Status', 'Days', 'Assignee']}
        rows={filtered.map((o) => {
          const live = isOnbLive(o);
          const stage = onbCurrentStage(o);
          return [
            <span key="c" className="text-body font-medium text-black/80">{o.client}</span>,
            <TypeTag key="t" type={o.type} />,
            // Stage cell — section name on top, inline section progress
            // bar + count below. Reads at a glance as "where are we
            // and how far through that section". For Live clients it
            // collapses to a single emerald pill.
            <div key="st">
              {live || !stage ? (
                <span className="inline-flex items-center text-caption font-semibold text-emerald-700">
                  Live
                </span>
              ) : (
                <>
                  <div className="text-caption font-medium text-black/80">{stage.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-black/[0.06] overflow-hidden" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-[#06B6D4]"
                        style={{ width: `${(stage.done / stage.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-black/55 tabular-nums">{stage.done}/{stage.total}</span>
                  </div>
                </>
              )}
            </div>,
            <span key="s" className={`text-caption font-semibold px-1.5 py-0.5 rounded ${live ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{live ? 'Done' : 'Pending'}</span>,
            <span key="d" className={`text-caption font-semibold tabular-nums ${!live && o.days > 7 ? 'text-rose-600' : 'text-black/75'}`}>{o.days}d</span>,
            <span key="a" className={`text-caption ${o.assignee === 'Unassigned' ? 'text-rose-600 font-semibold' : 'text-black/65'}`}>{o.assignee}</span>,
          ];
        })}
        rowHighlight={(idx) => !isOnbLive(filtered[idx]) && filtered[idx].days > 7 ? 'bg-rose-50/40' : ''}
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
        { label: `${claData.sureshot} sureshot exits — assume they're gone`, text: `Konark Foods and Mira Pharmaceuticals are the two sureshot CLAs. Combined billing of ${formatLakh(claList.filter(c => c.claStatus === 'sureshot').reduce((s, c) => s + c.billing, 0))}/mo walks out next quarter unless something changes today.` },
        { label: `${claData.saveable} can be saved — but not for free`, text: 'Three of these (Green Valley, Bilawala Heena, CEO Rules) are also flagged on Open Incidents — recovering relationships there starts with closing the open compliance issues.' },
        { label: 'Concentration is in Compliance', text: `${claData.ecom} of ${claData.total} CLAs are Compliance. The book that drives volume also produces most of the at-risk count — relationship hygiene matters more than scale.` },
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
              <label htmlFor="at-cla-status" className="sr-only">CLA status</label>
              <select
                id="at-cla-status"
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
            <TypeFilterSelect id="at-cla-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="At-risk A&T clients"
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

function UpsellDrawerBody({ type, setType }: { type: TypeFilter; setType: (v: TypeFilter) => void }) {
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
        { label: 'Compliance → Advisory upgrade is the dominant motion', text: `${upsell.ecom} of ${upsell.total} opportunities are layering Advisory on top of an existing Compliance retainer. That's the highest-LTV move A&T can make — a happy compliance client converts much faster than a cold prospect.` },
        { label: 'Top targets are 5★ rated', text: `Patel Constructions (${formatLakh(185000)}), Atlas Capital (${formatLakh(165000)}), Aryan Pharmaceuticals (${formatLakh(145000)}) — all three are 5★ rated and have multi-year tenure. These are the most converting deals in the pipeline.` },
      ]} />

      <DrawerSectionTitle title="6-month upsell pipeline value" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={upsellTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="at-upsell-grad" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="potential" stroke={GREEN} fill="url(#at-upsell-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Opportunities — ${filtered.length} deals, ${formatLakh(filteredSum)} potential`}
        right={<TypeFilterSelect id="at-up-type" value={type} onChange={setType} />}
      />
      <DrawerTable
        ariaLabel="A&T upsell opportunities"
        pageSize={10}
        head={['Client', 'Type', 'Opportunity', 'Confidence', 'Potential']}
        rows={[...filtered].sort((a, b) => b.potentialRevenue - a.potentialRevenue).map((u) => [
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

// ─── 9. Compliance Status (per-client health) ─────────────────────────────────

function ComplianceDrawerBody({
  type, setType, compStatus, setCompStatus,
}: {
  type: TypeFilter;
  setType: (v: TypeFilter) => void;
  compStatus: ComplianceFilter;
  setCompStatus: (v: ComplianceFilter) => void;
}) {
  let filtered = activeClientList;
  if (type !== 'All') filtered = filtered.filter(c => c.type === type);
  if (compStatus !== 'All') filtered = filtered.filter(c => c.status === compStatus);

  // Sort: Behind first (the actionable rows), then by client.
  filtered = [...filtered].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Behind' ? -1 : 1;
    return a.client.localeCompare(b.client);
  });

  const filteredOnTrack = filtered.filter(c => c.status === 'On Track').length;
  const filteredBehind = filtered.filter(c => c.status === 'Behind').length;
  const filteredRate = filtered.length > 0 ? Math.round((filteredOnTrack / filtered.length) * 100) : 0;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={
          <span className={complianceData.onTrackRate >= complianceData.target ? 'text-emerald-600' : 'text-rose-600'}>
            {complianceData.onTrackRate}%
          </span>
        }
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-rose-700">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {complianceData.target - complianceData.onTrackRate}% below {complianceData.target}% target
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${complianceData.behind} of ${complianceData.total} clients are behind`, text: `On-track rate is ${complianceData.onTrackRate}% — ${complianceData.target - complianceData.onTrackRate}% below the ${complianceData.target}% internal target. ${complianceData.ecomBehind} E-Commerce and ${complianceData.nonBehind} Non E-Commerce accounts are off-track.` },
        { label: `Non E-Commerce is the bigger drag`, text: `Non E-Commerce hits ${Math.round((complianceData.nonOnTrack / complianceData.nonTotal) * 100)}% on-track (${complianceData.nonOnTrack} of ${complianceData.nonTotal}); E-Commerce at ${Math.round((complianceData.ecomOnTrack / complianceData.ecomTotal) * 100)}% (${complianceData.ecomOnTrack} of ${complianceData.ecomTotal}). Non E-Commerce has more clients, so more opportunities to slip.` },
        { label: `Trend is roughly flat this quarter`, text: `On-track rate has hovered between 75–77% for the past five months, ending at ${complianceData.onTrackRate}% in Apr. We're consistently ${complianceData.target - complianceData.onTrackRate}% below the ${complianceData.target}% target — staffing or process change is needed before the next compliance cycle peak.` },
      ]} />

      <DrawerSectionTitle title="6-month on-track rate (%) with target" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={complianceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} unit="%" />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="font-semibold" style={{ color: (payload[0]?.value as number) >= complianceData.target ? GREEN : RED }}>
                    {payload[0]?.value}% on track
                  </p>
                </div>
              ) : null}
            />
            <ReferenceLine y={complianceData.target} stroke="#00C875" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={32}>
              {complianceTrend.map((d, idx) => (
                <Cell key={idx} fill={d.rate >= complianceData.target ? GREEN : RED} opacity={idx === complianceTrend.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Per-client status — ${filtered.length} matching, ${filteredRate}% on track`}
        right={
          <>
            <div className="relative">
              <label htmlFor="at-comp-status" className="sr-only">Compliance status</label>
              <select
                id="at-comp-status"
                value={compStatus}
                onChange={(e) => setCompStatus(e.target.value as ComplianceFilter)}
                className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All statuses</option>
                <option value="On Track">On Track only</option>
                <option value="Behind">Behind only</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
            <TypeFilterSelect id="at-comp-type" value={type} onChange={setType} />
          </>
        }
      />
      <DrawerTable
        ariaLabel="A&T client compliance status"
        pageSize={10}
        head={['Client', 'Type', 'Status', 'HOD', 'Billing']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <TypeTag key="t" type={c.type} />,
          <span key="k" className={`text-caption font-semibold px-1.5 py-0.5 rounded ${c.status === 'On Track' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{c.status}</span>,
          <span key="h" className="text-caption text-black/65">{c.hod}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].status === 'Behind' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'right']}
      />

      <p className="px-7 pb-4 -mt-2 text-caption text-black/45">
        Showing {filteredOnTrack} on track · {filteredBehind} behind across {filtered.length} client{filtered.length === 1 ? '' : 's'}.
      </p>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TasksCard — same custom card used in PerformanceMarketingHome. Redesigned
// to lead with one hero number (`total open`) so the eye has a single anchor;
// the urgency slices (Overdue · P1 · Due this week) demote to tonal pill
// chips so they don't compete with the headline. Audience split + blocked
// callout sit as quiet captions.
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
      aria-label={`A&T Tasks: ${tasks.total} open (${tasks.client} client, ${tasks.internal} internal). ${tasks.overdue} overdue, ${tasks.p1} P1 priority, ${tasks.dueThisWeek} due this week. Activate to open My Tasks.`}
      // Same chrome as the KpiCard sibling so the Tasks card reads
      // as part of the same widget family, not a one-off shape.
      className="group relative bg-[#FAFBFD] rounded-xl p-6 border border-[#E5EAF7] hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#204CC7]/[0.045] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Header — icon chip + title + chevron, items-center for clean
          alignment opposite the chip. Ring on the chip matches the
          KpiCard sibling. */}
      <div className="relative flex items-center justify-between mb-5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08] ring-1 ring-inset ring-[#204CC7]/[0.10]">
            <ListTodo className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <span className="text-black/65 text-caption font-semibold truncate">A&amp;T Tasks</span>
        </div>
        <ChevronRight
          className="w-4 h-4 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Hero metric + audience caption — every card across the four
          Overview surfaces (Home / Customers / Employees / A&T) now
          ends on this kind of headline+sub line. The previous urgency-
          chips strip (Overdue / P1 / Due this week) was retired for
          visual parity; the same data still surfaces inside the
          tasks page that opens on click. */}
      <div className="relative">
        <p className="flex items-baseline gap-2">
          <span className="text-h1 leading-none font-bold text-black/90 tabular-nums">{tasks.total}</span>
          <span className="text-caption text-black/55">open</span>
        </p>
        <p className="text-caption text-black/60 mt-1.5">
          <span className="text-black/80 font-semibold tabular-nums">{tasks.client}</span> client
          <span className="text-black/25 mx-1.5" aria-hidden="true">·</span>
          <span className="text-black/80 font-semibold tabular-nums">{tasks.internal}</span> internal
        </p>
      </div>
    </button>
  );
}

function UrgencyChip({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: 'rose' | 'amber' | 'neutral';
}) {
  // When the count is zero we drop to a muted neutral chip regardless of
  // tone — there's nothing urgent so the loud colour would just be noise.
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
