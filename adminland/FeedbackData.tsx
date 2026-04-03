'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { MessageSquare, Search, Filter, Eye, X, Calendar, Building2, Star, ThumbsUp, ThumbsDown, User, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Shield, Minus, BarChart3 } from 'lucide-react';

// ── Types ──
interface Feedback {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'Monthly' | 'Weekly';
  period: string; // "March 2026" or "Week 13 · Mar 2026"
  clientName: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  accountManager: string;
  rating: number; // 1-5
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  trend: 'Improving' | 'Stable' | 'Declining' | 'New'; // vs previous feedback
  category: 'Service Quality' | 'Communication' | 'Timeliness' | 'Value for Money' | 'Reporting' | 'Strategy';
  feedback: string;
  actionTaken?: string;
  status: 'New' | 'Acknowledged' | 'Action Taken' | 'Closed';
  responseDays?: number; // days taken to first acknowledge
}

type FeedbackType = 'All' | 'Monthly' | 'Weekly';
type ServiceFilter = 'All' | Feedback['service'];
type SentimentFilter = 'All' | Feedback['sentiment'];
type CategoryFilter = 'All' | Feedback['category'];
type StatusFilter = 'All' | Feedback['status'];
type TrendFilter = 'All' | Feedback['trend'];
type SortField = 'date' | 'rating' | 'clientName' | 'status';
type SortDir = 'asc' | 'desc';

interface Filters {
  type: FeedbackType;
  service: ServiceFilter;
  sentiment: SentimentFilter;
  category: CategoryFilter;
  status: StatusFilter;
  trend: TrendFilter;
}

const DEFAULT_FILTERS: Filters = { type: 'All', service: 'All', sentiment: 'All', category: 'All', status: 'All', trend: 'All' };

