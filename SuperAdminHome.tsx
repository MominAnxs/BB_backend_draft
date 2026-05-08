'use client';

/**
 * Super Admin Home — the role-preview view rendered by Dashboard when the
 * user picks "Super Admin" in the Viewing-as toggle.
 *
 * Each tab in the left sidebar mirrors a screen elsewhere in the app, *byte-
 * for-byte*:
 *   - Reports                →  /adminland/reports                  (shared chrome + Overview)
 *   - Customers              →  /adminland/customers                (CustomersOverview)
 *   - Employees              →  /adminland/employees-overview       (EmployeesOverview)
 *   - Performance Marketing  →  /workspace/performance-marketing    (PerformanceMarketing)
 *   - Accounts & Taxation    →  /workspace/accounts-taxation        (AccountsTaxation)
 *
 * The main content wrapper is conditional per-tab so the embedded screen
 * matches its native home exactly:
 *   - Adminland tabs (reports/customers/employees) → `px-6 pt-6 pb-8`
 *     (Adminland's contract — the Overview components bleed `-mx-6 -mt-6`).
 *   - Workspace tabs (PM / A&T) → `px-8 pt-6 pb-6` with `min-w-0`
 *     (matches `app/workspace/layout.tsx` so the modules render identically
 *     to what the user sees at /workspace/performance-marketing and
 *     /workspace/accounts-taxation).
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3, Users, UserCircle2, Megaphone, FileText,
  ChevronDown, Eye, Check,
  AlertCircle, ArrowDownToLine, AlertTriangle, UserPlus,
} from 'lucide-react';
import { Overview } from '@/Overview';
import { CustomersOverview } from '@/CustomersOverview';
import { EmployeesOverview } from '@/EmployeesOverview';
import { PerformanceMarketing } from '@/workspace/PerformanceMarketing';
import { PerformanceMarketingHome } from '@/PerformanceMarketingHome';
import { AccountsTaxation } from '@/workspace/AccountsTaxation';
import { AccountsTaxationHome } from '@/AccountsTaxationHome';
import { KingAndQueen } from '@/workspace/KingAndQueen';
import { AtActivityPage } from '@/AtActivityDrawer';
import {
  TdsListView,
  GstListView,
  PtListView,
  IncomeTaxListView,
  EcomRecoListView,
} from '@/workspace/AtComplianceLists';
import {
  DatabaseEmployeesPage,
  DatabaseResourceRequestPage,
} from '@/adminland/Database';
// All Customers — client-grouped list + dedicated client detail page.
// Replaces the legacy DatabaseCustomersPage drawer pattern with one
// row per client (across multiple businesses) and a real page-level
// detail surface keyed on `?client=<id>`.
import { CustomersByClient } from '@/adminland/CustomersByClient';
// Customers sub-tab content moved out of the Adminland Customers group.
import { CLAClients } from '@/adminland/CLAClients';
import { LostClients } from '@/adminland/LostClients';
import { IncidentData } from '@/adminland/IncidentData';
import { FeedbackData } from '@/adminland/FeedbackData';
import { ClientRelationshipData } from '@/adminland/ClientRelationshipData';
import { OnboardingModule } from '@/adminland/OnboardingModule';
import { BillingDirectory } from '@/adminland/BillingDirectory';
// Employees sub-tab content moved out of the Adminland Employees group.
import { EmployeeCLA } from '@/adminland/EmployeeCLA';
import { EmployeeIncoming } from '@/adminland/EmployeeIncoming';
import {
  ReportsChrome,
  reportTabs,
  type ReportsDateRange,
  type ReportsDepartment,
} from '@/components/reports-chrome';

// ═══════════════════════════════════════════════════════════════════
// REPORTS TAB — uses the shared Adminland chrome + Overview component
// so the Reports view here is byte-identical to /adminland/reports.
// ═══════════════════════════════════════════════════════════════════

function ReportsTab() {
  const router = useRouter();
  // Top-bar date range defaults to YTD — operators landing on the
  // Overview tab want the running year-to-date view of the business
  // first (revenue trend, attrition, growth) rather than just the
  // current month's slice. The dropdown still flips to MTD / QTD / a
  // specific quarter for narrower reads.
  const [globalDateRange, setGlobalDateRange] = useState<ReportsDateRange>('ytd');
  const [globalDepartment, setGlobalDepartment] = useState<ReportsDepartment>('All');

  // Switching to any non-overview tab from Home routes into Adminland
  // where those reports live — keeps behavior consistent with the
  // Adminland layout's tab switcher.
  const handleTabChange = (tabId: string) => {
    if (tabId === 'overview') return; // already showing Overview
    const tab = reportTabs.find((t) => t.id === tabId);
    if (tab) router.push(tab.href);
  };

  const handleHRSectionChange = (sectionKey: string) => {
    router.push(`/adminland/reports/hr-reports?section=${sectionKey}`);
  };

  return (
    <ReportsChrome
      activeTab="overview"
      onTabChange={handleTabChange}
      onHRSectionChange={handleHRSectionChange}
      globalDateRange={globalDateRange}
      onDateRangeChange={setGlobalDateRange}
      globalDepartment={globalDepartment}
      onDepartmentChange={setGlobalDepartment}
      // Super Admin Home top bar drops the Department filter and the
      // Report-view (Overview / Growth / ...) switcher — the left sidebar
      // already owns navigation, and department filtering isn't meaningful
      // on the consolidated Home view. /adminland/reports is unaffected.
      hideDepartmentFilter
      hideViewSwitcher
    >
      <Overview globalDateRange={globalDateRange} globalDepartment={globalDepartment} />
    </ReportsChrome>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-TAB TOP BAR — visual parity with CustomersOverview / EmployeesOverview
// ═══════════════════════════════════════════════════════════════════

/**
 * Lightweight top-bar wrapper used for the non-Overview sub-tabs of the
 * Customers and Employees sections (All Customers, Incidents, Feedbacks,
 * All Employees, Resource Request, etc.). Several of those sub-tab
 * components were lifted out of Adminland — where they ran inside their
 * own page chrome — and lack the title/subtitle bar that the rest of the
 * Home module establishes. This wrapper restores that consistency without
 * touching the embedded components themselves.
 *
 * It mirrors the chrome on CustomersOverview exactly: white background,
 * sticky to the top, `-mx-6 -mt-6 px-6 mb-6` bleed so it spans the full
 * width of the main content padding, title (text-body semibold) +
 * subtitle (text-caption normal). No date-range filter — these pages are
 * roster / list views, not metric dashboards, so a date control would
 * misrepresent the page.
 */
function SubTabTopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
      <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
        <div className="shrink-0">
          <p className="text-black/90 text-body font-semibold">{title}</p>
          <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// Top-bar copy for Customers sub-tabs that don't ship their own chrome.
// As of the unified-chrome migration, every Customers sub-tab component
// (DatabaseCustomersPage, CLAClients, LostClients, IncidentData,
// FeedbackData, ClientRelationshipData, OnboardingModule) now renders
// its own sticky page top-bar with title + subtitle + page controls,
// so this record is empty. Kept around as a typed seam in case a future
// Customers sub-tab lands without its own chrome and needs the parent
// SubTabTopBar wrapper to provide it.
const CUSTOMERS_TOPBAR_META: Partial<Record<CustomersSubTab, { title: string; subtitle: string }>> = {};

// Top-bar copy for Employees sub-tabs that don't ship their own chrome.
// As of the unified-chrome migration, every Employees sub-tab component
// (DatabaseEmployeesPage, EmployeeCLA, EmployeeIncoming, and now
// DatabaseResourceRequestPage) renders its own sticky page top-bar with
// title + subtitle + page controls, so this record is empty. Kept around
// as a typed seam in case a future Employees sub-tab lands without its
// own chrome and needs the parent SubTabTopBar wrapper to provide it.
const EMPLOYEES_TOPBAR_META: Partial<Record<EmployeesSubTab, { title: string; subtitle: string }>> = {};

// ═══════════════════════════════════════════════════════════════════
// MAIN: ADMINLAND-STYLE LAYOUT WITH LEFT NAV
// ═══════════════════════════════════════════════════════════════════

type SuperAdminTab =
  | 'reports'
  | 'customers'
  | 'employees'
  | 'performance-marketing'
  | 'accounts-taxation';

// Sub-tabs across the two service workspaces (PM and A&T).
//   - overview     → executive Super-Admin overview (KpiCards + drawers)
//   - deliverables → existing service-workspace screen (clients table etc.)
//   - king-queen   → A&T-only annual compliance roll-up (GSTR-9, ITR,
//                    audit, advance tax, ROC, etc.). Not rendered on PM.
//   - activity     → A&T-only activity log (Recurring Checklist + King &
//                    Queen + Onboarding + Workspace). Full screen, lives
//                    as a peer of Overview so it has room to breathe.
// Default is overview; the bare `?tab=performance-marketing` and
// `?tab=accounts-taxation` URLs both land here so existing deep links keep
// working. Tabs that don't have sub-navigation (Reports / Customers /
// Employees) ignore the `sub` param entirely.
type ServiceSubTab =
  | 'overview'
  | 'deliverables'
  | 'tds'
  | 'gst'
  | 'ptrc-ptec'
  | 'income-tax'
  | 'ecom-reco'
  | 'king-queen'
  | 'activity';

const isServiceSubTab = (v: string | null): v is ServiceSubTab =>
     v === 'overview'
  || v === 'deliverables'
  || v === 'tds'
  || v === 'gst'
  || v === 'ptrc-ptec'
  || v === 'income-tax'
  || v === 'ecom-reco'
  || v === 'king-queen'
  || v === 'activity';

// Tabs that use the service sub-tab pattern.
const SERVICE_TABS: ReadonlySet<SuperAdminTab> = new Set([
  'performance-marketing',
  'accounts-taxation',
]);

// Employees sub-tabs — Overview (default) plus the operational pages
// migrated from the Adminland Employees group (CLA/NTF, Incoming) and
// the now-retired Database dropdown (All Employees, Resource Request).
type EmployeesSubTab =
  | 'overview'
  | 'all-employees'
  | 'past-employees'
  | 'cla-ntf'
  | 'incoming'
  | 'incidents'
  | 'resource-requests';

const EMPLOYEES_SUB_TABS: ReadonlySet<EmployeesSubTab> = new Set([
  'overview', 'all-employees', 'past-employees', 'cla-ntf', 'incoming', 'incidents', 'resource-requests',
]);

const isEmployeesSubTab = (v: string | null): v is EmployeesSubTab =>
  v != null && EMPLOYEES_SUB_TABS.has(v as EmployeesSubTab);

// Customers sub-tabs — Overview (the executive KPI grid, default) +
// the directory-style and operational pages that used to live under
// the Adminland Customers group (All Customers, CLAs, Lost Clients,
// Incidents, Feedbacks, Relationships, Onboarding).
type CustomersSubTab =
  | 'overview'
  | 'all-customers'
  | 'cla'
  | 'lost-clients'
  | 'incidents'
  | 'feedbacks'
  | 'relationships'
  | 'onboarding'
  | 'billing';

