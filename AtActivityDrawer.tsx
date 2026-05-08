'use client';

/**
 * A&T Activity — dedicated activity log for the Accounts & Taxation
 * practice. Lives as its own sub-tab on the A&T home (peer of
 * Overview / Recurring Checklist / King & Queen) at:
 *
 *   /home?tab=accounts-taxation&sub=activity
 *
 * Why a full screen, not a drawer
 *   The Recurring Checklist + King & Queen modules generate a lot
 *   of day-to-day mutations: status flips, assignee swaps, type
 *   changes, credentials updated, portals added, onboarding clients
 *   going Live, etc. A 540 px drawer can't fit a date-grouped feed
 *   plus filter chrome plus the rich diff-chip rows comfortably.
 *   This screen gets the full content area to breathe.
 *
 * Scope
 *   Strictly A&T-native modules — Recurring Checklist, King & Queen,
 *   Onboarding, Workspace. Everything else (Inbox, Dataroom,
 *   Adminland, Dashboard) is filtered out at source so the surface
 *   reads as "what changed in MY practice in the last N hours / days".
 *
 *   The global /activity page still shows the full A&T-wide feed
 *   (cross-cutting modules included) for org-level scanning.
 *
 * Two named exports
 *   • `AtActivityButton` — small pill that drops into the A&T Overview
 *     top bar. Carries today's event count as a cyan badge so the HOD
 *     knows when there's traffic worth opening. Routes to the sub-tab
 *     above on click.
 *   • `AtActivityPage`   — the full-screen content rendered by
 *     SuperAdminHome when `sub=activity`.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, X, Search, Calendar, Users, Tag, Activity, ArrowLeft } from 'lucide-react';
import {
  ActivityRow,
  PERIOD_OPTIONS,
  type PeriodFilter,
  isWithinPeriod,
  groupByDate,
  mockActivities,
  TEAM,
  type ActivityEntry,
  type ActivityRowBadge,
} from '@/ActivityLog';
import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE — Recurring Checklist module only, and only the two kinds of
// changes that matter day-to-day for an HOD scanning the feed:
//   • Status flips    (a status_changed entry, or a `completed` finish)
//   • Assignments     (an `assigned` or `reassigned` entry)
// Everything else (notes, comments, configurations, uploads, portal
// adds, type changes, etc.) is filtered out at source so the feed
// reads as a clean operational log of "what moved" rather than a
// cross-cutting noise channel.
//
// AUTHORISATION RULE — assignment is HOD/POD-Head only.
//   In the org, only roles with "HOD" or "POD Head" in their title
//   are authorised to assign or reassign work on the Recurring
//   Checklist. Status flips can be performed by anyone working on
//   the item (so a Manager / Asst Manager / Executive can move
//   their own item from Pending → WIP → Done) but the work-
//   distribution decision is always an HOD-level call.
//   `isInScope` enforces this at the activity-log level: an
//   `assigned` / `reassigned` entry by a non-authorised role is
//   considered malformed data and dropped. Mock data lives in
//   ActivityLog.tsx — keep all assignment entries authored by
//   Zubear / Irshad (HODs) or Rohan (POD Head).
// ─────────────────────────────────────────────────────────────────────────────

const AT_ACTIVITY_HREF = SUPER_ADMIN_HOME_ROUTES.accountsTaxation.activity;

/** Roles authorised to assign or reassign work. */
const ASSIGNER_ROLES: ReadonlySet<string> = new Set(['A&T HOD', 'POD Head']);

/** Which entries the A&T Activity feed surfaces. The page never
 *  shows anything outside this predicate. */
