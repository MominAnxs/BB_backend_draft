'use client';
import { useState, useRef, useEffect } from 'react';
import { Users, Search, Plus, X, UserPlus, ChevronDown, Check, Pencil } from 'lucide-react';
import { useModalA11y } from '@/lib/use-modal-a11y';

// Two-state lifecycle for an incoming hire: either they're still
// expected to join (Incoming) or they've withdrawn (Backed Out). Once
// they actually join the company, they leave this list and appear in
// All Employees instead — so "Active" doesn't belong here.
type IncomingStatus = 'Incoming' | 'Backed Out';

interface IncomingEmployee {
  id: number;
  code: string;
  name: string;
  department: string;
  role: string;
  joiningDate: string;
  incomingStatus: IncomingStatus;
  note?: string;
}

const ROLES = ['Admin', 'HOD', 'Manager', 'Executive', 'Intern'];
const DEPARTMENTS = [
  'All', 'Performance Marketing', 'Accounts & Taxation', 'Finance',
  'Operations', 'HR', 'Sales', 'Design', 'Development',
];

const INITIAL_INCOMING: IncomingEmployee[] = [
  { id: 101, code: 'BRG020', name: 'Nisha Patil', department: 'Finance', role: 'Executive', joiningDate: '6th Apr, 2026', incomingStatus: 'Incoming', note: 'Offered ₹33.2K, DOJ: 6th April, DOCS: Done' },
  { id: 102, code: 'BRG021', name: 'Jyoti Rane', department: 'Finance', role: 'Executive', joiningDate: '4th May, 2026', incomingStatus: 'Incoming', note: 'Offered ₹41.5K, DOJ: 4th May, DOCS: Pending' },
  { id: 103, code: 'BRG022', name: 'Amisha Desai', department: 'Finance', role: 'Executive', joiningDate: 'TBD', incomingStatus: 'Incoming', note: 'Shortlisted for final round — scheduled Friday evening with Irshad' },
  { id: 104, code: 'BRG023', name: 'Rahul Kapoor', department: 'Sales', role: 'Sr. Executive', joiningDate: '14th Apr, 2026', incomingStatus: 'Incoming', note: 'Referred by Chinmay, 4 yrs exp in B2B sales' },
  { id: 105, code: 'BRG024', name: 'Sneha Kulkarni', department: 'Performance Marketing', role: 'Executive', joiningDate: '21st Apr, 2026', incomingStatus: 'Incoming', note: 'Google Ads certified, previously at iProspect' },
  { id: 106, code: 'BRG025', name: 'Vishal Thakur', department: 'Technology', role: 'Executive', joiningDate: '28th Apr, 2026', incomingStatus: 'Incoming', note: 'Full-stack developer, React + Node background' },
  { id: 107, code: 'BRG026', name: 'Ankita Sharma', department: 'Finance', role: 'Executive', joiningDate: '15th Mar, 2026', incomingStatus: 'Backed Out', note: 'Accepted counter-offer from current employer' },
  { id: 108, code: 'BRG027', name: 'Ravi Menon', department: 'Sales', role: 'Executive', joiningDate: '20th Mar, 2026', incomingStatus: 'Backed Out', note: 'Relocated to Bangalore, no longer available' },
];

const getIncomingStatusColor = (status: IncomingStatus) => {
  switch (status) {
    case 'Incoming': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Backed Out': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-black/5 text-black/50 border-black/10';
  }
};

const getDepartmentColor = (dept: string) => {
  switch (dept) {
    case 'All':
      return 'bg-blue-50 text-blue-700';
    case 'Finance':
      return 'bg-emerald-50 text-emerald-700';
    case 'Performance Marketing':
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-black/5 text-black/70';
  }
};

