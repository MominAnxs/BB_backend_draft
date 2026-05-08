/**
 * Canonical app-router link map for the Home screen.
 *
 * All Home URLs follow a single contract:
 *
 *   /home[?tab=<tab>][&sub=<sub>][&view=<view>][&client=<id>][&business=<id>][&month=<YYYY-MM-01>]
 *
 *   • `/home` (no params) → Business Overview (default).
 *   • `?tab=<tab>` selects the top-level tab.
 *   • `?sub=<sub>` selects the inner sub-tab. Default sub is omitted —
 *      the bare tab URL lands on the executive overview / KPI grid /
 *      first canonical page for that tab.
 *   • `?view=<view>` opens a full-screen drilldown layered over the
 *      tab+sub (Overdue / Due-this-week triage pages).
 *   • `?client=<id>&business=<id>` opens the per-business detail
 *      inside the A&T Recurring Checklist.
 *   • `?month=<YYYY-MM-01>` selects the active month on month-aware
 *      pages (Recurring Checklist + the 5 holistic compliance lists).
 *
 * Conventions:
 *   • Slugs are kebab-case throughout (no camelCase, no snake_case).
 *   • Index pages use plural nouns where natural (`lost-clients`,
 *     `incidents`, `feedback`).
 *   • Acronyms stay lowercase (`tds`, `gst`, `ptrc-ptec`, `cla`).
 *   • Acronym-singulars stay singular even when the page lists many
 *     (`cla` not `clas`).
 *
 * Lives in its own leaf module (no React, no component imports) so
 * SuperAdminHome and PerformanceMarketingHome can both import it
 * without creating a circular dependency.
 *
 * Usage:
 *   import { SUPER_ADMIN_HOME_ROUTES as R } from '@/lib/super-admin-home-routes';
 *   <Link href={R.accountsTaxation.tds} />
 *   router.push(R.customers.allCustomers);
 *   router.push(R.accountsTaxation.deliverablesView('overdue'));
 */
export const SUPER_ADMIN_HOME_ROUTES = {
  // ── /home — Business Overview (Reports tab) ─────────────────────
  reports: '/home',

  // ── /home?tab=customers ─────────────────────────────────────────
  // Default sub is overview — bare URL lands on the executive
  // CustomersOverview KPI grid. Operational pages sit one click
  // away under the Customers sidebar group.
  customers: {
    root:          '/home?tab=customers',
    overview:      '/home?tab=customers',
    allCustomers:  '/home?tab=customers&sub=all-customers',
    cla:           '/home?tab=customers&sub=cla',
    lostClients:   '/home?tab=customers&sub=lost-clients',
    incidents:     '/home?tab=customers&sub=incidents',
    feedbacks:     '/home?tab=customers&sub=feedbacks',
    relationships: '/home?tab=customers&sub=relationships',
    onboarding:    '/home?tab=customers&sub=onboarding',
  },

  // ── /home?tab=employees ─────────────────────────────────────────
  // Default sub is overview — bare URL lands on the EmployeesOverview
  // KPI grid. The other entries are operational pages migrated from
  // the Adminland Employees group + the retired Database dropdown.
  employees: {
    root:             '/home?tab=employees',
    overview:         '/home?tab=employees',
    allEmployees:     '/home?tab=employees&sub=all-employees',
    claNtf:           '/home?tab=employees&sub=cla-ntf',
    incoming:         '/home?tab=employees&sub=incoming',
    incidents:        '/home?tab=employees&sub=incidents',
    resourceRequests: '/home?tab=employees&sub=resource-requests',
  },

  // ── /home?tab=performance-marketing ─────────────────────────────
  // Hidden from the sidebar today (deep-link only) but the routes
  // are kept stable for legacy bookmarks and cross-tab navigation.
  performanceMarketing: {
    root:         '/home?tab=performance-marketing',
    overview:     '/home?tab=performance-marketing',
    deliverables: '/home?tab=performance-marketing&sub=deliverables',
  },

  // ── /home?tab=accounts-taxation ─────────────────────────────────
  // Default sub is overview — same convention as PM. The five
  // holistic per-domain lists (TDS / GST / PTRC-PTEC / Income Tax /
  // E-Com Reco) each answer "who's done with X across the whole
  // book?" without drilling into individual businesses.
  // King & Queen and Activity stay reachable via deep links but
  // aren't surfaced in the sidebar.
  accountsTaxation: {
    root:         '/home?tab=accounts-taxation',
    overview:     '/home?tab=accounts-taxation',
    deliverables: '/home?tab=accounts-taxation&sub=deliverables',
    tds:          '/home?tab=accounts-taxation&sub=tds',
    gst:          '/home?tab=accounts-taxation&sub=gst',
    ptrcPtec:     '/home?tab=accounts-taxation&sub=ptrc-ptec',
    incomeTax:    '/home?tab=accounts-taxation&sub=income-tax',
    ecomReco:     '/home?tab=accounts-taxation&sub=ecom-reco',
    kingQueen:    '/home?tab=accounts-taxation&sub=king-queen',
    activity:     '/home?tab=accounts-taxation&sub=activity',

    // Triage views (full-screen drilldowns) — overlay on top of the
    // Recurring Checklist sub-tab. Use `view=` so the underlying
    // tab+sub state still persists when the user closes the view.
    overdue:      '/home?tab=accounts-taxation&sub=deliverables&view=overdue',
    thisWeek:     '/home?tab=accounts-taxation&sub=deliverables&view=this-week',
  },
} as const;

// ── Legacy slug → canonical slug map ─────────────────────────────
// Old URLs that may still be in the wild (browser bookmarks, shared
// links, deep links from third-party tools). The `legacyRedirects`
// constant is used by the router-level redirect handler so old
// URLs don't 404 — they hop to the canonical equivalent.
//
// Every renamed slug must have an entry here.
export const LEGACY_HOME_SLUG_REDIRECTS: ReadonlyArray<{
  /** Single search-param test; matched only when this `key=value`
   *  pair is present on `/home`. */
  match: { key: 'sub' | 'view'; value: string };
  /** Replacement value for the same key. */
  replaceWith: string;
}> = [
  // 'pt' → 'ptrc-ptec' (clearer slug; matches the page label)
  { match: { key: 'sub',  value: 'pt' },               replaceWith: 'ptrc-ptec' },
  // 'resource-request' (singular) → 'resource-requests' (plural index page)
  { match: { key: 'sub',  value: 'resource-request' }, replaceWith: 'resource-requests' },
  // 'thisWeek' (camelCase) → 'this-week' (kebab-case)
  { match: { key: 'view', value: 'thisWeek' },         replaceWith: 'this-week' },
];
