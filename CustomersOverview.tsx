'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users, UserMinus, AlertTriangle, TrendingDown, Star, Briefcase, FileWarning,
  ArrowUp, ArrowDown, AlertCircle, Calendar, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';

// ══════════════════════════════════════════════════════════════════════════════
// Customers Overview — parity refactor with the Reports/Home KPI grid.
//
// Design pattern (per the design-critique we just shipped):
//   1. The page surfaces 8 metric cards in a 4×2 grid, grouped under two
//      labelled sections — SNAPSHOT (status) and ACTION QUEUE (work).
//   2. Each card opens a 880px right drawer with: Hero → Insights → Chart →
//      Table. Filter state lives inside the drawer body, not on the page.
//   3. KpiCard chrome, drawer chrome, focus-management, and Esc+Tab-trap are
//      copied 1:1 from Overview.tsx so the two surfaces look and behave
//      identically. If a third caller appears, lift KpiCard + the drawer
//      shell into components/. Today the duplication is intentional — it
//      isolates the risk of the larger Overview.tsx file.
// ══════════════════════════════════════════════════════════════════════════════

const BLUE = '#204CC7';
const C_AT = '#06B6D4';
const C_SEM = '#7C3AED';
const RED = '#E2445C';
const GREEN = '#00C875';
const AMBER = '#FDAB3D';

// ─── KpiCard ───────────────────────────────────────────────────────────────────

type KpiCardProps = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  value: React.ReactNode;
  /** Optional delta pill or sub-line under the headline. */
  delta?: React.ReactNode;
  onClick: () => void;
  /** Required: value-rich label that screen readers can read in place of the visual hierarchy. */
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
      // Card chrome — matches the unified subtle-blue identity used
      // on the home Overview surface:
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
          chip's vertical centerline. items-center on the row + no
          mt-0.5 nudges, so the chevron always sits exactly opposite
          the chip across the row. */}
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

      {/* Headline + delta pill / sub-line — every card now ends on
          this line. Service split block (proportion bar + labelled
          values) was retired here too for consistency with the home
          Overview, and to match the calmer card rhythm. The A&T /
          SEM breakdown still lives inside the drawer that opens on
          click, so the information is one click away when needed. */}
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

// ─── Helper formatters ─────────────────────────────────────────────────────────

