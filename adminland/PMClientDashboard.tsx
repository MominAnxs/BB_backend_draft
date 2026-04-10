'use client';
import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, ChevronDown, ChevronUp, ChevronRight,
  Calendar, Download, FileSpreadsheet, FileBarChart,
  Lightbulb, HelpCircle,
  DollarSign, TrendingUp, Target, ShoppingCart, Users,
  Zap, Palette, Globe, Filter,
  BarChart3, Megaphone, Monitor, CreditCard
} from 'lucide-react';

// ── Types ──

interface MetricVal { value: number; change: number; target: number }

interface ECommerceMetrics {
  adSpend: MetricVal; roas: MetricVal; revenue: MetricVal; orders: MetricVal; aov: MetricVal;
}

interface LeadGenMetrics {
  adSpend: MetricVal; leads: MetricVal; cpl: MetricVal; ctr: MetricVal;
}

interface PMReportBase {
  lastUpdated: string; period: string;
  targetAchievement: { spends: { achieved: number; target: number; variance: number }; revenue: { achieved: number; target: number; variance: number } };
  status: 'excellent' | 'good' | 'needs-attention';
}

interface ECommercePMReport extends PMReportBase { reportType: 'ecommerce'; metrics: ECommerceMetrics }
interface LeadGenPMReport extends PMReportBase { reportType: 'leadGeneration'; metrics: LeadGenMetrics }
type PerformanceMarketingReport = ECommercePMReport | LeadGenPMReport;

interface PMClientDashboardProps {
  client: { id: string; name: string; code: string };
  report: PerformanceMarketingReport;
  onBack: () => void;
}

type PMDashboardTab = 'overview' | 'campaigns' | 'website' | 'sales';

const PM_TABS: { id: PMDashboardTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'website', label: 'Website', icon: Monitor },
  { id: 'sales', label: 'Sales', icon: CreditCard },
];

const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Q1 2026', 'Custom'] as const;
const EXPORT_OPTIONS = [
  { id: 'pdf', label: 'Export as PDF', icon: FileBarChart },
  { id: 'excel', label: 'Export as Excel', icon: FileSpreadsheet },
] as const;

// ── Helpers ──

