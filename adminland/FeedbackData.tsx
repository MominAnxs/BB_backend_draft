'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useModalA11y } from '@/lib/use-modal-a11y';
import { MessageSquare, Search, Filter, Eye, X, Calendar, Building2, Star, ThumbsUp, ThumbsDown, User, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Clock, CheckCircle2, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Shield, Minus, BarChart3 } from 'lucide-react';

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

interface ExitFeedback {
  id: string;
  date: string; // exit date YYYY-MM-DD
  clientName: string;
  service: 'Performance Marketing' | 'Accounts & Taxation';
  accountManager: string;
  tenure: number; // months with Brego
  billingPerMonth: number; // ₹
  exitReason: 'Budget Cuts' | 'Poor Results' | 'Switched to Competitor' | 'In-House Team' | 'Business Closed' | 'Service Not Needed';
  overallRating: number; // 1-5
  wouldRecommend: boolean;
  feedback: string; // detailed exit feedback
  improvementAreas: string[]; // what could Brego have done better
  bestAspect: string; // what they liked most
  recoverable: boolean;
  status: 'Pending Review' | 'Reviewed' | 'Action Plan Created' | 'Closed';
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

const EXIT_STATUS_ORDER: Record<string, number> = { 'Pending Review': 0, 'Reviewed': 1, 'Action Plan Created': 2, 'Closed': 3 };
const EXIT_STATUS_OPTIONS: ExitFeedback['status'][] = ['Pending Review', 'Reviewed', 'Action Plan Created', 'Closed'];
const EXIT_STATUS_DOT_COLORS: Record<ExitFeedback['status'], string> = {
  'Pending Review': 'bg-amber-400',
  'Reviewed': 'bg-blue-400',
  'Action Plan Created': 'bg-purple-400',
  'Closed': 'bg-emerald-400',
};

const EXIT_REASON_COLORS: Record<ExitFeedback['exitReason'], string> = {
  'Budget Cuts': 'bg-amber-50 text-amber-700 border-amber-200',
  'Poor Results': 'bg-rose-50 text-rose-700 border-rose-200',
  'Switched to Competitor': 'bg-purple-50 text-purple-700 border-purple-200',
  'In-House Team': 'bg-blue-50 text-blue-700 border-blue-200',
  'Business Closed': 'bg-gray-50 text-gray-700 border-gray-200',
  'Service Not Needed': 'bg-cyan-50 text-cyan-700 border-cyan-200',
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

function formatCurrency(num: number): string {
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num}`;
}

// ── Realistic Brego Mock Data ──
const initialFeedbacks: Feedback[] = [
  // ── MONTHLY REVIEWS (March 2026) ──
  { id: 'FB-001', date: '2026-03-30', type: 'Monthly', period: 'March 2026', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 5, sentiment: 'Positive', trend: 'Improving', category: 'Strategy', feedback: 'Outstanding month. The Meta Ads restructuring delivered ROAS of 4.8x — up from 3.2x last month. The new audience segmentation strategy is working beautifully. This is exactly the kind of proactive optimization we expect.', status: 'Closed', actionTaken: 'Documented as case study. Strategy shared with entire SEM team. Client offered premium tier upgrade.', responseDays: 0 },
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
  { id: 'FB-011', date: '2026-03-28', type: 'Weekly', period: 'Week 13 · Mar 2026', clientName: 'Metro Logistics', service: 'Performance Marketing', accountManager: 'Akshay Mehta', rating: 2, sentiment: 'Negative', trend: 'Declining', category: 'Communication', feedback: 'Called 3 times this week. One call returned after 6 hours. The other two — no callback at all. This has been escalated internally on our side.', status: 'Action Taken', actionTaken: 'Escalated to SEM Head. Akshay put on performance improvement plan. Client given direct line to team lead. Same-day callback SLA enforced.', responseDays: 0 },
  { id: 'FB-012', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'CloudPeak Technologies', service: 'Performance Marketing', accountManager: 'Akshay Mehta', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Reporting', feedback: 'The corrected report looks accurate now. Timezone issue is fully fixed. Quality has really improved this week — appreciate the team taking our concerns seriously.', status: 'Closed', actionTaken: 'QA checklist added before report dispatch. Two-person verification for all client reports.', responseDays: 0 },
  { id: 'FB-013', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'Orbit Fashion', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 4, sentiment: 'Positive', trend: 'Stable', category: 'Strategy', feedback: 'The influencer campaign delivered well this week. 12K engagements from 3 micro-influencers. Good ROI. Continue this approach for April collection launch.', status: 'Closed', actionTaken: 'Influencer roster expanded for April campaign. Budget proposal sent for approval.', responseDays: 0 },
  { id: 'FB-014', date: '2026-03-21', type: 'Weekly', period: 'Week 12 · Mar 2026', clientName: 'Spice Route Exports', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', rating: 4, sentiment: 'Positive', trend: 'Improving', category: 'Reporting', feedback: 'The new simplified monthly summary is much better! Our founders can actually understand the P&L now. Small suggestion — add a cash flow forecast section.', status: 'Action Taken', actionTaken: 'Cash flow forecast template being developed. Will be included from April report onwards.', responseDays: 1 },
  { id: 'FB-015', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Viva Wellness', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', rating: 4, sentiment: 'Positive', trend: 'Stable', category: 'Communication', feedback: 'Rohan was quick to respond this week when we needed urgent TDS clarification. Appreciate the same-day turnaround. Keep it up.', status: 'Closed', actionTaken: 'Positive feedback shared with Rohan. Recognized in team standup.', responseDays: 0 },
  { id: 'FB-016', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Artisan Crafts Co', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', rating: 5, sentiment: 'Positive', trend: 'Stable', category: 'Timeliness', feedback: 'Advance tax calculation delivered 3 days early as always. Kavita is incredibly reliable. This consistency is why we renewed our annual contract.', status: 'Closed', actionTaken: 'Recognition added to Kavita\'s performance review. Client renewal confirmed.', responseDays: 0 },
  { id: 'FB-017', date: '2026-03-14', type: 'Weekly', period: 'Week 11 · Mar 2026', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', rating: 2, sentiment: 'Negative', trend: 'Declining', category: 'Service Quality', feedback: 'Wrong product images used in this week\'s carousel ad. This is the third creative error in 3 weeks. Clients are commenting on the wrong images on our social. Extremely embarrassing.', status: 'Action Taken', actionTaken: 'Creative QA process implemented. All assets now require client sign-off before going live.', responseDays: 0 },
  { id: 'FB-018', date: '2026-03-07', type: 'Weekly', period: 'Week 10 · Mar 2026', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', rating: 5, sentiment: 'Positive', trend: 'Improving', category: 'Strategy', feedback: 'Great week — the new audience segment testing is showing early promise. Seeing 20% lower CPC on the lookalike audience. Keep experimenting.', status: 'Closed', actionTaken: 'Budget shifted 30% to lookalike audiences based on week\'s data.', responseDays: 0 },
];

const initialExitFeedbacks: ExitFeedback[] = [
  { id: 'EX-001', date: '2026-03-15', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', tenure: 14, billingPerMonth: 85000, exitReason: 'Budget Cuts', overallRating: 3, wouldRecommend: true, feedback: 'We loved the work Priya\'s team did, especially the ROAS improvements. However, due to Q1 budget constraints and our own restructuring, we\'ve decided to pause all marketing services for the next quarter. We will definitely reach out again once the budget is freed up. The team was professional throughout.', improvementAreas: ['Proactive budget optimization guidance', 'More frequent strategic reviews'], bestAspect: 'Outstanding campaign optimization and measurable ROAS improvements', recoverable: true, status: 'Reviewed' },
  { id: 'EX-002', date: '2026-03-10', clientName: 'NovaTech Solutions', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', tenure: 8, billingPerMonth: 42000, exitReason: 'Switched to Competitor', overallRating: 2, wouldRecommend: false, feedback: 'While the A&T work was decent, we found a boutique CA firm that specializes in IT companies. They understand our sector better and are 15% cheaper. Brego was good but not specialized enough for our niche. The response times were also slower than expected.', improvementAreas: ['Faster response times on queries', 'Industry-specific expertise development', 'Competitive pricing for early-stage companies'], bestAspect: 'Good foundational accounting practices', recoverable: false, status: 'Closed' },
  { id: 'EX-003', date: '2026-02-28', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', tenure: 6, billingPerMonth: 65000, exitReason: 'Poor Results', overallRating: 1, wouldRecommend: false, feedback: 'Over 6 months, we spent ₹39L with Brego and got minimal results. The creatives had repeated errors, campaign optimization was slow, and we never hit our ROAS targets. It felt like we were a small account that didn\'t get priority attention. We\'ve decided to switch to a larger, more established agency.', improvementAreas: ['Quality control in creative production', 'Faster optimization cycles', 'Dedicated account management for mid-tier clients', 'Transparent performance tracking'], bestAspect: 'Initial strategy was sound, but execution fell short', recoverable: false, status: 'Action Plan Created' },
  { id: 'EX-004', date: '2026-02-15', clientName: 'Meridian Healthcare', service: 'Accounts & Taxation', accountManager: 'Priya Sharma', tenure: 22, billingPerMonth: 38000, exitReason: 'In-House Team', overallRating: 4, wouldRecommend: true, feedback: 'Brego was excellent — no complaints. After 22 months of successful collaboration, we\'ve decided to hire an in-house Finance Manager. This decision is purely internal restructuring and has nothing to do with Brego\'s performance. You\'ve been a reliable partner and we\'ll reach out if we need support in the future.', improvementAreas: [], bestAspect: 'Reliable, compliant, professional service across 22 months', recoverable: true, status: 'Reviewed' },
  { id: 'EX-005', date: '2026-03-05', clientName: 'UrbanNest Realty', service: 'Performance Marketing', accountManager: 'Sneha Patel', tenure: 18, billingPerMonth: 120000, exitReason: 'Budget Cuts', overallRating: 4, wouldRecommend: true, feedback: 'The SEM work was solid — especially the property launch campaigns. We saw good lead generation for our luxury segment. However, due to the real estate market slowdown, we\'ve decided to reduce marketing spend significantly. We still believe in the partnership and will revisit once market conditions improve in Q4.', improvementAreas: ['More flexible retainer structures for seasonal businesses', 'Advance planning for peak/off-peak periods'], bestAspect: 'Creative excellence and luxury market expertise', recoverable: true, status: 'Pending Review' },
  { id: 'EX-006', date: '2026-02-20', clientName: 'FreshBite Foods', service: 'Performance Marketing', accountManager: 'Rohan Desai', tenure: 10, billingPerMonth: 55000, exitReason: 'Switched to Competitor', overallRating: 2, wouldRecommend: false, feedback: 'We moved to a food-specific marketing agency that better understands our sector\'s unique dynamics — seasonality, food trends, influencer partnerships. While Brego was competent in general e-commerce, the food & beverage vertical requires specialized knowledge that we felt was missing.', improvementAreas: ['Vertical-specific expertise and case studies', 'Better understanding of food distribution channels', 'Influencer networks in food industry'], bestAspect: 'Good fundamentals in paid ads management', recoverable: false, status: 'Closed' },
  { id: 'EX-007', date: '2026-01-30', clientName: 'CloudSphere IT', service: 'Accounts & Taxation', accountManager: 'Akshay Mehta', tenure: 4, billingPerMonth: 30000, exitReason: 'Business Closed', overallRating: 3, wouldRecommend: true, feedback: 'We had to shut down operations due to unforeseen circumstances. Brego was supportive during the wind-down process — helped with final tax compliance and statutory clearances. No issues on Brego\'s end. This was purely a business decision on our side.', improvementAreas: [], bestAspect: 'Helpful and cooperative during business closure', recoverable: false, status: 'Closed' },
  { id: 'EX-008', date: '2026-03-08', clientName: 'SparkEdge Media', service: 'Performance Marketing', accountManager: 'Priya Sharma', tenure: 12, billingPerMonth: 95000, exitReason: 'Poor Results', overallRating: 2, wouldRecommend: false, feedback: 'Spent ₹1.14 crore over 12 months and ROAS plateaued at 1.8x from month 3 onwards. No innovation, no new strategy proposals, just running the same campaigns. When we requested optimization, the response was slow. Felt like Brego had deprioritized us. Moved to an agency with proven success in our vertical.', improvementAreas: ['Continuous innovation and testing', 'Proactive strategy updates', 'Better account management', 'Performance guarantees or risk-sharing models'], bestAspect: 'Initial setup and first 2 months of optimization', recoverable: false, status: 'Action Plan Created' },
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
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-[600px] bg-white border border-black/[0.08] rounded-xl shadow-lg z-30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-body font-semibold text-black/80">Filters</h3>
        <div className="flex items-center gap-2">
          {activeCount > 0 && <button onClick={onReset} className="text-caption font-medium text-[#204CC7] hover:underline">Reset all</button>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="p-1 rounded-md hover:bg-black/[0.04] text-black/55 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
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
              <FilterOption key={opt} label={opt === 'All' ? 'All Services' : opt === 'Performance Marketing' ? 'SEM' : 'A&T'} value={opt} selected={filters.service === opt} onSelect={v => onChange({ ...filters, service: v })} />
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
// The page now renders Exit Feedback only — the prior Feedbacks tab
// (in-flight ratings + status workflow) has been retired here. The
// `feedbacks` data, filters, drawer, and helpers are kept around in
// this file for the moment in case they're needed elsewhere; they're
// just no longer reachable from the UI. Strip them once we're sure
// nothing else imports the local helpers.
export function FeedbackData() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
  const [exitFeedbacks, setExitFeedbacks] = useState<ExitFeedback[]>(initialExitFeedbacks);

  const [searchQuery, setSearchQuery] = useState('');
  const [exitSearchQuery, setExitSearchQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [exitSortField, setExitSortField] = useState<'date' | 'tenure' | 'clientName' | 'status'>('date');
  const [exitSortDir, setExitSortDir] = useState<SortDir>('desc');

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [selectedExitFeedback, setSelectedExitFeedback] = useState<ExitFeedback | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const feedbackDetailRef = useModalA11y(showDrawer && !!selectedFeedback, () => setShowDrawer(false));
  const exitFeedbackDetailRef = useModalA11y(showDrawer && !!selectedExitFeedback, () => setShowDrawer(false));
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [openExitStatusDropdown, setOpenExitStatusDropdown] = useState<string | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const exitStatusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setOpenStatusDropdown(null);
      if (exitStatusDropdownRef.current && !exitStatusDropdownRef.current.contains(e.target as Node)) setOpenExitStatusDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const changeStatus = (feedbackId: string, newStatus: Feedback['status']) => {
    setFeedbacks(prev => prev.map(fb => fb.id === feedbackId ? { ...fb, status: newStatus } : fb));
    setOpenStatusDropdown(null);
  };

  const changeExitStatus = (exitId: string, newStatus: ExitFeedback['status']) => {
    setExitFeedbacks(prev => prev.map(ef => ef.id === exitId ? { ...ef, status: newStatus } : ef));
    setOpenExitStatusDropdown(null);
  };

  // Recovery Opportunity is admin-editable from both the table pill
  // and the drawer card. Flips the boolean on the source list and,
  // if the row is currently open in the drawer, mirrors the flip to
  // the drawer's local copy so the card and the recovery banner
  // re-render immediately without a re-open.
  const toggleRecoverable = (exitId: string) => {
    setExitFeedbacks(prev => prev.map(ef => ef.id === exitId ? { ...ef, recoverable: !ef.recoverable } : ef));
    setSelectedExitFeedback(prev => prev && prev.id === exitId ? { ...prev, recoverable: !prev.recoverable } : prev);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'clientName' ? 'asc' : 'desc'); }
  };

  const handleExitSort = (field: 'date' | 'tenure' | 'clientName' | 'status') => {
    if (exitSortField === field) setExitSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setExitSortField(field); setExitSortDir(field === 'clientName' ? 'asc' : 'desc'); }
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

  const filteredExitFeedbacks = useMemo(() => {
    let result = exitFeedbacks.filter(ef => {
      const q = exitSearchQuery.toLowerCase();
      return !q || ef.clientName.toLowerCase().includes(q) || ef.id.toLowerCase().includes(q) || ef.feedback.toLowerCase().includes(q) || ef.accountManager.toLowerCase().includes(q) || ef.exitReason.toLowerCase().includes(q);
    });
    result.sort((a, b) => {
      let cmp = 0;
      switch (exitSortField) {
        case 'date': cmp = parseDate(a.date).getTime() - parseDate(b.date).getTime(); break;
        case 'tenure': cmp = a.tenure - b.tenure; break;
        case 'clientName': cmp = a.clientName.localeCompare(b.clientName); break;
        case 'status': cmp = (EXIT_STATUS_ORDER[a.status] ?? 0) - (EXIT_STATUS_ORDER[b.status] ?? 0); break;
      }
      return exitSortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [exitFeedbacks, exitSearchQuery, exitSortField, exitSortDir]);

  // ── Feedbacks KPIs ──
  const totalFeedback = filteredFeedbacks.length;
  const avgRating = totalFeedback > 0 ? filteredFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalFeedback : 0;
  const positiveCount = filteredFeedbacks.filter(f => f.sentiment === 'Positive').length;
  const neutralCount = filteredFeedbacks.filter(f => f.sentiment === 'Neutral').length;
  const negativeCount = filteredFeedbacks.filter(f => f.sentiment === 'Negative').length;
  const decliningCount = filteredFeedbacks.filter(f => f.trend === 'Declining').length;
  const improvingCount = filteredFeedbacks.filter(f => f.trend === 'Improving').length;
  const newCount = filteredFeedbacks.filter(f => f.status === 'New').length;
  const unresolvedNegative = filteredFeedbacks.filter(f => f.sentiment === 'Negative' && (f.status === 'New' || f.status === 'Acknowledged'));

  // ── Exit Feedbacks KPIs ──
  const totalExits = filteredExitFeedbacks.length;
  const avgExitRating = totalExits > 0 ? filteredExitFeedbacks.reduce((sum, ef) => sum + ef.overallRating, 0) / totalExits : 0;
  const recoverableCount = filteredExitFeedbacks.filter(ef => ef.recoverable).length;
  const recoverableValue = filteredExitFeedbacks.filter(ef => ef.recoverable).reduce((sum, ef) => sum + ef.billingPerMonth, 0);
  const wouldRecommendCount = filteredExitFeedbacks.filter(ef => ef.wouldRecommend).length;
  const wouldRecommendPercent = totalExits > 0 ? Math.round((wouldRecommendCount / totalExits) * 100) : 0;
  const exitReasons = filteredExitFeedbacks.reduce((acc, ef) => {
    acc[ef.exitReason] = (acc[ef.exitReason] || 0) + 1;
    return acc;
  }, {} as Record<ExitFeedback['exitReason'], number>);
  const topExitReason = Object.entries(exitReasons).sort((a, b) => b[1] - a[1])[0];

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

  const getExitStatusColor = (status: string) => {
    switch (status) {
      case 'Closed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Action Plan Created': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Reviewed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending Review': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-black/5 text-black/50 border-black/10';
    }
  };

  const getServiceLabel = (s: string) => s === 'Performance Marketing' ? 'SEM' : 'A&T';

  const renderStars = (rating: number, size: string = 'w-3.5 h-3.5') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} className={`${size} ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-black/10 text-black/10'}`} />
      ))}
    </div>
  );

  const SortHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => {
    const isCurrent = sortField === field;
    const ariaSort = isCurrent ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined;
    return (
      <th
        scope="col"
        aria-sort={ariaSort}
        className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide select-none ${className}`}
      >
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="inline-flex items-center gap-1 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 rounded transition-colors"
        >
          {children}
          {isCurrent ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />) : <ArrowUpDown className="w-3 h-3 text-black/30" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  const ExitSortHeader = ({ field, children, className = '' }: { field: 'date' | 'tenure' | 'clientName' | 'status'; children: React.ReactNode; className?: string }) => {
    const isCurrent = exitSortField === field;
    const ariaSort = isCurrent ? (exitSortDir === 'asc' ? 'ascending' : 'descending') : undefined;
    return (
      <th
        scope="col"
        aria-sort={ariaSort}
        className={`px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide select-none ${className}`}
      >
        <button
          type="button"
          onClick={() => handleExitSort(field)}
          className="inline-flex items-center gap-1 hover:text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 rounded transition-colors"
        >
          {children}
          {isCurrent ? (exitSortDir === 'asc' ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />) : <ArrowUpDown className="w-3 h-3 text-black/30" aria-hidden="true" />}
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on every other Customers sub-page. Title +
        subtitle anchor the left; Search hangs on the right. The prior
        Feedbacks ↔ Exit Feedback view toggle is gone — this surface
        is Exit Feedback only.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Exit Feedback</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Why clients leave — themes, regrets, and what we'd do differently</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Exit Feedback search — single read on this surface now
                that the in-flight Feedbacks tab is retired. */}
            {exitSearchQuery && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/45">
                {filteredExitFeedbacks.length} of {exitFeedbacks.length} results
              </span>
            )}

            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="exit-feedback-search" className="sr-only">Search exit feedback</label>
              <input
                id="exit-feedback-search"
                type="text"
                placeholder="Search exits…"
                value={exitSearchQuery}
                onChange={e => setExitSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {exitSearchQuery && (
                <button
                  onClick={() => setExitSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/60 hover:text-black/70" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exit Feedback */}

          {/* Exit KPI Widgets */}
          <div className="grid grid-cols-4 gap-4">
            {/* Exit Rating */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Exit Rating</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className={`text-h1 font-bold ${avgExitRating >= 4 ? 'text-[#00C875]' : avgExitRating >= 3 ? 'text-[#FDAB3D]' : 'text-[#E2445C]'}`}>{avgExitRating.toFixed(1)}</p>
                    <span className="text-black/30 text-caption">/5</span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${avgExitRating >= 4 ? 'bg-[#00C875]/[0.08]' : avgExitRating >= 3 ? 'bg-[#FDAB3D]/[0.08]' : 'bg-[#E2445C]/[0.06]'}`}>
                  <Star className={`w-5 h-5 ${avgExitRating >= 4 ? 'text-[#00C875]/70 fill-[#00C875]/70' : avgExitRating >= 3 ? 'text-[#FDAB3D]/70 fill-[#FDAB3D]/70' : 'text-[#E2445C]/60 fill-[#E2445C]/60'}`} />
                </div>
              </div>
              <p className="text-black/55 text-caption">Average rating across <span className="text-black/60 font-medium">{totalExits}</span> exits</p>
            </div>

            {/* Recoverable */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Recoverable</p>
                  <p className="text-[#204CC7] text-h1 font-bold">{recoverableCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#204CC7]/[0.08]">
                  <TrendingUp className="w-5 h-5 text-[#204CC7]/70" />
                </div>
              </div>
              <p className="text-black/55 text-caption">Potential value: <span className="text-black/60 font-medium">{formatCurrency(recoverableValue)}/mo</span></p>
            </div>

            {/* Top Exit Reason */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Top Reason</p>
                  <p className="text-[#E2445C] text-h1 font-bold">{topExitReason ? topExitReason[1] : '0'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E2445C]/[0.06]">
                  <AlertTriangle className="w-5 h-5 text-[#E2445C]/60" />
                </div>
              </div>
              <p className="text-black/55 text-caption">{topExitReason ? topExitReason[0] : 'No exits'}</p>
            </div>

            {/* Would Recommend */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-black/50 text-caption font-medium uppercase tracking-wide">Would Recommend</p>
                  <p className="text-[#00C875] text-h1 font-bold">{wouldRecommendPercent}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00C875]/[0.08]">
                  <ThumbsUp className="w-5 h-5 text-[#00C875]/70" />
                </div>
              </div>
              <p className="text-black/55 text-caption"><span className="text-black/60 font-medium">{wouldRecommendCount}</span> of {totalExits} clients would recommend</p>
            </div>
          </div>

          {/* Exit Feedback Table */}
          <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    <ExitSortHeader field="date">Date</ExitSortHeader>
                    <ExitSortHeader field="clientName">Client</ExitSortHeader>
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                    <ExitSortHeader field="tenure">Tenure</ExitSortHeader>
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Billing / Mo</th>
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Exit Reason</th>
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Rating</th>
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Recovery</th>
                    {/* Status column intentionally removed — the
                        review-status workflow (Pending → Reviewed →
                        Action Plan → Closed) is now handled inside
                        the detail drawer only, keeping the exit
                        table as a clean read of who left and why. */}
                    <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExitFeedbacks.map(ef => (
                    <tr key={ef.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-black/70 text-caption font-normal">{formatDate(ef.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-black/90 text-body font-medium">{ef.clientName}</p>
                        <p className="text-black/55 text-caption font-normal">{ef.accountManager}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${ef.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                          {getServiceLabel(ef.service)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-black/70 text-caption font-normal">{ef.tenure} mo</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#E2445C] text-body font-medium">{formatCurrency(ef.billingPerMonth)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${EXIT_REASON_COLORS[ef.exitReason]}`}>
                          {ef.exitReason}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {renderStars(ef.overallRating, 'w-3 h-3')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {/* Recovery — admin-editable. Click toggles the
                            boolean on this row; e.stopPropagation keeps
                            the click from also opening the row's
                            detail drawer. The trailing chevron is the
                            interactive affordance — without it the
                            pill reads as static text and admins miss
                            that it can be flipped. The same chevron
                            pattern is used for the inline status
                            dropdowns elsewhere in this surface. */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleRecoverable(ef.id); }}
                          aria-label={`Recovery opportunity for ${ef.clientName}: currently ${ef.recoverable ? 'Yes' : 'No'} — click to toggle`}
                          aria-pressed={ef.recoverable}
                          className={`inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-md text-caption font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                            ef.recoverable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${ef.recoverable ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                          {ef.recoverable ? 'Yes' : 'No'}
                          <ChevronRight className={`w-3 h-3 ${ef.recoverable ? 'text-emerald-500/70' : 'text-slate-400'}`} aria-hidden="true" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button aria-label={`View ${ef.clientName} exit feedback details`} onClick={() => { setSelectedExitFeedback(ef); setShowDrawer(true); }} className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredExitFeedbacks.length === 0 && (
              <div className="py-16 text-center">
                <MessageSquare className="w-10 h-10 text-black/10 mx-auto mb-3" />
                <p className="text-black/50 text-body font-medium">No exit feedback found</p>
                <p className="text-black/35 text-caption font-normal mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </div>

          {/* Exit Feedback Details Drawer */}
          {showDrawer && selectedExitFeedback && (() => {
            const daysAgo = daysSince(selectedExitFeedback.date);
            const isPendingReview = selectedExitFeedback.status === 'Pending Review';
            const isReviewed = selectedExitFeedback.status === 'Reviewed';
            const isActionPlanCreated = selectedExitFeedback.status === 'Action Plan Created';
            const isClosed = selectedExitFeedback.status === 'Closed';

            const nextStatus: ExitFeedback['status'] | null = isPendingReview ? 'Reviewed' : isReviewed ? 'Action Plan Created' : isActionPlanCreated ? 'Closed' : null;
            const nextLabel = isPendingReview ? 'Mark as Reviewed' : isReviewed ? 'Create Action Plan' : isActionPlanCreated ? 'Close Exit' : null;
            const nextColors = isPendingReview ? 'bg-[#204CC7] hover:bg-[#1a3d9f] text-white' : isReviewed ? 'bg-[#7C3AED] hover:bg-[#6d28d9] text-white' : isActionPlanCreated ? 'bg-[#00C875] hover:bg-[#00a85f] text-white' : '';

            const reasonColors: Record<ExitFeedback['exitReason'], string> = {
              'Budget Cuts': 'bg-amber-600',
              'Poor Results': 'bg-red-600',
              'Switched to Competitor': 'bg-purple-600',
              'In-House Team': 'bg-blue-600',
              'Business Closed': 'bg-gray-600',
              'Service Not Needed': 'bg-cyan-600',
            };

            return (
              <div className="fixed inset-0 z-[60] overflow-hidden">
                <div aria-hidden="true" className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
                <div
                  ref={exitFeedbackDetailRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exit-feedback-detail-title"
                  tabIndex={-1}
                  // Bumped from max-w-xl (576px) → max-w-3xl (768px)
                  // for parity with the relationship drawer; the
                  // dense exit-detail content (Why They Left, What
                  // Could Be Better, What They Liked Most, Details
                  // strip) reads better with editorial breathing room
                  // than at the previous 576px width.
                  className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl overflow-hidden focus:outline-none"
                >
                  <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className={`${reasonColors[selectedExitFeedback.exitReason]} px-6 py-5`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedExitFeedback.id}</span>
                            <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedExitFeedback.exitReason}</span>
                            <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedExitFeedback.overallRating}/5 ★</span>
                          </div>
                          <h2 id="exit-feedback-detail-title" className="text-white text-h2 font-bold truncate">{selectedExitFeedback.clientName}</h2>
                          <p className="text-white/85 text-caption font-normal mt-1">{formatDate(selectedExitFeedback.date)} · {selectedExitFeedback.tenure} months tenure · {getServiceLabel(selectedExitFeedback.service)}</p>
                        </div>
                        <button aria-label="Close exit feedback details" onClick={() => setShowDrawer(false)} className="ml-3 w-8 h-8 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/60">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Recoverable Banner */}
                    {selectedExitFeedback.recoverable && (
                      <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#00C875]/[0.06] border border-[#00C875]/20 rounded-xl">
                        <div className="w-8 h-8 bg-[#00C875]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-[#00C875]" />
                        </div>
                        <div>
                          <p className="text-[#00C875] text-caption font-semibold">Recovery opportunity — client open to re-engagement</p>
                          <p className="text-black/50 text-caption font-normal">Potential value: {formatCurrency(selectedExitFeedback.billingPerMonth)}/month</p>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                      {/* Top-of-drawer summary — restored 2×2 grid.
                          Status was removed earlier; the four cards in
                          this grid are now Recommend / Recovery
                          Opportunity / Overall Rating / Tenure. The
                          Recovery card mirrors the table's new
                          Recovery column so the two surfaces speak
                          the same vocabulary. */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                          <p className="text-black/45 text-caption font-medium mb-1.5">Recommend</p>
                          <div className="flex items-center gap-2">
                            {selectedExitFeedback.wouldRecommend ? (
                              <>
                                <ThumbsUp className="w-4 h-4 text-[#00C875]" />
                                <span className="text-[#00C875] text-caption font-semibold">Yes</span>
                              </>
                            ) : (
                              <>
                                <ThumbsDown className="w-4 h-4 text-[#E2445C]" />
                                <span className="text-[#E2445C] text-caption font-semibold">No</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-black/45 text-caption font-medium">Recovery Opportunity</p>
                            <span className="text-black/30 text-caption font-medium">Click to toggle</span>
                          </div>
                          {/* Same admin-editable affordance as the table
                              column. Toggling here flips the row in the
                              source list and the drawer's local copy
                              both — the recovery banner above also
                              re-renders to match. */}
                          <button
                            type="button"
                            onClick={() => toggleRecoverable(selectedExitFeedback.id)}
                            aria-label={`Recovery opportunity: currently ${selectedExitFeedback.recoverable ? 'Yes' : 'No'} — click to toggle`}
                            aria-pressed={selectedExitFeedback.recoverable}
                            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-caption font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                              selectedExitFeedback.recoverable
                                ? 'bg-emerald-50 text-[#00C875] border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {selectedExitFeedback.recoverable ? (
                              <TrendingUp className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Minus className="w-4 h-4" aria-hidden="true" />
                            )}
                            {selectedExitFeedback.recoverable ? 'Yes' : 'No'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                          <p className="text-black/45 text-caption font-medium mb-2">Overall Rating</p>
                          {renderStars(selectedExitFeedback.overallRating)}
                        </div>
                        <div className="bg-white border border-black/[0.06] rounded-xl p-3.5">
                          <p className="text-black/45 text-caption font-medium mb-1.5">Tenure</p>
                          <p className="text-black/80 text-body font-medium">{selectedExitFeedback.tenure} months</p>
                        </div>
                      </div>

                      {/* Why They Left */}
                      <div className={`rounded-xl p-4 border bg-rose-50/50 border-rose-200/60`}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <h3 className="text-rose-900 text-body font-semibold">Why They Left</h3>
                        </div>
                        <p className="text-rose-700/80 text-body leading-relaxed">{selectedExitFeedback.feedback}</p>
                      </div>

                      {/* What Could Be Better */}
                      {selectedExitFeedback.improvementAreas.length > 0 && (
                        <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#FDAB3D]" />
                            <h3 className="text-black/90 text-body font-semibold">What Could Be Better</h3>
                          </div>
                          <div className="space-y-2">
                            {selectedExitFeedback.improvementAreas.map((area, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 py-2 px-3 rounded-lg bg-[#FDAB3D]/[0.05]">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FDAB3D] mt-1.5 flex-shrink-0" />
                                <p className="text-black/70 text-caption">{area}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* What They Liked */}
                      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2.5">
                          <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                          <h3 className="text-emerald-900 text-body font-semibold">What They Liked Most</h3>
                        </div>
                        <p className="text-emerald-700/80 text-body leading-relaxed">{selectedExitFeedback.bestAspect}</p>
                      </div>

                      {/* Details */}
                      <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                        <h3 className="text-black/90 text-body font-semibold mb-3.5">Details</h3>
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-black/35" />
                              <span className="text-black/50 text-caption font-medium">Service</span>
                            </div>
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-caption font-medium border ${selectedExitFeedback.service === 'Performance Marketing' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>
                              {getServiceLabel(selectedExitFeedback.service)}
                            </span>
                          </div>
                          <div className="h-px bg-black/[0.04]" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-black/35" />
                              <span className="text-black/50 text-caption font-medium">Account Manager</span>
                            </div>
                            <p className="text-black/80 text-body font-medium">{selectedExitFeedback.accountManager}</p>
                          </div>
                          <div className="h-px bg-black/[0.04]" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-black/35" />
                              <span className="text-black/50 text-caption font-medium">Exit Date</span>
                            </div>
                            <p className="text-black/80 text-body font-medium">{formatDate(selectedExitFeedback.date)}</p>
                          </div>
                          <div className="h-px bg-black/[0.04]" />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5 text-black/35" />
                              <span className="text-black/50 text-caption font-medium">Billing / Month</span>
                            </div>
                            <p className="text-[#E2445C] text-body font-medium">{formatCurrency(selectedExitFeedback.billingPerMonth)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer — Dismiss only.
                        The previous status-progression CTA stack
                        (Mark Reviewed → Create Action Plan → Close
                        Exit, plus the terminal "Exit processed"
                        banner) has been retired alongside the
                        table's Status column and the in-drawer
                        Status card. The drawer is now a read-only
                        detail surface; closing it is the only
                        action it offers. */}
                    <div className="px-6 py-4 border-t border-black/[0.06]">
                      <button
                        onClick={() => setShowDrawer(false)}
                        className="w-full px-3 py-2.5 border border-black/10 text-black/60 rounded-xl hover:bg-black/[0.03] transition-all text-caption font-medium"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
    </div>
  );
}
