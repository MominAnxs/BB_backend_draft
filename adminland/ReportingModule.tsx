'use client';
import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, BarChart3, X, ChevronDown, ChevronUp, Target, FileText, ChevronLeft, ChevronsLeft, ChevronsRight, Layers, Settings, Check, ArrowRightLeft, Clock, ArrowUpDown, Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Trash2, RefreshCw, CalendarClock, User as UserIcon } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';
import { MonthNavigator } from '@/workspace/shared/MonthNavigator';
import { ReportDetail } from './ReportDetail';
import { ClientDashboard } from './ClientDashboard';
import { PMClientDashboard } from './PMClientDashboard';

// ── Team directory ──
// Maps each initial used in the mock client teams to its full name and
// role. Powers the on-hover roster popover in the Team column so users
// can see *who* is on the account, not just initials. Mirrors the
// Recurring Checklist's TEAM_POOL 1:1 — same 12-person A&T roster,
// same 5-tier role hierarchy, same name + role copy — so the dashboard
// Team column reads identically to the per-business checklist.
type TeamRole = 'HOD' | 'POD Head' | 'Manager' | 'Assistant Manager' | 'Executive';
const TEAM_DIRECTORY: Record<string, { name: string; role: TeamRole }> = {
  // SEM HODs (legacy — kept so the PM tables don't lose names).
  TA: { name: 'Tejas Atha',        role: 'HOD'                },
  CP: { name: 'Chinmay Pawar',     role: 'HOD'                },
  // A&T pool — same 12 members the Recurring Checklist draws from.
  ZS: { name: 'Zubear Shaikh',     role: 'HOD'                },
  IQ: { name: 'Irshad Qureshi',    role: 'HOD'                },
  RD: { name: 'Rohan Desai',       role: 'POD Head'           },
  NA: { name: 'Nisha Agarwal',     role: 'Manager'            },
  AK: { name: 'Anil Kumar',        role: 'Manager'            },
  SP: { name: 'Sneha Patel',       role: 'Assistant Manager'  },
  RS: { name: 'Riya Sharma',       role: 'Assistant Manager'  },
  DJ: { name: 'Deepak Jain',       role: 'Executive'          },
  VS: { name: 'Vikram Singh',      role: 'Executive'          },
  RG: { name: 'Rahul Gupta',       role: 'Executive'          },
  PJ: { name: 'Priya Joshi',       role: 'Executive'          },
  AV: { name: 'Amit Verma',        role: 'Executive'          },
  // SEM operational tier (legacy).
  ML: { name: 'Mihir L.',          role: 'Manager'            },
  HR: { name: 'Harshal R.',        role: 'Manager'            },
};

const ROLE_ORDER: Record<TeamRole, number> = {
  'HOD': 0, 'POD Head': 1, 'Manager': 2, 'Assistant Manager': 3, 'Executive': 4,
};

// Hash-based avatar palette — same algorithm and palette the Recurring
// Checklist's Avatar component uses, so the same initials always render
// the same color across both surfaces. Lets the Team column ignore any
// hard-coded `color` field on the team data and stay deterministic.
const AVATAR_PALETTE = ['#204CC7', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#E2445C', '#3B82F6', '#EC4899'];
const colorForInitials = (initials: string): string => {
  const sum = initials.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
};

/**
 * Team column cell — visually identical to the Deliverables table.
 * Shows up to 3 stacked avatars + a `+N` badge when the roster is larger;
 * on hover/focus opens a portal popover with the full roster, sorted by
 * role (HOD → Manager → Executive) and tagged with role pills.
 */
function TeamPopover({ team }: { team: { initials: string; color: string }[] }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const sorted = useMemo(() => {
    return [...team].sort((a, b) => {
      const ra = TEAM_DIRECTORY[a.initials]?.role ?? 'Executive';
      const rb = TEAM_DIRECTORY[b.initials]?.role ?? 'Executive';
      return ROLE_ORDER[ra] - ROLE_ORDER[rb];
    });
  }, [team]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 140);
  }, [cancelClose]);

  const openPopover = useCallback(() => {
    cancelClose();
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
  }, [cancelClose]);

  // Dismiss on Escape / scroll / resize — repositioning while a table
  // scrolls under the popover is more disruptive than just closing.
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

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Auto-flip above when space below is tight; clamp horizontally so the
  // popover never spills off-screen.
  const POPOVER_WIDTH = 240;
  const POPOVER_EST_HEIGHT = 40 + team.length * 36;
  const popoverStyle = rect ? (() => {
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < POPOVER_EST_HEIGHT + 16 && rect.top > POPOVER_EST_HEIGHT + 16;
    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - 8) left = window.innerWidth - POPOVER_WIDTH - 8;
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
          if (open) setOpen(false); else openPopover();
        }}
      >
        {team.slice(0, 3).map((m, i) => (
          // Avatar — same dimensions, ring, and box-content treatment as
          // the Avatar component used by the Recurring Checklist Team
          // column. text-[11px] matches its sm-size baseline so the
          // initials sit at exactly the same weight + position. Color
          // is derived from initials via the shared hash-palette so a
          // given person always renders the same color across surfaces.
          <span
            key={`${m.initials}-${i}`}
            className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-white flex-shrink-0 box-content"
            style={{ backgroundColor: colorForInitials(m.initials), zIndex: 3 - i }}
            aria-hidden="true"
          >
            {m.initials}
          </span>
        ))}
        {team.length > 3 && (
          // +N badge — solid zinc fill (not a faded tint) so it feels
          // like a deliberate "more" pill rather than a hole in the
          // stack. Same ring + box-content + font-weight as the avatars
          // so it lands on the same baseline.
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
            {sorted.map((m) => {
              const dir = TEAM_DIRECTORY[m.initials];
              const role = dir?.role ?? 'Executive';
              return (
                <li key={m.initials} className="flex items-center gap-2.5 px-4 py-1.5">
                  <span
                    className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ backgroundColor: colorForInitials(m.initials) }}
                    aria-hidden="true"
                  >
                    {m.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-caption font-medium text-black/80 truncate">
                      {dir?.name ?? m.initials}
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    // Color graded by seniority — brand blue at the top,
                    // cooling toward emerald at the executive tier. Same
                    // palette as the Recurring Checklist Team column.
                    role === 'HOD'                 ? 'bg-[#EEF1FB] text-[#204CC7]'
                    : role === 'POD Head'          ? 'bg-violet-50 text-violet-700'
                    : role === 'Manager'           ? 'bg-cyan-50 text-cyan-700'
                    : role === 'Assistant Manager' ? 'bg-amber-50 text-amber-700'
                    :                                'bg-emerald-50 text-emerald-700'
                  }`}>
                    {role}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Role mock — toggle to simulate different roles ──
// Roles: admin (full platform access), hod (department head), manager (team lead),
// executive (day-to-day ops)
type UserRole = 'admin' | 'hod' | 'manager' | 'executive';
const CURRENT_USER_ROLE: UserRole = 'manager';

// Target editing: Admin, HOD, Manager only — Executives are locked out
const TARGET_EDIT_ROLES: UserRole[] = ['admin', 'hod', 'manager'];
const CAN_EDIT_TARGETS = TARGET_EDIT_ROLES.includes(CURRENT_USER_ROLE);

// ── Business Type Taxonomy ──

type PMBusinessType = 'ecommerce' | 'leadGeneration';
type ATBusinessType = 'tradingManufacturing' | 'ecommerceRestaurants';
type BusinessType = PMBusinessType | ATBusinessType;
type ServiceType = 'performanceMarketing' | 'accountsTaxation';

const PM_BUSINESS_TYPES: { value: PMBusinessType; label: string; short: string }[] = [
  { value: 'ecommerce', label: 'E-Commerce', short: 'E-Com' },
  { value: 'leadGeneration', label: 'Lead Generation', short: 'Lead Gen' },
];

const AT_BUSINESS_TYPES: { value: ATBusinessType; label: string; short: string }[] = [
  { value: 'tradingManufacturing', label: 'Trading, Manufacturing or Service', short: 'Trading' },
  { value: 'ecommerceRestaurants', label: 'E-Commerce or Restaurants', short: 'E-Com / Rest.' },
];

function getBusinessTypeLabel(bt: BusinessType): string {
  return [...PM_BUSINESS_TYPES, ...AT_BUSINESS_TYPES].find((b) => b.value === bt)?.label ?? bt;
}
function getBusinessTypeShort(bt: BusinessType): string {
  return [...PM_BUSINESS_TYPES, ...AT_BUSINESS_TYPES].find((b) => b.value === bt)?.short ?? bt;
}

// ── Interfaces ──

interface ECommerceMetrics {
  adSpend: { value: number; change: number; target: number };
  roas: { value: number; change: number; target: number };
  revenue: { value: number; change: number; target: number };
  orders: { value: number; change: number; target: number };
  aov: { value: number; change: number; target: number };
}

interface LeadGenMetrics {
  adSpend: { value: number; change: number; target: number };
  leads: { value: number; change: number; target: number };
  cpl: { value: number; change: number; target: number };
  ctr: { value: number; change: number; target: number };
}

// Platform-level breakdown for expandable rows
type PlatformName = 'Meta Ads' | 'Google Ads';

interface PlatformBreakdown<T> {
  platform: PlatformName;
  metrics: T;
}

interface PMReportBase {
  lastUpdated: string;
  period: string;
  targetAchievement: {
    spends: { achieved: number; target: number; variance: number };
    revenue: { achieved: number; target: number; variance: number };
  };
  status: 'excellent' | 'good' | 'needs-attention';
}

interface ECommercePMReport extends PMReportBase {
  reportType: 'ecommerce';
  metrics: ECommerceMetrics;
  platformBreakdown?: PlatformBreakdown<ECommerceMetrics>[];
}

interface LeadGenPMReport extends PMReportBase {
  reportType: 'leadGeneration';
  metrics: LeadGenMetrics;
  platformBreakdown?: PlatformBreakdown<LeadGenMetrics>[];
}

type PerformanceMarketingReport = ECommercePMReport | LeadGenPMReport;

interface AccountsTaxationReport {
  businessType: ATBusinessType;
  /** Business name when the client owns multiple legal entities (e.g.
   *  "Patel Constructions" under client "Patel Group"). Optional —
   *  single-business clients leave this undefined and the table falls
   *  back to the client name. Mirrors the (client, business) hierarchy
   *  on the A&T Deliverables page so the two surfaces stay consistent. */
  businessName?: string;
  lastUpdated: string;
  period: string;
  metrics: {
    revenue: { value: number; change: number };
    expenses: { value: number; change: number };
    bankBalance: { value: number; change: number };
    debtors: { value: number; change: number };
    creditors: { value: number; change: number };
  };
  whatChanged: Array<{ category: string; description: string; value: string; trend: 'up' | 'down' | 'neutral' }>;
  risks: Array<{ severity: 'high' | 'medium' | 'low'; title: string; description: string }>;
  actions: Array<{ priority: 'high' | 'medium' | 'low'; title: string; description: string }>;
  status: 'excellent' | 'good' | 'needs-attention';
}

// ── Financial Upload Types ──

type FinancialFileType = 'sales' | 'expenses' | 'receivables' | 'payables' | 'pnl' | 'balanceSheet' | 'cashFlow' | 'ratios';

interface FinancialFileConfig {
  key: FinancialFileType;
  label: string;
  description: string;
  materialIcon: string;
}

const FINANCIAL_FILE_TYPES: FinancialFileConfig[] = [
  { key: 'sales', label: 'Sales', description: 'Monthly sales data & revenue breakdown', materialIcon: 'bar_chart' },
  { key: 'expenses', label: 'Expenses', description: 'Operating & non-operating expenses', materialIcon: 'receipt_long' },
  { key: 'receivables', label: 'Receivables', description: 'Accounts receivable & ageing report', materialIcon: 'move_to_inbox' },
  { key: 'payables', label: 'Payables', description: 'Accounts payable & vendor dues', materialIcon: 'outgoing_mail' },
  { key: 'pnl', label: 'Profit & Loss', description: 'Income statement for the period', materialIcon: 'trending_up' },
  { key: 'balanceSheet', label: 'Balance Sheet', description: 'Assets, liabilities & equity snapshot', materialIcon: 'balance' },
  { key: 'cashFlow', label: 'Cash Flow', description: 'Cash inflows & outflows statement', materialIcon: 'water_drop' },
  { key: 'ratios', label: 'Ratios', description: 'Key financial ratios & analysis', materialIcon: 'percent' },
];

/**
 * One historical (or current) version of a single financial file.
 * Each upload, replace, or restore action produces a new version with
 * its own `uploadedBy` / `uploadedAt`, so the audit trail is preserved
 * even if the team uploads the same file twice by mistake.
 */
interface UploadVersion {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;        // ISO so we can sort/relative-format
  uploadedAtLabel: string;   // pre-formatted for display
  uploadedBy: string;
  source: 'local' | 'dataroom';
  dataroomPath?: string;
}

/**
 * One slot in the upload store keyed by (client, report, file-type, month).
 * `current` is the latest live version (what the client dashboard reads).
 * `history` is older versions, newest-first, used for the version log
 * and "Restore" affordance in the drawer.
 */
interface UploadedFile {
  current: UploadVersion;
  history: UploadVersion[];
}

// Key: `${clientId}-${reportIndex}-${fileType}-${monthKey}` e.g. "1-0-sales-2026-04"
type UploadStore = Record<string, UploadedFile>;

// "Current user" stamp for upload metadata. Replaced by real auth later;
// keeping it as a const so every upload writes the same identity in the
// mock and the audit log reads consistently.
const CURRENT_UPLOADER = 'You';

function getUploadKey(clientId: string, reportIndex: number, fileType: FinancialFileType, monthKey: string): string {
  return `${clientId}-${reportIndex}-${fileType}-${monthKey}`;
}

function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getClientUploadCount(uploads: UploadStore, clientId: string, reportIndex: number, monthKey: string): number {
  return FINANCIAL_FILE_TYPES.filter(ft => uploads[getUploadKey(clientId, reportIndex, ft.key, monthKey)]).length;
}

/**
 * Returns the most recent upload timestamp across all 8 financial files
 * for a given client / report / month. Powers the "Uploaded on …" pill
 * that's especially important for historical months — it tells the user
 * *when* this period's books were last touched.
 */
function getLatestUploadAt(uploads: UploadStore, clientId: string, reportIndex: number, monthKey: string): string | null {
  let latest: string | null = null;
  for (const ft of FINANCIAL_FILE_TYPES) {
    const slot = uploads[getUploadKey(clientId, reportIndex, ft.key, monthKey)];
    if (!slot) continue;
    if (!latest || slot.current.uploadedAt > latest) latest = slot.current.uploadedAt;
  }
  return latest;
}

/**
 * Walks the same 8 slots and returns who contributed: the latest
 * uploader's name (for the prominent "Uploaded by:" tag) plus the
 * count of distinct uploaders so the UI can honestly say "Anas + 2
 * others" when multiple admins shared the load. Returns
 * `{ latest: null, uniqueCount: 0 }` when nothing has been uploaded.
 */
function getUploadContributors(
  uploads: UploadStore,
  clientId: string,
  reportIndex: number,
  monthKey: string,
): { latest: string | null; uniqueCount: number } {
  const uploaders = new Set<string>();
  let latestIso: string | null = null;
  let latestBy: string | null = null;
  for (const ft of FINANCIAL_FILE_TYPES) {
    const slot = uploads[getUploadKey(clientId, reportIndex, ft.key, monthKey)];
    if (!slot) continue;
    uploaders.add(slot.current.uploadedBy);
    if (!latestIso || slot.current.uploadedAt > latestIso) {
      latestIso = slot.current.uploadedAt;
      latestBy = slot.current.uploadedBy;
    }
  }
  return { latest: latestBy, uniqueCount: uploaders.size };
}

/** Pretty-print an ISO timestamp as "5 Apr 2026, 10:31 am" for header chips. */
function formatUploadStamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).replace(' AM', ' am').replace(' PM', ' pm');
}

/** Build a new UploadVersion stamp for a fresh upload event. */
function makeVersion(input: { name: string; size: number; uploadedBy: string; source: 'local' | 'dataroom'; dataroomPath?: string }): UploadVersion {
  const now = new Date();
  return {
    id: `v-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    size: input.size,
    uploadedAt: now.toISOString(),
    uploadedAtLabel: now.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    uploadedBy: input.uploadedBy,
    source: input.source,
    dataroomPath: input.dataroomPath,
  };
}

/** Push a new version onto a slot — old `current` rolls into history. */
function pushVersion(slot: UploadedFile | undefined, next: UploadVersion): UploadedFile {
  if (!slot) return { current: next, history: [] };
  return { current: next, history: [slot.current, ...slot.history] };
}

/** Generate the last N month keys ending at the given anchor (inclusive). */
function getMonthKeysEnding(anchor: Date, count: number): { key: string; label: string; short: string }[] {
  const months: { key: string; label: string; short: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      short: d.toLocaleString('en-IN', { month: 'short' }),
    });
  }
  return months;
}

