'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, CheckCircle2, Circle, Clock, X, CalendarDays, User, Building2, Briefcase, ArrowRight, Sparkles, AlertTriangle, ChevronRight, ChevronDown, Check, Send } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';

// ═══════════════════════════════════════════════
// ─── DATA MODEL ───────────────────────────────
// ═══════════════════════════════════════════════
//
// Onboarding is sectioned — each client's checklist is a list of named
// sections (e.g. "Kickoff", "Data Sharing", "Log IDs"), and each
// section is a list of individual items the team marks done. PM
// (SEM) clients are wrapped in a single "Setup" section so the
// rendering logic is unified across services.

interface OnboardingStep {
  label: string;
  done: boolean;
  completedDate?: string; // e.g. '18 Mar 2026'
}

interface OnboardingSection {
  title: string;
  items: OnboardingStep[];
}

interface OnboardingClient {
  id: string;
  name: string;
  service: 'PM' | 'A&T' | 'Both';
  assignee: { name: string; initials: string; color: string };
  startDate: string;
  onboarding: {
    status: 'Done' | 'Pending';
    progress: number; // 0–100 — derived from sections; kept on the model so callers can sort without re-computing
    sections: OnboardingSection[];
  };
  kickoff: {
    status: 'Done' | 'Pending';
    date?: string; // scheduled or completed date
  };
}

// ─── Section templates ──────────────────────────
//
// Defined once at module scope so every client's checklist starts from
// the same canonical wording. Mock data flips each item's `done` flag
// based on per-client progress.

// PM (Performance Marketing) — single Setup section.
const PM_SETUP_LABELS = [
  'Brand brief & USPs collected',
  'Competitor analysis completed',
  'Ad accounts access received',
  'Platform setup (Google/Meta)',
  'Tracking & analytics configured',
];

// A&T (Accounts & Taxation) — three sections.
const AT_KICKOFF_LABELS = [
  'Kickoff done',
  'Minutes of the meetings shared',
];
const AT_DATA_SHARING_LABELS = [
  'Audited Financial Statement',
  'Latest Tally Backup',
  'Company/LLP Document',
  'Latest Bank Statement',
  'NBFC (Loan re-payment schedule/statement)',
  'Purchase/Expenses Data',
  'Credit Card Statement',
  'Reimbursement Data',
  'Salary Register',
  'Past TDS & GST workings',
  'Petty Cash Register',
  'Sales Data',
  'GAP Analysis shared on data',
  'Pending backlog discussion',
];
const AT_LOG_IDS_LABELS = [
  'GST portal login received',
  'TDS portal login received',
  'ITR login received',
  'PT/CPT Credentials (PTEC/PTRC)',
  'E-invoice login (Website & Software)',
  'Internal Software Credentials',
  'Tally Login ID',
  'Payment credentials',
  'POS System',
  'Payroll login ID',
  'Prepaid Partner Credentials',
  'COD Payment Credentials',
  'E-commerce portals login received',
];

/**
 * Build the PM checklist — one "Setup" section, 5 items.
 * Items 0..(doneCount-1) are marked done.
 */
function makePmSections(doneCount: number, doneDate: string): OnboardingSection[] {
  return [
    {
      title: 'Setup',
      items: PM_SETUP_LABELS.map((label, i) => ({
        label,
        done: i < doneCount,
        completedDate: i < doneCount ? doneDate : undefined,
      })),
    },
  ];
}

/**
 * Build the A&T checklist — three sections, with each section's
 * `done` count provided independently. Items inside each section are
 * marked done in order (0..doneCount-1) so partial progress reads as
 * "got through the first N before stalling," which matches how
 * onboarding actually progresses.
 */
function makeAtSections(
  kickoffDone: number,
  dataDone: number,
  logsDone: number,
  doneDate: string,
): OnboardingSection[] {
  const fill = (labels: string[], done: number): OnboardingStep[] =>
    labels.map((label, i) => ({
      label,
      done: i < done,
      completedDate: i < done ? doneDate : undefined,
    }));
  return [
    { title: 'Kickoff',      items: fill(AT_KICKOFF_LABELS,      kickoffDone) },
    { title: 'Data Sharing', items: fill(AT_DATA_SHARING_LABELS, dataDone)    },
    { title: 'Log IDs',      items: fill(AT_LOG_IDS_LABELS,      logsDone)    },
  ];
}

/** Total + done counts across all sections — used for progress % and headers. */
function sectionsTotal(sections: OnboardingSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}
function sectionsDone(sections: OnboardingSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.filter(i => i.done).length, 0);
}
function computeProgress(sections: OnboardingSection[]): number {
  const total = sectionsTotal(sections);
  return total === 0 ? 0 : Math.round((sectionsDone(sections) / total) * 100);
}

