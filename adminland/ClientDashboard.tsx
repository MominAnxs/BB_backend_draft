'use client';
import { useState, useRef, useEffect } from 'react';
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
  const cogs = exp * 0.55;
  const operating = exp * 0.32;
  const other = exp * 0.03;
  const netProfitPct = rev > 0 ? ((rev - exp) / rev) * 100 : 0;

  return {
    pnl: {
      netProfit,
      margin: Math.round(margin * 10) / 10,
      qoqChange: metrics.revenue.change,
      cogsPercent: 55.0,
      operatingPercent: 32.0,
      otherPercent: 3.0,
      netProfitPercent: Math.round(netProfitPct * 10) / 10,
      cogs,
      operating,
      other,
      industryAvg: 8,
      vsIndustry: Math.round((margin - 8) * 10) / 10,
      insights: [
        `Net profit margin at ${Math.round(margin * 10) / 10}% is ${margin > 8 ? 'above' : 'below'} the industry average of 8%.`,
        `COGS at 55% of revenue — consider negotiating supplier contracts to reduce this.`,
        `Operating expenses are stable at 32% — good cost control.`,
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

const DATE_RANGES = ['This Month', 'Last Month', 'Q1 2026', 'Q4 2025', 'Q3 2025', 'FY 2025-26', 'Custom'] as const;

const EXPORT_OPTIONS = [
  { id: 'pdf', label: 'Export as PDF', icon: FileBarChart },
  { id: 'excel', label: 'Export as Excel', icon: FileSpreadsheet },
] as const;

export function ClientDashboard({ client, report, onBack }: ClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [dateRange, setDateRange] = useState<string>(report.period || 'Q1 2026');
  const [dateDropdown, setDateDropdown] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const data = generateDashboardData(report.metrics);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateDropdown(false);
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
    <div className="flex h-full bg-[#F8F9FB]" role="main" aria-label={`${client.name} client dashboard`}>
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

          {/* Date Filter */}
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => { setDateDropdown(!dateDropdown); setExportDropdown(false); }}
              aria-expanded={dateDropdown}
              aria-haspopup="listbox"
              aria-label="Select date range"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/[0.08] bg-white hover:border-black/[0.15] transition-colors text-caption font-medium text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              <Calendar className="w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              {dateRange}
              <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${dateDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {dateDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[180px] bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-20" role="listbox" aria-label="Date range options">
                {DATE_RANGES.map((range) => (
                  <button
                    key={range}
                    role="option"
                    aria-selected={dateRange === range}
                    onClick={() => { setDateRange(range); setDateDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 text-caption transition-colors ${
                      dateRange === range
                        ? 'text-[#204CC7] font-semibold bg-[#204CC7]/[0.04]'
                        : 'text-black/65 hover:bg-black/[0.03]'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative ml-2" ref={exportRef}>
            <button
              onClick={() => { setExportDropdown(!exportDropdown); setDateDropdown(false); }}
              aria-expanded={exportDropdown}
              aria-haspopup="menu"
              aria-label="Export report"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#204CC7] hover:bg-[#1a3fa8] transition-colors text-caption font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:ring-offset-2"
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

function PnLCard({ data, revenue }: { data: OverviewData['pnl']; revenue: number }) {
  const [showInsights, setShowInsights] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center">
            <FileText className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">P&L Performance</h3>
        </div>
        <button
          className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
          aria-label="More information about P&L Performance"
        >
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* Net Profit headline */}
      <div className="mb-1">
        <p className="text-caption text-black/50 mb-1">Net Profit (Q4 2025)</p>
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

      {/* Industry comparison bar */}
      <div className="mt-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption text-black/50">vs Industry Average</span>
          <span className="text-caption font-semibold text-[#204CC7]">+{data.vsIndustry}%</span>
        </div>
        <div
          className="relative h-2 bg-black/[0.04] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(data.margin)}
          aria-valuemin={0}
          aria-valuemax={25}
          aria-label="Net profit margin vs industry average"
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#204CC7] rounded-full"
            style={{ width: `${Math.min(data.margin / 25 * 100, 100)}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-[#204CC7]/40"
            style={{ left: `${(data.industryAvg / 25) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-caption text-black/50">0%</span>
          <span className="text-caption text-black/50" style={{ marginLeft: `${(data.industryAvg / 25) * 100 - 10}%` }}>Avg: {data.industryAvg}%</span>
          <span className="text-caption text-black/50">25%</span>
        </div>
      </div>

      {/* Revenue to Profit waterfall */}
      <div className="mb-4">
        <p className="text-caption font-medium text-black/60 mb-3">From Revenue to Profit</p>

        {/* Revenue bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-[80px] shrink-0">
            <p className="text-caption text-black/60">Revenue</p>
            <p className="text-caption font-semibold text-black/80">{formatCurrency(revenue)}</p>
          </div>
          <div
            className="flex-1 relative h-7 bg-black/[0.03] rounded-lg overflow-hidden"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Revenue"
          >
            <div className="absolute top-0 left-0 h-full bg-[#204CC7] rounded-lg flex items-center justify-end pr-3" style={{ width: '100%' }}>
              <span className="text-caption font-semibold text-white">100%</span>
            </div>
          </div>
        </div>

        {/* COGS bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-[80px] shrink-0">
            <p className="text-caption text-black/60">COGS</p>
            <p className="text-caption font-semibold text-black/80">-{formatCurrency(data.cogs)}</p>
          </div>
          <div
            className="flex-1 relative h-7 bg-black/[0.03] rounded-lg"
            role="progressbar"
            aria-valuenow={Math.round(data.cogsPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Cost of Goods Sold"
          >
            <div className="absolute top-0 left-0 h-full bg-black/[0.15] rounded-lg" style={{ width: `${data.cogsPercent}%` }} />
            <span className="absolute top-0 h-full flex items-center text-caption font-semibold text-black/60 pl-1.5" style={{ left: `${data.cogsPercent}%` }}>{data.cogsPercent}%</span>
          </div>
        </div>

        {/* Operating bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-[80px] shrink-0">
            <p className="text-caption text-black/60">Operating</p>
            <p className="text-caption font-semibold text-black/80">-{formatCurrency(data.operating)}</p>
          </div>
          <div
            className="flex-1 relative h-7 bg-black/[0.03] rounded-lg"
            role="progressbar"
            aria-valuenow={Math.round(data.operatingPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Operating Expenses"
          >
            <div className="absolute top-0 left-0 h-full bg-black/[0.15] rounded-lg" style={{ width: `${data.operatingPercent}%` }} />
            <span className="absolute top-0 h-full flex items-center text-caption font-semibold text-black/60 pl-1.5" style={{ left: `${data.operatingPercent}%` }}>{data.operatingPercent}%</span>
          </div>
        </div>

        {/* Other bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-[80px] shrink-0">
            <p className="text-caption text-black/60">Other</p>
            <p className="text-caption font-semibold text-black/80">-{formatCurrency(data.other)}</p>
          </div>
          <div
            className="flex-1 relative h-7 bg-black/[0.03] rounded-lg"
            role="progressbar"
            aria-valuenow={Math.round(data.otherPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Other Expenses"
          >
            <div className="absolute top-0 left-0 h-full bg-black/[0.15] rounded-lg" style={{ width: `${data.otherPercent}%` }} />
            <span className="absolute top-0 h-full flex items-center text-caption font-semibold text-black/60 pl-1.5" style={{ left: `${data.otherPercent}%` }}>{data.otherPercent}%</span>
          </div>
        </div>

        {/* Net Profit bar */}
        <div className="flex items-center gap-3 pt-3 border-t border-black/[0.04]">
          <div className="w-[80px] shrink-0">
            <p className="text-caption text-[#00C875] font-medium">Net Profit</p>
            <p className="text-caption font-semibold text-[#00C875]">{formatCurrency(data.netProfit)}</p>
          </div>
          <div
            className="flex-1 relative h-7 bg-black/[0.03] rounded-lg"
            role="progressbar"
            aria-valuenow={Math.round(data.netProfitPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Net Profit"
          >
            <div className="absolute top-0 left-0 h-full bg-[#00C875] rounded-lg" style={{ width: `${data.netProfitPercent}%` }} />
            <span className="absolute top-0 h-full flex items-center text-caption font-semibold text-white pl-1.5" style={{ left: `${Math.max(data.netProfitPercent - 6, 1)}%` }}>{data.netProfitPercent}%</span>
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

// ══════════════════════════════════════════════════════════
// ─── BALANCE SHEET CARD ───
// ══════════════════════════════════════════════════════════

function BalanceSheetCard({ data }: { data: OverviewData['balanceSheet'] }) {
  const [showInsights, setShowInsights] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center">
            <Landmark className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Balance Sheet</h3>
        </div>
        <button
          className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
          aria-label="More information about Balance Sheet"
        >
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* Net Worth */}
      <div className="mb-5">
        <p className="text-caption text-black/50 mb-1">Net Worth</p>
        <div className="flex items-center gap-3">
          <span className="text-[28px] font-bold text-black/85 tabular-nums">{formatCurrency(data.netWorth)}</span>
          <span className={`px-2.5 py-1 rounded-lg text-caption font-semibold ${data.isHealthy ? 'bg-[#00C875]/[0.08] text-[#00C875]' : 'bg-[#FDAB3D]/[0.08] text-[#FDAB3D]'}`}>
            {data.isHealthy ? 'Healthy' : 'Needs Attention'}
          </span>
          {data.isHealthy && <CheckCircle2 className="w-5 h-5 text-[#00C875] ml-auto" aria-hidden="true" />}
        </div>
      </div>

      {/* Current Assets / Liabilities bars */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-caption text-black/55">Current Assets</span>
            <span className="text-caption font-semibold text-[#204CC7] tabular-nums">{formatCurrency(data.currentAssets)}</span>
          </div>
          <div
            className="h-2 bg-black/[0.04] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round((data.currentAssets / (data.currentAssets + data.fixedAssets + data.investments)) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Current Assets"
          >
            <div className="h-full bg-[#204CC7] rounded-full" style={{ width: `${Math.min((data.currentAssets / (data.currentAssets + data.fixedAssets + data.investments)) * 100, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-caption text-black/55">Current Liabilities</span>
            <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(data.currentLiabilities)}</span>
          </div>
          <div
            className="h-2 bg-black/[0.04] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round((data.currentLiabilities / (data.capitalAccount + data.loansLiability + data.currentLiabilities)) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Current Liabilities"
          >
            <div className="h-full bg-black/20 rounded-full" style={{ width: `${Math.min((data.currentLiabilities / (data.capitalAccount + data.loansLiability + data.currentLiabilities)) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div>
        <p className="text-caption font-medium text-black/60 mb-3">Detailed Breakdown</p>
        <div className="flex gap-2 mb-4">
          <span className="flex items-center gap-1.5 text-caption text-black/55">
            <span className="w-2 h-2 rounded-full bg-[#204CC7]" /> Assets
          </span>
          <span className="flex items-center gap-1.5 text-caption text-black/55 ml-6">
            <span className="w-2 h-2 rounded-full bg-black/30" /> Liabilities
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {/* Assets column */}
          <div className="space-y-4">
            <BreakdownItem label="Fixed Assets" value={formatCurrency(data.fixedAssets)} percent={data.fixedAssetsPercent} color="bg-[#204CC7]" />
            <BreakdownItem label="Current Assets" value={formatCurrency(data.currentAssets)} percent={data.currentAssetsPercent} color="bg-[#204CC7]" />
            <BreakdownItem label="Investments" value={formatCurrency(data.investments)} percent={data.investmentsPercent} color="bg-[#204CC7]" />
          </div>
          {/* Liabilities column */}
          <div className="space-y-4">
            <BreakdownItem label="Capital A/C" value={formatCurrency(data.capitalAccount)} percent={data.capitalPercent} color="bg-black/25" />
            <BreakdownItem label="Loans (Liability)" value={formatCurrency(data.loansLiability)} percent={data.loansPercent} color="bg-black/25" />
            <BreakdownItem label="Current Liabilities" value={formatCurrency(data.currentLiabilities)} percent={data.currentLiabilitiesPercent} color="bg-black/25" />
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
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-caption text-black/55">{label}</span>
        <span className="text-caption font-semibold text-black/75 tabular-nums">{value}</span>
      </div>
      <div
        className="relative h-5 bg-black/[0.04] rounded-full"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} ${percent}%`}
      >
        {percent > 0 && (
          <div className={`absolute top-0 left-0 h-full ${color} rounded-full`} style={{ width: `${Math.max(percent, 2)}%` }} />
        )}
        <span
          className={`absolute top-0 h-full flex items-center text-caption font-semibold whitespace-nowrap ${
            percent >= 30 ? 'text-white px-2' : 'text-black/55 pl-1.5'
          }`}
          style={{ left: percent >= 30 ? '0' : `${Math.max(percent, 0)}%` }}
        >
          {percent}%
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ─── CASHFLOW CARD ───
// ══════════════════════════════════════════════════════════

function CashflowCard({ data }: { data: OverviewData['cashflow'] }) {
  const [showInsights, setShowInsights] = useState(false);

  const runwayColor = data.runwayStatus === 'healthy' ? '#00C875' : data.runwayStatus === 'warning' ? '#FDAB3D' : '#E2445C';
  const runwayBadgeText = data.runwayStatus === 'healthy' ? 'Healthy' : data.runwayStatus === 'warning' ? 'Action needed' : 'Critical';

  // Gradient progress bar for runway
  const maxRunway = 12;
  const runwayPercent = Math.min((data.runway / maxRunway) * 100, 100);

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center">
            <Droplets className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Cashflow</h3>
        </div>
        <button
          className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
          aria-label="More information about Cashflow"
        >
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* Cash Runway */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-caption text-black/50">Cash Runway</span>
          {data.runwayStatus !== 'healthy' && <AlertTriangle className="w-4 h-4 text-[#FDAB3D]" aria-hidden="true" />}
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[32px] font-bold text-black/85 tabular-nums">{data.runway}</span>
          <span className="text-body text-black/50">months</span>
          <span className={`px-2.5 py-1 rounded-lg text-caption font-semibold ml-2`} style={{ backgroundColor: `${runwayColor}15`, color: runwayColor }}>
            {runwayBadgeText}
          </span>
        </div>
        {/* Gradient bar */}
        <div
          className="relative h-2.5 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(to right, #00C875, #00C875 40%, #FDAB3D 65%, #E2445C 100%)' }}
          role="progressbar"
          aria-valuenow={Math.round(data.runway)}
          aria-valuemin={0}
          aria-valuemax={maxRunway}
          aria-label="Cash runway in months"
        >
          <div
            className="absolute top-0 h-full bg-transparent border-r-2 border-white"
            style={{ left: `${runwayPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-caption font-medium text-[#00C875]">Today</span>
          <span className="text-caption text-black/50">Mar &apos;26</span>
          <span className="text-caption text-[#E2445C]">May &apos;26</span>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="mt-2">
        <p className="text-caption font-medium text-black/60 mb-3">December 2025 Summary</p>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-black/[0.02] rounded-xl px-4 py-3">
            <span className="text-caption text-black/60">Total Inflow</span>
            <span className="text-caption font-semibold text-[#00C875] tabular-nums">{formatCurrency(data.totalInflow)}</span>
          </div>
          <div className="flex items-center justify-between bg-[#E2445C]/[0.04] rounded-xl px-4 py-3">
            <span className="text-caption text-black/60">Total Outflow</span>
            <span className="text-caption font-semibold text-[#E2445C] tabular-nums">{formatCurrency(data.totalOutflow)}</span>
          </div>
          <div className="flex items-center justify-between bg-black/[0.02] rounded-xl px-4 py-3 border border-black/[0.04]">
            <span className="text-caption font-medium text-black/70">Net Cashflow</span>
            <span className="text-caption font-semibold text-[#204CC7] tabular-nums">{formatCurrency(data.netCashflow)}</span>
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

// ══════════════════════════════════════════════════════════
// ─── KEY RATIOS CARD ───
// ══════════════════════════════════════════════════════════

function RatiosCard({ data, overallHealth }: { data: OverviewData['ratios']; overallHealth: string }) {
  const [showInsights, setShowInsights] = useState(false);

  const ratioItems: { label: string; key: string; value: string; status: ReturnType<typeof getRatioStatus> }[] = [
    { label: 'Current Ratio', key: 'currentRatio', value: `${data.currentRatio}:1`, status: getRatioStatus('currentRatio', data.currentRatio) },
    { label: 'Quick Ratio', key: 'quickRatio', value: `${data.quickRatio}:1`, status: getRatioStatus('quickRatio', data.quickRatio) },
    { label: 'Debt/Equity', key: 'debtEquity', value: `${data.debtEquity}:1`, status: getRatioStatus('debtEquity', data.debtEquity) },
    { label: 'DSO', key: 'dso', value: `${data.dso} days`, status: getRatioStatus('dso', data.dso) },
    { label: 'Net Profit %', key: 'netProfitPercent', value: `${data.netProfitPercent}%`, status: getRatioStatus('netProfitPercent', data.netProfitPercent) },
    { label: 'ROI', key: 'roi', value: `${data.roi}%`, status: getRatioStatus('roi', data.roi) },
  ];

  const healthColor = overallHealth === 'Strong' ? '#00C875' : overallHealth === 'Moderate' ? '#FDAB3D' : '#E2445C';

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center">
            <Percent className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Key Ratios</h3>
        </div>
        <button
          className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
          aria-label="More information about Key Ratios"
        >
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* Financial Health Metrics header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption text-black/50">Financial Health Metrics</span>
        <span className="text-caption font-semibold" style={{ color: healthColor }}>{data.excellentCount}/{data.totalCount} Excellent</span>
      </div>

      {/* Ratio grid — 2×3 */}
      <div className="grid grid-cols-2 gap-3 mb-5" role="list">
        {ratioItems.map((item) => (
          <div
            key={item.key}
            className={`rounded-xl px-4 py-3.5 ${RATIO_BG[item.status]}`}
            role="listitem"
          >
            <p className="text-caption text-black/45 mb-1">{item.label}</p>
            <p className={`text-h3 font-bold tabular-nums ${
              item.status === 'excellent' ? 'text-[#00C875]' :
              item.status === 'good' ? 'text-[#204CC7]' : 'text-[#FDAB3D]'
            }`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Overall assessment */}
      <div
        className="rounded-xl px-4 py-3.5 flex items-start gap-3"
        style={{ backgroundColor: `${healthColor}08` }}
        role="status"
      >
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: healthColor }} aria-hidden="true" />
        <div>
          <p className="text-caption font-semibold" style={{ color: healthColor }}>Overall: {overallHealth}</p>
          <p className="text-caption text-black/50 mt-0.5">
            {data.excellentCount} of {data.totalCount} ratios are excellent.
            {ratioItems.find(r => r.status === 'warning')
              ? ` Focus area: Improve ${ratioItems.find(r => r.status === 'warning')?.label}.`
              : ' Great financial discipline.'
            }
          </p>
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
