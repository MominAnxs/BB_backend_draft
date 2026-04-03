"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronDown, Sparkles, X, Send, ArrowRight, RotateCcw, Copy, Check, TrendingUp, Users, AlertCircle, Briefcase, Target, Zap, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';

const reportTabs = [
  { id: 'overview', label: 'Overview', href: '/adminland/reports' },
  { id: 'growth-pl', label: 'Growth P&L', href: '/adminland/reports/growth-pl' },
  { id: 'attrition', label: 'Attrition', href: '/adminland/reports/attrition' },
  { id: 'cla', label: 'CLAs', href: '/adminland/reports/cla' },
  { id: 'sales', label: 'Sales Reports', href: '/adminland/reports/sales' },
  { id: 'hr-reports', label: 'HR Reports', href: '/adminland/reports/hr-reports' },
];

const hrSections = [
  { key: 'overview', label: 'Overview' },
  { key: 'resource', label: 'Resource Req.' },
  { key: 'efforts', label: 'Efforts MIS' },
  { key: 'performance', label: 'Performance' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'incidents', label: 'Incidents' },
];

function getActiveTab(pathname: string): string {
  if (pathname === '/adminland/reports') return 'overview';
  if (pathname.startsWith('/adminland/reports/growth-pl')) return 'growth-pl';
  if (pathname.startsWith('/adminland/reports/attrition')) return 'attrition';
  if (pathname.startsWith('/adminland/reports/cla')) return 'cla';
  if (pathname.startsWith('/adminland/reports/sales')) return 'sales';
  if (pathname.startsWith('/adminland/reports/hr-reports')) return 'hr-reports';
  return 'overview';
}

// ═══════════════════════════════════════════════
// ─── AI INSIGHT DATA ─────────────────────────
// ═══════════════════════════════════════════════

