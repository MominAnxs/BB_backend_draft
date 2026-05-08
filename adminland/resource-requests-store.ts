'use client';
import { useEffect, useState } from 'react';

/**
 * Resource Requests — tiny module-level mutable store so the same list of
 * hiring requests is visible from both the Resource Request page (where
 * the table lives) and the A&T deliverables page (where managers raise
 * requests for their teams). Without this, submitting from A&T would lose
 * the entry the moment the user navigated to the Resource Request page,
 * because each page kept its own React state.
 *
 * No backend wiring yet — the seed list comes from the constant below and
 * any additions live in process memory until reload. The shape of the API
 * matches the React idiom: a hook for reading + a setter for adding.
 */

// Resource Request lifecycle. Two roles drive it:
//   • The HOD raises the request → it lands in `Pending` (admin's inbox).
//   • The Admin decides → `Open` (approved, in recruiter pipeline) or
//     `Rejected` (terminal, declined).
//   • The Recruiter works it → flips between `Open` and `Fulfilled` as
//     positions get filled.
// Approve/Reject are admin-only verbs and are exposed as inline buttons
// on Pending rows, NOT as options on the status pill — recruiters
// shouldn't be able to flip a request back to "Pending" or to
// "Rejected" without going through the admin.
export type RequestStatus = 'Pending' | 'Open' | 'Fulfilled' | 'Rejected';
export type RequestPriority = 'Low' | 'Medium' | 'High';

export interface ResourceRequest {
  id: string;
  requestId: string;
  requestedBy: string;
  department: string;
  role: string;
  positions: number;
  priority: RequestPriority;
  status: RequestStatus;
  requestDate: string;
  expectedJoinDate: string;
  notes: string;
  approvedBy: string | null;
  /** Recruiter on the hook for filling this request. Defaults via
   *  department (Performance Marketing → Ravina, Accounts & Taxation →
   *  Pooja, Sales → Priyanka, everything else → Pooja as the catch-all)
   *  but can be reassigned later. `null` means no one's been routed to
   *  the request yet (typically a brand-new Open ticket). */
  recruiter: string | null;
  /** Approved monthly compensation band (e.g. "₹50K – 75K"). `null`
   *  when the requester didn't pin a range — recruiter will need to
   *  clarify with the HOD before sourcing. */
  budget: string | null;
}

/** Compensation bands the form offers, in monthly INR. Same vocabulary
 *  the existing Open Roles mock uses (₹25K – 35K, etc.) so the data
 *  joins cleanly with that surface later. */
export const BUDGET_OPTIONS = [
  '₹25K – 35K',
  '₹35K – 50K',
  '₹50K – 75K',
  '₹75K – 1L',
  '₹1L – 1.5L',
  '₹1.5L – 2L',
  '₹2L+',
] as const;
export type BudgetBand = typeof BUDGET_OPTIONS[number];

/** The three in-house recruiters today. Single source of truth so the
 *  Resource Request table's Recruiter dropdown, the auto-assignment
 *  helper, and any future avatar/colour rendering all agree. */
export const RECRUITERS = ['Pooja', 'Ravina', 'Priyanka'] as const;
export type RecruiterName = typeof RECRUITERS[number];

/** Best-guess recruiter assignment from the request's department.
 *  Mirrors the recruiter focus areas tracked in EmployeesOverview's
 *  recruiter funnel: Pooja owns A&T, Ravina owns SEM, Priyanka owns
 *  Sales. Anything outside those three (HR, Operations, Technology, …)
 *  falls back to Pooja as the catch-all. */
export function recruiterForDepartment(department: string): RecruiterName {
  if (department === 'Performance Marketing') return 'Ravina';
  if (department === 'Accounts & Taxation') return 'Pooja';
  if (department === 'Sales') return 'Priyanka';
  return 'Pooja';
}

/** What the New Request form supplies. The store fills in id / dates / status / approver. */
export interface NewResourceRequestInput {
  requestedBy: string;
  department: string;
  role: string;
  positions: number;
  priority: RequestPriority;
  expectedJoinDate: string;
  notes: string;
  /** Optional — empty string means the requester didn't pick a band. */
  budget?: string;
}

