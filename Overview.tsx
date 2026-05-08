'use client';
import { Users, Briefcase, TrendingUp, ChevronDown, ArrowUp, ArrowDown, Target, Percent, TrendingDown, AlertCircle, CheckCircle, User, Lightbulb, ChevronRight, ChevronLeft, Award, AlertTriangle, ArrowRight, UserMinus, DollarSign, ShoppingCart, BarChart3, Clock, Repeat, X, Info, Receipt } from 'lucide-react';
import { TeamHoverPopover } from '@/components/team-hover-popover';
import { ClientsHoverPopover } from '@/components/clients-hover-popover';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Line, LineChart, ComposedChart } from 'recharts';
import { marginReportData } from '@/lib/data/margin-report-data';
import { clientMarginData, type ClientMarginEntry } from '@/lib/data/client-margin-data';
import { NetGrowthAttritionTable, type MonthlyClientValue } from '@/NetGrowthAttritionTable';

// ── CLA/NTF Data ──────────────────────────────────────────────────────────────

interface ClientNomination {
  client: string;
  reason: string;
  claStatus: 'sureshot' | 'can-be-saved';
  responsible: string;
}

interface EmployeeNomination {
  employee: string;
  initials: string;
  color: string;
  reason: string;
  dateAdded: string;
  clients: string[];
  /**
   * CLA = Can Lose Anytime (retention risk — could exit the company).
   * NTF = Not Tracking Fine (performance / delivery quality concern).
   */
  type: 'cla' | 'ntf';
}

const clientNominations: ClientNomination[] = [
  { client: 'Bio Basket', reason: 'ROAS dropped 40% over 2 months, unresponsive to strategy changes', claStatus: 'sureshot', responsible: 'Chinmay P.' },
  { client: 'Valiente Caps', reason: 'Budget cuts planned, considering in-house marketing', claStatus: 'can-be-saved', responsible: 'Harshal R.' },
  { client: 'Green Valley Enterprises', reason: 'Missed 2 compliance deadlines, trust eroding', claStatus: 'can-be-saved', responsible: 'Zubear S.' },
  { client: 'FRR (BLOGS)', reason: 'No engagement in 30 days, all tasks stalled', claStatus: 'sureshot', responsible: 'Mihir L.' },
  { client: 'Meeami Fashion', reason: 'Competitor offering lower rates, exploring options', claStatus: 'can-be-saved', responsible: 'Chinmay P.' },
];

const employeeNominations: EmployeeNomination[] = [
  { employee: 'Harshal R.', initials: 'HR', color: '#10B981', reason: 'Consistent missed deadlines across accounts',  dateAdded: '01 Apr', clients: ['Bio Basket', 'Valiente Caps', '99 Pancakes'],            type: 'ntf' },
  { employee: 'Mihir L.',   initials: 'ML', color: '#F59E0B', reason: 'Slow response time, client escalations rising', dateAdded: '28 Mar', clients: ['FRR (BLOGS)', 'Green Valley'],                          type: 'cla' },
  { employee: 'Chinmay P.', initials: 'CP', color: '#7C3AED', reason: 'Below target ROAS on 3 accounts',                dateAdded: '25 Mar', clients: ['Bio Basket', 'Meeami Fashion', 'Valiente Caps', 'July Issue'], type: 'ntf' },
  { employee: 'Zubear S.',  initials: 'ZS', color: '#06B6D4', reason: 'Compliance filings delayed twice in Q1',         dateAdded: '30 Mar', clients: ['Green Valley', 'Bilawala & Co'],                       type: 'cla' },
];

// ── Outstanding accounts — feeds the Outstanding Dues drawer table.
//    Each row is one client × the dues we haven't collected yet, with
//    days-overdue (since the invoice's due date) carrying the urgency
//    signal. Buckets:
//      • 0–30 days   → Current — within standard payment cycle
//      • 31–60 days  → Overdue — first chase
//      • 61–90 days  → Critical — escalation
//      • 90+ days    → At Risk — likely write-off candidate
//    Top 8 accounts pulled from BillingDirectory (Urban Living,
//    Sunrise Retail, Acme Logistics, BookMyTrip, Digital Dynamics,
//    Atlas Capital, Marathon Industries, Rajan Group) so the drawer
//    table reads consistently with the dedicated Billing &
//    Subscriptions module — same client names, same outstanding
//    figures, same service tags.
interface OutstandingAccount {
  client: string;
  contact: string;
  service: 'A&T' | 'SEM' | 'Both';
  amount: number;        // Outstanding rupees
  daysOverdue: number;   // Days past the invoice due date
  lastPayment: string | null; // 'dd MMM' or null if never paid
  status: 'Active' | 'Inactive';
}
const outstandingAccounts: OutstandingAccount[] = [
  { client: 'Sunrise Retail',      contact: 'Neha Kapoor',     service: 'SEM',  amount: 200000, daysOverdue: 92, lastPayment: '04 Feb', status: 'Inactive' },
  { client: 'Urban Living',        contact: 'Sameer Joshi',    service: 'Both', amount: 220000, daysOverdue: 67, lastPayment: '02 Mar', status: 'Active'   },
  { client: 'Acme Logistics',      contact: 'Rahul Desai',     service: 'Both', amount: 195000, daysOverdue: 45, lastPayment: '20 Mar', status: 'Active'   },
  { client: 'BookMyTrip',          contact: 'Manish Agarwal',  service: 'Both', amount: 180000, daysOverdue: 38, lastPayment: '27 Mar', status: 'Active'   },
  { client: 'Digital Dynamics',    contact: 'Pooja Bansal',    service: 'SEM',  amount: 175000, daysOverdue: 28, lastPayment: '06 Apr', status: 'Active'   },
  { client: 'Atlas Capital',       contact: 'Anand Mehta',     service: 'A&T',  amount: 140000, daysOverdue: 22, lastPayment: '12 Apr', status: 'Active'   },
  { client: 'Marathon Industries', contact: 'Suresh Joshi',    service: 'A&T',  amount: 115000, daysOverdue: 18, lastPayment: '16 Apr', status: 'Active'   },
  { client: 'Rajan Group',         contact: 'Devansh Khanna',  service: 'A&T',  amount: 110000, daysOverdue: 12, lastPayment: '22 Apr', status: 'Active'   },
];

/** Standard accounts-receivable ageing bucket for a days-overdue
 *  value. Four buckets, exactly matching how AR teams report
 *  receivables across the industry — 0-30 / 31-60 / 61-90 / 90+. */
