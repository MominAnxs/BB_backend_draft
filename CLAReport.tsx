'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, DollarSign, ChevronDown, Lightbulb, TrendingUp, Shield, Target, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const claData = {
  january: {
    finance: [
      { client: 'Sleeplove', reason: 'Judgement Call', amount: 25000, status: 'Can Be Saved', priority: 'Medium', date: '15 Jan 2026' },
      { client: 'Lovlee', reason: 'Judgement Call', amount: 25000, status: 'Can Be Saved', priority: 'Medium', date: '18 Jan 2026' },
      { client: 'Arboreal BioInnovations', reason: 'Service/ Customer Fit', amount: 70000, status: 'Can Be Saved', priority: 'High', date: '10 Jan 2026' },
      { client: 'Plan B (CFO)', reason: 'Judgement Call', amount: 35000, status: 'Can Be Saved', priority: 'Medium', date: '22 Jan 2026' },
      { client: 'Jensi', reason: 'Performance Issue', amount: 45000, status: 'Sureshot', priority: 'Low', date: '08 Jan 2026' },
    ],
    performanceMarketing: [
      { client: 'Ritual Frenzy', reason: 'Service/ Customer Fit', amount: 40000, status: 'Can Be Saved', priority: 'High', date: '12 Jan 2026' },
      { client: 'CEO Rules', reason: 'Service/ Customer Fit', amount: 20000, status: 'Can Be Saved', priority: 'Medium', date: '20 Jan 2026' },
      { client: 'Freyja Retail', reason: 'Judgement Call', amount: 65000, status: 'Can Be Saved', priority: 'High', date: '05 Jan 2026' },
    ],
  },
  february: {
    finance: [
      { client: 'Wishbox', reason: 'Judgement Call', amount: 18000, status: 'Can Be Saved', priority: 'Low', date: '03 Feb 2026' },
      { client: 'Off Duty', reason: 'Going Inhouse', amount: 130000, status: 'Can Be Saved', priority: 'High', date: '07 Feb 2026' },
    ],
  },
};

// Flatten all clients for easier filtering
const allClients = [
  ...claData.january.finance.map(c => ({ ...c, month: 'January', service: 'Finance' })),
  ...claData.january.performanceMarketing.map(c => ({ ...c, month: 'January', service: 'Performance Marketing' })),
  ...claData.february.finance.map(c => ({ ...c, month: 'February', service: 'Finance' })),
];

// Calculate reason breakdown
const reasonBreakdown = allClients.reduce((acc, client) => {
  const existing = acc.find(r => r.reason === client.reason);
  if (existing) {
    existing.count += 1;
    existing.amount += client.amount;
  } else {
    acc.push({ reason: client.reason, count: 1, amount: client.amount });
  }
  return acc;
}, [] as Array<{ reason: string; count: number; amount: number }>);

const COLORS = {
  'Can Be Saved': '#10b981',
  'Sureshot': '#ef4444',
};

