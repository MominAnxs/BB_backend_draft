'use client';
import { ChevronRight, BarChart3, FileText, TrendingUp, TrendingDown, CheckCircle2, Filter, Calendar, Download, ChevronDown, Sparkles, AlertTriangle, Clock, DollarSign, Shield } from 'lucide-react';
import { useState } from 'react';

interface PerformanceMarketingReport {
  reportType: 'leadGeneration' | 'ecommerce';
  lastUpdated: string;
  period: string;
  metrics: {
    adSpend: { value: number; change: number; target: number };
    totalLeads: { value: number; change: number; target: number };
    cpl: { value: number; change: number; target: number };
    costPerQualifiedLead: { value: number; change: number };
    qualifiedLeads: { value: number; change: number; target: number };
    revenue: { value: number; change: number; target: number };
  };
  targetAchievement: {
    spends: { achieved: number; target: number; variance: number };
    revenue: { achieved: number; target: number; variance: number };
    cpl: { achieved: number; target: number; variance: number };
    leads: { achieved: number; target: number; variance: number };
  };
  status: 'excellent' | 'good' | 'needs-attention';
}

interface AccountsTaxationReport {
  lastUpdated: string;
  period: string;
  metrics: {
    revenue: { value: number; change: number };
    expenses: { value: number; change: number };
    bankBalance: { value: number; change: number };
    debtors: { value: number; change: number };
    creditors: { value: number; change: number };
  };
  whatChanged: Array<{
    category: string;
    description: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
  }>;
  risks: Array<{
    severity: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  actions: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  status: 'excellent' | 'good' | 'needs-attention';
}

interface ClientReport {
  id: string;
  name: string;
  code: string;
  services: {
    performanceMarketing?: PerformanceMarketingReport;
    accountsTaxation?: AccountsTaxationReport;
  };
}

type ServiceType = 'performanceMarketing' | 'accountsTaxation';

interface ReportDetailProps {
  client: ClientReport;
  service: ServiceType;
  onBack: () => void;
}

export function ReportDetail({ client, service, onBack }: ReportDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'channels' | 'campaigns' | 'creatives' | 'funnel' | 'experiments' | 'sales' | 'receivables' | 'expenses' | 'payables' | 'cashflow' | 'pl' | 'balancesheet' | 'ratios'>('overview');

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-IN');
  };

  const getAchievementPercentage = (achieved: number, target: number) => {
    return Math.round((achieved / target) * 100);
  };

