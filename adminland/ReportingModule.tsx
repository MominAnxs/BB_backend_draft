'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronRight, BarChart3, X, ChevronDown, ChevronUp, Target, FileText, ChevronLeft, ChevronsLeft, ChevronsRight, Layers, Settings, Check, ArrowRightLeft, Clock, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReportDetail } from './ReportDetail';
import { ClientDashboard } from './ClientDashboard';
import { PMClientDashboard } from './PMClientDashboard';

// ── Role mock — toggle to simulate different roles ──
// Roles: admin (full platform access), hod (department head), manager (team lead),
// executive (day-to-day ops)
type UserRole = 'admin' | 'hod' | 'manager' | 'executive';
const CURRENT_USER_ROLE: UserRole = 'manager';

// Target editing: Admin, HOD, Manager only — Executives are locked out
const TARGET_EDIT_ROLES: UserRole[] = ['admin', 'hod', 'manager'];
const CAN_EDIT_TARGETS = TARGET_EDIT_ROLES.includes(CURRENT_USER_ROLE);

// ── Business Type Taxonomy ──

type PMBusinessType = 'ecommerce' | 'leadGeneration';
type ATBusinessType = 'tradingManufacturing' | 'ecommerceRestaurants';
type BusinessType = PMBusinessType | ATBusinessType;
type ServiceType = 'performanceMarketing' | 'accountsTaxation';

const PM_BUSINESS_TYPES: { value: PMBusinessType; label: string; short: string }[] = [
  { value: 'ecommerce', label: 'E-Commerce', short: 'E-Com' },
  { value: 'leadGeneration', label: 'Lead Generation', short: 'Lead Gen' },
];

const AT_BUSINESS_TYPES: { value: ATBusinessType; label: string; short: string }[] = [
  { value: 'tradingManufacturing', label: 'Trading, Manufacturing or Service', short: 'Trading' },
  { value: 'ecommerceRestaurants', label: 'E-Commerce or Restaurants', short: 'E-Com / Rest.' },
];

function getBusinessTypeLabel(bt: BusinessType): string {
  return [...PM_BUSINESS_TYPES, ...AT_BUSINESS_TYPES].find((b) => b.value === bt)?.label ?? bt;
}
function getBusinessTypeShort(bt: BusinessType): string {
  return [...PM_BUSINESS_TYPES, ...AT_BUSINESS_TYPES].find((b) => b.value === bt)?.short ?? bt;
}

// ── Interfaces ──

interface ECommerceMetrics {
  adSpend: { value: number; change: number; target: number };
  roas: { value: number; change: number; target: number };
  revenue: { value: number; change: number; target: number };
  orders: { value: number; change: number; target: number };
  aov: { value: number; change: number; target: number };
}

interface LeadGenMetrics {
  adSpend: { value: number; change: number; target: number };
  leads: { value: number; change: number; target: number };
  cpl: { value: number; change: number; target: number };
  ctr: { value: number; change: number; target: number };
}

interface PMReportBase {
  lastUpdated: string;
  period: string;
  targetAchievement: {
    spends: { achieved: number; target: number; variance: number };
    revenue: { achieved: number; target: number; variance: number };
  };
  status: 'excellent' | 'good' | 'needs-attention';
}

interface ECommercePMReport extends PMReportBase {
  reportType: 'ecommerce';
  metrics: ECommerceMetrics;
}

interface LeadGenPMReport extends PMReportBase {
  reportType: 'leadGeneration';
  metrics: LeadGenMetrics;
}

type PerformanceMarketingReport = ECommercePMReport | LeadGenPMReport;

interface AccountsTaxationReport {
  businessType: ATBusinessType;
  lastUpdated: string;
  period: string;
  metrics: {
    revenue: { value: number; change: number };
    expenses: { value: number; change: number };
    bankBalance: { value: number; change: number };
    debtors: { value: number; change: number };
    creditors: { value: number; change: number };
  };
  whatChanged: Array<{ category: string; description: string; value: string; trend: 'up' | 'down' | 'neutral' }>;
  risks: Array<{ severity: 'high' | 'medium' | 'low'; title: string; description: string }>;
  actions: Array<{ priority: 'high' | 'medium' | 'low'; title: string; description: string }>;
  status: 'excellent' | 'good' | 'needs-attention';
}

// Array-based: a client can have multiple PM and/or A&T reports
interface ClientReport {
  id: string;
  name: string;
  code: string;
  pmReports: PerformanceMarketingReport[];
  atReports: AccountsTaxationReport[];
}

// ── Mock Data ──