function isInScope(e: ActivityEntry): boolean {
  if (e.module !== 'checklist') return false;
  if (e.action === 'status_changed' || e.action === 'completed') return true;
  if (e.action === 'assigned' || e.action === 'reassigned') {
    // HOD / POD-Head guard — silently drops malformed seed data
    // (or future bugs) that would surface a non-authorised role
    // performing an assignment. Real authorisation lives upstream
    // at the action layer; this is a belt-and-suspenders check.
    return ASSIGNER_ROLES.has(e.user.role);
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-TYPE — the 5 list views inside Recurring Checklist plus a
// "general" bucket for anything that doesn't pattern-match (BOA, PF,
// etc.). The sub-type filter replaces the old module filter dropdown,
// since module is now constant and sub-type is the meaningful slice.
// ─────────────────────────────────────────────────────────────────────────────

type ChecklistSubType = 'all' | 'tds' | 'gst' | 'ptrc-ptec' | 'income-tax' | 'ecom-reco' | 'general';

const SUBTYPE_LABELS: Record<Exclude<ChecklistSubType, 'all'>, string> = {
  'tds':         'TDS',
  'gst':         'GST',
  'ptrc-ptec':   'PTRC / PTEC',
  'income-tax':  'Income Tax',
  'ecom-reco':   'E-Com Reco',
  'general':     'Recurring Checklist',
};

const SUBTYPE_TINTS: Record<Exclude<ChecklistSubType, 'all'>, { bg: string; text: string }> = {
  'tds':         { bg: 'bg-blue-50',    text: 'text-blue-700'    },
  'gst':         { bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
  'ptrc-ptec':   { bg: 'bg-amber-50',   text: 'text-amber-700'   },
  'income-tax':  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'ecom-reco':   { bg: 'bg-violet-50',  text: 'text-violet-700'  },
  'general':     { bg: 'bg-slate-50',   text: 'text-slate-600'   },
};

/** Categorize a checklist entry into one of the 5 sub-types via
 *  title-pattern matching. The activity model doesn't carry an
 *  explicit sub-type field, so we infer it from the work item's
 *  name ("GSTR-3B" → gst, "TDS challan" → tds, etc.). Anything we
 *  can't recognise drops into the umbrella "Recurring Checklist"
 *  bucket so the row still surfaces. */
function categorizeChecklist(title: string): Exclude<ChecklistSubType, 'all'> {
  const t = title.toLowerCase();
  if (t.includes('gstr') || /\bgst\b/.test(t)) return 'gst';
  if (t.includes('tds') || t.includes('tcs')) return 'tds';
  if (t.includes('ptrc') || t.includes('ptec') || /\bpt monthly\b/.test(t) || /\bpt return\b/.test(t)) return 'ptrc-ptec';
  if (t.includes('income tax') || t.includes('itr')) return 'income-tax';
  if (t.includes('e-com') || t.includes('reco') || t.includes('boa')) return 'ecom-reco';
  return 'general';
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER BUTTON — drops into the Overview top bar's right cluster.
// Pill style matching the Date-range select chrome, plus an inline
// "today count" cyan badge so the HOD knows there's traffic worth
// looking at without having to click through.
// ─────────────────────────────────────────────────────────────────────────────

export function AtActivityButton({ onClick }: { onClick?: () => void }) {
  const router = useRouter();
  // Today's count uses the same scope predicate as the page itself,
  // so the badge number always agrees with what an admin sees after
  // they click through. Was previously counting all four modules.
  const todayCount = useMemo(
    () => mockActivities.filter(e => isInScope(e) && isWithinPeriod(e.timestamp, 'today')).length,
    []
  );

  const handleClick = () => {
    if (onClick) onClick();
    router.push(AT_ACTIVITY_HREF);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Open A&T activity${todayCount > 0 ? ` — ${todayCount} events today` : ''}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 bg-white hover:border-black/20 hover:text-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/20 focus-visible:border-[#204CC7]/30"
    >
      <Activity className="w-3.5 h-3.5 text-[#06B6D4]" aria-hidden="true" />
      Activity
      {todayCount > 0 && (
        <span
          // Bumped from 18×18 / text-[10px] (sub-13px violation) to
          // 22×22 / text-caption so the count meets the project's
          // 13px typography floor and stays legible at zoom (WCAG
          // 1.4.4). aria-hidden stays — the count is duplicated in
          // the trigger's aria-label.
          className="ml-0.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#06B6D4] text-white text-caption font-bold tabular-nums leading-none"
          aria-hidden="true"
        >
          {todayCount}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN HELPER — local copy so this file is self-contained.
// ─────────────────────────────────────────────────────────────────────────────

function useDismissable() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE — full-screen activity feed for the A&T sub-tab.
// ─────────────────────────────────────────────────────────────────────────────

export function AtActivityPage() {
  const router = useRouter();
  const [searchTerm,    setSearchTerm]    = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState<ChecklistSubType>('all');
  const [teamFilter,    setTeamFilter]    = useState<'all' | string>('all');
  const [periodFilter,  setPeriodFilter]  = useState<PeriodFilter>('7d');
  const [visibleCount,  setVisibleCount]  = useState(30);

  const subTypeDD = useDismissable();
  const teamDD    = useDismissable();
  const periodDD  = useDismissable();

  const goBack = useCallback(() => {
    router.push(SUPER_ADMIN_HOME_ROUTES.accountsTaxation.overview);
  }, [router]);

  // ── Source data — scope predicate first (Recurring Checklist
  //    module + status/assignment actions only). Everything else
  //    layers on top. The pre-categorised `subType` is computed
  //    once per entry so downstream filtering and the per-row
  //    badge agree. ──
  const scopedActivities = useMemo(
    () => mockActivities
      .filter(isInScope)
      .map(e => ({ entry: e, subType: categorizeChecklist(e.title) })),
    []
  );

  const periodActivities = useMemo(
    () => scopedActivities.filter(({ entry }) => isWithinPeriod(entry.timestamp, periodFilter)),
    [scopedActivities, periodFilter]
  );

  const filtered = useMemo(() => {
    let result = periodActivities;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(({ entry: e }) =>
        e.title.toLowerCase().includes(s) ||
        e.user.name.toLowerCase().includes(s) ||
        e.detail?.toLowerCase().includes(s) ||
        e.client?.toLowerCase().includes(s) ||
        e.diff?.before.toLowerCase().includes(s) ||
        e.diff?.after.toLowerCase().includes(s)
      );
    }
    if (subTypeFilter !== 'all') result = result.filter(r => r.subType === subTypeFilter);
    if (teamFilter    !== 'all') result = result.filter(r => r.entry.user.name === teamFilter);
    return result;
  }, [periodActivities, searchTerm, subTypeFilter, teamFilter]);

  // groupByDate operates on plain entries; map back from the
  // (entry, subType) pairs to entries before grouping, then look
  // sub-type back up by id when rendering. Cheaper than threading
  // the pair through the grouping helper.
  const subTypeById = useMemo(() => {
    const m = new Map<string, Exclude<ChecklistSubType, 'all'>>();
    for (const { entry, subType } of scopedActivities) m.set(entry.id, subType);
    return m;
  }, [scopedActivities]);
  const grouped = useMemo(
    () => groupByDate(filtered.slice(0, visibleCount).map(r => r.entry)),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;

  // Person dropdown — original A&T team hierarchy preserved, with
  // Tejas (COO) and Mihir (Admin) excluded because they sit outside
  // the A&T practice and never appear as actors on this scoped
  // feed. Order matches the TEAM object's insertion order: HODs →
  // POD Head → Managers → Asst Managers → Executive.
  const teamMembers = useMemo(
    () => Object.values(TEAM).filter(m => m.name !== TEAM.tejas.name && m.name !== TEAM.mihir.name),
    [],
  );
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label ?? '7 days';
  const subTypeLabel = subTypeFilter === 'all' ? 'All sub-types' : SUBTYPE_LABELS[subTypeFilter];
  const activeFilterCount = (subTypeFilter !== 'all' ? 1 : 0) + (teamFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSubTypeFilter('all');
    setTeamFilter('all');
  }, []);

  return (
    <div>
      {/* ── Top bar — same chrome as the rest of the A&T sub-tabs.
              Back arrow + title + scope subtitle on the left, period
              selector + search on the right. Bleed math
              `-mx-8 -mt-6 px-8 mb-6` matches the workspace content
              padding. ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-8 -mt-6 px-8 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label="Back to A&T Overview"
              title="Back to A&T Overview"
              className="w-9 h-9 rounded-md hover:bg-black/[0.05] flex items-center justify-center text-black/65 hover:text-black/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-black/90 text-body font-semibold">Activity</p>
              <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
                Status changes and assignments inside Recurring Checklist
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sub-type filter — replaces the old module filter.
                The module is constant on this surface (Recurring
                Checklist), so the meaningful slice an admin
                actually wants is "show me only TDS / GST / PT /
                IT / E-Com Reco changes". 5 list-view options +
                an umbrella "Recurring Checklist" bucket for items
                that don't pattern-match a sub-type. */}
            <div ref={subTypeDD.ref} className="relative">
              <button
                type="button"
                onClick={() => { subTypeDD.setOpen(!subTypeDD.open); teamDD.setOpen(false); periodDD.setOpen(false); }}
                aria-expanded={subTypeDD.open}
                aria-haspopup="listbox"
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${subTypeFilter !== 'all' ? 'bg-[#EEF1FB] text-[#204CC7] border border-[#204CC7]/20' : 'bg-white text-black/70 border border-black/10 hover:border-black/20'}`}
              >
                <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                {subTypeLabel}
                <ChevronDown className={`w-3 h-3 transition-transform ${subTypeDD.open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {subTypeDD.open && (
                <div role="listbox" aria-label="Filter by sub-type" className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-black/[0.08] rounded-md shadow-xl py-1 z-50">
                  <button
                    role="option"
                    aria-selected={subTypeFilter === 'all'}
                    onClick={() => { setSubTypeFilter('all'); subTypeDD.setOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${subTypeFilter === 'all' ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                  >
                    <Tag className="w-3.5 h-3.5 text-black/45" aria-hidden="true" />
                    All sub-types
                  </button>
                  <div className="h-px bg-black/[0.06] my-1" aria-hidden="true" />
                  {(['general', 'tds', 'gst', 'ptrc-ptec', 'income-tax', 'ecom-reco'] as const).map(st => {
                    const isActive = subTypeFilter === st;
                    const tint = SUBTYPE_TINTS[st];
                    return (
                      <button
                        key={st}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => { setSubTypeFilter(st); subTypeDD.setOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${isActive ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                      >
                        <span className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${tint.bg.replace('bg-', 'bg-').replace('-50', '-500')}`} aria-hidden="true" />
                        {SUBTYPE_LABELS[st]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Person filter */}
            <div ref={teamDD.ref} className="relative">
              <button
                type="button"
                onClick={() => { teamDD.setOpen(!teamDD.open); subTypeDD.setOpen(false); periodDD.setOpen(false); }}
                aria-expanded={teamDD.open}
                aria-haspopup="listbox"
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${teamFilter !== 'all' ? 'bg-[#EEF1FB] text-[#204CC7] border border-[#204CC7]/20' : 'bg-white text-black/70 border border-black/10 hover:border-black/20'}`}
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                {teamFilter === 'all' ? 'Everyone' : teamFilter.split(' ')[0]}
                <ChevronDown className={`w-3 h-3 transition-transform ${teamDD.open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {teamDD.open && (
                <div role="listbox" aria-label="Filter by person" className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-black/[0.08] rounded-md shadow-xl py-1 z-50 max-h-[360px] overflow-y-auto">
                  <button
                    role="option"
                    aria-selected={teamFilter === 'all'}
                    onClick={() => { setTeamFilter('all'); teamDD.setOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${teamFilter === 'all' ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                  >
                    <Users className="w-3.5 h-3.5 text-black/45" aria-hidden="true" />
                    Everyone
                  </button>
                  <div className="h-px bg-black/[0.06] my-1" aria-hidden="true" />
                  {teamMembers.map(member => (
                    <button
                      key={member.name}
                      role="option"
                      aria-selected={teamFilter === member.name}
                      onClick={() => { setTeamFilter(member.name); teamDD.setOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${teamFilter === member.name ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                    >
                      {/* Avatar bumped 24→32 so initials can carry
                          text-caption (13px) and clear the 13px
                          typography floor without looking cramped.
                          Initials are decorative — name + role are
                          rendered as text adjacent. */}
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold flex-shrink-0" style={{ backgroundColor: member.color }}>
                        {member.initials}
                      </span>
                      <span className="flex-1 truncate">{member.name}</span>
                      {/* Role label: 13px / text-black/55 reaches
                          ~4.83:1 contrast (was text-[11px] /
                          text-black/40, ~3.0:1 — failed WCAG 1.4.3). */}
                      <span className="text-caption text-black/55">{member.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period dropdown */}
            <div ref={periodDD.ref} className="relative">
              <button
                type="button"
                onClick={() => { periodDD.setOpen(!periodDD.open); teamDD.setOpen(false); subTypeDD.setOpen(false); }}
                aria-expanded={periodDD.open}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-white border border-black/10 text-caption font-medium text-black/70 hover:border-black/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <Calendar className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
                {periodLabel}
                <ChevronDown className={`w-3 h-3 text-black/55 transition-transform ${periodDD.open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {periodDD.open && (
                <div role="listbox" aria-label="Filter by period" className="absolute top-full right-0 mt-1.5 w-44 bg-white border border-black/[0.08] rounded-md shadow-xl py-1 z-50">
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      role="option"
                      aria-selected={periodFilter === opt.value}
                      onClick={() => { setPeriodFilter(opt.value); periodDD.setOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-caption transition-colors ${periodFilter === opt.value ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/45 pointer-events-none" aria-hidden="true" />
              <label htmlFor="at-activity-search" className="sr-only">Search A&T activity</label>
              <input
                id="at-activity-search"
                type="text"
                placeholder="Search activity, client, person…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-7 pr-9 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  // Hit area bumped to 24×24 to clear WCAG 2.5.8 AA
                  // (was ~16×16 with `p-0.5`). Right pad on the input
                  // bumped from pr-7 to pr-9 so the X button has
                  // room to breathe inside the field.
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body — count strip + timeline live in a centered column
              (max-w-[960px] mx-auto) so the page reads with balanced
              left/right padding. The top bar above stays full-bleed
              for visual anchoring. ── */}
      <div className="max-w-[960px] mx-auto">
        {/* Result count removed — the date-group headers below
            already carry per-day counts, so an aggregate "X events"
            line above the timeline was duplicating the same signal.
            Clear chip is still surfaced (only when filters are
            active) so a user who's narrowed the feed can return to
            the full view with one click. */}
        {activeFilterCount > 0 && (
          <div className="flex items-center mb-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-caption font-medium text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <X className="w-3 h-3" aria-hidden="true" /> Clear
            </button>
          </div>
        )}

        {/* Timeline */}
        {grouped.length > 0 ? (
          <div className="space-y-7">
            {grouped.map(group => (
              <section key={group.label} aria-label={`${group.label} activity`}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-caption font-semibold text-black/55 uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </h3>
                  <span className="text-caption text-black/40 tabular-nums">{group.entries.length}</span>
                  <div className="flex-1 h-px bg-black/[0.06]" aria-hidden="true" />
                </div>
                <ul className="space-y-1" role="list">
                  {group.entries.map(entry => {
                    // Replace the per-row module pill ("Recurring
                    // Checklist") with the row's sub-type pill —
                    // every row on this page is checklist already,
                    // so the module label never carries new info.
                    // The sub-type tells the admin which list view
                    // (TDS / GST / PT / IT / E-Com) the row belongs
                    // to, which is the dimension they actually scan
                    // for.
                    const st = subTypeById.get(entry.id) ?? 'general';
                    const tint = SUBTYPE_TINTS[st];
                    const customBadge: ActivityRowBadge = { label: SUBTYPE_LABELS[st], bg: tint.bg, text: tint.text };
                    return <ActivityRow key={entry.id} entry={entry} customBadge={customBadge} />;
                  })}
                </ul>
              </section>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 25)}
                  className="px-5 py-2 rounded-md border border-black/10 bg-white text-caption font-medium text-black/65 hover:text-[#204CC7] hover:border-[#204CC7]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  Load more activity
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-black/[0.06] py-16 text-center">
            <Search className="w-8 h-8 text-black/15 mx-auto mb-3" aria-hidden="true" />
            <p className="text-body font-medium text-black/65">No A&amp;T activity matches your filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-caption font-medium text-[#204CC7] hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}

        <div className="h-8" aria-hidden="true" />
      </div>
    </div>
  );
}

// Re-exported for callers that want to type their own filtered slices.
export type { ActivityEntry };