interface InsightPrompt {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface InsightResponse {
  title: string;
  sections: { heading: string; content: string; sentiment?: 'positive' | 'negative' | 'neutral' }[];
  keyMetric?: { label: string; value: string; change?: string; good?: boolean };
  recommendations?: string[];
}

const getPromptsForTab = (tab: string, hrSection: string): InsightPrompt[] => {
  if (tab === 'hr-reports') {
    const hrPrompts: Record<string, InsightPrompt[]> = {
      overview: [
        { id: 'hr-summary', label: 'Summarise HR health this month', icon: Sparkles, color: '#204CC7' },
        { id: 'hr-risks', label: 'Flag any HR risks or red flags', icon: AlertCircle, color: '#E2445C' },
        { id: 'hr-wins', label: 'What are the top HR wins?', icon: TrendingUp, color: '#00C875' },
        { id: 'hr-action', label: 'What needs my attention this week?', icon: Target, color: '#FDAB3D' },
      ],
      resource: [
        { id: 'rr-summary', label: 'Summarise open positions status', icon: Briefcase, color: '#204CC7' },
        { id: 'rr-bottleneck', label: 'Where are the hiring bottlenecks?', icon: AlertCircle, color: '#E2445C' },
        { id: 'rr-priority', label: 'Which roles should we prioritise?', icon: Target, color: '#FDAB3D' },
      ],
      efforts: [
        { id: 'eff-summary', label: 'How are recruiters performing?', icon: Users, color: '#204CC7' },
        { id: 'eff-trend', label: 'Show me the hiring trend', icon: TrendingUp, color: '#00C875' },
        { id: 'eff-improve', label: 'Where can we improve conversion?', icon: Zap, color: '#7C3AED' },
      ],
      performance: [
        { id: 'perf-summary', label: 'Summarise workforce changes', icon: Users, color: '#204CC7' },
        { id: 'perf-attrition', label: 'What is the attrition pattern?', icon: AlertCircle, color: '#E2445C' },
        { id: 'perf-retention', label: 'Retention insights and risks', icon: TrendingUp, color: '#00C875' },
      ],
      engagement: [
        { id: 'eng-summary', label: 'How is engagement tracking?', icon: Sparkles, color: '#204CC7' },
        { id: 'eng-budget', label: 'Budget utilisation update', icon: Briefcase, color: '#00C875' },
      ],
      onboarding: [
        { id: 'onb-summary', label: 'Onboarding health check', icon: Users, color: '#204CC7' },
        { id: 'onb-risk', label: 'Who needs extra attention?', icon: AlertCircle, color: '#E2445C' },
      ],
      incidents: [
        { id: 'inc-summary', label: 'Incident overview and trends', icon: AlertCircle, color: '#E2445C' },
        { id: 'inc-resolve', label: 'What is still unresolved?', icon: Target, color: '#FDAB3D' },
      ],
    };
    return hrPrompts[hrSection] || hrPrompts.overview;
  }

  // Generic report prompts for non-HR tabs
  return [
    { id: 'gen-summary', label: 'Summarise this report', icon: Sparkles, color: '#204CC7' },
    { id: 'gen-trends', label: 'What are the key trends?', icon: TrendingUp, color: '#00C875' },
    { id: 'gen-risks', label: 'Flag any risks or concerns', icon: AlertCircle, color: '#E2445C' },
    { id: 'gen-action', label: 'What needs my attention?', icon: Target, color: '#FDAB3D' },
  ];
};

const getInsightResponse = (promptId: string): InsightResponse => {
  const responses: Record<string, InsightResponse> = {
    'hr-summary': {
      title: 'HR Health — April 2026',
      sections: [
        { heading: 'Workforce Snapshot', content: '8 open positions across Finance, Sales, SEM, and Technology. 59 total hires since June 2025 with a stable hiring pace. Onboarding health sits at 67% settled — a healthy benchmark.', sentiment: 'positive' },
        { heading: 'Recruitment Pipeline', content: 'Active hiring across 4 departments with 3 positions in active interview stages. Offer acceptance rate tracking well — 2 offers extended this cycle.', sentiment: 'neutral' },
        { heading: 'Risk Monitor', content: '14 incidents logged (9 high priority), predominantly salary-related. All critical incidents have been resolved. The settling employee cohort (8 people) needs continued observation.', sentiment: 'negative' },
      ],
      keyMetric: { label: 'Onboarding Health', value: '67%', change: '+5% vs last month', good: true },
      recommendations: [
        'Fast-track the 3 actively interviewing positions to reduce time-to-fill',
        'Schedule 1:1 check-ins with the 8 settling employees this week',
        'Review salary structure to prevent recurring incidents',
      ],
    },
    'hr-risks': {
      title: 'HR Risk Assessment',
      sections: [
        { heading: 'High Priority Incidents', content: '9 of 14 total incidents are high priority — primarily salary discrepancies. While these are marked as resolved, the pattern suggests a systemic issue in compensation workflows that needs structural attention.', sentiment: 'negative' },
        { heading: 'Onboarding Concerns', content: '8 employees (33%) are still in "settling" status. Extended settling periods can lead to early attrition. Departments to watch: Sales and SEM have the most settling employees.', sentiment: 'negative' },
        { heading: 'Hiring Velocity', content: 'Zero new hires in April so far. While not alarming in isolation, if this extends through mid-April, it may indicate pipeline slowdowns across the 8 open positions.', sentiment: 'neutral' },
      ],
      keyMetric: { label: 'High Priority Incidents', value: '9', change: 'of 14 total', good: false },
      recommendations: [
        'Audit the payroll process to identify root cause of salary incidents',
        'Implement a 30-60-90 day check-in framework for settling employees',
        'Set a target of at least 2 hires by mid-April to maintain momentum',
      ],
    },
    'hr-wins': {
      title: 'Top HR Wins This Period',
      sections: [
        { heading: 'Hiring Track Record', content: '59 successful hires since June 2025 — that is an impressive run for a growing organisation. The team is consistently delivering on headcount targets across departments.', sentiment: 'positive' },
        { heading: 'Onboarding Success', content: '16 of 24 employees (67%) have fully settled into their roles. This is above the industry average of ~60% for companies at a similar growth stage.', sentiment: 'positive' },
        { heading: 'Incident Resolution', content: 'All high-priority incidents have been resolved. The HR team demonstrated quick turnaround on salary discrepancy cases, restoring employee trust.', sentiment: 'positive' },
      ],
      keyMetric: { label: 'Total Hires', value: '59', change: 'since Jun 2025', good: true },
    },
    'hr-action': {
      title: 'This Week\'s Priorities',
      sections: [
        { heading: 'Immediate Actions', content: 'Follow up on the 3 positions currently in interview stage. Two offers are pending acceptance — nudge candidates before end of week. Check in with the 8 settling employees.', sentiment: 'neutral' },
        { heading: 'Engagement', content: 'IPL Screening event on 16th April needs final logistics confirmation. Budget is committed (₹89,000) but only 10% spent so far — ensure vendor payments are on track.', sentiment: 'neutral' },
        { heading: 'Process Review', content: 'The salary incident pattern needs a process improvement proposal. Consider scheduling a payroll audit meeting with Finance this week.', sentiment: 'negative' },
      ],
      recommendations: [
        'Close the 2 pending offers by Friday',
        'Confirm IPL Screening logistics with venue by Wednesday',
        'Schedule payroll audit meeting with Zubear (A&T HOD)',
        'Review settling employee progress notes',
      ],
    },
    'rr-summary': {
      title: 'Open Positions Status',
      sections: [
        { heading: 'Current Pipeline', content: '8 positions are open across Finance (2), Sales (2), SEM (2), and Technology (2). The pipeline is evenly distributed, suggesting balanced growth ambitions across the organisation.', sentiment: 'neutral' },
        { heading: 'Active Progress', content: '3 positions have active candidates — 2 with offers sent and 1 in final interview rounds. The remaining 5 are in earlier sourcing stages.', sentiment: 'positive' },
      ],
      keyMetric: { label: 'Open Positions', value: '8', change: '3 actively progressing', good: true },
      recommendations: [
        'Prioritise Technology hires — longest open positions',
        'Follow up on the 2 pending offer responses this week',
      ],
    },
    'rr-bottleneck': {
      title: 'Hiring Bottlenecks',
      sections: [
        { heading: 'Slow Movers', content: 'Technology positions have the longest time-to-fill. The specialized skill requirements for SEM and full-stack roles are limiting the candidate pool. Consider widening the search radius or adjusting experience requirements.', sentiment: 'negative' },
        { heading: 'Sourcing Gap', content: 'Sales positions are getting applications but conversion from screening to interview is low (~30%). This may indicate a job description mismatch or unrealistic salary expectations.', sentiment: 'negative' },
      ],
      keyMetric: { label: 'Avg. Time to Fill', value: '28 days', change: 'Tech roles: 40+ days', good: false },
      recommendations: [
        'Relax experience requirements for Technology roles by 1 year',
        'Revise Sales JDs to better reflect actual role responsibilities',
        'Engage 1-2 specialist recruitment agencies for SEM roles',
      ],
    },
    'rr-priority': {
      title: 'Role Prioritisation',
      sections: [
        { heading: 'Highest Impact', content: 'Finance Accountant and SEM Specialist roles should be top priority. Finance is essential for the A&T team\'s growing client base, while SEM directly impacts PM revenue. Both are revenue-enabling hires.', sentiment: 'neutral' },
        { heading: 'Strategic Hires', content: 'Technology roles (Full Stack, DevOps) are critical for platform scalability. While not immediately revenue-impacting, delaying these will create technical debt.', sentiment: 'neutral' },
      ],
      recommendations: [
        'Fast-track Finance Accountant — A&T team is stretched',
        'SEM Specialist needed before Q2 campaigns ramp up',
        'Start Technology hiring pipeline now for Q3 readiness',
      ],
    },
    'eff-summary': {
      title: 'Recruiter Performance',
      sections: [
        { heading: 'Top Performer', content: 'Pooja leads with the highest hiring volume and best screening-to-hire conversion. Her pipeline management is the benchmark for the team.', sentiment: 'positive' },
        { heading: 'Consistent Contributors', content: 'Ravina maintains steady output with good quality hires. Priyanka is newer but ramping well — her April numbers show month-over-month improvement.', sentiment: 'positive' },
        { heading: 'Area for Growth', content: 'Ujjwal\'s conversion rates need attention. High screening volume but lower interview-to-offer conversion suggests candidate quality filtering can improve.', sentiment: 'neutral' },
      ],
      keyMetric: { label: 'Team Hire Rate', value: '59', change: '10 months', good: true },
    },
    'eff-trend': {
      title: 'Hiring Trend Analysis',
      sections: [
        { heading: 'Monthly Trajectory', content: 'Hiring peaked in Q3 2025 (Aug-Oct) with 8-10 hires per month during the expansion phase. Q1 2026 stabilised at 4-6 monthly hires, reflecting a shift from aggressive hiring to targeted backfills and new roles.', sentiment: 'neutral' },
        { heading: 'April Outlook', content: 'April is tracking below average with 0 hires so far, but 3 active positions in late-stage interviews suggest 2-3 closures are likely by month-end.', sentiment: 'neutral' },
      ],
      keyMetric: { label: 'April Forecast', value: '2-3', change: 'hires expected', good: true },
    },
    'eff-improve': {
      title: 'Conversion Improvement Areas',
      sections: [
        { heading: 'Screening → Interview', content: 'Current conversion averages ~45%. Industry standard is 50-60%. Tightening pre-screening criteria and using structured scorecards could improve this by 10-15%.', sentiment: 'negative' },
        { heading: 'Interview → Offer', content: 'This stage is healthy at ~65% conversion. The interview process is well-calibrated and hiring managers are making timely decisions.', sentiment: 'positive' },
        { heading: 'Offer → Join', content: 'Acceptance rate is strong at ~85%. The rare drop-offs are mostly counter-offer situations. Consider pre-close conversations during final interviews.', sentiment: 'positive' },
      ],
      recommendations: [
        'Introduce structured screening scorecards for all recruiters',
        'Add a "pre-close" step in the final interview stage',
        'Reduce time between offer and join date to under 30 days',
      ],
    },
    'perf-summary': {
      title: 'Workforce Changes Summary',
      sections: [
        { heading: 'Net Movement', content: 'Of 59 total hires, the majority remain active. The attrition rate is manageable — exits are spread across the 10-month period without any mass departure events.', sentiment: 'positive' },
        { heading: 'Exit Breakdown', content: 'Exits split between involuntary (fired) and voluntary (resigned). The fired-to-resigned ratio is roughly 1:1, which is typical for a scaling business.', sentiment: 'neutral' },
      ],
      keyMetric: { label: 'Retention Rate', value: '~82%', change: 'above industry avg', good: true },
    },
    'perf-attrition': {
      title: 'Attrition Pattern Analysis',
      sections: [
        { heading: 'Timing Pattern', content: 'Most exits cluster around the 3-4 month mark, suggesting the onboarding period is the highest-risk window. Employees who pass 6 months have significantly higher retention.', sentiment: 'negative' },
        { heading: 'Department Pattern', content: 'Sales and SEM roles show higher turnover than Finance and Technology. The nature of performance marketing roles attracts candidates who may job-hop more frequently.', sentiment: 'neutral' },
      ],
      recommendations: [
        'Strengthen the 90-day onboarding program',
        'Introduce stay interviews at the 3-month mark',
        'Review SEM role expectations vs reality for better candidate matching',
      ],
    },
    'perf-retention': {
      title: 'Retention Insights',
      sections: [
        { heading: 'Positive Signals', content: 'Overall retention at ~82% is strong for a company in growth phase. Employees in Finance and Technology show the highest loyalty, likely due to clearer growth paths and stable workloads.', sentiment: 'positive' },
        { heading: 'Risks to Watch', content: 'The 8 settling employees represent the next wave of potential attrition. Historically, 15-20% of settling employees exit within 60 days if not proactively supported.', sentiment: 'negative' },
      ],
      keyMetric: { label: 'At-Risk Employees', value: '8', change: 'in settling phase', good: false },
    },
    'eng-summary': {
      title: 'Engagement Tracker',
      sections: [
        { heading: 'Events Pipeline', content: '4 engagement events planned for April-June 2026. The IPL Screening event is next (16th April) and is fully budgeted. Team morale initiatives are on track.', sentiment: 'positive' },
        { heading: 'Participation', content: 'Previous events showed strong turnout (~80% attendance). The mix of sports, cultural, and team activities covers diverse employee interests.', sentiment: 'positive' },
      ],
      keyMetric: { label: 'Events Planned', value: '4', change: 'April — June', good: true },
    },
    'eng-budget': {
      title: 'Engagement Budget Status',
      sections: [
        { heading: 'Allocation', content: 'Total budget of ₹89,000 committed for Q2 engagement activities. Only ₹9,000 (10%) has been spent so far, leaving ₹80,000 for upcoming events.', sentiment: 'neutral' },
        { heading: 'Spend Efficiency', content: 'Budget per event averages ₹22,250, which is reasonable for team activities of this scale. No cost overruns reported on completed events.', sentiment: 'positive' },
      ],
      keyMetric: { label: 'Budget Remaining', value: '₹80K', change: '90% available', good: true },
    },
    'onb-summary': {
      title: 'Onboarding Health Check',
      sections: [
        { heading: 'Status Breakdown', content: '16 employees (67%) fully settled and 8 (33%) still settling. The settled cohort is performing well and integrated into their teams. This is above the industry benchmark of 60%.', sentiment: 'positive' },
        { heading: 'Department View', content: 'Technology and Finance onboarding is smooth — most settle within 45 days. Sales and SEM take longer due to the client-facing nature of roles and steeper learning curves.', sentiment: 'neutral' },
      ],
      keyMetric: { label: 'Settled Rate', value: '67%', change: 'above 60% benchmark', good: true },
    },
    'onb-risk': {
      title: 'Employees Needing Attention',
      sections: [
        { heading: 'High Watch List', content: 'Among the 8 settling employees, 2-3 have been in settling status for over 60 days. Extended settling periods correlate with higher attrition risk — these individuals need immediate manager check-ins.', sentiment: 'negative' },
        { heading: 'Support Actions', content: 'Assign peer buddies to the longest-settling employees. Consider skill gap assessments — some settling cases may be training needs rather than cultural fit issues.', sentiment: 'neutral' },
      ],
      recommendations: [
        'Schedule immediate 1:1s with employees settling 60+ days',
        'Assign peer buddies from the settled cohort',
        'Run a quick skill gap assessment for underperforming new hires',
      ],
    },
    'inc-summary': {
      title: 'Incident Overview',
      sections: [
        { heading: 'Volume & Severity', content: '14 total incidents across Feb-Apr 2026. 9 were high priority (mostly salary-related) and 5 were low priority. All high-priority incidents have been resolved.', sentiment: 'neutral' },
        { heading: 'Trend', content: 'Incidents peaked in February (likely year-end payroll adjustments) and have been declining since. March showed improvement, and April is trending lower.', sentiment: 'positive' },
      ],
      keyMetric: { label: 'Resolution Rate', value: '100%', change: 'all high-priority resolved', good: true },
    },
    'inc-resolve': {
      title: 'Unresolved Items',
      sections: [
        { heading: 'Current Status', content: 'All high-priority incidents are resolved. The 5 low-priority incidents are under monitoring but don\'t require immediate action. These are mostly process-improvement suggestions flagged by employees.', sentiment: 'positive' },
        { heading: 'Prevention', content: 'To prevent recurrence, a salary verification checklist has been proposed. If implemented, it would catch ~80% of the payroll issues that drove this quarter\'s incidents.', sentiment: 'neutral' },
      ],
      recommendations: [
        'Implement the salary verification checklist before next payroll cycle',
        'Close the 5 low-priority items with documented resolutions',
        'Set up a monthly incident review meeting',
      ],
    },
    // Generic fallback prompts
    'gen-summary': {
      title: 'Report Summary',
      sections: [
        { heading: 'Key Takeaways', content: 'This report covers business metrics across multiple dimensions. The overall trajectory is positive with steady growth indicators and manageable risk factors.', sentiment: 'positive' },
        { heading: 'Notable Changes', content: 'Month-over-month comparisons show stable performance. No major deviations from targets that require immediate intervention.', sentiment: 'neutral' },
      ],
    },
    'gen-trends': {
      title: 'Key Trends',
      sections: [
        { heading: 'Growth Pattern', content: 'Consistent upward trajectory across primary metrics. Revenue and client acquisition are tracking ahead of quarterly targets.', sentiment: 'positive' },
        { heading: 'Seasonal Factors', content: 'April typically sees a slight dip due to the financial year transition. Current performance is in line with historical patterns.', sentiment: 'neutral' },
      ],
    },
    'gen-risks': {
      title: 'Risks & Concerns',
      sections: [
        { heading: 'Active Risks', content: 'No critical risks identified. Minor concerns around client onboarding timelines and resource allocation for upcoming quarter.', sentiment: 'neutral' },
      ],
      recommendations: ['Review resource allocation for Q2 projects', 'Ensure client onboarding pipelines are cleared before May'],
    },
    'gen-action': {
      title: 'Action Items',
      sections: [
        { heading: 'This Week', content: 'Review pending approvals, check in on delayed deliverables, and align with team leads on Q2 targets.', sentiment: 'neutral' },
      ],
      recommendations: ['Schedule Q2 planning sync with department heads', 'Clear the approvals backlog by Friday'],
    },
  };
  return responses[promptId] || responses['gen-summary'];
};

// ═══════════════════════════════════════════════
// ─── AI INSIGHT DRAWER COMPONENT ─────────────
// ═══════════════════════════════════════════════

function AIInsightDrawer({ isOpen, onClose, activeTab, hrSection }: {
  isOpen: boolean; onClose: () => void; activeTab: string; hrSection: string;
}) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<InsightResponse | null>(null);
  const [revealedSections, setRevealedSections] = useState<number>(0);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prompts = getPromptsForTab(activeTab, hrSection);