const mockClients: ClientReport[] = [
  {
    id: '1', name: 'Elan by Aanchal', code: 'PM001',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 850000, change: -8, target: 1000000 }, roas: { value: 4.94, change: 12, target: 5.0 }, revenue: { value: 4200000, change: 15, target: 5000000 }, orders: { value: 1248, change: 18, target: 1500 }, aov: { value: 3365, change: -3, target: 3500 } }, targetAchievement: { spends: { achieved: 850000, target: 1000000, variance: -150000 }, revenue: { achieved: 4200000, target: 5000000, variance: -800000 } }, status: 'good' },
      { reportType: 'leadGeneration', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 320000, change: 5, target: 400000 }, leads: { value: 487, change: 12, target: 600 }, cpl: { value: 657, change: -9, target: 700 }, ctr: { value: 2.8, change: 6, target: 3.0 } }, targetAchievement: { spends: { achieved: 320000, target: 400000, variance: -80000 }, revenue: { achieved: 1800000, target: 2500000, variance: -700000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 25, 2026', period: 'Q1 2026', metrics: { revenue: { value: 4850000, change: 12 }, expenses: { value: 3200000, change: -5 }, bankBalance: { value: 2150000, change: 8 }, debtors: { value: 680000, change: 15 }, creditors: { value: 420000, change: -3 } }, whatChanged: [{ category: 'Revenue', description: 'Increased by 12%', value: '₹48.5L', trend: 'up' }, { category: 'Debtors', description: 'Outstanding increased', value: '₹6.8L', trend: 'up' }], risks: [{ severity: 'low', title: 'Rising Debtors', description: 'Outstanding receivables increased by 15%.' }], actions: [{ priority: 'medium', title: 'Collect Receivables', description: 'Follow up on overdue invoices.' }], status: 'excellent' },
    ],
  },
  {
    id: '2', name: 'July Issue', code: 'PM002',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 1200000, change: 12, target: 1500000 }, roas: { value: 5.42, change: 9, target: 5.0 }, revenue: { value: 6500000, change: 22, target: 7000000 }, orders: { value: 2145, change: 23, target: 2500 }, aov: { value: 3030, change: -1, target: 3000 } }, targetAchievement: { spends: { achieved: 1200000, target: 1500000, variance: -300000 }, revenue: { achieved: 6500000, target: 7000000, variance: -500000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '3', name: 'Mahesh Interior', code: 'PM003',
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 23, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 450000, change: 3, target: 600000 }, leads: { value: 634, change: 8, target: 800 }, cpl: { value: 710, change: -5, target: 750 }, ctr: { value: 1.9, change: -3, target: 2.5 } }, targetAchievement: { spends: { achieved: 450000, target: 600000, variance: -150000 }, revenue: { achieved: 2100000, target: 3000000, variance: -900000 } }, status: 'needs-attention' },
    ],
    atReports: [
      { businessType: 'tradingManufacturing', lastUpdated: 'Mar 23, 2026', period: 'Q1 2026', metrics: { revenue: { value: 2100000, change: -8 }, expenses: { value: 2450000, change: 12 }, bankBalance: { value: 380000, change: -22 }, debtors: { value: 920000, change: 25 }, creditors: { value: 750000, change: -3 } }, whatChanged: [{ category: 'Expenses', description: 'Increased by 12%', value: '₹24.5L', trend: 'up' }, { category: 'Bank Balance', description: 'Dropped by 22%', value: '₹3.8L', trend: 'down' }], risks: [{ severity: 'high', title: 'Cash Crunch', description: 'Expenses exceeding revenue, bank balance declining.' }, { severity: 'high', title: 'High Debtors', description: 'Outstanding receivables up 25%.' }], actions: [{ priority: 'high', title: 'Cost Reduction', description: 'Implement cost-saving measures immediately.' }], status: 'needs-attention' },
    ],
  },
  {
    id: '4', name: 'Nor Black Nor White', code: 'PM004',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 650000, change: -5, target: 800000 }, roas: { value: 4.92, change: 14, target: 5.0 }, revenue: { value: 3200000, change: 8, target: 4000000 }, orders: { value: 892, change: 15, target: 1000 }, aov: { value: 3587, change: -6, target: 4000 } }, targetAchievement: { spends: { achieved: 650000, target: 800000, variance: -150000 }, revenue: { achieved: 3200000, target: 4000000, variance: -800000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '5', name: 'Skin Essentials', code: 'PM005',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 950000, change: 8, target: 1200000 }, roas: { value: 9.37, change: 18, target: 8.0 }, revenue: { value: 8900000, change: 28, target: 10000000 }, orders: { value: 3420, change: 35, target: 4000 }, aov: { value: 2602, change: -5, target: 2500 } }, targetAchievement: { spends: { achieved: 950000, target: 1200000, variance: -250000 }, revenue: { achieved: 8900000, target: 10000000, variance: -1100000 } }, status: 'excellent' },
    ],
    atReports: [],
  },
  {
    id: '6', name: 'True Diamond', code: 'PM006',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 720000, change: 5, target: 900000 }, roas: { value: 8.61, change: 14, target: 8.0 }, revenue: { value: 6200000, change: 20, target: 7500000 }, orders: { value: 2156, change: 18, target: 2800 }, aov: { value: 2875, change: 2, target: 2700 } }, targetAchievement: { spends: { achieved: 720000, target: 900000, variance: -180000 }, revenue: { achieved: 6200000, target: 7500000, variance: -1300000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 24, 2026', period: 'Q1 2026', metrics: { revenue: { value: 3650000, change: 6 }, expenses: { value: 2800000, change: 3 }, bankBalance: { value: 1420000, change: 4 }, debtors: { value: 520000, change: -8 }, creditors: { value: 310000, change: -2 } }, whatChanged: [{ category: 'Revenue', description: 'Grew steadily by 6%', value: '₹36.5L', trend: 'up' }, { category: 'Debtors', description: 'Reduced by 8%', value: '₹5.2L', trend: 'down' }], risks: [{ severity: 'low', title: 'Expense Growth', description: 'Expenses rising, monitor closely.' }], actions: [{ priority: 'medium', title: 'Expense Audit', description: 'Review recurring expenses for savings.' }], status: 'excellent' },
    ],
  },
  {
    id: '7', name: 'Una Homes LLP', code: 'PM007',
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 22, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 380000, change: -3, target: 500000 }, leads: { value: 412, change: 5, target: 600 }, cpl: { value: 922, change: -8, target: 1000 }, ctr: { value: 1.6, change: -2, target: 2.0 } }, targetAchievement: { spends: { achieved: 380000, target: 500000, variance: -120000 }, revenue: { achieved: 1800000, target: 2500000, variance: -700000 } }, status: 'needs-attention' },
    ],
    atReports: [],
  },
  {
    id: '8', name: 'Zenith Textiles', code: 'PM008',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 540000, change: 10, target: 700000 }, roas: { value: 9.44, change: 7, target: 8.5 }, revenue: { value: 5100000, change: 18, target: 6000000 }, orders: { value: 1560, change: 20, target: 1800 }, aov: { value: 3269, change: -2, target: 3300 } }, targetAchievement: { spends: { achieved: 540000, target: 700000, variance: -160000 }, revenue: { achieved: 5100000, target: 6000000, variance: -900000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'tradingManufacturing', lastUpdated: 'Mar 25, 2026', period: 'Q1 2026', metrics: { revenue: { value: 5200000, change: 18 }, expenses: { value: 3900000, change: 5 }, bankBalance: { value: 3100000, change: 15 }, debtors: { value: 450000, change: -12 }, creditors: { value: 280000, change: -6 } }, whatChanged: [{ category: 'Revenue', description: 'Strong growth of 18%', value: '₹52L', trend: 'up' }, { category: 'Debtors', description: 'Reduced by 12%', value: '₹4.5L', trend: 'down' }], risks: [{ severity: 'low', title: 'Stable Operations', description: 'No major risks identified.' }], actions: [{ priority: 'low', title: 'Maintain Standards', description: 'Continue current financial practices.' }], status: 'excellent' },
    ],
  },
  {
    id: '9', name: 'Craft & Bloom', code: 'PM009',
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 290000, change: -2, target: 350000 }, leads: { value: 378, change: 9, target: 500 }, cpl: { value: 767, change: -6, target: 800 }, ctr: { value: 2.4, change: 4, target: 2.5 } }, targetAchievement: { spends: { achieved: 290000, target: 350000, variance: -60000 }, revenue: { achieved: 1400000, target: 2000000, variance: -600000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '10', name: 'Vistara Foods', code: 'PM010',
    pmReports: [],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 23, 2026', period: 'Q1 2026', metrics: { revenue: { value: 1800000, change: -12 }, expenses: { value: 2100000, change: 18 }, bankBalance: { value: 240000, change: -35 }, debtors: { value: 1100000, change: 30 }, creditors: { value: 890000, change: 22 } }, whatChanged: [{ category: 'Revenue', description: 'Declined by 12%', value: '₹18L', trend: 'down' }, { category: 'Expenses', description: 'Spiked by 18%', value: '₹21L', trend: 'up' }], risks: [{ severity: 'high', title: 'Negative Cash Flow', description: 'Expenses exceed revenue by ₹3L.' }, { severity: 'high', title: 'High Debtors', description: 'Outstanding receivables spiked 30%.' }], actions: [{ priority: 'high', title: 'Emergency Collection', description: 'Prioritize overdue invoices immediately.' }], status: 'needs-attention' },
    ],
  },
  {
    id: '11', name: 'Prism Wellness', code: 'PM011',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 1100000, change: 15, target: 1300000 }, roas: { value: 7.09, change: 9, target: 6.5 }, revenue: { value: 7800000, change: 25, target: 8500000 }, orders: { value: 2890, change: 32, target: 3200 }, aov: { value: 2699, change: -5, target: 2650 } }, targetAchievement: { spends: { achieved: 1100000, target: 1300000, variance: -200000 }, revenue: { achieved: 7800000, target: 8500000, variance: -700000 } }, status: 'excellent' },
    ],
    atReports: [],
  },
  {
    id: '12', name: 'Sahara Exports', code: 'PM012',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 22, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 480000, change: -6, target: 600000 }, roas: { value: 5.0, change: 10, target: 5.8 }, revenue: { value: 2400000, change: 3, target: 3500000 }, orders: { value: 756, change: 4, target: 1000 }, aov: { value: 3175, change: -1, target: 3500 } }, targetAchievement: { spends: { achieved: 480000, target: 600000, variance: -120000 }, revenue: { achieved: 2400000, target: 3500000, variance: -1100000 } }, status: 'needs-attention' },
    ],
    atReports: [
      { businessType: 'tradingManufacturing', lastUpdated: 'Mar 22, 2026', period: 'Q1 2026', metrics: { revenue: { value: 3400000, change: -3 }, expenses: { value: 3100000, change: 8 }, bankBalance: { value: 620000, change: -18 }, debtors: { value: 780000, change: 20 }, creditors: { value: 540000, change: 15 } }, whatChanged: [{ category: 'Expenses', description: 'Increased by 8%', value: '₹31L', trend: 'up' }, { category: 'Bank Balance', description: 'Declined by 18%', value: '₹6.2L', trend: 'down' }], risks: [{ severity: 'high', title: 'Margin Squeeze', description: 'Expenses approaching revenue levels.' }], actions: [{ priority: 'high', title: 'Cost Restructuring', description: 'Review vendor contracts and overhead.' }], status: 'needs-attention' },
    ],
  },
  {
    id: '13', name: 'Orbit Digital', code: 'PM013',
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 410000, change: 8, target: 500000 }, leads: { value: 523, change: 18, target: 650 }, cpl: { value: 784, change: -11, target: 850 }, ctr: { value: 3.1, change: 8, target: 3.0 } }, targetAchievement: { spends: { achieved: 410000, target: 500000, variance: -90000 }, revenue: { achieved: 2200000, target: 2800000, variance: -600000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '14', name: 'Riviera Hospitality', code: 'PM014',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 780000, change: 6, target: 900000 }, roas: { value: 7.18, change: 12, target: 7.0 }, revenue: { value: 5600000, change: 19, target: 6500000 }, orders: { value: 1890, change: 22, target: 2200 }, aov: { value: 2963, change: -2, target: 3000 } }, targetAchievement: { spends: { achieved: 780000, target: 900000, variance: -120000 }, revenue: { achieved: 5600000, target: 6500000, variance: -900000 } }, status: 'excellent' },
    ],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 24, 2026', period: 'Q1 2026', metrics: { revenue: { value: 6800000, change: 22 }, expenses: { value: 4500000, change: 2 }, bankBalance: { value: 4200000, change: 20 }, debtors: { value: 320000, change: -15 }, creditors: { value: 180000, change: -10 } }, whatChanged: [{ category: 'Revenue', description: 'Strong growth of 22%', value: '₹68L', trend: 'up' }, { category: 'Bank Balance', description: 'Healthy increase of 20%', value: '₹42L', trend: 'up' }], risks: [{ severity: 'low', title: 'Healthy Finances', description: 'No concerns.' }], actions: [{ priority: 'low', title: 'Continue Monitoring', description: 'Maintain current trajectory.' }], status: 'excellent' },
    ],
  },
  {
    id: '15', name: 'Kala Threads', code: 'PM015',
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 23, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 620000, change: 4, target: 750000 }, roas: { value: 6.61, change: 7, target: 6.5 }, revenue: { value: 4100000, change: 11, target: 5000000 }, orders: { value: 1340, change: 14, target: 1600 }, aov: { value: 3060, change: -3, target: 3100 } }, targetAchievement: { spends: { achieved: 620000, target: 750000, variance: -130000 }, revenue: { achieved: 4100000, target: 5000000, variance: -900000 } }, status: 'good' },
    ],
    atReports: [],
  },
];