const clients: OnboardingClient[] = [
  // ── PM (SEM) clients ──────────────────────────
  {
    id: '1',
    name: 'Nor Black Nor White',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '18 Mar 2026',
    onboarding: { status: 'Pending', progress: 20, sections: makePmSections(1, '19 Mar 2026') },
    kickoff: { status: 'Pending' },
  },
  {
    id: '2',
    name: 'Enagenbio',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '22 Mar 2026',
    onboarding: { status: 'Pending', progress: 0, sections: makePmSections(0, '') },
    kickoff: { status: 'Pending' },
  },
  {
    id: '3',
    name: 'Una Homes LLP',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '25 Mar 2026',
    onboarding: { status: 'Pending', progress: 60, sections: makePmSections(3, '30 Mar 2026') },
    kickoff: { status: 'Pending' },
  },
  {
    id: '4',
    name: 'Alpine Group',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '05 Mar 2026',
    onboarding: { status: 'Done', progress: 100, sections: makePmSections(5, '11 Mar 2026') },
    kickoff: { status: 'Done', date: '12 Mar 2026' },
  },
  {
    id: '5',
    name: 'Knickgasm',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '10 Mar 2026',
    onboarding: { status: 'Done', progress: 100, sections: makePmSections(5, '17 Mar 2026') },
    kickoff: { status: 'Pending' },
  },
  // ── A&T clients (29-item checklist across 3 sections) ──
  // TechCorp India — fully done, all 29 ticks (kickoff 2/2, data 14/14, logs 13/13)
  {
    id: '6',
    name: 'TechCorp India',
    service: 'A&T',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '01 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      sections: makeAtSections(2, 14, 13, '07 Mar 2026'),
    },
    kickoff: { status: 'Done', date: '08 Mar 2026' },
  },
  // Green Energy Industries — early progress (kickoff done, ~6 of 14 data, ~4 of 13 logs ≈ 41%)
  {
    id: '7',
    name: 'Green Energy Industries',
    service: 'A&T',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '15 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 41,
      sections: makeAtSections(2, 6, 4, '20 Mar 2026'),
    },
    kickoff: { status: 'Done', date: '17 Mar 2026' },
  },
  // RetailMax — close to done (kickoff 2/2, data 14/14, logs 7/13 ≈ 79%)
  {
    id: '8',
    name: 'RetailMax',
    service: 'A&T',
    assignee: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
    startDate: '20 Mar 2026',
    onboarding: {
      status: 'Pending',
      progress: 79,
      sections: makeAtSections(2, 14, 7, '02 Apr 2026'),
    },
    kickoff: { status: 'Done', date: '22 Mar 2026' },
  },
  // Fashion Forward Ltd — Both, fully done with the comprehensive A&T checklist
  {
    id: '9',
    name: 'Fashion Forward Ltd',
    service: 'Both',
    assignee: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
    startDate: '28 Feb 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      sections: makeAtSections(2, 14, 13, '08 Mar 2026'),
    },
    kickoff: { status: 'Done', date: '10 Mar 2026' },
  },
  {
    id: '10',
    name: 'UrbanNest Realty',
    service: 'PM',
    assignee: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
    startDate: '28 Mar 2026',
    onboarding: { status: 'Pending', progress: 40, sections: makePmSections(2, '01 Apr 2026') },
    kickoff: { status: 'Pending' },
  },
  {
    id: '11',
    name: 'Skin Essentials',
    service: 'PM',
    assignee: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
    startDate: '01 Apr 2026',
    onboarding: { status: 'Pending', progress: 0, sections: makePmSections(0, '') },
    kickoff: { status: 'Pending' },
  },
  // Bio Basket — Both, fully done with the A&T checklist
  {
    id: '12',
    name: 'Bio Basket',
    service: 'Both',
    assignee: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
    startDate: '10 Mar 2026',
    onboarding: {
      status: 'Done',
      progress: 100,
      sections: makeAtSections(2, 14, 13, '17 Mar 2026'),
    },
    kickoff: { status: 'Done', date: '18 Mar 2026' },
  },
];

// ═══════════════════════════════════════════════
// ─── HELPERS ──────────────────────────────────
// ═══════════════════════════════════════════════

// Onboarding-table service tags use a single neutral palette (SEM
// purple) for both PM and A&T rows. Service-line distinction lives in
// the dedicated Service column on the home pages where it carries
// signal — here the row already groups by client and the tag is just
// a quick category badge, so a unified colour reads cleaner without
// the cyan/purple split competing for attention.
const serviceColors: Record<string, { bg: string; text: string; border: string }> = {
  PM:    { bg: 'bg-purple-50', text: 'text-[#7C3AED]', border: 'border-purple-200' },
  'A&T': { bg: 'bg-purple-50', text: 'text-[#7C3AED]', border: 'border-purple-200' },
  Both:  { bg: 'bg-blue-50',   text: 'text-[#204CC7]', border: 'border-blue-200'   },
};