const CUSTOMERS_SUB_TABS: ReadonlySet<CustomersSubTab> = new Set([
  'overview', 'all-customers', 'cla', 'lost-clients',
  'incidents', 'feedbacks', 'relationships', 'onboarding', 'billing',
]);

const isCustomersSubTab = (v: string | null): v is CustomersSubTab =>
  v != null && CUSTOMERS_SUB_TABS.has(v as CustomersSubTab);

// App Router link constants for Super Admin Home tabs + PM sub-tabs.
// Defined in `lib/super-admin-home-routes.ts` (a leaf module, no React
// imports) to avoid a circular dependency with PerformanceMarketingHome,
// which is imported lower in this file. Re-exported here so existing
// `import { SUPER_ADMIN_HOME_ROUTES } from '@/SuperAdminHome'` callers
// keep working — but new callers should prefer the leaf import:
//   import { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';
export { SUPER_ADMIN_HOME_ROUTES } from '@/lib/super-admin-home-routes';
import { LEGACY_HOME_SLUG_REDIRECTS } from '@/lib/super-admin-home-routes';

// (WORKSPACE_TABS removed — its membership was identical to SERVICE_TABS
// declared above. Both PM and A&T are workspace-style tabs *and* service
// sub-tab tabs, so one set covers both concerns.)

export interface SuperAdminHomeProps {
  /** Currently selected role across the role-preview toggle. */
  activeRole: string;
  /** Called when the user picks a different role from the sidebar dropdown. */
  onRoleChange: (role: string) => void;
  /** Available roles for the preview toggle. */
  roleOptions: readonly { value: string; label: string }[];
}

// Tabs are now URL-driven via App Router search params:
//   /home                              → Reports (default)
//   /home?tab=customers                → Customers
//   /home?tab=employees                → Employees
//   /home?tab=performance-marketing    → PM workspace
//   /home?tab=accounts-taxation        → A&T workspace
// This buys back/forward navigation, deep-linking, and shareable URLs
// without restructuring Dashboard's role-preview wrapper.
const isSuperAdminTab = (v: string | null): v is SuperAdminTab =>
  v === 'reports' ||
  v === 'customers' ||
  v === 'employees' ||
  v === 'performance-marketing' ||
  v === 'accounts-taxation';

