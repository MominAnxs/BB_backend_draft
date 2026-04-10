'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  AlertTriangle,
  Trophy,
  Building2,
} from 'lucide-react';

// ============================================================================
// Data Model & Types
// ============================================================================

interface ClientMargin {
  id: string;
  clientName: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  hod: string;
  accountManager: string;
  billingPerMonth: number;
  adSpend: number;
  teamCost: number;
  overheads: number;
  totalCost: number;
  grossMargin: number;
  marginPercent: number;
  trend: 'up' | 'down' | 'stable';
  status: 'Healthy' | 'Watch' | 'At Risk';
  employeesAllocated: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockClients: ClientMargin[] = [
  // Performance Marketing Clients (Chinmay Pawar)
  {
    id: 'pm-001',
    clientName: 'Zenith Retail',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Priya Sharma',
    billingPerMonth: 250000,
    adSpend: 120000,
    teamCost: 85000,
    overheads: 25000,
    totalCost: 230000,
    grossMargin: 20000,
    marginPercent: 8,
    trend: 'up',
    status: 'Watch',
    employeesAllocated: 3,
  },
  {
    id: 'pm-002',
    clientName: 'NovaTech Solutions',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Rohan Desai',
    billingPerMonth: 180000,
    adSpend: 85000,
    teamCost: 65000,
    overheads: 20000,
    totalCost: 170000,
    grossMargin: 10000,
    marginPercent: 5.5,
    trend: 'down',
    status: 'At Risk',
    employeesAllocated: 2,
  },
  {
    id: 'pm-003',
    clientName: 'Bloom Botanics',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Sneha Patel',
    billingPerMonth: 145000,
    adSpend: 62000,
    teamCost: 52000,
    overheads: 18000,
    totalCost: 132000,
    grossMargin: 13000,
    marginPercent: 9,
    trend: 'stable',
    status: 'Watch',
    employeesAllocated: 2,
  },
  {
    id: 'pm-004',
    clientName: 'Meridian Healthcare',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Akshay Mehta',
    billingPerMonth: 320000,
    adSpend: 145000,
    teamCost: 98000,
    overheads: 32000,
    totalCost: 275000,
    grossMargin: 45000,
    marginPercent: 14.1,
    trend: 'up',
    status: 'Watch',
    employeesAllocated: 4,
  },
  {
    id: 'pm-005',
    clientName: 'UrbanNest Realty',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Priya Sharma',
    billingPerMonth: 210000,
    adSpend: 98000,
    teamCost: 70000,
    overheads: 22000,
    totalCost: 190000,
    grossMargin: 20000,
    marginPercent: 9.5,
    trend: 'stable',
    status: 'Watch',
    employeesAllocated: 2,
  },
  {
    id: 'pm-006',
    clientName: 'FreshBite Foods',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Kavita Nair',
    billingPerMonth: 175000,
    adSpend: 78000,
    teamCost: 60000,
    overheads: 18000,
    totalCost: 156000,
    grossMargin: 19000,
    marginPercent: 10.9,
    trend: 'down',
    status: 'Watch',
    employeesAllocated: 2,
  },
  {
    id: 'pm-007',
    clientName: 'Pinnacle Logistics',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Rohan Desai',
    billingPerMonth: 290000,
    adSpend: 125000,
    teamCost: 95000,
    overheads: 28000,
    totalCost: 248000,
    grossMargin: 42000,
    marginPercent: 14.5,
    trend: 'up',
    status: 'Watch',
    employeesAllocated: 3,
  },
  {
    id: 'pm-008',
    clientName: 'Luminous Textiles',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Sneha Patel',
    billingPerMonth: 225000,
    adSpend: 105000,
    teamCost: 80000,
    overheads: 25000,
    totalCost: 210000,
    grossMargin: 15000,
    marginPercent: 6.7,
    trend: 'down',
    status: 'At Risk',
    employeesAllocated: 3,
  },
  {
    id: 'pm-009',
    clientName: 'Quantum Analytics',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Akshay Mehta',
    billingPerMonth: 195000,
    adSpend: 85000,
    teamCost: 62000,
    overheads: 20000,
    totalCost: 167000,
    grossMargin: 28000,
    marginPercent: 14.4,
    trend: 'up',
    status: 'Watch',
    employeesAllocated: 2,
  },
  {
    id: 'pm-010',
    clientName: 'VortexCom Digital',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Priya Sharma',
    billingPerMonth: 165000,
    adSpend: 72000,
    teamCost: 55000,
    overheads: 17000,
    totalCost: 144000,
    grossMargin: 21000,
    marginPercent: 12.7,
    trend: 'stable',
    status: 'Watch',
    employeesAllocated: 2,
  },
  {
    id: 'pm-011',
    clientName: 'Apex Ventures',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Kavita Nair',
    billingPerMonth: 135000,
    adSpend: 58000,
    teamCost: 48000,
    overheads: 16000,
    totalCost: 122000,
    grossMargin: 13000,
    marginPercent: 9.6,
    trend: 'down',
    status: 'Watch',
    employeesAllocated: 1,
  },
  {
    id: 'pm-012',
    clientName: 'Stellar Brand Co.',
    service: 'Performance Marketing',
    hod: 'Chinmay Pawar',
    accountManager: 'Rohan Desai',
    billingPerMonth: 245000,
    adSpend: 112000,
    teamCost: 80000,
    overheads: 24000,
    totalCost: 216000,
    grossMargin: 29000,
    marginPercent: 11.8,
    trend: 'up',
    status: 'Watch',
    employeesAllocated: 3,
  },

  // Accounts & Taxation Clients (Zubear Shaikh)
  {
    id: 'at-001',
    clientName: 'Synergys Consulting',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Sneha Patel',
    billingPerMonth: 85000,
    adSpend: 0,
    teamCost: 35000,
    overheads: 12000,
    totalCost: 47000,
    grossMargin: 38000,
    marginPercent: 44.7,
    trend: 'up',
    status: 'Healthy',
    employeesAllocated: 1,
  },
  {
    id: 'at-002',
    clientName: 'Harmony Capital',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Akshay Mehta',
    billingPerMonth: 120000,
    adSpend: 0,
    teamCost: 48000,
    overheads: 16000,
    totalCost: 64000,
    grossMargin: 56000,
    marginPercent: 46.7,
    trend: 'stable',
    status: 'Healthy',
    employeesAllocated: 2,
  },
  {
    id: 'at-003',
    clientName: 'Prism Fintech',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Priya Sharma',
    billingPerMonth: 95000,
    adSpend: 0,
    teamCost: 38000,
    overheads: 13000,
    totalCost: 51000,
    grossMargin: 44000,
    marginPercent: 46.3,
    trend: 'up',
    status: 'Healthy',
    employeesAllocated: 1,
  },
  {
    id: 'at-004',
    clientName: 'Nexus Enterprises',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Kavita Nair',
    billingPerMonth: 145000,
    adSpend: 0,
    teamCost: 55000,
    overheads: 18000,
    totalCost: 73000,
    grossMargin: 72000,
    marginPercent: 49.7,
    trend: 'up',
    status: 'Healthy',
    employeesAllocated: 2,
  },
  {
    id: 'at-005',
    clientName: 'Vektor Manufacturing',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Rohan Desai',
    billingPerMonth: 75000,
    adSpend: 0,
    teamCost: 32000,
    overheads: 10000,
    totalCost: 42000,
    grossMargin: 33000,
    marginPercent: 44,
    trend: 'stable',
    status: 'Healthy',
    employeesAllocated: 1,
  },
  {
    id: 'at-006',
    clientName: 'Olympus Group',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Sneha Patel',
    billingPerMonth: 110000,
    adSpend: 0,
    teamCost: 42000,
    overheads: 14000,
    totalCost: 56000,
    grossMargin: 54000,
    marginPercent: 49.1,
    trend: 'up',
    status: 'Healthy',
    employeesAllocated: 2,
  },
  {
    id: 'at-007',
    clientName: 'Titan Industries',
    service: 'Accounts & Taxation',
    hod: 'Zubear Shaikh',
    accountManager: 'Akshay Mehta',
    billingPerMonth: 130000,
    adSpend: 0,
    teamCost: 50000,
    overheads: 16000,
    totalCost: 66000,
    grossMargin: 64000,
    marginPercent: 49.2,
    trend: 'stable',
    status: 'Healthy',
    employeesAllocated: 2,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

function formatCompactCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

function getMarginColor(marginPercent: number): string {
  if (marginPercent > 20) return 'text-emerald-600';
  if (marginPercent >= 10) return 'text-amber-600';
  return 'text-rose-600';
}

function getMarginBgColor(marginPercent: number): string {
  if (marginPercent > 20) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (marginPercent >= 10) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Healthy':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Watch':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'At Risk':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

// ============================================================================
// KPI Cards
// ============================================================================

function KPICards({ data }: { data: ClientMargin[] }) {
  const totalBilling = data.reduce((sum, c) => sum + c.billingPerMonth, 0);
  const totalCost = data.reduce((sum, c) => sum + c.totalCost, 0);
  const totalMargin = totalBilling - totalCost;
  const avgMargin = data.length > 0 ? (totalMargin / totalBilling) * 100 : 0;

  const atRiskCount = data.filter((c) => c.status === 'At Risk' || c.status === 'Watch').length;

  const bestPerformer = data.length > 0
    ? data.reduce((best, current) => (current.marginPercent > best.marginPercent ? current : best))
    : null;

  const getAvgMarginColor = () => {
    if (avgMargin > 25) return 'text-emerald-600';
    if (avgMargin >= 15) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Billing */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">
            Total Billing
          </span>
          <DollarSign className="w-4 h-4 text-black/30" />
        </div>
        <div className="text-h2 font-bold text-black">{formatCompactCurrency(totalBilling)}</div>
        <div className="text-caption text-black/45 mt-2">{data.length} clients</div>
      </div>

      {/* Avg Margin */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">
            Avg Margin
          </span>
          <Trophy className="w-4 h-4 text-black/30" />
        </div>
        <div className={`text-h2 font-bold ${getAvgMarginColor()}`}>
          {avgMargin.toFixed(1)}%
        </div>
        <div className="text-caption text-black/45 mt-2">
          {formatCompactCurrency(totalMargin)} margin
        </div>
      </div>

      {/* At Risk */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">
            Watch/Risk
          </span>
          <AlertTriangle className="w-4 h-4 text-rose-500" />
        </div>
        <div className={`text-h2 font-bold ${atRiskCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {atRiskCount}
        </div>
        <div className="text-caption text-black/45 mt-2">
          {atRiskCount > 0 ? 'require action' : 'all healthy'}
        </div>
      </div>

      {/* Best Performer */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <span className="text-caption font-semibold text-black/45 uppercase tracking-wide">
            Best Performer
          </span>
          <Trophy className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-h3 font-bold text-black truncate">
          {bestPerformer?.clientName || '—'}
        </div>
        <div className="text-caption text-black/45 mt-2">
          {bestPerformer ? `${bestPerformer.marginPercent.toFixed(1)}% margin` : 'No data'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Service Summary Cards
// ============================================================================

function ServiceCard({
  service,
  serviceLabel,
  color,
  hod,
  clients,
}: {
  service: string;
  serviceLabel: string;
  color: string;
  hod: string;
  clients: ClientMargin[];
}) {
  const totalBilling = clients.reduce((sum, c) => sum + c.billingPerMonth, 0);
  const totalCost = clients.reduce((sum, c) => sum + c.totalCost, 0);
  const totalMargin = totalBilling - totalCost;
  const marginPercent = clients.length > 0 ? (totalMargin / totalBilling) * 100 : 0;

  const healthyCount = clients.filter((c) => c.status === 'Healthy').length;
  const watchCount = clients.filter((c) => c.status === 'Watch').length;
  const riskCount = clients.filter((c) => c.status === 'At Risk').length;

  const healthyPercent = clients.length > 0 ? (healthyCount / clients.length) * 100 : 0;
  const watchPercent = clients.length > 0 ? (watchCount / clients.length) * 100 : 0;

  return (
    <div className="bg-white border border-black/[0.06] rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-6 pb-6 border-b border-black/[0.06]">
        <div className={`h-12 w-1 rounded-full`} style={{ backgroundColor: color }} />
        <div className="flex-1">
          <div className="text-h3 font-bold text-black">{serviceLabel}</div>
          <div className="text-caption text-black/45 mt-1">{hod}</div>
        </div>
        <div className="text-right">
          <div className="text-caption font-semibold text-black/45 uppercase tracking-wide">
            Clients
          </div>
          <div className="text-h3 font-bold text-black mt-1">{clients.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <div className="text-caption text-black/45 mb-1">Total Billing</div>
          <div className="text-body font-semibold text-black">
            {formatCompactCurrency(totalBilling)}
          </div>
        </div>
        <div>
          <div className="text-caption text-black/45 mb-1">Total Cost</div>
          <div className="text-body font-semibold text-black">
            {formatCompactCurrency(totalCost)}
          </div>
        </div>
        <div>
          <div className="text-caption text-black/45 mb-1">Margin</div>
          <div className={`text-body font-semibold ${getMarginColor(marginPercent)}`}>
            {marginPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-black/[0.04]">
        {healthyPercent > 0 && (
          <div
            className="bg-emerald-500 rounded-full"
            style={{ width: `${healthyPercent}%` }}
            title={`${healthyCount} Healthy`}
          />
        )}
        {watchPercent > 0 && (
          <div
            className="bg-amber-500 rounded-full"
            style={{ width: `${watchPercent}%` }}
            title={`${watchCount} Watch`}
          />
        )}
        {riskCount > 0 && (
          <div
            className="bg-rose-500 rounded-full"
            style={{ width: `${(riskCount / clients.length) * 100}%` }}
            title={`${riskCount} At Risk`}
          />
        )}
      </div>
      <div className="flex gap-3 mt-2 text-caption text-black/45">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
          {healthyCount} Healthy
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />
          {watchCount} Watch
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />
          {riskCount} Risk
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Service Filter Pills
// ============================================================================

function ServiceFilterPills({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}) {
  return (
    <div className="flex gap-2 mb-6">
      {['All', 'SEM', 'A&T'].map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={`px-4 py-2 rounded-lg text-caption font-semibold transition-all ${
            activeFilter === filter
              ? 'bg-black text-white'
              : 'bg-black/[0.04] text-black hover:bg-black/[0.08]'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Client Table
// ============================================================================

function ClientTable({
  data,
  groupByHod,
}: {
  data: ClientMargin[];
  groupByHod?: boolean;
}) {
  const sorted = [...data].sort((a, b) => b.marginPercent - a.marginPercent);

  if (!groupByHod) {
    return (
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-black/[0.02] border-b border-black/[0.06]">
              <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
                Client
              </th>
              <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
                Service
              </th>
              <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
                Billing/Mo
              </th>
              <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
                Total Cost
              </th>
              <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
                Margin
              </th>
              <th className="px-5 h-[42px] text-center text-caption font-semibold text-black/45 uppercase tracking-wide">
                Trend
              </th>
              <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((client) => (
              <tr
                key={client.id}
                className="border-b border-black/[0.04] last:border-b-0 h-[50px] hover:bg-black/[0.015] transition-colors cursor-pointer"
              >
                <td className="px-5">
                  <div className="text-body font-medium text-black">{client.clientName}</div>
                  <div className="text-caption text-black/45">{client.accountManager}</div>
                </td>
                <td className="px-5">
                  <span
                    className="inline-block px-2 py-0.5 rounded-md text-caption font-medium border"
                    style={{
                      backgroundColor:
                        client.service === 'Performance Marketing'
                          ? 'rgb(243, 232, 255)'
                          : 'rgb(207, 250, 254)',
                      color:
                        client.service === 'Performance Marketing'
                          ? 'rgb(126, 34, 206)'
                          : 'rgb(6, 182, 212)',
                      borderColor:
                        client.service === 'Performance Marketing'
                          ? 'rgb(221, 214, 254)'
                          : 'rgb(165, 243, 252)',
                    }}
                  >
                    {client.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
                  </span>
                </td>
                <td className="px-5 text-right">
                  <div className="text-body font-medium text-black">
                    {formatCompactCurrency(client.billingPerMonth)}
                  </div>
                </td>
                <td className="px-5 text-right">
                  <div className="text-body font-medium text-black">
                    {formatCompactCurrency(client.totalCost)}
                  </div>
                </td>
                <td className="px-5 text-right">
                  <div className={`text-body font-medium ${getMarginColor(client.marginPercent)}`}>
                    {formatCompactCurrency(client.grossMargin)}
                  </div>
                  <div className="text-caption text-black/45">
                    ({client.marginPercent.toFixed(1)}%)
                  </div>
                </td>
                <td className="px-5 text-center">
                  {client.trend === 'up' && (
                    <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto" />
                  )}
                  {client.trend === 'down' && (
                    <TrendingDown className="w-4 h-4 text-rose-600 mx-auto" />
                  )}
                  {client.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400 mx-auto" />}
                </td>
                <td className="px-5">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-caption font-medium border ${getStatusColor(client.status)}`}
                  >
                    {client.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Group by HOD
  const pmClients = sorted.filter((c) => c.service === 'Performance Marketing');
  const atClients = sorted.filter((c) => c.service === 'Accounts & Taxation');

  const renderGroup = (groupData: ClientMargin[], groupLabel: string) => (
    <>
      <tr className="bg-black/[0.08] h-[50px] border-b border-black/[0.06]">
        <td colSpan={7} className="px-5">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-black/45" />
            <span className="text-body font-semibold text-black">{groupLabel}</span>
            <span className="text-caption text-black/45 ml-auto">
              {groupData.length} clients • {formatCompactCurrency(groupData.reduce((sum, c) => sum + c.billingPerMonth, 0))} billing
            </span>
          </div>
        </td>
      </tr>
      {groupData.map((client) => (
        <tr
          key={client.id}
          className="border-b border-black/[0.04] last:border-b-0 h-[50px] hover:bg-black/[0.015] transition-colors cursor-pointer"
        >
          <td className="px-5">
            <div className="text-body font-medium text-black">{client.clientName}</div>
            <div className="text-caption text-black/45">{client.accountManager}</div>
          </td>
          <td className="px-5">
            <span
              className="inline-block px-2 py-0.5 rounded-md text-caption font-medium border"
              style={{
                backgroundColor:
                  client.service === 'Performance Marketing'
                    ? 'rgb(243, 232, 255)'
                    : 'rgb(207, 250, 254)',
                color:
                  client.service === 'Performance Marketing'
                    ? 'rgb(126, 34, 206)'
                    : 'rgb(6, 182, 212)',
                borderColor:
                  client.service === 'Performance Marketing'
                    ? 'rgb(221, 214, 254)'
                    : 'rgb(165, 243, 252)',
              }}
            >
              {client.service === 'Performance Marketing' ? 'SEM' : 'A&T'}
            </span>
          </td>
          <td className="px-5 text-right">
            <div className="text-body font-medium text-black">
              {formatCompactCurrency(client.billingPerMonth)}
            </div>
          </td>
          <td className="px-5 text-right">
            <div className="text-body font-medium text-black">
              {formatCompactCurrency(client.totalCost)}
            </div>
          </td>
          <td className="px-5 text-right">
            <div className={`text-body font-medium ${getMarginColor(client.marginPercent)}`}>
              {formatCompactCurrency(client.grossMargin)}
            </div>
            <div className="text-caption text-black/45">
              ({client.marginPercent.toFixed(1)}%)
            </div>
          </td>
          <td className="px-5 text-center">
            {client.trend === 'up' && (
              <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto" />
            )}
            {client.trend === 'down' && (
              <TrendingDown className="w-4 h-4 text-rose-600 mx-auto" />
            )}
            {client.trend === 'stable' && <Minus className="w-4 h-4 text-gray-400 mx-auto" />}
          </td>
          <td className="px-5">
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-caption font-medium border ${getStatusColor(client.status)}`}
            >
              {client.status}
            </span>
          </td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-black/[0.02] border-b border-black/[0.06]">
            <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
              Client
            </th>
            <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
              Service
            </th>
            <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
              Billing/Mo
            </th>
            <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
              Total Cost
            </th>
            <th className="px-5 h-[42px] text-right text-caption font-semibold text-black/45 uppercase tracking-wide">
              Margin
            </th>
            <th className="px-5 h-[42px] text-center text-caption font-semibold text-black/45 uppercase tracking-wide">
              Trend
            </th>
            <th className="px-5 h-[42px] text-left text-caption font-semibold text-black/45 uppercase tracking-wide">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {pmClients.length > 0 && renderGroup(pmClients, 'Chinmay Pawar (SEM)')}
          {atClients.length > 0 && renderGroup(atClients, 'Zubear Shaikh (A&T)')}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MarginReport() {
  const [view, setView] = useState<'service' | 'hod'>('service');
  const [serviceFilter, setServiceFilter] = useState('All');

  const filteredData = useMemo(() => {
    if (serviceFilter === 'All') return mockClients;
    if (serviceFilter === 'SEM') return mockClients.filter((c) => c.service === 'Performance Marketing');
    return mockClients.filter((c) => c.service === 'Accounts & Taxation');
  }, [serviceFilter]);

  const pmClients = mockClients.filter((c) => c.service === 'Performance Marketing');
  const atClients = mockClients.filter((c) => c.service === 'Accounts & Taxation');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-black/[0.06] bg-white/95 backdrop-blur-sm">
        <div className="px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-black">Margin Report</h1>
            <p className="text-body text-black/45 mt-1">Client-wise profitability analysis</p>
          </div>

          {/* View Toggle */}
          <div className="flex gap-1 bg-black/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setView('service')}
              className={`px-4 py-2 rounded-md text-caption font-semibold transition-all ${
                view === 'service'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/45 hover:text-black'
              }`}
            >
              By Service
            </button>
            <button
              onClick={() => setView('hod')}
              className={`px-4 py-2 rounded-md text-caption font-semibold transition-all ${
                view === 'hod'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/45 hover:text-black'
              }`}
            >
              By HOD
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* KPI Cards */}
        <KPICards data={mockClients} />

        {/* By Service View */}
        {view === 'service' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ServiceCard
                service="Performance Marketing"
                serviceLabel="SEM"
                color="#7C3AED"
                hod="Chinmay Pawar"
                clients={pmClients}
              />
              <ServiceCard
                service="Accounts & Taxation"
                serviceLabel="A&T"
                color="#06B6D4"
                hod="Zubear Shaikh"
                clients={atClients}
              />
            </div>

            <ServiceFilterPills
              activeFilter={serviceFilter}
              onFilterChange={setServiceFilter}
            />

            <ClientTable data={filteredData} groupByHod={false} />
          </>
        )}

        {/* By HOD View */}
        {view === 'hod' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ServiceCard
                service="Performance Marketing"
                serviceLabel="Chinmay Pawar"
                color="#7C3AED"
                hod="SEM Lead"
                clients={pmClients}
              />
              <ServiceCard
                service="Accounts & Taxation"
                serviceLabel="Zubear Shaikh"
                color="#06B6D4"
                hod="A&T Lead"
                clients={atClients}
              />
            </div>

            <ClientTable data={mockClients} groupByHod={true} />
          </>
        )}
      </div>
    </div>
  );
}