const getServiceLabel = (s: string) => s === 'PM' ? 'SEM' : s;

// ─── Assignee roster ──────────────────────────
//
// Pool of team members an onboarding can be reassigned to. The two
// HODs (Chinmay for SEM, Zubear for A&T) lead, then operations and
// senior managers in priority order. The dropdown in the table cell
// renders this list verbatim — selecting an option swaps the
// client's current assignee.
type Assignee = { name: string; initials: string; color: string; role: string };
const ASSIGNEE_OPTIONS: Assignee[] = [
  { name: 'Chinmay Pawar',  initials: 'CP', color: '#7C3AED', role: 'SEM HOD' },
  { name: 'Zubear Shaikh',  initials: 'ZS', color: '#06B6D4', role: 'A&T HOD' },
  { name: 'Tejas Atha',     initials: 'TA', color: '#3B82F6', role: 'COO' },
  { name: 'Mihir L.',       initials: 'ML', color: '#F59E0B', role: 'Admin' },
  { name: 'Harshal R.',     initials: 'HR', color: '#10B981', role: 'Operations' },
  { name: 'Arjun Mehta',    initials: 'AM', color: '#F59E0B', role: 'Sr. Manager' },
  { name: 'Kavya Iyer',     initials: 'KI', color: '#06B6D4', role: 'Manager' },
];

type FilterType = 'all' | 'pending' | 'done';
type ServiceFilterType = 'all' | 'PM' | 'A&T' | 'Both';