  const getAchievementColor = (percentage: number) => {
    if (percentage >= 95) return 'text-[#00C875]';
    if (percentage >= 80) return 'text-[#204CC7]';
    if (percentage >= 60) return 'text-[#FDAB3D]';
    return 'text-[#E2445C]';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-black/60 rotate-180" />
          </button>
          <div>
            <h2 className="text-black/90 text-body font-semibold">{client.name}</h2>
            <p className="text-caption font-light text-black/55">{client.code}</p>
          </div>

          <div className="w-px h-8 bg-black/8 mx-1" />

          {service === 'performanceMarketing' && client.services.performanceMarketing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EEF1FB] rounded-lg">
              <BarChart3 className="w-3.5 h-3.5 text-[#204CC7]" />
              <span className="text-caption font-semibold text-[#204CC7]">Performance Marketing</span>
              <span className="text-caption font-semibold px-1.5 py-0.5 bg-[#204CC7]/15 text-[#204CC7] rounded-md">
                {client.services.performanceMarketing.reportType === 'leadGeneration' ? 'Lead Gen' : 'Ecommerce'}
              </span>
            </div>
          )}
          {service === 'accountsTaxation' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E8F8F5] rounded-lg">
              <FileText className="w-3.5 h-3.5 text-[#00C875]" />
              <span className="text-caption font-semibold text-[#00C875]">Accounts & Taxation</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium">
            <Calendar className="w-3.5 h-3.5" />
            Last 30 Days
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="w-px h-8 bg-black/8" />
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Client Header */}
      <div className="bg-white rounded-xl border border-black/[0.06] mb-6">

        {/* Tab Navigation */}
        {service === 'performanceMarketing' && (
          <div className="px-5 pb-4 border-t border-black/[0.06] pt-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'overview' as const, label: 'Overview' },
                { id: 'leads' as const, label: 'Leads' },
                { id: 'channels' as const, label: 'Channels' },
                { id: 'campaigns' as const, label: 'Campaigns' },
                { id: 'creatives' as const, label: 'Creatives' },
                { id: 'funnel' as const, label: 'Funnel' },
                { id: 'experiments' as const, label: 'Experiments' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-caption font-medium rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold'
                      : 'text-black/50 hover:text-black/80 hover:bg-black/[0.03]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {service === 'accountsTaxation' && (
          <div className="px-5 pb-4 border-t border-black/[0.06] pt-4">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'overview' as const, label: 'Overview' },
                { id: 'sales' as const, label: 'Sales' },
                { id: 'receivables' as const, label: 'Receivables' },
                { id: 'expenses' as const, label: 'Expenses' },
                { id: 'payables' as const, label: 'Payables' },
                { id: 'cashflow' as const, label: 'Cashflow' },
                { id: 'pl' as const, label: 'P&L' },
                { id: 'balancesheet' as const, label: 'Balance Sheet' },
                { id: 'ratios' as const, label: 'Ratios' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-caption font-medium rounded-xl transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold'
                      : 'text-black/50 hover:text-black/80 hover:bg-black/[0.03]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-auto">
        {service === 'performanceMarketing' && client.services.performanceMarketing && (
          <PerformanceMarketingDetail
            report={client.services.performanceMarketing}
            formatCurrency={formatCurrency}
            formatNumber={formatNumber}
            getAchievementPercentage={getAchievementPercentage}
            getAchievementColor={getAchievementColor}
          />
        )}

        {service === 'accountsTaxation' && client.services.accountsTaxation && (
          <AccountsTaxationDetail
            report={client.services.accountsTaxation}
            formatNumber={formatNumber}
          />
        )}
      </div>
    </div>
  );
}

function PerformanceMarketingDetail({
  report,
  formatCurrency,
  formatNumber,
  getAchievementPercentage,
  getAchievementColor,
}: {
  report: PerformanceMarketingReport;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number) => string;
  getAchievementPercentage: (achieved: number, target: number) => number;
  getAchievementColor: (percentage: number) => string;
}) {
  return (
    <div className="space-y-8">
      {/* Overview Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-black/90">Overview</h3>
          <p className="text-caption text-black/55">Last updated {report.lastUpdated}</p>
        </div>
        <div className="grid grid-cols-5 gap-5">
          <MetricCard
            title="Ad Spend"
            value={formatCurrency(report.metrics.adSpend.value)}
            change={report.metrics.adSpend.change}
          />
          <MetricCard
            title="Total Leads"
            value={formatNumber(report.metrics.totalLeads.value)}
            change={report.metrics.totalLeads.change}
          />
          <MetricCard
            title="CPL"
            value={`₹${formatNumber(report.metrics.cpl.value)}`}
            change={report.metrics.cpl.change}
            inverseTrend
          />
          <MetricCard
            title="Cost Per Qualified Lead"
            value={`₹${formatNumber(report.metrics.costPerQualifiedLead.value)}`}
            change={report.metrics.costPerQualifiedLead.change}
            inverseTrend
          />
          <MetricCard
            title="Qualified Leads"
            value={formatNumber(report.metrics.qualifiedLeads.value)}
            change={report.metrics.qualifiedLeads.change}
          />
        </div>
      </div>

      {/* Target vs Achieved */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-black/90">Target vs Achieved</h3>
          <p className="text-caption text-black/55">Current Month Performance</p>
        </div>
        <div className="grid grid-cols-4 gap-5">
          <TargetCard
            title="Spends"
            achieved={report.targetAchievement.spends.achieved}
            target={report.targetAchievement.spends.target}
            variance={report.targetAchievement.spends.variance}
            formatValue={formatCurrency}
            getAchievementPercentage={getAchievementPercentage}
            getAchievementColor={getAchievementColor}
          />
          <TargetCard
            title="Revenue"
            achieved={report.targetAchievement.revenue.achieved}
            target={report.targetAchievement.revenue.target}
            variance={report.targetAchievement.revenue.variance}
            formatValue={formatCurrency}
            getAchievementPercentage={getAchievementPercentage}
            getAchievementColor={getAchievementColor}
          />
          <CPLTargetCard
            achieved={report.targetAchievement.cpl.achieved}
            target={report.targetAchievement.cpl.target}
            variance={report.targetAchievement.cpl.variance}
            formatNumber={formatNumber}
          />
          <TargetCard
            title="Leads"
            achieved={report.targetAchievement.leads.achieved}
            target={report.targetAchievement.leads.target}
            variance={report.targetAchievement.leads.variance}
            formatValue={formatNumber}
            getAchievementPercentage={getAchievementPercentage}
            getAchievementColor={getAchievementColor}
          />
        </div>
      </div>
    </div>
  );
}

function AccountsTaxationDetail({
  report,
  formatNumber,
}: {
  report: AccountsTaxationReport;
  formatNumber: (value: number) => string;
}) {
  return (
    <div className="space-y-8">
      {/* Overview Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-black/90">Overview</h3>
          <p className="text-caption text-black/55">Last updated {report.lastUpdated}</p>
        </div>
        <div className="grid grid-cols-5 gap-5">
          <MetricCard
            title="Revenue"
            value={`₹${formatNumber(report.metrics.revenue.value)}`}
            change={report.metrics.revenue.change}
          />
          <MetricCard
            title="Expenses"
            value={`₹${formatNumber(report.metrics.expenses.value)}`}
            change={report.metrics.expenses.change}
            inverseTrend
          />
          <MetricCard
            title="Bank Balance"
            value={`₹${formatNumber(report.metrics.bankBalance.value)}`}
            change={report.metrics.bankBalance.change}
          />
          <MetricCard
            title="Debtors"
            value={`₹${formatNumber(report.metrics.debtors.value)}`}
            change={report.metrics.debtors.change}
            inverseTrend
          />
          <MetricCard
            title="Creditors"
            value={`₹${formatNumber(report.metrics.creditors.value)}`}
            change={report.metrics.creditors.change}
            inverseTrend
          />
        </div>
      </div>

      {/* What Changed */}
      <div className="bg-white rounded-xl border border-black/[0.06] p-6">
        <div className="mb-6">
          <h3 className="text-h3 text-black/90 mb-1">What Changed This Period</h3>
          <p className="text-caption text-black/55">Key movements that impact your financial position</p>
        </div>
        <div className="space-y-4">
          {report.whatChanged.map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-5 rounded-xl border border-black/[0.06] hover:bg-black/[0.02] transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.trend === 'up' ? 'bg-[#E8F8F5]' : item.trend === 'down' ? 'bg-[#FFE7E7]' : 'bg-[#EEF1FB]'
              }`}>
                {item.trend === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-[#00C875]" />
                ) : item.trend === 'down' ? (
                  <TrendingDown className="w-5 h-5 text-[#E2445C]" />
                ) : (
                  <DollarSign className="w-5 h-5 text-[#204CC7]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-black/90 mb-1">{item.description}</p>
                <p className="text-caption text-black/60">{item.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 text-caption font-medium rounded-lg ${
                  item.trend === 'up' ? 'bg-[#E8F8F5] text-[#00C875]' : 
                  item.trend === 'down' ? 'bg-[#FFE7E7] text-[#E2445C]' : 
                  'bg-[#EEF1FB] text-[#204CC7]'
                }`}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks & Alerts */}
      <div className="bg-white rounded-xl border border-black/[0.06] p-6">
        <div className="mb-6">
          <h3 className="text-h3 text-black/90 mb-1">Risks & Alerts</h3>
          <p className="text-caption text-black/55">Items that need your attention to prevent issues</p>
        </div>
        <div className="space-y-4">
          {report.risks.map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-5 rounded-xl border border-black/[0.06] hover:bg-black/[0.02] transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.severity === 'high' ? 'bg-[#FFE7E7]' : item.severity === 'medium' ? 'bg-[#FFF4E6]' : 'bg-[#FFF8E1]'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  item.severity === 'high' ? 'text-[#E2445C]' : item.severity === 'medium' ? 'text-[#FDAB3D]' : 'text-[#FDAB3D]'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-black/90 mb-1">{item.title}</p>
                <p className="text-caption text-black/60">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 text-caption font-medium rounded-lg ${
                  item.severity === 'high' ? 'bg-[#FFE7E7] text-[#E2445C]' : 
                  item.severity === 'medium' ? 'bg-[#FFF4E6] text-[#FDAB3D]' : 
                  'bg-[#FFF8E1] text-[#FDAB3D]'
                }`}>
                  {item.severity === 'high' ? 'Critical' : item.severity === 'medium' ? 'High' : 'Medium'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions & Recommendations */}
      <div className="bg-white rounded-xl border border-black/[0.06] p-6">
        <div className="mb-6">
          <h3 className="text-h3 text-black/90 mb-1">Actions & Recommendations</h3>
          <p className="text-caption text-black/55">Suggested actions to improve your financial position</p>
        </div>
        <div className="space-y-4">
          {report.actions.map((item, index) => (
            <div key={index} className="flex items-start gap-4 p-5 rounded-xl border border-black/[0.06] hover:bg-black/[0.02] transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.priority === 'high' ? 'bg-[#EEF1FB]' : item.priority === 'medium' ? 'bg-purple-50' : 'bg-gray-50'
              }`}>
                <CheckCircle2 className={`w-5 h-5 ${
                  item.priority === 'high' ? 'text-[#204CC7]' : item.priority === 'medium' ? 'text-purple-600' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-black/90 mb-1">{item.title}</p>
                <p className="text-caption text-black/60 mb-2">{item.description}</p>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-caption text-black/55">
                    <Clock className="w-3 h-3" />
                    This week
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-1 text-caption font-medium rounded-lg ${
                  item.priority === 'high' ? 'bg-[#EEF1FB] text-[#204CC7]' : 
                  item.priority === 'medium' ? 'bg-purple-50 text-purple-700' : 
                  'bg-gray-50 text-gray-700'
                }`}>
                  {item.priority === 'high' ? 'High Impact' : item.priority === 'medium' ? 'Medium Impact' : 'Low Impact'}
                </span>
                <button className="px-3 py-1.5 bg-[#204CC7] text-white text-caption font-medium rounded-lg hover:bg-[#204CC7]/90 transition-colors">
                  Create Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  inverseTrend = false,
}: {
  title: string;
  value: string;
  change: number;
  inverseTrend?: boolean;
}) {
  const isPositive = inverseTrend ? change < 0 : change >= 0;

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-6">
      <span className="text-caption text-black/60 block mb-2">{title}</span>
      <p className="text-h1 text-black/90 mb-1">{value}</p>
      <div className="flex items-center gap-1">
        {change >= 0 ? (
          <TrendingUp className={`w-3 h-3 ${isPositive ? 'text-[#00C875]' : 'text-[#E2445C]'}`} />
        ) : (
          <TrendingDown className={`w-3 h-3 ${isPositive ? 'text-[#00C875]' : 'text-[#E2445C]'}`} />
        )}
        <span className={`text-caption font-medium ${isPositive ? 'text-[#00C875]' : 'text-[#E2445C]'}`}>
          {Math.abs(change)}%
        </span>
        <span className="text-caption text-black/55">vs last period</span>
      </div>
    </div>
  );
}