const formatLakh = (v: number) =>
  v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` :
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` :
  v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` :
  `₹${v}`;

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOMERS OVERVIEW — Default screen for /adminland/customers
// ══════════════════════════════════════════════════════════════════════════════

type KpiId =
  | 'active'
  | 'lost'
  | 'attrition'
  | 'ratings'
  | 'incidents'
  | 'onboarding'
  | 'cla'
  | 'churn-reason';

type ServiceFilter = 'All' | 'A&T' | 'SEM';
type DateRange = 'ytd' | 'mtd' | 'weekly' | 'q1' | 'q2' | 'q3' | 'q4';

export function CustomersOverview() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>('mtd');

  // ── Drawer state ─────────────────────────────────────────────────────────
  const [openKPI, setOpenKPI] = useState<KpiId | null>(null);
  // Filter state lives inside the drawer (resets on close → consistent first-look).
  const [drawerService, setDrawerService] = useState<ServiceFilter>('All');
  const [drawerHod, setDrawerHod] = useState<string>('all');
  const [drawerSeverity, setDrawerSeverity] = useState<'All' | 'Critical' | 'High' | 'Medium'>('All');

  const drawerRef = useRef<HTMLDivElement>(null);
  // Restore focus to the card that opened the drawer on close (WCAG 2.4.3).
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);

  // Reset drawer-local filters whenever a different KPI opens, so the user
  // doesn't carry over a previous drawer's narrow view.
  useEffect(() => {
    if (openKPI) {
      setDrawerService('All');
      setDrawerHod('all');
      setDrawerSeverity('All');
    }
  }, [openKPI]);

  // Esc closes; Tab cycles within the drawer rather than escaping into the
  // dimmed background. Mirrors Overview.tsx exactly.
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

  // ══════════════════════════════════════════════════════════════════════════
  // KPI HEADLINE NUMBERS
  // ══════════════════════════════════════════════════════════════════════════
  // Single source of truth — drawers derive everything from these objects.

  const activeCustomers = { total: 90, at: 38, sem: 52, change: 6, prevTotal: 84 };
  const lostCustomers = { total: 6, at: 2, sem: 4, change: -25, prevTotal: 8, revLost: 420000 };
  const attrition = { rate: 6.7, prevRate: 8.1, atRate: 5.3, semRate: 7.7, target: 4.0 };
  const ratings = { avg: 4.0, prevAvg: 4.1, atAvg: 4.3, semAvg: 3.8, total: 10, lowCount: 2 };
  const incidents = { total: 8, prevTotal: 7, critical: 2, high: 3, medium: 3, at: 3, sem: 5 };
  const onboarding = { total: 9, pending: 5, done: 4, stuck: 2, avgDays: 8, at: 4, sem: 5 };
  const claData = { total: 8, prevTotal: 7, sureshot: 3, saveable: 5, revAtRisk: 407000, at: 3, sem: 5 };
  const churn = { topReason: 'Poor ROAS / Results', topPct: 33, totalExits: 6, atTop: 'Budget', semTop: 'Poor ROAS' };

  // ══════════════════════════════════════════════════════════════════════════
  // 6-MONTH TREND BACKFILL
  // ══════════════════════════════════════════════════════════════════════════
  // Hand-tuned so the last datapoint in every series matches the headline
  // numbers above. Earlier months are seeded for natural trajectories.

  const customerTrend = [
    { month: 'Nov', total: 84, at: 35, sem: 49 },
    { month: 'Dec', total: 85, at: 35, sem: 50 },
    { month: 'Jan', total: 86, at: 36, sem: 50 },
    { month: 'Feb', total: 87, at: 37, sem: 50 },
    { month: 'Mar', total: 84, at: 36, sem: 48 },
    { month: 'Apr', total: 90, at: 38, sem: 52 },
  ];

  const lossTrend = [
    { month: 'Nov', at: 1, sem: 2, total: 3 },
    { month: 'Dec', at: 1, sem: 3, total: 4 },
    { month: 'Jan', at: 2, sem: 3, total: 5 },
    { month: 'Feb', at: 1, sem: 3, total: 4 },
    { month: 'Mar', at: 2, sem: 5, total: 7 },
    { month: 'Apr', at: 2, sem: 4, total: 6 },
  ];

  const attritionTrend = [
    { month: 'Nov', rate: 3.6, at: 2.9, sem: 4.1 },
    { month: 'Dec', rate: 4.7, at: 2.9, sem: 6.0 },
    { month: 'Jan', rate: 5.8, at: 5.6, sem: 6.0 },
    { month: 'Feb', rate: 4.6, at: 2.7, sem: 6.0 },
    { month: 'Mar', rate: 8.1, at: 5.6, sem: 10.4 },
    { month: 'Apr', rate: 6.7, at: 5.3, sem: 7.7 },
  ];

  const ratingsDistribution = [
    { stars: '1★', count: 0 },
    { stars: '2★', count: 1 },
    { stars: '3★', count: 2 },
    { stars: '4★', count: 4 },
    { stars: '5★', count: 3 },
  ];

  const incidentTrend = [
    { month: 'Nov', critical: 0, high: 1, medium: 2 },
    { month: 'Dec', critical: 1, high: 2, medium: 2 },
    { month: 'Jan', critical: 1, high: 2, medium: 3 },
    { month: 'Feb', critical: 0, high: 3, medium: 2 },
    { month: 'Mar', critical: 1, high: 3, medium: 3 },
    { month: 'Apr', critical: 2, high: 3, medium: 3 },
  ];

  const claTrend = [
    { month: 'Nov', sureshot: 1, saveable: 3 },
    { month: 'Dec', sureshot: 2, saveable: 3 },
    { month: 'Jan', sureshot: 2, saveable: 4 },
    { month: 'Feb', sureshot: 2, saveable: 4 },
    { month: 'Mar', sureshot: 3, saveable: 4 },
    { month: 'Apr', sureshot: 3, saveable: 5 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // ROW-LEVEL DATA — feeds the drawer tables
  // ══════════════════════════════════════════════════════════════════════════

  const hodProfiles = [
    { id: 'all', name: 'All HODs', service: '', color: RED },
    { id: 'chinmay', name: 'Chinmay Pawar', service: 'SEM', color: '#7C3AED' },
    { id: 'amisha', name: 'Amisha Jain', service: 'SEM', color: '#A855F7' },
    { id: 'irshad', name: 'Irshad Qureshi', service: 'A&T', color: '#06B6D4' },
    { id: 'zubear', name: 'Zubear Shaikh', service: 'A&T', color: '#0891B2' },
  ];

  const activeClientList = [
    { client: 'Nor Black Nor White', service: 'SEM' as const, hod: 'Chinmay P.', billing: 95000, since: 'Jan 2024' },
    { client: 'Una Homes LLP', service: 'SEM' as const, hod: 'Chinmay P.', billing: 78000, since: 'Mar 2024' },
    { client: 'Greenfield Exports', service: 'A&T' as const, hod: 'Irshad Q.', billing: 65000, since: 'Jul 2023' },
    { client: 'TechVista Solutions', service: 'SEM' as const, hod: 'Amisha J.', billing: 88000, since: 'Sep 2024' },
    { client: 'Coastal Realty', service: 'A&T' as const, hod: 'Zubear S.', billing: 52000, since: 'Feb 2024' },
    { client: 'Meridian Foods', service: 'SEM' as const, hod: 'Amisha J.', billing: 72000, since: 'Jun 2024' },
    { client: 'PureWell Organics', service: 'A&T' as const, hod: 'Zubear S.', billing: 48000, since: 'Aug 2024' },
    { client: 'UrbanNest Interiors', service: 'SEM' as const, hod: 'Chinmay P.', billing: 68000, since: 'Nov 2024' },
    { client: 'Dhanraj & Sons', service: 'A&T' as const, hod: 'Zubear S.', billing: 58000, since: 'May 2024' },
    { client: 'Bloom Wellness', service: 'SEM' as const, hod: 'Amisha J.', billing: 62000, since: 'Oct 2024' },
  ];

  const customerExits = [
    { client: 'Vivaan Jewels', service: 'SEM' as const, reason: 'Poor ROAS / Results', billing: 55000, exitDate: 'Mar 2026', hod: 'Chinmay P.' },
    { client: 'FreshFarm Organics', service: 'SEM' as const, reason: 'Poor ROAS / Results', billing: 72000, exitDate: 'Feb 2026', hod: 'Amisha J.' },
    { client: 'QuickFix Motors', service: 'SEM' as const, reason: 'Switched to Competitor', billing: 48000, exitDate: 'Mar 2026', hod: 'Chinmay P.' },
    { client: 'Bilawala & Co', service: 'A&T' as const, reason: 'Budget Constraints', billing: 35000, exitDate: 'Jan 2026', hod: 'Irshad Q.' },
    { client: 'GreenStar Retail', service: 'SEM' as const, reason: 'Service Issues', billing: 62000, exitDate: 'Feb 2026', hod: 'Amisha J.' },
    { client: 'Patel Constructions', service: 'A&T' as const, reason: 'Business Closure', billing: 148000, exitDate: 'Mar 2026', hod: 'Zubear S.' },
  ];

  const clientRatings = [
    { client: 'Nor Black Nor White', service: 'SEM' as const, rating: 5, feedback: 'Exceptional campaign management — ROAS consistently above targets.', date: 'Apr 2026' },
    { client: 'Una Homes LLP', service: 'SEM' as const, rating: 5, feedback: 'Great communication and proactive optimisation of ad spend.', date: 'Apr 2026' },
    { client: 'Greenfield Exports', service: 'A&T' as const, rating: 5, feedback: 'Timely filings and excellent advisory on GST structuring.', date: 'Mar 2026' },
    { client: 'TechVista Solutions', service: 'SEM' as const, rating: 4, feedback: 'Good results overall, but reporting could be more detailed.', date: 'Apr 2026' },
    { client: 'Coastal Realty', service: 'A&T' as const, rating: 4, feedback: 'Reliable service. Would like faster turnaround on TDS certificates.', date: 'Mar 2026' },
    { client: 'Meridian Foods', service: 'SEM' as const, rating: 4, feedback: 'Happy with lead quality but weekly calls are sometimes missed.', date: 'Apr 2026' },
    { client: 'PureWell Organics', service: 'A&T' as const, rating: 4, feedback: 'Solid compliance work, responsive team.', date: 'Mar 2026' },
    { client: 'SparkEdge Media', service: 'SEM' as const, rating: 3, feedback: 'Campaign spend went over budget without prior approval. Needs improvement.', date: 'Apr 2026' },
    { client: 'Bio Basket', service: 'SEM' as const, rating: 2, feedback: 'ROAS dropped significantly. Deliverables frequently delayed.', date: 'Mar 2026' },
    { client: 'Enagenbio', service: 'SEM' as const, rating: 3, feedback: 'Onboarding was slow. Still waiting for first performance report.', date: 'Apr 2026' },
  ];

  const customerIncidents = [
    { id: 'CI-001', client: 'Nor Black Nor White', service: 'SEM' as const, severity: 'Critical' as const, category: 'ROAS Drop', daysOpen: 14, hod: 'chinmay', description: 'ROAS dropped below 1.2x for 3 consecutive weeks. Client escalated to leadership.' },
    { id: 'CI-002', client: 'Bio Basket', service: 'SEM' as const, severity: 'Critical' as const, category: 'Deliverable Delay', daysOpen: 7, hod: 'chinmay', description: 'Monthly performance report delayed by 5 business days.' },
    { id: 'CI-003', client: 'SparkEdge Media', service: 'SEM' as const, severity: 'High' as const, category: 'Budget Overspend', daysOpen: 4, hod: 'amisha', description: 'Ad spend exceeded approved budget by 22%.' },
    { id: 'CI-004', client: 'Greenfield Exports', service: 'A&T' as const, severity: 'High' as const, category: 'Compliance', daysOpen: 11, hod: 'irshad', description: 'GST filing delayed for Q4 — penalty risk.' },
    { id: 'CI-005', client: 'Meridian Foods', service: 'SEM' as const, severity: 'Medium' as const, category: 'Communication', daysOpen: 3, hod: 'amisha', description: 'Inconsistent communication; weekly call missed twice.' },
    { id: 'CI-006', client: 'Coastal Realty', service: 'A&T' as const, severity: 'Medium' as const, category: 'Invoice Dispute', daysOpen: 9, hod: 'zubear', description: 'Billing discrepancy of ₹18K on March invoice.' },
    { id: 'CI-007', client: 'TechVista Solutions', service: 'SEM' as const, severity: 'High' as const, category: 'Campaign Error', daysOpen: 2, hod: 'chinmay', description: 'Wrong landing page linked in Google Ads campaign for 48 hours.' },
    { id: 'CI-008', client: 'PureWell Organics', service: 'A&T' as const, severity: 'Medium' as const, category: 'Document Delay', daysOpen: 6, hod: 'zubear', description: 'TDS certificates pending for 2 months.' },
  ];

  const onboardingClients = [
    { client: 'Nor Black Nor White', service: 'SEM' as const, status: 'Pending' as const, days: 12, assignee: 'Unassigned' },
    { client: 'Enagenbio', service: 'SEM' as const, status: 'Pending' as const, days: 8, assignee: 'Unassigned' },
    { client: 'Una Homes LLP', service: 'SEM' as const, status: 'Pending' as const, days: 5, assignee: 'Priya S.' },
    { client: 'Sahara Textiles', service: 'A&T' as const, status: 'Pending' as const, days: 3, assignee: 'Zubear S.' },
    { client: 'ClearPath Logistics', service: 'A&T' as const, status: 'Pending' as const, days: 6, assignee: 'Irshad Q.' },
    { client: 'UrbanNest Interiors', service: 'SEM' as const, status: 'Done' as const, days: 10, assignee: 'Chinmay P.' },
    { client: 'Dhanraj & Sons', service: 'A&T' as const, status: 'Done' as const, days: 14, assignee: 'Zubear S.' },
    { client: 'Bloom Wellness', service: 'SEM' as const, status: 'Done' as const, days: 9, assignee: 'Amisha J.' },
    { client: 'Pinnacle Realty', service: 'SEM' as const, status: 'Done' as const, days: 11, assignee: 'Chinmay P.' },
  ];

  const claClients = [
    { client: 'Bio Basket', service: 'SEM' as const, claStatus: 'sureshot' as const, reason: 'ROAS dropped 40% over 2 months, unresponsive to strategy changes', responsible: 'Chinmay P.', hod: 'chinmay', billing: 45000 },
    { client: 'FRR (BLOGS)', service: 'SEM' as const, claStatus: 'sureshot' as const, reason: 'No engagement in 30 days, all tasks stalled', responsible: 'Amisha J.', hod: 'amisha', billing: 32000 },
    { client: 'July Issue', service: 'SEM' as const, claStatus: 'sureshot' as const, reason: 'Client verbally confirmed moving to competitor next month', responsible: 'Chinmay P.', hod: 'chinmay', billing: 58000 },
    { client: 'SparkEdge Media', service: 'SEM' as const, claStatus: 'can-be-saved' as const, reason: 'Invoice dispute — ₹28K discrepancy. Client withholding payment.', responsible: 'Amisha J.', hod: 'amisha', billing: 65000 },
    { client: 'Meeami Fashion', service: 'SEM' as const, claStatus: 'can-be-saved' as const, reason: 'Competitor offering lower rates, actively exploring options', responsible: 'Chinmay P.', hod: 'chinmay', billing: 42000 },
    { client: 'Greenfield Exports', service: 'A&T' as const, claStatus: 'can-be-saved' as const, reason: 'Key contact changed, relationship reset needed', responsible: 'Zubear S.', hod: 'zubear', billing: 38000 },
    { client: 'Bilawala & Co', service: 'A&T' as const, claStatus: 'can-be-saved' as const, reason: 'Missed 2 compliance deadlines, trust eroding', responsible: 'Irshad Q.', hod: 'irshad', billing: 52000 },
    { client: 'Patel Industries', service: 'A&T' as const, claStatus: 'can-be-saved' as const, reason: 'Delayed TDS filings for 3 months — client escalated to CEO', responsible: 'Zubear S.', hod: 'zubear', billing: 75000 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // KPI META — title, subtitle, route for the drawer "View full report" CTA
  // ══════════════════════════════════════════════════════════════════════════

  const kpiMeta: Record<KpiId, { title: string; subtitle: string; route: string; routeLabel: string }> = {
    'active': {
      title: 'Active Customers',
      subtitle: 'Clients with billable engagement this month',
      route: '/adminland/clients',
      routeLabel: 'View all clients',
    },
    'lost': {
      title: 'Lost Customers',
      subtitle: 'Clients that exited this month, with reasons and revenue impact',
      route: '/adminland/lost-clients',
      routeLabel: 'View all lost clients',
    },
    'attrition': {
      title: 'Attrition Rate',
      subtitle: 'Monthly churn rate — target 4.0%',
      route: '/adminland/reports/attrition',
      routeLabel: 'View attrition report',
    },
    'ratings': {
      title: 'Customer Ratings',
      subtitle: 'Average rating from client feedback collected this month',
      route: '/adminland/feedbacks',
      routeLabel: 'View all feedback',
    },
    'incidents': {
      title: 'Open Incidents',
      subtitle: 'Client-flagged issues currently in triage or being worked',
      route: '/adminland/incidents',
      routeLabel: 'View all incidents',
    },
    'onboarding': {
      title: 'Onboarding Pipeline',
      subtitle: 'New clients in the kickoff & onboarding queue',
      route: '/adminland/onboarding',
      routeLabel: 'View all onboarding',
    },
    'cla': {
      title: 'At-Risk Clients (CLA)',
      subtitle: 'Client-Level Alerts — sureshot exits and saveable accounts',
      route: '/adminland/cla',
      routeLabel: 'View all CLAs',
    },
    'churn-reason': {
      title: 'Top Churn Reason',
      subtitle: 'Most common exit driver across the last 6 months of churn',
      // Routes to the Exit Feedback page — that's where admins go to
      // dig into the why-they-left signal that this drawer summarizes.
      route: '/home?tab=customers&sub=feedbacks',
      routeLabel: 'View Exit Feedback',
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div>
      {/* ── Top filter bar — same as Reports/Home for parity ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Customers</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Health, retention, and risk overview</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <label htmlFor="cust-date-range-filter" className="sr-only">Date range</label>
              <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="cust-date-range-filter"
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

      {/* ── SNAPSHOT (status — what is the state of the customer base?) ── */}
      <SectionLabel
        title="Snapshot"
        hint="State of the customer base this month"
      />
      <div className="grid grid-cols-4 gap-5 mb-8">

        <KpiCard
          Icon={Users}
          title="Active Customers"
          value={activeCustomers.total}
          delta={<DeltaPill direction="positive" value={`+${activeCustomers.change}`} suffix="" label="this month" />}
          onClick={() => setOpenKPI('active')}
          ariaLabel={`Active Customers ${activeCustomers.total}, plus ${activeCustomers.change} this month. A and T ${activeCustomers.at}, SEM ${activeCustomers.sem}. Activate to view details.`}
        />

        <KpiCard
          Icon={UserMinus}
          title="Lost Customers"
          value={<span className="text-[#E2445C]">{lostCustomers.total}</span>}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-700">
              <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{Math.abs(lostCustomers.change)}%</span>
              <span className="font-normal opacity-70 ml-0.5">vs last month</span>
            </span>
          }
          onClick={() => setOpenKPI('lost')}
          ariaLabel={`Lost Customers ${lostCustomers.total}, down ${Math.abs(lostCustomers.change)} percent versus last month's ${lostCustomers.prevTotal}. A and T ${lostCustomers.at}, SEM ${lostCustomers.sem}. Activate to view details.`}
        />

        <KpiCard
          Icon={TrendingDown}
          title="Attrition Rate"
          value={<span className="text-[#E2445C]">{attrition.rate}%</span>}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-700">
              <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{(attrition.prevRate - attrition.rate).toFixed(1)}%</span>
              <span className="font-normal opacity-70 ml-0.5">vs last month</span>
            </span>
          }
          onClick={() => setOpenKPI('attrition')}
          ariaLabel={`Attrition Rate ${attrition.rate} percent, target ${attrition.target} percent. A and T ${attrition.atRate} percent, SEM ${attrition.semRate} percent. Activate to view trend.`}
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
          onClick={() => setOpenKPI('ratings')}
          ariaLabel={`Customer Ratings ${ratings.avg.toFixed(1)} stars from ${ratings.total} responses, ${ratings.lowCount} below 3 stars. A and T ${ratings.atAvg.toFixed(1)} stars, SEM ${ratings.semAvg.toFixed(1)} stars. Activate to view details.`}
        />
      </div>

      {/* ── ACTION QUEUE (work — what needs attention right now?) ── */}
      <SectionLabel
        title="Action Queue"
        hint="Open work and risks that need attention"
      />
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
          onClick={() => setOpenKPI('incidents')}
          ariaLabel={`Open Incidents ${incidents.total}: ${incidents.critical} critical, ${incidents.high} high, ${incidents.medium} medium. A and T ${incidents.at}, SEM ${incidents.sem}. Activate to view details.`}
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
          ariaLabel={`Onboarding Pipeline ${onboarding.total}: ${onboarding.pending} pending, ${onboarding.done} done, ${onboarding.stuck} stuck more than 7 days. A and T ${onboarding.at}, SEM ${onboarding.sem}. Activate to view details.`}
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
          ariaLabel={`At-Risk Clients ${claData.total}: ${claData.sureshot} sureshot, ${claData.saveable} can be saved, ${formatLakh(claData.revAtRisk)} revenue at risk. A and T ${claData.at}, SEM ${claData.sem}. Activate to view details.`}
        />

        <KpiCard
          Icon={FileWarning}
          title="Top Churn Reason"
          value={<span className="text-h2 leading-tight block truncate">{churn.topReason}</span>}
          delta={<DeltaPill direction="neutral" value={`${churn.topPct}%`} suffix="" label={`of ${churn.totalExits} exits`} />}
          onClick={() => setOpenKPI('churn-reason')}
          ariaLabel={`Top Churn Reason: ${churn.topReason}, ${churn.topPct} percent of ${churn.totalExits} exits. A and T top reason ${churn.atTop}, SEM top reason ${churn.semTop}. Activate to view details.`}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DRAWER — single instance, body switches on openKPI                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
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
            aria-labelledby="cust-drawer-title"
            className="fixed top-0 right-0 h-screen w-[880px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
            style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Top bar */}
            <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 bg-white relative z-10 gap-4">
              <div className="min-w-0 flex-1">
                <h2 id="cust-drawer-title" className="text-h2 font-bold text-black/90">{kpiMeta[openKPI].title}</h2>
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

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {openKPI === 'active' && (
                <ActiveDrawerBody
                  data={activeCustomers}
                  trend={customerTrend}
                  clients={activeClientList}
                  service={drawerService}
                  setService={setDrawerService}
                />
              )}
              {openKPI === 'lost' && (
                <LostDrawerBody
                  data={lostCustomers}
                  trend={lossTrend}
                  exits={customerExits}
                  service={drawerService}
                  setService={setDrawerService}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.lost.route); }}
                />
              )}
              {openKPI === 'attrition' && (
                <AttritionDrawerBody
                  /* onViewAll routes to the full attrition report */
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.attrition.route); }}
                  data={attrition}
                  trend={attritionTrend}
                  hodProfiles={hodProfiles}
                  hod={drawerHod}
                  setHod={setDrawerHod}
                  exits={customerExits}
                />
              )}
              {openKPI === 'ratings' && (
                <RatingsDrawerBody
                  data={ratings}
                  distribution={ratingsDistribution}
                  ratings={clientRatings}
                  service={drawerService}
                  setService={setDrawerService}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.ratings.route); }}
                />
              )}
              {openKPI === 'incidents' && (
                <IncidentsDrawerBody
                  data={incidents}
                  trend={incidentTrend}
                  incidents={customerIncidents}
                  hodProfiles={hodProfiles}
                  hod={drawerHod}
                  setHod={setDrawerHod}
                  severity={drawerSeverity}
                  setSeverity={setDrawerSeverity}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.incidents.route); }}
                />
              )}
              {openKPI === 'onboarding' && (
                <OnboardingDrawerBody
                  data={onboarding}
                  clients={onboardingClients}
                  service={drawerService}
                  setService={setDrawerService}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.onboarding.route); }}
                />
              )}
              {openKPI === 'cla' && (
                <ClaDrawerBody
                  data={claData}
                  trend={claTrend}
                  clients={claClients}
                  hodProfiles={hodProfiles}
                  service={drawerService}
                  setService={setDrawerService}
                  hod={drawerHod}
                  setHod={setDrawerHod}
                  formatLakh={formatLakh}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta.cla.route); }}
                />
              )}
              {openKPI === 'churn-reason' && (
                <ChurnReasonDrawerBody
                  data={churn}
                  exits={customerExits}
                  service={drawerService}
                  setService={setDrawerService}
                  formatLakh={formatLakh}
                  onViewAll={() => { setOpenKPI(null); router.push(kpiMeta['churn-reason'].route); }}
                />
              )}

              {/* Drawer footer — link out to the full report. Suppressed
                  for drawers whose CTA was promoted up next to the
                  All-services dropdown above the table (Onboarding,
                  Top Churn Reason). */}
              {openKPI !== 'onboarding' && openKPI !== 'churn-reason' && openKPI !== 'ratings' && openKPI !== 'lost' && openKPI !== 'attrition' && openKPI !== 'incidents' && openKPI !== 'cla' && (
                <div className="px-7 py-4 border-t border-black/[0.06] bg-[#FAFBFC] flex justify-end">
                  <button
                    onClick={() => { setOpenKPI(null); router.push(kpiMeta[openKPI].route); }}
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
// SECTION LABEL — light divider between SNAPSHOT and ACTION QUEUE
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
// SHARED DRAWER PIECES — used by every body component
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

function ServiceFilterSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ServiceFilter;
  onChange: (v: ServiceFilter) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by service</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ServiceFilter)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All services</option>
        <option value="A&T">Accounts &amp; Taxation</option>
        <option value="SEM">Performance Marketing</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function HodFilterSelect({
  id,
  value,
  onChange,
  hodProfiles,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hodProfiles: { id: string; name: string; service: string }[];
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by HOD</label>
      {/* Height + roundness aligned with the brand-blue CTA button
          (h-9 / rounded-md) and ServiceFilterSelect, so the cluster
          of controls in a section title's right slot reads as one
          rhythm of pills rather than a mix of shapes. */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        {hodProfiles.map(h => (
          <option key={h.id} value={h.id}>
            {h.id === 'all' ? 'All HODs' : `${h.name} · ${h.service}`}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function ServiceTag({ service }: { service: 'A&T' | 'SEM' }) {
  // Both services share the same purple chip — the brand A&T cyan
  // tag was retired across the build for consistency with SEM, so
  // the tag family reads as one shape distinguished only by the
  // letter label. Same treatment applied in EmployeesOverview /
  // Dashboard / AllClients / CLAClients.
  return (
    <span className={`text-caption font-medium px-1.5 py-0.5 rounded ${
      service === 'SEM' ? 'bg-purple-50 text-[#7C3AED]' : 'bg-purple-50 text-[#7C3AED]'
    }`}>{service}</span>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1,2,3,4,5].map(s => (
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

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER BODIES
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. Active Customers ──────────────────────────────────────────────────────

function ActiveDrawerBody({
  data,
  trend,
  clients,
  service,
  setService,
}: {
  data: { total: number; at: number; sem: number; change: number; prevTotal: number };
  trend: { month: string; total: number; at: number; sem: number }[];
  clients: { client: string; service: 'A&T' | 'SEM'; hod: string; billing: number; since: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
}) {
  const filtered = service === 'All' ? clients : clients.filter(c => c.service === service);
  const momPct = data.prevTotal > 0 ? ((data.total - data.prevTotal) / data.prevTotal) * 100 : 0;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{momPct.toFixed(1)}% vs Mar
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Net portfolio is growing', text: `Customer base expanded by ${data.change} this month — driven primarily by SEM (+${data.sem - 50}) with A&T flat.` },
        { label: 'Service mix is roughly balanced', text: `${data.at} A&T (${Math.round((data.at / data.total) * 100)}%) and ${data.sem} SEM (${Math.round((data.sem / data.total) * 100)}%). SEM continues to be the larger book.` },
        { label: 'Watch for retention pressure', text: 'Net growth assumes the 6 lost clients in April don\'t accelerate next month — see Lost Customers and CLA cards for risk signals.' },
      ]} />

      <DrawerSectionTitle title="6-month trend" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="at-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_AT} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_AT} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="sem-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_SEM} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_SEM} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-[#06B6D4] font-semibold">A&amp;T: {payload.find(p => p.dataKey === 'at')?.value}</p>
                  <p className="text-[#7C3AED] font-semibold">SEM: {payload.find(p => p.dataKey === 'sem')?.value}</p>
                </div>
              ) : null}
            />
            <Area type="monotone" dataKey="at" stackId="1" stroke={C_AT} fill="url(#at-grad)" strokeWidth={2} />
            <Area type="monotone" dataKey="sem" stackId="1" stroke={C_SEM} fill="url(#sem-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title="Active client list"
        right={<ServiceFilterSelect id="active-service" value={service} onChange={setService} />}
      />
      <DrawerTable
        ariaLabel="Active clients"
        head={['Client', 'Service', 'HOD', 'Billing', 'Since']}
        rows={filtered.map((c) => [
          <span key="c" className="text-body font-medium text-black/80">{c.client}</span>,
          <ServiceTag key="s" service={c.service} />,
          <span key="h" className="text-caption text-black/65">{c.hod}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
          <span key="d" className="text-caption text-black/55">{c.since}</span>,
        ])}
        align={['left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 2. Lost Customers ────────────────────────────────────────────────────────

function LostDrawerBody({
  data,
  trend,
  exits,
  service,
  setService,
  onViewAll,
}: {
  data: { total: number; at: number; sem: number; change: number; prevTotal: number; revLost: number };
  trend: { month: string; at: number; sem: number; total: number }[];
  exits: { client: string; service: 'A&T' | 'SEM'; reason: string; billing: number; exitDate: string; hod: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  onViewAll: () => void;
}) {
  const filtered = service === 'All' ? exits : exits.filter(e => e.service === service);
  const totalRevLost = filtered.reduce((s, e) => s + e.billing, 0);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-[#E2445C]">{data.total}</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {Math.abs(data.change)}% vs Mar ({data.prevTotal})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Direction is improving', text: `Loss is down 25% from March (${data.prevTotal} → ${data.total}). Three months of declines would confirm a real trend; one month doesn't.` },
        { label: 'SEM is over-represented', text: `${data.sem} of ${data.total} exits came from SEM. SEM has more clients, but the share of losses is still heavier — see the Top Churn Reason card for the dominant exit driver.` },
        { label: 'Revenue impact this month', text: `${formatLakh(data.revLost)} of monthly billing walked out the door. Use the table below to see which accounts and which reasons.` },
      ]} />

      <DrawerSectionTitle title="6-month loss trend by service" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-[#06B6D4] font-semibold">A&amp;T: {payload.find(p => p.dataKey === 'at')?.value}</p>
                  <p className="text-[#7C3AED] font-semibold">SEM: {payload.find(p => p.dataKey === 'sem')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="at" stackId="1" fill={C_AT} radius={[0, 0, 0, 0]} />
            <Bar dataKey="sem" stackId="1" fill={C_SEM} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Exits — ${filtered.length} client${filtered.length === 1 ? '' : 's'}, ${formatLakh(totalRevLost)} lost`}
        right={
          <>
            <ServiceFilterSelect id="lost-service" value={service} onChange={setService} />
            {/* View all lost clients CTA — promoted from the drawer
                footer to sit next to the service dropdown so the
                primary action lives at the top of the table the
                admin is already scanning. Same pattern as Onboarding,
                Top Churn Reason, and Customer Ratings drawers. */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View all lost clients
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Customer exits"
        head={['Client', 'Reason', 'Service', 'HOD', 'Billing', 'Exit']}
        rows={filtered.map((e) => [
          <span key="c" className="text-body font-medium text-black/80">{e.client}</span>,
          <span key="r" className="text-caption text-black/65">{e.reason}</span>,
          <ServiceTag key="s" service={e.service} />,
          <span key="h" className="text-caption text-black/65">{e.hod}</span>,
          <span key="b" className="text-caption font-semibold text-[#E2445C] tabular-nums">{formatLakh(e.billing)}/mo</span>,
          <span key="d" className="text-caption text-black/55">{e.exitDate}</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 3. Attrition Rate ────────────────────────────────────────────────────────

function AttritionDrawerBody({
  data,
  trend,
  hodProfiles,
  hod,
  setHod,
  exits,
  onViewAll,
}: {
  data: { rate: number; prevRate: number; atRate: number; semRate: number; target: number };
  trend: { month: string; rate: number; at: number; sem: number }[];
  hodProfiles: { id: string; name: string; service: string; color: string }[];
  hod: string;
  setHod: (v: string) => void;
  exits: { client: string; service: 'A&T' | 'SEM'; reason: string; billing: number; exitDate: string; hod: string }[];
  onViewAll: () => void;
}) {
  const isAll = hod === 'all';
  const selectedHod = hodProfiles.find(h => h.id === hod);
  // Map row-level "Chinmay P." → hod id "chinmay" for filtering.
  const hodNameToId = (name: string) => name.toLowerCase().split(' ')[0];
  const filteredExits = isAll ? exits : exits.filter(e => hodNameToId(e.hod) === hod);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-[#E2445C]">{data.rate}%</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {(data.prevRate - data.rate).toFixed(1)}% vs Mar ({data.prevRate}%)
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${data.rate > data.target ? 'Above' : 'On'} the ${data.target}% target`, text: `Current rate is ${data.rate}% — ${(data.rate - data.target).toFixed(1)}% ${data.rate > data.target ? 'over' : 'under'} our internal target. The MoM improvement is real, but we're still in the watch zone.` },
        { label: 'SEM drives the gap', text: `A&T attrition is ${data.atRate}% (under target), SEM is ${data.semRate}% (well over). The SEM cohort is doing most of the lifting against the company average.` },
        { label: 'Last month was a spike, not a baseline', text: 'March hit 8.1% — a one-month outlier. April reverts toward the prior trend, but two more months at this level are needed to confirm normalisation.' },
      ]} />

      <DrawerSectionTitle title="6-month attrition rate (%) with target" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} unit="%" />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-[#E2445C] font-semibold">{payload[0]?.value}% rate</p>
                </div>
              ) : null}
            />
            <ReferenceLine y={data.target} stroke="#00C875" strokeDasharray="4 4" strokeWidth={1.5}>
              <></>
            </ReferenceLine>
            <Bar dataKey="rate" radius={[6, 6, 0, 0]} barSize={32}>
              {trend.map((d, idx) => (
                <Cell key={idx} fill={d.rate > data.target ? RED : GREEN} opacity={idx === trend.length - 1 ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={isAll ? 'Recent exits across all HODs' : `Recent exits — ${selectedHod?.name}`}
        right={
          <>
            <HodFilterSelect id="attrition-hod" value={hod} onChange={setHod} hodProfiles={hodProfiles} />
            {/* View attrition report CTA — promoted from the drawer
                footer to sit next to the HOD dropdown so the
                primary action lives at the top of the table the
                admin is already scanning. Same pattern as the four
                other drawers (Onboarding / Churn / Ratings / Lost). */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View attrition report
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Recent exits by HOD"
        head={['Client', 'Reason', 'Service', 'HOD', 'Billing', 'Exit']}
        rows={filteredExits.map((e) => [
          <span key="c" className="text-body font-medium text-black/80">{e.client}</span>,
          <span key="r" className="text-caption text-black/65">{e.reason}</span>,
          <ServiceTag key="s" service={e.service} />,
          <span key="h" className="text-caption text-black/65">{e.hod}</span>,
          <span key="b" className="text-caption font-semibold text-[#E2445C] tabular-nums">{formatLakh(e.billing)}/mo</span>,
          <span key="d" className="text-caption text-black/55">{e.exitDate}</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 4. Customer Ratings ──────────────────────────────────────────────────────

function RatingsDrawerBody({
  data,
  distribution,
  ratings,
  service,
  setService,
  onViewAll,
}: {
  data: { avg: number; prevAvg: number; atAvg: number; semAvg: number; total: number; lowCount: number };
  distribution: { stars: string; count: number }[];
  ratings: { client: string; service: 'A&T' | 'SEM'; rating: number; feedback: string; date: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  onViewAll: () => void;
}) {
  const filtered = service === 'All' ? ratings : ratings.filter(r => r.service === service);
  const filteredAvg = filtered.length > 0 ? filtered.reduce((s, r) => s + r.rating, 0) / filtered.length : 0;
  const filteredLow = filtered.filter(r => r.rating <= 2).length;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={
          <span className="flex items-baseline gap-2">
            <span className="tabular-nums">{data.avg.toFixed(1)}</span>
            <Star className="w-7 h-7 self-center" fill={AMBER} stroke={AMBER} aria-hidden="true" />
          </span>
        }
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {(data.prevAvg - data.avg).toFixed(1)} vs Mar ({data.prevAvg.toFixed(1)})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'A&T leads on satisfaction', text: `A&T averages ${data.atAvg.toFixed(1)}★ — half a star ahead of SEM (${data.semAvg.toFixed(1)}★). SEM is dragging the blended average down.` },
        { label: `${data.lowCount} accounts in the danger zone`, text: `${data.lowCount} of ${data.total} clients rated 2★ or below. Bio Basket and SparkEdge Media are the immediate flight risks — see the table for context.` },
        { label: 'Small sample, big signal', text: `${data.total} responses isn't a survey panel — it's the most recent feedback. Treat individual scores as anecdotal, but the SEM/A&T gap has been consistent for 3 months.` },
      ]} />

      <DrawerSectionTitle title="Rating distribution" />
      <div className="px-7 pb-6 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
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
              {distribution.map((d, idx) => {
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
        right={
          <>
            <ServiceFilterSelect id="ratings-service" value={service} onChange={setService} />
            {/* View all feedback CTA — promoted from the drawer
                footer to sit next to the service dropdown so the
                primary action lives at the top of the table the
                admin is already scanning. Same pattern as Onboarding
                and Top Churn Reason drawers for visual consistency. */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View all feedback
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Customer feedback"
        head={['Client', 'Rating', 'Feedback', 'Service', 'Date']}
        rows={filtered.map((r) => [
          <span key="c" className="text-body font-medium text-black/80">{r.client}</span>,
          <StarRow key="r" rating={r.rating} />,
          <span key="f" className="text-caption text-black/60 line-clamp-2 leading-relaxed">{r.feedback}</span>,
          <ServiceTag key="s" service={r.service} />,
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
  data,
  trend,
  incidents,
  hodProfiles,
  hod,
  setHod,
  severity,
  setSeverity,
  onViewAll,
}: {
  data: { total: number; prevTotal: number; critical: number; high: number; medium: number; at: number; sem: number };
  trend: { month: string; critical: number; high: number; medium: number }[];
  incidents: { id: string; client: string; service: 'A&T' | 'SEM'; severity: 'Critical' | 'High' | 'Medium'; category: string; daysOpen: number; hod: string; description: string }[];
  hodProfiles: { id: string; name: string; service: string }[];
  hod: string;
  setHod: (v: string) => void;
  severity: 'All' | 'Critical' | 'High' | 'Medium';
  setSeverity: (v: 'All' | 'Critical' | 'High' | 'Medium') => void;
  onViewAll: () => void;
}) {
  const filtered = incidents
    .filter(i => hod === 'all' || i.hod === hod)
    .filter(i => severity === 'All' || i.severity === severity);
  const change = data.total - data.prevTotal;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold ${change <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-[#E2445C]'}`}>
            {change <= 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
            {change >= 0 ? '+' : ''}{change} vs last week
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Critical count is the headline number', text: `${data.critical} critical incidents are open right now — these are leadership-escalation territory and need same-day attention. ${data.high} more are high-severity.` },
        { label: 'SEM is generating most issues', text: `${data.sem} of ${data.total} open incidents sit on the SEM book. ROAS drops, budget overspend, and campaign errors dominate the categories.` },
        { label: 'Time-to-resolve is the real metric', text: 'Two critical incidents have been open more than a week (Nor Black Nor White, Greenfield Exports). Anything past the 7-day mark warrants a status update for the client today.' },
      ]} />

      <DrawerSectionTitle title="6-month incident trend by severity" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-[#E2445C] font-semibold">Critical: {payload.find(p => p.dataKey === 'critical')?.value}</p>
                  <p className="text-[#FDAB3D] font-semibold">High: {payload.find(p => p.dataKey === 'high')?.value}</p>
                  <p className="text-black/65 font-semibold">Medium: {payload.find(p => p.dataKey === 'medium')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="critical" stackId="1" fill={RED} />
            <Bar dataKey="high" stackId="1" fill={AMBER} />
            <Bar dataKey="medium" stackId="1" fill="#9CA3AF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Open incidents — ${filtered.length}`}
        right={
          <>
            <SeverityFilterSelect value={severity} onChange={setSeverity} />
            <HodFilterSelect id="incidents-hod" value={hod} onChange={setHod} hodProfiles={hodProfiles} />
            {/* View all incidents CTA — promoted from the drawer
                footer to sit next to the filter cluster so the
                primary action lives at the top of the table the
                admin is already scanning. Same pattern as the five
                other drawers (Onboarding / Churn / Ratings / Lost /
                Attrition). */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View all incidents
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Open incidents"
        head={['Client / Issue', 'Category', 'Severity', 'Service', 'Days open']}
        rows={filtered.map((i) => [
          <div key="c" className="min-w-0">
            <p className="text-body font-medium text-black/80">{i.client}</p>
            <p className="text-caption text-black/55 line-clamp-1 mt-0.5">{i.description}</p>
          </div>,
          <span key="cat" className="text-caption text-black/60">{i.category}</span>,
          <span key="sev" className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
            i.severity === 'Critical' ? 'bg-rose-50 text-rose-600'
            : i.severity === 'High' ? 'bg-amber-50 text-amber-700'
            : 'bg-black/[0.04] text-black/55'
          }`}>{i.severity}</span>,
          <ServiceTag key="s" service={i.service} />,
          <span key="d" className={`text-caption font-semibold tabular-nums ${i.daysOpen >= 7 ? 'text-[#E2445C]' : 'text-black/65'}`}>{i.daysOpen}d</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].severity === 'Critical' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'right']}
      />
    </>
  );
}

function SeverityFilterSelect({
  value,
  onChange,
}: {
  value: 'All' | 'Critical' | 'High' | 'Medium';
  onChange: (v: 'All' | 'Critical' | 'High' | 'Medium') => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="incidents-severity" className="sr-only">Filter by severity</label>
      {/* Height + roundness aligned with the brand-blue CTA button
          (h-9 / rounded-md) and the other section-title pickers, so
          the cluster reads as one rhythm of identically-shaped
          pills. */}
      <select
        id="incidents-severity"
        value={value}
        onChange={(e) => onChange(e.target.value as typeof value)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All severity</option>
        <option value="Critical">Critical only</option>
        <option value="High">High only</option>
        <option value="Medium">Medium only</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

// ─── 6. Onboarding Pipeline ───────────────────────────────────────────────────
// Per the design critique: the trend story is too thin for a chart. Use a
// stats block instead — Pending, Done, Stuck >7d, Avg days to first kickoff.

function OnboardingDrawerBody({
  data,
  clients,
  service,
  setService,
  onViewAll,
}: {
  data: { total: number; pending: number; done: number; stuck: number; avgDays: number; at: number; sem: number };
  clients: { client: string; service: 'A&T' | 'SEM'; status: 'Pending' | 'Done'; days: number; assignee: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  onViewAll: () => void;
}) {
  const filtered = service === 'All' ? clients : clients.filter(c => c.service === service);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {data.stuck} stuck &gt; 7 days
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Two new clients are stalled', text: `Nor Black Nor White (12 days) and Enagenbio (8 days) are still in onboarding without an assignee. Both will start eroding goodwill before they generate any revenue.` },
        { label: 'Onboarding split mirrors the active book', text: `${data.at} A&T and ${data.sem} SEM clients in pipeline — same ratio as the active customer base. No service is bottlenecked relative to its growth.` },
        { label: `Avg ${data.avgDays} days to kickoff is the bar to beat`, text: `Done deals took an average of ${data.avgDays} days. Pending items beyond that mean something specific went wrong — usually unassigned ownership or missing client documents.` },
      ]} />

      <DrawerSectionTitle title="At a glance" />
      <div className="px-7 pb-5">
        <div className="grid grid-cols-4 gap-3">
          <StatBlock label="Pending" value={data.pending} accent={RED} accentBg="bg-rose-50/60" />
          <StatBlock label="Done" value={data.done} accent={GREEN} accentBg="bg-emerald-50/60" />
          <StatBlock label="Stuck > 7d" value={data.stuck} accent={AMBER} accentBg="bg-amber-50/60" />
          <StatBlock label="Avg days" value={`${data.avgDays}d`} accent={BLUE} accentBg="bg-blue-50/60" />
        </div>
      </div>

      <DrawerSectionTitle
        title={`Pipeline — ${filtered.length}`}
        right={
          <>
            <ServiceFilterSelect id="onboarding-service" value={service} onChange={setService} />
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View all onboarding
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Onboarding pipeline"
        head={['Client', 'Service', 'Assignee', 'Status', 'Days']}
        rows={filtered.map((o) => [
          <span key="c" className="text-body font-medium text-black/80">{o.client}</span>,
          <ServiceTag key="s" service={o.service} />,
          <span key="a" className={`text-caption ${o.assignee === 'Unassigned' ? 'text-[#E2445C] font-semibold' : 'text-black/65 font-medium'}`}>{o.assignee}</span>,
          <span key="st" className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
            o.status === 'Done' ? 'bg-[#00C875]/[0.08] text-[#00C875]' : 'bg-[#E2445C]/[0.08] text-[#E2445C]'
          }`}>{o.status}</span>,
          <span key="d" className={`text-caption font-semibold tabular-nums ${o.status === 'Pending' && o.days > 7 ? 'text-[#E2445C]' : 'text-black/65'}`}>{o.days}d</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right']}
      />
    </>
  );
}

function StatBlock({ label, value, accent, accentBg }: { label: string; value: React.ReactNode; accent: string; accentBg: string }) {
  return (
    <div className={`rounded-xl border border-black/[0.06] ${accentBg} px-4 py-3.5`}>
      <p className="text-caption text-black/55 font-medium mb-1.5">{label}</p>
      <p className="text-h2 font-bold tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

// ─── 7. At-Risk (CLA) ─────────────────────────────────────────────────────────

function ClaDrawerBody({
  data,
  trend,
  clients,
  hodProfiles,
  service,
  setService,
  hod,
  setHod,
  formatLakh,
  onViewAll,
}: {
  data: { total: number; prevTotal: number; sureshot: number; saveable: number; revAtRisk: number; at: number; sem: number };
  trend: { month: string; sureshot: number; saveable: number }[];
  clients: { client: string; service: 'A&T' | 'SEM'; claStatus: 'sureshot' | 'can-be-saved'; reason: string; responsible: string; hod: string; billing: number }[];
  hodProfiles: { id: string; name: string; service: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  hod: string;
  setHod: (v: string) => void;
  formatLakh: (v: number) => string;
  onViewAll: () => void;
}) {
  const filtered = clients
    .filter(c => service === 'All' || c.service === service)
    .filter(c => hod === 'all' || c.hod === hod);
  const filteredRevAtRisk = filtered.reduce((s, c) => s + c.billing, 0);
  const change = data.total - data.prevTotal;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-[#E2445C]">{data.total}</span>}
        delta={
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold ${change <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-[#E2445C]'}`}>
            {change <= 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <ArrowUp className="w-3.5 h-3.5" />}
            {change >= 0 ? '+' : ''}{change} vs last week · {formatLakh(data.revAtRisk)} at risk
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${data.sureshot} sureshot exits to plan around`, text: `Bio Basket, FRR (BLOGS), and July Issue have effectively given notice. Treat their pipeline contribution as already gone — focus saveable energy elsewhere.` },
        { label: `${data.saveable} accounts still in play`, text: `Five clients are flagged but not lost. SparkEdge and Greenfield are the two with clearest paths back — invoice resolution and a relationship reset, respectively.` },
        { label: `${formatLakh(data.revAtRisk)} of revenue exposure`, text: `If every CLA exits, monthly billing drops by ${formatLakh(data.revAtRisk)}. Sureshot accounts alone represent ${formatLakh(clients.filter(c => c.claStatus === 'sureshot').reduce((s, c) => s + c.billing, 0))}.` },
      ]} />

      <DrawerSectionTitle title="6-month CLA trend by severity" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} '26</p>
                  <p className="text-[#E2445C] font-semibold">Sureshot: {payload.find(p => p.dataKey === 'sureshot')?.value}</p>
                  <p className="text-[#00C875] font-semibold">Saveable: {payload.find(p => p.dataKey === 'saveable')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="sureshot" stackId="1" fill={RED} />
            <Bar dataKey="saveable" stackId="1" fill={GREEN} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`At-risk accounts — ${filtered.length}, ${formatLakh(filteredRevAtRisk)} exposure`}
        right={
          <>
            <ServiceFilterSelect id="cla-service" value={service} onChange={setService} />
            <HodFilterSelect id="cla-hod" value={hod} onChange={setHod} hodProfiles={hodProfiles} />
            {/* View all CLAs CTA — promoted from the drawer footer
                to sit next to the filter cluster so the primary
                action lives at the top of the table the admin is
                already scanning. Same pattern as the six other
                drawers (Onboarding / Churn / Ratings / Lost /
                Attrition / Incidents). */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View all CLAs
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="At-risk clients"
        head={['Client / Reason', 'Service', 'Owner', 'Billing', 'Status']}
        rows={filtered.map((c) => [
          <div key="c" className="min-w-0">
            <p className="text-body font-medium text-black/80">{c.client}</p>
            <p className="text-caption text-black/55 line-clamp-1 mt-0.5">{c.reason}</p>
          </div>,
          <ServiceTag key="s" service={c.service} />,
          <span key="o" className="text-caption font-medium text-black/65">{c.responsible}</span>,
          <span key="b" className="text-caption font-semibold text-black/75 tabular-nums">{formatLakh(c.billing)}/mo</span>,
          <span key="st" className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
            c.claStatus === 'sureshot'
              ? 'bg-[#E2445C]/[0.08] text-[#E2445C]'
              : 'bg-[#00C875]/[0.08] text-[#00C875]'
          }`}>{c.claStatus === 'sureshot' ? 'Sureshot' : <span className="whitespace-nowrap">Can be saved</span>}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].claStatus === 'sureshot' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 8. Top Churn Reason ──────────────────────────────────────────────────────

function ChurnReasonDrawerBody({
  data,
  exits,
  service,
  setService,
  formatLakh,
  onViewAll,
}: {
  data: { topReason: string; topPct: number; totalExits: number; atTop: string; semTop: string };
  exits: { client: string; service: 'A&T' | 'SEM'; reason: string; billing: number; exitDate: string; hod: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  formatLakh: (v: number) => string;
  onViewAll: () => void;
}) {
  const filtered = service === 'All' ? exits : exits.filter(e => e.service === service);

  // The "Exits by reason" aggregate (group-by-reason count + revenue
  // + percent) used to drive a horizontal-bar chart between the
  // insights and the Detail table. The chart has been retired in
  // favour of just the Detail table, so the aggregation is no
  // longer computed here. Re-introduce it if a "Reasons" summary
  // ever comes back to this drawer.

  return (
    <>
      <DrawerHero
        label="Last 6 months · Apr 2026"
        value={<span className="text-h1">{data.topReason}</span>}
        delta={<DeltaPill direction="neutral" value={`${data.topPct}%`} suffix="" label={`of ${data.totalExits} exits`} />}
      />

      <DrawerInsights items={[
        { label: 'Performance is the #1 exit driver', text: `"Poor ROAS / Results" accounts for one in three exits — concentrated entirely in SEM. The fix is a campaign performance review on every account scoring under 4★.` },
        { label: 'A&T loses on price, SEM loses on outcomes', text: `A&T's most common exit reason is "Budget Constraints" (price-driven). SEM's is "Poor ROAS" (delivery-driven). Two completely different remediation playbooks.` },
        { label: 'High-value losses are concentrated', text: `The single biggest loss this period was Patel Constructions (₹1.5L/mo) on "Business Closure" — outside our control. Excluding it, exits skew toward smaller accounts.` },
      ]} />

      {/* "Exits by reason" horizontal-bar chart removed — the same
          information is fully readable from the Detail table below
          (every row has the reason, billing, and exit date), and
          the chart was the most visually heavy block in the drawer
          for the smallest amount of unique signal. The Detail
          table now sits directly beneath the editorial insights. */}

      <DrawerSectionTitle
        title={`Detail — ${filtered.length} exits`}
        right={
          <>
            <ServiceFilterSelect id="churn-service" value={service} onChange={setService} />
            {/* View Exit Feedback CTA — promoted from the drawer
                footer to sit next to the service dropdown so the
                primary action lives at the top of the table the
                admin is already scanning. Same visual treatment
                as the Onboarding drawer's "View all onboarding"
                button for consistency. */}
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              View Exit Feedback
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        }
      />
      <DrawerTable
        ariaLabel="Exit detail by reason"
        head={['Client', 'Reason', 'Service', 'HOD', 'Billing', 'Exit']}
        rows={filtered.map((e) => [
          <span key="c" className="text-body font-medium text-black/80">{e.client}</span>,
          <span key="r" className="text-caption text-black/65">{e.reason}</span>,
          <ServiceTag key="s" service={e.service} />,
          <span key="h" className="text-caption text-black/65">{e.hod}</span>,
          <span key="b" className="text-caption font-semibold text-[#E2445C] tabular-nums">{formatLakh(e.billing)}/mo</span>,
          <span key="d" className="text-caption text-black/55">{e.exitDate}</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED DRAWER TABLE
// ══════════════════════════════════════════════════════════════════════════════

function DrawerTable({
  ariaLabel,
  head,
  rows,
  align,
  rowHighlight,
}: {
  ariaLabel: string;
  head: string[];
  rows: React.ReactNode[][];
  align: ('left' | 'right')[];
  rowHighlight?: (idx: number) => string;
}) {
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
              {rows.map((cells, ridx) => (
                <tr key={ridx} className={`hover:bg-black/[0.015] transition-colors ${rowHighlight ? rowHighlight(ridx) : ''}`}>
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
      </div>
    </div>
  );
}
