'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Heart, Search, Building2, User, Calendar, AlertCircle, CheckCircle2, X, FileText, TrendingUp, TrendingDown, Minus, Clock, Filter, Eye, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Shield, Star, AlertTriangle, Phone, BarChart3 } from 'lucide-react';

// ── Types ──
interface ClientRelationship {
  id: string;
  clientName: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  accountManager: string;
  monthlyBilling: number; // ₹/month
  tenure: number; // months
  // Relationship scores (1-5 scale)
  serviceHeadScore: number;
  cooScore: number;
  overallHealth: 'Strong' | 'Healthy' | 'Needs Attention' | 'At Risk';
  trend: 'Improving' | 'Stable' | 'Declining';
  lastTouchpoint: string; // YYYY-MM-DD — last meaningful interaction
  nextReview: string; // YYYY-MM-DD
  touchpointType: 'Strategic Review' | 'Check-in Call' | 'Escalation' | 'QBR' | 'Onboarding';
  keyContact: string; // Client-side decision maker
  keyContactRole: string;
  notes: string;
  status: 'Active' | 'Watch List' | 'Escalated' | 'Stable';
  riskFactors?: string[];
  wins?: string[];
}

type ServiceFilter = 'All' | ClientRelationship['service'];
type HealthFilter = 'All' | ClientRelationship['overallHealth'];
type TrendFilter = 'All' | ClientRelationship['trend'];
type StatusFilter = 'All' | ClientRelationship['status'];
type SortField = 'clientName' | 'monthlyBilling' | 'tenure' | 'overallHealth' | 'nextReview';
type SortDir = 'asc' | 'desc';

interface Filters {
  service: ServiceFilter;
  health: HealthFilter;
  trend: TrendFilter;
  status: StatusFilter;
}

const DEFAULT_FILTERS: Filters = { service: 'All', health: 'All', trend: 'All', status: 'All' };

const HEALTH_ORDER: Record<string, number> = { 'At Risk': 0, 'Needs Attention': 1, 'Healthy': 2, 'Strong': 3 };
const STATUS_OPTIONS: ClientRelationship['status'][] = ['Active', 'Watch List', 'Escalated', 'Stable'];
const STATUS_DOT_COLORS: Record<ClientRelationship['status'], string> = {
  Active: 'bg-blue-400',
  'Watch List': 'bg-amber-400',
  Escalated: 'bg-rose-400',
  Stable: 'bg-emerald-400',
};

