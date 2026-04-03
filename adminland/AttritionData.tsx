'use client';
import { useState } from 'react';
import { UserX, Search, Plus, X, Calendar, Building2, Mail, User, Briefcase, FileText, AlertTriangle, DollarSign, TrendingDown, Clock, CheckCircle2, XCircle, MessageSquare, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import React from 'react';

interface LostClient {
  id: string;
  clientName: string;
  email: string;
  sector: string;
  ownerName: string;
  mainServiceHead: string;
  serviceType: string;
  reasonLost: string;
  detailedReason: string;
  status: 'New' | 'In Review' | 'Win-back Attempt' | 'Closed';
  dateAdded: string;
  dateLost: string;
  startDate: string;
  billingValue: number; // Monthly billing
  exitChecklistStatus: 'Pending' | 'Received';
  relationshipHeldBy: string;
  comments: string;
  lastContractValue: number;
}

export function AttritionData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'New' | 'In Review' | 'Win-back Attempt' | 'Closed'>('All');
  const [filterExitChecklist, setFilterExitChecklist] = useState<'All' | 'Pending' | 'Received'>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedClient, setSelectedClient] = useState<LostClient | null>(null);
  
  // Collapsible state: { "2024-01": true, "2024-01-Digital Marketing": false }
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Sample data with complete information - spread across multiple months
  const lostClients: LostClient[] = [
    // January 2024
    {
      id: 'LC001',
      clientName: 'TechVision Corp',
      email: 'contact@techvision.com',
      sector: 'Technology',
      ownerName: 'Rajesh Kumar',
      mainServiceHead: 'Rahul Sharma',
      serviceType: 'Digital Marketing',
      reasonLost: 'Budget Constraints',
      detailedReason: 'Client faced funding challenges in Q4 2023. CFO mandated 40% marketing budget cut across all agencies. Left on good terms, expressed interest in returning when funding improves. Maintained professional relationship.',
      status: 'Closed',
      dateAdded: '2024-01-15',
      dateLost: '2024-01-15',
      startDate: '2021-03-10',
      billingValue: 45000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Rahul Sharma (Service Head)',
      comments: 'Good relationship maintained. CEO mentioned potential return in Q2 2024. Keep on quarterly check-in list.',
      lastContractValue: 45000,
    },
    {
      id: 'LC002',
      clientName: 'StartupHub India',
      email: 'admin@startuphub.in',
      sector: 'Technology',
      ownerName: 'Ananya Desai',
      mainServiceHead: 'Priya Mehta',
      serviceType: 'SEO Services',
      reasonLost: 'In-house Team',
      detailedReason: 'Client hired internal SEO specialist. Business decision to bring marketing in-house.',
      status: 'Closed',
      dateAdded: '2024-01-20',
      dateLost: '2024-01-20',
      startDate: '2022-05-15',
      billingValue: 28000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Priya Mehta (Service Head)',
      comments: 'Professional exit. Open to consulting projects.',
      lastContractValue: 28000,
    },
    {
      id: 'LC003',
      clientName: 'QuickCommerce Ltd',
      email: 'marketing@quickcommerce.com',
      sector: 'E-commerce',
      ownerName: 'Vikram Shah',
      mainServiceHead: 'Vikram Patel',
      serviceType: 'Performance Marketing',
      reasonLost: 'Competitor Offering',
      detailedReason: 'Competitor offered 25% lower pricing with integrated platform.',
      status: 'Closed',
      dateAdded: '2024-01-25',
      dateLost: '2024-01-25',
      startDate: '2022-08-20',
      billingValue: 62000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Vikram Patel (Service Head)',
      comments: 'Price-driven decision. Monitor for win-back opportunity.',
      lastContractValue: 62000,
    },
    // February 2024
    {
      id: 'LC004',
      clientName: 'Global Retail Solutions',
      email: 'admin@globalretail.in',
      sector: 'Retail',
      ownerName: 'Priya Mehta',
      mainServiceHead: 'Neha Desai',
      serviceType: 'Branding',
      reasonLost: 'Service Quality Issues',
      detailedReason: 'CRITICAL: Multiple project delays and missed deadlines in Oct-Nov 2023. Client CMO escalated quality concerns. Creative work did not meet brand standards. Despite recovery efforts, client decided to switch agencies. Service delivery breakdown identified - team capacity issues.',
      status: 'Closed',
      dateAdded: '2024-02-05',
      dateLost: '2024-02-05',
      startDate: '2022-06-15',
      billingValue: 65000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Neha Desai (Service Head) & Tejas (COO)',
      comments: 'Relationship damaged. Post-mortem completed. Key learnings: Need better capacity planning and quality control processes. Client unlikely to return.',
      lastContractValue: 65000,
    },
    {
      id: 'LC005',
      clientName: 'HealthCare Plus',
      email: 'info@healthcareplus.in',
      sector: 'Healthcare',
      ownerName: 'Dr. Arun Singh',
      mainServiceHead: 'Rahul Sharma',
      serviceType: 'Digital Marketing',
      reasonLost: 'Strategic Pivot',
      detailedReason: 'Client underwent major business restructuring and shifted focus from B2C to B2B model. New strategy required different marketing approach and agency expertise. Mutually agreed to part ways. Professional transition over 30-day notice period.',
      status: 'Closed',
      dateAdded: '2024-02-12',
      dateLost: '2024-02-12',
      startDate: '2022-09-01',
      billingValue: 52000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Rahul Sharma (Service Head) & Tejas (COO)',
      comments: 'Clean exit. CEO appreciates our work. Potential referral source. Add to networking list.',
      lastContractValue: 52000,
    },
    {
      id: 'LC006',
      clientName: 'EduLearn Platform',
      email: 'bizdev@edulearn.com',
      sector: 'Education',
      ownerName: 'Sneha Reddy',
      mainServiceHead: 'Priya Mehta',
      serviceType: 'SEO Services',
      reasonLost: 'In-house Team',
      detailedReason: 'Client hired internal marketing team of 5 people including SEO specialist. Business decision to bring all marketing in-house as part of growth strategy. Not related to our performance - client satisfied with results. Transitioned all documentation and knowledge smoothly.',
      status: 'Closed',
      dateAdded: '2024-02-18',
      dateLost: '2024-02-18',
      startDate: '2021-01-10',
      billingValue: 38000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Priya Mehta (Service Head)',
      comments: 'Excellent relationship. Client open to consulting engagement or specialized projects. Maintain quarterly touchpoint.',
      lastContractValue: 38000,
    },
    // March 2024
    {
      id: 'LC007',
      clientName: 'AutoDrive Solutions',
      email: 'marketing@autodrive.co',
      sector: 'Automotive',
      ownerName: 'Karan Kapoor',
      mainServiceHead: 'Hooshang Mehta',
      serviceType: 'Performance Marketing',
      reasonLost: 'Poor Communication',
      detailedReason: 'URGENT REVIEW NEEDED: Client complained about lack of proactive communication and strategic guidance. Felt like order-takers rather than partners. Multiple requests for meetings went unanswered by account team. Relationship breakdown over 3 months. Client gave 30-day notice.',
      status: 'Closed',
      dateAdded: '2024-03-08',
      dateLost: '2024-03-08',
      startDate: '2023-04-15',
      billingValue: 42000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Amit Singh (Service Head)',
      comments: 'CRITICAL LEARNINGS: Account management process failure. Need better communication protocols and proactive check-ins. Post-mortem completed.',
      lastContractValue: 42000,
    },
    {
      id: 'LC008',
      clientName: 'FashionHub Retail',
      email: 'admin@fashionhub.in',
      sector: 'Fashion & Lifestyle',
      ownerName: 'Nisha Verma',
      mainServiceHead: 'Neha Desai',
      serviceType: 'Social Media Marketing',
      reasonLost: 'Budget Constraints',
      detailedReason: 'Seasonal business faced major revenue drop in Q4. Company-wide cost cutting including 50% reduction in marketing spend. Client paused all agency relationships. Expressed desire to restart when business recovers in festive season 2024.',
      status: 'Closed',
      dateAdded: '2024-03-15',
      dateLost: '2024-03-15',
      startDate: '2022-03-20',
      billingValue: 35000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Neha Desai (Service Head)',
      comments: 'Good relationship. Business challenge, not service issue. Set reminder to reach out in August 2024 for festive season planning.',
      lastContractValue: 35000,
    },
    // December 2023
    {
      id: 'LC009',
      clientName: 'PropTech Innovations',
      email: 'contact@proptech.co.in',
      sector: 'Real Estate',
      ownerName: 'Sanjay Malhotra',
      mainServiceHead: 'Vikram Patel',
      serviceType: 'Performance Marketing',
      reasonLost: 'Business Closure',
      detailedReason: 'Client company shut down operations due to regulatory challenges and funding issues. Business ceased to exist. Final payment received. Relationship was positive throughout engagement.',
      status: 'Closed',
      dateAdded: '2023-12-20',
      dateLost: '2023-12-20',
      startDate: '2023-01-10',
      billingValue: 55000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Vikram Patel (Service Head)',
      comments: 'Business closure - unavoidable loss. Maintain LinkedIn connections with founders for future opportunities.',
      lastContractValue: 55000,
    },
    {
      id: 'LC010',
      clientName: 'CloudTech Systems',
      email: 'info@cloudtech.io',
      sector: 'Technology',
      ownerName: 'Arjun Reddy',
      mainServiceHead: 'Rahul Sharma',
      serviceType: 'Digital Marketing',
      reasonLost: 'Budget Constraints',
      detailedReason: 'Year-end budget cuts due to economic uncertainty. All non-essential marketing paused.',
      status: 'Closed',
      dateAdded: '2023-12-28',
      dateLost: '2023-12-28',
      startDate: '2022-04-10',
      billingValue: 48000,
      exitChecklistStatus: 'Received',
      relationshipHeldBy: 'Rahul Sharma (Service Head)',
      comments: 'Temporary pause. Strong relationship. Follow up Q1 2024.',
      lastContractValue: 48000,
    },
    // January 2025 - Recent losses
    {
      id: 'LC011',
      clientName: 'FinServe India',
      email: 'marketing@finserve.co.in',
      sector: 'Finance',
      ownerName: 'Amit Patel',
      mainServiceHead: 'Vikram Patel',
      serviceType: 'Performance Marketing',
      reasonLost: 'Competitor Offering',
      detailedReason: 'Client received significantly lower pricing from competitor (30% below our rates). Competitor also offered integrated tech platform. We were unable to match on price while maintaining service quality. Client appreciated our work but made business decision based on cost.',
      status: 'Win-back Attempt',
      dateAdded: '2025-01-10',
      dateLost: '2025-01-05',
      startDate: '2020-08-20',
      billingValue: 85000,
      exitChecklistStatus: 'Pending',
      relationshipHeldBy: 'Vikram Patel (Service Head)',
      comments: 'WIN-BACK OPPORTUNITY: Client unhappy with new agency after 2 weeks. Quality concerns emerging. Vikram scheduled coffee meeting with CMO on Jan 25th. Prepare comeback proposal.',
      lastContractValue: 85000,
    },
    {
      id: 'LC012',
      clientName: 'RetailGo Solutions',
      email: 'contact@retailgo.in',
      sector: 'Retail',
      ownerName: 'Meera Krishnan',
      mainServiceHead: 'Neha Desai',
      serviceType: 'Branding',
      reasonLost: 'Budget Constraints',
      detailedReason: 'Post-festive season revenue decline. Temporary marketing budget freeze.',
      status: 'New',
      dateAdded: '2025-01-14',
      dateLost: '2025-01-12',
      startDate: '2023-06-10',
      billingValue: 39000,
      exitChecklistStatus: 'Pending',
      relationshipHeldBy: 'Neha Desai (Service Head)',
      comments: 'Seasonal challenge. Maintain contact for Q3 festive season.',
      lastContractValue: 39000,
    },
  ];

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'Budget Constraints':
        return 'bg-[#FEF3C7] text-[#F59E0B]';
      case 'Service Quality Issues':
        return 'bg-[#FDD7D0] text-[#E85D4D]';
      case 'Competitor Offering':
        return 'bg-[#DBEAFE] text-[#204CC7]';
      case 'In-house Team':
        return 'bg-[#E8EBFF] text-[#4D73D9]';
      case 'Strategic Pivot':
        return 'bg-[#F3E8FF] text-[#9333EA]';
      case 'Poor Communication':
        return 'bg-[#FDD7D0] text-[#E85D4D]';
      case 'Business Closure':
        return 'bg-[#F1F5F9] text-[#64748B]';
      default:
        return 'bg-[#F6F7FF] text-[#5A5A6F]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-[#DBEAFE] text-[#204CC7]';
      case 'In Review':
        return 'bg-[#FEF3C7] text-[#F59E0B]';
      case 'Win-back Attempt':
        return 'bg-[#E2FFE2] text-[#10B981]';
      case 'Closed':
        return 'bg-[#F1F5F9] text-[#64748B]';
      default:
        return 'bg-[#F6F7FF] text-[#5A5A6F]';
    }
  };

  const getExitChecklistColor = (status: string) => {
    return status === 'Received' 
      ? 'bg-[#E2FFE2] text-[#10B981]' 
      : 'bg-[#FDD7D0] text-[#E85D4D]';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Calculate LTV metrics for a client
  const calculateLTV = (client: LostClient) => {
    const start = new Date(client.startDate);
    const end = new Date(client.dateLost);
    
    const lifetimeDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalMonthsCompleted = Math.floor(lifetimeDays / 30);
    const lifetimeValue = client.billingValue * totalMonthsCompleted;
    
    return {
      lifetimeDays,
      totalMonthsCompleted,
      lifetimeValue,
      startYear: start.getFullYear(),
      endYear: end.getFullYear(),
    };
  };

  const reasons = ['All', ...Array.from(new Set(lostClients.map(c => c.reasonLost)))];

  const filteredClients = lostClients.filter(client => {
    const matchesSearch = 
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.mainServiceHead.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.sector.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesReason = filterReason === 'All' || client.reasonLost === filterReason;
    const matchesStatus = filterStatus === 'All' || client.status === filterStatus;
    const matchesExitChecklist = filterExitChecklist === 'All' || client.exitChecklistStatus === filterExitChecklist;
    
    return matchesSearch && matchesReason && matchesStatus && matchesExitChecklist;
  });

  // Group clients by Month -> Service -> Clients
  const groupedData = filteredClients.reduce((acc, client) => {
    const monthKey = client.dateLost.substring(0, 7); // "2024-01"
    const monthLabel = formatMonthYear(client.dateLost);
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthLabel,
        services: {},
        totalClients: 0,
        totalBilling: 0,
      };
    }
    
    if (!acc[monthKey].services[client.serviceType]) {
      acc[monthKey].services[client.serviceType] = {
        clients: [],
        totalClients: 0,
        totalBilling: 0,
      };
    }
    
    acc[monthKey].services[client.serviceType].clients.push(client);
    acc[monthKey].services[client.serviceType].totalClients++;
    acc[monthKey].services[client.serviceType].totalBilling += client.billingValue;
    acc[monthKey].totalClients++;
    acc[monthKey].totalBilling += client.billingValue;
    
    return acc;
  }, {} as Record<string, any>);

  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(groupedData).sort((a, b) => b.localeCompare(a));

  // CEO-level metrics
  const totalLost = lostClients.length;
  const totalFinalBillingValueLost = lostClients.reduce((sum, client) => sum + client.billingValue, 0);
  
  // Current month losses
  const currentDate = new Date();
  const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const lostThisMonth = lostClients.filter(c => c.dateLost.startsWith(currentMonthKey)).length;
  
  // Quarter calculation (last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const lostThisQuarter = lostClients.filter(c => new Date(c.dateLost) >= threeMonthsAgo).length;
  const quarterlyBillingLost = lostClients
    .filter(c => new Date(c.dateLost) >= threeMonthsAgo)
    .reduce((sum, c) => sum + c.billingValue, 0);
  
  const exitChecklistPending = lostClients.filter(c => c.exitChecklistStatus === 'Pending').length;

  // Service-wise breakdown
  const serviceBreakdown = lostClients.reduce((acc, client) => {
    if (!acc[client.serviceType]) {
      acc[client.serviceType] = { count: 0, billing: 0 };
    }
    acc[client.serviceType].count++;
    acc[client.serviceType].billing += client.billingValue;
    return acc;
  }, {} as Record<string, { count: number; billing: number }>);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleClientClick = (client: LostClient) => {
    setSelectedClient(client);
    setShowDrawer(true);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setTimeout(() => setSelectedClient(null), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#272727] mb-1">Lost Client Intelligence Dashboard</h1>
          <p className="text-[#5A5A6F] text-body">Monthly & service-wise attrition analysis with hierarchical breakdown</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E85D4D] to-[#F87171] text-white rounded-lg hover:shadow-lg hover:shadow-[#E85D4D]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lost Client</span>
        </button>
      </div>

      {/* CEO Stats Cards - What Matters Most */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-[#E85D4D]/20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E85D4D] to-[#F87171] rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#5A5A6F] text-body">Total Billing Lost</p>
              <p className="text-[#E85D4D] text-h2">{formatCurrency(totalFinalBillingValueLost)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#5A5A6F] text-body">Lost This Month</p>
              <p className="text-[#272727] text-h1">{lostThisMonth}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#204CC7] to-[#4D73D9] rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#5A5A6F] text-body">Lost This Quarter</p>
              <p className="text-[#204CC7] text-h1">{lostThisQuarter}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#E85D4D] to-[#F87171] rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[#5A5A6F] text-body">Exit Checklist Pending</p>
              <p className="text-[#E85D4D] text-h1">{exitChecklistPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service-Wise Breakdown Cards */}
      <div>
        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#204CC7]" />
          Service-Wise Attrition Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(serviceBreakdown)
            .sort((a, b) => b[1].billing - a[1].billing)
            .map(([service, data]) => (
              <div key={service} className="bg-white rounded-xl p-4 border border-[#204CC7]/10 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-[#204CC7]" />
                  <p className="text-[#5A5A6F] text-caption">{service}</p>
                </div>
                <p className="text-[#272727] text-h1 mb-1">{data.count}</p>
                <p className="text-[#E85D4D] text-body">{formatCurrency(data.billing)}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A6F]" />
            <input
              type="text"
              placeholder="Search by client name, email, owner, service head, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
            >
              {reasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
            >
              <option value="All">All Status</option>
              <option value="New">New</option>
              <option value="In Review">In Review</option>
              <option value="Win-back Attempt">Win-back Attempt</option>
              <option value="Closed">Closed</option>
            </select>
            <select
              value={filterExitChecklist}
              onChange={(e) => setFilterExitChecklist(e.target.value as any)}
              className="px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
            >
              <option value="All">All Checklists</option>
              <option value="Pending">Pending</option>
              <option value="Received">Received</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hierarchical Monthly View - Spreadsheet Style */}
      <div className="bg-white rounded-xl shadow-sm border border-[#204CC7]/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#272727] to-[#3a3a3a]">
                <th className="px-4 py-3 text-left text-white text-body">Period / Client</th>
                <th className="px-4 py-3 text-left text-white text-body">Service Type</th>
                <th className="px-4 py-3 text-left text-white text-body">Clients Lost</th>
                <th className="px-4 py-3 text-left text-white text-body">Billing Value</th>
                <th className="px-4 py-3 text-left text-white text-body">Date Lost</th>
                <th className="px-4 py-3 text-left text-white text-body">Reason</th>
                <th className="px-4 py-3 text-left text-white text-body">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedMonths.map((monthKey) => {
                const monthData = groupedData[monthKey];
                const isMonthExpanded = expandedRows[monthKey];
                
                return (
                  <React.Fragment key={monthKey}>
                    {/* MONTH TOTAL ROW */}
                    <tr
                      className="bg-gradient-to-r from-[#E85D4D]/10 to-[#F87171]/5 border-t-2 border-[#E85D4D]/20 hover:from-[#E85D4D]/15 hover:to-[#F87171]/10 cursor-pointer transition-all"
                      onClick={() => toggleRow(monthKey)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isMonthExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#E85D4D]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-[#E85D4D]" />
                          )}
                          <Calendar className="w-4 h-4 text-[#E85D4D]" />
                          <span className="text-[#272727] font-semibold">{monthData.monthLabel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#5A5A6F] text-body italic">All Services</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#E85D4D] font-semibold text-h2">{monthData.totalClients}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#E85D4D] font-semibold text-h2">{formatCurrency(monthData.totalBilling)}</span>
                      </td>
                      <td className="px-4 py-3" colSpan={3}>
                        <span className="text-[#5A5A6F] text-caption italic">Click to expand services</span>
                      </td>
                    </tr>

                    {/* SERVICE BREAKDOWN ROWS */}
                    {isMonthExpanded && Object.entries(monthData.services).map(([serviceType, serviceData]: [string, any]) => {
                      const serviceKey = `${monthKey}-${serviceType}`;
                      const isServiceExpanded = expandedRows[serviceKey];
                      
                      return (
                        <React.Fragment key={serviceKey}>
                          {/* SERVICE TOTAL ROW */}
                          <tr
                            className="bg-[#F6F7FF]/50 hover:bg-[#F6F7FF] cursor-pointer transition-all border-t border-[#204CC7]/10"
                            onClick={() => toggleRow(serviceKey)}
                          >
                            <td className="px-4 py-3 pl-12">
                              <div className="flex items-center gap-2">
                                {isServiceExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-[#204CC7]" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-[#204CC7]" />
                                )}
                                <Briefcase className="w-3 h-3 text-[#204CC7]" />
                                <span className="text-[#272727] font-medium text-body">{serviceType}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[#5A5A6F] text-caption">-</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[#204CC7] font-medium">{serviceData.totalClients}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[#204CC7] font-medium">{formatCurrency(serviceData.totalBilling)}</span>
                            </td>
                            <td className="px-4 py-3" colSpan={3}>
                              <span className="text-[#5A5A6F] text-caption italic">Click to see clients</span>
                            </td>
                          </tr>

                          {/* INDIVIDUAL CLIENT ROWS */}
                          {isServiceExpanded && serviceData.clients.map((client: LostClient, index: number) => {
                            const isPendingChecklist = client.exitChecklistStatus === 'Pending';
                            
                            return (
                              <tr
                                key={client.id}
                                onClick={() => handleClientClick(client)}
                                className={`cursor-pointer transition-all ${
                                  index % 2 === 0 ? 'bg-white hover:bg-[#F6F7FF]/30' : 'bg-[#F6F7FF]/20 hover:bg-[#F6F7FF]/40'
                                } ${isPendingChecklist ? 'border-l-4 border-l-[#E85D4D]' : ''}`}
                              >
                                <td className="px-4 py-2 pl-20">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-3 h-3 text-[#5A5A6F]" />
                                    <span className="text-[#272727] text-body">{client.clientName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-[#5A5A6F] text-caption">{client.serviceType}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-[#5A5A6F] text-caption">1</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-[#272727] text-body">{formatCurrency(client.billingValue)}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-[#5A5A6F] text-caption">{formatDate(client.dateLost)}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex px-2 py-1 rounded text-caption ${getReasonColor(client.reasonLost)}`}>
                                    {client.reasonLost}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex px-2 py-1 rounded text-caption ${getStatusColor(client.status)}`}>
                                      {client.status}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-caption ${getExitChecklistColor(client.exitChecklistStatus)}`}>
                                      {client.exitChecklistStatus === 'Received' ? (
                                        <CheckCircle2 className="w-2 h-2" />
                                      ) : (
                                        <XCircle className="w-2 h-2" />
                                      )}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quarterly Intelligence */}
      <div className="bg-gradient-to-br from-[#F6F7FF] to-[#E8EBFF] rounded-xl p-6 border border-[#204CC7]/20">
        <h3 className="text-[#272727] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#204CC7]" />
          Quarterly Attrition Intelligence (Last 3 Months)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-[#5A5A6F] text-body mb-1">Total Clients Lost</p>
            <p className="text-[#E85D4D] text-h1">{lostThisQuarter}</p>
            <p className="text-[#5A5A6F] text-caption mt-1">clients in last 90 days</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-[#5A5A6F] text-body mb-1">Quarterly Billing Lost</p>
            <p className="text-[#E85D4D] text-h1">{formatCurrency(quarterlyBillingLost)}</p>
            <p className="text-[#5A5A6F] text-caption mt-1">monthly recurring revenue</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-[#5A5A6F] text-body mb-1">Controllable Losses</p>
            <p className="text-[#E85D4D] text-h1">
              {lostClients.filter(c => 
                (c.reasonLost === 'Service Quality Issues' || c.reasonLost === 'Poor Communication') &&
                new Date(c.dateLost) >= threeMonthsAgo
              ).length}
            </p>
            <p className="text-[#5A5A6F] text-caption mt-1">needs process improvement</p>
          </div>
        </div>
      </div>

      {/* Side Drawer - Detailed Client View (same as before) */}
      {showDrawer && selectedClient && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={closeDrawer}
          />
          
          <div className={`fixed top-0 right-0 h-full w-full md:w-[700px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
            showDrawer ? 'translate-x-0' : 'translate-x-full'
          }`}>
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-[#E85D4D] to-[#F87171] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserX className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-h2">{selectedClient.clientName}</h2>
                    <p className="text-white/70 text-body">{selectedClient.id}</p>
                  </div>
                </div>
                <button 
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const ltv = calculateLTV(selectedClient);
                  const isPendingChecklist = selectedClient.exitChecklistStatus === 'Pending';
                  const isWinBackOpportunity = selectedClient.status === 'Win-back Attempt';
                  
                  return (
                    <>
                      <div className="flex items-center gap-3 justify-center">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-body font-medium ${getStatusColor(selectedClient.status)}`}>
                          {selectedClient.status}
                        </span>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-body font-medium ${getExitChecklistColor(selectedClient.exitChecklistStatus)}`}>
                          {selectedClient.exitChecklistStatus === 'Received' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Exit Checklist: {selectedClient.exitChecklistStatus}
                        </span>
                      </div>

                      {isWinBackOpportunity && (
                        <div className="bg-gradient-to-r from-[#E2FFE2] to-[#D1FAE5] rounded-xl p-4 border-2 border-[#10B981]/30">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-[#10B981] rounded-lg flex items-center justify-center flex-shrink-0">
                              <TrendingDown className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[#10B981] font-medium mb-1">🎯 WIN-BACK OPPORTUNITY</p>
                              <p className="text-[#10B981] text-body">Active recovery attempt in progress. Revenue recovery potential: {formatCurrency(selectedClient.billingValue)}/month</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPendingChecklist && (
                        <div className="bg-gradient-to-r from-[#FDD7D0] to-[#FEE2E2] rounded-xl p-4 border-2 border-[#E85D4D]/30">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-[#E85D4D] rounded-lg flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[#E85D4D] font-medium mb-1">⚠️ EXIT CHECKLIST PENDING</p>
                              <p className="text-[#E85D4D] text-body">Operational closure incomplete. Follow up with {selectedClient.relationshipHeldBy} to obtain exit documentation.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-[#E85D4D]" />
                          Lifetime Value (LTV) Analysis
                        </h3>
                        <div className="bg-gradient-to-br from-[#E85D4D] to-[#F87171] rounded-xl p-6 text-white">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-white/70 text-body mb-1">Total LTV</p>
                              <p className="text-h1 font-medium">{formatCurrency(ltv.lifetimeValue)}</p>
                            </div>
                            <div>
                              <p className="text-white/70 text-body mb-1">Monthly Billing</p>
                              <p className="text-h1">{formatCurrency(selectedClient.billingValue)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-white/20">
                            <div>
                              <p className="text-white/70 text-caption mb-1">Start Year</p>
                              <p className="text-h2">{ltv.startYear}</p>
                            </div>
                            <div>
                              <p className="text-white/70 text-caption mb-1">End Year</p>
                              <p className="text-h2">{ltv.endYear}</p>
                            </div>
                            <div>
                              <p className="text-white/70 text-caption mb-1">Total Months</p>
                              <p className="text-h2">{ltv.totalMonthsCompleted}</p>
                            </div>
                            <div>
                              <p className="text-white/70 text-caption mb-1">Total Days</p>
                              <p className="text-h2">{ltv.lifetimeDays}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-[#204CC7]" />
                          Client Lifecycle Timeline
                        </h3>
                        <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-center">
                              <p className="text-[#10B981] text-caption mb-1">Started</p>
                              <p className="text-[#272727] font-medium">{formatDate(selectedClient.startDate)}</p>
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="h-2 bg-gradient-to-r from-[#10B981] via-[#204CC7] to-[#E85D4D] rounded-full relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-caption text-[#272727] font-medium shadow-sm">
                                  {ltv.totalMonthsCompleted} months
                                </div>
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-[#E85D4D] text-caption mb-1">Lost</p>
                              <p className="text-[#272727] font-medium">{formatDate(selectedClient.dateLost)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <User className="w-5 h-5 text-[#204CC7]" />
                          Relationship Accountability
                        </h3>
                        <div className="bg-[#F6F7FF] rounded-xl p-4 border border-[#204CC7]/10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#204CC7] to-[#4D73D9] rounded-lg flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[#5A5A6F] text-caption">Relationship Held By</p>
                              <p className="text-[#272727] font-medium">{selectedClient.relationshipHeldBy}</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-[#5A5A6F] text-caption mb-1">Service Head</p>
                            <p className="text-[#272727]">{selectedClient.mainServiceHead}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-[#204CC7]" />
                          Client Information
                        </h3>
                        <div className="bg-white rounded-xl p-4 border border-[#204CC7]/10">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Client Name</p>
                              <p className="text-[#272727]">{selectedClient.clientName}</p>
                            </div>
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Email</p>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-[#5A5A6F]" />
                                <p className="text-[#272727] text-body">{selectedClient.email}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Sector</p>
                              <p className="text-[#272727]">{selectedClient.sector}</p>
                            </div>
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Owner Name</p>
                              <p className="text-[#272727]">{selectedClient.ownerName}</p>
                            </div>
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Service Type</p>
                              <p className="text-[#272727]">{selectedClient.serviceType}</p>
                            </div>
                            <div>
                              <p className="text-[#5A5A6F] text-body mb-1">Last Contract Value</p>
                              <p className="text-[#E85D4D]">{formatCurrency(selectedClient.lastContractValue)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-[#E85D4D]" />
                          Attrition Analysis
                        </h3>
                        <div className="bg-gradient-to-br from-[#FDD7D0] to-[#FEE2E2] rounded-xl p-4 border border-[#E85D4D]/20">
                          <div className="mb-3">
                            <p className="text-[#5A5A6F] text-body mb-2">Primary Reason</p>
                            <span className={`inline-flex px-3 py-2 rounded-lg text-body font-medium ${getReasonColor(selectedClient.reasonLost)}`}>
                              {selectedClient.reasonLost}
                            </span>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-[#5A5A6F] text-caption mb-2">Detailed Analysis</p>
                            <p className="text-[#272727] text-body leading-relaxed whitespace-pre-line">
                              {selectedClient.detailedReason}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[#272727] mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-[#204CC7]" />
                          Strategic Comments & Action Items
                        </h3>
                        <div className="bg-[#F6F7FF] rounded-xl p-4 border border-[#204CC7]/10">
                          <p className="text-[#272727] text-body leading-relaxed whitespace-pre-line">
                            {selectedClient.comments}
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-[#F6F7FF] to-[#E8EBFF] rounded-xl p-4 border border-[#204CC7]/20">
                        <p className="text-[#5A5A6F] text-caption mb-3">Key Metrics Summary</p>
                        <div className="grid grid-cols-3 gap-3 text-body">
                          <div>
                            <p className="text-[#5A5A6F] text-caption">Date Added</p>
                            <p className="text-[#272727] font-medium">{formatDate(selectedClient.dateAdded)}</p>
                          </div>
                          <div>
                            <p className="text-[#5A5A6F] text-caption">Date Lost</p>
                            <p className="text-[#272727] font-medium">{formatDate(selectedClient.dateLost)}</p>
                          </div>
                          <div>
                            <p className="text-[#5A5A6F] text-caption">Lifetime</p>
                            <p className="text-[#272727] font-medium">{ltv.totalMonthsCompleted}mo</p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="border-t border-[#204CC7]/10 px-6 py-4 bg-[#F6F7FF]/50">
                <div className="flex gap-3">
                  {selectedClient.status === 'Win-back Attempt' ? (
                    <>
                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white rounded-lg hover:shadow-lg transition-all text-body font-medium">
                        Follow Up Win-back
                      </button>
                      <button className="flex-1 px-4 py-2 border border-[#204CC7]/20 text-[#204CC7] rounded-lg hover:bg-[#F6F7FF] transition-all text-body">
                        Update Status
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="flex-1 px-4 py-2 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3d9f] transition-colors text-body">
                        Attempt Win-back
                      </button>
                      <button className="flex-1 px-4 py-2 border border-[#204CC7]/20 text-[#204CC7] rounded-lg hover:bg-[#F6F7FF] transition-colors text-body">
                        Add Note
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Lost Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#272727]/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#E85D4D] to-[#F87171] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-white">Add Lost Client</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-[#5A5A6F] text-body mb-6">Fill in the details of the client who discontinued our services</p>
              <div className="space-y-4">
                {/* Client Name */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Client Name <span className="text-[#E85D4D]">*</span>
                  </label>
                  <select className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent">
                    <option value="">Select a client</option>
                    <option value="Acme Corp">Acme Corp</option>
                    <option value="Tech Innovations Ltd">Tech Innovations Ltd</option>
                    <option value="Global Exports Inc">Global Exports Inc</option>
                    <option value="Sunrise Retail">Sunrise Retail</option>
                    <option value="FinTech Solutions">FinTech Solutions</option>
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Service Type <span className="text-[#E85D4D]">*</span>
                  </label>
                  <select className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent">
                    <option value="">Select service</option>
                    <option value="Digital Marketing">Digital Marketing</option>
                    <option value="SEO Services">SEO Services</option>
                    <option value="Performance Marketing">Performance Marketing</option>
                    <option value="Branding">Branding</option>
                    <option value="Social Media Marketing">Social Media Marketing</option>
                  </select>
                </div>

                {/* Date Lost & Billing Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#272727] text-body font-medium mb-2">
                      Date Lost <span className="text-[#E85D4D]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-[#272727] text-body font-medium mb-2">
                      Monthly Billing Value <span className="text-[#E85D4D]">*</span>
                    </label>
                    <input
                      type="number"
                      placeholder="₹ 50,000"
                      className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Relationship Held By */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Relationship Held By <span className="text-[#E85D4D]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Rahul Sharma (Service Head)"
                    className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent"
                  />
                </div>

                {/* Reason Lost */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Reason Lost <span className="text-[#E85D4D]">*</span>
                  </label>
                  <select className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent">
                    <option value="">Select reason</option>
                    <option value="Budget Constraints">Budget Constraints</option>
                    <option value="Service Quality Issues">Service Quality Issues</option>
                    <option value="Competitor Offering">Competitor Offering</option>
                    <option value="In-house Team">In-house Team</option>
                    <option value="Strategic Pivot">Strategic Pivot</option>
                    <option value="Poor Communication">Poor Communication</option>
                    <option value="Business Closure">Business Closure</option>
                  </select>
                </div>

                {/* Exit Checklist Status */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Exit Checklist Status <span className="text-[#E85D4D]">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 border border-[#204CC7]/20 rounded-lg cursor-pointer hover:bg-[#F6F7FF] transition-all">
                      <input type="radio" name="exitChecklist" value="Pending" className="text-[#204CC7] focus:ring-[#204CC7]" />
                      <span className="text-[#272727] text-body">Pending</span>
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 border border-[#204CC7]/20 rounded-lg cursor-pointer hover:bg-[#F6F7FF] transition-all">
                      <input type="radio" name="exitChecklist" value="Received" className="text-[#204CC7] focus:ring-[#204CC7]" />
                      <span className="text-[#272727] text-body">Received</span>
                    </label>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Status <span className="text-[#E85D4D]">*</span>
                  </label>
                  <select className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent">
                    <option value="New">New</option>
                    <option value="In Review">In Review</option>
                    <option value="Win-back Attempt">Win-back Attempt</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {/* Comments / Detailed Reason */}
                <div>
                  <label className="block text-[#272727] text-body font-medium mb-2">
                    Detailed Comments <span className="text-[#E85D4D]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide detailed context about why the client was lost, any attempts made to retain them, lessons learned, and next steps..."
                    className="w-full px-4 py-2 border border-[#204CC7]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#204CC7] focus:border-transparent resize-none"
                  />
                </div>

                {/* Additional Info Note */}
                <div className="bg-[#F6F7FF] rounded-lg p-4 border border-[#204CC7]/10">
                  <p className="text-[#5A5A6F] text-caption">
                    <strong>Note:</strong> Client details (email, sector, owner name, service head) will be auto-populated from the selected client profile.
                  </p>
                </div>

                {/* Submit Button */}
                <button className="w-full px-4 py-3 bg-gradient-to-r from-[#E85D4D] to-[#F87171] text-white rounded-lg hover:shadow-lg hover:shadow-[#E85D4D]/25 transition-all font-medium">
                  Add to Attrition Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}