function TargetCard({
  title,
  achieved,
  target,
  variance,
  formatValue,
  getAchievementPercentage,
  getAchievementColor,
}: {
  title: string;
  achieved: number;
  target: number;
  variance: number;
  formatValue: (value: number) => string;
  getAchievementPercentage: (achieved: number, target: number) => number;
  getAchievementColor: (percentage: number) => string;
}) {
  const percentage = getAchievementPercentage(achieved, target);
  const status =
    percentage >= 95 ? 'Exceeded' : percentage >= 80 ? 'On Track' : 'Below Target';
  const statusColor =
    percentage >= 95
      ? 'bg-[#E8F8F5] text-[#00C875]'
      : percentage >= 80
      ? 'bg-[#EEF1FB] text-[#204CC7]'
      : 'bg-[#FFF4E6] text-[#FDAB3D]';
  const strokeColor =
    percentage >= 95 ? '#00C875' : percentage >= 80 ? '#204CC7' : '#FDAB3D';

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-body font-medium text-black/70">{title}</span>
        <span className={`px-2 py-1 text-caption font-medium rounded ${statusColor}`}>{status}</span>
      </div>

      {/* Circular Progress */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="56" fill="none" stroke="#f0f0f0" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 352} 352`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-h1 ${getAchievementColor(percentage)}`}>
            {percentage}%
          </span>
        </div>
      </div>

      <div className="space-y-2 text-caption">
        <div className="flex items-center justify-between">
          <span className="text-black/60">Achieved</span>
          <span className="font-medium text-black/90">{formatValue(achieved)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-black/60">Target</span>
          <span className="font-medium text-black/90">{formatValue(target)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
          <span className="text-black/60">Variance</span>
          <span
            className={`font-semibold ${variance >= 0 ? 'text-[#00C875]' : 'text-[#E2445C]'}`}
          >
            {variance >= 0 ? '+' : ''}
            {formatValue(Math.abs(variance))}
          </span>
        </div>
      </div>
    </div>
  );
}