// ── Filter types ──

type StatusFilter = 'all' | 'excellent' | 'good' | 'needs-attention';

// ── Helpers ──

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
function formatNumber(value: number) { return value.toLocaleString('en-IN'); }

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  excellent: { bg: 'bg-[#E8F8F5]', text: 'text-[#0A8F5E]', dot: 'bg-[#00C875]' },
  good: { bg: 'bg-[#EEF1FB]', text: 'text-[#204CC7]', dot: 'bg-[#204CC7]' },
  'needs-attention': { bg: 'bg-[#FFF4E6]', text: 'text-[#B87514]', dot: 'bg-[#FDAB3D]' },
};

function getStatusLabel(s: string) { return s === 'needs-attention' ? 'Needs Attention' : s.charAt(0).toUpperCase() + s.slice(1); }

// ── Dropdown hook (mousedown + contains — fixes React 18) ──

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);
  return { open, setOpen, ref };
}

const CLIENTS_PER_PAGE = 15;

// ── Progress bar helper ──

function ProgressBar({ value, target, inverse }: { value: number; target: number; inverse?: boolean }) {
  if (!target || target === 0) return null;
  const pct = Math.min((value / target) * 100, 100);
  const isGood = inverse ? value <= target : value >= target * 0.8;
  const isExcellent = inverse ? value <= target * 0.9 : value >= target;
  const barColor = isExcellent ? 'bg-[#00C875]' : isGood ? 'bg-[#204CC7]' : 'bg-[#FDAB3D]';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-[4px] rounded-full bg-black/[0.04] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-normal text-black/40 shrink-0 tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Metric formatting by key ──

function formatMetricValue(key: string, value: number): string {
  if (key === 'adSpend' || key === 'revenue' || key === 'aov' || key === 'cpc') return formatCurrency(value);
  if (key === 'roas') return `${value}x`;
  if (key === 'ctr' || key === 'conversionRate') return `${value}%`;
  if (key === 'cpl') return `₹${formatNumber(value)}`;
  return formatNumber(value);
}

function formatMetricTarget(key: string, target: number): string {
  if (key === 'adSpend' || key === 'revenue' || key === 'aov' || key === 'cpc') return formatCurrency(target);
  if (key === 'roas') return `${target}x`;
  if (key === 'ctr' || key === 'conversionRate') return `${target}%`;
  if (key === 'cpl') return `₹${formatNumber(target)}`;
  return formatNumber(target);
}

const METRIC_LABELS: Record<string, string> = {
  adSpend: 'Ad Spends', roas: 'ROAS', revenue: 'Revenue', orders: 'Orders', aov: 'AOV',
  leads: 'Leads', cpl: 'CPL', ctr: 'CTR', cpc: 'CPC', impressions: 'Impressions',
  clicks: 'Clicks', conversionRate: 'Conversion Rate',
};

const INVERSE_METRICS = new Set(['cpl', 'cpc']); // lower is better

// Full pool of PM metrics available per report type
const ALL_PM_METRICS: Record<PMBusinessType, { key: string; label: string }[]> = {
  ecommerce: [
    { key: 'adSpend', label: 'Ad Spends' },
    { key: 'roas', label: 'ROAS' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'aov', label: 'AOV' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpc', label: 'CPC' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'conversionRate', label: 'Conversion Rate' },
  ],
  leadGeneration: [
    { key: 'adSpend', label: 'Ad Spends' },
    { key: 'leads', label: 'Leads' },
    { key: 'cpl', label: 'CPL' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpc', label: 'CPC' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'conversionRate', label: 'Conversion Rate' },
  ],
};

// ── Client Target Change Requests (slim model) ──

interface ClientTargetRequest {
  clientId: string;
  reportType: PMBusinessType;
  reportIndex: number;
  requestedBy: string;
  requestedAt: string;
  proposed: Record<string, number>;
}

const initialClientRequests: ClientTargetRequest[] = [
  {
    clientId: '1', reportType: 'ecommerce', reportIndex: 0,
    requestedBy: 'Aanchal Thakur',
    requestedAt: 'Mar 28, 2026',
    proposed: { adSpend: 1200000, roas: 5.5, revenue: 6600000, orders: 1800, aov: 3600, ctr: 2.5 },
  },
  {
    clientId: '3', reportType: 'leadGeneration', reportIndex: 0,
    requestedBy: 'Mahesh Patel',
    requestedAt: 'Mar 27, 2026',
    proposed: { adSpend: 650000, leads: 950, cpl: 650, ctr: 3.0, impressions: 150000, conversionRate: 0.6 },
  },
];

// ── Target Settings Modal ──

interface TargetModalProps {
  clientName: string;
  reportType: PMBusinessType;
  businessTypeLabel: string;
  targets: Record<string, number>;
  onSave: (targets: Record<string, number>) => void;
  onClose: () => void;
}

function TargetSettingsModal({ clientName, reportType, businessTypeLabel, targets, onSave, onClose }: TargetModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(targets).forEach(([k, v]) => { d[k] = String(v); });
    return d;
  });
  const metricKeys = reportType === 'ecommerce' ? ['adSpend', 'roas', 'revenue', 'orders', 'aov'] : ['adSpend', 'leads', 'cpl', 'ctr'];
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSave() {
    const parsed: Record<string, number> = {};
    Object.entries(draft).forEach(([k, v]) => { parsed[k] = parseFloat(v) || 0; });
    onSave(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Set metric targets">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h3 text-black/85">Set Targets</h2>
              <p className="text-caption font-normal text-black/65 mt-0.5">{clientName} · PM · {businessTypeLabel}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-black/40 hover:text-black/70 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {metricKeys.map((key) => (
            <div key={key}>
              <label className="block text-caption font-medium text-black/70 mb-1.5">{METRIC_LABELS[key]} Target</label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" />
                <input
                  type="number"
                  step={key === 'roas' || key === 'ctr' ? '0.1' : '1'}
                  value={draft[key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body font-medium text-black/80 placeholder:text-black/30 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                  placeholder={`e.g. ${formatMetricTarget(key, targets[key] || 0)}`}
                />
                {draft[key] && parseFloat(draft[key]) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-normal text-black/40">
                    {formatMetricTarget(key, parseFloat(draft[key]))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-end gap-3 bg-[#F6F7FF]/40">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-caption font-medium text-black/60 hover:text-black/80 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3da6] active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/50 focus-visible:ring-offset-2">
            <Check className="w-3.5 h-3.5" /> Save Targets
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Request Review Modal ──

interface ReviewModalProps {
  clientName: string;
  reportType: PMBusinessType;
  businessTypeLabel: string;
  currentMetricKeys: string[];
  currentTargets: Record<string, number>;
  clientRequest: ClientTargetRequest;
  onApprove: (selectedMetrics: string[], targets: Record<string, number>) => void;
  onReject: () => void;
  onClose: () => void;
}

function ChangeRequestReviewModal({ clientName, reportType, businessTypeLabel, currentMetricKeys, currentTargets, clientRequest, onApprove, onReject, onClose }: ReviewModalProps) {
  const availableMetrics = ALL_PM_METRICS[reportType];
  const newMetricKeys = Object.keys(clientRequest.proposed).filter(k => !currentMetricKeys.includes(k));

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(() => {
    const initial = new Set(currentMetricKeys);
    newMetricKeys.forEach(k => initial.add(k));
    return initial;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(currentTargets).forEach(([k, v]) => { d[k] = String(v); });
    Object.entries(clientRequest.proposed).forEach(([k, v]) => { if (!d[k]) d[k] = String(v); });
    return d;
  });

  useEffect(() => {
    if (!dropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dropdownOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleMetric(key: string) {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleApprove() {
    const targets: Record<string, number> = {};
    selectedMetrics.forEach(k => { targets[k] = parseFloat(draft[k]) || 0; });
    onApprove(Array.from(selectedMetrics), targets);
  }

  const selectedList = availableMetrics.filter(m => selectedMetrics.has(m.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Review change request">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h3 text-black/85">Review Change Request</h2>
              <p className="text-caption font-normal text-black/65 mt-0.5">{clientName} · PM · {businessTypeLabel}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-black/40 hover:text-black/70 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          <div className="mx-6 mt-4 px-3.5 py-3 rounded-xl bg-amber-50/80 border border-amber-200/50 flex items-center gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-caption font-semibold text-amber-800">{clientRequest.requestedBy}</p>
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-caption font-normal text-amber-600/70">{clientRequest.requestedAt}</span>
            </div>
          </div>

          <div className="px-6 mt-5">
            <label className="block text-caption font-semibold text-black/70 mb-2">Select Metrics</label>
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body text-black/70 hover:border-black/12 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedList.length > 0 ? (
                    selectedList.map(m => (
                      <span key={m.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${newMetricKeys.includes(m.key) ? 'bg-amber-100 text-amber-700' : 'bg-[#204CC7]/[0.08] text-[#204CC7]'}`}>
                        {m.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-caption text-black/40">Choose metrics…</span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-black/40 transition-transform shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50 max-h-[240px] overflow-y-auto">
                  {availableMetrics.map(m => {
                    const isSelected = selectedMetrics.has(m.key);
                    const isNew = newMetricKeys.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggleMetric(m.key)}
                        className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center justify-between focus-visible:outline-none ${isSelected ? 'bg-[#EEF1FB]/50 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all ${isSelected ? 'bg-[#204CC7] border-[#204CC7]' : 'border-black/20 bg-white'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          {m.label}
                        </span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-semibold">NEW</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pt-4 pb-5 space-y-3">
            <label className="block text-caption font-semibold text-black/70">Targets</label>
            {selectedList.length === 0 && (
              <p className="text-caption text-black/40 py-3">Select at least one metric above to set targets.</p>
            )}
            {selectedList.map(m => {
              const proposed = clientRequest.proposed[m.key];
              const current = currentTargets[m.key];
              const isNew = newMetricKeys.includes(m.key);
              const hasProposedChange = proposed !== undefined && proposed !== current;

              return (
                <div key={m.key} className={`p-3.5 rounded-xl border transition-all ${isNew ? 'border-amber-200/60 bg-amber-50/30' : 'border-black/[0.06] bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-caption font-semibold text-black/75">{m.label}</span>
                    {isNew && <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-semibold">Newly Requested</span>}
                  </div>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" />
                    <input
                      type="number"
                      step={m.key === 'roas' || m.key === 'ctr' || m.key === 'conversionRate' ? '0.1' : '1'}
                      value={draft[m.key] ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, [m.key]: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body font-medium text-black/80 placeholder:text-black/30 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                      placeholder="Set target…"
                    />
                    {draft[m.key] && parseFloat(draft[m.key]) > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-normal text-black/40">
                        {formatMetricTarget(m.key, parseFloat(draft[m.key]))}
                      </span>
                    )}
                  </div>
                  {(hasProposedChange || isNew) && proposed !== undefined && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {current !== undefined && (
                        <>
                          <span className="text-caption font-normal text-black/40">Current: {formatMetricTarget(m.key, current)}</span>
                          <span className="text-black/15">→</span>
                        </>
                      )}
                      <span className="text-caption font-medium text-amber-600">Proposed: {formatMetricTarget(m.key, proposed)}</span>
                      <button
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, [m.key]: String(proposed) }))}
                        className="ml-auto text-caption font-medium text-[#204CC7] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                      >
                        Use proposed
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] bg-[#F6F7FF]/40 flex items-center justify-between">
          <button onClick={() => { onReject(); onClose(); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-caption font-medium text-[#E2445C]/80 hover:text-[#E2445C] hover:bg-[#E2445C]/[0.06] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/30">
            <X className="w-3.5 h-3.5" /> Reject
          </button>
          <button onClick={() => { handleApprove(); onClose(); }} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3da6] active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/50 focus-visible:ring-offset-2">
            <Check className="w-3.5 h-3.5" /> Approve & Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change value indicator ──
function ChangeIndicator({ value, inverse }: { value: number; inverse?: boolean }) {
  const isGood = inverse ? value <= 0 : value >= 0;
  return (
    <span className={`text-caption font-medium tabular-nums ${isGood ? 'text-[#0A8F5E]' : 'text-[#D03050]'}`}>
      {value >= 0 ? '+' : ''}{value}%
    </span>
  );
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

// ── Component ──

interface ReportingModuleProps {
  activeTab?: 'at' | 'pm';
}

export function ReportingModule({ activeTab = 'at' }: ReportingModuleProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pmSubFilter, setPmSubFilter] = useState<'all' | PMBusinessType>('all');
  const [atSubFilter, setAtSubFilter] = useState<'all' | ATBusinessType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'atDashboard' | 'pmDashboard'>('overview');
  const [detailClient, setDetailClient] = useState<any>(null);
  const [detailService, setDetailService] = useState<ServiceType>('performanceMarketing');
  const [atDashboardClient, setAtDashboardClient] = useState<{ client: { id: string; name: string; code: string }; report: AccountsTaxationReport } | null>(null);
  const [pmDashboardClient, setPmDashboardClient] = useState<{ client: { id: string; name: string; code: string }; report: PerformanceMarketingReport } | null>(null);

  // Target overrides
  const [targetOverrides, setTargetOverrides] = useState<Record<string, Record<string, number>>>({});
  const [targetModal, setTargetModal] = useState<{ clientId: string; reportIndex: number; report: PerformanceMarketingReport } | null>(null);
  const [reviewModal, setReviewModal] = useState<{ clientId: string; reportIndex: number; report: PerformanceMarketingReport } | null>(null);

  // Client Target Change Requests
  const [clientRequests, setClientRequests] = useState<ClientTargetRequest[]>(initialClientRequests);

  // Sort state
  type SortDirection = 'asc' | 'desc' | null;
  type PMEcomSortField = 'client' | 'code' | 'adSpend' | 'roas' | 'revenue' | 'orders' | 'aov' | 'status' | 'updated';
  type PMLeadSortField = 'client' | 'code' | 'adSpend' | 'leads' | 'cpl' | 'ctr' | 'status' | 'updated';
  type ATSortField = 'client' | 'code' | 'type' | 'revenue' | 'expenses' | 'bankBalance' | 'debtors' | 'creditors' | 'status' | 'updated';
  const [atSort, setAtSort] = useState<{ field: ATSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });
  const [ecomSort, setEcomSort] = useState<{ field: PMEcomSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });
  const [leadSort, setLeadSort] = useState<{ field: PMLeadSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });

  const toggleSort = <T extends string>(current: { field: T; dir: SortDirection }, field: T): { field: T; dir: SortDirection } => {
    if (current.field === field) {
      if (current.dir === 'asc') return { field, dir: 'desc' };
      if (current.dir === 'desc') return { field, dir: null };
      return { field, dir: 'asc' };
    }
    return { field, dir: 'asc' };
  };

  const SortIcon = ({ field, current }: { field: string; current: { field: string; dir: SortDirection } }) => {
    if (current.field !== field || current.dir === null) return <ArrowUpDown className="w-3 h-3 text-black/25" />;
    return current.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#204CC7]" /> : <ChevronDown className="w-3 h-3 text-[#204CC7]" />;
  };

  function getClientRequest(clientId: string, reportType: PMBusinessType, reportIndex: number): ClientTargetRequest | undefined {
    return clientRequests.find(r => r.clientId === clientId && r.reportType === reportType && r.reportIndex === reportIndex);
  }

  function dismissClientRequest(clientId: string, reportType: PMBusinessType, reportIndex: number) {
    setClientRequests(prev => prev.filter(r => !(r.clientId === clientId && r.reportType === reportType && r.reportIndex === reportIndex)));
  }

  function getTargets(clientId: string, reportIndex: number, report: PerformanceMarketingReport): Record<string, number> {
    const overrideKey = `${clientId}-${report.reportType}-${reportIndex}`;
    const overrides = targetOverrides[overrideKey] || {};
    const base: Record<string, number> = {};
    Object.entries(report.metrics).forEach(([k, v]) => {
      if (v && typeof v === 'object' && 'target' in v) base[k] = (v as { target: number }).target;
    });
    return { ...base, ...overrides };
  }

  function handleSaveTargets(targets: Record<string, number>) {
    if (!targetModal) return;
    const overrideKey = `${targetModal.clientId}-${targetModal.report.reportType}-${targetModal.reportIndex}`;
    setTargetOverrides((prev) => ({ ...prev, [overrideKey]: targets }));
    setTargetModal(null);
  }

  const statusDD = useDropdown();
  const subFilterDD = useDropdown();

  // Reset page on filter changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, activeTab, pmSubFilter, atSubFilter]);

  // ── A&T filtered data ──
  const atRows = useMemo(() => {
    const rows: { client: ClientReport; report: AccountsTaxationReport; reportIndex: number }[] = [];
    mockClients.forEach(c => {
      c.atReports.forEach((r, i) => rows.push({ client: c, report: r, reportIndex: i }));
    });
    let filtered = rows;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.client.name.toLowerCase().includes(s) || r.client.code.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.report.status === statusFilter);
    }
    if (atSubFilter !== 'all') {
      filtered = filtered.filter(r => r.report.businessType === atSubFilter);
    }
    if (atSort.dir) {
      const dir = atSort.dir === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        switch (atSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'code': return dir * a.client.code.localeCompare(b.client.code);
          case 'type': return dir * (a.report.businessType || '').localeCompare(b.report.businessType || '');
          case 'revenue': return dir * (a.report.metrics.revenue.value - b.report.metrics.revenue.value);
          case 'expenses': return dir * (a.report.metrics.expenses.value - b.report.metrics.expenses.value);
          case 'bankBalance': return dir * (a.report.metrics.bankBalance.value - b.report.metrics.bankBalance.value);
          case 'debtors': return dir * (a.report.metrics.debtors.value - b.report.metrics.debtors.value);
          case 'creditors': return dir * (a.report.metrics.creditors.value - b.report.metrics.creditors.value);
          case 'status': return dir * a.report.status.localeCompare(b.report.status);
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    } else {
      filtered.sort((a, b) => a.client.name.localeCompare(b.client.name));
    }
    return filtered;
  }, [searchTerm, statusFilter, atSubFilter, atSort]);

  // ── PM filtered data — split by report type ──
  const pmRows = useMemo(() => {
    const rows: { client: ClientReport; report: PerformanceMarketingReport; reportIndex: number }[] = [];
    mockClients.forEach(c => {
      c.pmReports.forEach((r, i) => rows.push({ client: c, report: r, reportIndex: i }));
    });
    let filtered = rows;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.client.name.toLowerCase().includes(s) || r.client.code.toLowerCase().includes(s));
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.report.status === statusFilter);
    }
    if (pmSubFilter !== 'all') {
      filtered = filtered.filter(r => r.report.reportType === pmSubFilter);
    }
    return filtered.sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [searchTerm, statusFilter, pmSubFilter]);

  const pmEcomRows = useMemo(() => {
    const rows = pmRows.filter(r => r.report.reportType === 'ecommerce');
    if (ecomSort.dir) {
      const dir = ecomSort.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const am = a.report.metrics as ECommerceMetrics;
        const bm = b.report.metrics as ECommerceMetrics;
        switch (ecomSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'code': return dir * a.client.code.localeCompare(b.client.code);
          case 'adSpend': return dir * (am.adSpend.value - bm.adSpend.value);
          case 'roas': return dir * (am.roas.value - bm.roas.value);
          case 'revenue': return dir * (am.revenue.value - bm.revenue.value);
          case 'orders': return dir * (am.orders.value - bm.orders.value);
          case 'aov': return dir * (am.aov.value - bm.aov.value);
          case 'status': return dir * a.report.status.localeCompare(b.report.status);
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    }
    return rows;
  }, [pmRows, ecomSort]);

  const pmLeadGenRows = useMemo(() => {
    const rows = pmRows.filter(r => r.report.reportType === 'leadGeneration');
    if (leadSort.dir) {
      const dir = leadSort.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const am = a.report.metrics as LeadGenMetrics;
        const bm = b.report.metrics as LeadGenMetrics;
        switch (leadSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'code': return dir * a.client.code.localeCompare(b.client.code);
          case 'adSpend': return dir * (am.adSpend.value - bm.adSpend.value);
          case 'leads': return dir * (am.leads.value - bm.leads.value);
          case 'cpl': return dir * (am.cpl.value - bm.cpl.value);
          case 'ctr': return dir * (am.ctr.value - bm.ctr.value);
          case 'status': return dir * a.report.status.localeCompare(b.report.status);
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    }
    return rows;
  }, [pmRows, leadSort]);

  // Pagination
  const currentRows = activeTab === 'at' ? atRows : pmRows;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / CLIENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * CLIENTS_PER_PAGE;
  const endIdx = Math.min(safePage * CLIENTS_PER_PAGE, currentRows.length);

  const paginatedAtRows = activeTab === 'at' ? atRows.slice(startIdx, endIdx) : [];

  const getPageNumbers = useCallback((): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const p: (number | 'ellipsis')[] = [];
    if (safePage <= 4) { for (let i = 1; i <= 5; i++) p.push(i); p.push('ellipsis', totalPages); }
    else if (safePage >= totalPages - 3) { p.push(1, 'ellipsis'); for (let i = totalPages - 4; i <= totalPages; i++) p.push(i); }
    else { p.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages); }
    return p;
  }, [totalPages, safePage]);

  // Counts
  const atCount = useMemo(() => mockClients.reduce((n, c) => n + c.atReports.length, 0), []);
  const pmCount = useMemo(() => mockClients.reduce((n, c) => n + c.pmReports.length, 0), []);

  // Status counts for dropdown
  const stCounts = useMemo(() => {
    const rows = activeTab === 'at' ? atRows : pmRows;
    // Remove status filter to count all
    const allRows = activeTab === 'at'
      ? (() => {
          const r: { report: AccountsTaxationReport }[] = [];
          mockClients.forEach(c => c.atReports.forEach(rep => r.push({ report: rep })));
          let f = r;
          if (searchTerm) { const s = searchTerm.toLowerCase(); f = f.filter(x => mockClients.find(c => c.atReports.includes(x.report))?.name.toLowerCase().includes(s) || false); }
          return f;
        })()
      : (() => {
          const r: { report: PerformanceMarketingReport }[] = [];
          mockClients.forEach(c => c.pmReports.forEach(rep => r.push({ report: rep })));
          return r;
        })();
    return {
      all: allRows.length,
      excellent: allRows.filter(r => r.report.status === 'excellent').length,
      good: allRows.filter(r => r.report.status === 'good').length,
      'needs-attention': allRows.filter(r => r.report.status === 'needs-attention').length,
    };
  }, [activeTab, searchTerm, atRows, pmRows]);

  function clearAll() { setStatusFilter('all'); setSearchTerm(''); setPmSubFilter('all'); setAtSubFilter('all'); }

  // Build a ReportDetail-compatible single-report client
  function openDetail(client: ClientReport, svc: ServiceType, report: PerformanceMarketingReport | AccountsTaxationReport) {
    if (svc === 'accountsTaxation') {
      setAtDashboardClient({ client: { id: client.id, name: client.name, code: client.code }, report: report as AccountsTaxationReport });
      setViewMode('atDashboard');
      return;
    }
    setPmDashboardClient({ client: { id: client.id, name: client.name, code: client.code }, report: report as PerformanceMarketingReport });
    setViewMode('pmDashboard');
  }

  if (viewMode === 'atDashboard' && atDashboardClient) {
    return <ClientDashboard client={atDashboardClient.client} report={atDashboardClient.report} onBack={() => { setViewMode('overview'); setAtDashboardClient(null); }} />;
  }

  if (viewMode === 'pmDashboard' && pmDashboardClient) {
    return <PMClientDashboard client={pmDashboardClient.client} report={pmDashboardClient.report} onBack={() => { setViewMode('overview'); setPmDashboardClient(null); }} />;
  }

  if (viewMode === 'detail' && detailClient) {
    return <ReportDetail client={detailClient} service={detailService} onBack={() => { setViewMode('overview'); setDetailClient(null); }} />;
  }

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (activeTab === 'pm' && pmSubFilter !== 'all' ? 1 : 0) + (activeTab === 'at' && atSubFilter !== 'all' ? 1 : 0);

  return (
    <div className="flex h-full">

      {/* ── Left Sidebar ── */}
      <div className="w-[240px] shrink-0 border-r border-black/[0.06] bg-white flex flex-col">
        {/* Sidebar header */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-h2 text-black/85">Dashboard</h1>
          <p className="text-caption font-normal text-black/60 mt-1">Client report summary</p>
        </div>

        {/* Nav items */}
        <nav className="px-3 flex-1" aria-label="Dashboard sections">
          <button
            onClick={() => { router.push('/dashboard/accounts-taxation'); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left group ${activeTab === 'at' ? 'bg-[#204CC7]/[0.08]' : 'hover:bg-black/[0.03]'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'at' ? 'bg-[#204CC7]/15' : 'bg-black/[0.04]'}`}>
              <FileText className={`w-4 h-4 ${activeTab === 'at' ? 'text-[#204CC7]' : 'text-black/55'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-body font-semibold truncate ${activeTab === 'at' ? 'text-[#204CC7]' : 'text-black/70'}`}>Accounts & Taxation</p>
            </div>
          </button>

          <button
            onClick={() => { router.push('/dashboard/performance-marketing'); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-all text-left group ${activeTab === 'pm' ? 'bg-[#204CC7]/[0.08]' : 'hover:bg-black/[0.03]'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'pm' ? 'bg-[#204CC7]/15' : 'bg-black/[0.04]'}`}>
              <BarChart3 className={`w-4 h-4 ${activeTab === 'pm' ? 'text-[#204CC7]' : 'text-black/55'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-body font-semibold truncate ${activeTab === 'pm' ? 'text-[#204CC7]' : 'text-black/70'}`}>Performance Marketing</p>
            </div>
          </button>
        </nav>

        {/* Sidebar footer summary */}
        <div className="px-5 py-4 border-t border-black/[0.06]">
          <p className="text-caption font-normal text-black/60">{mockClients.length} total clients</p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar: filters + search */}
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] bg-white shrink-0">
          <div className="flex items-center gap-3">
            {/* Section title */}
            <div className="flex items-center gap-2.5 mr-3">
              {activeTab === 'at' ? (
                <FileText className="w-4.5 h-4.5 text-[#06B6D4]" />
              ) : (
                <BarChart3 className="w-4.5 h-4.5 text-[#7C3AED]" />
              )}
              <h2 className="text-h3 text-black/85">{activeTab === 'at' ? 'Accounts & Taxation' : 'Performance Marketing'}</h2>
            </div>

            <div className="w-px h-6 bg-black/8" />

            {/* Sub-filter (business type) */}
            <div ref={subFilterDD.ref} className="relative">
              <button
                onClick={() => { subFilterDD.setOpen(!subFilterDD.open); statusDD.setOpen(false); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${(activeTab === 'at' ? atSubFilter : pmSubFilter) !== 'all' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'}`}
              >
                <Layers className="w-3.5 h-3.5" />
                {activeTab === 'at'
                  ? (atSubFilter === 'all' ? 'All Types' : getBusinessTypeLabel(atSubFilter))
                  : (pmSubFilter === 'all' ? 'All Types' : getBusinessTypeLabel(pmSubFilter))
                }
                <ChevronDown className={`w-3 h-3 transition-transform ${subFilterDD.open ? 'rotate-180' : ''}`} />
              </button>
              {subFilterDD.open && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50">
                  <button
                    onClick={() => { activeTab === 'at' ? setAtSubFilter('all') : setPmSubFilter('all'); subFilterDD.setOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center gap-2 focus-visible:outline-none ${(activeTab === 'at' ? atSubFilter : pmSubFilter) === 'all' ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                  >
                    <Layers className="w-3.5 h-3.5 text-black/55" /> All Types
                  </button>
                  {(activeTab === 'at' ? AT_BUSINESS_TYPES : PM_BUSINESS_TYPES).map(bt => (
                    <button
                      key={bt.value}
                      onClick={() => { activeTab === 'at' ? setAtSubFilter(bt.value as ATBusinessType) : setPmSubFilter(bt.value as PMBusinessType); subFilterDD.setOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center gap-2 focus-visible:outline-none ${(activeTab === 'at' ? atSubFilter : pmSubFilter) === bt.value ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status filter */}
            <div ref={statusDD.ref} className="relative">
              <button
                onClick={() => { statusDD.setOpen(!statusDD.open); subFilterDD.setOpen(false); }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border transition-all text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${statusFilter !== 'all' ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]' : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'}`}
              >
                {statusFilter !== 'all' && <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[statusFilter]?.dot}`} aria-hidden="true" />}
                {statusFilter === 'all' ? 'All Status' : getStatusLabel(statusFilter)}
                <ChevronDown className={`w-3 h-3 transition-transform ${statusDD.open ? 'rotate-180' : ''}`} />
              </button>
              {statusDD.open && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50">
                  {(['all', 'excellent', 'good', 'needs-attention'] as StatusFilter[]).map(v => (
                    <button
                      key={v}
                      onClick={() => { setStatusFilter(v); statusDD.setOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center justify-between focus-visible:outline-none ${statusFilter === v ? 'bg-[#EEF1FB]/60 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${v !== 'all' ? STATUS_STYLES[v]?.dot : 'bg-black/40'}`} aria-hidden="true" />
                        {v === 'all' ? 'All Status' : getStatusLabel(v)}
                      </span>
                      <span className={`text-caption font-medium px-1.5 py-0.5 rounded-md ${statusFilter === v ? 'bg-[#204CC7]/10 text-[#204CC7]' : 'bg-black/[0.04] text-black/65'}`}>
                        {stCounts[v]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-caption text-black/55 hover:text-[#204CC7] hover:bg-[#EEF1FB]/50 transition-colors focus-visible:outline-none">
                <X className="w-3 h-3" /> Clear
              </button>
            )}

            <div className="flex-1" />

            <span className="text-caption text-black/60 mr-2">{currentRows.length} report{currentRows.length !== 1 ? 's' : ''}</span>

            {/* Search */}
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/55 pointer-events-none" aria-hidden="true" />
              <input
                type="text" placeholder="Search clients..." aria-label="Search clients"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#F6F7FF] border border-black/5 rounded-xl placeholder:text-black/55 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all text-caption"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/55 hover:text-black/70 transition-colors rounded">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ═══ A&T Table ═══ */}
          {activeTab === 'at' && (
            <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
              <table className="w-full min-w-[1100px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '100px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                    {([['client','Client','left','px-5'],['code','Code','left','px-4'],['type','Type','left','px-4'],['revenue','Revenue','right','px-4'],['expenses','Expenses','right','px-4'],['bankBalance','Bank Balance','right','px-4'],['debtors','Debtors','right','px-4'],['creditors','Creditors','right','px-4']] as [ATSortField, string, string, string][]).map(([field, label, align, px]) => (
                      <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setAtSort(toggleSort(atSort, field))}>
                        <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={atSort} /></span>
                      </th>
                    ))}
                    <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setAtSort(toggleSort(atSort, 'status'))}>
                      <span className="inline-flex items-center gap-1 justify-center">Status <SortIcon field="status" current={atSort} /></span>
                    </th>
                    <th className="text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider px-5 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setAtSort(toggleSort(atSort, 'updated'))}>
                      <span className="inline-flex items-center gap-1 justify-end">Updated <SortIcon field="updated" current={atSort} /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAtRows.map((row, idx) => (
                    <tr
                      key={`${row.client.id}-at-${row.reportIndex}`}
                      className="border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[52px]"
                      onClick={() => openDetail(row.client, 'accountsTaxation', row.report)}
                    >
                      <td className="px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#06B6D4]/[0.10] flex items-center justify-center text-[#0E7490] text-caption font-bold shrink-0">
                            {row.client.name.charAt(0)}
                          </div>
                          <span className="text-body font-semibold text-black/80 truncate">{row.client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 text-caption text-black/55 truncate">{row.client.code}</td>
                      <td className="px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium whitespace-nowrap ${row.report.businessType === 'tradingManufacturing' ? 'bg-[#06B6D4]/[0.10] text-[#0E7490]' : 'bg-[#00C875]/[0.10] text-[#0A8F5E]'}`}>{getBusinessTypeShort(row.report.businessType)}</span>
                      </td>
                      <td className="px-4 text-right">
                        <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(row.report.metrics.revenue.value)}</span>
                        <span className="ml-1.5 inline-flex items-center"><ChangeIndicator value={row.report.metrics.revenue.change} /></span>
                      </td>
                      <td className="px-4 text-right">
                        <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(row.report.metrics.expenses.value)}</span>
                        <span className="ml-1.5 inline-flex items-center"><ChangeIndicator value={row.report.metrics.expenses.change} inverse /></span>
                      </td>
                      <td className="px-4 text-right">
                        <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(row.report.metrics.bankBalance.value)}</span>
                        <span className="ml-1.5 inline-flex items-center"><ChangeIndicator value={row.report.metrics.bankBalance.change} /></span>
                      </td>
                      <td className="px-4 text-right">
                        <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(row.report.metrics.debtors.value)}</span>
                        <span className="ml-1.5 inline-flex items-center"><ChangeIndicator value={row.report.metrics.debtors.change} inverse /></span>
                      </td>
                      <td className="px-4 text-right">
                        <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(row.report.metrics.creditors.value)}</span>
                        <span className="ml-1.5 inline-flex items-center"><ChangeIndicator value={row.report.metrics.creditors.change} inverse /></span>
                      </td>
                      <td className="px-4 text-center">
                        <StatusBadge status={row.report.status} />
                      </td>
                      <td className="px-5 text-right">
                        <span className="text-caption text-black/50 whitespace-nowrap">{row.report.lastUpdated}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {atRows.length === 0 && (
                <div className="py-16 text-center" role="status">
                  <Search className="w-10 h-10 text-black/15 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-black/70 text-body font-medium">No A&T reports match your filters</p>
                  <button onClick={clearAll} className="mt-2 text-[#204CC7] hover:underline text-caption rounded">Reset filters</button>
                </div>
              )}
            </div>
          )}

          {/* ═══ PM Tables (E-Commerce + Lead Generation) ═══ */}
          {activeTab === 'pm' && (
            <div className="space-y-6">

              {/* E-Commerce Table */}
              {pmEcomRows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <span className="text-caption font-semibold text-black/70">E-Commerce</span>
                    <span className="text-caption font-normal text-black/55">{pmEcomRows.length} report{pmEcomRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
                    <table className="w-full min-w-[1060px]" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '210px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '48px' }} />
                        <col style={{ width: '100px' }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                          {([['client','Client','left','px-5'],['code','Code','left','px-4'],['adSpend','Ad Spends','right','px-4'],['roas','ROAS','right','px-4'],['revenue','Revenue','right','px-4'],['orders','Orders','right','px-4'],['aov','AOV','right','px-4']] as [PMEcomSortField, string, string, string][]).map(([field, label, align, px]) => (
                            <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setEcomSort(toggleSort(ecomSort, field))}>
                              <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={ecomSort} /></span>
                            </th>
                          ))}
                          <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setEcomSort(toggleSort(ecomSort, 'status'))}>
                            <span className="inline-flex items-center gap-1 justify-center">Status <SortIcon field="status" current={ecomSort} /></span>
                          </th>
                          <th className="px-1 py-3"></th>
                          <th className="text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider px-5 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setEcomSort(toggleSort(ecomSort, 'updated'))}>
                            <span className="inline-flex items-center gap-1 justify-end">Updated <SortIcon field="updated" current={ecomSort} /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pmEcomRows.map((row) => {
                          const m = row.report.metrics as ECommerceMetrics;
                          const targets = getTargets(row.client.id, row.reportIndex, row.report);
                          const hasRequest = !!getClientRequest(row.client.id, row.report.reportType, row.reportIndex);
                          return (
                            <tr
                              key={`${row.client.id}-ecom-${row.reportIndex}`}
                              className="border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[52px]"
                              onClick={() => openDetail(row.client, 'performanceMarketing', row.report)}
                            >
                              <td className="px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/[0.08] flex items-center justify-center text-[#7C3AED] text-[11px] font-bold shrink-0">
                                    {row.client.name.charAt(0)}
                                  </div>
                                  <span className="text-body font-semibold text-black/80 truncate">{row.client.name}</span>
                                </div>
                              </td>
                              <td className="px-4 text-caption text-black/55 truncate">{row.client.code}</td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.adSpend.value)}</span>
                                  <ChangeIndicator value={m.adSpend.change} />
                                </div>
                                {targets.adSpend > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatCurrency(targets.adSpend)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{m.roas.value}x</span>
                                  <ChangeIndicator value={m.roas.change} />
                                </div>
                                {targets.roas > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {targets.roas}x</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.revenue.value)}</span>
                                  <ChangeIndicator value={m.revenue.change} />
                                </div>
                                {targets.revenue > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatCurrency(targets.revenue)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatNumber(m.orders.value)}</span>
                                  <ChangeIndicator value={m.orders.change} />
                                </div>
                                {targets.orders > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatNumber(targets.orders)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.aov.value)}</span>
                                  <ChangeIndicator value={m.aov.change} />
                                </div>
                                {targets.aov > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatCurrency(targets.aov)}</p>}
                              </td>
                              <td className="px-4 text-center">
                                <StatusBadge status={row.report.status} />
                              </td>
                              <td className="px-1 text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  {hasRequest && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setReviewModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                      title="Change Request"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {CAN_EDIT_TARGETS && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTargetModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-black/25 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] transition-all opacity-0 group-hover:opacity-100"
                                      title="Set Targets"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 text-right">
                                <span className="text-caption text-black/50 whitespace-nowrap">{row.report.lastUpdated}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lead Generation Table */}
              {pmLeadGenRows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <span className="text-caption font-semibold text-black/70">Lead Generation</span>
                    <span className="text-caption font-normal text-black/55">{pmLeadGenRows.length} report{pmLeadGenRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
                    <table className="w-full min-w-[900px]" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '210px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '48px' }} />
                        <col style={{ width: '100px' }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                          {([['client','Client','left','px-5'],['code','Code','left','px-4'],['adSpend','Ad Spends','right','px-4'],['leads','Leads','right','px-4'],['cpl','CPL','right','px-4'],['ctr','CTR','right','px-4']] as [PMLeadSortField, string, string, string][]).map(([field, label, align, px]) => (
                            <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setLeadSort(toggleSort(leadSort, field))}>
                              <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={leadSort} /></span>
                            </th>
                          ))}
                          <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setLeadSort(toggleSort(leadSort, 'status'))}>
                            <span className="inline-flex items-center gap-1 justify-center">Status <SortIcon field="status" current={leadSort} /></span>
                          </th>
                          <th className="px-1 py-3"></th>
                          <th className="text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider px-5 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setLeadSort(toggleSort(leadSort, 'updated'))}>
                            <span className="inline-flex items-center gap-1 justify-end">Updated <SortIcon field="updated" current={leadSort} /></span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pmLeadGenRows.map((row) => {
                          const m = row.report.metrics as LeadGenMetrics;
                          const targets = getTargets(row.client.id, row.reportIndex, row.report);
                          const hasRequest = !!getClientRequest(row.client.id, row.report.reportType, row.reportIndex);
                          return (
                            <tr
                              key={`${row.client.id}-leadgen-${row.reportIndex}`}
                              className="border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[52px]"
                              onClick={() => openDetail(row.client, 'performanceMarketing', row.report)}
                            >
                              <td className="px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/[0.08] flex items-center justify-center text-[#7C3AED] text-[11px] font-bold shrink-0">
                                    {row.client.name.charAt(0)}
                                  </div>
                                  <span className="text-body font-semibold text-black/80 truncate">{row.client.name}</span>
                                </div>
                              </td>
                              <td className="px-4 text-caption text-black/55 truncate">{row.client.code}</td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.adSpend.value)}</span>
                                  <ChangeIndicator value={m.adSpend.change} />
                                </div>
                                {targets.adSpend > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatCurrency(targets.adSpend)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatNumber(m.leads.value)}</span>
                                  <ChangeIndicator value={m.leads.change} />
                                </div>
                                {targets.leads > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {formatNumber(targets.leads)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">₹{formatNumber(m.cpl.value)}</span>
                                  <ChangeIndicator value={m.cpl.change} inverse />
                                </div>
                                {targets.cpl > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: ₹{formatNumber(targets.cpl)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{m.ctr.value}%</span>
                                  <ChangeIndicator value={m.ctr.change} />
                                </div>
                                {targets.ctr > 0 && <p className="text-[11px] text-black/40 tabular-nums mt-0.5">Target: {targets.ctr}%</p>}
                              </td>
                              <td className="px-4 text-center">
                                <StatusBadge status={row.report.status} />
                              </td>
                              <td className="px-1 text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  {hasRequest && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setReviewModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                      title="Change Request"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {CAN_EDIT_TARGETS && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTargetModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-black/25 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] transition-all opacity-0 group-hover:opacity-100"
                                      title="Set Targets"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 text-right">
                                <span className="text-caption text-black/50 whitespace-nowrap">{row.report.lastUpdated}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pmRows.length === 0 && (
                <div className="py-16 text-center bg-white rounded-xl border border-black/[0.06]" role="status">
                  <Search className="w-10 h-10 text-black/15 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-black/70 text-body font-medium">No PM reports match your filters</p>
                  <button onClick={clearAll} className="mt-2 text-[#204CC7] hover:underline text-caption rounded">Reset filters</button>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {currentRows.length > CLIENTS_PER_PAGE && (
            <nav aria-label="Pagination" className="flex items-center justify-between pt-4 pb-2">
              <span className="text-caption text-black/60">
                Showing {startIdx + 1}–{endIdx} of {currentRows.length} report{currentRows.length !== 1 ? 's' : ''}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} aria-label="First page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronsLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageNumbers().map((pg, idx) => pg === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="w-8 text-center text-caption text-black/55 select-none" aria-hidden="true">…</span>
                  ) : (
                    <button key={pg} onClick={() => setCurrentPage(pg)} aria-label={`Page ${pg}`} aria-current={pg === safePage ? 'page' : undefined}
                      className={`min-w-[32px] h-8 rounded-lg text-caption transition-all ${pg === safePage ? 'bg-[#204CC7] text-white shadow-sm' : 'text-black/60 hover:bg-black/[0.04] hover:text-black/80'}`}>{pg}</button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} aria-label="Last page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronsRight className="w-4 h-4" /></button>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Target Settings Modal */}
      {targetModal && (() => {
        const client = mockClients.find((c) => c.id === targetModal.clientId);
        if (!client) return null;
        const targets = getTargets(client.id, targetModal.reportIndex, targetModal.report);
        return (
          <TargetSettingsModal
            clientName={client.name}
            reportType={targetModal.report.reportType}
            businessTypeLabel={getBusinessTypeShort(targetModal.report.reportType)}
            targets={targets}
            onSave={handleSaveTargets}
            onClose={() => setTargetModal(null)}
          />
        );
      })()}

      {/* Change Request Review Modal */}
      {reviewModal && (() => {
        const client = mockClients.find((c) => c.id === reviewModal.clientId);
        const req = getClientRequest(reviewModal.clientId, reviewModal.report.reportType, reviewModal.reportIndex);
        if (!client || !req) return null;
        const currentTargets = getTargets(client.id, reviewModal.reportIndex, reviewModal.report);
        const currentMetricKeys = reviewModal.report.reportType === 'ecommerce'
          ? ['adSpend', 'roas', 'revenue', 'orders', 'aov']
          : ['adSpend', 'leads', 'cpl', 'ctr'];
        return (
          <ChangeRequestReviewModal
            clientName={client.name}
            reportType={reviewModal.report.reportType}
            businessTypeLabel={getBusinessTypeShort(reviewModal.report.reportType)}
            currentMetricKeys={currentMetricKeys}
            currentTargets={currentTargets}
            clientRequest={req}
            onApprove={(selectedMetrics, targets) => {
              const overrideKey = `${reviewModal.clientId}-${reviewModal.report.reportType}-${reviewModal.reportIndex}`;
              setTargetOverrides(prev => ({ ...prev, [overrideKey]: targets }));
              dismissClientRequest(reviewModal.clientId, reviewModal.report.reportType, reviewModal.reportIndex);
            }}
            onReject={() => dismissClientRequest(reviewModal.clientId, reviewModal.report.reportType, reviewModal.reportIndex)}
            onClose={() => setReviewModal(null)}
          />
        );
      })()}
    </div>
  );
}
