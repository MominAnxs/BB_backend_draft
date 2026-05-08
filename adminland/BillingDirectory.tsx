'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft, ArrowDownToLine, ArrowUpRight, Check, ChevronRight, CreditCard,
  Download, Eye, FileText, Filter, Search, Sparkles, X,
} from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';
import { MonthNavigator } from '@/workspace/shared/MonthNavigator';
import { PeriodLabel } from '@/workspace/shared/PeriodLabel';
import {
  MOCK_CUSTOMERS,
  AT_PLAN_DETAILS,
  resolveAtPlan,
  ServicePill,
  type Customer,
  type ATPlan,
  type CustomerService,
  type CustomerStatus,
} from './Database';

// ════════════════════════════════════════════════════════════════════
// BILLING & SUBSCRIPTIONS — Client Billing Directory
// ════════════════════════════════════════════════════════════════════
//
// A bank-statement-style view of every billing account on the book.
// One billing account = one business. A client (the contact person)
// may own several businesses, and each business may carry one or
// both service lines (SEM / A&T / Both). The directory surfaces all
// of that with a deliberately quiet shape; the rare states (dues,
// inactive accounts, multi-business clients) are the only things
// that visually break rhythm.
//
// Design intent (post-audit):
//   • Single inline rollup line above the table — no 4-up cards.
//   • List columns trimmed to Account · Service · Monthly · Outstanding.
//     Plan / Last Payment / Status all live on the detail page already.
//   • Detail KPIs trimmed to 2 (Paid YTD · Outstanding). Total Billed
//     was derivable from those two; we don't need three.
//   • Statement entry status pill only renders on Pending / Overdue —
//     "Paid" and "Recorded" are the silent defaults.
//   • Multi-business clients get a sibling-accounts chip row on the
//     detail page so admins jump from one statement to its siblings
//     in a single click.
//   • Every invoice row gets View + Download buttons; the View opens
//     a print-friendly modal preview, Download generates an HTML
//     invoice and triggers a browser download (real PDF generation
//     would replace this — wire-shape kept identical).
// ════════════════════════════════════════════════════════════════════

// ── Helpers ────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TODAY = new Date();

function parseDate(s: string): Date { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDate(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatMonthYear(s: string): string {
  const d = parseDate(s);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function formatCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000)   return `₹${(abs / 100000).toFixed(2)} L`;
  if (abs >= 1000)     return `₹${(abs / 1000).toFixed(0)}K`;
  return `₹${abs.toLocaleString('en-IN')}`;
}
function formatExact(v: number): string {
  return `₹${Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * BillingStat — minimal flat widget for the Billing & Subscriptions
 * page summary. Same chrome as the StatCard pattern used on the
 * Database Employees screen (white card, light border, rounded-xl,
 * caption label + h2 value + caption sub) so the Billing summary
 * reads consistently with the rest of the build's stat strips.
 */
function BillingStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] p-4">
      <p className="text-caption text-black/55 font-medium">{label}</p>
      <p className={`text-h2 font-bold tabular-nums mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-caption text-black/45 font-normal mt-1">{sub}</p>}
    </div>
  );
}

// Brego registered details — fixed for the mock, used in the invoice
// preview modal so the rendered invoice looks like a real document
// instead of a placeholder.
const BREGO = {
  name: 'Brego Business',
  address: 'Lower Parel, Mumbai 400013',
  gstin: '27AABCB1234C1Z5',
  pan:   'AABCB1234C',
  email: 'finance@bregobusiness.com',
};

// ── Statement model ────────────────────────────────────────────────

type EntryType = 'invoice' | 'payment' | 'setup-fee' | 'plan-change';

interface StatementEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  type: EntryType;
  description: string;
  /** Positive = charged to client; negative = paid by client. */
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Recorded';
  reference: string;   // invoice number or payment rail
}

/**
 * Build a chronological statement for one business, deterministic
 * from joinedDate + retainer + plan + pendingAmount on the customer
 * record. Newest first.
 */
function buildStatement(c: Customer): StatementEntry[] {
  const entries: StatementEntry[] = [];
  const joined = parseDate(c.joinedDate);
  const cutoff = c.exitDate ? parseDate(c.exitDate) : TODAY;
  const idStub = c.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padStart(4, '0').slice(-4);

  // 1. A&T setup fee on join (one-time, tiered customers only).
  const plan = resolveAtPlan(c);
  if (plan && AT_PLAN_DETAILS[plan].setupFee !== null) {
    entries.push({
      id: `${c.id}-setup`,
      date: c.joinedDate,
      type: 'setup-fee',
      description: `${plan} plan — setup fee`,
      amount: AT_PLAN_DETAILS[plan].setupFee!,
      status: 'Paid',
      reference: `SETUP-${idStub}`,
    });
    const setupPay = new Date(joined);
    setupPay.setDate(setupPay.getDate() + 7);
    if (setupPay <= cutoff) {
      entries.push({
        id: `${c.id}-setup-pay`,
        date: isoDate(setupPay),
        type: 'payment',
        description: 'Setup fee — payment received',
        amount: -AT_PLAN_DETAILS[plan].setupFee!,
        status: 'Recorded',
        reference: 'NEFT',
      });
    }
  }

  // 2. Monthly retainer cycle. One invoice on the 1st of each
  //    month from join → today, with matching payment 5–15 days
  //    later when paid (deterministic offset by month index).
  let cursor = new Date(joined.getFullYear(), joined.getMonth(), 1);
  let invoiceIdx = 0;
  const total = totalMonths(joined, TODAY);
  while (cursor <= cutoff) {
    if (cursor > TODAY) break;
    invoiceIdx += 1;
    const invDate = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const isCurrentMonth = cursor.getFullYear() === TODAY.getFullYear() && cursor.getMonth() === TODAY.getMonth();

    // Pending logic: pendingAmount > 0 → most recent invoice is
    // Pending; >= 2 months due → prior invoice is Overdue.
    let invoiceStatus: StatementEntry['status'] = 'Paid';
    const monthsOverdue = c.pendingAmount > 0 ? Math.max(1, Math.round(c.pendingAmount / Math.max(c.monthlyRetainer, 1))) : 0;
    if (monthsOverdue >= 1 && isCurrentMonth) invoiceStatus = 'Pending';
    if (monthsOverdue >= 2 && invoiceIdx === total - 1) invoiceStatus = 'Overdue';

    entries.push({
      id: `${c.id}-inv-${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
      date: isoDate(invDate),
      type: 'invoice',
      description: 'Monthly retainer',
      amount: c.monthlyRetainer,
      status: invoiceStatus,
      reference: `INV-${idStub}-${String(cursor.getMonth() + 1).padStart(2, '0')}${String(cursor.getFullYear()).slice(-2)}`,
    });

    if (invoiceStatus === 'Paid') {
      const offset = 5 + ((invoiceIdx * 3) % 11);
      const payDate = new Date(invDate);
      payDate.setDate(invDate.getDate() + offset);
      if (payDate <= TODAY) {
        entries.push({
          id: `${c.id}-pay-${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
          date: isoDate(payDate),
          type: 'payment',
          description: 'Payment received',
          amount: -c.monthlyRetainer,
          status: 'Recorded',
          reference: invoiceIdx % 3 === 0 ? 'UPI' : 'NEFT',
        });
      }
    }

    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return entries.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.type === 'invoice' && b.type === 'payment') return -1;
    if (a.type === 'payment' && b.type === 'invoice') return 1;
    return 0;
  });
}

function totalMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
}

// ── Account-level rollup ──────────────────────────────────────────

interface AccountSummary {
  paidYTD: number;       // sum of payments inside the current calendar year
  outstanding: number;   // billed minus paid (lifetime)
  lastPaymentDate: string | null;
  nextBillingDate: string | null;
}

function summarizeAccount(entries: StatementEntry[], c: Customer): AccountSummary {
  let billed = 0;
  let paid = 0;
  let paidYTD = 0;
  let lastPaymentDate: string | null = null;
  const ytdYear = TODAY.getFullYear();
  for (const e of entries) {
    if (e.amount > 0) billed += e.amount;
    else paid += -e.amount;
    if (e.type === 'payment' && parseDate(e.date).getFullYear() === ytdYear) {
      paidYTD += -e.amount;
    }
    if (e.type === 'payment' && (lastPaymentDate === null || e.date > lastPaymentDate)) {
      lastPaymentDate = e.date;
    }
  }
  let nextBillingDate: string | null = null;
  if (c.status === 'Active' && (!c.exitDate || parseDate(c.exitDate) > TODAY)) {
    nextBillingDate = isoDate(new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 1));
  }
  return {
    paidYTD,
    outstanding: Math.max(0, billed - paid),
    lastPaymentDate,
    nextBillingDate,
  };
}

// ── Filters ───────────────────────────────────────────────────────

type ServiceFilter = 'All' | CustomerService;
type StatusFilter  = 'All' | CustomerStatus;
type DuesFilter    = 'All' | 'with-dues' | 'settled';

interface BillingFilters {
  service: ServiceFilter;
  status: StatusFilter;
  dues: DuesFilter;
}

const DEFAULT_FILTERS: BillingFilters = { service: 'All', status: 'All', dues: 'All' };

function activeFilterCount(f: BillingFilters): number {
  let n = 0;
  if (f.service !== 'All') n++;
  if (f.status !== 'All')  n++;
  if (f.dues !== 'All')    n++;
  return n;
}

function filterLabel(f: BillingFilters, key: keyof BillingFilters): string {
  if (key === 'service') return f.service === 'Performance Marketing' ? 'SEM' : f.service === 'Accounts & Taxation' ? 'A&T' : f.service;
  if (key === 'status')  return f.status;
  // dues
  return f.dues === 'with-dues' ? 'With outstanding' : f.dues === 'settled' ? 'Settled only' : 'All';
}

// ── Sibling-accounts helper ───────────────────────────────────────

/** Return every other business owned by the same `customerId`,
 *  sorted Active → Inactive then by retainer. Used to render the
 *  "Other accounts under [Contact]" chip row on the detail page. */
function siblingAccounts(c: Customer): Customer[] {
  return MOCK_CUSTOMERS
    .filter(x => x.customerId && x.customerId === c.customerId && x.id !== c.id)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      return b.monthlyRetainer - a.monthlyRetainer;
    });
}

// ── Plan pill ──────────────────────────────────────────────────────

function PlanPill({ plan }: { plan: ATPlan | null }) {
  if (!plan) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium bg-[#EEF1FB] text-[#5B7FD6]">
      {plan}
    </span>
  );
}

// ── Status pill — exception-only ──────────────────────────────────

/** Renders only for Pending / Overdue — the silent defaults
 *  (Paid / Recorded) return null so the statement doesn't shout
 *  on every row. */
function ExceptionStatusPill({ status }: { status: StatementEntry['status'] }) {
  if (status === 'Paid' || status === 'Recorded') return null;
  const cls = status === 'Pending'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-caption font-medium border ${cls}`}>
      {status}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// ENTRY — picks list vs detail from `?client=` param
// ════════════════════════════════════════════════════════════════════

export function BillingDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const clientParam = searchParams.get('client');

  const business = useMemo(
    () => clientParam ? MOCK_CUSTOMERS.find(c => c.id === clientParam) ?? null : null,
    [clientParam],
  );

  const goToList = () => router.push(`${pathname}?tab=customers&sub=billing`);
  const goToBusiness = (id: string) => router.push(`${pathname}?tab=customers&sub=billing&client=${id}`);

  if (business) return <BillingStatementPage business={business} onBack={goToList} onSwitch={goToBusiness} />;
  return <BillingListPage onSelect={goToBusiness} />;
}

// ════════════════════════════════════════════════════════════════════
// FILTER PANEL
// ════════════════════════════════════════════════════════════════════
//
// Same shape as the filter panels on Relationships / Lost Clients /
// Incidents — three labelled groups in a small popover anchored to
// the top-bar filter button. Outside-click + Escape close it; the
// activeCount badge on the trigger button stays in sync.
// ════════════════════════════════════════════════════════════════════

function FilterOption<T extends string>({
  label, value, selected, onSelect,
}: { label: string; value: T; selected: boolean; onSelect: (v: T) => void }) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-caption transition-all ${
        selected
          ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold'
          : 'text-black/70 hover:bg-black/[0.03]'
      }`}
    >
      <span>{label}</span>
      {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
    </button>
  );
}

