'use client';
import { Users, Briefcase, TrendingUp, ChevronDown, ArrowUp, Target, Percent, TrendingDown, AlertCircle, CheckCircle, User, Lightbulb, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { marginReportData } from '@/lib/data/margin-report-data';

interface OverviewProps {
  globalDateRange?: 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';
  globalDepartment?: 'All' | 'Finance' | 'Performance Marketing';
}

export function Overview({ globalDateRange = 'ytd', globalDepartment = 'All' }: OverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminland = pathname.startsWith('/adminland');
  const baseRoute = isAdminland ? '/adminland/reports' : '/dashboard';
  const onNavigate = (tab: 'attrition' | 'cla' | 'growth' | 'sales') => {
    const map: Record<string, string> = { attrition: `${baseRoute}/attrition`, cla: `${baseRoute}/cla`, growth: `${baseRoute}/growth-pl`, sales: `${baseRoute}/sales` };
    router.push(map[tab]);
  };
  const onNavigateToAdminland = () => router.push('/adminland');

  // Editable margin targets
  const [financeTargetMargin, setFinanceTargetMargin] = useState(70);
  const [semTargetMargin, setSemTargetMargin] = useState(70);
  const [editingFinanceTarget, setEditingFinanceTarget] = useState(false);
  const [editingSemTarget, setEditingSemTarget] = useState(false);
  const [tempFinanceTarget, setTempFinanceTarget] = useState('70');
  const [tempSemTarget, setTempSemTarget] = useState('70');

  // Data
  const totalRevenue = 7500000;
  const totalClients = 127;
  const activeClients = 104;
  const revenueGrowth = 12.5;
  
  const kickoffClients = 8;
  const kickoffRevenue = 2100000;
  
  const netGrowthRate = 8.2;
  const attritionRate = 5.1;
  const clientsAdded = 12;
  const clientsLost = 7;
  
  const growthTrend = [
    { month: 'Jul', growth: 6.5, attrition: 4.2, clientsAdded: 9, clientsLost: 6 },
    { month: 'Aug', growth: 7.8, attrition: 3.9, clientsAdded: 11, clientsLost: 5 },
    { month: 'Sep', growth: 8.5, attrition: 5.5, clientsAdded: 13, clientsLost: 8 },
    { month: 'Oct', growth: 7.2, attrition: 6.1, clientsAdded: 10, clientsLost: 9 },
    { month: 'Nov', growth: 8.9, attrition: 4.8, clientsAdded: 14, clientsLost: 7 },
    { month: 'Dec', growth: 8.2, attrition: 5.1, clientsAdded: 12, clientsLost: 7 },
  ];

  // Finance Margins & Targets
  const financeMargin = 42.5; // %
  const financeMarginProgress = (financeMargin / financeTargetMargin) * 100;
  const financeAOV = 58000; // Average Order Value
  const financeCurrentRevenue = 2800000;
  const financeCurrentCost = financeCurrentRevenue * (1 - financeMargin / 100);

  // SEM Margins & Targets
  const semMargin = 38.2; // %
  const semMarginProgress = (semMargin / semTargetMargin) * 100;
  const semAOV = 72000;
  const semCurrentRevenue = 3200000;
  const semCurrentCost = semCurrentRevenue * (1 - semMargin / 100);

  // Resource Utilization - Monthly capacity tracking (160 hrs/month per FTE)
  const resourceData = [
    {
      service: 'Finance',
      hoursAllocated: 3840,
      hoursAvailable: 4800,
      totalHrUnallocated: 960,
      totalHrsUnutilizedPercent: 20,
      subCategories: [
        {
          name: 'Managers',
          hoursAllocated: 1120,
          hoursAvailable: 1280,
          totalHrUnallocated: 160,
          totalHrsUnutilizedPercent: 12.5,
          employees: [
            { name: 'Abdul Rahman', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Anil Kapoor', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Afroz Khan', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Suman Patel', hoursAllocated: 144, hoursAvailable: 160, totalHrUnallocated: 16, totalHrsUnutilizedPercent: 10 },
            { name: 'Mansi Shah', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Jigar Mehta', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Irshad Ali', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Zubeer Ahmed', hoursAllocated: 120, hoursAvailable: 160, totalHrUnallocated: 40, totalHrsUnutilizedPercent: 25 },
          ]
        },
        {
          name: 'Full Time Employee',
          hoursAllocated: 2040,
          hoursAvailable: 2400,
          totalHrUnallocated: 360,
          totalHrsUnutilizedPercent: 15,
          employees: [
            { name: 'Rohan Desai', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Kavita Nair', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Vikram Singh', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Neha Gupta', hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25, totalHrsUnutilizedPercent: 15.6 },
            { name: 'Arjun Reddy', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Priya Sharma', hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26, totalHrsUnutilizedPercent: 16.25 },
            { name: 'Karan Joshi', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Divya Iyer', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Rajesh Kumar', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Anjali Rao', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Deepak Verma', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Sneha Pillai', hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25, totalHrsUnutilizedPercent: 15.6 },
            { name: 'Amit Agarwal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Pooja Menon', hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26, totalHrsUnutilizedPercent: 16.25 },
            { name: 'Rahul Bhat', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
          ]
        },
        {
          name: 'Non Full Time Employee',
          hoursAllocated: 680,
          hoursAvailable: 1120,
          totalHrUnallocated: 440,
          totalHrsUnutilizedPercent: 39.3,
          employees: [
            { name: 'Meera Kulkarni', hoursAllocated: 95, hoursAvailable: 160, totalHrUnallocated: 65, totalHrsUnutilizedPercent: 40.6 },
            { name: 'Sanjay Malik', hoursAllocated: 98, hoursAvailable: 160, totalHrUnallocated: 62, totalHrsUnutilizedPercent: 38.75 },
            { name: 'Ritu Saxena', hoursAllocated: 92, hoursAvailable: 160, totalHrUnallocated: 68, totalHrsUnutilizedPercent: 42.5 },
            { name: 'Gaurav Bhatt', hoursAllocated: 96, hoursAvailable: 160, totalHrUnallocated: 64, totalHrsUnutilizedPercent: 40 },
            { name: 'Swati Jain', hoursAllocated: 94, hoursAvailable: 160, totalHrUnallocated: 66, totalHrsUnutilizedPercent: 41.25 },
            { name: 'Nitin Pandey', hoursAllocated: 97, hoursAvailable: 160, totalHrUnallocated: 63, totalHrsUnutilizedPercent: 39.4 },
            { name: 'Shikha Tripathi', hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52, totalHrsUnutilizedPercent: 32.5 },
          ]
        },
      ]
    },
    {
      service: 'Performance Marketing',
      hoursAllocated: 4560,
      hoursAvailable: 5280,
      totalHrUnallocated: 720,
      totalHrsUnutilizedPercent: 13.6,
      subCategories: [
        {
          name: 'Managers',
          hoursAllocated: 1360,
          hoursAvailable: 1440,
          totalHrUnallocated: 80,
          totalHrsUnutilizedPercent: 5.6,
          employees: [
            { name: 'Rakesh Sinha', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Shweta Malhotra', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Tarun Arora', hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10, totalHrsUnutilizedPercent: 6.25 },
            { name: 'Nidhi Choudhary', hoursAllocated: 154, hoursAvailable: 160, totalHrUnallocated: 6, totalHrsUnutilizedPercent: 3.75 },
            { name: 'Varun Chopra', hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8, totalHrsUnutilizedPercent: 5 },
            { name: 'Pallavi Bansal', hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10, totalHrsUnutilizedPercent: 6.25 },
            { name: 'Kunal Thakur', hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12, totalHrsUnutilizedPercent: 7.5 },
            { name: 'Ananya Khanna', hoursAllocated: 146, hoursAvailable: 160, totalHrUnallocated: 14, totalHrsUnutilizedPercent: 8.75 },
            { name: 'Rohit Bhardwaj', hoursAllocated: 160, hoursAvailable: 160, totalHrUnallocated: 0, totalHrsUnutilizedPercent: 0 },
          ]
        },
        {
          name: 'Full Time Employee',
          hoursAllocated: 2640,
          hoursAvailable: 3040,
          totalHrUnallocated: 400,
          totalHrsUnutilizedPercent: 13.2,
          employees: [
            { name: 'Ishaan Puri', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Shreya Kapoor', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Mayank Ahuja', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Tanvi Deshmukh', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Aditya Rane', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Riya Chawla', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Harsh Mittal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Simran Kohli', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Aryan Goyal', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Diya Mathur', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Karthik Hegde', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Isha Bhatia', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Siddhant Dua', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Avni Khurana', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Yash Suri', hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24, totalHrsUnutilizedPercent: 15 },
            { name: 'Naina Grover', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
            { name: 'Kabir Sethi', hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22, totalHrsUnutilizedPercent: 13.75 },
            { name: 'Mira Dhawan', hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18, totalHrsUnutilizedPercent: 11.25 },
            { name: 'Vihaan Sabharwal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20, totalHrsUnutilizedPercent: 12.5 },
          ]
        },
        {
          name: 'Non Full Time Employee',
          hoursAllocated: 560,
          hoursAvailable: 800,
          totalHrUnallocated: 240,
          totalHrsUnutilizedPercent: 30,
          employees: [
            { name: 'Sara Nayyar', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
            { name: 'Aman Vohra', hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52, totalHrsUnutilizedPercent: 32.5 },
            { name: 'Tara Bajaj', hoursAllocated: 116, hoursAvailable: 160, totalHrUnallocated: 44, totalHrsUnutilizedPercent: 27.5 },
            { name: 'Reyansh Datta', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
            { name: 'Kiara Talwar', hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48, totalHrsUnutilizedPercent: 30 },
          ]
        },
      ]
    },

  ];

  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);

  // Handler functions for target editing
  const handleFinanceTargetClick = () => {
    setTempFinanceTarget(financeTargetMargin.toString());
    setEditingFinanceTarget(true);
  };

  const handleSemTargetClick = () => {
    setTempSemTarget(semTargetMargin.toString());
    setEditingSemTarget(true);
  };

  const saveFinanceTarget = () => {
    const value = parseFloat(tempFinanceTarget);
    if (!isNaN(value) && value > 0 && value <= 100) {
      setFinanceTargetMargin(value);
    }
    setEditingFinanceTarget(false);
  };

  const saveSemTarget = () => {
    const value = parseFloat(tempSemTarget);
    if (!isNaN(value) && value > 0 && value <= 100) {
      setSemTargetMargin(value);
    }
    setEditingSemTarget(false);
  };

  // Margin report states
  const [expandedMarginService, setExpandedMarginService] = useState<string | null>(null);
  const [expandedMarginCategory, setExpandedMarginCategory] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  const [selectedMarginService, setSelectedMarginService] = useState<'All' | 'Finance' | 'Performance Marketing'>('All');

  // Client Relationship by HOD
  const hodRelationships = [
    {
      hod: 'Zubear Shaikh',
      initials: 'ZS',
      color: '#06B6D4',
      department: 'Finance',
      totalClients: 28,
      excellent: 18,
      good: 7,
      needsAttention: 3,
    },
    {
      hod: 'Irshad Qureshi',
      initials: 'IQ',
      color: '#06B6D4',
      department: 'Finance',
      totalClients: 22,
      excellent: 14,
      good: 5,
      needsAttention: 3,
    },
    {
      hod: 'Chinmay Pawar',
      initials: 'CP',
      color: '#7C3AED',
      department: 'Performance Marketing',
      totalClients: 35,
      excellent: 22,
      good: 10,
      needsAttention: 3,
    },
    {
      hod: 'Amisha Jain',
      initials: 'AJ',
      color: '#7C3AED',
      department: 'Performance Marketing',
      totalClients: 30,
      excellent: 19,
      good: 8,
      needsAttention: 3,
    },
  ];

  // Employee-level margin report - using hierarchical data
  const filteredMarginData = selectedMarginService === 'All' 
    ? marginReportData 
    : marginReportData.filter(s => s.service === selectedMarginService);
  
  // Calculate company-level margin totals
  const companyTotalBilling = marginReportData.reduce((sum, service) => sum + service.finalBilling, 0);
  const companyTotalCost = marginReportData.reduce((sum, service) => sum + service.totalCost, 0);
  const companyTotalMargin = companyTotalBilling - companyTotalCost;
  const companyMarginPercent = (companyTotalMargin / companyTotalBilling) * 100;
  const totalEmployees = marginReportData.reduce((sum, s) => sum + s.teamCategories.reduce((catSum, c) => catSum + c.employees.length, 0), 0);

  const assignments = [
    { client: 'TechCorp India', project: 'Q4 Tax Planning', dueDate: '2024-12-28', status: 'In Progress' },
    { client: 'Retail Solutions', project: 'Campaign Optimization', dueDate: '2024-12-30', status: 'Pending' },
    { client: 'FinServe Ltd', project: 'Budget Review', dueDate: '2025-01-05', status: 'Scheduled' },
  ];

  const incidents = [
    { client: 'HealthTech Co', issue: 'Delayed GST Filing', priority: 'High', reportedDate: '2024-12-20' },
    { client: 'EduPlatform', issue: 'Client Concern - Team Size', priority: 'Medium', reportedDate: '2024-12-22' },
  ];

  const upcomingBirthdays = [
    { name: 'Anjali Kumar', date: 'Dec 28', team: 'Finance' },
    { name: 'Raj Sharma', date: 'Dec 30', team: 'Performance Marketing' },
    { name: 'Priya Singh', date: 'Jan 2', team: 'Finance' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
          <p className="text-xs text-black/60 mb-1">{data.month}</p>
          <p style={{ color: '#10B981' }} className="text-sm font-medium">
            Growth: {data.growth}% (+{data.clientsAdded} clients)
          </p>
          <p style={{ color: '#F43F5E' }} className="text-sm font-medium">
            Attrition: {data.attrition}% (-{data.clientsLost} clients)
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate company-level totals
  const companyHoursAllocated = resourceData.reduce((sum, service) => sum + service.hoursAllocated, 0);
  const companyHoursAvailable = resourceData.reduce((sum, service) => sum + service.hoursAvailable, 0);
  const companyHoursUnallocated = companyHoursAvailable - companyHoursAllocated;
  const companyUnutilizedPercent = (companyHoursUnallocated / companyHoursAvailable) * 100;

  return (
    <div className="space-y-7" role="region" aria-label="Dashboard overview">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-5">
        {/* Total Revenue */}
        <button
          onClick={onNavigateToAdminland}
          className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all text-left group"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base font-bold" aria-hidden="true">₹</span>
            </div>
            <span className="text-black/60 text-caption font-medium">Total Revenue</span>
          </div>
          <div className="text-black/90 text-h1">₹{(totalRevenue / 100000).toFixed(1)}L</div>
          <div className="flex items-center gap-1.5 mt-1.5 mb-4">
            <div className="flex items-center gap-0.5 text-emerald-600 text-caption font-semibold">
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
              {revenueGrowth}%
            </div>
            <span className="text-black/60 text-caption">vs last month</span>
          </div>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Total Clients</span>
              <span className="text-black/80 text-caption font-semibold">{totalClients}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Active</span>
              <span className="text-emerald-600 text-caption font-semibold">{activeClients}</span>
            </div>
          </div>
        </button>

        {/* Client Kick-off */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
            <span className="text-black/60 text-caption font-medium">Client Kick-offs</span>
          </div>
          <div className="text-black/90 text-h1">{kickoffClients}</div>
          <div className="flex items-center gap-1.5 mt-1.5 mb-4">
            <span className="text-emerald-600 text-caption font-semibold">₹{(kickoffRevenue / 100000).toFixed(1)}L</span>
            <span className="text-black/60 text-caption">new revenue</span>
          </div>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Latest Kickoff</span>
              <span className="text-black/80 text-caption font-semibold">TechCorp India</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Service</span>
              <span className="text-black/80 text-caption font-semibold">Performance Marketing</span>
            </div>
          </div>
        </div>

        {/* Net Growth */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-violet-600" aria-hidden="true" />
            </div>
            <span className="text-black/60 text-caption font-medium">Net Growth</span>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className="text-emerald-600 text-h1">{netGrowthRate}%</div>
              <span className="text-black/60 mt-1 block text-caption">Growth</span>
            </div>
            <div>
              <div className="text-rose-500 text-h1">{attritionRate}%</div>
              <span className="text-black/60 mt-1 block text-caption">Attrition</span>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Added</span>
              <span className="text-emerald-600 text-caption font-semibold">+{clientsAdded}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Lost</span>
              <span className="text-rose-500 text-caption font-semibold">-{clientsLost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance & SEM Margins + Targets */}
      <div className="grid grid-cols-4 gap-5">
        {/* Finance Margin */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Percent className="w-4 h-4 text-blue-600" aria-hidden="true" />
            </div>
            <span className="text-black/60 text-caption font-medium">Finance Margin</span>
          </div>
          <div className="text-blue-600 text-h1">{financeMargin}%</div>
          <span className="text-black/60 mt-1.5 block mb-4 text-caption">Current margin</span>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Avg Order Value</span>
              <span className="text-black/80 text-caption font-semibold">₹{(financeAOV / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>

        {/* Finance Target */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-violet-600" aria-hidden="true" />
              </div>
              <span className="text-black/60 text-caption font-medium">Finance Target</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full ${financeMargin >= financeTargetMargin ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600'} text-xs font-semibold`} >
              {financeMarginProgress.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-black/90 text-h1">{financeMargin}%</span>
            <span className="text-black/30 text-h3 font-normal">/</span>
            {editingFinanceTarget ? (
              <input
                type="number"
                value={tempFinanceTarget}
                onChange={(e) => setTempFinanceTarget(e.target.value)}
                onBlur={saveFinanceTarget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFinanceTarget();
                  if (e.key === 'Escape') setEditingFinanceTarget(false);
                }}
                aria-label="Finance target margin percentage"
                className="w-14 text-black/70 bg-violet-50 border border-violet-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-violet-400 text-body"
                
                autoFocus
                min="0"
                max="100"
                step="1"
              />
            ) : (
              <button
                onClick={handleFinanceTargetClick}
                aria-label={`Edit finance target, currently ${financeTargetMargin}%`}
                className="text-black/50 hover:text-violet-600 hover:bg-violet-50 px-1 rounded transition-all text-h3 font-medium"
                
              >
                {financeTargetMargin}%
              </button>
            )}
          </div>
          <div className="w-full bg-black/5 rounded-full h-1.5 mt-3 mb-4">
            <div 
              className="bg-violet-600 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(financeMarginProgress, 100)}%` }}
            />
          </div>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Revenue</span>
              <span className="text-black/80 text-caption font-semibold">₹{(financeCurrentRevenue / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Cost</span>
              <span className="text-black/80 text-caption font-semibold">₹{(financeCurrentCost / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Profit</span>
              <span className={`${(financeCurrentRevenue - financeCurrentCost) >= 0 ? 'text-emerald-600' : 'text-rose-500'} text-caption font-semibold`} >₹{((financeCurrentRevenue - financeCurrentCost) / 100000).toFixed(1)}L</span>
            </div>
            {financeMargin < financeTargetMargin && (
              <div className="flex items-center justify-between">
                <span className="text-black/60 text-caption">Gap to Target</span>
                <span className="text-violet-600 text-caption font-semibold">{(financeTargetMargin - financeMargin).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* SEM Margin */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Percent className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
            <span className="text-black/60 text-caption font-medium">SEM Margin</span>
          </div>
          <div className="text-emerald-600 text-h1">{semMargin}%</div>
          <span className="text-black/60 mt-1.5 block mb-4 text-caption">Current margin</span>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Avg Order Value</span>
              <span className="text-black/80 text-caption font-semibold">₹{(semAOV / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>

        {/* SEM Target */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-rose-500" aria-hidden="true" />
              </div>
              <span className="text-black/60 text-caption font-medium">SEM Target</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full ${semMargin >= semTargetMargin ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'} text-xs font-semibold`} >
              {semMarginProgress.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-black/90 text-h1">{semMargin}%</span>
            <span className="text-black/30 text-h3 font-normal">/</span>
            {editingSemTarget ? (
              <input
                type="number"
                value={tempSemTarget}
                onChange={(e) => setTempSemTarget(e.target.value)}
                onBlur={saveSemTarget}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveSemTarget();
                  if (e.key === 'Escape') setEditingSemTarget(false);
                }}
                aria-label="SEM target margin percentage"
                className="w-14 text-black/70 bg-rose-50 border border-rose-200 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-rose-400 text-body"
                
                autoFocus
                min="0"
                max="100"
                step="1"
              />
            ) : (
              <button
                onClick={handleSemTargetClick}
                aria-label={`Edit SEM target, currently ${semTargetMargin}%`}
                className="text-black/50 hover:text-rose-500 hover:bg-rose-50 px-1 rounded transition-all text-h3 font-medium"
                
              >
                {semTargetMargin}%
              </button>
            )}
          </div>
          <div className="w-full bg-black/5 rounded-full h-1.5 mt-3 mb-4">
            <div 
              className="bg-rose-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(semMarginProgress, 100)}%` }}
            />
          </div>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Revenue</span>
              <span className="text-black/80 text-caption font-semibold">₹{(semCurrentRevenue / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Cost</span>
              <span className="text-black/80 text-caption font-semibold">₹{(semCurrentCost / 100000).toFixed(1)}L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">Profit</span>
              <span className={`${(semCurrentRevenue - semCurrentCost) >= 0 ? 'text-emerald-600' : 'text-rose-500'} text-caption font-semibold`} >₹{((semCurrentRevenue - semCurrentCost) / 100000).toFixed(1)}L</span>
            </div>
            {semMargin < semTargetMargin && (
              <div className="flex items-center justify-between">
                <span className="text-black/60 text-caption">Gap to Target</span>
                <span className="text-rose-500 text-caption font-semibold">{(semTargetMargin - semMargin).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Growth Trend Chart */}
      <div className="bg-white rounded-xl p-6 border border-black/5">
        <h3 className="text-black/70 mb-4 text-body font-semibold">Net Growth & Attrition Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={growthTrend}>
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Area key="area-growth" type="monotone" dataKey="growth" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorGrowth)" />
            <Area key="area-attrition" type="monotone" dataKey="attrition" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorAttrition)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Resource Utilization */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="p-5 border-b border-black/5">
          <h3 className="text-h3" style={{ color: 'rgba(0,0,0,0.85)' }}>Resource Utilization</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Resource utilization by service">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-5 py-3 text-left text-black/65 text-caption font-medium">Service / Teams</th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Hours Allocated
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Hours Available
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Total Hr. Unallocated
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Total Hrs. Unutilized (%)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resourceData.flatMap((service) => [
                  <tr 
                    key={service.service}
                    className="border-b border-black/5 hover:bg-black/[0.02] cursor-pointer"
                    onClick={() => setExpandedService(expandedService === service.service ? null : service.service)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {service.subCategories.length > 0 && (
                          <ChevronDown className={`w-3.5 h-3.5 text-black/60 transition-transform ${expandedService === service.service ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                        )}
                        <span className="text-black/90 text-body font-medium">{service.service}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAllocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAvailable.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.totalHrUnallocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                  </tr>,
                  ...(expandedService === service.service ? service.subCategories.flatMap((subCat) => [
                      <tr 
                        key={`${service.service}-${subCat.name}`}
                        className="bg-black/[0.01] border-b border-black/5 hover:bg-black/[0.03] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSubCategory(expandedSubCategory === `${service.service}-${subCat.name}` ? null : `${service.service}-${subCat.name}`);
                        }}
                      >
                        <td className="px-5 py-2 pl-10">
                          <div className="flex items-center gap-2">
                            {subCat.employees.length > 0 && (
                              <ChevronDown className={`w-3 h-3 text-black/60 transition-transform ${expandedSubCategory === `${service.service}-${subCat.name}` ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                            )}
                            <span className="text-black/70 text-caption font-medium">{subCat.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAllocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAvailable.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrUnallocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                      </tr>,
                      ...(expandedSubCategory === `${service.service}-${subCat.name}` ? subCat.employees.map((emp) => (
                        <tr key={`${service.service}-${subCat.name}-${emp.name}`} className="bg-black/[0.02] border-b border-black/5">
                          <td className="px-5 py-2 pl-16">
                            <span className="text-black/65 text-caption">{emp.name}</span>
                          </td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAllocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAvailable.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.totalHrUnallocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                        </tr>
                      )) : [])
                  ]) : [])
              ])}
            </tbody>
          </table>
        </div>
        
        {/* Intelligence Insights */}
        <div className="border-t border-black/5">
          <button
            onClick={() => toggleSection('ru-insights')}
            className="w-full flex items-center gap-2.5 p-6 pb-0 hover:bg-black/[0.005] transition-colors cursor-pointer"
            style={{ paddingBottom: expandedSections['ru-insights'] ? '0' : '24px' }}
            aria-expanded={expandedSections['ru-insights']}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF1FB' }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />
            </div>
            <h4 className="flex-1 text-left text-body font-semibold" style={{ color: 'rgba(0,0,0,0.85)' }}>Intelligence Insights</h4>
            <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedSections['ru-insights'] ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {expandedSections['ru-insights'] && (
          <div className="p-6 pt-5">
            {/* Summary Stats Row */}
            <div className="grid grid-cols-3 gap-5 mb-5">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Company Allocation</p>
                <p className="text-black/90 text-h2">{companyHoursAllocated.toLocaleString()} hrs</p>
                <p className="text-black/60 mt-0.5 text-caption">of {companyHoursAvailable.toLocaleString()} available</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Unutilized Capacity</p>
                <p className="text-amber-600 text-h2">{companyHoursUnallocated.toLocaleString()} hrs</p>
                <p className="text-black/60 mt-0.5 text-caption">{companyUnutilizedPercent.toFixed(1)}% unused</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Utilization Rate</p>
                <p className="text-black/90 text-h2">{(100 - companyUnutilizedPercent).toFixed(1)}%</p>
                <div className="w-full rounded-full h-1.5 mt-2" style={{ backgroundColor: '#E8ECF8' }}>
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${100 - companyUnutilizedPercent}%`, backgroundColor: '#5B7FD6' }} />
                </div>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
                  bg: '#ECFDF5',
                  title: 'Perf. Marketing at peak utilization',
                  desc: '86.4% capacity used — highest across teams. Monitor for burnout risk in managers.',
                },
                {
                  icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
                  bg: '#FFFBEB',
                  title: 'Finance non-FTE pool at 60.7% utilization',
                  desc: '440 hrs unallocated among contract staff. Evaluate consolidation or cross-deploy.',
                },
                {
                  icon: <TrendingUp className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />,
                  bg: '#EEF1FB',
                  title: 'Reallocate 240 non-FTE hrs from Perf. Mktg',
                  desc: '30% unutilized in non-FTE pool. Cross-team deployment can improve ROI by ~8%.',
                },
                {
                  icon: <Target className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />,
                  bg: '#EEF1FB',
                  title: 'Manager bandwidth healthy at 94%+',
                  desc: 'Both departments\' managers near full capacity. No immediate hiring needed.',
                },
              ].map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-black/5 hover:bg-black/[0.01] transition-colors">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: insight.bg }}>
                    {insight.icon}
                  </div>
                  <div>
                    <p className="text-caption font-semibold" style={{ color: 'rgba(0,0,0,0.8)' }}>{insight.title}</p>
                    <p className="text-black/60 mt-0.5 text-caption font-normal leading-normal">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Client Relationship by HOD */}
      <div className="bg-white rounded-xl border border-black/5">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-black/90 text-body font-semibold">Client Relationship Overview by HOD</h3>
            <p className="text-black/50 mt-0.5 text-caption">Relationship health distribution across department heads</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00C875' }} />
              <span className="text-caption text-black/60">Excellent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FDAB3D' }} />
              <span className="text-caption text-black/60">Good</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#E2445C' }} />
              <span className="text-caption text-black/60">Needs Attention</span>
            </div>
          </div>
        </div>
        <div className="p-5 grid grid-cols-4 gap-5">
          {hodRelationships.map((hod) => {
            const chartData = [
              { name: `${hod.hod}-Excellent`, label: 'Excellent', value: hod.excellent, fill: '#00C875' },
              { name: `${hod.hod}-Good`, label: 'Good', value: hod.good, fill: '#FDAB3D' },
              { name: `${hod.hod}-NeedsAttention`, label: 'Needs Attention', value: hod.needsAttention, fill: '#E2445C' },
            ];
            const excellentPct = Math.round((hod.excellent / hod.totalClients) * 100);
            return (
              <div key={hod.hod} className="flex flex-col items-center rounded-xl p-4 bg-[#F6F7FF]/60 hover:bg-[#F6F7FF] transition-colors">
                <div className="flex items-center gap-2.5 mb-4 self-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-caption font-semibold" style={{ backgroundColor: hod.color }}>
                    {hod.initials}
                  </div>
                  <div>
                    <p className="text-body font-medium text-black/90">{hod.hod}</p>
                    <p className="text-black/50 text-caption">{hod.department}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={46}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`${hod.hod}-${entry.name}-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-xl px-3 py-2 rounded-xl shadow-lg border border-black/5">
                              <p className="text-caption font-medium text-black/90">{payload[0].payload.label}</p>
                              <p className="text-body font-semibold" style={{ color: payload[0].payload.fill }}>
                                {payload[0].value} clients
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-col items-center gap-0.5">
                  <p className="text-body font-semibold text-black/80">{hod.totalClients} <span className="font-normal text-caption text-black/50">clients</span></p>
                  <p className="text-caption text-[#00C875] font-medium">{excellentPct}% excellent</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee-level Margin Report */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-black/90 text-body font-semibold">Employee-Level Margin Report</h3>
            <p className="text-black/50 mt-0.5 text-caption">Cost breakdown and profitability by service, team type, and employee</p>
          </div>
          <div className="relative">
            <select
              value={selectedMarginService}
              onChange={(e) => setSelectedMarginService(e.target.value as any)}
              className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:border-[#204CC7]/30 transition-all cursor-pointer"
              aria-label="Filter by service"
            >
              <option value="All">All Services</option>
              <option value="Finance">Finance</option>
              <option value="Performance Marketing">Performance Marketing</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Employee margin report">
            <thead>
              <tr className="border-b border-black/5 bg-[#F6F7FF]">
                <th className="px-5 py-3 text-left text-caption font-medium text-black/60" style={{ minWidth: 200 }}>Service / Employee</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Billing</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Exec. Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Mgr. Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">GST</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Total Cost</th>
                <th className="px-4 py-3 text-right text-caption font-medium text-black/60">Margin</th>
                <th className="px-4 py-3 text-center text-caption font-medium text-black/60" style={{ minWidth: 80 }}>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {filteredMarginData.flatMap((service) => [
                  <tr
                    key={service.service}
                    className="border-b border-black/5 bg-black/[0.02] hover:bg-black/[0.04] cursor-pointer transition-colors"
                    onClick={() => setExpandedMarginService(expandedMarginService === service.service ? null : service.service)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {service.teamCategories.length > 0 && (
                          <ChevronDown className={`w-3.5 h-3.5 text-black/50 transition-transform ${expandedMarginService === service.service ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                        )}
                        <span className="text-body font-semibold text-black/90">{service.service}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-black/90">₹{(service.finalBilling / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.executiveCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.managerCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-medium text-black/70">₹{(service.gst / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-[#E2445C]">₹{(service.totalCost / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-right text-body font-semibold text-[#00C875]">₹{(service.margin / 100000).toFixed(2)}L</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-semibold border ${
                        service.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        service.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {service.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>,
                  ...(expandedMarginService === service.service ? service.teamCategories.flatMap((category) => [
                      <tr
                        key={`${service.service}-${category.name}`}
                        className="border-b border-black/5 hover:bg-black/[0.03] cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMarginCategory(expandedMarginCategory === `${service.service}-${category.name}` ? null : `${service.service}-${category.name}`);
                        }}
                      >
                        <td className="px-5 py-2.5 pl-10">
                          <div className="flex items-center gap-2">
                            {category.employees.length > 0 && (
                              <ChevronDown className={`w-3 h-3 text-black/50 transition-transform ${expandedMarginCategory === `${service.service}-${category.name}` ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                            )}
                            <span className="text-caption font-medium text-black/70">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-black/70">₹{(category.finalBilling / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.executiveCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.managerCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(category.gst / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-[#E2445C]">₹{(category.totalCost / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-right text-caption font-medium text-[#00C875]">₹{(category.margin / 100000).toFixed(2)}L</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                            category.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            category.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {category.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>,
                      ...(expandedMarginCategory === `${service.service}-${category.name}` ? category.employees.map((emp) => (
                        <tr key={`${service.service}-${category.name}-${emp.name}`} className="border-b border-black/5 bg-black/[0.015] hover:bg-black/[0.04] transition-colors">
                          <td className="px-5 py-2.5 pl-16">
                            <span className="text-caption text-black/60">{emp.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/70">₹{(emp.finalBilling / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.executiveCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.managerCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-black/60">₹{(emp.gst / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption text-[#E2445C]">₹{(emp.totalCost / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-right text-caption font-medium text-[#00C875]">₹{(emp.margin / 100000).toFixed(2)}L</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${
                              emp.marginPercent >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              emp.marginPercent >= 20 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {emp.marginPercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )) : [])
                  ]) : [])
              ])}
            </tbody>
          </table>
        </div>
        
        {/* Profitability Intelligence */}
        <div className="border-t border-black/5">
          <button
            onClick={() => toggleSection('pi-insights')}
            className="w-full flex items-center gap-2.5 p-6 hover:bg-black/[0.005] transition-colors cursor-pointer"
            style={{ paddingBottom: expandedSections['pi-insights'] ? '0' : '24px' }}
            aria-expanded={expandedSections['pi-insights']}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EEF1FB' }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />
            </div>
            <h4 className="flex-1 text-left text-body font-semibold" style={{ color: 'rgba(0,0,0,0.85)' }}>Profitability Intelligence</h4>
            <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${expandedSections['pi-insights'] ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {expandedSections['pi-insights'] && (
          <div className="p-6 pt-5">
            <div className="grid grid-cols-3 gap-5 mb-5">
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Company Margin</p>
                <p className="text-emerald-600 text-h2">{companyMarginPercent.toFixed(1)}%</p>
                <p className="text-black/60 mt-0.5 text-caption">₹{(companyTotalMargin / 100000).toFixed(1)}L profit</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Total Cost Base</p>
                <p className="text-black/90 text-h2">₹{(companyTotalCost / 100000).toFixed(1)}L</p>
                <p className="text-black/60 mt-0.5 text-caption">{totalEmployees} employees</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: '#F6F7FF' }}>
                <p className="text-black/65 mb-1 text-caption font-medium">Best Performing</p>
                <p className="text-black/90 text-h2">Finance</p>
                <p className="text-emerald-600 mt-0.5 text-caption font-medium">{marginReportData.find(s => s.service === 'Finance')?.marginPercent.toFixed(1)}% margin</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
                  bg: '#ECFDF5',
                  title: `Finance maintains strongest margins at ${marginReportData.find(s => s.service === 'Finance')?.marginPercent.toFixed(1)}%`,
                  desc: 'Consistent profitability — consider scaling this team to capture more market share.',
                },
                {
                  icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
                  bg: '#FFFBEB',
                  title: 'Perf. Marketing billing up but margins under pressure',
                  desc: 'Revenue growing but cost ratio rising. Review manager allocation and vendor costs.',
                },
                {
                  icon: <TrendingUp className="w-3.5 h-3.5" style={{ color: '#5B7FD6' }} aria-hidden="true" />,
                  bg: '#EEF1FB',
                  title: 'Non-FTE employees show 4-5% higher margins',
                  desc: 'Contract staff deliver better cost efficiency. Evaluate optimal FTE/non-FTE ratio.',
                },
              ].map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-black/5 hover:bg-black/[0.01] transition-colors">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: insight.bg }}>
                    {insight.icon}
                  </div>
                  <div>
                    <p className="text-caption font-semibold" style={{ color: 'rgba(0,0,0,0.8)' }}>{insight.title}</p>
                    <p className="text-black/60 mt-0.5 text-caption font-normal leading-normal">{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>

    </div>
  );
}