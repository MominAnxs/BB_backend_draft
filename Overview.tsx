'use client';
import { Users, Briefcase, TrendingUp, ChevronDown, ArrowUp, Target, Percent, TrendingDown, AlertCircle, CheckCircle, User, Lightbulb, ChevronRight, Award, AlertTriangle, ArrowRight } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname } from 'next/navigation';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { marginReportData } from '@/lib/data/margin-report-data';
import { clientMarginData, type ClientMarginEntry } from '@/lib/data/client-margin-data';

// ── CLA/NTF Data ──────────────────────────────────────────────────────────────

interface ClientNomination {
  client: string;
  reason: string;
  claStatus: 'sureshot' | 'can-be-saved';
  responsible: string;
}

interface EmployeeNomination {
  employee: string;
  initials: string;
  color: string;
  reason: string;
  dateAdded: string;
  clients: string[];
}

const clientNominations: ClientNomination[] = [
  { client: 'Bio Basket', reason: 'ROAS dropped 40% over 2 months, unresponsive to strategy changes', claStatus: 'sureshot', responsible: 'Chinmay P.' },
  { client: 'Valiente Caps', reason: 'Budget cuts planned, considering in-house marketing', claStatus: 'can-be-saved', responsible: 'Harshal R.' },
  { client: 'Green Valley Enterprises', reason: 'Missed 2 compliance deadlines, trust eroding', claStatus: 'can-be-saved', responsible: 'Zubear S.' },
  { client: 'FRR (BLOGS)', reason: 'No engagement in 30 days, all tasks stalled', claStatus: 'sureshot', responsible: 'Mihir L.' },
  { client: 'Meeami Fashion', reason: 'Competitor offering lower rates, exploring options', claStatus: 'can-be-saved', responsible: 'Chinmay P.' },
];

const employeeNominations: EmployeeNomination[] = [
  { employee: 'Harshal R.', initials: 'HR', color: '#10B981', reason: 'Consistent missed deadlines across accounts', dateAdded: '01 Apr', clients: ['Bio Basket', 'Valiente Caps', '99 Pancakes'] },
  { employee: 'Mihir L.', initials: 'ML', color: '#F59E0B', reason: 'Slow response time, client escalations rising', dateAdded: '28 Mar', clients: ['FRR (BLOGS)', 'Green Valley'] },
  { employee: 'Chinmay P.', initials: 'CP', color: '#7C3AED', reason: 'Below target ROAS on 3 accounts', dateAdded: '25 Mar', clients: ['Bio Basket', 'Meeami Fashion', 'Valiente Caps', 'July Issue'] },
  { employee: 'Zubear S.', initials: 'ZS', color: '#06B6D4', reason: 'Compliance filings delayed twice in Q1', dateAdded: '30 Mar', clients: ['Green Valley', 'Bilawala & Co'] },
];

const CIRCLE_COLORS = ['bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600', 'bg-purple-100 text-purple-600', 'bg-cyan-100 text-cyan-600'];