export function CLAReport() {
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Can Be Saved' | 'Sureshot'>('All');
  const [selectedService, setSelectedService] = useState<'All' | 'Finance' | 'Performance Marketing'>('All');
  const [selectedMonth, setSelectedMonth] = useState<'All' | 'January' | 'February'>('All');
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const calculateTotal = () => {
    let total = 0;
    Object.values(claData).forEach(month => {
      Object.values(month).forEach(service => {
        service.forEach(client => total += client.amount);
      });
    });
    return total;
  };

  const calculateByStatus = (status: string) => {
    let total = 0;
    Object.values(claData).forEach(month => {
      Object.values(month).forEach(service => {
        service.forEach(client => {
          if (client.status === status) total += client.amount;
        });
      });
    });
    return total;
  };

  const totalAtRisk = calculateTotal();
  const canBeSaved = calculateByStatus('Can Be Saved');
  const sureshot = calculateByStatus('Sureshot');
  const savablePercentage = (canBeSaved / totalAtRisk) * 100;

  // Prepare status distribution data for pie chart
  const statusData = [
    { name: 'Can Be Saved', value: canBeSaved, color: '#10b981' },
    { name: 'Sureshot', value: sureshot, color: '#ef4444' },
  ];

  // Filter clients based on selected filters
  const filteredClients = allClients.filter(client => {
    if (selectedStatus !== 'All' && client.status !== selectedStatus) return false;
    if (selectedService !== 'All' && client.service !== selectedService) return false;
    if (selectedMonth !== 'All' && client.month !== selectedMonth) return false;
    return true;
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
          <p className="text-xs text-black/60 mb-1">{payload[0].payload.reason}</p>
          <p className="text-sm font-medium text-black/90">₹{(payload[0].value / 1000).toFixed(0)}K</p>
          <p className="text-xs text-black/65">{payload[0].payload.count} clients</p>
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
          <h2 className="text-black/90" style={{ fontSize: '20px', fontWeight: 700 }}>Client Loss Alerts (CLA)</h2>
          <p className="text-black/65 mt-1" style={{ fontSize: '14px' }}>Monitor at-risk clients and take action to prevent churn</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-black/60" aria-hidden="true" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value as any)}
            className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-full text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
          >
            <option value="All">All Months</option>
            <option value="January">January 2026</option>
            <option value="February">February 2026</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-black/60 -ml-7 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-5">
        {/* Total At Risk */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Total At Risk</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(totalAtRisk / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-black/65" style={{ fontSize: '13px' }}>{allClients.length} clients at risk</p>
          </div>
        </div>

        {/* Can Be Saved */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Can Be Saved</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(canBeSaved / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-emerald-600 font-medium">{savablePercentage.toFixed(1)}% recoverable</p>
          </div>
        </div>

        {/* Sureshot Loss */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Sureshot Loss</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(sureshot / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-xs text-rose-600 font-medium">{((sureshot / totalAtRisk) * 100).toFixed(1)}% unrecoverable</p>
          </div>
        </div>

        {/* Recovery Target */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Recovery Target</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">{allClients.filter(c => c.status === 'Can Be Saved').length}</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-black/65" style={{ fontSize: '13px' }}>Clients to save</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-5">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Risk Distribution</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Breakdown by recovery potential</p>
          </div>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="45%" height={180}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4">
              {statusData.map((status, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-xs text-black/70">{status.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-black/90">₹{(status.value / 1000).toFixed(0)}K</p>
                    <p className="text-black/60" style={{ fontSize: '13px' }}>{((status.value / totalAtRisk) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reason Breakdown */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Risk Reasons</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Why clients are at risk</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={reasonBreakdown} layout="vertical">
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
                type="category" 
                dataKey="reason" 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#F59E0B" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* At-Risk Clients Table */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {/* Table Header with Filters */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-black/70">At-Risk Clients</h3>
          
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Can Be Saved">Can Be Saved</option>
                <option value="Sureshot">Sureshot Loss</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Service Filter */}
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as any)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
              >
                <option value="All">All Service</option>
                <option value="Finance">Finance</option>
                <option value="Performance Marketing">Performance Marketing</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* More Options */}
            <button className="p-1.5 hover:bg-black/5 rounded-lg transition-all">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="3" r="1.5" fill="currentColor" className="text-black/60"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor" className="text-black/60"/>
                <circle cx="8" cy="13" r="1.5" fill="currentColor" className="text-black/60"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-6 py-3 text-left text-black/65 text-xs font-medium">Date</th>
                <th className="px-6 py-3 text-left text-black/65 text-xs font-medium">Client</th>
                <th className="px-6 py-3 text-left text-black/65 text-xs font-medium">Service</th>
                <th className="px-6 py-3 text-left text-black/65 text-xs font-medium">Reason</th>
                <th className="px-6 py-3 text-center text-black/65 text-xs font-medium">Status</th>
                <th className="px-6 py-3 text-center text-black/65 text-xs font-medium">Priority</th>
                <th className="px-6 py-3 text-right text-black/65 text-xs font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-black/5 last:border-0 hover:bg-black/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5 text-xs text-black/60">{client.date}</td>
                  <td className="px-6 py-3.5 text-xs text-black/90">{client.client}</td>
                  <td className="px-6 py-3.5 text-xs text-black/60">{client.service}</td>
                  <td className="px-6 py-3.5 text-xs text-black/60">{client.reason}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      client.status === 'Can Be Saved' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium ${
                      client.priority === 'High' 
                        ? 'bg-rose-50 text-rose-700' 
                        : client.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {client.priority}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-medium text-black/90">₹{client.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <h4 className="flex-1 text-left text-black/70" style={{ fontSize: '13px', fontWeight: 600 }}>Retention Intelligence</h4>
          <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedInsight === 'section' ? 'rotate-180' : ''}`} />
        </button>
        {expandedInsight === 'section' && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="grid grid-cols-3 gap-5 mt-4 mb-3">
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Primary Risk Factor</p>
                <p className="text-lg font-semibold text-orange-600">Judgement Call</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>5 clients affected</p>
              </div>
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Highest Value At Risk</p>
                <p className="text-lg font-semibold text-black/90">Off Duty</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>₹130K revenue risk</p>
              </div>
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Recovery Success Rate</p>
                <p className="text-lg font-semibold text-emerald-600">{savablePercentage.toFixed(0)}%</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>of at-risk revenue</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-200">
                <Shield className="w-3 h-3" /> Focus on 9 high-priority "Can Be Saved" clients
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-medium border border-amber-200">
                <AlertTriangle className="w-3 h-3" /> Service/Customer Fit issues need immediate attention
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-200">
                <TrendingUp className="w-3 h-3" /> Schedule retention calls within 7 days
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-medium border border-rose-200">
                <XCircle className="w-3 h-3" /> Performance issues causing ₹45K sureshot loss
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}