const STATUS_ORDER: Record<string, number> = { New: 0, Acknowledged: 1, 'Action Taken': 2, Closed: 3 };
const STATUS_OPTIONS: Feedback['status'][] = ['New', 'Acknowledged', 'Action Taken', 'Closed'];
const STATUS_DOT_COLORS: Record<Feedback['status'], string> = {
  New: 'bg-rose-400',
  Acknowledged: 'bg-amber-400',
  'Action Taken': 'bg-blue-400',
  Closed: 'bg-emerald-400',
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

// ── Realistic Brego Mock Data ──
// Monthly = end-of-month strategic review, Weekly = quick pulse check
// Realistic agency profile: ~55% positive, ~25% neutral, ~20% negative
const initialFeedbacks: Feedback[] = [
  // ── MONTHLY REVIEWS (March 2026) ──
  { id: 'FB-001', date: '2026-03-30', type: 'Monthly', period: 'March 2026', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 5, sentiment: 'Positive', trend: 'Improving', category: 'Strategy', feedback: 'Outstanding month. The Meta Ads restructuring delivered ROAS of 4.8x — up from 3.2x last month. The new audience segmentation strategy is working beautifully. This is exactly the kind of proactive optimization we expect.', status: 'Closed', actionTaken: 'Documented as case study. Strategy shared with entire PM team. Client offered premium tier upgrade.', responseDays: 0 },
  { id: 'FB-002', date: '2026-03-30', type: 'Monthly', period: 'March 2026', clientName: 'Meridian Healthcare', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', rating: 2, sentiment: 'Negative', trend: 'Declining', category: 'Timeliness', feedback: 'Third month in a row where GST filing was delayed. February had a 4-day delay, March had 2-day delay. While improving, this is still unacceptable for a healthcare company where compliance penalties directly affect our licenses.', status: 'Action Taken', actionTaken: 'Dedicated A&T executive assigned. 5-day advance deadline set internally. Weekly compliance checklist implemented. Manager call completed with client.', responseDays: 1 },
  { id: 'FB-003', date: '2026-03-29', type: 'Monthly', period: 'March 2026', clientName: 'NovaTech Solutions', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Service Quality', feedback: 'Consistent quality with ITR and GST filings. The tax-saving recommendations saved us ₹4.2L this financial year. Response time has improved a lot compared to last month — queries now answered within 24 hours.', status: 'Closed', actionTaken: 'Response SLA set to 24 hours and being met. Client thanked for continued trust.', responseDays: 0 },
  { id: 'FB-004', date: '2026-03-28', type: 'Monthly', period: 'March 2026', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 1, sentiment: 'Negative', trend: 'Declining', category: 'Service Quality', feedback: 'February was bad, March was worse. Campaign creatives still have quality issues — wrong product images used twice, copy had brand name misspelled. We spent ₹2.8L on ads with zero conversions this month. Considering terminating the contract.', status: 'New' },
  { id: 'FB-005', date: '2026-03-28', type: 'Monthly', period: 'March 2026', clientName: 'GreenLeaf Organics', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', rating: 5, sentiment: 'Positive', trend: 'Stable', category: 'Service Quality', feedback: 'Another flawless month. Proactively flagged a TDS mismatch that would have cost ₹1.8L in penalties. The monthly financial health report is incredibly useful for our board meetings.', status: 'Closed', actionTaken: 'Client agreed to video testimonial. Team recognition shared. Exploring advisory upsell.', responseDays: 0 },
  { id: 'FB-006', date: '2026-03-27', type: 'Monthly', period: 'March 2026', clientName: 'Sunrise Hospitality', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 5, sentiment: 'Positive', trend: 'Improving', category: 'Strategy', feedback: 'The seasonal campaign strategy for our hotel chain was brilliant. Bookings increased 62% during off-peak months. Sneha and her team went above and beyond with the landing page recommendations too.', status: 'Closed', actionTaken: 'Case study published on website. Client upsold to premium plan with ₹50K MRR increase.', responseDays: 0 },
  { id: 'FB-007', date: '2026-03-27', type: 'Monthly', period: 'March 2026', clientName: 'Quantum Finserv', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', rating: 3, sentiment: 'Neutral', trend: 'Declining', category: 'Service Quality', feedback: 'Found 2 minor errors in the March P&L statement. They were corrected within a day, but for a finserv company, accuracy in financial documents is critical. We need zero-error delivery.', status: 'Acknowledged', responseDays: 1 },
  { id: 'FB-008', date: '2026-03-26', type: 'Monthly', period: 'March 2026', clientName: 'Pinnacle Education', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 3, sentiment: 'Neutral', trend: 'Stable', category: 'Value for Money', feedback: 'Lead volume is okay but 35% are unqualified — students who cannot afford the course or are from non-target cities. At ₹3.5L/mo spend, we need tighter targeting. Hoping the new pre-qualification form helps.', status: 'Action Taken', actionTaken: 'Targeting audit completed. Negative keyword list expanded. City-level exclusions added. Lead form pre-qualification questions implemented.', responseDays: 1 },

  // ── WEEKLY PULSE CHECKS ──
  { id: 'FB-009', date: '2026-03-28', type: 'Weekly', period: 'Week 13 · Mar 2026', clientName: 'UrbanNest Realty', service: 'Performance Marketing', accountManager: 'Akshay Mehta', rating: 3, sentiment: 'Neutral', trend: 'Stable', category: 'Communication', feedback: 'Still no proactive updates this week. Had to call twice to get campaign status. Numbers look decent but the communication gap is frustrating.', status: 'Acknowledged', responseDays: 2 },
  { id: 'FB-010', date: '2026-03-28', type: 'Weekly', period: 'Week 13 · Mar 2026', clientName: 'FreshBite Foods', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Value for Money', feedback: 'Great week. CAC dropped from ₹110 to ₹95 after the funnel optimization. The new video ad creative is performing 30% better than static. Keep pushing this format.', status: 'Closed', actionTaken: 'Noted creative preference. Scaling video ads to 60% of budget.', responseDays: 0 },
  { id: 'FB-011', date: '2026-03-28', type: 'Weekly', period: 'Week 13 · Mar 2026', clientName: 'Metro Logistics', service: 'Performance Marketing', accountManager: 'Akshay Mehta', rating: 2, sentiment: 'Negative', trend: 'Declining', category: 'Communication', feedback: 'Called 3 times this week. One call returned after 6 hours. The other two — no callback at all. This has been escalated internally on our side.', status: 'Action Taken', actionTaken: 'Escalated to PM Head. Akshay put on performance improvement plan. Client given direct line to team lead. Same-day callback SLA enforced.', responseDays: 0 },
  { id: 'FB-012', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'CloudPeak Technologies', service: 'Performance Marketing', accountManager: 'Akshay Mehta', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Reporting', feedback: 'The corrected report looks accurate now. Timezone issue is fully fixed. Quality has really improved this week — appreciate the team taking our concerns seriously.', status: 'Closed', actionTaken: 'QA checklist added before report dispatch. Two-person verification for all client reports.', responseDays: 0 },
  { id: 'FB-013', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'Orbit Fashion', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 4, sentiment: 'Positive', trend: 'Stable', category: 'Strategy', feedback: 'The influencer campaign delivered well this week. 12K engagements from 3 micro-influencers. Good ROI. Continue this approach for April collection launch.', status: 'Closed', actionTaken: 'Influencer roster expanded for April campaign. Budget proposal sent for approval.', responseDays: 0 },
  { id: 'FB-014', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'Spice Route Exports', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Reporting', feedback: 'The new simplified monthly summary is much better! Our founders can actually understand the P&L now. Small suggestion — add a cash flow forecast section.', status: 'Action Taken', actionTaken: 'Cash flow forecast template being developed. Will be included from April report onwards.', responseDays: 1 },
  { id: 'FB-015', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Viva Wellness', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', rating: 4, sentiment: 'Positive', trend: 'Stable', category: 'Communication', feedback: 'Rohan was quick to respond this week when we needed urgent TDS clarification. Appreciate the same-day turnaround. Keep it up.', status: 'Closed', actionTaken: 'Positive feedback shared with Rohan. Recognized in team standup.', responseDays: 0 },
  { id: 'FB-016', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Artisan Crafts Co', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', rating: 5, sentiment: 'Positive', trend: 'Stable', category: 'Timeliness', feedback: 'Advance tax calculation delivered 3 days early as always. Kavita is incredibly reliable. This consistency is why we renewed our annual contract.', status: 'Closed', actionTaken: 'Recognition added to Kavita\'s performance review. Client renewal confirmed.', responseDays: 0 },
  { id: 'FB-017', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 2, sentiment: 'Negative', trend: 'Declining', category: 'Service Quality', feedback: 'Wrong product images used in this week\'s carousel ad. This is the third creative error in 3 weeks. Clients are commenting on the wrong images on our social. Extremely embarrassing.', status: 'Action Taken', actionTaken: 'Creative QA process implemented. All assets now require client sign-off before going live.', responseDays: 0 },
  { id: 'FB-018', date: '2026-03-07', type: 'Weekly', period: 'Week 10 · Mar 2026', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 5, sentiment: 'Positive', trend: 'Improving', category: 'Strategy', feedback: 'Great week — the new audience segment testing is showing early promise. Seeing 20% lower CPC on the lookalike audience. Keep experimenting.', status: 'Closed', actionTaken: 'Budget shifted 30% to lookalike audiences based on week\'s data.', responseDays: 0 },
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

function FeedbackFilterPanel({ filters, onChange, onClose, onReset, activeCount }: { filters: Filters; onChange: (f: Filters) => void; onClose: () => void; onReset: () => void; activeCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-[600px] bg-white border border-black/[0.08] rounded-xl shadow-lg z-30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-black/80">Filters</h3>
        {activeCount > 0 && <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset all</button>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {/* Type */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Frequency</p>
          <div className="space-y-0.5">
            {(['All', 'Monthly', 'Weekly'] as FeedbackType[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Types' : opt} value={opt} selected={filters.type === opt} onSelect={v => onChange({ ...filters, type: v })} />
            ))}
          </div>
        </div>
        {/* Service */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            {(['All', 'Performance Marketing', 'Accounts & Taxation'] as ServiceFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : opt === 'Performance Marketing' ? 'PM' : 'A&T'} value={opt} selected={filters.service === opt} onSelect={v => onChange({ ...filters, service: v })} />
            ))}
          </div>
        </div>
        {/* Sentiment */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Sentiment</p>
          <div className="space-y-0.5">
            {(['All', 'Positive', 'Neutral', 'Negative'] as SentimentFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Sentiments' : opt} value={opt} selected={filters.sentiment === opt} onSelect={v => onChange({ ...filters, sentiment: v })} />
            ))}
          </div>
        </div>
        {/* Trend */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Trend</p>
          <div className="space-y-0.5">
            {(['All', 'Improving', 'Stable', 'Declining', 'New'] as TrendFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Trends' : opt} value={opt} selected={filters.trend === opt} onSelect={v => onChange({ ...filters, trend: v })} />
            ))}
          </div>
        </div>
        {/* Category */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Category</p>
          <div className="space-y-0.5">
            {(['All', 'Service Quality', 'Communication', 'Timeliness', 'Value for Money', 'Reporting', 'Strategy'] as CategoryFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Categories' : opt} value={opt} selected={filters.category === opt} onSelect={v => onChange({ ...filters, category: v })} />
            ))}
          </div>
        </div>
        {/* Status */}
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Status</p>
          <div className="space-y-0.5">
            {(['All', 'New', 'Acknowledged', 'Action Taken', 'Closed'] as StatusFilter[]).map(opt => (
              <FilterOption key={opt} label={opt === 'All' ? 'All Statuses' : opt} value={opt} selected={filters.status === opt} onSelect={v => onChange({ ...filters, status: v })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trend Icon Component ──
function TrendBadge({ trend }: { trend: Feedback['trend'] }) {
  if (trend === 'Improving') return <div className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3.5 h-3.5" /><span className="text-caption font-medium">Improving</span></div>;
  if (trend === 'Declining') return <div className="flex items-center gap-1 text-[#E2445C]"><TrendingDown className="w-3.5 h-3.5" /><span className="text-caption font-medium">Declining</span></div>;
  if (trend === 'Stable') return <div className="flex items-center gap-1 text-black/40"><Minus className="w-3.5 h-3.5" /><span className="text-caption font-medium">Stable</span></div>;
  return <div className="flex items-center gap-1 text-[#204CC7]"><Star className="w-3.5 h-3.5" /><span className="text-caption font-medium">New</span></div>;
}

// ── Main Component ──
export function FeedbackData() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setOpenStatusDropdown(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (feedbackId: string, newStatus: Feedback['status']) => {
    setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? { ...fb, status: newStatus } : fb));
    setOpenStatusDropdown(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'clientName' ? 'asc' : 'desc'); }
  };

  const filterCount = (filters.type !== 'All' ? 1 : 0) + (filters.service !== 'All' ? 1 : 0) + (filters.sentiment !== 'All' ? 1 : 0) + (filters.category !== 'All' ? 1 : 0) + (filters.status !== 'All' ? 1 : 0) + (filters.trend !== 'All' ? 1 : 0);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks.filter(fb => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || fb.clientName.toLowerCase().includes(q) || fb.id.toLowerCase().includes(q) || fb.feedback.toLowerCase().includes(q) || fb.accountManager.toLowerCase().includes(q) || fb.period.toLowerCase().includes(q);
      const matchesType = filters.type === 'All' || fb.type === filters.type;
      const matchesService = filters.service === 'All' || fb.service === filters.service;
      const matchesSentiment = filters.sentiment === 'All' || fb.sentiment === filters.sentiment;
      const matchesCategory = filters.category === 'All' || fb.category === filters.category;
      const matchesStatus = filters.status === 'All' || fb.status === filters.status;
      const matchesTrend = filters.trend === 'All' || fb.trend === filters.trend;
      return matchesSearch && matchesType && matchesService && matchesSentiment && matchesCategory && matchesStatus && matchesTrend;
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = parseDate(a.date).getTime() - parseDate(b.date).getTime(); break;
        case 'rating': cmp = a.rating - b.rating; break;
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [feedbacks, searchQuery, filters, sortField, sortDir]);

  // ── KPIs ──
  const totalFeedback = filteredFeedbacks.length;
  const avgRating = totalFeedback > 0 ? filteredFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;
  const positiveCount = filteredFeedbacks.filter(f => f.sentiment === 'Positive').length;
  const neutralCount = filteredFeedbacks.filter(f => f.sentiment === 'Neutral').length;
  const negativeCount = filteredFeedbacks.filter(f => f.sentiment === 'Negative').length;
  const decliningCount = filteredFeedbacks.filter(f => f.trend === 'Declining').length;
  const improvingCount = filteredFeedbacks.filter(f => f.trend === 'Improving').length;
  const monthlyCount = filteredFeedbacks.filter(f => f.type === 'Monthly').length;
  const weeklyCount = filteredFeedbacks.filter(f => f.type === 'Weekly').length;
  const newCount = filteredFeedbacks.filter(f => f.status === 'New').length;
  const closedCount = filteredFeedbacks.filter(f => f.status === 'Closed').length;
  const actionedCount = filteredFeedbacks.filter(f => f.status === 'Action Taken' || f.status === 'Closed').length;
  const avgResponseDays = (() => {
    const responded = filteredFeedbacks.filter(f => f.responseDays !== undefined);
    return responded.length > 0 ? (responded.reduce((sum, f) => sum + (f.responseDays ?? 0), 0) / responded.length) : 0;
  })();

  // ── Insights ──
  const unresolvedNegative = filteredFeedbacks.filter(f => f.sentiment === 'Negative' && (f.status === 'New' || f.status === 'Acknowledged'));
  const decliningClients = [...new Set(filteredFeedbacks.filter(f => f.trend === 'Declining').map(f => f.clientName))];

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Neutral': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Negative': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Action Taken': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Acknowledged': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'New': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getServiceLabel = (s: string) => s === 'Performance Marketing' ? 'PM' : 'A&T';

  const renderStars = (rating: number, size: string = 'w-3.5 h-3.5') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} className={`${size} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-black/10 text-black/10'}`} />
      ))}
    </div>
  );

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
          <h2 className="text-h2 font-bold text-black/90">Client Feedback</h2>
          <p className="text-caption font-normal text-black/50 mt-0.5">Weekly pulse checks &amp; monthly reviews — track satisfaction and close the loop</p>
        </div>

        <div className="flex items-center gap-2">
          {(filterCount > 0 || searchQuery) && (
            <span className="text-caption font-medium text-black/40">{filteredFeedbacks.length} of {feedbacks.length} results</span>
          )}

          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" />
            <input type="text" placeholder="Search feedback..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
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
              <FeedbackFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilterPanel(false)} onReset={() => setFilters(DEFAULT_FILTERS)} activeCount={filterCount} />
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/40">Filtered by:</span>
          {filters.type !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.type}
              <button onClick={() => setFilters(f => ({ ...f, type: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {getServiceLabel(filters.service)}
              <button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.sentiment !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.sentiment}
              <button onClick={() => setFilters(f => ({ ...f, sentiment: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.category !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.category}
              <button onClick={() => setFilters(f => ({ ...f, category: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.status !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.status}
              <button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filters.trend !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filters.trend}
              <button onClick={() => setFilters(f => ({ ...f, trend: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button>
            </span>
          )}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/40 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/* KPI Widgets */}
      {(() => {
        const stableCount = filteredFeedbacks.filter(f => f.trend === 'Stable').length;
        const needsAttentionCount = unresolvedNegative.length + newCount;
        const uniqueClients = [...new Set(filteredFeedbacks.map(f => f.clientName))].length;
        return (
          <div className="grid grid-cols-4 gap-4">
            {/* 1. Avg. Rating — the simplest measure: how happy are clients? */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Avg. Rating</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className={`text-h1 font-bold ${avgRating >= 4 ? 'text-[#00C875]' : avgRating >= 3 ? 'text-[#FDAB3D]' : 'text-[#E2445C]'}`}>{avgRating.toFixed(1)}</p>
                    <span className="text-black/30 text-caption">/5</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${avgRating >= 4 ? 'bg-[#00C875]/[0.08]' : avgRating >= 3 ? 'bg-[#FDAB3D]/[0.08]' : 'bg-[#E2445C]/[0.06]'}`}>
                  <Star className={`w-5 h-5 ${avgRating >= 4 ? 'text-[#00C875]/70 fill-[#00C875]/70' : avgRating >= 3 ? 'text-[#FDAB3D]/70 fill-[#FDAB3D]/70' : 'text-[#E2445C]/60 fill-[#E2445C]/60'}`} />
                </div>
              </div>
              <p className="text-black/40 text-caption">Across <span className="text-black/60 font-medium">{totalFeedback}</span> feedbacks from <span className="text-black/60 font-medium">{uniqueClients}</span> clients</p>
            </div>

            {/* 2. Happy vs Unhappy — sentiment in plain language */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Client Sentiment</p>
                  <p className="text-[#00C875] text-h1 font-bold">{totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0}% <span className="text-caption font-medium text-black/35">happy</span></p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00C875]/[0.08]">
                  <ThumbsUp className="w-5 h-5 text-[#00C875]/70" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                  {positiveCount > 0 && <div className="bg-[#00C875]" style={{ width: `${(positiveCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                  {neutralCount > 0 && <div className="bg-[#FDAB3D]" style={{ width: `${(neutralCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                  {negativeCount > 0 && <div className="bg-[#E2445C]" style={{ width: `${(negativeCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-black/45 text-caption"><span className="text-[#00C875] font-medium">{positiveCount}</span> happy</span>
                  <span className="text-black/45 text-caption"><span className="text-[#FDAB3D] font-medium">{neutralCount}</span> neutral</span>
                  <span className="text-black/45 text-caption"><span className="text-[#E2445C] font-medium">{negativeCount}</span> unhappy</span>
                </div>
              </div>
            </div>

            {/* 3. Needs Attention — actionable count for the founder */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Needs Attention</p>
                  <p className={`text-h1 font-bold ${needsAttentionCount > 0 ? 'text-[#E2445C]' : 'text-[#00C875]'}`}>{needsAttentionCount > 0 ? needsAttentionCount : 'None'}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${needsAttentionCount > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
                  {needsAttentionCount > 0 ? <AlertTriangle className="w-5 h-5 text-[#E2445C]/60" /> : <CheckCircle2 className="w-5 h-5 text-[#00C875]/70" />}
                </div>
              </div>
              <div className="space-y-1.5">
                {unresolvedNegative.length > 0 && <p className="text-caption text-[#E2445C]/80"><span className="font-medium">{unresolvedNegative.length}</span> negative feedback unresolved</p>}
                {newCount > 0 && <p className="text-caption text-[#FDAB3D]"><span className="font-medium">{newCount}</span> new feedback to review</p>}
                {needsAttentionCount === 0 && <p className="text-black/40 text-caption">All feedback has been addressed</p>}
              </div>
            </div>

            {/* 4. Client Trends — are things getting better or worse? */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Trends</p>
                  <p className={`text-h1 font-bold ${decliningCount > 0 ? 'text-[#E2445C]' : improvingCount > 0 ? 'text-[#00C875]' : 'text-black/70'}`}>
                    {decliningCount > 0 ? `${decliningCount} Declining` : improvingCount > 0 ? `${improvingCount} Improving` : 'Stable'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${decliningCount > 0 ? 'bg-[#E2445C]/[0.06]' : 'bg-[#00C875]/[0.08]'}`}>
                  {decliningCount > 0 ? <TrendingDown className="w-5 h-5 text-[#E2445C]/60" /> : <TrendingUp className="w-5 h-5 text-[#00C875]/70" />}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex h-2 rounded-full overflow-hidden bg-black/[0.04]">
                  {improvingCount > 0 && <div className="bg-[#00C875]" style={{ width: `${(improvingCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                  {stableCount > 0 && <div className="bg-[#204CC7]/40" style={{ width: `${(stableCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                  {decliningCount > 0 && <div className="bg-[#E2445C]" style={{ width: `${(decliningCount / Math.max(totalFeedback, 1)) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-black/45 text-caption"><span className="text-[#00C875] font-medium">{improvingCount}</span> improving</span>
                  <span className="text-black/45 text-caption"><span className="text-[#204CC7]/60 font-medium">{stableCount}</span> stable</span>
                  <span className="text-black/45 text-caption"><span className="text-[#E2445C] font-medium">{decliningCount}</span> declining</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Smart Insights Banner ── */}
      {(decliningClients.length > 0 || unresolvedNegative.length > 0) && (
        <div className="flex gap-3">
          {decliningClients.length > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.04] border border-[#E2445C]/15 rounded-xl">
              <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-[#E2445C]" />
              </div>
              <div className="min-w-0">
                <p className="text-[#E2445C] text-caption font-semibold">{decliningClients.length} client{decliningClients.length > 1 ? 's' : ''} showing declining satisfaction</p>
                <p className="text-black/50 text-caption font-normal truncate">{decliningClients.join(', ')}</p>
              </div>
            </div>
          )}
          {unresolvedNegative.length > 0 && (
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#FDAB3D]/[0.06] border border-[#FDAB3D]/20 rounded-xl">
              <div className="w-8 h-8 bg-[#FDAB3D]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#FDAB3D]" />
              </div>
              <div className="min-w-0">
                <p className="text-[#FDAB3D] text-caption font-semibold">{unresolvedNegative.length} negative feedback{unresolvedNegative.length > 1 ? 's' : ''} awaiting action</p>
                <p className="text-black/50 text-caption font-normal truncate">{unresolvedNegative.map(f => f.clientName).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide w-16">Type</th>
                <SortHeader field="date">Date</SortHeader>
                <SortHeader field="clientName">Client</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                <SortHeader field="rating">Rating</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Trend</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Sentiment</th>
                <SortHeader field="status">Status</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedbacks.map(fb => (
                <tr key={fb.id} className={`border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors ${fb.trend === 'Declining' && (fb.status === 'New' || fb.status === 'Acknowledged') ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${fb.type === 'Monthly' ? 'bg-[#7C3AED]/[0.06] text-[#7C3AED] border-[#7C3AED]/20' : 'bg-[#06B6D4]/[0.06] text-[#06B6D4] border-[#06B6D4]/20'}`}>
                      {fb.type === 'Monthly' ? 'M' : 'W'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-black/70 text-caption font-normal">{formatDate(fb.date)}</p>
                    <p className="text-black/35 text-caption font-normal">{fb.period}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-black/90 text-body font-medium">{fb.clientName}</p>
                    <p className="text-black/40 text-caption font-normal">{fb.accountManager}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${fb.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                      {getServiceLabel(fb.service)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {renderStars(fb.rating, 'w-3 h-3')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TrendBadge trend={fb.trend} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${getSentimentColor(fb.sentiment)}`}>
                      {fb.sentiment}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" ref={openStatusDropdown === fb.id ? statusDropdownRef : undefined}>
                      <button
                        onClick={e => { e.stopPropagation(); setOpenStatusDropdown(openStatusDropdown === fb.id ? null : fb.id); }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-caption font-semibold cursor-pointer ${getStatusColor(fb.status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[fb.status]}`} />
                        {fb.status}
                        <ChevronRight className={`w-3 h-3 transition-transform ${openStatusDropdown === fb.id ? 'rotate-90' : ''}`} />
                      </button>
                      {openStatusDropdown === fb.id && (
                        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50 min-w-[155px]">
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt} onClick={e => { e.stopPropagation(); changeStatus(fb.id, opt); }}
                              className={`w-full px-3 py-1.5 text-left flex items-center gap-2 transition-colors text-caption font-medium ${
                                fb.status === opt ? `${getStatusColor(opt)} font-semibold` : 'text-black/70 hover:bg-black/[0.03]'
                              }`}>
                              <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[opt]}`} />
                              <span className="flex-1 text-left">{opt}</span>
                              {fb.status === opt && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedFeedback(fb); setShowDrawer(true); }} className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-all">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredFeedbacks.length === 0 && (
          <div className="py-16 text-center">
            <MessageSquare className="w-10 h-10 text-black/10 mx-auto mb-3" />
            <p className="text-black/50 text-body font-medium">No feedback matches your filters</p>
            <p className="text-black/35 text-caption font-normal mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* ── Feedback Details Drawer ── */}
      {showDrawer && selectedFeedback && (() => {
        const daysAgo = daysSince(selectedFeedback.date);
        const isNew = selectedFeedback.status === 'New';
        const isAcknowledged = selectedFeedback.status === 'Acknowledged';
        const isActionTaken = selectedFeedback.status === 'Action Taken';
        const isClosed = selectedFeedback.status === 'Closed';
        const isNegative = selectedFeedback.sentiment === 'Negative';
        const isDeclining = selectedFeedback.trend === 'Declining';

        const nextStatus: Feedback['status'] | null = isNew ? 'Acknowledged' : isAcknowledged ? 'Action Taken' : isActionTaken ? 'Closed' : null;
        const nextLabel = isNew ? 'Acknowledge Feedback' : isAcknowledged ? 'Mark Action Taken' : isActionTaken ? 'Close Feedback' : null;
        const nextColors = isNew ? 'bg-[#204CC7] hover:bg-[#1a3d9f] text-white' : isAcknowledged ? 'bg-[#FDAB3D] hover:bg-[#e59a2f] text-white' : isActionTaken ? 'bg-[#00C875] hover:bg-[#00a85f] text-white' : '';

        const sentimentHeaderBg = selectedFeedback.sentiment === 'Negative' ? 'bg-[#E2445C]' : selectedFeedback.sentiment === 'Neutral' ? 'bg-[#FDAB3D]' : 'bg-[#00C875]';

        // Find all feedback from the same client to show history
        const clientHistory = feedbacks
          .filter(f => f.clientName === selectedFeedback.clientName && f.id !== selectedFeedback.id)
          .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
          .slice(0, 4);

        return (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className={`${sentimentHeaderBg} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedFeedback.id}</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedFeedback.type}</span>
                        <span className="text-white/70 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedFeedback.rating}/5 ★</span>
                      </div>
                      <h2 className="text-white text-h2 font-bold truncate">{selectedFeedback.clientName}</h2>
                      <p className="text-white/70 text-caption font-normal mt-1">{selectedFeedback.period} · {selectedFeedback.category} · {getServiceLabel(selectedFeedback.service)}</p>
                    </div>
                    <button onClick={() => setShowDrawer(false)} className="ml-3 w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Urgency banner */}
                {(isNegative || isDeclining) && (isNew || isAcknowledged) && (
                  <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.06] border border-[#E2445C]/20 rounded-xl">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {isDeclining ? <TrendingDown className="w-4 h-4 text-[#E2445C]" /> : <AlertTriangle className="w-4 h-4 text-[#E2445C]" />}
                    </div>
                    <div>
                      <p className="text-[#E2445C] text-caption font-semibold">
                        {isDeclining && isNegative ? 'Declining satisfaction + negative feedback' : isDeclining ? 'Client satisfaction is declining' : 'Negative feedback unresolved'}
                        {' — '}{daysAgo} day{daysAgo !== 1 ? 's' : ''} old
                      </p>
                      <p className="text-black/50 text-caption font-normal">{isDeclining ? 'High churn risk — prioritise this client immediately' : 'Delays in response increase churn risk'}</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Status + Trend row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/45 text-caption font-medium mb-1.5">Status</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getStatusColor(selectedFeedback.status)}`}>{selectedFeedback.status}</span>
                    </div>
                    <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                      <p className="text-black/45 text-caption font-medium mb-1.5">Trend</p>
                      <TrendBadge trend={selectedFeedback.trend} />
                    </div>
                  </div>

                  {/* Feedback text */}
                  <div className={`rounded-xl p-4 border ${selectedFeedback.sentiment === 'Positive' ? 'bg-emerald-50/50 border-emerald-200/60' : selectedFeedback.sentiment === 'Negative' ? 'bg-rose-50/50 border-rose-200/60' : 'bg-amber-50/50 border-amber-200/60'}`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <MessageSquare className="w-3.5 h-3.5 text-black/50" />
                      <h3 className="text-black/90 text-body font-semibold">Client&apos;s Words</h3>
                    </div>
                    <p className="text-black/70 text-body leading-relaxed italic">&ldquo;{selectedFeedback.feedback}&rdquo;</p>
                  </div>

                  {/* Details */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <h3 className="text-black/90 text-body font-semibold mb-3.5">Details</h3>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Client</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{selectedFeedback.clientName}</p>
                      </div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Service</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${selectedFeedback.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                          {getServiceLabel(selectedFeedback.service)}
                        </span>
                      </div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Account Manager</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{selectedFeedback.accountManager}</p>
                      </div>
                      <div className="h-px bg-black/[0.04]" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-black/35" />
                          <span className="text-black/50 text-caption font-medium">Period</span>
                        </div>
                        <p className="text-black/80 text-body font-medium">{selectedFeedback.period}</p>
                      </div>
                      {selectedFeedback.responseDays !== undefined && (
                        <>
                          <div className="h-px bg-black/[0.04]" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-black/35" />
                              <span className="text-black/50 text-caption font-medium">Response Time</span>
                            </div>
                            <p className={`text-body font-medium ${selectedFeedback.responseDays === 0 ? 'text-[#00C875]' : selectedFeedback.responseDays <= 1 ? 'text-[#FDAB3D]' : 'text-[#E2445C]'}`}>
                              {selectedFeedback.responseDays === 0 ? 'Same day' : `${selectedFeedback.responseDays} day${selectedFeedback.responseDays > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Taken */}
                  {selectedFeedback.actionTaken && (
                    <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <h3 className="text-blue-900 text-body font-semibold">Action Taken</h3>
                      </div>
                      <p className="text-blue-700/80 text-body leading-relaxed">{selectedFeedback.actionTaken}</p>
                    </div>
                  )}

                  {/* Client History */}
                  {clientHistory.length > 0 && (
                    <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-3.5 h-3.5 text-[#204CC7]" />
                        <h3 className="text-black/90 text-body font-semibold">Feedback History</h3>
                        <span className="text-black/35 text-caption font-normal">({clientHistory.length} previous)</span>
                      </div>
                      <div className="space-y-2.5">
                        {clientHistory.map(h => (
                          <div key={h.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-black/[0.015]">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-caption font-medium ${h.type === 'Monthly' ? 'bg-[#7C3AED]/[0.06] text-[#7C3AED]' : 'bg-[#06B6D4]/[0.06] text-[#06B6D4]'}`}>{h.type === 'Monthly' ? 'M' : 'W'}</span>
                            <span className="text-black/40 text-caption font-normal min-w-[70px]">{formatDate(h.date)}</span>
                            <div className="flex gap-0.5">{renderStars(h.rating, 'w-2.5 h-2.5')}</div>
                            <div className="flex-1" />
                            <TrendBadge trend={h.trend} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer CTAs */}
                <div className="px-6 py-4 border-t border-black/[0.06] space-y-3">
                  {nextStatus && nextLabel && (
                    <button
                      onClick={() => {
                        changeStatus(selectedFeedback.id, nextStatus);
                        setSelectedFeedback({ ...selectedFeedback, status: nextStatus });
                      }}
                      className={`w-full px-4 py-3 rounded-xl transition-all text-body font-semibold flex items-center justify-center gap-2 ${nextColors}`}
                    >
                      {isNew && <Eye className="w-4 h-4" />}
                      {isAcknowledged && <CheckCircle2 className="w-4 h-4" />}
                      {isActionTaken && <Check className="w-4 h-4" />}
                      {nextLabel}
                    </button>
                  )}

                  {isClosed && (
                    <div className="w-full px-4 py-3 rounded-xl bg-[#00C875]/[0.06] text-center">
                      <p className="text-[#00C875] text-caption font-medium flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Feedback loop closed</p>
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    {isClosed && (
                      <button
                        onClick={() => {
                          changeStatus(selectedFeedback.id, 'Acknowledged');
                          setSelectedFeedback({ ...selectedFeedback, status: 'Acknowledged' });
                        }}
                        className="flex-1 px-3 py-2.5 border border-[#FDAB3D]/30 text-[#FDAB3D] rounded-xl hover:bg-[#FDAB3D]/[0.04] transition-all text-caption font-medium flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Reopen
                      </button>
                    )}
                    <button onClick={() => setShowDrawer(false)} className="flex-1 px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium">
                      {isClosed ? 'Close' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