export function SuperAdminHome({ activeRole, onRoleChange, roleOptions }: SuperAdminHomeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const subParam = searchParams.get('sub');

  // ── URL hygiene ──
  // Cleans up the home-page URL on mount so the address bar always
  // reads as the canonical, minimal form. Three rules apply:
  //
  //   1. Legacy slug rewrites — old slugs (`pt`, `resource-request`,
  //      `thisWeek`) hop to their canonical replacements declared in
  //      `LEGACY_HOME_SLUG_REDIRECTS`.
  //
  //   2. Default sub stripping — `sub=overview` is the default for
  //      every tab that has an overview, so we drop it. The bare
  //      `?tab=customers` URL is canonical; `?tab=customers&sub=
  //      overview` is the same page expressed redundantly.
  //
  //   3. Invalid sub stripping — if a `sub` param doesn't belong to
  //      the active tab (e.g. `?tab=employees&sub=deliverables`),
  //      we drop it. This catches malformed bookmarks, manual
  //      typos, and stale links from before a tab was renamed. The
  //      page already falls back to the tab's overview when the
  //      sub doesn't validate; we just make the URL match what's
  //      actually rendered.
  //
  // Same logic for `view=` — the param only means something on
  // `?tab=accounts-taxation&sub=deliverables`, so strip it
  // elsewhere.
  //
  // The replacement uses router.replace so the user's bookmark still
  // works, the address bar updates to the canonical URL, and no
  // extra browser back-stack entry is added.
  const legacyRedirectRouter = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = new URLSearchParams(searchParams.toString());
    let changed = false;

    // 1. Legacy slug rewrites
    for (const rule of LEGACY_HOME_SLUG_REDIRECTS) {
      if (next.get(rule.match.key) === rule.match.value) {
        next.set(rule.match.key, rule.replaceWith);
        changed = true;
      }
    }

    // 2. + 3. Param hygiene — `sub` and `view` cleanup keyed on the
    // active tab. We resolve the tab from the (possibly already
    // rewritten) `tab` param so this runs after step 1.
    const tab = next.get('tab');
    const sub = next.get('sub');
    const view = next.get('view');
    const isCustomersTab = tab === 'customers';
    const isEmployeesTab = tab === 'employees';
    const isServiceTab   = tab === 'performance-marketing' || tab === 'accounts-taxation';

    // `sub` must validate against the right namespace for the tab.
    // If it's invalid OR equal to the default ('overview'), drop it.
    if (sub) {
      const subBelongs =
        (isCustomersTab && isCustomersSubTab(sub)) ||
        (isEmployeesTab && isEmployeesSubTab(sub)) ||
        (isServiceTab   && isServiceSubTab(sub));
      const isDefault = sub === 'overview';
      if (!subBelongs || isDefault) {
        next.delete('sub');
        changed = true;
      }
    }

    // `view` is only meaningful on the A&T deliverables sub-tab
    // (Overdue / Due-this-week triage drilldowns). On any other
    // tab+sub combination, the param is orphaned — strip it.
    if (view && !(tab === 'accounts-taxation' && next.get('sub') === 'deliverables')) {
      next.delete('view');
      changed = true;
    }

    // `client` is only meaningful on customers/all-customers (client
    // detail page), customers/billing (bank-statement detail), and
    // accounts-taxation/deliverables (per-business detail). Anywhere
    // else, drop it.
    const client = next.get('client');
    if (client) {
      const onCustomersAll     = tab === 'customers' && next.get('sub') === 'all-customers';
      const onCustomersBilling = tab === 'customers' && next.get('sub') === 'billing';
      const onAtDeliverables   = tab === 'accounts-taxation' && next.get('sub') === 'deliverables';
      if (!onCustomersAll && !onCustomersBilling && !onAtDeliverables) {
        next.delete('client');
        // The A&T deliverables uses a paired `business` param; if
        // we're stripping client outside that context, drop it too.
        next.delete('business');
        changed = true;
      }
    }

    if (changed) {
      const qs = next.toString();
      legacyRedirectRouter.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [pathname, searchParams, legacyRedirectRouter]);
  // Default tab depends on role:
  //   • Super Admin → Business Overview (firm-wide financial read)
  //   • HOD         → A&T (their primary service line)
  //   • Manager     → Customers (lands on CLAs — their personal
  //                    operational front door, since they don't see
  //                    the holistic All Customers list)
  //   • Executive   → Customers (same rationale as Manager)
  //   • HR          → Employees (the only tab in their view)
  // Other roles fall through to Business Overview as a safe default.
  const isHodRole       = activeRole === 'hod';
  const isHrRole        = activeRole === 'hr';
  const isManagerRole   = activeRole === 'manager';
  const isExecutiveRole = activeRole === 'executive';
  // "Personal-scope" roles share the same chrome and routing rules
  // as HOD; they just see a smaller filtered roster (the engagements
  // where the previewed person sits on the team).
  const isTeamScopedRole = isManagerRole || isExecutiveRole;
  const defaultTab: SuperAdminTab =
    isHodRole         ? 'accounts-taxation'
    : isTeamScopedRole ? 'customers'
    : isHrRole         ? 'employees'
                       : 'reports';
  const activeTab: SuperAdminTab = isSuperAdminTab(tabParam) ? tabParam : defaultTab;

  // Service sub-tab — only meaningful when activeTab is a service tab
  // (PM or A&T). Defaults to 'overview' so the bare `?tab=…` URLs land on
  // the executive Overview screen instead of the workspace-style Deliverables.
  const activeServiceSub: ServiceSubTab =
    SERVICE_TABS.has(activeTab) && isServiceSubTab(subParam) ? subParam : 'overview';

  // Customers sub-tab — only meaningful when activeTab is 'customers'.
  // Super Admin defaults to the executive 'overview' KPI grid (their
  // dashboard read); HOD / Manager / Executive skip that and land on
  // 'cla' — the CLA list is the operational front door for the
  // Customers section: clients flagged for special attention, the
  // page admins open first when a customer goes off the rails.
  const customersDefaultSub: CustomersSubTab =
    (isHodRole || isTeamScopedRole) ? 'cla' : 'overview';
  const activeCustomersSub: CustomersSubTab =
    activeTab === 'customers' && isCustomersSubTab(subParam) ? subParam : customersDefaultSub;

  // Employees sub-tab — only meaningful when activeTab is 'employees'.
  // Defaults to 'overview' so bare `?tab=employees` lands on the KPI
  // grid; the four operational pages sit one click away.
  const activeEmployeesSub: EmployeesSubTab =
    activeTab === 'employees' && isEmployeesSubTab(subParam) ? subParam : 'overview';

  // Tabs that own a `sub=` URL param. Anything else drops it on switch.
  const TABS_WITH_SUB = new Set<SuperAdminTab>([
    'performance-marketing', 'accounts-taxation', 'customers', 'employees',
  ]);

  // Build a tab href that preserves any unrelated query params and omits
  // `?tab=reports` so the default landing URL stays the bare `/home`.
  // Switching to a tab without sub-nav also drops the `sub` param.
  const tabHref = (tabId: SuperAdminTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === 'reports') params.delete('tab');
    else params.set('tab', tabId);
    if (!TABS_WITH_SUB.has(tabId)) params.delete('sub');
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // Build a service sub-tab href. Omits `sub=overview` so the default lands
  // on the bare `?tab=<service>` URL. Used for both PM and A&T sub-nav.
  const serviceSubHref = (serviceTab: SuperAdminTab, sub: ServiceSubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', serviceTab);
    if (sub === 'overview') params.delete('sub');
    else params.set('sub', sub);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // Build a customers sub-tab href. Omits `sub=overview` so the default
  // lands on the bare `?tab=customers` URL.
  const customersSubHref = (sub: CustomersSubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'customers');
    if (sub === 'overview') params.delete('sub');
    else params.set('sub', sub);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  // Build an employees sub-tab href. Omits `sub=overview` so the default
  // lands on the bare `?tab=employees` URL.
  const employeesSubHref = (sub: EmployeesSubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'employees');
    if (sub === 'overview') params.delete('sub');
    else params.set('sub', sub);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  // Click-outside to close the role dropdown
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Per-role nav. Each role sees only the tabs that map to its
  // mental model of the business:
  //   • Super Admin → full nav (firm-wide read)
  //   • HOD        → A&T + Customers only; A&T is the landing tab
  //   • HR         → flat list of Employees sub-tabs as top-level
  //                  entries (Employees parent dropdown is hidden so
  //                  each operational page reads as a peer)
  // Tabs that aren't surfaced in the sidebar still keep their routes
  // and render branches so deep links from elsewhere in the app
  // continue to work.
  //
  // Each item carries an optional `sub` field. When set, the item
  // is rendered as a "flat" entry: it links directly to that
  // sub-tab's URL, doesn't show the chevron / nested sub-nav, and
  // its active state checks against the active sub-tab. HR uses
  // this to flatten the Employees sub-tabs into top-level entries.
  const isHod       = activeRole === 'hod';
  const isHr        = activeRole === 'hr';
  const isManager   = activeRole === 'manager';
  const isExecutive = activeRole === 'executive';
  // Personal-scope roles (Manager / Executive) share the HOD nav
  // shape and route everything through `forceManager` for filtering.
  const isPersonalScope = isManager || isExecutive;
  // Mock identities used to scope the personal-scope previews. In
  // a real backend these would come from the session — the
  // logged-in employee's name. Picked names that appear on
  // multiple mock customers' team rosters so the filtered list
  // reads as a believable subset rather than empty.
  const PREVIEW_MANAGER_NAME   = 'Arjun Mehta';     // Sr. Manager · Performance Marketing
  const PREVIEW_EXECUTIVE_NAME = 'Ravi Kulkarni';   // Executive · Performance Marketing
  const previewTeamMemberName = isManager
    ? PREVIEW_MANAGER_NAME
    : isExecutive
      ? PREVIEW_EXECUTIVE_NAME
      : null;
  type NavItem = {
    id: SuperAdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    sub?: EmployeesSubTab | CustomersSubTab | ServiceSubTab;
  };
  const navItems: NavItem[] = isHr
    ? [
        // HR is people-ops only. Each Employees sub-tab is surfaced
        // as a peer top-level entry — no parent dropdown, no
        // chevron — so the operational pages read as the entire
        // nav rather than as children of an "Employees" container.
        // Order matches the dropdown order from the Super Admin /
        // HOD views so users moving between roles keep muscle memory.
        { id: 'employees', label: 'Overview',         icon: BarChart3,     sub: 'overview'         },
        { id: 'employees', label: 'All Employees',    icon: Users,         sub: 'all-employees'    },
        { id: 'employees', label: 'CLA / NTF',        icon: AlertCircle,   sub: 'cla-ntf'          },
        { id: 'employees', label: 'Incoming',         icon: ArrowDownToLine, sub: 'incoming'       },
        { id: 'employees', label: 'Incidents',        icon: AlertTriangle, sub: 'incidents'        },
        { id: 'employees', label: 'Resource Request', icon: UserPlus,      sub: 'resource-requests' },
      ]
    : (isHod || isPersonalScope)
      ? [
          // HOD, Manager, and Executive all share the same sidebar —
          // A&T + Customers. The three views differ only in the data
          // they see: HOD sees the full A&T book; Manager / Executive
          // see just the engagements where they sit on the team.
          // Same chrome, scoped data.
          { id: 'accounts-taxation', label: 'Accounts & Taxation', icon: FileText },
          { id: 'customers',         label: 'Customers',           icon: Users },
        ]
      : [
          { id: 'reports',                label: 'Business Overview',      icon: BarChart3 },
          { id: 'customers',              label: 'Customers',              icon: Users },
          { id: 'employees',              label: 'Employees',              icon: UserCircle2 },
          // Performance Marketing (`?tab=performance-marketing`) is
          // intentionally not surfaced in the sidebar — the route,
          // render branch, and PerformanceMarketingHome page all
          // stay so deep links continue to work; the nav just
          // doesn't advertise it.
          { id: 'accounts-taxation',      label: 'Accounts & Taxation',    icon: FileText },
        ];

  // Service sub-nav children — A&T carries one extra section
  // ("King & Queen") for the annual compliance roll-up; PM keeps the
  // shorter Overview · Deliverables list. The lookup is keyed by
  // service tab so each service renders only the sections that apply
  // to it. Order matches the URL convention.
  const serviceSubItemsByTab: Record<'performance-marketing' | 'accounts-taxation', { id: ServiceSubTab; label: string }[]> = {
    'performance-marketing': [
      { id: 'overview',     label: 'Overview' },
      { id: 'deliverables', label: 'Deliverables' },
    ],
    'accounts-taxation': [
      { id: 'overview',     label: 'Overview' },
      { id: 'deliverables', label: 'Recurring Checklist' },
      // Holistic per-domain views — one row per (client × business),
      // each surfacing the credentials + return statuses of a single
      // compliance domain across the entire book. The HOD opens these
      // when the question is "who's still pending TDS this month?"
      // rather than "what's the state of this one client?". Order
      // mirrors the Recurring Checklist row 3-dots menu so users land
      // on the same mental model whether they drill in from a row or
      // pivot here from the sidebar.
      { id: 'tds',          label: 'TDS — Income Tax' },
      { id: 'gst',          label: 'GST'              },
      { id: 'ptrc-ptec',    label: 'PTRC / PTEC'      },
      { id: 'income-tax',   label: 'Income Tax'       },
      { id: 'ecom-reco',    label: 'E-Com Reco'       },
      // King & Queen (`?sub=king-queen`) and Activity (`?sub=activity`)
      // are intentionally not surfaced in the sidebar — they're
      // deep-link targets reached from the Overview (Activity pill on
      // the top bar; K&Q from related cards / activity entries). The
      // routes + render branches + pages all exist; the nav just
      // doesn't advertise them.
    ],
  };
  const serviceSubItems = SERVICE_TABS.has(activeTab)
    ? serviceSubItemsByTab[activeTab as 'performance-marketing' | 'accounts-taxation']
    : [];

  // Employees sub-nav children — Overview is the KPI grid; the rest
  // are the operational pages migrated from Adminland Employees + the
  // retired Database dropdown.
  const employeesSubItems: { id: EmployeesSubTab; label: string }[] = [
    { id: 'overview',         label: 'Overview' },
    { id: 'all-employees',    label: 'All Employees' },
    { id: 'cla-ntf',          label: 'CLA / NTF' },
    { id: 'incoming',         label: 'Incoming' },
    { id: 'incidents',        label: 'Incidents' },
    { id: 'resource-requests', label: 'Resource Request' },
  ];

  // Customers sub-nav children — All Customers sits at the top of
  // the operational stack (above CLAs) so the canonical roster is
  // always one click away. The default landing for HOD / Manager
  // still routes to CLAs (operational front door), but admins who
  // want to scan the full client list reach for "All Customers"
  // here. Super Admin keeps "Overview" at the top — that's the
  // executive KPI grid, a different read than the roster.
  // Three flavours of the Customers sub-nav:
  //   • Super Admin  → Overview + All Customers + operational facets
  //   • HOD          → All Customers + operational facets (no exec
  //                    Overview KPI grid; that's a Super-Admin read)
  //   • Manager /    → operational facets only — "All Customers" is
  //     Executive     hidden from the sidebar because their roster
  //                    is already scoped to engagements they're on,
  //                    so the holistic list isn't theirs to browse.
  //                    The route + render branch still exist so
  //                    deep-links continue to work; the nav just
  //                    doesn't advertise it.
  // Sub-tab ordering: Onboarding sits directly under All Customers
  // because the natural admin journey flows from "the full client
  // book" → "what's in flight onboarding into it" before fanning
  // out into the operational watchlists. Relationships sits next to
  // Incidents (active health signals) rather than at the bottom.
  // Exit Feedback follows as the post-mortem read on clients who
  // already left, and Billing & Subscriptions closes the section as
  // the standalone financial directory across all of the above.
  const customersSubItems: { id: CustomersSubTab; label: string }[] = isPersonalScope
    ? [
        { id: 'onboarding',    label: 'Onboarding' },
        { id: 'cla',           label: 'CLAs' },
        { id: 'lost-clients',  label: 'Lost Clients' },
        { id: 'incidents',     label: 'Incidents' },
        { id: 'relationships', label: 'Relationships' },
        { id: 'feedbacks',     label: 'Exit Feedback' },
        { id: 'billing',       label: 'Billing & Subscriptions' },
      ]
    : isHod
    ? [
        { id: 'all-customers', label: 'All Customers' },
        { id: 'onboarding',    label: 'Onboarding' },
        { id: 'cla',           label: 'CLAs' },
        { id: 'lost-clients',  label: 'Lost Clients' },
        { id: 'incidents',     label: 'Incidents' },
        { id: 'relationships', label: 'Relationships' },
        { id: 'feedbacks',     label: 'Exit Feedback' },
        { id: 'billing',       label: 'Billing & Subscriptions' },
      ]
    : [
        { id: 'overview',      label: 'Overview' },
        { id: 'all-customers', label: 'All Customers' },
        { id: 'onboarding',    label: 'Onboarding' },
        { id: 'cla',           label: 'CLAs' },
        { id: 'lost-clients',  label: 'Lost Clients' },
        { id: 'incidents',     label: 'Incidents' },
        { id: 'relationships', label: 'Relationships' },
        { id: 'feedbacks',     label: 'Exit Feedback' },
        { id: 'billing',       label: 'Billing & Subscriptions' },
      ];

  const activeRoleLabel = roleOptions.find(r => r.value === activeRole)?.label ?? 'Admin';

  return (
    <div className="flex h-[calc(100vh-53px)] bg-[#FAFBFC]">
      {/* Left Sidebar Navigation — mirrors app/workspace/layout.tsx for visual
          consistency across modules: 240px wide, px-3 py-5 outer padding,
          rounded-xl pill items with text-body font-medium and text-black/60 inactive. */}
      <aside
        className="w-[240px] bg-white border-r border-black/[0.06] px-3 py-5 flex-shrink-0"
        role="complementary"
        aria-label="Super Admin Home sidebar"
      >
        {/* Viewing-as role picker — sits on top of the nav, replaces the old top bar */}
        <div className="mb-5 relative px-1" ref={roleRef}>
          <button
            onClick={() => setRoleOpen(!roleOpen)}
            aria-expanded={roleOpen}
            aria-haspopup="listbox"
            aria-label="Switch dashboard role preview"
            className="w-full flex items-center justify-between gap-2 pl-3 pr-2.5 py-2 rounded-lg border border-dashed border-black/[0.15] bg-white hover:border-black/[0.25] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Eye className="w-3.5 h-3.5 text-black/35 group-hover:text-black/50 transition-colors shrink-0" aria-hidden="true" />
              <span className="text-caption font-semibold text-black/60 group-hover:text-black/75 transition-colors truncate">
                Viewing as <span className="text-[#204CC7]">{activeRoleLabel}</span>
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-black/35 transition-transform shrink-0 ${roleOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {roleOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-black/[0.08] shadow-lg shadow-black/[0.06] py-1.5 z-30"
              role="listbox"
              aria-label="Dashboard role options"
            >
              <p className="px-3.5 py-2 text-caption text-black/40 font-medium">Preview dashboard as</p>
              {roleOptions.map((role) => {
                const isActive = activeRole === role.value;
                return (
                  <button
                    key={role.value}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { onRoleChange(role.value); setRoleOpen(false); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                      isActive ? 'bg-[#204CC7]/[0.04]' : 'hover:bg-black/[0.02]'
                    }`}
                  >
                    <span className={`text-caption font-semibold ${isActive ? 'text-[#204CC7]' : 'text-black/70'}`}>{role.label}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Section header — mirrors workspace's "WORKSPACE" label pattern */}
        <div className="mb-3">
          <h2 className="text-micro font-semibold text-black/60 mb-3 px-3">HOME</h2>
        </div>

        <nav className="space-y-1" aria-label="Super Admin navigation">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            // Flat items (HR view) link straight to a sub-tab URL
            // and never expand sub-nav under themselves. Their
            // active state matches against both the tab AND the
            // sub-tab so only the right entry highlights when the
            // user navigates between them. Tabs without `sub` keep
            // the original parent + nested-sub-nav behaviour.
            const isFlat = item.sub != null;
            const flatHref =
              isFlat && item.id === 'employees'
                ? employeesSubHref(item.sub as EmployeesSubTab)
                : isFlat && item.id === 'customers'
                  ? customersSubHref(item.sub as CustomersSubTab)
                  : isFlat && SERVICE_TABS.has(item.id)
                    ? serviceSubHref(item.id, item.sub as ServiceSubTab)
                    : tabHref(item.id);
            const isActive = isFlat
              ? (activeTab === item.id && (
                  item.id === 'employees' ? activeEmployeesSub === item.sub
                  : item.id === 'customers' ? activeCustomersSub === item.sub
                  : SERVICE_TABS.has(item.id) ? activeServiceSub === item.sub
                  : false
                ))
              : activeTab === item.id;
            // Tabs with sub-navigation: Customers, Employees, PM and
            // A&T. Each renders its sub-items indented underneath
            // when active. Suppressed for flat items.
            const isService   = SERVICE_TABS.has(item.id);
            const isCustomers = item.id === 'customers';
            const isEmployees = item.id === 'employees';
            const hasSubNav   = !isFlat && (isService || isCustomers || isEmployees);
            // React keys need to be unique even when multiple flat
            // items share the same `id` (HR's flat list is all
            // 'employees'). Composite key prevents collision.
            const itemKey = isFlat ? `${item.id}:${item.sub}` : `${item.id}:${idx}`;
            return (
              <div key={itemKey}>
                <Link
                  href={flatHref}
                  scroll={false}
                  aria-current={isActive ? 'page' : undefined}
                  aria-expanded={hasSubNav ? isActive : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                    isActive
                      ? 'bg-[#EEF1FB] text-[#204CC7]'
                      : 'text-black/60 hover:text-black/90 hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap flex-1">{item.label}</span>
                  {/* Chevron — only on tabs with sub-nav (PM, A&T,
                      Database). Rotates 180° when the parent is active
                      and the sub-list is visible. Flat items skip
                      the chevron entirely. */}
                  {hasSubNav && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                        isActive ? 'rotate-180 text-[#204CC7]' : 'text-black/40'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </Link>
                {/* Nested sub-nav blocks only render for non-flat
                    parent tabs. HR's flattened Employees entries
                    are peer top-level items so they skip this. */}
                {/* Service sub-nav: only mounts when this service tab is
                    active so it doesn't add visual noise to other states.
                    Indented to sit visually under the parent's icon+label. */}
                {!isFlat && isService && isActive && (
                  <div
                    className="mt-1 ml-7 pl-2.5 border-l border-black/[0.06] space-y-0.5"
                    role="group"
                    aria-label={`${item.label} sections`}
                  >
                    {serviceSubItems.map((sub) => {
                      const isSubActive = activeServiceSub === sub.id;
                      return (
                        <Link
                          key={sub.id}
                          href={serviceSubHref(item.id, sub.id)}
                          scroll={false}
                          aria-current={isSubActive ? 'page' : undefined}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md transition-all text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                            isSubActive
                              ? 'bg-[#EEF1FB] text-[#204CC7]'
                              : 'text-black/55 hover:text-black/85 hover:bg-black/5'
                          }`}
                        >
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {/* Customers sub-nav: Overview · All Customers — same
                    indented pattern as services. */}
                {!isFlat && isCustomers && isActive && (
                  <div
                    className="mt-1 ml-7 pl-2.5 border-l border-black/[0.06] space-y-0.5"
                    role="group"
                    aria-label="Customers sections"
                  >
                    {customersSubItems.map((sub) => {
                      const isSubActive = activeCustomersSub === sub.id;
                      return (
                        <Link
                          key={sub.id}
                          href={customersSubHref(sub.id)}
                          scroll={false}
                          aria-current={isSubActive ? 'page' : undefined}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md transition-all text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                            isSubActive
                              ? 'bg-[#EEF1FB] text-[#204CC7]'
                              : 'text-black/55 hover:text-black/85 hover:bg-black/5'
                          }`}
                        >
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
                {/* Employees sub-nav: Overview · All Employees · CLA/NTF
                    · Incoming · Resource Request — same indented pattern. */}
                {!isFlat && isEmployees && isActive && (
                  <div
                    className="mt-1 ml-7 pl-2.5 border-l border-black/[0.06] space-y-0.5"
                    role="group"
                    aria-label="Employees sections"
                  >
                    {employeesSubItems.map((sub) => {
                      const isSubActive = activeEmployeesSub === sub.id;
                      return (
                        <Link
                          key={sub.id}
                          href={employeesSubHref(sub.id)}
                          scroll={false}
                          aria-current={isSubActive ? 'page' : undefined}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md transition-all text-caption font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                            isSubActive
                              ? 'bg-[#EEF1FB] text-[#204CC7]'
                              : 'text-black/55 hover:text-black/85 hover:bg-black/5'
                          }`}
                        >
                          <span className="whitespace-nowrap">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area — wrapper padding is conditional per tab so
          each embedded screen looks identical to its standalone home:
            - Adminland tabs: `px-6 pt-6 pb-8`  (matches /adminland/*; the
              Overview components rely on this for their `-mx-6 -mt-6 px-6`
              filter-bar bleed).
            - Workspace tabs: `px-8 pt-6 pb-6 min-w-0`  (matches
              app/workspace/layout.tsx so PM and A&T render identically to
              /workspace/performance-marketing and /workspace/accounts-taxation).
            - PM Overview sub-tab: `px-8 pt-6 pb-8 min-w-0`  (slightly
              wider chrome than Adminland because PerformanceMarketingHome
              packs many widgets per row; min-w-0 keeps the recharts
              ResponsiveContainers honest inside the flex shell). */}
      {/* `min-w-0` on the flex item is critical — without it, any inner
          content with intrinsic min-content wider than the available
          space (wide tables, recharts containers, no-wrap legend rows)
          forces <main> to grow past its share of the row, which puts a
          horizontal scrollbar on the whole page instead of letting the
          inner `overflow-auto` handle it locally. */}
      <main className="flex-1 min-w-0 overflow-auto bg-white">
        <div
          className={(() => {
            // Service tabs (PM / A&T): Overview sub-tab uses dedicated KPI
            // padding (slightly more bottom room for the dense widget grid),
            // Deliverables sub-tab matches the workspace layout exactly.
            if (SERVICE_TABS.has(activeTab)) {
              return activeServiceSub === 'overview'
                ? 'px-8 pt-6 pb-8 min-w-0'
                : 'px-8 pt-6 pb-6 min-w-0';
            }
            // Adminland-style pages also keep `min-w-0` so wide content
            // (e.g. relationship tables, KPI legend rows) can trigger the
            // inner overflow handlers instead of pushing page scroll.
            return 'px-6 pt-6 pb-8 min-w-0';
          })()}
        >
          {/* Customers / Employees sub-tabs: render a unified SubTabTopBar
              for the pages that don't already ship their own chrome
              (DatabaseCustomersPage, IncidentData, FeedbackData,
              DatabaseEmployeesPage, DatabaseResourceRequestPage). The
              CUSTOMERS_TOPBAR_META / EMPLOYEES_TOPBAR_META records gate
              this — sub-tabs not in the record skip the wrapper so we
              never double-stack title bars on top of components that
              already have one (CLAClients, LostClients, etc.). */}
          {activeTab === 'reports'                && <ReportsTab />}
          {activeTab === 'customers' && CUSTOMERS_TOPBAR_META[activeCustomersSub] && (
            <SubTabTopBar
              title={CUSTOMERS_TOPBAR_META[activeCustomersSub]!.title}
              subtitle={CUSTOMERS_TOPBAR_META[activeCustomersSub]!.subtitle}
            />
          )}
          {activeTab === 'customers'              && activeCustomersSub === 'overview'      && <CustomersOverview />}
          {activeTab === 'customers'              && activeCustomersSub === 'all-customers' && <CustomersByClient forceService={isHod ? 'Accounts & Taxation' : undefined} forceManager={previewTeamMemberName ?? undefined} />}
          {activeTab === 'customers'              && activeCustomersSub === 'cla'           && <CLAClients />}
          {activeTab === 'customers'              && activeCustomersSub === 'lost-clients'  && <LostClients />}
          {activeTab === 'customers'              && activeCustomersSub === 'incidents'     && <IncidentData forceType="Client" />}
          {activeTab === 'customers'              && activeCustomersSub === 'feedbacks'     && <FeedbackData />}
          {activeTab === 'customers'              && activeCustomersSub === 'relationships' && <ClientRelationshipData />}
          {activeTab === 'customers'              && activeCustomersSub === 'onboarding'    && <OnboardingModule />}
          {activeTab === 'customers'              && activeCustomersSub === 'billing'       && <BillingDirectory />}
          {activeTab === 'employees' && EMPLOYEES_TOPBAR_META[activeEmployeesSub] && (
            <SubTabTopBar
              title={EMPLOYEES_TOPBAR_META[activeEmployeesSub]!.title}
              subtitle={EMPLOYEES_TOPBAR_META[activeEmployeesSub]!.subtitle}
            />
          )}
          {activeTab === 'employees'              && activeEmployeesSub === 'overview'         && (
            <EmployeesOverview
              greeting={isHr ? {
                line1: 'Overview',
                line2: 'Workforce, hiring pipeline, and risk signals — at a glance',
              } : undefined}
            />
          )}
          {activeTab === 'employees'              && activeEmployeesSub === 'all-employees'    && <DatabaseEmployeesPage view="live" />}
          {activeTab === 'employees'              && activeEmployeesSub === 'past-employees'   && <DatabaseEmployeesPage view="past" />}
          {activeTab === 'employees'              && activeEmployeesSub === 'cla-ntf'          && <EmployeeCLA />}
          {activeTab === 'employees'              && activeEmployeesSub === 'incoming'         && <EmployeeIncoming />}
          {activeTab === 'employees'              && activeEmployeesSub === 'incidents'        && <IncidentData forceType="Employee" />}
          {activeTab === 'employees'              && activeEmployeesSub === 'resource-requests' && <DatabaseResourceRequestPage />}
          {activeTab === 'performance-marketing'  && activeServiceSub === 'overview'     && <PerformanceMarketingHome />}
          {activeTab === 'performance-marketing'  && activeServiceSub === 'deliverables' && <PerformanceMarketing />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'overview'     && <AccountsTaxationHome />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'deliverables' && <AccountsTaxation />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'tds'          && <TdsListView />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'gst'          && <GstListView />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'ptrc-ptec'    && <PtListView />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'income-tax'   && <IncomeTaxListView />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'ecom-reco'    && <EcomRecoListView />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'king-queen'   && <KingAndQueen />}
          {activeTab === 'accounts-taxation'      && activeServiceSub === 'activity'     && <AtActivityPage />}
        </div>
      </main>
    </div>
  );
}
