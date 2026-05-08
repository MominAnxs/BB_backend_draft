'use client';

/**
 * Accounts & Taxation — Deliverables workspace.
 *
 * Ship-ready rebuild #2 (per the third design-critique we just shipped):
 *
 *   The drawer-based interaction was wrong for this depth of data. A&T is
 *   audit-trailed by nature — the HOD answers "what was Patel Group's
 *   compliance status in March?" daily — and a drawer can't carry month
 *   history, team workload, and a multi-business switcher without becoming
 *   a window-within-a-window.
 *
 *   Replaced with proper page-style navigation driven by URL search params:
 *     ?client=<id>                          → client detail
 *     ?client=<id>&business=<id>            → switch business within client
 *     ?client=<id>&business=<id>&month=<YYYY-MM> → historical month
 *
 *   These coexist with the SuperAdminHome sub-tab params (?tab=&sub=) so the
 *   page works both standalone (/workspace/accounts-taxation) and embedded
 *   inside the Super Admin Home (?tab=accounts-taxation&sub=deliverables).
 *
 *   List view answers "where's the work" at a glance (Behind first, with
 *   team column for management visibility). Detail view answers "show me
 *   the deep state for this one client" (multi-business switcher, 6-month
 *   history, per-item assignee, team workload sidebar).
 */

import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search, ChevronRight, ChevronLeft, ChevronDown, ArrowLeft, AlertTriangle, X, Plus,
  CheckCircle2, Circle, MessageSquareText, Check, MoreVertical, FileText, Receipt, ScrollText,
  ShoppingCart, ExternalLink, Trash2, Landmark,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { MonthNavigator } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';
import { NewResourceRequestModal } from '@/adminland/NewResourceRequestModal';
import { TaskManagement } from './TaskManagement';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

// Per-deliverable status. Four canonical states the HOD can pick from
// the dropdown in the Status column:
//   • Pending — work is on our team's plate
//   • Completed — done
//   • N/A — doesn't apply this month (skip; not counted as pending)
//   • Pending from client — waiting on client input/data; counts as
//     pending work for SLA purposes but attribution is on the client
// "Overdue" and "Missed" are derived display states (not selectable):
// they're shown when status is Pending or Pending from client AND the
// due date has passed (current month → Overdue; past month → Missed).
type ChecklistStatus = 'Pending' | 'Completed' | 'N/A' | 'Pending from client';
const CHECKLIST_STATUS_OPTIONS: { value: ChecklistStatus; label: string }[] = [
  { value: 'Pending',             label: 'Pending'             },
  { value: 'Completed',           label: 'Completed'           },
  { value: 'N/A',                 label: 'N/A this month'      },
  { value: 'Pending from client', label: 'Pending from client' },
];
export type BusinessType = 'E-Commerce' | 'Non E-Commerce';
// Particulars / Category share the same vocabulary on the HOD checklist —
// they're the bucket that compliance tasks roll up to (BOA, GST, TDS, …).
type CategoryName =
  | 'BOA'
  | 'E invoice'
  | 'ISD'
  | 'TDS'
  | 'TCS Reco'
  | 'GST'
  | 'PF'
  | 'ESIC'
  | 'Advance Tax'
  | 'Income Tax'
  | 'MIS'
  | 'Reco'
  | 'MSME'
  | 'IT'
  | 'TDS Return'
  | 'PT';
// Iterable list of every Particulars / Category bucket — used by the
// "Add row" inline editor on the per-business checklist so admins can
// pick the bucket from a dropdown rather than free-typing it. Mirrors
// the type union above 1:1.
const CATEGORY_NAMES: CategoryName[] = [
  'BOA', 'E invoice', 'ISD', 'TDS', 'TCS Reco', 'GST',
  'PF', 'ESIC', 'Advance Tax', 'Income Tax', 'MIS',
  'Reco', 'MSME', 'IT', 'TDS Return', 'PT',
];
type RowStatus = 'Done' | 'Pending' | 'Behind';
type StatusFilter = 'All' | 'Behind' | 'Done';
// Three-role org per the HOD's note: HOD reviews/tracks; Manager is
// responsible for all the work; Manager can delegate specific items to
// Executives. No Sr/Jr split — the table is a 3-tier view.
// Five-tier role hierarchy used across the workspace + admin Teams &
// Efforts tab. HOD owns the practice; POD Head is the HOD's right
// hand (formerly "HOD Team Member"); Manager and Assistant Manager
// are the day-to-day delivery leads; Executive owns execution.
export type Role = 'HOD' | 'POD Head' | 'Manager' | 'Assistant Manager' | 'Executive';
// How often a checklist item recurs. The HOD uses this to read the table
// as a schedule — "Monthly 3rd", "Quarterly 30th", "Half-Yearly 30th",
// "Annual" — without having to remember which month a row applies to.
// Recurrence cadence on each deliverable. The HOD can change a row's
// type from the dropdown in the Type column — most rows are Monthly
// by default; Quarterly / Annually are the recurring tax cycles;
// One Time covers ad-hoc deliverables (e.g., one-shot setup work).
type Frequency = 'Monthly' | 'Quarterly' | 'Annually' | 'One Time';
const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'Monthly',   label: 'Monthly'   },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Annually',  label: 'Annually'  },
  { value: 'One Time',  label: 'One Time'  },
];

export interface TeamMember {
  initials: string;
  name: string;
  role: Role;
}

interface ChecklistItem {
  id: string;
  particulars: CategoryName;
  work: string;
  category: CategoryName;
  frequency: Frequency;
  dueDate: string;          // ISO
  status: ChecklistStatus;
  assignee: string;         // team member initials
}

interface MonthSnapshot {
  month: string;            // ISO YYYY-MM-01
  items: ChecklistItem[];
}

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  gstNumber: string;
  history: MonthSnapshot[]; // sorted desc; index 0 = current month
}

export interface Client {
  id: string;
  name: string;
  team: TeamMember[];       // includes HOD as the first entry
  businesses: Business[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// "Today" is 5 May 2026 — early in the compliance cycle so most
// monthly rows (BOA / E-invoice / ISD on the 3rd) have just slipped
// overdue, the TDS pair on the 7th is due in two days, and the GST,
// PF, ESIC, MIS, PT block due 8–28th sit ahead in the pipeline.
// April-end items rolled forward (95% closed last month) seed a
// small overdue tail. This gives the HOD a realistic
// start-of-month view with every downstream widget showing real signal.
const TODAY_ISO = '2026-05-05';
const today = new Date(TODAY_ISO);
export const CURRENT_MONTH = '2026-05-01';

const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - today.getTime()) / 86400000);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
};

// Year-inclusive variant — used on cross-period views (e.g. the
// Overdue triage page) where rows span months/years and the year
// disambiguates Mar 2025 from Mar 2026 at a glance. Within
// single-month checklists the unqualified `fmtDate` keeps the
// column tight (year is redundant when every row shares it).
const fmtDateWithYear = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
};

const fmtMonthShort = (iso: string) => {
  const d = new Date(iso);
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
};

const fmtMonthLong = (iso: string) => {
  const d = new Date(iso);
  return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
};

const isCurrentMonth = (month: string) => month === CURRENT_MONTH;

// ── (idx, year) ↔ ISO conversion for the shared MonthNavigator widget ──
export const monthFromISO = (iso: string): { idx: number; year: number } => {
  const d = new Date(iso);
  return { idx: d.getMonth(), year: d.getFullYear() };
};
export const monthToISO = (idx: number, year: number): string =>
  `${year}-${String(idx + 1).padStart(2, '0')}-01`;

/** An item is overdue when it's pending past its due date AND it's the current
 *  month. Past-month pending items are missed but not "overdue" anymore — they
 *  show as Missed in the historical view. */
// "Overdue" = work that's still owed AND past its due date.
// Both 'Pending' and 'Pending from client' qualify — even when we're
// waiting on the client, the deadline is breached and the row needs
// chasing. 'N/A' and 'Completed' are never overdue.
const isOverdueNow = (item: ChecklistItem) =>
  (item.status === 'Pending' || item.status === 'Pending from client') &&
  daysUntil(item.dueDate) < 0;

// ─────────────────────────────────────────────────────────────────────────────
// NOTES — one open-ended free-text note per checklist item. This is NOT a
// chat thread — there's a single input field; the HOD/team write whatever
// context they need (blocker, "waiting on…", working notes). The seed
// gives a plausible starting note on roughly half the rows so the column
// has real content to render; live edits live in component state.
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_TEMPLATES = [
  'Bank statements pending from client.',
  'Reconciled with vendor invoices, looks clean.',
  'Waiting for client approval on the working file.',
  'Auto-invoice mismatch fixed; values now tally.',
  'GST portal was down yesterday, retried this morning.',
  'Signed copy received via email — uploaded to Drive.',
  'Client requested 2-day extension; informed HOD.',
  'Filed and acknowledgement saved to Dataroom.',
];