function ClientCirclesGroup({ clients }: { clients: string[] }) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const showTip = useCallback(() => {
    if (groupRef.current) {
      const r = groupRef.current.getBoundingClientRect();
      setCoords({ x: r.left + r.width / 2, y: r.top });
    }
    setHover(true);
  }, []);

  return (
    <>
      <div
        ref={groupRef}
        onMouseEnter={showTip}
        onMouseLeave={() => setHover(false)}
        className="flex items-center -space-x-1.5 cursor-default"
        aria-label={`Clients: ${clients.join(', ')}`}
      >
        {clients.slice(0, 3).map((client, ci) => (
          <div key={ci} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-caption font-bold ${CIRCLE_COLORS[ci % CIRCLE_COLORS.length]}`}>
            {client.charAt(0)}
          </div>
        ))}
        {clients.length > 3 && (
          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-caption font-bold text-black/55">
            +{clients.length - 3}
          </div>
        )}
      </div>
      {hover && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div className="px-3 py-2 rounded-lg bg-gray-900 text-white shadow-lg max-w-[240px]">
            <p className="text-caption font-semibold text-white/50 uppercase tracking-wide mb-1">Assigned Clients</p>
            <div className="flex flex-col gap-0.5">
              {clients.map((c, i) => (
                <span key={i} className="text-caption font-medium leading-snug">{c}</span>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OverviewProps {
  globalDateRange?: 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';
  globalDepartment?: 'All' | 'Finance' | 'Performance Marketing';
}

export function Overview({ globalDateRange = 'ytd', globalDepartment = 'All' }: OverviewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminland = pathname.startsWith('/adminland');
  const baseRoute = isAdminland ? '/adminland/overview' : '/home';
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

  // Gross Margins (blended)
  const grossRevenue = financeCurrentRevenue + semCurrentRevenue;
  const grossCost = financeCurrentCost + semCurrentCost;
  const grossMargin = grossRevenue - grossCost;
  const grossMarginPercent = (grossMargin / grossRevenue) * 100;

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

  // Client-wise margin report states
  const [clientMarginView, setClientMarginView] = useState<'service' | 'hod'>('service');
  const [expandedClientGroup, setExpandedClientGroup] = useState<string | null>(null);
  const [clientMarginSort, setClientMarginSort] = useState<'marginPercent' | 'billingPerMonth'>('marginPercent');
  const [clientMarginSortDir, setClientMarginSortDir] = useState<'asc' | 'desc'>('desc');

  const sortedClientMargins = [...clientMarginData].sort((a, b) => {
    const multiplier = clientMarginSortDir === 'desc' ? -1 : 1;
    return (a[clientMarginSort] - b[clientMarginSort]) * multiplier;
  });

  const clientMarginByService = (() => {
    const groups: Record<string, ClientMarginEntry[]> = {};
    sortedClientMargins.forEach(c => {
      if (!groups[c.service]) groups[c.service] = [];
      groups[c.service].push(c);
    });
    return groups;
  })();

  const clientMarginByHOD = (() => {
    const groups: Record<string, ClientMarginEntry[]> = {};
    sortedClientMargins.forEach(c => {
      if (!groups[c.hod]) groups[c.hod] = [];
      groups[c.hod].push(c);
    });
    return groups;
  })();

  const toggleClientMarginSort = (col: typeof clientMarginSort) => {
    if (clientMarginSort === col) {
      setClientMarginSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setClientMarginSort(col);
      setClientMarginSortDir('desc');
    }
  };

  const formatClientCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

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

  // ── Role-wise Margins ──────────────────────────────────────────────────────
  const [roleMarginService, setRoleMarginService] = useState<'all' | 'at' | 'sem'>('all');

  // Role-wise data per service
  // A&T has staffing model: In-house, Outside, Remote executives
  // SEM: all executives are in-house (no staffing model)
  const roleDataAT = [
    { role: 'COO', revenue: 520000, cost: 385000, profit: 135000, margin: 26.0 },
    { role: 'HOD', revenue: 680000, cost: 480000, profit: 200000, margin: 29.4 },
    { role: 'Managers', revenue: 1250000, cost: 920000, profit: 330000, margin: 26.4 },
    { role: 'In-house Executives', revenue: 2850000, cost: 2113000, profit: 737000, margin: 25.9 },
    { role: 'Outside Executives', revenue: 420000, cost: 290600, profit: 129400, margin: 30.8 },
    { role: 'Remote Executives', revenue: 980000, cost: 731400, profit: 248600, margin: 25.4 },
  ];

  const roleDataSEM = [
    { role: 'COO', revenue: 480000, cost: 365000, profit: 115000, margin: 24.0 },
    { role: 'HOD', revenue: 720000, cost: 520000, profit: 200000, margin: 27.8 },
    { role: 'Managers', revenue: 1360000, cost: 1050000, profit: 310000, margin: 22.8 },
    { role: 'In-house Executives', revenue: 4120000, cost: 3241600, profit: 878400, margin: 21.3 },
    { role: 'Outside Executives', revenue: 440000, cost: 324200, profit: 115800, margin: 26.3 },
    { role: 'Remote Executives', revenue: 1120000, cost: 886600, profit: 233400, margin: 20.8 },
  ];

  const roleDataAll = roleDataAT.map((at, i) => ({
    role: at.role,
    revenue: at.revenue + roleDataSEM[i].revenue,
    cost: at.cost + roleDataSEM[i].cost,
    profit: at.profit + roleDataSEM[i].profit,
    margin: parseFloat((((at.profit + roleDataSEM[i].profit) / (at.revenue + roleDataSEM[i].revenue)) * 100).toFixed(1)),
  }));

  const activeRoleData = roleMarginService === 'at' ? roleDataAT : roleMarginService === 'sem' ? roleDataSEM : roleDataAll;
  const roleTotal = activeRoleData.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const roleTotalMargin = roleTotal.revenue > 0 ? (roleTotal.profit / roleTotal.revenue) * 100 : 0;

  // In-house vs Outside breakdown (A&T only — staffing model)
  const inhouseAT = roleDataAT.filter(r => ['COO', 'HOD', 'Managers', 'In-house Executives'].includes(r.role));
  const outsideAT = roleDataAT.filter(r => ['Outside Executives', 'Remote Executives'].includes(r.role));
  const inhouseTotalAT = inhouseAT.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const outsideTotalAT = outsideAT.reduce((a, r) => ({ revenue: a.revenue + r.revenue, cost: a.cost + r.cost, profit: a.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const inhouseMarginAT = inhouseTotalAT.revenue > 0 ? (inhouseTotalAT.profit / inhouseTotalAT.revenue) * 100 : 0;
  const outsideMarginAT = outsideTotalAT.revenue > 0 ? (outsideTotalAT.profit / outsideTotalAT.revenue) * 100 : 0;

  const formatRoleCurrency = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  };

  return (
    <div className="space-y-7" role="region" aria-label="Dashboard overview">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-5">
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

        {/* Gross Margins */}
        <div className="bg-white rounded-xl p-6 border border-black/5 hover:border-black/10 hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Percent className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
            </div>
            <span className="text-black/60 text-caption font-medium">Gross Margins</span>
          </div>
          <div className="text-black/90 text-h1">{grossMarginPercent.toFixed(1)}%</div>
          <div className="flex items-center gap-1.5 mt-1.5 mb-4">
            <span className="text-emerald-600 text-caption font-semibold">₹{(grossMargin / 100000).toFixed(1)}L</span>
            <span className="text-black/60 text-caption">gross profit</span>
          </div>
          <div className="pt-4 border-t border-black/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">A&T</span>
              <span className="text-black/80 text-caption font-semibold">{financeMargin}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/60 text-caption">SEM</span>
              <span className="text-black/80 text-caption font-semibold">{semMargin}%</span>
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
                    Hours to be Allocated
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Allocated Hours
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Available Hours
                  </span>
                </th>
                <th className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-md text-xs font-medium">
                    Available Hours %
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
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.totalHrUnallocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAllocated.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center text-black/70 text-body font-normal">{service.hoursAvailable.toLocaleString()}</td>
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
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrUnallocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAllocated.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.hoursAvailable.toLocaleString()}</td>
                        <td className="px-5 py-2 text-center text-black/65">{subCat.totalHrsUnutilizedPercent.toFixed(1)}%</td>
                      </tr>,
                      ...(expandedSubCategory === `${service.service}-${subCat.name}` ? subCat.employees.map((emp) => (
                        <tr key={`${service.service}-${subCat.name}-${emp.name}`} className="bg-black/[0.02] border-b border-black/5">
                          <td className="px-5 py-2 pl-16">
                            <span className="text-black/65 text-caption">{emp.name}</span>
                          </td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.totalHrUnallocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAllocated.toLocaleString()}</td>
                          <td className="px-5 py-2 text-center text-black/65">{emp.hoursAvailable.toLocaleString()}</td>
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
      <div
        className="bg-white rounded-xl border border-black/5 cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/crh"
        onClick={() => router.push('/adminland/relationships')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/adminland/relationships'); } }}
        tabIndex={0}
        role="link"
        aria-label="Client Relationship Overview by HOD — click to view details"
      >
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-black/90 text-body font-semibold">Client Relationship Overview by HOD</h3>
              <p className="text-black/50 mt-0.5 text-caption">Relationship health distribution across department heads</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/crh:opacity-100 transition-opacity" aria-hidden="true" />
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

      {/* ═══ Role-wise Margins Breakdown ═══ */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
          <div>
            <h3 className="text-body font-semibold text-black/85">Role-wise Margins Breakdown</h3>
            <p className="text-caption text-black/45 mt-0.5">Profitability by organisational role</p>
          </div>
          {/* Service toggle */}
          <div className="flex items-center bg-black/[0.03] rounded-lg p-0.5" role="tablist" aria-label="Filter by service">
            {([
              { key: 'all', label: 'All Services' },
              { key: 'at', label: 'A&T' },
              { key: 'sem', label: 'SEM' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={roleMarginService === tab.key}
                onClick={() => setRoleMarginService(tab.key)}
                className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all ${
                  roleMarginService === tab.key
                    ? 'bg-white text-black/85 shadow-sm'
                    : 'text-black/45 hover:text-black/65'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* ── Table ── */}
          <div className={`${roleMarginService === 'at' ? 'flex-1 border-r border-black/[0.04]' : 'w-full'} overflow-x-auto`}>
            <table className="w-full" role="table" aria-label="Role-wise margins breakdown">
              <thead>
                <tr className="border-b border-black/[0.04] bg-black/[0.015]">
                  <th scope="col" className="px-5 py-2.5 text-left text-caption font-semibold text-black/50 uppercase tracking-wide">Role</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Revenue</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Cost</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Profit</th>
                  <th scope="col" className="px-5 py-2.5 text-right text-caption font-semibold text-black/50 uppercase tracking-wide">Margin</th>
                </tr>
              </thead>
              <tbody>
                {activeRoleData.map((row) => {
                  const isTopMargin = row.margin >= 28;
                  const isLowMargin = row.margin < 22;
                  return (
                    <tr key={row.role} className="border-b border-black/[0.03] last:border-0 hover:bg-black/[0.008] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            row.role === 'COO' ? 'bg-[#204CC7]' :
                            row.role === 'HOD' ? 'bg-[#7C3AED]' :
                            row.role === 'Managers' ? 'bg-[#06B6D4]' :
                            row.role === 'In-house Executives' ? 'bg-[#00C875]' :
                            row.role === 'Outside Executives' ? 'bg-[#FDAB3D]' :
                            'bg-[#F59E0B]'
                          }`} />
                          <span className="text-body font-medium text-black/80">{row.role}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-body text-black/70">{formatRoleCurrency(row.revenue)}</td>
                      <td className="px-5 py-3 text-right text-body text-black/70">{formatRoleCurrency(row.cost)}</td>
                      <td className="px-5 py-3 text-right text-body font-medium text-black/80">{formatRoleCurrency(row.profit)}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-body font-semibold ${
                          isTopMargin ? 'text-emerald-600' : isLowMargin ? 'text-rose-500' : 'text-black/75'
                        }`}>
                          {row.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-black/[0.02] border-t border-black/[0.06]">
                  <td className="px-5 py-3">
                    <span className="text-body font-semibold text-black/85">Total</span>
                  </td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.revenue)}</td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.cost)}</td>
                  <td className="px-5 py-3 text-right text-body font-semibold text-black/85">{formatRoleCurrency(roleTotal.profit)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-body font-bold text-[#204CC7]">{roleTotalMargin.toFixed(1)}%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── In-house vs Outside comparison (A&T only) ── */}
          {roleMarginService === 'at' && (
            <div className="w-[320px] flex-shrink-0 p-5 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
                <p className="text-caption font-semibold text-black/65 uppercase tracking-wide">Staffing Model Comparison</p>
              </div>

              {/* In-house card */}
              <div className="rounded-xl border border-black/[0.06] p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-caption font-semibold text-black/70">In-house</span>
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">{inhouseMarginAT.toFixed(1)}% margin</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Revenue</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(inhouseTotalAT.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Cost</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(inhouseTotalAT.cost)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.04]">
                    <span className="text-caption font-medium text-black/60">Profit</span>
                    <span className="text-caption font-semibold text-emerald-600">{formatRoleCurrency(inhouseTotalAT.profit)}</span>
                  </div>
                </div>
                {/* Margin bar */}
                <div className="mt-3 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${inhouseMarginAT}%` }} />
                </div>
              </div>

              {/* Outside + Remote card */}
              <div className="rounded-xl border border-[#FDAB3D]/20 bg-[#FDAB3D]/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-caption font-semibold text-black/70">Outside + Remote</span>
                  <span className="text-caption font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">{outsideMarginAT.toFixed(1)}% margin</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Revenue</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(outsideTotalAT.revenue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/50">Cost</span>
                    <span className="text-caption font-medium text-black/75">{formatRoleCurrency(outsideTotalAT.cost)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#FDAB3D]/10">
                    <span className="text-caption font-medium text-black/60">Profit</span>
                    <span className="text-caption font-semibold text-amber-600">{formatRoleCurrency(outsideTotalAT.profit)}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${outsideMarginAT}%` }} />
                </div>
              </div>

              {/* Insight pill */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#204CC7]/[0.03] border border-[#204CC7]/10">
                <Lightbulb className="w-3.5 h-3.5 text-[#204CC7] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-caption text-black/55">
                  {outsideMarginAT > inhouseMarginAT
                    ? `Outside + Remote executives yield ${(outsideMarginAT - inhouseMarginAT).toFixed(1)}pp higher margins than in-house — staffing model is more profitable.`
                    : `In-house executives yield ${(inhouseMarginAT - outsideMarginAT).toFixed(1)}pp higher margins — consider optimising the staffing allocation.`
                  }
                </p>
              </div>
            </div>
          )}
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

      {/* Client-wise Margin Report */}
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-black/90 text-body font-semibold">Client-Wise Margin Report</h3>
            <p className="text-black/55 mt-0.5 text-caption">Profitability per client — expand a group to see details</p>
          </div>
          <div className="flex items-center gap-2" role="tablist" aria-label="Group client margins by">
            <div className="flex bg-black/5 rounded-lg p-0.5">
              <button
                role="tab"
                aria-selected={clientMarginView === 'service'}
                onClick={() => { setClientMarginView('service'); setExpandedClientGroup(null); }}
                className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all ${clientMarginView === 'service' ? 'bg-white shadow-sm text-black/90' : 'text-black/55 hover:text-black/70'}`}
              >
                By Service
              </button>
              <button
                role="tab"
                aria-selected={clientMarginView === 'hod'}
                onClick={() => { setClientMarginView('hod'); setExpandedClientGroup(null); }}
                className={`px-3 py-1.5 rounded-md text-caption font-medium transition-all ${clientMarginView === 'hod' ? 'bg-white shadow-sm text-black/90' : 'text-black/55 hover:text-black/70'}`}
              >
                By HOD
              </button>
            </div>
          </div>
        </div>

        {(() => {
          const groups = clientMarginView === 'service' ? clientMarginByService : clientMarginByHOD;
          const groupEntries = Object.entries(groups);
          const serviceColors: Record<string, string> = { 'SEM': '#7C3AED', 'A&T': '#06B6D4' };
          const hodColors: Record<string, string> = { 'Chinmay Pawar': '#7C3AED', 'Zubear Shaikh': '#06B6D4' };

          return groupEntries.map(([groupName, clients], gi) => {
            const groupBilling = clients.reduce((s, c) => s + c.billingPerMonth, 0);
            const groupCost = clients.reduce((s, c) => s + c.totalCost, 0);
            const groupMargin = clients.reduce((s, c) => s + c.grossMargin, 0);
            const groupMarginPct = groupBilling > 0 ? (groupMargin / groupBilling) * 100 : 0;
            const healthyCount = clients.filter(c => c.status === 'Healthy').length;
            const riskCount = clients.filter(c => c.status === 'At Risk').length;
            const accentColor = clientMarginView === 'service'
              ? (serviceColors[groupName] || '#204CC7')
              : (hodColors[groupName] || '#204CC7');
            const isExpanded = expandedClientGroup === groupName;

            return (
              <div key={groupName} className={gi > 0 ? 'border-t border-black/5' : ''}>
                {/* Group summary row */}
                <button
                  onClick={() => setExpandedClientGroup(isExpanded ? null : groupName)}
                  aria-expanded={isExpanded}
                  aria-label={`${groupName} — ${clients.length} clients, ${formatClientCurrency(groupBilling)} billing, ${groupMarginPct.toFixed(1)}% margin`}
                  className="w-full px-5 py-4 hover:bg-black/[0.015] transition-colors cursor-pointer text-left"
                >
                  {/* Row 1: Identity + health badges */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <ChevronDown className={`w-3.5 h-3.5 text-black/40 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                      <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} aria-hidden="true" />
                      <span className="text-body font-semibold text-black/90">{groupName}</span>
                      <span className="text-caption text-black/45">{clients.length} clients</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {healthyCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-caption font-medium text-emerald-700 border border-emerald-100">{healthyCount} healthy</span>}
                      {riskCount > 0 && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-50 text-caption font-medium text-rose-700 border border-rose-100">{riskCount} at risk</span>}
                    </div>
                  </div>
                  {/* Row 2: Metric strip — evenly spaced, no stacked labels */}
                  <div className="flex items-center gap-3 ml-[26px]">
                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                      <span className="text-caption text-black/50">Billing</span>
                      <span className="text-body font-semibold text-black/85">{formatClientCurrency(groupBilling)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                      <span className="text-caption text-black/50">Cost</span>
                      <span className="text-body font-semibold text-black/60">{formatClientCurrency(groupCost)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/[0.025] rounded-md px-3 py-1.5">
                      <span className="text-caption text-black/50">Margin</span>
                      <span className="text-body font-semibold text-[#00C875]">{formatClientCurrency(groupMargin)}</span>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-semibold border ${
                      groupMarginPct >= 25 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      groupMarginPct >= 15 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {groupMarginPct.toFixed(1)}%
                    </span>
                  </div>
                </button>

                {/* Expanded client table — progressive disclosure */}
                {isExpanded && (
                  <div className="border-t border-black/5">
                    <table className="w-full" role="table" aria-label={`${groupName} client margins`}>
                      <thead>
                        <tr className="bg-[#F6F7FF]/60">
                          <th className="px-5 py-2 pl-12 text-left text-caption font-medium text-black/55" style={{ minWidth: 200 }}>Client</th>
                          <th
                            className="px-4 py-2 text-right text-caption font-medium text-black/55 cursor-pointer hover:text-black/70 select-none"
                            onClick={() => toggleClientMarginSort('billingPerMonth')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClientMarginSort('billingPerMonth'); } }}
                            tabIndex={0}
                            role="columnheader"
                            aria-sort={clientMarginSort === 'billingPerMonth' ? (clientMarginSortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                          >
                            Billing / Mo {clientMarginSort === 'billingPerMonth' ? (clientMarginSortDir === 'desc' ? '↓' : '↑') : ''}
                          </th>
                          <th className="px-4 py-2 text-right text-caption font-medium text-black/55">Cost</th>
                          <th
                            className="px-4 py-2 text-center text-caption font-medium text-black/55 cursor-pointer hover:text-black/70 select-none"
                            onClick={() => toggleClientMarginSort('marginPercent')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleClientMarginSort('marginPercent'); } }}
                            tabIndex={0}
                            role="columnheader"
                            aria-sort={clientMarginSort === 'marginPercent' ? (clientMarginSortDir === 'desc' ? 'descending' : 'ascending') : 'none'}
                          >
                            Margin % {clientMarginSort === 'marginPercent' ? (clientMarginSortDir === 'desc' ? '↓' : '↑') : ''}
                          </th>
                          <th className="px-4 py-2 text-center text-caption font-medium text-black/55" style={{ minWidth: 80 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((client) => (
                          <tr key={client.id} className="border-t border-black/[0.03] hover:bg-black/[0.015] transition-colors">
                            <td className="px-5 py-2.5 pl-12">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${client.status === 'Healthy' ? 'bg-emerald-400' : 'bg-rose-400'}`}
                                  role="img"
                                  aria-label={client.status}
                                />
                                <span className="text-caption font-medium text-black/75">{client.clientName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right text-caption text-black/70">{formatClientCurrency(client.billingPerMonth)}</td>
                            <td className="px-4 py-2.5 text-right text-caption text-black/55">{formatClientCurrency(client.totalCost)}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center gap-1">
                                <span className={`text-caption font-semibold ${
                                  client.marginPercent >= 25 ? 'text-emerald-600' :
                                  client.marginPercent >= 10 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {client.marginPercent.toFixed(1)}%
                                </span>
                                {client.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" aria-hidden="true" />}
                                {client.trend === 'down' && <TrendingDown className="w-3 h-3 text-rose-400" aria-hidden="true" />}
                                {client.trend !== 'up' && client.trend !== 'down' && <span className="sr-only">stable</span>}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-caption font-medium ${
                                client.status === 'Healthy' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {client.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>

      {/* ═══ Client CLA + Employee CLA/NTF — Two Columns ═══ */}
      <div className="grid grid-cols-2 gap-5">

        {/* ── Client - CLA ── */}
        <section
          className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col cursor-pointer hover:border-black/[0.12] hover:shadow-sm transition-all group/clientcla"
          aria-label="Client CLA nominations — click to view details"
          onClick={() => router.push('/adminland/clients?tab=cla')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/adminland/clients?tab=cla'); } }}
          tabIndex={0}
          role="link"
        >
          <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center" aria-hidden="true">
                <Award className="w-3.5 h-3.5 text-[#204CC7]" />
              </div>
              <h3 className="text-body font-semibold text-black/80">Client - CLA</h3>
              <ArrowRight className="w-3.5 h-3.5 text-black/25 opacity-0 group-hover/clientcla:opacity-100 transition-opacity" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption font-semibold px-1.5 py-0.5 rounded-md bg-[#E2445C]/[0.08] text-[#E2445C]">{clientNominations.filter(n => n.claStatus === 'sureshot').length} sureshot</span>
              <span className="text-caption font-semibold px-1.5 py-0.5 rounded-md bg-[#FDAB3D]/[0.08] text-[#FDAB3D]">{clientNominations.filter(n => n.claStatus === 'can-be-saved').length} saveable</span>
            </div>
          </div>
          {/* Table header */}
          <div className="px-5 py-2 bg-black/[0.015] flex items-center text-caption font-semibold text-black/45">
            <span className="flex-1">Client</span>
            <span className="w-[110px] text-center">Responsible</span>
            <span className="w-[110px] text-right">Status</span>
          </div>
          <div className="overflow-y-auto divide-y divide-black/[0.03]" style={{ maxHeight: '320px' }}>
            {clientNominations.map((n, i) => (
              <div key={i} className="px-5 py-3 flex items-center hover:bg-black/[0.006] transition-colors">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-body font-medium text-black/80 truncate">{n.client}</p>
                  <p className="text-caption text-black/50 truncate">{n.reason}</p>
                </div>
                <span className="w-[110px] text-center text-caption font-medium text-black/65">{n.responsible}</span>
                <span className="w-[110px] text-right">
                  <span className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
                    n.claStatus === 'sureshot'
                      ? 'bg-[#E2445C]/[0.08] text-[#E2445C]'
                      : 'bg-[#FDAB3D]/[0.08] text-[#FDAB3D]'
                  }`}>
                    {n.claStatus === 'sureshot' ? 'Sureshot' : 'Can Be Saved'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Employee - CLA/NTF ── */}
        <section
          className="rounded-xl border border-black/[0.06] bg-white overflow-hidden flex flex-col"
          aria-label="Employee CLA and NTF list"
        >
          <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center" aria-hidden="true">
                <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <h3 className="text-body font-semibold text-black/80">Employee - CLA/NTF</h3>
            </div>
            <span className="text-caption font-semibold px-1.5 py-0.5 rounded-md bg-purple-50 text-[#7C3AED]">{employeeNominations.length}</span>
          </div>
          {/* Table header */}
          <div className="px-5 py-2 bg-black/[0.015] flex items-center text-caption font-semibold text-black/45">
            <span className="w-[60px]">Date</span>
            <span className="flex-1">Employee</span>
            <span className="w-[120px] text-right">Assigned Clients</span>
          </div>
          <div className="divide-y divide-black/[0.03]" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {employeeNominations.map((n, rowIdx) => (
              <div key={rowIdx} className="px-5 py-3 flex items-center hover:bg-black/[0.006] transition-colors">
                <span className="w-[60px] text-caption text-black/50 flex-shrink-0">{n.dateAdded}</span>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-body font-medium text-black/80 truncate">{n.employee}</p>
                  <p className="text-caption text-black/50 truncate">{n.reason}</p>
                </div>
                <div className="w-[120px] flex justify-end flex-shrink-0">
                  <ClientCirclesGroup clients={n.clients} />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

    </div>
  );
}