// ── Helpers ──
function parseDate(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function formatDate(s: string): string {
  const d = parseDate(s);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function daysSince(s: string): number {
  const d = parseDate(s);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
function daysUntil(s: string): number {
  const d = parseDate(s);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
function formatCurrency(v: number): string {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
}

function getHealthColor(h: string): string {
  switch (h) {
    case 'Strong': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Healthy': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Needs Attention': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'At Risk': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-black/5 text-black/50 border-black/10';
  }
}
function getStatusColor(s: string): string {
  switch (s) {
    case 'Stable': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Active': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Watch List': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Escalated': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-black/5 text-black/50 border-black/10';
  }
}
function getServiceLabel(s: string): string { return s === 'Performance Marketing' ? 'PM' : 'A&T'; }

function renderScore(score: number): { color: string; label: string } {
  if (score >= 4) return { color: 'text-emerald-600', label: 'Excellent' };
  if (score >= 3) return { color: 'text-blue-600', label: 'Good' };
  if (score >= 2) return { color: 'text-amber-600', label: 'Fair' };
  return { color: 'text-rose-600', label: 'Poor' };
}

// ── Realistic Brego Data ──
const initialRelationships: ClientRelationship[] = [
  { id: 'CR-001', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 150000, tenure: 18, serviceHeadScore: 5, cooScore: 5, overallHealth: 'Strong', trend: 'Improving', lastTouchpoint: '2026-03-28', nextReview: '2026-04-05', touchpointType: 'Strategic Review', keyContact: 'Rajesh Khanna', keyContactRole: 'CMO', notes: 'Flagship client. ROAS consistently above 4x. Expanding to Google Ads next quarter. CMO personally praised the team in last QBR.', status: 'Stable', wins: ['ROAS improved 2.1x → 4.8x', 'Upsold to premium tier', 'Case study published'] },
  { id: 'CR-002', clientName: 'Meridian Healthcare', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 45000, tenure: 8, serviceHeadScore: 2, cooScore: 3, overallHealth: 'At Risk', trend: 'Declining', lastTouchpoint: '2026-03-20', nextReview: '2026-04-01', touchpointType: 'Escalation', keyContact: 'Dr. Meera Shah', keyContactRole: 'Founder', notes: 'GST delays 3 months running. Founder personally escalated. Dedicated executive now assigned but trust is damaged. Need consistent delivery for 2 months to recover.', status: 'Escalated', riskFactors: ['Repeated GST delays', 'Founder escalation', 'Competitor pitching'] },
  { id: 'CR-003', clientName: 'NovaTech Solutions', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 60000, tenure: 14, serviceHeadScore: 4, cooScore: 4, overallHealth: 'Healthy', trend: 'Improving', lastTouchpoint: '2026-03-25', nextReview: '2026-04-10', touchpointType: 'Check-in Call', keyContact: 'Vikram Joshi', keyContactRole: 'CFO', notes: 'Strong on delivery. Tax savings of ₹4.2L this FY built significant trust. CFO appreciates proactive advice. Exploring advisory retainer upsell.', status: 'Active', wins: ['₹4.2L tax savings', 'Response SLA met consistently'] },
  { id: 'CR-004', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 85000, tenure: 6, serviceHeadScore: 1, cooScore: 2, overallHealth: 'At Risk', trend: 'Declining', lastTouchpoint: '2026-03-15', nextReview: '2026-03-31', touchpointType: 'Escalation', keyContact: 'Anita Kulkarni', keyContactRole: 'Marketing Head', notes: 'Critical situation. Creative quality issues for 3 consecutive months. Brand name misspelled in ads. Zero conversions in March. Client exploring other agencies.', status: 'Escalated', riskFactors: ['Creative quality failures', 'Zero March conversions', 'Actively exploring alternatives', 'Brand damage from errors'] },
  { id: 'CR-005', clientName: 'GreenLeaf Organics', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 55000, tenure: 24, serviceHeadScore: 5, cooScore: 5, overallHealth: 'Strong', trend: 'Stable', lastTouchpoint: '2026-03-26', nextReview: '2026-04-15', touchpointType: 'QBR', keyContact: 'Arjun Malhotra', keyContactRole: 'Director', notes: 'Model client. Zero errors in 24 months. Proactively flagged TDS mismatch saving ₹1.8L. Video testimonial recorded. Referred 2 new clients.', status: 'Stable', wins: ['Zero errors in 24 months', 'Saved ₹1.8L TDS mismatch', '2 referrals generated', 'Video testimonial'] },
  { id: 'CR-006', clientName: 'Sunrise Hospitality', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 200000, tenure: 12, serviceHeadScore: 5, cooScore: 4, overallHealth: 'Strong', trend: 'Improving', lastTouchpoint: '2026-03-22', nextReview: '2026-04-08', touchpointType: 'Strategic Review', keyContact: 'Rahul Mehra', keyContactRole: 'VP Marketing', notes: 'High-value client. Seasonal campaign drove 62% booking increase in off-peak months. Upsold to premium plan with ₹50K MRR increase. VP personally acknowledged the team.', status: 'Stable', wins: ['62% off-peak booking increase', 'Upsold ₹50K MRR', 'VP Marketing advocates internally'] },
  { id: 'CR-007', clientName: 'UrbanNest Realty', service: 'Performance Marketing', accountManager: 'Akshay Mehta', monthlyBilling: 120000, tenure: 10, serviceHeadScore: 3, cooScore: 3, overallHealth: 'Needs Attention', trend: 'Stable', lastTouchpoint: '2026-03-18', nextReview: '2026-04-02', touchpointType: 'Check-in Call', keyContact: 'Sanjay Gupta', keyContactRole: 'Business Head', notes: 'Communication gap is the core issue. Results are decent (3.2x ROAS) but client feels uninformed. Weekly update calls scheduled but not consistently happening.', status: 'Watch List', riskFactors: ['Inconsistent communication', 'Missed weekly updates', 'Client feels uninformed'] },
  { id: 'CR-008', clientName: 'FreshBite Foods', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 95000, tenure: 9, serviceHeadScore: 4, cooScore: 4, overallHealth: 'Healthy', trend: 'Improving', lastTouchpoint: '2026-03-27', nextReview: '2026-04-12', touchpointType: 'Check-in Call', keyContact: 'Deepa Nair', keyContactRole: 'Growth Lead', notes: 'Solid mid-tier client. CAC reduced from ₹180 to ₹95 after funnel optimization. Client happy with video ad performance. Potential to expand to Instagram shopping.', status: 'Active', wins: ['CAC reduced 50%', 'Video ads outperforming 30%'] },
  { id: 'CR-009', clientName: 'Quantum Finserv', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 75000, tenure: 11, serviceHeadScore: 3, cooScore: 3, overallHealth: 'Needs Attention', trend: 'Declining', lastTouchpoint: '2026-03-19', nextReview: '2026-04-01', touchpointType: 'Escalation', keyContact: 'Nikhil Agarwal', keyContactRole: 'CEO', notes: 'Accuracy issues are the primary concern. 2 errors in March P&L. For a finserv company, this is critical. CEO has raised it directly with COO. Must deliver zero-error April reports.', status: 'Watch List', riskFactors: ['P&L accuracy errors', 'CEO escalation', 'Regulatory risk for client'] },
  { id: 'CR-010', clientName: 'Pinnacle Education', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 350000, tenure: 15, serviceHeadScore: 4, cooScore: 4, overallHealth: 'Healthy', trend: 'Stable', lastTouchpoint: '2026-03-24', nextReview: '2026-04-07', touchpointType: 'Strategic Review', keyContact: 'Amit Deshmukh', keyContactRole: 'CEO', notes: 'Highest billing PM client. Lead quality is the ongoing concern — 35% unqualified. New pre-qualification form implemented. CEO engaged and patient but watching closely.', status: 'Active', wins: ['Consistent lead volume', 'CEO directly engaged'] },
  { id: 'CR-011', clientName: 'Metro Logistics', service: 'Performance Marketing', accountManager: 'Akshay Mehta', monthlyBilling: 65000, tenure: 7, serviceHeadScore: 2, cooScore: 2, overallHealth: 'At Risk', trend: 'Declining', lastTouchpoint: '2026-03-14', nextReview: '2026-03-31', touchpointType: 'Escalation', keyContact: 'Pradeep Kumar', keyContactRole: 'Operations Head', notes: 'Communication breakdown. Multiple missed callbacks. Akshay on performance improvement plan. Client given direct line to team lead as interim measure. Must stabilize within 2 weeks.', status: 'Escalated', riskFactors: ['Missed callbacks', 'AM on PIP', 'Client escalated internally'] },
  { id: 'CR-012', clientName: 'Spice Route Exports', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 40000, tenure: 5, serviceHeadScore: 4, cooScore: 3, overallHealth: 'Healthy', trend: 'Improving', lastTouchpoint: '2026-03-21', nextReview: '2026-04-10', touchpointType: 'Check-in Call', keyContact: 'Arun Kapoor', keyContactRole: 'Co-Founder', notes: 'Newer client showing positive trajectory. Simplified reporting template well received. Cash flow forecast template being added per their request. Building trust steadily.', status: 'Active', wins: ['Simplified reporting appreciated', 'Growing trust'] },
  { id: 'CR-013', clientName: 'Orbit Fashion', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 110000, tenure: 13, serviceHeadScore: 4, cooScore: 4, overallHealth: 'Healthy', trend: 'Stable', lastTouchpoint: '2026-03-23', nextReview: '2026-04-09', touchpointType: 'Strategic Review', keyContact: 'Nisha Verma', keyContactRole: 'Brand Director', notes: 'Reliable relationship. Influencer marketing strategy working well. Brand Director is a strong advocate internally. Exploring micro-influencer expansion for April collection.', status: 'Active', wins: ['Influencer ROI proven', 'Brand Director advocates'] },
  { id: 'CR-014', clientName: 'Artisan Crafts Co', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 35000, tenure: 20, serviceHeadScore: 5, cooScore: 5, overallHealth: 'Strong', trend: 'Stable', lastTouchpoint: '2026-03-26', nextReview: '2026-04-20', touchpointType: 'QBR', keyContact: 'Meena Deshpande', keyContactRole: 'Owner', notes: 'One of our longest-serving A&T clients. Every filing delivered 2-3 days early without exception. Annual contract renewed with 10% rate increase accepted. Perfect compliance record.', status: 'Stable', wins: ['100% on-time delivery', 'Rate increase accepted', 'Annual renewal confirmed'] },
];

// ── Filter Panel ──
function FilterOption<T extends string>({ label, value, selected, onSelect }: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button onClick={() => onSelect(value)} className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-caption transition-all ${selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}>
      <span>{label}</span>
      {selected && <Check className="w-3.5 h-3.5" />}
    </button>
  );
}

function RelationshipFilterPanel({ filters, onChange, onClose, onReset, activeCount }: { filters: Filters; onChange: (f: Filters) => void; onClose: () => void; onReset: () => void; activeCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-[480px] bg-white border border-black/[0.08] rounded-xl shadow-lg z-30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-black/80">Filters</h3>
        {activeCount > 0 && <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset all</button>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            {(['All', 'Performance Marketing', 'Accounts & Taxation'] as ServiceFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : getServiceLabel(opt)} value={opt} selected={filters.service === opt} onSelect={v => onChange({ ...filters, service: v })} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Health</p>
          <div className="space-y-0.5">
            {(['All', 'Strong', 'Healthy', 'Needs Attention', 'At Risk'] as HealthFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Health' : opt} value={opt} selected={filters.health === opt} onSelect={v => onChange({ ...filters, health: v })} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Trend</p>
          <div className="space-y-0.5">
            {(['All', 'Improving', 'Stable', 'Declining'] as TrendFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Trends' : opt} value={opt} selected={filters.trend === opt} onSelect={v => onChange({ ...filters, trend: v })} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Status</p>
          <div className="space-y-0.5">
            {(['All', 'Active', 'Watch List', 'Escalated', 'Stable'] as StatusFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt} value={opt} selected={filters.status === opt} onSelect={v => onChange({ ...filters, status: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trend Badge ──
function TrendBadge({ trend }: { trend: ClientRelationship['trend'] }) {
  if (trend === 'Improving') return <div className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3.5 h-3.5" /><span className="text-caption font-medium">Improving</span></div>;
  if (trend === 'Declining') return <div className="flex items-center gap-1 text-[#E2445C]"><TrendingDown className="w-3.5 h-3.5" /><span className="text-caption font-medium">Declining</span></div>;
  return <div className="flex items-center gap-1 text-black/40"><Minus className="w-3.5 h-3.5" /><span className="text-caption font-medium">Stable</span></div>;
}

// ── Star Rating (read-only, whole numbers 1-5) ──
// color variants: 'amber' (COO default), 'purple' (PM HOD), 'cyan' (A&T HOD)
type StarColor = 'amber' | 'purple' | 'cyan';
const STAR_COLORS: Record<StarColor, { filled: string; text: string }> = {
  amber:  { filled: 'text-[#FDAB3D] fill-[#FDAB3D]', text: 'text-[#FDAB3D]' },
  purple: { filled: 'text-[#7C3AED] fill-[#7C3AED]', text: 'text-[#7C3AED]' },
  cyan:   { filled: 'text-[#06B6D4] fill-[#06B6D4]', text: 'text-[#06B6D4]' },
};

function StarRating({ score, size = 'sm', color = 'amber' }: { score: number; size?: 'sm' | 'md'; color?: StarColor }) {
  const dim = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const c = STAR_COLORS[color];
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${dim} ${i <= score ? c.filled : 'text-black/10 fill-current'}`} />
        ))}
      </div>
      <span className={`text-caption font-semibold ${c.text} tabular-nums ml-0.5`}>{score}/5</span>
    </div>
  );
}

// ── Score Bar (drawer version with label + stars + bar) ──
const BAR_COLORS: Record<StarColor, string> = { amber: 'bg-[#FDAB3D]', purple: 'bg-[#7C3AED]', cyan: 'bg-[#06B6D4]' };

function ScoreBar({ score, label, color = 'amber' }: { score: number; label: string; color?: StarColor }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-black/55 text-caption font-medium">{label}</span>
        <StarRating score={score} size="sm" color={color} />
      </div>
      <div className="h-1.5 rounded-full bg-black/[0.04] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${BAR_COLORS[color]}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
    </div>
  );
}

// ── Main Component ──
export function ClientRelationshipData() {
  const [relationships, setRelationships] = useState<ClientRelationship[]>(initialRelationships);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortField, setSortField] = useState<SortField>('overallHealth');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedClient, setSelectedClient] = useState<ClientRelationship | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setOpenStatusDropdown(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (id: string, newStatus: ClientRelationship['status']) => {
    setRelationships(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setOpenStatusDropdown(null);
  };

  const updateNotes = (id: string, notes: string) => {
    setRelationships(prev => prev.map(r => r.id === id ? { ...r, notes } : r));
    if (selectedClient?.id === id) setSelectedClient(prev => prev ? { ...prev, notes } : prev);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'clientName' ? 'asc' : 'desc'); }
  };

  const filterCount = (filters.service !== 'All' ? 1 : 0) + (filters.health !== 'All' ? 1 : 0) + (filters.trend !== 'All' ? 1 : 0) + (filters.status !== 'All' ? 1 : 0);

  const filteredRelationships = useMemo(() => {
    let result = relationships.filter(r => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || r.clientName.toLowerCase().includes(q) || r.accountManager.toLowerCase().includes(q) || r.keyContact.toLowerCase().includes(q);
      const matchesService = filters.service === 'All' || r.service === filters.service;
      const matchesHealth = filters.health === 'All' || r.overallHealth === filters.health;
      const matchesTrend = filters.trend === 'All' || r.trend === filters.trend;
      const matchesStatus = filters.status === 'All' || r.status === filters.status;
      return matchesSearch && matchesService && matchesHealth && matchesTrend && matchesStatus;
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'monthlyBilling': cmp = a.monthlyBilling - b.monthlyBilling; break;
        case 'tenure': cmp = a.tenure - b.tenure; break;
        case 'overallHealth': cmp = (HEALTH_ORDER[a.overallHealth] ?? 0) - (HEALTH_ORDER[b.overallHealth] ?? 0); break;
        case 'nextReview': cmp = parseDate(a.nextReview).getTime() - parseDate(b.nextReview).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [relationships, searchQuery, filters, sortField, sortDir]);

  // ── KPIs ──
  const total = filteredRelationships.length;
  const strongCount = filteredRelationships.filter(r => r.overallHealth === 'Strong').length;
  const healthyCount = filteredRelationships.filter(r => r.overallHealth === 'Healthy').length;
  const attentionCount = filteredRelationships.filter(r => r.overallHealth === 'Needs Attention').length;
  const atRiskCount = filteredRelationships.filter(r => r.overallHealth === 'At Risk').length;
  const totalMRR = filteredRelationships.reduce((s, r) => s + r.monthlyBilling, 0);
  const atRiskMRR = filteredRelationships.filter(r => r.overallHealth === 'At Risk' || r.overallHealth === 'Needs Attention').reduce((s, r) => s + r.monthlyBilling, 0);
  const improvingCount = filteredRelationships.filter(r => r.trend === 'Improving').length;
  const decliningCount = filteredRelationships.filter(r => r.trend === 'Declining').length;
  const avgScore = total > 0 ? Math.round(filteredRelationships.reduce((s, r) => s + (r.serviceHeadScore + r.cooScore) / 2, 0) / total) : 0;
  const overdueReviews = filteredRelationships.filter(r => daysUntil(r.nextReview) < 0).length;
  const upcomingReviews = filteredRelationships.filter(r => { const d = daysUntil(r.nextReview); return d >= 0 && d <= 7; }).length;
  const pmCount = filteredRelationships.filter(r => r.service === 'Performance Marketing').length;
  const atCount = filteredRelationships.filter(r => r.service === 'Accounts & Taxation').length;

  // ── Insights ──
  const atRiskClients = filteredRelationships.filter(r => r.overallHealth === 'At Risk');
  const overdueClients = filteredRelationships.filter(r => daysUntil(r.nextReview) < 0);

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide cursor-pointer hover:text-black/80 transition-colors select-none ${className}`} onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-black/25" />}
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-h2 font-bold text-black/90">Client Relationships</h2>
          <p className="text-caption font-normal text-black/50 mt-0.5">Track relationship health, manage touchpoints, and protect revenue</p>
        </div>
        <div className="flex items-center gap-2">
          {(filterCount > 0 || searchQuery) && (
            <span className="text-caption font-medium text-black/40">{filteredRelationships.length} of {relationships.length} clients</span>
          )}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
            <input type="text" placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-caption border border-black/10 rounded-lg bg-white text-black placeholder:text-black/40 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all" />
          </div>
          <div className="relative">
            <button onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-all text-caption ${filterCount > 0 ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold' : 'border-black/10 bg-white text-black/70 hover:bg-black/5'}`}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {filterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>}
            </button>
            {showFilterPanel && (
              <RelationshipFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilterPanel(false)} onReset={() => setFilters(DEFAULT_FILTERS)} activeCount={filterCount} />
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/40">Filtered by:</span>
          {filters.service !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{getServiceLabel(filters.service)}<button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.health !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.health}<button onClick={() => setFilters(f => ({ ...f, health: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.trend !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.trend}<button onClick={() => setFilters(f => ({ ...f, trend: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.status !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.status}<button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-4 gap-4">
        {/* Relationship Health */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Avg Client Rating</p>
              <div className="mt-1"><StarRating score={avgScore} size="md" /></div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${avgScore >= 4 ? 'bg-[#00C875]/[0.08]' : avgScore >= 3 ? 'bg-[#FDAB3D]/[0.08]' : 'bg-[#E2445C]/[0.06]'}`}>
              <Heart className={`w-5 h-5 ${avgScore >= 4 ? 'text-[#00C875]/70' : avgScore >= 3 ? 'text-[#FDAB3D]/70' : 'text-[#E2445C]/60'}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {strongCount > 0 && <div className="bg-[#00C875] rounded-l-full" style={{ width: `${(strongCount / Math.max(total, 1)) * 100}%` }} />}
              {healthyCount > 0 && <div className="bg-[#204CC7]" style={{ width: `${(healthyCount / Math.max(total, 1)) * 100}%` }} />}
              {attentionCount > 0 && <div className="bg-[#FDAB3D]" style={{ width: `${(attentionCount / Math.max(total, 1)) * 100}%` }} />}
              {atRiskCount > 0 && <div className="bg-[#E2445C]" style={{ width: `${(atRiskCount / Math.max(total, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Strong: {strongCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#204CC7]" /><span className="text-black/50 text-caption font-normal">Healthy: {healthyCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#FDAB3D]" /><span className="text-black/50 text-caption font-normal">Attention: {attentionCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50 text-caption font-normal">At Risk: {atRiskCount}</span></div>
            </div>
          </div>
        </div>

        {/* Revenue at Risk */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Revenue at Risk</p>
              <p className={`text-h1 font-bold ${atRiskMRR > 0 ? 'text-[#E2445C]' : 'text-[#00C875]'}`}>{formatCurrency(atRiskMRR)}<span className="text-black/30 text-caption font-normal">/mo</span></p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${atRiskMRR > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
              <AlertTriangle className={`w-5 h-5 ${atRiskMRR > 0 ? 'text-[#E2445C]/60' : 'text-[#00C875]/70'}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              <div className="bg-[#00C875] rounded-l-full" style={{ width: `${((totalMRR - atRiskMRR) / Math.max(totalMRR, 1)) * 100}%` }} />
              {atRiskMRR > 0 && <div className="bg-[#E2445C]" style={{ width: `${(atRiskMRR / Math.max(totalMRR, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Secure: {formatCurrency(totalMRR - atRiskMRR)}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50 text-caption font-normal">At Risk: {formatCurrency(atRiskMRR)}</span></div>
            </div>
          </div>
        </div>

        {/* Client Trends */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Trends</p>
              <p className={`text-h1 font-bold ${decliningCount > 0 ? 'text-[#E2445C]' : 'text-[#00C875]'}`}>{decliningCount > 0 ? `${decliningCount} Declining` : 'All Steady'}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${decliningCount > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
              {decliningCount > 0 ? <TrendingDown className="w-5 h-5 text-[#E2445C]/60" /> : <TrendingUp className="w-5 h-5 text-[#00C875]/70" />}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {improvingCount > 0 && <div className="bg-[#00C875] rounded-l-full" style={{ width: `${(improvingCount / Math.max(total, 1)) * 100}%` }} />}
              {(total - improvingCount - decliningCount) > 0 && <div className="bg-[#204CC7]" style={{ width: `${((total - improvingCount - decliningCount) / Math.max(total, 1)) * 100}%` }} />}
              {decliningCount > 0 && <div className="bg-[#E2445C]" style={{ width: `${(decliningCount / Math.max(total, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C875]" /><span className="text-black/50 text-caption font-normal">Improving: {improvingCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#204CC7]" /><span className="text-black/50 text-caption font-normal">Stable: {total - improvingCount - decliningCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E2445C]" /><span className="text-black/50 text-caption font-normal">Declining: {decliningCount}</span></div>
            </div>
          </div>
        </div>

        {/* Reviews Due */}
        <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Reviews Due</p>
              <p className={`text-h1 font-bold ${overdueReviews > 0 ? 'text-[#E2445C]' : upcomingReviews > 0 ? 'text-[#FDAB3D]' : 'text-[#00C875]'}`}>{overdueReviews > 0 ? `${overdueReviews} Overdue` : upcomingReviews > 0 ? `${upcomingReviews} This Week` : 'All Clear'}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${overdueReviews > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#FDAB3D]/[0.08]'}`}>
              <Calendar className={`w-5 h-5 ${overdueReviews > 0 ? 'text-[#E2445C]/60' : 'text-[#FDAB3D]/70'}`} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
              {pmCount > 0 && <div className="bg-[#7C3AED] rounded-l-full" style={{ width: `${(pmCount / Math.max(total, 1)) * 100}%` }} />}
              {atCount > 0 && <div className="bg-[#06B6D4]" style={{ width: `${(atCount / Math.max(total, 1)) * 100}%` }} />}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#7C3AED]" /><span className="text-black/50 text-caption font-normal">PM: {pmCount}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#06B6D4]" /><span className="text-black/50 text-caption font-normal">A&T: {atCount}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Banner */}
      {(atRiskClients.length > 0 || overdueClients.length > 0) && (
        <div className="flex gap-3">
          {atRiskClients.length > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.04] border border-[#E2445C]/15 rounded-xl">
              <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-[#E2445C]" /></div>
              <div className="min-w-0">
                <p className="text-[#E2445C] text-caption font-semibold">{atRiskClients.length} client{atRiskClients.length > 1 ? 's' : ''} at risk — {formatCurrency(atRiskMRR)}/mo revenue exposed</p>
                <p className="text-black/50 text-caption font-normal truncate">{atRiskClients.map(r => r.clientName).join(', ')}</p>
              </div>
            </div>
          )}
          {overdueClients.length > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#FDAB3D]/[0.06] border border-[#FDAB3D]/20 rounded-xl">
              <div className="w-8 h-8 bg-[#FDAB3D]/10 rounded-lg flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-[#FDAB3D]" /></div>
              <div className="min-w-0">
                <p className="text-[#FDAB3D] text-caption font-semibold">{overdueClients.length} review{overdueClients.length > 1 ? 's' : ''} overdue</p>
                <p className="text-black/50 text-caption font-normal truncate">{overdueClients.map(r => r.clientName).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortHeader field="clientName">Client</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                <SortHeader field="monthlyBilling">Billing</SortHeader>
                <SortHeader field="tenure">Tenure</SortHeader>
                <SortHeader field="overallHealth">Health</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Trend</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Client Rating</th>
                <SortHeader field="nextReview">Next Review</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRelationships.map(r => {
                const reviewDays = daysUntil(r.nextReview);
                const isOverdue = reviewDays < 0;
                const isUrgent = reviewDays >= 0 && reviewDays <= 3;
                return (
                  <tr key={r.id} className={`border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors ${r.overallHealth === 'At Risk' ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-black/90 text-body font-medium">{r.clientName}</p>
                      <p className="text-black/40 text-caption font-normal">{r.accountManager}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${r.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>{getServiceLabel(r.service)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-black/80 text-body font-medium">{formatCurrency(r.monthlyBilling)}<span className="text-black/30 text-caption font-normal">/mo</span></p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-black/60 text-caption font-normal">{r.tenure} mo{r.tenure !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getHealthColor(r.overallHealth)}`}>{r.overallHealth}</span>
                    </td>
                    <td className="px-4 py-3"><TrendBadge trend={r.trend} /></td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-black/40 font-medium w-[18px]">{r.service === 'Performance Marketing' ? 'CP' : 'ZB'}</span>
                          <StarRating score={r.serviceHeadScore} size="sm" color={r.service === 'Performance Marketing' ? 'purple' : 'cyan'} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-black/40 font-medium w-[18px]">TA</span>
                          <StarRating score={r.cooScore} size="sm" color="amber" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-caption font-medium ${isOverdue ? 'text-[#E2445C]' : isUrgent ? 'text-[#FDAB3D]' : 'text-black/60'}`}>
                        {isOverdue ? `${Math.abs(reviewDays)}d overdue` : isUrgent ? `In ${reviewDays}d` : formatDate(r.nextReview)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative" ref={openStatusDropdown === r.id ? statusDropdownRef : undefined}>
                        <button onClick={e => { e.stopPropagation(); setOpenStatusDropdown(openStatusDropdown === r.id ? null : r.id); }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-caption font-semibold cursor-pointer ${getStatusColor(r.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[r.status]}`} />
                          {r.status}
                          <ChevronRight className={`w-3 h-3 transition-transform ${openStatusDropdown === r.id ? 'rotate-90' : ''}`} />
                        </button>
                        {openStatusDropdown === r.id && (
                          <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[155px]">
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt} onClick={e => { e.stopPropagation(); changeStatus(r.id, opt); }}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                  r.status === opt ? `${getStatusColor(opt)} font-semibold` : 'text-black/70 hover:bg-black/[0.03]'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[opt]}`} />
                                <span className="flex-1 text-left">{opt}</span>
                                {r.status === opt && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedClient(r); setShowDrawer(true); }} className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-all"><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRelationships.length === 0 && (
          <div className="py-16 text-center">
            <Heart className="w-10 h-10 text-black/10 mx-auto mb-3" />
            <p className="text-black/50 text-body font-medium">No clients match your filters</p>
            <p className="text-black/35 text-caption font-normal mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {showDrawer && selectedClient && (() => {
        const reviewDays = daysUntil(selectedClient.nextReview);
        const isOverdue = reviewDays < 0;
        const isAtRisk = selectedClient.overallHealth === 'At Risk';
        const isNeedsAttention = selectedClient.overallHealth === 'Needs Attention';
        const isDeclining = selectedClient.trend === 'Declining';
        const avgClientScore = (selectedClient.serviceHeadScore + selectedClient.cooScore) / 2;

        const headerBg = isAtRisk ? 'bg-[#E2445C]' : isNeedsAttention ? 'bg-[#FDAB3D]' : avgClientScore >= 4 ? 'bg-[#00C875]' : 'bg-[#204CC7]';

        return (
          <div className="fixed inset-0 z-[60]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className={`${headerBg} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedClient.overallHealth}</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{getServiceLabel(selectedClient.service)}</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{formatCurrency(selectedClient.monthlyBilling)}/mo</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedClient.tenure} months</span>
                      </div>
                      <h2 className="text-white text-h2 font-bold truncate">{selectedClient.clientName}</h2>
                      <p className="text-white/70 text-caption font-normal mt-1">{selectedClient.keyContact} · {selectedClient.keyContactRole}</p>
                    </div>
                    <button onClick={() => setShowDrawer(false)} className="ml-3 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0"><X className="w-4 h-4 text-white" /></button>
                  </div>
                </div>

                {/* Urgency Banner */}
                {(isAtRisk || (isDeclining && isNeedsAttention) || isOverdue) && (
                  <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.06] border border-[#E2445C]/20 rounded-xl">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-[#E2445C]" /></div>
                    <div>
                      <p className="text-[#E2445C] text-caption font-semibold">
                        {isAtRisk ? `At risk — ${formatCurrency(selectedClient.monthlyBilling)}/mo revenue exposed` : isOverdue ? `Review ${Math.abs(reviewDays)} days overdue` : 'Declining satisfaction — needs intervention'}
                      </p>
                      <p className="text-black/50 text-caption font-normal">{isAtRisk ? 'Immediate executive attention required' : 'Schedule a touchpoint as soon as possible'}</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Client Feedback — Star Ratings (parity with client-facing app) */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-black/90 text-body font-semibold">Client Feedback</h3>
                      <span className="text-[11px] text-black/30 font-medium">Rated by client via app</span>
                    </div>
                    <p className="text-caption text-black/40 mb-4">Star ratings provided by the client for leadership</p>
                    <div className="space-y-4">
                      <ScoreBar score={selectedClient.serviceHeadScore} label={selectedClient.service === 'Performance Marketing' ? 'CP — Chinmay Pawar (PM HOD)' : 'ZB — Zubear Shaikh (A&T HOD)'} color={selectedClient.service === 'Performance Marketing' ? 'purple' : 'cyan'} />
                      <ScoreBar score={selectedClient.cooScore} label="TA — Tejas Atha (COO)" color="amber" />
                    </div>
                    <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between">
                      <span className="text-black/50 text-caption font-medium">Overall Health</span>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getHealthColor(selectedClient.overallHealth)}`}>{selectedClient.overallHealth}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <h3 className="text-black/90 text-body font-semibold mb-3.5">Details</h3>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-black/35" /><span className="text-black/50 text-caption font-medium">Key Contact</span></div><p className="text-black/80 text-body font-medium">{selectedClient.keyContact} <span className="text-black/40 font-normal">({selectedClient.keyContactRole})</span></p></div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-black/35" /><span className="text-black/50 text-caption font-medium">Account Manager</span></div><p className="text-black/80 text-body font-medium">{selectedClient.accountManager}</p></div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-black/35" /><span className="text-black/50 text-caption font-medium">Last Touchpoint</span></div><p className="text-black/80 text-body font-medium">{formatDate(selectedClient.lastTouchpoint)}</p></div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-black/35" /><span className="text-black/50 text-caption font-medium">Next Review</span></div><p className={`text-body font-medium ${isOverdue ? 'text-[#E2445C]' : 'text-black/80'}`}>{formatDate(selectedClient.nextReview)} {isOverdue && <span className="text-caption">({Math.abs(reviewDays)}d overdue)</span>}</p></div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-black/35" /><span className="text-black/50 text-caption font-medium">Trend</span></div><TrendBadge trend={selectedClient.trend} /></div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {selectedClient.riskFactors && selectedClient.riskFactors.length > 0 && (
                    <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2.5"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /><h3 className="text-rose-900 text-body font-semibold">Risk Factors</h3></div>
                      <div className="space-y-1.5">
                        {selectedClient.riskFactors.map((rf, i) => (
                          <div key={i} className="flex items-start gap-2"><span className="text-rose-400 text-caption mt-0.5">•</span><p className="text-rose-700/80 text-body">{rf}</p></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wins */}
                  {selectedClient.wins && selectedClient.wins.length > 0 && (
                    <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2.5"><Star className="w-3.5 h-3.5 text-emerald-600" /><h3 className="text-emerald-900 text-body font-semibold">Key Wins</h3></div>
                      <div className="space-y-1.5">
                        {selectedClient.wins.map((w, i) => (
                          <div key={i} className="flex items-start gap-2"><span className="text-emerald-400 text-caption mt-0.5">•</span><p className="text-emerald-700/80 text-body">{w}</p></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes — editable */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2.5"><FileText className="w-3.5 h-3.5 text-[#204CC7]" /><h3 className="text-black/90 text-body font-semibold">Strategic Notes</h3></div>
                    <textarea
                      value={selectedClient.notes}
                      onChange={e => updateNotes(selectedClient.id, e.target.value)}
                      rows={4}
                      className="w-full text-body text-black/65 leading-relaxed bg-transparent border border-transparent rounded-lg px-0 py-0 resize-none focus:outline-none focus:border-black/10 focus:bg-black/[0.02] focus:px-3 focus:py-2 transition-all placeholder:text-black/30"
                      placeholder="Add strategic notes..."
                    />
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4 border-t border-black/[0.06]">
                  <button onClick={() => setShowDrawer(false)} className="w-full px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
