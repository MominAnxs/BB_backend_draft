'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Users, DollarSign, Calendar, ChevronDown, AlertCircle, TrendingUp, Lightbulb, ArrowUp, ArrowDown, CheckCircle, XCircle, ChevronRight, Building2, Briefcase } from 'lucide-react';


const monthlyData = [
  { month: 'Apr', amount: 393168, clients: 4, rate: 5.8 },
  { month: 'May', amount: 270608, clients: 3, rate: 4.2 },
  { month: 'Jun', amount: 577450, clients: 6, rate: 8.1 },
  { month: 'Jul', amount: 218250, clients: 2, rate: 3.1 },
  { month: 'Aug', amount: 315750, clients: 4, rate: 4.5 },
  { month: 'Sep', amount: 738500, clients: 7, rate: 9.8 },
  { month: 'Oct', amount: 739000, clients: 7, rate: 9.5 },
  { month: 'Nov', amount: 591000, clients: 6, rate: 7.8 },
  { month: 'Dec', amount: 258500, clients: 8, rate: 3.4 },
  { month: 'Jan', amount: 231500, clients: 7, rate: 3.1 },
];

const serviceData = [
  { service: 'A&T', amount: 306500, clients: 10, color: '#06B6D4' },
  { service: 'SEM', amount: 170000, clients: 7, color: '#7C3AED' },
];

const reasonData = [
  { reason: 'Moving In-house', count: 6, amount: 226500, percentage: 38.5, color: '#ef4444' },
  { reason: 'Downsell', count: 4, amount: 78500, percentage: 28.6, color: '#f97316' },
  { reason: 'Client Fund Issue', count: 3, amount: 130000, percentage: 21.4, color: '#f59e0b' },
  { reason: 'Service/Customer Fit', count: 1, amount: 20000, percentage: 7.1, color: '#84cc16' },
  { reason: 'Client Unhappy', count: 1, amount: 50000, percentage: 7.1, color: '#10b981' },
];

const decemberClients = [
  { service: 'A&T', client: 'Human Method', reason: 'Client Fund Issue', amount: 60000, status: 'Pending', monthsActive: 12 },
  { service: 'A&T', client: 'Priya Enterprises', reason: 'Moving In-house', amount: 40000, status: 'Pending', monthsActive: 8 },
  { service: 'A&T', client: 'NexGen Solutions', reason: 'Downsell', amount: 35000, status: 'NA', monthsActive: 6 },
  { service: 'A&T', client: 'Chemistry Design Pvt Ltd', reason: 'Downsell', amount: 35500, status: 'NA', monthsActive: 14 },
  { service: 'A&T', client: 'Velvet Interiors', reason: 'Business Shuts Down', amount: 17000, status: 'Pending', monthsActive: 4 },
  { service: 'A&T', client: 'Very Casual Foods LLP', reason: 'Downsell', amount: 3000, status: 'NA', monthsActive: 3 },
  { service: 'SEM', client: 'Baubaa Designs', reason: 'Client Fund Issue', amount: 20000, status: 'NA', monthsActive: 5 },
  { service: 'SEM', client: 'Scarlet Thread', reason: 'Client Fund Issue', amount: 50000, status: 'Pending', monthsActive: 9 },
];

const januaryClients = [
  { service: 'A&T', client: 'MISHO FOODS - COAST & BLOOM', reason: 'Moving In-house', amount: 60000, status: 'Pending', monthsActive: 18 },
  { service: 'A&T', client: 'ECOMART (KO Vitality)', reason: 'Downsell', amount: 5000, status: 'NA', monthsActive: 7 },
  { service: 'A&T', client: 'Econstruct Design and Build Pvt Ltd', reason: 'Moving In-house', amount: 15500, status: 'Pending', monthsActive: 11 },
  { service: 'A&T', client: 'Jivika Naturals (HEALTHY HONEST FOODS)', reason: 'Moving In-house', amount: 70000, status: 'Pending', monthsActive: 16 },
  { service: 'A&T', client: 'Purple 9 Seating Solutions', reason: 'Moving In-house', amount: 11000, status: 'Pending', monthsActive: 8 },
  { service: 'SEM', client: 'Sathom Hospitality Pvt Ltd (KO A6)', reason: 'Service/Customer Fit', amount: 20000, status: 'Pending', monthsActive: 4 },
  { service: 'A&T', client: 'Shivkham living', reason: 'Client Unhappy', amount: 50000, status: 'NA', monthsActive: 13 },
];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];