/** "2h ago", "3d ago", "5w ago" — short relative time for the audit log. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// Array-based: a client can have multiple PM and/or A&T reports
interface ClientReport {
  id: string;
  name: string;
  code: string;
  team: { initials: string; color: string }[];
  pmReports: PerformanceMarketingReport[];
  atReports: AccountsTaxationReport[];
}

// ── Mock Data ──

const mockClients: ClientReport[] = [
  {
    id: '1', name: 'Elan by Aanchal', code: 'PM001', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'SP', color: '#10B981' }, { initials: 'DJ', color: '#F59E0B' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 850000, change: -8, target: 1000000 }, roas: { value: 4.94, change: 12, target: 5.0 }, revenue: { value: 4200000, change: 15, target: 5000000 }, orders: { value: 1248, change: 18, target: 1500 }, aov: { value: 3365, change: -3, target: 3500 } }, targetAchievement: { spends: { achieved: 850000, target: 1000000, variance: -150000 }, revenue: { achieved: 4200000, target: 5000000, variance: -800000 } }, status: 'good' },
      { reportType: 'leadGeneration', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 320000, change: 5, target: 400000 }, leads: { value: 487, change: 12, target: 600 }, cpl: { value: 657, change: -9, target: 700 }, ctr: { value: 2.8, change: 6, target: 3.0 } }, targetAchievement: { spends: { achieved: 320000, target: 400000, variance: -80000 }, revenue: { achieved: 1800000, target: 2500000, variance: -700000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 25, 2026', period: 'Q1 2026', metrics: { revenue: { value: 4850000, change: 12 }, expenses: { value: 3200000, change: -5 }, bankBalance: { value: 2150000, change: 8 }, debtors: { value: 680000, change: 15 }, creditors: { value: 420000, change: -3 } }, whatChanged: [{ category: 'Revenue', description: 'Increased by 12%', value: '₹48.5L', trend: 'up' }, { category: 'Debtors', description: 'Outstanding increased', value: '₹6.8L', trend: 'up' }], risks: [{ severity: 'low', title: 'Rising Debtors', description: 'Outstanding receivables increased by 15%.' }], actions: [{ priority: 'medium', title: 'Collect Receivables', description: 'Follow up on overdue invoices.' }], status: 'excellent' },
    ],
  },
  {
    id: '2', name: 'July Issue', code: 'PM002', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'NA', color: '#EC4899' }, { initials: 'RS', color: '#10B981' }, { initials: 'VS', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 1200000, change: 12, target: 1500000 }, roas: { value: 5.42, change: 9, target: 5.0 }, revenue: { value: 6500000, change: 22, target: 7000000 }, orders: { value: 2145, change: 23, target: 2500 }, aov: { value: 3030, change: -1, target: 3000 } }, targetAchievement: { spends: { achieved: 1200000, target: 1500000, variance: -300000 }, revenue: { achieved: 6500000, target: 7000000, variance: -500000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '3', name: 'Mahesh Interior', code: 'PM003', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'RG', color: '#E2445C' }],
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 23, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 450000, change: 3, target: 600000 }, leads: { value: 634, change: 8, target: 800 }, cpl: { value: 710, change: -5, target: 750 }, ctr: { value: 1.9, change: -3, target: 2.5 } }, targetAchievement: { spends: { achieved: 450000, target: 600000, variance: -150000 }, revenue: { achieved: 2100000, target: 3000000, variance: -900000 } }, status: 'needs-attention' },
    ],
    atReports: [
      { businessType: 'tradingManufacturing', lastUpdated: 'Mar 23, 2026', period: 'Q1 2026', metrics: { revenue: { value: 2100000, change: -8 }, expenses: { value: 2450000, change: 12 }, bankBalance: { value: 380000, change: -22 }, debtors: { value: 920000, change: 25 }, creditors: { value: 750000, change: -3 } }, whatChanged: [{ category: 'Expenses', description: 'Increased by 12%', value: '₹24.5L', trend: 'up' }, { category: 'Bank Balance', description: 'Dropped by 22%', value: '₹3.8L', trend: 'down' }], risks: [{ severity: 'high', title: 'Cash Crunch', description: 'Expenses exceeding revenue, bank balance declining.' }, { severity: 'high', title: 'High Debtors', description: 'Outstanding receivables up 25%.' }], actions: [{ priority: 'high', title: 'Cost Reduction', description: 'Implement cost-saving measures immediately.' }], status: 'needs-attention' },
    ],
  },
  {
    id: '4', name: 'Nor Black Nor White', code: 'PM004', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'PJ', color: '#7C3AED' }, { initials: 'AV', color: '#10B981' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 650000, change: -5, target: 800000 }, roas: { value: 4.92, change: 14, target: 5.0 }, revenue: { value: 3200000, change: 8, target: 4000000 }, orders: { value: 892, change: 15, target: 1000 }, aov: { value: 3587, change: -6, target: 4000 } }, targetAchievement: { spends: { achieved: 650000, target: 800000, variance: -150000 }, revenue: { achieved: 3200000, target: 4000000, variance: -800000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '5', name: 'Skin Essentials', code: 'PM005', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'NA', color: '#EC4899' }, { initials: 'SP', color: '#10B981' }, { initials: 'DJ', color: '#F59E0B' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 950000, change: 8, target: 1200000 }, roas: { value: 9.37, change: 18, target: 8.0 }, revenue: { value: 8900000, change: 28, target: 10000000 }, orders: { value: 3420, change: 35, target: 4000 }, aov: { value: 2602, change: -5, target: 2500 } }, targetAchievement: { spends: { achieved: 950000, target: 1200000, variance: -250000 }, revenue: { achieved: 8900000, target: 10000000, variance: -1100000 } }, status: 'excellent' },
    ],
    atReports: [],
  },
  {
    id: '6', name: 'True Diamond', code: 'PM006', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'RS', color: '#10B981' }, { initials: 'AV', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 720000, change: 5, target: 900000 }, roas: { value: 8.61, change: 14, target: 8.0 }, revenue: { value: 6200000, change: 20, target: 7500000 }, orders: { value: 2156, change: 18, target: 2800 }, aov: { value: 2875, change: 2, target: 2700 } }, targetAchievement: { spends: { achieved: 720000, target: 900000, variance: -180000 }, revenue: { achieved: 6200000, target: 7500000, variance: -1300000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 24, 2026', period: 'Q1 2026', metrics: { revenue: { value: 3650000, change: 6 }, expenses: { value: 2800000, change: 3 }, bankBalance: { value: 1420000, change: 4 }, debtors: { value: 520000, change: -8 }, creditors: { value: 310000, change: -2 } }, whatChanged: [{ category: 'Revenue', description: 'Grew steadily by 6%', value: '₹36.5L', trend: 'up' }, { category: 'Debtors', description: 'Reduced by 8%', value: '₹5.2L', trend: 'down' }], risks: [{ severity: 'low', title: 'Expense Growth', description: 'Expenses rising, monitor closely.' }], actions: [{ priority: 'medium', title: 'Expense Audit', description: 'Review recurring expenses for savings.' }], status: 'excellent' },
    ],
  },
  {
    id: '7', name: 'Una Homes LLP', code: 'PM007', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'NA', color: '#EC4899' }, { initials: 'VS', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 22, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 380000, change: -3, target: 500000 }, leads: { value: 412, change: 5, target: 600 }, cpl: { value: 922, change: -8, target: 1000 }, ctr: { value: 1.6, change: -2, target: 2.0 } }, targetAchievement: { spends: { achieved: 380000, target: 500000, variance: -120000 }, revenue: { achieved: 1800000, target: 2500000, variance: -700000 } }, status: 'needs-attention' },
    ],
    atReports: [],
  },
  {
    id: '8', name: 'Zenith Textiles', code: 'PM008', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'SP', color: '#10B981' }, { initials: 'RG', color: '#F59E0B' }, { initials: 'PJ', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 540000, change: 10, target: 700000 }, roas: { value: 9.44, change: 7, target: 8.5 }, revenue: { value: 5100000, change: 18, target: 6000000 }, orders: { value: 1560, change: 20, target: 1800 }, aov: { value: 3269, change: -2, target: 3300 } }, targetAchievement: { spends: { achieved: 540000, target: 700000, variance: -160000 }, revenue: { achieved: 5100000, target: 6000000, variance: -900000 } }, status: 'good' },
    ],
    atReports: [
      { businessType: 'tradingManufacturing', lastUpdated: 'Mar 25, 2026', period: 'Q1 2026', metrics: { revenue: { value: 5200000, change: 18 }, expenses: { value: 3900000, change: 5 }, bankBalance: { value: 3100000, change: 15 }, debtors: { value: 450000, change: -12 }, creditors: { value: 280000, change: -6 } }, whatChanged: [{ category: 'Revenue', description: 'Strong growth of 18%', value: '₹52L', trend: 'up' }, { category: 'Debtors', description: 'Reduced by 12%', value: '₹4.5L', trend: 'down' }], risks: [{ severity: 'low', title: 'Stable Operations', description: 'No major risks identified.' }], actions: [{ priority: 'low', title: 'Maintain Standards', description: 'Continue current financial practices.' }], status: 'excellent' },
    ],
  },
  {
    id: '9', name: 'Craft & Bloom', code: 'PM009', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'SP', color: '#10B981' }, { initials: 'DJ', color: '#F59E0B' }],
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 290000, change: -2, target: 350000 }, leads: { value: 378, change: 9, target: 500 }, cpl: { value: 767, change: -6, target: 800 }, ctr: { value: 2.4, change: 4, target: 2.5 } }, targetAchievement: { spends: { achieved: 290000, target: 350000, variance: -60000 }, revenue: { achieved: 1400000, target: 2000000, variance: -600000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '10', name: 'Vistara Foods', code: 'PM010', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'NA', color: '#EC4899' }, { initials: 'RS', color: '#10B981' }, { initials: 'VS', color: '#7C3AED' }],
    pmReports: [],
    atReports: [
      { businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 23, 2026', period: 'Q1 2026', metrics: { revenue: { value: 1800000, change: -12 }, expenses: { value: 2100000, change: 18 }, bankBalance: { value: 240000, change: -35 }, debtors: { value: 1100000, change: 30 }, creditors: { value: 890000, change: 22 } }, whatChanged: [{ category: 'Revenue', description: 'Declined by 12%', value: '₹18L', trend: 'down' }, { category: 'Expenses', description: 'Spiked by 18%', value: '₹21L', trend: 'up' }], risks: [{ severity: 'high', title: 'Negative Cash Flow', description: 'Expenses exceed revenue by ₹3L.' }, { severity: 'high', title: 'High Debtors', description: 'Outstanding receivables spiked 30%.' }], actions: [{ priority: 'high', title: 'Emergency Collection', description: 'Prioritize overdue invoices immediately.' }], status: 'needs-attention' },
    ],
  },
  {
    id: '11', name: 'Prism Wellness', code: 'PM011', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'RG', color: '#E2445C' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 1100000, change: 15, target: 1300000 }, roas: { value: 7.09, change: 9, target: 6.5 }, revenue: { value: 7800000, change: 25, target: 8500000 }, orders: { value: 2890, change: 32, target: 3200 }, aov: { value: 2699, change: -5, target: 2650 } }, targetAchievement: { spends: { achieved: 1100000, target: 1300000, variance: -200000 }, revenue: { achieved: 7800000, target: 8500000, variance: -700000 } }, status: 'excellent' },
    ],
    atReports: [],
  },
  {
    id: '12', name: 'Sahara Group', code: 'PM012', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'PJ', color: '#7C3AED' }, { initials: 'AV', color: '#10B981' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 22, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 480000, change: -6, target: 600000 }, roas: { value: 5.0, change: 10, target: 5.8 }, revenue: { value: 2400000, change: 3, target: 3500000 }, orders: { value: 756, change: 4, target: 1000 }, aov: { value: 3175, change: -1, target: 3500 } }, targetAchievement: { spends: { achieved: 480000, target: 600000, variance: -120000 }, revenue: { achieved: 2400000, target: 3500000, variance: -1100000 } }, status: 'needs-attention' },
    ],
    atReports: [
      { businessName: 'Sahara Textiles', businessType: 'tradingManufacturing', lastUpdated: 'Mar 22, 2026', period: 'Q1 2026', metrics: { revenue: { value: 3400000, change: -3 }, expenses: { value: 3100000, change: 8 }, bankBalance: { value: 620000, change: -18 }, debtors: { value: 780000, change: 20 }, creditors: { value: 540000, change: 15 } }, whatChanged: [{ category: 'Expenses', description: 'Increased by 8%', value: '₹31L', trend: 'up' }, { category: 'Bank Balance', description: 'Declined by 18%', value: '₹6.2L', trend: 'down' }], risks: [{ severity: 'high', title: 'Margin Squeeze', description: 'Expenses approaching revenue levels.' }], actions: [{ priority: 'high', title: 'Cost Restructuring', description: 'Review vendor contracts and overhead.' }], status: 'needs-attention' },
      { businessName: 'Sahara Foods', businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 22, 2026', period: 'Q1 2026', metrics: { revenue: { value: 2150000, change: 14 }, expenses: { value: 1680000, change: 6 }, bankBalance: { value: 980000, change: 22 }, debtors: { value: 410000, change: -8 }, creditors: { value: 290000, change: -4 } }, whatChanged: [{ category: 'Revenue', description: 'Grew 14% on festive demand', value: '₹21.5L', trend: 'up' }, { category: 'Bank Balance', description: 'Up 22% from collections', value: '₹9.8L', trend: 'up' }], risks: [{ severity: 'low', title: 'Inventory Turnover', description: 'Festive stock cycling well.' }], actions: [{ priority: 'medium', title: 'Reorder Top Sellers', description: 'Lock in supplier rates for Q2.' }], status: 'good' },
    ],
  },
  {
    id: '13', name: 'Orbit Digital', code: 'PM013', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'NA', color: '#EC4899' }, { initials: 'SP', color: '#10B981' }, { initials: 'DJ', color: '#F59E0B' }],
    pmReports: [
      { reportType: 'leadGeneration', lastUpdated: 'Mar 25, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 410000, change: 8, target: 500000 }, leads: { value: 523, change: 18, target: 650 }, cpl: { value: 784, change: -11, target: 850 }, ctr: { value: 3.1, change: 8, target: 3.0 } }, targetAchievement: { spends: { achieved: 410000, target: 500000, variance: -90000 }, revenue: { achieved: 2200000, target: 2800000, variance: -600000 } }, status: 'good' },
    ],
    atReports: [],
  },
  {
    id: '14', name: 'Riviera Hospitality', code: 'PM014', team: [{ initials: 'ZS', color: '#E2445C' }, { initials: 'AK', color: '#F59E0B' }, { initials: 'RS', color: '#10B981' }, { initials: 'AV', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 24, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 780000, change: 6, target: 900000 }, roas: { value: 7.18, change: 12, target: 7.0 }, revenue: { value: 5600000, change: 19, target: 6500000 }, orders: { value: 1890, change: 22, target: 2200 }, aov: { value: 2963, change: -2, target: 3000 } }, targetAchievement: { spends: { achieved: 780000, target: 900000, variance: -120000 }, revenue: { achieved: 5600000, target: 6500000, variance: -900000 } }, status: 'excellent' },
    ],
    atReports: [
      { businessName: 'Riviera Hotels', businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 24, 2026', period: 'Q1 2026', metrics: { revenue: { value: 6800000, change: 22 }, expenses: { value: 4500000, change: 2 }, bankBalance: { value: 4200000, change: 20 }, debtors: { value: 320000, change: -15 }, creditors: { value: 180000, change: -10 } }, whatChanged: [{ category: 'Revenue', description: 'Strong growth of 22%', value: '₹68L', trend: 'up' }, { category: 'Bank Balance', description: 'Healthy increase of 20%', value: '₹42L', trend: 'up' }], risks: [{ severity: 'low', title: 'Healthy Finances', description: 'No concerns.' }], actions: [{ priority: 'low', title: 'Continue Monitoring', description: 'Maintain current trajectory.' }], status: 'excellent' },
      { businessName: 'Riviera Restaurants', businessType: 'ecommerceRestaurants', lastUpdated: 'Mar 24, 2026', period: 'Q1 2026', metrics: { revenue: { value: 2400000, change: 9 }, expenses: { value: 1850000, change: 4 }, bankBalance: { value: 760000, change: 11 }, debtors: { value: 180000, change: -6 }, creditors: { value: 220000, change: 3 } }, whatChanged: [{ category: 'Revenue', description: 'Steady 9% lift from city outlets', value: '₹24L', trend: 'up' }], risks: [{ severity: 'low', title: 'Operating Costs', description: 'Holding steady.' }], actions: [{ priority: 'low', title: 'Menu Mix Review', description: 'Push higher-margin items in Q2.' }], status: 'good' },
    ],
  },
  {
    id: '15', name: 'Kala Threads', code: 'PM015', team: [{ initials: 'IQ', color: '#06B6D4' }, { initials: 'RD', color: '#3B82F6' }, { initials: 'NA', color: '#EC4899' }, { initials: 'VS', color: '#7C3AED' }],
    pmReports: [
      { reportType: 'ecommerce', lastUpdated: 'Mar 23, 2026', period: 'Last 30 Days', metrics: { adSpend: { value: 620000, change: 4, target: 750000 }, roas: { value: 6.61, change: 7, target: 6.5 }, revenue: { value: 4100000, change: 11, target: 5000000 }, orders: { value: 1340, change: 14, target: 1600 }, aov: { value: 3060, change: -3, target: 3100 } }, targetAchievement: { spends: { achieved: 620000, target: 750000, variance: -130000 }, revenue: { achieved: 4100000, target: 5000000, variance: -900000 } }, status: 'good' },
    ],
    atReports: [],
  },
];

// ── Generate platform breakdowns (Meta / Google split) ──
// Deterministic split based on client ID — Meta gets ~60%, Google gets ~40% (varies per client)
function generateEcomBreakdown(clientId: string, m: ECommerceMetrics): PlatformBreakdown<ECommerceMetrics>[] {
  const seed = parseInt(clientId) || 1;
  const metaRatio = 0.55 + (seed % 5) * 0.04; // 0.55–0.71
  const googleRatio = 1 - metaRatio;
  const split = (v: number, r: number) => Math.round(v * r);
  return [
    { platform: 'Meta Ads', metrics: {
      adSpend: { value: split(m.adSpend.value, metaRatio), change: m.adSpend.change + 2, target: split(m.adSpend.target, metaRatio) },
      roas: { value: +(m.roas.value * (1 + (seed % 3 - 1) * 0.08)).toFixed(2), change: m.roas.change + 3, target: m.roas.target },
      revenue: { value: split(m.revenue.value, metaRatio), change: m.revenue.change + 1, target: split(m.revenue.target, metaRatio) },
      orders: { value: split(m.orders.value, metaRatio), change: m.orders.change + 2, target: split(m.orders.target, metaRatio) },
      aov: { value: Math.round(m.aov.value * (1 + (seed % 2 ? 0.03 : -0.02))), change: m.aov.change + 1, target: m.aov.target },
    }},
    { platform: 'Google Ads', metrics: {
      adSpend: { value: split(m.adSpend.value, googleRatio), change: m.adSpend.change - 3, target: split(m.adSpend.target, googleRatio) },
      roas: { value: +(m.roas.value * (1 - (seed % 3 - 1) * 0.06)).toFixed(2), change: m.roas.change - 2, target: m.roas.target },
      revenue: { value: split(m.revenue.value, googleRatio), change: m.revenue.change - 2, target: split(m.revenue.target, googleRatio) },
      orders: { value: split(m.orders.value, googleRatio), change: m.orders.change - 1, target: split(m.orders.target, googleRatio) },
      aov: { value: Math.round(m.aov.value * (1 + (seed % 2 ? -0.02 : 0.04))), change: m.aov.change - 2, target: m.aov.target },
    }},
  ];
}

function generateLeadGenBreakdown(clientId: string, m: LeadGenMetrics): PlatformBreakdown<LeadGenMetrics>[] {
  const seed = parseInt(clientId) || 1;
  const metaRatio = 0.50 + (seed % 6) * 0.04; // 0.50–0.70
  const googleRatio = 1 - metaRatio;
  const split = (v: number, r: number) => Math.round(v * r);
  return [
    { platform: 'Meta Ads', metrics: {
      adSpend: { value: split(m.adSpend.value, metaRatio), change: m.adSpend.change + 3, target: split(m.adSpend.target, metaRatio) },
      leads: { value: split(m.leads.value, metaRatio), change: m.leads.change + 2, target: split(m.leads.target, metaRatio) },
      cpl: { value: Math.round(m.cpl.value * (1 - 0.05 * (seed % 3))), change: m.cpl.change - 2, target: m.cpl.target },
      ctr: { value: +(m.ctr.value * (1 + 0.08)).toFixed(1), change: m.ctr.change + 3, target: m.ctr.target },
    }},
    { platform: 'Google Ads', metrics: {
      adSpend: { value: split(m.adSpend.value, googleRatio), change: m.adSpend.change - 2, target: split(m.adSpend.target, googleRatio) },
      leads: { value: split(m.leads.value, googleRatio), change: m.leads.change - 1, target: split(m.leads.target, googleRatio) },
      cpl: { value: Math.round(m.cpl.value * (1 + 0.04 * (seed % 3))), change: m.cpl.change + 3, target: m.cpl.target },
      ctr: { value: +(m.ctr.value * (1 - 0.06)).toFixed(1), change: m.ctr.change - 2, target: m.ctr.target },
    }},
  ];
}

// Enrich mock data with platform breakdowns
mockClients.forEach(c => {
  c.pmReports.forEach(r => {
    if (r.reportType === 'ecommerce') {
      (r as ECommercePMReport).platformBreakdown = generateEcomBreakdown(c.id, r.metrics as ECommerceMetrics);
    } else {
      (r as LeadGenPMReport).platformBreakdown = generateLeadGenBreakdown(c.id, r.metrics as LeadGenMetrics);
    }
  });
});

// ── Filter types ──


// ── Helpers ──

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${value.toLocaleString('en-IN')}`;
}
function formatNumber(value: number) { return value.toLocaleString('en-IN'); }

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  excellent: { bg: 'bg-[#E8F8F5]', text: 'text-[#0A8F5E]', dot: 'bg-[#00C875]' },
  good: { bg: 'bg-[#EEF1FB]', text: 'text-[#204CC7]', dot: 'bg-[#204CC7]' },
  'needs-attention': { bg: 'bg-[#FFF4E6]', text: 'text-[#B87514]', dot: 'bg-[#FDAB3D]' },
};

function getStatusLabel(s: string) { return s === 'needs-attention' ? 'Needs Attention' : s.charAt(0).toUpperCase() + s.slice(1); }

// ── Dropdown hook (mousedown + contains — fixes React 18) ──

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);
  return { open, setOpen, ref };
}

const CLIENTS_PER_PAGE = 15;

// ── Progress bar helper ──

function ProgressBar({ value, target, inverse }: { value: number; target: number; inverse?: boolean }) {
  if (!target || target === 0) return null;
  const pct = Math.min((value / target) * 100, 100);
  const isGood = inverse ? value <= target : value >= target * 0.8;
  const isExcellent = inverse ? value <= target * 0.9 : value >= target;
  const barColor = isExcellent ? 'bg-[#00C875]' : isGood ? 'bg-[#204CC7]' : 'bg-[#FDAB3D]';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-[4px] rounded-full bg-black/[0.04] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-normal text-black/40 shrink-0 tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Metric formatting by key ──

function formatMetricValue(key: string, value: number): string {
  if (key === 'adSpend' || key === 'revenue' || key === 'aov' || key === 'cpc') return formatCurrency(value);
  if (key === 'roas') return `${value}x`;
  if (key === 'ctr' || key === 'conversionRate') return `${value}%`;
  if (key === 'cpl') return `₹${formatNumber(value)}`;
  return formatNumber(value);
}

function formatMetricTarget(key: string, target: number): string {
  if (key === 'adSpend' || key === 'revenue' || key === 'aov' || key === 'cpc') return formatCurrency(target);
  if (key === 'roas') return `${target}x`;
  if (key === 'ctr' || key === 'conversionRate') return `${target}%`;
  if (key === 'cpl') return `₹${formatNumber(target)}`;
  return formatNumber(target);
}

const METRIC_LABELS: Record<string, string> = {
  adSpend: 'Ad Spends', roas: 'ROAS', revenue: 'Revenue', orders: 'Orders', aov: 'AOV',
  leads: 'Leads', cpl: 'CPL', ctr: 'CTR', cpc: 'CPC', impressions: 'Impressions',
  clicks: 'Clicks', conversionRate: 'Conversion Rate',
};

const INVERSE_METRICS = new Set(['cpl', 'cpc']); // lower is better

// Full pool of PM metrics available per report type
const ALL_PM_METRICS: Record<PMBusinessType, { key: string; label: string }[]> = {
  ecommerce: [
    { key: 'adSpend', label: 'Ad Spends' },
    { key: 'roas', label: 'ROAS' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'aov', label: 'AOV' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpc', label: 'CPC' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'conversionRate', label: 'Conversion Rate' },
  ],
  leadGeneration: [
    { key: 'adSpend', label: 'Ad Spends' },
    { key: 'leads', label: 'Leads' },
    { key: 'cpl', label: 'CPL' },
    { key: 'ctr', label: 'CTR' },
    { key: 'cpc', label: 'CPC' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'conversionRate', label: 'Conversion Rate' },
  ],
};

// ── Client Target Change Requests (slim model) ──

interface ClientTargetRequest {
  clientId: string;
  reportType: PMBusinessType;
  reportIndex: number;
  requestedBy: string;
  requestedAt: string;
  proposed: Record<string, number>;
}

const initialClientRequests: ClientTargetRequest[] = [
  {
    clientId: '1', reportType: 'ecommerce', reportIndex: 0,
    requestedBy: 'Aanchal Thakur',
    requestedAt: 'Mar 28, 2026',
    proposed: { adSpend: 1200000, roas: 5.5, revenue: 6600000, orders: 1800, aov: 3600, ctr: 2.5 },
  },
  {
    clientId: '3', reportType: 'leadGeneration', reportIndex: 0,
    requestedBy: 'Mahesh Patel',
    requestedAt: 'Mar 27, 2026',
    proposed: { adSpend: 650000, leads: 950, cpl: 650, ctr: 3.0, impressions: 150000, conversionRate: 0.6 },
  },
];

// ── Target Settings Modal ──

interface TargetModalProps {
  clientName: string;
  reportType: PMBusinessType;
  businessTypeLabel: string;
  targets: Record<string, number>;
  onSave: (targets: Record<string, number>) => void;
  onClose: () => void;
}

type TargetTab = 'overall' | 'meta' | 'google';
const TARGET_TABS: { key: TargetTab; label: string; icon: string; color: string }[] = [
  { key: 'overall', label: 'Overall', icon: 'O', color: '#204CC7' },
  { key: 'meta', label: 'Meta Ads', icon: 'M', color: '#1877F2' },
  { key: 'google', label: 'Google Ads', icon: 'G', color: '#EA4335' },
];

function TargetSettingsModal({ clientName, reportType, businessTypeLabel, targets, onSave, onClose }: TargetModalProps) {
  const [activeTargetTab, setActiveTargetTab] = useState<TargetTab>('overall');
  // Separate drafts for each tab
  const [overallDraft, setOverallDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(targets).forEach(([k, v]) => { d[k] = String(v); });
    return d;
  });
  const [metaDraft, setMetaDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(targets).forEach(([k, v]) => { d[k] = String(Math.round(v * 0.6)); });
    return d;
  });
  const [googleDraft, setGoogleDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(targets).forEach(([k, v]) => { d[k] = String(Math.round(v * 0.4)); });
    return d;
  });

  const metricKeys = reportType === 'ecommerce' ? ['adSpend', 'roas', 'revenue', 'orders', 'aov'] : ['adSpend', 'leads', 'cpl', 'ctr'];
  const currentDraft = activeTargetTab === 'overall' ? overallDraft : activeTargetTab === 'meta' ? metaDraft : googleDraft;
  const setCurrentDraft = activeTargetTab === 'overall' ? setOverallDraft : activeTargetTab === 'meta' ? setMetaDraft : setGoogleDraft;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSave() {
    const parsed: Record<string, number> = {};
    Object.entries(overallDraft).forEach(([k, v]) => { parsed[k] = parseFloat(v) || 0; });
    onSave(parsed);
  }

  // Ratio badges that show meta/google contribution vs overall
  const NON_RATIO_METRICS = new Set(['roas', 'ctr', 'aov', 'cpl']); // these don't split additively

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Set metric targets">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-h3 text-black/85">Set Targets</h2>
              <p className="text-caption font-normal text-black/55 mt-0.5">{clientName} · SEM · {businessTypeLabel}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-black/40 hover:text-black/70 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-black/[0.03] rounded-xl">
            {TARGET_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTargetTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-caption font-semibold transition-all ${activeTargetTab === tab.key ? 'bg-white text-black/85 shadow-sm' : 'text-black/45 hover:text-black/65'}`}
              >
                {tab.key !== 'overall' && (
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold text-white`} style={{ backgroundColor: tab.color }}>{tab.icon}</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab indicator line */}
        <div className="h-px bg-black/[0.06] mx-6 mt-3" />

        {/* Metrics form */}
        <div className="px-6 py-5 space-y-4 max-h-[55vh] overflow-y-auto">
          {activeTargetTab !== 'overall' && (
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${activeTargetTab === 'meta' ? 'bg-[#1877F2]/[0.04] border-[#1877F2]/[0.10]' : 'bg-[#EA4335]/[0.04] border-[#EA4335]/[0.10]'}`}>
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white ${activeTargetTab === 'meta' ? 'bg-[#1877F2]' : 'bg-[#EA4335]'}`}>{activeTargetTab === 'meta' ? 'M' : 'G'}</span>
              <span className="text-caption font-medium text-black/60">Set platform-specific targets for {activeTargetTab === 'meta' ? 'Meta' : 'Google'} Ads</span>
            </div>
          )}
          {metricKeys.map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-caption font-medium text-black/70">{METRIC_LABELS[key]} Target</label>
                {activeTargetTab !== 'overall' && !NON_RATIO_METRICS.has(key) && overallDraft[key] && parseFloat(overallDraft[key]) > 0 && (
                  <span className="text-[11px] font-normal text-black/35">
                    Overall: {formatMetricTarget(key, parseFloat(overallDraft[key]))}
                  </span>
                )}
              </div>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" />
                <input
                  type="number"
                  step={key === 'roas' || key === 'ctr' ? '0.1' : '1'}
                  value={currentDraft[key] ?? ''}
                  onChange={(e) => setCurrentDraft((d: Record<string, string>) => ({ ...d, [key]: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body font-medium text-black/80 placeholder:text-black/30 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                  placeholder={`e.g. ${formatMetricTarget(key, targets[key] || 0)}`}
                />
                {currentDraft[key] && parseFloat(currentDraft[key]) > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-normal text-black/40">
                    {formatMetricTarget(key, parseFloat(currentDraft[key]))}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-end gap-3 bg-[#F6F7FF]/40">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-caption font-medium text-black/60 hover:text-black/80 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3da6] active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/50 focus-visible:ring-offset-2">
            <Check className="w-3.5 h-3.5" /> Save Targets
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Request Review Modal ──

interface ReviewModalProps {
  clientName: string;
  reportType: PMBusinessType;
  businessTypeLabel: string;
  currentMetricKeys: string[];
  currentTargets: Record<string, number>;
  clientRequest: ClientTargetRequest;
  onApprove: (selectedMetrics: string[], targets: Record<string, number>) => void;
  onReject: () => void;
  onClose: () => void;
}

function ChangeRequestReviewModal({ clientName, reportType, businessTypeLabel, currentMetricKeys, currentTargets, clientRequest, onApprove, onReject, onClose }: ReviewModalProps) {
  const availableMetrics = ALL_PM_METRICS[reportType];
  const newMetricKeys = Object.keys(clientRequest.proposed).filter(k => !currentMetricKeys.includes(k));

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(() => {
    const initial = new Set(currentMetricKeys);
    newMetricKeys.forEach(k => initial.add(k));
    return initial;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.entries(currentTargets).forEach(([k, v]) => { d[k] = String(v); });
    Object.entries(clientRequest.proposed).forEach(([k, v]) => { if (!d[k]) d[k] = String(v); });
    return d;
  });

  useEffect(() => {
    if (!dropdownOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dropdownOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggleMetric(key: string) {
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleApprove() {
    const targets: Record<string, number> = {};
    selectedMetrics.forEach(k => { targets[k] = parseFloat(draft[k]) || 0; });
    onApprove(Array.from(selectedMetrics), targets);
  }

  const selectedList = availableMetrics.filter(m => selectedMetrics.has(m.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Review change request">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h3 text-black/85">Review Change Request</h2>
              <p className="text-caption font-normal text-black/65 mt-0.5">{clientName} · SEM · {businessTypeLabel}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-black/40 hover:text-black/70 hover:bg-black/[0.04] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto">
          <div className="mx-6 mt-4 px-3.5 py-3 rounded-xl bg-amber-50/80 border border-amber-200/50 flex items-center gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-caption font-semibold text-amber-800">{clientRequest.requestedBy}</p>
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-caption font-normal text-amber-600/70">{clientRequest.requestedAt}</span>
            </div>
          </div>

          <div className="px-6 mt-5">
            <label className="block text-caption font-semibold text-black/70 mb-2">Select Metrics</label>
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body text-black/70 hover:border-black/12 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedList.length > 0 ? (
                    selectedList.map(m => (
                      <span key={m.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${newMetricKeys.includes(m.key) ? 'bg-amber-100 text-amber-700' : 'bg-[#204CC7]/[0.08] text-[#204CC7]'}`}>
                        {m.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-caption text-black/40">Choose metrics…</span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-black/40 transition-transform shrink-0 ml-2 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-black/8 rounded-xl shadow-lg py-1.5 z-50 max-h-[240px] overflow-y-auto">
                  {availableMetrics.map(m => {
                    const isSelected = selectedMetrics.has(m.key);
                    const isNew = newMetricKeys.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggleMetric(m.key)}
                        className={`w-full px-4 py-2.5 text-left text-caption transition-colors flex items-center justify-between focus-visible:outline-none ${isSelected ? 'bg-[#EEF1FB]/50 text-[#204CC7]' : 'text-black/70 hover:bg-[#F6F7FF]'}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all ${isSelected ? 'bg-[#204CC7] border-[#204CC7]' : 'border-black/20 bg-white'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          {m.label}
                        </span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-semibold">NEW</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 pt-4 pb-5 space-y-3">
            <label className="block text-caption font-semibold text-black/70">Targets</label>
            {selectedList.length === 0 && (
              <p className="text-caption text-black/40 py-3">Select at least one metric above to set targets.</p>
            )}
            {selectedList.map(m => {
              const proposed = clientRequest.proposed[m.key];
              const current = currentTargets[m.key];
              const isNew = newMetricKeys.includes(m.key);
              const hasProposedChange = proposed !== undefined && proposed !== current;

              return (
                <div key={m.key} className={`p-3.5 rounded-xl border transition-all ${isNew ? 'border-amber-200/60 bg-amber-50/30' : 'border-black/[0.06] bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-caption font-semibold text-black/75">{m.label}</span>
                    {isNew && <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[11px] font-semibold">Newly Requested</span>}
                  </div>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/30 pointer-events-none" />
                    <input
                      type="number"
                      step={m.key === 'roas' || m.key === 'ctr' || m.key === 'conversionRate' ? '0.1' : '1'}
                      value={draft[m.key] ?? ''}
                      onChange={(e) => setDraft(d => ({ ...d, [m.key]: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 bg-[#F6F7FF] border border-black/[0.06] rounded-xl text-body font-medium text-black/80 placeholder:text-black/30 focus:outline-none focus:bg-white focus:border-[#204CC7]/25 focus:ring-2 focus:ring-[#204CC7]/15 transition-all"
                      placeholder="Set target…"
                    />
                    {draft[m.key] && parseFloat(draft[m.key]) > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption font-normal text-black/40">
                        {formatMetricTarget(m.key, parseFloat(draft[m.key]))}
                      </span>
                    )}
                  </div>
                  {(hasProposedChange || isNew) && proposed !== undefined && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {current !== undefined && (
                        <>
                          <span className="text-caption font-normal text-black/40">Current: {formatMetricTarget(m.key, current)}</span>
                          <span className="text-black/15">→</span>
                        </>
                      )}
                      <span className="text-caption font-medium text-amber-600">Proposed: {formatMetricTarget(m.key, proposed)}</span>
                      <button
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, [m.key]: String(proposed) }))}
                        className="ml-auto text-caption font-medium text-[#204CC7] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                      >
                        Use proposed
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] bg-[#F6F7FF]/40 flex items-center justify-between">
          <button onClick={() => { onReject(); onClose(); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-caption font-medium text-[#E2445C]/80 hover:text-[#E2445C] hover:bg-[#E2445C]/[0.06] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/30">
            <X className="w-3.5 h-3.5" /> Reject
          </button>
          <button onClick={() => { handleApprove(); onClose(); }} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-md bg-[#204CC7] text-white text-caption font-semibold hover:bg-[#1a3da6] active:scale-[0.98] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/50 focus-visible:ring-offset-2">
            <Check className="w-3.5 h-3.5" /> Approve & Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change value indicator ──
function ChangeIndicator({ value, inverse }: { value: number; inverse?: boolean }) {
  const isGood = inverse ? value <= 0 : value >= 0;
  return (
    <span className={`text-caption font-medium tabular-nums ${isGood ? 'text-[#0A8F5E]' : 'text-[#D03050]'}`}>
      {value >= 0 ? '+' : ''}{value}%
    </span>
  );
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {getStatusLabel(status)}
    </span>
  );
}

// ── Component ──

interface ReportingModuleProps {
  activeTab?: 'at' | 'pm';
}

export function ReportingModule({ activeTab = 'at' }: ReportingModuleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (key: string) => setExpandedRows(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const [pmSubFilter, setPmSubFilter] = useState<'all' | PMBusinessType>('all');
  const [atSubFilter, setAtSubFilter] = useState<'all' | ATBusinessType>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [viewMode, setViewMode] = useState<'overview' | 'detail' | 'atDashboard' | 'pmDashboard'>('overview');
  const [detailClient, setDetailClient] = useState<any>(null);
  const [detailService, setDetailService] = useState<ServiceType>('performanceMarketing');
  const [atDashboardClient, setAtDashboardClient] = useState<{ client: { id: string; name: string; code: string; team: { initials: string; color: string }[] }; report: AccountsTaxationReport } | null>(null);
  const [pmDashboardClient, setPmDashboardClient] = useState<{ client: { id: string; name: string; code: string; team: { initials: string; color: string }[] }; report: PerformanceMarketingReport } | null>(null);

  // ── Financial upload state ──
  // The drawer is keyed by (client, report, **month**). Holding the
  // month here means the drawer can switch periods without closing —
  // the user navigates Apr → Mar → Feb in place, which is how you
  // actually audit a back-month gap.
  const [uploadDrawer, setUploadDrawer] = useState<{
    clientId: string;
    clientName: string;
    reportIndex: number;
    monthKey: string;
  } | null>(null);
  // a11y: traps focus inside the upload drawer while open, closes on
  // Escape, and restores focus to the row's Upload button on dismiss.
  const uploadDrawerRef = useModalA11y(uploadDrawer !== null, () => setUploadDrawer(null));
  const [uploadStore, setUploadStore] = useState<UploadStore>({});
  const [uploadingType, setUploadingType] = useState<FinancialFileType | null>(null);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  // Per-slot "show history" toggle inside the drawer — keyed by
  // file-type so each slot's history collapses independently.
  const [expandedHistory, setExpandedHistory] = useState<Set<FinancialFileType>>(new Set());

  const today = new Date();
  const realCurrentMonthKey = getCurrentMonthKey();
  const isFirstWeek = today.getDate() <= 7;
  // ── Month period filter — same UX as the Deliverables top bar.
  // Drives which month the upload counts, "Due" pills, banner CTA,
  // and drawer default key are scoped to. Defaults to the real
  // current month so the page lands where users expect on first load.
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const selectedMonthKey = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const selectedMonthName = useMemo(
    () => new Date(selectedYear, selectedMonthIdx, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    [selectedYear, selectedMonthIdx],
  );
  const isViewingCurrentMonth = selectedMonthKey === realCurrentMonthKey;
  // First-week banner only fires when the user is actually looking at
  // *this* month — past months don't have a "due now" affordance.
  const showFirstWeekBanner = isViewingCurrentMonth && isFirstWeek;
  // 6-month window the table shows per client (oldest → newest).
  const trackingMonths = useMemo(() => getMonthKeysEnding(today, 6), [today]);

  /**
   * Upload a new version of a file. If the slot already has a version,
   * the old one rolls into history (audit trail preserved) — no destructive
   * confirm dialog needed because nothing is lost.
   */
  const handleFileUpload = useCallback((
    clientId: string,
    reportIndex: number,
    fileType: FinancialFileType,
    file: File,
    monthKey: string,
  ) => {
    const key = getUploadKey(clientId, reportIndex, fileType, monthKey);
    setUploadingType(fileType);
    setTimeout(() => {
      const next = makeVersion({
        name: file.name,
        size: file.size,
        uploadedBy: CURRENT_UPLOADER,
        source: 'local',
      });
      setUploadStore(prev => ({ ...prev, [key]: pushVersion(prev[key], next) }));
      setUploadingType(null);
    }, 600);
  }, []);

  /** Remove the *current* version. If there's history, the most recent
   *  archived version is restored to current — so a misclick is one
   *  click to undo. If there's no history, the slot is fully cleared. */
  const removeUpload = useCallback((
    clientId: string,
    reportIndex: number,
    fileType: FinancialFileType,
    monthKey: string,
  ) => {
    const key = getUploadKey(clientId, reportIndex, fileType, monthKey);
    setUploadStore(prev => {
      const slot = prev[key];
      if (!slot) return prev;
      if (slot.history.length === 0) {
        // No archived versions — fully clear the slot.
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const [restored, ...rest] = slot.history;
      return { ...prev, [key]: { current: restored, history: rest } };
    });
  }, []);

  /** Promote an archived version back to current. Used by the per-slot
   *  history list inside the drawer ("Restore"). */
  const restoreVersion = useCallback((
    clientId: string,
    reportIndex: number,
    fileType: FinancialFileType,
    monthKey: string,
    versionId: string,
  ) => {
    const key = getUploadKey(clientId, reportIndex, fileType, monthKey);
    setUploadStore(prev => {
      const slot = prev[key];
      if (!slot) return prev;
      const target = slot.history.find(v => v.id === versionId);
      if (!target) return prev;
      const remainingHistory = slot.history.filter(v => v.id !== versionId);
      // Old current rolls into history at the top so undo is symmetric.
      return {
        ...prev,
        [key]: { current: target, history: [slot.current, ...remainingHistory] },
      };
    });
  }, []);

  const toggleHistory = useCallback((fileType: FinancialFileType) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      if (next.has(fileType)) next.delete(fileType); else next.add(fileType);
      return next;
    });
  }, []);

  // Reset per-slot history toggles whenever the drawer's (client, month)
  // context changes so each new view starts collapsed.
  useEffect(() => {
    setExpandedHistory(new Set());
  }, [uploadDrawer?.clientId, uploadDrawer?.monthKey]);

  // Target overrides
  const [targetOverrides, setTargetOverrides] = useState<Record<string, Record<string, number>>>({});
  const [targetModal, setTargetModal] = useState<{ clientId: string; reportIndex: number; report: PerformanceMarketingReport } | null>(null);
  // Change request feature removed

  // Client Target Change Requests
  const [clientRequests, setClientRequests] = useState<ClientTargetRequest[]>(initialClientRequests);

  // Sort state
  type SortDirection = 'asc' | 'desc' | null;
  type PMEcomSortField = 'client' | 'team' | 'adSpend' | 'roas' | 'revenue' | 'orders' | 'aov' | 'ksmTarget' | 'updated';
  type PMLeadSortField = 'client' | 'team' | 'adSpend' | 'leads' | 'cpl' | 'ctr' | 'ksmTarget' | 'updated';
  type ATSortField = 'client' | 'team' | 'type' | 'status' | 'updated';
  const [atSort, setAtSort] = useState<{ field: ATSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });
  const [ecomSort, setEcomSort] = useState<{ field: PMEcomSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });
  const [leadSort, setLeadSort] = useState<{ field: PMLeadSortField; dir: SortDirection }>({ field: 'client', dir: 'asc' });

  const toggleSort = <T extends string>(current: { field: T; dir: SortDirection }, field: T): { field: T; dir: SortDirection } => {
    if (current.field === field) {
      if (current.dir === 'asc') return { field, dir: 'desc' };
      if (current.dir === 'desc') return { field, dir: null };
      return { field, dir: 'asc' };
    }
    return { field, dir: 'asc' };
  };

  const SortIcon = ({ field, current }: { field: string; current: { field: string; dir: SortDirection } }) => {
    if (current.field !== field || current.dir === null) return <ArrowUpDown className="w-3 h-3 text-black/25" />;
    return current.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-[#204CC7]" /> : <ChevronDown className="w-3 h-3 text-[#204CC7]" />;
  };

  function getClientRequest(clientId: string, reportType: PMBusinessType, reportIndex: number): ClientTargetRequest | undefined {
    return clientRequests.find(r => r.clientId === clientId && r.reportType === reportType && r.reportIndex === reportIndex);
  }

  function dismissClientRequest(clientId: string, reportType: PMBusinessType, reportIndex: number) {
    setClientRequests(prev => prev.filter(r => !(r.clientId === clientId && r.reportType === reportType && r.reportIndex === reportIndex)));
  }

  function getTargets(clientId: string, reportIndex: number, report: PerformanceMarketingReport): Record<string, number> {
    const overrideKey = `${clientId}-${report.reportType}-${reportIndex}`;
    const overrides = targetOverrides[overrideKey] || {};
    const base: Record<string, number> = {};
    Object.entries(report.metrics).forEach(([k, v]) => {
      if (v && typeof v === 'object' && 'target' in v) base[k] = (v as { target: number }).target;
    });
    return { ...base, ...overrides };
  }

  function handleSaveTargets(targets: Record<string, number>) {
    if (!targetModal) return;
    const overrideKey = `${targetModal.clientId}-${targetModal.report.reportType}-${targetModal.reportIndex}`;
    setTargetOverrides((prev) => ({ ...prev, [overrideKey]: targets }));
    setTargetModal(null);
  }

  // Reset page on filter changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, activeTab, pmSubFilter, atSubFilter]);

  // ── A&T filtered data ──
  const atRows = useMemo(() => {
    const rows: { client: ClientReport; report: AccountsTaxationReport; reportIndex: number }[] = [];
    mockClients.forEach(c => {
      c.atReports.forEach((r, i) => rows.push({ client: c, report: r, reportIndex: i }));
    });
    let filtered = rows;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.client.name.toLowerCase().includes(s));
    }
    if (atSubFilter !== 'all') {
      filtered = filtered.filter(r => r.report.businessType === atSubFilter);
    }
    if (atSort.dir) {
      const dir = atSort.dir === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        switch (atSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'team': return dir * (a.client.team.map(t => t.initials).join(',').localeCompare(b.client.team.map(t => t.initials).join(',')));
          case 'type': return dir * (a.report.businessType || '').localeCompare(b.report.businessType || '');
          case 'status': return dir * a.report.status.localeCompare(b.report.status);
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    } else {
      filtered.sort((a, b) => a.client.name.localeCompare(b.client.name));
    }
    return filtered;
  }, [searchTerm, atSubFilter, atSort]);

  // ── PM filtered data — split by report type ──
  const pmRows = useMemo(() => {
    const rows: { client: ClientReport; report: PerformanceMarketingReport; reportIndex: number }[] = [];
    mockClients.forEach(c => {
      c.pmReports.forEach((r, i) => rows.push({ client: c, report: r, reportIndex: i }));
    });
    let filtered = rows;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.client.name.toLowerCase().includes(s));
    }
    if (pmSubFilter !== 'all') {
      filtered = filtered.filter(r => r.report.reportType === pmSubFilter);
    }
    return filtered.sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [searchTerm, pmSubFilter]);

  const pmEcomRows = useMemo(() => {
    const rows = pmRows.filter(r => r.report.reportType === 'ecommerce');
    if (ecomSort.dir) {
      const dir = ecomSort.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const am = a.report.metrics as ECommerceMetrics;
        const bm = b.report.metrics as ECommerceMetrics;
        switch (ecomSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'team': return dir * (a.client.team.map(t => t.initials).join(',').localeCompare(b.client.team.map(t => t.initials).join(',')));
          case 'adSpend': return dir * (am.adSpend.value - bm.adSpend.value);
          case 'roas': return dir * (am.roas.value - bm.roas.value);
          case 'revenue': return dir * (am.revenue.value - bm.revenue.value);
          case 'orders': return dir * (am.orders.value - bm.orders.value);
          case 'aov': return dir * (am.aov.value - bm.aov.value);
          case 'ksmTarget': return dir * ((a.report as any).ksmTarget || '').localeCompare((b.report as any).ksmTarget || '');
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    }
    return rows;
  }, [pmRows, ecomSort]);

  const pmLeadGenRows = useMemo(() => {
    const rows = pmRows.filter(r => r.report.reportType === 'leadGeneration');
    if (leadSort.dir) {
      const dir = leadSort.dir === 'asc' ? 1 : -1;
      rows.sort((a, b) => {
        const am = a.report.metrics as LeadGenMetrics;
        const bm = b.report.metrics as LeadGenMetrics;
        switch (leadSort.field) {
          case 'client': return dir * a.client.name.localeCompare(b.client.name);
          case 'team': return dir * (a.client.team.map(t => t.initials).join(',').localeCompare(b.client.team.map(t => t.initials).join(',')));
          case 'adSpend': return dir * (am.adSpend.value - bm.adSpend.value);
          case 'leads': return dir * (am.leads.value - bm.leads.value);
          case 'cpl': return dir * (am.cpl.value - bm.cpl.value);
          case 'ctr': return dir * (am.ctr.value - bm.ctr.value);
          case 'ksmTarget': return dir * ((a.report as any).ksmTarget || '').localeCompare((b.report as any).ksmTarget || '');
          case 'updated': return dir * a.report.lastUpdated.localeCompare(b.report.lastUpdated);
          default: return 0;
        }
      });
    }
    return rows;
  }, [pmRows, leadSort]);

  // Pagination
  const currentRows = activeTab === 'at' ? atRows : pmRows;
  const totalPages = Math.max(1, Math.ceil(currentRows.length / CLIENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * CLIENTS_PER_PAGE;
  const endIdx = Math.min(safePage * CLIENTS_PER_PAGE, currentRows.length);

  const paginatedAtRows = activeTab === 'at' ? atRows.slice(startIdx, endIdx) : [];

  const getPageNumbers = useCallback((): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const p: (number | 'ellipsis')[] = [];
    if (safePage <= 4) { for (let i = 1; i <= 5; i++) p.push(i); p.push('ellipsis', totalPages); }
    else if (safePage >= totalPages - 3) { p.push(1, 'ellipsis'); for (let i = totalPages - 4; i <= totalPages; i++) p.push(i); }
    else { p.push(1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages); }
    return p;
  }, [totalPages, safePage]);

  // Counts
  const atCount = useMemo(() => mockClients.reduce((n, c) => n + c.atReports.length, 0), []);
  const pmCount = useMemo(() => mockClients.reduce((n, c) => n + c.pmReports.length, 0), []);

  // Status counts for dropdown
  const stCounts = useMemo(() => {
    const rows = activeTab === 'at' ? atRows : pmRows;
    // Remove status filter to count all
    const allRows = activeTab === 'at'
      ? (() => {
          const r: { report: AccountsTaxationReport }[] = [];
          mockClients.forEach(c => c.atReports.forEach(rep => r.push({ report: rep })));
          let f = r;
          if (searchTerm) { const s = searchTerm.toLowerCase(); f = f.filter(x => mockClients.find(c => c.atReports.includes(x.report))?.name.toLowerCase().includes(s) || false); }
          return f;
        })()
      : (() => {
          const r: { report: PerformanceMarketingReport }[] = [];
          mockClients.forEach(c => c.pmReports.forEach(rep => r.push({ report: rep })));
          return r;
        })();
    return {
      all: allRows.length,
      excellent: allRows.filter(r => r.report.status === 'excellent').length,
      good: allRows.filter(r => r.report.status === 'good').length,
      'needs-attention': allRows.filter(r => r.report.status === 'needs-attention').length,
    };
  }, [activeTab, searchTerm, atRows, pmRows]);

  function clearAll() { setSearchTerm(''); setPmSubFilter('all'); setAtSubFilter('all'); }

  // Build a ReportDetail-compatible single-report client
  function openDetail(client: ClientReport, svc: ServiceType, report: PerformanceMarketingReport | AccountsTaxationReport) {
    if (svc === 'accountsTaxation') {
      setAtDashboardClient({ client: { id: client.id, name: client.name, code: client.code, team: client.team }, report: report as AccountsTaxationReport });
      setViewMode('atDashboard');
      return;
    }
    setPmDashboardClient({ client: { id: client.id, name: client.name, code: client.code, team: client.team }, report: report as PerformanceMarketingReport });
    setViewMode('pmDashboard');
  }

  if (viewMode === 'atDashboard' && atDashboardClient) {
    return <ClientDashboard client={atDashboardClient.client} report={atDashboardClient.report} onBack={() => { setViewMode('overview'); setAtDashboardClient(null); }} />;
  }

  if (viewMode === 'pmDashboard' && pmDashboardClient) {
    return <PMClientDashboard client={pmDashboardClient.client} report={pmDashboardClient.report} onBack={() => { setViewMode('overview'); setPmDashboardClient(null); }} />;
  }

  if (viewMode === 'detail' && detailClient) {
    return <ReportDetail client={detailClient} service={detailService} onBack={() => { setViewMode('overview'); setDetailClient(null); }} />;
  }

  const activeFilterCount = (activeTab === 'pm' && pmSubFilter !== 'all' ? 1 : 0) + (activeTab === 'at' && atSubFilter !== 'all' ? 1 : 0);

  return (
    <div className="flex h-full">

      {/* Sidebar lives in app/dashboard/layout.tsx — shared across Performance Marketing + Accounts & Taxation for consistency with Home and Workspace modules */}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — same chrome as All Customers / Deliverables: title +
            subtitle on the left, search + filter selects on the right.
            All controls use the platform's `rounded-md` corner vocabulary
            (matches search input, status pill, and CTAs across the app). */}
        <div className="bg-white border-b border-black/5 px-6 shrink-0">
          <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
            <div className="shrink-0">
              <p className="text-black/90 text-body font-semibold">
                {activeTab === 'at' ? 'Accounts & Taxation' : 'Performance Marketing'}
              </p>
              <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
                {activeTab === 'at'
                  ? 'Monthly close, financial health, and reporting per client'
                  : 'Campaign performance, spend efficiency, and growth signals per client'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Period filter — same component used on the Deliverables
                  top bar so users get a consistent prev/next + picker
                  affordance for switching months across the platform. */}
              <MonthNavigator
                monthIdx={selectedMonthIdx}
                year={selectedYear}
                onMonthChange={setSelectedMonthIdx}
                onYearChange={setSelectedYear}
              />

              {/* Search — slimmer than the All Customers default so the
                  full filter cluster (period + search + 2 selects) reads
                  as one tight, balanced row. */}
              <div className="relative w-[200px]">
                <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <label htmlFor="reports-search" className="sr-only">Search clients</label>
                <input
                  id="reports-search"
                  type="text"
                  placeholder="Search clients…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" />
                  </button>
                )}
              </div>

              {/* Type filter — native select for visual parity with All
                  Customers / Deliverables top bars. */}
              <div className="relative">
                <label htmlFor="reports-type-filter" className="sr-only">Type filter</label>
                <select
                  id="reports-type-filter"
                  value={activeTab === 'at' ? atSubFilter : pmSubFilter}
                  onChange={(e) => {
                    if (activeTab === 'at') setAtSubFilter(e.target.value as 'all' | ATBusinessType);
                    else setPmSubFilter(e.target.value as 'all' | PMBusinessType);
                  }}
                  className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                >
                  <option value="all">All Types</option>
                  {(activeTab === 'at' ? AT_BUSINESS_TYPES : PM_BUSINESS_TYPES).map(bt => (
                    <option key={bt.value} value={bt.value}>{bt.short}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Clear chip — only renders when at least one filter is set */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  <X className="w-3 h-3" aria-hidden="true" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ═══ Monthly Update Banner ═══ */}
          {activeTab === 'at' && showFirstWeekBanner && !dismissedBanner && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#06B6D4]/[0.08] to-[#204CC7]/[0.06] border border-[#06B6D4]/20">
              <div className="w-9 h-9 rounded-lg bg-[#06B6D4]/15 flex items-center justify-center shrink-0">
                <CalendarClock className="w-[18px] h-[18px] text-[#0E7490]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold text-black/80">Monthly financial data update due</p>
                <p className="text-caption text-black/55 mt-0.5">Upload client financial reports for <span className="font-semibold text-[#0E7490]">{selectedMonthName}</span>. Hover any row and tap the <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#06B6D4] align-middle -mt-0.5 mx-0.5"><Upload className="w-2.5 h-2.5 text-white" /></span> button to get started.</p>
              </div>
              {(() => {
                const totalClients = atRows.length;
                const fullyUpdated = atRows.filter(r => getClientUploadCount(uploadStore, r.client.id, r.reportIndex, selectedMonthKey) === 8).length;
                // Banner is locked until every client has all 8 uploads
                // for the selected month. The dismiss-X is intentionally
                // gated on `allComplete` — this is a hard work
                // requirement, not a soft notification, so the team
                // shouldn't be able to swipe it away mid-month.
                const allComplete = totalClients > 0 && fullyUpdated === totalClients;
                return (
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-caption font-semibold text-[#0E7490]">{fullyUpdated}/{totalClients} complete</p>
                      <div className="w-24 h-1.5 rounded-full bg-black/[0.06] mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-[#06B6D4] transition-all duration-500" style={{ width: `${totalClients > 0 ? (fullyUpdated / totalClients) * 100 : 0}%` }} />
                      </div>
                    </div>
                    {/* Dismiss only renders when every client is
                        fully updated for the month. Mid-month the X
                        is gone — no escape hatch from the work. */}
                    {allComplete && (
                      <button
                        onClick={() => setDismissedBanner(true)}
                        className="p-1 rounded-md hover:bg-black/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]/40"
                        aria-label="Dismiss banner"
                      >
                        <X className="w-4 h-4 text-black/40" />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ A&T Table ═══ */}
          {activeTab === 'at' && (
            <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
              <table className="w-full min-w-[504px]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '44px' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                    {([['client','Client','left','px-5'],['team','Team','left','px-4'],['type','Type','left','px-4']] as [ATSortField, string, string, string][]).map(([field, label, align, px]) => (
                      <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setAtSort(toggleSort(atSort, field))}>
                        <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={atSort} /></span>
                      </th>
                    ))}
                    <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-2 py-3">
                      <span className="inline-flex items-center gap-1 justify-center">Data</span>
                    </th>
                    <th className="px-1 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedAtRows.map((row) => {
                    // Business / client display: when a report carries
                    // its own businessName (multi-business clients), show
                    // the business as primary and the client as a quiet
                    // caption beneath. Single-business clients fall back
                    // to just the client name. Mirrors the Deliverables
                    // page's (business, client) hierarchy 1:1.
                    const displayName = row.report.businessName ?? row.client.name;
                    const showClientCaption = !!row.report.businessName && row.report.businessName !== row.client.name;
                    return (
                    <tr
                      key={`${row.client.id}-at-${row.reportIndex}`}
                      className="border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[60px]"
                      onClick={() => openDetail(row.client, 'accountsTaxation', row.report)}
                    >
                      <td className="px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#06B6D4]/[0.10] flex items-center justify-center text-[#0E7490] text-caption font-bold shrink-0">
                            {displayName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body font-semibold text-black/85 truncate leading-tight">{displayName}</p>
                            {showClientCaption && (
                              <p className="text-caption text-black/45 mt-0.5 truncate leading-tight">{row.client.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <TeamPopover team={row.client.team} />
                      </td>
                      <td className="px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-caption font-medium whitespace-nowrap ${row.report.businessType === 'tradingManufacturing' ? 'bg-[#06B6D4]/[0.10] text-[#0E7490]' : 'bg-[#00C875]/[0.10] text-[#0A8F5E]'}`}>{getBusinessTypeShort(row.report.businessType)}</span>
                      </td>
                      <td className="px-2 text-center">
                        {(() => {
                          const count = getClientUploadCount(uploadStore, row.client.id, row.reportIndex, selectedMonthKey);
                          const total = FINANCIAL_FILE_TYPES.length;
                          if (count === total) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#00C875]/10 text-[#0A8F5E] text-[11px] font-semibold" title="All files uploaded">
                                <CheckCircle2 className="w-3 h-3" />{count}/{total}
                              </span>
                            );
                          }
                          if (count > 0) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FDAB3D]/10 text-[#B87514] text-[11px] font-semibold" title={`${count} of ${total} files uploaded`}>
                                <AlertCircle className="w-3 h-3" />{count}/{total}
                              </span>
                            );
                          }
                          if (showFirstWeekBanner) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E2445C]/10 text-[#E2445C] text-[11px] font-semibold" title="No files uploaded this month">
                                <Upload className="w-3 h-3" />Due
                              </span>
                            );
                          }
                          return <span className="text-[11px] text-black/30">—</span>;
                        })()}
                      </td>
                      <td className="px-1 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadDrawer({
                              clientId: row.client.id,
                              clientName: row.client.name,
                              reportIndex: row.reportIndex,
                              monthKey: selectedMonthKey,
                            });
                          }}
                          className="w-7 h-7 rounded-full bg-[#06B6D4] hover:bg-[#0891B2] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm mx-auto"
                          aria-label={`Upload financial data for ${row.client.name}`}
                        >
                          <Upload className="w-3.5 h-3.5 text-white" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {atRows.length === 0 && (
                <div className="py-16 text-center" role="status">
                  <Search className="w-10 h-10 text-black/15 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-black/70 text-body font-medium">No A&T reports match your filters</p>
                  <button onClick={clearAll} className="mt-2 text-[#204CC7] hover:underline text-caption rounded">Reset filters</button>
                </div>
              )}
            </div>
          )}

          {/* ═══ PM Tables (E-Commerce + Lead Generation) ═══ */}
          {activeTab === 'pm' && (
            <div className="space-y-6">

              {/* E-Commerce Table */}
              {pmEcomRows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <span className="text-caption font-semibold text-black/70">E-Commerce</span>
                    <span className="text-caption font-normal text-black/55">{pmEcomRows.length} report{pmEcomRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
                    <table className="w-full min-w-[1100px]" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '95px' }} />
                        <col style={{ width: '130px' }} />
                        <col style={{ width: '95px' }} />
                        <col style={{ width: '105px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '44px' }} />
                        <col style={{ width: '36px' }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                          {([['client','Client','left','px-5'],['team','Team','left','px-4'],['adSpend','Ad Spends','right','px-4'],['roas','ROAS','right','px-4'],['revenue','Revenue','right','px-4'],['orders','Orders','right','px-4'],['aov','AOV','right','px-4']] as [PMEcomSortField, string, string, string][]).map(([field, label, align, px]) => (
                            <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setEcomSort(toggleSort(ecomSort, field))}>
                              <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={ecomSort} /></span>
                            </th>
                          ))}
                          <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setEcomSort(toggleSort(ecomSort, 'ksmTarget'))}>
                            <span className="inline-flex items-center gap-1 justify-center">KSM <SortIcon field="ksmTarget" current={ecomSort} /></span>
                          </th>
                          <th className="text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider px-5 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setEcomSort(toggleSort(ecomSort, 'updated'))}>
                            <span className="inline-flex items-center gap-1 justify-end">Updated <SortIcon field="updated" current={ecomSort} /></span>
                          </th>
                          <th className="px-1 py-3"></th>
                          <th className="px-1 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pmEcomRows.map((row) => {
                          const m = row.report.metrics as ECommerceMetrics;
                          const targets = getTargets(row.client.id, row.reportIndex, row.report);
                          const rowKey = `ecom-${row.client.id}-${row.reportIndex}`;
                          const isExpanded = expandedRows.has(rowKey);
                          const breakdown = (row.report as ECommercePMReport).platformBreakdown || [];
                          return (
                            <Fragment key={rowKey}>
                            <tr
                              className={`border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[52px] ${isExpanded ? 'bg-[#F8F9FF]/40' : ''}`}
                              onClick={() => openDetail(row.client, 'performanceMarketing', row.report)}
                            >
                              <td className="px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/[0.08] flex items-center justify-center text-[#7C3AED] text-[11px] font-bold shrink-0">
                                    {row.client.name.charAt(0)}
                                  </div>
                                  <span className="text-body font-semibold text-black/80 truncate">{row.client.name}</span>
                                </div>
                              </td>
                              <td className="px-4" onClick={(e) => e.stopPropagation()}>
                                <TeamPopover team={row.client.team} />
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.adSpend.value)}</span>
                                  <ChangeIndicator value={m.adSpend.change} />
                                </div>
                                {targets.adSpend > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatCurrency(targets.adSpend)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{m.roas.value}x</span>
                                  <ChangeIndicator value={m.roas.change} />
                                </div>
                                {targets.roas > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {targets.roas}x</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.revenue.value)}</span>
                                  <ChangeIndicator value={m.revenue.change} />
                                </div>
                                {targets.revenue > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatCurrency(targets.revenue)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatNumber(m.orders.value)}</span>
                                  <ChangeIndicator value={m.orders.change} />
                                </div>
                                {targets.orders > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatNumber(targets.orders)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.aov.value)}</span>
                                  <ChangeIndicator value={m.aov.change} />
                                </div>
                                {targets.aov > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatCurrency(targets.aov)}</p>}
                              </td>
                              <td className="px-4 text-center">
                                {(() => {
                                  const isHit = row.report.status === 'excellent' || row.report.status === 'good';
                                  return isHit ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-caption font-semibold whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Hit
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-caption font-semibold whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Miss
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-5 text-right">
                                <span className="text-caption text-black/50 whitespace-nowrap">{row.report.lastUpdated}</span>
                              </td>
                              <td className="px-1 text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  {CAN_EDIT_TARGETS && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTargetModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-black/25 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] transition-all opacity-0 group-hover:opacity-100"
                                      title="Set Targets"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-1 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${isExpanded ? 'bg-[#204CC7] text-white' : 'bg-black/[0.06] text-black/40 hover:bg-black/[0.10] hover:text-black/60'}`}
                                >
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                            </tr>
                            {/* Platform sub-rows */}
                            {isExpanded && breakdown.map((pb) => {
                              const pm = pb.metrics;
                              const isMeta = pb.platform === 'Meta Ads';
                              return (
                                <tr key={`${rowKey}-${pb.platform}`} className="border-b border-black/[0.03] bg-[#FAFBFC]/80">
                                  <td className="px-5 py-2.5">
                                    <div className="flex items-center gap-2 pl-7">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isMeta ? 'bg-[#1877F2]/[0.10]' : 'bg-[#EA4335]/[0.10]'}`}>
                                        <span className={`text-[9px] font-bold ${isMeta ? 'text-[#1877F2]' : 'text-[#EA4335]'}`}>{isMeta ? 'M' : 'G'}</span>
                                      </div>
                                      <span className="text-caption font-medium text-black/60">{pb.platform}</span>
                                    </div>
                                  </td>
                                  <td className="px-4" />
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(pm.adSpend.value)}</span>
                                      <ChangeIndicator value={pm.adSpend.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatCurrency(pm.adSpend.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{pm.roas.value}x</span>
                                      <ChangeIndicator value={pm.roas.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {pm.roas.target}x</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(pm.revenue.value)}</span>
                                      <ChangeIndicator value={pm.revenue.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatCurrency(pm.revenue.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatNumber(pm.orders.value)}</span>
                                      <ChangeIndicator value={pm.orders.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatNumber(pm.orders.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(pm.aov.value)}</span>
                                      <ChangeIndicator value={pm.aov.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatCurrency(pm.aov.target)}</p>
                                  </td>
                                  <td className="px-4" />
                                  <td className="px-5" />
                                  <td className="px-1" />
                                  <td className="px-1" />
                                </tr>
                              );
                            })}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Lead Generation Table */}
              {pmLeadGenRows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    <span className="text-caption font-semibold text-black/70">Lead Generation</span>
                    <span className="text-caption font-normal text-black/55">{pmLeadGenRows.length} report{pmLeadGenRows.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
                    <table className="w-full min-w-[960px]" style={{ tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: '210px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '140px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '44px' }} />
                        <col style={{ width: '36px' }} />
                      </colgroup>
                      <thead>
                        <tr className="border-b border-black/[0.06] bg-[#FAFBFC]">
                          {([['client','Client','left','px-5'],['team','Team','left','px-4'],['adSpend','Ad Spends','right','px-4'],['leads','Leads','right','px-4'],['cpl','CPL','right','px-4'],['ctr','CTR','right','px-4']] as [PMLeadSortField, string, string, string][]).map(([field, label, align, px]) => (
                            <th key={field} className={`text-${align} text-[11px] font-semibold text-black/50 uppercase tracking-wider ${px} py-3 cursor-pointer select-none hover:text-black/70 transition-colors`} onClick={() => setLeadSort(toggleSort(leadSort, field))}>
                              <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>{label} <SortIcon field={field} current={leadSort} /></span>
                            </th>
                          ))}
                          <th className="text-center text-[11px] font-semibold text-black/50 uppercase tracking-wider px-4 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setLeadSort(toggleSort(leadSort, 'ksmTarget'))}>
                            <span className="inline-flex items-center gap-1 justify-center">KSM <SortIcon field="ksmTarget" current={leadSort} /></span>
                          </th>
                          <th className="text-right text-[11px] font-semibold text-black/50 uppercase tracking-wider px-5 py-3 cursor-pointer select-none hover:text-black/70 transition-colors" onClick={() => setLeadSort(toggleSort(leadSort, 'updated'))}>
                            <span className="inline-flex items-center gap-1 justify-end">Updated <SortIcon field="updated" current={leadSort} /></span>
                          </th>
                          <th className="px-1 py-3"></th>
                          <th className="px-1 py-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pmLeadGenRows.map((row) => {
                          const m = row.report.metrics as LeadGenMetrics;
                          const targets = getTargets(row.client.id, row.reportIndex, row.report);
                          const rowKey = `lead-${row.client.id}-${row.reportIndex}`;
                          const isExpanded = expandedRows.has(rowKey);
                          const breakdown = (row.report as LeadGenPMReport).platformBreakdown || [];
                          return (
                            <Fragment key={rowKey}>
                            <tr
                              className={`border-b border-black/[0.04] hover:bg-[#F8F9FF]/60 transition-colors cursor-pointer group h-[52px] ${isExpanded ? 'bg-[#F8F9FF]/40' : ''}`}
                              onClick={() => openDetail(row.client, 'performanceMarketing', row.report)}
                            >
                              <td className="px-5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/[0.08] flex items-center justify-center text-[#7C3AED] text-[11px] font-bold shrink-0">
                                    {row.client.name.charAt(0)}
                                  </div>
                                  <span className="text-body font-semibold text-black/80 truncate">{row.client.name}</span>
                                </div>
                              </td>
                              <td className="px-4" onClick={(e) => e.stopPropagation()}>
                                <TeamPopover team={row.client.team} />
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatCurrency(m.adSpend.value)}</span>
                                  <ChangeIndicator value={m.adSpend.change} />
                                </div>
                                {targets.adSpend > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatCurrency(targets.adSpend)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{formatNumber(m.leads.value)}</span>
                                  <ChangeIndicator value={m.leads.change} />
                                </div>
                                {targets.leads > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {formatNumber(targets.leads)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">₹{formatNumber(m.cpl.value)}</span>
                                  <ChangeIndicator value={m.cpl.change} inverse />
                                </div>
                                {targets.cpl > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: ₹{formatNumber(targets.cpl)}</p>}
                              </td>
                              <td className="px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-body font-semibold text-black/80 tabular-nums">{m.ctr.value}%</span>
                                  <ChangeIndicator value={m.ctr.change} />
                                </div>
                                {targets.ctr > 0 && <p className="text-caption text-black/35 tabular-nums mt-0.5 whitespace-nowrap">Target: {targets.ctr}%</p>}
                              </td>
                              <td className="px-4 text-center">
                                {(() => {
                                  const isHit = row.report.status === 'excellent' || row.report.status === 'good';
                                  return isHit ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-caption font-semibold whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Hit
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-caption font-semibold whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Miss
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-5 text-right">
                                <span className="text-caption text-black/50 whitespace-nowrap">{row.report.lastUpdated}</span>
                              </td>
                              <td className="px-1 text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  {CAN_EDIT_TARGETS && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTargetModal({ clientId: row.client.id, reportIndex: row.reportIndex, report: row.report }); }}
                                      className="p-1 rounded-lg text-black/25 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] transition-all opacity-0 group-hover:opacity-100"
                                      title="Set Targets"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-1 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${isExpanded ? 'bg-[#204CC7] text-white' : 'bg-black/[0.06] text-black/40 hover:bg-black/[0.10] hover:text-black/60'}`}
                                >
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              </td>
                            </tr>
                            {/* Platform sub-rows */}
                            {isExpanded && breakdown.map((pb) => {
                              const pm = pb.metrics;
                              const isMeta = pb.platform === 'Meta Ads';
                              return (
                                <tr key={`${rowKey}-${pb.platform}`} className="border-b border-black/[0.03] bg-[#FAFBFC]/80">
                                  <td className="px-5 py-2.5">
                                    <div className="flex items-center gap-2 pl-2">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isMeta ? 'bg-[#1877F2]/[0.10]' : 'bg-[#EA4335]/[0.10]'}`}>
                                        <span className={`text-[9px] font-bold ${isMeta ? 'text-[#1877F2]' : 'text-[#EA4335]'}`}>{isMeta ? 'M' : 'G'}</span>
                                      </div>
                                      <span className="text-caption font-medium text-black/60">{pb.platform}</span>
                                    </div>
                                  </td>
                                  <td className="px-4" />
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatCurrency(pm.adSpend.value)}</span>
                                      <ChangeIndicator value={pm.adSpend.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatCurrency(pm.adSpend.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{formatNumber(pm.leads.value)}</span>
                                      <ChangeIndicator value={pm.leads.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {formatNumber(pm.leads.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">₹{formatNumber(pm.cpl.value)}</span>
                                      <ChangeIndicator value={pm.cpl.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: ₹{formatNumber(pm.cpl.target)}</p>
                                  </td>
                                  <td className="px-4 text-right py-2.5">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <span className="text-caption font-semibold text-black/70 tabular-nums">{pm.ctr.value}%</span>
                                      <ChangeIndicator value={pm.ctr.change} />
                                    </div>
                                    <p className="text-caption text-black/35 tabular-nums mt-0.5 text-right whitespace-nowrap">Target: {pm.ctr.target}%</p>
                                  </td>
                                  <td className="px-4" />
                                  <td className="px-5" />
                                  <td className="px-1" />
                                  <td className="px-1" />
                                </tr>
                              );
                            })}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pmRows.length === 0 && (
                <div className="py-16 text-center bg-white rounded-xl border border-black/[0.06]" role="status">
                  <Search className="w-10 h-10 text-black/15 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-black/70 text-body font-medium">No PM reports match your filters</p>
                  <button onClick={clearAll} className="mt-2 text-[#204CC7] hover:underline text-caption rounded">Reset filters</button>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {currentRows.length > CLIENTS_PER_PAGE && (
            <nav aria-label="Pagination" className="flex items-center justify-between pt-4 pb-2">
              <span className="text-caption text-black/60">
                Showing {startIdx + 1}–{endIdx} of {currentRows.length} report{currentRows.length !== 1 ? 's' : ''}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
                  <button onClick={() => setCurrentPage(1)} disabled={safePage === 1} aria-label="First page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronsLeft className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageNumbers().map((pg, idx) => pg === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="w-8 text-center text-caption text-black/55 select-none" aria-hidden="true">…</span>
                  ) : (
                    <button key={pg} onClick={() => setCurrentPage(pg)} aria-label={`Page ${pg}`} aria-current={pg === safePage ? 'page' : undefined}
                      className={`min-w-[32px] h-8 rounded-md text-caption transition-all ${pg === safePage ? 'bg-[#204CC7] text-white shadow-sm' : 'text-black/60 hover:bg-black/[0.04] hover:text-black/80'}`}>{pg}</button>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} aria-label="Last page" className="p-1.5 rounded-lg text-black/55 hover:text-black/70 hover:bg-black/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all"><ChevronsRight className="w-4 h-4" /></button>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Target Settings Modal */}
      {targetModal && (() => {
        const client = mockClients.find((c) => c.id === targetModal.clientId);
        if (!client) return null;
        const targets = getTargets(client.id, targetModal.reportIndex, targetModal.report);
        return (
          <TargetSettingsModal
            clientName={client.name}
            reportType={targetModal.report.reportType}
            businessTypeLabel={getBusinessTypeShort(targetModal.report.reportType)}
            targets={targets}
            onSave={handleSaveTargets}
            onClose={() => setTargetModal(null)}
          />
        );
      })()}

      {/* ═══ Financial Data Upload Drawer ═══ */}
      {uploadDrawer && (() => {
        // Resolve the active month from the drawer state and compute
        // everything the header and body need. Hoisted out of the JSX
        // so the drawer's flex column has clean direct children
        // (header / scroll-body / footer) — wrapping these in an inline
        // IIFE Fragment between the flex container and its rows caused
        // the footer to drift on tall content.
        const drawerMonthKey = uploadDrawer.monthKey;
        const drawerMonthIdx = trackingMonths.findIndex(m => m.key === drawerMonthKey);
        const drawerMonthLabel = trackingMonths[drawerMonthIdx]?.label
          ?? new Date(drawerMonthKey + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        const isDrawerCurrent = drawerMonthKey === realCurrentMonthKey;
        const canPrev = drawerMonthIdx > 0;
        const canNext = drawerMonthIdx >= 0 && drawerMonthIdx < trackingMonths.length - 1;
        const goToMonth = (key: string) => {
          if (uploadDrawer) setUploadDrawer({ ...uploadDrawer, monthKey: key });
        };
        return (
        <>
          {/* Backdrop — stacks ABOVE the global nav (z-[9998] vs nav's
              z-50) so the dimmer covers the entire viewport and the nav
              recedes behind the modal context, matching every other
              drawer in the app. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={() => setUploadDrawer(null)} onKeyDown={(e) => { if (e.key === 'Escape') setUploadDrawer(null); }} />
          {/* Drawer — full viewport height, sitting at z-[9999] so it
              paints over the global nav too. 560px shell gives each
              file row breathing room. */}
          {/* Drawer — single `overflow-y-auto` scroll container. The
              inner wrapper uses `min-h-screen flex flex-col` so the
              footer is naturally pushed to the bottom when content is
              short, and `sticky top-0` / `sticky bottom-0` pin the
              header and footer when content is long. No flex math runs
              against the drawer's height — it's just a regular scroll
              region with two sticky overlays. */}
          <div
            ref={uploadDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-drawer-title"
            tabIndex={-1}
            className="animate-drawer-in fixed top-0 right-0 bottom-0 w-[640px] max-w-[92vw] bg-[#FAFBFC] z-[9999] shadow-2xl overflow-y-auto focus:outline-none"
          >
          <div className="min-h-screen flex flex-col">
            {/* ═══ Drawer header — REDESIGNED for clarity ═══
                Two clean rows of information separated by a soft divider:
                  Row 1: Client identity + close
                  Row 2: Month navigator + status pill (Current / Uploaded on date)
                  Row 3: Progress strip (only when there's something to show)
                Sticky-pinned to the top of the scroll container. */}
            <div className="sticky top-0 z-20 bg-gradient-to-br from-[#3B82F6] to-[#204CC7] text-white shadow-[0_2px_12px_-4px_rgba(15,29,77,0.4)]">
              {/* Row 1 — identity */}
              <div className="px-7 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-h3 font-bold shrink-0" aria-hidden="true">
                    {uploadDrawer.clientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/75 text-[11px] font-semibold uppercase tracking-[0.08em] leading-none">Upload financial data</p>
                    <h3 id="upload-drawer-title" className="text-h2 font-bold text-white truncate mt-1.5">{uploadDrawer.clientName}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setUploadDrawer(null)}
                  className="w-9 h-9 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-label="Close upload drawer"
                >
                  <X className="w-[18px] h-[18px] text-white" aria-hidden="true" />
                </button>
              </div>

              {/* Row 2 — month navigator + status. The status pill is the
                  most important affordance for historical months: it tells
                  the user *when* this month's books were last touched. */}
              {(() => {
                const count = getClientUploadCount(uploadStore, uploadDrawer.clientId, uploadDrawer.reportIndex, drawerMonthKey);
                const total = FINANCIAL_FILE_TYPES.length;
                const pct = Math.round((count / total) * 100);
                const latestIso = getLatestUploadAt(uploadStore, uploadDrawer.clientId, uploadDrawer.reportIndex, drawerMonthKey);
                const latestStamp = latestIso ? formatUploadStamp(latestIso) : null;
                // Who touched this month last (and how many distinct
                // contributors). Surfaces as the "Uploaded by:" tag
                // so the admin can see — at a glance — which
                // teammate is responsible for the latest version.
                const { latest: latestBy, uniqueCount: uploaderCount } =
                  getUploadContributors(uploadStore, uploadDrawer.clientId, uploadDrawer.reportIndex, drawerMonthKey);

                // Compute the right-side status pill copy based on
                // (current vs past) × (count state).
                let statusIcon: 'dot' | 'check' | 'warn' = 'dot';
                let statusText: string;
                if (isDrawerCurrent) {
                  if (count === 0) { statusText = 'Current month'; statusIcon = 'dot'; }
                  else if (count === total) { statusText = `Complete · last upload ${latestStamp}`; statusIcon = 'check'; }
                  else { statusText = `Last upload ${latestStamp}`; statusIcon = 'dot'; }
                } else {
                  // PAST MONTH — promote "Uploaded on …" prominently.
                  if (count === 0) { statusText = 'No data uploaded'; statusIcon = 'warn'; }
                  else if (count === total) { statusText = `Uploaded on ${latestStamp}`; statusIcon = 'check'; }
                  else { statusText = `${count}/${total} uploaded · last on ${latestStamp}`; statusIcon = 'warn'; }
                }

                return (
                  <>
                    <div className="px-7 pb-4 flex items-center justify-between gap-3 flex-wrap">
                      {/* Month navigator — Prev / chip / Next */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => canPrev && goToMonth(trackingMonths[drawerMonthIdx - 1].key)}
                          disabled={!canPrev}
                          aria-label="Previous month"
                          className="w-8 h-8 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-30 disabled:hover:bg-white/15 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          <ChevronLeft className="w-4 h-4 text-white" aria-hidden="true" />
                        </button>
                        <span className="px-3 py-1.5 rounded-md bg-white/15 text-caption font-semibold text-white tabular-nums">
                          {drawerMonthLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => canNext && goToMonth(trackingMonths[drawerMonthIdx + 1].key)}
                          disabled={!canNext}
                          aria-label="Next month"
                          className="w-8 h-8 rounded-md bg-white/15 hover:bg-white/25 disabled:opacity-30 disabled:hover:bg-white/15 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          <ChevronRight className="w-4 h-4 text-white" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Uploaded by pill — only renders when there's
                            at least one upload to attribute. When
                            multiple admins contributed, we surface the
                            most-recent uploader and append "+N others"
                            so the admin can tell whose work they're
                            looking at without opening individual file
                            cards. Sits to the LEFT of the status pill
                            to read as metadata for the timestamp. */}
                        {latestBy && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium bg-white/15 text-white/90"
                            aria-label={uploaderCount > 1
                              ? `Uploaded by ${latestBy} and ${uploaderCount - 1} other${uploaderCount - 1 > 1 ? 's' : ''}`
                              : `Uploaded by ${latestBy}`}
                          >
                            <UserIcon className="w-3.5 h-3.5 shrink-0 text-white/75" aria-hidden="true" />
                            <span className="text-white/70">Uploaded by:</span>
                            <span className="font-semibold text-white">{latestBy}</span>
                            {uploaderCount > 1 && (
                              <span className="text-white/65">+{uploaderCount - 1} other{uploaderCount - 1 > 1 ? 's' : ''}</span>
                            )}
                          </span>
                        )}

                        {/* Status pill — surfaces "Uploaded on <date>" for
                            past months and "Last upload <date>" for the
                            current one. Color encodes state (check=green,
                            warn=amber, dot=neutral white). */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium tabular-nums ${
                          statusIcon === 'check' ? 'bg-[#00C875]/25 text-white'
                          : statusIcon === 'warn' ? 'bg-[#FDAB3D]/25 text-white'
                          : 'bg-white/15 text-white/90'
                        }`}>
                          {statusIcon === 'check' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                          {statusIcon === 'warn' && <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                          {statusIcon === 'dot' && <span className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" aria-hidden="true" />}
                          {statusText}
                        </span>
                      </div>
                    </div>

                    {/* Row 3 — progress bar. Compact, inside header so it
                        scrolls with it (header is sticky, so it pins as
                        one unit). */}
                    <div className="px-7 pb-5">
                      <div
                        className="h-1.5 rounded-full bg-white/15 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={count}
                        aria-valuemin={0}
                        aria-valuemax={total}
                        aria-valuetext={count === total ? `All ${total} files uploaded` : `${count} of ${total} files uploaded`}
                        aria-label="Upload progress"
                      >
                        <div
                          className="h-full rounded-full bg-white transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* File slots — each slot is a versioned card. Empty slots
                are large click-to-upload labels (full row is the hit
                target). Uploaded slots show the *current* version's
                metadata inline + replace/remove controls; a "Show
                history" toggle reveals all archived versions with a
                Restore action so corrections never destroy data. */}
            <div className="flex-1 px-7 py-5 space-y-2.5">
              {/* Live region for upload status announcements */}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {uploadingType && `Uploading ${FINANCIAL_FILE_TYPES.find(f => f.key === uploadingType)?.label} file`}
              </div>
              {FINANCIAL_FILE_TYPES.map((ft) => {
                const key = getUploadKey(uploadDrawer.clientId, uploadDrawer.reportIndex, ft.key, drawerMonthKey);
                const slot = uploadStore[key];
                const isUploading = uploadingType === ft.key;
                const historyOpen = expandedHistory.has(ft.key);

                // Uploaded state — solid white card showing the current
                // version + an optional history list of archived versions.
                if (slot) {
                  const v = slot.current;
                  const hasHistory = slot.history.length > 0;
                  return (
                    <div key={ft.key} className="group rounded-xl border border-[#00C875]/25 bg-white hover:shadow-sm transition-all overflow-hidden">
                      <div className="px-4 py-3.5 flex items-center gap-3.5 min-h-[88px]">
                        <div className="w-10 h-10 rounded-lg bg-[#00C875]/[0.1] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined select-none" aria-hidden="true" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20", color: '#0A8F5E' }}>{ft.materialIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-body font-semibold text-black/85">{ft.label}</p>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00C875] shrink-0" aria-label="Uploaded" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <FileSpreadsheet className="w-3 h-3 text-black/40 shrink-0" aria-hidden="true" />
                            <p className="text-caption text-black/60 truncate">{v.name}</p>
                            <span className="text-caption text-black/30" aria-hidden="true">·</span>
                            <span className="text-caption text-black/55 shrink-0 tabular-nums">{formatFileSize(v.size)}</span>
                          </div>
                          <p className="text-caption text-black/45 mt-0.5">
                            By <span className="font-medium text-black/65">{v.uploadedBy}</span> ·{' '}
                            <span className="text-black/60 tabular-nums" title={relativeTime(v.uploadedAt)}>{v.uploadedAtLabel}</span>
                            {hasHistory && (
                              <>
                                {' · '}
                                <button
                                  type="button"
                                  onClick={() => toggleHistory(ft.key)}
                                  className="text-[#204CC7] hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded"
                                  aria-expanded={historyOpen}
                                >
                                  {historyOpen ? 'Hide history' : `Show history (${slot.history.length})`}
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <label className="w-8 h-8 rounded-md text-black/55 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.08] cursor-pointer transition-all flex items-center justify-center focus-within:ring-2 focus-within:ring-[#204CC7]/30">
                            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              className="sr-only"
                              aria-label={`Replace ${ft.label} file (creates a new version)`}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(uploadDrawer.clientId, uploadDrawer.reportIndex, ft.key, f, drawerMonthKey);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button onClick={() => removeUpload(uploadDrawer.clientId, uploadDrawer.reportIndex, ft.key, drawerMonthKey)} className="w-8 h-8 rounded-md text-black/55 hover:text-[#E2445C] hover:bg-[#E2445C]/[0.08] transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/30" aria-label={hasHistory ? `Remove current version of ${ft.label} (previous version will be restored)` : `Remove ${ft.label} file`}>
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* Version history — newest archived first.
                          Each row offers Restore (promote back to
                          current). Audit trail preserved permanently. */}
                      {historyOpen && hasHistory && (
                        <ul className="border-t border-black/[0.06] bg-[#FAFBFC] divide-y divide-black/[0.04]">
                          {slot.history.map((hv) => (
                            <li key={hv.id} className="px-4 py-2.5 pl-[68px] flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <FileSpreadsheet className="w-3 h-3 text-black/35 shrink-0" aria-hidden="true" />
                                  <p className="text-caption text-black/65 truncate">{hv.name}</p>
                                  <span className="text-caption text-black/25" aria-hidden="true">·</span>
                                  <span className="text-caption text-black/45 shrink-0 tabular-nums">{formatFileSize(hv.size)}</span>
                                </div>
                                <p className="text-caption text-black/45 mt-0.5">
                                  By <span className="font-medium text-black/60">{hv.uploadedBy}</span> ·{' '}
                                  <span className="text-black/55 tabular-nums" title={relativeTime(hv.uploadedAt)}>{hv.uploadedAtLabel}</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => restoreVersion(uploadDrawer.clientId, uploadDrawer.reportIndex, ft.key, drawerMonthKey, hv.id)}
                                className="px-2.5 py-1 rounded-md text-caption font-semibold text-[#204CC7] bg-[#204CC7]/[0.08] hover:bg-[#204CC7]/[0.14] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                              >
                                Restore
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                }

                // Uploading state — spinner pinned to the right while
                // the rest of the row stays calm so the layout doesn't
                // shift between empty and uploaded.
                if (isUploading) {
                  return (
                    <div key={ft.key} className="rounded-xl border border-[#204CC7]/25 bg-white">
                      <div className="px-4 py-3.5 flex items-center gap-3.5 min-h-[88px]">
                        <div className="w-10 h-10 rounded-lg bg-[#204CC7]/[0.08] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined select-none" aria-hidden="true" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20", color: '#204CC7' }}>{ft.materialIcon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-black/85">{ft.label}</p>
                          <p className="text-caption text-[#204CC7] mt-0.5" role="status">Uploading…</p>
                        </div>
                        <RefreshCw className="w-4 h-4 text-[#204CC7] animate-spin shrink-0" aria-hidden="true" />
                      </div>
                    </div>
                  );
                }

                // Empty state — the whole row is a `<label>` so anywhere
                // the user clicks (icon, text, anywhere) opens the file
                // dialog.
                return (
                  <label
                    key={ft.key}
                    className="group cursor-pointer block rounded-xl border border-dashed border-black/30 bg-white hover:border-[#204CC7]/50 hover:bg-[#204CC7]/[0.025] hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#204CC7]/30 focus-within:border-[#204CC7]/50"
                  >
                    <div className="px-4 py-3.5 flex items-center gap-3.5 min-h-[88px]">
                      <div className="w-10 h-10 rounded-lg bg-black/[0.04] group-hover:bg-[#204CC7]/[0.08] flex items-center justify-center shrink-0 transition-colors">
                        <span className="material-symbols-outlined select-none transition-colors" aria-hidden="true" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20", color: 'currentColor' }}>{ft.materialIcon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-black/85">{ft.label}</p>
                        <p className="text-caption text-black/55 mt-0.5">{ft.description}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-caption font-semibold text-[#204CC7] bg-[#204CC7]/[0.08] group-hover:bg-[#204CC7]/[0.14] shrink-0 transition-colors" aria-hidden="true">
                        <Upload className="w-3.5 h-3.5" />
                        Upload
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="sr-only"
                      aria-label={`Upload ${ft.label} file from computer for ${drawerMonthLabel}`}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(uploadDrawer.clientId, uploadDrawer.reportIndex, ft.key, f, drawerMonthKey);
                        e.target.value = '';
                      }}
                    />
                  </label>
                );
              })}
            </div>

            {/* ═══ Drawer footer — sticky to the bottom edge ═══
                Pinned via `sticky bottom-0` against the drawer's scroll
                container. Because the body wrapper is flex-1 inside a
                min-h-screen flex column, the footer is naturally pushed
                to the viewport bottom even when the body has very few
                cards. The Upload CTA closes the drawer; the underlying
                client dashboard reads the same `uploadStore` state, so
                the table refreshes immediately on close. */}
            <div className="sticky bottom-0 z-20 bg-white border-t border-black/[0.08] shadow-[0_-2px_12px_-4px_rgba(15,29,77,0.08)]">
              <div className="px-7 py-3 flex items-center justify-center gap-1.5 border-b border-black/[0.04]">
                <FileSpreadsheet className="w-3 h-3 text-black/40" aria-hidden="true" />
                <p className="text-[12px] text-black/50">Accepted formats: .xlsx · .xls · .csv</p>
              </div>
              {(() => {
                const count = getClientUploadCount(uploadStore, uploadDrawer.clientId, uploadDrawer.reportIndex, drawerMonthKey);
                const total = FINANCIAL_FILE_TYPES.length;
                const noChanges = count === 0;
                return (
                  <div className="px-7 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-black/85 tabular-nums">
                        {count} of {total} files uploaded
                      </p>
                      <p className="text-caption text-black/55 mt-0.5">
                        {noChanges
                          ? 'Upload at least one file to update the dashboard'
                          : count === total ? 'All required files ready to publish'
                          : `${total - count} file${total - count === 1 ? '' : 's'} still pending`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadDrawer(null)}
                      disabled={noChanges}
                      className="inline-flex items-center gap-2 px-5 h-10 rounded-md bg-[#204CC7] hover:bg-[#1A3FA8] active:bg-[#163289] disabled:bg-[#204CC7]/30 disabled:cursor-not-allowed text-white text-body font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 focus-visible:ring-offset-2 shrink-0"
                    >
                      <Upload className="w-4 h-4" aria-hidden="true" />
                      Update dashboard
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
          </div>
        </>
        );
      })()}

    </div>
  );
}
