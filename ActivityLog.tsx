"use client";

/**
 * Master Activity — platform-wide pulse.
 *
 * The single place an admin opens to answer "what changed across
 * the platform in the last N hours?". The platform has two layers
 * of navigation:
 *
 *   • Home — role-aware landing. Different views per role
 *     (Admin / HOD / Manager / Executive / HR). Customer +
 *     employee databases, A&T Recurring Checklist, A&T King &
 *     Queen, Onboarding pipeline, settings — they all live here
 *     as tabs/sub-tabs, not as separate top-level modules.
 *
 *   • Modules (4) — Inbox, Dashboard, Workspace, Dataroom. The
 *     four destinations on the top nav. Each module is its own
 *     surface; admins move between them as discrete actions.
 *
 * The Activity feed maps every event to one of these five
 * "surfaces" (Home + the 4 modules) so the filter dropdown reads
 * as the platform actually navigates rather than as an internal
 * data taxonomy. Internally, granular modules (customers /
 * employees / checklist / onboarding) still tag each entry —
 * the dedicated A&T Activity page filters on
 * `module === 'checklist'` and keeps working.
 *
 * Event types tracked (real operational events, in the language
 * the platform actually uses):
 *
 *   • Home › Customers   — new client onboarded · client removed
 *   • Home › Employees   — new joiner · exit (resigned / terminated)
 *   • Home › A&T         — Recurring Checklist status flips,
 *                           assignments, monthly + annual
 *                           compliance work (annual K&Q events
 *                           rolled up here)
 *   • Home › Onboarding  — pipeline progress (Discovery → Live)
 *   • Workspace          — task created / status changed /
 *                           assigned / reassigned / completed
 *                           (incl. client-portal task activity)
 *   • Dashboard          — client financial data uploads (the 8
 *                           file slots × month drops on each
 *                           client's A&T dashboard)
 *   • Dataroom           — folder + file lifecycle (created,
 *                           moved, shared, uploaded)
 *   • Inbox              — channel-level activity (messages,
 *                           shares)
 *
 * Visual hierarchy (top → bottom):
 *   1. Top bar — title, surface filter, person filter, period
 *      selector, search.
 *   2. Active-filter chip strip — only when filters are applied.
 *   3. Timeline — date-grouped entries with diff chips for any
 *      before/after change (status / assignee / file count, etc.).
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search, X, ChevronDown, Calendar, Clock, ArrowRight, ChevronRight,
  FileText, Layers, ClipboardList, MessageSquare, FolderOpen, GaugeCircle,
  Pencil, Trash2, Upload, Users, UserPlus, CheckCircle2, AlertCircle, Send, Eye,
  ArrowRightLeft, Settings, Plus, Tag, FileEdit, KeyRound, Building2,
} from 'lucide-react';
import { SUPER_ADMIN_HOME_ROUTES as R } from '@/lib/super-admin-home-routes';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

// Internal module discriminator. Mirrors the platform's actual
// left-nav destinations so an admin scanning the feed sees the
// same vocabulary they'd see in the sidebar. Removed values:
//
//   • 'adminland'  — platform has no Adminland surface; settings
//                     work surfaces under Home tabs.
//   • 'kingqueen' — King & Queen exists as a deep-link page but
//                     is intentionally NOT in the left nav (per
//                     SuperAdminHome's serviceSubItemsByTab —
//                     only Overview, Recurring Checklist, and the
//                     5 holistic per-domain views are exposed).
//                     K&Q events are now tagged 'checklist' since
//                     they're A&T compliance work in the same
//                     vein as monthly Recurring Checklist work.
export type ActivityModule =
  | 'dashboard'
  | 'checklist'
  | 'onboarding'
  | 'workspace'
  | 'dataroom'
  | 'inbox'
  // Customer + employee databases (Home → Customers / Employees
  // sub-tabs). They keep their own discriminators so the lifecycle
  // verbs — customer_joined / customer_removed / employee_joined /
  // employee_removed — read cleanly in row prose.
  | 'customers'
  | 'employees';

export type ActivityAction =
  | 'created' | 'updated' | 'deleted' | 'assigned' | 'completed'
  | 'status_changed' | 'type_changed' | 'reassigned' | 'commented'
  | 'note_added' | 'uploaded' | 'downloaded' | 'shared' | 'moved'
  | 'sent' | 'configured' | 'portal_added' | 'priority_changed'
  | 'setting_changed'
  // Master-Activity-specific lifecycle verbs. Each maps to a
  // concrete platform event:
  //   • customer_joined   → onboarding pipeline → Live (or direct
  //                         add via Customers database)
  //   • customer_removed  → client off-board / archived
  //   • employee_joined   → new EmployeeRecord created
  //   • employee_removed  → status flipped to Resigned/Terminated
  //   • data_uploaded     → financial data file pushed onto the
  //                         A&T client dashboard for a month
  | 'customer_joined' | 'customer_removed'
  | 'employee_joined' | 'employee_removed'
  | 'data_uploaded';

export interface ActivityEntry {
  id: string;
  timestamp: string;            // ISO string
  user: { name: string; initials: string; color: string; role: string };
  module: ActivityModule;
  action: ActivityAction;
  /** Headline — the noun this activity acted on. */
  title: string;
  /** Optional subtitle — extra context. Kept short. */
  detail?: string;
  /** Before / after pair for diff-style activities (status, assignee,
   *  type changes). When present, the entry renders an explicit
   *  "before → after" chip pair, so admins read the change in one
   *  glance instead of parsing prose. */
  diff?: { before: string; after: string };
  /** Client / business this activity targets, surfaced as a chip. */
  client?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

interface ModuleCfg {
  label: string;
  icon: typeof FileText;
  /** Solid colour for headlines / accents. */
  color: string;
  /** Background tint for chips. */
  bg: string;
  /** Hex used in the module-breakdown bar chart. */
  bar: string;
}

