'use client';
import { useState, useRef, useEffect } from 'react';
import { MonthNavigator } from '@/workspace/shared/MonthNavigator';
import {
  ChevronLeft, TrendingUp, TrendingDown, HelpCircle,
  BarChart3, Receipt, ArrowDownLeft, ArrowUpRight,
  FileText, Landmark, Droplets, Percent, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Lightbulb,
  Calendar, Download, FileSpreadsheet, FileBarChart
} from 'lucide-react';

// ── Types ──

interface ATMetrics {
  revenue: { value: number; change: number };
  expenses: { value: number; change: number };
  bankBalance: { value: number; change: number };
  debtors: { value: number; change: number };
  creditors: { value: number; change: number };
}

interface AccountsTaxationReport {
  businessType: string;
  lastUpdated: string;
  period: string;
  metrics: ATMetrics;
  whatChanged: Array<{ category: string; description: string; value: string; trend: 'up' | 'down' | 'neutral' }>;
  risks: Array<{ severity: 'high' | 'medium' | 'low'; title: string; description: string }>;
  actions: Array<{ priority: 'high' | 'medium' | 'low'; title: string; description: string }>;
  status: 'excellent' | 'good' | 'needs-attention';
}

interface ClientDashboardProps {
  client: { id: string; name: string; code: string };
  report: AccountsTaxationReport;
  onBack: () => void;
}

type DashboardTab = 'overview' | 'sales' | 'expense' | 'receivables' | 'payables' | 'pnl' | 'balanceSheet' | 'cashflow' | 'ratios';

// ── Mock data for the detailed dashboard ──
// In production, this would come from an API based on the client ID

function generateDashboardData(metrics: ATMetrics) {
  const rev = metrics.revenue.value;
  const exp = metrics.expenses.value;
  const netProfit = rev - exp;
  const margin = rev > 0 ? (netProfit / rev) * 100 : 0;
  // Waterfall structure: Revenue → COGS → CM(1) → Marketing → CM(2)
  // → Other → Net Profit. CM(1) and CM(2) are derived contribution-
  // margin subtotals that surface in the P&L card as green-tinted
  // bands between cost rows. Percentages are revenue-relative so
  // each row's value reads against the headline 100%.
  const cogs      = rev * 0.55;
  const marketing = rev * 0.105;
  const other     = rev * 0.03;
  const cm1       = rev - cogs;          // 45.0 %
  const cm2       = cm1 - marketing;     // 34.5 %
  const netProfitPct = rev > 0 ? (netProfit / rev) * 100 : 0;

  return {
    pnl: {
      netProfit,
      margin: Math.round(margin * 10) / 10,
      qoqChange: metrics.revenue.change,
      // Cost-side rows
      cogs,
      cogsPercent:        55.0,
      marketing,
      marketingPercent:   10.5,
      other,
      otherPercent:       3.0,
      // Subtotal anchors — the two "Contribution Margin" reads
      // that explain the journey from revenue down to net profit.
      cm1,
      cm1Percent:         45.0,
      cm2,
      cm2Percent:         34.5,
      // Net profit line
      netProfitPercent:   Math.round(netProfitPct * 10) / 10,
      industryAvg:        8,
      vsIndustry:         Math.round((margin - 8) * 10) / 10,
      insights: [
        `Net profit margin at ${Math.round(margin * 10) / 10}% is ${margin > 8 ? 'above' : 'below'} the industry average of 8%.`,
        `COGS at 55% of revenue — consider negotiating supplier contracts to reduce this.`,
        `Marketing spend at 10.5% — within healthy range for the sector.`,
      ],
    },
    balanceSheet: {
      netWorth: (metrics.bankBalance.value + metrics.debtors.value) - metrics.creditors.value,
      isHealthy: (metrics.bankBalance.value + metrics.debtors.value) > metrics.creditors.value * 1.5,
      currentAssets: metrics.bankBalance.value + metrics.debtors.value,
      currentLiabilities: metrics.creditors.value + (metrics.creditors.value * 0.3),
      fixedAssets: Math.round(rev * 0.42),
      capitalAccount: Math.round(rev * 0.54),
      loansLiability: Math.round(metrics.creditors.value * 0.8),
      investments: Math.round(rev * 0.1),
      fixedAssetsPercent: 42.0,
      capitalPercent: 54.0,
      currentAssetsPercent: 48.0,
      loansPercent: 32.0,
      investmentsPercent: 0.0,
      currentLiabilitiesPercent: 14.0,
      insights: [
        `Current ratio is ${((metrics.bankBalance.value + metrics.debtors.value) / (metrics.creditors.value + metrics.creditors.value * 0.3)).toFixed(2)}:1 — healthy liquidity position.`,
        `Net worth is ${(metrics.bankBalance.value + metrics.debtors.value) > metrics.creditors.value * 1.5 ? 'positive' : 'needs attention'}.`,
      ],
    },
    cashflow: {
      runway: Math.round((metrics.bankBalance.value / (exp / 12)) * 10) / 10,
      runwayStatus: ((metrics.bankBalance.value / (exp / 12)) > 6 ? 'healthy' as const : (metrics.bankBalance.value / (exp / 12)) > 3 ? 'warning' as const : 'critical' as const),
      totalInflow: Math.round(rev / 12),
      totalOutflow: Math.round(exp / 12),
      netCashflow: Math.round((rev - exp) / 12),
      insights: [
        `Cash runway at ${Math.round((metrics.bankBalance.value / (exp / 12)) * 10) / 10} months — ${(metrics.bankBalance.value / (exp / 12)) > 6 ? 'comfortable buffer' : 'needs attention'}.`,
        `Monthly net cashflow is ₹${formatCompact(Math.round((rev - exp) / 12))}.`,
      ],
    },
    ratios: {
      currentRatio: Math.round(((metrics.bankBalance.value + metrics.debtors.value) / (metrics.creditors.value + metrics.creditors.value * 0.3)) * 100) / 100,
      quickRatio: Math.round((metrics.bankBalance.value / (metrics.creditors.value + metrics.creditors.value * 0.3)) * 100) / 100,
      debtEquity: Math.round(((metrics.creditors.value * 1.8) / ((metrics.bankBalance.value + metrics.debtors.value) - metrics.creditors.value || 1)) * 100) / 100,
      dso: Math.round((metrics.debtors.value / (rev / 365))),
      netProfitPercent: Math.round(netProfitPct * 10) / 10,
      roi: Math.round(((netProfit / (rev * 0.42 + rev * 0.1)) * 100) * 10) / 10,
      excellentCount: 0, // computed below
      totalCount: 6,
      insights: [] as string[],
    },
  };
}

