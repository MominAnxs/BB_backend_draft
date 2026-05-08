/**
 * All Customers — client-grouped list + dedicated detail page.
 *
 * The Brego book is organised at two levels: a person (the *client*)
 * can own multiple businesses. The previous All Customers table
 * flattened those businesses into separate rows, which made the
 * roster look bigger than it actually is and forced the admin to
 * mentally re-group rows by contact name to find every business
 * under a person.
 *
 * This module corrects that:
 *
 *   1. The list is grouped by `customerId` so each row IS a client.
 *      Multiple-business clients show a "+ N more" hint and a
 *      service-mix chip; single-business clients read the same as
 *      before.
 *
 *   2. Clicking a row navigates to a dedicated client detail PAGE
 *      (no drawer) at `?…&client=<id>`. The detail page lays out
 *      every business under the client + aggregated stats + the
 *      combined team / relationships / notes in a single scannable
 *      surface.
 *
 *   3. URL hygiene — the client param is dropped automatically by
 *      the URL-hygiene hook in SuperAdminHome if it doesn't resolve
 *      to a real client.
 *
 * Built for the Admin platform read: dense, scannable, every cell
 * earning its place. Same chrome conventions as the rest of the
 * Customers tab (sticky top bar, h-9 controls, kebab-case slugs).
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, ChevronDown, ChevronRight, X, ArrowLeft, Download, SlidersHorizontal, Check } from 'lucide-react';

import {
  MOCK_CUSTOMERS,
  CustomerDrawer,
  SortTh,
  type Customer,
  type CustomerService,
  type CustomerStatus,
  type PaymentTerms,
  type ATPlan,
  CustomerStatusPill,
  ServicePill,
  formatCurrency,
  formatDate,
  getInitials,
  getTeamColor,
} from './Database';

// ════════════════════════════════════════════════════════════════════════════
// CLIENT GROUP — one entry per `customerId`
// ════════════════════════════════════════════════════════════════════════════

interface ClientGroup {
  /** customerId — stable key shared across a person's businesses. */
  id: string;
  /** Person name (the "client" identity). */
  contactPerson: string;
  email: string;
  phone: string;
  /** First location across all businesses (sufficient for list display). */
  location: string;
  /** All businesses owned by this client, sorted by status (Active first)
   *  then by retainer descending. */
  businesses: Customer[];
}

/** Group a flat customer list into client groups. The grouping
 *  is still useful for the detail page (so multi-business clients
 *  show all their engagements + the in-hero business switcher
 *  between siblings), even though the list itself renders one
 *  row per business. */
function groupClients(customers: Customer[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>();
  for (const c of customers) {
    const existing = map.get(c.customerId);
    if (existing) {
      existing.businesses.push(c);
    } else {
      map.set(c.customerId, {
        id: c.customerId,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        location: c.location,
        businesses: [c],
      });
    }
  }
  // Sort each client's businesses: Active first, then by monthly retainer
  // desc — so the most-revenue-bearing engagement reads first.
  for (const g of map.values()) {
    g.businesses.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      return b.monthlyRetainer - a.monthlyRetainer;
    });
  }
  return Array.from(map.values());
}

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC ENTRY — picks list view vs detail page from `?client=` URL param
// ════════════════════════════════════════════════════════════════════════════