  // Reset state when drawer closes or tab changes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedPrompt(null);
        setResponse(null);
        setRevealedSections(0);
        setShowRecommendations(false);
        setIsGenerating(false);
        setCopied(false);
        setCustomQuery('');
      }, 300);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedPrompt(null);
    setResponse(null);
    setRevealedSections(0);
    setShowRecommendations(false);
    setIsGenerating(false);
  }, [activeTab, hrSection]);

  // Simulate AI generation with progressive reveal
  const generateInsight = useCallback((promptId: string) => {
    setSelectedPrompt(promptId);
    setIsGenerating(true);
    setResponse(null);
    setRevealedSections(0);
    setShowRecommendations(false);

    const data = getInsightResponse(promptId);

    // Simulate generation delay
    setTimeout(() => {
      setResponse(data);
      setIsGenerating(false);

      // Progressive reveal of sections
      data.sections.forEach((_, i) => {
        setTimeout(() => {
          setRevealedSections(prev => prev + 1);
        }, (i + 1) * 400);
      });

      // Reveal recommendations after all sections
      if (data.recommendations?.length) {
        setTimeout(() => {
          setShowRecommendations(true);
        }, (data.sections.length + 1) * 400);
      }
    }, 1200);
  }, []);

  // Scroll to bottom as content reveals
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [revealedSections, showRecommendations]);

  const handleCopy = useCallback(() => {
    if (!response) return;
    const text = [
      response.title,
      '',
      ...response.sections.map(s => `${s.heading}\n${s.content}`),
      '',
      ...(response.recommendations ? ['Recommendations:', ...response.recommendations.map((r, i) => `${i + 1}. ${r}`)] : []),
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [response]);

  const handleReset = useCallback(() => {
    setSelectedPrompt(null);
    setResponse(null);
    setRevealedSections(0);
    setShowRecommendations(false);
    setIsGenerating(false);
    setCustomQuery('');
  }, []);

  const handleCustomSubmit = useCallback(() => {
    if (!customQuery.trim()) return;
    // Map custom query to closest prompt
    generateInsight(prompts[0]?.id || 'gen-summary');
    setCustomQuery('');
  }, [customQuery, generateInsight, prompts]);

  const tabLabel = reportTabs.find(t => t.id === activeTab)?.label || 'Reports';
  const sectionLabel = activeTab === 'hr-reports' ? hrSections.find(s => s.key === hrSection)?.label : null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/15 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
          style={{ animation: 'insightFadeIn 0.2s ease-out' }}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-black/[0.08] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="AI Insights"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#204CC7] to-[#7C3AED] flex items-center justify-center" aria-hidden="true">
                <Sparkles className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <h2 className="text-body font-bold text-black/85">AI Insights</h2>
                <p className="text-caption text-black/35 mt-0.5">
                  {tabLabel}{sectionLabel ? ` — ${sectionLabel}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-black/[0.04] flex items-center justify-center transition-colors"
              aria-label="Close insights panel"
            >
              <X className="w-4 h-4 text-black/40" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {/* Pre-state: Prompt cards */}
          {!selectedPrompt && !isGenerating && (
            <div style={{ animation: 'insightSlideUp 0.25s ease-out' }}>
              <p className="text-caption text-black/40 font-medium mb-4">Ask a question or pick a prompt</p>

              {/* Prompt grid */}
              <div className="space-y-2.5">
                {prompts.map((prompt, idx) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => generateInsight(prompt.id)}
                      className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-black/[0.06] bg-white hover:border-black/[0.12] hover:shadow-sm transition-all group text-left"
                      style={{ animation: `insightSlideUp 0.3s ease-out ${idx * 0.06}s both` }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${prompt.color}10` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: prompt.color }} />
                      </div>
                      <span className="text-body text-black/65 font-medium group-hover:text-black/80 transition-colors flex-1">{prompt.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-black/15 group-hover:text-black/30 transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>

              {/* Subtle tip */}
              <div className="mt-6 flex items-start gap-2.5 px-3 py-3 rounded-lg bg-black/[0.02]">
                <Sparkles className="w-3.5 h-3.5 text-black/20 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <p className="text-caption text-black/30 leading-relaxed">Insights are generated based on the data visible in the current report view. Switch tabs or sections for contextual analysis.</p>
              </div>
            </div>
          )}

          {/* Generating state */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-16" style={{ animation: 'insightSlideUp 0.3s ease-out' }}>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#204CC7]/10 to-[#7C3AED]/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#204CC7]" />
                </div>
                <div className="absolute inset-0 w-14 h-14 rounded-2xl border-2 border-[#204CC7]/20 border-t-[#204CC7]" style={{ animation: 'insightSpin 1s linear infinite' }} />
              </div>
              <p className="text-body font-semibold text-black/60 mt-5">Analysing data...</p>
              <p className="text-caption text-black/30 mt-1">Generating insights from your report</p>

              {/* Shimmer lines */}
              <div className="w-full mt-8 space-y-3">
                {[100, 85, 92, 60].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 rounded-md bg-black/[0.04]"
                    style={{ width: `${w}%`, animation: `insightShimmer 1.5s ease-in-out ${i * 0.15}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Response state */}
          {response && !isGenerating && (
            <div>
              {/* Title + actions */}
              <div className="flex items-start justify-between mb-5" style={{ animation: 'insightSlideUp 0.3s ease-out' }}>
                <div>
                  <h3 className="text-h3 text-black/85">{response.title}</h3>
                  <p className="text-caption text-black/30 mt-0.5">Generated just now</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopy}
                    className="w-8 h-8 rounded-lg hover:bg-black/[0.04] flex items-center justify-center transition-colors"
                    aria-label="Copy insight"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-black/30" />}
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-8 h-8 rounded-lg hover:bg-black/[0.04] flex items-center justify-center transition-colors"
                    aria-label="Ask another question"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-black/30" />
                  </button>
                </div>
              </div>

              {/* Key metric card */}
              {response.keyMetric && (
                <div
                  className="mb-5 px-4 py-4 rounded-xl border border-black/[0.06] bg-gradient-to-r from-black/[0.015] to-transparent"
                  style={{ animation: 'insightSlideUp 0.35s ease-out' }}
                >
                  <p className="text-caption text-black/40 font-medium">{response.keyMetric.label}</p>
                  <div className="flex items-end gap-3 mt-1.5">
                    <span className={`text-[28px] font-bold leading-none ${response.keyMetric.good ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {response.keyMetric.value}
                    </span>
                    {response.keyMetric.change && (
                      <span className={`text-caption font-medium mb-1 ${response.keyMetric.good ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {response.keyMetric.change}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Sections — progressive reveal */}
              <div className="space-y-4">
                {response.sections.map((section, i) => (
                  i < revealedSections ? (
                    <div
                      key={i}
                      className="px-4 py-4 rounded-xl border border-black/[0.05] bg-white"
                      style={{ animation: 'insightSlideUp 0.35s ease-out' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          section.sentiment === 'positive' ? 'bg-emerald-400' :
                          section.sentiment === 'negative' ? 'bg-rose-400' : 'bg-black/20'
                        }`} aria-hidden="true" />
                        <h4 className="text-body font-semibold text-black/70">{section.heading}</h4>
                      </div>
                      <p className="text-caption text-black/50 leading-[1.7]">{section.content}</p>
                    </div>
                  ) : null
                ))}
              </div>

              {/* Recommendations */}
              {showRecommendations && response.recommendations && (
                <div
                  className="mt-5 px-4 py-4 rounded-xl bg-[#204CC7]/[0.03] border border-[#204CC7]/[0.08]"
                  style={{ animation: 'insightSlideUp 0.35s ease-out' }}
                >
                  <h4 className="text-body font-semibold text-[#204CC7]/80 mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    Recommendations
                  </h4>
                  <div className="space-y-2.5" role="list">
                    {response.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2.5" role="listitem">
                        <span className="text-caption font-bold text-[#204CC7]/40 mt-px flex-shrink-0">{i + 1}.</span>
                        <p className="text-caption text-black/55 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up action */}
              {showRecommendations && (
                <button
                  onClick={handleReset}
                  className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black/[0.03] hover:bg-black/[0.05] text-body font-medium text-black/50 hover:text-black/65 transition-all"
                  style={{ animation: 'insightSlideUp 0.35s ease-out' }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Ask another question
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom input bar */}
        <div className="px-5 py-4 border-t border-black/[0.06] flex-shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Ask anything about this report..."
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-black/[0.03] border border-black/[0.06] text-body text-black/70 placeholder:text-black/25 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/20 transition-all"
                disabled={isGenerating}
                aria-label="Ask a custom question"
              />
              <button
                onClick={handleCustomSubmit}
                disabled={!customQuery.trim() || isGenerating}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-[#204CC7] hover:bg-[#1a3fa3] disabled:opacity-30 disabled:hover:bg-[#204CC7] flex items-center justify-center transition-all"
                aria-label="Submit question"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes insightFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes insightSlideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes insightSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes insightShimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════
// ─── REPORTS LAYOUT ──────────────────────────
// ═══════════════════════════════════════════════

function ReportsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [globalDateRange, setGlobalDateRange] = useState<'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4'>('ytd');
  const [globalDepartment, setGlobalDepartment] = useState<'All' | 'Finance' | 'Performance Marketing'>('All');
  const [insightOpen, setInsightOpen] = useState(false);

  const activeTab = getActiveTab(pathname);
  const isHR = activeTab === 'hr-reports';
  const hrSection = searchParams.get('section') || 'overview';

  const handleTabChange = (tabId: string) => {
    const tab = reportTabs.find((t) => t.id === tabId);
    if (tab) {
      router.push(tab.href);
    }
  };

  const handleHRSectionChange = (sectionKey: string) => {
    router.push(`/adminland/reports/hr-reports?section=${sectionKey}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Reports</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
              Business metrics and reports
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date & Department dropdowns — hidden on HR Reports */}
            {!isHR && (
              <>
                {/* Date Dropdown */}
                <div className="relative">
                  <label htmlFor="reports-date-range-filter" className="sr-only">Date range</label>
                  <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <select
                    id="reports-date-range-filter"
                    value={globalDateRange}
                    onChange={(e) => setGlobalDateRange(e.target.value as 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4')}
                    className="appearance-none bg-white pl-8 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
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
                  <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>

                {/* Department Dropdown */}
                <div className="relative">
                  <label htmlFor="reports-dept-filter" className="sr-only">Department</label>
                  <select
                    id="reports-dept-filter"
                    value={globalDepartment}
                    onChange={(e) => setGlobalDepartment(e.target.value as 'All' | 'Finance' | 'Performance Marketing')}
                    className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    <option value="Finance">Finance</option>
                    <option value="Performance Marketing">Performance Marketing</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </>
            )}

            {/* HR Section Dropdown — only on HR Reports, placed before report view */}
            {isHR && (
              <div className="relative">
                <label htmlFor="hr-section-filter" className="sr-only">HR Section</label>
                <select
                  id="hr-section-filter"
                  value={hrSection}
                  onChange={(e) => handleHRSectionChange(e.target.value)}
                  className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                >
                  {hrSections.map((sec) => (
                    <option key={sec.key} value={sec.key}>{sec.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>
            )}

            {/* Report View Dropdown */}
            <div className="relative">
              <label htmlFor="reports-report-view" className="sr-only">Report view</label>
              <select
                id="reports-report-view"
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value)}
                className="appearance-none bg-[#EEF1FB] text-[#204CC7] pl-3 pr-8 py-1.5 rounded-lg text-caption font-semibold border border-[#204CC7]/20 hover:bg-[#E4E8F9] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all cursor-pointer"
              >
                {reportTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#204CC7]/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* ✨ Insight Button */}
            <button
              onClick={() => setInsightOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-caption font-semibold bg-gradient-to-r from-[#204CC7] to-[#5B3FD9] text-white border border-[#204CC7]/30 hover:from-[#1a3fa3] hover:to-[#4e35c0] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
              aria-label="Open AI Insights panel"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Insights
            </button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="flex-1 pt-6 pb-8 overflow-auto">
        {children}
      </div>

      {/* AI Insight Drawer */}
      <AIInsightDrawer
        isOpen={insightOpen}
        onClose={() => setInsightOpen(false)}
        activeTab={activeTab}
        hrSection={hrSection}
      />
    </div>
  );
}

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ReportsLayoutInner>{children}</ReportsLayoutInner>
    </Suspense>
  );
}
