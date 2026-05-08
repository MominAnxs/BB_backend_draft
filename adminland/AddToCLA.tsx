'use client';
import { useState, type ReactNode } from 'react';
import { X, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface CLAData {
  dateTime: string;
  client: string;
  reason: string;
  service: string;
  status: string;
  billingPerMonth: number;
  hod: string;
  category: string;
  employeeResponsible: string;
}

interface AddToCLAProps {
  clientName?: string;
  onClose: () => void;
  onSave: (data: CLAData) => void;
}

/* ═══════════════════════════════════════════════════════════════════
   OPTIONS
   ═══════════════════════════════════════════════════════════════════ */

const SERVICES = ['Performance Marketing', 'Accounts & Taxation', 'Both'];
const STATUSES = ['Can be Saved', 'Sureshot', 'At Risk', 'Critical'];
const HODS = ['Chinmay Pawar', 'Zubear Shaikh', 'Tejas Atha'];
const CATEGORIES = ["Brego's Fault", "Client's Fault", 'External / Market'];

/* ═══════════════════════════════════════════════════════════════════
   MAIN MODAL
   ═══════════════════════════════════════════════════════════════════ */

export function AddToCLA({ clientName = '', onClose, onSave }: AddToCLAProps) {
  // Default to current datetime in yyyy-MM-ddTHH:mm format for datetime-local
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const [dateTime, setDateTime] = useState(defaultDateTime);
  const [client, setClient] = useState(clientName);
  const [reason, setReason] = useState('');
  const [service, setService] = useState('Performance Marketing');
  const [status, setStatus] = useState('Can be Saved');
  const [billing, setBilling] = useState('');
  const [hod, setHod] = useState('');
  const [category, setCategory] = useState("Brego's Fault");
  const [employeeResponsible, setEmployeeResponsible] = useState('');

  const isValid = !!(
    dateTime &&
    client.trim() &&
    reason.trim() &&
    service &&
    status &&
    hod &&
    category &&
    employeeResponsible.trim()
  );

  const handleSubmit = () => {
    if (!isValid) return;
    onSave({
      dateTime,
      client: client.trim(),
      reason: reason.trim(),
      service,
      status,
      billingPerMonth: Number(billing) || 0,
      hod,
      category,
      employeeResponsible: employeeResponsible.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-5 border-b border-black/[0.06] flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-h1 text-black">Add New CLA</h2>
            <p className="text-body text-black/50 mt-1 font-normal">
              Client Loss Alert — Track at-risk clients
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-black/[0.04] flex items-center justify-center transition-all shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-black/50" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            {/* Date & Time */}
            <Field label="DATE & TIME" required>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full h-11 px-3.5 border border-black/10 rounded-xl text-body text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all"
              />
            </Field>

            {/* Client */}
            <Field label="CLIENT" required>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Select a client"
                readOnly={!!clientName}
                className={`w-full h-11 px-3.5 border border-black/10 rounded-xl text-body text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all ${clientName ? 'bg-black/[0.02] cursor-default' : ''}`}
              />
            </Field>

            {/* Brief or Reason — full width */}
            <div className="col-span-2">
              <Field label="BRIEF OR REASON" required>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the situation or reason for the CLA..."
                  className="w-full px-3.5 py-3 border border-black/10 rounded-xl text-body text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all resize-none leading-relaxed"
                />
              </Field>
            </div>

            {/* Service */}
            <Field label="SERVICE" required>
              <SelectInput value={service} onChange={setService} options={SERVICES} />
            </Field>

            {/* Status */}
            <Field label="STATUS" required>
              <SelectInput value={status} onChange={setStatus} options={STATUSES} />
            </Field>

            {/* Billing / Month */}
            <Field label="BILLING / MO (₹)">
              <input
                type="number"
                min={0}
                value={billing}
                onChange={(e) => setBilling(e.target.value)}
                placeholder="0"
                className="w-full h-11 px-3.5 border border-black/10 rounded-xl text-body text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all tabular-nums"
              />
            </Field>

            {/* HOD */}
            <Field label="HOD" required>
              <SelectInput value={hod} onChange={setHod} options={HODS} placeholder="Select HOD" />
            </Field>

            {/* Category */}
            <Field label="CATEGORY" required>
              <SelectInput value={category} onChange={setCategory} options={CATEGORIES} />
            </Field>

            {/* Employee Responsible */}
            <Field label="EMPLOYEE RESPONSIBLE" required>
              <input
                type="text"
                value={employeeResponsible}
                onChange={(e) => setEmployeeResponsible(e.target.value)}
                placeholder="Enter employee name"
                className="w-full h-11 px-3.5 border border-black/10 rounded-xl text-body text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all"
              />
            </Field>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-4 text-body text-black/60 font-medium hover:text-black transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="h-10 px-6 rounded-full bg-[#204CC7] text-white text-body font-semibold hover:bg-[#1a3d9f] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Add CLA
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FIELD WRAPPER
   ═══════════════════════════════════════════════════════════════════ */

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="text-caption font-semibold text-black/55 uppercase tracking-wider mb-1.5 block">
        {label}
        {required && <span className="text-[#E2445C] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOM SELECT (styled consistently with inputs)
   ═══════════════════════════════════════════════════════════════════ */

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 pl-3.5 pr-10 border border-black/10 rounded-xl text-body text-black focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7] transition-all appearance-none bg-white cursor-pointer"
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-black/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