const SEED_REQUESTS: ResourceRequest[] = [
  // Seed shows every state of the lifecycle so the admin inbox + history
  // views both have meaningful demo data: 2 Pending (in admin's inbox),
  // 3 Open (already approved, recruiter is working them), 1 Fulfilled
  // (closed out), 1 Rejected (admin declined).
  { id: 'rr1', requestId: 'RR-2026-001', requestedBy: 'Chinmay Pawar', department: 'Performance Marketing', role: 'Sr. Manager', positions: 1, priority: 'High',   status: 'Open',      requestDate: '2026-03-20', expectedJoinDate: '2026-05-01', notes: 'Need experienced campaign manager for growing client portfolio',           approvedBy: 'Tejas Atha', recruiter: 'Ravina',  budget: '₹75K – 1L'  },
  { id: 'rr2', requestId: 'RR-2026-002', requestedBy: 'Zubear Shaikh', department: 'Accounts & Taxation',    role: 'Executive',  positions: 2, priority: 'Medium', status: 'Pending',   requestDate: '2026-04-22', expectedJoinDate: '2026-06-01', notes: 'Tax season coming up, need additional bandwidth',                          approvedBy: null,         recruiter: null,      budget: '₹35K – 50K' },
  { id: 'rr3', requestId: 'RR-2026-003', requestedBy: 'Harshal Rajput', department: 'Operations',            role: 'Executive',  positions: 1, priority: 'Low',    status: 'Open',      requestDate: '2026-04-10', expectedJoinDate: '2026-07-01', notes: 'Backfill for operational support',                                          approvedBy: 'Tejas Atha', recruiter: null,      budget: '₹35K – 50K' },
  { id: 'rr4', requestId: 'RR-2026-004', requestedBy: 'Chinmay Pawar', department: 'Performance Marketing', role: 'Executive',  positions: 3, priority: 'High',   status: 'Pending',   requestDate: '2026-04-26', expectedJoinDate: '2026-05-20', notes: '3 new client onboardings happening simultaneously',                       approvedBy: null,         recruiter: null,      budget: '₹35K – 50K' },
  { id: 'rr5', requestId: 'RR-2026-005', requestedBy: 'Deepak Tiwari', department: 'Sales',                  role: 'Executive',  positions: 2, priority: 'High',   status: 'Open',      requestDate: '2026-04-05', expectedJoinDate: '2026-05-15', notes: 'Expanding outbound team for Q2 targets',                                    approvedBy: 'Tejas Atha', recruiter: 'Priyanka',budget: '₹50K – 75K' },
  { id: 'rr6', requestId: 'RR-2026-006', requestedBy: 'Zeel Mistry',   department: 'HR',                     role: 'Intern',     positions: 1, priority: 'Low',    status: 'Fulfilled', requestDate: '2026-02-15', expectedJoinDate: '2026-03-01', notes: 'HR intern for onboarding documentation',                                    approvedBy: 'Tejas Atha', recruiter: 'Pooja',   budget: '₹25K – 35K' },
  { id: 'rr7', requestId: 'RR-2026-007', requestedBy: 'Chinmay Pawar', department: 'Performance Marketing', role: 'Intern',     positions: 2, priority: 'Medium', status: 'Rejected',  requestDate: '2026-03-25', expectedJoinDate: '2026-05-01', notes: 'Summer interns for social media',                                            approvedBy: 'Tejas Atha', recruiter: null,      budget: '₹25K – 35K' },
];

// ── Mutable module-level state ─────────────────────────────────────────
// Plain `let` works here because:
//   1. Next.js hot-reload re-evaluates this file when it changes, so we
//      pick up edits to the seed.
//   2. Subscribers re-render via the useState bump in `useResourceRequests`.
//   3. There's no SSR concern — both consumers are "use client" pages.
let _requests: ResourceRequest[] = [...SEED_REQUESTS];
const _listeners = new Set<() => void>();
const notify = () => { _listeners.forEach(l => l()); };

/** Read-only snapshot for non-React callers (rare). */
export function getResourceRequests(): ResourceRequest[] {
  return _requests;
}

/**
 * Append a new request from the form input. Auto-generates `id` /
 * `requestId` (format: `RR-2026-NNN` continuing the existing sequence),
 * stamps `requestDate` to today, defaults the request to `Open` /
 * unapproved, and prepends so it shows up at the top of the table.
 */
