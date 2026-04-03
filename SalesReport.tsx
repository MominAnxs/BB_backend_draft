'use client';
import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Target, ChevronDown, Lightbulb, DollarSign, PhoneCall, FileText, CheckCircle2, TrendingDown, Award } from 'lucide-react';

type TimeFilter = 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';
type MonthFilter = 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export function SalesReport() {
  const [pipelineFilter, setPipelineFilter] = useState<TimeFilter>('ytd');
  const [salesPersonMonth, setSalesPersonMonth] = useState<MonthFilter>('December');
  const [funnelMonth, setFunnelMonth] = useState<MonthFilter>('December');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Hooshang's Pipeline Data
  const hooshangPipelineData = {
    month: [
      { metric: 'Meetings Done', value: 33, percentage: 58, dailyAvg: 4, ytd: 117, ytdPercentage: 73 },
      { metric: 'Proposals Sent', value: 9, percentage: 27, dailyAvg: 1, ytd: 57, ytdPercentage: 49 },
      { metric: 'Proposal Value', value: 375000, percentage: null, dailyAvg: 41667, ytd: 2830000, ytdPercentage: null },
      { metric: 'Closures', value: 8, percentage: 89, dailyAvg: 1, ytd: 29, ytdPercentage: 51 },
      { metric: 'Closures Value', value: 390000, percentage: null, dailyAvg: 43333, ytd: 1608500, ytdPercentage: null },
    ],
  };

  // Sales Person Closures Data
  const salesPersonData = [
    { name: 'Hooshang', amount: 60000 },
    { name: 'Shubham', amount: 75000 },
    { name: 'Arnold', amount: 255000 },
    { name: 'OTS', amount: 0 },
  ];

  const serviceBreakdownData = [
    { name: 'SMM', amount: 0 },
    { name: 'SEM', amount: 230000 },
    { name: 'Finance', amount: 160000 },
  ];

  // Monthly Funnel Data
  const funnelData = [
    { stage: 'Meeting Done', SMM: 0, SEM: 300000, Finance: 210000, total: 510000 },
    { stage: 'Proposal Chatting', SMM: 0, SEM: 364000, Finance: 160000, total: 524000 },
    { stage: 'Proposal Hot', SMM: 0, SEM: 50000, Finance: 25000, total: 75000 },
    { stage: '90% (Closure)', SMM: 0, SEM: 0, Finance: 0, total: 0 },
  ];

  // Visualization data for funnel
  const funnelVisualizationData = [
    { name: 'Meeting Done', value: 510000 },
    { name: 'Proposal Chatting', value: 524000 },
    { name: 'Proposal Hot', value: 75000 },
    { name: 'Closure (90%)', value: 0 },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const totalClosures = salesPersonData.reduce((sum, p) => sum + p.amount, 0);
  const totalServiceRevenue = serviceBreakdownData.reduce((sum, s) => sum + s.amount, 0);
  const activeSalesPeople = salesPersonData.filter(p => p.amount > 0).length;
  const conversionRate = hooshangPipelineData.month.find(m => m.metric === 'Closures')?.percentage || 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
          <p className="text-xs text-black/60 mb-1">{payload[0].payload.name || payload[0].name}</p>
          <p className="text-sm font-medium text-black/90">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black/90">Sales Reports</h2>
          <p className="text-sm text-black/65 mt-1">Track pipeline, performance, and revenue metrics</p>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-5">
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-black/60">Total Revenue</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(totalClosures / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-emerald-600 font-medium">December closures</p>
          </div>
        </div>

        {/* Active Sales Team */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-black/60">Active Team</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">{activeSalesPeople}</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-black/65">Sales executives</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-xs font-medium text-black/60">Conversion Rate</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">{conversionRate}%</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-violet-600 font-medium">Meeting to closure</p>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-black/60">Pipeline Value</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(funnelVisualizationData[0].value / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-black/65">In active deals</p>
          </div>
        </div>
      </div>

      {/* Hooshang's Pipeline Section */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-black/70">Hooshang's Pipeline</h3>
              <p className="text-xs text-black/60 mt-0.5">Sales Head Performance Tracking</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value as TimeFilter)}
              className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
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
            <ChevronDown className="w-3.5 h-3.5 text-black/60 -ml-7 pointer-events-none" />
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-6 py-3 text-left text-black/65 text-xs font-medium">Metric</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">December</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">%</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">Daily Avg</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">YTD</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {hooshangPipelineData.month.map((item, index) => (
                <tr key={index} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-xs font-medium text-black/90">{item.metric}</td>
                  <td className="px-6 py-3.5 text-right text-sm font-medium text-black/90">
                    {item.metric.includes('Value') ? formatCurrency(item.value) : item.value}
                  </td>
                  <td className="px-6 py-3.5 text-right text-xs text-black/60">
                    {item.percentage ? `${item.percentage}%` : '-'}
                  </td>
                  <td className="px-6 py-3.5 text-right text-xs text-black/60">
                    {item.metric.includes('Value') ? formatCurrency(item.dailyAvg) : item.dailyAvg}
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-medium text-black/90">
                    {item.metric.includes('Value') ? formatCurrency(item.ytd) : item.ytd}
                  </td>
                  <td className="px-6 py-3.5 text-right text-xs text-black/60">
                    {item.ytdPercentage ? `${item.ytdPercentage}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pipeline Visualizations */}
      <div className="grid grid-cols-2 gap-5">
        {/* Performance Metrics Chart */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-black/70">Performance Metrics</h3>
            <p className="text-xs text-black/60 mt-1">Count-based pipeline activities</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hooshangPipelineData.month.filter(d => !d.metric.includes('Value'))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
              <XAxis 
                dataKey="metric" 
                angle={-15} 
                textAnchor="end" 
                height={80} 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 10 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" name="December" radius={[8, 8, 0, 0]} />
              <Bar dataKey="ytd" fill="#93c5fd" name="YTD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Value Metrics Chart */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-black/70">Value Metrics</h3>
            <p className="text-xs text-black/60 mt-1">Revenue-based pipeline value</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hooshangPipelineData.month.filter(d => d.metric.includes('Value'))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
              <XAxis 
                dataKey="metric" 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 10 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#10b981" name="December" radius={[8, 8, 0, 0]} />
              <Bar dataKey="ytd" fill="#86efac" name="YTD" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Person Performance Section */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-black/70">Sales Team Performance</h3>
              <p className="text-xs text-black/60 mt-0.5">Individual closures & service breakdown</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={salesPersonMonth}
              onChange={(e) => setSalesPersonMonth(e.target.value as MonthFilter)}
              className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
            >
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/60 -ml-7 pointer-events-none" />
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Sales Person Table */}
          <div>
            <h4 className="text-xs font-semibold text-black/60 mb-3">Closure by Sales Person</h4>
            <div className="overflow-hidden rounded-xl border border-black/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-[#F6F7FF]">
                    <th className="px-4 py-2.5 text-left text-black/65 text-xs font-medium">Sales Person</th>
                    <th className="px-4 py-2.5 text-right text-black/65 text-xs font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPersonData.map((person, index) => (
                    <tr key={index} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-xs text-black/90">{person.name}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-medium text-black/90">
                        {formatCurrency(person.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td className="px-4 py-2.5 text-xs font-semibold text-emerald-900">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-900">
                      {formatCurrency(totalClosures)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Breakdown Table */}
          <div>
            <h4 className="text-xs font-semibold text-black/60 mb-3">Closure by Service</h4>
            <div className="overflow-hidden rounded-xl border border-black/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-[#F6F7FF]">
                    <th className="px-4 py-2.5 text-left text-black/65 text-xs font-medium">Service</th>
                    <th className="px-4 py-2.5 text-right text-black/65 text-xs font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceBreakdownData.map((service, index) => (
                    <tr key={index} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors">
                      <td className="px-4 py-2.5 text-xs text-black/90">{service.name}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-medium text-black/90">
                        {formatCurrency(service.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td className="px-4 py-2.5 text-xs font-semibold text-emerald-900">Total</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-900">
                      {formatCurrency(totalServiceRevenue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-2 gap-5">
        {/* Sales Person Performance Chart */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-black/70">Sales Person Performance</h3>
            <p className="text-xs text-black/60 mt-1">Individual contribution comparison</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesPersonData.filter(p => p.amount > 0)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} horizontal={false} />
              <XAxis 
                type="number" 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80} 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution Chart */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-black/70">Service Distribution</h3>
              <p className="text-xs text-black/60 mt-1">Revenue breakdown by service line</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-black/60">Total</p>
              <p className="text-lg font-semibold text-black/90">{formatCurrency(totalServiceRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="45%" height={200}>
              <PieChart>
                <Pie
                  data={serviceBreakdownData.filter(s => s.amount > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {serviceBreakdownData.filter(s => s.amount > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {serviceBreakdownData.filter(s => s.amount > 0).map((service, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs text-black/70">{service.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-black/90">{formatCurrency(service.amount)}</p>
                    <p className="text-xs text-black/40">{((service.amount / totalServiceRevenue) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Funnel Section */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-black/70">Sales Funnel</h3>
              <p className="text-xs text-black/60 mt-0.5">Deal stages & pipeline progression</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={funnelMonth}
              onChange={(e) => setFunnelMonth(e.target.value as MonthFilter)}
              className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
            >
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/60 -ml-7 pointer-events-none" />
          </div>
        </div>

        {/* Funnel Stage Cards */}
        <div className="grid grid-cols-4 gap-5 p-6">
          {/* 90% Closure */}
          <div className="rounded-xl border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5">
              <h4 className="text-xs font-semibold text-white">90% (Closure)</h4>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SMM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === '90% (Closure)')?.SMM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SEM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === '90% (Closure)')?.SEM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">Finance</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === '90% (Closure)')?.Finance || 0)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <span className="text-xs font-semibold text-emerald-900">Total</span>
                <span className="text-xs font-semibold text-emerald-900">{formatCurrency(funnelData.find(f => f.stage === '90% (Closure)')?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Proposal Hot */}
          <div className="rounded-xl border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5">
              <h4 className="text-xs font-semibold text-white">Proposal Hot</h4>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SMM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Hot')?.SMM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SEM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Hot')?.SEM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">Finance</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Hot')?.Finance || 0)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <span className="text-xs font-semibold text-amber-900">Total</span>
                <span className="text-xs font-semibold text-amber-900">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Hot')?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Proposal Chatting */}
          <div className="rounded-xl border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5">
              <h4 className="text-xs font-semibold text-white">Proposal Chatting</h4>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SMM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Chatting')?.SMM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SEM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Chatting')?.SEM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">Finance</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Chatting')?.Finance || 0)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <span className="text-xs font-semibold text-blue-900">Total</span>
                <span className="text-xs font-semibold text-blue-900">{formatCurrency(funnelData.find(f => f.stage === 'Proposal Chatting')?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* Meeting Done */}
          <div className="rounded-xl border border-black/5 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-2.5">
              <h4 className="text-xs font-semibold text-white">Meeting Done</h4>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SMM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Meeting Done')?.SMM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">SEM</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Meeting Done')?.SEM || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-black/65">Finance</span>
                <span className="text-xs font-medium text-black/90">{formatCurrency(funnelData.find(f => f.stage === 'Meeting Done')?.Finance || 0)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-black/5">
                <span className="text-xs font-semibold text-violet-900">Total</span>
                <span className="text-xs font-semibold text-violet-900">{formatCurrency(funnelData.find(f => f.stage === 'Meeting Done')?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Insights */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <button
          onClick={() => setExpandedInsight(expandedInsight === 'section' ? null : 'section')}
          className="w-full flex items-center gap-3 p-6 hover:bg-black/[0.005] transition-colors cursor-pointer"
          aria-expanded={expandedInsight === 'section'}
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="flex-1 text-left text-black/70" style={{ fontSize: '13px', fontWeight: 600 }}>Sales Intelligence</h4>
          <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedInsight === 'section' ? 'rotate-180' : ''}`} />
        </button>
        {expandedInsight === 'section' && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="grid grid-cols-3 gap-5 mt-4 mb-3">
              <div>
                <p className="text-xs text-black/65 mb-1">Top Performer</p>
                <p className="text-lg font-semibold text-black/90">Arnold</p>
                <p className="text-xs text-emerald-600">₹255K closed</p>
              </div>
              <div>
                <p className="text-xs text-black/65 mb-1">Best Service Line</p>
                <p className="text-lg font-semibold text-black/90">SEM</p>
                <p className="text-xs text-blue-600">₹230K revenue</p>
              </div>
              <div>
                <p className="text-xs text-black/65 mb-1">Active Pipeline</p>
                <p className="text-lg font-semibold text-black/90">₹1.11M</p>
                <p className="text-xs text-black/60">Across all stages</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-200">
                <Award className="w-3 h-3" /> Arnold leads with 65% of total closures
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-200">
                <TrendingUp className="w-3 h-3" /> SEM dominates with 59% service mix
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 text-violet-700 rounded-md text-[10px] font-medium border border-violet-200">
                <Target className="w-3 h-3" /> 89% conversion rate on December closures
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-medium border border-amber-200">
                <PhoneCall className="w-3 h-3" /> 33 meetings completed this month
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}