export function AttritionReport() {
  const [dateRange, setDateRange] = useState<'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4'>('ytd');
  const [selectedService, setSelectedService] = useState<'All' | 'A&T' | 'SEM'>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<'This Year' | 'Last 6 Months' | 'All Time'>('This Year');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({ 'January 2026': true });
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  // Helper functions
  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;
  
  const getReasonColor = (reason: string) => {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('fund') || lowerReason.includes('downsell')) return 'bg-amber-50 text-amber-700';
    if (lowerReason.includes('inhouse')) return 'bg-blue-50 text-blue-700';
    if (lowerReason.includes('unhappy')) return 'bg-rose-50 text-rose-700';
    return 'bg-gray-50 text-gray-700';
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Group clients by month and service
  const allClients = [
    ...januaryClients.map(c => ({ ...c, month: 'January 2026', monthKey: '2026-01' })),
    ...decemberClients.map(c => ({ ...c, month: 'December 2025', monthKey: '2025-12' }))
  ];

  const groupedData = allClients.reduce((acc, client) => {
    const monthKey = client.month;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthLabel: client.month,
        services: {},
        totalClients: 0,
        totalBilling: 0,
      };
    }
    
    if (!acc[monthKey].services[client.service]) {
      acc[monthKey].services[client.service] = {
        clients: [],
        totalClients: 0,
        totalBilling: 0,
      };
    }
    
    acc[monthKey].services[client.service].clients.push(client);
    acc[monthKey].services[client.service].totalClients++;
    acc[monthKey].services[client.service].totalBilling += client.amount;
    acc[monthKey].totalClients++;
    acc[monthKey].totalBilling += client.amount;
    
    return acc;
  }, {} as Record<string, any>);

  const sortedMonths = Object.keys(groupedData).sort((a, b) => {
    const dateA = a.includes('January') ? new Date('2026-01-01') : new Date('2025-12-01');
    const dateB = b.includes('January') ? new Date('2026-01-01') : new Date('2025-12-01');
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate metrics
  const totalAttrition = monthlyData.reduce((sum, item) => sum + item.amount, 0);
  const averageMonthly = totalAttrition / monthlyData.length;
  const totalClientsLost = decemberClients.length + januaryClients.length;
  const avgAttritionRate = monthlyData.reduce((sum, item) => sum + item.rate, 0) / monthlyData.length;
  
  // Calculate trend (comparing last 3 months vs previous 3 months)
  const last3Months = monthlyData.slice(-3).reduce((sum, item) => sum + item.amount, 0) / 3;
  const prev3Months = monthlyData.slice(-6, -3).reduce((sum, item) => sum + item.amount, 0) / 3;
  const trendPercentage = ((last3Months - prev3Months) / prev3Months) * 100;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
          <p className="text-caption text-black/60 mb-1">{payload[0].payload.month}</p>
          <p className="text-sm font-medium text-rose-600">₹{(payload[0].value / 1000).toFixed(0)}K</p>
          {payload[0].payload.clients && (
            <p className="text-caption text-black/65">{payload[0].payload.clients} clients</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7">

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-5">
        {/* Total Attrition */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rose-600" aria-hidden="true" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Total Revenue Lost</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(totalAttrition / 100000).toFixed(2)}L</div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-caption font-medium ${trendPercentage < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendPercentage < 0 ? <ArrowDown className="w-3 h-3" aria-hidden="true" /> : <ArrowUp className="w-3 h-3" aria-hidden="true" />}
              {Math.abs(trendPercentage).toFixed(1)}%
            </div>
            <span className="text-black/60" style={{ fontSize: '13px' }}>vs prev period</span>
          </div>
        </div>

        {/* Average Monthly Loss */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-orange-600" aria-hidden="true" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Avg Monthly Loss</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(averageMonthly / 1000).toFixed(0)}K</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-black/65" style={{ fontSize: '13px' }}>Per month average</p>
          </div>
        </div>

        {/* Clients Lost */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" aria-hidden="true" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Clients Churned</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">{totalClientsLost}</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-black/65" style={{ fontSize: '13px' }}>Dec '25 + Jan '26</p>
          </div>
        </div>

        {/* Attrition Rate */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-violet-600" aria-hidden="true" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Avg Attrition Rate</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">{avgAttritionRate.toFixed(1)}%</div>
          <div className="pt-3 border-t border-black/5">
            <p className="text-black/65" style={{ fontSize: '13px' }}>Last 6 months</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-5">
        {/* Monthly Attrition Trend */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Monthly Attrition Trend</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Revenue lost over the last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorAttrition" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#0000008C', fontSize: 13 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#0000008C', fontSize: 13 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorAttrition)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Attrition Rate Trend */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Attrition Rate Trend</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Percentage of client churn by month</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#000" strokeOpacity={0.05} vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#0000008C', fontSize: 13 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#0000008C', fontSize: 13 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number) => `${value}%`}
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '12px',
                  padding: '8px 12px'
                }}
              />
              <Bar dataKey="rate" fill="#F59E0B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service & Reason Breakdown */}
      <div className="grid grid-cols-2 gap-5">
        {/* Service-wise Attrition */}
        {(() => {
          const serviceTotal = serviceData.reduce((s, x) => s + x.amount, 0);
          return (
            <div className="bg-white rounded-xl border border-black/5 p-6">
              <div className="mb-5">
                <h3 className="text-black/90 text-body font-semibold">Service-wise Breakdown</h3>
                <p className="text-black/55 mt-0.5 text-caption">Revenue lost by service category</p>
              </div>

              {/* Donut + legend row — fixed height, vertically centred */}
              <div className="flex items-center" style={{ minHeight: 160 }}>

                {/* Donut — fixed square, centred in its lane */}
                <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={62}
                        paddingAngle={3}
                        dataKey="amount"
                        strokeWidth={0}
                      >
                        {serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer outline-none" />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 10 }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            const pct = ((d.amount / serviceTotal) * 100).toFixed(0);
                            return (
                              <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-black/8" style={{ minWidth: 130 }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                                  <span className="text-caption font-semibold text-black/90">{d.service}</span>
                                </div>
                                <p className="text-body font-bold text-black/90">₹{(d.amount / 1000).toFixed(0)}K</p>
                                <p className="text-caption text-black/55">{d.clients} clients · {pct}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Centre label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-body font-bold text-black/90 leading-tight">₹{(serviceTotal / 1000).toFixed(0)}K</p>
                    <p className="text-caption text-black/45" style={{ fontSize: 13 }}>total</p>
                  </div>
                </div>

                {/* Spacer */}
                <div style={{ width: 32 }} />

                {/* Legend — vertically centred, no cards, clean rows */}
                <div className="flex-1 flex flex-col justify-center gap-5">
                  {serviceData.map((service, idx) => {
                    const pct = ((service.amount / serviceTotal) * 100).toFixed(0);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-body font-semibold text-black/90">{service.service}</span>
                            <span className="text-body font-bold text-black/90">₹{(service.amount / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: service.color }} />
                            </div>
                            <span className="text-caption font-medium text-black/55 tabular-nums" style={{ minWidth: 28 }}>{pct}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Attrition Reasons */}
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Attrition Reasons</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Why clients are leaving</p>
          </div>
          <div className="space-y-3">
            {reasonData.map((reason, idx) => (
              <div key={idx} className="pb-3 border-b border-black/5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-black/70 font-medium text-caption">{reason.reason}</span>
                  <span className="text-black/65 text-caption">{reason.count} clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ width: `${reason.percentage}%`, backgroundColor: reason.color }}
                    />
                  </div>
                  <span className="text-black/60 font-medium text-caption">₹{(reason.amount / 1000).toFixed(0)}K</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attrition List Table */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {/* Table Header with Filters */}
        <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-black/70 font-semibold text-sm">Attrition List</h3>
          
          <div className="flex items-center gap-2">
            {/* Service Filter */}
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value as any)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
                aria-label="Filter by service"
              >
                <option value="All">All Services</option>
                <option value="A&T">A&T</option>
                <option value="SEM">SEM</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Period Filter */}
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
                aria-label="Filter by period"
              >
                <option value="This Year">This Year</option>
                <option value="Last 6 Months">Last 6 Months</option>
                <option value="All Time">All Time</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Hierarchical Table */}
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Attrition list by month and service">
            <thead>
              <tr className="bg-[#F6F7FF] border-b border-black/5">
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Period / Client</th>
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Service Type</th>
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Clients Lost</th>
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Billing Value</th>
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Reason</th>
                <th scope="col" className="px-4 py-3 text-left text-black/60 text-caption font-semibold">Months Active</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonths.flatMap((monthKey) => {
                const monthData = groupedData[monthKey];
                const isMonthExpanded = expandedRows[monthKey];
                
                return [
                    <tr
                      key={monthKey}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isMonthExpanded}
                      aria-label={`${monthData.monthLabel} — ${monthData.totalClients} clients lost, ${formatCurrency(monthData.totalBilling)}`}
                      className="bg-rose-50/30 border-t-2 border-rose-200/40 hover:bg-rose-50/50 cursor-pointer transition-all"
                      onClick={() => toggleRow(monthKey)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(monthKey); } }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isMonthExpanded ? (
                            <ChevronDown className="w-4 h-4 text-rose-600" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-rose-600" aria-hidden="true" />
                          )}
                          <Calendar className="w-4 h-4 text-rose-600" aria-hidden="true" />
                          <span className="text-black/90 font-semibold text-sm">{monthData.monthLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-black/60 text-caption italic">All Services</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-rose-600 font-semibold">{monthData.totalClients}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-rose-600 font-semibold">{formatCurrency(monthData.totalBilling)}</span>
                      </td>
                      <td className="px-4 py-3" colSpan={2}>
                        <span className="text-black/55 text-caption italic">Click to expand services</span>
                      </td>
                    </tr>,
                    ...(isMonthExpanded ? Object.entries(monthData.services)
                      .filter(([serviceType]) => selectedService === 'All' || serviceType === selectedService)
                      .flatMap(([serviceType, serviceData]: [string, any]) => {
                        const serviceKey = `${monthKey}-${serviceType}`;
                        const isServiceExpanded = expandedRows[serviceKey];
                        
                        return [
                            <tr
                              key={serviceKey}
                              role="button"
                              tabIndex={0}
                              aria-expanded={isServiceExpanded}
                              aria-label={`${serviceType} — ${serviceData.totalClients} clients, ${formatCurrency(serviceData.totalBilling)}`}
                              className="bg-blue-50/20 hover:bg-blue-50/40 cursor-pointer transition-all border-t border-black/5"
                              onClick={() => toggleRow(serviceKey)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(serviceKey); } }}
                            >
                              <td className="px-4 py-3 pl-12">
                                <div className="flex items-center gap-2">
                                  {isServiceExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-blue-600" aria-hidden="true" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-blue-600" aria-hidden="true" />
                                  )}
                                  <Briefcase className="w-3 h-3 text-blue-600" aria-hidden="true" />
                                  <span className="text-black/90 font-medium text-caption">{serviceType}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-black/55 text-caption">-</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 font-medium text-sm">{serviceData.totalClients}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 font-medium text-sm">{formatCurrency(serviceData.totalBilling)}</span>
                              </td>
                              <td className="px-4 py-3" colSpan={2}>
                                <span className="text-black/55 text-caption italic">Click to see clients</span>
                              </td>
                            </tr>,
                            ...(isServiceExpanded ? serviceData.clients.map((client: any, index: number) => (
                                <tr
                                  key={`${serviceKey}-${index}`}
                                  className={`transition-all ${
                                    index % 2 === 0 ? 'bg-white hover:bg-black/[0.02]' : 'bg-[#F6F7FF]/20 hover:bg-[#F6F7FF]/40'
                                  }`}
                                >
                                  <td className="px-4 py-2.5 pl-20">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="w-3 h-3 text-black/60" aria-hidden="true" />
                                      <span className="text-black/90 text-caption">{client.client}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-caption">{client.service}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-caption">1</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/90 text-caption font-medium">{formatCurrency(client.amount)}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-caption ${getReasonColor(client.reason)}`}>
                                      {client.reason}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-caption">{client.monthsActive} months</span>
                                  </td>
                                </tr>
                            )) : [])
                        ];
                      }) : [])
                ];
              })}
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
            <Lightbulb className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <h4 className="flex-1 text-left text-black/70" style={{ fontSize: '13px', fontWeight: 600 }}>Retention Intelligence</h4>
          <ChevronDown className={`w-4 h-4 text-black/55 transition-transform ${expandedInsight === 'section' ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {expandedInsight === 'section' && (
          <div className="px-5 pb-5 border-t border-black/5">
            <div className="grid grid-cols-3 gap-5 mt-4 mb-3">
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Top Risk Factor</p>
                <p className="text-rose-600" style={{ fontSize: '16px', fontWeight: 600 }}>Moving In-house</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>38.5% of all churn</p>
              </div>
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Highest Impact Service</p>
                <p className="text-black/90" style={{ fontSize: '16px', fontWeight: 600 }}>A&T</p>
                <p className="text-rose-600" style={{ fontSize: '13px' }}>₹306K lost (64%)</p>
              </div>
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Avg Client Lifetime</p>
                <p className="text-black/90" style={{ fontSize: '16px', fontWeight: 600 }}>9.8 months</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>before churning</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-caption font-medium border border-emerald-200">
                <CheckCircle className="w-3 h-3" aria-hidden="true" /> Attrition trending down 12% month-over-month
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-caption font-medium border border-amber-200">
                <AlertCircle className="w-3 h-3" aria-hidden="true" /> 6 clients moved in-house — consider value-add services
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-caption font-medium border border-rose-200">
                <XCircle className="w-3 h-3" aria-hidden="true" /> A&T service needs immediate retention strategy
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-caption font-medium border border-blue-200">
                <TrendingUp className="w-3 h-3" aria-hidden="true" /> Implement 90-day check-ins to reduce early churn
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}