/** Deterministic seed note for ~half the rows, blank for the rest. */
function seedNote(item: ChecklistItem): string {
  const hash = item.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  if (hash % 2 === 0) return '';
  return NOTE_TEMPLATES[hash % NOTE_TEMPLATES.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM POOL — A&T is a big team; each client gets a 3-5 person allocation.
// ─────────────────────────────────────────────────────────────────────────────

// Distributed across the new 5-tier hierarchy. Each A&T team for a
// client typically draws one HOD + one POD Head + one Manager (or
// Assistant Manager) + 1–2 Executives, mirroring real practice
// staffing where the senior tier reviews and the junior tier delivers.
export const TEAM_POOL: Record<string, TeamMember> = {
  ZS: { initials: 'ZS', name: 'Zubear Shaikh',     role: 'HOD'                },
  IQ: { initials: 'IQ', name: 'Irshad Qureshi',    role: 'HOD'                },
  RD: { initials: 'RD', name: 'Rohan Desai',       role: 'POD Head'           },
  NA: { initials: 'NA', name: 'Nisha Agarwal',     role: 'Manager'            },
  AK: { initials: 'AK', name: 'Anil Kumar',        role: 'Manager'            },
  SP: { initials: 'SP', name: 'Sneha Patel',       role: 'Assistant Manager'  },
  RS: { initials: 'RS', name: 'Riya Sharma',       role: 'Assistant Manager'  },
  DJ: { initials: 'DJ', name: 'Deepak Jain',       role: 'Executive'          },
  VS: { initials: 'VS', name: 'Vikram Singh',      role: 'Executive'          },
  RG: { initials: 'RG', name: 'Rahul Gupta',       role: 'Executive'          },
  PJ: { initials: 'PJ', name: 'Priya Joshi',       role: 'Executive'          },
  AV: { initials: 'AV', name: 'Amit Verma',        role: 'Executive'          },
};

export const teamFor = (initials: string[]): TeamMember[] =>
  initials.map(i => TEAM_POOL[i]).filter(Boolean);

/** Default-assignee strategy.
 *
 *  Per the HOD's note: "Managers are responsible for all the work/tasks
 *  on the table. Managers can further assign the specific tasks to their
 *  team (Executives)." So every checklist row defaults to a Manager OR
 *  an Executive depending on what the template says, NEVER to the HOD —
 *  the HOD is the reviewer, not an owner.
 *
 *  When a team has multiple members in the requested role, the `hash`
 *  argument round-robins between them so executive-owned items spread
 *  across the bench instead of piling up on whichever name appears
 *  first. Fallback chain: requested role → Manager → Executive → first
 *  non-HOD → first member. */
function defaultAssignee(team: TeamMember[], role: Role, hash: number): string {
  const pick = (r: Role) => {
    const candidates = team.filter(t => t.role === r);
    if (candidates.length === 0) return undefined;
    return candidates[Math.abs(hash) % candidates.length].initials;
  };
  // Fallback walks down the seniority ladder so a row whose preferred
  // role isn't on the team still lands on the closest tier:
  // Manager → Assistant Manager → POD Head → Executive → any non-HOD.
  return pick(role)
    ?? pick('Manager')
    ?? pick('Assistant Manager')
    ?? pick('POD Head')
    ?? pick('Executive')
    ?? team.find(t => t.role !== 'HOD')?.initials
    ?? team[0]?.initials
    ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST TEMPLATE — applied to every business, every month.
//
// This is the HOD's master compliance schedule for an A&T client. The HOD
// reads the table top-to-bottom by due date; the Manager owns most rows
// and delegates routine data-entry items to Executives. Sourced from the
// HOD's own deliverables sheet and matches Indian compliance vocabulary
// (GSTR-1 / GSTR-3B / GSTR-IFF / IMS / ITR / 26AS / MSME / PT, etc.).
//
// Frequencies + applicableMonths:
//   Monthly      → every month (1..12)
//   Quarterly    → calendar Q-end months [1, 4, 7, 10]
//   Half-Yearly  → twice a year [4, 10]
//   Annual       → ITR for non-audit cases is filed on 15 Sept → [9]
// ─────────────────────────────────────────────────────────────────────────────

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const QUARTERLY_MONTHS = [1, 4, 7, 10];
const HALF_YEARLY_MONTHS = [4, 10];
const ANNUAL_SEPT = [9];

interface TemplateItem {
  particulars: CategoryName;
  work: string;
  category: CategoryName;
  /** Calendar day the deliverable is due (always interpreted in the
   *  applicable month). Quarterly / Half-Yearly / Annual rows fall on
   *  this day in the months listed in `applicableMonths`. */
  dayOfMonth: number;
  frequency: Frequency;
  /** Calendar months (1–12) where this row appears on the checklist. */
  applicableMonths: number[];
  /** Who the row is assigned to by default. Manager-owned items are the
   *  ones the Manager is directly accountable for filing/reviewing;
   *  Executive-owned items are the routine data-entry tasks the Manager
   *  has already delegated. The HOD is never a default owner. */
  defaultRole: Exclude<Role, 'HOD'>;
}

const TEMPLATE: TemplateItem[] = [
  // ─── Monthly tasks (sorted by due day for HOD scan-readability) ───
  { particulars: 'BOA',         work: 'Data received from the client',                                 category: 'BOA',         dayOfMonth: 3,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'E invoice',   work: 'E-Invoicing closed for the previous month',                     category: 'E invoice',   dayOfMonth: 3,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'ISD',         work: "ISD Registration if more than 1 GST No's",                     category: 'ISD',         dayOfMonth: 3,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'TDS',         work: 'TDS / TCS - Payment',                                           category: 'TDS',         dayOfMonth: 7,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'TDS',         work: 'TDS Knock-off Entries until previous month',                    category: 'TDS',         dayOfMonth: 7,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'GST',         work: 'GSTR-8 return filing: Aggregator TCS filing',                   category: 'GST',         dayOfMonth: 8,  frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'TCS Reco',    work: 'GSTR-1 working reconciliation with GST TCS',                    category: 'TCS Reco',    dayOfMonth: 11, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'GST',         work: 'GSTR-1 monthly return',                                         category: 'GST',         dayOfMonth: 11, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'GST',         work: 'GSTR-IFF quarterly return filing',                              category: 'GST',         dayOfMonth: 13, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'ISD',         work: 'ISD Return Filing (GSTR-6)',                                    category: 'ISD',         dayOfMonth: 13, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'PF',          work: 'PF - Payment and return filing',                                category: 'PF',          dayOfMonth: 15, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'ESIC',        work: 'ESIC - Payment and return filing',                              category: 'ESIC',        dayOfMonth: 15, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'MIS',         work: 'Monthly MIS Report shared with client',                         category: 'MIS',         dayOfMonth: 15, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'GST',         work: 'GSTR-2B reconciliation via IMS (Invoice Management System)',    category: 'GST',         dayOfMonth: 16, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'GST',         work: 'Vendor Defaulter List & Pending Booking shared with client',    category: 'GST',         dayOfMonth: 16, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'GST',         work: 'GSTR-1A amendment return (to match Sales BOA vs R1)',           category: 'GST',         dayOfMonth: 19, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'GST',         work: 'GSTR-3B return - Payment and filing',                           category: 'GST',         dayOfMonth: 20, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'GST',         work: 'GSTR-3B return for QRMP (Quarterly Return - Monthly Payment)',  category: 'GST',         dayOfMonth: 25, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Manager'   },
  { particulars: 'Reco',        work: 'E-commerce reconciliation for all portals',                     category: 'Reco',        dayOfMonth: 25, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'BOA',         work: 'Books updation and zero suspense standing in books',            category: 'BOA',         dayOfMonth: 25, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'GST',         work: 'GST Knock-off Entries until previous month',                    category: 'GST',         dayOfMonth: 26, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  { particulars: 'PT',          work: 'Monthly PT Payment and return filing',                          category: 'PT',          dayOfMonth: 28, frequency: 'Monthly',     applicableMonths: ALL_MONTHS,         defaultRole: 'Executive' },
  // ─── Quarterly tasks (calendar Q-ends: Jan/Apr/Jul/Oct) ───
  { particulars: 'Advance Tax', work: 'Advance Tax Payment',                                           category: 'Advance Tax', dayOfMonth: 15, frequency: 'Quarterly',   applicableMonths: QUARTERLY_MONTHS,   defaultRole: 'Manager'   },
  { particulars: 'IT',          work: '26AS Reconciliation',                                           category: 'IT',          dayOfMonth: 30, frequency: 'Quarterly',   applicableMonths: QUARTERLY_MONTHS,   defaultRole: 'Manager'   },
  { particulars: 'TDS Return',  work: 'TDS Return',                                                    category: 'TDS Return',  dayOfMonth: 30, frequency: 'Quarterly',   applicableMonths: QUARTERLY_MONTHS,   defaultRole: 'Manager'   },
  { particulars: 'BOA',         work: 'Review of BOA with the above points',                           category: 'BOA',         dayOfMonth: 30, frequency: 'Quarterly',   applicableMonths: QUARTERLY_MONTHS,   defaultRole: 'Manager'   },
  // ─── Half-Yearly task ───
  { particulars: 'MSME',        work: 'MSME Filing',                                                   category: 'MSME',        dayOfMonth: 30, frequency: 'Annually',    applicableMonths: HALF_YEARLY_MONTHS, defaultRole: 'Manager'   },
  // ─── Annual task ───
  { particulars: 'Income Tax',  work: 'ITR filing (Individuals and Non-audit cases)',                  category: 'Income Tax',  dayOfMonth: 15, frequency: 'Annually',    applicableMonths: ANNUAL_SEPT,        defaultRole: 'Manager'   },
];

/** Translate a legacy 0/1 bitmask into a "% done" target so each business's
 *  existing seed string keeps its original semantics under the new
 *  variable-length checklist. A pattern with seven 1s in ten characters
 *  → 70% of items done in the current month. */
function patternToDonePct(pattern: string): number {
  if (!pattern.length) return 100;
  const ones = pattern.split('').filter(c => c === '1').length;
  return Math.round((ones / pattern.length) * 100);
}

/** Build the (variable-length) checklist for one (business, month).
 *
 *  Items are filtered by `applicableMonths` so quarterly / half-yearly /
 *  annual rows only appear in the months they actually apply. Status is
 *  computed deterministically from a (prefix, month, work) hash so the
 *  same business renders the same pattern across renders without any
 *  "flicker" between done/pending. */
function buildSnapshot(month: string, prefix: string, donePct: number, team: TeamMember[]): MonthSnapshot {
  const monthDate = new Date(month);
  const yyyy = monthDate.getFullYear();
  const mm = monthDate.getMonth();
  const monthIdx = mm + 1;
  const applicable = TEMPLATE.filter(t => t.applicableMonths.includes(monthIdx));
  return {
    month,
    items: applicable.map((t, idx) => {
      const due = new Date(yyyy, mm, t.dayOfMonth);
      const seed = (prefix + month + t.work)
        .split('')
        .reduce((s, c) => s + c.charCodeAt(0), 0);
      const isDone = (seed % 100) < donePct;
      return {
        id: `${prefix}-${month}-${idx}`,
        particulars: t.particulars,
        work: t.work,
        category: t.category,
        frequency: t.frequency,
        dueDate: due.toISOString().slice(0, 10),
        status: isDone ? 'Completed' : 'Pending',
        assignee: defaultAssignee(team, t.defaultRole, seed),
      };
    }),
  };
}

/** 12-month history: Jun 2025 → May 2026 (current).
 *
 *  Real compliance teams miss the odd deadline — quarter-ends, holiday
 *  weeks, ITR season — and a 100%-clean strip looks fake. The
 *  thresholds below are tuned to a realistic Indian A&T cadence:
 *
 *    • Apr 2026  →  95%   recovery after the March crunch — a couple
 *                         of Q4 advance-tax / TDS-return items slip.
 *    • Mar 2026  →  82%   year-end pressure (audit + 4-Q wrap-up)
 *    • Feb 2026  → 100%   typical month, clean
 *    • Jan 2026  →  90%   post-holiday catch-up: 1–2 items slip
 *    • Dec 2025  →  93%   holiday-week dip
 *    • Nov 2025  → 100%   typical month, clean
 *    • Oct 2025  →  88%   festive-season slowdown (Diwali week)
 *    • Sep 2025  →  92%   ITR cutoff strain
 *    • Aug 2025  → 100%   typical month, clean
 *    • Jul 2025  →  94%   monsoon / new-FY ramp-up
 *    • Jun 2025  → 100%   typical month, clean
 *
 *  Status is derived deterministically from each item's seed so the
 *  same business produces the same pattern across renders. */
function buildHistory(prefix: string, currentPattern: string, team: TeamMember[]): MonthSnapshot[] {
  const currentDonePct = patternToDonePct(currentPattern);
  const months = [
    { iso: '2026-05-01', donePct: currentDonePct },
    { iso: '2026-04-01', donePct: 95  }, // post-crunch recovery, a few slips
    { iso: '2026-03-01', donePct: 82  }, // year-end miss — biggest pressure
    { iso: '2026-02-01', donePct: 100 },
    { iso: '2026-01-01', donePct: 90  }, // post-holiday catch-up
    { iso: '2025-12-01', donePct: 93  }, // holiday-week dip
    { iso: '2025-11-01', donePct: 100 },
    { iso: '2025-10-01', donePct: 88  }, // Diwali week slowdown
    { iso: '2025-09-01', donePct: 92  }, // ITR cutoff strain
    { iso: '2025-08-01', donePct: 100 },
    { iso: '2025-07-01', donePct: 94  }, // monsoon / new-FY ramp-up
    { iso: '2025-06-01', donePct: 100 },
  ];
  return months.map(m => buildSnapshot(m.iso, prefix, m.donePct, team));
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS — 60 total (6 multi-business + 54 single-business)
// ─────────────────────────────────────────────────────────────────────────────

export const clients: Client[] = [
  // Multi-business clients
  {
    id: 'c001', name: 'Patel Group',
    team: teamFor(['ZS', 'RD', 'SP', 'VS']),
    businesses: [
      { id: 'b001', name: 'Patel Constructions', type: 'Non E-Commerce', gstNumber: '27AABCP1001A1Z1', history: buildHistory('p1c', '1110111100', teamFor(['ZS','RD','SP','VS'])) },
      { id: 'b002', name: 'Patel Realty',        type: 'Non E-Commerce', gstNumber: '27AABCP1002A1Z2', history: buildHistory('p1r', '1111111111', teamFor(['ZS','RD','SP','VS'])) },
      { id: 'b003', name: 'Patel Trading Co',    type: 'Non E-Commerce', gstNumber: '27AABCP1003A1Z3', history: buildHistory('p1t', '1100110100', teamFor(['ZS','RD','SP','VS'])) },
      { id: 'b004', name: 'Patel Industries',    type: 'Non E-Commerce', gstNumber: '27AABCP1004A1Z4', history: buildHistory('p1i', '0110010100', teamFor(['ZS','RD','SP','VS'])) },
    ],
  },
  {
    id: 'c002', name: 'Bilawala Group',
    team: teamFor(['IQ', 'NA', 'DJ', 'RG']),
    businesses: [
      { id: 'b005', name: 'Bilawala & Co (Heena)', type: 'Non E-Commerce', gstNumber: '27AABCB1005A1Z5', history: buildHistory('bh', '1010100110', teamFor(['IQ','NA','DJ','RG'])) },
      { id: 'b006', name: 'Bilawala & Co (Ayaz)',  type: 'Non E-Commerce', gstNumber: '27AABCB1006A1Z6', history: buildHistory('ba', '1111101111', teamFor(['IQ','NA','DJ','RG'])) },
    ],
  },
  {
    id: 'c003', name: 'FRR Group',
    team: teamFor(['ZS', 'RD', 'AK', 'PJ']),
    businesses: [
      { id: 'b007', name: 'FRR',             type: 'Non E-Commerce', gstNumber: '27AABCF1007A1Z7', history: buildHistory('fr1', '1111111100', teamFor(['ZS','RD','AK','PJ'])) },
      { id: 'b008', name: 'FRR (BLOGS)',     type: 'E-Commerce',     gstNumber: '27AABCF1008A1Z8', history: buildHistory('fr2', '0010100010', teamFor(['ZS','RD','AK','PJ'])) },
      { id: 'b009', name: 'FRR (JAY + ADI)', type: 'Non E-Commerce', gstNumber: '27AABCF1009A1Z9', history: buildHistory('fr3', '1100110100', teamFor(['ZS','RD','AK','PJ'])) },
    ],
  },
  {
    id: 'c004', name: 'Atlas Group',
    team: teamFor(['ZS', 'NA', 'RS', 'AV']),
    businesses: [
      { id: 'b010', name: 'Atlas Capital',     type: 'Non E-Commerce', gstNumber: '27AABCA1010A1Z0', history: buildHistory('at1', '1111111110', teamFor(['ZS','NA','RS','AV'])) },
      { id: 'b011', name: 'Atlas Investments', type: 'Non E-Commerce', gstNumber: '27AABCA1011A1Z1', history: buildHistory('at2', '1111110111', teamFor(['ZS','NA','RS','AV'])) },
    ],
  },
  {
    id: 'c005', name: 'Mehta Family Office',
    team: teamFor(['IQ', 'RD', 'SP', 'VS', 'PJ']),
    businesses: [
      { id: 'b012', name: 'Mehta Jewellers', type: 'E-Commerce',     gstNumber: '27AABCM1012A1Z2', history: buildHistory('mh1', '1111110111', teamFor(['IQ','RD','SP','VS','PJ'])) },
      { id: 'b013', name: 'Mehta Holdings',  type: 'Non E-Commerce', gstNumber: '27AABCM1013A1Z3', history: buildHistory('mh2', '1111111101', teamFor(['IQ','RD','SP','VS','PJ'])) },
      { id: 'b014', name: 'Mehta Realty',    type: 'Non E-Commerce', gstNumber: '27AABCM1014A1Z4', history: buildHistory('mh3', '1110111110', teamFor(['IQ','RD','SP','VS','PJ'])) },
    ],
  },
  {
    id: 'c006', name: 'Rama Hospitality',
    team: teamFor(['ZS', 'NA', 'AK', 'RG']),
    businesses: [
      { id: 'b015', name: 'Rama Hotels',      type: 'E-Commerce', gstNumber: '27AABCR1015A1Z5', history: buildHistory('rh1', '1111111111', teamFor(['ZS','NA','AK','RG'])) },
      { id: 'b016', name: 'Rama Restaurants', type: 'E-Commerce', gstNumber: '27AABCR1016A1Z6', history: buildHistory('rh2', '1111111110', teamFor(['ZS','NA','AK','RG'])) },
    ],
  },
];

// ── Single-business clients ─────────────────────────────────────────────────
interface SingleSeed {
  id: string;
  name: string;
  type: BusinessType;
  team: string[];
  pattern: string;
}

const singleSeeds: SingleSeed[] = [
  { id: 'c007', name: '99 Pancakes',          type: 'E-Commerce',     team: ['ZS','RD','SP','VS'], pattern: '1111111111' },
  { id: 'c008', name: 'Anaya Collections',    type: 'E-Commerce',     team: ['ZS','RD','SP','PJ'], pattern: '1111111110' },
  { id: 'c009', name: 'Fundmart India',       type: 'Non E-Commerce', team: ['IQ','NA','DJ','RG'], pattern: '1111111111' },
  { id: 'c010', name: 'Jupiter Consulting',   type: 'Non E-Commerce', team: ['IQ','NA','AK'],      pattern: '1111111111' },
  { id: 'c011', name: 'Horizon Technologies', type: 'Non E-Commerce', team: ['ZS','RD','RS','AV'], pattern: '1111101111' },
  { id: 'c012', name: 'TechCorp India',       type: 'Non E-Commerce', team: ['ZS','RD','SP'],      pattern: '1111111111' },
  { id: 'c013', name: 'Greenfield Exports',   type: 'Non E-Commerce', team: ['IQ','NA','DJ','VS'], pattern: '1111110111' },
  { id: 'c014', name: 'Coastal Realty',       type: 'Non E-Commerce', team: ['ZS','RD','AK','RG'], pattern: '1111110111' },
  { id: 'c015', name: 'PureWell Organics',    type: 'E-Commerce',     team: ['IQ','NA','SP','PJ'], pattern: '1111111110' },
  { id: 'c016', name: 'Dhanraj & Sons',       type: 'Non E-Commerce', team: ['ZS','RD','RS'],      pattern: '1111111111' },
  { id: 'c017', name: 'Saraswati Books',      type: 'E-Commerce',     team: ['ZS','RD','DJ','VS'], pattern: '1111101111' },
  { id: 'c018', name: 'BlueWave Logistics',   type: 'Non E-Commerce', team: ['IQ','NA','AK','AV'], pattern: '1111111101' },
  { id: 'c019', name: 'Aryan Pharmaceuticals',type: 'Non E-Commerce', team: ['ZS','RD','SP'],      pattern: '1111111111' },
  { id: 'c020', name: 'Kavita Garments',      type: 'E-Commerce',     team: ['IQ','NA','RS','PJ'], pattern: '1111111110' },
  { id: 'c021', name: 'Mahalaxmi Traders',    type: 'Non E-Commerce', team: ['ZS','RD','DJ','RG'], pattern: '1110111111' },
  { id: 'c022', name: 'Sahyadri Electronics', type: 'E-Commerce',     team: ['IQ','NA','AK','VS'], pattern: '1111111111' },
  { id: 'c023', name: 'Vasudha Foods',        type: 'E-Commerce',     team: ['ZS','RD','SP','PJ'], pattern: '1111110111' },
  { id: 'c024', name: 'Indus Textiles',       type: 'E-Commerce',     team: ['IQ','NA','RS','AV'], pattern: '1111111110' },
  { id: 'c025', name: 'Pankaj & Associates',  type: 'Non E-Commerce', team: ['IQ','NA','DJ'],      pattern: '1111111111' },
  { id: 'c026', name: 'Shubham Realtors',     type: 'Non E-Commerce', team: ['IQ','NA','AK','RG'], pattern: '1111111101' },
  { id: 'c027', name: 'Trident Auto Parts',   type: 'Non E-Commerce', team: ['ZS','RD','SP','VS'], pattern: '1110111111' },
  { id: 'c028', name: 'Veena Boutique',       type: 'E-Commerce',     team: ['IQ','NA','RS','PJ'], pattern: '1111110111' },
  { id: 'c029', name: 'Yash Industries',      type: 'Non E-Commerce', team: ['ZS','RD','DJ'],      pattern: '1111111111' },
  { id: 'c030', name: 'Zenith Realty',        type: 'Non E-Commerce', team: ['IQ','NA','AK','AV'], pattern: '1111111111' },
  // Behind cohort
  { id: 'c031', name: 'CEO Rules',            type: 'Non E-Commerce', team: ['ZS','RD','SP','VS'], pattern: '1100110100' },
  { id: 'c032', name: 'Green Valley Ent.',    type: 'Non E-Commerce', team: ['IQ','NA','RS','PJ'], pattern: '0110010100' },
  { id: 'c033', name: 'Sahara Constructions', type: 'Non E-Commerce', team: ['IQ','NA','DJ','RG'], pattern: '1010100110' },
  { id: 'c034', name: 'Mira Pharmaceuticals', type: 'Non E-Commerce', team: ['ZS','RD','AK','VS'], pattern: '1100100110' },
  { id: 'c035', name: 'Konark Foods',         type: 'E-Commerce',     team: ['IQ','NA','SP','AV'], pattern: '0110100110' },
  // Fill out
  { id: 'c036', name: 'Saraswati Bakery',     type: 'E-Commerce',     team: ['ZS','RD','SP','VS'], pattern: '1111111111' },
  { id: 'c037', name: 'Glow Cosmetics',       type: 'E-Commerce',     team: ['IQ','NA','RS','PJ'], pattern: '1111111110' },
  { id: 'c038', name: 'Aroma Cafe Co',        type: 'E-Commerce',     team: ['ZS','RD','DJ','RG'], pattern: '1111111111' },
  { id: 'c039', name: 'Naya Threads',         type: 'E-Commerce',     team: ['IQ','NA','AK','VS'], pattern: '1111110111' },
  { id: 'c040', name: 'Brewberry Coffee',     type: 'E-Commerce',     team: ['ZS','RD','SP','AV'], pattern: '1111111101' },
  { id: 'c041', name: 'Bombay Crockery',      type: 'E-Commerce',     team: ['IQ','NA','RS','PJ'], pattern: '1111111110' },
  { id: 'c042', name: 'Sundari Sarees',       type: 'E-Commerce',     team: ['ZS','RD','DJ','RG'], pattern: '1111111111' },
  { id: 'c043', name: 'SnackBox India',       type: 'E-Commerce',     team: ['IQ','NA','AK','VS'], pattern: '1111111110' },
  { id: 'c044', name: 'Goli Soda',            type: 'E-Commerce',     team: ['ZS','RD','SP','AV'], pattern: '1111111111' },
  { id: 'c045', name: 'Pinkberry Yogurt',     type: 'E-Commerce',     team: ['IQ','NA','RS','PJ'], pattern: '1111111111' },
  { id: 'c046', name: 'Tandoor Tales',        type: 'E-Commerce',     team: ['ZS','RD','DJ','RG'], pattern: '1111111111' },
  { id: 'c047', name: 'Madhuri Steels',       type: 'Non E-Commerce', team: ['ZS','RD','AK','VS'], pattern: '1111111110' },
  { id: 'c048', name: 'Vikram Engineering',   type: 'Non E-Commerce', team: ['IQ','NA','SP','AV'], pattern: '1111111111' },
  { id: 'c049', name: 'Pioneer Logistics',    type: 'Non E-Commerce', team: ['ZS','RD','RS','PJ'], pattern: '1111111110' },
  { id: 'c050', name: 'Sapphire Realty',      type: 'Non E-Commerce', team: ['IQ','NA','DJ','RG'], pattern: '1111111111' },
  { id: 'c051', name: 'Akash Constructions',  type: 'Non E-Commerce', team: ['ZS','RD','AK','VS'], pattern: '1111111111' },
  { id: 'c052', name: 'Modi Pharma',          type: 'Non E-Commerce', team: ['IQ','NA','SP','AV'], pattern: '1111111111' },
  { id: 'c053', name: 'Ranjana Exports',      type: 'Non E-Commerce', team: ['ZS','RD','RS','PJ'], pattern: '1111111110' },
  { id: 'c054', name: 'Gokul Cement',         type: 'Non E-Commerce', team: ['IQ','NA','DJ','RG'], pattern: '1111111111' },
  { id: 'c055', name: 'Patel Tools',          type: 'Non E-Commerce', team: ['ZS','RD','AK','VS'], pattern: '1100110100' },
  { id: 'c056', name: 'Sushant Pharma',       type: 'Non E-Commerce', team: ['IQ','NA','SP','AV'], pattern: '1010110100' },
  { id: 'c057', name: 'Jindal Steel Trading', type: 'Non E-Commerce', team: ['ZS','RD','RS','PJ'], pattern: '0110100110' },
  { id: 'c058', name: 'Gurukul Coaching',     type: 'Non E-Commerce', team: ['IQ','NA','DJ','RG'], pattern: '1010101100' },
  { id: 'c059', name: 'Shahi Fabrics',        type: 'Non E-Commerce', team: ['ZS','RD','AK','VS'], pattern: '1100110100' },
  { id: 'c060', name: 'EcoBliss Wellness',    type: 'E-Commerce',     team: ['IQ','NA','SP','AV'], pattern: '0110100110' },
];

singleSeeds.forEach((seed, idx) => {
  const team = teamFor(seed.team);
  clients.push({
    id: seed.id,
    name: seed.name,
    team,
    businesses: [{
      id: `b${100 + idx}`,
      name: seed.name,
      type: seed.type,
      gstNumber: `27AABC${seed.id.slice(1).padStart(4, '0').toUpperCase()}A1Z${idx % 10}`,
      history: buildHistory(`s${idx}`, seed.pattern, team),
    }],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE PER CLIENT (for the list view)
// ─────────────────────────────────────────────────────────────────────────────

// One row per (client × business) tuple. Multi-business clients produce
// multiple rows that sort adjacent so the user sees them stacked.
interface BusinessRow {
  client: Client;
  business: Business;
  total: number;
  done: number;
  pending: number;
  overdue: number;
  nextDue: ChecklistItem | null;
  status: RowStatus;
}

function buildBusinessRow(client: Client, business: Business, month: string): BusinessRow {
  const snapshot = business.history.find(s => s.month === month) ?? business.history[0];
  const items = snapshot.items;
  const total = items.length;
  // Completed counts toward "done"; N/A items are skipped from both
  // sides so they don't drag the pending count up. Pending and
  // Pending-from-client both count as pending work for SLA rollups.
  const done = items.filter(i => i.status === 'Completed').length;
  const naCount = items.filter(i => i.status === 'N/A').length;
  const pending = total - done - naCount;
  const isCurrent = month === CURRENT_MONTH;
  // Overdue only matters for the current month; past months either closed
  // clean or carried "missed" items into history.
  const overdue = isCurrent ? items.filter(isOverdueNow).length : 0;
  const pendingItems = items.filter(i => i.status === 'Pending' || i.status === 'Pending from client');
  const nextDue = pendingItems.length === 0
    ? null
    : [...pendingItems].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0];
  const status: RowStatus = isCurrent
    ? (overdue > 0 ? 'Behind' : pending > 0 ? 'Pending' : 'Done')
    : (pending > 0 ? 'Behind' /* "missed" — same red treatment */ : 'Done');
  return { client, business, total, done, pending, overdue, nextDue, status };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface AccountsTaxationProps {
  onBack?: () => void;
}

export function AccountsTaxation(_props: AccountsTaxationProps = {}) {
  void _props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client');
  const businessIdParam = searchParams.get('business');
  const monthParam = searchParams.get('month');
  // Cross-cutting "drilldown" view that escapes the list/detail axis.
  // Currently supports 'overdue' (full-screen list of every overdue
  // item across the book) — promoted out of the StoryDrawer because
  // overdue is a triage page in its own right, not a side panel.
  const viewParam = searchParams.get('view');

  // Build href helper that preserves unrelated params (e.g. SuperAdminHome's tab=&sub=).
  const buildHref = (set: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(set)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const goTo = (set: Record<string, string | null>) => router.push(buildHref(set), { scroll: false });

  // Active month — defaults to the current month. URL-driven so the same
  // ?month= param works for both the list and the detail view.
  const activeMonth = monthParam ?? CURRENT_MONTH;

  // Drilldown view takes precedence — it's its own page, not a sub-state
  // of the list. Currently the only supported value is 'overdue'.
  if (viewParam === 'overdue') {
    return (
      <OverdueView
        onBack={() => goTo({ view: null })}
      />
    );
  }
  if (viewParam === 'this-week') {
    return (
      <DueThisWeekView
        onBack={() => goTo({ view: null })}
      />
    );
  }
  if (viewParam === 'team') {
    // Embed the same task screen the workspace shows for the Brego
    // Delivery Team A&T client group, but keep the user inside the
    // Deliverables module (URL stays at ?tab=accounts-taxation&sub=
    // deliverables&view=team — no jump to /workspace/...).
    return (
      <TaskManagement
        initialProjectId="at"
        initialClientGroupId="cg-bdt-at"
        onBack={() => goTo({ view: null })}
      />
    );
  }

  // Detail view if clientId is set and resolves to a real client.
  const detailClient = clientId ? clients.find(c => c.id === clientId) : null;

  if (detailClient) {
    return (
      <ClientDetailView
        client={detailClient}
        businessIdParam={businessIdParam}
        activeMonth={activeMonth}
        onBack={() => goTo({ client: null, business: null, month: null })}
        onMonthChange={(m) => goTo({ month: m })}
      />
    );
  }

  return (
    <ListView
      activeMonth={activeMonth}
      onMonthChange={(m) => goTo({ month: m === CURRENT_MONTH ? null : m })}
      onOpenBusiness={(clientId, businessId) => goTo({ client: clientId, business: businessId, month: null })}
      onOpenOverdue={() => goTo({ view: 'overdue' })}
      onOpenThisWeek={() => goTo({ view: 'this-week' })}
      onOpenBregoTeam={() => goTo({ view: 'team' })}
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LIST VIEW
// ═════════════════════════════════════════════════════════════════════════════

function ListView({
  activeMonth, onMonthChange, onOpenBusiness, onOpenOverdue, onOpenThisWeek, onOpenBregoTeam,
}: {
  activeMonth: string;
  onMonthChange: (month: string) => void;
  onOpenBusiness: (clientId: string, businessId: string) => void;
  onOpenOverdue: () => void;
  onOpenThisWeek: () => void;
  onOpenBregoTeam: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const isCurrent = isCurrentMonth(activeMonth);

  // ── TDS / GST quick-info drawers ──
  // Each row's 3-dots menu can open one of two side drawers that hold
  // per-business credentials and inline statuses (TAN / GSTN / portal
  // login + per-section progress for GST). Edits are kept in-memory in
  // a Map keyed by business id so reopening the drawer for the same
  // business surfaces what was last saved without a backend round-trip.
  const [tdsForBusinessId,  setTdsForBusinessId]  = useState<string | null>(null);
  const [gstForBusinessId,  setGstForBusinessId]  = useState<string | null>(null);
  const [ptForBusinessId,   setPtForBusinessId]   = useState<string | null>(null);
  const [itForBusinessId,   setItForBusinessId]   = useState<string | null>(null);
  const [ecomForBusinessId, setEcomForBusinessId] = useState<string | null>(null);
  const [tdsRecords,  setTdsRecords]  = useState<Record<string, TdsRecord>>({});
  const [gstRecords,  setGstRecords]  = useState<Record<string, GstRecord>>({});
  const [ptRecords,   setPtRecords]   = useState<Record<string, PtRecord >>({});
  const [itRecords,   setItRecords]   = useState<Record<string, IncomeTaxRecord>>({});
  const [ecomRecords, setEcomRecords] = useState<Record<string, EcomRecoRecord>>({});

  // Pagination — keeps the table tidy when the roster grows. Page size
  // is user-selectable; page resets to 1 whenever the upstream filter
  // (search / status / month) changes so we never strand the user on a
  // page that no longer exists.
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  // One row per (client × business). Multi-business clients produce stacked
  // rows. We pre-compute the per-client worst-status to keep multi-business
  // clients grouped together at the top of the most-urgent section.
  const allBusinessRows = useMemo(
    () => clients.flatMap(c => c.businesses.map(b => buildBusinessRow(c, b, activeMonth))),
    [activeMonth]
  );

  // For sorting: a client is "as bad as" its worst business in the active month.
  const clientWorstStatus = useMemo(() => {
    const ord: Record<RowStatus, number> = { Behind: 0, Pending: 1, Done: 2 };
    const map = new Map<string, RowStatus>();
    for (const r of allBusinessRows) {
      const prev = map.get(r.client.id);
      if (!prev || ord[r.status] < ord[prev]) map.set(r.client.id, r.status);
    }
    return map;
  }, [allBusinessRows]);

  const counts = useMemo(() => ({
    all: allBusinessRows.length,
    behind: allBusinessRows.filter(r => r.status === 'Behind').length,
    done: allBusinessRows.filter(r => r.status === 'Done').length,
  }), [allBusinessRows]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = allBusinessRows.filter(r => {
      if (q) {
        const matchClient = r.client.name.toLowerCase().includes(q);
        const matchBiz = r.business.name.toLowerCase().includes(q);
        if (!matchClient && !matchBiz) return false;
      }
      if (statusFilter === 'Behind' && r.status !== 'Behind') return false;
      if (statusFilter === 'Done' && r.status !== 'Done') return false;
      return true;
    });
    const ord: Record<RowStatus, number> = { Behind: 0, Pending: 1, Done: 2 };
    // Sort: worst-client-status first (so all of Patel Group's businesses rise
    // to the top together if any one is Behind), then alphabetically by client
    // (groups multi-business adjacently), then by row's own status, then by
    // due date.
    filtered = [...filtered].sort((a, b) => {
      const aw = ord[clientWorstStatus.get(a.client.id) ?? 'Done'];
      const bw = ord[clientWorstStatus.get(b.client.id) ?? 'Done'];
      if (aw !== bw) return aw - bw;
      if (a.client.name !== b.client.name) return a.client.name.localeCompare(b.client.name);
      if (a.status !== b.status) return ord[a.status] - ord[b.status];
      const aDue = a.nextDue ? daysUntil(a.nextDue.dueDate) : Number.POSITIVE_INFINITY;
      const bDue = b.nextDue ? daysUntil(b.nextDue.dueDate) : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
    return filtered;
  }, [search, statusFilter, allBusinessRows, clientWorstStatus]);

  // Reset to page 1 when the filtered set shrinks below the current page,
  // or when filters change (search / status / month). Looking at length is
  // sufficient — we don't need to deep-compare row identities.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, activeMonth, pageSize]);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, totalRows);
  const pagedRows = useMemo(() => rows.slice(pageStart, pageEnd), [rows, pageStart, pageEnd]);

  const monthIdx = monthFromISO(activeMonth);
  const totalBusinesses = clients.reduce((s, c) => s + c.businesses.length, 0);

  return (
    <div className="-mx-8 -mt-6">
      {/* ── Sticky top bar — matches PM workspace chrome (h2 title, count
          subtitle, vertical divider, MonthNavigator, search + segmented
          filter on the right). Pinned with `top-0` so the bar locks
          flush with the scroll container's top — `-top-6` would push the
          pinned bar 24 px above the visible area and let body content
          scroll into the exposed gap. ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-30 px-6">
        <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
          {/* Left: title + counts + divider + month nav */}
          <div className="flex items-center gap-4 shrink-0">
            <div>
              <p className="text-black/90 text-body font-semibold">Recurring Checklist</p>
              <p className="text-black/60 mt-0.5 text-caption font-normal">
                {clients.length} clients
                <span className="text-black/30 mx-1.5">·</span>
                {totalBusinesses} businesses
              </p>
            </div>
            <div className="w-px h-8 bg-black/[0.08]" aria-hidden="true" />
            <MonthNavigator
              monthIdx={monthIdx.idx}
              year={monthIdx.year}
              onMonthChange={(m) => onMonthChange(monthToISO(m, monthIdx.year))}
              onYearChange={(y) => onMonthChange(monthToISO(monthIdx.idx, y))}
              minYear={2025}
            />
            {/* Period pill — same component the Reporting banner uses.
                Renders contextually based on the active month:
                  • Current month → "Days left in May: 26" (amber)
                  • Past month    → "Apr 2026 — Closed" (slate)
                  • Future month  → "Jun 2026 — Upcoming" (blue)
                Replaces the older "Read-only history" tag, which is
                obsolete now that past months are fully editable. */}
            <PeriodLabel monthIdx={monthIdx.idx} year={monthIdx.year} />
          </div>

          {/* Right: search + segmented filter + Request Resource CTA.
              All three elements lock to h-9 (36px) so the row reads as a
              single tidy strip — no jagged top/bottom edges. */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative flex items-center w-52 h-9">
              <Search className="absolute left-3 w-4 h-4 text-black/35 pointer-events-none" aria-hidden="true" />
              <label htmlFor="at-search" className="sr-only">Search clients or businesses</label>
              <input
                id="at-search"
                type="text"
                placeholder="Search clients, businesses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-full pl-9 pr-3 bg-[#F6F7FF] border border-black/5 rounded-md placeholder:text-black/35 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-1 focus:ring-[#204CC7]/10 transition-all text-caption font-normal"
              />
            </div>

            {/* Status filter — dropdown matching the rest of the
                Customers section's chrome. Counts surface inline in
                each option so the HOD reads the bucket size before
                committing. The "Behind" label flips to "Missed" on
                past months (same data, period-appropriate wording). */}
            <div className="relative">
              <label htmlFor="deliverables-status-filter" className="sr-only">Filter by status</label>
              <select
                id="deliverables-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All status · {counts.all}</option>
                <option value="Behind">{isCurrent ? 'Behind' : 'Missed'} · {counts.behind}</option>
                <option value="Done">Done · {counts.done}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Request Resource — primary CTA, brand-blue solid. Opens
                the same modal form as the +New Request CTA on the
                Resource Request page. Submission writes through the
                shared resource-requests store, so a request raised here
                shows up there too. */}
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Request Resource
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* ── Story widgets — above the table so the user reads the
            day's headlines first, then drills into the per-client roster. */}
        <StoryWidgets
          rows={allBusinessRows}
          isCurrent={isCurrent}
          onOpenOverdue={onOpenOverdue}
          onOpenThisWeek={onOpenThisWeek}
          onOpenBregoTeam={onOpenBregoTeam}
        />

        {/* Table — the per-business roster, sits below the story. */}
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden mt-8">
          <table className="w-full" role="table" aria-label="A&T client deliverables">
            <thead>
              {/* Header row — same density and weight as the Reporting
                  (Dashboard) module table: `bg-[#FAFBFC]` strip,
                  `text-[11px] tracking-wider`, `py-3`, and a
                  `px-5 / px-4` cadence (px-5 on the first + last cell
                  for edge breathing, px-4 on every middle cell). */}
              <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[34%]">Client</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[140px]">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[170px]">Next due</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[150px]">Team</th>
                <th scope="col" className="px-5 py-3 text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider w-[56px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {totalRows === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-caption text-black/45">
                    No matching businesses.
                  </td>
                </tr>
              )}
              {pagedRows.map((r) => {
                // Each row is a single business. Show the business name as
                // the primary label and the parent client name as a caption
                // beneath it whenever the two strings differ (i.e. on every
                // multi-business client row, and on single-business clients
                // where the legal entity is named differently from the
                // client). For single-business clients where the business
                // name == client name, we suppress the duplicate caption to
                // keep the row visually clean.
                const showClientCaption = r.business.name !== r.client.name;
                return (
                  <tr
                    key={r.business.id}
                    onClick={() => onOpenBusiness(r.client.id, r.business.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenBusiness(r.client.id, r.business.id); } }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${r.business.name}${showClientCaption ? ` (${r.client.name})` : ''}: ${rowStatusLabel(r)}. Activate to open.`}
                    // Fixed `h-[60px]` matches the Reporting / Dashboard
                    // table: tight enough to read as a roster, tall
                    // enough to fit the optional client caption under
                    // the business name without overflow. Vertical
                    // centering comes from the table cell's default
                    // `vertical-align: middle`, so cells don't need an
                    // explicit `py-` value.
                    className="group h-[60px] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-[#F4F6FF]"
                  >
                    <td className="px-5">
                      <div className="text-body font-medium text-black/85 leading-tight">{r.business.name}</div>
                      {showClientCaption && (
                        <div className="text-caption text-black/45 mt-0.5 leading-tight">{r.client.name}</div>
                      )}
                    </td>
                    <td className="px-4"><TypeTag type={r.business.type} /></td>
                    <td className="px-4"><StatusPill row={r} /></td>
                    <td className="px-4"><NextDueCell row={r} /></td>
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <TeamPopover team={r.client.team} />
                    </td>
                    <td className="px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        businessName={r.business.name}
                        businessType={r.business.type}
                        onOpenTds={() => setTdsForBusinessId(r.business.id)}
                        onOpenGst={() => setGstForBusinessId(r.business.id)}
                        onOpenPt={() => setPtForBusinessId(r.business.id)}
                        onOpenIt={() => setItForBusinessId(r.business.id)}
                        onOpenEcom={() => setEcomForBusinessId(r.business.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/*
            Pagination footer — sits inside the same rounded card as the
            table so the chrome stays continuous. Hidden when there's
            nothing to paginate. Page-size dropdown on the left, range
            indicator + prev/next on the right.
          */}
          {totalRows > 0 && (
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-black/[0.06] bg-white">
              <div className="flex items-center gap-2">
                <label htmlFor="at-page-size" className="text-caption text-black/55">Rows per page</label>
                <div className="relative">
                  <select
                    id="at-page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="appearance-none bg-white pl-2.5 pr-7 py-1 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer tabular-nums"
                  >
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-3 h-3 rotate-90 text-black/55 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  role="status"
                  aria-live="polite"
                  className="text-caption text-black/65 tabular-nums"
                >
                  <span className="text-black/85 font-semibold">{pageStart + 1}</span>
                  –
                  <span className="text-black/85 font-semibold">{pageEnd}</span>
                  <span className="text-black/55"> of </span>
                  <span className="text-black/85 font-semibold">{totalRows}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-black/10 text-black/65 bg-white hover:bg-black/[0.02] hover:text-black/85 hover:border-black/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-black/10 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <span className="text-caption text-black/65 tabular-nums px-1.5">
                    Page <span className="text-black/85 font-semibold">{safePage}</span> of <span className="text-black/85 font-semibold">{totalPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    aria-label="Next page"
                    className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-black/10 text-black/65 bg-white hover:bg-black/[0.02] hover:text-black/85 hover:border-black/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-black/10 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
                  >
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*
        Resource Request modal — same component used by the Resource
        Request page. Submitting from here writes to the shared store
        so the new entry shows up in the Resource Request table the
        next time someone navigates there.
      */}
      <NewResourceRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
      />

      {/* TDS / GST drawers — opened from each row's 3-dots menu. The
          parent row's `onClick={(e) => e.stopPropagation()}` on the
          containing <td> stops the row's "open business" handler from
          firing when the menu / drawer is interacted with. Drawer
          state lives at this level so a single drawer renders at a
          time, regardless of which row was the trigger. */}
      {tdsForBusinessId && (() => {
        const row = allBusinessRows.find(r => r.business.id === tdsForBusinessId);
        if (!row) return null;
        return (
          <TdsDrawer
            client={row.client}
            business={row.business}
            value={tdsRecords[tdsForBusinessId]}
            onChange={(v) => setTdsRecords(prev => ({ ...prev, [tdsForBusinessId]: v }))}
            onClose={() => setTdsForBusinessId(null)}
          />
        );
      })()}
      {gstForBusinessId && (() => {
        const row = allBusinessRows.find(r => r.business.id === gstForBusinessId);
        if (!row) return null;
        return (
          <GstDrawer
            client={row.client}
            business={row.business}
            value={gstRecords[gstForBusinessId]}
            onChange={(v) => setGstRecords(prev => ({ ...prev, [gstForBusinessId]: v }))}
            onClose={() => setGstForBusinessId(null)}
          />
        );
      })()}
      {ptForBusinessId && (() => {
        const row = allBusinessRows.find(r => r.business.id === ptForBusinessId);
        if (!row) return null;
        return (
          <PtDrawer
            client={row.client}
            business={row.business}
            value={ptRecords[ptForBusinessId]}
            onChange={(v) => setPtRecords(prev => ({ ...prev, [ptForBusinessId]: v }))}
            onClose={() => setPtForBusinessId(null)}
          />
        );
      })()}
      {itForBusinessId && (() => {
        const row = allBusinessRows.find(r => r.business.id === itForBusinessId);
        if (!row) return null;
        return (
          <IncomeTaxDrawer
            client={row.client}
            business={row.business}
            value={itRecords[itForBusinessId]}
            onChange={(v) => setItRecords(prev => ({ ...prev, [itForBusinessId]: v }))}
            onClose={() => setItForBusinessId(null)}
          />
        );
      })()}
      {ecomForBusinessId && (() => {
        const row = allBusinessRows.find(r => r.business.id === ecomForBusinessId);
        if (!row) return null;
        return (
          <EcomRecoDrawer
            client={row.client}
            business={row.business}
            value={ecomRecords[ecomForBusinessId]}
            onChange={(v) => setEcomRecords(prev => ({ ...prev, [ecomForBusinessId]: v }))}
            onClose={() => setEcomForBusinessId(null)}
          />
        );
      })()}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT DETAIL VIEW (full-page replacement for the drawer)
// ═════════════════════════════════════════════════════════════════════════════

function ClientDetailView({
  client, businessIdParam, activeMonth, onBack, onMonthChange,
}: {
  client: Client;
  businessIdParam: string | null;
  activeMonth: string;
  onBack: () => void;
  onMonthChange: (month: string) => void;
}) {
  // Resolve active business; the month comes from the parent (URL-driven).
  const activeBusiness =
    client.businesses.find(b => b.id === businessIdParam) ?? client.businesses[0];
  const activeSnapshot =
    activeBusiness.history.find(s => s.month === activeMonth) ?? activeBusiness.history[0];
  const isCurrent = isCurrentMonth(activeSnapshot.month);
  const monthIdx = monthFromISO(activeSnapshot.month);

  // Per-row edit overrides. Past months stay editable too — real
  // teams correct history (a row was actually completed but never
  // marked, an assignee changed retroactively, a quarterly was
  // misclassified as monthly) and locking history forces them out
  // to spreadsheets. Drafts are session-only; reload starts fresh.
  const [draftStatus, setDraftStatus] = useState<Record<string, ChecklistStatus>>({});
  const [draftAssignee, setDraftAssignee] = useState<Record<string, string>>({});
  const [draftFrequency, setDraftFrequency] = useState<Record<string, Frequency>>({});

  // ── Custom rows added by an admin via "+ Add row" ──
  // Keyed by `${businessId}-${month}` so each business+month has its
  // own list of additions and they don't bleed across snapshots.
  // Session-only: reload starts fresh, same convention as the drafts
  // above. New rows merge into the `items` memo below so they show
  // up in the table, count toward summary tallies, get filtered, and
  // accept the same status/assignee/frequency overrides as seed rows.
  const customsKey = `${activeBusiness.id}-${activeSnapshot.month}`;
  const [customItems, setCustomItems] = useState<Record<string, ChecklistItem[]>>({});
  // Soft-deletes — same per-key scoping as customItems. Rows here are
  // filtered out of the table, the summary tallies, the workload
  // sidebar, and every downstream widget so a delete is "real" from
  // the admin's perspective. We track the IDs (not the rows) so a
  // seed row that gets deleted re-appears the next month when its
  // template re-instantiates with a fresh ID, which matches how the
  // recurring schedule actually works.
  const [deletedItemIds, setDeletedItemIds] = useState<Record<string, string[]>>({});
  // Inline editor state. `addingRow` toggles between the dashed
  // "+ Add row" trigger and the editable draft row. The draft is
  // re-seeded whenever the editor opens (or after a successful add)
  // so each session starts from a clean baseline tied to the active
  // month.
  const [addingRow, setAddingRow] = useState(false);
  const buildInitialDraft = useCallback(() => ({
    particulars: 'GST' as CategoryName,
    frequency:   'Monthly' as Frequency,
    work:        '',
    // Default due date = 15th of the active month (a neutral middle-
    // of-the-month anchor; admin can change before saving).
    dueDate:     `${activeSnapshot.month.slice(0, 8)}15`,
    assignee:    client.team[0]?.initials ?? '',
    status:      'Pending' as ChecklistStatus,
  }), [activeSnapshot.month, client.team]);
  const [draftRow, setDraftRow] = useState(buildInitialDraft);
  // Per-item note overrides (one open-ended freeform string per item; not a
  // chat thread). When unset, we fall back to the deterministic seed note.
  // Only one row is expanded at a time so the table stays legible.
  const [noteOverrides, setNoteOverrides] = useState<Record<string, string>>({});
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  // Inline assignee switcher state — which row's dropdown is open + the
  // trigger button's bounding rect (for portal positioning).
  const [openAssignee, setOpenAssignee] = useState<{ itemId: string; rect: DOMRect } | null>(null);
  const assigneePopoverRef = useRef<HTMLDivElement | null>(null);

  // Filter state — drives the chrome below the orientation bar. Filters
  // are session-only and reset when the user navigates to a different
  // business or month so a search left active doesn't carry across
  // unrelated views.
  type DetailStatusFilter = 'all' | 'active' | 'overdue' | 'completed';
  const [searchQuery, setSearchQuery] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<DetailStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<Frequency | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');

  // Reset all per-row local state whenever business or month switches.
  useEffect(() => {
    setDraftStatus({});
    setDraftAssignee({});
    setDraftFrequency({});
    setNoteOverrides({});
    setExpandedItem(null);
    setOpenAssignee(null);
    setSearchQuery('');
    setDetailStatusFilter('all');
    setTypeFilter('all');
    setAssigneeFilter('all');
    // Close any open Add-row editor and re-seed its draft for the new
    // active month so the default due date follows. We deliberately
    // do NOT clear `customItems` — rows the admin added stay attached
    // to their (business, month) key and reappear if they navigate
    // back. Only the in-progress editor gets reset.
    setAddingRow(false);
    setDraftRow(buildInitialDraft());
  }, [activeBusiness.id, activeSnapshot.month, buildInitialDraft]);

  // Close the assignee popover on Escape, page-scroll, or window resize.
  // Inner-popover scrolls are filtered out via the ref check so scrolling
  // the option list doesn't dismiss the popover mid-scroll.
  useEffect(() => {
    if (!openAssignee) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenAssignee(null); };
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && assigneePopoverRef.current?.contains(target)) return;
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

  const noteFor = (item: ChecklistItem): string => {
    return noteOverrides[item.id] ?? seedNote(item);
  };

  const saveNote = (itemId: string, text: string) => {
    setNoteOverrides(prev => ({ ...prev, [itemId]: text }));
  };

  // Drafts apply to whichever month is in view — current or past —
  // so the HOD can correct any row in any month. Custom rows added
  // via "+ Add row" land at the end and accept the same overrides
  // (status / assignee / frequency) as seed rows so editing a fresh
  // row behaves identically to editing a built-in one. Soft-deleted
  // rows are filtered out at the end so they disappear from the
  // table and from every downstream tally (summary cards, workload,
  // pulse cards, …) without us having to reach into each one.
  const items = useMemo(() => {
    const apply = (item: ChecklistItem) => ({
      ...item,
      status:    draftStatus[item.id]    ?? item.status,
      assignee:  draftAssignee[item.id]  ?? item.assignee,
      frequency: draftFrequency[item.id] ?? item.frequency,
    });
    const customRows = customItems[customsKey] ?? [];
    const deleted = new Set(deletedItemIds[customsKey] ?? []);
    return [
      ...activeSnapshot.items.map(apply),
      ...customRows.map(apply),
    ].filter(item => !deleted.has(item.id));
  }, [activeSnapshot, draftStatus, draftAssignee, draftFrequency, customItems, customsKey, deletedItemIds]);

  const setStatus = (itemId: string, next: ChecklistStatus) => {
    setDraftStatus(prev => ({ ...prev, [itemId]: next }));
  };

  const updateAssignee = (itemId: string, initials: string) => {
    setDraftAssignee(prev => ({ ...prev, [itemId]: initials }));
  };

  const setFrequency = (itemId: string, next: Frequency) => {
    setDraftFrequency(prev => ({ ...prev, [itemId]: next }));
  };

  // ── Add-row handlers ──
  // Open seeds a fresh draft so the "+ Add row" affordance always
  // begins from a clean slate (work field empty, due date pinned to
  // the active month). Cancel discards the draft. Commit validates
  // (work field is required — every other field has a sensible
  // default) and appends the new row to the customs map, then closes
  // the editor. Generated id namespaces against business + month so
  // it never collides with a seed item.
  const openAddRow = () => {
    setDraftRow(buildInitialDraft());
    setAddingRow(true);
  };
  const cancelAddRow = () => {
    setDraftRow(buildInitialDraft());
    setAddingRow(false);
  };
  // Delete an item — seed or custom — by id. Records the id in the
  // per-(business, month) deleted set, which the `items` memo
  // filters out. No confirmation modal: deletes are session-only and
  // the row vanishes immediately, matching how add/edit feel.
  const deleteItem = (itemId: string) => {
    setDeletedItemIds(prev => {
      const existing = prev[customsKey] ?? [];
      if (existing.includes(itemId)) return prev;
      return { ...prev, [customsKey]: [...existing, itemId] };
    });
  };

  const commitAddRow = () => {
    const work = draftRow.work.trim();
    if (!work) return;
    const newItem: ChecklistItem = {
      id:          `custom-${activeBusiness.id}-${activeSnapshot.month}-${Date.now()}`,
      particulars: draftRow.particulars,
      work,
      category:    draftRow.particulars,
      frequency:   draftRow.frequency,
      dueDate:     draftRow.dueDate,
      status:      draftRow.status,
      assignee:    draftRow.assignee,
    };
    setCustomItems(prev => ({
      ...prev,
      [customsKey]: [...(prev[customsKey] ?? []), newItem],
    }));
    setDraftRow(buildInitialDraft());
    setAddingRow(false);
  };

  // Close the editor on Escape from anywhere on the page so the admin
  // can bail out without reaching for the Cancel button.
  useEffect(() => {
    if (!addingRow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelAddRow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addingRow]);

  // ── Filter pipeline ──
  // The summary cards + workload roll-ups deliberately use the
  // unfiltered `items` so they always reflect the full picture of
  // the month. Filters narrow only the table view below.
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search across particulars + work — case-insensitive substring.
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (
          !item.work.toLowerCase().includes(q) &&
          !item.particulars.toLowerCase().includes(q)
        ) return false;
      }
      // Status pill: All / Active (own + client-side pending) / Overdue / Completed
      if (detailStatusFilter === 'active') {
        if (item.status !== 'Pending' && item.status !== 'Pending from client') return false;
      } else if (detailStatusFilter === 'overdue') {
        if (!isOverdueNow(item)) return false;
      } else if (detailStatusFilter === 'completed') {
        if (item.status !== 'Completed') return false;
      }
      // Type / cadence
      if (typeFilter !== 'all' && item.frequency !== typeFilter) return false;
      // Assignee initials
      if (assigneeFilter !== 'all' && item.assignee !== assigneeFilter) return false;
      return true;
    });
  }, [items, searchQuery, detailStatusFilter, typeFilter, assigneeFilter]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (detailStatusFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (assigneeFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setDetailStatusFilter('all');
    setTypeFilter('all');
    setAssigneeFilter('all');
  };

  // Per-status counts shown next to the segmented pills so the HOD
  // knows how many items each filter will surface before clicking.
  const statusCounts = useMemo(() => {
    const active = items.filter(i => i.status === 'Pending' || i.status === 'Pending from client').length;
    const overdue = items.filter(isOverdueNow).length;
    const completed = items.filter(i => i.status === 'Completed').length;
    return { all: items.length, active, overdue, completed };
  }, [items]);

  // Per-team-member workload for the active business + month. HODs pinned
  // to the top regardless of personal count (they're the accountable
  // owners), then the rest by pending-count descending.
  // Counts: Completed → done; Pending and Pending-from-client → pending;
  // N/A is skipped (not counted on either side).
  const workload = useMemo(() => {
    const counts = new Map<string, { done: number; pending: number }>();
    for (const m of client.team) counts.set(m.initials, { done: 0, pending: 0 });
    for (const item of items) {
      if (item.status === 'N/A') continue;
      const bucket = counts.get(item.assignee);
      if (bucket) bucket[item.status === 'Completed' ? 'done' : 'pending']++;
    }
    const rows = client.team.map(m => ({ member: m, ...(counts.get(m.initials) ?? { done: 0, pending: 0 }) }));
    return rows.sort((a, b) => {
      const aHod = a.member.role === 'HOD' ? 0 : 1;
      const bHod = b.member.role === 'HOD' ? 0 : 1;
      if (aHod !== bHod) return aHod - bHod;
      return b.pending - a.pending;
    });
  }, [client.team, items]);

  const monthHistory = activeBusiness.history;

  // Breakdown drawer — workload or 6-month history. Either opens from a
  // summary card above the table; both are deeper views of data the user
  // glances at in the card but occasionally wants to study in full.
  const [breakdownDrawer, setBreakdownDrawer] = useState<'workload' | 'history' | null>(null);

  // Totals used in the summary cards above the table. Overdue is a
  // current-month concept — past months carry "missed" items in pending
  // state; we only flag them as overdue when viewing the live month.
  const totals = useMemo(() => {
    // Completed → done; N/A items skipped from both sides; remaining
    // are pending. Overdue is a current-month concept derived from
    // due date.
    const done = items.filter(i => i.status === 'Completed').length;
    const naCount = items.filter(i => i.status === 'N/A').length;
    const pending = items.length - done - naCount;
    const overdue = isCurrent ? items.filter(isOverdueNow).length : 0;
    return { done, pending, overdue, total: items.length };
  }, [items, isCurrent]);

  // Clean / missed counts now live inside HistorySummaryCard since
  // the FY strip computes them per-month against the FY's full
  // 12-month window (not just the trailing 6).

  return (
    <div className="-mx-8 -mt-6">
      {/* ── Sticky top bar — minimal single-row: icon-only back, business
          title, MonthNavigator, and team circles on the far right. GST
          and HOD chrome moved into the body so the bar stays a clean
          orientation strip. The "Read-only history" cue collapses into a
          subtle amber tint on the date control itself rather than a
          separate badge.

          Pin uses `top-0` (not `-top-6`) so the bar locks flush with the
          scroll-container's content edge. With `-top-6` the pinned bar
          ends up 24px above the visible area, which lets body content
          scroll into the gap beneath and show *above* the bar — the
          "stuff bleeding through the top" bug. ── */}
      {/* Single seamless top bar — orientation cluster on the left,
          filter cluster on the right, all on one row, all sharing
          the same vertical rhythm. The bar wraps gracefully on
          narrower viewports but on a normal desktop it reads as one
          continuous strip with nothing stacking. */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-30 px-6">
        <div className="flex items-center justify-between gap-3 py-3 flex-wrap">

          {/* ── Left cluster: Back · Title · Month ── */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Recurring Checklist"
              title="Back to Recurring Checklist"
              className="w-9 h-9 rounded-md hover:bg-black/[0.05] flex items-center justify-center text-black/65 hover:text-black/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-black/90 text-h3 font-bold truncate">
              {activeBusiness.name}
              {activeBusiness.name !== client.name && (
                <span className="text-black/55 font-normal ml-1.5">· {client.name}</span>
              )}
            </h1>
            <span className="h-5 w-px bg-black/10 shrink-0" aria-hidden="true" />
            <MonthNavigator
              monthIdx={monthIdx.idx}
              year={monthIdx.year}
              onMonthChange={(m) => onMonthChange(monthToISO(m, monthIdx.year))}
              onYearChange={(y) => onMonthChange(monthToISO(monthIdx.idx, y))}
              minYear={2025}
            />
          </div>

          {/* ── Right cluster: filters + team ─────
              Search → Status pills → Type → Assignee → Clear → Team.
              Same height (h-9) across every control so the row reads
              as one continuous strip with no vertical drift. */}
          <div className="flex items-center gap-2 min-w-0">

            {/* Search */}
            <div className="relative w-[220px]">
              <Search className="w-3.5 h-3.5 text-black/45 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <label htmlFor="deliverable-search" className="sr-only">Search particulars or work</label>
              <input
                id="deliverable-search"
                type="text"
                placeholder="Search items…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-7 pr-7 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/40 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Status dropdown — same four buckets as the segmented
                pills, just as a single select for visual consistency
                with the Type and Assignee filters next to it. */}
            <div className="relative">
              <label htmlFor="deliverable-status-filter" className="sr-only">Filter by status</label>
              <select
                id="deliverable-status-filter"
                value={detailStatusFilter}
                onChange={(e) => setDetailStatusFilter(e.target.value as DetailStatusFilter)}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Done</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Type (frequency) dropdown */}
            <div className="relative">
              <label htmlFor="deliverable-type-filter" className="sr-only">Filter by type</label>
              <select
                id="deliverable-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as Frequency | 'all')}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All types</option>
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Assignee dropdown — driven by the team roster */}
            <div className="relative">
              <label htmlFor="deliverable-assignee-filter" className="sr-only">Filter by assignee</label>
              <select
                id="deliverable-assignee-filter"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All assignees</option>
                {client.team.map(m => (
                  <option key={m.initials} value={m.initials}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Clear chip — surfaces only when ≥1 filter is set. The
                count of active filters lives inside the chip so the
                HOD reads "Clear (3)" as both the affordance and the
                tally. */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 h-9 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Clear ({activeFilterCount})
              </button>
            )}

            {/* Live result count — only renders when a filter narrows
                the view. Inline with the controls so it sits in the
                same eye-line, not stranded on a second row. */}
            {activeFilterCount > 0 && (
              <span className="text-caption text-black/60 tabular-nums" role="status" aria-live="polite">
                <span className="font-semibold text-black/80">{filteredItems.length}</span>/<span className="font-semibold text-black/80">{items.length}</span>
              </span>
            )}

            <span className="h-5 w-px bg-black/10 shrink-0 mx-0.5" aria-hidden="true" />

            {/* Team circles — same TeamPopover the parent list uses */}
            <TeamPopover team={client.team} />
          </div>
        </div>
      </div>

      {/* Body — full-width single column. The table is the hero; a single
          full-width financial-year summary card sits on top to give the
          HOD a one-glance read of how the year has tracked. The whole
          page reads top-to-bottom: checklist header → FY strip → data. */}
      <div className="px-6 py-6">
        {/* FY summary — full-width card with a 12-dot strip spanning
            the entire financial year (Apr → Mar). Past months render
            as clean / missed; the current month gets the active ring;
            future months render as muted placeholders. */}
        <div className="mb-5">
          <HistorySummaryCard
            history={monthHistory}
            activeMonth={activeSnapshot.month}
            onOpen={() => setBreakdownDrawer('history')}
          />
        </div>

        {/* Body header — GST + read-only state + checklist progress in a
            single caption-weight strip above the table. */}
        <div className="mb-3 flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <h2 className="text-body font-bold text-black/85">
              {fmtMonthLong(activeSnapshot.month)} checklist
            </h2>
            <span className="text-caption text-black/60 font-mono">
              · GST {activeBusiness.gstNumber}
            </span>
          </div>
          <span className="text-caption text-black/60 tabular-nums">
            {totals.done} of {totals.total} done
          </span>
        </div>

        {/* Checklist — full-width 7-column table:
              Particulars | Type | Work | Due Date | Assigned to | Status | Comments
            "Type" (recurrence cadence) sits right after Particulars so
            the HOD reads each row as "[bucket] [cadence] → [work] →
            [when] → [owner] → [state]" in one left-to-right sweep. */}
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <table className="w-full" role="table" aria-label={`${activeBusiness.name} ${fmtMonthLong(activeSnapshot.month)} checklist`}>
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Particulars</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Work</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Due Date</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Assigned to</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <p className="text-body font-medium text-black/70">No items match your filters.</p>
                    <p className="text-caption text-black/55 mt-1">
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-[#204CC7] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded px-1"
                      >
                        Clear all filters
                      </button>
                      {' '}to see {items.length} {items.length === 1 ? 'item' : 'items'}.
                    </p>
                  </td>
                </tr>
              )}
              {filteredItems.map((item) => {
                const overdueNow = isCurrent && isOverdueNow(item);
                // Past months: any still-pending item (own or client) is "missed".
                const missedHistorical = !isCurrent && (item.status === 'Pending' || item.status === 'Pending from client');
                const days = daysUntil(item.dueDate);
                const isDone = item.status === 'Completed';
                const isNA = item.status === 'N/A';
                const itemNote = noteFor(item);
                const isExpanded = expandedItem === item.id;
                const assignee = TEAM_POOL[item.assignee];
                const rowTint =
                  overdueNow ? 'bg-rose-50/40'
                  : missedHistorical ? 'bg-rose-50/25'
                  : '';
                return (
                  <Fragment key={item.id}>
                    <tr className={`group hover:bg-black/[0.015] transition-colors ${rowTint}`}>
                      {/* Particulars — the compliance bucket (GST, TDS,
                          BOA, …). The cadence used to render below as
                          a subtitle but now lives in its own dedicated
                          Type column with an editable dropdown. */}
                      <td className="px-4 py-3 align-top">
                        <div className={`text-body font-medium ${isDone ? 'text-black/60' : 'text-black/85'}`}>
                          {item.particulars}
                        </div>
                      </td>
                      {/* Type — recurrence cadence (Monthly / Quarterly
                          / Annually / One Time). Editable on every
                          month, including history. */}
                      <td className="px-4 py-3 align-top">
                        <FrequencyDropdown
                          frequency={item.frequency}
                          disabled={false}
                          onChange={(next) => setFrequency(item.id, next)}
                          ariaLabel={`Type of "${item.work}". ${item.frequency}. Click to change.`}
                        />
                      </td>
                      {/* Work */}
                      <td className="px-4 py-3 align-top">
                        <div className={`text-body ${isDone ? 'text-black/55 line-through decoration-black/40' : 'text-black/75'}`}>
                          {item.work}
                        </div>
                      </td>
                      {/* Due Date */}
                      <td className="px-4 py-3 align-top">
                        <div className={`text-body font-medium tabular-nums ${
                          (overdueNow || missedHistorical) ? 'text-rose-700'
                          : isDone ? 'text-black/55'
                          : 'text-black/80'
                        }`}>
                          {fmtDate(item.dueDate)}
                        </div>
                        {!isDone && (
                          <div className={`text-caption tabular-nums mt-0.5 ${
                            (overdueNow || missedHistorical) ? 'text-rose-700 font-semibold'
                            : days >= 0 && days <= 3 ? 'text-amber-700 font-medium'
                            : 'text-black/60'
                          }`}>
                            {isCurrent
                              ? (days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'due today' : `in ${days}d`)
                              : 'missed'}
                          </div>
                        )}
                      </td>
                      {/* Assigned to — clickable switcher on every
                          month (history included). Avatar + name. */}
                      <td className="px-4 py-3 align-top">
                        {assignee ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenAssignee(prev => prev?.itemId === item.id ? null : { itemId: item.id, rect });
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={openAssignee?.itemId === item.id}
                            aria-label={`Assigned to ${assignee.name}. Click to reassign.`}
                            className="inline-flex items-center gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 max-w-full"
                          >
                            <Avatar initials={assignee.initials} title={assignee.name} size="sm" />
                            <span className={`text-body truncate min-w-0 ${isDone ? 'text-black/60' : 'text-black/80'}`}>{assignee.name}</span>
                            <ChevronDown
                              className={`w-3 h-3 text-black/40 shrink-0 transition-transform ${openAssignee?.itemId === item.id ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <span className="text-caption text-black/55" aria-label="Unassigned">—</span>
                        )}
                      </td>
                      {/* Status — 4-option dropdown pill (always editable). */}
                      <td className="px-4 py-3 align-top">
                        <StatusDropdown
                          status={item.status}
                          overdue={overdueNow}
                          missed={missedHistorical}
                          disabled={false}
                          onChange={(next) => setStatus(item.id, next)}
                          ariaLabel={`Status of "${item.work}". ${isDone ? 'Completed' : isNA ? 'N/A this month' : (overdueNow ? 'Overdue' : missedHistorical ? 'Missed' : item.status === 'Pending from client' ? 'Pending from client' : 'Pending')}. Click to change.`}
                        />
                      </td>
                      {/* Comments — single freeform note. Cell shows the
                          note text (truncated) or a placeholder; click to
                          edit inline in the row beneath. The Delete
                          affordance hides at idle and reveals on row
                          hover next to the note button — keeps the
                          column clean during scanning while staying one
                          click away when needed. */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedItem(prev => prev === item.id ? null : item.id)}
                            aria-expanded={isExpanded}
                            {...(isExpanded ? { 'aria-controls': `note-${item.id}` } : {})}
                            title={itemNote || 'Add a note'}
                            className={`group/note flex-1 min-w-0 text-left flex items-start gap-1.5 px-2 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 ${
                              isExpanded
                                ? 'bg-[#EEF1FB]'
                                : 'hover:bg-black/[0.04]'
                            }`}
                          >
                            <MessageSquareText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                              isExpanded ? 'text-[#204CC7]' : itemNote ? 'text-black/65' : 'text-black/55'
                            }`} aria-hidden="true" />
                            {itemNote ? (
                              <span className="text-caption text-black/75 line-clamp-2 leading-snug">{itemNote}</span>
                            ) : (
                              <span className="text-caption text-black/60 group-hover/note:text-black/80 italic">Add note</span>
                            )}
                          </button>
                          {/* Delete row — hover-revealed on the parent
                              <tr> (which owns the `group` class). Stays
                              focusable for keyboard access via tab so
                              opacity-0 doesn't lock it out. Rose tint
                              on hover signals destructive intent. */}
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            aria-label={`Delete row "${item.work}"`}
                            title="Delete row"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 inline-flex items-center justify-center w-7 h-7 mt-0.5 rounded-md text-black/45 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr id={`note-${item.id}`} className="bg-[#FAFBFC]">
                        <td colSpan={6} className="px-4 py-4 border-t border-black/[0.04]">
                          <NoteEditor
                            itemId={item.id}
                            initialValue={itemNote}
                            canEdit={true}
                            onSave={(text) => { saveNote(item.id, text); setExpandedItem(null); }}
                            onClose={() => setExpandedItem(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* ── Add-row editor ──
                  Inline draft that takes the same shape as a real
                  data row so the admin's mental model stays "this is
                  just another row with seven cells." All controls
                  share the same h-9 height and chrome (white surface,
                  black/10 border, h-3.5 Lucide chevron clipped to the
                  right gutter, brand-blue focus ring) — same hygiene
                  as the filter dropdowns above the table. Soft cool
                  tint on the row separates it from saved data without
                  shouting. */}
              {addingRow && (
                <tr className="bg-[#FAFBFD] border-y border-[#204CC7]/15">
                  {/* Particulars — compliance bucket dropdown. */}
                  <td className="px-4 py-3 align-middle">
                    <div className="relative">
                      <select
                        aria-label="Particulars"
                        value={draftRow.particulars}
                        onChange={(e) => setDraftRow(d => ({ ...d, particulars: e.target.value as CategoryName }))}
                        className="appearance-none w-full h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-caption font-medium text-black/80 hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors cursor-pointer"
                      >
                        {CATEGORY_NAMES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-black/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    </div>
                  </td>
                  {/* Type — recurrence cadence. */}
                  <td className="px-4 py-3 align-middle">
                    <div className="relative">
                      <select
                        aria-label="Type"
                        value={draftRow.frequency}
                        onChange={(e) => setDraftRow(d => ({ ...d, frequency: e.target.value as Frequency }))}
                        className="appearance-none w-full h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-caption font-medium text-black/80 hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors cursor-pointer"
                      >
                        {FREQUENCY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-black/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    </div>
                  </td>
                  {/* Work — the actual deliverable description. Only
                      required field; commit is disabled when blank.
                      Auto-focuses when the editor opens. Slightly
                      higher contrast than the rest so it visibly
                      anchors the row as the primary input. */}
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="text"
                      aria-label="Work"
                      placeholder="Describe the work…"
                      value={draftRow.work}
                      autoFocus
                      onChange={(e) => setDraftRow(d => ({ ...d, work: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitAddRow();
                        }
                      }}
                      className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-caption font-medium text-black/85 placeholder:text-black/40 hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors"
                    />
                  </td>
                  {/* Due Date — native date picker. Defaults to the
                      15th of the active month so the admin has a
                      sensible starting anchor. */}
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="date"
                      aria-label="Due date"
                      value={draftRow.dueDate}
                      onChange={(e) => setDraftRow(d => ({ ...d, dueDate: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-black/10 bg-white text-caption font-medium text-black/80 tabular-nums hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors"
                    />
                  </td>
                  {/* Assignee — limited to roster on this client.
                      Shows just the name (no initials prefix) so the
                      cell doesn't truncate; the existing rows render
                      avatar + name and the admin already learns the
                      pairing from there. */}
                  <td className="px-4 py-3 align-middle">
                    <div className="relative">
                      <select
                        aria-label="Assignee"
                        value={draftRow.assignee}
                        onChange={(e) => setDraftRow(d => ({ ...d, assignee: e.target.value }))}
                        className="appearance-none w-full h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-caption font-medium text-black/80 hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors cursor-pointer truncate"
                      >
                        {client.team.map(m => (
                          <option key={m.initials} value={m.initials}>{m.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-black/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    </div>
                  </td>
                  {/* Status — defaults to Pending. Admin can pre-set
                      to Pending from client / N/A / Completed when
                      logging a row whose state is already known. */}
                  <td className="px-4 py-3 align-middle">
                    <div className="relative">
                      <select
                        aria-label="Status"
                        value={draftRow.status}
                        onChange={(e) => setDraftRow(d => ({ ...d, status: e.target.value as ChecklistStatus }))}
                        className="appearance-none w-full h-9 pl-3 pr-8 rounded-md border border-black/10 bg-white text-caption font-medium text-black/80 hover:border-black/20 focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/15 outline-none transition-colors cursor-pointer"
                      >
                        {CHECKLIST_STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-black/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                    </div>
                  </td>
                  {/* Comments cell doubles as the action area for the
                      editor — Save (primary) on the right, Cancel
                      next to it. Both share h-9 to land on the same
                      baseline as the inputs. Notes are added post-
                      save via the existing per-row Comments
                      affordance so the editor stays a single
                      horizontal strip. */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={cancelAddRow}
                        className="h-9 px-3 rounded-md text-caption font-medium text-black/65 hover:text-black/85 hover:bg-black/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={commitAddRow}
                        disabled={!draftRow.work.trim()}
                        className="h-9 px-3.5 rounded-md bg-[#204CC7] text-white text-caption font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1A3FA8] active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
                      >
                        Add row
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ── "+ Add row" trigger ──
                  Dashed full-width affordance that always sits at the
                  end of the table. Hidden while the editor is open
                  (the editor row replaces it visually). Same height
                  as a data row so the table doesn't visibly pop when
                  toggling. */}
              {!addingRow && (
                <tr>
                  <td colSpan={7} className="p-0">
                    <button
                      type="button"
                      onClick={openAddRow}
                      className="w-full h-11 inline-flex items-center justify-center gap-1.5 text-caption font-medium text-black/55 hover:text-[#204CC7] hover:bg-[#EEF1FB]/40 border-t border-dashed border-black/10 hover:border-[#204CC7]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Add row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Assignee switcher popover ──
          Rendered via portal at document.body so the table's
          rounded-overflow wrapper can't clip it. Position is
          computed from the trigger's getBoundingClientRect on
          open; auto-flips upward when there's no room below;
          horizontally clamps to viewport. Inner-scroll filter
          on the dismiss listener so scrolling the option list
          to find a long roster doesn't snap the popover shut. */}
      {openAssignee && typeof document !== 'undefined' && (() => {
        const PER_ITEM = 44;
        const HEADER  = 52;
        const VIEWPORT_GUTTER = 16;
        const POPOVER_WIDTH = 240;
        const naturalHeight = HEADER + client.team.length * PER_ITEM;
        const rect = openAssignee.rect;
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
        const spaceAbove = rect.top - VIEWPORT_GUTTER;
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
        const currentInitials = items.find(i => i.id === openAssignee.itemId)?.assignee;
        return createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={() => setOpenAssignee(null)} aria-hidden="true" />
            <div
              ref={assigneePopoverRef}
              role="listbox"
              aria-label="Reassign deliverable owner"
              style={style}
              className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
            >
              <p className="px-4 pt-3 pb-2 text-caption font-semibold text-black/55 uppercase tracking-wide border-b border-black/[0.04] shrink-0">
                Reassign to
              </p>
              <ul className="py-1 overflow-y-auto flex-1 min-h-0">
                {client.team.map(member => {
                  const isCurrentAssignee = member.initials === currentInitials;
                  return (
                    <li key={member.initials}>
                      <button
                        role="option"
                        aria-selected={isCurrentAssignee}
                        onClick={() => {
                          if (!isCurrentAssignee) updateAssignee(openAssignee.itemId, member.initials);
                          setOpenAssignee(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${isCurrentAssignee ? 'bg-[#EEF1FB]/60' : 'hover:bg-black/[0.03]'} focus:outline-none focus-visible:bg-[#EEF1FB]`}
                      >
                        <Avatar initials={member.initials} title={member.name} size="sm" />
                        <span className={`flex-1 min-w-0 text-caption font-semibold truncate ${isCurrentAssignee ? 'text-[#204CC7]' : 'text-black/85'}`}>{member.name}</span>
                        {isCurrentAssignee && (
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

      {breakdownDrawer && (
        <BreakdownDrawer
          which={breakdownDrawer}
          onClose={() => setBreakdownDrawer(null)}
          workload={workload}
          totals={totals}
          items={items}
          isCurrent={isCurrent}
          activeBusiness={activeBusiness}
          activeSnapshot={activeSnapshot}
          monthHistory={monthHistory}
          onMonthChange={onMonthChange}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function rowStatusLabel(r: BusinessRow): string {
  if (r.status === 'Done') return 'all done';
  if (r.status === 'Behind') return `${r.pending} pending including ${r.overdue} overdue`;
  return `${r.pending} pending`;
}

/** Single-cell status toggle used inside the per-business checklist table.
 *  Renders as a clickable pill — click to flip Done ↔ Pending. Disabled in
 *  historical months (the Missed state is purely informational then). */
// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARDS — editorial composition above the table.
//
// Both cards share the same rhythm — eyebrow → hero verdict → one support
// line → one piece of visualization — but express it differently: the
// Workload card closes with people, the History card closes with a
// timeline. Symmetrical composition, different character. Everything else
// is stripped: no chevrons cluttering corners, no redundant stats, no
// ornamental pills. The whole card is the click target; hover animates a
// subtle "Open →" affordance into view at the bottom-right.
// ─────────────────────────────────────────────────────────────────────────────

type VerdictTone = 'emerald' | 'rose' | 'amber' | 'neutral';
const verdictText: Record<VerdictTone, string> = {
  emerald: 'text-emerald-700',
  rose:    'text-rose-700',
  amber:   'text-amber-700',
  neutral: 'text-black/90',
};

function SummaryCardShell({
  eyebrow, onOpen, ariaLabel, children,
}: {
  eyebrow: string;
  onOpen: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={ariaLabel}
      className="group relative w-full text-left rounded-2xl border border-black/[0.08] bg-white hover:border-black/[0.18] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-6px_rgba(0,0,0,0.08)] transition-all duration-200 px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
    >
      {/* Header row — eyebrow on the left, chevron-right on the top-right
          to mirror the KpiCard pattern (Compliance Status / KSM Hit-Miss /
          A&T Tasks). The chevron is always visible so the affordance is
          obvious without hovering, and it tints + nudges right on hover. */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold text-black/55 uppercase tracking-[0.08em]">{eyebrow}</span>
        <ChevronRight
          className="w-3.5 h-3.5 text-black/40 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
          aria-hidden="true"
        />
      </div>
      {children}
    </button>
  );
}

/** Workload summary — verdict-led card that answers "is the team on top of
 *  this month?" in two words, grounds it in one sentence, and closes with
 *  the team as people, not numbers. */
function WorkloadSummaryCard({
  workload, totals, onOpen,
}: {
  workload: { member: TeamMember; done: number; pending: number }[];
  totals: { done: number; pending: number; overdue: number; total: number };
  onOpen: () => void;
}) {
  // Verdict prioritises the urgent signal: overdue trumps pending-but-
  // on-time; fully-done trumps everything else.
  let verdict: { label: string; tone: VerdictTone };
  if (totals.total === 0) {
    verdict = { label: 'No items this month', tone: 'neutral' };
  } else if (totals.overdue > 0) {
    verdict = {
      label: totals.overdue === 1 ? '1 item overdue' : `${totals.overdue} items overdue`,
      tone: 'rose',
    };
  } else if (totals.pending === 0) {
    verdict = { label: 'All caught up', tone: 'emerald' };
  } else {
    verdict = { label: 'On track', tone: 'emerald' };
  }

  const support = totals.total === 0
    ? 'Nothing scheduled.'
    : `${totals.done} of ${totals.total} items done · ${workload.length} ${workload.length === 1 ? 'person' : 'people'} on deck`;

  return (
    <SummaryCardShell
      eyebrow="Team workload"
      onOpen={onOpen}
      ariaLabel="Open team workload breakdown"
    >
      <h3 className={`text-h1 font-bold leading-tight ${verdictText[verdict.tone]}`}>{verdict.label}</h3>
      <p className="text-caption text-black/60 mt-1.5 tabular-nums">{support}</p>

      {/* Team row — not overlapped; each person gets room. A discreet
          rose dot marks anyone with pending work. The HOD ring was
          dropped — role hierarchy already lives in the avatars'
          tooltip + TeamPopover, and the ring read as a half-baked
          notification badge rather than a status cue. */}
      <div
        className="flex items-center gap-2.5 mt-6 flex-wrap"
        role="list"
        aria-label={`Team of ${workload.length}`}
      >
        {workload.map(({ member, pending }) => (
          <div
            key={member.initials}
            role="listitem"
            className="relative"
            title={`${member.name} · ${member.role}${pending > 0 ? ` · ${pending} pending` : ''}`}
          >
            <Avatar initials={member.initials} size="md" />
            <span className="sr-only">{member.name}, {member.role}{pending > 0 ? `, ${pending} pending` : ''}</span>
            {pending > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </SummaryCardShell>
  );
}

/** History summary — verdict-led card that answers "have we been
 *  tracking?" over 6 months. Closes with a dot timeline: one dot per
 *  month, colour-coded, the active month ringed, oldest-left
 *  newest-right so the HOD reads it like a heartbeat. */
/** Compute the financial year that contains the given ISO month
 *  (Indian FY: Apr → Mar). Returns the FY label ("FY 2026–27"), the
 *  ordered list of 12 month ISOs starting at April, and the start /
 *  end years for downstream display. */
function getFinancialYear(activeMonthISO: string): {
  label: string;
  startYear: number;
  endYear: number;
  months: string[]; // 12 ISO YYYY-MM-01 strings, Apr → Mar
} {
  const d = new Date(activeMonthISO);
  const m = d.getUTCMonth(); // 0..11
  const y = d.getUTCFullYear();
  // April (idx 3) flips the FY boundary — anything Jan-Mar still
  // belongs to the FY that started the previous April.
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIdx = (3 + i) % 12;            // Apr=3 … Mar=2
    const year = i < 9 ? startYear : endYear; // Jan/Feb/Mar fall into the next calendar year
    months.push(`${year}-${String(monthIdx + 1).padStart(2, '0')}-01`);
  }
  return {
    label: `FY ${startYear}–${String(endYear).slice(2)}`,
    startYear,
    endYear,
    months,
  };
}

function HistorySummaryCard({
  history, activeMonth, onOpen,
}: {
  history: MonthSnapshot[];
  activeMonth: string;
  onOpen: () => void;
}) {
  // Index history by month so the FY strip can fold each FY month
  // into either an existing snapshot, the active month, or "future".
  const historyByMonth = useMemo(() => {
    const map = new Map<string, MonthSnapshot>();
    for (const s of history) map.set(s.month, s);
    return map;
  }, [history]);

  const fy = useMemo(() => getFinancialYear(activeMonth), [activeMonth]);

  // Per-month state for the strip + the verdict math.
  type MonthState = {
    iso: string;
    label: string;        // "APR" / "MAY" / …
    state: 'clean' | 'missed' | 'current' | 'future';
    pending: number;
  };
  const months: MonthState[] = useMemo(() => fy.months.map(iso => {
    const snap = historyByMonth.get(iso);
    const label = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][new Date(iso).getUTCMonth()];
    if (iso === activeMonth) {
      const pending = snap ? snap.items.filter(i => i.status === 'Pending' || i.status === 'Pending from client').length : 0;
      return { iso, label, state: 'current', pending };
    }
    if (!snap) {
      // No snapshot — either future (later than today) or genuinely
      // unrecorded past. Treat both as "future" visually since the
      // dot strip's job is to show the year arc, not litigate why
      // a past month has no data.
      return { iso, label, state: 'future', pending: 0 };
    }
    const pending = snap.items.filter(i => i.status === 'Pending' || i.status === 'Pending from client').length;
    return { iso, label, state: pending === 0 ? 'clean' : 'missed', pending };
  }), [fy, historyByMonth, activeMonth]);

  const closed = months.filter(m => m.state === 'clean' || m.state === 'missed');
  const cleanCount = closed.filter(m => m.state === 'clean').length;
  const missedMonths = closed.filter(m => m.state === 'missed');
  const lastMissed = missedMonths[missedMonths.length - 1]?.iso;

  // Verdict: leans on the same three buckets as before, just scoped
  // to "closed months in this FY" so a fresh FY (Apr–May with one
  // miss) reads as "1 of 2 missed" without claiming the whole year
  // is behind.
  let verdict: { label: string; tone: VerdictTone };
  if (closed.length === 0) {
    verdict = { label: 'New financial year', tone: 'neutral' };
  } else if (cleanCount === closed.length) {
    verdict = { label: 'Spotless year so far', tone: 'emerald' };
  } else if (cleanCount === 0) {
    verdict = { label: `${closed.length} of ${closed.length} missed`, tone: 'rose' };
  } else {
    verdict = { label: `${cleanCount} of ${closed.length} clean`, tone: 'neutral' };
  }

  const support = closed.length === 0
    ? `${fy.label} just started · ${months.find(m => m.state === 'current')?.label ?? ''} in progress`
    : cleanCount === closed.length
      ? `Every closed month in ${fy.label} shipped on time.`
      : lastMissed
        ? `Last missed · ${fmtMonthLong(lastMissed)}`
        : `${fy.label} · on track`;

  return (
    <SummaryCardShell
      eyebrow={fy.label}
      onOpen={onOpen}
      ariaLabel={`Open ${fy.label} history breakdown`}
    >
      {/* Verdict on a single line — verdict + dot + support tucked tight. */}
      <p className="text-body min-w-0">
        <span className={`font-semibold ${verdictText[verdict.tone]}`}>{verdict.label}</span>
        <span className="text-black/30 mx-1.5">·</span>
        <span className="text-black/55">{support}</span>
      </p>

      {/* FY ribbon — 12 equal segments, edge-to-edge. `grid-cols-12`
          guarantees uniform cell widths so labels never collide
          regardless of card width. Each cell carries a slim rounded
          bar coloured by state; the active month gets a brand-blue
          fill and a subtle outer ring to draw the eye without ever
          competing with the verdict above. Announced as a single
          role="img" so screen readers get the full FY in one read. */}
      <div
        role="img"
        aria-label={
          `${fy.label} timeline: ` +
          months.map(m =>
            m.state === 'future'  ? `${m.label} upcoming` :
            m.state === 'current' ? `${m.label} in progress` :
            m.state === 'clean'   ? `${m.label} clean` :
                                    `${m.label} ${m.pending} missed`
          ).join(', ')
        }
        className="mt-4"
      >
        <div className="grid grid-cols-12 gap-1.5" aria-hidden="true">
          {months.map((m) => {
            const isActive = m.state === 'current';
            const isFuture = m.state === 'future';
            const barTone =
              m.state === 'clean'   ? 'bg-emerald-500'
              : m.state === 'missed'  ? 'bg-rose-500'
              : isActive              ? 'bg-[#204CC7]'
                                      : 'bg-black/[0.06]';
            const labelTone =
              isActive ? 'text-[#204CC7] font-semibold'
              : isFuture ? 'text-black/35'
                         : 'text-black/60';
            const titleText =
              m.state === 'clean'   ? `${fmtMonthLong(m.iso)} · clean`
              : m.state === 'missed'  ? `${fmtMonthLong(m.iso)} · ${m.pending} missed`
              : m.state === 'current' ? `${fmtMonthLong(m.iso)} · current month`
                                      : `${fmtMonthLong(m.iso)} · upcoming`;
            return (
              <div key={m.iso} className="flex flex-col items-center min-w-0" title={titleText}>
                <div
                  className={`w-full h-1.5 rounded-full ${barTone} ${
                    isActive ? 'ring-2 ring-[#204CC7]/25 ring-offset-1 ring-offset-white' : ''
                  }`}
                />
                <span className={`text-[10px] mt-2 tabular-nums tracking-wide ${labelTone}`}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SummaryCardShell>
  );
}

/** Right-side breakdown drawer — detailed view of either the team workload
 *  or the 6-month history. Portal-mounted, Escape closes, focus returns
 *  to the opener. Matches the StoryDrawer pattern used on the list view. */
function BreakdownDrawer({
  which, onClose, workload, totals, items, isCurrent,
  activeBusiness, activeSnapshot, monthHistory, onMonthChange,
}: {
  which: 'workload' | 'history';
  onClose: () => void;
  workload: { member: TeamMember; done: number; pending: number }[];
  totals: { done: number; pending: number; overdue: number; total: number };
  items: ChecklistItem[];
  isCurrent: boolean;
  activeBusiness: Business;
  activeSnapshot: MonthSnapshot;
  monthHistory: MonthSnapshot[];
  onMonthChange: (month: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Stash the opener so focus can return there on close.
    const opener = document.activeElement as HTMLElement | null;

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        // Focus trap — loop between first/last focusable within the dialog
        // so keyboard users can't escape the modal into the backdrop.
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', handle);
      window.clearTimeout(t);
      // Restore focus to whatever opened us.
      if (opener && typeof opener.focus === 'function') opener.focus();
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const title = which === 'workload' ? 'Team workload' : '12-month history';
  const subtitle = which === 'workload'
    ? `${activeBusiness.name} · ${fmtMonthLong(activeSnapshot.month)}`
    : `${activeBusiness.name} · last 12 months`;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="at-breakdown-title"
        className="fixed top-0 right-0 h-screen w-[640px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="at-breakdown-title" className="text-h2 font-bold text-black/90">{title}</h2>
            <p className="text-caption text-black/60 mt-1.5">{subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
          >
            <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-7 py-5">
          {which === 'workload' ? (
            <WorkloadBreakdown workload={workload} totals={totals} items={items} isCurrent={isCurrent} />
          ) : (
            <HistoryBreakdown
              monthHistory={monthHistory}
              activeMonth={activeSnapshot.month}
              onMonthChange={(m) => { onMonthChange(m); onClose(); }}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKLOAD BREAKDOWN — turns the drawer into a single-glance answer to
// "is the team OK and who's drowning?".
//
// Design moves:
//   1. Hero summary — one big completion %, four supporting numbers
//      (done · pending · overdue · people), and a stacked tri-color
//      progress bar of the whole month. Reads as a verdict in one
//      look.
//   2. Workload distribution — per-member rows where the BAR WIDTH
//      is each person's pending load relative to the busiest member.
//      Bar segments split rose (overdue) and amber (on-time pending)
//      so the eye instantly spots: who's loaded vs free, and where
//      the urgent items concentrate. Caught-up members render no bar
//      and an emerald "Caught up" check; unassigned members render
//      a muted "No items" line. Sort order pins HOD on top, then
//      ranks by overdue → pending so the people who need attention
//      surface above the people who don't.
//
// What's deliberately gone vs the previous design:
//   • The 3-cell KPI strip — collapsed into the hero summary's
//     supporting line for less chrome.
//   • The per-member pending-items list — that lives on the table
//     itself (filter by assignee). The drawer is for at-a-glance
//     load distribution, not per-item drill-down.
// ─────────────────────────────────────────────────────────────────────────────

type MemberLoadData = {
  member: TeamMember;
  done: number;
  pending: number;
  total: number;
  overdueCount: number;
  isHod: boolean;
};

function WorkloadBreakdown({
  workload, totals, items, isCurrent,
}: {
  workload: { member: TeamMember; done: number; pending: number }[];
  totals: { done: number; pending: number; overdue: number; total: number };
  items: ChecklistItem[];
  isCurrent: boolean;
}) {
  const completionPct = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);

  // Per-member enrichment + sort. Order: HOD pinned first (org
  // accountability), then by overdue desc, then by pending desc, so
  // the rows the HOD needs to look at land at the top.
  const perMember = useMemo<MemberLoadData[]>(() => {
    const enriched: MemberLoadData[] = workload.map(({ member, done, pending }) => {
      const memberItems = items.filter(i => i.assignee === member.initials);
      const pendingItems = memberItems.filter(i => i.status === 'Pending' || i.status === 'Pending from client');
      const overdueCount = isCurrent ? pendingItems.filter(isOverdueNow).length : 0;
      return {
        member, done, pending,
        total: memberItems.length,
        overdueCount,
        isHod: member.role === 'HOD',
      };
    });
    return enriched.sort((a, b) => {
      if (a.isHod !== b.isHod) return a.isHod ? -1 : 1;
      if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
      return b.pending - a.pending;
    });
  }, [workload, items, isCurrent]);

  // Tone for the headline % — emerald above 90, amber 50-89, rose
  // below 50 so the colour itself tells the verdict.
  const heroTone = completionPct >= 90
    ? 'text-emerald-700'
    : completionPct >= 50
    ? 'text-amber-700'
    : 'text-rose-700';

  return (
    <div className="space-y-6">
      {/* ── Hero summary — one headline %, "X of Y completed", and
              a simple single-colour progress bar. Nothing else. ── */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-6">
        <div className="flex items-baseline gap-3">
          <span className={`text-[40px] leading-none font-bold tabular-nums ${heroTone}`}>{completionPct}%</span>
          <span className="text-body text-black/55">complete</span>
        </div>
        <div className="mt-2 text-caption text-black/55 tabular-nums">
          <strong className="text-black/85">{totals.done}</strong> of <strong className="text-black/85">{totals.total}</strong> completed
        </div>
        {totals.total > 0 && (
          <div className="mt-3 h-2 rounded-full bg-black/[0.06] overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(totals.done / totals.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Workload distribution ── */}
      <section aria-labelledby="workload-distribution-heading">
        <h3 id="workload-distribution-heading" className="text-caption font-semibold text-black/55 uppercase tracking-[0.08em] mb-3">
          Per-member progress
        </h3>
        <ul className="space-y-2.5" role="list">
          {perMember.map(data => (
            <MemberLoadRow key={data.member.initials} data={data} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * MemberLoadRow — one rectangle per teammate. Just the basics:
 *   • Avatar + name + role badge
 *   • "X of Y completed" caption
 *   • A simple single-colour progress bar (emerald) showing how
 *     much of their assigned scope is done.
 *
 * No segments, no pills, no overdue split — the table itself is the
 * place to drill into specific items. The drawer answers a single
 * question: how far along is each person?
 */
function MemberLoadRow({
  data,
}: {
  data: MemberLoadData;
}) {
  const { member, done, total, isHod } = data;
  const isUnassigned = total === 0;
  const donePct = total === 0 ? 0 : (done / total) * 100;

  return (
    <li className={`p-4 rounded-xl border ${
      isHod
        ? 'border-[#204CC7]/15 bg-[#F4F6FF]/40'
        : 'border-black/[0.06] bg-white'
    }`}>
      {/* Header line — name + role badge + simple "X of Y completed"
          on the right. */}
      <div className="flex items-center gap-3">
        <Avatar initials={member.initials} title={member.name} size="md" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-body font-medium text-black/85 truncate">{member.name}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
            isHod ? 'bg-[#EEF1FB] text-[#204CC7]' : 'bg-black/[0.04] text-black/55'
          }`}>
            {member.role}
          </span>
        </div>
        <div className="shrink-0 text-caption tabular-nums text-black/65">
          {isUnassigned
            ? <span className="text-black/40">No items assigned</span>
            : <><strong className="text-black/85">{done}</strong> of <strong className="text-black/85">{total}</strong> completed</>}
        </div>
      </div>

      {/* Single-colour progress bar — emerald fill on a neutral track.
          One bar, one meaning: completion. */}
      {!isUnassigned && (
        <div className="mt-3 h-2 rounded-full bg-black/[0.05] overflow-hidden" role="presentation">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${donePct}%` }}
          />
        </div>
      )}
    </li>
  );
}

/** Vertical timeline of the last 12 months — colour-coded, per-month
 *  pending count, and each month is clickable to jump the page to
 *  that snapshot. */
function HistoryBreakdown({
  monthHistory, activeMonth, onMonthChange,
}: {
  monthHistory: MonthSnapshot[];
  activeMonth: string;
  onMonthChange: (month: string) => void;
}) {
  const totals = useMemo(() => {
    // A month is "clean" if every applicable item shipped — Completed
    // and N/A both count as fine. Missed items are Pending or
    // Pending-from-client that never closed.
    const isClean = (s: MonthSnapshot) =>
      s.items.every(i => i.status === 'Completed' || i.status === 'N/A');
    const isMissed = (i: ChecklistItem) =>
      i.status === 'Pending' || i.status === 'Pending from client';
    const clean = monthHistory.filter(isClean).length;
    const totalItems = monthHistory.reduce((s, m) => s + m.items.length, 0);
    const missedItems = monthHistory.reduce((s, m) => s + m.items.filter(isMissed).length, 0);
    return { clean, missedItems, totalItems, total: monthHistory.length };
  }, [monthHistory]);
  return (
    <div className="space-y-4">
      {/* Headline story */}
      <div className="rounded-xl bg-[#FAFBFC] border border-black/[0.05] px-4 py-3">
        <p className="text-body text-black/80 leading-relaxed">
          <span className="font-semibold text-black/90">{totals.clean} of {totals.total} months</span> were fully clean.
          {totals.missedItems > 0 && (
            <> <span className="font-semibold text-rose-700">{totals.missedItems}</span> items were missed across the window.</>
          )}
        </p>
      </div>

      {/* Per-month rows */}
      <ul className="rounded-xl border border-black/[0.06] divide-y divide-black/[0.04]" role="list">
        {monthHistory.map((snap) => {
          const pending = snap.items.filter(i => i.status === 'Pending' || i.status === 'Pending from client').length;
          const clean = pending === 0;
          const isThisCurrent = isCurrentMonth(snap.month);
          const isActive = snap.month === activeMonth;
          return (
            <li key={snap.month}>
              <button
                type="button"
                onClick={() => onMonthChange(snap.month)}
                aria-current={isActive ? 'true' : undefined}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-inset ${isActive ? 'bg-[#F4F6FF]' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center ${clean ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {clean ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-body font-medium ${isActive ? 'text-[#204CC7]' : 'text-black/85'}`}>
                        {fmtMonthLong(snap.month)}
                      </span>
                      {isThisCurrent && (
                        <span className="text-caption font-semibold text-[#204CC7] uppercase tracking-wide">Current</span>
                      )}
                    </div>
                    <div className="text-caption text-black/60">
                      {clean ? 'All items completed on time' : `${pending} of ${snap.items.length} ${isThisCurrent ? 'still pending' : 'missed'}`}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-black/60" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * StatusDropdown — renders the deliverable's current display state as
 * a coloured pill (Completed / Pending / Overdue / Missed / N/A this
 * month / Pending from client) and opens a 4-option menu on click so
 * the HOD can change it.
 *
 * Display state is computed, not stored:
 *   • status = Completed         → emerald "Completed" pill
 *   • status = N/A               → slate "N/A this month" pill
 *   • status = Pending and overdue → rose "Overdue" / "Missed" pill
 *   • status = Pending           → amber "Pending" pill
 *   • status = Pending from client + overdue → rose "Overdue"
 *   • status = Pending from client → indigo "Pending from client" pill
 *
 * Menu options stay constant — the four canonical statuses the user
 * can pick. "Overdue" and "Missed" are derived from due-date math, not
 * selectable.
 */
/**
 * FrequencyDropdown — pill + 4-option menu (Monthly · Quarterly ·
 * Annually · One Time) for the deliverable's cadence column. Same
 * shape as StatusDropdown so muscle memory carries between columns.
 * Disabled on past months (history is read-only). Trigger styling is
 * neutral (slate) since cadence is a property, not a state.
 */
function FrequencyDropdown({
  frequency, disabled, onChange, ariaLabel,
}: {
  frequency: Frequency;
  disabled: boolean;
  onChange: (next: Frequency) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-caption font-medium bg-black/[0.03] border-black/[0.08] text-black/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 ${
          disabled ? 'cursor-not-allowed opacity-90' : 'hover:bg-black/[0.06] hover:text-black/85 cursor-pointer'
        }`}
      >
        <span>{frequency}</span>
        {!disabled && (
          <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>

      {open && !disabled && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Set deliverable cadence"
          className="absolute left-0 top-full mt-1.5 w-[180px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5 z-30"
        >
          {FREQUENCY_OPTIONS.map(opt => {
            const isCurrent = opt.value === frequency;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  if (!isCurrent) onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-caption font-medium transition-colors ${
                  isCurrent ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold' : 'text-black/75 hover:bg-black/[0.03]'
                } focus:outline-none focus-visible:bg-[#EEF1FB]`}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-[#204CC7] shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusDropdown({
  status, overdue, missed, disabled, onChange, ariaLabel,
}: {
  status: ChecklistStatus;
  overdue: boolean;
  missed: boolean;
  disabled: boolean;
  onChange: (next: ChecklistStatus) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape, page-scroll, resize, or click-outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // Compute the visual treatment for the trigger pill.
  let palette: { bg: string; text: string; ring: string; icon: React.ReactNode; label: string };
  if (status === 'Completed') {
    palette = { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />, label: 'Completed' };
  } else if (status === 'N/A') {
    palette = { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200',
      icon: <Circle className="w-3.5 h-3.5" aria-hidden="true" />, label: 'N/A this month' };
  } else if (overdue || missed) {
    palette = { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
      label: missed ? 'Missed' : 'Overdue' };
  } else if (status === 'Pending from client') {
    palette = { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200',
      icon: <Circle className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" aria-hidden="true" />,
      label: 'Pending from client' };
  } else {
    palette = { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200',
      icon: <Circle className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />,
      label: 'Pending' };
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ring-1 ${palette.bg} ${palette.text} ${palette.ring} transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 ${
          disabled ? 'cursor-not-allowed opacity-90' : 'hover:brightness-95 active:scale-95 cursor-pointer'
        }`}
      >
        {palette.icon}
        {palette.label}
        {!disabled && (
          <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        )}
      </button>

      {/* Menu — anchored under the pill. Inline absolute (not portal)
          since the deliverables table allows overflow at the row level
          and the menu only needs to clear adjacent rows, not a
          drawer. z-30 keeps it above neighbour rows' hover tints. */}
      {open && !disabled && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Set deliverable status"
          className="absolute left-0 top-full mt-1.5 w-[200px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5 z-30"
        >
          {CHECKLIST_STATUS_OPTIONS.map(opt => {
            const isCurrent = opt.value === status;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  if (!isCurrent) onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-caption font-medium transition-colors ${
                  isCurrent ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold' : 'text-black/75 hover:bg-black/[0.03]'
                } focus:outline-none focus-visible:bg-[#EEF1FB]`}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-[#204CC7] shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Inline single-field note editor. One open-ended textarea per row — not
 *  a chat thread. Read-only on past months (the existing note still
 *  renders, just not editable). */
function NoteEditor({
  itemId, initialValue, canEdit, onSave, onClose,
}: {
  itemId: string;
  initialValue: string;
  canEdit: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const inputId = `note-input-${itemId}`;
  const [draft, setDraft] = useState(initialValue);
  const dirty = draft !== initialValue;
  const handleSave = () => {
    if (!canEdit) return;
    onSave(draft.trim());
  };
  if (!canEdit) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-caption font-semibold text-black/60 uppercase tracking-wide">Note</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close note"
            className="p-1 rounded-md hover:bg-black/[0.06] text-black/60 hover:text-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
        {initialValue ? (
          <p className="text-body text-black/75 leading-relaxed bg-white rounded-lg border border-black/[0.08] px-3 py-2.5">
            {initialValue}
          </p>
        ) : (
          <p className="text-caption text-black/60 italic">No note for this month.</p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-caption font-semibold text-black/60 uppercase tracking-wide">Note</h4>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close note"
          className="p-1 rounded-md hover:bg-black/[0.06] text-black/60 hover:text-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="bg-white rounded-lg border border-black/[0.10] focus-within:border-[#204CC7]/50 focus-within:ring-2 focus-within:ring-[#204CC7]/20 transition-colors px-3 py-2">
        <label htmlFor={inputId} className="sr-only">Note</label>
        <textarea
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Write a note about this item — blocker, context, anything worth remembering."
          rows={3}
          autoFocus
          className="w-full bg-transparent text-body text-black/85 placeholder:text-black/55 resize-none focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-caption font-medium text-black/70 hover:bg-black/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="px-3 py-1.5 rounded-md bg-[#204CC7] text-white text-caption font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1A3FA8] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

function StatusPill({ row }: { row: BusinessRow }) {
  if (row.status === 'Done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Done
      </span>
    );
  }
  if (row.status === 'Behind') {
    return (
      <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-rose-700">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="tabular-nums">{row.pending}</span> pending
        <span className="text-rose-600/80 font-normal">· {row.overdue} overdue</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-caption font-medium text-amber-700">
      <Circle className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
      <span className="tabular-nums">{row.pending}</span> pending
    </span>
  );
}

/** Business-type chip — pinned to the same taxonomy + visual chrome
 *  the Reporting (Dashboard) module already ships, so the type
 *  surfaces consistently across the app:
 *    • 'E-Commerce'      → label "E-Com / Rest." in emerald
 *    • 'Non E-Commerce'  → label "Trading"        in cyan
 *  Internal value names stay 'E-Commerce' / 'Non E-Commerce' for back-
 *  compat across this file's seed data; only the label and the pill
 *  styling are pulled forward from Reporting. */
function TypeTag({ type }: { type: BusinessType }) {
  const isEcom = type === 'E-Commerce';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium whitespace-nowrap ${
      isEcom
        ? 'bg-[#00C875]/[0.10] text-[#0A8F5E]'
        : 'bg-[#06B6D4]/[0.10] text-[#0E7490]'
    }`}>
      {isEcom ? 'E-Com / Rest.' : 'Trading'}
    </span>
  );
}

function NextDueCell({ row }: { row: BusinessRow }) {
  if (!row.nextDue) return <span className="text-caption text-black/30">—</span>;
  const days = daysUntil(row.nextDue.dueDate);
  const overdue = days < 0;
  const dueSoon = days >= 0 && days <= 3;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-caption font-medium text-black/75 tabular-nums">{fmtDate(row.nextDue.dueDate)}</span>
      <span className={`text-caption tabular-nums ${overdue ? 'text-rose-700 font-semibold' : dueSoon ? 'text-amber-700 font-medium' : 'text-black/40'}`}>
        {overdue ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `in ${days}d`}
      </span>
    </div>
  );
}

function Avatar({ initials, title, size = 'md', ring = false }: { initials: string; title?: string; size?: 'sm' | 'md' | 'lg'; ring?: boolean }) {
  const palette = ['#204CC7', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#E2445C', '#3B82F6', '#EC4899'];
  const sum = initials.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const color = palette[sum % palette.length];
  const sz = size === 'sm' ? 'w-5 h-5 text-[10px]' : size === 'lg' ? 'w-8 h-8 text-caption' : 'w-6 h-6 text-[11px]';
  // `inline-flex` (not `flex`) is critical when these sit inside another
  // inline-flex stack — `flex` would promote the avatar to block-level and
  // break vertical alignment with neighbouring avatars / the +N badge.
  // The optional `ring` is applied directly here so the stacked-pill look
  // doesn't need a nested wrapper that would re-introduce the same drift.
  return (
    <span
      className={`${sz} rounded-full inline-flex items-center justify-center font-bold text-white flex-shrink-0 box-content${ring ? ' ring-2 ring-white' : ''}`}
      style={{ backgroundColor: color }}
      title={title}
      aria-label={title ?? initials}
    >
      {initials}
    </span>
  );
}

function TeamAvatars({ team, max, size = 'md', showNames }: {
  team: TeamMember[];
  max: number;
  size?: 'sm' | 'md' | 'lg';
  showNames?: boolean;
}) {
  const visible = team.slice(0, max);
  const overflow = team.length - visible.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map(m => (
        <Avatar key={m.initials} initials={m.initials} title={`${m.name} (${m.role})`} size={size} ring />
      ))}
      {overflow > 0 && (
        // +N badge — solid zinc fill so it reads as a deliberate "more"
        // pill rather than a hole in the stack. Matches the family.
        <span className={`${size === 'lg' ? 'w-8 h-8 text-caption' : 'w-6 h-6 text-[11px]'} rounded-full inline-flex items-center justify-center font-bold bg-[#3F3F46] text-white ring-2 ring-white tabular-nums flex-shrink-0 box-content`}>
          +{overflow}
        </span>
      )}
      {showNames && (
        <span className="ml-2 text-caption text-black/55">{team[0]?.name.split(' ')[0]} {overflow > 0 ? `+ ${overflow}` : ''}</span>
      )}
    </div>
  );
}

function SegButton({
  active, accent, onClick, children,
}: {
  active: boolean;
  accent?: 'rose' | 'emerald';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeStyles =
    accent === 'rose'    ? 'bg-rose-50 text-rose-700'
    : accent === 'emerald'? 'bg-emerald-50 text-emerald-700'
                         : 'bg-[#EEF1FB] text-[#204CC7]';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // h-full lets the pill stretch to its parent's height (h-9), so the
      // segmented filter sits at the same 36px as the search input + CTA.
      // px-3 alone, no py — height comes from the parent.
      className={`inline-flex items-center h-full px-3 text-caption font-medium transition-colors first:rounded-l-md last:rounded-r-md focus-visible:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
        active ? activeStyles : 'text-black/60 hover:text-black/85 hover:bg-black/[0.03]'
      }`}
    >
      {children}
    </button>
  );
}

// (ChevronLeft was used by the standalone month pill row in the previous
// design — that row is gone; the MonthNavigator widget owns its own arrows.)

// ═════════════════════════════════════════════════════════════════════════════
// TEAM POPOVER — hover-revealed team list (HOD on top), used in list rows
// ═════════════════════════════════════════════════════════════════════════════

export function TeamPopover({ team }: { team: TeamMember[] }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const ROLE_ORDER: Record<Role, number> = {
    'HOD': 0, 'POD Head': 1, 'Manager': 2, 'Assistant Manager': 3, 'Executive': 4,
  };
  const sorted = [...team].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    // Small delay so the mouse can bridge from trigger → popover without
    // the popover disappearing mid-traverse.
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  const openPopover = useCallback(() => {
    cancelClose();
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(true);
  }, [cancelClose]);

  // Close on Escape, scroll, resize — repositioning on scroll inside a
  // table is more trouble than it's worth, so we just dismiss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDismiss = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open]);

  // Cleanup pending close timer on unmount so we don't setState after
  // the component is gone.
  useEffect(() => () => cancelClose(), [cancelClose]);

  // Compute fixed-position style from the trigger rect. Auto-flips above
  // when space below is tight, clamps to the viewport horizontally so the
  // popover never renders off-screen.
  const POPOVER_WIDTH = 240;
  const POPOVER_EST_HEIGHT = 40 + team.length * 36; // rough
  const popoverStyle = rect ? (() => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < POPOVER_EST_HEIGHT + 16 && rect.top > POPOVER_EST_HEIGHT + 16;
    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - POPOVER_WIDTH - 8;
    }
    if (left < 8) left = 8;
    return {
      position: 'fixed' as const,
      left,
      top: openUpward ? undefined : rect.bottom + 8,
      bottom: openUpward ? window.innerHeight - rect.top + 8 : undefined,
      width: POPOVER_WIDTH,
      zIndex: 60,
    };
  })() : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${team.length} team members. Hover or tap to see roster.`}
        aria-expanded={open}
        className="inline-flex items-center -space-x-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1"
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onFocus={openPopover}
        onBlur={scheduleClose}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) setOpen(false);
          else openPopover();
        }}
      >
        {team.slice(0, 3).map(m => (
          <Avatar key={m.initials} initials={m.initials} title="" ring />
        ))}
        {team.length > 3 && (
          // +N badge — solid zinc fill (not a faded tint) so it feels like
          // a deliberate "more" pill rather than a hole in the stack. Same
          // ring + box-content + font-weight as the Avatar so it lands on
          // the same baseline and reads as part of the family.
          <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold bg-[#3F3F46] text-white ring-2 ring-white tabular-nums text-[11px] flex-shrink-0 box-content">
            +{team.length - 3}
          </span>
        )}
      </button>

      {open && popoverStyle && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={popoverStyle}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-2"
        >
          <p className="px-4 pb-2 text-caption font-semibold text-black/60 uppercase tracking-wide border-b border-black/[0.04]">
            Team — {team.length}
          </p>
          <ul className="py-1.5">
            {sorted.map(m => (
              <li key={m.initials} className="flex items-center gap-2.5 px-4 py-1.5">
                <Avatar initials={m.initials} title="" size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-caption font-medium text-black/80 truncate">{m.name}</div>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  // Color graded by seniority — brand blue at the top,
                  // cooling toward emerald at the executive tier.
                  m.role === 'HOD'               ? 'bg-[#EEF1FB] text-[#204CC7]'
                  : m.role === 'POD Head'        ? 'bg-violet-50 text-violet-700'
                  : m.role === 'Manager'         ? 'bg-cyan-50 text-cyan-700'
                  : m.role === 'Assistant Manager' ? 'bg-amber-50 text-amber-700'
                  :                                'bg-emerald-50 text-emerald-700'
                }`}>
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OVERDUE VIEW — full-screen triage page for every overdue item across
// the book. Promoted out of the StoryDrawer (where the column squeeze
// was hurting readability on a list with 40+ rows). Reached via
// ?view=overdue from the Overdue card on the deliverables page.
// ═════════════════════════════════════════════════════════════════════════════

function OverdueView({ onBack }: { onBack: () => void }) {
  // Aggregate every checklist item across every business in the book.
  // Same shape the StoryWidgets card uses, just lifted out of that
  // component so the screen can stand on its own.
  type FlatItem = { item: ChecklistItem; client: Client; business: Business };
  const allItems: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    for (const c of clients) {
      for (const b of c.businesses) {
        const snap = b.history[0];
        if (!snap) continue;
        for (const item of snap.items) out.push({ item, client: c, business: b });
      }
    }
    return out;
  }, []);

  // ── Edit drafts ──
  // Status + assignee mutations on this triage page mirror the
  // per-business Recurring Checklist: store overrides keyed by
  // itemId, apply them when computing the visible row state. This
  // keeps the triage page interactive (mark Done from here, reassign
  // from here) without needing to plumb the change back into the
  // module-scope `clients` seed data — same pattern BusinessDetail
  // uses for its draftStatus / draftAssignee maps. Declared above
  // the `overdueItems` memo so the memo's dep list can read them.
  const [draftStatus, setDraftStatus] = useState<Record<string, ChecklistStatus>>({});
  const [draftAssignee, setDraftAssignee] = useState<Record<string, string>>({});
  const setStatus = (itemId: string, next: ChecklistStatus) =>
    setDraftStatus(prev => ({ ...prev, [itemId]: next }));
  const updateAssignee = (itemId: string, initials: string) =>
    setDraftAssignee(prev => ({ ...prev, [itemId]: initials }));

  // Pending OR pending-from-client past due → overdue. Drafts override
  // the seed status / assignee so changes made from this triage page
  // are reflected immediately — mark a row Done and it leaves the
  // overdue list; reassign and the new owner shows up.
  const overdueItems = useMemo(() => {
    return allItems
      .map(x => ({
        ...x,
        item: {
          ...x.item,
          status:   draftStatus[x.item.id]   ?? x.item.status,
          assignee: draftAssignee[x.item.id] ?? x.item.assignee,
        },
      }))
      .filter(x => (x.item.status === 'Pending' || x.item.status === 'Pending from client') && daysUntil(x.item.dueDate) < 0)
      .sort((a, b) => daysUntil(a.item.dueDate) - daysUntil(b.item.dueDate));
  }, [allItems, draftStatus, draftAssignee]);

  // Inline assignee popover state — which row's roster picker is
  // open + the trigger button's bounding rect (for portal positioning).
  const [openAssignee, setOpenAssignee] = useState<{ itemId: string; rect: DOMRect; team: TeamMember[] } | null>(null);
  const assigneePopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openAssignee) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenAssignee(null); };
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && assigneePopoverRef.current?.contains(t)) return;
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

  // ── Filter state ──
  // Four filter dimensions surface the cuts an HOD makes most often
  // when triaging overdue work:
  //   • Search    — text search across client / business / item / particulars
  //   • Category  — the compliance bucket (GST, TDS, BOA, …)
  //   • Type      — recurrence cadence (Monthly / Quarterly / Annually / One Time)
  //   • Severity  — how late: 1–7d, 8–14d, 15+d
  type SeverityFilter = 'all' | '1-7' | '8-14' | '15+';
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryName | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Frequency | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  // Distinct categories actually present in the overdue set — derived
  // so the dropdown only lists buckets the HOD can act on (no empty
  // "MSME" option when no MSME row is overdue).
  const availableCategories = useMemo(() => {
    const set = new Set<CategoryName>();
    for (const x of overdueItems) set.add(x.item.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [overdueItems]);

  const filteredOverdueItems = useMemo(() => {
    return overdueItems.filter(x => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${x.client.name} ${x.business.name} ${x.item.work} ${x.item.particulars}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter !== 'all' && x.item.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && x.item.frequency !== typeFilter) return false;
      if (severityFilter !== 'all') {
        const days = -daysUntil(x.item.dueDate);
        if (severityFilter === '1-7'  && (days < 1  || days > 7))  return false;
        if (severityFilter === '8-14' && (days < 8  || days > 14)) return false;
        if (severityFilter === '15+'  && days < 15)                return false;
      }
      return true;
    });
  }, [overdueItems, searchQuery, categoryFilter, typeFilter, severityFilter]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (severityFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setSeverityFilter('all');
  };

  return (
    <div className="-mx-8 -mt-6">
      {/* Sticky top bar — same seamless single-row chrome as the
          per-business deliverables view. Left cluster: back · title.
          Right cluster: filter controls + result count. All controls
          share `h-9` so the row reads as one continuous strip. */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 px-6 mb-6">
        <div className="flex items-center justify-between gap-3 py-3 flex-wrap">

          {/* ── Left cluster: Back · Title ── */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Recurring Checklist"
              title="Back to Recurring Checklist"
              className="w-9 h-9 rounded-md hover:bg-black/[0.05] flex items-center justify-center text-black/65 hover:text-black/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-black/90 text-h3 font-bold truncate">
              Overdue items
              <span className="text-black/55 font-normal ml-1.5">· {overdueItems.length} {overdueItems.length === 1 ? 'item' : 'items'} past due</span>
            </h1>
          </div>

          {/* ── Right cluster: filters ──
              Search → Category → Type → Severity → Clear → Count.
              Same h-9 height across every control so the row reads
              as one connected strip with no vertical drift. */}
          <div className="flex items-center gap-2 min-w-0">

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/45 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <label htmlFor="overdue-search" className="sr-only">Search overdue items</label>
              <input
                id="overdue-search"
                type="text"
                placeholder="Search client, business, or item…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-7 pr-7 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/40 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Category dropdown — only shows buckets present in the
                actual overdue set, so the HOD never picks an empty
                option. */}
            <div className="relative">
              <label htmlFor="overdue-category-filter" className="sr-only">Filter by category</label>
              <select
                id="overdue-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryName | 'all')}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Type (frequency) dropdown */}
            <div className="relative">
              <label htmlFor="overdue-type-filter" className="sr-only">Filter by type</label>
              <select
                id="overdue-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as Frequency | 'all')}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All types</option>
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Severity bucket — by days late. Three urgency tiers
                that map to how a real HOD triages: chase this week
                / chase escalation / call partner. */}
            <div className="relative">
              <label htmlFor="overdue-severity-filter" className="sr-only">Filter by severity</label>
              <select
                id="overdue-severity-filter"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All severity</option>
                <option value="1-7">1–7 days late</option>
                <option value="8-14">8–14 days late</option>
                <option value="15+">15+ days late</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Clear chip — visible only when ≥1 filter is set. The
                count of active filters lives inside the chip so the
                HOD reads "Clear (3)" as both affordance and tally. */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 h-9 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Clear ({activeFilterCount})
              </button>
            )}

            {/* Live result count — only renders when a filter narrows
                the view. Inline with the controls so it sits in the
                same eye-line. */}
            {activeFilterCount > 0 && (
              <span className="text-caption text-black/60 tabular-nums" role="status" aria-live="polite">
                <span className="font-semibold text-black/80">{filteredOverdueItems.length}</span>/<span className="font-semibold text-black/80">{overdueItems.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-6 space-y-5">

        {/* Items table or empty state. Item is the lead column —
            HOD reads "what's late" first, then "by how many days",
            then "where it lives", then "who owns it". Five clean
            columns, no nesting, sortable mentally by the days-late
            badge. Rows tinted soft rose so the entire surface
            announces "this is overdue" at a glance. */}
        {overdueItems.length === 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-6 py-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-body font-semibold text-emerald-700">Nothing overdue across the book.</p>
            <p className="text-caption text-black/55 mt-1">Every pending item is still within its due date.</p>
          </div>
        ) : filteredOverdueItems.length === 0 ? (
          <div className="rounded-xl border border-black/[0.06] bg-white px-6 py-10 text-center">
            <p className="text-body font-medium text-black/70">No overdue items match your filters.</p>
            <p className="text-caption text-black/55 mt-1">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[#204CC7] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded px-1"
              >
                Clear all filters
              </button>
              {' '}to see all {overdueItems.length} {overdueItems.length === 1 ? 'item' : 'items'}.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
            <table className="w-full" role="table" aria-label="Overdue items across all clients">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[24%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFBFC]">
                  <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Client / Business</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Item</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Due</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Assigned to</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filteredOverdueItems.map((x, i) => {
                  const assignee = TEAM_POOL[x.item.assignee];
                  const isAssigneeOpen = openAssignee?.itemId === x.item.id;
                  return (
                    <tr key={`${x.business.id}-${x.item.id}-${i}`} className="bg-rose-50/30 hover:bg-rose-50/55 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-body font-medium text-black/85 truncate">{x.client.name}</div>
                        <div className="text-caption text-black/55 truncate">{x.business.name}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-body font-medium text-black/85">{x.item.work}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        {/* Type pill — same neutral slate as the Type
                            dropdown on the per-business view, just
                            display-only here (this is a triage page,
                            not an edit page; click through to the
                            business detail to change cadence). */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-black/[0.03] border-black/[0.08] text-caption font-medium text-black/65">
                          {x.item.frequency}
                        </span>
                      </td>
                      {/* Status — fully editable here. Marking a row
                          Done from the triage page drops it out of the
                          overdue list immediately (the memo above
                          re-derives from drafts). N/A and Pending from
                          client are also reachable for the cases where
                          the HOD wants to re-categorise rather than
                          mark complete. */}
                      <td className="px-4 py-3.5">
                        <StatusDropdown
                          status={x.item.status}
                          overdue={true}
                          missed={false}
                          disabled={false}
                          onChange={(next) => setStatus(x.item.id, next)}
                          ariaLabel={`Status of "${x.item.work}". Overdue. Click to change.`}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-caption text-black/70 tabular-nums whitespace-nowrap">{fmtDateWithYear(x.item.dueDate)}</td>
                      {/* Assigned to — clickable button opens the
                          per-client roster popover so the HOD can
                          reassign without leaving the triage page.
                          Distinct from the Team column on the right
                          (which shows the whole client roster as a
                          read-only avatar stack). */}
                      <td className="px-4 py-3.5">
                        {assignee ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenAssignee(prev => prev?.itemId === x.item.id ? null : { itemId: x.item.id, rect, team: x.client.team });
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={isAssigneeOpen}
                            aria-label={`Assigned to ${assignee.name}. Click to reassign.`}
                            className="inline-flex items-center gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 max-w-full"
                          >
                            <Avatar initials={assignee.initials} title={`${assignee.name} · ${assignee.role}`} size="sm" />
                            <span className="text-caption text-black/75 truncate">{assignee.name.split(' ')[0]}</span>
                            <ChevronDown
                              className={`w-3 h-3 text-black/40 shrink-0 transition-transform ${isAssigneeOpen ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <span className="text-caption text-black/45">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <TeamPopover team={x.client.team} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-2.5 text-caption text-black/55 bg-[#FAFBFC] border-t border-black/5 tabular-nums">
              {filteredOverdueItems.length} of {overdueItems.length} overdue {overdueItems.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        )}
      </div>

      {/* ── Assignee switcher popover ──
          Mirrors the per-business Recurring Checklist popover —
          portal-rendered so the table's overflow doesn't clip it,
          fixed-positioned from the trigger's bounding rect, auto-
          flips above when there's no room below, horizontally
          clamps to the viewport. Each row carries its own client
          team in `openAssignee.team` so the picker shows only the
          people actually on that account. */}
      {openAssignee && typeof document !== 'undefined' && (() => {
        const PER_ITEM = 44;
        const HEADER  = 52;
        const VIEWPORT_GUTTER = 16;
        const POPOVER_WIDTH = 240;
        const naturalHeight = HEADER + openAssignee.team.length * PER_ITEM;
        const rect = openAssignee.rect;
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
        const spaceAbove = rect.top - VIEWPORT_GUTTER;
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
        // Resolve the row's current assignee by looking it up on the
        // (memoised) overdue list — `draftAssignee` overrides are
        // already baked into that list so the highlight stays in sync
        // even after a reassign.
        const currentInitials = overdueItems.find(x => x.item.id === openAssignee.itemId)?.item.assignee;
        return createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={() => setOpenAssignee(null)} aria-hidden="true" />
            <div
              ref={assigneePopoverRef}
              role="listbox"
              aria-label="Reassign overdue item"
              style={style}
              className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
            >
              <p className="px-4 pt-3 pb-2 text-caption font-semibold text-black/55 uppercase tracking-wide border-b border-black/[0.04] shrink-0">
                Reassign to
              </p>
              <ul className="py-1 overflow-y-auto flex-1 min-h-0">
                {openAssignee.team.map(member => {
                  const isCurrentAssignee = member.initials === currentInitials;
                  return (
                    <li key={member.initials}>
                      <button
                        role="option"
                        aria-selected={isCurrentAssignee}
                        onClick={() => {
                          if (!isCurrentAssignee) updateAssignee(openAssignee.itemId, member.initials);
                          setOpenAssignee(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${isCurrentAssignee ? 'bg-[#EEF1FB]/60' : 'hover:bg-black/[0.03]'} focus:outline-none focus-visible:bg-[#EEF1FB]`}
                      >
                        <Avatar initials={member.initials} title={member.name} size="sm" />
                        <span className={`flex-1 min-w-0 text-caption font-semibold truncate ${isCurrentAssignee ? 'text-[#204CC7]' : 'text-black/85'}`}>{member.name}</span>
                        {isCurrentAssignee && (
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
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DUE-THIS-WEEK VIEW — full-screen lookahead page for every item due in
// the next 7 days across the book. Same shape as OverdueView (sticky
// chrome with seamless filter system, single-row triage table) but
// tuned for the upcoming-deadlines mental model: amber instead of
// rose, "Days until" instead of "Days late", and a "When" filter
// instead of "Severity".
// ═════════════════════════════════════════════════════════════════════════════

function DueThisWeekView({ onBack }: { onBack: () => void }) {
  type FlatItem = { item: ChecklistItem; client: Client; business: Business };
  const allItems: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    for (const c of clients) {
      for (const b of c.businesses) {
        const snap = b.history[0];
        if (!snap) continue;
        for (const item of snap.items) out.push({ item, client: c, business: b });
      }
    }
    return out;
  }, []);

  // ── Edit drafts ──
  // Same pattern OverdueView and BusinessDetail use: store status /
  // assignee overrides keyed by itemId, apply them when computing
  // the visible row state. Lets the HOD mark a row Done (drops out
  // of upcoming list) or reassign without leaving the triage page.
  // Session-only — refreshing restores the seed.
  const [draftStatus, setDraftStatus] = useState<Record<string, ChecklistStatus>>({});
  const [draftAssignee, setDraftAssignee] = useState<Record<string, string>>({});
  const setStatus = (itemId: string, next: ChecklistStatus) =>
    setDraftStatus(prev => ({ ...prev, [itemId]: next }));
  const updateAssignee = (itemId: string, initials: string) =>
    setDraftAssignee(prev => ({ ...prev, [itemId]: initials }));

  // Inline assignee popover — mirrors OverdueView's popover. Each
  // row carries its own client team in the state so the picker
  // surfaces only the people on that account, not a global pool.
  const [openAssignee, setOpenAssignee] = useState<{ itemId: string; rect: DOMRect; team: TeamMember[] } | null>(null);
  const assigneePopoverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openAssignee) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenAssignee(null); };
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && assigneePopoverRef.current?.contains(t)) return;
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

  // Pending or pending-from-client items due in the next 7 days
  // (today through 7 days out). Already-overdue items aren't in
  // scope here — they live on the Overdue page. Drafts override
  // seed data so a row marked Done from this page leaves the list
  // immediately, and reassignments propagate into the visible row.
  const dueItems = useMemo(() => {
    return allItems
      .map(x => ({
        ...x,
        item: {
          ...x.item,
          status:   draftStatus[x.item.id]   ?? x.item.status,
          assignee: draftAssignee[x.item.id] ?? x.item.assignee,
        },
      }))
      .filter(x => {
        if (x.item.status !== 'Pending' && x.item.status !== 'Pending from client') return false;
        const d = daysUntil(x.item.dueDate);
        return d >= 0 && d <= 7;
      })
      .sort((a, b) => daysUntil(a.item.dueDate) - daysUntil(b.item.dueDate));
  }, [allItems, draftStatus, draftAssignee]);

  // ── Filters ──
  // Same four dimensions as Overdue, with "When" replacing "Severity":
  //   • Search   — text across client/business/item/particulars
  //   • Category — compliance bucket (GST, TDS, BOA, …)
  //   • Type     — recurrence cadence
  //   • When     — Today / 1–3 days / 4–7 days
  type WhenFilter = 'all' | 'today' | '1-3' | '4-7';
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryName | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<Frequency | 'all'>('all');
  const [whenFilter, setWhenFilter] = useState<WhenFilter>('all');

  const availableCategories = useMemo(() => {
    const set = new Set<CategoryName>();
    for (const x of dueItems) set.add(x.item.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dueItems]);

  const filteredDueItems = useMemo(() => {
    return dueItems.filter(x => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${x.client.name} ${x.business.name} ${x.item.work} ${x.item.particulars}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter !== 'all' && x.item.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && x.item.frequency !== typeFilter) return false;
      if (whenFilter !== 'all') {
        const d = daysUntil(x.item.dueDate);
        if (whenFilter === 'today' && d !== 0) return false;
        if (whenFilter === '1-3'   && (d < 1 || d > 3)) return false;
        if (whenFilter === '4-7'   && (d < 4 || d > 7)) return false;
      }
      return true;
    });
  }, [dueItems, searchQuery, categoryFilter, typeFilter, whenFilter]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (whenFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setWhenFilter('all');
  };

  // Tone classes for the per-row time-context pill
  return (
    <div className="-mx-8 -mt-6">
      {/* Sticky top bar — single seamless row, same chrome as OverdueView */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 px-6 mb-6">
        <div className="flex items-center justify-between gap-3 py-3 flex-wrap">

          {/* Left: Back · Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Recurring Checklist"
              title="Back to Recurring Checklist"
              className="w-9 h-9 rounded-md hover:bg-black/[0.05] flex items-center justify-center text-black/65 hover:text-black/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h1 className="text-black/90 text-h3 font-bold truncate">
              Due this week
              <span className="text-black/55 font-normal ml-1.5">· {dueItems.length} {dueItems.length === 1 ? 'item' : 'items'} coming up</span>
            </h1>
          </div>

          {/* Right: filters */}
          <div className="flex items-center gap-2 min-w-0">

            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/45 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <label htmlFor="thisweek-search" className="sr-only">Search items due this week</label>
              <input
                id="thisweek-search"
                type="text"
                placeholder="Search client, business, or item…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-7 pr-7 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/40 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            <div className="relative">
              <label htmlFor="thisweek-category-filter" className="sr-only">Filter by category</label>
              <select
                id="thisweek-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryName | 'all')}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            <div className="relative">
              <label htmlFor="thisweek-type-filter" className="sr-only">Filter by type</label>
              <select
                id="thisweek-type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as Frequency | 'all')}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All types</option>
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* When dropdown — three time buckets that match how an
                HOD plans the week: today's deadlines, the next-three-
                days sprint, and the rest of the week. */}
            <div className="relative">
              <label htmlFor="thisweek-when-filter" className="sr-only">Filter by when due</label>
              <select
                id="thisweek-when-filter"
                value={whenFilter}
                onChange={(e) => setWhenFilter(e.target.value as WhenFilter)}
                className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="all">All week</option>
                <option value="today">Today</option>
                <option value="1-3">Next 1–3 days</option>
                <option value="4-7">In 4–7 days</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 h-9 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                Clear ({activeFilterCount})
              </button>
            )}

            {activeFilterCount > 0 && (
              <span className="text-caption text-black/60 tabular-nums" role="status" aria-live="polite">
                <span className="font-semibold text-black/80">{filteredDueItems.length}</span>/<span className="font-semibold text-black/80">{dueItems.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-6 space-y-5">
        {dueItems.length === 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-6 py-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-body font-semibold text-emerald-700">Nothing due in the next 7 days.</p>
            <p className="text-caption text-black/55 mt-1">The week ahead is clear — keep watching the Overdue page for anything past due.</p>
          </div>
        ) : filteredDueItems.length === 0 ? (
          <div className="rounded-xl border border-black/[0.06] bg-white px-6 py-10 text-center">
            <p className="text-body font-medium text-black/70">No upcoming items match your filters.</p>
            <p className="text-caption text-black/55 mt-1">
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[#204CC7] font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded px-1"
              >
                Clear all filters
              </button>
              {' '}to see all {dueItems.length} {dueItems.length === 1 ? 'item' : 'items'}.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
            <table className="w-full" role="table" aria-label="Items due in the next 7 days">
              <colgroup>
                <col className="w-[19%]" />
                <col className="w-[24%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFBFC]">
                  <th scope="col" className="px-5 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Client / Business</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Item</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Type</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Due</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Assigned to</th>
                  <th scope="col" className="px-4 py-3 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Team</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filteredDueItems.map((x, i) => {
                  const d = daysUntil(x.item.dueDate);
                  const isToday = d === 0;
                  const assignee = TEAM_POOL[x.item.assignee];
                  const isAssigneeOpen = openAssignee?.itemId === x.item.id;
                  return (
                    <tr key={`${x.business.id}-${x.item.id}-${i}`} className={`hover:bg-black/[0.015] transition-colors ${isToday ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="text-body font-medium text-black/85 truncate">{x.client.name}</div>
                        <div className="text-caption text-black/55 truncate">{x.business.name}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-body font-medium text-black/85">{x.item.work}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-black/[0.03] border-black/[0.08] text-caption font-medium text-black/65">
                          {x.item.frequency}
                        </span>
                      </td>
                      {/* Status — fully editable. Marking Done from
                          here drops the row out of the upcoming list
                          immediately (the dueItems memo re-derives
                          from drafts). Same dropdown the per-business
                          checklist uses. */}
                      <td className="px-4 py-3.5">
                        <StatusDropdown
                          status={x.item.status}
                          overdue={false}
                          missed={false}
                          disabled={false}
                          onChange={(next) => setStatus(x.item.id, next)}
                          ariaLabel={`Status of "${x.item.work}". ${x.item.status}. Click to change.`}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-caption text-black/70 tabular-nums whitespace-nowrap">{fmtDateWithYear(x.item.dueDate)}</td>
                      {/* Assigned to — clickable button opens the
                          per-client roster popover so the HOD can
                          reassign without leaving the page. Distinct
                          from the Team column on the right (read-only
                          avatar stack of the whole client team). */}
                      <td className="px-4 py-3.5">
                        {assignee ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenAssignee(prev => prev?.itemId === x.item.id ? null : { itemId: x.item.id, rect, team: x.client.team });
                            }}
                            aria-haspopup="listbox"
                            aria-expanded={isAssigneeOpen}
                            aria-label={`Assigned to ${assignee.name}. Click to reassign.`}
                            className="inline-flex items-center gap-2 -mx-2 px-2 py-1 rounded-md hover:bg-black/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 max-w-full"
                          >
                            <Avatar initials={assignee.initials} title={`${assignee.name} · ${assignee.role}`} size="sm" />
                            <span className="text-caption text-black/75 truncate">{assignee.name.split(' ')[0]}</span>
                            <ChevronDown
                              className={`w-3 h-3 text-black/40 shrink-0 transition-transform ${isAssigneeOpen ? 'rotate-180' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ) : (
                          <span className="text-caption text-black/45">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <TeamPopover team={x.client.team} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-2.5 text-caption text-black/55 bg-[#FAFBFC] border-t border-black/5 tabular-nums">
              {activeFilterCount > 0
                ? `${filteredDueItems.length} of ${dueItems.length} upcoming ${dueItems.length === 1 ? 'item' : 'items'}`
                : `${dueItems.length} upcoming ${dueItems.length === 1 ? 'item' : 'items'}`}
            </div>
          </div>
        )}
      </div>

      {/* ── Assignee switcher popover ──
          Same portal-rendered popover the OverdueView and per-
          business Recurring Checklist use. Auto-flips above when
          space below is tight; horizontally clamps to the viewport.
          The active row's client team rides along on the open state
          so the picker shows only that account's people. */}
      {openAssignee && typeof document !== 'undefined' && (() => {
        const PER_ITEM = 44;
        const HEADER  = 52;
        const VIEWPORT_GUTTER = 16;
        const POPOVER_WIDTH = 240;
        const naturalHeight = HEADER + openAssignee.team.length * PER_ITEM;
        const rect = openAssignee.rect;
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
        const spaceAbove = rect.top - VIEWPORT_GUTTER;
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
        const currentInitials = dueItems.find(x => x.item.id === openAssignee.itemId)?.item.assignee;
        return createPortal(
          <>
            <div className="fixed inset-0 z-[10000]" onClick={() => setOpenAssignee(null)} aria-hidden="true" />
            <div
              ref={assigneePopoverRef}
              role="listbox"
              aria-label="Reassign upcoming item"
              style={style}
              className="bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden"
            >
              <p className="px-4 pt-3 pb-2 text-caption font-semibold text-black/55 uppercase tracking-wide border-b border-black/[0.04] shrink-0">
                Reassign to
              </p>
              <ul className="py-1 overflow-y-auto flex-1 min-h-0">
                {openAssignee.team.map(member => {
                  const isCurrentAssignee = member.initials === currentInitials;
                  return (
                    <li key={member.initials}>
                      <button
                        role="option"
                        aria-selected={isCurrentAssignee}
                        onClick={() => {
                          if (!isCurrentAssignee) updateAssignee(openAssignee.itemId, member.initials);
                          setOpenAssignee(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${isCurrentAssignee ? 'bg-[#EEF1FB]/60' : 'hover:bg-black/[0.03]'} focus:outline-none focus-visible:bg-[#EEF1FB]`}
                      >
                        <Avatar initials={member.initials} title={member.name} size="sm" />
                        <span className={`flex-1 min-w-0 text-caption font-semibold truncate ${isCurrentAssignee ? 'text-[#204CC7]' : 'text-black/85'}`}>{member.name}</span>
                        {isCurrentAssignee && (
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
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STORY WIDGETS — four cards that narrate the day's state (Overdue · Due
// this week · Team workload · By category). Overdue and Due-this-week
// each open dedicated full-page screens; the rest open a side drawer.
// ═════════════════════════════════════════════════════════════════════════════

type StoryWidgetId = 'overdue' | 'thisWeek' | 'workload';

function StoryWidgets({ rows, isCurrent, onOpenOverdue, onOpenThisWeek, onOpenBregoTeam }: { rows: BusinessRow[]; isCurrent: boolean; onOpenOverdue: () => void; onOpenThisWeek: () => void; onOpenBregoTeam: () => void }) {
  // Drawer state covers the cards that still drill into a side panel.
  // Overdue and Due-this-week each have their own full screen now —
  // both are primary triage tasks that need the room to scan a long
  // list of items with client / business / due-date / team detail.
  const [open, setOpen] = useState<Exclude<StoryWidgetId, 'overdue' | 'thisWeek'> | null>(null);

  // Aggregate every checklist item across all visible business rows.
  type FlatItem = { item: ChecklistItem; client: Client; business: Business };
  const allItems: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];
    for (const r of rows) {
      const snap = r.business.history.find(s => s.month === r.business.history[0].month);
      if (!snap) continue;
      for (const item of snap.items) out.push({ item, client: r.client, business: r.business });
    }
    return out;
  }, [rows]);

  // Story-widget filters at the top of the table. "Pending" here
  // means anything still owed — own-team or pending-on-client. N/A
  // and Completed are excluded.
  const isStillPending = (s: ChecklistStatus) =>
    s === 'Pending' || s === 'Pending from client';
  const overdue = useMemo(
    () => allItems.filter(x => isStillPending(x.item.status) && daysUntil(x.item.dueDate) < 0),
    [allItems]
  );
  const thisWeek = useMemo(() => {
    return allItems.filter(x => {
      if (!isStillPending(x.item.status)) return false;
      const d = daysUntil(x.item.dueDate);
      return d >= 0 && d <= 7;
    });
  }, [allItems]);

  // Workload: pending items per assignee (current month only).
  // Sort order: HODs always pinned to the top (they're the accountable
  // owners regardless of how few items they personally execute on), then
  // the rest of the team ranked by load descending. Within the HOD tier
  // and within the non-HOD tier we still sort by count desc so the
  // busiest person in each tier surfaces first. We seed the map with
  // every HOD in the team pool so an HOD with zero personal items still
  // shows up at the top of the list (they remain accountable for the
  // overall service workload).
  const workload = useMemo(() => {
    // Per-member tally: done / pending (own) / pending-from-client /
    // overdue / total. The drawer's load bars need all of these to
    // distinguish "drowning in work" from "drowning in overdue".
    type Tally = { done: number; pending: number; overdueCount: number; total: number };
    const map = new Map<string, Tally>();
    const seed = (initials: string) => {
      if (!map.has(initials)) map.set(initials, { done: 0, pending: 0, overdueCount: 0, total: 0 });
      return map.get(initials)!;
    };
    // HODs are seeded so they always appear in the list even with 0 items.
    for (const m of Object.values(TEAM_POOL)) {
      if (m.role === 'HOD') seed(m.initials);
    }
    for (const x of allItems) {
      const t = seed(x.item.assignee);
      t.total += 1;
      if (x.item.status === 'Completed') {
        t.done += 1;
      } else if (x.item.status === 'Pending' || x.item.status === 'Pending from client') {
        t.pending += 1;
        if (daysUntil(x.item.dueDate) < 0) t.overdueCount += 1;
      }
      // 'N/A' items count toward total but not toward done or pending.
    }
    return Array.from(map.entries())
      .map(([initials, t]) => ({
        member: TEAM_POOL[initials],
        // `count` retained for any legacy consumer; it's the pending bucket.
        count: t.pending,
        done: t.done,
        pending: t.pending,
        overdueCount: t.overdueCount,
        total: t.total,
      }))
      .filter(x => x.member)
      .sort((a, b) => {
        // HODs pinned first; then most-overdue first; then most-pending first.
        const aHod = a.member.role === 'HOD' ? 0 : 1;
        const bHod = b.member.role === 'HOD' ? 0 : 1;
        if (aHod !== bHod) return aHod - bHod;
        if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
        return b.pending - a.pending;
      });
  }, [allItems]);

  // (Previously the Overdue card carried richer subline copy —
  // affected-business count + top categories. Simplified to a single
  // "Across N clients" sub matching the Due this week card, which
  // dropped the supporting `overdueByCategory` and `overdueStats`
  // memos. Kept the comment around so future contributors know the
  // shape that used to live here.)

  // Due-this-week severity — how many of them are due today specifically
  // (GST-filing-day urgency).
  const dueTodayCount = useMemo(
    () => thisWeek.filter(x => daysUntil(x.item.dueDate) === 0).length,
    [thisWeek]
  );

  // Headline metric for the Brego Delivery Team card — total
  // actionable items across the team's book (Done + Pending). N/A
  // items are excluded since they aren't real work.
  const totalTasks = workload.reduce((s, w) => s + w.done + w.pending, 0);
  const teamMembers = useMemo(
    () => workload.map(w => w.member).filter(Boolean) as TeamMember[],
    [workload]
  );

  return (
    <>
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-caption font-bold text-black/65 uppercase tracking-[0.08em]">
            {isCurrent ? "Today's story" : 'Snapshot'}
          </h2>
          <span className="text-caption text-black/40">Click any card for the full breakdown</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StoryCard
            tone={overdue.length > 0 ? 'rose' : 'neutral'}
            label="Overdue items"
            value={overdue.length}
            sub={
              overdue.length > 0
                ? `Across ${new Set(overdue.map(x => x.client.id)).size} clients`
                : 'All caught up'
            }
            onClick={onOpenOverdue}
          />
          <StoryCard
            tone={dueTodayCount > 0 ? 'amber' : thisWeek.length > 5 ? 'amber' : 'neutral'}
            label="Due this week"
            value={thisWeek.length}
            chip={dueTodayCount > 0 ? { text: `${dueTodayCount} today`, tone: 'amber' } : undefined}
            sub={
              thisWeek.length > 0
                ? `Across ${new Set(thisWeek.map(x => x.client.id)).size} clients`
                : 'Nothing due this week'
            }
            onClick={onOpenThisWeek}
          />
          <BregoDeliveryTeamCard
            totalTasks={totalTasks}
            members={teamMembers}
            onClick={onOpenBregoTeam}
          />
        </div>
      </div>

      {/* Drawer */}
      {open && (
        <StoryDrawer
          which={open}
          onClose={() => setOpen(null)}
          overdue={overdue}
          thisWeek={thisWeek}
          workload={workload}
        />
      )}
    </>
  );
}

function StoryCard({
  tone, label, value, sub, chip, onClick,
}: {
  tone: 'rose' | 'amber' | 'neutral';
  label: string;
  value: number;
  sub: string;
  chip?: { text: string; tone: 'rose' | 'amber' | 'emerald' };
  onClick: () => void;
}) {
  const valueClass = tone === 'rose' && value > 0 ? 'text-rose-600' : tone === 'amber' && value > 0 ? 'text-amber-600' : 'text-black/85';
  const chipToneClass = (t: 'rose' | 'amber' | 'emerald') =>
    t === 'rose' ? 'bg-rose-50 text-rose-700 border-rose-100'
    : t === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-emerald-50 text-emerald-700 border-emerald-100';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group bg-white border border-black/[0.06] rounded-xl p-4 text-left hover:border-[#204CC7]/30 hover:shadow-[0_8px_24px_-12px_rgba(32,76,199,0.18)] hover:-translate-y-[1px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption font-semibold text-black/60">{label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className={`text-h1 leading-none tabular-nums ${valueClass}`}>{value}</div>
        {chip && (
          <span className={`text-caption font-semibold px-2 py-0.5 rounded-md border ${chipToneClass(chip.tone)} tabular-nums`}>
            {chip.text}
          </span>
        )}
      </div>
      <p className="text-caption text-black/60 mt-2 truncate">{sub}</p>
    </button>
  );
}

/**
 * BregoDeliveryTeamCard — peer of the other two story cards. Same
 * skeleton (label · chevron · big number · sub line) so the row reads
 * as a uniform 3-up. The "sub line" position carries the team avatar
 * stack + member count, which is what makes this card distinct
 * without breaking visual rhythm. Drills into the workload drawer.
 *
 *   ┌──────────────────────────────────────┐
 *   │ Brego Delivery Team               ›  │
 *   │ 1890                                 │
 *   │ ●●●●● +7  12 members                 │
 *   └──────────────────────────────────────┘
 */
function BregoDeliveryTeamCard({
  totalTasks, members, onClick, className,
}: {
  totalTasks: number;
  members: TeamMember[];
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Team Tasks — ${totalTasks} tasks across ${members.length} members`}
      className={`group bg-white border border-black/[0.06] rounded-xl p-4 text-left hover:border-[#204CC7]/30 hover:shadow-[0_8px_24px_-12px_rgba(32,76,199,0.18)] hover:-translate-y-[1px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 ${className ?? ''}`}
    >
      {/* Top row — label + chevron, identical placement to StoryCard so
          the row of three reads with a single chevron column on the right. */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption font-semibold text-black/60">Team Tasks</span>
        <ChevronRight className="w-3.5 h-3.5 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
      </div>
      {/* Headline number — total tasks across the team's book. */}
      <div className="text-h1 leading-none tabular-nums text-black/85">{totalTasks}</div>
      {/* Sub-line — slot reserved for the same vertical position as the
          other two cards' descriptive sub. Here it carries the team
          avatar stack + member count. */}
      <div className="flex items-center gap-2 mt-2">
        <TeamAvatars team={members} max={5} size="sm" />
        <span className="text-caption text-black/60 tabular-nums">{members.length} members</span>
      </div>
    </button>
  );
}

// Shared drawer for the remaining story widgets — body switches on `which`.
function StoryDrawer({
  which, onClose, overdue, thisWeek, workload,
}: {
  which: StoryWidgetId;
  onClose: () => void;
  overdue: { item: ChecklistItem; client: Client; business: Business }[];
  thisWeek: { item: ChecklistItem; client: Client; business: Business }[];
  workload: { member: TeamMember; count: number; done: number; pending: number; overdueCount: number; total: number }[];
}) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => { document.removeEventListener('keydown', handle); window.clearTimeout(t); };
  }, [onClose]);

  const meta: Record<StoryWidgetId, { title: string; subtitle: string }> = {
    overdue:  { title: 'Overdue items',         subtitle: 'Pending items past their due date — needs action today.' },
    thisWeek: { title: 'Due this week',         subtitle: 'Pending items with due dates in the next 7 days.' },
    workload: { title: 'Team Tasks',            subtitle: 'Per-member completion across the book — one progress bar per teammate.' },
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" aria-hidden="true" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="at-story-drawer-title"
        className="fixed top-0 right-0 h-screen w-[720px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="at-story-drawer-title" className="text-h2 font-bold text-black/90">{meta[which].title}</h2>
            <p className="text-caption text-black/55 mt-1.5">{meta[which].subtitle}</p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
          >
            <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-7 py-5">
          {(which === 'overdue' || which === 'thisWeek') && (
            <StoryItemList items={which === 'overdue' ? overdue : thisWeek} mode={which} />
          )}
          {which === 'workload' && <StoryWorkloadList workload={workload} />}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROW MENU + TDS / GST DRAWERS
//
// Every row in the deliverables table now ends with a 3-dots button
// instead of a mute right-chevron. The menu offers two quick-info
// drawers — one for TDS / Income Tax credentials and one for GST —
// keyed to the business in that row. Both drawers are intentionally
// minimal: a couple of identifier fields, an open-ended user/password
// pair (no encryption — matches the explicit ask), and a free-form
// notes field; the GST drawer adds inline status pickers for the
// monthly returns (GSTR 1 / 2B / 3B / TCS).
// ─────────────────────────────────────────────────────────────────────────────

export type ReturnStatus = 'Pending' | 'Done' | 'WIP' | 'N/A';
// GST returns track only the three-state cycle (Pending → WIP → Done).
// Profession-tax certificates additionally support 'N/A' for clients
// where the registration doesn't apply (no employees / sole proprietor
// without registered staff, etc.). Income-tax filings (ITR Filed /
// ITR Verified) are binary — either filed/verified or not — so the
// IT picker collapses to just two states.
export const GST_RETURN_OPTIONS: ReturnStatus[] = ['Pending', 'Done', 'WIP'];
export const PT_RETURN_OPTIONS:  ReturnStatus[] = ['Pending', 'Done', 'WIP', 'N/A'];
export const IT_RETURN_OPTIONS:  ReturnStatus[] = ['Pending', 'Done'];

export interface TdsRecord {
  tan: string;
  userId: string;
  password: string;
  notes: string;
}
/** One GST registration. A business in a state has its own GSTN, set
 *  of portal credentials, and four monthly returns (GSTR 1 / GSTR 2B
 *  / GSTR 3B / TCS). Multi-state businesses register separately in
 *  every state they operate from, so a single client can carry an
 *  arbitrary number of GST entries — same pattern as the EcomPortal
 *  list on the E-Com Reco drawer. */
export interface GstEntry {
  id: string;
  gstn: string;
  userId: string;
  password: string;
  gstr1: ReturnStatus;
  gstr2b: ReturnStatus;
  gstr3b: ReturnStatus;
  tcs: ReturnStatus;
}
export interface GstRecord {
  entries: GstEntry[];
  notes: string;
}
/** Earlier shape — single GSTN with flat fields. Kept around so any
 *  in-memory record from before the multi-entry redesign can be lifted
 *  forward without losing data. */
type LegacyGstRecord = {
  gstn?: string;
  userId?: string;
  password?: string;
  gstr1?: ReturnStatus;
  gstr2b?: ReturnStatus;
  gstr3b?: ReturnStatus;
  tcs?: ReturnStatus;
  notes?: string;
};
export interface PtRecord {
  ptec: string;        // PTEC No.
  userId: string;
  password: string;
  ptecStatus: ReturnStatus;
  ptrcStatus: ReturnStatus;
  notes: string;
}
export interface IncomeTaxRecord {
  pan: string;         // PAN No.
  password: string;
  itrFiled: ReturnStatus;
  itrVerified: ReturnStatus;
  notes: string;
}
/** One e-commerce portal entry. Admin can add an arbitrary number of
 *  these; each card carries the credentials + storefront URL + a
 *  per-portal reconciliation status (Pending / Done / WIP) so the
 *  HOD can scan the list and see at a glance which portals still
 *  need attention. */
export interface EcomPortal {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  status: ReturnStatus;
}
export interface EcomRecoRecord {
  portals: EcomPortal[];
  notes: string;
}

export const EMPTY_TDS: TdsRecord = { tan: '', userId: '', password: '', notes: '' };
export const EMPTY_GST: GstRecord = { entries: [], notes: '' };
/** Mint a stable id for GST entries the admin adds inside the drawer. */
export const newGstEntryId = (): string => `gstn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
/** Build a fresh empty entry, optionally pre-filled with the business's
 *  primary GSTN so the first card the admin sees reflects what they
 *  already know about this client. */
export const buildEmptyGstEntry = (gstn = ''): GstEntry => ({
  id: newGstEntryId(),
  gstn,
  userId: '',
  password: '',
  gstr1: 'Pending',
  gstr2b: 'Pending',
  gstr3b: 'Pending',
  tcs: 'Pending',
});
/** Lift any value (undefined / legacy single-GSTN shape / new multi-
 *  entry shape) into the canonical `GstRecord` shape. Keeps the drawer
 *  resilient to in-memory state created before the redesign. */
export function coerceGstRecord(v: GstRecord | LegacyGstRecord | undefined, defaultGstn = ''): GstRecord {
  if (!v) return { entries: [], notes: '' };
  if ('entries' in v && Array.isArray((v as GstRecord).entries)) {
    return v as GstRecord;
  }
  const lg = v as LegacyGstRecord;
  const hasContent = !!(lg.gstn || lg.userId || lg.password);
  return {
    entries: hasContent ? [{
      id: newGstEntryId(),
      gstn:     lg.gstn     ?? defaultGstn,
      userId:   lg.userId   ?? '',
      password: lg.password ?? '',
      gstr1:    lg.gstr1    ?? 'Pending',
      gstr2b:   lg.gstr2b   ?? 'Pending',
      gstr3b:   lg.gstr3b   ?? 'Pending',
      tcs:      lg.tcs      ?? 'Pending',
    }] : [],
    notes: lg.notes ?? '',
  };
}
export const EMPTY_PT: PtRecord = {
  ptec: '', userId: '', password: '',
  ptecStatus: 'Pending', ptrcStatus: 'Pending',
  notes: '',
};
export const EMPTY_IT: IncomeTaxRecord = {
  pan: '', password: '',
  itrFiled: 'Pending', itrVerified: 'Pending',
  notes: '',
};
export const EMPTY_ECOM: EcomRecoRecord = { portals: [], notes: '' };
/** Mint a stable id for portal rows the admin adds inside the drawer. */
const newPortalId = (): string => `portal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** 3-dots button at the end of every row. Owns its own popover state.
 *  The portal-rendered menu auto-flips up when there's no room below
 *  and dismisses on outside click / Escape / scroll. */
function RowMenu({
  businessName, businessType, onOpenTds, onOpenGst, onOpenPt, onOpenIt, onOpenEcom,
}: {
  businessName: string;
  businessType: BusinessType;
  onOpenTds: () => void;
  onOpenGst: () => void;
  onOpenPt: () => void;
  onOpenIt: () => void;
  onOpenEcom: () => void;
}) {
  const showEcom = businessType === 'E-Commerce';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    // Anchor the menu's right edge to the button's right edge so it
    // never overflows the viewport on the right; auto-flip up if
    // there's not enough room below. Height grows with each menu
    // item — base list is 4 items (TDS, GST, PTRC/PTEC, Income Tax),
    // E-Com Reco adds a 5th only for E-Commerce businesses.
    const MENU_HEIGHT = showEcom ? 212 : 172;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < MENU_HEIGHT + 12 && r.top > MENU_HEIGHT + 12
      ? r.top - MENU_HEIGHT - 4
      : r.bottom + 4;
    setPos({ top, right: window.innerWidth - r.right });
  }, [showEcom]);

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onResize = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  const handlePick = (action: 'tds' | 'gst' | 'pt' | 'it' | 'ecom') => {
    setOpen(false);
    if (action === 'tds') onOpenTds();
    else if (action === 'gst') onOpenGst();
    else if (action === 'pt') onOpenPt();
    else if (action === 'it') onOpenIt();
    else onOpenEcom();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${businessName}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-black/45 hover:text-black/85 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-1 transition-colors"
      >
        <MoreVertical className="w-4 h-4" aria-hidden="true" />
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[10000] bg-white rounded-md border border-black/[0.08] shadow-xl py-1 min-w-[200px]"
          style={{ top: pos.top, right: pos.right }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePick('tds')}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-caption text-black/75 hover:bg-[#F4F6FF] hover:text-[#204CC7] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            TDS — Income Tax
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePick('gst')}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-caption text-black/75 hover:bg-[#F4F6FF] hover:text-[#204CC7] transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
            GST
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePick('pt')}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-caption text-black/75 hover:bg-[#F4F6FF] hover:text-[#204CC7] transition-colors"
          >
            <ScrollText className="w-3.5 h-3.5" aria-hidden="true" />
            PTRC / PTEC
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handlePick('it')}
            className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-caption text-black/75 hover:bg-[#F4F6FF] hover:text-[#204CC7] transition-colors"
          >
            <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
            Income Tax
          </button>
          {showEcom && (
            <button
              type="button"
              role="menuitem"
              onClick={() => handlePick('ecom')}
              className="w-full text-left px-3 py-2 flex items-center gap-2.5 text-caption text-black/75 hover:bg-[#F4F6FF] hover:text-[#204CC7] transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
              E-Com Reco
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

/** Shared chrome for the TDS and GST quick-info drawers — same
 *  right-side panel pattern the StoryDrawer uses, with title +
 *  business subtitle in the header and the body slot underneath. */
function QuickInfoDrawer({
  title, business, client, onClose, children,
}: {
  title: string;
  business: Business;
  client: Client;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 60);
    return () => { document.removeEventListener('keydown', handle); window.clearTimeout(t); };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="at-quickinfo-title"
        className="fixed top-0 right-0 h-screen w-[560px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
        style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 gap-4">
          <div className="min-w-0 flex-1">
            <h2 id="at-quickinfo-title" className="text-h2 font-bold text-black/90">{title}</h2>
            <p className="text-caption text-black/55 mt-1.5">
              <span className="font-medium text-black/75">{business.name}</span>
              {business.name !== client.name && (
                <>
                  <span className="text-black/25 mx-1.5">·</span>
                  {client.name}
                </>
              )}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
          >
            <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-7 py-6">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

/** Reusable label + control wrapper. Keeps every field in the TDS /
 *  GST drawers visually aligned without per-field repetition. */
function FieldLabel({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-caption font-semibold text-black/65">{label}</label>
      {children}
    </div>
  );
}

const TEXT_INPUT_CLS =
  'w-full h-9 px-3 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all';

/** Pending / Done / WIP (and optionally N/A) picker — same pill-and-
 *  menu pattern as the deliverables table's StatusDropdown.
 *  Trigger is a coloured pill (emerald = Done, blue = WIP,
 *  amber = Pending, slate = N/A) with a chevron; menu is portal-
 *  rendered so it isn't clipped by the drawer body's scroll container.
 *  The available options are passed in by the caller so the same
 *  dropdown serves both 3-state (GST returns) and 4-state (PTRC/PTEC)
 *  surfaces. */
export function ReturnStatusDropdown({
  value, options, onChange, ariaLabel,
}: {
  value: ReturnStatus;
  options: ReturnStatus[];
  onChange: (v: ReturnStatus) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const tone = (s: ReturnStatus) => {
    if (s === 'Done') return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' };
    if (s === 'WIP')  return { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200'    };
    if (s === 'N/A')  return { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-200'   };
    return                   { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'   };
  };

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const MENU_HEIGHT = options.length * 36 + 12;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < MENU_HEIGHT + 12 && r.top > MENU_HEIGHT + 12
      ? r.top - MENU_HEIGHT - 4
      : r.bottom + 6;
    setPos({ top, left: r.left });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onResize = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  const t = tone(value);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ring-1 ${t.bg} ${t.text} ${t.ring} hover:brightness-95 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2`}
      >
        {value}
        <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          className="fixed z-[10001] w-[160px] bg-white rounded-xl border border-black/[0.10] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] py-1.5"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map(opt => {
            const isCurrent = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-caption font-medium transition-colors ${
                  isCurrent ? 'bg-[#EEF1FB] text-[#204CC7] font-semibold' : 'text-black/75 hover:bg-black/[0.03]'
                } focus:outline-none focus-visible:bg-[#EEF1FB]`}
              >
                <span className="flex-1 truncate">{opt}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-[#204CC7] shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

export function TdsDrawer({
  client, business, value, onChange, onClose,
}: {
  client: Client;
  business: Business;
  value: TdsRecord | undefined;
  onChange: (v: TdsRecord) => void;
  onClose: () => void;
}) {
  const v: TdsRecord = value ?? EMPTY_TDS;
  const set = <K extends keyof TdsRecord>(k: K, val: TdsRecord[K]) => onChange({ ...v, [k]: val });

  return (
    <QuickInfoDrawer title="TDS — Income Tax" business={business} client={client} onClose={onClose}>
      <div className="space-y-5">
        <FieldLabel label="TAN No." htmlFor="tds-tan">
          <input
            id="tds-tan"
            type="text"
            value={v.tan}
            onChange={(e) => set('tan', e.target.value)}
            placeholder="e.g. ABCD12345E"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="User ID" htmlFor="tds-user">
          <input
            id="tds-user"
            type="text"
            value={v.userId}
            onChange={(e) => set('userId', e.target.value)}
            placeholder="Login ID for the TDS portal"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="Password" htmlFor="tds-pass">
          {/* Open-ended (type="text") — passwords here are stored in
              plain text per the explicit spec for this drawer. */}
          <input
            id="tds-pass"
            type="text"
            value={v.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Password (visible)"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="Notes" htmlFor="tds-notes">
          <textarea
            id="tds-notes"
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any reminders, exceptions, or context for this client's TDS work…"
            rows={5}
            className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-y"
          />
        </FieldLabel>
      </div>
    </QuickInfoDrawer>
  );
}

export function GstDrawer({
  client, business, value, onChange, onClose,
}: {
  client: Client;
  business: Business;
  value: GstRecord | undefined;
  onChange: (v: GstRecord) => void;
  onClose: () => void;
}) {
  // Normalize the record into the multi-entry shape so legacy in-
  // memory state (single flat GSTN) renders without breaking.
  const v: GstRecord = coerceGstRecord(value, business.gstNumber);
  const set = <K extends keyof GstRecord>(k: K, val: GstRecord[K]) => onChange({ ...v, [k]: val });

  // First-card prefill — when the admin opens a fresh drawer and adds
  // their first GSTN, seed it with the business's primary GST number
  // so they don't have to retype something the system already knows.
  const addEntry = () => {
    const seedGstn = v.entries.length === 0 ? (business.gstNumber ?? '') : '';
    set('entries', [...v.entries, buildEmptyGstEntry(seedGstn)]);
  };
  const updateEntry = (id: string, patch: Partial<GstEntry>) => {
    set('entries', v.entries.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };
  const removeEntry = (id: string) => {
    set('entries', v.entries.filter(e => e.id !== id));
  };

  // Roll-up across every entry — surfaced in the section header so
  // the HOD reads "8 of 12 returns done across 3 GST numbers" before
  // scanning the cards. Same pattern as the E-Com Reco drawer.
  const total = v.entries.length;
  const totalReturns = total * 4;
  const doneReturns = v.entries.reduce((sum, e) => (
    sum
    + (e.gstr1  === 'Done' ? 1 : 0)
    + (e.gstr2b === 'Done' ? 1 : 0)
    + (e.gstr3b === 'Done' ? 1 : 0)
    + (e.tcs    === 'Done' ? 1 : 0)
  ), 0);

  return (
    <QuickInfoDrawer title="GST" business={business} client={client} onClose={onClose}>
      <div className="space-y-5">
        {/* GST Numbers — one card per registration. Multi-state
            businesses register separately in each state they operate
            from, so the admin can add as many as the client carries.
            Section header shows count + done-rate so the overall
            state is visible without a separate "global status" field. */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <p className="text-caption font-semibold text-black/55 uppercase tracking-wide">GST Numbers</p>
              {total > 0 && (
                <span className="text-caption text-black/55 tabular-nums">
                  <strong className="text-black/85 font-semibold">{doneReturns}</strong>
                  <span className="text-black/40"> of </span>
                  <strong className="text-black/85 font-semibold">{totalReturns}</strong>
                  <span className="text-black/40"> returns done</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-caption font-medium text-[#204CC7] hover:bg-[#EEF1FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add GSTN
            </button>
          </div>

          {total === 0 ? (
            <button
              type="button"
              onClick={addEntry}
              className="w-full rounded-lg border border-dashed border-black/[0.12] bg-[#FAFBFC] px-4 py-8 text-center hover:border-[#204CC7]/30 hover:bg-[#F4F6FF]/40 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-black/[0.06] mb-3 group-hover:border-[#204CC7]/30 group-hover:text-[#204CC7] text-black/45 transition-colors">
                <Landmark className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-body font-medium text-black/75">Add your first GST number</p>
              <p className="text-caption text-black/50 mt-1">
                One card per state registration — credentials and the four monthly returns sit together.
              </p>
            </button>
          ) : (
            <div className="space-y-2.5">
              {v.entries.map((entry, idx) => (
                <GstNumberCard
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  onChange={(patch) => updateEntry(entry.id, patch)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </div>

        <FieldLabel label="Notes" htmlFor="gst-notes">
          <textarea
            id="gst-notes"
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any reminders, exceptions, or context for this client's GST work…"
            rows={5}
            className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-y"
          />
        </FieldLabel>
      </div>
    </QuickInfoDrawer>
  );
}

/** Per-GSTN card. Mirrors PortalCard's shape so the GST drawer reads
 *  identically to E-Com Reco when the eye scans multiple stacked
 *  cards. World-class layout goals carried over:
 *    1. Status is the loudest signal. A 4px coloured left bar tints
 *       the card by worst-case return state (any Pending → amber,
 *       any WIP → blue, all Done → emerald, empty → slate).
 *    2. GSTN is the heading — borderless at rest with a tabular-nums
 *       monospace feel so 27AABCP1001A1Z1 reads like an identifier.
 *    3. Done-count "X / 4" and a launch icon for the GST portal sit
 *       next to the heading.
 *    4. Credentials in a 2-col grid, then the four returns (GSTR 1 /
 *       2B / 3B / TCS) in a 4-col grid of label-over-pill so each
 *       return owns its own column instead of stacking vertically.
 */
function GstNumberCard({
  entry, index, onChange, onRemove,
}: {
  entry: GstEntry;
  index: number;
  onChange: (patch: Partial<GstEntry>) => void;
  onRemove: () => void;
}) {
  const userInputId = `gst-${entry.id}-user`;
  const passInputId = `gst-${entry.id}-pass`;
  const gstnInputId = `gst-${entry.id}-gstn`;

  // Status accent — derived from the worst-case state across the four
  // returns. A "fresh" card (no GSTN, no creds) keeps a neutral bar so
  // brand-new rows don't claim a status they haven't earned.
  const returns: ReturnStatus[] = [entry.gstr1, entry.gstr2b, entry.gstr3b, entry.tcs];
  const isEmpty = !entry.gstn.trim() && !entry.userId.trim() && !entry.password.trim();
  const allDone = returns.every(s => s === 'Done');
  const anyWip  = returns.some(s => s === 'WIP');
  const anyPending = returns.some(s => s === 'Pending');
  const accent = isEmpty
    ? 'bg-black/[0.08]'
    : allDone     ? 'bg-emerald-500'
    : anyWip      ? 'bg-blue-500'
    : anyPending  ? 'bg-amber-500'
                  : 'bg-emerald-500';

  // Done count for the per-card mini-summary. Sits next to the launch
  // icon so each card carries its own "X / 4" without shouting.
  const doneCount = returns.filter(s => s === 'Done').length;

  // GST portal URL is always the same, so the launch icon is hard-
  // wired to gst.gov.in rather than asking the admin to type it per
  // entry — saves a field and keeps every card opening the right
  // place.
  const launchUrl = 'https://www.gst.gov.in';

  return (
    <div className="group relative flex rounded-xl border border-black/[0.08] bg-white overflow-hidden hover:border-black/[0.16] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
      {/* Status accent — 4px full-height bar on the left. */}
      <div className={`w-1 self-stretch ${accent}`} aria-hidden="true" />

      <div className="flex-1 px-4 py-3.5 min-w-0">
        {/* Header — GSTN input on the left, done-count + launch +
            remove on the right. Borderless input at rest reads as a
            heading you can edit; hover/focus paints a quiet bg + ring. */}
        <div className="flex items-center gap-2 mb-3">
          <input
            id={gstnInputId}
            type="text"
            value={entry.gstn}
            onChange={(e) => onChange({ gstn: e.target.value })}
            placeholder={`GSTN ${index + 1} · 27AABCP1001A1Z1`}
            className="flex-1 min-w-0 h-8 px-2 -mx-2 rounded-md bg-transparent text-body font-semibold text-black/90 placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:bg-[#F4F6FF]/60 focus:ring-2 focus:ring-[#204CC7]/20 hover:bg-black/[0.02] transition-colors tabular-nums tracking-wide uppercase"
            autoComplete="off"
            spellCheck={false}
            aria-label={`GSTN ${index + 1}`}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEmpty && (
              <span
                className="text-caption tabular-nums text-black/55 px-1.5"
                title={`${doneCount} of 4 returns done`}
                aria-label={`${doneCount} of 4 returns done`}
              >
                <strong className="text-black/85 font-semibold">{doneCount}</strong>
                <span className="text-black/40">/4</span>
              </span>
            )}
            <a
              href={launchUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open GST portal in a new tab"
              title="Open GST portal"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-black/45 hover:text-[#204CC7] hover:bg-[#EEF1FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove GSTN ${index + 1}`}
              title="Remove GSTN"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-black/45 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Credentials block — User ID + Password share a 2-column
            grid. Inline labels above each input replace the
            placeholder-as-label antipattern so the field meaning is
            always obvious. */}
        <div className="grid grid-cols-2 gap-2.5">
          <PortalField label="User ID" htmlFor={userInputId}>
            <input
              id={userInputId}
              type="text"
              value={entry.userId}
              onChange={(e) => onChange({ userId: e.target.value })}
              placeholder="Login ID"
              className={TEXT_INPUT_CLS}
              autoComplete="off"
              spellCheck={false}
            />
          </PortalField>
          <PortalField label="Password" htmlFor={passInputId}>
            <input
              id={passInputId}
              type="text"
              value={entry.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="Password"
              className={TEXT_INPUT_CLS}
              autoComplete="off"
              spellCheck={false}
            />
          </PortalField>
        </div>

        {/* Returns — one column per return, label above the status
            pill. Compact and scannable: the admin sees all four
            states for this GSTN in a single horizontal sweep. */}
        <div className="mt-4 pt-3 border-t border-black/[0.06]">
          <div className="grid grid-cols-4 gap-2.5">
            {([
              { key: 'gstr1',  label: 'GSTR 1'  },
              { key: 'gstr2b', label: 'GSTR 2B' },
              { key: 'gstr3b', label: 'GSTR 3B' },
              { key: 'tcs',    label: 'TCS'     },
            ] as const).map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <span className="block text-[11px] font-medium text-black/55 uppercase tracking-wide">{label}</span>
                <ReturnStatusDropdown
                  value={entry[key]}
                  options={GST_RETURN_OPTIONS}
                  onChange={(s) => onChange({ [key]: s })}
                  ariaLabel={`${entry.gstn || `GSTN ${index + 1}`} · ${label} status`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PtDrawer — PTRC / PTEC quick-info drawer.
 * Mirrors the GST drawer's chrome (right-side panel, identifier +
 * portal credentials at the top, status group below, free-form notes
 * at the bottom). Differences from GST:
 *   • Single identifier field — PTEC No. — instead of GSTN.
 *   • Status group has two rows (PTEC, PTRC), each backed by the
 *     four-state PT_RETURN_OPTIONS picker (Pending / Done / WIP / N/A)
 *     since profession-tax registration can simply not apply to a
 *     given client (no employees, sole proprietorship, etc.).
 */
export function PtDrawer({
  client, business, value, onChange, onClose,
}: {
  client: Client;
  business: Business;
  value: PtRecord | undefined;
  onChange: (v: PtRecord) => void;
  onClose: () => void;
}) {
  const v: PtRecord = value ?? EMPTY_PT;
  const set = <K extends keyof PtRecord>(k: K, val: PtRecord[K]) => onChange({ ...v, [k]: val });

  return (
    <QuickInfoDrawer title="PTRC / PTEC" business={business} client={client} onClose={onClose}>
      <div className="space-y-5">
        <FieldLabel label="PTEC No." htmlFor="pt-ptec">
          <input
            id="pt-ptec"
            type="text"
            value={v.ptec}
            onChange={(e) => set('ptec', e.target.value)}
            placeholder="Enrolment certificate number"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="User ID" htmlFor="pt-user">
          <input
            id="pt-user"
            type="text"
            value={v.userId}
            onChange={(e) => set('userId', e.target.value)}
            placeholder="Login ID for the PT portal"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="Password" htmlFor="pt-pass">
          <input
            id="pt-pass"
            type="text"
            value={v.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Password (visible)"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        {/* Returns — same row pattern as the GST drawer, but with a
            4-state picker (Pending / Done / WIP / N/A) since PT
            certificates can simply not apply to a given client. */}
        <div className="pt-2 border-t border-black/[0.06]">
          <p className="text-caption font-semibold text-black/55 uppercase tracking-wide mb-3">Returns</p>
          <div className="space-y-2.5">
            {([
              { key: 'ptecStatus', label: 'PTEC' },
              { key: 'ptrcStatus', label: 'PTRC' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-body text-black/80">{label}</span>
                <ReturnStatusDropdown
                  value={v[key]}
                  options={PT_RETURN_OPTIONS}
                  onChange={(s) => set(key, s)}
                  ariaLabel={`${label} status`}
                />
              </div>
            ))}
          </div>
        </div>

        <FieldLabel label="Notes" htmlFor="pt-notes">
          <textarea
            id="pt-notes"
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any reminders, exceptions, or context for this client's PT work…"
            rows={5}
            className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-y"
          />
        </FieldLabel>
      </div>
    </QuickInfoDrawer>
  );
}

/**
 * IncomeTaxDrawer — Income Tax (ITR) quick-info drawer.
 * Mirrors the GST drawer's chrome: identifier + portal credential
 * pair at the top, status group below, free-form notes at the
 * bottom. Differences from GST:
 *   • Single identifier — PAN No. — instead of GSTN.
 *   • No separate "User ID" — the portal login flow uses PAN as the
 *     ID, so we collect only the password.
 *   • Status group is binary (Pending / Done) per ITR step. Either
 *     a return has been filed or it hasn't, ditto verification —
 *     there's no "WIP" or "N/A" middle ground for these milestones.
 */
export function IncomeTaxDrawer({
  client, business, value, onChange, onClose,
}: {
  client: Client;
  business: Business;
  value: IncomeTaxRecord | undefined;
  onChange: (v: IncomeTaxRecord) => void;
  onClose: () => void;
}) {
  const v: IncomeTaxRecord = value ?? EMPTY_IT;
  const set = <K extends keyof IncomeTaxRecord>(k: K, val: IncomeTaxRecord[K]) => onChange({ ...v, [k]: val });

  return (
    <QuickInfoDrawer title="Income Tax" business={business} client={client} onClose={onClose}>
      <div className="space-y-5">
        <FieldLabel label="PAN No." htmlFor="it-pan">
          <input
            id="it-pan"
            type="text"
            value={v.pan}
            onChange={(e) => set('pan', e.target.value)}
            placeholder="e.g. AABCP1001A"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        <FieldLabel label="Password" htmlFor="it-pass">
          <input
            id="it-pass"
            type="text"
            value={v.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Password (visible)"
            className={TEXT_INPUT_CLS}
            autoComplete="off"
            spellCheck={false}
          />
        </FieldLabel>

        {/* ITR steps — same row pattern as the GST returns block,
            but with a 2-state picker (Pending / Done) since each
            ITR milestone is binary: either filed/verified or not. */}
        <div className="pt-2 border-t border-black/[0.06]">
          <p className="text-caption font-semibold text-black/55 uppercase tracking-wide mb-3">ITR</p>
          <div className="space-y-2.5">
            {([
              { key: 'itrFiled',    label: 'ITR Filed'    },
              { key: 'itrVerified', label: 'ITR Verified' },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-body text-black/80">{label}</span>
                <ReturnStatusDropdown
                  value={v[key]}
                  options={IT_RETURN_OPTIONS}
                  onChange={(s) => set(key, s)}
                  ariaLabel={`${label} status`}
                />
              </div>
            ))}
          </div>
        </div>

        <FieldLabel label="Notes" htmlFor="it-notes">
          <textarea
            id="it-notes"
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any reminders, exceptions, or context for this client's Income Tax work…"
            rows={5}
            className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-y"
          />
        </FieldLabel>
      </div>
    </QuickInfoDrawer>
  );
}

/**
 * EcomRecoDrawer — e-commerce reconciliation quick-info drawer.
 * Only ever opened for E-Commerce businesses (the menu hides the
 * "E-Com Reco" item on Trading rows). Holds an admin-managed list
 * of marketplace portals (each with its own URL, username and
 * password), a single Pending / Done / WIP status for the overall
 * reconciliation, and a free-form notes field.
 *
 * Add-portal flow: clicking the "Add portal" button at the bottom
 * appends a fresh empty card with a generated id; the admin fills
 * in name / URL / username / password inline. Each portal card has
 * its own remove (trash) button so the list stays editable.
 */
export function EcomRecoDrawer({
  client, business, value, onChange, onClose,
}: {
  client: Client;
  business: Business;
  value: EcomRecoRecord | undefined;
  onChange: (v: EcomRecoRecord) => void;
  onClose: () => void;
}) {
  const v: EcomRecoRecord = value ?? EMPTY_ECOM;
  const set = <K extends keyof EcomRecoRecord>(k: K, val: EcomRecoRecord[K]) => onChange({ ...v, [k]: val });

  const addPortal = () => {
    set('portals', [...v.portals, {
      id: newPortalId(),
      name: '',
      url: '',
      username: '',
      password: '',
      status: 'Pending',
    }]);
  };
  const updatePortal = (id: string, patch: Partial<EcomPortal>) => {
    set('portals', v.portals.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };
  const removePortal = (id: string) => {
    set('portals', v.portals.filter(p => p.id !== id));
  };

  // Roll-up summary — surfaced in the section header so the HOD reads
  // "2 of 3 done" before scanning individual cards. Derived from the
  // per-portal statuses, not stored separately.
  const total = v.portals.length;
  const doneCount = v.portals.filter(p => p.status === 'Done').length;

  return (
    <QuickInfoDrawer title="E-Com Reco" business={business} client={client} onClose={onClose}>
      <div className="space-y-5">
        {/* Portals — one card per marketplace. Admin can add as many
            as the business sells through. The section header carries
            the count + a derived done-count so the overall state is
            visible without a separate "global status" field. */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <p className="text-caption font-semibold text-black/55 uppercase tracking-wide">Portals</p>
              {total > 0 && (
                <span className="text-caption text-black/55 tabular-nums">
                  <strong className="text-black/85 font-semibold">{doneCount}</strong>
                  <span className="text-black/40"> of </span>
                  <strong className="text-black/85 font-semibold">{total}</strong>
                  <span className="text-black/40"> done</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={addPortal}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-caption font-medium text-[#204CC7] hover:bg-[#EEF1FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add portal
            </button>
          </div>

          {total === 0 ? (
            <button
              type="button"
              onClick={addPortal}
              className="w-full rounded-lg border border-dashed border-black/[0.12] bg-[#FAFBFC] px-4 py-8 text-center hover:border-[#204CC7]/30 hover:bg-[#F4F6FF]/40 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-black/[0.06] mb-3 group-hover:border-[#204CC7]/30 group-hover:text-[#204CC7] text-black/45 transition-colors">
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-body font-medium text-black/75">Add your first portal</p>
              <p className="text-caption text-black/50 mt-1">
                Amazon, Flipkart, Myntra, Meesho — anywhere this business sells.
              </p>
            </button>
          ) : (
            <div className="space-y-2.5">
              {v.portals.map((p, idx) => (
                <PortalCard
                  key={p.id}
                  portal={p}
                  index={idx}
                  onChange={(patch) => updatePortal(p.id, patch)}
                  onRemove={() => removePortal(p.id)}
                />
              ))}
            </div>
          )}
        </div>

        <FieldLabel label="Notes" htmlFor="ecom-notes">
          <textarea
            id="ecom-notes"
            value={v.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Any reminders, exceptions, or context for this client's e-commerce reconciliation…"
            rows={5}
            className="w-full px-3 py-2 rounded-md border border-black/[0.12] bg-white text-body text-black/85 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/20 transition-all resize-y"
          />
        </FieldLabel>
      </div>
    </QuickInfoDrawer>
  );
}

/** Per-portal card — one row per marketplace. World-class layout
 *  goals applied here:
 *    1. Status is the loudest signal. A coloured 4px left bar tints
 *       the entire card by status (amber=Pending / blue=WIP /
 *       emerald=Done / slate=empty), so the HOD scans the column
 *       and sees which portals still need work without reading any
 *       text.
 *    2. Identity over chrome. The portal name is borderless and
 *       large at rest — it reads as a card heading you can edit,
 *       not a form field you must fill. Border + ring appear only
 *       on hover/focus so the form noise stays out of the way.
 *    3. Status pill sits beside the name (not in a separate row),
 *       reinforcing that "this portal's status" is part of the
 *       portal's identity.
 *    4. Credentials are quietly grouped underneath with proper
 *       inline labels so admins always know which input is which —
 *       no placeholder-as-label antipattern.
 *    5. Launch + remove are subtle icon buttons on the header row.
 *       Launch only renders when the URL is filled, so the chrome
 *       grows with content.
 */
function PortalCard({
  portal, index, onChange, onRemove,
}: {
  portal: EcomPortal;
  index: number;
  onChange: (patch: Partial<EcomPortal>) => void;
  onRemove: () => void;
}) {
  const nameId = `portal-${portal.id}-name`;
  const urlId  = `portal-${portal.id}-url`;
  const userId = `portal-${portal.id}-user`;
  const passId = `portal-${portal.id}-pass`;

  // Defensive default: any portal record persisted before the
  // per-portal-status field was introduced won't carry `status`.
  // Falling back to 'Pending' here keeps the pill rendered with its
  // label + chevron instead of collapsing to an empty stub.
  const status: ReturnStatus = portal.status ?? 'Pending';

  // Auto-prepend a protocol if the admin typed a bare host so the
  // launch link is always usable.
  const launchUrl = portal.url.trim()
    ? (portal.url.startsWith('http') ? portal.url : `https://${portal.url}`)
    : null;

  // Status accent — a coloured left bar that tints the whole card so
  // the column reads as a stack of statuses at a glance. Empty cards
  // (no name + no URL) keep a neutral bar so brand-new rows don't
  // claim a status they haven't earned.
  const isEmpty = !portal.name.trim() && !portal.url.trim();
  const accent = isEmpty
    ? 'bg-black/[0.08]'
    : status === 'Done' ? 'bg-emerald-500'
    : status === 'WIP'  ? 'bg-blue-500'
                        : 'bg-amber-500';

  return (
    <div className="group relative flex rounded-xl border border-black/[0.08] bg-white overflow-hidden hover:border-black/[0.16] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all">
      {/* Status accent — 4px full-height bar on the left. */}
      <div className={`w-1 self-stretch ${accent}`} aria-hidden="true" />

      <div className="flex-1 px-4 py-3.5 min-w-0">
        {/* Header — name takes the row, status + actions sit on the
            right. The name input is borderless at rest so it reads
            as the card heading you can edit; hover / focus paint a
            quiet bg + ring. The whole strip aligns on a single
            baseline so the heading + status pill sit level. */}
        <div className="flex items-center gap-2 mb-3">
          <input
            id={nameId}
            type="text"
            value={portal.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={`Portal ${index + 1} · e.g. Amazon`}
            className="flex-1 min-w-0 h-8 px-2 -mx-2 rounded-md bg-transparent text-body font-semibold text-black/90 placeholder:text-black/35 placeholder:font-normal focus:outline-none focus:bg-[#F4F6FF]/60 focus:ring-2 focus:ring-[#204CC7]/20 hover:bg-black/[0.02] transition-colors"
            autoComplete="off"
            spellCheck={false}
            aria-label={`Portal ${index + 1} name`}
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <ReturnStatusDropdown
              value={status}
              options={GST_RETURN_OPTIONS}
              onChange={(s) => onChange({ status: s })}
              ariaLabel={`${portal.name || `Portal ${index + 1}`} status`}
            />
            {launchUrl && (
              <a
                href={launchUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${portal.name || 'portal'} in a new tab`}
                title="Open portal"
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-black/45 hover:text-[#204CC7] hover:bg-[#EEF1FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${portal.name || 'portal'}`}
              title="Remove portal"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-black/45 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Credentials block — URL spans full width, then User ID
            and Password share a 2-column grid. Inline labels above
            each input replace the placeholder-as-label pattern so
            the field meaning is always obvious. */}
        <div className="space-y-2.5">
          <PortalField label="URL" htmlFor={urlId}>
            <input
              id={urlId}
              type="url"
              value={portal.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="sellercentral.amazon.in"
              className={TEXT_INPUT_CLS}
              autoComplete="off"
              spellCheck={false}
            />
          </PortalField>
          <div className="grid grid-cols-2 gap-2.5">
            <PortalField label="User ID" htmlFor={userId}>
              <input
                id={userId}
                type="text"
                value={portal.username}
                onChange={(e) => onChange({ username: e.target.value })}
                placeholder="Login ID"
                className={TEXT_INPUT_CLS}
                autoComplete="off"
                spellCheck={false}
              />
            </PortalField>
            <PortalField label="Password" htmlFor={passId}>
              <input
                id={passId}
                type="text"
                value={portal.password}
                onChange={(e) => onChange({ password: e.target.value })}
                placeholder="Password"
                className={TEXT_INPUT_CLS}
                autoComplete="off"
                spellCheck={false}
              />
            </PortalField>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tiny labelled-field wrapper for the portal card. Inline label
 *  above each input keeps the field's meaning obvious without
 *  relying on placeholder text. */
function PortalField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[11px] font-medium text-black/55 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function StoryItemList({
  items, mode,
}: {
  items: { item: ChecklistItem; client: Client; business: Business }[];
  mode: 'overdue' | 'thisWeek';
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-5 py-6 text-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
        <p className="text-body font-medium text-emerald-800">Nothing here — clean as a whistle.</p>
        <p className="text-caption text-black/60 mt-1">
          {mode === 'overdue' ? 'Every pending item is still within its due date.' : 'No deadlines landing in the next 7 days.'}
        </p>
      </div>
    );
  }
  const sorted = [...items].sort((a, b) => daysUntil(a.item.dueDate) - daysUntil(b.item.dueDate));

  // Top-of-drawer stats strip: answers "how bad, how wide, what's the lead
  // category" before the HOD ever scans a row. Only shown on overdue mode
  // since that's where severity matters most.
  const statsStrip = mode === 'overdue' ? (() => {
    const worst = sorted.length > 0 ? -daysUntil(sorted[0].item.dueDate) : 0;
    const businesses = new Set(sorted.map(x => x.business.id)).size;
    const categoryCount = new Map<CategoryName, number>();
    for (const x of sorted) categoryCount.set(x.item.category, (categoryCount.get(x.item.category) ?? 0) + 1);
    const leadCategory = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0];
    return { worst, businesses, leadCategory };
  })() : null;

  return (
    <div className="space-y-4">
      {statsStrip && (
        <div className="grid grid-cols-3 rounded-xl border border-black/[0.08] bg-white overflow-hidden divide-x divide-black/[0.08]" role="group" aria-label="Overdue summary">
          <div className="px-4 py-3">
            <div className="text-caption font-semibold text-black/60 uppercase tracking-wide">Worst</div>
            <div className="text-h2 font-bold text-rose-700 tabular-nums mt-0.5">{statsStrip.worst}d</div>
            <div className="text-caption text-black/60">past due</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-caption font-semibold text-black/60 uppercase tracking-wide">Spread</div>
            <div className="text-h2 font-bold text-black/85 tabular-nums mt-0.5">{statsStrip.businesses}</div>
            <div className="text-caption text-black/60">{statsStrip.businesses === 1 ? 'business' : 'businesses'} affected</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-caption font-semibold text-black/60 uppercase tracking-wide">Lead bucket</div>
            <div className="text-h2 font-bold text-black/85 mt-0.5 truncate">{statsStrip.leadCategory[0]}</div>
            <div className="text-caption text-black/60 tabular-nums">{statsStrip.leadCategory[1]} {statsStrip.leadCategory[1] === 1 ? 'item' : 'items'}</div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-black/[0.06] overflow-hidden">
      <table className="w-full" role="table" aria-label="Items">
        <thead>
          <tr className="border-b border-black/5 bg-[#FAFBFC]">
            <th scope="col" className="px-4 py-2.5 text-left text-caption font-semibold text-black/60 uppercase tracking-wide">Item</th>
            <th scope="col" className="px-3 py-2.5 text-left text-caption font-semibold text-black/60 uppercase tracking-wide w-[180px]">Client / Business</th>
            <th scope="col" className="px-3 py-2.5 text-left text-caption font-semibold text-black/60 uppercase tracking-wide w-[120px]">Due</th>
            <th scope="col" className="px-3 py-2.5 text-left text-caption font-semibold text-black/60 uppercase tracking-wide w-[130px]">Assigned to</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {sorted.map((x, i) => {
            const days = daysUntil(x.item.dueDate);
            const overdue = days < 0;
            const assignee = TEAM_POOL[x.item.assignee];
            return (
              <tr key={`${x.business.id}-${x.item.id}-${i}`} className={overdue ? 'bg-rose-50/30' : ''}>
                <td className="px-4 py-3">
                  <div className="text-body font-medium text-black/80">{x.item.particulars}</div>
                  <div className="text-caption text-black/55 mt-0.5">{x.item.work}</div>
                </td>
                <td className="px-3 py-3 text-caption text-black/65">
                  <div className="font-medium text-black/80">{x.business.name}</div>
                  <div className="text-black/45 mt-0.5">{x.client.name}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="text-caption font-medium text-black/75 tabular-nums">{fmtDate(x.item.dueDate)}</div>
                  <div className={`text-caption tabular-nums mt-0.5 ${overdue ? 'text-rose-700 font-semibold' : days <= 2 ? 'text-amber-700' : 'text-black/45'}`}>
                    {overdue ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `in ${days}d`}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {assignee && (
                    <span className="inline-flex items-center gap-1.5 text-caption text-black/65">
                      <Avatar initials={assignee.initials} title={`${assignee.name} (${assignee.role})`} size="sm" />
                      {assignee.name.split(' ')[0]}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {mode === 'thisWeek' && (
        <p className="px-4 py-2.5 text-caption text-black/60 bg-[#FAFBFC] border-t border-black/5">
          Items due in the next 7 days. {sorted.filter(x => daysUntil(x.item.dueDate) < 0).length} are already overdue.
        </p>
      )}
      </div>
    </div>
  );
}

/**
 * StoryWorkloadList — at-a-glance answer to "is the team OK and who's
 * drowning?" for the cross-business deliverables view.
 *
 * Hero: completion % across the book, broken into done + overdue +
 *   on-time pending, with a tri-color stacked bar.
 *
 * Distribution: per-member rectangles. Each bar is a full-width
 *   COMPLETION bar for that person's total scope, with three colour
 *   segments that always sum to 100%: emerald (done) + rose (overdue)
 *   + amber (on-time pending). Same-track widths so each row reads
 *   independently as "how far along is this person and what's owed."
 *
 * Sort: HOD pinned first (org accountability), then by overdue desc,
 *   then by pending desc — anyone the HOD needs to chase rises to
 *   the top; people with no work to do fall to the bottom.
 */
function StoryWorkloadList({
  workload,
}: {
  workload: { member: TeamMember; count: number; done: number; pending: number; overdueCount: number; total: number }[];
}) {
  if (workload.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-6 py-12 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" aria-hidden="true" />
        <p className="text-body font-semibold text-emerald-700">No pending items right now.</p>
        <p className="text-caption text-black/55 mt-1">The team's caught up across the book.</p>
      </div>
    );
  }

  // Aggregates across the team — only the ones the simplified hero
  // actually renders.
  const totalDone = workload.reduce((s, w) => s + w.done, 0);
  const totalItems = workload.reduce((s, w) => s + w.total, 0);
  const completionPct = totalItems === 0 ? 0 : Math.round((totalDone / totalItems) * 100);
  const heroTone =
    completionPct >= 90 ? 'text-emerald-700'
    : completionPct >= 50 ? 'text-amber-700'
    : 'text-rose-700';

  return (
    <div className="space-y-6">
      {/* ── Hero summary — one headline %, "X of Y completed", and
              a simple single-colour progress bar. ── */}
      <div className="rounded-xl border border-black/[0.08] bg-white p-6">
        <div className="flex items-baseline gap-3">
          <span className={`text-[40px] leading-none font-bold tabular-nums ${heroTone}`}>{completionPct}%</span>
          <span className="text-body text-black/55">complete across the book</span>
        </div>
        <div className="mt-2 text-caption text-black/55 tabular-nums">
          <strong className="text-black/85">{totalDone}</strong> of <strong className="text-black/85">{totalItems}</strong> completed
        </div>
        {totalItems > 0 && (
          <div className="mt-3 h-2 rounded-full bg-black/[0.06] overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(totalDone / totalItems) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Workload distribution ── */}
      <section aria-labelledby="story-workload-heading">
        <h3 id="story-workload-heading" className="text-caption font-semibold text-black/55 uppercase tracking-[0.08em] mb-3">
          Per-member progress
        </h3>
        <ul className="space-y-2.5" role="list">
          {workload.map(w => (
            <StoryMemberLoadRow
              key={w.member.initials}
              member={w.member}
              done={w.done}
              total={w.total}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * StoryMemberLoadRow — the cross-business mirror of MemberLoadRow.
 * Each bar is a full-width COMPLETION bar for that person's total
 * scope, with three colour segments that always sum to 100%:
 *   • emerald = done
 *   • rose    = overdue
 *   • amber   = on-time pending
 *
 * Same-track widths so each row reads independently as "how far
 * along is this person and what's still owed" — no relative-width
 * math, no ambiguity between bar length and bar colour.
 *
 * HOD rows carry a subtle indigo tint + border to mark accountable
 * ownership without dominating.
 */
function StoryMemberLoadRow({
  member, done, total,
}: {
  member: TeamMember;
  done: number;
  total: number;
}) {
  const isHod = member.role === 'HOD';
  const isUnassigned = total === 0;
  const donePct = total === 0 ? 0 : (done / total) * 100;

  return (
    <li className={`p-4 rounded-xl border ${
      isHod
        ? 'border-[#204CC7]/15 bg-[#F4F6FF]/40'
        : 'border-black/[0.06] bg-white'
    }`}>
      {/* Header line — name + role badge + simple "X of Y completed". */}
      <div className="flex items-center gap-3">
        <Avatar initials={member.initials} title={member.name} size="md" />
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-body font-medium text-black/85 truncate">{member.name}</span>
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
            isHod ? 'bg-[#EEF1FB] text-[#204CC7]' : 'bg-black/[0.04] text-black/55'
          }`}>
            {member.role}
          </span>
        </div>
        <div className="shrink-0 text-caption tabular-nums text-black/65">
          {isUnassigned
            ? <span className="text-black/40">No items assigned</span>
            : <><strong className="text-black/85">{done}</strong> of <strong className="text-black/85">{total}</strong> completed</>}
        </div>
      </div>

      {/* Single-colour progress bar — emerald fill on a neutral track. */}
      {!isUnassigned && (
        <div className="mt-3 h-2 rounded-full bg-black/[0.05] overflow-hidden" role="presentation">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${donePct}%` }}
          />
        </div>
      )}
    </li>
  );
}