function BillingFilterPanel({
  filters, onChange, onClose, onReset, activeCount,
}: {
  filters: BillingFilters;
  onChange: (f: BillingFilters) => void;
  onClose: () => void;
  onReset: () => void;
  activeCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1.5 w-[320px] bg-white border border-black/[0.08] rounded-xl shadow-lg z-30 p-4"
      role="dialog"
      aria-label="Filter billing accounts"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-black/85 text-caption font-semibold">Filter</p>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-caption text-[#204CC7] font-medium hover:underline">
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3.5">
        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Service</p>
          <div className="space-y-0.5">
            <FilterOption<ServiceFilter> label="All services" value="All" selected={filters.service === 'All'} onSelect={v => onChange({ ...filters, service: v })} />
            <FilterOption<ServiceFilter> label="Performance Marketing" value="Performance Marketing" selected={filters.service === 'Performance Marketing'} onSelect={v => onChange({ ...filters, service: v })} />
            <FilterOption<ServiceFilter> label="Accounts & Taxation" value="Accounts & Taxation" selected={filters.service === 'Accounts & Taxation'} onSelect={v => onChange({ ...filters, service: v })} />
            <FilterOption<ServiceFilter> label="Both" value="Both" selected={filters.service === 'Both'} onSelect={v => onChange({ ...filters, service: v })} />
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Status</p>
          <div className="space-y-0.5">
            <FilterOption<StatusFilter> label="All statuses" value="All" selected={filters.status === 'All'} onSelect={v => onChange({ ...filters, status: v })} />
            <FilterOption<StatusFilter> label="Active" value="Active" selected={filters.status === 'Active'} onSelect={v => onChange({ ...filters, status: v })} />
            <FilterOption<StatusFilter> label="Inactive" value="Inactive" selected={filters.status === 'Inactive'} onSelect={v => onChange({ ...filters, status: v })} />
          </div>
        </div>

        <div>
          <p className="text-caption font-semibold text-black/50 uppercase tracking-wide px-1 mb-1.5">Dues</p>
          <div className="space-y-0.5">
            <FilterOption<DuesFilter> label="All accounts" value="All" selected={filters.dues === 'All'} onSelect={v => onChange({ ...filters, dues: v })} />
            <FilterOption<DuesFilter> label="With outstanding" value="with-dues" selected={filters.dues === 'with-dues'} onSelect={v => onChange({ ...filters, dues: v })} />
            <FilterOption<DuesFilter> label="Settled only" value="settled" selected={filters.dues === 'settled'} onSelect={v => onChange({ ...filters, dues: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIST — directory of all billing accounts
// ════════════════════════════════════════════════════════════════════

function BillingListPage({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<BillingFilters>(DEFAULT_FILTERS);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Period state — drives the MonthNavigator + PeriodLabel pill in
  // the top bar, same pattern used by Recurring Checklist and
  // Relationships. Defaults to today's calendar month so the page
  // opens on "now"; admins flip back to a closed month to look at
  // a historical billing snapshot ("how much did we invoice in
  // March?"). The selected period scopes the "Invoiced" + "Paid"
  // figures in the rollup line below the top bar; the directory
  // itself stays current ("Outstanding now") so day-to-day triage
  // never lies about what's owed today.
  const today = new Date();
  const [pageMonthIdx, setPageMonthIdx] = useState<number>(today.getMonth());
  const [pageYear, setPageYear] = useState<number>(today.getFullYear());

  const filterCount = activeFilterCount(filters);

  // Per-account statement is computed once per row regardless of
  // which filters are active — the period figures need to survey
  // the entire book, so we can't short-circuit.
  const allRows = useMemo(() => {
    return MOCK_CUSTOMERS.map(c => ({ c, statement: buildStatement(c), summary: summarizeAccount(buildStatement(c), c) }));
  }, []);

  // Visible rows after search + filter (NOT period — period only
  // affects the rollup figures, not which rows render).
  const rows = useMemo(() => {
    return allRows
      .filter(({ c, summary }) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          if (!(c.companyName.toLowerCase().includes(q) || c.contactPerson.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))) return false;
        }
        if (filters.service !== 'All' && c.service !== filters.service) return false;
        if (filters.status  !== 'All' && c.status  !== filters.status)  return false;
        if (filters.dues === 'with-dues' && summary.outstanding === 0) return false;
        if (filters.dues === 'settled'   && summary.outstanding > 0)   return false;
        return true;
      })
      .sort((a, b) => {
        if (a.summary.outstanding !== b.summary.outstanding) return b.summary.outstanding - a.summary.outstanding;
        if (a.c.status !== b.c.status) return a.c.status === 'Active' ? -1 : 1;
        return b.c.monthlyRetainer - a.c.monthlyRetainer;
      });
  }, [allRows, search, filters]);

  // Period-scoped figures — sum invoices and payments dated inside
  // the selected (year, month). These are computed off the visible
  // (filtered) rows so a "with outstanding" filter narrows the
  // rollup too — what you see in the table is what the rollup
  // describes.
  const totals = useMemo(() => {
    let invoiced = 0;
    let paid = 0;
    for (const { statement } of rows) {
      for (const e of statement) {
        const d = parseDate(e.date);
        if (d.getFullYear() === pageYear && d.getMonth() === pageMonthIdx) {
          if (e.amount > 0) invoiced += e.amount;
          else              paid     += -e.amount;
        }
      }
    }
    const active = rows.filter(r => r.c.status === 'Active').length;
    const outstanding = rows.reduce((s, r) => s + r.summary.outstanding, 0);
    return { activeAccounts: active, invoiced, paid, outstanding };
  }, [rows, pageYear, pageMonthIdx]);

  const ownerCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of MOCK_CUSTOMERS) {
      if (!c.customerId) continue;
      m.set(c.customerId, (m.get(c.customerId) ?? 0) + 1);
    }
    return m;
  }, []);

  const periodLabel = `${MONTHS[pageMonthIdx]} ${pageYear}`;

  return (
    <div className="space-y-4">
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          {/* Left — title + subtitle, divider, MonthNavigator +
              PeriodLabel. Same chrome as the Recurring Checklist
              and Relationships top bars so the period control
              reads as a familiar app-wide pattern. */}
          <div className="flex items-center gap-4 shrink-0 min-w-0">
            <div className="shrink-0">
              <p className="text-black/90 text-body font-semibold">Billing & Subscriptions</p>
              <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Per-business statement history</p>
            </div>
            <div className="w-px h-8 bg-black/[0.08]" aria-hidden="true" />
            <MonthNavigator
              monthIdx={pageMonthIdx}
              year={pageYear}
              onMonthChange={setPageMonthIdx}
              onYearChange={setPageYear}
              minYear={2023}
            />
            <PeriodLabel monthIdx={pageMonthIdx} year={pageYear} />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {(filterCount > 0 || search) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/55">
                {rows.length} of {MOCK_CUSTOMERS.length} accounts
              </span>
            )}

            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="billing-search" className="sr-only">Search accounts</label>
              <input
                id="billing-search"
                type="text"
                placeholder="Search business or contact…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5" aria-label="Clear search">
                  <X className="w-3.5 h-3.5 text-black/60 hover:text-black/70" />
                </button>
              )}
            </div>

            {/* Filter — same shape as every other Customers
                sub-page (Relationships / Lost Clients / Incidents).
                Tinted button + count badge when filters active. */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                aria-expanded={showFilterPanel}
                aria-haspopup="dialog"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all text-caption font-medium focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 ${
                  filterCount > 0
                    ? 'border-[#204CC7]/30 bg-[#204CC7]/[0.04] text-[#204CC7] font-semibold'
                    : 'border-black/10 bg-white text-black/70 hover:bg-black/[0.02] hover:border-black/20'
                }`}
              >
                <Filter className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Filter</span>
                {filterCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#204CC7] text-white text-caption font-semibold min-w-[18px] text-center leading-none">{filterCount}</span>}
              </button>
              {showFilterPanel && (
                <BillingFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  onClose={() => setShowFilterPanel(false)}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  activeCount={filterCount}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Period-scoped rollup widgets — replaces the previous inline
          text summary with four flat stat cards so the headline
          numbers read at a glance. Each card is its own scope:
            • Active Accounts — live (not period-scoped)
            • Invoiced        — period (the {periodLabel} above)
            • Paid            — period · emerald (positive)
            • Outstanding     — live across all months · rose when >0,
                                 muted "All clear" line when zero so
                                 the card never looks dead.
          Per-card `sub` line carries the temporal qualifier so
          "live vs period" is unambiguous when an admin scrubs to a
          past month. */}
      <div className="grid grid-cols-4 gap-3">
        <BillingStat
          label="Active Accounts"
          value={totals.activeAccounts}
          sub="Live"
          color="text-black/85"
        />
        <BillingStat
          label="Invoiced"
          value={formatCurrency(totals.invoiced)}
          sub={`in ${periodLabel}`}
          color="text-black/85"
        />
        <BillingStat
          label="Paid"
          value={formatCurrency(totals.paid)}
          sub={`in ${periodLabel}`}
          color="text-emerald-700"
        />
        <BillingStat
          label="Outstanding"
          value={formatCurrency(totals.outstanding)}
          sub={totals.outstanding > 0 ? 'Live · across all months' : 'All clear'}
          color={totals.outstanding > 0 ? 'text-[#E2445C]' : 'text-black/45'}
        />
      </div>

      {/* Active filter chips — removable pills that mirror what's
          configured in the panel. Only renders when at least one
          filter is set; same pattern as CLAClients / LostClients. */}
      {filterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-medium text-black/55">Filtered by:</span>
          {filters.service !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filterLabel(filters, 'service')}
              <button onClick={() => setFilters(f => ({ ...f, service: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5" aria-label="Clear service filter">
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {filters.status !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filterLabel(filters, 'status')}
              <button onClick={() => setFilters(f => ({ ...f, status: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5" aria-label="Clear status filter">
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          )}
          {filters.dues !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#204CC7]/[0.06] text-[#204CC7] text-caption font-medium">
              {filterLabel(filters, 'dues')}
              <button onClick={() => setFilters(f => ({ ...f, dues: 'All' }))} className="hover:bg-[#204CC7]/10 rounded p-0.5" aria-label="Clear dues filter">
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Slim directory — 4 columns + chevron. No Plan / Last
          Payment / Status columns; those live on the detail page. */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/[0.06]">
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Account</th>
                <th className="px-4 py-3 text-left text-black/55 text-caption font-semibold uppercase tracking-wide">Service</th>
                <th className="px-4 py-3 text-right text-black/55 text-caption font-semibold uppercase tracking-wide">Monthly</th>
                <th className="px-4 py-3 text-right text-black/55 text-caption font-semibold uppercase tracking-wide">Outstanding</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, summary }) => {
                const hasDue = summary.outstanding > 0;
                const inactive = c.status !== 'Active';
                const ownerCount = c.customerId ? ownerCounts.get(c.customerId) ?? 1 : 1;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    // Row-wide `opacity-60` for Inactive customers
                    // was retired — it muted the rose-on-due tint
                    // for any Inactive row that still owed money,
                    // turning a clear "money outstanding" signal
                    // into a washed-out hybrid. Inactive status
                    // now lives explicitly as a small chip in the
                    // Account column so the signal reads in one
                    // spot rather than dimming the whole row.
                    className={`border-b border-black/[0.04] last:border-0 cursor-pointer transition-colors ${
                      hasDue ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-black/[0.015]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-black/90 text-body font-medium truncate">{c.companyName}</p>
                        {inactive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-caption font-medium bg-slate-100 text-slate-600 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-black/55 text-caption font-normal mt-0.5">
                        {c.contactPerson}
                        {ownerCount > 1 && (
                          <span className="text-black/40"> · +{ownerCount - 1} more {ownerCount - 1 === 1 ? 'account' : 'accounts'}</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3"><ServicePill service={c.service} /></td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-black/85 text-body font-semibold tabular-nums">{formatCurrency(c.monthlyRetainer)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {hasDue ? (
                        <p className="text-[#E2445C] text-body font-semibold tabular-nums">{formatCurrency(summary.outstanding)}</p>
                      ) : (
                        <p className="text-black/30 text-caption font-normal">—</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-black/35 inline" aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="py-16 text-center">
            <CreditCard className="w-10 h-10 text-black/10 mx-auto mb-3" aria-hidden="true" />
            <p className="text-black/50 text-body font-medium">No accounts match your search</p>
            <p className="text-black/35 text-caption font-normal mt-1">Try a different business name or contact</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DETAIL — bank-statement-style page for one business
// ════════════════════════════════════════════════════════════════════

function BillingStatementPage({
  business: c,
  onBack,
  onSwitch,
}: {
  business: Customer;
  onBack: () => void;
  onSwitch: (id: string) => void;
}) {
  const stmt = useMemo(() => buildStatement(c), [c]);
  const summary = useMemo(() => summarizeAccount(stmt, c), [stmt, c]);
  const siblings = useMemo(() => siblingAccounts(c), [c]);

  // Filters — Year + Type segment.
  const yearsAvailable = useMemo(() => {
    const set = new Set(stmt.map(e => e.date.slice(0, 4)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [stmt]);
  const defaultYear = yearsAvailable[0] ?? String(TODAY.getFullYear());
  const [year, setYear] = useState<string>(defaultYear);
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'payment'>('all');

  const filtered = useMemo(() => {
    return stmt.filter(e => {
      if (e.date.slice(0, 4) !== year) return false;
      if (typeFilter === 'all') return true;
      if (typeFilter === 'invoice') return e.type === 'invoice' || e.type === 'setup-fee' || e.type === 'plan-change';
      return e.type === 'payment';
    });
  }, [stmt, year, typeFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, StatementEntry[]>();
    for (const e of filtered) {
      const key = e.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const plan = resolveAtPlan(c);

  // Invoice preview modal state — only one invoice open at a time.
  const [previewInvoice, setPreviewInvoice] = useState<StatementEntry | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-caption font-medium text-black/65 hover:text-[#204CC7] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Billing & Subscriptions
            <ChevronRight className="w-3 h-3 text-black/35" aria-hidden="true" />
            <span className="text-black/85 font-semibold">{c.companyName}</span>
          </button>
        </div>
      </div>

      {/* Identity card — single rich card that consolidates the
          previous identity strip + two KPI cards into one block.
          Top section: pills + name + meta. Below the divider: a
          4-column financial strip (Monthly · Paid YTD · Outstanding
          · Next bill). Sibling accounts (when present) close the
          card. The previous KPI grid has been retired — its two
          figures are now columns 2 and 3 of the financial strip. */}
      <div className="bg-white border border-black/[0.06] rounded-xl p-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            {/* Identity row — service pill, company name, and the
                meta strip (status · contact · customer-since) sit
                on a single horizontal row. The h1 was bumped down
                to text-h2 (20px) so it pairs cleanly with the
                pill and meta line in height; previously the h1's
                24px font dwarfed both, leaving the pill floating
                low and the meta disconnected from the title.
                items-center now lines up the three elements on a
                shared optical centerline; the meta gets a left
                border-divider so the visual break between "who"
                and "context" is explicit without competing for
                the same baseline. flex-wrap keeps the layout safe
                on narrow viewports — only the meta wraps. */}
            <div className="flex items-center gap-3 flex-wrap">
              <ServicePill service={c.service} />
              <h1 className="text-h2 font-bold text-black/90 leading-none">{c.companyName}</h1>
              <p className="pl-3 border-l border-black/[0.10] text-caption text-black/55 inline-flex items-center gap-1.5 leading-none">
                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                <span className="text-black/75 font-medium">{c.status}</span>
                <span className="text-black/35">·</span>
                <span>{c.contactPerson}</span>
                <span className="text-black/35">·</span>
                <span>Customer since {formatDate(c.joinedDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Financial strip — 4 columns, label-on-top. The single
            authoritative read on this account's money state. Each
            column has a quiet caption beneath the headline number
            that adds the one detail an admin actually wants
            ("Growing Business plan", "Last on 14 Apr", "Awaiting
            payment", "in 25 days"). */}
        <div className="mt-6 pt-6 border-t border-black/[0.06] grid grid-cols-4 gap-6">
          <FinancialColumn
            label="Monthly"
            value={formatCurrency(c.monthlyRetainer)}
            sub={plan ? `${plan} plan` : null}
          />
          <FinancialColumn
            label={`Paid in ${TODAY.getFullYear()}`}
            value={formatCurrency(summary.paidYTD)}
            sub={summary.lastPaymentDate ? `Last on ${formatDate(summary.lastPaymentDate)}` : 'No payments yet'}
          />
          <FinancialColumn
            label="Outstanding"
            value={summary.outstanding > 0 ? formatCurrency(summary.outstanding) : 'Settled'}
            sub={summary.outstanding > 0 ? 'Awaiting payment' : 'All clear'}
            accent={summary.outstanding > 0 ? 'warn' : 'good'}
          />
          <FinancialColumn
            label="Next bill"
            value={summary.nextBillingDate ? formatDate(summary.nextBillingDate) : '—'}
            sub={summary.nextBillingDate ? formatNextBillSub(summary.nextBillingDate) : 'Not active'}
          />
        </div>

        {/* Sibling accounts — only renders when the contact owns
            more than one business. The contact's name is dropped
            from the heading since it's already on the line above
            ("…Rahul Desai · Customer since Jul 2025"). */}
        {siblings.length > 0 && (
          <div className="mt-6 pt-5 border-t border-black/[0.05] flex items-center gap-3 flex-wrap">
            <span className="text-caption text-black/50 font-medium">Other accounts:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {siblings.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSwitch(s.id)}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-black/[0.08] bg-white hover:bg-black/[0.03] hover:border-black/15 text-caption font-medium text-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  <span>{s.companyName}</span>
                  <span className="text-black/40 tabular-nums">{formatCurrency(s.monthlyRetainer)}/mo</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Statement section */}
      <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-black/[0.06] flex-wrap">
          <h2 className="text-body font-semibold text-black/90">Statement</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-black/[0.04] rounded-lg p-0.5" role="tablist" aria-label="Entry type">
              {(
                [
                  { key: 'all',     label: 'All' },
                  { key: 'invoice', label: 'Invoices' },
                  { key: 'payment', label: 'Payments' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.key}
                  role="tab"
                  aria-selected={typeFilter === opt.key}
                  onClick={() => setTypeFilter(opt.key)}
                  className={`px-3 py-1 text-caption font-medium rounded-md transition-all ${
                    typeFilter === opt.key
                      ? 'bg-white text-black shadow-sm'
                      : 'text-black/65 hover:text-black/85'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {yearsAvailable.length > 1 && (
              <select
                value={year}
                onChange={e => setYear(e.target.value)}
                className="appearance-none px-3 py-1.5 rounded-md border border-black/10 bg-white text-caption font-medium text-black/75 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all cursor-pointer"
                aria-label="Statement year"
              >
                {yearsAvailable.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-black/10 mx-auto mb-3" aria-hidden="true" />
            <p className="text-black/50 text-body font-medium">No entries for this period</p>
            <p className="text-black/35 text-caption font-normal mt-1">Try a different year or change the type filter</p>
          </div>
        ) : (
          groups.map(([monthKey, entries]) => (
            <div key={monthKey}>
              <div className="px-6 py-2 bg-black/[0.02] border-y border-black/[0.04]">
                <p className="text-caption font-semibold text-black/55 uppercase tracking-wider">{formatMonthYear(`${monthKey}-01`)}</p>
              </div>
              <ul className="divide-y divide-black/[0.04]">
                {entries.map(e => (
                  <StatementRow
                    key={e.id}
                    entry={e}
                    onView={
                      // View / Download only apply to invoice-shaped
                      // entries (regular invoice + setup-fee). Payment
                      // entries get nothing here — there's no document
                      // to render. Keeps the UI honest about what each
                      // row can actually do.
                      (e.type === 'invoice' || e.type === 'setup-fee')
                        ? () => setPreviewInvoice(e)
                        : undefined
                    }
                    onDownload={
                      (e.type === 'invoice' || e.type === 'setup-fee')
                        ? () => downloadInvoice(c, e)
                        : undefined
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {previewInvoice && (
        <InvoicePreviewModal
          business={c}
          entry={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}

/** A single column inside the identity card's financial strip.
 *  Label on top in small caps, the headline number in h2 (lighter
 *  than the previous standalone KPI cards on purpose — this strip
 *  is part of the identity card now, not its own card-on-card
 *  block, so the figure shouldn't shout as loudly). */
function FinancialColumn({
  label,
  value,
  sub,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  sub: string | null;
  accent?: 'neutral' | 'warn' | 'good';
}) {
  const valueCls =
    accent === 'warn' ? 'text-[#E2445C]' :
    accent === 'good' ? 'text-[#00C875]' :
    'text-black/90';
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-h2 font-bold tabular-nums leading-tight mt-1 truncate ${valueCls}`}>{value}</p>
      {sub && <p className="text-caption text-black/55 mt-1">{sub}</p>}
    </div>
  );
}

/** Helper for the "Next bill" sub-caption — "in N days" / "today" /
 *  past dates ("overdue by N days") cover the three temporal cases
 *  cleanly without leaking calendar math into the JSX. */
function formatNextBillSub(iso: string): string {
  const target = parseDate(iso);
  const t0 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const diffDays = Math.round((target.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
}

function StatementRow({
  entry: e,
  onView,
  onDownload,
}: {
  entry: StatementEntry;
  onView?: () => void;
  onDownload?: () => void;
}) {
  const isCredit = e.amount < 0;
  const Icon =
    e.type === 'payment'      ? FileText :
    e.type === 'plan-change'  ? Sparkles :
    e.type === 'setup-fee'    ? CreditCard :
                                FileText;
  const iconColor =
    e.type === 'payment'      ? 'text-[#00C875] bg-[#00C875]/[0.08]' :
    e.type === 'plan-change'  ? 'text-[#7C3AED] bg-[#7C3AED]/[0.08]' :
                                'text-[#5B7FD6] bg-[#EEF1FB]';
  return (
    <li className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/[0.015] transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-black/85 truncate">{e.description}</p>
        <p className="text-caption text-black/50 mt-0.5">{formatDate(e.date)} · {e.reference}</p>
      </div>

      {/* Optional inline status pill — only for Pending / Overdue.
          Sits between description and amount so attention rows
          stand out without coloring everything. */}
      <ExceptionStatusPill status={e.status} />

      <div className="text-right shrink-0 min-w-[112px]">
        <p className={`text-body font-semibold tabular-nums ${isCredit ? 'text-[#00C875]' : 'text-black/85'}`}>
          {isCredit ? '+ ' : '− '}{formatExact(e.amount)}
        </p>
      </div>

      {/* Inline View + Download for invoice-shaped rows. Renders
          a placeholder w-[68px] block on payment rows so the
          amount column stays in vertical alignment across the
          statement instead of jittering when each row decides
          whether to render the action cluster. */}
      {(onView || onDownload) ? (
        <div className="flex items-center gap-1 shrink-0">
          {onView && (
            <button
              type="button"
              onClick={onView}
              aria-label="View invoice"
              title="View invoice"
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              aria-label="Download invoice"
              title="Download invoice"
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:text-[#204CC7] hover:bg-[#204CC7]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="w-[68px] shrink-0" aria-hidden="true" />
      )}
    </li>
  );
}

// ════════════════════════════════════════════════════════════════════
// INVOICE PREVIEW MODAL + DOWNLOAD
// ════════════════════════════════════════════════════════════════════
//
// The modal renders a print-friendly invoice with billed-from,
// billed-to, line items, GST 18%, and total. The download path
// reuses the same HTML so the saved file matches what the admin
// just looked at — no second source of truth.
// ════════════════════════════════════════════════════════════════════

interface InvoiceLine {
  description: string;
  amount: number;
}

function buildInvoiceLines(c: Customer, e: StatementEntry): InvoiceLine[] {
  if (e.type === 'setup-fee') {
    return [{ description: e.description, amount: e.amount }];
  }
  // For monthly retainer invoices on Both-service businesses, split
  // the retainer ~50/50 between SEM and A&T as line items. For
  // single-service businesses, one line. The split is presentational
  // only — the underlying retainer is a single number on the
  // customer record. If real per-service pricing lands later,
  // replace this with the actual breakdown.
  const monthLabel = formatMonthYear(`${e.date.slice(0, 7)}-01`);
  if (c.service === 'Both') {
    const half = Math.round(e.amount / 2);
    return [
      { description: `${monthLabel} — Performance Marketing services`, amount: half },
      { description: `${monthLabel} — Accounts & Taxation services`,  amount: e.amount - half },
    ];
  }
  const svc = c.service === 'Performance Marketing' ? 'Performance Marketing' : 'Accounts & Taxation';
  return [{ description: `${monthLabel} — ${svc} retainer`, amount: e.amount }];
}

function InvoicePreviewModal({
  business: c,
  entry: e,
  onClose,
}: {
  business: Customer;
  entry: StatementEntry;
  onClose: () => void;
}) {
  const ref = useModalA11y(true, onClose);
  const lines = buildInvoiceLines(c, e);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  // Service label — expand "Both" to its full pair so the invoice
  // reads "Performance Marketing + Accounts & Taxation" instead of
  // the internal-only "Both" enum value.
  const serviceLabel = c.service === 'Both' ? 'Performance Marketing + Accounts & Taxation' : c.service;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-title"
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[92vh] bg-white shadow-2xl rounded-2xl overflow-hidden focus:outline-none flex flex-col"
      >
        {/* Modal chrome — ultra-quiet. Just "Invoice" + the
            two actions. The invoice number, date, and status
            all surface inside the document itself, so the
            chrome doesn't echo them. */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-black/[0.06]">
          <h2 id="invoice-preview-title" className="text-body font-semibold text-black/90">Invoice</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadInvoice(c, e)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:text-black/80 hover:bg-black/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────
            DOCUMENT BODY
            ─────────────────────────────────────────────────────
            Visual rhythm tuned for a clean financial document:
              • px-10 py-9 (40 / 36px) page padding — generous
              • mb-8 between major sections (32px), with a thin
                divider under each block
              • Section labels: text-[11px] uppercase tracking-
                wider text-black/45 font-semibold (Bill-to,
                Pay-to, etc.)
              • Field rows: caption-label / body-value pairs
                aligned in a 2-col flex with justify-between
              • Tabular-nums on every money column so the
                rupee values line up vertically across rows
            ───────────────────────────────────────────────────── */}
        <div className="overflow-y-auto px-10 py-9">
          {/* MASTHEAD — issuer on the left as the document
              owner; "Invoice" + number + date + status on the
              right as the document identity. Single horizontal
              divider closes the masthead. */}
          <div className="flex items-start justify-between gap-8 pb-7 mb-8 border-b border-black/[0.08]">
            <div>
              <p className="text-h3 font-semibold text-black/90 leading-tight">{BREGO.name}</p>
              <p className="text-caption text-black/55 mt-1.5 leading-relaxed">{BREGO.address}</p>
              <p className="text-caption text-black/55 leading-relaxed">GSTIN {BREGO.gstin}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider">Invoice</p>
              <p className="text-h2 font-bold text-black/90 tabular-nums leading-tight mt-1">{e.reference}</p>
              <p className="text-caption text-black/55 mt-1.5">Issued {formatDate(e.date)}</p>
              <div className="mt-2.5 flex justify-end">
                <InvoiceStatusChip status={e.status} />
              </div>
            </div>
          </div>

          {/* BILL-TO + DETAILS — two equally-weighted columns,
              both label-on-top so they read as paired meta
              blocks instead of asymmetric content. */}
          <div className="grid grid-cols-2 gap-10 pb-7 mb-8 border-b border-black/[0.08]">
            <div>
              <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider mb-2.5">Bill to</p>
              <p className="text-body font-semibold text-black/90">{c.companyName}</p>
              <p className="text-caption text-black/65 mt-0.5">{c.contactPerson}</p>
              <p className="text-caption text-black/55 mt-2 leading-relaxed">{c.address}</p>
              {c.gstNumber && <p className="text-caption text-black/55 mt-1">GSTIN {c.gstNumber}</p>}
            </div>
            <div>
              <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider mb-2.5">Details</p>
              <dl className="space-y-1.5">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-caption text-black/55">Invoice no.</dt>
                  <dd className="text-caption font-medium text-black/85 tabular-nums">{e.reference}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-caption text-black/55">Date</dt>
                  <dd className="text-caption font-medium text-black/85">{formatDate(e.date)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-caption text-black/55 shrink-0">Service</dt>
                  <dd className="text-caption font-medium text-black/85 text-right">{serviceLabel}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* LINE ITEMS — clean, single divider under the
              column heads, no zebra stripes, no row borders.
              Generous py-3.5 row padding so each item sits
              comfortably. Reads as a quiet ledger, not a
              dense grid. */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-black/[0.08]">
              <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider">Description</p>
              <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider">Amount</p>
            </div>
            <ul>
              {lines.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-3.5">
                  <span className="text-body text-black/85">{l.description}</span>
                  <span className="text-body text-black/85 tabular-nums">{formatExact(l.amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TOTALS — right-aligned column with a clear visual
              hierarchy: subtotal + GST as quiet rows, divider,
              then the Total emphasised but not shouting. */}
          <div className="flex justify-end mb-9">
            <dl className="w-full max-w-[280px]">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-caption text-black/55">Subtotal</dt>
                <dd className="text-body text-black/85 tabular-nums">{formatExact(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-caption text-black/55">GST 18%</dt>
                <dd className="text-body text-black/85 tabular-nums">{formatExact(gst)}</dd>
              </div>
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-black/[0.12]">
                <dt className="text-body font-semibold text-black/90">Total</dt>
                <dd className="text-h3 font-bold text-black/90 tabular-nums">{formatExact(total)}</dd>
              </div>
            </dl>
          </div>

          {/* PAY-TO — structured payment instructions block.
              Same label-on-top pattern as Bill-to so the
              document reads as a coherent set of blocks. */}
          <div className="pt-7 border-t border-black/[0.08]">
            <p className="text-[11px] text-black/45 font-semibold uppercase tracking-wider mb-2.5">Pay to</p>
            <p className="text-body font-semibold text-black/90">{BREGO.name}</p>
            <p className="text-caption text-black/55 mt-0.5">NEFT or UPI · PAN {BREGO.pan}</p>
            <p className="text-caption text-black/55 mt-2">Queries: <span className="text-black/75">{BREGO.email}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Status chip used in the invoice masthead. Properly styled pill
 *  with a colored dot — the previous treatment was bare colored
 *  text which read as a typo on a clean document. */
function InvoiceStatusChip({ status }: { status: StatementEntry['status'] }) {
  const cfg =
    status === 'Paid'     ? { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' } :
    status === 'Pending'  ? { cls: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500'   } :
    status === 'Overdue'  ? { cls: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500'    } :
                            { cls: 'bg-slate-50 text-slate-600 border-slate-200',       dot: 'bg-slate-400'   };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-caption font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

/**
 * Generates a self-contained printable HTML invoice and triggers
 * the browser to save it. Real PDF generation would replace this
 * with a server-side render or a client-side library; the wire
 * shape (one click → file in Downloads) stays identical.
 */
function downloadInvoice(c: Customer, e: StatementEntry): void {
  if (typeof window === 'undefined') return;
  const lines = buildInvoiceLines(c, e);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const serviceLabel = c.service === 'Both'
    ? 'Performance Marketing + Accounts & Taxation'
    : c.service;
  const statusColor =
    e.status === 'Paid'    ? '#047857' :
    e.status === 'Pending' ? '#b45309' :
    e.status === 'Overdue' ? '#be123c' :
                             '#475569';
  const statusBg =
    e.status === 'Paid'    ? '#ecfdf5' :
    e.status === 'Pending' ? '#fffbeb' :
    e.status === 'Overdue' ? '#fff1f2' :
                             '#f8fafc';
  const statusBorder =
    e.status === 'Paid'    ? '#a7f3d0' :
    e.status === 'Pending' ? '#fde68a' :
    e.status === 'Overdue' ? '#fecdd3' :
                             '#e2e8f0';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${e.reference}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Manrope', 'Segoe UI', sans-serif;
    color: #1a1a1a; background: #fff; margin: 0;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  .page { max-width: 720px; margin: 40px auto; padding: 40px; }

  /* Typography */
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(0,0,0,0.45); font-weight: 600; }
  .h2 { font-size: 22px; font-weight: 700; color: rgba(0,0,0,0.9); line-height: 1.2; margin: 0; font-variant-numeric: tabular-nums; }
  .h3 { font-size: 17px; font-weight: 600; color: rgba(0,0,0,0.9); line-height: 1.3; margin: 0; }
  .body { font-size: 14px; color: rgba(0,0,0,0.85); }
  .body-strong { font-size: 14px; color: rgba(0,0,0,0.9); font-weight: 600; }
  .caption { font-size: 13px; color: rgba(0,0,0,0.55); }
  .num { font-variant-numeric: tabular-nums; }

  /* Section dividers */
  .section { padding-bottom: 28px; margin-bottom: 32px; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .section:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }

  /* Masthead */
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; }
  .masthead .right { text-align: right; }
  .masthead .meta { font-size: 13px; color: rgba(0,0,0,0.55); margin-top: 6px; line-height: 1.55; }
  .status {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 6px; border: 1px solid ${statusBorder};
    background: ${statusBg}; color: ${statusColor};
    font-size: 13px; font-weight: 600; margin-top: 10px;
  }
  .status .dot { width: 6px; height: 6px; border-radius: 50%; background: ${statusColor}; }

  /* Bill-to + Details */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .meta-grid .block .label { margin-bottom: 10px; display: block; }
  .meta-grid .block p { margin: 0 0 2px 0; }
  .meta-grid .block .addr { color: rgba(0,0,0,0.55); margin-top: 8px; line-height: 1.55; }
  .details dl { margin: 0; }
  .details .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 3px 0; }
  .details dt { font-size: 13px; color: rgba(0,0,0,0.55); flex-shrink: 0; }
  .details dd { font-size: 13px; color: rgba(0,0,0,0.85); font-weight: 500; margin: 0; text-align: right; }

  /* Line items */
  .lines .head { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.08); }
  .lines .row { display: flex; justify-content: space-between; padding: 14px 0; gap: 16px; }
  .lines .row .desc { font-size: 14px; color: rgba(0,0,0,0.85); }
  .lines .row .amt { font-size: 14px; color: rgba(0,0,0,0.85); }

  /* Totals */
  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 100%; max-width: 280px; }
  .totals .line { display: flex; justify-content: space-between; padding: 6px 0; }
  .totals .line .key { font-size: 13px; color: rgba(0,0,0,0.55); }
  .totals .line .val { font-size: 14px; color: rgba(0,0,0,0.85); }
  .totals .total { padding-top: 12px; margin-top: 8px; border-top: 1px solid rgba(0,0,0,0.12); display: flex; justify-content: space-between; align-items: baseline; }
  .totals .total .key { font-size: 14px; font-weight: 600; color: rgba(0,0,0,0.9); }
  .totals .total .val { font-size: 18px; font-weight: 700; color: rgba(0,0,0,0.9); }

  /* Pay-to */
  .payto p { margin: 2px 0; }

  @media print {
    .page { margin: 0; padding: 32px; max-width: none; }
    body { background: #fff; }
  }
</style>
</head>
<body>
  <div class="page">
    <!-- MASTHEAD -->
    <div class="section masthead">
      <div>
        <p class="h3">${BREGO.name}</p>
        <div class="meta">
          ${BREGO.address}<br>
          GSTIN ${BREGO.gstin}
        </div>
      </div>
      <div class="right">
        <p class="label">Invoice</p>
        <p class="h2" style="margin-top: 4px;">${e.reference}</p>
        <p class="meta" style="margin-top: 6px;">Issued ${formatDate(e.date)}</p>
        <span class="status"><span class="dot"></span>${e.status}</span>
      </div>
    </div>

    <!-- BILL TO + DETAILS -->
    <div class="section meta-grid">
      <div class="block">
        <span class="label">Bill to</span>
        <p class="body-strong">${escapeHtml(c.companyName)}</p>
        <p class="caption">${escapeHtml(c.contactPerson)}</p>
        <p class="caption addr">${escapeHtml(c.address)}</p>
        ${c.gstNumber ? `<p class="caption" style="margin-top:4px;">GSTIN ${escapeHtml(c.gstNumber)}</p>` : ''}
      </div>
      <div class="block details">
        <span class="label">Details</span>
        <dl>
          <div class="row"><dt>Invoice no.</dt><dd class="num">${e.reference}</dd></div>
          <div class="row"><dt>Date</dt><dd>${formatDate(e.date)}</dd></div>
          <div class="row"><dt>Service</dt><dd>${escapeHtml(serviceLabel)}</dd></div>
        </dl>
      </div>
    </div>

    <!-- LINE ITEMS -->
    <div class="section lines">
      <div class="head">
        <p class="label">Description</p>
        <p class="label">Amount</p>
      </div>
      ${lines.map(l => `
        <div class="row">
          <span class="desc">${escapeHtml(l.description)}</span>
          <span class="amt num">${formatExact(l.amount)}</span>
        </div>
      `).join('')}
    </div>

    <!-- TOTALS -->
    <div class="totals-wrap" style="margin-bottom: 36px;">
      <div class="totals">
        <div class="line"><span class="key">Subtotal</span><span class="val num">${formatExact(subtotal)}</span></div>
        <div class="line"><span class="key">GST 18%</span><span class="val num">${formatExact(gst)}</span></div>
        <div class="total"><span class="key">Total</span><span class="val num">${formatExact(total)}</span></div>
      </div>
    </div>

    <!-- PAY TO -->
    <div class="section payto" style="border-top: 1px solid rgba(0,0,0,0.08); padding-top: 28px;">
      <span class="label" style="display:block; margin-bottom: 10px;">Pay to</span>
      <p class="body-strong">${BREGO.name}</p>
      <p class="caption">NEFT or UPI · PAN ${BREGO.pan}</p>
      <p class="caption" style="margin-top: 8px;">Queries: ${BREGO.email}</p>
    </div>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.reference}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the blob URL on the next tick — not awaited because the
  // download intent has already been registered by the browser.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Suppress unused-import warnings on icons kept for forward use
// inside this module (a future "manual entry" surface, etc.).
void ArrowDownToLine;
void ArrowUpRight;
// useEffect retained for future reset-on-route-change hooks; left
// imported to keep the diff small if added later.
void useEffect;