export function EmployeeIncoming() {
  const [searchQuery, setSearchQuery] = useState('');
  // Top-bar filters. `'All'` is the unfiltered sentinel for both — the
  // dropdowns expose it as the first option and the filter logic skips
  // narrowing when it's selected. Both filters compose with search.
  const [statusFilter, setStatusFilter] = useState<'All' | IncomingStatus>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [incomingEmployees, setIncomingEmployees] = useState<IncomingEmployee[]>(INITIAL_INCOMING);
  const [openDropdown, setOpenDropdown] = useState<{ id: number; field: string } | null>(null);
  const [showAddIncomingModal, setShowAddIncomingModal] = useState(false);
  const [incomingForm, setIncomingForm] = useState({ name: '', department: 'Finance', role: 'Executive', joiningDate: '', note: '' });
  const [incomingFormErrors, setIncomingFormErrors] = useState({ name: false });
  const addIncomingDialogRef = useModalA11y(showAddIncomingModal, () => setShowAddIncomingModal(false));

  /* ───── Inline note editing ─────
     Click any Note cell → it becomes a focused textarea. Enter saves
     (Shift+Enter inserts a newline), Escape cancels and reverts to the
     original value, blur saves. Single-source-of-truth lives in
     `incomingEmployees`; the draft is local until commit. */
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const startEditNote = (emp: IncomingEmployee) => {
    setEditingNoteId(emp.id);
    setDraftNote(emp.note ?? '');
  };

  const commitNote = () => {
    if (editingNoteId === null) return;
    const id = editingNoteId;
    const next = draftNote.trim();
    setIncomingEmployees(prev => prev.map(e => (
      e.id === id ? { ...e, note: next || undefined } : e
    )));
    setEditingNoteId(null);
    setDraftNote('');
  };

  const cancelNote = () => {
    setEditingNoteId(null);
    setDraftNote('');
  };

  const filteredIncoming = incomingEmployees.filter(emp => {
    if (statusFilter !== 'All' && emp.incomingStatus !== statusFilter) return false;
    if (deptFilter !== 'All' && emp.department !== deptFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.code.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q)
    );
  });

  // Whether any non-search filter is active — drives the Clear chip
  // visibility and the result-count strip in the top bar.
  const hasActiveFilters = statusFilter !== 'All' || deptFilter !== 'All';
  const clearAllFilters = () => {
    setStatusFilter('All');
    setDeptFilter('All');
    setSearchQuery('');
  };

  // Department options for the dropdown — derived from the seed list,
  // sorted, with "All" pinned to the top so the filter is exhaustive
  // even if a new department appears in the data.
  const departmentOptions = Array.from(
    new Set(incomingEmployees.map(e => e.department)),
  ).sort();

  const totalCount = incomingEmployees.length;
  const incomingCount = incomingEmployees.filter(e => e.incomingStatus === 'Incoming').length;
  const backedOutCount = incomingEmployees.filter(e => e.incomingStatus === 'Backed Out').length;

  return (
    <div className="space-y-4">
      {/*
        Page top bar — bleeds full-width via `-mx-6 -mt-6 px-6 mb-6` to
        match the chrome on All Customers / All Employees / CLA-NTF.
        Title + subtitle anchor the left; result count, Search, and the
        primary Add Incoming Employee CTA hang on the right.
      */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">Incoming Employees</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Track new hires expected to join the team</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Result count — surfaces whenever filters or search are
                narrowing the table so the admin sees the impact at a
                glance without scanning the row count. */}
            {(searchQuery || hasActiveFilters) && (
              <span role="status" aria-live="polite" className="text-caption font-medium text-black/55">
                {filteredIncoming.length} of {incomingEmployees.length} results
              </span>
            )}

            {/* Search */}
            <div className="relative w-[240px]">
              <Search className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <label htmlFor="incoming-search" className="sr-only">Search incoming employees</label>
              <input
                id="incoming-search"
                type="text"
                placeholder="Search incoming…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/55 outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5 text-black/55 hover:text-black/80" />
                </button>
              )}
            </div>

            {/* Department dropdown — slices the table by team. Same
                native-select chrome as Resource Request / All Customers
                so filters read as one consistent vocabulary. */}
            <div className="relative">
              <label htmlFor="incoming-dept-filter" className="sr-only">Department filter</label>
              <select
                id="incoming-dept-filter"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All Departments</option>
                {departmentOptions.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Status dropdown — Incoming = still expected to join,
                Backed Out = withdrawn. Once a hire actually joins, they
                graduate to All Employees and leave this list, so this
                page never needs an "Active" state. */}
            <div className="relative">
              <label htmlFor="incoming-status-filter" className="sr-only">Status filter</label>
              <select
                id="incoming-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'All' | IncomingStatus)}
                className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Incoming">Incoming</option>
                <option value="Backed Out">Backed Out</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>

            {/* Clear chip — only renders when at least one filter is
                set. One click resets both filters and the search. */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-caption font-medium text-black/65 hover:text-[#204CC7] hover:bg-[#EEF1FB]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              >
                <X className="w-3 h-3" aria-hidden="true" /> Clear
              </button>
            )}

            {/* Add Incoming Employee — primary CTA, brand-blue solid */}
            <button
              type="button"
              onClick={() => setShowAddIncomingModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#204CC7] text-white rounded-md hover:bg-[#1a3d9f] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/40 transition-all text-caption font-medium"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Add Incoming Employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards — three columns now that "Active" has been
          removed from the lifecycle. */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Total</p>
          <p className="text-black text-h1 font-semibold">{totalCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Incoming</p>
          <p className="text-blue-600 text-h1 font-semibold">{incomingCount}</p>
        </div>
        <div className="bg-white border border-black/5 rounded-xl p-4">
          <p className="text-black/55 text-caption mb-1">Backed Out</p>
          <p className="text-rose-600 text-h1 font-semibold">{backedOutCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-black/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-black/5 bg-black/[0.01]">
                <th scope="col" className="pl-5 pr-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Code</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Name</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Department</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Role</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Joining Date</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Status</th>
                <th scope="col" className="px-3 py-3 text-left text-black/45 text-caption font-semibold uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncoming.map((emp, index) => (
                <tr key={emp.id} className={`border-b border-black/[0.04] last:border-0 transition-colors hover:bg-black/[0.015] ${index % 2 === 1 ? 'bg-black/[0.01]' : ''}`}>
                  <td className="pl-5 pr-3 py-3">
                    <span className="text-[#204CC7]/70 text-caption font-mono">{emp.code}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-black/[0.04] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-black/50 text-caption font-semibold">{emp.name.charAt(0)}</span>
                      </div>
                      <span className="text-black/85 text-caption font-medium">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-caption font-medium whitespace-nowrap ${getDepartmentColor(emp.department)}`}>{emp.department}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-caption font-medium bg-black/[0.03] text-black/70 whitespace-nowrap">{emp.role}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-black/50 text-caption whitespace-nowrap">{emp.joiningDate}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown?.id === emp.id && openDropdown?.field === 'incomingStatus'
                              ? null
                              : { id: emp.id, field: 'incomingStatus' }
                          );
                        }}
                        aria-label={`Status: ${emp.incomingStatus} — change for ${emp.name}`}
                        aria-haspopup="listbox"
                        aria-expanded={openDropdown?.id === emp.id && openDropdown?.field === 'incomingStatus'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium border whitespace-nowrap transition-all cursor-pointer ${getIncomingStatusColor(emp.incomingStatus)}`}
                      >
                        <span>{emp.incomingStatus}</span>
                        <ChevronDown className="w-3 h-3 flex-shrink-0" />
                      </button>
                      {openDropdown?.id === emp.id && openDropdown?.field === 'incomingStatus' && (
                        <div className="absolute top-full left-0 mt-1 z-50 min-w-[150px]">
                          <div className="bg-white rounded-xl border border-black/10 shadow-xl overflow-hidden">
                            {(['Incoming', 'Backed Out'] as IncomingStatus[]).map(s => (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIncomingEmployees(prev => prev.map(ie => ie.id === emp.id ? { ...ie, incomingStatus: s } : ie));
                                  setOpenDropdown(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-caption hover:bg-black/[0.02] transition-all flex items-center gap-2 ${
                                  emp.incomingStatus === s ? 'font-medium' : 'text-black/70'
                                }`}
                              >
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-caption font-medium border ${getIncomingStatusColor(s)}`}>{s}</span>
                                {emp.incomingStatus === s && <Check className="w-3.5 h-3.5 text-[#204CC7] ml-auto" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 max-w-[280px] align-top">
                    {/*
                      Inline-editable Note cell.
                      • View mode: full cell is a button — click anywhere
                        on the text (or empty "Add note…" placeholder)
                        flips to edit mode.
                      • Edit mode: a focused textarea. Enter commits
                        (Shift+Enter for a new line), Escape cancels,
                        blur commits. The textarea reuses the cell's
                        width so the row height doesn't jump on save.
                    */}
                    {editingNoteId === emp.id ? (
                      <textarea
                        value={draftNote}
                        onChange={e => setDraftNote(e.target.value)}
                        onBlur={commitNote}
                        onKeyDown={e => {
                          if (e.key === 'Escape') { e.preventDefault(); cancelNote(); }
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(); }
                        }}
                        autoFocus
                        rows={2}
                        placeholder="Type a note…"
                        aria-label={`Edit note for ${emp.name}. Press Enter to save, Shift+Enter for new line, Escape to cancel.`}
                        className="w-full px-2 py-1.5 rounded-md border border-[#204CC7]/40 bg-white text-caption text-black/85 placeholder:text-black/35 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditNote(emp)}
                        aria-label={emp.note ? `Edit note for ${emp.name}` : `Add a note for ${emp.name}`}
                        className="group w-full -mx-2 -my-1 px-2 py-1 rounded-md text-left hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <span className="flex-1 min-w-0">
                            {emp.note ? (
                              <span className="block text-caption text-black/65 leading-relaxed line-clamp-2">{emp.note}</span>
                            ) : (
                              <span className="text-caption text-black/45 italic">Add note…</span>
                            )}
                          </span>
                          <Pencil
                            className="w-3 h-3 text-black/35 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredIncoming.length === 0 && (
          <div className="py-16 text-center">
            <Users className="w-12 h-12 text-black/10 mx-auto mb-3" />
            <p className="text-black/55 text-body">No incoming employees</p>
          </div>
        )}
      </div>

      {/* Add Incoming Employee Modal */}
      {showAddIncomingModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddIncomingModal(false)} aria-hidden="true">
          <div ref={addIncomingDialogRef} role="dialog" aria-modal="true" aria-labelledby="add-incoming-title" tabIndex={-1} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg focus:outline-none" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#204CC7]/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#204CC7]" />
                </div>
                <div>
                  <h3 id="add-incoming-title" className="text-black font-semibold">Add Incoming Employee</h3>
                  <p className="text-black/50 text-caption mt-0.5">Track a new hire expected to join</p>
                </div>
              </div>
              <button onClick={() => setShowAddIncomingModal(false)} aria-label="Close add incoming employee dialog" className="w-8 h-8 rounded-md hover:bg-black/5 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30">
                <X className="w-4 h-4 text-black/50" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Full Name <span className="text-[#E2445C]">*</span></label>
                <input
                  type="text"
                  value={incomingForm.name}
                  onChange={e => { setIncomingForm(f => ({ ...f, name: e.target.value })); setIncomingFormErrors(fe => ({ ...fe, name: false })); }}
                  placeholder="e.g., Jyoti Rane"
                  aria-invalid={!!incomingFormErrors.name}
                  aria-describedby={incomingFormErrors.name ? "incoming-name-error" : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all ${
                    incomingFormErrors.name ? 'border-[#E2445C] bg-rose-50/30' : 'border-black/10'
                  }`}
                />
                {incomingFormErrors.name && <p id="incoming-name-error" className="text-caption font-medium text-[#E2445C] mt-1">Name is required</p>}
              </div>

              {/* Department + Role */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Department</label>
                  <select
                    value={incomingForm.department}
                    onChange={e => setIncomingForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {DEPARTMENTS.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-caption font-semibold text-black/60 mb-1.5">Role</label>
                  <select
                    value={incomingForm.role}
                    onChange={e => setIncomingForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/80 bg-white focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {ROLES.filter(r => r !== 'Admin').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Expected Joining Date</label>
                <input
                  type="text"
                  value={incomingForm.joiningDate}
                  onChange={e => setIncomingForm(f => ({ ...f, joiningDate: e.target.value }))}
                  placeholder="e.g., 15th May, 2026 or TBD"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all"
                />
              </div>

              {/* Note / Description */}
              <div>
                <label className="block text-caption font-semibold text-black/60 mb-1.5">Note</label>
                <textarea
                  value={incomingForm.note}
                  onChange={e => setIncomingForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="e.g., Offered ₹33.2K, documents pending, referred by Pooja..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-body text-black/90 placeholder:text-black/30 focus:outline-none focus:ring-1 focus:ring-[#204CC7] focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-black/[0.06] flex items-center justify-between">
              <button onClick={() => setShowAddIncomingModal(false)} className="px-4 py-2.5 rounded-md border border-black/10 text-black/60 hover:bg-black/[0.03] transition-all text-caption font-medium">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!incomingForm.name.trim()) {
                    setIncomingFormErrors({ name: true });
                    return;
                  }
                  const nextId = Math.max(...incomingEmployees.map(e => e.id), 200) + 1;
                  const nextCode = `BRG${String(Math.max(...incomingEmployees.map(e => parseInt(e.code.replace('BRG', ''), 10)), 27) + 1).padStart(3, '0')}`;
                  setIncomingEmployees(prev => [
                    ...prev,
                    {
                      id: nextId,
                      code: nextCode,
                      name: incomingForm.name.trim(),
                      department: incomingForm.department,
                      role: incomingForm.role,
                      joiningDate: incomingForm.joiningDate.trim() || 'TBD',
                      incomingStatus: 'Incoming',
                      note: incomingForm.note.trim() || undefined,
                    },
                  ]);
                  setIncomingForm({ name: '', department: 'Finance', role: 'Executive', joiningDate: '', note: '' });
                  setIncomingFormErrors({ name: false });
                  setShowAddIncomingModal(false);
                }}
                className="px-5 py-2.5 rounded-md bg-[#204CC7] text-white hover:bg-[#1a3d9f] transition-all text-caption font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