export function CustomersByClient({
  forceService,
  forceManager,
}: {
  /** When set, scopes the source list to this service (or 'Both').
   *  Mirrors the prop on the legacy DatabaseCustomersPage so HOD
   *  / role-scoped views can lock the customer set to A&T-only. */
  forceService?: CustomerService;
  /** When set, scopes the source list to customers where this
   *  person sits anywhere on the team (manager, podHead, asst,
   *  exec, hod) OR appears in the assignedTeam roster. Used by the
   *  Manager preview to surface only the manager's clients. */
  forceManager?: string;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Soft-delete state ──────────────────────────────────────────
  // Admins flip a business or an entire client to Inactive from the
  // Danger Zone (Details tab footer) or the kebab menu in the page
  // top bar. We persist that choice in a Map keyed by Customer.id so
  // the override survives sibling-switching, route-flips, etc.
  // Mock-only — a real backend would write the new status to the
  // server and this state would be hydrated from it.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, CustomerStatus>>({});
  // A&T plan overrides — keyed by Customer.id. When the admin flips
  // a plan via the Change-plan modal, we record the new tier here
  // so the override persists across sibling switches and tab flips.
  const [planOverrides, setPlanOverrides] = useState<Record<string, ATPlan>>({});

  /** Mark a single business as Inactive. */
  const deactivateBusiness = (businessId: string) => {
    setStatusOverrides(prev => ({ ...prev, [businessId]: 'Inactive' }));
  };
  /** Mark every business owned by a client as Inactive (used by the
   *  client-wide deactivate action). */
  const deactivateClient = (customerId: string) => {
    setStatusOverrides(prev => {
      const next = { ...prev };
      for (const c of MOCK_CUSTOMERS) {
        if (c.customerId === customerId) next[c.id] = 'Inactive';
      }
      return next;
    });
  };
  /** Flip a single business's A&T plan tier. */
  const changeAtPlan = (businessId: string, plan: ATPlan) => {
    setPlanOverrides(prev => ({ ...prev, [businessId]: plan }));
  };

  const sourceCustomers = useMemo(() => {
    let list: Customer[] = MOCK_CUSTOMERS.map(c => {
      let next = c;
      if (statusOverrides[c.id]) next = { ...next, status: statusOverrides[c.id] };
      if (planOverrides[c.id])   next = { ...next, atPlan:  planOverrides[c.id] };
      return next;
    });
    if (forceService) {
      list = list.filter(c => c.service === forceService || c.service === 'Both');
    }
    if (forceManager) {
      // Match if the manager appears anywhere on the engagement —
      // any of the 5 team-structure slots OR the flat assignedTeam
      // roster. Defensive: trim/lower both sides so casing /
      // whitespace differences don't cause silent misses.
      const target = forceManager.trim().toLowerCase();
      const onTeam = (name: string) => name.trim().toLowerCase() === target;
      list = list.filter(c => {
        const ts = c.teamStructure;
        if (
          (ts.hod.name              && onTeam(ts.hod.name))              ||
          (ts.podHead.name          && onTeam(ts.podHead.name))          ||
          (ts.manager.name          && onTeam(ts.manager.name))          ||
          (ts.assistantManager.name && onTeam(ts.assistantManager.name)) ||
          (ts.executive.name        && onTeam(ts.executive.name))
        ) return true;
        if (Array.isArray(c.assignedTeam) && c.assignedTeam.some(onTeam)) return true;
        return false;
      });
    }
    return list;
  }, [forceService, forceManager, statusOverrides, planOverrides]);

  const allClients = useMemo(() => groupClients(sourceCustomers), [sourceCustomers]);

  // ── URL → routing decision ───────────────────────────────────────
  // The list view is per-business (each row is a Customer record), so
  // the row click pairs `client` with `business` so the detail page
  // lands directly on the row the admin clicked. `client` alone still
  // resolves (defaults to the first business in the group) — useful
  // for shared deep-links that pre-date the per-business param.
  const clientParam = searchParams.get('client');
  const businessParam = searchParams.get('business');

  const activeClient = clientParam ? allClients.find(g => g.id === clientParam) ?? null : null;
  const activeBusiness = activeClient && businessParam
    ? activeClient.businesses.find(b => b.id === businessParam) ?? null
    : null;

  // Helper to push customer-detail params. Preserves existing search
  // params so the user's filters / scroll position survive the
  // navigation. Pass nulls to clear both params and return to the list.
  const navigateToBusiness = (clientId: string | null, businessId: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (clientId) next.set('client', clientId); else next.delete('client');
    if (businessId) next.set('business', businessId); else next.delete('business');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Detail page when ?client=… resolves to a real client. If the
  // param is set but doesn't match anyone (stale link, typo), we
  // fall through to the list — the URL-hygiene hook in
  // SuperAdminHome will strip the orphaned param shortly after.
  if (activeClient) {
    return (
      <ClientDetailPage
        client={activeClient}
        initialBusiness={activeBusiness ?? activeClient.businesses[0]}
        onBack={() => navigateToBusiness(null, null)}
        onDeactivateBusiness={(businessId) => {
          deactivateBusiness(businessId);
          // Land back on the list so the admin sees the result of
          // their action without an awkward "viewing inactive" state.
          navigateToBusiness(null, null);
        }}
        onDeactivateClient={(customerId) => {
          deactivateClient(customerId);
          navigateToBusiness(null, null);
        }}
        onChangeAtPlan={changeAtPlan}
      />
    );
  }

  return (
    <BusinessRowList
      clients={allClients}
      onOpenBusiness={(b) => navigateToBusiness(b.customerId, b.id)}
      hideServiceFilter={!!forceService}
      managerScoped={!!forceManager}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LIST VIEW — one row per business (the previous column set, kept intact)
// ════════════════════════════════════════════════════════════════════════════
//
// Per Momin's call, the table reverts to the legacy per-business
// layout the admin grew accustomed to in `DatabaseCustomersPage` —
// Company / Contact / Service / Status / Joined / Retainer / Team /
// Total Rev. Multi-business clients still show as multiple rows, one
// per business, but every row routes to the SAME client-grouped
// detail page (the new full-page surface), pre-selecting the row's
// business. The in-hero business switcher on the detail page lets
// the admin hop between siblings without leaving.

function BusinessRowList({
  clients,
  onOpenBusiness,
  hideServiceFilter,
  managerScoped = false,
}: {
  clients: ClientGroup[];
  onOpenBusiness: (b: Customer) => void;
  hideServiceFilter: boolean;
  /** When true, the list is already pre-filtered to a manager's
   *  personal client roster — the page chrome adapts (title +
   *  subtitle re-frame the read as "your" clients, footer copy
   *  changes too). The data filtering itself happens upstream in
   *  the parent's `forceManager` source filter. */
  managerScoped?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | CustomerStatus>('All');
  const [serviceFilter, setServiceFilter] = useState<'All' | CustomerService>('All');
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | PaymentTerms>('All');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'companyName', dir: 'asc' });

  // Flatten back to per-business rows. The grouping work the entry
  // component does is preserved (we still own ClientGroup for the
  // detail page) — the list itself just iterates customers.
  const allCustomers = useMemo(() => clients.flatMap(g => g.businesses), [clients]);

  // Distinct sector list — driven from the live customer set so
  // newly-added sectors auto-populate the dropdown without a
  // hard-coded enum to maintain. Empty/whitespace values dropped.
  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCustomers) {
      const s = c.sector?.trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = allCustomers.filter((c) => {
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      // Service filter is inclusive of 'Both' customers — a client
      // who buys both service lines should surface under either
      // filter (they actively use that service). Same convention
      // the parent's `forceService` scoping uses.
      if (serviceFilter !== 'All') {
        const matches = c.service === serviceFilter || c.service === 'Both';
        if (!matches) return false;
      }
      if (sectorFilter !== 'All' && c.sector !== sectorFilter) return false;
      if (paymentFilter !== 'All' && c.paymentTerms !== paymentFilter) return false;
      if (q) {
        const hay = `${c.companyName} ${c.contactPerson} ${c.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      const k = sort.key as keyof Customer;
      const av = a[k];
      const bv = b[k];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.dir === 'asc' ? av - bv : bv - av;
      }
      return 0;
    });
    return list;
  }, [allCustomers, search, statusFilter, serviceFilter, sectorFilter, paymentFilter, sort]);

  const toggleSort = (key: string) =>
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

  // Header stats — derived from the unfiltered source so the tiles
  // stay a stable book-wide read regardless of the active filters.
  const headerStats = useMemo(() => {
    const total = allCustomers.length;
    const active = allCustomers.filter(c => c.status === 'Active').length;
    const inactive = total - active;
    const totalRevenue = allCustomers
      .filter(c => c.status === 'Active')
      .reduce((s, c) => s + c.monthlyRetainer, 0);
    return { total, active, inactive, totalRevenue };
  }, [allCustomers]);

  return (
    <div>
      {/* Top filter bar — same chrome as Customers / Reports for parity */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">All Customers</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
              {managerScoped
                ? 'Clients where you sit on the engagement team'
                : 'The full client roster — every active and inactive account'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search */}
            <div className="relative w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              <label htmlFor="customers-search" className="sr-only">Search customers</label>
              <input
                id="customers-search"
                type="text"
                placeholder="Search by company, contact, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/35 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Unified Filter dropdown — Status / Service / Sector /
                Payment Terms live in one popover so the top bar stays
                calm. The button shows a count badge when any
                non-default filter is set, and Reset clears every
                section in one tap. */}
            <FilterPopover
              status={statusFilter}
              service={serviceFilter}
              sector={sectorFilter}
              payment={paymentFilter}
              sectorOptions={sectorOptions}
              hideService={hideServiceFilter}
              onStatus={setStatusFilter}
              onService={setServiceFilter}
              onSector={setSectorFilter}
              onPayment={setPaymentFilter}
            />

            {/* Export */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-black/10 text-caption font-medium text-black/70 bg-white hover:bg-black/[0.02] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats row — same density as the legacy module so the page
          reads consistently inside the Customers tab. */}
      <div className="flex items-stretch gap-4 mb-5">
        <StatCard label="Total Customers" value={headerStats.total} color="text-black/85" />
        <StatCard
          label="Active"
          value={headerStats.active}
          sub={`${headerStats.total > 0 ? Math.round((headerStats.active / headerStats.total) * 100) : 0}% of total`}
          color="text-emerald-600"
        />
        <StatCard label="Inactive" value={headerStats.inactive} sub="Past customers" color="text-black/40" />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(headerStats.totalRevenue)}
          sub="From active clients"
          color="text-[#204CC7]"
        />
      </div>

      {/* Table — previous column set: Company / Contact / Service /
          Status / Joined / Retainer / Team / Total Rev */}
      <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: 1100 }}>
            <thead>
              <tr className="border-b border-black/[0.06]">
                <SortTh label="Client"   sortKey="contactPerson"   current={sort} onSort={toggleSort} className="pl-5" />
                <SortTh label="Business" sortKey="companyName"     current={sort} onSort={toggleSort} />
                <th className="text-left py-3 px-4">
                  <span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Service</span>
                </th>
                <th className="text-center py-3 px-4">
                  <span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Status</span>
                </th>
                <SortTh label="Joined"   sortKey="joinedDate"      current={sort} onSort={toggleSort} />
                <SortTh label="Retainer" sortKey="monthlyRetainer" current={sort} onSort={toggleSort} align="right" />
                <th className="text-left py-3 px-4">
                  <span className="text-black/50 text-caption font-semibold uppercase tracking-wider">Team</span>
                </th>
                <SortTh label="Total Rev" sortKey="totalRevenue"   current={sort} onSort={toggleSort} align="right" />
                <th className="py-3 pr-5 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  onClick={() => onOpenBusiness(c)}
                  className={`border-b border-black/[0.04] hover:bg-[#F6F7FF]/50 transition-colors cursor-pointer group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-black/[0.008]'
                  }`}
                >
                  {/* Client — the person who owns the engagement.
                      Avatar shows their initials so the eye locks
                      onto a face, not a brand mark. Email caption
                      gives the admin a one-glance contact point. */}
                  <td className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                        style={{ backgroundColor: getTeamColor(c.contactPerson) }}
                        aria-hidden="true"
                      >
                        {getInitials(c.contactPerson)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body font-semibold text-black/85 whitespace-nowrap">{c.contactPerson}</p>
                        <p className="text-caption text-black/40 font-normal truncate">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  {/* Business — the company under the client's name,
                      with sector as the supporting caption. */}
                  <td className="py-3.5 px-4">
                    <p className="text-body text-black/75 font-medium whitespace-nowrap">{c.companyName}</p>
                    <p className="text-caption text-black/40 font-normal">{c.sector}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <ServicePill service={c.service} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <CustomerStatusPill status={c.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-caption text-black/60 font-medium whitespace-nowrap">{formatDate(c.joinedDate)}</span>
                    {c.exitDate && (
                      <p className="text-caption text-red-400 font-normal whitespace-nowrap">Exit: {formatDate(c.exitDate)}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-body font-semibold text-black/75 tabular-nums">{formatCurrency(c.monthlyRetainer)}</span>
                    <span className="text-caption text-black/30 font-normal">/mo</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center -space-x-1.5">
                      {c.assignedTeam.slice(0, 3).map((t, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white text-[9px] font-bold text-white"
                          style={{ backgroundColor: getTeamColor(t) }}
                          title={t}
                        >
                          {getInitials(t)}
                        </div>
                      ))}
                      {c.assignedTeam.length > 3 && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white bg-black/[0.08] text-[9px] font-bold text-black/50">
                          +{c.assignedTeam.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-body font-semibold text-black/70 tabular-nums">{formatCurrency(c.totalRevenue)}</span>
                  </td>
                  <td className="py-3.5 pr-5 text-right">
                    <ChevronRight
                      className="w-4 h-4 text-black/30 group-hover:text-[#204CC7] transition-colors inline-block"
                      aria-hidden="true"
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Search className="w-10 h-10 text-black/10 mx-auto mb-3" />
                    <p className="text-black/50 text-body font-medium">No customers match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
          <span className="text-black/50 text-caption font-normal">
            Showing {filtered.length} of {allCustomers.length} customers
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STAT CARD — header tiles above the customers table
// ════════════════════════════════════════════════════════════════════════════
//
// Mirrors the StatCard helper from the legacy DatabaseCustomersPage so
// the four header tiles read identically — same flex stretch, same
// label / number / sub typography, same colour accents. We render
// them in a horizontal flex row so each tile takes equal width.

function StatCard({
  label,
  value,
  sub,
  color = 'text-black/85',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex-1 rounded-xl border border-black/[0.06] bg-white px-5 py-4">
      <p className="text-caption text-black/55 font-medium uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-h2 font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-caption text-black/55 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FILTER POPOVER — single dropdown with sectioned filter controls
// ════════════════════════════════════════════════════════════════════════════
//
// Replaces the previous trio of separate dropdowns (Status / Service /
// Sector) with one popover so the top bar reads calmly. Three sections
// inside, each with its own header and chip group:
//
//   1. Status   — Active / Inactive (chips)
//   2. Service  — SEM / A&T / Both (chips, hidden in HOD-locked view)
//   3. Sector   — long alphabetised list (scrollable chip wrap)
//
// The trigger button shows a count badge when any filter is non-default
// and a Reset action clears every section in one tap. Auto-apply on
// change keeps interactions snappy — no Apply / Cancel ceremony.

function FilterPopover({
  status,
  service,
  sector,
  payment,
  sectorOptions,
  hideService,
  onStatus,
  onService,
  onSector,
  onPayment,
}: {
  status: 'All' | CustomerStatus;
  service: 'All' | CustomerService;
  sector: string;
  payment: 'All' | PaymentTerms;
  sectorOptions: string[];
  hideService: boolean;
  onStatus: (v: 'All' | CustomerStatus) => void;
  onService: (v: 'All' | CustomerService) => void;
  onSector: (v: string) => void;
  onPayment: (v: 'All' | PaymentTerms) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sectorQuery, setSectorQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + ESC, standard popover behaviour.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Reset the in-popover sector search whenever the popover reopens
  // so the next visit starts from a clean slate.
  useEffect(() => {
    if (!open) setSectorQuery('');
  }, [open]);

  // Active filter count for the trigger badge.
  const activeCount =
    (status !== 'All' ? 1 : 0) +
    (!hideService && service !== 'All' ? 1 : 0) +
    (sector !== 'All' ? 1 : 0) +
    (payment !== 'All' ? 1 : 0);

  const reset = () => {
    onStatus('All');
    if (!hideService) onService('All');
    onSector('All');
    onPayment('All');
    setSectorQuery('');
  };

  // Sector list filtered by the in-popover search box. The match is
  // case-insensitive substring — generous enough that the admin can
  // type a fragment and still find the right sector.
  const filteredSectors = useMemo(() => {
    const q = sectorQuery.trim().toLowerCase();
    if (!q) return sectorOptions;
    return sectorOptions.filter(s => s.toLowerCase().includes(q));
  }, [sectorOptions, sectorQuery]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-caption font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
          activeCount > 0
            ? 'border-[#204CC7]/30 bg-[#EEF1FB] text-[#204CC7]'
            : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        Filter
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#204CC7] text-white text-[11px] font-bold tabular-nums">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Filter customers"
          className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl border border-black/[0.08] shadow-[0_10px_36px_-8px_rgba(0,0,0,0.18)] overflow-hidden z-30"
          style={{ animation: 'slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
            <h4 className="text-caption font-semibold text-black">Filters</h4>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={reset}
                className="text-caption font-semibold text-[#204CC7] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 rounded px-1"
              >
                Reset
              </button>
            )}
          </div>

          {/* Sections — Status & Service stay as chip groups (small,
              fixed enums), Sector switches to a search + scrollable
              list because it grows with the data. */}
          <FilterSection title="Status">
            <ChipRow>
              <FilterChip active={status === 'All'}      onClick={() => onStatus('All')}>All</FilterChip>
              <FilterChip active={status === 'Active'}   onClick={() => onStatus('Active')}>Active</FilterChip>
              <FilterChip active={status === 'Inactive'} onClick={() => onStatus('Inactive')}>Inactive</FilterChip>
            </ChipRow>
          </FilterSection>

          {!hideService && (
            <FilterSection title="Service">
              <ChipRow>
                <FilterChip active={service === 'All'}                   onClick={() => onService('All')}>All</FilterChip>
                <FilterChip active={service === 'Performance Marketing'} onClick={() => onService('Performance Marketing')}>SEM</FilterChip>
                <FilterChip active={service === 'Accounts & Taxation'}   onClick={() => onService('Accounts & Taxation')}>A&amp;T</FilterChip>
              </ChipRow>
            </FilterSection>
          )}

          <FilterSection title="Payment Terms">
            <ChipRow>
              <FilterChip active={payment === 'All'}      onClick={() => onPayment('All')}>All</FilterChip>
              <FilterChip active={payment === 'Prepaid'}  onClick={() => onPayment('Prepaid')}>Prepaid</FilterChip>
              <FilterChip active={payment === 'Postpaid'} onClick={() => onPayment('Postpaid')}>Postpaid</FilterChip>
            </ChipRow>
          </FilterSection>

          <FilterSection title="Sector">
            {/* Inline search — quick to find a sector when the
                list grows. Mirrors the chrome of the table's
                top-bar search so the visual rhythm is consistent. */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
              <label htmlFor="sector-search" className="sr-only">Search sectors</label>
              <input
                id="sector-search"
                type="text"
                value={sectorQuery}
                onChange={(e) => setSectorQuery(e.target.value)}
                placeholder="Search sectors…"
                className="w-full h-8 pl-7 pr-7 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/35 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {sectorQuery && (
                <button
                  type="button"
                  onClick={() => setSectorQuery('')}
                  aria-label="Clear sector search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                >
                  <X className="w-3 h-3 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Scrollable list — All pinned at the top, then the
                alphabetised sectors. Single-select with a check
                glyph on the active row. Caps at 220px so the
                popover height stays predictable as data grows. */}
            <div className="rounded-md border border-black/[0.06] bg-white max-h-[220px] overflow-y-auto" role="listbox" aria-label="Sector">
              <SectorOption
                label="All sectors"
                active={sector === 'All'}
                onClick={() => onSector('All')}
                meta={String(sectorOptions.length)}
              />
              {filteredSectors.length > 0 && <div className="h-px bg-black/[0.06]" aria-hidden="true" />}
              {filteredSectors.map(s => (
                <SectorOption
                  key={s}
                  label={s}
                  active={sector === s}
                  onClick={() => onSector(s)}
                />
              ))}
              {filteredSectors.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-caption text-black/55">No sectors match &ldquo;{sectorQuery}&rdquo;</p>
                </div>
              )}
            </div>
          </FilterSection>
        </div>
      )}
    </div>
  );
}

/** Single row inside the Sector listbox. Quiet by default; brand-blue
 *  ink + tinted background when active. The optional `meta` slot on
 *  the right is used by the "All sectors" row to show the total
 *  sector count. */
function SectorOption({
  label,
  active,
  onClick,
  meta,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  meta?: string;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 h-9 text-left transition-colors focus:outline-none focus-visible:bg-black/[0.04] ${
        active ? 'bg-[#204CC7]/[0.06] text-[#204CC7]' : 'text-black/75 hover:bg-black/[0.03]'
      }`}
    >
      <span className={`flex-1 truncate text-caption ${active ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
      {meta && !active && (
        <span className="text-[11px] text-black/40 font-medium tabular-nums">{meta}</span>
      )}
      {active && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
    </button>
  );
}

/** One titled section inside the filter popover. */
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-black/[0.04] last:border-b-0">
      <h5 className="text-caption font-semibold text-black/50 uppercase tracking-wider mb-2">
        {title}
      </h5>
      {children}
    </section>
  );
}

/** Wraps a row of FilterChips with consistent spacing. */
function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center flex-wrap gap-1.5">{children}</div>;
}

/** Pill-style toggle used for every option inside the filter popover.
 *  Active state uses brand-blue ink + tinted background; inactive uses
 *  a quiet outline. The check glyph reinforces the selected state for
 *  scannability when chips wrap into multiple rows. */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 h-8 px-3 rounded-md text-caption font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
        active
          ? 'bg-[#204CC7]/[0.08] border-[#204CC7]/30 text-[#204CC7]'
          : 'bg-white border-black/10 text-black/70 hover:bg-black/[0.03] hover:border-black/20'
      }`}
    >
      {active && <Check className="w-3 h-3" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DETAIL PAGE — full-page surface for a single client
// ════════════════════════════════════════════════════════════════════════════
//
// This page is a 1:1 port of the previous customer drawer's design and
// information — same hero, same Overview / Details / Team & Efforts /
// Financials tabs, same business switcher pill, same Customer-Wide
// Billing roll-up — rendered as a page-level surface instead of a
// slide-in dialog. The drawer chrome (backdrop, slide-in animation,
// close X) is replaced by a slim breadcrumb / back bar at the top of
// the page; everything below the bar is identical to the drawer body.
//
// Implementation note: the drawer component itself accepts a
// `surface='page'` prop and reuses the entire hero + tabs + tab
// content for the page presentation, so behavioural parity is
// guaranteed (every micro-interaction the drawer ships works here).
//
// Multi-business clients: the drawer's existing per-business model is
// preserved — we render one business at a time, and the in-hero
// "business switcher" pill (the `+ N more` chevron) lets the admin
// hop between siblings without leaving the page. We start on the
// most-prominent active business (already sorted to the top of
// `client.businesses`).

function ClientDetailPage({
  client,
  initialBusiness,
  onBack,
  onDeactivateBusiness,
  onDeactivateClient,
  onChangeAtPlan,
}: {
  client: ClientGroup;
  /** Which business to land on when the page mounts. Driven by the
   *  `?business=<id>` URL param so deep-links and per-row clicks
   *  open directly on the right engagement. */
  initialBusiness: Customer;
  onBack: () => void;
  /** Soft-delete a single business (the active one). The parent
   *  flips its status to Inactive and routes the admin back to
   *  the All Customers list. */
  onDeactivateBusiness: (businessId: string) => void;
  /** Soft-delete the entire client (every business they own). */
  onDeactivateClient: (customerId: string) => void;
  /** Flip a business's A&T plan tier. */
  onChangeAtPlan: (businessId: string, plan: ATPlan) => void;
}) {
  // Active business — initialised from the URL-supplied business and
  // then mutated locally as the admin swaps siblings via the in-hero
  // switcher. (The page intentionally doesn't push every switch back
  // to the URL — keeps history clean. The admin can copy the link
  // they landed on and it'll re-open exactly where they were.)
  const [activeBusiness, setActiveBusiness] = useState<Customer>(initialBusiness);

  // Defensive: if the active business no longer belongs to this client
  // (e.g. the URL changed to a different client), reset to the new
  // group's first entry. Cheap to compute and avoids stale references.
  const resolvedBusiness = useMemo(() => {
    if (client.businesses.some(b => b.id === activeBusiness.id)) return activeBusiness;
    return client.businesses[0];
  }, [client.businesses, activeBusiness]);

  return (
    // Break out of the parent's `px-6 pt-6 pb-8` padding so the page
    // surface fills the full content area below the global navigation.
    // The drawer component (in `surface='page'` mode) sets its own
    // height to `calc(100vh - 53px)` and manages its own internal
    // scroll, so the page reads exactly like the drawer did inside
    // its dialog panel — only wider.
    <div className="-mx-6 -mt-6 -mb-8">
      <CustomerDrawer
        surface="page"
        customer={resolvedBusiness}
        onSwitchCustomer={(c) => setActiveBusiness(c)}
        pageHeader={<DetailPageBreadcrumb client={client} onBack={onBack} />}
        onDeactivateBusiness={(businessId) => onDeactivateBusiness(businessId)}
        onDeactivateClient={() => onDeactivateClient(client.id)}
        onChangeAtPlan={onChangeAtPlan}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BREADCRUMB / BACK BAR — slot rendered into the drawer's sticky top bar
// ════════════════════════════════════════════════════════════════════════════
//
// Replaces the drawer's static "Customer" title with an inline
// breadcrumb so the admin always has a one-click path back to the
// clients list. The CLA controls on the right side of the bar are
// supplied by the drawer surface itself — we just own the left.

function DetailPageBreadcrumb({
  client,
  onBack,
}: {
  client: ClientGroup;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to All Customers"
        className="inline-flex items-center gap-1.5 px-2 -ml-2 py-1.5 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        All Customers
      </button>
      <ChevronRight className="w-3 h-3 text-black/30 shrink-0" aria-hidden="true" />
      <span className="text-caption font-semibold text-black/85 truncate">
        {client.contactPerson}
      </span>
    </div>
  );
}
