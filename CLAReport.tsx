'use client';
import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, Lightbulb, TrendingUp, Shield, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceType = 'Performance Marketing' | 'Accounts & Taxation';
type Status = 'Can Be Saved' | 'Sureshot';
type Priority = 'High' | 'Medium' | 'Low';

interface CLAClient {
  client: string;
  reason: string;
  amount: number;
  status: Status;
  priority: Priority;
  date: string;
  service: ServiceType;
  month: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const allClients: CLAClient[] = [
  // January — Accounts & Taxation
  { client: 'Sleeplove', reason: 'Judgement Call', amount: 25000, status: 'Can Be Saved', priority: 'Medium', date: '15 Jan 2026', service: 'Accounts & Taxation', month: 'January' },
  { client: 'Lovlee', reason: 'Judgement Call', amount: 25000, status: 'Can Be Saved', priority: 'Medium', date: '18 Jan 2026', service: 'Accounts & Taxation', month: 'January' },
  { client: 'Arboreal BioInnovations', reason: 'Service/Customer Fit', amount: 70000, status: 'Can Be Saved', priority: 'High', date: '10 Jan 2026', service: 'Accounts & Taxation', month: 'January' },
  { client: 'Plan B (CFO)', reason: 'Judgement Call', amount: 35000, status: 'Can Be Saved', priority: 'Medium', date: '22 Jan 2026', service: 'Accounts & Taxation', month: 'January' },
  { client: 'Jensi', reason: 'Performance Issue', amount: 45000, status: 'Sureshot', priority: 'Low', date: '08 Jan 2026', service: 'Accounts & Taxation', month: 'January' },
  // January — Performance Marketing
  { client: 'Ritual Frenzy', reason: 'Service/Customer Fit', amount: 40000, status: 'Can Be Saved', priority: 'High', date: '12 Jan 2026', service: 'Performance Marketing', month: 'January' },
  { client: 'CEO Rules', reason: 'Service/Customer Fit', amount: 20000, status: 'Can Be Saved', priority: 'Medium', date: '20 Jan 2026', service: 'Performance Marketing', month: 'January' },
  { client: 'Freyja Retail', reason: 'Judgement Call', amount: 65000, status: 'Can Be Saved', priority: 'High', date: '05 Jan 2026', service: 'Performance Marketing', month: 'January' },
  // February — Accounts & Taxation
  { client: 'Wishbox', reason: 'Judgement Call', amount: 18000, status: 'Can Be Saved', priority: 'Low', date: '03 Feb 2026', service: 'Accounts & Taxation', month: 'February' },
  { client: 'Off Duty', reason: 'Going Inhouse', amount: 130000, status: 'Can Be Saved', priority: 'High', date: '07 Feb 2026', service: 'Accounts & Taxation', month: 'February' },
];

// ── Derived ────────────────────────────────────────────────────────────────────

const reasonBreakdown = allClients.reduce((acc, c) => {
  const existing = acc.find(r => r.reason === c.reason);
  if (existing) { existing.count += 1; existing.amount += c.amount; }
  else acc.push({ reason: c.reason, count: 1, amount: c.amount });
  return acc;
}, [] as { reason: string; count: number; amount: number }[]);

// ── Component ──────────────────────────────────────────────────────────────────

export function CLAReport() {
  const [selectedStatus, setSelectedStatus] = useState<'All' | Status>('All');
  const [selectedService, setSelectedService] = useState<'All' | ServiceType>('All');
  const [selectedMonth, setSelectedMonth] = useState<'All' | 'January' | 'February'>('All');
  const [expandedInsight, setExpandedInsight] = useState(false);

  // Stats
  const totalAmount = allClients.reduce((s, c) => s + c.amount, 0);
  const canBeSavedAmount = allClients.filter(c => c.status === 'Can Be Saved').reduce((s, c) => s + c.amount, 0);
  const sureshotAmount = allClients.filter(c => c.status === 'Sureshot').reduce((s, c) => s + c.amount, 0);
  const savablePct = totalAmount > 0 ? (canBeSavedAmount / totalAmount) * 100 : 0;
  const canBeSavedCount = allClients.filter(c => c.status === 'Can Be Saved').length;

  const statusData = [
    { name: 'Can Be Saved', value: canBeSavedAmount, color: '#00C875' },
    { name: 'Sureshot', value: sureshotAmount, color: '#E2445C' },
  ];

  // Filtered
  const filteredClients = allClients.filter(c => {
    if (selectedStatus !== 'All' && c.status !== selectedStatus) return false;
    if (selectedService !== 'All' && c.service !== selectedService) return false;
    if (selectedMonth !== 'All' && c.month !== selectedMonth) return false;
    return true;
  });

  const formatK = (v: number) => `₹${(v / 1000).toFixed(0)}K`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      return (
        <div className="bg-white px-3 py-2 rounded-xl shadow-lg border border-black/[0.06]">
          <p className="text-caption text-black/50 mb-0.5">{payload[0].payload.reason}</p>
          <p className="text-body font-semibold text-black/90">{formatK(payload[0].value)}</p>
          <p className="text-caption text-black/50">{payload[0].payload.count} client{payload[0].payload.count !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total At Risk', value: formatK(totalAmount), sub: `${allClients.length} clients at risk`, icon: <AlertTriangle className="w-4 h-4 text-[#FDAB3D]" />, iconBg: 'bg-[#FDAB3D]/10' },
          { label: 'Can Be Saved', value: formatK(canBeSavedAmount), sub: `${savablePct.toFixed(0)}% recoverable`, subColor: 'text-[#00C875]', icon: <CheckCircle className="w-4 h-4 text-[#00C875]" />, iconBg: 'bg-[#00C875]/10' },
          { label: 'Sureshot Loss', value: formatK(sureshotAmount), sub: `${totalAmount > 0 ? ((sureshotAmount / totalAmount) * 100).toFixed(0) : 0}% unrecoverable`, subColor: 'text-[#E2445C]', icon: <XCircle className="w-4 h-4 text-[#E2445C]" />, iconBg: 'bg-[#E2445C]/10' },
          { label: 'Recovery Target', value: String(canBeSavedCount), sub: 'Clients to save', icon: <Target className="w-4 h-4 text-[#204CC7]" />, iconBg: 'bg-[#204CC7]/10' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl p-5 border border-black/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-full ${card.iconBg} flex items-center justify-center`} aria-hidden="true">{card.icon}</div>
              <span className="text-caption font-medium text-black/55">{card.label}</span>
            </div>
            <p className="text-h1 font-semibold text-black/90">{card.value}</p>
            <div className="pt-3 mt-3 border-t border-black/[0.04]">
              <p className={`text-caption font-medium ${card.subColor || 'text-black/50'}`}>{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Risk Distribution Pie */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-5">
          <h3 className="text-body font-semibold text-black/80 mb-1">Risk Distribution</h3>
          <p className="text-caption text-black/45 mb-4">Breakdown by recovery potential</p>
          <div className="flex items-center justify-between">
            <div role="img" aria-label="Pie chart showing risk distribution between saveable and sureshot loss clients">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 ml-6 space-y-4">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-caption font-medium text-black/70">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-body font-semibold text-black/80">{formatK(s.value)}</p>
                    <p className="text-caption text-black/45">{totalAmount > 0 ? ((s.value / totalAmount) * 100).toFixed(0) : 0}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reason Breakdown Bar */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-5">
          <h3 className="text-body font-semibold text-black/80 mb-1">Risk Reasons</h3>
          <p className="text-caption text-black/45 mb-4">Why clients are at risk</p>
          <div role="img" aria-label="Bar chart showing risk reasons and amounts">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={reasonBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.04} horizontal={false} />
                <XAxis type="number" tick={{ fill: '#00000055', fontSize: 13 }} axisLine={{ stroke: '#000', strokeOpacity: 0.08 }} tickFormatter={v => formatK(v)} />
                <YAxis type="category" dataKey="reason" tick={{ fill: '#00000066', fontSize: 13 }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#FDAB3D" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* At-Risk Clients Table */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
          <h3 className="text-body font-semibold text-black/80">At-Risk Clients</h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              aria-label="Filter by status"
              className="px-3 py-2 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="All">All Status</option>
              <option value="Can Be Saved">Can Be Saved</option>
              <option value="Sureshot">Sureshot Loss</option>
            </select>

            <select
              value={selectedService}
              onChange={e => setSelectedService(e.target.value as any)}
              aria-label="Filter by service"
              className="px-3 py-2 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="All">All Services</option>
              <option value="Performance Marketing">Performance Marketing</option>
              <option value="Accounts & Taxation">Accounts & Taxation</option>
            </select>

            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value as any)}
              aria-label="Filter by month"
              className="px-3 py-2 bg-white border border-black/10 rounded-xl text-body text-black/70 focus:outline-none focus:border-[#204CC7] transition-all appearance-none cursor-pointer pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="All">All Months</option>
              <option value="January">January</option>
              <option value="February">February</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Client</th>
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Service</th>
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Reason</th>
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Priority</th>
                <th scope="col" className="px-5 py-3 text-right text-caption font-semibold text-black/55 uppercase tracking-wide">Amount</th>
                <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c, i) => (
                <tr key={i} className="border-b border-black/[0.03] last:border-0 hover:bg-black/[0.015] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-body font-medium text-black/85">{c.client}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium border ${
                      c.service === 'Performance Marketing'
                        ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20'
                        : 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/20'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${c.service === 'Performance Marketing' ? 'bg-[#7C3AED]' : 'bg-[#06B6D4]'}`} />
                      {c.service === 'Performance Marketing' ? 'PM' : 'A&T'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-body text-black/60">{c.reason}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-caption font-semibold ${
                      c.status === 'Can Be Saved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {c.status === 'Can Be Saved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-caption font-semibold ${
                      c.priority === 'High'
                        ? 'bg-rose-50 text-rose-700'
                        : c.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-body font-semibold text-black/85">₹{c.amount.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-caption text-black/50">{c.date}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredClients.length === 0 && (
            <div className="py-16 text-center">
              <AlertTriangle className="w-10 h-10 text-black/10 mx-auto mb-2" />
              <p className="text-body text-black/50">No clients match your filters</p>
              <p className="text-caption text-black/30 mt-1">Try adjusting your selection</p>
            </div>
          )}
        </div>
      </div>

      {/* Retention Intelligence */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <button
          onClick={() => setExpandedInsight(!expandedInsight)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-black/[0.01] transition-colors cursor-pointer"
          aria-expanded={expandedInsight}
          aria-controls="retention-insights"
        >
          <div className="w-8 h-8 rounded-full bg-[#FDAB3D]/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Lightbulb className="w-4 h-4 text-[#FDAB3D]" />
          </div>
          <span className="flex-1 text-left text-body font-semibold text-black/70">Retention Intelligence</span>
          <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedInsight ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {expandedInsight && (
          <div id="retention-insights" className="px-5 pb-5 border-t border-black/[0.04]">
            <div className="grid grid-cols-3 gap-5 mt-4 mb-4">
              <div>
                <p className="text-caption text-black/50 mb-1">Primary Risk Factor</p>
                <p className="text-h3 font-semibold text-[#FDAB3D]">Judgement Call</p>
                <p className="text-caption text-black/45">5 clients affected</p>
              </div>
              <div>
                <p className="text-caption text-black/50 mb-1">Highest Value At Risk</p>
                <p className="text-h3 font-semibold text-black/85">Off Duty</p>
                <p className="text-caption text-black/45">₹1.3L revenue risk</p>
              </div>
              <div>
                <p className="text-caption text-black/50 mb-1">Recovery Success Rate</p>
                <p className="text-h3 font-semibold text-[#00C875]">{savablePct.toFixed(0)}%</p>
                <p className="text-caption text-black/45">of at-risk revenue</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-caption font-medium border border-emerald-200">
                <Shield className="w-3.5 h-3.5" /> Focus on {canBeSavedCount} saveable clients
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-caption font-medium border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" /> Service/Customer Fit needs attention
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-caption font-medium border border-blue-200">
                <TrendingUp className="w-3.5 h-3.5" /> Schedule retention calls within 7 days
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
