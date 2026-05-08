'use client';
import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';
import {
  addResourceRequest,
  BUDGET_OPTIONS,
  type NewResourceRequestInput,
  type RequestPriority,
} from './resource-requests-store';

/**
 * NewResourceRequestModal — the "raise a hiring request" form, extracted
 * so it can be triggered from anywhere (the Resource Request page, the
 * A&T deliverables page, etc.). Submission writes through the shared
 * resource-requests store so the new entry shows up wherever the list
 * is rendered.
 *
 * Required fields: Role, Expected Join Date.
 * Everything else has a sensible default so the form stays low-friction.
 */

const DEPARTMENTS = [
  'Performance Marketing',
  'Accounts & Taxation',
  'Operations',
  'HR',
  'Sales',
  'Design',
  'Finance',
];

const PRIORITIES: RequestPriority[] = ['Low', 'Medium', 'High'];

const INITIAL_FORM: NewResourceRequestInput = {
  requestedBy: '',
  department: 'Performance Marketing',
  role: '',
  positions: 1,
  priority: 'Medium',
  expectedJoinDate: '',
  notes: '',
  budget: '',
};

export function NewResourceRequestModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  /** Optional callback after a successful submit (e.g. to navigate the user). */
  onSubmitted?: (created: ReturnType<typeof addResourceRequest>) => void;
}) {
  const dialogRef = useModalA11y(open, onClose);
  const [form, setForm] = useState<NewResourceRequestInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<{ role?: boolean; expectedJoinDate?: boolean }>({});

  const close = () => {
    onClose();
    // Defer reset so the closing transition doesn't show a flash of wiped state.
    setTimeout(() => { setForm(INITIAL_FORM); setErrors({}); }, 150);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!form.role.trim()) nextErrors.role = true;
    if (!form.expectedJoinDate) nextErrors.expectedJoinDate = true;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const created = addResourceRequest(form);
    onSubmitted?.(created);
    close();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={close}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-request-title"
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] flex flex-col max-h-[calc(100vh-48px)] overflow-hidden focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-black/[0.06] flex-shrink-0">
          <div>
            <h3 id="new-request-title" className="text-h3 font-semibold text-black/90">New Resource Request</h3>
            <p className="text-caption text-black/55 mt-1">Raise a hiring request for your department</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close new request dialog"
            className="w-9 h-9 rounded-md hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-black/55" aria-hidden="true" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-7 py-6 space-y-5">
            {/* Row: Department + Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rr-department" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Department</label>
                <div className="relative">
                  <select
                    id="rr-department"
                    value={form.department}
                    onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))}
                    className="appearance-none w-full px-3.5 pr-10 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-black/45 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
              <div>
                <label htmlFor="rr-role" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">
                  Role <span className="text-[#E2445C]" aria-hidden="true">*</span>
                </label>
                <input
                  id="rr-role"
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Senior Account Manager"
                  aria-required="true"
                  aria-invalid={!!errors.role}
                  aria-describedby={errors.role ? 'rr-role-error' : undefined}
                  className={`w-full px-3.5 py-2.5 text-body rounded-lg bg-white text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 transition-all ${
                    errors.role
                      ? 'border border-[#E2445C] focus:ring-[#E2445C]/20'
                      : 'border border-black/10 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30'
                  }`}
                />
                {errors.role && (
                  <p id="rr-role-error" className="text-caption text-[#E2445C] mt-1.5">Role is required</p>
                )}
              </div>
            </div>

            {/* Row: Positions + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rr-positions" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Positions</label>
                <input
                  id="rr-positions"
                  type="number"
                  min={1}
                  max={50}
                  value={form.positions}
                  onChange={(e) => setForm(f => ({ ...f, positions: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className="w-full px-3.5 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="rr-priority" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Priority</label>
                <div className="relative">
                  <select
                    id="rr-priority"
                    value={form.priority}
                    onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as RequestPriority }))}
                    className="appearance-none w-full px-3.5 pr-10 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-black/45 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Row: Expected Join Date + Budget — paired so the time
                window and the cost ceiling sit next to each other,
                which is how recruiters scan a request before sourcing. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rr-expected-join" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">
                  Expected Join Date <span className="text-[#E2445C]" aria-hidden="true">*</span>
                </label>
                <input
                  id="rr-expected-join"
                  type="date"
                  value={form.expectedJoinDate}
                  onChange={(e) => setForm(f => ({ ...f, expectedJoinDate: e.target.value }))}
                  aria-required="true"
                  aria-invalid={!!errors.expectedJoinDate}
                  aria-describedby={errors.expectedJoinDate ? 'rr-expected-join-error' : undefined}
                  className={`w-full px-3.5 py-2.5 text-body rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 transition-all ${
                    errors.expectedJoinDate
                      ? 'border border-[#E2445C] focus:ring-[#E2445C]/20'
                      : 'border border-black/10 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30'
                  }`}
                />
                {errors.expectedJoinDate && (
                  <p id="rr-expected-join-error" className="text-caption text-[#E2445C] mt-1.5">Expected join date is required</p>
                )}
              </div>
              <div>
                <label htmlFor="rr-budget" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Budget</label>
                <div className="relative">
                  <select
                    id="rr-budget"
                    value={form.budget ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="appearance-none w-full px-3.5 pr-10 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    <option value="">Not specified</option>
                    {BUDGET_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-black/45 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Requested By (optional) */}
            <div>
              <label htmlFor="rr-requested-by" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Requested By</label>
              <input
                id="rr-requested-by"
                type="text"
                value={form.requestedBy}
                onChange={(e) => setForm(f => ({ ...f, requestedBy: e.target.value }))}
                placeholder="Defaults to your name"
                className="w-full px-3.5 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all"
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="rr-notes" className="block text-caption font-semibold text-black/65 uppercase tracking-wide mb-2">Notes</label>
              <textarea
                id="rr-notes"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Why this hire? Any constraints, budget, or context the recruiter should know."
                className="w-full px-3.5 py-2.5 text-body border border-black/10 rounded-lg bg-white text-black/80 placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all resize-none"
              />
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex items-center justify-end gap-2 px-7 py-4 border-t border-black/[0.06] flex-shrink-0 bg-white sticky bottom-0">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-md border border-black/10 text-caption font-medium text-black/70 hover:bg-black/[0.02] hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#204CC7] text-white text-caption font-medium hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
