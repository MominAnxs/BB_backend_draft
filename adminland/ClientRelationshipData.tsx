'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useModalA11y } from '@/lib/use-modal-a11y';
import { Heart, Search, Building2, User, Calendar, AlertCircle, CheckCircle2, X, FileText, TrendingUp, TrendingDown, Minus, Filter, Eye, Check, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, Shield, Star, AlertTriangle, Phone, BarChart3 } from 'lucide-react';
import { MonthNavigator } from '@/workspace/shared/MonthNavigator';
import { PeriodLabel } from '@/workspace/shared/PeriodLabel';

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
  // Overall service feedback the client gave for this period —
  // mirrors the single `rating` field on the Feedback module so the
  // two surfaces stay in sync and the same number means the same
  // thing on both. Captured via the client-facing app alongside the
  // leadership ratings above.
  overallServiceScore: number;
  overallHealth: 'Excellent' | 'Good' | 'Needs Attention';
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
type SortField = 'lastTouchpoint' | 'clientName' | 'monthlyBilling' | 'tenure' | 'overallHealth' | 'nextReview';
type SortDir = 'asc' | 'desc';

interface Filters {
  service: ServiceFilter;
  health: HealthFilter;
  trend: TrendFilter;
  status: StatusFilter;
}

const DEFAULT_FILTERS: Filters = { service: 'All', health: 'All', trend: 'All', status: 'All' };

const HEALTH_ORDER: Record<string, number> = { 'Needs Attention': 0, 'Good': 1, 'Excellent': 2 };
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
    case 'Excellent': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Good': return 'bg-blue-50 text-blue-700 border-blue-200';
    // "Needs Attention" is now the worst tier (former "At Risk" rows
    // fold into it), so we use rose to keep the urgency cue admins are
    // used to scanning for.
    case 'Needs Attention': return 'bg-rose-50 text-rose-700 border-rose-200';
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
function getServiceLabel(s: string): string { return s === 'Performance Marketing' ? 'SEM' : 'A&T'; }

function renderScore(score: number): { color: string; label: string } {
  if (score >= 4) return { color: 'text-emerald-600', label: 'Excellent' };
  if (score >= 3) return { color: 'text-blue-600', label: 'Good' };
  if (score >= 2) return { color: 'text-amber-600', label: 'Fair' };
  return { color: 'text-rose-600', label: 'Poor' };
}

// ── Feedback History ────────────────────────────────────────────
// Admins can scrub through prior months on the drawer's Client
// Feedback card via a month dropdown. Months span Oct 2025 → Mar 2026
// (the seed window for "current" engagement data). For each client we
// derive past scores from the latest scores plus the trend direction:
//   • Improving → past months had lower scores, climbing toward present
//   • Declining → past months had higher scores, sliding toward present
//   • Stable    → past months match the latest, with no drift
// Scores are clamped to the 1–5 scale, and the latest entry exactly
// mirrors the row's top-level scores so the table summary and the
// drawer's default view never disagree.
// Window: Nov 2025 → Apr 2026. Anchored so the latest entry is the
// most recently closed monthly review period relative to "today" (the
// page-level current calendar month). Bump forward when the seed
// data is rolled to a newer reference date.
const FEEDBACK_HISTORY_MONTHS = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04'] as const;
type FeedbackHistoryMonth = (typeof FEEDBACK_HISTORY_MONTHS)[number];
const LATEST_FEEDBACK_MONTH: FeedbackHistoryMonth = FEEDBACK_HISTORY_MONTHS[FEEDBACK_HISTORY_MONTHS.length - 1];

interface FeedbackHistoryEntry {
  month: FeedbackHistoryMonth;
  serviceHeadScore: number;
  cooScore: number;
  overallServiceScore: number;
}

function formatFeedbackMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number);
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${labels[mo - 1]} ${y}`;
}

function buildFeedbackHistory(
  client: Pick<ClientRelationship, 'serviceHeadScore' | 'cooScore' | 'overallServiceScore' | 'trend'>,
): FeedbackHistoryEntry[] {
  // Drift one rating step every two months in the trend's opposite
  // direction. Improving = earlier was worse; Declining = earlier was
  // better. Half-month granularity (rounded) gives a gentler curve
  // than a full step per month and stays in [1,5] for typical inputs.
  const trendStep = client.trend === 'Improving' ? -1 : client.trend === 'Declining' ? +1 : 0;
  const clamp = (v: number) => Math.max(1, Math.min(5, v));
  const len = FEEDBACK_HISTORY_MONTHS.length;
  return FEEDBACK_HISTORY_MONTHS.map((month, idx) => {
    const monthsBack = len - 1 - idx;
    const offset = trendStep * Math.round(monthsBack / 2);
    return {
      month,
      serviceHeadScore: clamp(client.serviceHeadScore + offset),
      cooScore: clamp(client.cooScore + offset),
      overallServiceScore: clamp(client.overallServiceScore + offset),
    };
  });
}

// ── Realistic Brego Data ──
// Review cadence rule: every active client gets one relationship review
// per calendar month. Each row's `nextReview` is therefore set to exactly
// one month after `lastTouchpoint` — preserve that pairing when adding /
// editing rows so the column reads as a true monthly schedule rather
// than an arbitrary follow-up date.
const initialRelationships: ClientRelationship[] = [
  { id: 'CR-001', clientName: 'Zenith Retail Pvt Ltd', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 150000, tenure: 18, serviceHeadScore: 5, cooScore: 5, overallServiceScore: 5, overallHealth: 'Excellent', trend: 'Improving', lastTouchpoint: '2026-04-28', nextReview: '2026-05-28', touchpointType: 'Strategic Review', keyContact: 'Rajesh Khanna', keyContactRole: 'CMO', notes: 'Flagship client. ROAS consistently above 4x. Expanding to Google Ads next quarter. CMO personally praised the team in last QBR.', status: 'Stable', wins: ['ROAS improved 2.1x → 4.8x', 'Upsold to premium tier', 'Case study published'] },
  { id: 'CR-002', clientName: 'Meridian Healthcare', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 45000, tenure: 8, serviceHeadScore: 2, cooScore: 3, overallServiceScore: 2, overallHealth: 'Needs Attention', trend: 'Declining', lastTouchpoint: '2026-04-20', nextReview: '2026-05-20', touchpointType: 'Escalation', keyContact: 'Dr. Meera Shah', keyContactRole: 'Founder', notes: 'GST delays 3 months running. Founder personally escalated. Dedicated executive now assigned but trust is damaged. Need consistent delivery for 2 months to recover.', status: 'Escalated', riskFactors: ['Repeated GST delays', 'Founder escalation', 'Competitor pitching'] },
  { id: 'CR-003', clientName: 'NovaTech Solutions', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 60000, tenure: 14, serviceHeadScore: 4, cooScore: 4, overallServiceScore: 4, overallHealth: 'Good', trend: 'Improving', lastTouchpoint: '2026-04-25', nextReview: '2026-05-25', touchpointType: 'Check-in Call', keyContact: 'Vikram Joshi', keyContactRole: 'CFO', notes: 'Strong on delivery. Tax savings of ₹4.2L this FY built significant trust. CFO appreciates proactive advice. Exploring advisory retainer upsell.', status: 'Active', wins: ['₹4.2L tax savings', 'Response SLA met consistently'] },
  { id: 'CR-004', clientName: 'Bloom Botanics', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 85000, tenure: 6, serviceHeadScore: 1, cooScore: 2, overallServiceScore: 1, overallHealth: 'Needs Attention', trend: 'Declining', lastTouchpoint: '2026-04-15', nextReview: '2026-05-15', touchpointType: 'Escalation', keyContact: 'Anita Kulkarni', keyContactRole: 'Marketing Head', notes: 'Critical situation. Creative quality issues for 3 consecutive months. Brand name misspelled in ads. Zero conversions in March. Client exploring other agencies.', status: 'Escalated', riskFactors: ['Creative quality failures', 'Zero March conversions', 'Actively exploring alternatives', 'Brand damage from errors'] },
  { id: 'CR-005', clientName: 'GreenLeaf Organics', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 55000, tenure: 24, serviceHeadScore: 5, cooScore: 5, overallServiceScore: 5, overallHealth: 'Excellent', trend: 'Stable', lastTouchpoint: '2026-04-26', nextReview: '2026-05-26', touchpointType: 'QBR', keyContact: 'Arjun Malhotra', keyContactRole: 'Director', notes: 'Model client. Zero errors in 24 months. Proactively flagged TDS mismatch saving ₹1.8L. Video testimonial recorded. Referred 2 new clients.', status: 'Stable', wins: ['Zero errors in 24 months', 'Saved ₹1.8L TDS mismatch', '2 referrals generated', 'Video testimonial'] },
  { id: 'CR-006', clientName: 'Sunrise Hospitality', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 200000, tenure: 12, serviceHeadScore: 5, cooScore: 4, overallServiceScore: 5, overallHealth: 'Excellent', trend: 'Improving', lastTouchpoint: '2026-04-22', nextReview: '2026-05-22', touchpointType: 'Strategic Review', keyContact: 'Rahul Mehra', keyContactRole: 'VP Marketing', notes: 'High-value client. Seasonal campaign drove 62% booking increase in off-peak months. Upsold to premium plan with ₹50K MRR increase. VP personally acknowledged the team.', status: 'Stable', wins: ['62% off-peak booking increase', 'Upsold ₹50K MRR', 'VP Marketing advocates internally'] },
  { id: 'CR-007', clientName: 'UrbanNest Realty', service: 'Performance Marketing', accountManager: 'Akshay Mehta', monthlyBilling: 120000, tenure: 10, serviceHeadScore: 3, cooScore: 3, overallServiceScore: 3, overallHealth: 'Needs Attention', trend: 'Stable', lastTouchpoint: '2026-04-18', nextReview: '2026-05-18', touchpointType: 'Check-in Call', keyContact: 'Sanjay Gupta', keyContactRole: 'Business Head', notes: 'Communication gap is the core issue. Results are decent (3.2x ROAS) but client feels uninformed. Weekly update calls scheduled but not consistently happening.', status: 'Watch List', riskFactors: ['Inconsistent communication', 'Missed weekly updates', 'Client feels uninformed'] },
  { id: 'CR-008', clientName: 'FreshBite Foods', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 95000, tenure: 9, serviceHeadScore: 4, cooScore: 4, overallServiceScore: 4, overallHealth: 'Good', trend: 'Improving', lastTouchpoint: '2026-04-27', nextReview: '2026-05-27', touchpointType: 'Check-in Call', keyContact: 'Deepa Nair', keyContactRole: 'Growth Lead', notes: 'Solid mid-tier client. CAC reduced from ₹180 to ₹95 after funnel optimization. Client happy with video ad performance. Potential to expand to Instagram shopping.', status: 'Active', wins: ['CAC reduced 50%', 'Video ads outperforming 30%'] },
  { id: 'CR-009', clientName: 'Quantum Finserv', service: 'Accounts & Taxation', accountManager: 'Rohan Desai', monthlyBilling: 75000, tenure: 11, serviceHeadScore: 3, cooScore: 3, overallServiceScore: 3, overallHealth: 'Needs Attention', trend: 'Declining', lastTouchpoint: '2026-04-19', nextReview: '2026-05-19', touchpointType: 'Escalation', keyContact: 'Nikhil Agarwal', keyContactRole: 'CEO', notes: 'Accuracy issues are the primary concern. 2 errors in March P&L. For a finserv company, this is critical. CEO has raised it directly with COO. Must deliver zero-error April reports.', status: 'Watch List', riskFactors: ['P&L accuracy errors', 'CEO escalation', 'Regulatory risk for client'] },
  { id: 'CR-010', clientName: 'Pinnacle Education', service: 'Performance Marketing', accountManager: 'Priya Sharma', monthlyBilling: 350000, tenure: 15, serviceHeadScore: 4, cooScore: 4, overallServiceScore: 4, overallHealth: 'Good', trend: 'Stable', lastTouchpoint: '2026-04-24', nextReview: '2026-05-24', touchpointType: 'Strategic Review', keyContact: 'Amit Deshmukh', keyContactRole: 'CEO', notes: 'Highest billing PM client. Lead quality is the ongoing concern — 35% unqualified. New pre-qualification form implemented. CEO engaged and patient but watching closely.', status: 'Active', wins: ['Consistent lead volume', 'CEO directly engaged'] },
  { id: 'CR-011', clientName: 'Metro Logistics', service: 'Performance Marketing', accountManager: 'Akshay Mehta', monthlyBilling: 65000, tenure: 7, serviceHeadScore: 2, cooScore: 2, overallServiceScore: 2, overallHealth: 'Needs Attention', trend: 'Declining', lastTouchpoint: '2026-04-14', nextReview: '2026-05-14', touchpointType: 'Escalation', keyContact: 'Pradeep Kumar', keyContactRole: 'Operations Head', notes: 'Communication breakdown. Multiple missed callbacks. Akshay on performance improvement plan. Client given direct line to team lead as interim measure. Must stabilize within 2 weeks.', status: 'Escalated', riskFactors: ['Missed callbacks', 'AM on PIP', 'Client escalated internally'] },
  { id: 'CR-012', clientName: 'Spice Route Exports', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 40000, tenure: 5, serviceHeadScore: 4, cooScore: 3, overallServiceScore: 4, overallHealth: 'Good', trend: 'Improving', lastTouchpoint: '2026-04-21', nextReview: '2026-05-21', touchpointType: 'Check-in Call', keyContact: 'Arun Kapoor', keyContactRole: 'Co-Founder', notes: 'Newer client showing positive trajectory. Simplified reporting template well received. Cash flow forecast template being added per their request. Building trust steadily.', status: 'Active', wins: ['Simplified reporting appreciated', 'Growing trust'] },
  { id: 'CR-013', clientName: 'Orbit Fashion', service: 'Performance Marketing', accountManager: 'Sneha Patel', monthlyBilling: 110000, tenure: 13, serviceHeadScore: 4, cooScore: 4, overallServiceScore: 4, overallHealth: 'Good', trend: 'Stable', lastTouchpoint: '2026-04-23', nextReview: '2026-05-23', touchpointType: 'Strategic Review', keyContact: 'Nisha Verma', keyContactRole: 'Brand Director', notes: 'Reliable relationship. Influencer marketing strategy working well. Brand Director is a strong advocate internally. Exploring micro-influencer expansion for April collection.', status: 'Active', wins: ['Influencer ROI proven', 'Brand Director advocates'] },
  { id: 'CR-014', clientName: 'Artisan Crafts Co', service: 'Accounts & Taxation', accountManager: 'Kavita Nair', monthlyBilling: 35000, tenure: 20, serviceHeadScore: 5, cooScore: 5, overallServiceScore: 5, overallHealth: 'Excellent', trend: 'Stable', lastTouchpoint: '2026-04-26', nextReview: '2026-05-26', touchpointType: 'QBR', keyContact: 'Meena Deshpande', keyContactRole: 'Owner', notes: 'One of our longest-serving A&T clients. Every filing delivered 2-3 days early without exception. Annual contract renewed with 10% rate increase accepted. Perfect compliance record.', status: 'Stable', wins: ['100% on-time delivery', 'Rate increase accepted', 'Annual renewal confirmed'] },
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
            {(['All', 'Excellent', 'Good', 'Needs Attention'] as HealthFilter[]).map(opt => (
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
// color variants:
//   'amber'   — COO rating (default)
//   'purple'  — SEM HOD rating
//   'cyan'    — A&T HOD rating
//   'emerald' — Overall Service rating (mirrors the rating field on the
//               Feedback module; brand success green so it reads as the
//               bottom-line positive/negative summary of the engagement)
type StarColor = 'amber' | 'purple' | 'cyan' | 'emerald';
const STAR_COLORS: Record<StarColor, { filled: string; text: string }> = {
  amber:   { filled: 'text-[#FDAB3D] fill-[#FDAB3D]', text: 'text-[#FDAB3D]' },
  purple:  { filled: 'text-[#7C3AED] fill-[#7C3AED]', text: 'text-[#7C3AED]' },
  cyan:    { filled: 'text-[#06B6D4] fill-[#06B6D4]', text: 'text-[#06B6D4]' },
  emerald: { filled: 'text-[#00C875] fill-[#00C875]', text: 'text-[#00C875]' },
};

function StarRating({ score, size = 'sm', color = 'amber', label }: { score: number; size?: 'sm' | 'md'; color?: StarColor; label?: string }) {
  const dim = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const c = STAR_COLORS[color];
  // Single accessible name for the whole star group. The individual <Star>
  // SVGs become decorative — otherwise SR users hear "image, image, image…".
  // `label` lets callers prefix the rating with context ("CP rated 4 of 5").
  const a11y = label ? `${label}: ${score} of 5 stars` : `${score} of 5 stars`;
  return (
    <div className="flex items-center gap-1" role="img" aria-label={a11y}>
      <div className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} className={`${dim} ${i <= score ? c.filled : 'text-black/15 fill-current'}`} />
        ))}
      </div>
      <span className={`text-caption font-semibold ${c.text} tabular-nums ml-0.5`} aria-hidden="true">{score}/5</span>
    </div>
  );
}

// ── Score Bar (drawer version with label + stars + bar) ──
const BAR_COLORS: Record<StarColor, string> = { amber: 'bg-[#FDAB3D]', purple: 'bg-[#7C3AED]', cyan: 'bg-[#06B6D4]', emerald: 'bg-[#00C875]' };

function ScoreBar({ score, label, color = 'amber' }: { score: number; label: string; color?: StarColor }) {
  // Internal rhythm: 10px gap between the label/stars row and the
  // bar, slightly thicker bar (h-2) for visual presence in the
  // editorial-shaped Client Feedback card. Cleaner read at the new
  // 24px section padding.
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-black/65 text-caption font-medium">{label}</span>
        <StarRating score={score} size="sm" color={color} />
      </div>
      <div className="h-2 rounded-full bg-black/[0.04] overflow-hidden">
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
  // Page-level period state — drives the MonthNavigator + PeriodLabel
  // pill in the top bar (same pattern as the Recurring Checklist top
  // bar). Defaults to the actual current calendar month so the page
  // always opens on "today". The page month also seeds the drawer's
  // Client Feedback scrubber: when an admin opens a client while the
  // page is set to May 2026, the feedback card lands on May 2026 too
  // (or falls back to the latest closed feedback month if May hasn't
  // produced a rating yet — see the reset effect below).
  const today = new Date();
  const [pageMonthIdx, setPageMonthIdx] = useState<number>(today.getMonth());
  const [pageYear, setPageYear] = useState<number>(today.getFullYear());

  // Selected month for the drawer's Client Feedback history scrubber.
  // Defaults to the page-level month so the drawer view stays in
  // step with the top bar; resets when a different client is opened
  // so context never silently carries across clients.
  const [feedbackMonth, setFeedbackMonth] = useState<FeedbackHistoryMonth>(LATEST_FEEDBACK_MONTH);
  const [feedbackMonthOpen, setFeedbackMonthOpen] = useState(false);

  // Drawer a11y: Escape closes, focus traps inside, focus returns to the
  // launcher (Eye button) when the drawer dismisses.
  const drawerRef = useModalA11y(showDrawer && !!selectedClient, () => setShowDrawer(false));
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const feedbackMonthRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setOpenStatusDropdown(null);
      if (feedbackMonthRef.current && !feedbackMonthRef.current.contains(e.target as Node)) setFeedbackMonthOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset the feedback-history scrubber whenever a different client is
  // opened. The default is the page-level month if it exists in the
  // seed history range (Oct 2025 → Mar 2026); otherwise fall back to
  // the latest. Without this, switching from one client to another
  // would silently inherit the previous client's selected month.
  useEffect(() => {
    if (selectedClient) {
      const pageKey = `${pageYear}-${String(pageMonthIdx + 1).padStart(2, '0')}` as FeedbackHistoryMonth;
      const pageInRange = (FEEDBACK_HISTORY_MONTHS as readonly string[]).includes(pageKey);
      setFeedbackMonth(pageInRange ? pageKey : LATEST_FEEDBACK_MONTH);
      setFeedbackMonthOpen(false);
    }
  }, [selectedClient?.id, pageMonthIdx, pageYear]);

  const changeStatus = (id: string, newStatus: ClientRelationship['status']) => {
    setRelationships(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setOpenStatusDropdown(null);
  };

  // `notes` is now read-only (Client Words) — sourced from the
  // client-facing app and never edited inside the admin surface, so
  // the previous `updateNotes` mutator has been removed. If a future
  // admin-only annotation field is needed, add a separate property
  // (e.g. `internalNotes`) rather than reusing this one.

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
        case 'lastTouchpoint': cmp = parseDate(a.lastTouchpoint).getTime() - parseDate(b.lastTouchpoint).getTime(); break;
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
  // Three-tier health bucket: Excellent / Good / Needs Attention.
  // "Needs Attention" is the worst tier (former "At Risk" rolls in);
  // attentionMRR sums the billing across that bucket so the page-level
  // risk widget reads as "what revenue is exposed today?".
  const excellentCount = filteredRelationships.filter(r => r.overallHealth === 'Excellent').length;
  const goodCount = filteredRelationships.filter(r => r.overallHealth === 'Good').length;
  const attentionCount = filteredRelationships.filter(r => r.overallHealth === 'Needs Attention').length;
  const totalMRR = filteredRelationships.reduce((s, r) => s + r.monthlyBilling, 0);
  const attentionMRR = filteredRelationships.filter(r => r.overallHealth === 'Needs Attention').reduce((s, r) => s + r.monthlyBilling, 0);
  const improvingCount = filteredRelationships.filter(r => r.trend === 'Improving').length;
  const decliningCount = filteredRelationships.filter(r => r.trend === 'Declining').length;
  const avgScore = total > 0 ? Math.round(filteredRelationships.reduce((s, r) => s + (r.serviceHeadScore + r.cooScore) / 2, 0) / total) : 0;
  const overdueReviews = filteredRelationships.filter(r => daysUntil(r.nextReview) < 0).length;
  const upcomingReviews = filteredRelationships.filter(r => { const d = daysUntil(r.nextReview); return d >= 0 && d <= 7; }).length;
  const pmCount = filteredRelationships.filter(r => r.service === 'Performance Marketing').length;
  const atCount = filteredRelationships.filter(r => r.service === 'Accounts & Taxation').length;

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

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on every other Customers sub-page (All Customers,
        CLAs, Lost Clients, Incidents, Feedbacks). Title + subtitle anchor
        the left; result count + Search + Filter hang on the right so the
        whole Customers section reads with one consistent visual rhythm.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          {/* Left — title + subtitle, then a vertical divider, then
              the MonthNavigator + PeriodLabel pill. Same chrome as
              the Recurring Checklist top bar so the period control
              reads as a familiar, app-wide pattern: text-body title,
              text-caption subtitle, divider, the in-bar month nav,
              and the period status pill that flips between Closed /
              Days-left / Upcoming based on the selected month. */}
          <div className="flex items-center gap-4 shrink-0 min-w-0">
            <div className="shrink-0">
              <p className="text-black/90 text-body font-semibold">Client Relationships</p>
              <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Track relationship health, manage touchpoints, and protect revenue</p>
            </div>
            <div className="w-px h-8 bg-black/[0.08]" aria-hidden="true" />
            <MonthNavigator
              monthIdx={pageMonthIdx}
              year={pageYear}
              onMonthChange={setPageMonthIdx}
              onYearChange={setPageYear}
              minYear={2025}
            />
            <PeriodLabel monthIdx={pageMonthIdx} year={pageYear} />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only when filters or search are narrowing the table */}
            {(filterCount > 0 || searchQuery) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/60">
                {filteredRelationships.length} of {relationships.length} clients
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="relationships-search" className="sr-only">Search clients</label>
              <input
                id="relationships-search"
                type="text"
                placeholder="Search clients…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/60 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                aria-expanded={showFilterPanel}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  filterCount > 0
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filter</span>
                {filterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>}
              </button>
              {showFilterPanel && (
                <RelationshipFilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilterPanel(false)} onReset={() => setFilters(DEFAULT_FILTERS)} activeCount={filterCount} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Tags */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/55">Filtered by:</span>
          {filters.service !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{getServiceLabel(filters.service)}<button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.health !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.health}<button onClick={() => setFilters(f => ({ ...f, health: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.trend !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.trend}<button onClick={() => setFilters(f => ({ ...f, trend: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          {filters.status !== 'All' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">{filters.status}<button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5"><X className="w-3 h-3" /></button></span>}
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-caption font-medium text-black/55 hover:text-[#204CC7] transition-colors">Clear all</button>
        </div>
      )}

      {/*
        KPI widgets — simplified to a single message per card. Each follows
        the same shape: a small label (top-left) + an icon (top-right), one
        large number, and one short caption. We dropped the prior bar charts
        and Strong/Healthy/Attention/At-Risk breakdown legends — they
        duplicated the headline data and added clutter without earning the
        space. Drill-downs live in the table filter chips.
      */}
      {(() => {
        const stableCount = Math.max(total - improvingCount - decliningCount, 0);
        const ratingTone = avgScore >= 4 ? 'good' : avgScore >= 3 ? 'warn' : 'bad';
        const riskTone = attentionMRR > 0 ? 'bad' : 'good';
        const trendTone = decliningCount > 0 ? 'bad' : 'good';
        const reviewsTone = overdueReviews > 0 ? 'bad' : upcomingReviews > 0 ? 'warn' : 'good';
        const toneClasses = {
          good: { value: 'text-[#00C875]', iconBg: 'bg-[#00C875]/[0.08]', iconFg: 'text-[#00C875]/80' },
          warn: { value: 'text-[#FDAB3D]', iconBg: 'bg-[#FDAB3D]/[0.08]', iconFg: 'text-[#FDAB3D]/80' },
          bad:  { value: 'text-[#E2445C]', iconBg: 'bg-[#E2445C]/[0.08]', iconFg: 'text-[#E2445C]/80' },
        } as const;
        const card = 'bg-white border border-black/[0.06] rounded-2xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow';
        const labelCls = 'text-black/55 text-caption font-medium uppercase tracking-wide';
        const suffixCls = 'text-caption font-medium text-black/55 ml-1.5';
        return (
          <div className="grid grid-cols-4 gap-4">
            {/* Avg Client Rating — out of 5 */}
            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Avg Client Rating</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[ratingTone].iconBg}`}>
                  <Heart className={`w-4 h-4 ${toneClasses[ratingTone].iconFg}`} aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className="flex items-baseline">
                  <span className={`text-h1 font-bold ${toneClasses[ratingTone].value}`}>{avgScore.toFixed(1)}</span>
                  <span className={suffixCls}>/ 5</span>
                </p>
              </div>
            </div>

            {/* Revenue at Risk */}
            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Revenue at Risk</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[riskTone].iconBg}`}>
                  {riskTone === 'bad'
                    ? <AlertTriangle className={`w-4 h-4 ${toneClasses.bad.iconFg}`} aria-hidden="true" />
                    : <CheckCircle2 className={`w-4 h-4 ${toneClasses.good.iconFg}`} aria-hidden="true" />}
                </div>
              </div>
              <div>
                <p className="flex items-baseline">
                  <span className={`text-h1 font-bold ${toneClasses[riskTone].value}`}>{formatCurrency(attentionMRR)}</span>
                  <span className={suffixCls}>/ mo</span>
                </p>
              </div>
            </div>

            {/* Trend — declining clients */}
            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Declining</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[trendTone].iconBg}`}>
                  {trendTone === 'bad'
                    ? <TrendingDown className={`w-4 h-4 ${toneClasses.bad.iconFg}`} aria-hidden="true" />
                    : <TrendingUp className={`w-4 h-4 ${toneClasses.good.iconFg}`} aria-hidden="true" />}
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${toneClasses[trendTone].value}`}>
                  {decliningCount === 0 ? 'None' : decliningCount}
                </p>
              </div>
            </div>

            {/* Reviews Due — overdue / this week / clear */}
            <div className={card}>
              <div className="flex items-start justify-between gap-3">
                <p className={labelCls}>Reviews Due</p>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[reviewsTone].iconBg}`}>
                  <Calendar className={`w-4 h-4 ${toneClasses[reviewsTone].iconFg}`} aria-hidden="true" />
                </div>
              </div>
              <div>
                <p className={`text-h1 font-bold ${toneClasses[reviewsTone].value} flex items-baseline`}>
                  {overdueReviews > 0 ? (
                    <>
                      <span>{overdueReviews}</span>
                      <span className={suffixCls}>overdue</span>
                    </>
                  ) : upcomingReviews > 0 ? (
                    <>
                      <span>{upcomingReviews}</span>
                      <span className={suffixCls}>this week</span>
                    </>
                  ) : (
                    <span>All clear</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Table */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortHeader field="lastTouchpoint">Date</SortHeader>
                <SortHeader field="clientName">Client</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                <SortHeader field="monthlyBilling">Billing</SortHeader>
                <SortHeader field="tenure">Tenure</SortHeader>
                <SortHeader field="overallHealth">Health</SortHeader>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Client Rating</th>
                <SortHeader field="nextReview">Next Review</SortHeader>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRelationships.map(r => {
                const reviewDays = daysUntil(r.nextReview);
                const isOverdue = reviewDays < 0;
                const isUrgent = reviewDays >= 0 && reviewDays <= 3;
                return (
                  <tr key={r.id} className={`border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors ${r.overallHealth === 'Needs Attention' ? 'bg-rose-50/30' : ''}`}>
                    {/* Date — last touchpoint with the client. Single
                        line; the touchpoint type lives on the detail
                        drawer, the column itself stays calm. Sorting
                        works on this date. */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-black/70 text-caption font-normal">{formatDate(r.lastTouchpoint)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-black/90 text-body font-medium">{r.clientName}</p>
                      <p className="text-black/55 text-caption font-normal">{r.accountManager}</p>
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
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {(() => {
                          const headInitials = r.service === 'Performance Marketing' ? 'CP' : 'ZB';
                          const headRoleName = r.service === 'Performance Marketing' ? 'SEM HOD' : 'A&T HOD';
                          return (
                            <div className="flex items-center gap-1.5">
                              <span aria-hidden="true" className="text-caption text-black/55 font-medium w-[18px]">{headInitials}</span>
                              <StarRating score={r.serviceHeadScore} size="sm" color={r.service === 'Performance Marketing' ? 'purple' : 'cyan'} label={`${headRoleName} (${headInitials})`} />
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="text-caption text-black/55 font-medium w-[18px]">TA</span>
                          <StarRating score={r.cooScore} size="sm" color="amber" label="COO (TA)" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-caption font-medium ${isOverdue ? 'text-[#E2445C]' : isUrgent ? 'text-[#FDAB3D]' : 'text-black/60'}`}>
                        {isOverdue ? `${Math.abs(reviewDays)}d overdue` : isUrgent ? `In ${reviewDays}d` : formatDate(r.nextReview)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { setSelectedClient(r); setShowDrawer(true); }}
                        aria-label={`View ${r.clientName} details`}
                        className="p-1.5 text-[#204CC7] hover:bg-[#204CC7]/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
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
            <p className="text-black/55 text-caption font-normal mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {showDrawer && selectedClient && (() => {
        const reviewDays = daysUntil(selectedClient.nextReview);
        const isOverdue = reviewDays < 0;
        const isNeedsAttention = selectedClient.overallHealth === 'Needs Attention';
        const isDeclining = selectedClient.trend === 'Declining';

        // Drawer header always uses the brand-blue gradient so chrome
        // reads as on-brand instead of swapping colors per health tier.
        // Urgency is still communicated below the header via the pill,
        // the urgency banner, and the table row tint — the header
        // doesn't need to double up on that signal.
        const headerBg = 'bg-gradient-to-br from-[#3B82F6] to-[#204CC7]';

        return (
          <div className="fixed inset-0 z-[60]">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} aria-hidden="true" />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="relationship-drawer-title"
              tabIndex={-1}
              // Drawer width tuned for a "principal-designer" reading
              // rhythm: max-w-3xl (768px). At 672 the Client Feedback
              // card felt slightly compressed once the month dropdown
              // landed in its header; 768 lets the title, dropdown,
              // subtitle, three score bars, and the Overall Health
              // footer breathe at p-6 internal padding without ever
              // running tight against the right edge. Still narrower
              // than the page content area on 1280+ laptops, so the
              // drawer reads as an editorial side panel — not a
              // takeover modal.
              className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl overflow-hidden focus:outline-none"
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className={`${headerBg} px-6 py-5`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedClient.overallHealth}</span>
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{getServiceLabel(selectedClient.service)}</span>
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{formatCurrency(selectedClient.monthlyBilling)}/mo</span>
                        <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">{selectedClient.tenure} months</span>
                      </div>
                      <h2 id="relationship-drawer-title" className="text-white text-h2 font-bold truncate">{selectedClient.clientName}</h2>
                      <p className="text-white/85 text-caption font-normal mt-1">{selectedClient.keyContact} · {selectedClient.keyContactRole}</p>
                    </div>
                    <button
                      onClick={() => setShowDrawer(false)}
                      aria-label="Close client details"
                      className="ml-3 w-8 h-8 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-white" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Urgency Banner — surfaces when the client is in the
                    Needs Attention bucket, when their trend is sliding,
                    or when their next review is overdue. */}
                {(isNeedsAttention || isDeclining || isOverdue) && (
                  <div className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.06] border border-[#E2445C]/20 rounded-xl">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4 text-[#E2445C]" /></div>
                    <div>
                      <p className="text-[#E2445C] text-caption font-semibold">
                        {isNeedsAttention ? `Needs attention — ${formatCurrency(selectedClient.monthlyBilling)}/mo revenue exposed` : isOverdue ? `Review ${Math.abs(reviewDays)} days overdue` : 'Declining satisfaction — needs intervention'}
                      </p>
                      <p className="text-black/50 text-caption font-normal">{isNeedsAttention ? 'Immediate executive attention required' : 'Schedule a touchpoint as soon as possible'}</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {/* Client Feedback — Star Ratings (parity with client-facing app)
                      The card supports a month dropdown on the top right
                      so admins can scrub through prior feedback months
                      without leaving the drawer. The dropdown defaults
                      to the latest month (which mirrors the row's top-
                      level scores), and resets to latest whenever a
                      different client is opened. Score values for any
                      historical month are derived from the latest +
                      trend via `buildFeedbackHistory`. */}
                  {(() => {
                    const history = buildFeedbackHistory(selectedClient);
                    const entry = history.find(e => e.month === feedbackMonth) ?? history[history.length - 1];
                    const isLatest = feedbackMonth === LATEST_FEEDBACK_MONTH;
                    return (
                      // p-6 (24px) sets the editorial padding for the
                      // densest card in the drawer. Inner rhythm:
                      //   header row → 12px → subtitle → 24px → score
                      //   bars (24px between bars) → 24px → divider →
                      //   16px → Overall Health footer.
                      // This rhythm reads as a calm, editor-shaped
                      // module rather than a UI dashboard tile.
                      <div className="bg-white border border-black/[0.06] rounded-xl p-6">
                        <div className="flex items-center justify-between mb-3 gap-3">
                          <h3 className="text-black/90 text-body font-semibold">Client Feedback</h3>
                          {/* Month dropdown — the chip carries just the
                              calendar icon + month + chevron. The old
                              inline "Latest" badge has moved into the
                              dropdown menu only; on the chip itself it
                              caused awkward wrap when the month label
                              expanded. Confident chip padding (px-3
                              py-1.5) so it doesn't read as crowded. */}
                          <div className="relative shrink-0" ref={feedbackMonthRef}>
                            <button
                              type="button"
                              onClick={() => setFeedbackMonthOpen(o => !o)}
                              aria-haspopup="listbox"
                              aria-expanded={feedbackMonthOpen}
                              aria-label={`Feedback month — currently ${formatFeedbackMonth(feedbackMonth)}${isLatest ? ' (latest)' : ''}`}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-caption font-medium text-black/75 bg-white border border-black/[0.08] hover:bg-black/[0.02] hover:border-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5 text-black/45" aria-hidden="true" />
                              <span className="tabular-nums">{formatFeedbackMonth(feedbackMonth)}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-black/40 transition-transform ${feedbackMonthOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>
                            {feedbackMonthOpen && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/[0.08] rounded-lg shadow-[0_12px_28px_-8px_rgba(15,23,42,0.18)] z-30 py-1.5" role="listbox" aria-label="Feedback months">
                                {[...FEEDBACK_HISTORY_MONTHS].slice().reverse().map(m => {
                                  const selected = m === feedbackMonth;
                                  const latest = m === LATEST_FEEDBACK_MONTH;
                                  return (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => { setFeedbackMonth(m); setFeedbackMonthOpen(false); }}
                                      role="option"
                                      aria-selected={selected}
                                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-caption text-left transition-colors ${selected ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                                    >
                                      <span className="tabular-nums">{formatFeedbackMonth(m)}</span>
                                      <span className="flex items-center gap-1.5">
                                        {latest && <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700">Latest</span>}
                                        {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-caption text-black/55 mb-6">
                          Star ratings provided by the client for leadership and overall service
                        </p>
                        <div className="space-y-6">
                          <ScoreBar score={entry.serviceHeadScore} label={selectedClient.service === 'Performance Marketing' ? 'CP — Chinmay Pawar (SEM HOD)' : 'ZB — Zubear Shaikh (A&T HOD)'} color={selectedClient.service === 'Performance Marketing' ? 'purple' : 'cyan'} />
                          <ScoreBar score={entry.cooScore} label="TA — Tejas Atha (COO)" color="amber" />
                          {/* Overall Service feedback — same scale as the
                              single rating on the Feedback module so the
                              two surfaces stay in sync. Sits beneath the
                              two leadership ratings as the bottom-line
                              read of how the engagement is going. */}
                          <ScoreBar score={entry.overallServiceScore} label="Overall Service" color="emerald" />
                        </div>
                        <div className="mt-6 pt-4 border-t border-black/[0.05] flex items-center justify-between">
                          <span className="text-black/50 text-caption font-medium">Overall Health</span>
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-caption font-medium border ${getHealthColor(selectedClient.overallHealth)}`}>{selectedClient.overallHealth}</span>
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* Client Words — read-only.
                      This block surfaces the verbatim relationship note
                      the client wrote inside the client-facing app. It
                      is *not* an admin-editable field: any edit here
                      would silently overwrite what the customer
                      themselves submitted, which is exactly the wrong
                      affordance. Rendered as static text with a "From
                      the client" attribution so admins read it as a
                      first-person quote, not an internal note. */}
                  <div className="bg-white border border-black/[0.06] rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
                        <h3 className="text-black/90 text-body font-semibold">Client Words</h3>
                      </div>
                      <span className="text-caption text-black/35 font-medium">From the client</span>
                    </div>
                    <p className="text-body text-black/65 leading-relaxed whitespace-pre-wrap">
                      {selectedClient.notes}
                    </p>
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