// Calculate days since start
function daysSinceStart(startDate: string): number {
  const months: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = startDate.split(' ');
  const d = parseInt(parts[0]);
  const m = months[parts[1]];
  const y = parseInt(parts[2]);
  const start = new Date(y, m, d);
  const now = new Date(2026, 3, 9); // April 9, 2026
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════
// ─── COMPONENT ────────────────────────────────
// ═══════════════════════════════════════════════

export function OnboardingModule() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterType>('all');
  const [selectedClient, setSelectedClient] = useState<OnboardingClient | null>(null);

  // Onboarding-detail dialog a11y: Escape closes, focus traps inside,
  // focus returns to the row that opened it.
  const onboardingDialogRef = useModalA11y(!!selectedClient, () => setSelectedClient(null));
  const [clientData, setClientData] = useState<OnboardingClient[]>(clients);

  // Section collapse state — keyed by `${clientId}::${sectionTitle}`.
  // Sections start expanded (default false = not collapsed); toggling
  // an entry to `true` collapses just that one section. Resets when
  // the drawer closes so the next open starts fresh.
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Inline Assigned-To switcher state. Stores which client's
  // dropdown is open + the trigger button's bounding rect so the
  // popover (rendered via portal at document.body) can position
  // itself directly under the chip without being clipped by the
  // table's overflow-hidden wrapper.
  const [openAssignee, setOpenAssignee] = useState<{ clientId: string; rect: DOMRect } | null>(null);
  // Ref to the popover element so the scroll listener can tell
  // page-scroll (close) from inner-popover-scroll (don't close).
  const assigneePopoverRef = useRef<HTMLDivElement | null>(null);

  // Close the assignee popover on Escape, page-scroll, or window
  // resize so it never drifts away from its anchor. The scroll
  // listener uses capture phase to catch nested scroll containers
  // — but it MUST ignore scrolls that happen inside the popover
  // itself, otherwise scrolling the option list to find a person
  // dismisses the popover mid-scroll.
  useEffect(() => {
    if (!openAssignee) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenAssignee(null); };
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && assigneePopoverRef.current?.contains(target)) return; // ignore inner scroll
      setOpenAssignee(null);
    };
    const onResize = () => setOpenAssignee(null);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [openAssignee]);

  // Reassign a client to a different team member. Strips the
  // dropdown's `role` field — it's only used as a label inside the
  // popover, not stored on the client record.
  const updateAssignee = (clientId: string, next: Assignee) => {
    setClientData(prev => prev.map(c => c.id === clientId
      ? { ...c, assignee: { name: next.name, initials: next.initials, color: next.color } }
      : c));
    // Keep the open drawer's selectedClient in sync if the same
    // client is being viewed.
    if (selectedClient?.id === clientId) {
      setSelectedClient({ ...selectedClient, assignee: { name: next.name, initials: next.initials, color: next.color } });
    }
  };

  const router = useRouter();

  /**
   * Share the overdue-onboarding alert directly into the client's
   * channel in the Inbox module. We:
   *   1. Compose a realistic, professional client-facing message
   *      that names the specific blockers (top pending items per
   *      section) so the client knows exactly what to send.
   *   2. Slugify the client name into a `client-{slug}` channel id.
   *      Inbox seedChannels has channels for each onboarding-stage
   *      client; if the slug doesn't match (defensive), Inbox's
   *      built-in fallback routes the message to the team channel
   *      (accounts-taxation / performance-marketing) by service.
   *   3. Hand off to the Inbox via sessionStorage — same protocol
   *      the workspace modules already use to inject messages.
   *   4. Close the drawer + navigate. Inbox auto-opens to the
   *      target channel and the message is already posted.
   */
  const shareOverdueWithClient = (client: OnboardingClient) => {
    const days = daysSinceStart(client.startDate);
    // Inbox uses 'PM' | 'AT' (no ampersand). Map 'A&T' / 'Both' to 'AT'
    // — for Both clients the A&T side carries the heavier onboarding
    // load, so the A&T team-channel fallback is the right destination.
    const inboxService: 'PM' | 'AT' = client.service === 'PM' ? 'PM' : 'AT';

    // Pending items grouped by section, top 3 per section (rest as
    // a "+N more" line so the message stays scannable on long lists).
    const pendingBlocks = client.onboarding.sections
      .map(s => ({ title: s.title, pending: s.items.filter(i => !i.done).map(i => i.label) }))
      .filter(s => s.pending.length > 0)
      .map(s => {
        const top = s.pending.slice(0, 3);
        const more = s.pending.length - top.length;
        const bullets = top.map(p => `• ${p}`).join('\n');
        const tail = more > 0 ? `\n• …and ${more} more` : '';
        return `🟠 *${s.title} pending:*\n${bullets}${tail}`;
      })
      .join('\n\n');

    // Realistic, warm, action-oriented message. Names the day count,
    // surfaces the specific blockers, and offers an unblock call —
    // the way an HOD would actually write this in real life.
    const message = [
      `Hi ${client.name} team — quick check-in on the kickoff 👋`,
      '',
      `We're at day ${days} of your onboarding (our internal target is 14), and a few items are still pending on your end before we can move into delivery:`,
      '',
      pendingBlocks,
      '',
      `Could you share these by end of week? Once we have everything, we can lock in your first month's plan and start running. If anything's blocked or unclear, just reply here — happy to jump on a 15-min call to unblock together.`,
      '',
      `Thanks!`,
      `${client.assignee.name} · Brego`,
    ].join('\n');

    // Slugify the client name for the channel id.
    const slug = client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const channelId = `client-${slug}`;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('inbox_discussion_msg', JSON.stringify({
        channelId,
        clientName: client.name,
        service: inboxService,
        message,
        sender: 'Miyajan',
      }));
    }

    // Close the drawer cleanly and route to the Inbox.
    setSelectedClient(null);
    router.push('/inbox');
  };

  // Toggle a single item inside a section. Recomputes section/overall
  // progress and the kickoff sync (a 100%-complete checklist auto-marks
  // kickoff Done; falling below 100% reverts kickoff if it was
  // synthetically marked Done).
  const toggleItem = (clientId: string, sectionIdx: number, itemIdx: number) => {
    setClientData(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      const newSections = c.onboarding.sections.map((s, si) => {
        if (si !== sectionIdx) return s;
        return {
          ...s,
          items: s.items.map((item, ii) => {
            if (ii !== itemIdx) return item;
            return {
              ...item,
              done: !item.done,
              completedDate: !item.done ? '09 Apr 2026' : undefined,
            };
          }),
        };
      });
      const progress = computeProgress(newSections);
      const status: 'Done' | 'Pending' = progress === 100 ? 'Done' : 'Pending';
      const kickoff = progress === 100 && c.kickoff.status === 'Pending'
        ? { status: 'Done' as const, date: '09 Apr 2026' }
        : progress < 100 && c.kickoff.status === 'Done' && !c.kickoff.date
          ? { status: 'Pending' as const }
          : c.kickoff;
      const updated: OnboardingClient = {
        ...c,
        onboarding: { ...c.onboarding, sections: newSections, progress, status },
        kickoff,
      };
      // Keep selectedClient in sync
      if (selectedClient?.id === clientId) {
        setSelectedClient(updated);
      }
      return updated;
    }));
  };

  const toggleSectionCollapsed = (clientId: string, sectionTitle: string) => {
    const key = `${clientId}::${sectionTitle}`;
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter clients
  const filtered = clientData.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending' && c.onboarding.status !== 'Pending') return false;
    if (statusFilter === 'done' && c.onboarding.status !== 'Done') return false;
    if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
    return true;
  });

  // Sort: Pending first, then by progress (low → high within pending), Done at bottom
  const sorted = [...filtered].sort((a, b) => {
    if (a.onboarding.status !== b.onboarding.status) {
      return a.onboarding.status === 'Pending' ? -1 : 1;
    }
    if (a.onboarding.status === 'Pending') {
      return a.onboarding.progress - b.onboarding.progress;
    }
    return 0;
  });

  return (
    <div>
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on every other Customers sub-page (All Customers,
        CLAs, Lost Clients, Incidents, Feedbacks, Relationships). Title +
        subtitle anchor the left; result count + Search + Status + Service
        filters hang on the right.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Client Onboarding</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Track onboarding progress and kickoff status for all clients</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — only when filters or search are narrowing the table */}
            {(search || statusFilter !== 'all' || serviceFilter !== 'all') && (
              <span className="text-caption font-medium text-black/60">
                {sorted.length} of {clientData.length} results
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="onboarding-search" className="sr-only">Search clients</label>
              <input
                id="onboarding-search"
                type="text"
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/60 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <label htmlFor="onboarding-status-filter" className="sr-only">Status filter</label>
              <select
                id="onboarding-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FilterType)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="done">Done</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Service Filter */}
            <div className="relative">
              <label htmlFor="onboarding-service-filter" className="sr-only">Service filter</label>
              <select
                id="onboarding-service-filter"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as ServiceFilterType)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All Services</option>
                <option value="PM">SEM</option>
                <option value="A&T">A&T</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/*
        Table — semantic <table>/<thead>/<tbody>/<th>/<td> so screen readers
        can navigate column-by-column and announce row/column headers. The
        previous implementation was a CSS-grid pseudo-table, which renders
        identically but is opaque to assistive tech. Column widths are kept
        through <colgroup> + inline widths so the visual layout is unchanged.
      */}
      <div className="border border-black/[0.06] rounded-xl overflow-hidden bg-white">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col style={{ width: 90 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 36 }} />
          </colgroup>
          <thead>
            <tr className="bg-black/[0.02] border-b border-black/[0.06]">
              <th scope="col" className="text-left px-5 py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Client</th>
              <th scope="col" className="text-left py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Service</th>
              <th scope="col" className="text-left py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Kickoff Date</th>
              <th scope="col" className="text-left py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Onboarding</th>
              <th scope="col" className="text-left py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Progress</th>
              <th scope="col" className="text-left py-2.5 text-caption font-semibold text-black/55 uppercase tracking-wide">Assigned To</th>
              <th scope="col" className="px-5 py-2.5"><span className="sr-only">Open client</span></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-body text-black/55">No clients match your filters</p>
                </td>
              </tr>
            ) : (
              sorted.map((client) => {
                const sc = serviceColors[client.service];
                const isOnboardingDone = client.onboarding.status === 'Done';

                return (
                  <tr
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${client.name} onboarding details — Onboarding ${client.onboarding.status}`}
                    onClick={() => setSelectedClient(client)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedClient(client);
                      }
                    }}
                    className={`border-b border-black/[0.04] last:border-b-0 hover:bg-black/[0.015] cursor-pointer transition-colors focus:outline-none focus-visible:bg-[#EEF1FB]/60 focus-visible:shadow-[inset_2px_0_0_0_#204CC7] ${!isOnboardingDone ? 'bg-white' : 'bg-black/[0.008]'}`}
                  >
                    {/* Client Name — the entire row is the click
                        target now (role="button" + onClick on the
                        <tr>); the cell just renders the visual.
                        Started-date subtitle removed because the
                        date now sits in its own Kickoff Date
                        column. */}
                    <td className="px-5 py-3.5 align-middle">
                      <span className="text-body font-medium text-black/80 group-hover:text-[#204CC7] transition-colors block">{client.name}</span>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 align-middle">
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {getServiceLabel(client.service)}
                      </span>
                    </td>

                    {/* Kickoff Date — same date that previously
                        rendered as "Started X" under the client
                        name. Surfacing it in its own column makes
                        the timing readable at a glance and lets
                        the table sort/scan by date in future. */}
                    <td className="py-3.5 align-middle">
                      <span className="text-caption font-medium text-black/75 tabular-nums">{client.startDate}</span>
                    </td>

                    {/* Onboarding Status */}
                    <td className="py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {isOnboardingDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                            <span className="text-caption font-semibold text-emerald-700">Done</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-rose-500 flex-shrink-0" aria-hidden="true" />
                            <span className="text-caption font-semibold text-rose-700">Pending</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-16 h-1.5 bg-black/[0.06] rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={client.onboarding.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${client.name} onboarding progress`}
                        >
                          <div
                            className={`h-full rounded-full transition-all ${isOnboardingDone ? 'bg-emerald-500' : client.onboarding.progress >= 60 ? 'bg-amber-500' : client.onboarding.progress > 0 ? 'bg-orange-500' : 'bg-black/10'}`}
                            style={{ width: `${client.onboarding.progress}%` }}
                          />
                        </div>
                        <span className="text-caption font-medium text-black/60 w-[36px]">{client.onboarding.progress}%</span>
                      </div>
                    </td>

                    {/* Assignee — admin can reassign by clicking the
                        chip. Click stops propagation so the row's
                        own onClick (which opens the drawer) doesn't
                        also fire. The popover renders via portal to
                        escape the table's overflow-hidden wrapper. */}
                    <td className="py-3.5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setOpenAssignee(prev => prev?.clientId === client.id ? null : { clientId: client.id, rect });
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                        aria-haspopup="listbox"
                        aria-expanded={openAssignee?.clientId === client.id}
                        aria-label={`Assigned to ${client.assignee.name}. Click to reassign.`}
                        className="inline-flex items-center gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 max-w-full"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: client.assignee.color }}
                          aria-hidden="true"
                        >
                          {client.assignee.initials}
                        </div>
                        <span className="text-caption text-black/65 truncate min-w-0">{client.assignee.name.split(' ')[0]}</span>
                        <ChevronDown
                          className={`w-3 h-3 text-black/40 shrink-0 transition-transform ${openAssignee?.clientId === client.id ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    </td>

                    {/* Arrow — purely visual; the row is keyboard-activatable via the client-name button */}
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex justify-center">
                        <ChevronRight className="w-4 h-4 text-black/30" aria-hidden="true" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <p className="text-caption text-black/55 mt-3 px-1" role="status" aria-live="polite">
        Showing {sorted.length} of {clientData.length} clients
      </p>

      {/* ══════════════════════════════════════════ */}
      {/* ─── ASSIGNEE SWITCHER POPOVER ──────────── */}
      {/* ══════════════════════════════════════════ */}
      {/*
        Inline reassignment popover for the Assigned-To cell.
        Rendered via portal to document.body so the table's
        overflow-hidden wrapper can't clip it. Positioned `fixed`
        directly under the trigger button using the captured
        getBoundingClientRect() on open — auto-flips upward when
        there isn't enough room below; horizontally clamps so it
        never renders off-screen on narrow viewports.
      */}
      {openAssignee && typeof document !== 'undefined' && (() => {
        // Per-row item height ~52px (avatar + 2-line text + py-2);
        // header chrome ~52px (label + border + py-1.5 wrapper).
        // Reserve a 16px viewport gutter top + bottom.
        const PER_ITEM = 52;
        const HEADER  = 52;
        const VIEWPORT_GUTTER = 16;
        const POPOVER_WIDTH = 260;
        const naturalHeight = HEADER + ASSIGNEE_OPTIONS.length * PER_ITEM;
        const rect = openAssignee.rect;
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
        const spaceAbove = rect.top - VIEWPORT_GUTTER;
        // Place wherever there's more room. Cap the popover height to
        // the available space so it never overflows the viewport;
        // overflow-y inside scrolls only when the cap actually bites.
        const placeBelow = spaceBelow >= naturalHeight || spaceBelow >= spaceAbove;
        const availableHeight = placeBelow ? spaceBelow : spaceAbove;
        const popoverHeight = Math.min(naturalHeight, availableHeight);
        let left = rect.left;
        if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
        if (left < 8) left = 8;
        const style: React.CSSProperties = {
          position: 'fixed',
          left,
          top: placeBelow ? rect.bottom + 6 : undefined,
          bottom: placeBelow ? undefined : window.innerHeight - rect.top + 6,
          width: POPOVER_WIDTH,
          maxHeight: popoverHeight,
          zIndex: 10001,
        };
        const currentName = clientData.find(c => c.id === openAssignee.clientId)?.assignee.name;
        return createPortal(
          <>
            {/* Click-outside scrim — captures clicks anywhere off the popover. */}
            <div className="fixed inset-0 z-[10000]" onClick={() => setOpenAssignee(null)} aria-hidden="true" />
            <div
              ref={assigneePopoverRef}
              role="listbox"
              aria-label="Reassign onboarding owner"
              style={style}
              className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
            >
              <p className="px-4 pt-3 pb-2 text-caption font-semibold text-black/55 uppercase tracking-wide border-b border-black/[0.04] shrink-0">
                Reassign to
              </p>
              <ul className="py-1 overflow-y-auto flex-1 min-h-0">
                {ASSIGNEE_OPTIONS.map(opt => {
                  const isCurrent = opt.name === currentName;
                  return (
                    <li key={opt.name}>
                      <button
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => {
                          if (!isCurrent) updateAssignee(openAssignee.clientId, opt);
                          setOpenAssignee(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${isCurrent ? 'bg-[#EEF1FB]/60' : 'hover:bg-black/[0.03]'} focus:outline-none focus-visible:bg-[#EEF1FB]`}
                      >
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: opt.color }}
                          aria-hidden="true"
                        >
                          {opt.initials}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-caption font-semibold truncate ${isCurrent ? 'text-[#204CC7]' : 'text-black/85'}`}>{opt.name}</p>
                          <p className="text-[11px] text-black/55 truncate">{opt.role}</p>
                        </div>
                        {isCurrent && (
                          <Check className="w-3.5 h-3.5 text-[#204CC7] shrink-0" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body
        );
      })()}

      {/* ══════════════════════════════════════════ */}
      {/* ─── ONBOARDING DETAIL DRAWER ──────────── */}
      {/* ══════════════════════════════════════════ */}
      {/*
        Right-side drawer (was a centered modal). The new A&T checklist
        is 29 items across 3 sections — far too long for a centered
        540px dialog. A 640px right-side drawer gives it the vertical
        room without shrinking the section structure into illegible
        bullets. PM clients still get the same drawer with their
        single "Setup" section so the rendering is unified.
      */}
      {selectedClient && (() => {
        const client = selectedClient;
        const sc = serviceColors[client.service];
        const total = sectionsTotal(client.onboarding.sections);
        const done = sectionsDone(client.onboarding.sections);
        const isOnboardingDone = client.onboarding.status === 'Done';
        const days = daysSinceStart(client.startDate);
        // Find the next pending item across ALL sections — that's what
        // the team needs to do next, regardless of which section.
        const nextStep = (() => {
          for (const s of client.onboarding.sections) {
            const item = s.items.find(i => !i.done);
            if (item) return { section: s.title, label: item.label };
          }
          return null;
        })();
        const isOverdue = !isOnboardingDone && days > 14;

        const closeDrawer = () => setSelectedClient(null);

        return (
          <>
            {/* Backdrop — clicking dismisses the drawer. z-[9998] so
                the dim covers the sticky page-header at z-10 below. */}
            <div className="fixed inset-0 bg-black/40 z-[9998]" aria-hidden="true" onClick={closeDrawer} />

            {/* Drawer panel — fixed right-edge, full viewport height,
                slides in via the standard slideIn keyframe. */}
            <div
              ref={onboardingDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-detail-title"
              tabIndex={-1}
              className="fixed right-0 top-0 h-screen w-[640px] max-w-[95vw] bg-white shadow-2xl z-[9999] flex flex-col focus:outline-none"
              style={{ animation: 'slideIn 0.25s ease-out' }}
            >
              {/* ── Header ── */}
              <div className={`px-7 py-5 flex-shrink-0 ${isOnboardingDone ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : isOverdue ? 'bg-gradient-to-br from-[#E2445C] to-rose-600' : 'bg-gradient-to-br from-[#204CC7] to-blue-700'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-md border ${sc.bg} ${sc.text} ${sc.border}`}>
                        {getServiceLabel(client.service)}
                      </span>
                      <span className="text-white/85 text-caption font-medium bg-white/15 px-2 py-0.5 rounded-md">
                        {days}d since start
                      </span>
                      {isOnboardingDone && (
                        <span className="text-white text-caption font-semibold bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3" aria-hidden="true" /> Complete
                        </span>
                      )}
                    </div>
                    <h2 id="onboarding-detail-title" className="text-white text-h2 font-bold truncate">{client.name}</h2>
                    <p className="text-white/85 text-caption font-normal mt-1">
                      Assigned to {client.assignee.name} · Started {client.startDate}
                    </p>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="ml-3 w-8 h-8 bg-white/20 rounded-md flex items-center justify-center hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/60 transition-all flex-shrink-0"
                    aria-label="Close onboarding details"
                  >
                    <X className="w-4 h-4 text-white" aria-hidden="true" />
                  </button>
                </div>

                {/* Progress bar in header */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/75 text-caption font-medium">{done} of {total} steps completed</span>
                    <span className="text-white text-caption font-bold">{client.onboarding.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${client.onboarding.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto px-7 py-5">

                {/* Overdue warning — when the kickoff has run past
                    the 14-day target. The "Share with client" CTA
                    composes a realistic message naming the specific
                    blockers and posts it directly into the client's
                    channel in the Inbox module. */}
                {isOverdue && !isOnboardingDone && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#E2445C]/[0.05] border border-[#E2445C]/15 rounded-xl mb-4">
                    <div className="w-8 h-8 bg-[#E2445C]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#E2445C]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#E2445C] text-caption font-semibold">Onboarding overdue — {days} days since start</p>
                      <p className="text-black/60 text-caption font-normal">Target is 14 days. Send a nudge through the client channel below.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => shareOverdueWithClient(client)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-[#E2445C] text-white text-caption font-semibold hover:bg-[#C9344A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/40 focus-visible:ring-offset-2"
                      aria-label={`Share overdue onboarding alert with ${client.name} via the client channel`}
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      Share with client
                    </button>
                  </div>
                )}

                {/* Details row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-black/55" />
                      <p className="text-black/55 text-caption font-medium">Service</p>
                    </div>
                    <p className="text-black/80 text-body font-semibold">{getServiceLabel(client.service)}</p>
                  </div>
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <User className="w-3.5 h-3.5 text-black/55" />
                      <p className="text-black/55 text-caption font-medium">Assigned To</p>
                    </div>
                    <p className="text-black/80 text-body font-semibold">{client.assignee.name}</p>
                  </div>
                  <div className="bg-black/[0.02] border border-black/[0.05] rounded-xl p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="w-3.5 h-3.5 text-black/55" />
                      <p className="text-black/55 text-caption font-medium">Kickoff</p>
                    </div>
                    <p className={`text-body font-semibold ${client.kickoff.status === 'Done' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {client.kickoff.status === 'Done' ? client.kickoff.date : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Next Step highlight (only if pending) */}
                {nextStep && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#204CC7]/[0.04] border border-[#204CC7]/15 rounded-xl mb-5">
                    <div className="w-8 h-8 bg-[#204CC7]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-[#204CC7]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#204CC7] text-caption font-semibold">Next step · {nextStep.section}</p>
                      <p className="text-black/70 text-body font-medium truncate">{nextStep.label}</p>
                    </div>
                  </div>
                )}

                {/* Sectioned Checklist —
                    Each section is a collapsible card with its own
                    header (title + done/total + chevron). Sections
                    start expanded; the founder can collapse the ones
                    they're not focused on. Items inside a section
                    have the same checkbox + label + completion-date
                    treatment as before, just nested. */}
                <div>
                  <h3 className="text-body font-semibold text-black/80 mb-3">Onboarding Checklist</h3>
                  <div className="space-y-3">
                    {client.onboarding.sections.map((section, sIdx) => {
                      const sDone = section.items.filter(i => i.done).length;
                      const sTotal = section.items.length;
                      const sComplete = sDone === sTotal && sTotal > 0;
                      const collapseKey = `${client.id}::${section.title}`;
                      const isCollapsed = collapsedSections[collapseKey] === true;

                      return (
                        <div
                          key={section.title}
                          className={`rounded-xl border ${sComplete ? 'border-emerald-200 bg-emerald-50/30' : 'border-black/[0.08] bg-white'} overflow-hidden`}
                        >
                          {/* Section header — clickable to collapse/expand */}
                          <button
                            type="button"
                            onClick={() => toggleSectionCollapsed(client.id, section.title)}
                            aria-expanded={!isCollapsed}
                            aria-controls={`section-${client.id}-${sIdx}`}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:ring-inset"
                          >
                            <ChevronDown
                              className={`w-4 h-4 text-black/45 transition-transform shrink-0 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className={`text-body font-semibold ${sComplete ? 'text-emerald-700' : 'text-black/80'}`}>
                                {section.title}
                              </p>
                            </div>
                            <span className={`text-caption font-semibold tabular-nums px-2 py-0.5 rounded-md flex-shrink-0 ${sComplete ? 'bg-emerald-100 text-emerald-700' : sDone > 0 ? 'bg-[#204CC7]/10 text-[#204CC7]' : 'bg-black/[0.04] text-black/55'}`}>
                              {sDone}/{sTotal}
                            </span>
                            {sComplete && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden="true" />
                            )}
                          </button>

                          {/* Section items — hidden when collapsed */}
                          {!isCollapsed && (
                            <div
                              id={`section-${client.id}-${sIdx}`}
                              className="px-4 pb-2 border-t border-black/[0.05]"
                            >
                              {section.items.map((item, iIdx) => (
                                <div
                                  key={iIdx}
                                  className={`flex items-center gap-3 py-2.5 cursor-pointer rounded-lg -mx-2 px-2 hover:bg-black/[0.02] transition-colors ${iIdx < section.items.length - 1 ? 'border-b border-black/[0.04]' : ''}`}
                                  onClick={() => toggleItem(client.id, sIdx, iIdx)}
                                  role="checkbox"
                                  aria-checked={item.done}
                                  tabIndex={0}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleItem(client.id, sIdx, iIdx); } }}
                                >
                                  {/* Checkbox indicator */}
                                  <div className="flex flex-col items-center flex-shrink-0">
                                    {item.done ? (
                                      <div className="w-5 h-5 rounded-md bg-[#00C875] flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-5 h-5 rounded-md border-2 border-black/15 bg-white flex items-center justify-center">
                                        <Circle className="w-3 h-3 text-transparent" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Item content */}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-caption font-medium ${item.done ? 'text-black/55 line-through' : 'text-black/75'}`}>
                                      {item.label}
                                    </p>
                                    {item.done && item.completedDate && (
                                      <p className="text-[11px] text-black/45 mt-0.5 flex items-center gap-1">
                                        <CalendarDays className="w-2.5 h-2.5" />
                                        Completed {item.completedDate}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              {isOnboardingDone && (
                <div className="px-7 py-4 border-t border-black/[0.06] flex-shrink-0 bg-white">
                  <div className="w-full px-4 py-3 rounded-xl bg-[#00C875]/[0.06] text-center">
                    <p className="text-[#00C875] text-caption font-medium flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Onboarding complete — client is live
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