export const MODULE_CONFIG: Record<ActivityModule, ModuleCfg> = {
  dashboard:  { label: 'Dashboard',           icon: GaugeCircle,    color: 'text-indigo-700',  bg: 'bg-indigo-50',  bar: '#6366F1' },
  checklist:  { label: 'Recurring Checklist', icon: ClipboardList,  color: 'text-cyan-700',    bg: 'bg-cyan-50',    bar: '#06B6D4' },
  onboarding: { label: 'Onboarding',          icon: UserPlus,       color: 'text-amber-700',   bg: 'bg-amber-50',   bar: '#F59E0B' },
  workspace:  { label: 'Workspace',           icon: Layers,         color: 'text-emerald-700', bg: 'bg-emerald-50', bar: '#10B981' },
  dataroom:   { label: 'Dataroom',            icon: FolderOpen,     color: 'text-blue-700',    bg: 'bg-blue-50',    bar: '#3B82F6' },
  inbox:      { label: 'Inbox',               icon: MessageSquare,  color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', bar: '#D946EF' },
  customers:  { label: 'Customers',           icon: Building2,      color: 'text-[#204CC7]',   bg: 'bg-[#EEF1FB]',  bar: '#204CC7' },
  employees:  { label: 'Employees',           icon: Users,          color: 'text-violet-700',  bg: 'bg-violet-50',  bar: '#7C3AED' },
};

// ─────────────────────────────────────────────────────────────────────────────
// FILTER GROUPS — how the surface dropdown is organised
// ─────────────────────────────────────────────────────────────────────────────
//
// The platform navigates as Home (role-aware landing with sub-tabs)
// + four modules (Inbox / Dashboard / Workspace / Dataroom). The
// filter dropdown mirrors the actual left-nav structure of the
// Home sidebar:
//
//   Home tabs (top-level):
//     Customers, Employees
//   Customers sub-tabs:
//     Onboarding
//   Accounts & Taxation sub-tabs:
//     Recurring Checklist
//   Modules (top nav):
//     Inbox, Dashboard, Workspace, Dataroom
//
// Audited against SuperAdminHome's nav configuration — King &
// Queen and the master Activity page itself are the only A&T
// sub-views NOT in the sidebar (they're deep-link only), so
// they're absent here too. The 5 holistic per-domain A&T views
// (TDS / GST / PTRC-PTEC / Income Tax / E-Com Reco) are slices
// of Recurring Checklist data, not separate event sources, so
// they're rolled up under Recurring Checklist rather than each
// getting their own filter row.
export const FILTER_GROUPS: Array<{ label: string; modules: ActivityModule[] }> = [
  { label: 'Home tabs',           modules: ['customers', 'employees', 'onboarding'] },
  { label: 'Accounts & Taxation', modules: ['checklist'] },
  { label: 'Modules',             modules: ['inbox', 'dashboard', 'workspace', 'dataroom'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

interface ActionCfg {
  label: string;
  icon: typeof FileText;
  /** Verb used in the headline phrase ("X verbed Y"). */
  verb: string;
}

export const ACTION_CONFIG: Record<ActivityAction, ActionCfg> = {
  created:           { label: 'Created',          icon: Plus,           verb: 'created' },
  updated:           { label: 'Updated',          icon: Pencil,         verb: 'updated' },
  deleted:           { label: 'Deleted',          icon: Trash2,         verb: 'deleted' },
  assigned:          { label: 'Assigned',         icon: UserPlus,       verb: 'assigned' },
  completed:         { label: 'Completed',        icon: CheckCircle2,   verb: 'completed' },
  status_changed:    { label: 'Status changed',   icon: ArrowRightLeft, verb: 'changed status of' },
  type_changed:      { label: 'Type changed',     icon: Tag,            verb: 'changed type of' },
  reassigned:        { label: 'Reassigned',       icon: Users,          verb: 'reassigned' },
  commented:         { label: 'Commented',        icon: MessageSquare,  verb: 'commented on' },
  note_added:        { label: 'Note added',       icon: FileEdit,       verb: 'added a note on' },
  uploaded:          { label: 'Uploaded',         icon: Upload,         verb: 'uploaded' },
  downloaded:        { label: 'Downloaded',       icon: Eye,            verb: 'downloaded' },
  shared:            { label: 'Shared',           icon: Users,          verb: 'shared' },
  moved:             { label: 'Moved',            icon: ArrowRightLeft, verb: 'moved' },
  sent:              { label: 'Sent',             icon: Send,           verb: 'sent' },
  configured:        { label: 'Configured',       icon: KeyRound,       verb: 'configured' },
  portal_added:      { label: 'Portal added',     icon: Plus,           verb: 'added portal' },
  priority_changed:  { label: 'Priority changed', icon: AlertCircle,    verb: 'changed priority of' },
  setting_changed:   { label: 'Setting changed',  icon: Settings,       verb: 'changed setting' },
  // Lifecycle verbs surfaced on the master Activity page only.
  customer_joined:   { label: 'Customer joined',  icon: Building2,      verb: 'onboarded' },
  customer_removed:  { label: 'Customer removed', icon: Trash2,         verb: 'removed customer' },
  employee_joined:   { label: 'Employee joined',  icon: UserPlus,       verb: 'added employee' },
  employee_removed:  { label: 'Employee left',    icon: Users,          verb: 'removed employee' },
  data_uploaded:     { label: 'Data uploaded',    icon: Upload,         verb: 'uploaded financial data for' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM — A&T-focused roster
// ─────────────────────────────────────────────────────────────────────────────

/** External (client-side) actors. The platform exposes a thin
 *  client portal where the customer's primary contact can raise a
 *  task or update the status of an existing one — these are the
 *  events the master Activity page now surfaces alongside internal
 *  team activity. The role field is the literal string `'Client'`
 *  so the ActivityRow can tag client-side rows with a small pill
 *  and the admin scanning the feed can tell at a glance whether a
 *  task move was initiated by Brego or by the client. Initials
 *  and colours follow the same shape as TEAM so the existing
 *  avatar rendering picks them up unchanged. */
export const CLIENT_TEAM = {
  saharaPM:        { name: 'Karthik Iyer',   initials: 'KI', color: '#0F766E', role: 'Client', client: 'Sahara Constructions' },
  atlasCFO:        { name: 'Anand Mehta',    initials: 'AM', color: '#7C3AED', role: 'Client', client: 'Atlas Capital'        },
  patelRealtyOwn:  { name: 'Rakesh Patel',   initials: 'RP', color: '#DB2777', role: 'Client', client: 'Patel Realty'         },
  marathonOps:     { name: 'Suresh Joshi',   initials: 'SJ', color: '#9333EA', role: 'Client', client: 'Marathon Industries'  },
  konarkOwner:     { name: 'Bipin Shah',     initials: 'BS', color: '#0EA5E9', role: 'Client', client: 'Konark Foods'         },
  rajanFinance:    { name: 'Devansh Khanna', initials: 'DK', color: '#F97316', role: 'Client', client: 'Rajan Group'          },
};

export const TEAM = {
  zubear:  { name: 'Zubear Shaikh',  initials: 'ZS', color: '#06B6D4', role: 'A&T HOD'           },
  irshad:  { name: 'Irshad Qureshi', initials: 'IQ', color: '#0EA5E9', role: 'A&T HOD'           },
  rohan:   { name: 'Rohan Desai',    initials: 'RD', color: '#6366F1', role: 'POD Head'          },
  nisha:   { name: 'Nisha Agarwal',  initials: 'NA', color: '#EC4899', role: 'Manager'           },
  anil:    { name: 'Anil Kumar',     initials: 'AK', color: '#F59E0B', role: 'Manager'           },
  sneha:   { name: 'Sneha Patel',    initials: 'SP', color: '#10B981', role: 'Assistant Manager' },
  riya:    { name: 'Riya Sharma',    initials: 'RS', color: '#7C3AED', role: 'Assistant Manager' },
  vikram:  { name: 'Vikram Singh',   initials: 'VS', color: '#3B82F6', role: 'Executive'         },
  // Bottom of the A&T operational pyramid — three more executives so
  // the day-to-day work (GSTR / TDS / PT / ITR / E-Com Reco filings)
  // has a realistic-sized roster behind it. Colors picked from the
  // remaining brand-friendly palette (teal / fuchsia / lime) so each
  // exec's avatar stays visually distinct in the activity feed.
  aarav:   { name: 'Aarav Joshi',    initials: 'AJ', color: '#14B8A6', role: 'Executive'         },
  pooja:   { name: 'Pooja Verma',    initials: 'PV', color: '#D946EF', role: 'Executive'         },
  karan:   { name: 'Karan Bhatia',   initials: 'KB', color: '#84CC16', role: 'Executive'         },
  tejas:   { name: 'Tejas Atha',     initials: 'TA', color: '#3B82F6', role: 'COO'               },
  mihir:   { name: 'Mihir L.',       initials: 'ML', color: '#F59E0B', role: 'Admin'             },
  // SEM HOD + Operations — added so the Onboarding pipeline
  // entries can carry the real assignees from OnboardingModule
  // (Chinmay leads the SEM client onboarding flow, Harshal owns
  // the Operations side). Both colours match the canonical Brego
  // team palette in CLAUDE.md.
  chinmay: { name: 'Chinmay Pawar',  initials: 'CP', color: '#7C3AED', role: 'SEM HOD'           },
  harshal: { name: 'Harshal R.',     initials: 'HR', color: '#10B981', role: 'Operations'        },
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — A&T-only, last 10 days, anchored to today (2026-05-05)
// ─────────────────────────────────────────────────────────────────────────────

const TODAY_ISO = '2026-05-05';
const NOW_REF = new Date('2026-05-05T18:00:00');

export const mockActivities: ActivityEntry[] = [
  // ── Today (2026-05-05) ──
  { id: 'a01', timestamp: '2026-05-05T16:42:00', user: TEAM.sneha,  module: 'checklist',  action: 'status_changed',  title: 'GSTR-3B return — Patel Constructions',          diff: { before: 'Pending', after: 'Done' },                                client: 'Patel Constructions' },
  { id: 'a02', timestamp: '2026-05-05T16:18:00', user: TEAM.zubear, module: 'checklist',  action: 'status_changed',  title: 'GSTR-9 — Patel Trading Co',                     diff: { before: 'Sales Email Shared', after: 'Data shared with Auditor' }, client: 'Patel Trading Co'    },
  { id: 'a03', timestamp: '2026-05-05T15:55:00', user: TEAM.zubear, module: 'onboarding', action: 'status_changed',  title: 'Green Energy Industries — Data Sharing',         diff: { before: '4 / 14',  after: '6 / 14'    },                            client: 'Green Energy Industries' },
  { id: 'a04', timestamp: '2026-05-05T15:30:00', user: TEAM.irshad, module: 'checklist',  action: 'reassigned',      title: 'GSTR-1 monthly return — Bilawala & Co (Heena)', diff: { before: 'Sneha P.', after: 'Riya S.'  },                            client: 'Bilawala & Co (Heena)' },
  { id: 'a05', timestamp: '2026-05-05T14:50:00', user: TEAM.irshad, module: 'checklist',  action: 'updated',         title: 'Auditor — Sahara Constructions',                diff: { before: 'External', after: 'Yogesh' },                              client: 'Sahara Constructions' },
  { id: 'a06', timestamp: '2026-05-05T14:22:00', user: TEAM.sneha,  module: 'checklist',  action: 'configured',      title: 'GST credentials — Patel Realty',                detail: 'Updated GSTR 1 / 2B / 3B portal credentials', client: 'Patel Realty' },
  { id: 'a07', timestamp: '2026-05-05T13:48:00', user: TEAM.tejas,  module: 'workspace',  action: 'completed',       title: 'FY26 service-line restructure proposal' },
  { id: 'a08', timestamp: '2026-05-05T13:15:00', user: TEAM.zubear, module: 'inbox',      action: 'sent',            title: 'May compliance update',                          detail: 'Sent to #at-leadership channel' },
  { id: 'a09', timestamp: '2026-05-05T12:30:00', user: TEAM.riya,   module: 'checklist',  action: 'portal_added',    title: 'E-Com Reco — Veena Boutique',                   detail: 'Added Amazon (sellercentral.amazon.in)',      client: 'Veena Boutique'      },
  { id: 'a10', timestamp: '2026-05-05T11:55:00', user: TEAM.nisha,  module: 'checklist',  action: 'updated',         title: 'ITR Filing — Atlas Capital',                    diff: { before: 'Client Consultant', after: 'In-house' },                  client: 'Atlas Capital'        },
  { id: 'a11', timestamp: '2026-05-05T11:20:00', user: TEAM.harshal, module: 'onboarding', action: 'completed',       title: 'Kickoff held — Knickgasm',                       detail: 'Minutes-of-meeting shared with client. All 5 setup items already in place.', client: 'Knickgasm'           },
  { id: 'a12', timestamp: '2026-05-05T10:50:00', user: TEAM.anil,   module: 'checklist',  action: 'note_added',      title: 'GSTR-1 monthly return — Atlas Capital',         detail: 'Flagged ₹1.8L mismatch on May 2A reco',       client: 'Atlas Capital'        },
  { id: 'a13', timestamp: '2026-05-05T10:18:00', user: TEAM.tejas,  module: 'dashboard',  action: 'setting_changed', title: 'A&T Overview period range',                      detail: 'Range: 30 days → 7 days' },
  { id: 'a14', timestamp: '2026-05-05T09:45:00', user: TEAM.zubear, module: 'workspace',  action: 'created',         title: 'Standardize GST filing templates across A&T'                                                                                                       },
  { id: 'a15', timestamp: '2026-05-05T09:12:00', user: TEAM.mihir,  module: 'employees',  action: 'setting_changed', title: 'Resource Request approval threshold',           detail: 'Auto-approve raised: ₹50K → ₹75K' },

  // ── Yesterday (2026-05-04) ──
  { id: 'a16', timestamp: '2026-05-04T17:40:00', user: TEAM.irshad, module: 'checklist',  action: 'status_changed',  title: 'Audit & ITR Status — TechCorp India',           diff: { before: 'WIP', after: 'Done' },                                     client: 'TechCorp India'      },
  { id: 'a17', timestamp: '2026-05-04T17:05:00', user: TEAM.sneha,  module: 'checklist',  action: 'type_changed',    title: 'TDS — Patel Realty',                            diff: { before: 'Monthly', after: 'Quarterly' },                            client: 'Patel Realty'        },
  { id: 'a18', timestamp: '2026-05-04T16:30:00', user: TEAM.chinmay, module: 'onboarding', action: 'reassigned',      title: 'Skin Essentials owner',                          diff: { before: 'Chinmay P.', after: 'Harshal R.' },                        client: 'Skin Essentials'     },
  { id: 'a19', timestamp: '2026-05-04T16:00:00', user: TEAM.zubear, module: 'checklist',  action: 'status_changed',  title: 'GSTR-9C — FRR (BLOGS)',                          diff: { before: 'Applicable', after: 'Done' },                              client: 'FRR (BLOGS)'         },
  { id: 'a20', timestamp: '2026-05-04T15:25:00', user: TEAM.tejas,  module: 'workspace',  action: 'priority_changed',title: 'Q2 OKR planning session',                       diff: { before: 'P2', after: 'P1' }                                                                          },
  { id: 'a21', timestamp: '2026-05-04T14:50:00', user: TEAM.mihir,  module: 'onboarding', action: 'completed',       title: 'GST portal login received — RetailMax',          client: 'RetailMax'           },
  { id: 'a22', timestamp: '2026-05-04T14:18:00', user: TEAM.nisha,  module: 'dataroom',   action: 'uploaded',        title: 'Atlas Capital — FY26 audited financials',       detail: '4 files (12.3 MB)',                            client: 'Atlas Capital'       },
  { id: 'a23', timestamp: '2026-05-04T13:42:00', user: TEAM.zubear, module: 'inbox',      action: 'shared',          title: 'Overdue items — Alpine Group',                  detail: 'Shared via inbox handoff',                     client: 'Alpine Group'        },
  { id: 'a24', timestamp: '2026-05-04T12:30:00', user: TEAM.irshad, module: 'checklist',  action: 'status_changed',  title: 'PT monthly return — Konark Foods',              diff: { before: 'Pending', after: 'N/A' },                                  client: 'Konark Foods'        },
  { id: 'a25', timestamp: '2026-05-04T11:10:00', user: TEAM.anil,   module: 'checklist',  action: 'updated',         title: 'Registration Type — Marathon Industries',       diff: { before: 'Partnerships', after: 'Private LTD' },                     client: 'Marathon Industries' },
  { id: 'a26', timestamp: '2026-05-04T10:35:00', user: TEAM.sneha,  module: 'workspace',  action: 'assigned',        title: 'Train new team members on TDS',                 detail: 'Assigned to Mihir L.'                                                                                  },
  { id: 'a27', timestamp: '2026-05-04T09:50:00', user: TEAM.riya,   module: 'checklist',  action: 'status_changed',  title: 'GSTR-3B — Westwood Holdings',                   diff: { before: 'Pending', after: 'WIP' },                                  client: 'Westwood Holdings'   },

  // ── 2 days ago (2026-05-03) ──
  { id: 'a28', timestamp: '2026-05-03T18:20:00', user: TEAM.zubear, module: 'workspace',  action: 'completed',       title: 'Q4 internal audit task' },
  { id: 'a29', timestamp: '2026-05-03T17:10:00', user: TEAM.mihir,  module: 'onboarding', action: 'status_changed',  title: 'RetailMax — Log IDs',                            diff: { before: '4 / 13', after: '7 / 13'   },                              client: 'RetailMax'           },
  { id: 'a30', timestamp: '2026-05-03T16:25:00', user: TEAM.irshad, module: 'checklist',  action: 'status_changed',  title: 'Advance Tax — Green Valley Ent.',               diff: { before: 'Pending', after: 'WIP' },                                  client: 'Green Valley Ent.'   },
  // a31 (Vikram Singh new account, adminland) → consolidated into
  // m08 (Vikram Singh joined as Executive, employees) so the
  // master feed doesn't double-render the same hire event.
  { id: 'a32', timestamp: '2026-05-03T14:55:00', user: TEAM.nisha,  module: 'checklist',  action: 'configured',      title: 'PTRC / PTEC credentials — Sanghvi Holdings',    detail: 'Added PTEC No. + portal login',                client: 'Sanghvi Holdings'    },
  { id: 'a33', timestamp: '2026-05-03T13:20:00', user: TEAM.sneha,  module: 'workspace',  action: 'commented',       title: 'Internal audit fieldwork — week 1',             detail: 'Tagged Zubear Shaikh in the thread' },
  { id: 'a34', timestamp: '2026-05-03T12:40:00', user: TEAM.tejas,  module: 'dashboard',  action: 'setting_changed', title: 'A&T Overview filter',                            detail: 'Switched type filter: All → E-Commerce' },
  { id: 'a35', timestamp: '2026-05-03T11:55:00', user: TEAM.anil,   module: 'dataroom',   action: 'shared',          title: 'Sahara Constructions — GST documents',          detail: 'Shared with client',                           client: 'Sahara Constructions'},
  { id: 'a36', timestamp: '2026-05-03T10:30:00', user: TEAM.zubear, module: 'checklist',  action: 'updated',         title: 'Column order on King & Queen',                  detail: 'Promoted ROC Compliance to position 5' },
  { id: 'a37', timestamp: '2026-05-03T09:50:00', user: TEAM.harshal, module: 'onboarding', action: 'completed',       title: 'MoMs shared — Knickgasm',                       client: 'Knickgasm'           },

  // ── 3 days ago (2026-05-02) ──
  { id: 'a38', timestamp: '2026-05-02T17:15:00', user: TEAM.irshad, module: 'checklist',  action: 'status_changed',  title: 'Income Tax — Sanghvi Holdings',                 diff: { before: 'Pending', after: 'Done' },                                 client: 'Sanghvi Holdings'    },
  { id: 'a39', timestamp: '2026-05-02T16:45:00', user: TEAM.sneha,  module: 'checklist',  action: 'status_changed',  title: 'PT Return — Atlas Capital',                     diff: { before: 'Pending', after: 'Done' },                                 client: 'Atlas Capital'       },
  { id: 'a40', timestamp: '2026-05-02T15:30:00', user: TEAM.nisha,  module: 'workspace',  action: 'created',         title: '3 todos added to Brego Delivery Team' },
  { id: 'a41', timestamp: '2026-05-02T14:20:00', user: TEAM.rohan,  module: 'dataroom',   action: 'moved',           title: 'Compliance docs → A&T vault',                   detail: 'Moved 8 files from General to A&T workspace' },
  { id: 'a42', timestamp: '2026-05-02T13:00:00', user: TEAM.zubear, module: 'workspace',  action: 'completed',       title: 'Q1 MIS pack delivery' },
  { id: 'a43', timestamp: '2026-05-02T11:40:00', user: TEAM.mihir,  module: 'employees',  action: 'setting_changed', title: 'Updated CLA template',                          detail: 'Added grace-period clause for late kickoffs' },
  { id: 'a44', timestamp: '2026-05-02T10:15:00', user: TEAM.anil,   module: 'checklist',  action: 'portal_added',    title: 'Vijay Family Office — auditor access',          detail: 'Granted view-only access to external auditor', client: 'Vijay Family Office' },

  // ── 4 days ago (2026-05-01) ──
  { id: 'a45', timestamp: '2026-05-01T17:30:00', user: TEAM.tejas,  module: 'inbox',      action: 'sent',            title: 'Weekly A&T standup recap',                       detail: 'Sent to #at-leadership' },
  { id: 'a46', timestamp: '2026-05-01T16:10:00', user: TEAM.sneha,  module: 'checklist',  action: 'note_added',      title: 'GSTR-2B reconciliation — Sahara Constructions', detail: 'Carry-over from April reco still pending',     client: 'Sahara Constructions'},
  { id: 'a47', timestamp: '2026-05-01T15:00:00', user: TEAM.harshal, module: 'onboarding', action: 'created',         title: 'Skin Essentials onboarding kicked off',         detail: 'New SEM client added to the pipeline · Discovery scheduled', client: 'Skin Essentials'     },
  { id: 'a48', timestamp: '2026-05-01T13:45:00', user: TEAM.zubear, module: 'checklist',  action: 'status_changed',  title: 'BOA — Patel Industries',                        diff: { before: 'Pending', after: 'Done' },                                 client: 'Patel Industries'    },
  { id: 'a49', timestamp: '2026-05-01T12:20:00', user: TEAM.nisha,  module: 'dataroom',   action: 'created',         title: 'Folder: Atlas Capital / FY26 Annual',           client: 'Atlas Capital'       },
  { id: 'a50', timestamp: '2026-05-01T11:00:00', user: TEAM.mihir,  module: 'employees',  action: 'updated',         title: 'Employee CLA — Tom B.',                          detail: 'Status: None → Issued' },

  // ── 5–7 days ago (2026-04-28 → 2026-04-30) ──
  { id: 'a51', timestamp: '2026-04-30T16:45:00', user: TEAM.zubear, module: 'checklist',  action: 'status_changed',  title: 'GSTR-9 — Patel Constructions',                  diff: { before: 'WIP', after: 'Done' },                                     client: 'Patel Constructions' },
  { id: 'a52', timestamp: '2026-04-30T14:30:00', user: TEAM.sneha,  module: 'checklist',  action: 'completed',       title: 'PF return — Aryan Pharmaceuticals',             client: 'Aryan Pharmaceuticals' },
  { id: 'a53', timestamp: '2026-04-30T11:15:00', user: TEAM.rohan,  module: 'workspace',  action: 'assigned',        title: 'GST advisory cleanup — Westwood Holdings',      detail: 'Assigned to Anil Kumar' },
  { id: 'a54', timestamp: '2026-04-29T17:20:00', user: TEAM.tejas,  module: 'dashboard',  action: 'setting_changed', title: 'A&T Overview period',                            detail: 'Range changed: 30 days → 90 days' },
  { id: 'a55', timestamp: '2026-04-29T15:00:00', user: TEAM.irshad, module: 'checklist',  action: 'reassigned',      title: 'TCS Reco — Atlas Capital',                      diff: { before: 'Anil K.', after: 'Sneha P.' },                             client: 'Atlas Capital'       },
  { id: 'a56', timestamp: '2026-04-29T11:40:00', user: TEAM.mihir,  module: 'employees',  action: 'setting_changed', title: 'Resource Request workflow',                     detail: 'Added auto-routing to POD Heads' },
  { id: 'a57', timestamp: '2026-04-28T16:30:00', user: TEAM.zubear, module: 'workspace',  action: 'created',         title: 'Conduct internal audit of Q4 tax filings' },
  { id: 'a58', timestamp: '2026-04-28T13:50:00', user: TEAM.anil,   module: 'checklist',  action: 'status_changed',  title: 'MIS — Rajan Group',                              diff: { before: 'WIP', after: 'Done' },                                     client: 'Rajan Group'         },

  // ── Client-lifecycle events: kickoffs (new client entering the
  //    onboarding pipeline) and Live transitions (all 29 checklist
  //    items complete → client is now operational on the
  //    deliverables side). These are the highest-signal events for
  //    the HOD scanning the feed — every other activity is a
  //    delta on existing work, but these flip the company's roster. ──
  // a59 (Yash Industries went Live, onboarding) → consolidated into
  // m02 (Yash Industries customer_joined, customers) so the master
  // feed surfaces the lifecycle event once with a clear bucket.
  { id: 'a60', timestamp: '2026-05-03T16:00:00', user: TEAM.chinmay, module: 'onboarding', action: 'status_changed',  title: 'UrbanNest Realty — Setup',                       diff: { before: '1 / 5', after: '2 / 5' },                                  detail: 'Item: Competitor analysis completed',         client: 'UrbanNest Realty'    },
  // a61 (Veena Boutique went Live, onboarding) → consolidated into
  // m04 (Veena Boutique customer_joined, customers) for the same
  // reason as a59 above.
  { id: 'a62', timestamp: '2026-05-01T10:00:00', user: TEAM.chinmay, module: 'onboarding', action: 'status_changed',  title: 'Nor Black Nor White — Setup',                    diff: { before: '0 / 5', after: '1 / 5' },                                  detail: 'Item: Brand brief & USPs collected',          client: 'Nor Black Nor White' },
  // a63 / a64 (Pankaj & Associates / Ankit Industries — fake clients
  // going Live) removed during the OnboardingModule audit. The
  // real OnboardingModule clients with onboarding=Done all went
  // Live in mid-March 2026, outside this feed's typical 7-day
  // window. Replaced below by realistic in-progress events for
  // the actual onboarding pipeline (Una Homes LLP setup, RetailMax
  // log IDs, Green Energy data sharing items, etc.).
  { id: 'a63', timestamp: '2026-04-30T17:00:00', user: TEAM.chinmay, module: 'onboarding', action: 'status_changed',  title: 'Una Homes LLP — Setup',                          diff: { before: '2 / 5', after: '3 / 5' },                                  detail: 'Item: Ad accounts access received',           client: 'Una Homes LLP'        },
  { id: 'a64', timestamp: '2026-04-28T10:30:00', user: TEAM.zubear, module: 'onboarding', action: 'completed',       title: 'Green Energy Industries — kickoff held',         detail: 'Minutes-of-meeting shared · Data sharing started',                  client: 'Green Energy Industries' },

  // ── Extra Recurring Checklist entries (status flips + assignments)
  //    so the A&T Activity feed reads as lived-in across all 5
  //    sub-types after it filters to checklist-only + status/
  //    assignment changes. Spread across the same 7-day window. ──
  { id: 'b01', timestamp: '2026-05-05T17:10:00', user: TEAM.zubear, module: 'checklist', action: 'assigned',       title: 'GSTR-2A reconciliation — Atlas Capital',          detail: 'Assigned to Sneha P.',                                client: 'Atlas Capital'        },
  { id: 'b02', timestamp: '2026-05-05T15:05:00', user: TEAM.zubear, module: 'checklist', action: 'status_changed', title: 'PTRC return — Sanghvi Holdings',                  diff: { before: 'WIP', after: 'Done' },                        client: 'Sanghvi Holdings'    },
  { id: 'b03', timestamp: '2026-05-05T11:32:00', user: TEAM.rohan,  module: 'checklist', action: 'reassigned',     title: 'TDS challan upload — Patel Industries',           diff: { before: 'Anil K.', after: 'Riya S.' },                 client: 'Patel Industries'    },
  { id: 'b04', timestamp: '2026-05-05T10:08:00', user: TEAM.nisha,  module: 'checklist', action: 'status_changed', title: 'E-Com Reco — Veena Boutique',                     diff: { before: 'Pending', after: 'WIP' },                     client: 'Veena Boutique'      },
  { id: 'b05', timestamp: '2026-05-04T16:25:00', user: TEAM.rohan,  module: 'checklist', action: 'assigned',       title: 'GSTR-3B — Westwood Holdings',                     detail: 'Assigned to Vikram S.',                               client: 'Westwood Holdings'   },
  { id: 'b06', timestamp: '2026-05-04T13:55:00', user: TEAM.irshad, module: 'checklist', action: 'status_changed', title: 'Income Tax filing — TechCorp India',              diff: { before: 'Pending', after: 'WIP' },                     client: 'TechCorp India'      },
  { id: 'b07', timestamp: '2026-05-04T09:30:00', user: TEAM.irshad, module: 'checklist', action: 'reassigned',     title: 'TDS quarterly — Sahara Constructions',            diff: { before: 'Sneha P.', after: 'Anil K.' },                client: 'Sahara Constructions'},
  { id: 'b08', timestamp: '2026-05-03T15:50:00', user: TEAM.zubear, module: 'checklist', action: 'status_changed', title: 'PTEC monthly — Konark Foods',                     diff: { before: 'Pending', after: 'Done' },                    client: 'Konark Foods'        },
  { id: 'b09', timestamp: '2026-05-03T11:20:00', user: TEAM.zubear, module: 'checklist', action: 'assigned',       title: 'ITR filing — Atlas Capital',                       detail: 'Assigned to Riya S.',                                 client: 'Atlas Capital'        },
  { id: 'b10', timestamp: '2026-05-02T17:00:00', user: TEAM.riya,   module: 'checklist', action: 'status_changed', title: 'GSTR-1 — Marathon Industries',                    diff: { before: 'WIP', after: 'Done' },                        client: 'Marathon Industries' },
  { id: 'b11', timestamp: '2026-05-02T09:40:00', user: TEAM.rohan,  module: 'checklist', action: 'reassigned',     title: 'E-Com BOA reconciliation — Veena Boutique',       diff: { before: 'Vikram S.', after: 'Nisha A.' },              client: 'Veena Boutique'      },
  { id: 'b12', timestamp: '2026-05-01T14:30:00', user: TEAM.irshad, module: 'checklist', action: 'status_changed', title: 'TDS monthly — Aryan Pharmaceuticals',             diff: { before: 'WIP', after: 'Done' },                        client: 'Aryan Pharmaceuticals' },
  { id: 'b13', timestamp: '2026-04-30T13:15:00', user: TEAM.sneha,  module: 'checklist', action: 'status_changed', title: 'GSTR-3B — Alpine Group',                          diff: { before: 'Pending', after: 'WIP' },                     client: 'Alpine Group'        },
  { id: 'b14', timestamp: '2026-04-29T10:50:00', user: TEAM.zubear, module: 'checklist', action: 'assigned',       title: 'PT return — Coast and Bloom',                     detail: 'Assigned to Vikram S.',                               client: 'Coast and Bloom'     },
  { id: 'b15', timestamp: '2026-04-28T17:45:00', user: TEAM.nisha,  module: 'checklist', action: 'status_changed', title: 'Income Tax — Marathon Industries',                diff: { before: 'Pending', after: 'WIP' },                     client: 'Marathon Industries' },

  // ── New executive activity (Aarav / Pooja / Karan). Status flips
  //    only — assignments stay HOD/POD-Head only — so these read as
  //    the realistic doing-the-work bottom of the pyramid. Spread
  //    across the same 7-day window and across all 5 sub-types so
  //    each new exec shows up under the sub-type filter naturally. ──
  { id: 'c01', timestamp: '2026-05-05T13:55:00', user: TEAM.aarav, module: 'checklist', action: 'status_changed', title: 'GSTR-3B — Marathon Industries',           diff: { before: 'WIP', after: 'Done' },              client: 'Marathon Industries' },
  { id: 'c02', timestamp: '2026-05-05T10:42:00', user: TEAM.pooja, module: 'checklist', action: 'status_changed', title: 'TDS monthly — Bilawala & Co (Heena)',     diff: { before: 'Pending', after: 'WIP' },           client: 'Bilawala & Co (Heena)' },
  { id: 'c03', timestamp: '2026-05-04T15:10:00', user: TEAM.karan, module: 'checklist', action: 'status_changed', title: 'PTRC return — Atlas Capital',             diff: { before: 'Pending', after: 'Done' },          client: 'Atlas Capital'        },
  { id: 'c04', timestamp: '2026-05-04T11:25:00', user: TEAM.aarav, module: 'checklist', action: 'status_changed', title: 'E-Com Reco — Veena Boutique',             diff: { before: 'WIP', after: 'Done' },              client: 'Veena Boutique'       },
  { id: 'c05', timestamp: '2026-05-03T14:00:00', user: TEAM.pooja, module: 'checklist', action: 'status_changed', title: 'ITR filing — Sahara Constructions',       diff: { before: 'Pending', after: 'WIP' },           client: 'Sahara Constructions' },
  { id: 'c06', timestamp: '2026-05-03T09:35:00', user: TEAM.karan, module: 'checklist', action: 'status_changed', title: 'TCS Reco — Patel Industries',             diff: { before: 'WIP', after: 'Done' },              client: 'Patel Industries'     },
  { id: 'c07', timestamp: '2026-05-02T16:20:00', user: TEAM.aarav, module: 'checklist', action: 'status_changed', title: 'PT monthly — Konark Foods',               diff: { before: 'WIP', after: 'Done' },              client: 'Konark Foods'         },
  { id: 'c08', timestamp: '2026-05-01T11:50:00', user: TEAM.pooja, module: 'checklist', action: 'status_changed', title: 'GSTR-2B reconciliation — Alpine Group',   diff: { before: 'Pending', after: 'WIP' },           client: 'Alpine Group'         },
  { id: 'c09', timestamp: '2026-04-30T15:30:00', user: TEAM.karan, module: 'checklist', action: 'status_changed', title: 'Income Tax — TechCorp India',             diff: { before: 'WIP', after: 'Done' },              client: 'TechCorp India'       },

  // ── Master-Activity lifecycle events ─────────────────────────────
  // These are the platform-wide events the master /activity feed
  // exists to surface. Each maps cleanly to a real product action:
  //   • customer_joined / customer_removed → Customers database mutations
  //   • employee_joined / employee_removed → Employees database mutations
  //   • data_uploaded                      → A&T client dashboard monthly drops
  //   • dataroom: created / shared / moved → Dataroom folder lifecycle
  //   • workspace: assigned / status_changed / completed → Task updates
  // Spread across the same 7-day window as the rest of the data set
  // so the master feed reads as lived-in next to the operational
  // mutations that already populate the timeline.

  // ── Customers database lifecycle ──
  { id: 'm01', timestamp: '2026-05-05T17:30:00', user: TEAM.tejas, module: 'customers', action: 'customer_joined',  title: 'Pioneer Realty', detail: 'New A&T client — onboarding pipeline started by Sales',                            client: 'Pioneer Realty'  },
  // m02 (Yash Industries went Live) removed during the OnboardingModule
  // audit. The real OnboardingModule "Done" clients (TechCorp India,
  // Fashion Forward Ltd, Bio Basket, Alpine Group) all went Live in
  // March 2026 — outside the master Activity feed's typical 7-day
  // window. Replaced with a recent partial-progress status_changed
  // event on a real in-progress client so the "close to Live" story
  // still reads on the feed.
  { id: 'm02', timestamp: '2026-05-04T11:30:00', user: TEAM.mihir,  module: 'onboarding', action: 'status_changed', title: 'RetailMax — onboarding progress',               diff: { before: '74%', after: '79%' },                  detail: '7 of 13 log IDs received · close to going Live',  client: 'RetailMax'           },
  { id: 'm03', timestamp: '2026-05-03T09:15:00', user: TEAM.mihir, module: 'customers', action: 'customer_removed', title: 'Aryan Pharmaceuticals', detail: 'CLA invoked — invoice unpaid for 62 days, multiple follow-ups unanswered',  client: 'Aryan Pharmaceuticals' },
  // m04 (Veena Boutique went Live) removed for the same reason as m02.
  // Replaced by a Knickgasm setup-completion event — real client,
  // 100% setup but kickoff was the bottleneck.
  { id: 'm04', timestamp: '2026-05-02T14:00:00', user: TEAM.harshal, module: 'onboarding', action: 'status_changed', title: 'Knickgasm — Setup',                              diff: { before: '4 / 5', after: '5 / 5' },              detail: 'Item: Tracking & analytics configured · Setup complete', client: 'Knickgasm'           },
  { id: 'm05', timestamp: '2026-04-30T16:20:00', user: TEAM.tejas, module: 'customers', action: 'customer_removed', title: 'Westwood Holdings (legacy)', detail: 'Service contract not renewed for FY27 — client moved in-house',                client: 'Westwood Holdings' },

  // ── Employees database lifecycle ──
  { id: 'm06', timestamp: '2026-05-05T11:00:00', user: TEAM.mihir, module: 'employees', action: 'employee_joined',  title: 'Aarav Joshi joined as Executive', detail: 'A&T · Mumbai HQ · Reporting to Zubear Shaikh' },
  { id: 'm07', timestamp: '2026-05-04T10:15:00', user: TEAM.mihir, module: 'employees', action: 'employee_joined',  title: 'Pooja Verma joined as Executive', detail: 'A&T · Remote · Reporting to Irshad Qureshi' },
  { id: 'm08', timestamp: '2026-05-03T15:40:00', user: TEAM.mihir, module: 'employees', action: 'employee_joined',  title: 'Vikram Singh joined as Executive', detail: 'A&T · Mumbai HQ · Onboarded same day' },
  { id: 'm09', timestamp: '2026-05-02T17:30:00', user: TEAM.mihir, module: 'employees', action: 'employee_removed', title: 'Amit Verma left',                 detail: 'Better growth opportunity at competing agency', diff: { before: 'Active',     after: 'Resigned'   } },
  { id: 'm10', timestamp: '2026-04-30T13:15:00', user: TEAM.mihir, module: 'employees', action: 'employee_removed', title: 'Pooja Deshmukh left',             detail: 'Relocating to Bangalore — switched fields',     diff: { before: 'Active',     after: 'Resigned'   } },
  { id: 'm11', timestamp: '2026-04-29T16:45:00', user: TEAM.mihir, module: 'employees', action: 'employee_removed', title: 'Kunal Jain off-boarded',          detail: 'Performance issues — repeated client compliance errors', diff: { before: 'On Notice',  after: 'Terminated' } },

  // ── Dashboard: client financial data uploads ──
  // These are the monthly Sales / Expenses / Receivables / Payables
  // drops the A&T team pushes onto each client's financial dashboard.
  // The "X/8 → Y/8" diff says how many of the 8 file slots are
  // now complete for that client+month.
  { id: 'm12', timestamp: '2026-05-05T16:42:00', user: TEAM.sneha,  module: 'dashboard', action: 'data_uploaded', title: 'Patel Constructions · May 2026',  detail: 'Sales + Expenses + Receivables + Payables', diff: { before: '0 / 8', after: '8 / 8' }, client: 'Patel Constructions' },
  { id: 'm13', timestamp: '2026-05-05T15:10:00', user: TEAM.anil,   module: 'dashboard', action: 'data_uploaded', title: 'Atlas Capital · May 2026',         detail: 'Receivables + Payables · Sales / Expenses pending from client', diff: { before: '5 / 8', after: '7 / 8' }, client: 'Atlas Capital'        },
  { id: 'm14', timestamp: '2026-05-04T13:25:00', user: TEAM.riya,   module: 'dashboard', action: 'data_uploaded', title: 'Sahara Constructions · Apr 2026',  detail: 'GST + TDS data + bank statements',         diff: { before: '4 / 8', after: '6 / 8' }, client: 'Sahara Constructions' },
  { id: 'm15', timestamp: '2026-05-03T11:50:00', user: TEAM.nisha,  module: 'dashboard', action: 'data_uploaded', title: 'Marathon Industries · Apr 2026',   detail: 'Initial drop — 4 of 8 files',              diff: { before: '0 / 8', after: '4 / 8' }, client: 'Marathon Industries' },
  { id: 'm16', timestamp: '2026-05-01T17:00:00', user: TEAM.aarav,  module: 'dashboard', action: 'data_uploaded', title: 'Patel Realty · Apr 2026',          detail: 'Final month-end drop',                     diff: { before: '6 / 8', after: '8 / 8' }, client: 'Patel Realty'         },

  // ── Dataroom folder updates ──
  { id: 'm17', timestamp: '2026-05-05T14:35:00', user: TEAM.sneha,  module: 'dataroom', action: 'created', title: 'Folder: Pioneer Realty / Onboarding',  detail: 'New folder + 4 sub-folders (Discovery / KYC / Contracts / Templates)', client: 'Pioneer Realty' },
  { id: 'm18', timestamp: '2026-05-04T10:50:00', user: TEAM.rohan,  module: 'dataroom', action: 'moved',   title: 'Yash Industries → Live clients',         detail: 'Moved 12 folders from Onboarding to Live clients workspace',          client: 'Yash Industries' },
  { id: 'm19', timestamp: '2026-05-02T16:20:00', user: TEAM.zubear, module: 'dataroom', action: 'shared',  title: 'Atlas Capital · FY26 Annual',          detail: 'Shared with external auditor (read-only)',                            client: 'Atlas Capital' },

  // ── Client-side workspace activity ────────────────────────────────
  // Tasks raised or updated BY the client through the client
  // portal. These pair with the internal team's task activity in
  // the Workspace module — admins use this signal to spot when a
  // client is actively engaged (raising requests, acknowledging
  // delivered work) vs going silent. Each row carries `user.role`
  // 'Client' which the ActivityRow renders as a small pill so the
  // admin can tell at a glance whether a task move was initiated
  // by Brego or the client.
  { id: 'mc01', timestamp: '2026-05-05T16:55:00', user: CLIENT_TEAM.saharaPM,       module: 'workspace', action: 'created',        title: 'GST advisory call on input credit reversal', detail: 'Raised via client portal — needs HOD attention',  client: 'Sahara Constructions' },
  { id: 'mc02', timestamp: '2026-05-05T12:10:00', user: CLIENT_TEAM.atlasCFO,       module: 'workspace', action: 'status_changed', title: 'Vendor master update for FY27',              diff: { before: 'Pending', after: 'In Progress' },          client: 'Atlas Capital'        },
  { id: 'mc03', timestamp: '2026-05-04T15:40:00', user: CLIENT_TEAM.marathonOps,    module: 'workspace', action: 'status_changed', title: 'May invoice approval — IND-2026-114',        diff: { before: 'Pending', after: 'Completed' },            client: 'Marathon Industries'  },
  { id: 'mc04', timestamp: '2026-05-04T10:20:00', user: CLIENT_TEAM.konarkOwner,    module: 'workspace', action: 'created',        title: 'PT registration for new Pune branch',         detail: 'Raised via client portal — branch opens 1 Jul',   client: 'Konark Foods'         },
  { id: 'mc05', timestamp: '2026-05-03T14:30:00', user: CLIENT_TEAM.patelRealtyOwn, module: 'workspace', action: 'status_changed', title: 'TDS supporting docs upload',                  diff: { before: 'Pending', after: 'In Progress' },          client: 'Patel Realty'         },
  { id: 'mc06', timestamp: '2026-05-02T17:45:00', user: CLIENT_TEAM.rajanFinance,   module: 'workspace', action: 'status_changed', title: 'GSTR-3B draft review',                        diff: { before: 'Awaiting Client', after: 'Approved' },     client: 'Rajan Group'          },
  { id: 'mc07', timestamp: '2026-05-01T11:25:00', user: CLIENT_TEAM.atlasCFO,       module: 'workspace', action: 'created',        title: 'Q1 management report — extra commentary',     detail: 'Raised via client portal — board pack additions', client: 'Atlas Capital'        },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveActivitySource — every Activity row's link target.
 *
 * The master Activity feed is only as useful as the click-through.
 * Each row should drop the admin onto the surface where the work
 * actually lives, so they can see it in context instead of bouncing
 * around the platform looking for it.
 *
 * The mapping is module-first, action-aware where the action moves
 * the entry to a different surface (e.g. an `employee_removed`
 * lives on Past Employees, not on All Employees). For modules that
 * have a single canonical surface (Inbox, Dataroom), every entry
 * routes to the same root.
 *
 * Where the platform's URL contract supports it, we deep-link with
 * query params (e.g. `?sub=past-employees`) so the admin lands
 * directly on the correct screen, not on the module's overview
 * with another click in front of them. Per-record params
 * (`?client=<id>`, `?employeeId=<id>`) are skipped today because
 * the mock data doesn't carry those IDs — adding them here is a
 * one-line change once the real backend wiring shows up.
 *
 * Audited against:
 *   • lib/super-admin-home-routes.ts — canonical /home tab/sub map
 *   • app/dashboard, app/workspace, app/dataroom, app/inbox    — flat routes
 *   • app/profile, app/adminland                                — flat routes
 *   • app/home?tab=…&sub=…                                      — Home tabs
 */
export function resolveActivitySource(entry: ActivityEntry): string {
  switch (entry.module) {
    // ── Customers database ──
    // Joined: client appears on the live roster. Lost / removed:
    // client moves to the dedicated Lost Clients screen which is
    // the canonical home for off-boarded businesses.
    case 'customers':
      if (entry.action === 'customer_removed') return R.customers.lostClients;
      return R.customers.allCustomers;

    // ── Employees database ──
    // Joined: live roster. Removed (resigned/terminated): the
    // dedicated Past Employees screen at ?sub=past-employees.
    // Hires-in-pipeline (incoming) aren't generated in mock data
    // today but would route to ?sub=incoming.
    case 'employees':
      if (entry.action === 'employee_removed') return '/home?tab=employees&sub=past-employees';
      return R.employees.allEmployees;

    // ── Dashboard ──
    // The financial-data drops belong to the A&T client dashboard
    // (one client × one month → 8 file slots), so data_uploaded
    // routes there. Setting changes are general dashboard config
    // and route to /dashboard root.
    case 'dashboard':
      if (entry.action === 'data_uploaded') return '/dashboard/accounts-taxation';
      return '/dashboard';

    // ── Workspace ──
    // Tasks live in /workspace/task-management. Both internal
    // team activity and client-portal activity (mc01–mc07) drop
    // here — the task list itself owns who-did-what disambiguation.
    case 'workspace':
      return '/workspace/task-management';

    // ── Dataroom ──
    case 'dataroom':
      return '/dataroom';

    // ── Inbox ──
    case 'inbox':
      return '/inbox';

    // ── A&T Recurring Checklist ──
    // The deliverables sub-tab is the canonical home for both
    // monthly recurring compliance work (TDS / GST / PT / IT /
    // E-Com Reco) and annual compliance work that previously
    // tagged as 'kingqueen' (now consolidated here since K&Q
    // isn't in the platform's left nav). Once the mock data
    // carries client+business IDs we can deep-link to the
    // per-business detail with `?client=<id>&business=<id>`.
    case 'checklist':
      return R.accountsTaxation.deliverables;

    // ── A&T Onboarding pipeline ──
    case 'onboarding':
      return R.customers.onboarding;
  }
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = NOW_REF.getTime() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(NOW_REF.getFullYear(), NOW_REF.getMonth(), NOW_REF.getDate());
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)  return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function groupByDate(entries: ActivityEntry[]): { label: string; entries: ActivityEntry[] }[] {
  const groups: Map<string, ActivityEntry[]> = new Map();
  entries.forEach(e => {
    const label = getDateLabel(e.timestamp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  });
  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

export type PeriodFilter = 'today' | 'yesterday' | '7d' | '30d' | 'all';
export const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'today',     label: 'Today'     },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d',        label: '7 days'    },
  { value: '30d',       label: '30 days'   },
  { value: 'all',       label: 'All time'  },
];

export function isWithinPeriod(iso: string, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  const entry = new Date(iso);
  const today = new Date(NOW_REF.getFullYear(), NOW_REF.getMonth(), NOW_REF.getDate());
  const entryDate = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
  if (period === 'today')     return diffDays === 0;
  if (period === 'yesterday') return diffDays === 1;
  if (period === '7d')        return diffDays <= 7;
  if (period === '30d')       return diffDays <= 30;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
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
// PUBLIC COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState('');
  // Filter by ActivityModule directly — the dropdown groups
  // modules under Home tabs / A&T sub-tabs / Modules so the admin
  // sees the platform's actual navigation destinations, not a
  // single rolled-up "Home" bucket.
  const [moduleFilter, setModuleFilter] = useState<'all' | ActivityModule>('all');
  const [teamFilter,   setTeamFilter]   = useState<'all' | string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d');
  const [visibleCount, setVisibleCount] = useState(25);

  const moduleDD = useDropdown();
  const teamDD   = useDropdown();
  const periodDD = useDropdown();

  const teamMembers = Object.values(TEAM);

  // Period-scoped activities (used for both the timeline + the pulse
  // / module-breakdown stats above, so the whole page reads as a
  // single coherent view for the chosen window).
  const periodActivities = useMemo(
    () => mockActivities.filter(e => isWithinPeriod(e.timestamp, periodFilter)),
    [periodFilter]
  );

  const filtered = useMemo(() => {
    let result = periodActivities;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(s) ||
        e.user.name.toLowerCase().includes(s) ||
        e.detail?.toLowerCase().includes(s) ||
        e.client?.toLowerCase().includes(s) ||
        e.diff?.before.toLowerCase().includes(s) ||
        e.diff?.after.toLowerCase().includes(s)
      );
    }
    if (moduleFilter !== 'all') result = result.filter(e => e.module === moduleFilter);
    if (teamFilter   !== 'all') result = result.filter(e => e.user.name === teamFilter);
    // Sort newest-first regardless of source-array order. The seed
    // is roughly DESC but the new lifecycle entries are appended at
    // the end of the array; sorting here lets the page mix them in
    // their proper temporal slots without forcing manual interleave
    // of mock data.
    return [...result].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [periodActivities, searchTerm, moduleFilter, teamFilter]);

  const grouped = useMemo(() => groupByDate(filtered.slice(0, visibleCount)), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;
  const activeFilterCount = (moduleFilter !== 'all' ? 1 : 0) + (teamFilter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === periodFilter)?.label ?? '7 days';

  const resetFilters = () => {
    setSearchTerm('');
    setModuleFilter('all');
    setTeamFilter('all');
  };

  return (
    <div className="h-[calc(100vh-53px)] bg-[#F8F9FC] overflow-y-auto">
      {/* ── Top bar — single full-bleed sticky strip, same shape as
              the All Customers / Past Employees / A&T Activity top
              bars. Title + subtitle anchor the left, one control row
              on the right (Module · Person · Period · Search) so the
              page reads as a single coherent header instead of a
              header + filter-strip pair. ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-20 px-8">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <div className="min-w-0">
              <p className="text-black/90 text-body font-semibold">Activity</p>
              <p className="text-black/60 mt-0.5 text-caption font-normal">
                Everything across the platform — joiners, exits, tasks, uploads, dataroom changes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Surface filter — every navigable destination an
                event can come from, mirroring the Home left-nav
                exactly:
                  • Home tabs   → Customers, Employees, Onboarding
                  • A&T sub-tab → Recurring Checklist
                  • Modules     → Inbox, Dashboard, Workspace, Dataroom
                Section headers preserve the platform's nav
                hierarchy so the dropdown reads as a sidebar
                index, not a flat list of internal categories. */}
            <div ref={moduleDD.ref} className="relative">
              <button
                type="button"
                onClick={() => { moduleDD.setOpen(!moduleDD.open); teamDD.setOpen(false); periodDD.setOpen(false); }}
                aria-expanded={moduleDD.open}
                aria-haspopup="listbox"
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${moduleFilter !== 'all' ? 'bg-[#EEF1FB] text-[#204CC7] border border-[#204CC7]/20' : 'bg-white text-black/70 border border-black/10 hover:border-black/20'}`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                {moduleFilter === 'all' ? 'All activity' : MODULE_CONFIG[moduleFilter].label}
                <ChevronDown className={`w-3 h-3 transition-transform ${moduleDD.open ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {moduleDD.open && (
                <div role="listbox" aria-label="Filter by surface" className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-black/[0.08] rounded-md shadow-xl py-1 z-50 max-h-[480px] overflow-y-auto">
                  {/* Flat list — section labels (HOME TABS /
                      ACCOUNTS & TAXATION / MODULES) and the
                      between-section dividers were retired in the
                      cleanup pass. With 8 short options the list
                      reads cleanly without group headers, and the
                      icons all carry a single neutral slate tone
                      so the dropdown reads as one quiet column.
                      The internal grouping in FILTER_GROUPS is
                      preserved so the rendering order still
                      mirrors the platform's nav hierarchy
                      (Customers → Employees → Onboarding → A&T →
                      modules), even without the labels. */}
                  <button
                    role="option"
                    aria-selected={moduleFilter === 'all'}
                    onClick={() => { setModuleFilter('all'); moduleDD.setOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${moduleFilter === 'all' ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    All activity
                  </button>
                  {FILTER_GROUPS.flatMap(group => group.modules).map(mod => {
                    const cfg = MODULE_CONFIG[mod];
                    const Icon = cfg.icon;
                    const isActive = moduleFilter === mod;
                    return (
                      <button
                        key={mod}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => { setModuleFilter(mod); moduleDD.setOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-caption transition-colors flex items-center gap-2.5 ${isActive ? 'bg-[#EEF1FB]/60 text-[#204CC7] font-semibold' : 'text-black/70 hover:bg-black/[0.03]'}`}
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                        {cfg.label}
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
                onClick={() => { teamDD.setOpen(!teamDD.open); moduleDD.setOpen(false); periodDD.setOpen(false); }}
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
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-caption font-bold flex-shrink-0" style={{ backgroundColor: member.color }}>
                        {member.initials}
                      </span>
                      <span className="flex-1 truncate">{member.name}</span>
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
                onClick={() => { periodDD.setOpen(!periodDD.open); teamDD.setOpen(false); moduleDD.setOpen(false); }}
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
            <div className="relative w-[260px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/45 pointer-events-none" aria-hidden="true" />
              <label htmlFor="activity-search" className="sr-only">Search activity</label>
              <input
                id="activity-search"
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

      {/* ── Body — centred column for the timeline so the date-grouped
              feed reads with balanced left/right margins. The top bar
              above stays full-bleed so it visually anchors the page. ── */}
      <div className="max-w-[960px] mx-auto px-6 py-6">
        {/* Active-filter chip strip — only renders when the admin has
            narrowed the feed. Shows event count + Clear-all so they
            can return to the full view in one click without bouncing
            back up to the top bar. */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-caption text-black/55 tabular-nums">
              <strong className="text-black/85">{filtered.length}</strong> {filtered.length === 1 ? 'event' : 'events'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-caption font-medium text-rose-700 hover:bg-rose-50 transition-colors"
            >
              <X className="w-3 h-3" aria-hidden="true" /> Clear
            </button>
          </div>
        )}

        {/* ── Timeline ── */}
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
                  {group.entries.map((entry) => (
                    <ActivityRow key={entry.id} entry={entry} />
                  ))}
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
            <p className="text-body font-medium text-black/65">No activity matches your filters.</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY ROW
// ─────────────────────────────────────────────────────────────────────────────

/** Optional override for the per-row module pill. When the page
 *  hosting this row is already scoped to a single module (e.g. the
 *  A&T Activity page now scopes to Recurring Checklist only), the
 *  module name on every row becomes redundant — pages can pass a
 *  `customBadge` to swap in something more useful, like the
 *  sub-type the row belongs to (TDS / GST / PTRC / etc.). */
export interface ActivityRowBadge {
  label: string;
  bg: string;        // Tailwind bg-* class
  text: string;      // Tailwind text-* class
}

export function ActivityRow({ entry, customBadge }: { entry: ActivityEntry; customBadge?: ActivityRowBadge }) {
  const actCfg = ACTION_CONFIG[entry.action];
  // Default badge = the row's granular module label only. The
  // previous rev sourced the badge tint from MODULE_CONFIG, which
  // gave eight competing accent colours (cyan / emerald / blue /
  // fuchsia / violet / brand-blue / amber / indigo) on the same
  // scrolling list — visually noisy. Now: one neutral slate chip
  // for every module. The A&T Activity page still overrides this
  // with sub-type tints via customBadge for its own scoped feed.
  const modCfg = MODULE_CONFIG[entry.module];
  const badge: ActivityRowBadge = customBadge ?? {
    label: modCfg.label,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  };
  const sourceHref = resolveActivitySource(entry);
  const linkAriaLabel = `${entry.user.name} ${actCfg.verb} ${entry.title}. Open in ${modCfg.label}.`;

  return (
    <li className="list-none">
    <Link
      href={sourceHref}
      aria-label={linkAriaLabel}
      className="group flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-black/[0.06] border border-transparent transition-all cursor-pointer no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
    >
      {/* Avatar — clean. The previous rev had a tiny module-tinted
          action-icon dot in the bottom-right corner; that signal
          duplicated the module chip below and added a second
          colour family per row. Dropped. The avatar's user colour
          is the only colour cue here. */}
      <div className="shrink-0 mt-0.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-caption font-bold"
          style={{ backgroundColor: entry.user.color }}
          title={`${entry.user.name} · ${entry.user.role}`}
        >
          {entry.user.initials}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body text-black/85 leading-snug">
              <span className="font-semibold">{entry.user.name.split(' ')[0]} {entry.user.name.split(' ').slice(1).map(p => p[0] + '.').join('')}</span>
              {/* Client tag — kept amber. This is the single
                  semantic colour exception on the row: it flags
                  that the actor is an external customer contact,
                  not an internal Brego teammate, which is a
                  critical attribution signal. Everything else in
                  the row chrome is now neutral so this stands out
                  by design. */}
              {entry.user.role === 'Client' && (
                <span className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-px rounded text-caption font-semibold bg-amber-50 text-amber-700 align-baseline">
                  Client
                </span>
              )}
              <span className="text-black/55"> {actCfg.verb} </span>
              <span className="font-medium">{entry.title}</span>
            </p>

            {/* Diff chip — keeps its semantic tones (Pending / WIP /
                Done / Overdue / N/A). These are status colours that
                match the rest of the build's vocabulary, not module
                accents, so the colour carries actual meaning. */}
            {entry.diff && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <DiffPill value={entry.diff.before} kind="before" />
                <ArrowRight className="w-3 h-3 text-black/35" aria-hidden="true" />
                <DiffPill value={entry.diff.after} kind="after" />
              </div>
            )}

            {entry.detail && (
              <p className="text-caption text-black/55 mt-1 leading-relaxed">{entry.detail}</p>
            )}

            {/* Module + client chips — both in matching slate
                neutral so the meta strip reads as one cohesive
                line of context. */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-semibold ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
              {entry.client && (
                <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-caption font-medium text-slate-600">
                  <Building2 className="w-3 h-3" aria-hidden="true" />
                  {entry.client}
                </span>
              )}
            </div>
          </div>

          {/* Trailing column — relative time only. The previous
              rev stacked relative time + Clock icon + exact time
              + a hover "Open" chevron. The Clock subline duplicated
              the time signal already above; the Open affordance
              was redundant since the row is already a Link with
              hover state, cursor, and focus ring. Both retired —
              the resting row is now quiet, the hover state is
              the entire row brightening. */}
          <span className="text-caption text-black/55 tabular-nums shrink-0">
            {relativeTime(entry.timestamp)}
          </span>
        </div>
      </div>
    </Link>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIFF PILL
// ─────────────────────────────────────────────────────────────────────────────

/** Tone for a diff pill — coloured by the value's semantic. The same
 *  status vocabulary (Done / Pending / WIP / Overdue / N/A) renders in
 *  the same hue as the rest of the app, so an admin reading the
 *  activity feed sees colour parity with the modules they came from. */
function diffTone(value: string, kind: 'before' | 'after'): { bg: string; text: string; ring: string } {
  const v = value.toLowerCase();
  if (kind === 'after') {
    if (v === 'done' || v === 'completed' || v === 'live')  return { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' };
    if (v === 'wip' || v === 'in progress')                 return { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200'    };
    if (v === 'pending' || v === 'pending from client')     return { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'   };
    if (v === 'n/a' || v === 'na')                          return { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-200'   };
    if (v === 'overdue')                                    return { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200'    };
    // Generic "moved forward" → brand-blue tint.
    return { bg: 'bg-[#EEF1FB]', text: 'text-[#204CC7]', ring: 'ring-[#204CC7]/20' };
  }
  // "before" pill — intentionally muted so the eye lands on the
  // "after" value first.
  return { bg: 'bg-black/[0.04]', text: 'text-black/55', ring: 'ring-black/[0.05]' };
}

export function DiffPill({ value, kind }: { value: string; kind: 'before' | 'after' }) {
  const t = diffTone(value, kind);
  // text-caption (13px) clears the project's typography floor; the
  // pill tones already pass WCAG 1.4.3 in their existing
  // bg/text Tailwind pairings.
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-semibold tabular-nums whitespace-nowrap ring-1 ${t.bg} ${t.text} ${t.ring}`}>
      {value}
    </span>
  );
}
