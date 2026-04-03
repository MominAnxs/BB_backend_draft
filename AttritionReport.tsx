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
  { service: 'Content', amount: 306500, clients: 10, color: '#ef4444' },
  { service: 'Finance', amount: 80000, clients: 4, color: '#f97316' },
  { service: 'Performance Marketing', amount: 90000, clients: 3, color: '#f59e0b' },
];

const reasonData = [
  { reason: 'Moving In-house', count: 6, amount: 226500, percentage: 38.5, color: '#ef4444' },
  { reason: 'Downsell', count: 4, amount: 78500, percentage: 28.6, color: '#f97316' },
  { reason: 'Client Fund Issue', count: 3, amount: 130000, percentage: 21.4, color: '#f59e0b' },
  { reason: 'Service/Customer Fit', count: 1, amount: 20000, percentage: 7.1, color: '#84cc16' },
  { reason: 'Client Unhappy', count: 1, amount: 50000, percentage: 7.1, color: '#10b981' },
];

const decemberClients = [
  { service: 'Content', client: 'Human Method', reason: 'Client Fund Issue', amount: 60000, status: 'Pending', monthsActive: 12 },
  { service: 'Finance', client: 'Moving- Inhouse', reason: 'Moving- Inhouse', amount: 40000, status: 'Pending', monthsActive: 8 },
  { service: 'Finance', client: 'Downsell', reason: 'Downsell', amount: 35000, status: 'NA', monthsActive: 6 },
  { service: 'Finance', client: 'Chemistry Design Pvt Ltd', reason: 'Downsell', amount: 35500, status: 'NA', monthsActive: 14 },
  { service: 'Content', client: 'SILLY LITTLE GIRLS', reason: 'Business Shuts Down', amount: 17000, status: 'Pending', monthsActive: 4 },
  { service: 'Content', client: 'Very Casual Foods LLP', reason: 'Downsell', amount: 3000, status: 'NA', monthsActive: 3 },
  { service: 'Performance Marketing', client: 'Baubaa Designs', reason: 'Client Fund Issue', amount: 20000, status: 'NA', monthsActive: 5 },
  { service: 'Performance Marketing', client: 'Scarlet Thread', reason: 'Client Fund Issue', amount: 50000, status: 'Pending', monthsActive: 9 },
];

const januaryClients = [
  { service: 'Content', client: 'MISHO FOODS - COAST & BLOOM', reason: 'Moving- Inhouse', amount: 60000, status: 'Pending', monthsActive: 18 },
  { service: 'Finance', client: 'ECOMART (KO Vitality)', reason: 'Downsell', amount: 5000, status: 'NA', monthsActive: 7 },
  { service: 'Content', client: 'Econstruct Design and Build Pvt Ltd', reason: 'Moving- Inhouse', amount: 15500, status: 'Pending', monthsActive: 11 },
  { service: 'Content', client: 'Jivika Naturals (HEALTHY HONEST FOODS)', reason: 'Moving- Inhouse', amount: 70000, status: 'Pending', monthsActive: 16 },
  { service: 'Content', client: 'Purple 9 Seating Solutions', reason: 'Moving- Inhouse', amount: 11000, status: 'Pending', monthsActive: 8 },
  { service: 'Performance Marketing', client: 'Sathom Hospitality Pvt Ltd (KO A6)', reason: 'Service/Customer Fit', amount: 20000, status: 'Pending', monthsActive: 4 },
  { service: 'Content', client: 'Shivkham living', reason: 'Client- Unhappy', amount: 50000, status: 'NA', monthsActive: 13 },
];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];