// ── Helpers ──

function formatCompact(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${(val / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString('en-IN');
}

function formatCurrency(val: number): string {
  return `₹${formatCompact(val)}`;
}

function getRatioStatus(name: string, value: number): 'excellent' | 'good' | 'warning' {
  switch (name) {
    case 'currentRatio': return value >= 2 ? 'excellent' : value >= 1.5 ? 'good' : 'warning';
    case 'quickRatio': return value >= 1.5 ? 'excellent' : value >= 1 ? 'good' : 'warning';
    case 'debtEquity': return value <= 0.5 ? 'excellent' : value <= 1 ? 'good' : 'warning';
    case 'dso': return value <= 30 ? 'excellent' : value <= 45 ? 'good' : 'warning';
    case 'netProfitPercent': return value >= 15 ? 'excellent' : value >= 8 ? 'good' : 'warning';
    case 'roi': return value >= 20 ? 'excellent' : value >= 12 ? 'good' : 'warning';
    default: return 'good';
  }
}

const RATIO_BG: Record<string, string> = {
  excellent: 'bg-[#00C875]/[0.06]',
  good: 'bg-[#204CC7]/[0.06]',
  warning: 'bg-[#FDAB3D]/[0.08]',
};

// ── Sidebar Tab Config ──

const TABS: { id: DashboardTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'expense', label: 'Expense', icon: Receipt },
  { id: 'receivables', label: 'Receivables (AR)', icon: ArrowDownLeft },
  { id: 'payables', label: 'Payables (AP)', icon: ArrowUpRight },
  { id: 'pnl', label: 'Profit & Loss', icon: FileText },
  { id: 'balanceSheet', label: 'Balance Sheet', icon: Landmark },
  { id: 'cashflow', label: 'Cashflow', icon: Droplets },
  { id: 'ratios', label: 'Ratios', icon: Percent },
];

// ══════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───
// ══════════════════════════════════════════════════════════

const EXPORT_OPTIONS = [
  { id: 'pdf', label: 'Export as PDF', icon: FileBarChart },
  { id: 'excel', label: 'Export as Excel', icon: FileSpreadsheet },
] as const;

export function ClientDashboard({ client, report, onBack }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  // Month navigation — defaults to today so the chevrons always have
  // somewhere meaningful to step from. Mirrors the (idx, year) shape
  // used by the shared MonthNavigator on the Deliverables top bar so
  // the two surfaces use one widget and one keyboard model.
  const today = new Date();
  const [monthIdx, setMonthIdx] = useState<number>(today.getMonth());
  const [year, setYear] = useState<number>(today.getFullYear());
  const [exportDropdown, setExportDropdown] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const data = generateDashboardData(report.metrics);

  // Close the export dropdown on outside click. (Month navigator owns
  // its own picker dismiss behaviour.)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Count excellent ratios
  const ratioEntries: [string, number][] = [
    ['currentRatio', data.ratios.currentRatio],
    ['quickRatio', data.ratios.quickRatio],
    ['debtEquity', data.ratios.debtEquity],
    ['dso', data.ratios.dso],
    ['netProfitPercent', data.ratios.netProfitPercent],
    ['roi', data.ratios.roi],
  ];
  data.ratios.excellentCount = ratioEntries.filter(([k, v]) => getRatioStatus(k, v) === 'excellent').length;

  const overallHealth = data.ratios.excellentCount >= 4 ? 'Strong' : data.ratios.excellentCount >= 2 ? 'Moderate' : 'Weak';

  return (
    // `data-client-detail` is the flag the dashboard layout uses to
    // hide its outer PM / A&T sidebar via :has(). The detail view
    // owns the left rail (Overview / Sales / Expense / …) and the
    // outer module nav would just stack a second redundant sidebar.
    <div data-client-detail="true" className="flex h-full bg-[#F8F9FB]" role="main" aria-label={`${client.name} client dashboard`}>
      {/* ── Left Sidebar ── */}
      <aside className="w-[220px] bg-white border-r border-black/[0.06] flex flex-col shrink-0" aria-label="Dashboard navigation">
        <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-caption font-medium transition-all mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                  isActive
                    ? 'bg-[#204CC7]/[0.06] text-[#204CC7]'
                    : 'text-black/55 hover:text-black/75 hover:bg-black/[0.03]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Right: Top Bar + Content ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <header className="h-[52px] bg-white border-b border-black/[0.06] flex items-center px-6 shrink-0">
          <button
            onClick={onBack}
            aria-label="Back to reports list"
            className="flex items-center gap-2.5 text-black/70 hover:text-[#204CC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <h1 className="text-body font-semibold">{client.name}</h1>
          </button>
          <span className="text-caption text-black/40 ml-3">{client.code}</span>

          <div className="flex-1" />

          {/* Month navigator — same shared widget the A&T Deliverables
              top bar uses. Prev / month-pill / Next chevrons let the
              admin step through periods without opening a dropdown,
              and the calendar picker still expands from the pill. */}
          <MonthNavigator
            monthIdx={monthIdx}
            year={year}
            onMonthChange={setMonthIdx}
            onYearChange={setYear}
            minYear={2024}
          />

          {/* Export Dropdown */}
          <div className="relative ml-2" ref={exportRef}>
            <button
              onClick={() => setExportDropdown(!exportDropdown)}
              aria-expanded={exportDropdown}
              aria-haspopup="menu"
              aria-label="Export report"
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] transition-colors text-caption font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:ring-offset-2"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
              <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${exportDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {exportDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[200px] bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-20" role="menu" aria-label="Export options">
                {EXPORT_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      role="menuitem"
                      onClick={() => { setExportDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-caption text-black/65 hover:bg-black/[0.03] transition-colors"
                    >
                      <OptIcon className="w-4 h-4 text-black/40" aria-hidden="true" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-black/[0.06]">
            <div className={`w-2 h-2 rounded-full ${
              report.status === 'excellent' ? 'bg-[#00C875]' :
              report.status === 'good' ? 'bg-[#204CC7]' : 'bg-[#FDAB3D]'
            }`} aria-hidden="true" />
            <span className="text-caption text-black/50">Updated {report.lastUpdated}</span>
          </div>
        </header>

        {/* ── Main Content ── */}
        <section className="flex-1 overflow-y-auto" aria-label="Dashboard content">
        {activeTab === 'overview' && (
          <OverviewTab data={data} metrics={report.metrics} overallHealth={overallHealth} />
        )}
        {activeTab !== 'overview' && (
          <div className="p-8">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-10 text-center">
              <p className="text-body text-black/50">
                {TABS.find(t => t.id === activeTab)?.label} — Coming soon
              </p>
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ─── OVERVIEW TAB ───
// ══════════════════════════════════════════════════════════

interface OverviewData {
  pnl: ReturnType<typeof generateDashboardData>['pnl'];
  balanceSheet: ReturnType<typeof generateDashboardData>['balanceSheet'];
  cashflow: ReturnType<typeof generateDashboardData>['cashflow'];
  ratios: ReturnType<typeof generateDashboardData>['ratios'];
}

function OverviewTab({ data, metrics, overallHealth }: { data: OverviewData; metrics: ATMetrics; overallHealth: string }) {
  return (
    <div className="p-6">
      <h2 className="sr-only">Financial Overview</h2>
      <div className="grid grid-cols-2 gap-5">
        <PnLCard data={data.pnl} revenue={metrics.revenue.value} />
        <BalanceSheetCard data={data.balanceSheet} />
        <CashflowCard data={data.cashflow} />
        <RatiosCard data={data.ratios} overallHealth={overallHealth} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ─── P&L PERFORMANCE CARD ───
// ══════════════════════════════════════════════════════════

/**
 * One bar row inside the P&L waterfall.
 *   • variant='revenue' → full-width brand-blue bar with white
 *                          "100%" text on the right.
 *   • variant='cost'    → light-blue track bar; the bar fills to
 *                          `percent`; the percentage label sits
 *                          right-aligned at the row's right edge
 *                          (not at the bar's filled edge — a
 *                          right-aligned column reads cleaner
 *                          than a label that jumps around).
 *   • variant='profit'  → full-width emerald bar (the answer row).
 */
function PnLBarRow({
  label,
  value,
  percent,
  variant,
}: {
  label: string;
  value: string;
  percent: number;
  variant: 'revenue' | 'cost' | 'profit';
}) {
  const isFilled = variant === 'revenue' || variant === 'profit';
  const fillColor = variant === 'profit' ? 'bg-[#00C875]' : 'bg-[#204CC7]';
  const labelColor = variant === 'profit' ? 'text-[#00C875]' : 'text-black/60';
  const valueColor = variant === 'profit' ? 'text-[#00C875]' : 'text-black/80';
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <div className="w-[90px] shrink-0">
        <p className={`text-caption ${labelColor}`}>{label}</p>
        <p className={`text-caption font-semibold ${valueColor}`}>{value}</p>
      </div>
      <div
        className="flex-1 relative h-8 bg-[#EEF1FB] rounded-md overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {isFilled ? (
          <div
            className={`absolute top-0 left-0 h-full ${fillColor} rounded-md flex items-center justify-end pr-3`}
            style={{ width: `${Math.max(percent, 8)}%` }}
          >
            <span className="text-caption font-semibold text-white tabular-nums">{percent.toFixed(1)}%</span>
          </div>
        ) : (
          <>
            <div
              className="absolute top-0 left-0 h-full bg-[#204CC7]/[0.18] rounded-md"
              style={{ width: `${percent}%` }}
            />
            <span className="absolute right-3 top-0 h-full flex items-center text-caption font-semibold text-[#204CC7] tabular-nums">
              {percent.toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Subtotal row — the green-tinted full-width band that surfaces a
 * Contribution Margin (CM 1 / CM 2) between cost groups. No bar
 * inside; just the label on the left and the value + percentage
 * right-aligned. Reads as a clear "subtotal anchor" between the
 * cost rows it sits between.
 */
function PnLSubtotalRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div
      className="flex items-center justify-between bg-[#00C875]/[0.06] border border-[#00C875]/20 rounded-md px-3.5 h-9 mb-2.5"
      role="status"
      aria-label={`${label}: ${value}, ${percent.toFixed(1)} percent of revenue`}
    >
      <span className="text-caption font-semibold text-[#00C875]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-caption font-semibold text-black/80 tabular-nums">{value}</span>
        <span className="text-caption font-semibold text-[#00C875] tabular-nums">{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function PnLCard({ data, revenue }: { data: OverviewData['pnl']; revenue: number }) {
  const [showInsights, setShowInsights] = useState(false);
  // Period selector — quarter-level scope on P&L since margin
  // and revenue read more meaningfully across a quarter than a
  // single month. Today the picker is a static button (mock);
  // wiring it to real data would swap in a dropdown that flips
  // the underlying `data.netProfit / margin / qoqChange` figures.
  const [pnlPeriod] = useState('Q1 2026');

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header — title on the left, period selector + help icon
          on the right. Period selector is a button-styled control
          (calendar icon + label + chevron) that matches every
          other period-aware surface in the build. */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">P&L Performance</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label={`Period: ${pnlPeriod}`}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-white border border-black/10 hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <Calendar className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
            {pnlPeriod}
            <ChevronDown className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
          </button>
          <button
            className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
            aria-label="More information about P&L Performance"
          >
            <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Net Profit headline — period reads from the selector
          state above so toggling the picker updates the headline
          label in lockstep. */}
      <div className="mb-1">
        <p className="text-caption text-black/50 mb-1">Net Profit ({pnlPeriod})</p>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-[28px] font-bold text-black/85 tabular-nums">{formatCurrency(data.netProfit)}</span>
            <span className="px-2.5 py-1 rounded-lg bg-[#00C875]/[0.08] text-[#00C875] text-caption font-semibold">{data.margin}% margin</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#00C875]">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
            <span className="text-caption font-semibold">+{data.qoqChange}% vs Q3</span>
          </div>
        </div>
      </div>

      {/* Revenue to Profit waterfall — 7 rows in revenue-share
          order. Cost rows render as a horizontal bar with the
          percentage right-aligned at the row's edge (cleaner
          column scan than placing it at the bar's filled edge,
          which jumps around). The two CM rows are the visual
          subtotals between cost groups: green-tinted full-width
          bands with the value + percentage right-aligned, no bar
          inside — they read as anchors, not bars. */}
      <div className="mt-7">
        <p className="text-caption font-medium text-black/60 mb-4">From Revenue to Profit</p>

        {/* Revenue — full-width brand-blue bar, white "100%" on
            the right. Anchor row for the rest of the waterfall. */}
        <PnLBarRow
          label="Revenue"
          value={formatCurrency(revenue)}
          percent={100}
          variant="revenue"
        />

        {/* COGS — first cost row */}
        <PnLBarRow
          label="COGS"
          value={`-${formatCurrency(data.cogs)}`}
          percent={data.cogsPercent}
          variant="cost"
        />

        {/* CM (1) — Revenue minus COGS = Contribution Margin 1 */}
        <PnLSubtotalRow
          label="CM (1)"
          value={formatCurrency(data.cm1)}
          percent={data.cm1Percent}
        />

        {/* Marketing — second cost row */}
        <PnLBarRow
          label="Marketing"
          value={`-${formatCurrency(data.marketing)}`}
          percent={data.marketingPercent}
          variant="cost"
        />

        {/* CM (2) — CM(1) minus Marketing = Contribution Margin 2 */}
        <PnLSubtotalRow
          label="CM (2)"
          value={formatCurrency(data.cm2)}
          percent={data.cm2Percent}
        />

        {/* Other — third cost row */}
        <PnLBarRow
          label="Other"
          value={`-${formatCurrency(data.other)}`}
          percent={data.otherPercent}
          variant="cost"
        />

        {/* Net Profit — full-width emerald bar, white percentage
            on the right. Closes the waterfall as the answer-row. */}
        <PnLBarRow
          label="Net Profit"
          value={formatCurrency(data.netProfit)}
          percent={data.netProfitPercent}
          variant="profit"
        />
      </div>

      {/* Insights toggle */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        aria-expanded={showInsights}
        aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-medium">Insights</span>
        <div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {data.insights.map((insight, i) => (
            <p key={i} className="text-caption text-black/55 leading-relaxed pl-5">{insight}</p>
          ))}
        </div>
      )}
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── BALANCE SHEET CARD ───
// ══════════════════════════════════════════════════════════

function BalanceSheetCard({ data }: { data: OverviewData['balanceSheet'] }) {
  const [showInsights, setShowInsights] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header — title on the left, "as-of date" label + help
          icon on the right. Balance sheet is a snapshot (point-in-
          time view), so the right-side metadata is a static "As
          on …" label rather than a period picker. Same chrome as
          the other card headers — h-9 elements line up cleanly
          across the 2-column grid. */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Balance Sheet</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-caption text-black/55 font-medium">As on May 2026</span>
          <button
            className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
            aria-label="More information about Balance Sheet"
          >
            <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Net Worth — clean headline. The previous "Healthy"
          chip + checkmark icon were retired: the breakdown bars
          below already encode the financial-position read, and
          the chip duplicated that signal at the top in a way the
          screenshot doesn't show. */}
      <div className="mb-6">
        <p className="text-caption text-black/50 mb-1.5">Net Worth</p>
        <span className="text-[28px] font-bold text-black/85 tabular-nums leading-none">{formatCurrency(data.netWorth)}</span>
      </div>

      {/* Current Assets / Liabilities — top-level bars. Each row:
          label on the left, value right-aligned in its row colour
          (brand-blue for Assets, slate for Liabilities), then a
          thin progress bar below that fills proportionally to the
          row's share of its respective side (assets total /
          liabilities total). */}
      <div className="space-y-4 mb-7">
        {(() => {
          const totalAssets = data.currentAssets + data.fixedAssets + data.investments;
          const totalLiabilities = data.capitalAccount + data.loansLiability + data.currentLiabilities;
          const caPercent = totalAssets > 0 ? (data.currentAssets / totalAssets) * 100 : 0;
          const clPercent = totalLiabilities > 0 ? (data.currentLiabilities / totalLiabilities) * 100 : 0;
          return (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-caption text-black/65">Current Assets</span>
                  <span className="text-caption font-semibold text-[#204CC7] tabular-nums">{formatCurrency(data.currentAssets)}</span>
                </div>
                <div
                  className="h-2 bg-[#EEF1FB] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(caPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Current Assets share of total assets"
                >
                  <div className="h-full bg-[#204CC7] rounded-full" style={{ width: `${Math.min(caPercent, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-caption text-black/65">Current Liabilities</span>
                  <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(data.currentLiabilities)}</span>
                </div>
                <div
                  className="h-2 bg-black/[0.05] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(clPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Current Liabilities share of total liabilities"
                >
                  <div className="h-full bg-black/35 rounded-full" style={{ width: `${Math.min(clPercent, 100)}%` }} />
                </div>
              </div>
            </>
          );
        })()}
      </div>

      {/* Breakdown — two-column split. Hygiene pass: bumped row
          gap (space-y-3.5 → space-y-6) so each line reads as its
          own metric block instead of a dense list, and pushed
          the column headers to mb-5 so they don't crowd the
          first row. The taller breakdown also fills more of the
          card height, shrinking the dead space below before the
          Insights toggle. */}
      <div>
        <p className="text-caption font-medium text-black/60 mb-5">Breakdown</p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-0">
          {/* Assets column */}
          <div>
            <p className="flex items-center gap-1.5 text-caption font-semibold text-[#204CC7] mb-5">
              <span className="w-2 h-2 rounded-full bg-[#204CC7]" aria-hidden="true" />
              Assets
            </p>
            <div className="space-y-6">
              <BreakdownItem label="Fixed Assets"   value={formatCurrency(data.fixedAssets)}   percent={data.fixedAssetsPercent}   color="bg-[#204CC7]" />
              <BreakdownItem label="Current Assets" value={formatCurrency(data.currentAssets)} percent={data.currentAssetsPercent} color="bg-[#204CC7]" />
              <BreakdownItem label="Investments"    value={formatCurrency(data.investments)}    percent={data.investmentsPercent}    color="bg-[#204CC7]" />
            </div>
          </div>
          {/* Liabilities column */}
          <div>
            <p className="flex items-center gap-1.5 text-caption font-semibold text-black/60 mb-5">
              <span className="w-2 h-2 rounded-full bg-black/35" aria-hidden="true" />
              Liabilities
            </p>
            <div className="space-y-6">
              <BreakdownItem label="Capital A/C"         value={formatCurrency(data.capitalAccount)}     percent={data.capitalPercent}             color="bg-black/35" />
              <BreakdownItem label="Loans (Liability)"   value={formatCurrency(data.loansLiability)}     percent={data.loansPercent}               color="bg-black/35" />
              <BreakdownItem label="Current Liabilities" value={formatCurrency(data.currentLiabilities)} percent={data.currentLiabilitiesPercent}  color="bg-black/35" />
            </div>
          </div>
        </div>
      </div>

      {/* Insights toggle */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        aria-expanded={showInsights}
        aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-medium">Insights</span>
        <div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {data.insights.map((insight, i) => (
            <p key={i} className="text-caption text-black/55 leading-relaxed pl-5">{insight}</p>
          ))}
        </div>
      )}
    </article>
  );
}

function BreakdownItem({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  // Track tint mirrors the bar tint family — light-blue for the
  // Assets column, light-slate for the Liabilities column. Picked
  // off the `color` token so callers don't have to pass two
  // separate values.
  const trackTint = color === 'bg-[#204CC7]' ? 'bg-[#EEF1FB]' : 'bg-black/[0.05]';
  return (
    <div>
      {/* Top row — label on the left, value + percent right-aligned.
          Percent renders in a muted tone next to the value so the
          eye reads "₹105L · 42%" as paired metadata, with the
          stronger value as anchor and the percent as supporting
          context. */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-caption text-black/65">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-caption font-semibold text-black/80 tabular-nums">{value}</span>
          <span className="text-caption text-black/45 tabular-nums">{percent.toFixed(1)}%</span>
        </div>
      </div>
      {/* Thin progress bar below — 1.5px tall, no text inside.
          Replaces the previous chubby h-5 bar with embedded
          percent label; the percent now lives next to the value
          above so the bar can be a clean visual ratio cue. */}
      <div
        className={`h-1.5 ${trackTint} rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${percent.toFixed(1)} percent`}
      >
        {percent > 0 && (
          <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.max(percent, 2)}%` }} />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ─── CASHFLOW CARD ───
// ══════════════════════════════════════════════════════════

function CashflowCard({ data }: { data: OverviewData['cashflow'] }) {
  const [showInsights, setShowInsights] = useState(false);
  // Period selector — same Q1 2026 scope as the P&L card so the
  // two reads stay in lockstep. Static button (mock) for now;
  // wiring it would swap out the cashflow figures below.
  const [cashflowPeriod] = useState('Q1 2026');
  const closingBalance = data.totalInflow - data.totalOutflow;
  const isPositive = data.netCashflow >= 0;

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-7 flex flex-col">
      {/* Header — period selector mirrors the P&L card so cards on
          the same row share one date control. Help icon trails. */}
      <div className="flex items-center justify-between mb-7 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center shrink-0">
            <Droplets className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Cashflow</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label={`Period: ${cashflowPeriod}`}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-white border border-black/10 hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <Calendar className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
            {cashflowPeriod}
            <ChevronDown className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
          </button>
          <button
            className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
            aria-label="More information about Cashflow"
          >
            <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Net Cashflow headline — same anchor pattern as the P&L
          card's Net Profit headline (label + amount + status chip)
          so the two cards on the same row read with matching
          rhythm. mb-1 → mb-2 to give the headline a touch more
          air before the period summary section opens. */}
      <div className="mb-2">
        <p className="text-caption text-black/50 mb-1.5">Net Cashflow ({cashflowPeriod})</p>
        <div className="flex items-baseline gap-3">
          <span className="text-[28px] font-bold text-black/85 tabular-nums leading-none">{formatCurrency(Math.abs(data.netCashflow))}</span>
          <span className={`px-2.5 py-1 rounded-lg text-caption font-semibold ${isPositive ? 'bg-[#00C875]/[0.08] text-[#00C875]' : 'bg-[#E2445C]/[0.08] text-[#E2445C]'}`}>
            {isPositive ? 'Positive month' : 'Negative month'}
          </span>
        </div>
      </div>

      {/* Period Summary — three rows:
          • Total Inflow    — emerald (positive money)
          • Total Outflow   — rose (money out)
          • Closing Balance — brand-blue, the cash-on-hand anchor
            that ties the period view back to the running cash
            position.
          Hygiene pass — bumped row padding (px-4 py-3 → px-5 py-4),
          row gaps (space-y-2.5 → space-y-3), section header gap
          (mb-3 → mb-4), and section top margin (mt-5 → mt-7) so
          the card breathes proportionally with the deeper P&L
          card opposite on the same row. */}
      <div className="mt-7">
        <p className="text-caption font-medium text-black/60 mb-4">{cashflowPeriod} Summary</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-[#00C875]/[0.04] rounded-xl px-5 py-4">
            <span className="text-caption text-black/65">Total Inflow</span>
            <span className="text-caption font-semibold text-[#00C875] tabular-nums">{formatCurrency(data.totalInflow)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#E2445C]/[0.04] rounded-xl px-5 py-4">
            <span className="text-caption text-black/65">Total Outflow</span>
            <span className="text-caption font-semibold text-[#E2445C] tabular-nums">{formatCurrency(data.totalOutflow)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#204CC7]/[0.04] rounded-xl px-5 py-4">
            <span className="text-caption font-medium text-black/75">Closing Balance</span>
            <span className="text-caption font-semibold text-[#204CC7] tabular-nums">{formatCurrency(closingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Insights toggle — pt-5 + mt-7 floats the toggle off the
          last row by a comfortable gap, and the bottom margin
          before the divider matches the article's outer padding
          rhythm. */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        aria-expanded={showInsights}
        aria-label="Toggle insights"
        className="flex items-center gap-2 pt-5 mt-7 border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-medium">Insights</span>
        <div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {data.insights.map((insight, i) => (
            <p key={i} className="text-caption text-black/55 leading-relaxed pl-5">{insight}</p>
          ))}
        </div>
      )}
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── KEY RATIOS CARD ───
// ══════════════════════════════════════════════════════════

function RatiosCard({ data, overallHealth }: { data: OverviewData['ratios']; overallHealth: string }) {
  const [showInsights, setShowInsights] = useState(false);
  // Period selector — paired with the other Overview cards so all
  // four headers carry the same Q1 2026 control on the same row.
  const [ratiosPeriod] = useState('Q1 2026');

  // Tightened to 4 ratios in a 2×2 grid (was 6 in 2×3): Current
  // Ratio + Quick Ratio measure liquidity, Debt/Equity captures
  // leverage, Net Profit % closes the income-statement read.
  // DSO + ROI moved off this card — DSO surfaces on the
  // Receivables tab (where it's natively scoped), ROI is a longer-
  // horizon metric that doesn't pair with the trailing-quarter
  // shape of the others on this card. The "Overall: Strong"
  // assessment block was retired with them — its punchline
  // ("X of Y ratios are excellent") loses signal at 4 cards and
  // duplicated the per-tile status colour anyway.
  const ratioItems: { label: string; key: string; value: string; status: ReturnType<typeof getRatioStatus> }[] = [
    { label: 'Current Ratio',  key: 'currentRatio',     value: `${data.currentRatio}:1`,      status: getRatioStatus('currentRatio', data.currentRatio) },
    { label: 'Quick Ratio',    key: 'quickRatio',       value: `${data.quickRatio}:1`,        status: getRatioStatus('quickRatio', data.quickRatio) },
    { label: 'Debt/Equity',    key: 'debtEquity',       value: `${data.debtEquity}:1`,        status: getRatioStatus('debtEquity', data.debtEquity) },
    { label: 'Net Profit %',   key: 'netProfitPercent', value: `${data.netProfitPercent}%`,   status: getRatioStatus('netProfitPercent', data.netProfitPercent) },
  ];

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-7 flex flex-col">
      {/* Header — period selector mirrors P&L / Cashflow / Balance
          Sheet so all four Overview cards carry the same control
          shape across the row. */}
      <div className="flex items-center justify-between mb-7 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Key Ratios</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label={`Period: ${ratiosPeriod}`}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-white border border-black/10 hover:border-black/20 text-caption font-medium text-black/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <Calendar className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
            {ratiosPeriod}
            <ChevronDown className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
          </button>
          <button
            className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
            aria-label="More information about Key Ratios"
          >
            <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Subheading — clean label only. mb-5 (up from mb-4) gives
          the subheading a touch more separation from the grid,
          matching the rhythm between the Cashflow card's
          "Q1 2026 Summary" label and its rows. */}
      <p className="text-caption text-black/55 mb-5">Financial Health Metrics</p>

      {/* Ratio grid — 2×2. Hygiene pass — tile padding lifted
          (px-4 py-5 → px-5 py-7) so each tile reads as a
          standalone metric block, label-mb bumped (mb-2 → mb-3)
          to push the headline number further from the label, and
          grid gap nudged (gap-3 → gap-4) so adjacent tiles don't
          crowd each other. The card now occupies the same vertical
          footprint as the Cashflow card opposite. */}
      <div className="grid grid-cols-2 gap-4" role="list">
        {ratioItems.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl px-5 py-7 ${RATIO_BG[item.status]}`}
            role="listitem"
          >
            <p className="text-caption text-black/55 mb-3">{item.label}</p>
            <p className={`text-h2 font-bold tabular-nums leading-none ${
              item.status === 'excellent' ? 'text-[#00C875]' :
              item.status === 'good' ? 'text-[#204CC7]' : 'text-[#FDAB3D]'
            }`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Insights toggle */}
      <button
        onClick={() => setShowInsights(!showInsights)}
        aria-expanded={showInsights}
        aria-label="Toggle insights"
        className="flex items-center gap-2 pt-5 mt-7 border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="font-medium">Insights</span>
        <div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          <p className="text-caption text-black/55 leading-relaxed pl-5">
            Current ratio at {data.currentRatio}:1 indicates {data.currentRatio >= 2 ? 'strong' : 'adequate'} short-term liquidity.
          </p>
          <p className="text-caption text-black/55 leading-relaxed pl-5">
            DSO at {data.dso} days — {data.dso <= 30 ? 'excellent collection cycle' : 'consider tightening collection terms'}.
          </p>
        </div>
      )}
    </article>
  );
}