type AgeingBucket = '0-30' | '31-60' | '61-90' | '90+';
function billingBucket(daysOverdue: number): AgeingBucket {
  if (daysOverdue >= 90) return '90+';
  if (daysOverdue >= 60) return '61-90';
  if (daysOverdue >= 30) return '31-60';
  return '0-30';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OverviewProps {
  globalDateRange?: 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';
  globalDepartment?: 'All' | 'Finance' | 'Performance Marketing';
}

export function Overview({ globalDateRange = 'ytd', globalDepartment = 'All' }: OverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminland = pathname.startsWith('/adminland');
  const baseRoute = isAdminland ? '/adminland/reports' : '/home';
  const onNavigate = (tab: 'attrition' | 'cla' | 'growth' | 'sales') => {
    const map: Record<string, string> = { attrition: `${baseRoute}/attrition`, cla: `${baseRoute}/cla`, growth: `${baseRoute}/growth-pl`, sales: `${baseRoute}/sales` };
    router.push(map[tab]);
  };
  const onNavigateToAdminland = () => router.push('/adminland');

  // ── KPI Data ──────────────────────────────────────────────────────────────
  // 1. Active MRR
  const activeMRR = { total: 6000000, at: 2800000, sem: 3200000, change: 12.5 };

  // 2. Active Customers (service-wise)
  const activeCustomers = { total: 90, at: 38, sem: 52, change: 6 };

  // 3. Kickoff (service-wise)
  const kickoffs = { total: 7, at: 3, sem: 4, revenue: 2100000 };

  // 4. Attrition (service-wise) — counts, rates, and revenue lost
  const attrition = { total: 6, at: 2, sem: 4, rate: 6.7, prevRate: 8.1, atRate: 5.3, semRate: 7.7, revLost: 420000 };

  // 5. AOV (service-wise)
  const aov = { blended: 66700, at: 58000, sem: 85000, change: 4.2 };

  // 6. Net Growth (service-wise) — net clients, rates, revenue impact
  const netGrowth = { total: 1, at: 1, sem: 0, rate: 1.1, prevRate: -2.4, addedRev: 490000, lostRev: 420000, added: 7, lost: 6 };

  // 7. Gross Margins (kept as-is, service-wise)
  const financeMargin = 42.5;
  const semMargin = 38.2;
  const financeCurrentRevenue = 2800000;
  const semCurrentRevenue = 3200000;
  const financeCurrentCost = financeCurrentRevenue * (1 - financeMargin / 100);
  const semCurrentCost = semCurrentRevenue * (1 - semMargin / 100);
  const grossRevenue = financeCurrentRevenue + semCurrentRevenue;
  const grossCost = financeCurrentCost + semCurrentCost;
  const grossMargin = grossRevenue - grossCost;
  const grossMarginPercent = (grossMargin / grossRevenue) * 100;

  // 8. CAC (service-wise)
  const cac = { blended: 18000, at: 14000, sem: 22000, change: -8.3 };

  // 9. LTV (service-wise) — avg lifetime value per client
  const ltv = { blended: 396000, at: 348000, sem: 510000 };

  // 10. CAC : LTV ratio (derived)
  const cacLtv = {
    blended: parseFloat((ltv.blended / cac.blended).toFixed(1)),
    at: parseFloat((ltv.at / cac.at).toFixed(1)),
    sem: parseFloat((ltv.sem / cac.sem).toFixed(1)),
  };

  // 11. Hours Available (service-wise) — monthly capacity
  // Mirrors resourceData totals so the widget, the drawer table, and the
  // insights all agree: A&T (Finance) = 30 people × 160 = 4,800 hrs;
  // SEM (Performance Marketing) = 33 people × 160 = 5,280 hrs.
  const hoursAvail = { total: 10080, at: 4800, sem: 5280 };

  // 12. Revenue Available (service-wise) — unfilled capacity × AOV
  const revAvail = { total: 2400000, at: 1100000, sem: 1300000 };

  // Growth trend (for chart below KPIs)
  const growthTrend = [
    { month: 'Jul', growth: 6.5, attrition: 4.2, clientsAdded: 9, clientsLost: 6 },
    { month: 'Aug', growth: 7.8, attrition: 3.9, clientsAdded: 11, clientsLost: 5 },
    { month: 'Sep', growth: 8.5, attrition: 5.5, clientsAdded: 13, clientsLost: 8 },
    { month: 'Oct', growth: 7.2, attrition: 6.1, clientsAdded: 10, clientsLost: 9 },
    { month: 'Nov', growth: 8.9, attrition: 4.8, clientsAdded: 14, clientsLost: 7 },
    { month: 'Dec', growth: 8.2, attrition: 5.1, clientsAdded: 12, clientsLost: 7 },
  ];

  const formatLakh = (v: number) => v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` : v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

  // ── KPI Drawer System ────────────────────────────────────────────────────────
  type KpiId =
    | 'mrr' | 'customers' | 'kickoff' | 'attrition'
    | 'aov' | 'net-growth' | 'margins' | 'cac'
    | 'ltv' | 'cac-ltv' | 'hours' | 'rev-avail'
    // Relationship + health widgets (row 4):
    | 'client-rel'       // Client Relationships — health distribution
    | 'at-risk-client'   // At-risk Clients (CLA) — sureshot + saveable
    | 'at-risk-emp'      // Employee CLA — employees on watchlist
    | 'billing';         // Outstanding Dues — receivables across the book
  // Drawer period uses the SAME value set as the home top-bar's Date Range
  // dropdown (see ReportsChrome). Keeping these aligned means a user who
  // changes the home filter sees the same period reflected in every KPI
  // drawer they open afterward — no surprise "why did this revert?" moments.
  type DrawerPeriod = 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';

  // Labels match the home top bar exactly so the two dropdowns feel like
  // one control surfaced in two places.
  const drawerPeriodLabels: Record<DrawerPeriod, string> = {
    ytd: 'YTD',
    mtd: 'MTD',
    weekly: 'Weekly',
    daily: 'Daily',
    q1: 'Q1',
    q2: 'Q2',
    q3: 'Q3',
    q4: 'Q4',
  };

  const [openKPI, setOpenKPI] = useState<KpiId | null>(null);
  // Filter state for the At-risk Clients drawer table — All / Sureshot /
  // Can Be Saved. Resets to 'All' whenever the drawer reopens.
  const [claFilter, setClaFilter] = useState<'all' | 'sureshot' | 'can-be-saved'>('all');
  const [claFilterOpen, setClaFilterOpen] = useState(false);
  // Filter state for the Employee CLA drawer table — All / CLA / NTF.
  const [empFilter, setEmpFilter] = useState<'all' | 'cla' | 'ntf'>('all');
  const [empFilterOpen, setEmpFilterOpen] = useState(false);
  // Filter state for the Outstanding Dues drawer table — exactly
  // four standard accounts-receivable ageing buckets. Defaults to
  // '31-60' on every drawer open: that's the first actionable
  // collections bucket (anything younger sits inside the standard
  // payment cycle), so the admin lands on the freshest urgent pile
  // without scrubbing to it.
  const [billingFilter, setBillingFilter] = useState<AgeingBucket>('31-60');
  const [billingFilterOpen, setBillingFilterOpen] = useState(false);
  // Initialize from the home top-bar value so the very first drawer open
  // already reflects what the user picked at the page level.
  const [drawerPeriod, setDrawerPeriod] = useState<DrawerPeriod>(globalDateRange);
  const [drawerPeriodOpen, setDrawerPeriodOpen] = useState(false);

  // Re-sync drawer period whenever the home top-bar value changes. This is
  // intentionally one-way (home → drawer): once synced, the user can still
  // override the drawer locally to compare a different range, and the
  // override stays put until the home filter changes again.
  useEffect(() => {
    setDrawerPeriod(globalDateRange);
  }, [globalDateRange]);

  // Reset the At-risk Clients / Employee CLA table filters to 'All' each
  // time a drawer opens, and close the dropdowns if the drawer is
  // dismissed.
  useEffect(() => {
    if (!openKPI) {
      setClaFilterOpen(false);
      setEmpFilterOpen(false);
    }
    if (openKPI === 'at-risk-client') setClaFilter('all');
    if (openKPI === 'at-risk-emp')    setEmpFilter('all');
    if (openKPI === 'billing')        setBillingFilter('31-60');
  }, [openKPI]);

  // Active Customers drawer — pagination state for the "All active customers"
  // table. Reset to page 1 every time the drawer opens, the KPI changes, OR
  // the user picks a new period (the row set under a different period is
  // a different shape, so jumping back to "page 1" of the new view is the
  // expected mental model).
  const [customersPage, setCustomersPage] = useState(1);
  useEffect(() => { setCustomersPage(1); }, [openKPI, drawerPeriod]);

  // LTV drawer — same pagination contract as Customers. Independent
  // state because the two drawers can be opened in sequence and we
  // don't want the LTV view to land mid-page from a previous view.
  const [ltvPage, setLtvPage] = useState(1);
  useEffect(() => { setLtvPage(1); }, [openKPI, drawerPeriod]);
  const drawerRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  // Remembers which element opened the drawer so we can restore focus on close —
  // standard modal-dialog accessibility pattern (WCAG 2.4.3).
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);

  // Drawer keyboard handling — Esc to close + focus trap (Tab cycles within
  // the drawer rather than escaping into dimmed background content).
  useEffect(() => {
    if (!openKPI) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenKPI(null); setDrawerPeriodOpen(false); return; }
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

  // Move focus into the drawer when it opens; return it to the opener on close.
  useEffect(() => {
    if (openKPI) {
      drawerOpenerRef.current = (document.activeElement as HTMLElement) ?? null;
      // Wait one tick for the portal + animation to mount the close button.
      const t = window.setTimeout(() => drawerCloseBtnRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    // Drawer just closed — restore focus to whichever card opened it.
    if (drawerOpenerRef.current) {
      drawerOpenerRef.current.focus();
      drawerOpenerRef.current = null;
    }
  }, [openKPI]);

  useEffect(() => {
    if (!drawerPeriodOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) setDrawerPeriodOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [drawerPeriodOpen]);

  // Monthly trend data — 12 months for all KPIs.
  // April values are reconciled to the widget face values shown on Home;
  // March values are then back-derived so each MoM derivation in the drawer
  // matches the headline % stamped on the widget. Earlier months are seeded
  // for natural trajectories, not perfect rigor.
  // Service splits (mrrAt/mrrSem, customersAt/customersSem, etc.) carry
  // through every metric so charts can render stacked / breakdown views
  // without divergent sources of truth.
  const monthlyTrend = [
    // May'25
    { month: "May'25",
      mrr: 4350000, mrrAt: 1950000, mrrSem: 2400000,
      customers: 72, customersAt: 30, customersSem: 42,
      kickoff: 5, kickoffAt: 2, kickoffSem: 3,
      attritionCount: 3, attritionAt: 1, attritionSem: 2, attritionRate: 4.2,
      aov: 60400, aovAt: 53000, aovSem: 67000,
      netGrowth: 2, netGrowthAt: 1, netGrowthSem: 1,
      marginPct: 38.5, marginAt: 41.0, marginSem: 36.5,
      cac: 22500, cacAt: 17000, cacSem: 27000,
      ltv: 340000, ltvAt: 295000, ltvSem: 440000,
      cacLtvRatio: 15.1, hours: 7200, hoursAt: 3520, hoursSem: 3680,
      revAvail: 3100000, revAvailAt: 1450000, revAvailSem: 1650000,
      outstanding: 1000000, outstandingAt: 600000, outstandingSem: 400000 },
    // Jun'25
    { month: "Jun'25",
      mrr: 4530000, mrrAt: 2020000, mrrSem: 2510000,
      customers: 75, customersAt: 31, customersSem: 44,
      kickoff: 4, kickoffAt: 2, kickoffSem: 2,
      attritionCount: 2, attritionAt: 1, attritionSem: 1, attritionRate: 2.7,
      aov: 60400, aovAt: 53500, aovSem: 67500,
      netGrowth: 3, netGrowthAt: 1, netGrowthSem: 2,
      marginPct: 39.1, marginAt: 41.2, marginSem: 37.0,
      cac: 22000, cacAt: 16800, cacSem: 26000,
      ltv: 350000, ltvAt: 305000, ltvSem: 450000,
      cacLtvRatio: 15.9, hours: 7360, hoursAt: 3520, hoursSem: 3840,
      revAvail: 3000000, revAvailAt: 1400000, revAvailSem: 1600000,
      outstanding: 1080000, outstandingAt: 650000, outstandingSem: 430000 },
    // Jul'25
    { month: "Jul'25",
      mrr: 4760000, mrrAt: 2110000, mrrSem: 2650000,
      customers: 78, customersAt: 32, customersSem: 46,
      kickoff: 6, kickoffAt: 3, kickoffSem: 3,
      attritionCount: 4, attritionAt: 2, attritionSem: 2, attritionRate: 5.1,
      aov: 61000, aovAt: 54000, aovSem: 68000,
      netGrowth: 2, netGrowthAt: 1, netGrowthSem: 1,
      marginPct: 39.5, marginAt: 41.5, marginSem: 37.4,
      cac: 21500, cacAt: 16500, cacSem: 25500,
      ltv: 358000, ltvAt: 312000, ltvSem: 458000,
      cacLtvRatio: 16.7, hours: 7680, hoursAt: 3680, hoursSem: 4000,
      revAvail: 2900000, revAvailAt: 1350000, revAvailSem: 1550000,
      outstanding: 1150000, outstandingAt: 700000, outstandingSem: 450000 },
    // Aug'25
    { month: "Aug'25",
      mrr: 4900000, mrrAt: 2160000, mrrSem: 2740000,
      customers: 80, customersAt: 33, customersSem: 47,
      kickoff: 5, kickoffAt: 2, kickoffSem: 3,
      attritionCount: 3, attritionAt: 1, attritionSem: 2, attritionRate: 3.8,
      aov: 61300, aovAt: 54200, aovSem: 68500,
      netGrowth: 2, netGrowthAt: 1, netGrowthSem: 1,
      marginPct: 39.5, marginAt: 41.6, marginSem: 37.4,
      cac: 21000, cacAt: 16200, cacSem: 25000,
      ltv: 362000, ltvAt: 318000, ltvSem: 462000,
      cacLtvRatio: 17.2, hours: 8000, hoursAt: 3840, hoursSem: 4160,
      revAvail: 2820000, revAvailAt: 1320000, revAvailSem: 1500000,
      outstanding: 1230000, outstandingAt: 740000, outstandingSem: 490000 },
    // Sep'25
    { month: "Sep'25",
      mrr: 5040000, mrrAt: 2230000, mrrSem: 2810000,
      customers: 82, customersAt: 34, customersSem: 48,
      kickoff: 4, kickoffAt: 2, kickoffSem: 2,
      attritionCount: 5, attritionAt: 2, attritionSem: 3, attritionRate: 6.1,
      aov: 61500, aovAt: 54300, aovSem: 68800,
      netGrowth: -1, netGrowthAt: 0, netGrowthSem: -1,
      marginPct: 38.9, marginAt: 41.0, marginSem: 36.8,
      cac: 20500, cacAt: 15900, cacSem: 24500,
      ltv: 368000, ltvAt: 322000, ltvSem: 470000,
      cacLtvRatio: 17.9, hours: 8320, hoursAt: 4000, hoursSem: 4320,
      revAvail: 2780000, revAvailAt: 1300000, revAvailSem: 1480000,
      outstanding: 1300000, outstandingAt: 780000, outstandingSem: 520000 },
    // Oct'25
    { month: "Oct'25",
      mrr: 5180000, mrrAt: 2300000, mrrSem: 2880000,
      customers: 83, customersAt: 34, customersSem: 49,
      kickoff: 3, kickoffAt: 1, kickoffSem: 2,
      attritionCount: 4, attritionAt: 1, attritionSem: 3, attritionRate: 4.8,
      aov: 62400, aovAt: 55100, aovSem: 69300,
      netGrowth: -1, netGrowthAt: 0, netGrowthSem: -1,
      marginPct: 39.2, marginAt: 41.3, marginSem: 37.1,
      cac: 20200, cacAt: 15700, cacSem: 24200,
      ltv: 372000, ltvAt: 325000, ltvSem: 475000,
      cacLtvRatio: 18.4, hours: 8640, hoursAt: 4160, hoursSem: 4480,
      revAvail: 2740000, revAvailAt: 1280000, revAvailSem: 1460000,
      outstanding: 1370000, outstandingAt: 825000, outstandingSem: 545000 },
    // Nov'25
    { month: "Nov'25",
      mrr: 5320000, mrrAt: 2380000, mrrSem: 2940000,
      customers: 84, customersAt: 35, customersSem: 49,
      kickoff: 5, kickoffAt: 2, kickoffSem: 3,
      attritionCount: 3, attritionAt: 1, attritionSem: 2, attritionRate: 3.6,
      aov: 63300, aovAt: 55800, aovSem: 70200,
      netGrowth: 2, netGrowthAt: 1, netGrowthSem: 1,
      marginPct: 39.8, marginAt: 41.8, marginSem: 37.6,
      cac: 19800, cacAt: 15500, cacSem: 23800,
      ltv: 378000, ltvAt: 330000, ltvSem: 482000,
      cacLtvRatio: 19.1, hours: 8800, hoursAt: 4240, hoursSem: 4560,
      revAvail: 2680000, revAvailAt: 1250000, revAvailSem: 1430000,
      outstanding: 1280000, outstandingAt: 770000, outstandingSem: 510000 },
    // Dec'25
    { month: "Dec'25",
      mrr: 5440000, mrrAt: 2440000, mrrSem: 3000000,
      customers: 85, customersAt: 35, customersSem: 50,
      kickoff: 4, kickoffAt: 2, kickoffSem: 2,
      attritionCount: 4, attritionAt: 1, attritionSem: 3, attritionRate: 4.7,
      aov: 64000, aovAt: 56400, aovSem: 70800,
      netGrowth: 0, netGrowthAt: 0, netGrowthSem: 0,
      marginPct: 39.5, marginAt: 41.5, marginSem: 37.4,
      cac: 19500, cacAt: 15300, cacSem: 23500,
      ltv: 382000, ltvAt: 334000, ltvSem: 486000,
      cacLtvRatio: 19.6, hours: 8960, hoursAt: 4320, hoursSem: 4640,
      revAvail: 2620000, revAvailAt: 1220000, revAvailSem: 1400000,
      outstanding: 1230000, outstandingAt: 740000, outstandingSem: 490000 },
    // Jan'26
    { month: "Jan'26",
      mrr: 5560000, mrrAt: 2530000, mrrSem: 3030000,
      customers: 86, customersAt: 36, customersSem: 50,
      kickoff: 6, kickoffAt: 3, kickoffSem: 3,
      attritionCount: 5, attritionAt: 2, attritionSem: 3, attritionRate: 5.8,
      aov: 64700, aovAt: 57000, aovSem: 71500,
      netGrowth: 1, netGrowthAt: 1, netGrowthSem: 0,
      marginPct: 39.9, marginAt: 41.9, marginSem: 37.8,
      cac: 19200, cacAt: 15100, cacSem: 23200,
      ltv: 386000, ltvAt: 337000, ltvSem: 490000,
      cacLtvRatio: 20.1, hours: 9280, hoursAt: 4480, hoursSem: 4800,
      revAvail: 2560000, revAvailAt: 1190000, revAvailSem: 1370000,
      outstanding: 1380000, outstandingAt: 830000, outstandingSem: 550000 },
    // Feb'26
    { month: "Feb'26",
      mrr: 5680000, mrrAt: 2600000, mrrSem: 3080000,
      customers: 87, customersAt: 37, customersSem: 50,
      kickoff: 5, kickoffAt: 2, kickoffSem: 3,
      attritionCount: 4, attritionAt: 1, attritionSem: 3, attritionRate: 4.6,
      aov: 65300, aovAt: 57500, aovSem: 72200,
      netGrowth: 1, netGrowthAt: 1, netGrowthSem: 0,
      marginPct: 40.2, marginAt: 42.2, marginSem: 38.0,
      cac: 19000, cacAt: 15000, cacSem: 23000,
      ltv: 390000, ltvAt: 341000, ltvSem: 495000,
      cacLtvRatio: 20.5, hours: 9600, hoursAt: 4640, hoursSem: 4960,
      revAvail: 2500000, revAvailAt: 1160000, revAvailSem: 1340000,
      outstanding: 1450000, outstandingAt: 870000, outstandingSem: 580000 },
    // Mar'26 — reconciled so Mar→Apr matches widget headline MoM%
    { month: "Mar'26",
      mrr: 5333333, mrrAt: 2480000, mrrSem: 2853333,
      customers: 84, customersAt: 36, customersSem: 48,
      kickoff: 6, kickoffAt: 3, kickoffSem: 3,
      attritionCount: 7, attritionAt: 2, attritionSem: 5, attritionRate: 8.1,
      aov: 64011, aovAt: 56200, aovSem: 81400,
      netGrowth: -2, netGrowthAt: 0, netGrowthSem: -2,
      marginPct: 40.0, marginAt: 42.3, marginSem: 38.0,
      cac: 19629, cacAt: 15400, cacSem: 23800,
      ltv: 392000, ltvAt: 344000, ltvSem: 502000,
      cacLtvRatio: 20.0, hours: 9920, hoursAt: 4720, hoursSem: 5200,
      revAvail: 2480000, revAvailAt: 1140000, revAvailSem: 1340000,
      outstanding: 1610000, outstandingAt: 970000, outstandingSem: 640000 },
    // Apr'26 — anchors to widget face values
    { month: "Apr'26",
      mrr: 6000000, mrrAt: 2800000, mrrSem: 3200000,
      customers: 90, customersAt: 38, customersSem: 52,
      kickoff: 7, kickoffAt: 3, kickoffSem: 4,
      attritionCount: 6, attritionAt: 2, attritionSem: 4, attritionRate: 6.7,
      aov: 66700, aovAt: 58000, aovSem: 85000,
      netGrowth: 1, netGrowthAt: 1, netGrowthSem: 0,
      marginPct: 40.2, marginAt: 42.5, marginSem: 38.2,
      cac: 18000, cacAt: 14000, cacSem: 22000,
      ltv: 396000, ltvAt: 348000, ltvSem: 510000,
      cacLtvRatio: 22.0, hours: 10080, hoursAt: 4800, hoursSem: 5280,
      revAvail: 2400000, revAvailAt: 1100000, revAvailSem: 1300000,
      outstanding: 1535000, outstandingAt: 920000, outstandingSem: 615000 },
  ];

  // ── Net Growth & Attrition table data (derived from monthlyTrend) ───────────
  // Closing MRR per month is the canonical figure — it's what the
  // headline widgets render and what every chart uses. Opening, then,
  // is the previous month's closing; the first month's opening anchors
  // to plausible Apr'25 values just below May'25 so the FY view starts
  // with a real opening figure rather than a 0.
  // Kickoff and Lost values are derived as `count × AOV` per service —
  // the existing seed has both counts and AOV, so this stays in lock-
  // step with the kickoff / attrition widgets without needing a second
  // source of truth. Net Growth and Attrition rows are computed
  // downstream inside the table component from these four primitives.
  const ngatFY: MonthlyClientValue[] = (() => {
    // First-month opening anchor — Apr'25 closing, just below May'25's
    // 1.95Cr A&T / 2.4Cr SEM, so the FY's first opening reads naturally.
    const ANCHOR_OPENING_AT = 1900000;
    const ANCHOR_OPENING_PM = 2300000;

    // monthlyTrend uses display labels like "May'25"; build the ISO key
    // alongside ("2025-05") for sorting + range filters.
    const MONTH_TO_IDX: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const isoFor = (label: string): string => {
      // "May'25" → "2025-05"; "Jan'26" → "2026-01"
      const m = label.match(/^(\w{3})'(\d{2})$/);
      if (!m) return label;
      const monIdx = MONTH_TO_IDX[m[1]] ?? 0;
      const year = 2000 + parseInt(m[2], 10);
      return `${year}-${String(monIdx + 1).padStart(2, '0')}`;
    };

    return monthlyTrend.map((row, i) => {
      const prev = i === 0 ? null : monthlyTrend[i - 1];
      const openAt = prev ? prev.mrrAt : ANCHOR_OPENING_AT;
      const openPm = prev ? prev.mrrSem : ANCHOR_OPENING_PM;
      return {
        month: row.month,
        iso: isoFor(row.month),
        opening: { at: openAt,                             pm: openPm },
        kickoff: { at: row.kickoffAt * row.aovAt,          pm: row.kickoffSem * row.aovSem },
        lost:    { at: row.attritionAt * row.aovAt,        pm: row.attritionSem * row.aovSem },
        closing: { at: row.mrrAt,                          pm: row.mrrSem },
      };
    });
  })();

  // Synthesised prior-year data (FY 2024-25) — same shape, ~13% lower
  // across the board to model a reasonable YoY growth trajectory. Used
  // by the table's "Compare with PY" toggle. Each PY month maps 1:1 to
  // the same calendar month one year earlier.
  const ngatPY: MonthlyClientValue[] = ngatFY.map(row => {
    const factor = 0.87; // ~13% lower
    const [y, m] = row.iso.split('-');
    const pyIso = `${parseInt(y, 10) - 1}-${m}`;
    const pyLabel = row.month.replace(/'(\d{2})$/, (_, yr) => `'${String(parseInt(yr, 10) - 1).padStart(2, '0')}`);
    return {
      month: pyLabel,
      iso: pyIso,
      opening: { at: Math.round(row.opening.at * factor), pm: Math.round(row.opening.pm * factor) },
      kickoff: { at: Math.round(row.kickoff.at * factor), pm: Math.round(row.kickoff.pm * factor) },
      lost:    { at: Math.round(row.lost.at    * factor), pm: Math.round(row.lost.pm    * factor) },
      closing: { at: Math.round(row.closing.at * factor), pm: Math.round(row.closing.pm * factor) },
    };
  });

  // ── Relationship + CLA metrics for the 3 new widgets ────────────────────────
  // Layered onto `monthlyTrend` via a post-declaration Object.assign so each
  // monthly row gains the new keys without rewriting all 12 rows inline.
  //
  //   clientRelPct  — overall % of clients rated "Excellent"
  //   clientRelAt   — count of A&T clients rated Excellent
  //   clientRelSem  — count of SEM clients rated Excellent
  //   atRiskClients — total clients on the CLA (Can Lose Anytime) list
  //   atRiskClientsAt / Sem — split by service
  //   atRiskEmp     — employees on the performance watchlist (CLA/NTF)
  //   atRiskEmpAt / Sem — split by service
  const _relCLA = [
    //       pct  relAt relSem  clients  cAt cSem  emp eAt eSem
    { r: [58,   28,   38],   c: [3, 1, 2],     e: [2, 1, 1] },   // May'25
    { r: [60,   29,   40],   c: [4, 2, 2],     e: [3, 1, 2] },   // Jun'25
    { r: [62,   30,   42],   c: [3, 1, 2],     e: [3, 1, 2] },   // Jul'25
    { r: [61,   30,   41],   c: [4, 2, 2],     e: [4, 2, 2] },   // Aug'25
    { r: [63,   31,   43],   c: [5, 2, 3],     e: [3, 1, 2] },   // Sep'25
    { r: [64,   32,   44],   c: [4, 2, 2],     e: [5, 2, 3] },   // Oct'25
    { r: [63,   32,   43],   c: [6, 3, 3],     e: [4, 2, 2] },   // Nov'25
    { r: [65,   33,   45],   c: [5, 2, 3],     e: [3, 1, 2] },   // Dec'25
    { r: [64,   32,   44],   c: [5, 2, 3],     e: [4, 2, 2] },   // Jan'26
    { r: [63,   31,   43],   c: [7, 3, 4],     e: [5, 2, 3] },   // Feb'26
    { r: [64,   32,   44],   c: [6, 3, 3],     e: [5, 2, 3] },   // Mar'26
    { r: [64,   32,   41],   c: [5, 2, 3],     e: [4, 2, 2] },   // Apr'26 — current
  ];
  monthlyTrend.forEach((row, i) => {
    const rel = _relCLA[i];
    Object.assign(row, {
      clientRelPct:     rel.r[0],
      clientRelAt:      rel.r[1],
      clientRelSem:     rel.r[2],
      atRiskClients:    rel.c[0],
      atRiskClientsAt:  rel.c[1],
      atRiskClientsSem: rel.c[2],
      atRiskEmp:        rel.e[0],
      atRiskEmpAt:      rel.e[1],
      atRiskEmpSem:     rel.e[2],
    });
  });

  // Data slicing based on drawer period.
  // monthlyTrend runs May'25 → Apr'26 (12 months, current month last).
  // Indices: 0=May'25, 1=Jun'25, 2=Jul'25, 3=Aug'25, 4=Sep'25, 5=Oct'25,
  //          6=Nov'25, 7=Dec'25, 8=Jan'26, 9=Feb'26, 10=Mar'26, 11=Apr'26.
  // Quarter mapping uses calendar quarters; for past quarters we slice the
  // matching three months from the current data window. Weekly and Daily
  // ranges have no sub-monthly data here, so we degrade to "current month
  // only" — the single-bar render is consistent with what the home top
  // bar implies for those filters.
  const getDrawerData = () => {
    switch (drawerPeriod) {
      case 'mtd':    return monthlyTrend.slice(-1);     // Apr'26 only
      case 'weekly': return monthlyTrend.slice(-1);     // degrade → current month
      case 'daily':  return monthlyTrend.slice(-1);     // degrade → current month
      case 'ytd':    return monthlyTrend.slice(-4);     // Jan'26 – Apr'26
      case 'q1':     return monthlyTrend.slice(8, 11);  // Jan'26 – Mar'26
      case 'q2':     return monthlyTrend.slice(11);     // Apr'26 (in-progress)
      case 'q3':     return monthlyTrend.slice(2, 5);   // Jul'25 – Sep'25
      case 'q4':     return monthlyTrend.slice(5, 8);   // Oct'25 – Dec'25
      default:       return monthlyTrend.slice(-4);
    }
  };
  const trendData = getDrawerData();

  // Calendar-date counterpart of getDrawerData. Same time windows, but
  // expressed as { start, end } so per-row mock data (kickoff dates,
  // customer join dates) can be filtered to the exact range the chart
  // is showing. When the user flips drawerPeriod from "Q3" to "MTD",
  // both the chart AND the table below update in lockstep — no more
  // "chart says Q3 but the table is still showing April".
  // Note: months are 0-indexed in JS Date (3 = April).
  type DrawerPeriodRange = { start: Date; end: Date; label: string };
  const drawerPeriodRanges: Record<DrawerPeriod, DrawerPeriodRange> = {
    daily:  { start: new Date(2026, 3, 30), end: new Date(2026, 3, 30), label: '30 Apr 2026' },
    weekly: { start: new Date(2026, 3, 24), end: new Date(2026, 3, 30), label: 'this week' },
    mtd:    { start: new Date(2026, 3, 1),  end: new Date(2026, 3, 30), label: 'Apr 2026' },
    ytd:    { start: new Date(2026, 0, 1),  end: new Date(2026, 3, 30), label: 'YTD 2026' },
    q1:     { start: new Date(2026, 0, 1),  end: new Date(2026, 2, 31), label: 'Q1 2026' },
    q2:     { start: new Date(2026, 3, 1),  end: new Date(2026, 3, 30), label: 'Q2 2026' },
    q3:     { start: new Date(2025, 6, 1),  end: new Date(2025, 8, 30), label: 'Q3 2025' },
    q4:     { start: new Date(2025, 9, 1),  end: new Date(2025, 11, 31), label: 'Q4 2025' },
  };

  // ── Shared customer-activity dataset ────────────────────────────────────
  // Used by:
  //   • Kickoff drawer  — kickoffs only (filtered to the period)
  //   • Net Growth drawer — kickoffs + churns combined into one timeline,
  //                          and used to build a name-aware tooltip on
  //                          the chart bars
  // Data spans May 2025 → Apr 2026 (the same window monthlyTrend covers),
  // with realistic distribution that adds up to the headline numbers
  // ("7 kickoffs in April · ₹21L of new ARR" / "6 churns this month",
  // etc.). Keeping the data co-located with drawerPeriodRanges means the
  // date-filter logic in every drawer reads from the same source of truth.
  type ActivityMember = { initials: string; name: string; role: string; color: string };
  const activityRoster: Record<string, ActivityMember> = {
    TA: { initials: 'TA', name: 'Tejas Atha',     role: 'COO',          color: '#3B82F6' },
    CP: { initials: 'CP', name: 'Chinmay Pawar',  role: 'SEM HOD',      color: '#7C3AED' },
    ZS: { initials: 'ZS', name: 'Zubear Shaikh',  role: 'A&T HOD',      color: '#06B6D4' },
    AM: { initials: 'AM', name: 'Arjun Mehta',    role: 'Sr. Manager',  color: '#F59E0B' },
    KI: { initials: 'KI', name: 'Kavya Iyer',     role: 'Manager',      color: '#06B6D4' },
    IO: { initials: 'IO', name: 'Irshad Osmani',  role: 'Executive',    color: '#EC4899' },
    MN: { initials: 'MN', name: 'Meera Nair',     role: 'Manager',      color: '#10B981' },
    PS: { initials: 'PS', name: 'Priya Sharma',   role: 'Manager',      color: '#3B82F6' },
    RD: { initials: 'RD', name: 'Rohan Desai',    role: 'Manager',      color: '#10B981' },
    SP: { initials: 'SP', name: 'Sneha Patel',    role: 'Manager',      color: '#E2445C' },
  };
  type ActivityService = 'SEM' | 'A&T' | 'Both';
  type Kickoff = {
    id: string;
    date: string;     // ISO YYYY-MM-DD
    customer: string;
    service: ActivityService;
    team: ActivityMember[];
    mrr: number;
  };
  type Churn = Kickoff & {
    tenureMonths: number;
    reason: string;
  };
  // ── Kickoffs (37 entries) ──
  // Apr 2026 has the 7 entries that match the headline. The rest are
  // distributed at ~3/mo to give the trailing-12-month view enough
  // density to look real without ballooning the file.
  const _r = activityRoster; // local alias for compactness in the literal
  const kickoffsAcrossYear: Kickoff[] = [
    // ── Apr 2026 — 7 kickoffs, ₹17.95L MRR ──
    { id: 'k01', date: '2026-04-24', customer: 'Northwind Apparel',  service: 'SEM',  team: [_r.CP, _r.AM],         mrr: 165000 },
    { id: 'k02', date: '2026-04-20', customer: 'Saraswat Auto',      service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 90000  },
    { id: 'k03', date: '2026-04-18', customer: 'GreenLeaf Organics', service: 'SEM',  team: [_r.CP, _r.KI],         mrr: 145000 },
    { id: 'k04', date: '2026-04-14', customer: 'Lumen Studios',      service: 'A&T',  team: [_r.ZS],                mrr: 60000  },
    { id: 'k05', date: '2026-04-10', customer: 'Veritas Capital',    service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 110000 },
    { id: 'k06', date: '2026-04-06', customer: 'Pixel & Pine',       service: 'SEM',  team: [_r.AM, _r.MN],         mrr: 95000  },
    { id: 'k07', date: '2026-04-02', customer: 'Solstice Wellness',  service: 'SEM',  team: [_r.CP, _r.AM, _r.KI],  mrr: 130000 },
    // ── Mar 2026 — 4 kickoffs ──
    { id: 'k08', date: '2026-03-26', customer: 'Element Robotics',   service: 'SEM',  team: [_r.AM, _r.KI],         mrr: 120000 },
    { id: 'k09', date: '2026-03-19', customer: 'Jasmin Care',        service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 70000  },
    { id: 'k10', date: '2026-03-12', customer: 'Ferrous Steel',      service: 'A&T',  team: [_r.ZS],                mrr: 85000  },
    { id: 'k11', date: '2026-03-05', customer: 'Tara Wellness',      service: 'SEM',  team: [_r.CP, _r.AM],         mrr: 100000 },
    // ── Feb 2026 — 4 kickoffs ──
    { id: 'k12', date: '2026-02-27', customer: 'Crescent Foods',     service: 'SEM',  team: [_r.AM],                mrr: 75000  },
    { id: 'k13', date: '2026-02-21', customer: 'Mosaic Gifts',       service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 55000  },
    { id: 'k14', date: '2026-02-14', customer: 'Orbit Logistics',    service: 'Both', team: [_r.CP, _r.ZS, _r.MN],  mrr: 175000 },
    { id: 'k15', date: '2026-02-04', customer: 'Kalpataru Hosp.',    service: 'A&T',  team: [_r.ZS],                mrr: 65000  },
    // ── Jan 2026 — 3 kickoffs ──
    { id: 'k16', date: '2026-01-28', customer: 'Verdant Decor',      service: 'SEM',  team: [_r.CP, _r.KI],         mrr: 110000 },
    { id: 'k17', date: '2026-01-22', customer: 'Nimbus Cloud',       service: 'Both', team: [_r.CP, _r.ZS],         mrr: 195000 },
    { id: 'k18', date: '2026-01-12', customer: 'Skyline Realty',     service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 80000  },
    // ── Dec 2025 — 4 kickoffs ──
    { id: 'k19', date: '2025-12-28', customer: 'Trellis Gardens',    service: 'SEM',  team: [_r.AM, _r.MN],         mrr: 65000  },
    { id: 'k20', date: '2025-12-18', customer: 'Lighthouse Edu',     service: 'A&T',  team: [_r.ZS],                mrr: 70000  },
    { id: 'k21', date: '2025-12-11', customer: 'Coastal Catering',   service: 'SEM',  team: [_r.CP, _r.AM],         mrr: 90000  },
    { id: 'k22', date: '2025-12-04', customer: 'Crimson Realty',     service: 'Both', team: [_r.CP, _r.ZS, _r.MN],  mrr: 160000 },
    // ── Nov 2025 — 3 kickoffs ──
    { id: 'k23', date: '2025-11-28', customer: 'Atlas Couriers',     service: 'SEM',  team: [_r.AM],                mrr: 95000  },
    { id: 'k24', date: '2025-11-17', customer: 'Saffron Spice',      service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 60000  },
    { id: 'k25', date: '2025-11-02', customer: 'Marble Hospitality', service: 'SEM',  team: [_r.CP, _r.AM, _r.KI],  mrr: 120000 },
    // ── Oct 2025 — 3 kickoffs ──
    { id: 'k26', date: '2025-10-25', customer: 'Helio Solar',        service: 'A&T',  team: [_r.ZS],                mrr: 75000  },
    { id: 'k27', date: '2025-10-14', customer: 'Banyan Books',       service: 'SEM',  team: [_r.AM, _r.MN],         mrr: 80000  },
    { id: 'k28', date: '2025-10-03', customer: 'Indigo Threads',     service: 'SEM',  team: [_r.CP, _r.AM],         mrr: 105000 },
    // ── Sep 2025 — 3 kickoffs ──
    { id: 'k29', date: '2025-09-30', customer: 'Tide Marine',        service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 55000  },
    { id: 'k30', date: '2025-09-22', customer: 'Stellar Auto',       service: 'Both', team: [_r.CP, _r.ZS],         mrr: 145000 },
    { id: 'k31', date: '2025-09-09', customer: 'Rainforest Org.',    service: 'SEM',  team: [_r.AM, _r.KI],         mrr: 90000  },
    // ── Aug 2025 — 3 kickoffs ──
    { id: 'k32', date: '2025-08-27', customer: 'Quartz Realty',      service: 'A&T',  team: [_r.ZS],                mrr: 70000  },
    { id: 'k33', date: '2025-08-14', customer: 'Pinnacle HVAC',      service: 'SEM',  team: [_r.CP, _r.MN],         mrr: 100000 },
    { id: 'k34', date: '2025-08-01', customer: 'Olive Pharma',       service: 'A&T',  team: [_r.ZS, _r.IO],         mrr: 95000  },
    // ── Jul 2025 — 2 kickoffs ──
    { id: 'k35', date: '2025-07-18', customer: 'Nexora Tech',        service: 'SEM',  team: [_r.CP, _r.AM],         mrr: 130000 },
    { id: 'k36', date: '2025-07-04', customer: 'Coral Café',         service: 'SEM',  team: [_r.AM],                mrr: 60000  },
  ];
  // ── Churns (30 entries) ──
  // Apr 2026 has 6 churns matching the attrition headline ("6 churns:
  // 2 A&T, 4 SEM"). Mar/Feb 2026 preserve the 6 entries in the existing
  // "Recent Churns" attrition table (Zenith / NovaTech / Bloom in Mar,
  // Meridian / UrbanNest / FreshBite in Feb). The rest distribute at
  // ~3/mo across the year to look like a real attrition stream.
  const churnsAcrossYear: Churn[] = [
    // ── Apr 2026 — 6 churns ──
    { id: 'ch01', date: '2026-04-25', customer: 'Hudson Foods',        service: 'SEM',  team: [_r.AM, _r.CP],          mrr: 75000,  tenureMonths: 11, reason: 'Budget freeze — Q3 reactivation planned' },
    { id: 'ch02', date: '2026-04-19', customer: 'Onyx Realty',         service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 55000,  tenureMonths: 7,  reason: 'Moved to in-house finance team' },
    { id: 'ch03', date: '2026-04-13', customer: 'Maple Living',        service: 'SEM',  team: [_r.CP, _r.AM],          mrr: 90000,  tenureMonths: 16, reason: 'Switched to performance agency' },
    { id: 'ch04', date: '2026-04-09', customer: 'Riviera Travel',      service: 'SEM',  team: [_r.AM, _r.KI],          mrr: 65000,  tenureMonths: 9,  reason: 'Annual contract not renewed' },
    { id: 'ch05', date: '2026-04-05', customer: 'Felicity Furniture',  service: 'A&T',  team: [_r.ZS],                 mrr: 45000,  tenureMonths: 13, reason: 'Cost reduction — moved to bookkeeping software' },
    { id: 'ch06', date: '2026-04-02', customer: 'Vortex Sports',       service: 'SEM',  team: [_r.CP, _r.AM],          mrr: 110000, tenureMonths: 18, reason: 'Acquired — consolidating with parent agency' },
    // ── Mar 2026 — 3 churns ──
    { id: 'ch07', date: '2026-03-18', customer: 'Zenith Retail',       service: 'SEM',  team: [_r.PS, _r.CP, _r.AM],   mrr: 85000,  tenureMonths: 14, reason: 'Founder exit, business wind-down' },
    { id: 'ch08', date: '2026-03-12', customer: 'NovaTech Solutions',  service: 'A&T',  team: [_r.RD, _r.ZS, _r.KI],   mrr: 42000,  tenureMonths: 8,  reason: 'Hired in-house CFO' },
    { id: 'ch09', date: '2026-03-05', customer: 'Bloom Botanics',      service: 'SEM',  team: [_r.AM, _r.CP],          mrr: 65000,  tenureMonths: 6,  reason: 'Pivoting product, paused all marketing' },
    // ── Feb 2026 — 3 churns ──
    { id: 'ch10', date: '2026-02-28', customer: 'Meridian Healthcare', service: 'A&T',  team: [_r.SP, _r.ZS, _r.IO],   mrr: 38000,  tenureMonths: 22, reason: 'Cost optimization' },
    { id: 'ch11', date: '2026-02-20', customer: 'UrbanNest Realty',    service: 'SEM',  team: [_r.SP, _r.CP, _r.AM],   mrr: 120000, tenureMonths: 18, reason: 'Internal team scaled up' },
    { id: 'ch12', date: '2026-02-15', customer: 'FreshBite Foods',     service: 'SEM',  team: [_r.RD, _r.CP],          mrr: 55000,  tenureMonths: 10, reason: 'Performance below expectations' },
    // ── Jan 2026 — 3 churns ──
    { id: 'ch13', date: '2026-01-26', customer: 'Tundra Outdoors',     service: 'SEM',  team: [_r.AM],                 mrr: 70000,  tenureMonths: 12, reason: 'Budget cut after funding miss' },
    { id: 'ch14', date: '2026-01-15', customer: 'Cobalt Engineering',  service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 50000,  tenureMonths: 8,  reason: 'Acquired — new owner uses different vendor' },
    { id: 'ch15', date: '2026-01-08', customer: 'Vintage Apparel',     service: 'SEM',  team: [_r.CP, _r.AM],          mrr: 80000,  tenureMonths: 15, reason: 'Brand revamp paused all spend' },
    // ── Dec 2025 — 3 churns ──
    { id: 'ch16', date: '2025-12-22', customer: 'Slate Architecture',  service: 'A&T',  team: [_r.ZS],                 mrr: 35000,  tenureMonths: 14, reason: 'Founder retired, business closed' },
    { id: 'ch17', date: '2025-12-12', customer: 'Aspect Hospitality',  service: 'SEM',  team: [_r.AM, _r.MN],          mrr: 95000,  tenureMonths: 11, reason: 'Q4 budget reset' },
    { id: 'ch18', date: '2025-12-04', customer: 'Cipher Security',     service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 60000,  tenureMonths: 6,  reason: 'Service mismatch — moved to specialist' },
    // ── Nov 2025 — 3 churns ──
    { id: 'ch19', date: '2025-11-25', customer: 'Lithium Auto',        service: 'SEM',  team: [_r.CP, _r.AM],          mrr: 105000, tenureMonths: 19, reason: 'Internal CMO hire took over media' },
    { id: 'ch20', date: '2025-11-14', customer: 'Quill Publishing',    service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 42000,  tenureMonths: 9,  reason: 'Reduced operations to save cost' },
    { id: 'ch21', date: '2025-11-04', customer: 'Phoenix Realty',      service: 'SEM',  team: [_r.AM],                 mrr: 75000,  tenureMonths: 13, reason: 'Switched to hyper-local agency' },
    // ── Oct 2025 — 3 churns ──
    { id: 'ch22', date: '2025-10-28', customer: 'Velvet Skincare',     service: 'SEM',  team: [_r.CP, _r.AM, _r.MN],   mrr: 88000,  tenureMonths: 17, reason: 'Acquired by larger brand' },
    { id: 'ch23', date: '2025-10-16', customer: 'Sentinel Insurance',  service: 'A&T',  team: [_r.ZS],                 mrr: 52000,  tenureMonths: 10, reason: 'In-house compliance team formed' },
    { id: 'ch24', date: '2025-10-05', customer: 'Tempest Logistics',   service: 'SEM',  team: [_r.AM, _r.KI],          mrr: 95000,  tenureMonths: 14, reason: 'Pivoted to B2B model — needed different mix' },
    // ── Sep 2025 — 2 churns ──
    { id: 'ch25', date: '2025-09-23', customer: 'Pearl Jewelry',       service: 'SEM',  team: [_r.CP, _r.MN],          mrr: 70000,  tenureMonths: 12, reason: 'Cost-cutting after slow Q2' },
    { id: 'ch26', date: '2025-09-08', customer: 'Nova Edu',            service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 48000,  tenureMonths: 7,  reason: 'Moved to a regional firm' },
    // ── Aug 2025 — 2 churns ──
    { id: 'ch27', date: '2025-08-22', customer: 'Heritage Spices',     service: 'SEM',  team: [_r.AM],                 mrr: 60000,  tenureMonths: 11, reason: 'Restructuring' },
    { id: 'ch28', date: '2025-08-09', customer: 'Granite Stones',      service: 'A&T',  team: [_r.ZS],                 mrr: 38000,  tenureMonths: 8,  reason: 'Hired internal accountant' },
    // ── Jul 2025 — 2 churns ──
    { id: 'ch29', date: '2025-07-19', customer: 'Maritime Gear Co.',   service: 'SEM',  team: [_r.CP, _r.AM],          mrr: 82000,  tenureMonths: 15, reason: 'Industry downturn' },
    { id: 'ch30', date: '2025-07-04', customer: 'Cobalt Hospitality',  service: 'A&T',  team: [_r.ZS, _r.IO],          mrr: 45000,  tenureMonths: 9,  reason: 'Property sold, ops handed over' },
  ];

  // ── Customer book snapshot ──
  // Representative slice of the active book as of TODAY (Apr 2026).
  // 20 logos covering both services, with current MRR and tenure.
  // `tenureMonths` is the only date field — joinedDate is derived
  // from it whenever a drawer needs to filter to a past period.
  // Used by the Active Customers drawer (filtered by period) and
  // the LTV drawer (ranked by computed lifetime value).
  type CustomerBookRow = {
    id: string;
    name: string;
    service: ActivityService;
    tenureMonths: number;
    team: ActivityMember[];
    mrr: number;
  };
  const customersBookSnapshot: CustomerBookRow[] = [
    { id: 'c10', name: 'Cloud Systems',     service: 'Both', tenureMonths: 24, team: [_r.CP, _r.ZS, _r.MN], mrr: 250000 },
    { id: 'c3',  name: 'Urban Living',      service: 'Both', tenureMonths: 22, team: [_r.CP, _r.ZS],        mrr: 220000 },
    { id: 'c7',  name: 'MedCare Plus',      service: 'Both', tenureMonths: 20, team: [_r.CP, _r.ZS, _r.MN], mrr: 200000 },
    { id: 'c1c', name: 'Acme Logistics',    service: 'Both', tenureMonths: 9,  team: [_r.CP, _r.ZS, _r.MN], mrr: 195000 },
    { id: 'c13', name: 'BookMyTrip',        service: 'Both', tenureMonths: 23, team: [_r.KI, _r.IO],        mrr: 180000 },
    { id: 'c6',  name: 'Digital Dynamics',  service: 'SEM',  tenureMonths: 15, team: [_r.CP, _r.KI],        mrr: 175000 },
    { id: 'c12', name: 'Enagenbio Pharma',  service: 'SEM',  tenureMonths: 7,  team: [_r.CP],               mrr: 160000 },
    { id: 'c1',  name: 'Acme Corp',         service: 'SEM',  tenureMonths: 25, team: [_r.CP, _r.AM],        mrr: 150000 },
    { id: 'c9',  name: 'Smart Solutions',   service: 'SEM',  tenureMonths: 10, team: [_r.AM, _r.KI],        mrr: 130000 },
    { id: 'c4',  name: 'Sunrise Retail',    service: 'SEM',  tenureMonths: 27, team: [_r.AM],               mrr: 100000 },
    { id: 'c11', name: 'FreshBites',        service: 'SEM',  tenureMonths: 26, team: [_r.AM],               mrr: 90000  },
    { id: 'c2',  name: 'FinTech Solutions', service: 'A&T',  tenureMonths: 29, team: [_r.ZS, _r.IO],        mrr: 80000  },
    { id: 'c1b', name: 'Acme Wellness',     service: 'A&T',  tenureMonths: 19, team: [_r.ZS, _r.IO],        mrr: 75000  },
    { id: 'c14', name: 'PropEase',          service: 'A&T',  tenureMonths: 14, team: [_r.ZS],               mrr: 70000  },
    { id: 'c8',  name: 'EcoGreen Energy',   service: 'A&T',  tenureMonths: 31, team: [_r.IO],               mrr: 45000  },
    // Recent kickoffs — included so different drawer periods produce
    // different active-customer sets. A customer joined < N months
    // ago wasn't on the book yet for periods that ended N+ months
    // back.
    { id: 'c15', name: 'Equinox Studios',   service: 'SEM',  tenureMonths: 6,  team: [_r.AM, _r.MN],        mrr: 85000  },
    { id: 'c16', name: 'Drift Outdoors',    service: 'SEM',  tenureMonths: 5,  team: [_r.AM],               mrr: 55000  },
    { id: 'c17', name: 'Calibre Audio',     service: 'A&T',  tenureMonths: 4,  team: [_r.ZS],               mrr: 70000  },
    { id: 'c18', name: 'Beacon Edu',        service: 'A&T',  tenureMonths: 3,  team: [_r.ZS, _r.IO],        mrr: 60000  },
    { id: 'c19', name: 'Aurora Mobility',   service: 'SEM',  tenureMonths: 2,  team: [_r.CP],               mrr: 50000  },
  ];

  // LTV formula — projected total profit from a customer.
  //   LTV = MRR × expected lifetime months × gross margin
  // Lifetime is service-specific (longer SEM tenure historically),
  // and margin matches the headline service margins (40% blended).
  // Same function the LTV drawer uses to rank customers.
  const computeLTV = (mrr: number, service: ActivityService): number => {
    const lifetimeMonths = service === 'SEM' ? 22 : service === 'A&T' ? 18 : 20;
    const margin         = service === 'A&T' ? 0.42 : service === 'SEM' ? 0.38 : 0.40;
    return Math.round(mrr * lifetimeMonths * margin);
  };

  // KPI definitions: title, insight, chart config
  interface KpiMeta {
    title: string;
    subtitle?: string;          // one-line definition of the metric
    // Layman-friendly explanation of WHAT the metric is and WHY it
    // matters, surfaced via the (i) tooltip on each home tile. Two
    // short sentences max — first defines the number, second supplies
    // the operating logic behind it. No jargon, no acronyms left
    // unexpanded.
    tooltip: string;
    insights: { label: string; text: string; type: 'growth' | 'risk' | 'action' }[];
    dataKey: string;
    format: (v: number) => string;
    color: string;
    unit?: string;
    // Direction: when true, a decrease is good (CAC, attrition, idle revenue).
    lowerIsBetter?: boolean;
    // Optional reference line on the trend chart with a label.
    target?: { value: number; label: string };
    // Service split — used for stacked / grouped chart variants and tooltip
    // breakdown rows. When both are set, the chart stacks A&T below and SEM on
    // top so the total height matches the headline metric.
    atKey?: string;
    atLabel?: string;
    semKey?: string;
    semLabel?: string;
    // How to render the service split in the trend chart:
    //   'stack'   → A&T + SEM = total (MRR, customers, hours). Stacked bars.
    //   'compare' → blended total is an average of services, not a sum
    //               (AOV, CAC, LTV, rev-avail). Two lines over a soft blend area.
    splitMode?: 'stack' | 'compare';
    // Legacy fields retained for the MRR three-line view fallback (unused now
    // that every service-split metric uses atKey/semKey, but kept for backward
    // compat with any external callers).
    secondaryKey?: string;
    secondaryLabel?: string;
    secondaryColor?: string;
    tertiaryKey?: string;
    tertiaryLabel?: string;
    tertiaryColor?: string;
  }

  // Brand palette aliases for chart series
  const C_AT  = '#06B6D4';   // A&T cyan
  const C_SEM = '#7C3AED';   // SEM purple

  const kpiMeta: Record<KpiId, KpiMeta> = {
    // ── 1. Active MRR ────────────────────────────────────────────────────────
    'mrr': {
      title: 'Active MRR',
      subtitle: 'Total recurring revenue from active customers this month',
      tooltip: 'Monthly Recurring Revenue — the predictable retainer income we earn every month from active customers, the heartbeat of the business. One-off project fees are not counted here, only repeating monthly billing.',
      insights: [
        { label: 'Where we are',  text: 'MRR is ₹60L for April — up 12.5% MoM (from ₹53L) and 38% YoY. SEM is ₹32L (53%), A&T ₹28L (47%) — close to a balanced book.', type: 'growth' },
        { label: 'What\'s driving it', text: 'April added 7 kickoffs worth ₹21L of new ARR. Net of 6 churns, MRR added ₹6.7L this month — your best monthly add since June.', type: 'growth' },
        { label: 'Where to push',  text: 'SEM AOV (₹85K) is 47% higher than A&T (₹58K). Cross-sell A&T into your top 15 SEM accounts to lift A&T MRR without growing logo count.', type: 'action' },
      ],
      dataKey: 'mrr', format: formatLakh, color: '#204CC7',
      atKey: 'mrrAt', atLabel: 'A&T', semKey: 'mrrSem', semLabel: 'SEM',
      splitMode: 'stack',
    },
    // ── 2. Active Customers ──────────────────────────────────────────────────
    'customers': {
      title: 'Active Customers',
      subtitle: 'Distinct paying logos at month-end',
      tooltip: 'How many distinct businesses are paying us right now, counted at month-end. A single client buying both A&T and SEM still counts once here — this is the logo count, not the engagement count.',
      insights: [
        { label: 'Where we are',  text: '90 active customers in April — up from 84 in March (+6 net). 12-month growth is 25% (72 → 90).', type: 'growth' },
        { label: 'Concentration', text: 'SEM holds 52 logos (58%) vs A&T 38 (42%). With SEM AOV at ₹85K, the top 10 SEM clients alone carry ~₹8L MRR — concentration risk worth tracking.', type: 'risk' },
        { label: 'Where to push',  text: 'A&T grew by only 8 logos over 12 months vs SEM\'s +10. A&T pipeline needs attention going into the Jul–Sep tax season — historically 40% of A&T onboards land in that window.', type: 'action' },
      ],
      dataKey: 'customers', format: (v) => String(v), color: '#204CC7',
      atKey: 'customersAt', atLabel: 'A&T', semKey: 'customersSem', semLabel: 'SEM',
      splitMode: 'stack',
    },
    // ── 3. Kickoff ───────────────────────────────────────────────────────────
    'kickoff': {
      title: 'Kickoffs',
      subtitle: 'New customer kickoffs started this month',
      tooltip: 'New customers who began service this month — the leading indicator of how fast the book is growing before churn pulls some back out. To stay net-positive, kickoffs need to consistently outpace attrition.',
      insights: [
        { label: 'Where we are',  text: '7 kickoffs in April (3 A&T · 4 SEM) — the highest in 6 months. Trailing-12 average is 5/mo, so April is +40% over baseline.', type: 'growth' },
        { label: 'New revenue',   text: 'These 7 onboards represent ₹21L of new ARR — averaging ₹3L per kickoff, in line with blended AOV × 4–5 month payback.', type: 'growth' },
        { label: 'Watch',          text: 'You need 6+ kickoffs/month to consistently outpace attrition (avg 4/mo). 2 of the last 6 months were below that line.', type: 'risk' },
      ],
      dataKey: 'kickoff', format: (v) => String(v), color: '#00C875',
      atKey: 'kickoffAt', atLabel: 'A&T', semKey: 'kickoffSem', semLabel: 'SEM',
    },
    // ── 4. Attrition ─────────────────────────────────────────────────────────
    'attrition': {
      title: 'Attrition',
      subtitle: 'Share of customers churned this month',
      tooltip: 'Share of active customers who stopped working with us this month. Lower is better — at a 4% monthly rate roughly half the book turns over in a year, so every percentage point above target costs real revenue.',
      insights: [
        { label: 'Where we are',  text: 'Attrition is 6.7% in April (6 churns: 2 A&T, 4 SEM) — improved from 8.1% in March but still well above the 4% target.', type: 'risk' },
        { label: 'Where it bites', text: 'SEM accounts for 4 of 6 churns this month and runs at 7.7% rate vs A&T\'s 5.3%. SEM contracts also carry higher AOV — ₹4.2L of MRR walked out the door.', type: 'risk' },
        { label: 'What to do',     text: '12 contracts are up for renewal in the next 60 days (8 SEM, 4 A&T). Trigger QBRs and renewal calls 30 days out — historically this lifts renewal rate by 12%.', type: 'action' },
      ],
      dataKey: 'attritionRate', format: (v) => `${v}%`, color: '#E2445C', unit: '%',
      lowerIsBetter: true,
      target: { value: 4, label: 'Target 4%' },
      atKey: 'attritionAt', atLabel: 'A&T (count)', semKey: 'attritionSem', semLabel: 'SEM (count)',
    },
    // ── 5. AOV ───────────────────────────────────────────────────────────────
    'aov': {
      title: 'AOV',
      subtitle: 'Average revenue per active customer this month',
      tooltip: 'Average Order Value — the typical monthly fee paid by one customer. Tells us at a glance whether we are winning bigger deals or smaller ones over time, and where pricing has room to move.',
      insights: [
        { label: 'Where we are',  text: 'Blended AOV is ₹66.7K — up 4.2% MoM and 10% YoY. SEM at ₹85K, A&T at ₹58K.', type: 'growth' },
        { label: 'The gap',        text: 'SEM AOV is 47% higher than A&T. Most of the overall AOV gain this quarter came from SEM repricing — A&T AOV moved only +3% in 12 months.', type: 'risk' },
        { label: 'Where to push',  text: 'Set a ₹50K minimum for new A&T engagements and bundle compliance + advisory by default. 22% of A&T accounts sit below ₹40K and consume the same delivery hours as ₹70K accounts.', type: 'action' },
      ],
      dataKey: 'aov', format: formatLakh, color: '#FDAB3D',
      atKey: 'aovAt', atLabel: 'A&T', semKey: 'aovSem', semLabel: 'SEM',
      splitMode: 'compare',
    },
    // ── 6. Net Growth ────────────────────────────────────────────────────────
    'net-growth': {
      title: 'Net Growth',
      subtitle: 'Customers added minus customers churned this month',
      tooltip: 'New customers in this month minus customers lost. Positive means the book grew on net; negative means churn outpaced new wins. The single cleanest read on whether the business is expanding or contracting in real time.',
      insights: [
        { label: 'Where we are',  text: 'Net +1 in April (7 in, 6 out). Bounced back from a –2 March, but the run-rate is well below H1\'s +2.5/mo.', type: 'growth' },
        { label: 'The math',       text: 'At 4% monthly attrition on 90 logos, you lose ~3.6 customers/mo as a baseline. You need 6+ kickoffs/mo just to clear +2 net consistently.', type: 'risk' },
        { label: 'Where to push',  text: 'Cutting attrition from 6.7% → 4.5% is worth ~+2 customers/mo — same impact as a 30% lift in kickoffs, but cheaper to achieve via QBR cadence and at-risk outreach.', type: 'action' },
      ],
      dataKey: 'netGrowth', format: (v) => `${v >= 0 ? '+' : ''}${v}`, color: '#7C3AED',
      target: { value: 0, label: 'Break-even' },
    },
    // ── 7. Gross Margins ─────────────────────────────────────────────────────
    'margins': {
      title: 'Gross Margins',
      subtitle: 'Revenue minus delivery cost, as % of revenue',
      tooltip: 'Of every ₹100 we bill, the share left after paying for delivery — people, contractors, ad-platform pass-throughs, tools. Healthy services firms target 40–50%; below that, every new client adds work without adding profit.',
      insights: [
        { label: 'Where we are',  text: 'Gross margin is 40.2% in April — flat MoM, up from 38.5% a year ago. You\'ve cleared the 40% threshold for 3 of the last 4 months.', type: 'growth' },
        { label: 'The split',      text: 'A&T runs at 42.5% margin, SEM at 38.2% — a 4.3% gap. SEM\'s gap is driven by ad-platform pass-throughs and contractor hours.', type: 'risk' },
        { label: 'Where to push',  text: 'Trimming SEM delivery cost by 2% (audit tool stack + contractor mix) lifts blended margin past 41% and adds ~₹1.3L/month to gross profit.', type: 'action' },
      ],
      dataKey: 'marginPct', format: (v) => `${v}%`, color: '#204CC7', unit: '%',
      target: { value: 40, label: 'Target 40%' },
      atKey: 'marginAt', atLabel: 'A&T %', semKey: 'marginSem', semLabel: 'SEM %',
    },
    // ── 8. CAC ───────────────────────────────────────────────────────────────
    'cac': {
      title: 'CAC',
      subtitle: 'Cost to acquire one new customer this month',
      tooltip: 'Customer Acquisition Cost — average rupees spent on marketing and sales to win one new customer. Lower is better; every rupee saved here shortens payback period and frees up budget for delivery.',
      insights: [
        { label: 'Where we are',  text: 'Blended CAC is ₹18K in April — down 8.3% MoM and 20% YoY. Acquisition is getting cheaper as referrals scale (now 30% of new logos).', type: 'growth' },
        { label: 'The gap',        text: 'A&T CAC is ₹14K, SEM CAC is ₹22K — paid channels (Google, LinkedIn) drive 45% of SEM leads at 2.3× the cost of organic.', type: 'risk' },
        { label: 'Where to push',  text: 'Each referral client costs ₹8K vs ₹24K for paid — a 3× efficiency gain. Stand up a formal partner/referral program before scaling paid spend further.', type: 'action' },
      ],
      dataKey: 'cac', format: formatLakh, color: '#06B6D4',
      lowerIsBetter: true,
      atKey: 'cacAt', atLabel: 'A&T', semKey: 'cacSem', semLabel: 'SEM',
      splitMode: 'compare',
    },
    // ── 9. LTV ───────────────────────────────────────────────────────────────
    'ltv': {
      title: 'LTV',
      subtitle: 'Average lifetime value per customer (AOV × tenure × margin)',
      tooltip: 'Lifetime Value — total profit we expect to earn from one customer across their entire relationship with us, calculated as monthly fee × average tenure × gross margin. A bigger LTV means each new logo is worth more to the firm.',
      insights: [
        { label: 'Where we are',  text: 'Blended LTV is ₹3.96L — up 16% YoY (₹3.4L → ₹3.96L). SEM clients are worth ₹5.1L on average, A&T ₹3.48L.', type: 'growth' },
        { label: 'Why it works',   text: 'LTV growth is split: AOV up 10%, tenure up 4 months on average (from 14 → 18). Both directions compound.', type: 'growth' },
        { label: 'Concentration',  text: 'Top 10 clients carry ~38% of total LTV. Losing one top-decile SEM account would dent blended LTV by ~3%. Build a Strategic Accounts cadence for them.', type: 'risk' },
      ],
      dataKey: 'ltv', format: formatLakh, color: '#00C875',
      atKey: 'ltvAt', atLabel: 'A&T', semKey: 'ltvSem', semLabel: 'SEM',
      splitMode: 'compare',
    },
    // ── 10. CAC : LTV ────────────────────────────────────────────────────────
    'cac-ltv': {
      title: 'LTV : CAC Ratio',
      subtitle: 'How many ₹ of lifetime value each ₹ of acquisition spend returns',
      tooltip: 'For every ₹1 spent acquiring a customer, how many rupees of lifetime profit come back. Anything above 3:1 is considered healthy — below that we are spending too much to acquire compared to what each customer is worth.',
      insights: [
        { label: 'Where we are',  text: 'Ratio is 1:22 in April — every ₹1 of CAC returns ₹22 of LTV. 7× the 1:3 industry minimum.', type: 'growth' },
        { label: 'Service split',  text: 'A&T runs at 1:25 (highest), SEM at 1:23 — both healthy. SEM\'s higher CAC is more than offset by higher LTV.', type: 'growth' },
        { label: 'Sensitivity',    text: 'This ratio assumes 18-month average tenure. If tenure dropped to 14 months, the ratio falls to ~1:17 — still strong but worth monitoring monthly via attrition.', type: 'risk' },
      ],
      dataKey: 'cacLtvRatio', format: (v) => `1:${v.toFixed(1)}`, color: '#204CC7',
      target: { value: 3, label: 'Industry min 1:3' },
    },
    // ── 11. Hours Available ──────────────────────────────────────────────────
    'hours': {
      title: 'Resource Utilization',
      subtitle: 'Total billable capacity across the team this month',
      tooltip: 'Total billable hours the team has this month — calculated at 160 hours per person across full headcount. The denominator behind every utilisation question: how loaded the team is, where the slack sits, whether to hire.',
      insights: [
        { label: 'Capacity at a glance', text: '10,080 hrs/month across 63 people — 4,800 in A&T (30 ppl × 160), 5,280 in SEM (33 ppl × 160). 8,400 hrs are spoken for; 1,680 hrs (≈10 person-months) are still free.', type: 'growth' },
        { label: 'Where the pressure is', text: 'SEM Managers are the bottleneck — 9 leads at 94% utilization, only 80 hrs spare across the layer. SEM overall sits at 86%; A&T is calmer at 80%.', type: 'risk' },
        { label: 'Where the slack is', text: 'Contractor pools hold the most headroom: A&T Non-FTE at 61% (440 hrs free, 7 people), SEM Non-FTE at 70% (240 hrs free, 5 people). Push overflow here before adding FTE headcount.', type: 'action' },
      ],
      dataKey: 'hours', format: (v) => `${v.toLocaleString()} hrs`, color: '#FDAB3D',
      atKey: 'hoursAt', atLabel: 'A&T', semKey: 'hoursSem', semLabel: 'SEM',
      splitMode: 'stack',
    },
    // ── 12. Revenue Available ────────────────────────────────────────────────
    'rev-avail': {
      title: 'Revenue Available',
      subtitle: 'Unfilled capacity expressed as revenue at current AOV',
      tooltip: 'Idle billable capacity translated into rupees at current rates. Lower is better — every rupee here is revenue we *could* be earning but have not yet sold; rising values mean the sales team has room to ramp without hiring.',
      insights: [
        { label: 'Where we are',  text: '₹24L of capacity sits idle in April — down from ₹31L a year ago as utilization climbed from 64% to 83%. Lower is better here: every rupee idle is revenue not earned.', type: 'risk' },
        { label: 'Where the slack is', text: '₹13L of the ₹24L is in SEM, ₹11L in A&T. SEM\'s slack is concentrated in the contractor pool (good — flexible to ramp); A&T\'s is in FTE (harder to absorb without new pipeline).', type: 'risk' },
        { label: 'Where to push',  text: 'Run a targeted A&T outbound push ahead of Jul–Sep tax season. Historically 40% of A&T onboards land in this window — converting just 6 leads at ₹58K AOV closes the A&T gap.', type: 'action' },
      ],
      dataKey: 'revAvail', format: formatLakh, color: '#7C3AED',
      lowerIsBetter: true,
      atKey: 'revAvailAt', atLabel: 'A&T', semKey: 'revAvailSem', semLabel: 'SEM',
      splitMode: 'compare',
    },
    // ── 13. Client Relationships ─────────────────────────────────────────────
    'client-rel': {
      title: 'Client Relationships',
      subtitle: 'Health distribution across active client accounts by HOD',
      tooltip: 'Share of active clients each HOD has rated as Excellent in the relationship health check. The non-financial early-warning system — relationship dips usually show up here 2–3 months before they show up in churn.',
      insights: [
        { label: 'Where we are',  text: '64% of 115 active clients are rated Excellent — 73 in the top bucket, 27 Good, 15 flagged for attention. The overall health has drifted up from 58% a year ago.', type: 'growth' },
        { label: 'Per HOD',        text: 'Tejas (COO) leads at 75% Excellent across his oversight portfolio. SEM HODs sit at ~63% each (Chinmay 35 clients, Amisha 30). A&T HODs track just above at 64% (Zubear 28, Irshad 22).', type: 'growth' },
        { label: 'Where the risk is', text: 'The 15 "Needs Attention" clients cluster under Chinmay (5) and Amisha (4). Two are already on the CLA list — the remaining 9 are the at-risk pipeline worth a QBR cadence this month.', type: 'action' },
      ],
      dataKey: 'clientRelPct', format: (v) => `${v}%`, color: '#00C875', unit: '%',
      target: { value: 70, label: 'Target 70% excellent' },
      atKey: 'clientRelAt', atLabel: 'A&T excellent', semKey: 'clientRelSem', semLabel: 'SEM excellent',
      splitMode: 'compare',
    },
    // ── 14. At-risk Clients (CLA) ────────────────────────────────────────────
    'at-risk-client': {
      title: 'At-risk Clients',
      subtitle: 'Clients on the CLA list — Can Lose Anytime',
      tooltip: 'Clients flagged by their HOD as CLA — Can Lose Anytime. Split into Sureshot (almost gone, plan for the loss) and Saveable (recoverable with a focused intervention). Lower is better; this is the next-month churn pipeline.',
      insights: [
        { label: 'Where we are',  text: '5 clients are currently on the CLA list — 2 flagged Sureshot (material loss incoming), 3 Saveable (recoverable with intervention). That\'s 4.3% of the active roster.', type: 'risk' },
        { label: 'Concentration',  text: '3 of 5 are SEM accounts (Bio Basket, Valiente Caps, Meeami Fashion), 2 are A&T (FRR BLOGS, Green Valley). Bio Basket + FRR BLOGS are the Sureshot pair — both on Chinmay and Mihir respectively.', type: 'risk' },
        { label: 'What to do',     text: 'The 3 Saveable accounts share a pattern — unresponsive stakeholders and shifting budgets. Schedule direct HOD-to-founder calls this week; historically that lifts save rate from 30% → 55%.', type: 'action' },
      ],
      dataKey: 'atRiskClients', format: (v) => String(v), color: '#E2445C',
      lowerIsBetter: true,
      target: { value: 3, label: 'Healthy ceiling 3' },
      atKey: 'atRiskClientsAt', atLabel: 'A&T (count)', semKey: 'atRiskClientsSem', semLabel: 'SEM (count)',
      splitMode: 'stack',
    },
    // ── 15. Employee CLA ─────────────────────────────────────────────────────
    'at-risk-emp': {
      title: 'Employee CLA',
      subtitle: 'Team members flagged for performance concerns',
      tooltip: 'Team members on the performance watchlist — CLA (Can Lose Anytime) or NTF (Needs To Fix). Used to drive coaching cadence and PIP planning; lower is better, and overlap with the At-risk Clients list compounds the risk.',
      insights: [
        { label: 'Where we are',  text: '4 employees are on the CLA/NTF watchlist — 2 A&T (Zubear S., Mihir L.) and 2 SEM (Chinmay P., Harshal R.). That\'s 6.3% of the 63-person team — above the 4% healthy baseline.', type: 'risk' },
        { label: 'Client impact',  text: 'Between them these 4 touch 11 distinct clients — 4 of which (Bio Basket, Valiente Caps, FRR BLOGS, Green Valley) overlap with the At-risk Clients list. Compounding risk: a weak employee on an already-CLA account.', type: 'risk' },
        { label: 'What to do',     text: 'Two of the four (Chinmay, Zubear) are HODs — they need coaching, not replacement. For Harshal and Mihir, 30-day PIPs with weekly check-ins. Re-assess by end of Q2.', type: 'action' },
      ],
      dataKey: 'atRiskEmp', format: (v) => String(v), color: '#FDAB3D',
      lowerIsBetter: true,
      target: { value: 2, label: 'Healthy ceiling 2' },
      atKey: 'atRiskEmpAt', atLabel: 'A&T (count)', semKey: 'atRiskEmpSem', semLabel: 'SEM (count)',
      splitMode: 'stack',
    },
    // ── 16. Outstanding Dues ─────────────────────────────────────────────────
    // The fourth tile in row 4. Pairs with the Billing & Subscriptions
    // sub-tab on Customers — total receivables across the active book.
    // Lower is better. Service split tracks A&T's slower compliance-
    // billing cycle vs SEM's more transactional cadence; the chart
    // stacks A&T below and SEM on top so the total bar matches the
    // headline figure.
    'billing': {
      title: 'Outstanding Dues',
      subtitle: 'Total receivables across all active clients',
      tooltip: 'Money invoiced but not yet collected — the gap between billed revenue and paid revenue. Lower is better; a growing outstanding balance signals collection slippage that eventually drags cash flow even when MRR is healthy.',
      insights: [
        { label: 'Where we are',   text: '₹15.35L outstanding across 24 active accounts in April — down 4.7% from March\'s ₹16.10L peak (FY-end billing crunch resolved). Trailing 6-month average is ₹13.6L.', type: 'risk' },
        { label: 'Where it sits',  text: 'A&T carries ₹9.20L (60%) on a slower compliance-billing cycle; SEM ₹6.15L (40%) is more transactional. Top 5 accounts (Urban Living, Acme Logistics, Sunrise Retail, BookMyTrip, Digital Dynamics) carry ~70% of the outstanding pool.', type: 'risk' },
        { label: 'Where to push',  text: 'Trigger collection-call cadence on the 8 accounts overdue by 30+ days — historically a follow-up call inside 45 days of due date lifts collection rate by 25%. Worth ~₹3.8L pulled forward this month.', type: 'action' },
      ],
      dataKey: 'outstanding', format: formatLakh, color: '#E2445C',
      lowerIsBetter: true,
      atKey: 'outstandingAt', atLabel: 'A&T', semKey: 'outstandingSem', semLabel: 'SEM',
      splitMode: 'stack',
    },
  };

  // ── KpiCard ────────────────────────────────────────────────────────────────
  // Shared card UI for the 12 home tiles. One unified visual treatment so the
  // grid reads as a single component repeated 12 times — not 12 designs.
  //
  // Color discipline:
  //   • Card chrome (icon, hover, focus, chevron) → ONE brand blue (#204CC7).
  //     Per-metric color personality has been removed; KpiMeta.color is now
  //     used only inside the drawer chart.
  //   • Service identity (A&T cyan, SEM purple) → reserved for the segment
  //     bar at the bottom, where the colors carry semantic meaning.
  //   • Headline value → black, except where the value itself encodes sign
  //     (Attrition red, Net Growth signed). That stays the caller's choice.
  //
  // Replacing the old sparkline:
  //   The previous decorative sparkline duplicated trend information already
  //   carried by the delta pill, at a resolution too low to read. It also
  //   forced a per-metric colour into the chrome. The new element is a slim
  //   service-split bar: A&T and SEM rendered as two proportional segments,
  //   directly above their numeric labels. This makes the split visible in
  //   under a second instead of forcing the eye to compare two numbers.
  //   For metrics where the values can be negative or near-zero (Net Growth),
  //   the bar is suppressed via `splitBar={false}` and the labels stand alone.
  const BLUE = '#204CC7';

  // ── InfoTooltip ───────────────────────────────────────────────────────────
  // Small (i) icon trigger that surfaces a layman explanation of the metric
  // on hover or keyboard focus. Lives inside each KpiCard's title row.
  //
  // Why an internal scoped group (`group/info`) instead of relying on the
  // card's outer `group`: hovering anywhere on the card triggers the card-
  // level group state, but we want the tooltip to ONLY show when the user
  // hovers / focuses the (i) itself, not the whole card. Tailwind 3.2+
  // named groups give us that locality without prop drilling state.
  //
  // Why click is swallowed: the parent card responds to click and Enter/
  // Space to open the KPI drawer. Without `stopPropagation`, clicking the
  // (i) would also open the drawer — a confusing dual-action. The button
  // is purely a tooltip anchor; the drawer remains the drill-down path.
  //
  // Why the wrapping card was converted from <button> to <div role="button">:
  // HTML5 forbids interactive content nested inside a <button>, and we need
  // a real <button> for the (i) so it gets keyboard focus and a screen-
  // reader name. The card-as-div pattern preserves activation semantics
  // (Enter / Space → openDrawer, native focus ring on tab) while making
  // room for the nested trigger.
  const InfoTooltip = ({ text, title }: { text: string; title: string }) => (
    // Outer span is NOT `relative` on purpose. Removing the local
    // positioning context lets the tooltip popover (an absolutely-
    // positioned descendant) bubble up to the next positioned
    // ancestor — the card's title row, which is `relative`. Anchoring
    // the popover to the title row instead of the (i) trigger means
    // it always lands inside the card's bounds regardless of where
    // the (i) ended up after title truncation, and never spills into
    // a sibling column or the sidebar.
    <span className="inline-flex group/info shrink-0">
      <button
        type="button"
        // Stop the click and Enter/Space activation from bubbling up to the
        // card — otherwise the drawer would open every time someone reaches
        // for the explanation.
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
        aria-label={`What does "${title}" mean?`}
        className="w-4 h-4 inline-flex items-center justify-center rounded-full text-black/35 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 transition-colors"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
      {/* Tooltip popover.
          - role="tooltip" + the trigger's aria-label give SR users
            the full text without needing to read the popover at all.
          - pointer-events-none so the mouse moving onto the popover
            doesn't register as a hover target itself (would cause a
            flicker once the wrapper hover state cleared).
          - Positioned `top-full right-0` against the *title row*
            (the next positioned ancestor): popover opens downward
            with its right edge aligned to the title row's right edge
            (i.e. the card's content right edge). Width w-60 (240px)
            fits inside the card's content area, so the popover never
            spills into a sibling card or the sidebar — fixes the
            previous left-clipping on first-column cards.
          - z-30 sits above the value / split-bar that visually appear
            below the title row, so the popover reads cleanly. */}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 mt-2 w-60 z-30 px-3 py-2.5 rounded-lg bg-[#0F172A] text-white text-caption font-normal leading-snug shadow-[0_10px_24px_-8px_rgba(15,23,42,0.45)] opacity-0 invisible -translate-y-0.5 transition-all duration-150 group-hover/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 group-focus-within/info:opacity-100 group-focus-within/info:visible group-focus-within/info:translate-y-0"
      >
        <span className="block text-white font-semibold mb-1">{title}</span>
        <span className="block text-white/85">{text}</span>
      </span>
    </span>
  );

  const KpiCard = ({
    kpiId,
    Icon,
    iconChar,
    value,
    delta,
    ariaLabel,
  }: {
    kpiId: KpiId;
    Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    iconChar?: string;          // e.g. "₹" for MRR
    value: React.ReactNode;
    delta?: React.ReactNode;    // pill or sub-line under headline
    // Required: a value-rich label that screen readers can read in
    // place of the visual hierarchy. The aria-label still includes
    // the A&T / SEM split values for screen-reader users — even
    // though the visual surface no longer renders them, the data
    // is still meaningful to announce on activation.
    ariaLabel: string;
  }) => {
    const meta = kpiMeta[kpiId];
    // Card uses role="button" rather than a real <button> so the (i)
    // info trigger inside the title row can be a real <button> without
    // nesting interactive elements (HTML5 forbids button-in-button).
    // Keyboard semantics are preserved via tabIndex={0} + Enter/Space
    // keydown handlers that mirror the native button activation.
    const openDrawer = () => setOpenKPI(kpiId);
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={openDrawer}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDrawer();
          }
        }}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        // Card chrome — the consistent subtle-blue identity:
        //   • Surface tinted #FAFBFD (≈0.7% blue) so the grid reads
        //     cool against the page background instead of stark white.
        //   • Border #E5EAF7 (cool blue-tinted) instead of black/[0.06]
        //     warm-grey, so the border participates in the blue
        //     family rather than reading as a neutral.
        //   • Hover bumps the border to brand-blue/30 + lifts the
        //     wash from 2.5% → 4.5% (genuinely felt feedback).
        //   • Shadow stays the same brand-blue shadow on hover.
        // Padding bumped p-5 (20px) → p-6 (24px) so the card has
        // room to breathe after the service-split block was retired.
        // 24px puts the icon-chip / headline / delta on a calmer
        // vertical rhythm and matches the spacing used in the
        // detail drawer cards on the same page.
        //
        // STACKING — `hover:z-20 focus-within:z-20` is the fix for
        // the (i) tooltip being clipped by the row of cards below.
        // The card's `hover:-translate-y-[2px]` transform creates a
        // local stacking context, which traps the tooltip's z-30
        // inside it. Without z-20 here, the next row's cards
        // (rendered later in DOM order) paint over the tooltip.
        // focus-within covers the keyboard case when the (i) trigger
        // gains focus from a Tab key.
        className="group relative bg-[#FAFBFD] rounded-xl p-6 border border-[#E5EAF7] hover:z-20 focus-within:z-20 hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-visible"
      >
        {/* Uniform brand-blue wash that fades in on hover. Same
            treatment on every card so the grid feels like one
            component repeated. The wash lives inside its own
            rounded-xl + overflow-hidden shell so removing
            overflow-hidden at the card level (so the (i) tooltip
            can spill outside) doesn't break the rounded clip. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-[#204CC7]/[0.045] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Top row — icon chip + title + (i) + chevron, all locked
            to the icon-chip's vertical centerline.
            Previously used `items-start` with a `mt-0.5` nudge on
            the chevron, which left it visually drifting because the
            chevron was being aligned to the title text-baseline
            rather than the chip center. Switching to `items-center`
            on both flex containers and dropping the `mt-0.5` hack
            puts every element on the chip's centerline — chevron
            now sits exactly opposite the chip across the row. */}
        <div className="relative flex items-center justify-between mb-5 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Icon chip — 36×36 with a thin inset ring so it reads
                as a properly anchored chip rather than a flat
                coloured rectangle. The ring is brand-blue at 10%
                so it stays in the blue family without competing
                with the icon glyph. */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08] ring-1 ring-inset ring-[#204CC7]/[0.10]">
              {Icon ? (
                <Icon className="w-4 h-4" style={{ color: BLUE }} />
              ) : (
                <span className="text-h3 font-bold leading-none" style={{ color: BLUE }}>{iconChar}</span>
              )}
            </div>
            <span className="text-black/65 text-caption font-semibold truncate min-w-0">{meta.title}</span>
            <InfoTooltip text={meta.tooltip} title={meta.title} />
          </div>
          <ChevronRight
            className="w-4 h-4 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
            aria-hidden="true"
          />
        </div>

        {/* Headline + delta pill / sub-line */}
        <div className="relative">
          <div className="text-h1 leading-none">{value}</div>
          {delta && <div className="mt-2.5">{delta}</div>}
        </div>

        {/* Service split block retired entirely. Each card now
            ends on the headline value + delta line — calmest
            possible shape. The A&T / SEM breakdown still lives
            inside the drawer (chart + drawer-table rows), so the
            information is one click away when the admin actually
            needs it. */}
      </div>
    );
  };

  // Reusable pill for MoM/YoY change. Tints itself based on direction +
  // whether the metric considers "up" or "down" as good (lowerIsBetter).
  const DeltaPill = ({
    value,
    suffix = '%',
    label,
    direction,           // 'positive' | 'negative' | 'neutral'
  }: {
    value: number | string;
    suffix?: string;
    label?: string;
    direction: 'positive' | 'negative' | 'neutral';
  }) => {
    // Neutral pills shifted from warm grey (`bg-black/[0.04]`) to
    // the brand-blue family so unsigned deltas join the rest of
    // the card's blue identity. Positive/negative semantics stay
    // unchanged — green for good direction, rose for bad — so the
    // MoM/YoY signal still reads at a glance.
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
  };

  // ── Billing rates per service line (₹/hour, blended across roles) ──
  // Used by the Resource Utilization table to surface each team's
  // monthly revenue capacity = hoursAvailable × rate. A&T ("Finance"
  // here) bills at ₹1,500/hr blended across managers/FTE/exec; SEM
  // ("Performance Marketing") at ₹2,000/hr (specialised work — paid
  // media, creative). Used at every row level so a service / role /
  // employee row all read the same per-hour pricing for the team
  // they belong to.
  const BILLING_RATE_BY_SERVICE: Record<string, number> = {
    'Finance':                1500,
    'Performance Marketing':  2000,
  };
  /** Resolve billing rate for a service. Defaults to ₹1,500 — a safe
   *  floor that won't quietly drop revenue on a typo. */
  const billingRateFor = (service: string): number =>
    BILLING_RATE_BY_SERVICE[service] ?? 1500;

  // Resource Utilization - Monthly capacity tracking (160 hrs/month per FTE)
  const resourceData = [
    {
      service: 'Finance',
      hoursAllocated: 3840,
      hoursAvailable: 4800,
      totalHrUnallocated: 960,
      totalHrsUnutilizedPercent: 20,
      subCategories: [
        {
          name: 'Managers',
          hoursAllocated: 1120,
          hoursAvailable: 1280,
          totalHrUnallocated: 160,
          totalHrsUnutilizedPercent: 12.5,
          employees: [
            { name: 'Abdul Rahman', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Anil Kapoor', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Afroz Khan', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Suman Patel', hoursAllocated: 144, hoursAvailable: 160, totalHrUnallocated: 16, totalHrsUnutilizedPercent: 10 },
            { name: 'Mansi Shah', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Jigar Mehta', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Irshad Ali', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Zubeer Ahmed', hoursAllocated: 120, hoursAvailable: 160, totalHrUnallocated: 40, totalHrsUnutilizedPercent: 25 },
          ]
        },
        {
          name: 'Full Time Employee',
          hoursAllocated: 2040,
          hoursAvailable: 2400,
          totalHrUnallocated: 360,
          totalHrsUnutilizedPercent: 15,
          employees: [
            { name: 'Rohan Desai', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Kavita Nair', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Vikram Singh', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Neha Gupta', hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25, totalHrsUnutilizedPercent: 15.6 },
            { name: 'Arjun Reddy', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Priya Sharma', hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26, totalHrsUnutilizedPercent: 16.25 },
            { name: 'Karan Joshi', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Divya Iyer', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Rajesh Kumar', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Anjali Rao', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Deepak Verma', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Sneha Pillai', hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25, totalHrsUnutilizedPercent: 15.6 },
            { name: 'Amit Agarwal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Pooja Menon', hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26, totalHrsUnutilizedPercent: 16.25 },
            { name: 'Rahul Bhat', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
          ]
        },
        {
          name: 'Non Full Time Employee',
          hoursAllocated: 680,
          hoursAvailable: 1120,
          totalHrUnallocated: 440,
          totalHrsUnutilizedPercent: 39.3,
          employees: [
            { name: 'Meera Kulkarni', hoursAllocated: 95, hoursAvailable: 160, totalHrUnallocated: 65, totalHrsUnutilizedPercent: 40.6 },
            { name: 'Sanjay Malik', hoursAllocated: 98, hoursAvailable: 160, totalHrUnallocated: 62, totalHrsUnutilizedPercent: 38.75 },
            { name: 'Ritu Saxena', hoursAllocated: 92, hoursAvailable: 160, totalHrUnallocated: 68, totalHrsUnutilizedPercent: 42.5 },
            { name: 'Gaurav Bhatt', hoursAllocated: 96, hoursAvailable: 160, totalHrUnallocated: 64, totalHrsUnutilizedPercent: 40 },
            { name: 'Swati Jain', hoursAllocated: 94, hoursAvailable: 160, totalHrUnallocated: 66, totalHrsUnutilizedPercent: 41.25 },
            { name: 'Nitin Pandey', hoursAllocated: 97, hoursAvailable: 160, totalHrUnallocated: 63, totalHrsUnutilizedPercent: 39.4 },
            { name: 'Shikha Tripathi', hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52, totalHrsUnutilizedPercent: 32.5 },
          ]
        },
      ]
    },
    {
      service: 'Performance Marketing',
      hoursAllocated: 4560,
      hoursAvailable: 5280,
      totalHrUnallocated: 720,
      totalHrsUnutilizedPercent: 13.6,
      subCategories: [
        {
          name: 'Managers',
          hoursAllocated: 1360,
          hoursAvailable: 1440,
          totalHrUnallocated: 80,
          totalHrsUnutilizedPercent: 5.6,
          employees: [
            { name: 'Rakesh Sinha', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Shweta Malhotra', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Tarun Arora', hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10, totalHrsUnutilizedPercent: 6.25 },
            { name: 'Nidhi Choudhary', hoursAllocated: 154, hoursAvailable: 160, totalHrUnallocated: 6, totalHrsUnutilizedPercent: 3.75 },
            { name: 'Varun Chopra', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Pallavi Bansal', hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10, totalHrsUnutilizedPercent: 6.25 },
            { name: 'Kunal Thakur', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Ananya Khanna', hoursAllocated: 146, hoursAvailable: 160, totalHrUnallocated: 14, totalHrsUnutilizedPercent: 8.75 },
            { name: 'Rohit Bhardwaj', hoursAllocated: 160, hoursAvailable: 160, totalHrUnallocated: 0, totalHrsUnutilizedPercent: 0 },
          ]
        },
        {
          name: 'Full Time Employee',
          hoursAllocated: 2640,
          hoursAvailable: 3040,
          totalHrUnallocated: 400,
          totalHrsUnutilizedPercent: 13.2,
          employees: [
            { name: 'Ishaan Puri', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Shreya Kapoor', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Mayank Ahuja', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Tanvi Deshmukh', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Aditya Rane', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Riya Chawla', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Harsh Mittal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Simran Kohli', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Aryan Goyal', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Diya Mathur', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Karthik Hegde', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Isha Bhatia', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Siddhant Dua', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Avni Khurana', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Yash Suri', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Naina Grover', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Kabir Sethi', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Mira Dhawan', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Vihaan Sabharwal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
          ]
        },
        {
          name: 'Non Full Time Employee',
          hoursAllocated: 560,
          hoursAvailable: 800,
          totalHrUnallocated: 240,
          totalHrsUnutilizedPercent: 30,
          employees: [
            { name: 'Sara Nayyar', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
            { name: 'Aman Vohra', hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52, totalHrsUnutilizedPercent: 32.5 },
            { name: 'Tara Bajaj', hoursAllocated: 116, hoursAvailable: 160, totalHrUnallocated: 44, totalHrsUnutilizedPercent: 27.5 },
            { name: 'Reyansh Datta', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
            { name: 'Kiara Talwar', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
          ]
        },
      ]
    },

  ];

  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);

  // Margin report states
  const [expandedMarginService, setExpandedMarginService] = useState<string | null>(null);
  const [expandedMarginCategory, setExpandedMarginCategory] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const [selectedMarginService, setSelectedMarginService] = useState<'All' | 'Finance' | 'Performance Marketing'>('All');

  // Client-wise margin report states
  const [clientMarginView, setClientMarginView] = useState<'service' | 'hod'>('service');
  const [expandedClientGroup, setExpandedClientGroup] = useState<string | null>(null);
  const [clientMarginSort, setClientMarginSort] = useState<'marginPercent' | 'billingPerMonth'>('marginPercent');
  const [clientMarginSortDir, setClientMarginSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedClientMargins = [...clientMarginData].sort((a, b) => {
    const multiplier = clientMarginSortDir === 'desc' ? -1 : 1;
    return (a[clientMarginSort] - b[clientMarginSort]) * multiplier;
  });

  const clientMarginByService = (() => {
    const groups: Record<string, ClientMarginEntry[]> = {};
    sortedClientMargins.forEach(c => {
      if (!groups[c.service]) groups[c.service] = [];
      groups[c.service].push(c);
    });
    return groups;
  })();

  const clientMarginByHOD = (() => {
    const groups: Record<string, ClientMarginEntry[]> = {};
    sortedClientMargins.forEach(c => {
      if (!groups[c.hod]) groups[c.hod] = [];
      groups[c.hod].push(c);
    });
    return groups;
  })();

  const toggleClientMarginSort = (col: typeof clientMarginSort) => {
    if (clientMarginSort === col) {
      setClientMarginSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setClientMarginSort(col);
      setClientMarginSortDir('desc');
    }
  };

  const formatClientCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  // Client Relationship — COO first (company-wide oversight), then HODs by service
  const hodRelationships = [
    {
      hod: 'Tejas Atha',
      initials: 'TA',
      color: '#3B82F6',
      department: 'COO · All services',
      totalClients: 20,
      excellent: 15,
      good: 4,
      needsAttention: 1,
    },
    {
      hod: 'Zubear Shaikh',
      initials: 'ZS',
      color: '#06B6D4',
      department: 'Finance',
      totalClients: 28,
      excellent: 18,
      good: 7,
      needsAttention: 3,
    },
    {
      hod: 'Irshad Qureshi',
      initials: 'IQ',
      color: '#06B6D4',
      department: 'Finance',
      totalClients: 22,
      excellent: 14,
      good: 5,
      needsAttention: 3,
    },
    {
      hod: 'Chinmay Pawar',
      initials: 'CP',
      color: '#7C3AED',
      department: 'Performance Marketing',
      totalClients: 35,
      excellent: 22,
      good: 10,
      needsAttention: 3,
    },
    {
      hod: 'Amisha Jain',
      initials: 'AJ',
      color: '#7C3AED',
      department: 'Performance Marketing',
      totalClients: 30,
      excellent: 19,
      good: 8,
      needsAttention: 3,
    },
  ];

  // ── KPI card stats for the 3 relationship / health widgets ───────────────
  // Derived from hodRelationships + the two CLA lists. Tejas (COO) is the
  // rollup view and overlaps the HOD portfolios, so his numbers are excluded
  // from the totals to avoid double-counting. Service split uses HOD
  // department (A&T vs Performance Marketing).
  const relationshipStats = (() => {
    // HODs only (exclude COO — his portfolio overlaps the HODs)
    const hods = hodRelationships.filter(h => h.department !== 'COO · All services');
    const atHods  = hods.filter(h => h.department === 'Finance');
    const semHods = hods.filter(h => h.department === 'Performance Marketing');
    const sum = (arr: typeof hods, key: 'totalClients' | 'excellent' | 'good' | 'needsAttention') =>
      arr.reduce((s, h) => s + h[key], 0);
    const total = sum(hods, 'totalClients');
    const excellent = sum(hods, 'excellent');
    const good = sum(hods, 'good');
    const needsAttention = sum(hods, 'needsAttention');
    return {
      total, excellent, good, needsAttention,
      pctExcellent: total > 0 ? Math.round((excellent / total) * 100) : 0,
      atExcellent:  sum(atHods,  'excellent'),
      semExcellent: sum(semHods, 'excellent'),
    };
  })();

  // At-risk client split derived from the CLA nomination list. Responsible
  // person maps to service: Zubear/Mihir → A&T, Chinmay/Harshal → SEM.
  const atRiskClientStats = (() => {
    const atResponsibles  = new Set(['Zubear S.', 'Mihir L.']);
    const isAT = (n: { responsible: string }) => atResponsibles.has(n.responsible);
    return {
      total: clientNominations.length,
      sureshot: clientNominations.filter(n => n.claStatus === 'sureshot').length,
      saveable: clientNominations.filter(n => n.claStatus === 'can-be-saved').length,
      at:  clientNominations.filter(isAT).length,
      sem: clientNominations.filter(n => !isAT(n)).length,
    };
  })();

  // At-risk employee split. Zubear (A&T HOD) + Mihir (Admin, A&T-leaning) →
  // A&T. Chinmay (SEM HOD) + Harshal (Ops, SEM-leaning) → SEM.
  const atRiskEmpStats = (() => {
    const atEmps = new Set(['Zubear S.', 'Mihir L.']);
    const isAT = (n: { employee: string }) => atEmps.has(n.employee);
    const uniqueAffectedClients = new Set(
      employeeNominations.flatMap(e => e.clients)
    );
    return {
      total: employeeNominations.length,
      at:  employeeNominations.filter(isAT).length,
      sem: employeeNominations.filter(n => !isAT(n)).length,
      affectedClients: uniqueAffectedClients.size,
    };
  })();

  // Billing & receivables — sources from the latest monthlyTrend row
  // (Apr'26) so the headline outstanding figure stays in lockstep with
  // the chart that powers the drawer trend. `accountsWithDue` and
  // `monthOnMonthDelta` give the KpiCard's delta pill its content
  // ("8 accounts · -4.7% vs Mar"). The 8-account figure is the count
  // of distinct accounts with outstanding > 0 visible on the Billing
  // & Subscriptions module today; matches the BillingDirectory mock.
  const billingStats = (() => {
    const last = monthlyTrend[monthlyTrend.length - 1];
    const prev = monthlyTrend[monthlyTrend.length - 2];
    const monthOnMonthDelta = prev
      ? Number((((last.outstanding - prev.outstanding) / prev.outstanding) * 100).toFixed(1))
      : 0;
    return {
      total: last.outstanding,
      at:    last.outstandingAt,
      sem:   last.outstandingSem,
      accountsWithDue: 8,
      monthOnMonthDelta,
    };
  })();

  // Employee-level margin report - using hierarchical data
  const filteredMarginData = selectedMarginService === 'All' 
    ? marginReportData 
    : marginReportData.filter(s => s.service === selectedMarginService);
  
  // Calculate company-level margin totals
  const companyTotalBilling = marginReportData.reduce((sum, service) => sum + service.finalBilling, 0);
  const companyTotalCost = marginReportData.reduce((sum, service) => sum + service.totalCost, 0);
  const companyTotalMargin = companyTotalBilling - companyTotalCost;
  const companyMarginPercent = (companyTotalMargin / companyTotalBilling) * 100;
  const totalEmployees = marginReportData.reduce((sum, s) => sum + s.teamCategories.reduce((catSum, c) => catSum + c.employees.length, 0), 0);

  const assignments = [
    { client: 'TechCorp India', project: 'Q4 Tax Planning', dueDate: '2024-12-28', status: 'In Progress' },
    { client: 'Retail Solutions', project: 'Campaign Optimization', dueDate: '2024-12-30', status: 'Pending' },
    { client: 'FinServe Ltd', project: 'Budget Review', dueDate: '2025-01-05', status: 'Scheduled' },
  ];

  const incidents = [
    { client: 'HealthTech Co', issue: 'Delayed GST Filing', priority: 'High', reportedDate: '2024-12-20' },
    { client: 'EduPlatform', issue: 'Client Concern - Team Size', priority: 'Medium', reportedDate: '2024-12-22' },
  ];

  const upcomingBirthdays = [
    { name: 'Anjali Kumar', date: 'Dec 28', team: 'Finance' },
    { name: 'Raj Sharma', date: 'Dec 30', team: 'Performance Marketing' },
    { name: 'Priya Singh', date: 'Jan 2', team: 'Finance' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
          <p className="text-caption text-black/60 mb-1">{data.month}</p>
          <p style={{ color: '#10B981' }} className="text-body font-medium">
            Growth: {data.growth}% (+{data.clientsAdded} clients)
          </p>
          <p style={{ color: '#F43F5E' }} className="text-body font-medium">
            Attrition: {data.attrition}% (-{data.clientsLost} clients)
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate company-level totals
  const companyHoursAllocated = resourceData.reduce((sum, service) => sum + service.hoursAllocated, 0);
  const companyHoursAvailable = resourceData.reduce((sum, service) => sum + service.hoursAvailable, 0);
  const companyHoursUnallocated = companyHoursAvailable - companyHoursAllocated;
  const companyUnutilizedPercent = (companyHoursUnallocated / companyHoursAvailable) * 100;

  // ── Role-wise Margins ──────────────────────────────────────────────────────
  const [roleMarginService, setRoleMarginService] = useState<'all' | 'at' | 'sem'>('all');

  // Role-wise data per service
  // A&T has staffing model: In-house, Outside, Remote executives
  // SEM: all executives are in-house (no staffing model)
  const roleDataAT = [
    { role: 'COO', revenue: 520000, cost: 385000, profit: 135000, margin: 26.0 },
    { role: 'HOD', revenue: 680000, cost: 480000, profit: 200000, margin: 29.4 },
    { role: 'Managers', revenue: 1250000, cost: 920000, profit: 330000, margin: 26.4 },
    { role: 'In-house Executives', revenue: 2850000, cost: 2113000, profit: 737000, margin: 25.9 },
    { role: 'Outside Executives', revenue: 420000, cost: 290600, profit: 129400, margin: 30.8 },
    { role: 'Remote Executives', revenue: 980000, cost: 731400, profit: 248600, margin: 25.4 },
  ];

  const roleDataSEM = [
    { role: 'COO', revenue: 480000, cost: 365000, profit: 115000, margin: 24.0 },
    { role: 'HOD', revenue: 720000, cost: 520000, profit: 200000, margin: 27.8 },
    { role: 'Managers', revenue: 1360000, cost: 1050000, profit: 310000, margin: 22.8 },
    { role: 'In-house Executives', revenue: 4120000, cost: 3241600, profit: 878400, margin: 21.3 },
    { role: 'Outside Executives', revenue: 440000, cost: 324200, profit: 115800, margin: 26.3 },
    { role: 'Remote Executives', revenue: 1120000, cost: 886600, profit: 233400, margin: 20.8 },
  ];

  const roleDataAll = roleDataAT.map((at, i) => ({
    role: at.role,
    revenue: at.revenue + roleDataSEM[i].revenue,
    cost: at.cost + roleDataSEM[i].cost,
    profit: at.profit + roleDataSEM[i].profit,
    margin: parseFloat((((at.profit + roleDataSEM[i].profit) / (at.revenue + roleDataSEM[i].revenue)) * 100).toFixed(1)),
  }));

  const activeRoleData = roleMarginService === 'at' ? roleDataAT : roleMarginService === 'sem' ? roleDataSEM : roleDataAll;
  const roleTotal = activeRoleData.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const roleTotalMargin = roleTotal.revenue > 0 ? (roleTotal.profit / roleTotal.revenue) * 100 : 0;

  // In-house vs Outside breakdown (A&T only — staffing model)
  const inhouseAT = roleDataAT.filter(r => ['COO', 'HOD', 'Managers', 'In-house Executives'].includes(r.role));
  const outsideAT = roleDataAT.filter(r => ['Outside Executives', 'Remote Executives'].includes(r.role));
  const inhouseTotalAT = inhouseAT.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const outsideTotalAT = outsideAT.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const inhouseMarginAT = inhouseTotalAT.revenue > 0 ? (inhouseTotalAT.profit / inhouseTotalAT.revenue) * 100 : 0;
  const outsideMarginAT = outsideTotalAT.revenue > 0 ? (outsideTotalAT.profit / outsideTotalAT.revenue) * 100 : 0;

  const formatRoleCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  return (
    <div className="space-y-7" role="region" aria-label="Dashboard overview">
      {/* ═══ KPI Widgets — 4×3 Grid ═══
          Cards are tappable; opening drawer shows full breakdown.
          One uniform blue chrome across all 12 tiles. Bottom of each card
          carries a slim service-split bar (A&T cyan / SEM purple) — the
          only place colour is allowed to mean something. */}
      <div className="grid grid-cols-4 gap-5">

        {/* 1. Active MRR */}
        <KpiCard
          kpiId="mrr"
          iconChar="₹"
          value={formatLakh(activeMRR.total)}
          delta={<DeltaPill direction="positive" value={activeMRR.change} label="vs Mar" />}
          ariaLabel={`Active MRR ${formatLakh(activeMRR.total)}, up ${activeMRR.change}% versus March. A and T ${formatLakh(activeMRR.at)}, SEM ${formatLakh(activeMRR.sem)}. Activate to open details.`}
        />

        {/* 2. Active Customers */}
        <KpiCard
          kpiId="customers"
          Icon={Users}
          value={activeCustomers.total}
          delta={<DeltaPill direction="positive" value={`+${activeCustomers.change}`} suffix="" label="this month" />}
          ariaLabel={`Active Customers ${activeCustomers.total}, plus ${activeCustomers.change} this month. A and T ${activeCustomers.at}, SEM ${activeCustomers.sem}. Activate to open details.`}
        />

        {/* 3. Kickoff */}
        <KpiCard
          kpiId="kickoff"
          Icon={Briefcase}
          value={kickoffs.total}
          delta={<DeltaPill direction="positive" value={formatLakh(kickoffs.revenue)} suffix="" label="new revenue" />}
          ariaLabel={`Kickoffs ${kickoffs.total}, ${formatLakh(kickoffs.revenue)} new revenue. A and T ${kickoffs.at}, SEM ${kickoffs.sem}. Activate to open details.`}
        />

        {/* 4. Attrition (lower-is-better — red headline + neutral pill) */}
        <KpiCard
          kpiId="attrition"
          Icon={UserMinus}
          value={<span className="text-[#E2445C]">{attrition.rate}%</span>}
          delta={<DeltaPill direction="neutral" value={attrition.total} suffix="" label="clients lost" />}
          ariaLabel={`Attrition ${attrition.rate} percent, ${attrition.total} clients lost. A and T ${attrition.at}, SEM ${attrition.sem}. Activate to open details.`}
        />
      </div>

      <div className="grid grid-cols-4 gap-5">

        {/* 5. AOV */}
        <KpiCard
          kpiId="aov"
          Icon={ShoppingCart}
          value={formatLakh(aov.blended)}
          delta={<DeltaPill direction="positive" value={aov.change} label="vs Mar" />}
          ariaLabel={`Average Order Value ${formatLakh(aov.blended)}, up ${aov.change}% versus March. A and T ${formatLakh(aov.at)}, SEM ${formatLakh(aov.sem)}. Activate to open details.`}
        />

        {/* 6. Net Growth (sign-aware headline)
            Suppress the proportion bar — values can be negative or zero,
            which would make a percentage-of-total bar misleading. The
            signed labels alone are clearer here. */}
        <KpiCard
          kpiId="net-growth"
          Icon={TrendingUp}
          value={
            <span className={netGrowth.rate >= 0 ? 'text-emerald-600' : 'text-[#E2445C]'}>
              {netGrowth.rate >= 0 ? '+' : ''}{netGrowth.rate}%
            </span>
          }
          delta={
            <span className="inline-flex items-center gap-1.5 text-caption">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">+{netGrowth.added} in</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">-{netGrowth.lost} out</span>
            </span>
          }
          ariaLabel={`Net Growth ${netGrowth.rate >= 0 ? 'up' : 'down'} ${Math.abs(netGrowth.rate)} percent. ${netGrowth.added} clients in, ${netGrowth.lost} out. A and T ${netGrowth.at >= 0 ? 'plus' : 'minus'} ${Math.abs(netGrowth.at)}, SEM ${netGrowth.sem >= 0 ? 'plus' : 'minus'} ${Math.abs(netGrowth.sem)}. Activate to open details.`}
        />

        {/* 7. Gross Margins */}
        <KpiCard
          kpiId="margins"
          Icon={Percent}
          value={`${grossMarginPercent.toFixed(1)}%`}
          delta={<DeltaPill direction="positive" value={formatLakh(grossMargin)} suffix="" label="gross profit" />}
          ariaLabel={`Gross Margin ${grossMarginPercent.toFixed(1)} percent, ${formatLakh(grossMargin)} gross profit. A and T ${financeMargin} percent, SEM ${semMargin} percent. Activate to open details.`}
        />

        {/* 8. CAC (lower-is-better — down arrow is positive) */}
        <KpiCard
          kpiId="cac"
          Icon={Target}
          value={formatLakh(cac.blended)}
          delta={<DeltaPill direction="positive" value={Math.abs(cac.change)} label="vs Mar" />}
          ariaLabel={`Customer Acquisition Cost ${formatLakh(cac.blended)}, ${cac.change <= 0 ? 'down' : 'up'} ${Math.abs(cac.change)} percent versus March (lower is better). A and T ${formatLakh(cac.at)}, SEM ${formatLakh(cac.sem)}. Activate to open details.`}
        />
      </div>

      <div className="grid grid-cols-4 gap-5">

        {/* 9. LTV */}
        <KpiCard
          kpiId="ltv"
          Icon={Repeat}
          value={formatLakh(ltv.blended)}
          delta={<DeltaPill direction="neutral" value="per client avg." suffix="" />}
          ariaLabel={`Lifetime Value ${formatLakh(ltv.blended)} per client average. A and T ${formatLakh(ltv.at)}, SEM ${formatLakh(ltv.sem)}. Activate to open details.`}
        />

        {/* 10. CAC : LTV */}
        <KpiCard
          kpiId="cac-ltv"
          Icon={BarChart3}
          value={`1 : ${cacLtv.blended}`}
          delta={<DeltaPill direction="positive" value={`${(cacLtv.blended / 3).toFixed(1)}× industry min`} suffix="" />}
          ariaLabel={`CAC to LTV ratio 1 to ${cacLtv.blended}, ${(cacLtv.blended / 3).toFixed(1)} times industry minimum. A and T 1 to ${cacLtv.at}, SEM 1 to ${cacLtv.sem}. Activate to open details.`}
        />

        {/* 11. Hours Available */}
        <KpiCard
          kpiId="hours"
          Icon={Clock}
          value={hoursAvail.total.toLocaleString()}
          delta={<DeltaPill direction="neutral" value="hrs / month" suffix="" />}
          ariaLabel={`Resource Utilization ${hoursAvail.total.toLocaleString()} hours per month. A and T ${hoursAvail.at.toLocaleString()} hours, SEM ${hoursAvail.sem.toLocaleString()} hours. Activate to open details.`}
        />

        {/* 12. Revenue Available (lower-is-better — idle capacity) */}
        <KpiCard
          kpiId="rev-avail"
          Icon={DollarSign}
          value={formatLakh(revAvail.total)}
          delta={<DeltaPill direction="neutral" value="unfilled capacity" suffix="" />}
          ariaLabel={`Revenue Available ${formatLakh(revAvail.total)} unfilled capacity (lower is better). A and T ${formatLakh(revAvail.at)}, SEM ${formatLakh(revAvail.sem)}. Activate to open details.`}
        />
      </div>

      {/* ═══ Row 4 — Relationship & Health widgets (3 cards) ═══
          Three cards covering the "health" axis that the monthly / revenue
          widgets above don't: how clients feel about the work, who's about
          to leave, and which people on the team are at risk. The first two
          lean on the Client Relationship + CLA data that used to live in
          a separate strip on this page; promoting them into the 15-widget
          grid puts them on equal footing with MRR / Kickoffs / Attrition. */}
      <div className="grid grid-cols-4 gap-5">
        {/* 13. Client Relationships */}
        <KpiCard
          kpiId="client-rel"
          Icon={Award}
          value={`${relationshipStats.pctExcellent}%`}
          delta={<DeltaPill direction="positive" value={`${relationshipStats.excellent} excellent`} suffix="" label={`of ${relationshipStats.total}`} />}
          ariaLabel={`Client Relationships ${relationshipStats.pctExcellent} percent excellent, ${relationshipStats.excellent} of ${relationshipStats.total} clients. A and T ${relationshipStats.atExcellent} excellent, SEM ${relationshipStats.semExcellent} excellent. Activate to open details.`}
        />

        {/* 14. At-risk Clients (CLA) — lower-is-better, rose headline */}
        <KpiCard
          kpiId="at-risk-client"
          Icon={AlertTriangle}
          value={<span className="text-[#E2445C]">{atRiskClientStats.total}</span>}
          delta={
            <span className="inline-flex items-center gap-1.5 text-caption">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">{atRiskClientStats.sureshot} sureshot</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold">{atRiskClientStats.saveable} saveable</span>
            </span>
          }
          ariaLabel={`At-risk Clients ${atRiskClientStats.total} total, ${atRiskClientStats.sureshot} sureshot, ${atRiskClientStats.saveable} saveable. A and T ${atRiskClientStats.at}, SEM ${atRiskClientStats.sem}. Activate to open details.`}
        />

        {/* 15. Employee CLA — lower-is-better, amber headline */}
        <KpiCard
          kpiId="at-risk-emp"
          Icon={AlertCircle}
          value={<span className="text-[#FDAB3D]">{atRiskEmpStats.total}</span>}
          delta={<DeltaPill direction="neutral" value={`${atRiskEmpStats.affectedClients} clients impacted`} suffix="" />}
          ariaLabel={`Employee CLA ${atRiskEmpStats.total} employees on the watchlist, ${atRiskEmpStats.affectedClients} clients impacted. A and T ${atRiskEmpStats.at}, SEM ${atRiskEmpStats.sem}. Activate to open details.`}
        />

        {/* 16. Outstanding Dues — lower-is-better, rose headline.
            Pairs with the Billing & Subscriptions sub-tab on the
            Customers tab; clicking the card opens a drawer with
            the trend chart + insights, while the chevron / route
            still leads to the live billing directory. The MoM
            delta pill is sign-aware: negative MoM (collections
            improving) reads as 'positive'. */}
        <KpiCard
          kpiId="billing"
          Icon={Receipt}
          value={<span className="text-[#E2445C]">{formatLakh(billingStats.total)}</span>}
          delta={
            <span className="inline-flex items-center gap-1.5 text-caption">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold">{billingStats.accountsWithDue} accounts</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold ${billingStats.monthOnMonthDelta <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {billingStats.monthOnMonthDelta <= 0 ? '−' : '+'}{Math.abs(billingStats.monthOnMonthDelta)}% MoM
              </span>
            </span>
          }
          ariaLabel={`Outstanding Dues ${formatLakh(billingStats.total)}, ${billingStats.accountsWithDue} accounts with dues, ${billingStats.monthOnMonthDelta <= 0 ? 'down' : 'up'} ${Math.abs(billingStats.monthOnMonthDelta)} percent month over month. A and T ${formatLakh(billingStats.at)}, SEM ${formatLakh(billingStats.sem)}. Activate to open details.`}
        />
      </div>

      {/* Net Growth & Attrition — FY table, Home only.
          Sits below the 15-widget grid as a deeper "how the book moved
          this year" surface for the founder + COO. Audience drove the
          shape: dense monthly columns, sticky particulars column,
          expandable service splits (A&T / PM), an FY total column
          on the right, and a "Compare with PY" toggle to put the YoY
          delta one click away. */}
      {!isAdminland && (
        <NetGrowthAttritionTable data={ngatFY} dataPY={ngatPY} />
      )}

      {/* Growth Trend Chart — Adminland only; intentionally hidden on Home */}
      {isAdminland && (
      <div className="bg-white rounded-xl p-6 border border-black/5">
        <h3 className="text-black/70 mb-4 text-body font-semibold">Net Growth & Attrition Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={growthTrend}>
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAttrition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#000"
              strokeOpacity={0.2}
              tick={{ fill: '#00000066', fontSize: 13 }}
              axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
            />
            <YAxis
              stroke="#000"
              strokeOpacity={0.2}
              tick={{ fill: '#00000066', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area key="area-growth" type="monotone" dataKey="growth" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
            <Area key="area-attrition" type="monotone" dataKey="attrition" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorAttrition)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}

      {/* Resource Utilization
          ─────────────────────────────────────────────────────────────────
          Two views of the same data:
            • Home (super admin)  → lives INSIDE the Hours Available drawer
              (see drawer body below). The founder gets one place — the
              Hours card → drawer — to drill from headline number to team,
              role, and person utilisation, alongside trend + insights.
            • Adminland (operators) → full drillable table, unchanged,
              shown inline below.
         ───────────────────────────────────────────────────────────────── */}
      {isAdminland && (
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="p-5 border-b border-black/5">
          {isAdminland ? (
            <h3 className="text-h3" style={{ color: 'rgba(0,0,0,0.85)' }}>Resource Utilization</h3>
          ) : (
            <>
              <h3 className="text-h3 text-black/85">Resource Utilization Breakdown</h3>
              <p className="text-caption text-black/55 font-normal mt-0.5">How busy each team is, and how much more work they can take on</p>
            </>
          )}
        </div>

        {/* ── Home: Founder-friendly capacity table ──
            Four columns, in plain English:
              1. Team            → with a 3-state status pill
              2. How busy        → bar + %, color-coded
              3. Allocated hours → absolute work being done this month
              4. Free hours left → remaining capacity we could take on
            Three levels of drill-down mirror Adminland: Team → Role → Person.
            Progress bar is capped at 140px so the numeric columns stay
            readable and the eye doesn't have to travel across the whole row. */}
        {!isAdminland && (() => {
          // Shared classifier — only 3 buckets, plain-language labels.
          type Status = { label: string; bar: string; pillBg: string; pillText: string };
          const classify = (pct: number): Status => {
            if (pct < 85)  return { label: 'Has room',      bar: '#00C875', pillBg: 'bg-emerald-50', pillText: 'text-emerald-700' };
            if (pct < 95)  return { label: 'Near full',     bar: '#FDAB3D', pillBg: 'bg-amber-50',   pillText: 'text-amber-700' };
            return            { label: 'Over capacity',     bar: '#E2445C', pillBg: 'bg-rose-50',    pillText: 'text-rose-700' };
          };

          return (
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label="Team capacity this month">
                <thead>
                  <tr className="border-b border-black/5 bg-[#FAFBFC]">
                    <th className="px-5 py-3 text-left text-caption font-semibold text-black/55">Team</th>
                    <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Allocated hours</th>
                    <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Free hours left</th>
                    <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Rev. Capacity</th>
                    <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceData.flatMap((service) => {
                    const utilizationPct = (service.hoursAllocated / service.hoursAvailable) * 100;
                    const isExpanded = expandedService === service.service;
                    const status = classify(utilizationPct);

                    const serviceRow = (
                      <tr
                        key={service.service}
                        className="border-b border-black/5 hover:bg-black/[0.015] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]"
                        onClick={() => setExpandedService(isExpanded ? null : service.service)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedService(isExpanded ? null : service.service);
                          }
                        }}
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${service.service} team — ${isExpanded ? 'expanded' : 'collapsed'}. Activate to ${isExpanded ? 'hide' : 'show'} role breakdown.`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-black/55 transition-transform shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                              aria-hidden="true"
                            />
                            <span className="text-body font-semibold text-black/85">{service.service}</span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-semibold ${status.pillBg} ${status.pillText}`}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.bar }} aria-hidden="true" />
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className="text-body font-medium text-black/75 tabular-nums">
                            {service.hoursAllocated.toLocaleString()}
                          </span>
                          <span className="text-caption text-black/60 ml-1">hrs</span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className="text-body font-semibold text-black/85 tabular-nums">
                            {service.totalHrUnallocated.toLocaleString()}
                          </span>
                          <span className="text-caption text-black/60 ml-1">hrs</span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <span className="text-body font-medium text-black/75 tabular-nums">
                            {formatLakh(service.hoursAvailable * billingRateFor(service.service))}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-right whitespace-nowrap"
                          aria-label={`${service.service} utilization`}
                        >
                          <span className="text-body font-semibold tabular-nums" style={{ color: status.bar }}>
                            {utilizationPct.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );

                    const roleRows = isExpanded
                      ? service.subCategories.flatMap((role) => {
                          const rolePct = (role.hoursAllocated / role.hoursAvailable) * 100;
                          const roleStatus = classify(rolePct);
                          const roleKey = `${service.service}-${role.name}`;
                          const isRoleExpanded = expandedSubCategory === roleKey;
                          const hasEmployees = role.employees && role.employees.length > 0;

                          const roleRow = (
                            <tr
                              key={roleKey}
                              className={`bg-[#FAFBFC] border-b border-black/5 transition-colors ${hasEmployees ? 'cursor-pointer hover:bg-black/[0.02] focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]' : ''}`}
                              onClick={(e) => {
                                if (!hasEmployees) return;
                                e.stopPropagation();
                                setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                              }}
                              onKeyDown={(e) => {
                                if (!hasEmployees) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                                }
                              }}
                              tabIndex={hasEmployees ? 0 : undefined}
                              aria-expanded={hasEmployees ? isRoleExpanded : undefined}
                              aria-label={hasEmployees ? `${role.name} role — ${isRoleExpanded ? 'expanded' : 'collapsed'}. Activate to ${isRoleExpanded ? 'hide' : 'show'} ${role.employees.length} people.` : undefined}
                            >
                              <td className="px-5 py-2.5 pl-10">
                                <div className="flex items-center gap-2">
                                  {hasEmployees ? (
                                    <ChevronDown
                                      className={`w-3 h-3 text-black/55 transition-transform shrink-0 ${isRoleExpanded ? 'rotate-0' : '-rotate-90'}`}
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <span className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  )}
                                  <span className="text-caption font-medium text-black/65">{role.name}</span>
                                  <span className="text-caption text-black/60 tabular-nums">· {role.employees?.length ?? 0}</span>
                                </div>
                              </td>
                              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                <span className="text-caption font-medium text-black/65 tabular-nums">
                                  {role.hoursAllocated.toLocaleString()}
                                </span>
                                <span className="text-caption text-black/60 ml-1">hrs</span>
                              </td>
                              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                <span className="text-caption font-semibold text-black/70 tabular-nums">
                                  {role.totalHrUnallocated.toLocaleString()}
                                </span>
                                <span className="text-caption text-black/60 ml-1">hrs</span>
                              </td>
                              <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                <span className="text-caption font-medium text-black/65 tabular-nums">
                                  {formatLakh(role.hoursAvailable * billingRateFor(service.service))}
                                </span>
                              </td>
                              <td
                                className="px-5 py-2.5 text-right whitespace-nowrap"
                                aria-label={`${role.name} utilization in ${service.service}`}
                              >
                                <span className="text-caption font-semibold tabular-nums" style={{ color: roleStatus.bar }}>
                                  {rolePct.toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          );

                          const employeeRows = isRoleExpanded && hasEmployees
                            ? role.employees.map((emp) => {
                                const empPct = (emp.hoursAllocated / emp.hoursAvailable) * 100;
                                const empStatus = classify(empPct);
                                return (
                                  <tr
                                    key={`${roleKey}-${emp.name}`}
                                    className="bg-white border-b border-black/[0.04]"
                                  >
                                    <td className="px-5 py-2 pl-[60px]">
                                      <span className="text-caption text-black/60">{emp.name}</span>
                                    </td>
                                    <td className="px-5 py-2 text-right whitespace-nowrap">
                                      <span className="text-caption text-black/60 tabular-nums">
                                        {emp.hoursAllocated.toLocaleString()}
                                      </span>
                                      <span className="text-caption text-black/60 ml-1">hrs</span>
                                    </td>
                                    <td className="px-5 py-2 text-right whitespace-nowrap">
                                      <span className="text-caption text-black/60 tabular-nums">
                                        {emp.totalHrUnallocated.toLocaleString()}
                                      </span>
                                      <span className="text-caption text-black/60 ml-1">hrs</span>
                                    </td>
                                    <td className="px-5 py-2 text-right whitespace-nowrap">
                                      <span className="text-caption text-black/60 tabular-nums">
                                        {formatLakh(emp.hoursAvailable * billingRateFor(service.service))}
                                      </span>
                                    </td>
                                    <td
                                      className="px-5 py-2 text-right whitespace-nowrap"
                                      aria-label={`${emp.name} utilization`}
                                    >
                                      <span className="text-caption font-medium tabular-nums" style={{ color: empStatus.bar }}>
                                        {empPct.toFixed(0)}%
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            : [];

                          return [roleRow, ...employeeRows];
                        })
                      : [];

                    return [serviceRow, ...roleRows];
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ── Adminland: Detailed drillable table (unchanged) ── */}
        {isAdminland && (
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Resource utilization by service">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-5 py-3 text-left text-black/65 text-caption font-medium">Service / Teams</th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-caption font-medium">
                    Hours to be Allocated
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-caption font-medium">
                    Allocated Hours
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-caption font-medium">
                    Available Hours
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-caption font-medium">
                    Available Hours %
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resourceData.flatMap((service) => [
                  <tr 
                    key={service.service}
                    className="border-b border-black/5 hover:bg-black/[0.02] cursor-pointer"
                    onClick={() => setExpandedService(expandedService === service.service ? null : service.service)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {service.subCategories.length > 0 && (
                          <ChevronDown className={`w-3.5 h-3.5 text-black/60 transition-transform ${expandedService === service.service ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                        )}
                        <span className="text-black/90 text-body font-medium">{service.service}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.totalHrUnallocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAllocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAvailable.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                  </tr>,
                  ...(expandedService === service.service ? service.subCategories.flatMap((subCat) => [
                      <tr 
                        key={`${service.service}-${subCat.name}`}
                        className="bg-black/[0.01] border-b border-black/5 hover:bg-black/[0.03] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSubCategory(expandedSubCategory === `${service.service}-${subCat.name}` ? null : `${service.service}-${subCat.name}`);
                        }}
                      >
                        <td className="px-5 py-2 pl-10">
                          <div className="flex items-center gap-2">
                            {subCat.employees.length > 0 && (
                              <ChevronDown className={`w-3 h-3 text-black/60 transition-transform ${expandedSubCategory === `${service.service}-${subCat.name}` ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                            )}
                            <span className="text-black/70 text-caption font-medium">{subCat.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrUnallocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAllocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAvailable.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                      </tr>,
                      ...(expandedSubCategory === `${service.service}-${subCat.name}` ? subCat.employees.map((emp) => (
                        <tr key={`${service.service}-${subCat.name}-${emp.name}`} className="bg-black/[0.02] border-b border-black/5">
                          <td className="px-5 py-2 pl-16">
                            <span className="text-black/65 text-caption">{emp.name}</span>
                          </td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.totalHrUnallocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAllocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAvailable.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                        </tr>
                      )) : [])
                  ]) : [])
              ])}
            </tbody>
          </table>
        </div>
        )}

        {/* Intelligence Insights */}
        <div className="border-t border-black/5">
          <button
            onClick={() => toggleSection('ru-insights')}
            className="w-full flex items-center gap-2.5 p-6 pb-0 hover:bg-black/[0.005] transition-colors cursor-pointer"
            style={{ paddingBottom: expandedSections['ru-insights'] ? '0' : '24px' }}
            aria-expanded={expandedSections['ru-insights']}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF1FB' }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />
            </div>
            <h4 className="flex-1 text-left text-body font-semibold" style={{ color: 'rgba(0,0,0,0.85)' }}>Intelligence Insights</h4>
            <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedSections['ru-insights'] ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {expandedSections['ru-insights'] && (() => {
            // Flatten every role across every service so we can pinpoint the single
            // most-stretched and most-slack pool. Insights are computed live from
            // resourceData — they will always match what the table above shows.
            const allRoles = resourceData.flatMap((s) =>
              s.subCategories.map((r) => ({
                service: s.service,
                name: r.name,
                pct: (r.hoursAllocated / r.hoursAvailable) * 100,
                allocated: r.hoursAllocated,
                free: r.totalHrUnallocated,
                people: r.employees?.length ?? 0,
              }))
            );
            const mostStretched = allRoles.reduce((a, b) => (a.pct > b.pct ? a : b));
            const mostSlack = allRoles.reduce((a, b) => (a.pct < b.pct ? a : b));
            const companyBusyPct = 100 - companyUnutilizedPercent;
            const slackPeopleEquiv = Math.max(1, Math.round(mostSlack.free / 160));

            return (
              <div className="p-6 pt-5 space-y-4">
                {/* Company headline strip — one line, no duplication of table rows */}
                <div className="rounded-xl border border-black/[0.06] bg-[#F6F7FF] px-5 py-3.5 flex items-center gap-5">
                  <div className="flex-1">
                    <p className="text-caption text-black/55 font-medium">Company-wide this month</p>
                    <p className="text-h3 text-black/85 mt-0.5 tabular-nums">
                      {companyBusyPct.toFixed(0)}% busy
                      <span className="text-caption font-medium text-black/50 ml-2">
                        · {companyHoursUnallocated.toLocaleString()} hrs free · {companyHoursAllocated.toLocaleString()} of {companyHoursAvailable.toLocaleString()} allocated
                      </span>
                    </p>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="rounded-full h-2" style={{ backgroundColor: '#E8ECF8' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(companyBusyPct, 100)}%`, backgroundColor: '#5B7FD6' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Two action-oriented cards — the reallocation story.
                    The cards are intentionally paired: pressure ←→ slack reads as
                    a single suggestion ("move work from here to there"). */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Pressure card */}
                  <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-md bg-rose-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                      </div>
                      <span className="text-caption font-semibold text-rose-700 uppercase tracking-wider">Where pressure is highest</span>
                    </div>
                    <p className="text-body font-semibold text-black/85">
                      {mostStretched.service} <span className="text-black/40 font-normal">·</span> {mostStretched.name}
                    </p>
                    <p className="text-caption text-black/60 mt-1.5 leading-relaxed">
                      Running at{' '}
                      <span className="font-semibold text-rose-700 tabular-nums">{mostStretched.pct.toFixed(0)}% busy</span>
                      {' '}— only{' '}
                      <span className="font-semibold text-black/80 tabular-nums">{mostStretched.free.toLocaleString()} hrs</span>
                      {' '}spare across {mostStretched.people} {mostStretched.people === 1 ? 'person' : 'people'}. Watch for burnout; consider hiring or trimming scope.
                    </p>
                  </div>

                  {/* Slack card — references the stretched team so the pair reads as one story */}
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      </div>
                      <span className="text-caption font-semibold text-emerald-700 uppercase tracking-wider">Where the slack is</span>
                    </div>
                    <p className="text-body font-semibold text-black/85">
                      {mostSlack.service} <span className="text-black/40 font-normal">·</span> {mostSlack.name}
                    </p>
                    <p className="text-caption text-black/60 mt-1.5 leading-relaxed">
                      Only{' '}
                      <span className="font-semibold text-emerald-700 tabular-nums">{mostSlack.pct.toFixed(0)}% busy</span>
                      {' '}—{' '}
                      <span className="font-semibold text-black/80 tabular-nums">{mostSlack.free.toLocaleString()} hrs</span>
                      {' '}free, roughly {slackPeopleEquiv} {slackPeopleEquiv === 1 ? 'person' : 'people'} of spare time. Cross-deploy to {mostStretched.service} or scale this pool.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* The standalone Client Relationship Overview block that used to
          live here is gone — its data now lives inside the Client
          Relationships KPI card (widget #13) and its drawer's "By HOD"
          section. Same data, single surface. */}

      {/* ═══ Role-wise Margins Breakdown — Adminland only ═══
          Hidden on Home; founder's role-preview view prioritises capacity and
          relationship health over role-level margin detail. Operators who need
          role-level profitability still get it at /adminland/reports. */}
      {isAdminland && (
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
          <div>
            <h3 className="text-body font-semibold text-black/85">Role-wise Margins Breakdown</h3>
            <p className="text-caption text-black/45 mt-0.5">Profitability by organisational role</p>
          </div>
          {/* Service toggle */}
          <div className="flex items-center bg-black/[0.03] rounded-lg p-0.5" role="tablist" aria-label="Filter by service">
            {([
              { key: 'all', label: 'All Services' },
              { key: 'at', label: 'A&T' },
              { key: 'sem', label: 'SEM' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={roleMarginService === tab.key}
                onClick={() => setRoleMarginService(tab.key)}
                className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all ${
                  roleMarginService === tab.key
                    ? 'bg-white text-black/85 shadow-sm'
                    : 'text-black/45 hover:text-black/65'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* ── Table ── */}
          <div className={`${roleMarginService === 'at' ? 'flex-1 border-r border-black/[0.04]' : 'w-full'} overflow-x-auto`}>
            <table className="w-full" role="table" aria-label="Role-wise margins breakdown">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.015]">
                  <th scope="col" className="px-5 py-2.5 text-left text-caption font-semibold text-black/50 uppercase tracking-wide">Role</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Revenue</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Cost</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Profit</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Margin</th>
                </tr>
              </thead>
              <tbody>
                {activeRoleData.map((row) => {
                  const isTopMargin = row.margin >= 28;
                  const isLowMargin = row.margin < 22;
                  return (
                    <tr key={row.role} className="border-b border-black/[0.03] last:border-0 hover:bg-black/[0.008] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            row.role === 'COO' ? 'bg-[#204CC7]' :
                            row.role === 'HOD' ? 'bg-[#7C3AED]' :
                            row.role === 'Managers' ? 'bg-[#06B6D4]' :
                            row.role === 'In-house Executives' ? 'bg-[#00C875]' :
                            row.role === 'Outside Executives' ? 'bg-[#FDAB3D]' :
                            'bg-[#F59E0B]'
                          }`} />
                          <span className="text-body font-medium text-black/80">{row.role}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-body text-black/70">{formatRoleCurrency(row.revenue)}</td>
                      <td className="px-5 py-3 text-right text-body text-black/70">{formatRoleCurrency(row.cost)}</td>
                      <td className="px-5 py-3 text-right text-body font-medium text-black/80">{formatRoleCurrency(row.profit)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-body font-semibold ${
                          isTopMargin ? 'text-emerald-600' : isLowMargin ? 'text-rose-500' : 'text-black/75'
                        }`}>
                          {row.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-black/[0.02] border-t border-black/[0.06]">
                  <td className="px-5 py-3">
                    <span className="text-body font-semibold text-black/85">Total</span>
                  </td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.revenue)}</td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.cost)}</td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.profit)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-body font-bold text-[#204CC7]">{roleTotalMargin.toFixed(1)}%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── In-house vs Outside comparison (A&T only) ── */}
          {roleMarginService === 'at' && (
            <div className="w-[320px] flex-shrink-0 p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                <p className="text-caption font-semibold text-black/65 uppercase tracking-wide">Staffing Model Comparison</p>
              </div>

              {/* In-house card */}
              <div className="rounded-xl border border-black/[0.06] p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-caption font-semibold text-black/70">In-house</span>
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{inhouseMarginAT.toFixed(1)}% margin</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Revenue</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(inhouseTotalAT.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Cost</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(inhouseTotalAT.cost)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                    <span className="text-caption font-medium text-black/60">Profit</span>
                    <span className="text-caption font-semibold text-emerald-600">{formatRoleCurrency(inhouseTotalAT.profit)}</span>
                  </div>
                </div>
                {/* Margin bar */}
                <div className="mt-3 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${inhouseMarginAT}%` }} />
                </div>
              </div>

              {/* Outside + Remote card */}
              <div className="rounded-xl border border-[#FDAB3D]/20 bg-[#FDAB3D]/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-caption font-semibold text-black/70">Outside + Remote</span>
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">{outsideMarginAT.toFixed(1)}% margin</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Revenue</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(outsideTotalAT.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Cost</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(outsideTotalAT.cost)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#FDAB3D]/10">
                    <span className="text-caption font-medium text-black/60">Profit</span>
                    <span className="text-caption font-semibold text-amber-600">{formatRoleCurrency(outsideTotalAT.profit)}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${outsideMarginAT}%` }} />
                </div>
              </div>

              {/* Insight pill */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#204CC7]/[0.03] border border-[#204CC7]/10">
                <Lightbulb className="w-3.5 h-3.5 text-[#204CC7] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-caption text-black/55">
                  {outsideMarginAT > inhouseMarginAT
                    ? `Outside + Remote executives yield ${(outsideMarginAT - inhouseMarginAT).toFixed(1)}% higher margins than in-house — staffing model is more profitable.`
                    : `In-house executives yield ${(inhouseMarginAT - outsideMarginAT).toFixed(1)}% higher margins — consider optimising the staffing allocation.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      )}

      {/* Employee-level Margin Report — Adminland only (same rationale as
          Role-wise Margins above — too detailed for Home, lives in Adminland) */}
      {isAdminland && (
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-black/90 text-body font-semibold">Employee-Level Margin Report</h3>
            <p className="text-black/50 mt-0.5 text-caption">Cost breakdown and profitability by service, team type, and employee</p>
          </div>
          <div className="relative">
            <select
              value={selectedMarginService}
              onChange={(e) => setSelectedMarginService(e.target.value as any)}
              className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-[#204CC7]/30 transition-all cursor-pointer"
              aria-label="Filter by service"
            >
              <option value="All">All Services</option>
              <option value="Finance">Finance</option>
              <option value="Performance Marketing">Performance Marketing</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Employee margin report">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-5 py-3 text-left text-caption font-medium text-black/60" style={{ minWidth: 200 }}>Service / Employee</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Billing</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Exec. Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Mgr. Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">GST</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Total Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Margin</th>
                <th className="px-4 py-3 text-center text-caption font-medium text-black/60" style={{ minWidth: 80 }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarginData.flatMap((service) => [
                  <tr
                    key={service.service}
                    className="border-b border-black/5 bg-black/[0.02] hover:bg-black/[0.04] cursor-pointer transition-colors"
                    onClick={() => setExpandedMarginService(expandedMarginService === service.service ? null : service.service)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {service.teamCategories.length > 0 && (
                          <ChevronDown className={`w-3.5 h-3.5 text-black/50 transition-transform ${expandedMarginService === service.service ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                        )}
                        <span className="text-body font-semibold text-black/90">{service.service}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-black/90">₹{(service.finalBilling / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.executiveCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.managerCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.gst / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-[#E2445C]">₹{(service.totalCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-[#00C875]">₹{(service.margin / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-semibold border ${
                        service.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        service.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {service.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>,
                  ...(expandedMarginService === service.service ? service.teamCategories.flatMap((category) => [
                      <tr
                        key={`${service.service}-${category.name}`}
                        className="border-b border-black/5 hover:bg-black/[0.03] cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMarginCategory(expandedMarginCategory === `${service.service}-${category.name}` ? null : `${service.service}-${category.name}`);
                        }}
                      >
                        <td className="px-5 py-2.5 pl-10">
                          <div className="flex items-center gap-2">
                            {category.employees.length > 0 && (
                              <ChevronDown className={`w-3 h-3 text-black/50 transition-transform ${expandedMarginCategory === `${service.service}-${category.name}` ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                            )}
                            <span className="text-caption font-medium text-black/70">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-black/70">₹{(category.finalBilling / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.executiveCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.managerCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.gst / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-[#E2445C]">₹{(category.totalCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-[#00C875]">₹{(category.margin / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                            category.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            category.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {category.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>,
                      ...(expandedMarginCategory === `${service.service}-${category.name}` ? category.employees.map((emp) => (
                        <tr key={`${service.service}-${category.name}-${emp.name}`} className="border-b border-black/5 bg-black/[0.015] hover:bg-black/[0.04] transition-colors">
                          <td className="px-5 py-2.5 pl-16">
                            <span className="text-caption text-black/60">{emp.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/70">₹{(emp.finalBilling / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.executiveCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.managerCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.gst / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-[#E2445C]">₹{(emp.totalCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption font-medium text-[#00C875]">₹{(emp.margin / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                              emp.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              emp.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {emp.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )) : [])
                  ]) : [])
              ])}
            </tbody>
          </table>
        </div>
        
        {/* Profitability Intelligence */}
        <div className="border-t border-black/5">
          <button
            onClick={() => toggleSection('pi-insights')}
            className="w-full flex items-center gap-2.5 p-6 hover:bg-black/[0.005] transition-colors cursor-pointer"
            style={{ paddingBottom: expandedSections['pi-insights'] ? '0' : '24px' }}
            aria-expanded={expandedSections['pi-insights']}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF1FB' }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />
            </div>
            <h4 className="flex-1 text-left text-body font-semibold" style={{ color: 'rgba(0,0,0,0.85)' }}>Profitability Intelligence</h4>
            <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedSections['pi-insights'] ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {expandedSections['pi-insights'] && (
          <div className="p-6 pt-5">
            <div className="grid grid-cols-3 gap-5 mb-5">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Company Margin</p>
                <p className="text-emerald-600 text-h2">{companyMarginPercent.toFixed(1)}%</p>
                <p className="text-black/60 mt-0.5 text-caption">₹{(companyTotalMargin / 100000).toFixed(1)}L profit</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Total Cost Base</p>
                <p className="text-black/90 text-h2">₹{(companyTotalCost / 100000).toFixed(1)}L</p>
                <p className="text-black/60 mt-0.5 text-caption">{totalEmployees} employees</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Best Performing</p>
                <p className="text-black/90 text-h2">Finance</p>
                <p className="text-emerald-600 mt-0.5 text-caption font-medium">{marginReportData.find(s => s.service === 'Finance')?.marginPercent.toFixed(1)}% margin</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
                  bg: '#ECFDF5',
                  title: `Finance maintains strongest margins at ${marginReportData.find(s => s.service === 'Finance')?.marginPercent.toFixed(1)}%`,
                  desc: 'Consistent profitability — consider scaling this team to capture more market share.',
                },
                {
                  icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
                  bg: '#FFFBEB',
                  title: 'Perf. Marketing billing up but margins under pressure',
                  desc: 'Revenue growing but cost ratio rising. Review manager allocation and vendor costs.',
                },
                {
                  icon: <TrendingUp className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />,
                  bg: '#EEF1FB',
                  title: 'Non-FTE employees show 4-5% higher margins',
                  desc: 'Contract staff deliver better cost efficiency. Evaluate optimal FTE/non-FTE ratio.',
                },
              ].map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-black/5 hover:bg-black/[0.01] transition-colors">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: insight.bg }}>
                    {insight.icon}
                  </div>
                  <div>
                    <p className="text-caption font-semibold" style={{ color: 'rgba(0,0,0,0.8)' }}>{insight.title}</p>
                    <p className="text-black/60 mt-0.5 text-caption font-normal leading-normal">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
      )}

      {/* The Client - CLA and Employee - CLA/NTF widgets that used to
          live here are gone — their data now lives inside the At-risk
          Clients (widget #14) and Employee CLA (widget #15) KPI cards
          and their drawers' filterable tables. Same data, single
          surface. */}

      {/* ═══ KPI Insight Drawer — World-Class Redesign ═══ */}
      {openKPI && (() => {
        const meta = kpiMeta[openKPI];
        const data = trendData;
        const allData = monthlyTrend;
        const current = allData[allData.length - 1];
        const prev = allData[allData.length - 2];
        const currentVal = (current as Record<string, unknown>)[meta.dataKey] as number;
        const prevVal = (prev as Record<string, unknown>)[meta.dataKey] as number;
        const momChange = prevVal !== 0 ? ((currentVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
        const momPositive = currentVal >= prevVal;
        const lowerIsBetter = !!meta.lowerIsBetter;
        const isGood = lowerIsBetter ? !momPositive : momPositive;

        // Sparkline mirrors the chart range so the small + large views agree.
        const sparkData = data.map(d => ({ v: (d as Record<string, unknown>)[meta.dataKey] as number }));

        // ── KPI-aware tooltip (replaces the broken Adminland CustomTooltip).
        // Renders the headline value with the metric's own formatter and lists
        // the A&T/SEM split when the KPI carries one.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const KpiTooltip = ({ active, payload, label }: any) => {
          if (!active || !payload || !payload.length) return null;
          const row = payload[0].payload as Record<string, number | string>;
          const total = row[meta.dataKey] as number;
          const at  = meta.atKey  ? row[meta.atKey]  as number : null;
          const sem = meta.semKey ? row[meta.semKey] as number : null;
          return (
            <div className="bg-white/95 backdrop-blur-xl px-3.5 py-2.5 rounded-lg shadow-lg border border-black/[0.06] min-w-[160px]">
              <p className="text-caption text-black/65 font-medium mb-1.5">{label ?? row.month}</p>
              <p className="text-caption font-bold text-black/85 tabular-nums">{meta.format(total)}</p>
              {(at !== null || sem !== null) && (
                <div className="mt-2 pt-2 border-t border-black/[0.06] space-y-1">
                  {at !== null && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-caption text-black/70">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_AT }} />
                        {meta.atLabel ?? 'A&T'}
                      </span>
                      <span className="text-caption font-semibold text-black/75 tabular-nums">{meta.format(at)}</span>
                    </div>
                  )}
                  {sem !== null && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-caption text-black/70">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_SEM }} />
                        {meta.semLabel ?? 'SEM'}
                      </span>
                      <span className="text-caption font-semibold text-black/75 tabular-nums">{meta.format(sem)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return createPortal(
          <>
            {/* Backdrop — covers entire viewport including nav. aria-hidden so SR
                doesn't announce it; click-to-dismiss is a mouse convenience and the
                Esc key handler is the keyboard equivalent. */}
            <div className="fixed inset-0 bg-black/30 z-[9998]" aria-hidden="true" onClick={() => { setOpenKPI(null); setDrawerPeriodOpen(false); }} />

            {/* Drawer — sits above everything. Real modal-dialog semantics so
                screen readers announce the title and trap focus. */}
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kpi-drawer-title"
              className="fixed top-0 right-0 h-screen w-[880px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
              style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >

              {/* ── Top Bar: Title + Subtitle + Period Dropdown + Close ── */}
              <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 bg-white relative z-10 gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 id="kpi-drawer-title" className="text-h2 font-bold text-black/90">{meta.title}</h2>
                    {/* Period dropdown — only affects the Trend chart range, surface
                        labels stay anchored to current month. */}
                    <div ref={periodDropdownRef} className="relative">
                      <button
                        onClick={() => setDrawerPeriodOpen(!drawerPeriodOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.06] hover:bg-black/[0.10] transition-colors text-caption font-medium text-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                        aria-haspopup="menu"
                        aria-expanded={drawerPeriodOpen}
                        aria-label={`Time range for trend chart: ${drawerPeriodLabels[drawerPeriod]}. Click to change.`}
                      >
                        {drawerPeriodLabels[drawerPeriod]}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${drawerPeriodOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                      {drawerPeriodOpen && (
                        <div
                          role="menu"
                          aria-label="Trend chart time range"
                          className="absolute top-full left-0 mt-1.5 w-[200px] bg-white rounded-xl border border-black/[0.08] shadow-xl py-1.5 z-50"
                          style={{ animation: 'slideIn 0.15s ease-out' }}
                        >
                          {(Object.keys(drawerPeriodLabels) as DrawerPeriod[]).map(p => (
                            <button
                              key={p}
                              role="menuitemradio"
                              aria-checked={drawerPeriod === p}
                              onClick={() => { setDrawerPeriod(p); setDrawerPeriodOpen(false); }}
                              className={`w-full text-left px-4 py-2 text-caption transition-colors focus-visible:outline-none focus-visible:bg-black/[0.04] ${drawerPeriod === p ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/75 hover:bg-black/[0.03] font-medium'}`}
                            >
                              {drawerPeriodLabels[p]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {meta.subtitle && (
                    <p className="text-caption text-black/60 mt-1.5">{meta.subtitle}</p>
                  )}
                </div>
                <button
                  ref={drawerCloseBtnRef}
                  onClick={() => { setOpenKPI(null); setDrawerPeriodOpen(false); }}
                  className="w-9 h-9 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                  aria-label="Close drawer"
                >
                  <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
                </button>
              </div>

              {/* ── Content ── */}
              <div className="flex-1 overflow-y-auto min-h-0">

                {/* ── Hero Metric ──
                    Headline value · MoM pill · sparkline. Service split is
                    intentionally not duplicated here — the chart legend, the
                    chart's stacked colors, and the hover tooltip already
                    answer "how does A&T vs SEM split?". */}
                <div className="px-7 pt-6 pb-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-caption text-black/60 mb-1.5">{current?.month}</p>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-display text-black/90 tabular-nums">{meta.format(currentVal)}</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold ${isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-[#E2445C]'}`}>
                          {isGood ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                          {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% vs {prev?.month}
                        </span>
                      </div>
                    </div>
                    {/* Mini Sparkline — mirrors the trend chart's range.
                        Hidden on single-month periods (MTD / Daily /
                        Weekly / Q2 in-progress) since a single point
                        can't form a trend curve and would render as a
                        lonely dot in the corner. The headline value
                        already conveys "now" — sparkline only earns
                        its space when there's a trend to draw. */}
                    {sparkData.length > 1 && (
                      <div className="w-[120px] h-[44px] mt-1 overflow-hidden flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={sparkData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                            <defs>
                              <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={isGood ? '#00C875' : '#E2445C'} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={isGood ? '#00C875' : '#E2445C'} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={isGood ? '#00C875' : '#E2445C'} strokeWidth={2} fill="url(#spark-grad)" dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Insights (one neutral container, 3 numbered items) ──
                    Replaces the old green/red/blue triptych. A single surface
                    with a thin rule between items keeps the reader focused on
                    the content; the ordinal markers imply priority order
                    without colour. All 12 KPI drawers share this treatment. */}
                <div className="px-7 pb-5">
                  <div className="rounded-xl border border-black/[0.06] bg-[#FAFBFC] overflow-hidden">
                    <div className="px-5 pt-4 pb-2">
                      <p className="text-caption font-semibold text-black/60 uppercase tracking-wider">What this means</p>
                    </div>
                    <ul className="divide-y divide-black/[0.05]">
                      {meta.insights.map((ins, idx) => (
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

                {/* ── Resource Utilization Breakdown — Hours Available drawer only ──
                    On Home, the founder enters this story from the Hours
                    Available card. The drawer answers "where is the headline
                    10,080 hrs going?" with a 3-level drill-down
                    (Service → Role → Person). The summary insights live in
                    the top "What this means" container only — no duplicate
                    callouts here. Adminland still shows the standalone
                    detailed table on its page. */}
                {openKPI === 'hours' && !isAdminland && (() => {
                  type Status = { label: string; bar: string; pillBg: string; pillText: string };
                  const classify = (pct: number): Status => {
                    if (pct < 85)  return { label: 'Has room',      bar: '#00C875', pillBg: 'bg-emerald-50', pillText: 'text-emerald-700' };
                    if (pct < 95)  return { label: 'Near full',     bar: '#FDAB3D', pillBg: 'bg-amber-50',   pillText: 'text-amber-700' };
                    return            { label: 'Over capacity',     bar: '#E2445C', pillBg: 'bg-rose-50',    pillText: 'text-rose-700' };
                  };

                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header */}
                      <div className="px-7 pt-6 pb-3">
                        <h3 className="text-body font-bold text-black/85">Resource Utilization Breakdown</h3>
                        <p className="text-caption text-black/65 mt-1">How busy each team is, and how much more work they can take on</p>
                      </div>

                      {/* Drillable table (Service → Role → Person) */}
                      <div className="px-7 pb-5">
                        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full" role="table" aria-label="Team capacity this month">
                              <thead>
                                <tr className="border-b border-black/5 bg-[#FAFBFC]">
                                  <th className="px-5 py-3 text-left text-caption font-semibold text-black/55">Team</th>
                                  <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Allocated hours</th>
                                  <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Free hours left</th>
                                  <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Rev. Capacity</th>
                                  <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Utilization</th>
                                </tr>
                              </thead>
                              <tbody>
                                {resourceData.flatMap((service) => {
                                  const utilizationPct = (service.hoursAllocated / service.hoursAvailable) * 100;
                                  const isExpanded = expandedService === service.service;
                                  const status = classify(utilizationPct);

                                  const serviceRow = (
                                    <tr
                                      key={service.service}
                                      className="border-b border-black/5 hover:bg-black/[0.015] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]"
                                      onClick={() => setExpandedService(isExpanded ? null : service.service)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setExpandedService(isExpanded ? null : service.service);
                                        }
                                      }}
                                      tabIndex={0}
                                      aria-expanded={isExpanded}
                                      aria-label={`${service.service} team — ${isExpanded ? 'expanded' : 'collapsed'}. Activate to ${isExpanded ? 'hide' : 'show'} role breakdown.`}
                                    >
                                      <td className="px-5 py-4">
                                        <div className="flex items-center gap-2.5">
                                          <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                                          <span className="text-body font-semibold text-black/85">{service.service}</span>
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-semibold ${status.pillBg} ${status.pillText}`}>
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.bar }} aria-hidden="true" />
                                            {status.label}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <span className="text-body font-medium text-black/75 tabular-nums">{service.hoursAllocated.toLocaleString()}</span>
                                        <span className="text-caption text-black/60 ml-1">hrs</span>
                                      </td>
                                      <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <span className="text-body font-semibold text-black/85 tabular-nums">{service.totalHrUnallocated.toLocaleString()}</span>
                                        <span className="text-caption text-black/60 ml-1">hrs</span>
                                      </td>
                                      <td className="px-5 py-4 text-right whitespace-nowrap">
                                        <span className="text-body font-medium text-black/75 tabular-nums">{formatLakh(service.hoursAvailable * billingRateFor(service.service))}</span>
                                      </td>
                                      <td className="px-5 py-4 text-right whitespace-nowrap" aria-label={`${service.service} utilization`}>
                                        <span className="text-body font-semibold tabular-nums" style={{ color: status.bar }}>{utilizationPct.toFixed(0)}%</span>
                                      </td>
                                    </tr>
                                  );

                                  const roleRows = isExpanded
                                    ? service.subCategories.flatMap((role) => {
                                        const rolePct = (role.hoursAllocated / role.hoursAvailable) * 100;
                                        const roleStatus = classify(rolePct);
                                        const roleKey = `${service.service}-${role.name}`;
                                        const isRoleExpanded = expandedSubCategory === roleKey;
                                        const hasEmployees = role.employees && role.employees.length > 0;

                                        const roleRow = (
                                          <tr
                                            key={roleKey}
                                            className={`bg-[#FAFBFC] border-b border-black/5 transition-colors ${hasEmployees ? 'cursor-pointer hover:bg-black/[0.02] focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]' : ''}`}
                                            onClick={(e) => {
                                              if (!hasEmployees) return;
                                              e.stopPropagation();
                                              setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                                            }}
                                            onKeyDown={(e) => {
                                              if (!hasEmployees) return;
                                              if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                                              }
                                            }}
                                            tabIndex={hasEmployees ? 0 : undefined}
                                            aria-expanded={hasEmployees ? isRoleExpanded : undefined}
                                            aria-label={hasEmployees ? `${role.name} role — ${isRoleExpanded ? 'expanded' : 'collapsed'}. Activate to ${isRoleExpanded ? 'hide' : 'show'} ${role.employees.length} people.` : undefined}
                                          >
                                            <td className="px-5 py-2.5 pl-10">
                                              <div className="flex items-center gap-2">
                                                {hasEmployees ? (
                                                  <ChevronDown className={`w-3 h-3 text-black/55 transition-transform shrink-0 ${isRoleExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                                                ) : (
                                                  <span className="w-3 h-3 shrink-0" aria-hidden="true" />
                                                )}
                                                <span className="text-caption font-medium text-black/65">{role.name}</span>
                                                <span className="text-caption text-black/60 tabular-nums">· {role.employees?.length ?? 0}</span>
                                              </div>
                                            </td>
                                            <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                              <span className="text-caption font-medium text-black/65 tabular-nums">{role.hoursAllocated.toLocaleString()}</span>
                                              <span className="text-caption text-black/60 ml-1">hrs</span>
                                            </td>
                                            <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                              <span className="text-caption font-semibold text-black/70 tabular-nums">{role.totalHrUnallocated.toLocaleString()}</span>
                                              <span className="text-caption text-black/60 ml-1">hrs</span>
                                            </td>
                                            <td className="px-5 py-2.5 text-right whitespace-nowrap">
                                              <span className="text-caption font-medium text-black/65 tabular-nums">{formatLakh(role.hoursAvailable * billingRateFor(service.service))}</span>
                                            </td>
                                            <td className="px-5 py-2.5 text-right whitespace-nowrap" aria-label={`${role.name} utilization in ${service.service}`}>
                                              <span className="text-caption font-semibold tabular-nums" style={{ color: roleStatus.bar }}>{rolePct.toFixed(0)}%</span>
                                            </td>
                                          </tr>
                                        );

                                        const employeeRows = isRoleExpanded && hasEmployees
                                          ? role.employees.map((emp) => {
                                              const empPct = (emp.hoursAllocated / emp.hoursAvailable) * 100;
                                              const empStatus = classify(empPct);
                                              return (
                                                <tr key={`${roleKey}-${emp.name}`} className="bg-white border-b border-black/[0.04]">
                                                  <td className="px-5 py-2 pl-[60px]">
                                                    <span className="text-caption text-black/60">{emp.name}</span>
                                                  </td>
                                                  <td className="px-5 py-2 text-right whitespace-nowrap">
                                                    <span className="text-caption text-black/60 tabular-nums">{emp.hoursAllocated.toLocaleString()}</span>
                                                    <span className="text-caption text-black/60 ml-1">hrs</span>
                                                  </td>
                                                  <td className="px-5 py-2 text-right whitespace-nowrap">
                                                    <span className="text-caption text-black/60 tabular-nums">{emp.totalHrUnallocated.toLocaleString()}</span>
                                                    <span className="text-caption text-black/60 ml-1">hrs</span>
                                                  </td>
                                                  <td className="px-5 py-2 text-right whitespace-nowrap">
                                                    <span className="text-caption text-black/60 tabular-nums">{formatLakh(emp.hoursAvailable * billingRateFor(service.service))}</span>
                                                  </td>
                                                  <td className="px-5 py-2 text-right whitespace-nowrap" aria-label={`${emp.name} utilization`}>
                                                    <span className="text-caption font-medium tabular-nums" style={{ color: empStatus.bar }}>{empPct.toFixed(0)}%</span>
                                                  </td>
                                                </tr>
                                              );
                                            })
                                          : [];

                                        return [roleRow, ...employeeRows];
                                      })
                                    : [];

                                  return [serviceRow, ...roleRows];
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div className="pb-2" />
                    </div>
                  );
                })()}

                {/* ── Trend Chart ──
                    Per-KPI rendering. Chart type follows the metric's nature:
                      • Stacked bar for kickoff & attrition (count) and for
                        margin % (two service rates compared)
                      • Pos/neg-tinted bars for net-growth (clear sign)
                      • Stacked area for any metric with a service split
                        (mrr / customers / aov / cac / ltv / hours / revAvail)
                      • Plain area for ratio metrics (cac-ltv)
                    Reference lines surface where the metric has a benchmark
                    (4% attrition, 40% margin, 1:3 LTV:CAC, 0 net-growth). */}
                <div className="px-7 pt-2 pb-7">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-caption font-bold text-black/70">
                      {meta.splitMode === 'stack'   ? `${meta.title} by service`
                       : meta.splitMode === 'compare' ? `${meta.title} — A&T vs SEM`
                       : `${meta.title} trend`}
                    </p>
                    {/* Inline legend — context-aware:
                        • compare metrics show three chips (Blended + A&T + SEM) since the
                          chart draws all three series.
                        • stack metrics show two chips (A&T + SEM); the total is implicit
                          (it's the top of the stacked bar).
                        Period label is intentionally omitted (already on the dropdown). */}
                    {meta.atKey && meta.semKey && (
                      <div className="flex items-center gap-3">
                        {meta.splitMode === 'compare' && (
                          <span className="flex items-center gap-1.5 text-caption text-black/65">
                            <span className="w-3 h-[2px] rounded-full" style={{ backgroundColor: meta.color }} />
                            Blended
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 text-caption text-black/65">
                          <span
                            className={meta.splitMode === 'compare' ? 'w-3 h-[2px] rounded-full' : 'w-2.5 h-2.5 rounded-sm'}
                            style={{ backgroundColor: C_AT }}
                          />
                          {meta.atLabel ?? 'A&T'}
                        </span>
                        <span className="flex items-center gap-1.5 text-caption text-black/65">
                          <span
                            className={meta.splitMode === 'compare' ? 'w-3 h-[2px] rounded-full' : 'w-2.5 h-2.5 rounded-sm'}
                            style={{ backgroundColor: C_SEM }}
                          />
                          {meta.semLabel ?? 'SEM'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                    <ResponsiveContainer width="100%" height={240}>
                      {(() => {
                        // Common axis props — tightens vertical chrome and keeps
                        // tick density readable across short and long ranges.
                        const xAxisProps = {
                          dataKey: 'month' as const,
                          stroke: '#000',
                          strokeOpacity: 0.15,
                          tick: { fill: '#00000066', fontSize: 13 },
                          axisLine: { stroke: '#000', strokeOpacity: 0.08 },
                          tickLine: false,
                        };
                        const yAxisProps = {
                          stroke: '#000',
                          strokeOpacity: 0.15,
                          tick: { fill: '#00000066', fontSize: 13 },
                          axisLine: false,
                          tickLine: false,
                          width: 50,
                          tickFormatter: (v: number) => {
                            if (meta.unit === '%') return `${v}%`;
                            // Lakh range — keep one decimal so ticks
                            // like 3.5L / 4L / 4.5L / 5L stay distinct.
                            // Rounding to whole lakhs collapsed
                            // 350K + 400K → "4L, 4L" duplicates on
                            // narrow-range charts (LTV, AOV, CAC).
                            // Drop the trailing ".0" so 4.0L reads
                            // as "4L".
                            if (Math.abs(v) >= 100000) {
                              const lakhs = v / 100000;
                              return Number.isInteger(lakhs) ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
                            }
                            if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}K`;
                            return String(v);
                          },
                        };

                        // 1) Kickoffs — stacked bars (A&T + SEM = total)
                        if (openKPI === 'kickoff' && meta.atKey && meta.semKey) {
                          return (
                            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} allowDecimals={false} />
                              <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                              <Bar dataKey={meta.atKey}  stackId="svc" fill={C_AT}  radius={[0, 0, 0, 0]} maxBarSize={28} />
                              <Bar dataKey={meta.semKey} stackId="svc" fill={C_SEM} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                          );
                        }

                        // 2) Attrition — count bars per service (more concrete than %)
                        if (openKPI === 'attrition' && meta.atKey && meta.semKey) {
                          return (
                            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} allowDecimals={false} />
                              <Tooltip
                                cursor={{ fill: '#0000000A' }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                content={({ active, payload, label }: any) => {
                                  if (!active || !payload || !payload.length) return null;
                                  const row = payload[0].payload as Record<string, number>;
                                  const at = row.attritionAt;
                                  const sem = row.attritionSem;
                                  const rate = row.attritionRate;
                                  return (
                                    <div className="bg-white/95 backdrop-blur-xl px-3.5 py-2.5 rounded-lg shadow-lg border border-black/[0.06] min-w-[160px]">
                                      <p className="text-caption text-black/65 font-medium mb-1.5">{label}</p>
                                      <p className="text-caption font-bold text-black/85 tabular-nums">{rate}% rate · {at + sem} churns</p>
                                      <div className="mt-2 pt-2 border-t border-black/[0.06] space-y-1">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="flex items-center gap-1.5 text-caption text-black/70"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_AT }} />A&T</span>
                                          <span className="text-caption font-semibold text-black/75 tabular-nums">{at}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="flex items-center gap-1.5 text-caption text-black/70"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_SEM }} />SEM</span>
                                          <span className="text-caption font-semibold text-black/75 tabular-nums">{sem}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }}
                              />
                              <Bar dataKey={meta.atKey}  stackId="svc" fill={C_AT}  maxBarSize={28} />
                              <Bar dataKey={meta.semKey} stackId="svc" fill={C_SEM} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                          );
                        }

                        // 3) Net Growth — bars colored by sign, zero reference line.
                        // Tooltip is name-aware: it lists the actual customers
                        // that were added (kickoffs) and lost (churns) in the
                        // hovered month, on top of the count and net number.
                        if (openKPI === 'net-growth') {
                          // monthlyTrend runs May'25 → Apr'26, so any "May–Dec"
                          // tick is 2025 and any "Jan–Apr" tick is 2026 in this
                          // window. Mapping is hardcoded to that fixed range.
                          const monthYearOf = (label: string): number => {
                            const after2025 = ['Jan', 'Feb', 'Mar', 'Apr'];
                            return after2025.includes(label) ? 2026 : 2025;
                          };
                          const monthIndexOf = (label: string): number => {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return months.indexOf(label);
                          };
                          const sameMonth = (iso: string, label: string) => {
                            const d = new Date(iso);
                            return d.getFullYear() === monthYearOf(label) && d.getMonth() === monthIndexOf(label);
                          };
                          // Compact name list — first 3 names + "…+N more".
                          // Keeps the tooltip from sprawling on heavy months.
                          const nameList = (items: { customer: string }[]) => {
                            if (items.length === 0) return '—';
                            if (items.length <= 3) return items.map(i => i.customer).join(', ');
                            const first = items.slice(0, 3).map(i => i.customer).join(', ');
                            return `${first} · +${items.length - 3} more`;
                          };
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const NetGrowthTooltip = ({ active, payload, label }: any) => {
                            if (!active || !payload || !payload.length) return null;
                            const row = payload[0].payload as Record<string, number>;
                            const net = row.netGrowth;
                            const monthLabel = label as string;
                            const added = kickoffsAcrossYear.filter(k => sameMonth(k.date, monthLabel));
                            const lost  = churnsAcrossYear.filter(c => sameMonth(c.date, monthLabel));
                            return (
                              <div className="bg-white/95 backdrop-blur-xl px-3.5 py-2.5 rounded-lg shadow-lg border border-black/[0.06] min-w-[260px] max-w-[320px]">
                                <p className="text-caption text-black/65 font-medium mb-1.5">{monthLabel} {monthYearOf(monthLabel)}</p>
                                <p className={`text-h3 font-bold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {net >= 0 ? '+' : ''}{net} <span className="text-caption font-medium text-black/55">net</span>
                                </p>
                                <div className="mt-2.5 pt-2.5 border-t border-black/[0.06] space-y-2">
                                  <div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="flex items-center gap-1.5 text-caption font-semibold text-emerald-600">
                                        <ArrowUp className="w-3 h-3" aria-hidden="true" />
                                        Added · {added.length}
                                      </span>
                                    </div>
                                    {added.length > 0 && (
                                      <p className="text-caption text-black/70 mt-1 leading-snug">{nameList(added)}</p>
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="flex items-center gap-1.5 text-caption font-semibold text-rose-600">
                                        <ArrowDown className="w-3 h-3" aria-hidden="true" />
                                        Lost · {lost.length}
                                      </span>
                                    </div>
                                    {lost.length > 0 && (
                                      <p className="text-caption text-black/70 mt-1 leading-snug">{nameList(lost)}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          };

                          return (
                            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} allowDecimals={false} />
                              <Tooltip content={<NetGrowthTooltip />} cursor={{ fill: '#0000000A' }} />
                              <Bar dataKey={meta.dataKey} radius={[4, 4, 0, 0]} maxBarSize={28}>
                                {data.map((d, i) => {
                                  const v = (d as Record<string, unknown>)[meta.dataKey] as number;
                                  return <Cell key={i} fill={v >= 0 ? '#00C875' : '#E2445C'} />;
                                })}
                              </Bar>
                            </BarChart>
                          );
                        }

                        // 4) Margins — stacked area is misleading for %; show a
                        // single area with the two service-rate lines overlaid
                        // and a 40% target reference line.
                        // Single-month views (MTD / Daily / Weekly / Q2) can't
                        // form line segments, so we fall back to grouped bars
                        // for the three values + the same 40% reference line.
                        if (openKPI === 'margins') {
                          if (data.length === 1) {
                            return (
                              <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }} barCategoryGap="35%" barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} domain={[35, 45]} />
                                <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                                {meta.atKey  && <Bar dataKey={meta.atKey}  fill={C_AT}       maxBarSize={40} radius={[4, 4, 0, 0]} />}
                                {meta.semKey && <Bar dataKey={meta.semKey} fill={C_SEM}      maxBarSize={40} radius={[4, 4, 0, 0]} />}
                                <Bar dataKey={meta.dataKey} fill={meta.color} maxBarSize={40} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            );
                          }
                          return (
                            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                              <defs>
                                <linearGradient id="trend-grad-margin" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%"  stopColor={meta.color} stopOpacity={0.16} />
                                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} domain={[35, 45]} />
                              <Tooltip content={<KpiTooltip />} />
                              <Area type="monotone" dataKey={meta.dataKey} stroke={meta.color} strokeWidth={2} fill="url(#trend-grad-margin)" />
                              {meta.atKey  && <Line type="monotone" dataKey={meta.atKey}  stroke={C_AT}  strokeWidth={1.75} dot={{ r: 3, fill: C_AT,  strokeWidth: 0 }} activeDot={{ r: 5 }} />}
                              {meta.semKey && <Line type="monotone" dataKey={meta.semKey} stroke={C_SEM} strokeWidth={1.75} dot={{ r: 3, fill: C_SEM, strokeWidth: 0 }} activeDot={{ r: 5 }} />}
                            </ComposedChart>
                          );
                        }

                        // 5) LTV : CAC ratio — single area with 1:3 reference.
                        //
                        // Y-axis tweaks:
                        //   • Ticks rendered as "1:N" via the formatter (the
                        //     ratio reads as 1 unit of CAC : N units of LTV).
                        //   • Domain padded around the data range so the
                        //     reference line at 1:3 stays visible without
                        //     forcing a 1:0 tick at the bottom.
                        //   • Explicit tick set every 5 keeps the labels
                        //     evenly spaced — 1:5 / 1:10 / 1:15 — instead of
                        //     recharts auto-picking awkward steps like 1:7,
                        //     1:14, 1:26 we saw before.
                        // Single-month fallback — render a single bar with
                        // the reference line. Bars don't need line segments
                        // so this works at any data length.
                        if (openKPI === 'cac-ltv') {
                          const ratioVals = data.map(d => (d as unknown as Record<string, number>)[meta.dataKey]).filter(v => typeof v === 'number');
                          const ratioMax = ratioVals.length ? Math.max(...ratioVals) : 0;
                          // Round up to the nearest 5 for a clean top tick.
                          const yMaxR = Math.ceil(Math.max(ratioMax + 3, (meta.target?.value ?? 0) + 2) / 5) * 5;
                          const tickStep = yMaxR <= 15 ? 5 : yMaxR <= 30 ? 5 : 10;
                          const yTicks: number[] = [];
                          for (let t = 0; t <= yMaxR; t += tickStep) yTicks.push(t);

                          if (data.length === 1) {
                            return (
                              <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }} barCategoryGap="35%">
                                <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} domain={[0, yMaxR]} ticks={yTicks} tickFormatter={(v) => `1:${v}`} />
                                <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                                <Bar dataKey={meta.dataKey} fill={meta.color} maxBarSize={48} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            );
                          }
                          return (
                            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                              <defs>
                                <linearGradient id="trend-grad-ratio" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%"  stopColor={meta.color} stopOpacity={0.16} />
                                  <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} domain={[0, yMaxR]} ticks={yTicks} tickFormatter={(v) => `1:${v}`} />
                              <Tooltip content={<KpiTooltip />} />
                              <Area type="monotone" dataKey={meta.dataKey} stroke={meta.color} strokeWidth={2} fill="url(#trend-grad-ratio)" dot={{ r: 3, fill: meta.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </ComposedChart>
                          );
                        }

                        // 6) Stack-split metrics (MRR, Customers, Hours) — A&T + SEM = total.
                        // Stacked column chart. Discrete bars are easier to read at 12 data
                        // points than a smooth area, the silhouette IS the trend line, and
                        // the current month gets full opacity so the eye lands on "now".
                        if (meta.splitMode === 'stack' && meta.atKey && meta.semKey) {
                          const lastIdx = data.length - 1;
                          return (
                            <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} />
                              <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                              <Bar dataKey={meta.atKey}  stackId="svc" maxBarSize={32}>
                                {data.map((_, i) => (
                                  <Cell key={i} fill={C_AT} fillOpacity={i === lastIdx ? 1 : 0.55} />
                                ))}
                              </Bar>
                              <Bar dataKey={meta.semKey} stackId="svc" radius={[4, 4, 0, 0]} maxBarSize={32}>
                                {data.map((_, i) => (
                                  <Cell key={i} fill={C_SEM} fillOpacity={i === lastIdx ? 1 : 0.55} />
                                ))}
                              </Bar>
                            </BarChart>
                          );
                        }

                        // 7) Compare-split metrics (AOV, CAC, LTV, Revenue Available) —
                        // the blended total is an AVERAGE of services, not a sum.
                        //
                        // Why this isn't an Area chart: previously we filled the
                        // chart area from 0 → blended with a soft gradient. For
                        // metrics that sit far above 0 (LTV runs in the ₹3L–₹5L
                        // range), this turned into a giant block dominating the
                        // chart, with the lower service line buried INSIDE the
                        // fill and the higher service line floating outside it.
                        // The 12-month variation looked nearly flat because the
                        // lines were crammed into the top quarter.
                        //
                        // Fixed shape: a clean three-line LineChart with the
                        // Y-axis domain padded to the data's actual range so
                        // the variation reads at full height. Two solid lines
                        // for A&T / SEM, one dashed line for the blended
                        // average. Reads instantly as "where does each service
                        // sit, and where's the blended line trending?".
                        if (meta.splitMode === 'compare' && meta.atKey && meta.semKey) {
                          // Compute a tight Y-axis domain from the actual values
                          // in the slice. 15% bottom padding + 8% top padding
                          // keeps the lines off the axes without wasting chart
                          // real estate. Min is floored at 0 so a zero baseline
                          // is still respected when data legitimately approaches
                          // it (won't happen for LTV/AOV/CAC, but defensive).
                          const compareVals = data.flatMap(d => {
                            const dd = d as unknown as Record<string, number>;
                            return [dd[meta.dataKey], dd[meta.atKey!], dd[meta.semKey!]];
                          }).filter(v => typeof v === 'number' && !Number.isNaN(v));
                          const compMin = compareVals.length ? Math.min(...compareVals) : 0;
                          const compMax = compareVals.length ? Math.max(...compareVals) : 1;
                          const compRange = Math.max(compMax - compMin, 1);
                          const yLo = Math.max(0, compMin - compRange * 0.15);
                          const yHi = compMax + compRange * 0.08;

                          // Single data point (MTD / Daily / Weekly / Q2 in-progress)
                          // can't form line segments — a line chart would just
                          // show three orphaned dots that look broken. Fall back
                          // to a grouped bar chart so the founder still gets the
                          // three values clearly side-by-side. Bars stay tight
                          // (40px max) so the single column doesn't sprawl
                          // across the chart width.
                          if (data.length === 1) {
                            return (
                              <BarChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -10 }} barCategoryGap="35%" barGap={6}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                                <XAxis {...xAxisProps} />
                                <YAxis {...yAxisProps} domain={[yLo, yHi]} />
                                <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                                <Bar dataKey={meta.atKey}   fill={C_AT}       maxBarSize={40} radius={[4, 4, 0, 0]} />
                                <Bar dataKey={meta.semKey}  fill={C_SEM}      maxBarSize={40} radius={[4, 4, 0, 0]} />
                                <Bar dataKey={meta.dataKey} fill={meta.color} maxBarSize={40} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            );
                          }

                          return (
                            <LineChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} domain={[yLo, yHi]} allowDataOverflow={false} />
                              <Tooltip content={<KpiTooltip />} />
                              <Line type="monotone" dataKey={meta.atKey}   stroke={C_AT}       strokeWidth={2}    dot={{ r: 3, fill: C_AT,       strokeWidth: 0 }} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey={meta.semKey}  stroke={C_SEM}      strokeWidth={2}    dot={{ r: 3, fill: C_SEM,      strokeWidth: 0 }} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey={meta.dataKey} stroke={meta.color} strokeWidth={2.25} strokeDasharray="5 4" dot={{ r: 3, fill: meta.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                            </LineChart>
                          );
                        }

                        // 8) Solo metric (no service split) — single area chart.
                        // Single-month fallback: a bar chart so the value is
                        // legible (Area can't render with one data point).
                        if (data.length === 1) {
                          return (
                            <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -10 }} barCategoryGap="35%">
                              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                              <XAxis {...xAxisProps} />
                              <YAxis {...yAxisProps} />
                              <Tooltip content={<KpiTooltip />} cursor={{ fill: '#0000000A' }} />
                              <Bar dataKey={meta.dataKey} fill={meta.color} maxBarSize={48} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          );
                        }
                        return (
                          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                            <defs>
                              <linearGradient id="trend-grad-solo" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"  stopColor={meta.color} stopOpacity={0.22} />
                                <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
                            <XAxis {...xAxisProps} />
                            <YAxis {...yAxisProps} />
                            <Tooltip content={<KpiTooltip />} />
                            <Area type="monotone" dataKey={meta.dataKey} stroke={meta.color} strokeWidth={2} fill="url(#trend-grad-solo)" dot={{ r: 3, fill: meta.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                          </AreaChart>
                        );
                      })()}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── All Active Customers — Customers drawer only ──
                    The chart above shows the headcount trend (90 logos,
                    +6 net in April). This section answers the next
                    question every founder asks: "Who are the 90?" —
                    surfacing the actual book ranked by monthly
                    billing so the highest-impact accounts land at the
                    top of the eye-line. Five columns kept lean on
                    purpose: name + service compound, relationship
                    health (synced from the new 3-tier rating), tenure,
                    serving team, and MRR. The View-all CTA jumps to
                    the dedicated All Customers sub-tab for the full
                    filterable list. */}
                {openKPI === 'customers' && (() => {
                  // Source of truth lives at component scope (see
                  // customersBookSnapshot above). The local aliases
                  // keep the rest of the IIFE readable.
                  type Service = ActivityService;
                  const allRows = customersBookSnapshot;

                  // ── Period filter ──
                  // A customer is "active during a period" if their
                  // join_date ≤ period.end. We derive join_date from
                  // tenureMonths (as of TODAY = 30 Apr 2026), then
                  // require it to be on or before the period's end.
                  // For past quarters this naturally drops customers
                  // who hadn't joined yet, so the table reads as a
                  // historical snapshot.
                  const TODAY = new Date(2026, 3, 30);
                  const { start: periodStart, end: periodEnd, label: periodLabel } = drawerPeriodRanges[drawerPeriod];
                  const joinDateOf = (tenureMo: number) => {
                    const d = new Date(TODAY);
                    d.setMonth(d.getMonth() - tenureMo);
                    return d;
                  };
                  const rows = allRows
                    .filter(r => joinDateOf(r.tenureMonths) <= periodEnd)
                    // Sort by MRR descending — keeps the eye-line on
                    // the largest accounts. Mirrors how the founder
                    // thinks about the book (top 10 = 60%+ of revenue).
                    .sort((a, b) => b.mrr - a.mrr);

                  const totalActive = activeCustomers.total; // 90 in current period
                  const shownCount = rows.length;
                  const shownMRR = rows.reduce((sum, r) => sum + r.mrr, 0);

                  // Pagination — 6 rows per page keeps each page short
                  // enough to scan without scrolling. Clamping is
                  // defensive: when drawerPeriod changes the row
                  // count shrinks/grows, but the current page can
                  // never sit beyond the new last page.
                  const PAGE_SIZE = 6;
                  const totalPages = Math.max(1, Math.ceil(shownCount / PAGE_SIZE));
                  const safePage = Math.min(Math.max(customersPage, 1), totalPages);
                  const pageStart = (safePage - 1) * PAGE_SIZE;
                  const pageEnd = Math.min(pageStart + PAGE_SIZE, shownCount);
                  const visibleRows = rows.slice(pageStart, pageEnd);
                  const pageMRR = visibleRows.reduce((sum, r) => sum + r.mrr, 0);

                  // Compact INR formatter — rupees rendered as ₹xL or ₹xK,
                  // matching how the rest of the drawer reads numbers.
                  const fmtINR = (v: number) =>
                    v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L` :
                    v >= 1000   ? `₹${Math.round(v / 1000)}K`                            : `₹${v}`;

                  // Tenure in human shape — "2y 1mo", "11 mos", "8 mos".
                  // Years gets a short "y" so the column stays narrow.
                  const fmtTenure = (m: number) => {
                    const y = Math.floor(m / 12);
                    const mo = m % 12;
                    if (y === 0) return `${m} mo${m !== 1 ? 's' : ''}`;
                    if (mo === 0) return `${y}y`;
                    return `${y}y ${mo}mo`;
                  };

                  // Service-line pill — matches the brand palette used
                  // in the Customers page (cyan A&T, purple SEM, slate
                  // for Both since it's the union of the two).
                  const servicePill = (s: Service) => {
                    if (s === 'A&T') return 'bg-violet-50  text-violet-700  border-violet-100';
                    if (s === 'SEM') return 'bg-violet-50  text-violet-700  border-violet-100';
                    return                  'bg-slate-100  text-slate-700   border-slate-200';
                  };

                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header + View-all CTA — copy adapts
                          to drawer period: "now" surfaces the live
                          headcount (X of 90); past periods read as
                          historical snapshots ("active at end of Q3
                          2025"). */}
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">All active customers</h3>
                          <p className="text-caption text-black/65 mt-1">
                            {periodEnd >= TODAY
                              ? <>Top <span className="font-semibold text-black/80 tabular-nums">{shownCount}</span> of <span className="font-semibold text-black/80 tabular-nums">{totalActive}</span> active customers by monthly billing</>
                              : <>Top <span className="font-semibold text-black/80 tabular-nums">{shownCount}</span> customers active at end of <span className="font-semibold text-black/80">{periodLabel}</span>, by monthly billing</>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOpenKPI(null); router.push('/home?tab=customers&sub=all-customers'); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#204CC7]/20 bg-[#204CC7]/[0.04] text-[#204CC7] text-caption font-semibold hover:bg-[#204CC7]/[0.08] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all"
                        >
                          View all customers
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Table (or empty state if the period has no
                          matching customers — e.g. a far-future view
                          or a quarter from before the book began). */}
                      <div className="px-7 pb-7">
                      {shownCount === 0 ? (
                        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-10 text-center">
                          <p className="text-body font-medium text-black/70">No customers were active in {periodLabel}.</p>
                          <p className="text-caption text-black/55 mt-1">Try a different period from the dropdown above.</p>
                        </div>
                      ) : (<>
                        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                          <table className="w-full" role="table" aria-label="Active customers ranked by monthly billing">
                            <thead>
                              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide">Customer</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Tenure</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[140px]">Team</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[120px]">MRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRows.map(r => (
                                <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                                  {/* Customer + service line */}
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="text-body font-medium text-black/85 truncate">{r.name}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-caption font-semibold shrink-0 ${servicePill(r.service)}`}>
                                        {r.service}
                                      </span>
                                    </div>
                                  </td>
                                  {/* Tenure */}
                                  <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums whitespace-nowrap">
                                    {fmtTenure(r.tenureMonths)}
                                  </td>
                                  {/* Team — same hover-popover used elsewhere */}
                                  <td className="px-4 py-3 align-middle">
                                    <TeamHoverPopover team={r.team} />
                                  </td>
                                  {/* MRR right-aligned, tabular */}
                                  <td className="px-4 py-3 align-middle text-body font-semibold text-black/85 tabular-nums text-right whitespace-nowrap">
                                    {fmtINR(r.mrr)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {/* Footer subtotal — current page's MRR sum.
                                Updates as the founder pages through the
                                book so they always see the total of
                                what's currently on screen. */}
                            <tfoot>
                              <tr className="bg-[#FAFBFC] border-t border-black/[0.06]">
                                <td colSpan={3} className="px-4 py-3 align-middle text-caption font-semibold text-black/65">
                                  Page subtotal · {visibleRows.length} of {shownCount} customers
                                </td>
                                <td className="px-4 py-3 align-middle text-body font-bold text-black/90 tabular-nums text-right whitespace-nowrap">
                                  {fmtINR(pageMRR)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Pagination control — sits below the table card
                            so it doesn't compete with the data. Standard
                            shape: range readout on the left, Prev / page
                            buttons / Next on the right. Page numbers are
                            real buttons (not just dots) for one-click
                            jumps; aria-current="page" identifies the
                            active page to assistive tech. */}
                        {totalPages > 1 && (
                          <nav
                            className="mt-3 flex items-center justify-between gap-3 flex-wrap"
                            aria-label="Active customers pagination"
                          >
                            <p className="text-caption text-black/60 tabular-nums">
                              Showing <span className="font-semibold text-black/80">{pageStart + 1}–{pageEnd}</span> of <span className="font-semibold text-black/80">{shownCount}</span>
                              {' · '}Total <span className="font-semibold text-black/80 tabular-nums">{fmtINR(shownMRR)}</span> MRR
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setCustomersPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                aria-label="Previous page"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                                const isActive = p === safePage;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setCustomersPage(p)}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={`Page ${p}`}
                                    className={`inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-md text-caption font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                                      isActive
                                        ? 'bg-[#204CC7] text-white border border-[#204CC7]'
                                        : 'bg-white text-black/65 border border-black/[0.08] hover:bg-black/[0.03] hover:text-black/85'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setCustomersPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                aria-label="Next page"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
                              >
                                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </nav>
                        )}
                      </>)}
                      </div>
                    </div>
                  );
                })()}

                {/* ── New Client Kickoffs — Kickoff drawer only ──
                    The chart above shows the kickoff cadence (7 in
                    April · highest in 6 months). This section answers
                    "which 7?" — so the founder can put names and ARR
                    figures to the bar height. Same simple shape as
                    Recent Churns: date, customer, team, MRR. */}
                {openKPI === 'kickoff' && (() => {
                  // Source of truth lives at component scope (see
                  // kickoffsAcrossYear above). Local type alias keeps
                  // the servicePill helper signature readable.
                  type Service = ActivityService;

                  // Filter by drawer period — the same window the
                  // chart above is rendering. Sort by date desc so
                  // the most recent kickoff sits at the top of the
                  // table no matter what period is selected. The
                  // full data set is `kickoffsAcrossYear` declared
                  // at component scope.
                  const { start: periodStart, end: periodEnd, label: periodLabel } = drawerPeriodRanges[drawerPeriod];
                  const kickoffs = kickoffsAcrossYear
                    .filter(k => {
                      const d = new Date(k.date);
                      return d >= periodStart && d <= periodEnd;
                    })
                    .sort((a, b) => (a.date < b.date ? 1 : -1));

                  const totalMRR = kickoffs.reduce((sum, k) => sum + k.mrr, 0);
                  const totalARR = totalMRR * 12;

                  const fmtINR = (v: number) =>
                    v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L` :
                    v >= 1000   ? `₹${Math.round(v / 1000)}K`                            : `₹${v}`;

                  // "12 Apr" / "03 Sep" — short, eye-friendly date.
                  // We don't surface the year because the period
                  // label up top already places the rows in time.
                  const fmtKickoffDate = (iso: string) => {
                    const d = new Date(iso);
                    const month = d.toLocaleString('en-US', { month: 'short' });
                    return `${String(d.getDate()).padStart(2, '0')} ${month}`;
                  };

                  const servicePill = (s: Service) => {
                    if (s === 'A&T') return 'bg-violet-50  text-violet-700  border-violet-100';
                    if (s === 'SEM') return 'bg-violet-50  text-violet-700  border-violet-100';
                    return                  'bg-slate-100  text-slate-700   border-slate-200';
                  };

                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header + View-all CTA */}
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">New client kickoffs</h3>
                          <p className="text-caption text-black/65 mt-1">
                            <span className="font-semibold text-black/80 tabular-nums">{kickoffs.length}</span> customers onboarded in <span className="font-semibold text-black/80">{periodLabel}</span>
                            {kickoffs.length > 0 && <> — total ARR <span className="font-semibold text-black/80 tabular-nums">{fmtINR(totalARR)}</span></>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOpenKPI(null); router.push('/home?tab=customers&sub=onboarding'); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#204CC7]/20 bg-[#204CC7]/[0.04] text-[#204CC7] text-caption font-semibold hover:bg-[#204CC7]/[0.08] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all"
                        >
                          View onboarding
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Table — empty state for periods with no
                          kickoffs (defensive; with current mock
                          data every supported period has at least
                          one row, but Daily / Weekly might land in
                          a quiet patch). */}
                      <div className="px-7 pb-7">
                      {kickoffs.length === 0 ? (
                        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-10 text-center">
                          <p className="text-body font-medium text-black/70">No new kickoffs in {periodLabel}.</p>
                          <p className="text-caption text-black/55 mt-1">Try a different period from the dropdown above.</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                          <table className="w-full" role="table" aria-label={`New client kickoffs in ${periodLabel}`}>
                            <thead>
                              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Date</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide">Customer</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[140px]">Team</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[120px]">MRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {kickoffs.map(k => (
                                <tr key={k.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                                  <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums whitespace-nowrap">{fmtKickoffDate(k.date)}</td>
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="text-body font-medium text-black/85 truncate">{k.customer}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-caption font-semibold shrink-0 ${servicePill(k.service)}`}>
                                        {k.service}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <TeamHoverPopover team={k.team} />
                                  </td>
                                  <td className="px-4 py-3 align-middle text-body font-semibold text-black/85 tabular-nums text-right whitespace-nowrap">
                                    {fmtINR(k.mrr)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {/* Footer total — running MRR for the
                                kickoffs in the selected period.
                                The headline up top surfaces ARR; we
                                land MRR in the column total since
                                the column is MRR. */}
                            <tfoot>
                              <tr className="bg-[#FAFBFC] border-t border-black/[0.06]">
                                <td colSpan={3} className="px-4 py-3 align-middle text-caption font-semibold text-black/65">
                                  Total · {kickoffs.length} kickoff{kickoffs.length === 1 ? '' : 's'} in {periodLabel}
                                </td>
                                <td className="px-4 py-3 align-middle text-body font-bold text-black/90 tabular-nums text-right whitespace-nowrap">
                                  {fmtINR(totalMRR)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Customer Activity — Net Growth drawer only ──
                    The chart above shows month-over-month net flow
                    (kickoffs minus churns). This section breaks the
                    flow into individual customers — each "Added" row
                    is a kickoff, each "Lost" row is a churn — so the
                    founder can tie the +/- number directly to names
                    and contract values. Filtered to drawerPeriod and
                    sorted newest-first. */}
                {openKPI === 'net-growth' && (() => {
                  type Service = ActivityService;
                  type ActivityKind = 'added' | 'lost';
                  type ActivityRow = {
                    id: string;
                    kind: ActivityKind;
                    date: string;
                    customer: string;
                    service: Service;
                    team: ActivityMember[];
                    mrr: number;
                  };

                  const { start: periodStart, end: periodEnd, label: periodLabel } = drawerPeriodRanges[drawerPeriod];
                  const inPeriod = (iso: string) => {
                    const d = new Date(iso);
                    return d >= periodStart && d <= periodEnd;
                  };

                  // Build a unified, kind-tagged stream: kickoffs as
                  // "added", churns as "lost". Both share the same
                  // shape for the table; the kind drives the row's
                  // visual treatment + signed MRR display.
                  const rows: ActivityRow[] = [
                    ...kickoffsAcrossYear
                      .filter(k => inPeriod(k.date))
                      .map(k => ({ id: k.id, kind: 'added' as const, date: k.date, customer: k.customer, service: k.service, team: k.team, mrr: k.mrr })),
                    ...churnsAcrossYear
                      .filter(c => inPeriod(c.date))
                      .map(c => ({ id: c.id, kind: 'lost' as const, date: c.date, customer: c.customer, service: c.service, team: c.team, mrr: c.mrr })),
                  ].sort((a, b) => (a.date < b.date ? 1 : -1));

                  const addedCount = rows.filter(r => r.kind === 'added').length;
                  const lostCount  = rows.filter(r => r.kind === 'lost').length;
                  const net = addedCount - lostCount;
                  const addedMRR = rows.filter(r => r.kind === 'added').reduce((sum, r) => sum + r.mrr, 0);
                  const lostMRR  = rows.filter(r => r.kind === 'lost').reduce((sum, r) => sum + r.mrr, 0);
                  const netMRR = addedMRR - lostMRR;

                  const fmtINR = (v: number) => {
                    const abs = Math.abs(v);
                    const formatted =
                      abs >= 100000 ? `₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L` :
                      abs >= 1000   ? `₹${Math.round(abs / 1000)}K`                              : `₹${abs}`;
                    return v < 0 ? `-${formatted}` : formatted;
                  };

                  const fmtSignedINR = (v: number, kind: ActivityKind) => {
                    const abs = Math.abs(v);
                    const formatted =
                      abs >= 100000 ? `₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L` :
                      abs >= 1000   ? `₹${Math.round(abs / 1000)}K`                              : `₹${abs}`;
                    return kind === 'added' ? `+${formatted}` : `−${formatted}`;
                  };

                  const fmtActivityDate = (iso: string) => {
                    const d = new Date(iso);
                    const month = d.toLocaleString('en-US', { month: 'short' });
                    return `${String(d.getDate()).padStart(2, '0')} ${month}`;
                  };

                  const servicePill = (s: Service) => {
                    if (s === 'A&T') return 'bg-violet-50  text-violet-700  border-violet-100';
                    if (s === 'SEM') return 'bg-violet-50  text-violet-700  border-violet-100';
                    return                  'bg-slate-100  text-slate-700   border-slate-200';
                  };

                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header — three small stat pills give
                          the founder the same +/-/net shape as the
                          chart at a glance, before they read any of
                          the rows. */}
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="text-body font-bold text-black/85">Customer activity</h3>
                          <p className="text-caption text-black/65 mt-1">
                            Net flow in <span className="font-semibold text-black/80">{periodLabel}</span> — every kickoff (added) and churn (lost), most recent first.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-100 bg-emerald-50 text-caption font-semibold text-emerald-700">
                            <ArrowUp className="w-3 h-3" aria-hidden="true" />
                            Added · {addedCount}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-100 bg-rose-50 text-caption font-semibold text-rose-700">
                            <ArrowDown className="w-3 h-3" aria-hidden="true" />
                            Lost · {lostCount}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-caption font-bold tabular-nums ${
                            net > 0  ? 'border-emerald-200 bg-emerald-100/60 text-emerald-800' :
                            net < 0  ? 'border-rose-200    bg-rose-100/60    text-rose-800'    :
                                       'border-black/10    bg-black/[0.04]   text-black/75'
                          }`}>
                            Net · {net >= 0 ? '+' : ''}{net}
                          </span>
                        </div>
                      </div>

                      {/* Table (or empty state when the period has no
                          activity). */}
                      <div className="px-7 pb-7">
                      {rows.length === 0 ? (
                        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-10 text-center">
                          <p className="text-body font-medium text-black/70">No customer activity in {periodLabel}.</p>
                          <p className="text-caption text-black/55 mt-1">Try a different period from the dropdown above.</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                          <table className="w-full" role="table" aria-label={`Customer activity in ${periodLabel}`}>
                            <thead>
                              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Date</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Action</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide">Customer</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[140px]">Team</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[120px]">MRR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(r => (
                                <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                                  <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums whitespace-nowrap">{fmtActivityDate(r.date)}</td>
                                  <td className="px-4 py-3 align-middle">
                                    {r.kind === 'added' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-emerald-100 bg-emerald-50 text-caption font-semibold text-emerald-700">
                                        <ArrowUp className="w-3 h-3" aria-hidden="true" />
                                        Added
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-rose-100 bg-rose-50 text-caption font-semibold text-rose-700">
                                        <ArrowDown className="w-3 h-3" aria-hidden="true" />
                                        Lost
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="text-body font-medium text-black/85 truncate">{r.customer}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-caption font-semibold shrink-0 ${servicePill(r.service)}`}>
                                        {r.service}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    <TeamHoverPopover team={r.team} />
                                  </td>
                                  <td className={`px-4 py-3 align-middle text-body font-semibold tabular-nums text-right whitespace-nowrap ${r.kind === 'added' ? 'text-emerald-700' : 'text-rose-600'}`}>
                                    {fmtSignedINR(r.mrr, r.kind)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {/* Footer net — added MRR minus lost MRR.
                                The headline up top shows count net;
                                the footer surfaces revenue net so the
                                founder reads both sides of the story. */}
                            <tfoot>
                              <tr className="bg-[#FAFBFC] border-t border-black/[0.06]">
                                <td colSpan={4} className="px-4 py-3 align-middle text-caption font-semibold text-black/65">
                                  Net MRR · {addedCount} added, {lostCount} lost in {periodLabel}
                                </td>
                                <td className={`px-4 py-3 align-middle text-body font-bold tabular-nums text-right whitespace-nowrap ${
                                  netMRR > 0 ? 'text-emerald-700' :
                                  netMRR < 0 ? 'text-rose-600'    :
                                               'text-black/85'
                                }`}>
                                  {netMRR >= 0 ? '+' : ''}{fmtINR(netMRR)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Top customers by LTV — LTV drawer only ──
                    The chart above answers "where is blended LTV
                    trending and how does it split A&T vs SEM?". This
                    section answers the question right behind it:
                    "WHO carries that LTV?" — putting names against
                    the headline insight that "Top 10 clients carry
                    ~38% of total LTV".
                    Each row computes LTV on the fly: MRR × expected
                    lifetime months × gross margin, with service-aware
                    coefficients (SEM gets longer lifetime, A&T gets
                    higher margin). Concentration bar on the right
                    shows each customer's share of total LTV so the
                    eye finds the strategic accounts instantly. */}
                {openKPI === 'ltv' && (() => {
                  type Service = ActivityService;

                  const { end: periodEnd, label: periodLabel } = drawerPeriodRanges[drawerPeriod];

                  // Filter to customers active at period end (same
                  // historical-snapshot semantics as the Customers
                  // drawer), then enrich each row with a computed
                  // LTV. Sort by LTV desc — concentration is the
                  // story, so the largest LTVs read first.
                  const TODAY_LTV = new Date(2026, 3, 30);
                  const joinDateOf = (tenureMo: number) => {
                    const d = new Date(TODAY_LTV);
                    d.setMonth(d.getMonth() - tenureMo);
                    return d;
                  };
                  const enriched = customersBookSnapshot
                    .filter(r => joinDateOf(r.tenureMonths) <= periodEnd)
                    .map(r => ({ ...r, ltv: computeLTV(r.mrr, r.service) }))
                    .sort((a, b) => b.ltv - a.ltv);

                  const shownCount = enriched.length;
                  const totalLTV   = enriched.reduce((sum, r) => sum + r.ltv, 0);
                  const top10LTV   = enriched.slice(0, 10).reduce((sum, r) => sum + r.ltv, 0);
                  const top10Pct   = totalLTV > 0 ? Math.round((top10LTV / totalLTV) * 100) : 0;

                  // Pagination — 6 rows per page matches the Active
                  // Customers table for muscle memory across drawers.
                  const PAGE_SIZE = 6;
                  const totalPages = Math.max(1, Math.ceil(shownCount / PAGE_SIZE));
                  const safePage = Math.min(Math.max(ltvPage, 1), totalPages);
                  const pageStart = (safePage - 1) * PAGE_SIZE;
                  const pageEnd = Math.min(pageStart + PAGE_SIZE, shownCount);
                  const visibleRows = enriched.slice(pageStart, pageEnd);

                  const fmtINR = (v: number) =>
                    v >= 10000000 ? `₹${(v / 10000000).toFixed(v % 10000000 === 0 ? 0 : 1)}Cr` :
                    v >= 100000   ? `₹${(v / 100000).toFixed(v % 100000 === 0 ? 0 : 1)}L`     :
                    v >= 1000     ? `₹${Math.round(v / 1000)}K`                                : `₹${v}`;

                  // Tenure in human shape — "2y 1mo", "11 mos", "8 mos".
                  const fmtTenure = (m: number) => {
                    const y = Math.floor(m / 12);
                    const mo = m % 12;
                    if (y === 0) return `${m} mo${m !== 1 ? 's' : ''}`;
                    if (mo === 0) return `${y}y`;
                    return `${y}y ${mo}mo`;
                  };

                  const servicePill = (s: Service) => {
                    if (s === 'A&T') return 'bg-violet-50  text-violet-700  border-violet-100';
                    if (s === 'SEM') return 'bg-violet-50  text-violet-700  border-violet-100';
                    return                  'bg-slate-100  text-slate-700   border-slate-200';
                  };

                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header — concentration callout matches
                          the "Top 10 clients carry ~38% of total LTV"
                          insight up top, surfaced as a live computed
                          number. Founder reads "Top 10 carry X%" and
                          eye drops straight into the table. */}
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="text-body font-bold text-black/85">Top customers by lifetime value</h3>
                          <p className="text-caption text-black/65 mt-1">
                            <span className="font-semibold text-black/80 tabular-nums">{shownCount}</span> customers ranked in <span className="font-semibold text-black/80">{periodLabel}</span> · top 10 carry <span className="font-semibold text-black/80 tabular-nums">{top10Pct}%</span> of total LTV
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-100 bg-emerald-50 text-caption font-semibold text-emerald-700 tabular-nums">
                          Total LTV · {fmtINR(totalLTV)}
                        </span>
                      </div>

                      {/* Table (or empty state when the period has no
                          customers — e.g. far past quarters). */}
                      <div className="px-7 pb-7">
                      {shownCount === 0 ? (
                        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-10 text-center">
                          <p className="text-body font-medium text-black/70">No customers were active in {periodLabel}.</p>
                          <p className="text-caption text-black/55 mt-1">Try a different period from the dropdown above.</p>
                        </div>
                      ) : (<>
                        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                          <table className="w-full" role="table" aria-label={`Customers ranked by lifetime value in ${periodLabel}`}>
                            <thead>
                              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[32px]">#</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide">Customer</th>
                                <th scope="col" className="px-4 py-2.5 text-left  text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Tenure</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[100px]">MRR</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">LTV</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[100px]">% of total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleRows.map((r, idx) => {
                                const rank = pageStart + idx + 1;
                                const sharePct = totalLTV > 0 ? (r.ltv / totalLTV) * 100 : 0;
                                return (
                                  <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                                    <td className="px-4 py-3 align-middle text-caption font-semibold text-black/45 tabular-nums">{rank}</td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-body font-medium text-black/85 truncate">{r.name}</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-caption font-semibold shrink-0 ${servicePill(r.service)}`}>
                                          {r.service}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums whitespace-nowrap">{fmtTenure(r.tenureMonths)}</td>
                                    <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums text-right whitespace-nowrap">{fmtINR(r.mrr)}</td>
                                    <td className="px-4 py-3 align-middle text-body font-bold text-black/85 tabular-nums text-right whitespace-nowrap">{fmtINR(r.ltv)}</td>
                                    {/* % of total — share of total LTV
                                        in the period. Just the number;
                                        no progress bar. */}
                                    <td className="px-4 py-3 align-middle text-caption font-semibold text-black/70 tabular-nums text-right whitespace-nowrap">{sharePct.toFixed(1)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {/* Footer — page subtotal alongside the
                                running total. Updates as the founder
                                pages through. */}
                            <tfoot>
                              <tr className="bg-[#FAFBFC] border-t border-black/[0.06]">
                                <td colSpan={4} className="px-4 py-3 align-middle text-caption font-semibold text-black/65">
                                  Page subtotal · {visibleRows.length} of {shownCount} customers
                                </td>
                                <td className="px-4 py-3 align-middle text-body font-bold text-black/90 tabular-nums text-right whitespace-nowrap">
                                  {fmtINR(visibleRows.reduce((sum, r) => sum + r.ltv, 0))}
                                </td>
                                <td className="px-4 py-3 align-middle text-caption font-semibold text-black/55 tabular-nums text-right whitespace-nowrap">
                                  {((visibleRows.reduce((sum, r) => sum + r.ltv, 0) / Math.max(totalLTV, 1)) * 100).toFixed(1)}%
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Pagination — same shape as Active Customers
                            so muscle memory carries over between drawers. */}
                        {totalPages > 1 && (
                          <nav
                            className="mt-3 flex items-center justify-between gap-3 flex-wrap"
                            aria-label="LTV ranking pagination"
                          >
                            <p className="text-caption text-black/60 tabular-nums">
                              Showing <span className="font-semibold text-black/80">{pageStart + 1}–{pageEnd}</span> of <span className="font-semibold text-black/80">{shownCount}</span>
                              {' · '}Total <span className="font-semibold text-black/80 tabular-nums">{fmtINR(totalLTV)}</span> LTV
                            </p>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setLtvPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                aria-label="Previous page"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                                const isActive = p === safePage;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => setLtvPage(p)}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={`Page ${p}`}
                                    className={`inline-flex items-center justify-center min-w-8 h-8 px-2.5 rounded-md text-caption font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                                      isActive
                                        ? 'bg-[#204CC7] text-white border border-[#204CC7]'
                                        : 'bg-white text-black/65 border border-black/[0.08] hover:bg-black/[0.03] hover:text-black/85'
                                    }`}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setLtvPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                aria-label="Next page"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/[0.08] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
                              >
                                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </nav>
                        )}
                      </>)}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Recent Churns — Attrition drawer only ──
                    The chart above answers "is the trend up or down?". This
                    section answers "who actually walked, and what did it
                    cost?" — so the founder can put names + numbers to the
                    rate. Six most recent churns; the View-all CTA jumps
                    to the Lost Clients sub-tab for the full filterable
                    list with exit reasons, recovery toggles, etc. */}
                {openKPI === 'attrition' && (() => {
                  type Member = { initials: string; name: string; role: string; color: string };
                  const T: Record<string, Member> = {
                    CP: { initials: 'CP', name: 'Chinmay Pawar',  role: 'HOD',       color: '#7C3AED' },
                    ZS: { initials: 'ZS', name: 'Zubear Shaikh',  role: 'HOD',       color: '#06B6D4' },
                    PS: { initials: 'PS', name: 'Priya Sharma',   role: 'Manager',   color: '#3B82F6' },
                    RD: { initials: 'RD', name: 'Rohan Desai',    role: 'Manager',   color: '#10B981' },
                    AM: { initials: 'AM', name: 'Akshay Mehta',   role: 'Manager',   color: '#F59E0B' },
                    SP: { initials: 'SP', name: 'Sneha Patel',    role: 'Manager',   color: '#E2445C' },
                    IM: { initials: 'IM', name: 'Irshad Mulla',   role: 'Executive', color: '#EC4899' },
                    KI: { initials: 'KI', name: 'Kavya Iyer',     role: 'Executive', color: '#06B6D4' },
                  };
                  const fmtBilling = (v: number) =>
                    v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` :
                    v >= 1000   ? `₹${Math.round(v / 1000)}K`    : `₹${v}`;
                  const recentChurns: { id: string; dateLabel: string; client: string; service: 'SEM' | 'A&T'; tenure: number; billing: number; team: Member[] }[] = [
                    { id: 'c1', dateLabel: '18 Mar', client: 'Zenith Retail Pvt Ltd', service: 'SEM', tenure: 14, billing: 85000,  team: [T.PS, T.CP, T.AM] },
                    { id: 'c2', dateLabel: '12 Mar', client: 'NovaTech Solutions',    service: 'A&T', tenure: 8,  billing: 42000,  team: [T.RD, T.ZS, T.KI] },
                    { id: 'c3', dateLabel: '5 Mar',  client: 'Bloom Botanics',        service: 'SEM', tenure: 6,  billing: 65000,  team: [T.AM, T.CP] },
                    { id: 'c4', dateLabel: '28 Feb', client: 'Meridian Healthcare',   service: 'A&T', tenure: 22, billing: 38000,  team: [T.SP, T.ZS, T.IM] },
                    { id: 'c5', dateLabel: '20 Feb', client: 'UrbanNest Realty',      service: 'SEM', tenure: 18, billing: 120000, team: [T.SP, T.CP, T.AM, T.RD] },
                    { id: 'c6', dateLabel: '15 Feb', client: 'FreshBite Foods',       service: 'SEM', tenure: 10, billing: 55000,  team: [T.RD, T.CP] },
                  ];
                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      {/* Section header + View-all CTA */}
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">Recent churns</h3>
                          <p className="text-caption text-black/65 mt-1">Latest clients lost — open the full list for exit reasons, recovery, and history</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setOpenKPI(null); router.push('/home?tab=customers&sub=lost-clients'); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#204CC7]/20 bg-[#204CC7]/[0.04] text-[#204CC7] text-caption font-semibold hover:bg-[#204CC7]/[0.08] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all"
                        >
                          View all lost clients
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Table */}
                      <div className="px-7 pb-7">
                        <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-black/5">
                                <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold text-black/55 uppercase tracking-wide w-[100px]">Date</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Client</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold text-black/55 uppercase tracking-wide w-[140px]">Team</th>
                                <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold text-black/55 uppercase tracking-wide w-[100px]">Tenure</th>
                                <th scope="col" className="px-4 py-2.5 text-right text-caption font-semibold text-black/55 uppercase tracking-wide w-[110px]">Billing / mo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentChurns.map(r => (
                                <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                                  <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums whitespace-nowrap">{r.dateLabel}</td>
                                  <td className="px-4 py-3 align-middle">
                                    <div className="text-body font-medium text-black/85 leading-tight">{r.client}</div>
                                    <div className="text-caption text-black/55 leading-tight mt-0.5">{r.service}</div>
                                  </td>
                                  <td className="px-4 py-3 align-middle">
                                    {/* Team — same hover-popover as the
                                        Lost Clients table. Stacked
                                        avatars are one trigger; hover
                                        opens a single list with every
                                        member + role. */}
                                    <TeamHoverPopover team={r.team} />
                                  </td>
                                  <td className="px-4 py-3 align-middle text-caption text-black/65 tabular-nums">{r.tenure} mo{r.tenure !== 1 ? 's' : ''}</td>
                                  <td className="px-4 py-3 align-middle text-body font-medium text-black/85 tabular-nums text-right whitespace-nowrap">{fmtBilling(r.billing)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Client-Wise Margin Report — Margins drawer only ──
                    The trend chart above answers "is the blended margin
                    healthy and trending?". This section answers "which
                    clients are dragging or lifting the margin?". Grouped
                    by Service or HOD with progressive disclosure so the
                    founder can scan the totals first and drill into the
                    offending accounts. */}
                {openKPI === 'margins' && (
                  <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                    {/* Section header */}
                    <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-body font-bold text-black/85">Client-Wise Margin Report</h3>
                        <p className="text-caption text-black/65 mt-1">Profitability per client — expand a group to see details</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" role="tablist" aria-label="Group client margins by">
                        <div className="flex bg-black/[0.05] rounded-lg p-0.5">
                          <button
                            role="tab"
                            aria-selected={clientMarginView === 'service'}
                            onClick={() => { setClientMarginView('service'); setExpandedClientGroup(null); }}
                            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] ${clientMarginView === 'service' ? 'bg-white shadow-sm text-black/90' : 'text-black/65 hover:text-black/85'}`}
                          >
                            By Service
                          </button>
                          <button
                            role="tab"
                            aria-selected={clientMarginView === 'hod'}
                            onClick={() => { setClientMarginView('hod'); setExpandedClientGroup(null); }}
                            className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] ${clientMarginView === 'hod' ? 'bg-white shadow-sm text-black/90' : 'text-black/65 hover:text-black/85'}`}
                          >
                            By HOD
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Group rows */}
                    <div className="px-7 pb-6">
                      <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                        {(() => {
                          const groups = clientMarginView === 'service' ? clientMarginByService : clientMarginByHOD;
                          const groupEntries = Object.entries(groups);
                          const serviceColors: Record<string, string> = { 'SEM': '#7C3AED', 'A&T': '#06B6D4' };
                          const hodColors: Record<string, string> = { 'Chinmay Pawar': '#7C3AED', 'Zubear Shaikh': '#06B6D4' };

                          return groupEntries.map(([groupName, clients], gi) => {
                            const groupBilling = clients.reduce((s, c) => s + c.billingPerMonth, 0);
                            const groupCost = clients.reduce((s, c) => s + c.totalCost, 0);
                            const groupMargin = clients.reduce((s, c) => s + c.grossMargin, 0);
                            const groupMarginPct = groupBilling > 0 ? (groupMargin / groupBilling) * 100 : 0;
                            const healthyCount = clients.filter(c => c.status === 'Healthy').length;
                            const riskCount = clients.filter(c => c.status === 'At Risk').length;
                            const accentColor = clientMarginView === 'service'
                              ? (serviceColors[groupName] || '#204CC7')
                              : (hodColors[groupName] || '#204CC7');
                            const isExpanded = expandedClientGroup === groupName;

                            return (
                              <div key={groupName} className={gi > 0 ? 'border-t border-black/[0.05]' : ''}>
                                {/* Group summary row */}
                                <button
                                  onClick={() => setExpandedClientGroup(isExpanded ? null : groupName)}
                                  aria-expanded={isExpanded}
                                  aria-label={`${groupName} — ${clients.length} clients, ${formatClientCurrency(groupBilling)} billing, ${groupMarginPct.toFixed(1)}% margin`}
                                  className="w-full px-5 py-4 hover:bg-black/[0.015] transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]"
                                >
                                  {/* Row 1: Identity + health badges */}
                                  <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2.5">
                                      <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                                      <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
                                      <span className="text-body font-semibold text-black/90">{groupName}</span>
                                      <span className="text-caption text-black/60">{clients.length} clients</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {healthyCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-caption font-medium text-emerald-700 border border-emerald-100">{healthyCount} healthy</span>}
                                      {riskCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-caption font-medium text-rose-700 border border-rose-100">{riskCount} at risk</span>}
                                    </div>
                                  </div>
                                  {/* Row 2: Metric strip */}
                                  <div className="flex items-center gap-3 ml-[26px] flex-wrap">
                                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                                      <span className="text-caption text-black/65">Billing</span>
                                      <span className="text-body font-semibold text-black/85">{formatClientCurrency(groupBilling)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                                      <span className="text-caption text-black/65">Cost</span>
                                      <span className="text-body font-semibold text-black/70">{formatClientCurrency(groupCost)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                                      <span className="text-caption text-black/65">Margin</span>
                                      <span className="text-body font-semibold text-[#00C875]">{formatClientCurrency(groupMargin)}</span>
                                    </div>
                                    <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-semibold border ${
                                      groupMarginPct >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      groupMarginPct >= 15 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                      {groupMarginPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </button>

                                {/* Expanded client table — progressive disclosure */}
                                {isExpanded && (
                                  <div className="border-t border-black/[0.05]">
                                    <table className="w-full" role="table" aria-label={`${groupName} client margins`}>
                                      <thead>
                                        <tr className="bg-[#F6F7FF]/60">
                                          <th className="px-5 py-2 pl-12 text-left text-caption font-medium text-black/65" style={{ minWidth: 200 }}>Client</th>
                                          <th
                                            className="px-4 py-2 text-right text-caption font-medium text-black/65 cursor-pointer hover:text-black/80 select-none focus-visible:outline-none focus-visible:text-[#204CC7]"
                                            onClick={() => toggleClientMarginSort('billingPerMonth')}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClientMarginSort('billingPerMonth'); } }}
                                            tabIndex={0}
                                            role="columnheader"
                                            aria-sort={clientMarginSort === 'billingPerMonth' ? (clientMarginSortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                                          >
                                            Billing / Mo {clientMarginSort === 'billingPerMonth' ? (clientMarginSortDir === 'desc' ? '↓' : '↑') : ''}
                                          </th>
                                          <th className="px-4 py-2 text-right text-caption font-medium text-black/65">Cost</th>
                                          <th
                                            className="px-4 py-2 text-center text-caption font-medium text-black/65 cursor-pointer hover:text-black/80 select-none focus-visible:outline-none focus-visible:text-[#204CC7]"
                                            onClick={() => toggleClientMarginSort('marginPercent')}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClientMarginSort('marginPercent'); } }}
                                            tabIndex={0}
                                            role="columnheader"
                                            aria-sort={clientMarginSort === 'marginPercent' ? (clientMarginSortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                                          >
                                            Margin % {clientMarginSort === 'marginPercent' ? (clientMarginSortDir === 'desc' ? '↓' : '↑') : ''}
                                          </th>
                                          <th className="px-4 py-2 text-center text-caption font-medium text-black/65" style={{ minWidth: 80 }}>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {clients.map((client) => (
                                          <tr key={client.id} className="border-t border-black/[0.04] hover:bg-black/[0.015] transition-colors">
                                            <td className="px-5 py-2.5 pl-12">
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${client.status === 'Healthy' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                                  role="img"
                                                  aria-label={client.status}
                                                />
                                                <span className="text-caption font-medium text-black/80">{client.clientName}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-caption text-black/75">{formatClientCurrency(client.billingPerMonth)}</td>
                                            <td className="px-4 py-2.5 text-right text-caption text-black/65">{formatClientCurrency(client.totalCost)}</td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className="inline-flex items-center gap-1">
                                                <span className={`text-caption font-semibold ${
                                                  client.marginPercent >= 25 ? 'text-emerald-600' :
                                                  client.marginPercent >= 10 ? 'text-amber-600' : 'text-rose-600'
                                                }`}>
                                                  {client.marginPercent.toFixed(1)}%
                                                </span>
                                                {client.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" aria-hidden="true" />}
                                                {client.trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-500" aria-hidden="true" />}
                                                {client.trend !== 'up' && client.trend !== 'down' && <span className="sr-only">stable</span>}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                              <span className={`inline-flex px-2 py-0.5 rounded text-caption font-medium ${
                                                client.status === 'Healthy' ? 'text-emerald-600' : 'text-rose-600'
                                              }`}>
                                                {client.status}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Client Relationships drawer — per-HOD breakdown ──
                    Same pie-chart card design as the home Client
                    Relationships Overview widget, laid out in a 2-column
                    grid for the drawer's narrower canvas. Tejas (COO)
                    leads the grid as the company-wide oversight view,
                    followed by the four HOD-level portfolios. */}
                {openKPI === 'client-rel' && (() => {
                  const REL_COLORS = {
                    excellent: '#00C875',
                    good:      '#FDAB3D',
                    needs:     '#E2445C',
                  };
                  // Full roster: COO leads (oversight rollup), then HODs in
                  // the existing data order so the grid reads top-to-bottom
                  // by hierarchy.
                  const hods = hodRelationships;
                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">By HOD</h3>
                          <p className="text-caption text-black/65 mt-1">Relationship health distribution per department head</p>
                        </div>
                        {/* Legend — exact brand hex codes shared with the
                            home widget so dots and pie slices read the
                            same colour language. */}
                        <div className="flex items-center gap-3 flex-shrink-0 pt-1">
                          <span className="flex items-center gap-1.5 text-caption text-black/60">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REL_COLORS.excellent }} />
                            Excellent
                          </span>
                          <span className="flex items-center gap-1.5 text-caption text-black/60">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REL_COLORS.good }} />
                            Good
                          </span>
                          <span className="flex items-center gap-1.5 text-caption text-black/60">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REL_COLORS.needs }} />
                            Needs Attention
                          </span>
                        </div>
                      </div>
                      <div className="px-7 pb-6 grid grid-cols-2 gap-4">
                        {hods.map(hod => {
                          const chartData = [
                            { name: `${hod.hod}-Excellent`, label: 'Excellent', value: hod.excellent, fill: REL_COLORS.excellent },
                            { name: `${hod.hod}-Good`, label: 'Good', value: hod.good, fill: REL_COLORS.good },
                            { name: `${hod.hod}-NeedsAttention`, label: 'Needs Attention', value: hod.needsAttention, fill: REL_COLORS.needs },
                          ];
                          const excellentPct = hod.totalClients > 0 ? Math.round((hod.excellent / hod.totalClients) * 100) : 0;
                          return (
                            <div key={hod.hod} className="flex flex-col items-center rounded-xl p-5 bg-white border border-black/[0.06]">
                              <div className="flex items-center gap-2.5 mb-4 self-start">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-caption font-semibold" style={{ backgroundColor: hod.color }}>
                                  {hod.initials}
                                </div>
                                <div>
                                  <p className="text-body font-medium text-black/90">{hod.hod}</p>
                                  <p className="text-black/55 text-caption">{hod.department}</p>
                                </div>
                              </div>
                              <ResponsiveContainer width="100%" height={130}>
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={32}
                                    outerRadius={54}
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    strokeWidth={0}
                                  >
                                    {chartData.map((entry, index) => (
                                      <Cell key={`${hod.hod}-${entry.name}-${index}`} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
                                            <p className="text-caption font-medium text-black/90">{payload[0].payload.label}</p>
                                            <p className="text-body font-semibold" style={{ color: payload[0].payload.fill }}>
                                              {payload[0].value} clients
                                            </p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="mt-2 flex flex-col items-center gap-0.5">
                                <p className="text-body font-semibold text-black/80 tabular-nums">{hod.totalClients} <span className="font-normal text-caption text-black/55">clients</span></p>
                                <p className="text-caption font-medium tabular-nums" style={{ color: REL_COLORS.excellent }}>{excellentPct}% excellent</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ── At-risk Clients drawer — simple table with filter ──
                    Same calm table layout as the home page Client - CLA
                    widget. A dropdown in the top-right toggles All /
                    Sureshot / Can Be Saved without changing the structure. */}
                {openKPI === 'at-risk-client' && (() => {
                  const claLabels: Record<typeof claFilter, string> = {
                    'all': 'All',
                    'sureshot': 'Sureshot',
                    'can-be-saved': 'Can Be Saved',
                  };
                  const filtered = claFilter === 'all'
                    ? clientNominations
                    : clientNominations.filter(n => n.claStatus === claFilter);
                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">The CLA list</h3>
                          <p className="text-caption text-black/65 mt-1">Sureshot clients need intervention today; saveable ones are still recoverable.</p>
                        </div>
                        {/* Filter dropdown — top-right corner of the table */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setClaFilterOpen(o => !o)}
                            aria-haspopup="menu"
                            aria-expanded={claFilterOpen}
                            aria-label={`Filter CLA list. Currently showing ${claLabels[claFilter]}.`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-black/[0.10] hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
                          >
                            <span className="text-black/55">Show</span>
                            <span className="font-semibold">{claLabels[claFilter]}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform ${claFilterOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                          {claFilterOpen && (
                            <>
                              <div className="fixed inset-0 z-[10000]" aria-hidden="true" onClick={() => setClaFilterOpen(false)} />
                              <div role="menu" className="absolute right-0 mt-1.5 z-[10001] min-w-[180px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5">
                                {(['all', 'sureshot', 'can-be-saved'] as const).map(opt => (
                                  <button
                                    key={opt}
                                    role="menuitemradio"
                                    aria-checked={claFilter === opt}
                                    onClick={() => { setClaFilter(opt); setClaFilterOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-caption font-medium transition-colors flex items-center justify-between ${
                                      claFilter === opt
                                        ? 'bg-[#EEF1FB] text-[#204CC7]'
                                        : 'text-black/75 hover:bg-black/[0.03]'
                                    }`}
                                  >
                                    <span>{claLabels[opt]}</span>
                                    <span className="text-caption text-black/45 tabular-nums">
                                      {opt === 'all'
                                        ? clientNominations.length
                                        : clientNominations.filter(n => n.claStatus === opt).length}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Simple table — same layout as the home Client - CLA widget */}
                      <div className="px-7 pb-6">
                        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                          {/* Header row */}
                          <div className="px-5 py-2.5 bg-black/[0.015] flex items-center text-caption font-semibold text-black/55 border-b border-black/[0.04]">
                            <span className="flex-1">Client</span>
                            <span className="w-[120px] text-center">Responsible</span>
                            <span className="w-[130px] text-right">Status</span>
                          </div>

                          {/* Body rows */}
                          {filtered.length === 0 ? (
                            <div className="px-5 py-12 text-center">
                              <p className="text-body font-medium text-black/70">No clients in this category</p>
                              <p className="text-caption text-black/55 mt-1">Try a different filter.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-black/[0.04]">
                              {filtered.map(n => (
                                <div key={n.client} className="px-5 py-3.5 flex items-center hover:bg-black/[0.012] transition-colors">
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="text-body font-medium text-black/85 truncate">{n.client}</p>
                                    <p className="text-caption text-black/60 truncate">{n.reason}</p>
                                  </div>
                                  <span className="w-[120px] text-center text-caption font-medium text-black/75">{n.responsible}</span>
                                  <span className="w-[130px] text-right">
                                    <span className={`inline-block text-caption font-semibold px-2 py-0.5 rounded-md ${
                                      n.claStatus === 'sureshot'
                                        ? 'bg-[#E2445C]/[0.08] text-[#E2445C]'
                                        : 'bg-[#FDAB3D]/[0.08] text-[#FDAB3D]'
                                    }`}>
                                      {n.claStatus === 'sureshot' ? 'Sureshot' : 'Can Be Saved'}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Employee CLA drawer — simple table with filter ──
                    Same calm table layout as the home page Employee -
                    CLA/NTF widget. A dropdown in the top-right toggles
                    All / CLA / NTF without changing the structure.
                    Compounding-risk signal is preserved — clients also on
                    the At-risk Clients list show as rose chips with the
                    AlertTriangle icon. */}
                {openKPI === 'at-risk-emp' && (() => {
                  const empLabels: Record<typeof empFilter, string> = {
                    'all': 'All',
                    'cla': 'CLA',
                    'ntf': 'NTF',
                  };
                  const filtered = empFilter === 'all'
                    ? employeeNominations
                    : employeeNominations.filter(n => n.type === empFilter);
                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">The watchlist</h3>
                          <p className="text-caption text-black/65 mt-1">Employees flagged for performance concerns — hover the assigned-clients pill to see the full list.</p>
                        </div>
                        {/* Filter dropdown — top-right corner of the table */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => setEmpFilterOpen(o => !o)}
                            aria-haspopup="menu"
                            aria-expanded={empFilterOpen}
                            aria-label={`Filter watchlist. Currently showing ${empLabels[empFilter]}.`}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-black/[0.10] hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
                          >
                            <span className="text-black/55">Show</span>
                            <span className="font-semibold">{empLabels[empFilter]}</span>
                            <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform ${empFilterOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                          </button>
                          {empFilterOpen && (
                            <>
                              <div className="fixed inset-0 z-[10000]" aria-hidden="true" onClick={() => setEmpFilterOpen(false)} />
                              <div role="menu" className="absolute right-0 mt-1.5 z-[10001] min-w-[180px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5">
                                {(['all', 'cla', 'ntf'] as const).map(opt => (
                                  <button
                                    key={opt}
                                    role="menuitemradio"
                                    aria-checked={empFilter === opt}
                                    onClick={() => { setEmpFilter(opt); setEmpFilterOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-caption font-medium transition-colors flex items-center justify-between ${
                                      empFilter === opt
                                        ? 'bg-[#EEF1FB] text-[#204CC7]'
                                        : 'text-black/75 hover:bg-black/[0.03]'
                                    }`}
                                  >
                                    <span>{empLabels[opt]}</span>
                                    <span className="text-caption text-black/45 tabular-nums">
                                      {opt === 'all'
                                        ? employeeNominations.length
                                        : employeeNominations.filter(n => n.type === opt).length}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Simple table — Date | Employee + reason | Type | Assigned Clients
                          The "Assigned clients" column used to wrap one
                          rose pill per client and blew up vertically as
                          soon as anyone owned 6+ accounts. It's now a
                          single count-pill (e.g. "5 clients · ⚠ 2") that
                          opens a popover with the full list on hover or
                          focus — same data, one line, scales to any
                          assignment count. */}
                      <div className="px-7 pb-6">
                        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                          {/* Header row */}
                          <div className="px-5 py-2.5 bg-black/[0.015] flex items-center text-caption font-semibold text-black/55 border-b border-black/[0.04]">
                            <span className="w-[70px]">Date</span>
                            <span className="flex-1">Employee</span>
                            <span className="w-[80px] text-center">Type</span>
                            <span className="w-[170px] text-right">Assigned clients</span>
                          </div>

                          {/* Body rows */}
                          {filtered.length === 0 ? (
                            <div className="px-5 py-12 text-center">
                              <p className="text-body font-medium text-black/70">No employees in this category</p>
                              <p className="text-caption text-black/55 mt-1">Try a different filter.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-black/[0.04]">
                              {filtered.map(e => (
                                <div key={e.employee} className="px-5 py-3.5 flex items-center hover:bg-black/[0.012] transition-colors">
                                  <span className="w-[70px] text-caption text-black/60 tabular-nums flex-shrink-0">{e.dateAdded}</span>
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="text-body font-medium text-black/85 truncate">{e.employee}</p>
                                    <p className="text-caption text-black/60 truncate">{e.reason}</p>
                                  </div>
                                  <span className="w-[80px] text-center">
                                    <span className={`inline-block text-caption font-semibold px-2 py-0.5 rounded-md ${
                                      e.type === 'cla'
                                        ? 'bg-[#E2445C]/[0.08] text-[#E2445C]'
                                        : 'bg-[#FDAB3D]/[0.08] text-[#FDAB3D]'
                                    }`}>
                                      {e.type === 'cla' ? 'CLA' : 'NTF'}
                                    </span>
                                  </span>
                                  <div className="w-[170px] flex justify-end">
                                    <ClientsHoverPopover clients={e.clients} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Outstanding Dues drawer — collections tracker ──
                    The table below the trend chart is the action
                    surface: every row is one client × outstanding
                    amount × days overdue, bucketed by an urgency
                    chip (Current / Overdue / Critical / At Risk)
                    so the admin sees who needs chasing today vs
                    tomorrow. Filter dropdown narrows to a single
                    bucket; bucket counts in the menu show how big
                    each pile is. The "Inactive" chip on the row
                    is preserved — an Inactive account that still
                    owes is the worst kind, not the easiest to
                    forget. */}
                {openKPI === 'billing' && (() => {
                  const bucketLabel: Record<AgeingBucket, string> = {
                    '0-30':  '0-30 days',
                    '31-60': '31-60 days',
                    '61-90': '61-90 days',
                    '90+':   '90+ days',
                  };
                  // Sort by days overdue DESC so the worst rows
                  // appear at the top — the admin's eye should
                  // land first on what's been waiting longest.
                  const sorted = [...outstandingAccounts].sort((a, b) => b.daysOverdue - a.daysOverdue);
                  const filtered = sorted.filter(a => billingBucket(a.daysOverdue) === billingFilter);
                  const totalShown = filtered.reduce((s, a) => s + a.amount, 0);
                  const bucketCount = (b: AgeingBucket) =>
                    sorted.filter(a => billingBucket(a.daysOverdue) === b).length;
                  const buckets: AgeingBucket[] = ['0-30', '31-60', '61-90', '90+'];
                  return (
                    <div className="border-t border-black/[0.06] bg-[#FAFBFC]/60">
                      <div className="px-7 pt-6 pb-3 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-body font-bold text-black/85">Top accounts with outstanding</h3>
                          <p className="text-caption text-black/65 mt-1">
                            {filtered.length} {filtered.length === 1 ? 'account' : 'accounts'} · {formatLakh(totalShown)} pending collection. Sorted by days overdue.
                          </p>
                        </div>
                        {/* Right cluster — filter dropdown + primary
                            CTA. Same pattern as the other drawer
                            tables (Onboarding / Churn / Ratings /
                            Lost / Attrition / At-risk Clients):
                            filter narrows the in-drawer table, CTA
                            jumps to the dedicated module for the
                            full statement-level view. */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            <button
                              onClick={() => setBillingFilterOpen(o => !o)}
                              aria-haspopup="menu"
                              aria-expanded={billingFilterOpen}
                              aria-label={`Ageing bucket filter. Currently showing ${bucketLabel[billingFilter]}.`}
                              className="flex items-center gap-2 h-9 px-3 rounded-md bg-white border border-black/[0.10] hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
                            >
                              <span className="text-black/55">Ageing</span>
                              <span className="font-semibold">{bucketLabel[billingFilter]}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform ${billingFilterOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {billingFilterOpen && (
                              <>
                                <div className="fixed inset-0 z-[10000]" aria-hidden="true" onClick={() => setBillingFilterOpen(false)} />
                                <div role="menu" className="absolute right-0 mt-1.5 z-[10001] min-w-[200px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5">
                                  {buckets.map(opt => (
                                    <button
                                      key={opt}
                                      role="menuitemradio"
                                      aria-checked={billingFilter === opt}
                                      onClick={() => { setBillingFilter(opt); setBillingFilterOpen(false); }}
                                      className={`w-full text-left px-4 py-2 text-caption font-medium transition-colors flex items-center justify-between ${
                                        billingFilter === opt
                                          ? 'bg-[#EEF1FB] text-[#204CC7]'
                                          : 'text-black/75 hover:bg-black/[0.03]'
                                      }`}
                                    >
                                      <span>{bucketLabel[opt]}</span>
                                      <span className="text-caption text-black/45 tabular-nums">{bucketCount(opt)}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          {/* Primary CTA — promoted from the drawer
                              footer to sit beside the dropdown. Same
                              brand-blue chrome as every other drawer
                              CTA so the action affordance reads
                              instantly. */}
                          <button
                            type="button"
                            onClick={() => { setOpenKPI(null); router.push('/home?tab=customers&sub=billing'); }}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                          >
                            View Billing & Subscriptions
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Table — Client / Service / Outstanding /
                          Days overdue / Last paid. Right-aligned
                          tabular nums on the money + day columns
                          so the eye scans a clean column. The
                          urgency chip (At Risk / Critical /
                          Overdue / Current) lives on the days
                          column, where it belongs — that's the
                          dimension the bucket measures. */}
                      <div className="px-7 pb-6">
                        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
                          {/* Header */}
                          <div className="px-5 py-2.5 bg-black/[0.015] flex items-center text-caption font-semibold text-black/55 border-b border-black/[0.04]">
                            <span className="flex-1">Client</span>
                            <span className="w-[80px] text-center">Service</span>
                            <span className="w-[110px] text-right">Outstanding</span>
                            <span className="w-[100px] text-right">Days overdue</span>
                            <span className="w-[100px] text-right">Last paid</span>
                          </div>

                          {/* Body */}
                          {filtered.length === 0 ? (
                            <div className="px-5 py-12 text-center">
                              <p className="text-body font-medium text-black/70">Nothing in this bucket</p>
                              <p className="text-caption text-black/55 mt-1">Try a different filter.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-black/[0.04]">
                              {filtered.map(a => {
                                const isInactive = a.status === 'Inactive';
                                return (
                                  <div key={a.client} className="px-5 py-3.5 flex items-center hover:bg-black/[0.012] transition-colors">
                                    {/* Client + contact + Inactive chip if applicable */}
                                    <div className="flex-1 min-w-0 pr-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <p className="text-body font-medium text-black/85 truncate">{a.client}</p>
                                        {isInactive && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium bg-slate-100 text-slate-600 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                                            Inactive
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-caption text-black/60 truncate mt-0.5">{a.contact}</p>
                                    </div>
                                    {/* Service tag — purple for both A&T and SEM
                                        per the unified service-tag treatment. */}
                                    <div className="w-[80px] flex justify-center">
                                      <span className="inline-block text-caption font-medium px-1.5 py-0.5 rounded bg-purple-50 text-[#7C3AED]">
                                        {a.service === 'Both' ? 'SEM·A&T' : a.service}
                                      </span>
                                    </div>
                                    {/* Outstanding amount — rose, bold,
                                        tabular for column alignment. */}
                                    <span className="w-[110px] text-right text-body font-semibold tabular-nums text-[#E2445C]">
                                      {formatLakh(a.amount)}
                                    </span>
                                    {/* Days overdue — clean number only.
                                        The bucket chip was retired here:
                                        the dropdown above already scopes
                                        the table to a single ageing bucket,
                                        so a per-row label was redundant
                                        and added visual noise. */}
                                    <span className="w-[100px] text-right text-caption tabular-nums text-black/75">
                                      {a.daysOverdue}d
                                    </span>
                                    {/* Last paid date or "Never" — gives
                                        the admin a recency anchor without
                                        opening the per-client statement. */}
                                    <span className="w-[100px] text-right text-caption text-black/65 tabular-nums">
                                      {a.lastPayment ?? 'Never'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Footer hint retired — primary CTA now lives
                            at the top-right of the table next to the
                            filter dropdown, matching the pattern used
                            on every other drawer table in the build. */}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </>,
          document.body
        );
      })()}

    </div>
  );
}