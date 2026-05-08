'use client';

/**
 * Notifications drawer — global alert centre.
 *
 * Audit-driven scope. The drawer surfaces notifications from the
 * exact same surfaces the platform actually has:
 *   • Inbox            — channel mentions / client replies
 *   • Workspace        — task assignments, status flips, client-portal
 *                        task activity (the client-side tasks raised
 *                        through the portal land here too — same
 *                        actor model the master Activity feed uses)
 *   • Dataroom         — file shares, folder moves
 *   • Customers DB     — new customer added (lifecycle event)
 *   • Employees DB     — new employee added (lifecycle event)
 *   • Onboarding       — pipeline progress (kickoff, item complete)
 *   • A&T Compliance   — Recurring Checklist + the 5 holistic
 *                        per-domain views (TDS / GST / PTRC / IT /
 *                        E-Com Reco) — status flips, due-soon,
 *                        client-data uploads
 *
 * Why a drawer, not a page:
 *   Notifications are interrupt-driven, not destination-driven. An
 *   admin scans them mid-task, takes one action, and gets back to
 *   what they were doing. A drawer keeps the underlying page in
 *   peripheral vision; a separate /notifications page would force
 *   navigation away.
 *
 * Why simple, not a feed:
 *   The Activity log at /activity is the comprehensive feed. The
 *   notifications drawer is a focused "what needs my attention"
 *   surface — addressed to me, action-oriented, read-state-aware.
 *   We don't duplicate the full activity log here.
 *
 * Read state, sync, and persistence:
 *   For now read state lives in component state; a real backend
 *   wiring would persist via the user's notification store and
 *   sync admin + client-facing platforms via webhooks. The shape
 *   below is designed to map 1:1 to such a store — every
 *   `Notification` is a row, every category a known dimension.
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, MessageSquare, Layers, FolderOpen, Building2, UserPlus,
  ClipboardList, Sparkles, Check, Bell,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
export type NotificationCategory =
  | 'inbox'
  | 'workspace'
  | 'dataroom'
  | 'customer-joined'
  | 'employee-joined'
  | 'onboarding'
  | 'checklist';

export interface Notification {
  id: string;
  category: NotificationCategory;
  /** First word(s) of the prose — typically the actor's name (when
   *  there is one). Rendered semibold so the eye latches onto who
   *  did what. Lifecycle events without a clear human actor (e.g.
   *  customer joined) leave this null. */
  actor?: string;
  /** Headline — the verb phrase (e.g. "replied in #at-sahara") or
   *  the lifecycle event ("Pioneer Realty onboarded"). */
  title: string;
  /** Optional sub-line — a short context snippet (the message
   *  preview, the diff before/after, the affected client). */
  detail?: string;
  /** ISO timestamp. Drives the date-group bucket + relative-time. */
  timestamp: string;
  /** Optional due date — when set, the row reads as an upcoming
   *  reminder (Recurring Checklist filings approaching, workspace
   *  tasks with a deadline) rather than a past event. The meta
   *  line replaces the "5m ago" relative time with "Due tomorrow"
   *  / "Due in 3 days", and an imminent due (≤ 2 days) tints the
   *  meta line amber so the urgency reads at a glance. */
  dueDate?: string;
  /** Has the admin opened this notification yet? Drives the unread
   *  dot + bold styling; flips to true on row click. */
  read: boolean;
  /** Where the notification deep-links to. Mirrors the platform's
   *  canonical routes; see /lib/super-admin-home-routes for the
   *  /home pattern. */
  href: string;
}

interface CategoryConfig {
  label: string;
  icon: typeof MessageSquare;
}