function formatCompact(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) return `${(val / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${(val / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toLocaleString('en-IN');
}
function formatCurrency(val: number): string { return `₹${formatCompact(val)}`; }

// ══════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───
// ══════════════════════════════════════════════════════════

export function PMClientDashboard({ client, report, onBack }: PMClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<PMDashboardTab>('overview');
  const [dateRange, setDateRange] = useState<string>(report.period || 'Last 30 Days');
  const [dateDropdown, setDateDropdown] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateDropdown(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex h-full bg-[#F8F9FB]" role="main" aria-label={`${client.name} PM dashboard`}>
      {/* ── Left Sidebar ── */}
      <aside className="w-[220px] bg-white border-r border-black/[0.06] flex flex-col shrink-0" aria-label="Dashboard navigation">
        <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Dashboard sections">
          {PM_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            // Only show Sales tab for e-commerce reports
            if (tab.id === 'sales' && report.reportType !== 'ecommerce') return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-caption font-medium transition-all mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                  isActive
                    ? 'bg-[#7C3AED]/[0.06] text-[#7C3AED]'
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
            className="flex items-center gap-2.5 text-black/70 hover:text-[#7C3AED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 focus-visible:rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <h1 className="text-body font-semibold">{client.name}</h1>
          </button>
          <span className="text-caption text-black/50 ml-3">{client.code} · {report.reportType === 'ecommerce' ? 'E-Commerce' : 'Lead Generation'}</span>
          <div className="flex-1" />

          {/* Date Filter */}
          <div className="relative" ref={dateRef}>
            <button
              onClick={() => { setDateDropdown(!dateDropdown); setExportDropdown(false); }}
              aria-expanded={dateDropdown}
              aria-haspopup="listbox"
              aria-label="Select date range"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/[0.08] bg-white hover:border-black/[0.15] transition-colors text-caption font-medium text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30"
            >
              <Calendar className="w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              {dateRange}
              <ChevronDown className={`w-3 h-3 text-black/40 transition-transform ${dateDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {dateDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[180px] bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-20" role="listbox">
                {DATE_RANGES.map((range) => (
                  <button key={range} role="option" aria-selected={dateRange === range}
                    onClick={() => { setDateRange(range); setDateDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 text-caption transition-colors ${dateRange === range ? 'text-[#7C3AED] font-semibold bg-[#7C3AED]/[0.04]' : 'text-black/65 hover:bg-black/[0.03]'}`}
                  >{range}</button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="relative ml-2" ref={exportRef}>
            <button
              onClick={() => { setExportDropdown(!exportDropdown); setDateDropdown(false); }}
              aria-expanded={exportDropdown} aria-haspopup="menu" aria-label="Export report"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] transition-colors text-caption font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 focus-visible:ring-offset-2"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
              <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${exportDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {exportDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[200px] bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-20" role="menu">
                {EXPORT_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button key={opt.id} role="menuitem" onClick={() => setExportDropdown(false)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-caption text-black/65 hover:bg-black/[0.03] transition-colors"
                    ><OptIcon className="w-4 h-4 text-black/40" aria-hidden="true" />{opt.label}</button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-black/[0.06]">
            <div className={`w-2 h-2 rounded-full ${report.status === 'excellent' ? 'bg-[#00C875]' : report.status === 'good' ? 'bg-[#7C3AED]' : 'bg-[#FDAB3D]'}`} aria-hidden="true" />
            <span className="text-caption text-black/50">Updated {report.lastUpdated}</span>
          </div>
        </header>

        {/* ── Content ── */}
        <section className="flex-1 overflow-y-auto" aria-label="Dashboard content">
          {activeTab === 'overview' && <PMOverviewTab report={report} />}
          {activeTab !== 'overview' && (
            <div className="p-8">
              <div className="bg-white rounded-2xl border border-black/[0.06] p-10 text-center">
                <p className="text-body text-black/50">{PM_TABS.find(t => t.id === activeTab)?.label} — Coming soon</p>
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

function PMOverviewTab({ report }: { report: PerformanceMarketingReport }) {
  const isEcom = report.reportType === 'ecommerce';
  const m = report.metrics;

  // Build KPI cards based on report type
  const kpiCards: KPICardData[] = isEcom ? [
    { label: 'Ad Spend', value: formatCurrency((m as ECommerceMetrics).adSpend.value), target: formatCurrency((m as ECommerceMetrics).adSpend.target), percent: Math.round(((m as ECommerceMetrics).adSpend.value / (m as ECommerceMetrics).adSpend.target) * 100), icon: DollarSign, iconBg: 'bg-[#00C875]/[0.08]', iconColor: 'text-[#00C875]' },
    { label: 'Revenue', value: formatCurrency((m as ECommerceMetrics).revenue.value), target: formatCurrency((m as ECommerceMetrics).revenue.target), percent: Math.round(((m as ECommerceMetrics).revenue.value / (m as ECommerceMetrics).revenue.target) * 100), icon: TrendingUp, iconBg: 'bg-[#FDAB3D]/[0.08]', iconColor: 'text-[#FDAB3D]' },
    { label: 'ROAS', value: `${(m as ECommerceMetrics).roas.value}x`, target: `${(m as ECommerceMetrics).roas.target}x`, percent: Math.round(((m as ECommerceMetrics).roas.value / (m as ECommerceMetrics).roas.target) * 100), icon: Target, iconBg: 'bg-[#204CC7]/[0.08]', iconColor: 'text-[#204CC7]' },
    { label: 'Orders', value: formatCompact((m as ECommerceMetrics).orders.value), target: formatCompact((m as ECommerceMetrics).orders.target), percent: Math.round(((m as ECommerceMetrics).orders.value / (m as ECommerceMetrics).orders.target) * 100), icon: ShoppingCart, iconBg: 'bg-[#7C3AED]/[0.08]', iconColor: 'text-[#7C3AED]' },
    { label: 'AOV', value: formatCurrency((m as ECommerceMetrics).aov.value), target: formatCurrency((m as ECommerceMetrics).aov.target), percent: Math.round(((m as ECommerceMetrics).aov.value / (m as ECommerceMetrics).aov.target) * 100), icon: Users, iconBg: 'bg-[#00C875]/[0.08]', iconColor: 'text-[#00C875]' },
  ] : [
    { label: 'Ad Spend', value: formatCurrency((m as LeadGenMetrics).adSpend.value), target: formatCurrency((m as LeadGenMetrics).adSpend.target), percent: Math.round(((m as LeadGenMetrics).adSpend.value / (m as LeadGenMetrics).adSpend.target) * 100), icon: DollarSign, iconBg: 'bg-[#00C875]/[0.08]', iconColor: 'text-[#00C875]' },
    { label: 'Leads', value: formatCompact((m as LeadGenMetrics).leads.value), target: formatCompact((m as LeadGenMetrics).leads.target), percent: Math.round(((m as LeadGenMetrics).leads.value / (m as LeadGenMetrics).leads.target) * 100), icon: Users, iconBg: 'bg-[#204CC7]/[0.08]', iconColor: 'text-[#204CC7]' },
    { label: 'CPL', value: `₹${formatCompact((m as LeadGenMetrics).cpl.value)}`, target: `₹${formatCompact((m as LeadGenMetrics).cpl.target)}`, percent: Math.round(((m as LeadGenMetrics).cpl.target / (m as LeadGenMetrics).cpl.value) * 100), icon: Target, iconBg: 'bg-[#FDAB3D]/[0.08]', iconColor: 'text-[#FDAB3D]' },
    { label: 'CTR', value: `${(m as LeadGenMetrics).ctr.value}%`, target: `${(m as LeadGenMetrics).ctr.target}%`, percent: Math.round(((m as LeadGenMetrics).ctr.value / (m as LeadGenMetrics).ctr.target) * 100), icon: TrendingUp, iconBg: 'bg-[#7C3AED]/[0.08]', iconColor: 'text-[#7C3AED]' },
  ];

  return (
    <div className="px-8 pt-8 pb-6 space-y-6">
      <h2 className="sr-only">Performance Marketing Overview</h2>

      {/* KPI Cards Row */}
      <div className={`grid gap-5 ${isEcom ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {kpiCards.map((kpi) => <KPICard key={kpi.label} data={kpi} />)}
      </div>

      {/* Campaign Overview + Creative Overview */}
      <div className="grid grid-cols-2 gap-5">
        <CampaignOverviewCard isEcom={isEcom} />
        <CreativeOverviewCard isEcom={isEcom} />
      </div>

      {/* Website Performance + Funnel Analysis */}
      <div className="grid grid-cols-2 gap-5">
        <WebsitePerformanceCard />
        <FunnelAnalysisCard isEcom={isEcom} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ─── KPI CARD ───
// ══════════════════════════════════════════════════════════

interface KPICardData {
  label: string; value: string; target: string; percent: number;
  icon: typeof DollarSign; iconBg: string; iconColor: string;
}

function KPICard({ data }: { data: KPICardData }) {
  const Icon = data.icon;
  const targetMet = data.percent >= 100;
  const remaining = Math.max(100 - data.percent, 0);
  const barColor = targetMet ? 'bg-[#00C875]' : data.percent >= 85 ? 'bg-[#00C875]' : data.percent >= 70 ? 'bg-[#FDAB3D]' : 'bg-[#E2445C]';

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col" aria-label={`${data.label} KPI`}>
      <div className={`w-10 h-10 rounded-xl ${data.iconBg} flex items-center justify-center mb-4`}>
        <Icon className={`w-5 h-5 ${data.iconColor}`} aria-hidden="true" />
      </div>
      <p className="text-caption text-black/50 mb-1.5">{data.label}</p>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-h2 font-bold text-black/85 tabular-nums">{data.value}</span>
        <span className="text-caption text-black/50 tabular-nums">/ {data.target}</span>
      </div>
      {/* Progress bar */}
      <div
        className="h-2 bg-black/[0.04] rounded-full overflow-hidden mb-2.5"
        role="progressbar" aria-valuenow={Math.min(data.percent, 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${data.label} progress`}
      >
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(data.percent, 100)}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-caption font-semibold ${targetMet ? 'text-[#00C875]' : data.percent >= 85 ? 'text-[#00C875]' : data.percent >= 70 ? 'text-[#FDAB3D]' : 'text-[#E2445C]'}`}>{data.percent}%</span>
        {targetMet ? (
          <span className="flex items-center gap-1 text-caption font-medium text-[#00C875]">
            <TrendingUp className="w-3 h-3" aria-hidden="true" /> Target met
          </span>
        ) : (
          <span className="text-caption text-black/50">{remaining}% to go</span>
        )}
      </div>
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── CAMPAIGN OVERVIEW CARD ───
// ══════════════════════════════════════════════════════════

const ECOM_CAMPAIGNS = [
  { name: 'Meta - Product Catalog Sales', spend: 240000, revenue: 680000, roas: 2.83, leads: 0, cpl: 0 },
  { name: 'Google - Shopping (High Intent)', spend: 310000, revenue: 720000, roas: 2.32, leads: 0, cpl: 0 },
  { name: 'Meta - Dynamic Retargeting', spend: 180000, revenue: 410000, roas: 2.28, leads: 0, cpl: 0 },
];

const LEADGEN_CAMPAIGNS = [
  { name: 'LinkedIn - B2B Decision Makers', spend: 180000, revenue: 0, roas: 0, leads: 42, cpl: 4286 },
  { name: 'Meta - Lead Gen Forms', spend: 120000, revenue: 0, roas: 0, leads: 156, cpl: 769 },
  { name: 'Google - Search Intent Keywords', spend: 210000, revenue: 0, roas: 0, leads: 89, cpl: 2360 },
];

function CampaignOverviewCard({ isEcom }: { isEcom: boolean }) {
  const [showInsights, setShowInsights] = useState(false);
  const campaigns = isEcom ? ECOM_CAMPAIGNS : LEADGEN_CAMPAIGNS;

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col" aria-label="Campaign Overview">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.06] flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Campaign Overview</h3>
        </div>
        <button className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30" aria-label="More information about Campaign Overview">
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#FDAB3D]/[0.06] rounded-xl px-4 py-4 text-center">
          <p className="text-caption text-black/50 mb-1">Active Campaigns</p>
          <p className="text-h2 font-bold text-black/85">{isEcom ? '24' : '18'}</p>
          <p className="text-caption font-medium text-[#00C875] mt-1">{isEcom ? '+3 this week' : '+2 this week'}</p>
        </div>
        <div className="bg-[#E2445C]/[0.05] rounded-xl px-4 py-4 text-center">
          <p className="text-caption text-black/50 mb-1">Needs Review</p>
          <p className="text-h2 font-bold text-black/85">{isEcom ? '5' : '3'}</p>
          <p className="text-caption font-medium text-[#E2445C] mt-1">{isEcom ? 'Low ROAS' : 'High CPL'}</p>
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-caption font-medium text-black/70">Top Performing Campaigns</p>
        <span className="text-caption text-black/50 px-2.5 py-1 rounded-lg border border-black/[0.06]">Last 7 Days</span>
      </div>
      <div className="space-y-0">
        {campaigns.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0">
            <div>
              <p className="text-caption font-medium text-black/75">{c.name}</p>
              <p className="text-caption text-black/50 mt-0.5">
                Spend: {formatCurrency(c.spend)}{isEcom ? ` · Revenue: ${formatCurrency(c.revenue)}` : ` · Leads: ${c.leads}`}
              </p>
            </div>
            {isEcom ? (
              <span className="text-body font-bold text-[#204CC7] tabular-nums">{c.roas}x</span>
            ) : (
              <span className="text-body font-bold text-[#00C875] tabular-nums">₹{c.cpl.toLocaleString('en-IN')}</span>
            )}
          </div>
        ))}
      </div>

      {/* Insights */}
      <button onClick={() => setShowInsights(!showInsights)} aria-expanded={showInsights} aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /><span className="font-medium">Insights</span><div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {isEcom ? (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Meta Product Catalog leads in ROAS at 2.83x — consider increasing budget allocation.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">5 campaigns underperforming — review targeting and creatives.</p>
            </>
          ) : (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Meta Lead Gen Forms delivers lowest CPL at ₹769 — scale budget on this channel.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">LinkedIn CPL at ₹4,286 is high — refine audience targeting to improve cost efficiency.</p>
            </>
          )}
        </div>
      )}
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── CREATIVE OVERVIEW CARD ───
// ══════════════════════════════════════════════════════════

const ECOM_CREATIVES = [
  { name: 'Video - Product Demo (15s)', campaign: 'Summer Sale 2...', impressions: '2.4M', metric: 892, metricLabel: 'conversions', ctr: 4.8, campaignColor: 'bg-[#E2445C]/[0.08] text-[#E2445C]' },
  { name: 'Carousel - Collection Showcase', campaign: 'Product Launch...', impressions: '1.8M', metric: 654, metricLabel: 'conversions', ctr: 3.9, campaignColor: 'bg-[#7C3AED]/[0.08] text-[#7C3AED]' },
  { name: 'Static - Offer Banner', campaign: 'Brand Awarene...', impressions: '3.2M', metric: 523, metricLabel: 'conversions', ctr: 2.1, campaignColor: 'bg-[#204CC7]/[0.08] text-[#204CC7]' },
];

const LEADGEN_CREATIVES = [
  { name: 'Lead Form - Case Study Download', campaign: 'Lead Magnet Q1', impressions: '1.8M', metric: 124, metricLabel: 'leads', ctr: 3.2, campaignColor: 'bg-[#00C875]/[0.08] text-[#00C875]' },
  { name: 'Video - Founder Testimonial (30s)', campaign: 'Brand Trust Ca...', impressions: '1.2M', metric: 98, metricLabel: 'leads', ctr: 4.1, campaignColor: 'bg-[#7C3AED]/[0.08] text-[#7C3AED]' },
  { name: 'Carousel - Service Showcase', campaign: 'Service Awaren...', impressions: '2.1M', metric: 86, metricLabel: 'leads', ctr: 2.4, campaignColor: 'bg-[#204CC7]/[0.08] text-[#204CC7]' },
];

function CreativeOverviewCard({ isEcom }: { isEcom: boolean }) {
  const [showInsights, setShowInsights] = useState(false);
  const creatives = isEcom ? ECOM_CREATIVES : LEADGEN_CREATIVES;

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col" aria-label="Creative Overview">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E2445C]/[0.06] flex items-center justify-center">
            <Palette className="w-4 h-4 text-[#E2445C]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Creative Overview</h3>
        </div>
        <button className="flex items-center gap-1 text-caption font-medium text-[#204CC7] hover:text-[#1a3fa8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg" aria-label="View creative details">
          View Details <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#204CC7]/[0.04] rounded-xl px-4 py-4 text-center">
          <p className="text-caption text-black/50 mb-1">Active Ads</p>
          <p className="text-h2 font-bold text-black/85">{isEcom ? '156' : '124'}</p>
          <p className="text-caption font-medium text-[#204CC7] mt-1">{isEcom ? '+12 new' : '+8 new'}</p>
        </div>
        <div className="bg-[#00C875]/[0.05] rounded-xl px-4 py-4 text-center">
          <p className="text-caption text-black/50 mb-1">Avg. CTR</p>
          <p className="text-h2 font-bold text-black/85">{isEcom ? '3.2%' : '2.8%'}</p>
          <p className="text-caption font-medium text-[#00C875] mt-1">{isEcom ? '+0.4%' : '+0.6%'}</p>
        </div>
      </div>

      {/* Best Performers */}
      <p className="text-caption font-medium text-black/70 mb-3">Best Performers</p>
      <div className="space-y-0">
        {creatives.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-caption font-medium text-black/75">{c.name}</p>
                <span className={`px-2 py-0.5 rounded-md text-caption font-medium ${c.campaignColor}`}>{c.campaign}</span>
              </div>
              <p className="text-caption text-black/50 mt-0.5">{c.impressions} impressions · {c.metric} {c.metricLabel}</p>
            </div>
            <span className="text-body font-bold text-[#204CC7] tabular-nums">{c.ctr}%</span>
          </div>
        ))}
      </div>

      {/* Insights */}
      <button onClick={() => setShowInsights(!showInsights)} aria-expanded={showInsights} aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /><span className="font-medium">Insights</span><div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {isEcom ? (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Video creatives outperform static by 2.3x in CTR — prioritize video production.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Carousel formats drive highest conversions per impression.</p>
            </>
          ) : (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Video testimonials drive highest CTR at 4.1% — invest in founder-led content.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Lead form creatives generate most leads — optimize form fields for higher completion.</p>
            </>
          )}
        </div>
      )}
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── WEBSITE PERFORMANCE CARD ───
// ══════════════════════════════════════════════════════════

const WEB_METRICS = [
  { label: 'Bounce Rate', value: '42.5%', change: '-3.1%', positive: true },
  { label: 'Avg. Session', value: '4m 32s', change: '+12%', positive: true },
  { label: 'Page Load Speed (Mobile)', value: '3.1s', change: '-0.4s', positive: true },
  { label: 'Conversion Rate', value: '2.8%', change: '+0.3%', positive: true },
];

function WebsitePerformanceCard() {
  const [showInsights, setShowInsights] = useState(false);

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col" aria-label="Website Performance">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/[0.06] flex items-center justify-center">
            <Globe className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Website Performance</h3>
        </div>
        <button className="p-1 rounded-lg hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30" aria-label="More information about Website Performance">
          <HelpCircle className="w-4 h-4 text-black/45" aria-hidden="true" />
        </button>
      </div>

      {/* GA4 + PageSpeed cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#204CC7]/[0.04] rounded-xl px-4 py-4 text-center">
          <span className="px-2 py-0.5 rounded-md bg-[#204CC7]/[0.08] text-[#204CC7] text-caption font-semibold">GA4</span>
          <p className="text-caption text-black/50 mt-2 mb-0.5">Sessions</p>
          <p className="text-h2 font-bold text-black/85">68.5K</p>
          <p className="text-caption font-medium text-[#00C875] mt-1">+8.2% vs last month</p>
        </div>
        <div className="bg-black/[0.02] rounded-xl px-4 py-4 text-center">
          <span className="px-2 py-0.5 rounded-md bg-[#00C875]/[0.08] text-[#00C875] text-caption font-semibold">PSI</span>
          <p className="text-caption text-black/50 mt-2 mb-1">PageSpeed</p>
          <div className="flex items-center justify-center gap-4">
            {/* Mobile score ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f0f0f0" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#FDAB3D" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${72 * 1.257} ${125.7 - 72 * 1.257}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-[#FDAB3D]">72</span>
            </div>
            {/* Desktop score ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f0f0f0" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#00C875" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${91 * 1.257} ${125.7 - 91 * 1.257}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-caption font-bold text-[#00C875]">91</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1">
            <span className="text-caption text-black/50">Mobile</span>
            <span className="text-caption text-black/50">Desktop</span>
          </div>
        </div>
      </div>

      {/* Metrics list */}
      <div className="space-y-0">
        {WEB_METRICS.map((metric, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-black/[0.04] last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${metric.positive ? (metric.label.includes('Load') ? 'bg-[#FDAB3D]' : 'bg-[#00C875]') : 'bg-[#E2445C]'}`} aria-hidden="true" />
              <span className="text-caption text-black/65">{metric.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-body font-semibold tabular-nums ${metric.label.includes('Load') ? 'text-[#FDAB3D]' : 'text-black/80'}`}>{metric.value}</span>
              <span className={`text-caption font-medium flex items-center gap-0.5 ${metric.positive ? 'text-[#00C875]' : 'text-[#E2445C]'}`}>
                <TrendingUp className="w-3 h-3" aria-hidden="true" /> {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <button onClick={() => setShowInsights(!showInsights)} aria-expanded={showInsights} aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#7C3AED] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /><span className="font-medium">Insights</span><div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          <p className="text-caption text-black/55 leading-relaxed pl-5">Mobile PageSpeed at 72 — optimize images and reduce JavaScript bundles.</p>
          <p className="text-caption text-black/55 leading-relaxed pl-5">Bounce rate improved 3.1% — landing page optimizations are working.</p>
        </div>
      )}
    </article>
  );
}

// ══════════════════════════════════════════════════════════
// ─── FUNNEL ANALYSIS CARD ───
// ══════════════════════════════════════════════════════════

const ECOM_FUNNEL = [
  { label: 'Impressions', value: '2.4M', width: 100, color: 'bg-[#204CC7]' },
  { label: 'Page Visits', value: '72.8K', width: 30, color: 'bg-[#204CC7]/60' },
  { label: 'Product Views', value: '45.2K', width: 19, color: 'bg-[#7C3AED]/70' },
  { label: 'Add to Cart', value: '12.8K', width: 10, color: 'bg-[#7C3AED]/50' },
  { label: 'Checkout', value: '6.4K', width: 5, color: 'bg-[#E2445C]/50' },
  { label: 'Orders', value: '2.1K', width: 3, color: 'bg-[#00C875]' },
];

const LEADGEN_FUNNEL = [
  { label: 'Impressions', value: '1.6M', width: 100, color: 'bg-[#204CC7]' },
  { label: 'Clicks', value: '48.2K', width: 30, color: 'bg-[#204CC7]/60' },
  { label: 'Landing Page', value: '31.5K', width: 20, color: 'bg-[#7C3AED]/70' },
  { label: 'Form Starts', value: '8.4K', width: 10, color: 'bg-[#7C3AED]/50' },
  { label: 'Submissions', value: '2.8K', width: 5, color: 'bg-[#FDAB3D]' },
  { label: 'Qualified', value: '842', width: 3, color: 'bg-[#00C875]' },
];

function FunnelAnalysisCard({ isEcom }: { isEcom: boolean }) {
  const [showInsights, setShowInsights] = useState(false);
  const funnelSteps = isEcom ? ECOM_FUNNEL : LEADGEN_FUNNEL;

  return (
    <article className="bg-white rounded-2xl border border-black/[0.06] p-6 flex flex-col" aria-label="Funnel Analysis">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FDAB3D]/[0.06] flex items-center justify-center">
            <Filter className="w-4 h-4 text-[#FDAB3D]" aria-hidden="true" />
          </div>
          <h3 className="text-body font-semibold text-black/85">Funnel Analysis</h3>
        </div>
        <button className="flex items-center gap-1 text-caption font-medium text-[#204CC7] hover:text-[#1a3fa8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg" aria-label="View funnel details">
          View Details <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Funnel bars */}
      <div className="space-y-3 mb-5">
        {funnelSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-[90px] shrink-0 text-caption text-black/55 text-right">{step.label}</span>
            <div className="flex-1 relative h-6 bg-black/[0.02] rounded-lg" role="progressbar" aria-valuenow={step.width} aria-valuemin={0} aria-valuemax={100} aria-label={step.label}>
              <div className={`absolute top-0 left-0 h-full ${step.color} rounded-lg`} style={{ width: `${step.width}%` }} />
            </div>
            <span className="w-[50px] text-caption font-semibold text-black/70 tabular-nums text-right">{step.value}</span>
          </div>
        ))}
      </div>

      {/* Critical Drop-off Points */}
      <div className="bg-[#FDAB3D]/[0.06] rounded-xl px-4 py-4">
        <p className="text-caption font-semibold text-black/75 mb-1.5">Critical Drop-off Points</p>
        {isEcom ? (
          <>
            <p className="text-caption text-[#E2445C]/80 leading-relaxed">· 71.7% drop from product view → add-to-cart</p>
            <p className="text-caption text-[#E2445C]/80 leading-relaxed">· 50% cart abandonment rate at checkout</p>
          </>
        ) : (
          <>
            <p className="text-caption text-[#E2445C]/80 leading-relaxed">· 73.3% drop from landing page → form start</p>
            <p className="text-caption text-[#E2445C]/80 leading-relaxed">· 66.7% form abandonment rate before submission</p>
          </>
        )}
      </div>

      {/* Insights */}
      <button onClick={() => setShowInsights(!showInsights)} aria-expanded={showInsights} aria-label="Toggle insights"
        className="flex items-center gap-2 pt-4 mt-auto border-t border-black/[0.04] text-caption text-black/50 hover:text-[#204CC7] transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:rounded-lg"
      >
        <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /><span className="font-medium">Insights</span><div className="flex-1" />
        {showInsights ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
      </button>
      {showInsights && (
        <div className="mt-3 space-y-2">
          {isEcom ? (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Product view to add-to-cart has the biggest drop — improve product page CTA and trust signals.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Cart abandonment at 50% — consider exit-intent popups and abandoned cart emails.</p>
            </>
          ) : (
            <>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Landing page to form start has the biggest drop — simplify form and add social proof above the fold.</p>
              <p className="text-caption text-black/55 leading-relaxed pl-5">Form abandonment at 66.7% — reduce form fields and add progress indicators.</p>
            </>
          )}
        </div>
      )}
    </article>
  );
}