export function addResourceRequest(input: NewResourceRequestInput): ResourceRequest {
  // Continue whatever numeric suffix the existing IDs are using —
  // matches the style readers already see (RR-2026-NNN).
  const maxNum = _requests.reduce((max, r) => {
    const m = r.requestId.match(/(\d+)$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  const today = new Date();
  const year = today.getFullYear();
  const nextSeq = String(maxNum + 1).padStart(3, '0');
  const newRequest: ResourceRequest = {
    id: `rr-${Date.now()}`,
    requestId: `RR-${year}-${nextSeq}`,
    requestedBy: input.requestedBy.trim() || 'Current User',
    department: input.department,
    role: input.role.trim(),
    positions: input.positions,
    priority: input.priority,
    // New requests land in the admin's inbox (Pending) — they're not
    // routed to a recruiter until the admin signs off. The admin then
    // either Approves (→ Open, in recruiter pipeline) or Rejects.
    status: 'Pending',
    requestDate: today.toISOString().slice(0, 10),
    expectedJoinDate: input.expectedJoinDate,
    notes: input.notes.trim(),
    approvedBy: null,
    recruiter: recruiterForDepartment(input.department),
    budget: input.budget?.trim() || null,
  };
  _requests = [newRequest, ..._requests];
  notify();
  return newRequest;
}

/**
 * Update an existing request's status. Used by the recruiter to flip
 * Open ↔ Fulfilled. Approve / Reject are admin-only verbs and live on
 * their own helpers below so the call sites read clearly at the UI.
 * Returns the updated request, or `null` if no row matched.
 */
export function updateResourceRequestStatus(
  id: string,
  status: RequestStatus,
): ResourceRequest | null {
  let updated: ResourceRequest | null = null;
  _requests = _requests.map(r => {
    if (r.id !== id) return r;
    const next: ResourceRequest = { ...r, status };
    updated = next;
    return next;
  });
  if (updated) notify();
  return updated;
}

/**
 * Admin approves a Pending request. Moves it into the recruiter
 * pipeline (Open), stamps the approver, and auto-routes a recruiter
 * based on the request's department if one isn't already set.
 */
export function approveResourceRequest(
  id: string,
  approver = 'Tejas Atha',
): ResourceRequest | null {
  let updated: ResourceRequest | null = null;
  _requests = _requests.map(r => {
    if (r.id !== id) return r;
    const next: ResourceRequest = {
      ...r,
      status: 'Open',
      approvedBy: approver,
      // Route to a default recruiter on approval if none was assigned —
      // the request is now actionable, so it shouldn't sit Unassigned.
      recruiter: r.recruiter ?? recruiterForDepartment(r.department),
    };
    updated = next;
    return next;
  });
  if (updated) notify();
  return updated;
}

/**
 * Admin rejects a Pending request. Terminal state — the row stays in
 * the table for the audit trail but is no longer in the recruiter
 * pipeline. Stamps the decision maker so the table can show
 * "Rejected by …" if needed.
 */
export function rejectResourceRequest(
  id: string,
  approver = 'Tejas Atha',
): ResourceRequest | null {
  let updated: ResourceRequest | null = null;
  _requests = _requests.map(r => {
    if (r.id !== id) return r;
    const next: ResourceRequest = {
      ...r,
      status: 'Rejected',
      approvedBy: approver,
      recruiter: null,
    };
    updated = next;
    return next;
  });
  if (updated) notify();
  return updated;
}

/**
 * Reassign the recruiter on an existing request. Pass `null` to mark
 * the request as Unassigned (e.g., the previous recruiter rotated off,
 * or the admin wants to deliberately unroute it). Returns the updated
 * row or `null` if no row matched.
 */
export function updateResourceRequestRecruiter(
  id: string,
  recruiter: RecruiterName | null,
): ResourceRequest | null {
  let updated: ResourceRequest | null = null;
  _requests = _requests.map(r => {
    if (r.id !== id) return r;
    const next: ResourceRequest = { ...r, recruiter };
    updated = next;
    return next;
  });
  if (updated) notify();
  return updated;
}

/**
 * React hook — returns the current request list and re-renders on any
 * `addResourceRequest` call. Implementation deliberately small (no
 * `useSyncExternalStore`) since we don't need SSR-safe semantics here.
 */
export function useResourceRequests(): ResourceRequest[] {
  // We don't read the counter — its purpose is forcing a re-render when
  // the underlying mutable list mutates.
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);
  return _requests;
}