export function AttritionReport() {
  const [dateRange, setDateRange] = useState<'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4'>('ytd');
  const [selectedService, setSelectedService] = useState<'All' | 'Content' | 'Finance' | 'Performance Marketing'>('All');
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
          <p className="text-xs text-black/60 mb-1">{payload[0].payload.month}</p>
          <p className="text-sm font-medium text-rose-600">₹{(payload[0].value / 1000).toFixed(0)}K</p>
          {payload[0].payload.clients && (
            <p className="text-xs text-black/65">{payload[0].payload.clients} clients</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-black/90" style={{ fontSize: '20px', fontWeight: 700 }}>Client Attrition Report</h2>
          <p className="text-black/65 mt-1" style={{ fontSize: '14px' }}>Track churned clients and identify retention opportunities</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-black/60" aria-hidden="true" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-full text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
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
          <ChevronDown className="w-3.5 h-3.5 text-black/60 -ml-7 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-5">
        {/* Total Attrition */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-black/60" style={{ fontSize: '13px', fontWeight: 500 }}>Total Revenue Lost</span>
          </div>
          <div className="text-3xl font-semibold text-black/90 mb-2">₹{(totalAttrition / 100000).toFixed(2)}L</div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs font-medium ${trendPercentage < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendPercentage < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
              {Math.abs(trendPercentage).toFixed(1)}%
            </div>
            <span className="text-black/60" style={{ fontSize: '13px' }}>vs prev period</span>
          </div>
        </div>

        {/* Average Monthly Loss */}
        <div className="bg-white rounded-xl p-6 border border-black/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-orange-600" />
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
              <Users className="w-4 h-4 text-blue-600" />
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
              <AlertCircle className="w-4 h-4 text-violet-600" />
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
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
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
                tick={{ fill: '#00000066', fontSize: 11 }}
                axisLine={{ stroke: '#000', strokeOpacity: 0.1 }}
              />
              <YAxis 
                stroke="#000" 
                strokeOpacity={0.2}
                tick={{ fill: '#00000066', fontSize: 11 }}
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
        <div className="bg-white rounded-xl border border-black/5 p-6">
          <div className="mb-4">
            <h3 className="text-black/70" style={{ fontSize: '14px', fontWeight: 600 }}>Service-wise Breakdown</h3>
            <p className="text-black/60 mt-1" style={{ fontSize: '13px' }}>Revenue lost by service category</p>
          </div>
          <div className="flex items-center justify-between">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {serviceData.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                    <span className="text-black/70 text-xs">{service.service}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-black/90 font-medium text-xs">₹{(service.amount / 1000).toFixed(0)}K</p>
                    <p className="text-black/40 text-xs">{service.clients} clients</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                  <span className="text-black/70 font-medium text-xs">{reason.reason}</span>
                  <span className="text-black/65 text-xs">{reason.count} clients</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ width: `${reason.percentage}%`, backgroundColor: reason.color }}
                    />
                  </div>
                  <span className="text-black/60 font-medium text-xs">₹{(reason.amount / 1000).toFixed(0)}K</span>
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
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
              >
                <option value="All">All Service</option>
                <option value="Content">Content</option>
                <option value="Finance">Finance</option>
                <option value="Performance Marketing">Performance Marketing</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/60 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Period Filter */}
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-black/30 transition-all cursor-pointer"
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
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F7FF] border-b border-black/5">
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Period / Client</th>
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Service Type</th>
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Clients Lost</th>
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Billing Value</th>
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Reason</th>
                <th className="px-4 py-3 text-left text-black/60 text-xs font-semibold">Months Active</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonths.flatMap((monthKey) => {
                const monthData = groupedData[monthKey];
                const isMonthExpanded = expandedRows[monthKey];
                
                return [
                    <tr
                      key={monthKey}
                      className="bg-rose-50/30 border-t-2 border-rose-200/40 hover:bg-rose-50/50 cursor-pointer transition-all"
                      onClick={() => toggleRow(monthKey)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isMonthExpanded ? (
                            <ChevronDown className="w-4 h-4 text-rose-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-rose-600" />
                          )}
                          <Calendar className="w-4 h-4 text-rose-600" />
                          <span className="text-black/90 font-semibold text-sm">{monthData.monthLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-black/60 text-xs italic">All Services</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-rose-600 font-semibold">{monthData.totalClients}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-rose-600 font-semibold">{formatCurrency(monthData.totalBilling)}</span>
                      </td>
                      <td className="px-4 py-3" colSpan={2}>
                        <span className="text-black/40 text-xs italic">Click to expand services</span>
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
                              className="bg-blue-50/20 hover:bg-blue-50/40 cursor-pointer transition-all border-t border-black/5"
                              onClick={() => toggleRow(serviceKey)}
                            >
                              <td className="px-4 py-3 pl-12">
                                <div className="flex items-center gap-2">
                                  {isServiceExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-blue-600" />
                                  )}
                                  <Briefcase className="w-3 h-3 text-blue-600" />
                                  <span className="text-black/90 font-medium text-xs">{serviceType}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-black/40 text-xs">-</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 font-medium text-sm">{serviceData.totalClients}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-blue-600 font-medium text-sm">{formatCurrency(serviceData.totalBilling)}</span>
                              </td>
                              <td className="px-4 py-3" colSpan={2}>
                                <span className="text-black/40 text-xs italic">Click to see clients</span>
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
                                      <span className="text-black/90 text-xs">{client.client}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-xs">{client.service}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-xs">1</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/90 text-xs font-medium">{formatCurrency(client.amount)}</span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${getReasonColor(client.reason)}`}>
                                      {client.reason}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-black/60 text-xs">{client.monthsActive} months</span>
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
            <Lightbulb className="w-4 h-4 text-amber-600" />
          </div>
          <h4 className="flex-1 text-left text-black/70" style={{ fontSize: '13px', fontWeight: 600 }}>Retention Intelligence</h4>
          <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedInsight === 'section' ? 'rotate-180' : ''}`} />
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
                <p className="text-black/90" style={{ fontSize: '16px', fontWeight: 600 }}>Performance Marketing</p>
                <p className="text-rose-600" style={{ fontSize: '13px' }}>₹306K lost (63%)</p>
              </div>
              <div>
                <p className="text-black/65 mb-1" style={{ fontSize: '13px' }}>Avg Client Lifetime</p>
                <p className="text-black/90" style={{ fontSize: '16px', fontWeight: 600 }}>9.8 months</p>
                <p className="text-black/60" style={{ fontSize: '13px' }}>before churning</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> Attrition trending down 12% month-over-month
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-medium border border-amber-200">
                <AlertCircle className="w-3 h-3" /> 6 clients moved in-house — consider value-add services
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-medium border border-rose-200">
                <XCircle className="w-3 h-3" /> Perf. Marketing service needs immediate retention strategy
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-200">
                <TrendingUp className="w-3 h-3" /> Implement 90-day check-ins to reduce early churn
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}