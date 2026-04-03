'use client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { Info, ChevronDown, MoreHorizontal, Calendar, ArrowUpDown, TrendingUp, TrendingDown, Percent, ArrowUp } from 'lucide-react';
import { useState } from 'react';

/* ═══════════════════════════════════════
   DATA — realistic Brego Business numbers
═══════════════════════════════════════ */
const monthlyData = [
  { month: 'Apr', kickoff: 485000, attrition: 248861, netGrowthPct: 3.1, attritionRate: 3.2, openingBalance: 1285000, closing: 1521139 },
  { month: 'May', kickoff: 145361, attrition: 248861, netGrowthPct: -1.4, attritionRate: 3.5, openingBalance: 1521139, closing: 1417639 },
  { month: 'Jun', kickoff: 892000, attrition: 515000, netGrowthPct: 4.8, attritionRate: 6.8, openingBalance: 1417639, closing: 1794639 },
  { month: 'Jul', kickoff: 1120000, attrition: 780000, netGrowthPct: 4.2, attritionRate: 9.2, openingBalance: 1794639, closing: 2134639 },
  { month: 'Aug', kickoff: 1050000, attrition: 620000, netGrowthPct: 6.0, attritionRate: 7.5, openingBalance: 2134639, closing: 2564639 },
  { month: 'Sep', kickoff: 680000, attrition: 890000, netGrowthPct: -2.8, attritionRate: 9.8, openingBalance: 2564639, closing: 2354639 },
  { month: 'Oct', kickoff: 540000, attrition: 720000, netGrowthPct: -2.3, attritionRate: 8.5, openingBalance: 2354639, closing: 2174639 },
  { month: 'Nov', kickoff: 780000, attrition: 410000, netGrowthPct: 5.1, attritionRate: 4.8, openingBalance: 2174639, closing: 2544639 },
  { month: 'Dec', kickoff: 620000, attrition: 350000, netGrowthPct: 3.6, attritionRate: 4.2, openingBalance: 2544639, closing: 2814639 },
  { month: 'Jan', kickoff: 850000, attrition: 480000, netGrowthPct: 4.9, attritionRate: 5.4, openingBalance: 2814639, closing: 3184639 },
].map(d => ({
  ...d,
  netGrowth: d.closing - d.openingBalance,
}));

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */

/** Format number in Indian comma style: ₹5,55,555 */
function formatINR(val: number): string {
  const abs = Math.abs(Math.round(val));
  const str = abs.toString();
  if (str.length <= 3) return `₹${str}`;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

function formatLakhs(val: number): string {
  return `₹${(val / 100000).toFixed(1)}L`;
}

/* ═══════════════════════════════════════
   CHART HEADER — reusable for all chart cards
═══════════════════════════════════════ */
function ChartCardHeader({
  title,
  serviceFilter,
  onServiceChange,
  dateRange,
  onDateChange,
}: {
  title: string;
  serviceFilter: string;
  onServiceChange: (v: string) => void;
  dateRange: string;
  onDateChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-1.5">
        <h3 className="text-body font-semibold text-black/80">{title}</h3>
        <Info className="w-3.5 h-3.5 text-black/25" />
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <select
            value={serviceFilter}
            onChange={(e) => onServiceChange(e.target.value)}
            className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/60 border border-black/10 hover:border-black/20 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Service</option>
            <option value="Finance">Finance</option>
            <option value="Performance Marketing">Perf. Marketing</option>
          </select>
          <ChevronDown className="w-3 h-3 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => onDateChange(e.target.value)}
            className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/60 border border-black/10 hover:border-black/20 focus:outline-none transition-all cursor-pointer"
          >
            <option value="ytd">YTD</option>
            <option value="mtd">MTD</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
          <ChevronDown className="w-3 h-3 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        <button className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center hover:bg-black/[0.03] transition-all">
          <MoreHorizontal className="w-4 h-4 text-black/40" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   CUSTOM TOOLTIP
═══════════════════════════════════════ */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-md border border-black/5">
      <p className="text-caption font-semibold text-black/80 mb-1.5">{label}, 2025</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-caption">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
          <span className="text-black/50">{entry.name}</span>
          <span className="font-semibold text-black/80 ml-auto">{
            entry.name.includes('%') || entry.name.includes('Rate') || entry.name.includes('Growth')
              ? `${entry.value.toFixed(1)}%`
              : `₹ ${(entry.value / 1000).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
          }</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════ */
export function GrowthPLReport() {
  const [serviceFilter, setServiceFilter] = useState('all');
  const [dateRange, setDateRange] = useState('ytd');

  // KPI calculations
  const totalSales = monthlyData.reduce((s, d) => s + d.kickoff, 0);
  const totalAttritionCount = monthlyData.length > 0 ? monthlyData.reduce((s, d) => s + Math.round(d.attrition / 10000), 0) : 0;
  const avgAttritionRate = (monthlyData.reduce((s, d) => s + d.attritionRate, 0) / monthlyData.length);
  const salesGrowth = 12.5;
  const attritionGrowth = 8.3;

  // Shared axis config
  const axisStyle = { fill: '#00000050', fontSize: 11, fontFamily: 'Manrope' };
  const gridProps = { strokeDasharray: '3 3', stroke: '#000', strokeOpacity: 0.04, vertical: false };

  return (
    <div className="space-y-7">

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-3 gap-5">

        {/* Total Sales */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-semibold text-black/70">Total Sales</span>
            <Info className="w-3.5 h-3.5 text-black/20" />
          </div>
          <div className="text-h1 font-bold text-black/90 mb-1.5">{formatLakhs(totalSales)}</div>
          <div className="flex items-center gap-1 mb-4">
            <ArrowUp className="w-3 h-3 text-emerald-500" />
            <span className="text-caption font-semibold text-emerald-500">{salesGrowth}%</span>
            <span className="text-caption text-black/40 ml-0.5">vs last month</span>
          </div>
          <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden flex">
            <div className="bg-orange-500 rounded-l-full" style={{ width: '35%' }} />
            <div className="bg-blue-600" style={{ width: '65%' }} />
          </div>
        </div>

        {/* Total Attrition */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-semibold text-black/70">Total Attrition</span>
            <Info className="w-3.5 h-3.5 text-black/20" />
          </div>
          <div className="text-h1 font-bold text-black/90 mb-1.5">{totalAttritionCount}</div>
          <div className="flex items-center gap-1 mb-4">
            <ArrowUp className="w-3 h-3 text-emerald-500" />
            <span className="text-caption font-semibold text-emerald-500">{attritionGrowth}%</span>
            <span className="text-caption text-black/40 ml-0.5">vs last month</span>
          </div>
          <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden flex">
            <div className="bg-orange-500 rounded-l-full" style={{ width: '42%' }} />
            <div className="bg-blue-600" style={{ width: '58%' }} />
          </div>
        </div>

        {/* Avg. Attrition Rate */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-semibold text-black/70">Avg. Attrition Rate</span>
            <Info className="w-3.5 h-3.5 text-black/20" />
          </div>
          <div className="text-h1 font-bold text-black/90 mb-1.5">{avgAttritionRate.toFixed(1)}%</div>
          <div className="flex items-center gap-1 mb-4">
            <ArrowUp className="w-3 h-3 text-emerald-500" />
            <span className="text-caption font-semibold text-emerald-500">2.1%</span>
            <span className="text-caption text-black/40 ml-0.5">vs last month</span>
          </div>
          <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden flex">
            <div className="bg-orange-500 rounded-l-full" style={{ width: '38%' }} />
            <div className="bg-blue-600" style={{ width: '62%' }} />
          </div>
        </div>
      </div>

      {/* ═══ REVENUE GROWTH TREND — full width ═══ */}
      <div className="bg-white rounded-xl p-6 border border-black/5">
        <ChartCardHeader
          title="Revenue Growth Trend"
          serviceFilter={serviceFilter}
          onServiceChange={setServiceFilter}
          dateRange={dateRange}
          onDateChange={setDateRange}
        />
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradKickoff" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAttrition" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: '#000', strokeOpacity: 0.06 }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, fontFamily: 'Manrope', color: '#71717A' }}
            />
            <Area
              type="monotone"
              dataKey="kickoff"
              name="Kickoff"
              stroke="#2563EB"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#gradKickoff)"
              dot={{ fill: '#2563EB', stroke: '#fff', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="attrition"
              name="Attrition"
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="6 4"
              fillOpacity={1}
              fill="url(#gradAttrition)"
              dot={{ fill: '#EF4444', stroke: '#fff', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ═══ NET GROWTH + ATTRITION RATE — 2-column ═══ */}
      <div className="grid grid-cols-2 gap-5">

        {/* Net Growth Trend */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <ChartCardHeader
            title="Net Growth Trend"
            serviceFilter={serviceFilter}
            onServiceChange={setServiceFilter}
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: '#000', strokeOpacity: 0.06 }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[-10, 10]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="netGrowthPct" name="Net Growth" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {monthlyData.map((entry, i) => (
                  <Cell key={i} fill={entry.netGrowthPct >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attrition Rate Trend */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <ChartCardHeader
            title="Attrition Rate Trend"
            serviceFilter={serviceFilter}
            onServiceChange={setServiceFilter}
            dateRange={dateRange}
            onDateChange={setDateRange}
          />
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: '#000', strokeOpacity: 0.06 }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 12]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="attritionRate"
                name="Attrition Rate"
                stroke="#EF4444"
                strokeWidth={2.5}
                dot={{ fill: '#EF4444', stroke: '#fff', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ MONTHLY PERFORMANCE TABLE ═══ */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h3 className="text-body font-semibold text-black/80">Monthly Performance</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-lg text-caption font-medium text-black/60 border border-black/10 hover:border-black/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="all">All Service</option>
                <option value="Finance">Finance</option>
                <option value="Performance Marketing">Perf. Marketing</option>
              </select>
              <ChevronDown className="w-3 h-3 text-black/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button className="flex items-center gap-1.5 pl-3 pr-3 py-1.5 rounded-lg text-caption font-medium text-black/60 border border-black/10 hover:border-black/20 transition-all">
              <Calendar className="w-3.5 h-3.5" />
              This Year
            </button>
            <button className="w-8 h-8 rounded-lg border border-black/10 flex items-center justify-center hover:bg-black/[0.03] transition-all">
              <MoreHorizontal className="w-4 h-4 text-black/40" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EFF6FF]">
                {[
                  'Month',
                  'Opening balance',
                  'Kickoff',
                  'Attrition',
                  'Attrition (%)',
                  'Closing',
                  'Net Growth',
                  'Net Growth (%)',
                ].map((col, i) => (
                  <th key={col} className={`px-5 py-3 text-caption font-semibold text-blue-700 whitespace-nowrap ${i === 0 ? 'text-left' : 'text-left'}`}>
                    <div className="flex items-center gap-1">
                      {col}
                      {i > 0 && (
                        <>
                          <Info className="w-3 h-3 text-blue-400" />
                          <ArrowUpDown className="w-3 h-3 text-blue-400" />
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, idx) => (
                <tr key={idx} className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors">
                  <td className="px-5 py-3.5 text-body font-medium text-black/70">{row.month}</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{formatINR(row.openingBalance)}</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{formatINR(row.kickoff)}</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{formatINR(row.attrition)}</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{row.attritionRate.toFixed(1)}%</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{formatINR(row.closing)}</td>
                  <td className="px-5 py-3.5 text-body text-black/60">{formatINR(row.netGrowth)}</td>
                  <td className={`px-5 py-3.5 text-body font-medium ${row.netGrowthPct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {row.netGrowthPct >= 0 ? '+' : ''}{row.netGrowthPct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