// Single unified palette for all category icons. The previous rev
// tinted each category in its own brand colour (fuchsia / emerald
// / blue / etc.) which created seven competing accent colours on
// the same scrolling list — visually noisy. The icon glyph alone
// disambiguates category (MessageSquare = Inbox, Layers =
// Workspace, FolderOpen = Dataroom, etc.) and the meta line
// surfaces the category label as text, so the tinted chip + tinted
// box was duplicate signal. Now: one slate icon box, one icon
// colour, calmer scan.
const CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  'inbox':           { label: 'Inbox',          icon: MessageSquare },
  'workspace':       { label: 'Workspace',      icon: Layers        },
  'dataroom':        { label: 'Dataroom',       icon: FolderOpen    },
  'customer-joined': { label: 'Customers',      icon: Building2     },
  'employee-joined': { label: 'Employees',      icon: UserPlus      },
  'onboarding':      { label: 'Onboarding',     icon: Sparkles      },
  'checklist':       { label: 'A&T Compliance', icon: ClipboardList },
};

// ─── Mock data ────────────────────────────────────────────────────────
// Anchored to the same May 2026 timeline the rest of the platform
// uses. Realistic actors + clients pulled from the Onboarding
// module, Customers database, and the master Activity feed —
// preserves cross-surface cohesion (the same Pioneer Realty event
// that shows in /activity also pings as a notification here).
const MOCK_NOTIFICATIONS: Notification[] = [
  // ── Upcoming due-dates ─────────────────────────────────────────
  // Reminders raised by the platform itself (not by a teammate),
  // so they have no `actor` — the title carries the headline. Both
  // the Recurring Checklist (A&T compliance filings) and Workspace
  // (task assignments with deadlines) feed these. Mixed into the
  // same Today bucket as activity events so an admin sees what's
  // coming up alongside what just happened.
  // Recurring Checklist:
  { id: 'd01', category: 'checklist', title: 'GSTR-3B return due tomorrow',                 detail: 'Patel Constructions · owner Sneha P.',                  timestamp: '2026-05-05T09:00:00', dueDate: '2026-05-06T18:00:00', read: false, href: '/home?tab=accounts-taxation&sub=gst' },
  { id: 'd02', category: 'checklist', title: 'TDS challan upload due in 2 days',            detail: 'Atlas Capital · owner Anil K.',                          timestamp: '2026-05-05T09:00:00', dueDate: '2026-05-07T18:00:00', read: false, href: '/home?tab=accounts-taxation&sub=tds' },
  { id: 'd03', category: 'checklist', title: 'PTRC monthly return due in 4 days',           detail: 'Konark Foods · owner Riya S.',                           timestamp: '2026-05-05T09:00:00', dueDate: '2026-05-09T18:00:00', read: true,  href: '/home?tab=accounts-taxation&sub=ptrc-ptec' },
  // Workspace:
  { id: 'd04', category: 'workspace', title: 'GST advisory call prep due tomorrow',         detail: 'Sahara Constructions · assigned to you by Zubear S.',    timestamp: '2026-05-05T10:30:00', dueDate: '2026-05-06T17:00:00', read: false, href: '/workspace/task-management' },
  { id: 'd05', category: 'workspace', title: 'Q2 OKR planning session prep due in 3 days',  detail: 'Brego Group · assigned to Tejas A.',                    timestamp: '2026-05-05T10:30:00', dueDate: '2026-05-08T17:00:00', read: true,  href: '/workspace/task-management' },

  // ── Today (2026-05-05) ──
  { id: 'n01', category: 'workspace',       actor: 'Zubear Shaikh',  title: 'assigned you a task',                        detail: 'GSTR-2A reconciliation — Atlas Capital',                           timestamp: '2026-05-05T17:10:00', read: false, href: '/workspace/task-management' },
  { id: 'n02', category: 'inbox',           actor: 'Karthik Iyer',   title: 'replied in #sahara-constructions',           detail: '"Need GST advisory call on input credit reversal — can we set up a 30 min slot this week?"', timestamp: '2026-05-05T16:55:00', read: false, href: '/inbox' },
  { id: 'n03', category: 'checklist',       actor: 'Sneha P.',       title: 'completed GSTR-3B return',                   detail: 'Patel Constructions · status flipped to Done',                     timestamp: '2026-05-05T16:42:00', read: false, href: '/home?tab=accounts-taxation&sub=gst' },
  { id: 'n04', category: 'customer-joined', actor: 'Tejas Atha',     title: 'added Pioneer Realty as a new customer',     detail: 'New A&T client — onboarding pipeline started',                     timestamp: '2026-05-05T17:30:00', read: false, href: '/home?tab=customers&sub=all-customers' },
  { id: 'n05', category: 'employee-joined', actor: 'Mihir L.',       title: 'added Aarav Joshi as Executive',             detail: 'A&T · Mumbai HQ · Reporting to Zubear Shaikh',                     timestamp: '2026-05-05T11:00:00', read: true,  href: '/home?tab=employees&sub=all-employees' },
  { id: 'n06', category: 'onboarding',      actor: 'Zubear Shaikh',  title: 'Green Energy Industries — Data Sharing',     detail: '4 / 14 → 6 / 14 items received',                                   timestamp: '2026-05-05T15:55:00', read: true,  href: '/home?tab=customers&sub=onboarding' },
  { id: 'n07', category: 'onboarding',      actor: 'Harshal R.',     title: 'Knickgasm — kickoff held',                   detail: 'MoMs shared with client. All 5 setup items already in place.',     timestamp: '2026-05-05T11:20:00', read: true,  href: '/home?tab=customers&sub=onboarding' },

  // ── Yesterday (2026-05-04) ──
  { id: 'n08', category: 'workspace',       actor: 'Suresh Joshi',   title: 'marked invoice approval as Completed',       detail: 'May invoice IND-2026-114 · Marathon Industries (client portal)',   timestamp: '2026-05-04T15:40:00', read: false, href: '/workspace/task-management' },
  { id: 'n09', category: 'checklist',       actor: 'Mihir L.',       title: 'RetailMax — Log IDs progressed',             detail: '4 / 13 → 7 / 13 portals received',                                 timestamp: '2026-05-04T15:10:00', read: true,  href: '/home?tab=accounts-taxation&sub=deliverables' },
  { id: 'n10', category: 'employee-joined', actor: 'Mihir L.',       title: 'added Pooja Verma as Executive',             detail: 'A&T · Remote · Reporting to Irshad Qureshi',                       timestamp: '2026-05-04T10:15:00', read: true,  href: '/home?tab=employees&sub=all-employees' },
  { id: 'n11', category: 'dataroom',        actor: 'Rohan D.',       title: 'moved 12 folders to Live clients workspace', detail: 'Yash Industries — Onboarding → Live clients',                      timestamp: '2026-05-04T10:50:00', read: true,  href: '/dataroom' },

  // ── Earlier this week ──
  { id: 'n12', category: 'inbox',           actor: 'Tejas Atha',     title: 'mentioned you in #at-leadership',            detail: '"Q2 OKR planning — need your input on the SEM cross-sell targets"', timestamp: '2026-05-03T15:25:00', read: true,  href: '/inbox' },
  { id: 'n13', category: 'checklist',       actor: 'Anil Kumar',     title: 'TDS quarterly — Sahara Constructions reassigned', detail: 'Sneha P. → Anil K. by Irshad Qureshi',                          timestamp: '2026-05-03T09:30:00', read: true,  href: '/home?tab=accounts-taxation&sub=tds' },
  { id: 'n14', category: 'dataroom',        actor: 'Mihir L.',       title: 'shared "Atlas Capital · FY26 Annual"',       detail: 'Read-only access · valid until end of FY26',                       timestamp: '2026-05-02T16:20:00', read: true,  href: '/dataroom' },
];