function CPLTargetCard({
  achieved,
  target,
  variance,
  formatNumber,
}: {
  achieved: number;
  target: number;
  variance: number;
  formatNumber: (value: number) => string;
}) {
  const isExceeded = achieved <= target;

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-body font-medium text-black/70">CPL</span>
        <span
          className={`px-2 py-1 text-caption font-medium rounded ${
            isExceeded ? 'bg-[#E8F8F5] text-[#00C875]' : 'bg-[#FFF4E6] text-[#FDAB3D]'
          }`}
        >
          {isExceeded ? 'Exceeded' : 'Below Target'}
        </span>
      </div>

      {/* Circular Progress - Note: For CPL, lower is better */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90">
          <circle cx="64" cy="64" r="56" fill="none" stroke="#f0f0f0" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke={isExceeded ? '#10b981' : '#f97316'}
            strokeWidth="8"
            strokeDasharray="352 352"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2
            className={`w-10 h-10 ${isExceeded ? 'text-[#00C875]' : 'text-[#FDAB3D]'}`}
          />
        </div>
      </div>

      <div className="space-y-2 text-caption">
        <div className="flex items-center justify-between">
          <span className="text-black/60">Achieved</span>
          <span className="font-medium text-black/90">₹{formatNumber(achieved)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-black/60">Target</span>
          <span className="font-medium text-black/90">₹{formatNumber(target)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
          <span className="text-black/60">Variance</span>
          <span className={`font-semibold ${variance >= 0 ? 'text-[#00C875]' : 'text-[#E2445C]'}`}>
            {variance >= 0 ? '+' : ''}₹{formatNumber(Math.abs(variance))}
          </span>
        </div>
      </div>
    </div>
  );
}