// ─── Helpers ──────────────────────────────────────────────────────────
const NOW_REF = new Date('2026-05-05T18:00:00');

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((NOW_REF.getTime() - d.getTime()) / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Renders an upcoming-due-date reminder as natural prose:
 *  "Due today" / "Due tomorrow" / "Due in N days". The `urgent`
 *  flag flips on at ≤ 2 days so the row's meta line can tint
 *  amber for "needs attention this week" entries. */
function dueLabel(iso: string): { text: string; urgent: boolean } {
  const d = new Date(iso);
  const today = new Date(NOW_REF.getFullYear(), NOW_REF.getMonth(), NOW_REF.getDate());
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0)  return { text: 'Due today',     urgent: true  };
  if (days === 1) return { text: 'Due tomorrow',  urgent: true  };
  if (days <= 2)  return { text: `Due in ${days} days`, urgent: true  };
  return                  { text: `Due in ${days} days`, urgent: false };
}

function getDateBucket(iso: string): 'today' | 'yesterday' | 'earlier' {
  const d = new Date(iso);
  const today = new Date(NOW_REF.getFullYear(), NOW_REF.getMonth(), NOW_REF.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return 'earlier';
}

const BUCKET_LABEL: Record<'today' | 'yesterday' | 'earlier', string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

// ─── Component ────────────────────────────────────────────────────────
export function NotificationsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

  // Filter + sort. Newest first; bucket-grouped on render.
  const visible = useMemo(() => {
    const src = tab === 'unread' ? items.filter(n => !n.read) : items;
    return [...src].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [items, tab]);

  const grouped = useMemo(() => {
    const buckets: Record<'today' | 'yesterday' | 'earlier', Notification[]> = {
      today: [], yesterday: [], earlier: [],
    };
    for (const n of visible) buckets[getDateBucket(n.timestamp)].push(n);
    return buckets;
  }, [visible]);

  const markAllRead = () => setItems(prev => prev.map(n => ({ ...n, read: true })));

  const handleRowClick = (n: Notification) => {
    // Mark read first so the unread dot disappears before the
    // navigation lands; closing the drawer right after keeps the
    // admin focused on the destination.
    setItems(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
    onClose();
    router.push(n.href);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop — clicks dismiss the drawer. Focus is allowed to
          remain trapped inside the drawer via the close button +
          escape handler on the trigger button (in navigation.tsx). */}
      <div
        className="fixed inset-0 bg-black/30 z-[9998] animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — 480px right rail. Slightly wider than the
          earlier 420px so longer detail snippets (mention quotes,
          file names, multi-clause status changes) don't truncate
          mid-thought on the second line. Header / tabs are
          sticky-pinned at the top so scrolling the list doesn't
          lose context. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="fixed top-0 right-0 bottom-0 w-[480px] max-w-[95vw] bg-white z-[9999] shadow-2xl flex flex-col animate-[slideInRight_200ms_ease-out]"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-black/[0.06]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-h2 font-bold text-black/90">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#204CC7] text-white text-caption font-bold tabular-nums">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-caption font-medium text-[#204CC7] hover:bg-[#204CC7]/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close notifications"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:bg-black/[0.04] hover:text-black/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Tabs — All vs Unread. Two tabs is the right floor: it's
              the binary cut admins reach for first. Per-category
              filtering would be an additive enhancement; today the
              category chip on each row is enough scanning aid. */}
          <div className="flex items-center gap-1 mt-3" role="tablist" aria-label="Notification view">
            {(['all', 'unread'] as const).map(t => {
              const isActive = tab === t;
              const count = t === 'all' ? items.length : unreadCount;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                    isActive
                      ? 'bg-[#204CC7]/[0.08] text-[#204CC7]'
                      : 'text-black/60 hover:bg-black/[0.03] hover:text-black/80'
                  }`}
                >
                  {t === 'all' ? 'All' : 'Unread'}
                  <span className={`text-caption tabular-nums ${isActive ? 'text-[#204CC7]/80' : 'text-black/40'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List — scrollable. Date-bucket headers (Today /
            Yesterday / Earlier) only render when their bucket has
            content, so an empty bucket doesn't leave a hanging
            label. */}
        <div className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-black/[0.04] mx-auto flex items-center justify-center mb-3">
                <Bell className="w-5 h-5 text-black/35" aria-hidden="true" />
              </div>
              <p className="text-body font-medium text-black/70">
                {tab === 'unread' ? "You're all caught up" : 'No notifications yet'}
              </p>
              <p className="text-caption text-black/55 mt-1">
                {tab === 'unread' ? 'Nothing new since you last checked.' : 'New activity will appear here.'}
              </p>
            </div>
          ) : (
            (['today', 'yesterday', 'earlier'] as const).map(bucket => {
              const list = grouped[bucket];
              if (list.length === 0) return null;
              return (
                <section key={bucket} aria-label={`${BUCKET_LABEL[bucket]} notifications`}>
                  <div className="px-5 pt-4 pb-1.5 sticky top-0 bg-white z-[1]">
                    <p className="text-caption font-semibold text-black/45 uppercase tracking-wider">
                      {BUCKET_LABEL[bucket]}
                    </p>
                  </div>
                  <ul role="list" className="px-2">
                    {list.map(n => (
                      <NotificationRow key={n.id} notification={n} onClick={() => handleRowClick(n)} />
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        {/* Footer "View all activity" CTA retired. The Activity
            page is reachable from its own dedicated nav button on
            the navbar (the timeline icon next to the bell), so a
            second entry point at the bottom of this drawer was
            redundant and stretched the drawer's job beyond
            "notifications". */}
      </aside>

      {/* Animation keyframes — local to keep the drawer self-contained. */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────
function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const cfg = CATEGORY_CONFIG[notification.category];
  const Icon = cfg.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${notification.actor ?? ''} ${notification.title}. Category: ${cfg.label}. ${notification.read ? 'Read' : 'Unread'}. Open source.`}
        className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
          notification.read
            ? 'hover:bg-black/[0.02]'
            : 'bg-[#204CC7]/[0.025] hover:bg-[#204CC7]/[0.05]'
        }`}
      >
        {/* Category icon — single neutral slate treatment across
            all 7 categories so the icon column reads as a uniform
            spine. The icon glyph alone (MessageSquare / Layers /
            FolderOpen / etc.) tells the admin which surface the
            notification came from; the previous coloured-tile rev
            had seven competing accents on the same scrolling
            list, which we've cleaned up. */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 bg-slate-100">
          <Icon className="w-4 h-4 text-slate-600" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Headline prose — actor (semibold) + verb phrase (regular).
              Lifecycle events without a clear actor render the title
              by itself in semibold so the row still has anchor weight. */}
          <p className="text-body text-black/85 leading-snug">
            {notification.actor ? (
              <>
                <span className="font-semibold">{notification.actor}</span>
                <span className="text-black/65"> {notification.title}</span>
              </>
            ) : (
              <span className="font-semibold">{notification.title}</span>
            )}
          </p>

          {notification.detail && (
            <p className="text-caption text-black/60 leading-relaxed mt-1 line-clamp-2">
              {notification.detail}
            </p>
          )}

          {/* Meta line — category label paired with either a
              relative-time read ("5m ago") for past events or a
              due-date read ("Due tomorrow") for upcoming reminders.
              Imminent dues (≤ 2 days) tint the line amber so the
              urgency signal lands without an extra chip. */}
          {(() => {
            if (notification.dueDate) {
              const { text, urgent } = dueLabel(notification.dueDate);
              return (
                <p className={`text-caption tabular-nums mt-1.5 ${urgent ? 'text-amber-700 font-medium' : 'text-black/55'}`}>
                  {cfg.label} · {text}
                </p>
              );
            }
            return (
              <p className="text-caption text-black/55 tabular-nums mt-1.5">
                {cfg.label} · {relativeTime(notification.timestamp)}
              </p>
            );
          })()}
        </div>

        {/* Unread dot — a small brand-blue dot in the top-right
            slot. Quiet on read rows (entire dot removed) so the
            visual delta between read/unread is unambiguous. */}
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-[#204CC7] mt-2.5 flex-shrink-0" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

// ─── Unread-count export for the navbar bell badge ────────────────────
// The navbar imports this so the bell shows the same number the
// drawer header does. If a real backend wires up a notifications
// store, swap the constant export for a hook that reads from it.
export const initialUnreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
