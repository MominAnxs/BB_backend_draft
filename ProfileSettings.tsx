'use client';
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, Shield,
  Bell, Eye, EyeOff, Save, Camera, CheckCircle, HeartPulse, Lock,
  Smartphone, Monitor, Globe, LogOut, Clock, AlertTriangle,
  Check, Home, ExternalLink, Laptop, Info, ChevronRight,
  Pencil, KeyRound, Fingerprint, ShieldCheck, Users, Search,
  Inbox, LayoutDashboard, FolderOpen, Minus,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { MOCK_EMPLOYEES, type EmployeeRecord, type EmployeeStatus } from '@/adminland/Database';

/* ─────────── Types ─────────── */
type TabId = 'profile' | 'security' | 'notifications' | 'status' | 'user-management';

/* ─────────── Platform roles ───────────
 * Authoritative list of roles the platform recognises for access
 * gating. Mirrors the role values used inside the Employees module's
 * MOCK_EMPLOYEES table — the source of truth for who-is-who in the
 * org. The User Management screen on this page is the single place
 * Admins promote/demote employees between these roles, so the list
 * here must stay synced with the role values that downstream
 * surfaces (Dashboard, SuperAdminHome, scoped overviews) read.
 *
 * Why these seven specifically:
 *   - Admin              → full platform access (CEO / COO / CPO / Ops Lead)
 *   - HOD                → service-line head (PM / A&T / Sales etc.)
 *   - POD Head           → POD-level lead inside a service line
 *   - Manager            → team manager (covers Sr. Manager too)
 *   - Assistant Manager  → sub-team lead
 *   - Executive          → individual contributor on the delivery floor
 *   - Intern             → temporary, restricted access
 *
 * The row's actual `role` string in the mock can be a finer-grained
 * label like "SEM HOD" or "COO" — `normalizeRole()` snaps those to
 * one of the seven canonical buckets for the dropdown's selected
 * value, so the admin sees a stable picker without losing the
 * underlying label. */
const PLATFORM_ROLES = [
  'Admin',
  'HOD',
  'POD Head',
  'Manager',
  'Assistant Manager',
  'Executive',
  'Intern',
] as const;
type PlatformRole = typeof PLATFORM_ROLES[number];

function normalizeRole(role: string): PlatformRole {
  // CEO / COO / CPO / Ops-Lead all sit at "Admin" platform-access
  // level even though their designation strings differ.
  if (role === 'Admin' || role === 'COO' || role === 'CEO' || role === 'CPO') return 'Admin';
  if (role.includes('HOD'))     return 'HOD';        // 'SEM HOD' / 'A&T HOD' → HOD
  if (role === 'POD Head')      return 'POD Head';
  if (role === 'Assistant Manager') return 'Assistant Manager';
  if (role.includes('Manager')) return 'Manager';    // 'Sr. Manager' → Manager
  if (role === 'Intern')        return 'Intern';
  return 'Executive';                                 // 'Sr. Executive' etc.
}
type WorkingStatus = 'in-office' | 'out-sick' | 'work-from-home' | 'working-outside';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof User;
  description: string;
}

/* ─────────── Constants ─────────── */
const navItems: NavItem[] = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Personal & work info' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & sessions' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email & push alerts' },
  { id: 'status', label: 'Status', icon: HeartPulse, description: 'Working status' },
  // Admin-only — surfaced only when the signed-in user has
  // platform role 'Admin'. Filtered out of the rendered nav list
  // for every other role so the tab simply doesn't exist for them.
  { id: 'user-management', label: 'User Management', icon: Users, description: 'Roles & platform access' },
];

const statusOptions: { id: WorkingStatus; label: string; description: string; icon: typeof Laptop; color: string; bg: string; border: string; dot: string; iconBg: string }[] = [
  { id: 'in-office', label: 'In the Office', description: 'Working from Brego HQ or branch office', icon: Laptop, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500', iconBg: 'bg-emerald-100' },
  { id: 'work-from-home', label: 'Work from Home', description: 'Working remotely from home', icon: Home, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500', iconBg: 'bg-blue-100' },
  { id: 'working-outside', label: 'Working Outside', description: 'On-site with client or field work', icon: ExternalLink, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500', iconBg: 'bg-amber-100' },
  { id: 'out-sick', label: 'Out Sick', description: 'Taking time off due to health reasons', icon: HeartPulse, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500', iconBg: 'bg-rose-100' },
];

const activeSessions = [
  { device: 'MacBook Pro', browser: 'Chrome', location: 'Mumbai, India', icon: Monitor, lastActive: 'Active now', current: true },
  { device: 'iPhone 15', browser: 'Safari', location: 'Mumbai, India', icon: Smartphone, lastActive: '2 hours ago', current: false },
  { device: 'Windows Desktop', browser: 'Edge', location: 'Mumbai, India', icon: Globe, lastActive: '3 days ago', current: false },
];

/* ─────────── Password strength helper ─────────── */
function getPasswordStrength(pw: string): { score: number; label: string; color: string; barColor: string } {
  if (!pw) return { score: 0, label: '', color: '', barColor: 'bg-black/[0.06]' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: 1, label: 'Weak', color: 'text-rose-600', barColor: 'bg-rose-500' };
  if (s <= 2) return { score: 2, label: 'Fair', color: 'text-amber-600', barColor: 'bg-amber-500' };
  if (s <= 3) return { score: 3, label: 'Good', color: 'text-blue-600', barColor: 'bg-blue-500' };
  return { score: 4, label: 'Strong', color: 'text-emerald-600', barColor: 'bg-emerald-500' };
}

/* ─────────── Reusable: Section Card ─────────── */
function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

/* ─────────── Reusable: Toggle Switch ─────────── */
function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        aria-label={label}
      />
      <div className="w-[40px] h-[23px] bg-black/10 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-[#204CC7]/20 peer-checked:bg-[#204CC7] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[17px] after:w-[17px] after:shadow-sm after:transition-all peer-checked:after:translate-x-[17px] transition-colors" />
    </label>
  );
}

/* ─────────── Reusable: Form Field (editable) ─────────── */
function FormField({ label, icon: Icon, value, onChange, type = 'text', colSpan = false }: {
  label: string;
  icon?: typeof Mail;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  colSpan?: boolean;
}) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="text-[13px] font-semibold text-black/45 block mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-[15px] h-[15px] text-black/25 absolute left-3.5 top-1/2 -translate-y-1/2" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${Icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 border border-black/[0.08] rounded-lg text-[14px] text-black/85 font-medium bg-white hover:border-black/[0.14] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/12 focus:border-[#204CC7]/30 transition-all`}
        />
      </div>
    </div>
  );
}

/* ─────────── Reusable: Info Row (read-only) ─────────── */
function InfoRow({ label, value, icon: Icon, badge }: {
  label: string;
  value: string;
  icon?: typeof Mail;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3.5 px-5 group">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center flex-shrink-0">
            <Icon className="w-[15px] h-[15px] text-black/30" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-black/40">{label}</p>
          <p className="text-[14px] font-semibold text-black/80 mt-0.5 truncate">{value}</p>
        </div>
      </div>
      {badge}
    </div>
  );
}

/* ─────────── User Management Panel (Admin-only tab content) ───────────
 * MODULE × ROLE permissions matrix. Each row is an action inside a
 * module (Inbox / Dashboard / Workspace / Dataroom); each column is
 * one of the seven PlatformRoles. A cell shows whether the role has
 * access to that action — granted (brand-blue check) or denied
 * (muted dash). Cells are click-to-toggle so admins can adjust
 * access without leaving the page.
 *
 * Why a matrix and not a per-employee table:
 *   The previous version listed every employee with a single "Role"
 *   dropdown. That answered "who is what role" but never "what can
 *   each role actually DO". The matrix makes the permission rules
 *   themselves the editable surface — change once at the role
 *   level, applies to everyone in that role.
 *
 * Module rows are grouped under section headers so the action list
 * is scannable; the modules use their familiar lucide icons (Inbox,
 * Dashboard, Workspace, Dataroom) so admins recognise them at a
 * glance.
 */
type PermissionAction = {
  id: string;
  label: string;
  description: string;
  byRole: Record<PlatformRole, boolean>;
};
type PermissionModule = {
  id: 'inbox' | 'dashboard' | 'workspace' | 'dataroom';
  name: string;
  icon: typeof Inbox;
  iconColor: string;
  description: string;
  actions: PermissionAction[];
};

// Default permissions — the seed the matrix renders before any
// admin overrides. These represent Brego's working assumptions:
//   • Admins (founder/COO tier) can do everything, everywhere.
//   • HOD + POD Head act as service-line leaders — broad reach
//     across their service plus full dataroom + checklist control.
//   • Manager / Assistant Manager run team execution — they can
//     view widely but their write access narrows on client-facing
//     surfaces (e.g. they cannot send messages on a client's
//     Inbox channel; only HOD-and-up can talk directly with
//     clients).
//   • Executive / Intern are individual contributors — they own
//     their own task lane, can read team context, and have no
//     destructive permissions (delete, share-out, configure).
const DEFAULT_PERMISSIONS: PermissionModule[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    icon: Inbox,
    iconColor: '#204CC7',
    description: 'Team & client channels',
    actions: [
      { id: 'inbox.view-team', label: 'View team channels', description: 'Read messages on internal channels',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': true } },
      { id: 'inbox.send-team', label: 'Send team messages', description: 'Post in internal channels',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': true } },
      { id: 'inbox.view-client', label: 'View client channels', description: 'Read messages on client-facing channels',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': false } },
      { id: 'inbox.send-client', label: 'Send messages on client channels', description: 'Talk directly with the client',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': false, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    iconColor: '#7C3AED',
    description: 'Overview, metrics, financials',
    actions: [
      { id: 'dashboard.view', label: 'View module dashboards', description: 'Open the Home, Customers, Employees overviews',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': true } },
      { id: 'dashboard.financials', label: 'View client financial details', description: 'Sales, expenses, payables, receivables on the A&T dashboards',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
    ],
  },
  {
    id: 'workspace',
    name: 'Workspace',
    icon: Briefcase,
    iconColor: '#06B6D4',
    description: 'Tasks, A&T checklists, SEM plans',
    actions: [
      { id: 'workspace.view-own', label: 'View own tasks', description: 'My Assignments and personal task list',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': true } },
      { id: 'workspace.view-team', label: 'View team-wide tasks', description: 'See what everyone in the team is working on',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
      { id: 'workspace.assign', label: 'Create & assign tasks', description: 'Hand work out to teammates',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': false, 'Intern': false } },
      { id: 'workspace.checklist', label: 'Edit A&T checklists', description: 'Modify the recurring deliverables for a client',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
    ],
  },
  {
    id: 'dataroom',
    name: 'Dataroom',
    icon: FolderOpen,
    iconColor: '#10B981',
    description: 'Files, folders, sharing',
    actions: [
      { id: 'dataroom.view', label: 'View files & folders', description: 'Browse the dataroom',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': true } },
      { id: 'dataroom.upload', label: 'Upload files', description: 'Add documents to existing folders',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': true, 'Executive': true, 'Intern': false } },
      { id: 'dataroom.move', label: 'Move & rename files', description: 'Reorganise within the dataroom',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': true, 'Manager': true, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
      { id: 'dataroom.delete', label: 'Delete files & folders', description: 'Permanent removal',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': false, 'Manager': false, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
      { id: 'dataroom.share', label: 'Share files externally', description: 'Generate a public / client-shareable link',
        byRole: { 'Admin': true, 'HOD': true, 'POD Head': false, 'Manager': false, 'Assistant Manager': false, 'Executive': false, 'Intern': false } },
    ],
  },
];

function UserManagementPanel() {
  // Mutable copy of the seed matrix. Each cell click flips the
  // corresponding boolean. A real backend wiring would persist
  // each toggle; for now changes live in this component's state.
  const [permissions, setPermissions] = useState<PermissionModule[]>(DEFAULT_PERMISSIONS);

  const togglePermission = (moduleId: PermissionModule['id'], actionId: string, role: PlatformRole) => {
    setPermissions(prev => prev.map(mod => {
      if (mod.id !== moduleId) return mod;
      return {
        ...mod,
        actions: mod.actions.map(act => {
          if (act.id !== actionId) return act;
          return { ...act, byRole: { ...act.byRole, [role]: !act.byRole[role] } };
        }),
      };
    }));
  };

  // Short labels for the column headers — the role column is
  // narrow so we abbreviate longer names. Full names live in the
  // aria-label on each cell so screen readers always hear the
  // unambiguous version.
  const roleHeader: Record<PlatformRole, { short: string; full: string }> = {
    'Admin': { short: 'Admin', full: 'Admin' },
    'HOD': { short: 'HOD', full: 'HOD' },
    'POD Head': { short: 'POD', full: 'POD Head' },
    'Manager': { short: 'Manager', full: 'Manager' },
    'Assistant Manager': { short: 'Asst. Mgr', full: 'Assistant Manager' },
    'Executive': { short: 'Exec', full: 'Executive' },
    'Intern': { short: 'Intern', full: 'Intern' },
  };

  return (
    // Full-width inside the Profile content area — the panel
    // bleeds end-to-end so the matrix uses every available pixel.
    // The 7 role columns are still pinned by the colgroup below
    // (78px each) so they stay uniform; whatever width's left
    // goes to the Module/Action column and gives the action
    // descriptions room to breathe on wider viewports.
    <div className="space-y-6">
      {/* Admin-only callout — establishes context up-front so the
          admin understands they're editing platform-wide access
          rules, and a flip on a single cell affects every employee
          in that role. */}
      <div className="rounded-xl bg-[#204CC7]/[0.04] border border-[#204CC7]/15 px-5 py-4 flex items-start gap-3" id="permissions-context">
        <div className="w-9 h-9 rounded-lg bg-[#204CC7]/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#204CC7]" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-black/85">Module access by role</p>
          <p className="text-[13px] text-black/60 mt-0.5 leading-relaxed">
            Each cell controls whether a role can perform that action. Changes apply to every employee in that role across the platform.
          </p>
        </div>
      </div>

      {/* Legend — clarifies the icon vocabulary used in cells. Sits
          above the matrix so the symbols are decoded before the
          eye reaches the data. Hint text contrast was bumped from
          black/45 to black/65 so the "Click any cell to toggle"
          line passes WCAG AA at 4.5:1 against white. */}
      <div className="flex items-center gap-5 text-[13px] text-black/65" id="permissions-legend">
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[#204CC7]/[0.10] inline-flex items-center justify-center" aria-hidden="true">
            <Check className="w-3.5 h-3.5 text-[#204CC7]" />
          </span>
          <span>Granted</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-black/[0.06] inline-flex items-center justify-center" aria-hidden="true">
            <Minus className="w-3.5 h-3.5 text-black/55" />
          </span>
          <span>Denied</span>
        </span>
        <span className="ml-auto text-[12.5px] text-black/65">Click any cell to toggle</span>
      </div>

      {/* Matrix — module rows grouped, action sub-rows below. The
          earlier rev used `position: sticky` on the first column
          plus `bg-inherit`, which broke against alternating-row
          tints (cells from columns to the right showed through
          the sticky cell). Drop both: at 920px max-width all 7
          role columns + the action column fit without horizontal
          scroll, so sticky isn't needed and zebra striping was
          adding noise without earning its keep. Clean white rows
          with a single 1px divider between them now. */}
      <SectionCard className="overflow-hidden">
        <table
          className="w-full table-fixed"
          role="table"
          aria-label="Module permissions by role"
          aria-describedby="permissions-legend"
        >
          {/* colgroup pins each role column to a uniform 96px so
              the table's intrinsic width math is predictable and
              role-column whitespace stays even across the seven
              columns; the first column takes whatever's left so
              action descriptions get the slack on wider screens. */}
          <colgroup>
            <col />
            {PLATFORM_ROLES.map(role => <col key={role} style={{ width: 96 }} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-black/[0.06] bg-[#FAFBFD]">
              <th
                scope="col"
                className="text-left text-[11px] font-semibold uppercase tracking-wider text-black/55 px-5 py-3"
              >
                Module / Action
              </th>
              {PLATFORM_ROLES.map(role => (
                <th key={role} scope="col" className="text-center px-1 py-3" title={roleHeader[role].full}>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-black/55 whitespace-nowrap">
                    {roleHeader[role].short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((mod, modIdx) => {
              const ModuleIcon = mod.icon;
              return (
                <Fragment key={mod.id}>
                  {/* Module section header — coloured icon + name +
                      sub-label. Spans all columns so the module
                      name reads as a clear band that opens its
                      action group below. The 6px tinted gap above
                      every section after the first separates one
                      module's group from the next. */}
                  <tr className={`bg-white ${modIdx > 0 ? 'border-t-[6px] border-[#F7F7F9]' : ''}`}>
                    <th
                      scope="rowgroup"
                      colSpan={1 + PLATFORM_ROLES.length}
                      className="px-5 py-3 text-left bg-white"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${mod.iconColor}14` }}
                          aria-hidden="true"
                        >
                          <ModuleIcon className="w-4 h-4" style={{ color: mod.iconColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold text-black/85">{mod.name}</p>
                          <p className="text-[12.5px] text-black/55 font-normal">{mod.description}</p>
                        </div>
                      </div>
                    </th>
                  </tr>

                  {/* Action sub-rows — one per editable permission.
                      Action label + muted description in column 1;
                      a 36×36 toggle button in each role column.
                      The 36×36 cell size is up from 28×28 so the
                      tap target lands inside WCAG 2.5.5 spec
                      (44×44 is the strict minimum, but 36px works
                      for desktop-only surfaces and is the agreed
                      compromise across Brego's other inline
                      pickers). */}
                  {mod.actions.map(act => (
                    <tr
                      key={act.id}
                      className="border-t border-black/[0.04] bg-white hover:bg-black/[0.012] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-[13.5px] font-medium text-black/85 leading-tight">{act.label}</p>
                        <p className="text-[12.5px] text-black/55 mt-0.5 leading-snug">{act.description}</p>
                      </td>
                      {PLATFORM_ROLES.map(role => {
                        const granted = act.byRole[role];
                        return (
                          <td key={role} className="px-1 py-3 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, act.id, role)}
                              aria-pressed={granted}
                              aria-label={`${roleHeader[role].full} — ${act.label}: ${granted ? 'granted' : 'denied'}. Activate to ${granted ? 'deny' : 'grant'}.`}
                              className={`w-9 h-9 rounded-md inline-flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                                granted
                                  ? 'bg-[#204CC7]/[0.10] text-[#204CC7] hover:bg-[#204CC7]/[0.16]'
                                  : 'bg-black/[0.05] text-black/55 hover:bg-black/[0.10] hover:text-black/75'
                              }`}
                            >
                              {granted
                                ? <Check className="w-4 h-4" aria-hidden="true" />
                                : <Minus className="w-4 h-4" aria-hidden="true" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

/* Suppress unused-symbol warnings for typings imported for context. */
type _PreserveEmployeeStatus = EmployeeStatus;
type _PreserveEmployeeRecord = EmployeeRecord;

/* ─────────── Component ─────────── */
const TAB_IDS: readonly TabId[] = ['profile', 'security', 'notifications', 'status', 'user-management'];
function isTabId(v: string | null): v is TabId {
  return v !== null && (TAB_IDS as readonly string[]).includes(v);
}

export function ProfileSettings() {
  // App Router wiring — every left-nav tab is its own URL via the
  // `?tab=<id>` query param so the sections are bookmarkable, the
  // browser back button steps through them, and a deep-link from
  // anywhere else in the app lands on the correct tab. The default
  // (no `tab` param) is 'profile'. Unknown values are normalised
  // back to 'profile' on mount via a router.replace so we don't
  // leave junk in the URL.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab') ?? null;
  const activeTab: TabId = isTabId(tabParam) ? tabParam : 'profile';

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [workingStatus, setWorkingStatus] = useState<WorkingStatus>('in-office');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: 'Mihir',
    lastName: 'Lunia',
    email: 'mihir@bregobusiness.com',
    phone: '+91 98765 43210',
    location: 'Mumbai, India',
    department: 'Brego Group',
    role: 'Founder & CEO',
    // Platform role (NOT designation). Drives access gating. Mirrors
    // the EmployeeRecord.role value on Mihir Lunia in MOCK_EMPLOYEES,
    // and is what controls whether the User Management tab appears.
    platformRole: 'Admin' as PlatformRole,
    employeeId: 'BB-BG-2022-001',
    dateOfJoining: '2022-01-01',
    reportingTo: 'N/A',
    workstation: 'Mumbai HQ',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailNotifications: true,
    taskReminders: true,
    reportUpdates: false,
    clientMessages: true,
    weeklyDigest: true,
    mentionAlerts: true,
    inboxMessages: true,
    systemUpdates: false,
  });

  // Admin-only gate — the User Management nav item is filtered out
  // when this is false. Keep the check stable + boolean so it's
  // trivial to swap for a real auth-context lookup later.
  const isAdmin = formData.platformRole === 'Admin';
  const visibleNavItems = useMemo(
    () => navItems.filter(item => item.id !== 'user-management' || isAdmin),
    [isAdmin],
  );

  // URL hygiene — strip an unknown / inaccessible `tab` value off
  // the URL so the address bar always agrees with what's on
  // screen. Two cases:
  //   1. `tab` is set but isn't one of the five known TabIds
  //      (e.g. `?tab=foo`) → wipe it.
  //   2. `tab=user-management` but the user isn't an Admin →
  //      gate-protected route, redirect to the default Profile
  //      tab so the User Management screen never renders behind
  //      the gate.
  // Uses replace (not push) so the cleanup doesn't leave a dead
  // entry in the browser history.
  useEffect(() => {
    const stripUnknown = tabParam !== null && !isTabId(tabParam);
    const blockedByGate = tabParam === 'user-management' && !isAdmin;
    if (!stripUnknown && !blockedByGate) return;
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    next.delete('tab');
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
  }, [tabParam, isAdmin, pathname, router, searchParams]);

  // Build a `?tab=<id>` href for the nav buttons. Preserves any
  // other query params that may be on the URL (e.g. analytics
  // params) so navigating between tabs doesn't drop them.
  const buildTabHref = (id: TabId): string => {
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    if (id === 'profile') {
      // 'profile' is the default — keep the URL clean by omitting
      // the `tab` param entirely on this tab.
      next.delete('tab');
    } else {
      next.set('tab', id);
    }
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
  };
  const goToTab = (id: TabId) => router.push(buildTabHref(id));

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    }, 800);
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const passwordsMatch = formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword && formData.newPassword !== formData.confirmPassword;
  const joiningDate = new Date(formData.dateOfJoining);
  const tenure = Math.floor((Date.now() - joiningDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  return (
    <div className="h-[calc(100vh-53px)] flex bg-[#F7F7F9]" role="main" aria-label="Profile settings">

      {/* ══════════ Left Sidebar Navigation ══════════ */}
      <aside className="w-[260px] bg-white border-r border-black/[0.06] flex flex-col flex-shrink-0" aria-label="Settings navigation">

        {/* Profile hero card */}
        <div className="px-5 pt-7 pb-6 border-b border-black/[0.06]">
          <div className="flex flex-col items-center text-center">
            <div className="relative group mb-3.5">
              <div className="w-[72px] h-[72px] bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-amber-200/50">
                <span className="text-white text-[22px] font-bold tracking-wide">ML</span>
              </div>
              <div className="absolute -bottom-1 -right-1">
                <StatusBadge status={workingStatus} size="md" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                aria-label="Change profile photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" aria-hidden="true" />
            </div>
            <p className="text-[15px] font-bold text-black/90">
              {formData.firstName} {formData.lastName}
            </p>
            <p className="text-[13px] text-black/45 mt-0.5">{formData.role}</p>
            <div className="mt-2.5">
              <StatusBadge status={workingStatus} size="sm" showLabel />
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Profile sections">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goToTab(item.id)}
                className={`w-full px-3 py-2.5 flex items-center gap-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-[#204CC7]/[0.07] text-[#204CC7]'
                    : 'text-black/55 hover:bg-black/[0.03] hover:text-black/75'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-[#204CC7]/10' : 'bg-black/[0.04]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className={`text-[13.5px] leading-tight truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </p>
                  <p className={`text-[13px] truncate mt-0.5 ${isActive ? 'text-[#204CC7]/50' : 'text-black/30'}`}>
                    {item.description}
                  </p>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-40" />}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4 border-t border-black/[0.06]">
          <div className="flex items-center gap-2 text-[13px] text-black/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Joined {joiningDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} · {tenure}y tenure</span>
          </div>
        </div>
      </aside>

      {/* ══════════ Main Content Area ══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Sticky header */}
        <header className="h-[58px] px-8 flex items-center justify-between border-b border-black/[0.06] bg-white flex-shrink-0">
          <div>
            <h1 className="text-[18px] font-bold text-black/90">
              {visibleNavItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {saveState === 'saved' && (
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 animate-[fadeIn_200ms_ease-out]">
                <CheckCircle className="w-4 h-4" />
                <span>Changes saved</span>
              </div>
            )}
            {(activeTab === 'profile' || activeTab === 'notifications') && (
              <button
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className={`h-[36px] px-5 flex items-center gap-2 rounded-md text-[13px] font-semibold transition-all ${
                  saveState === 'saving'
                    ? 'bg-[#204CC7]/70 text-white cursor-wait'
                    : 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm hover:shadow-md'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {saveState === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </header>

        {/* Scrollable content. The inner container caps width for the
            settings-form tabs (Profile / Security / Notifications /
            Status) at 720px so form fields read at a comfortable
            line-length, but User Management's permissions matrix
            needs the full content width to fit all 7 role columns
            without horizontal scroll — so on that tab we drop the
            max-width and use a thinner horizontal pad. */}
        <div className="flex-1 overflow-y-auto">
          <div className={
            activeTab === 'user-management'
              ? 'w-full px-8 py-8'
              : 'max-w-[720px] mx-auto px-8 py-8'
          }>

            {/* ═══════════ PROFILE TAB ═══════════ */}
            {activeTab === 'profile' && (
              <div className="space-y-8">

                {/* Section: Personal Information */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#204CC7]/[0.08] flex items-center justify-center">
                        <Pencil className="w-3.5 h-3.5 text-[#204CC7]" />
                      </div>
                      <h2 className="text-[15px] font-bold text-black/80">Personal Information</h2>
                    </div>
                    <span className="text-[13px] font-medium text-black/35">Editable</span>
                  </div>
                  <SectionCard className="p-6">
                    <div className="grid grid-cols-2 gap-5">
                      <FormField label="First Name" value={formData.firstName} onChange={(v) => handleInputChange('firstName', v)} />
                      <FormField label="Last Name" value={formData.lastName} onChange={(v) => handleInputChange('lastName', v)} />
                      <FormField label="Email Address" icon={Mail} value={formData.email} onChange={(v) => handleInputChange('email', v)} type="email" />
                      <FormField label="Phone Number" icon={Phone} value={formData.phone} onChange={(v) => handleInputChange('phone', v)} type="tel" />
                      <FormField label="Location" icon={MapPin} value={formData.location} onChange={(v) => handleInputChange('location', v)} colSpan />
                    </div>
                  </SectionCard>
                </section>

                {/* Section: Organization */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5 text-black/40" />
                      </div>
                      <h2 className="text-[15px] font-bold text-black/80">Organization</h2>
                    </div>
                    <span className="text-[13px] font-medium text-black/25 bg-black/[0.03] px-2.5 py-1 rounded-md">Read-only</span>
                  </div>
                  <SectionCard>
                    <div className="divide-y divide-black/[0.04]">
                      <InfoRow label="Department" value={formData.department} icon={Building2} />
                      <InfoRow label="Role" value={formData.role} icon={Briefcase} />
                      <InfoRow label="Employee ID" value={formData.employeeId} icon={Fingerprint} />
                      <InfoRow
                        label="Date of Joining"
                        value={joiningDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        icon={Calendar}
                      />
                      <InfoRow
                        label="Reporting To"
                        value={formData.reportingTo}
                        icon={User}
                      />
                      <InfoRow label="Workstation" value={formData.workstation} icon={MapPin} />
                    </div>
                  </SectionCard>
                  <p className="text-[13px] text-black/30 mt-3 flex items-center gap-2 px-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Organization details are managed by your admin. Contact Adminland to request changes.
                  </p>
                </section>
              </div>
            )}

            {/* ═══════════ SECURITY TAB ═══════════ */}
            {activeTab === 'security' && (
              <div className="space-y-8">

                {/* Change Password */}
                <section>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#204CC7]/[0.08] flex items-center justify-center">
                      <KeyRound className="w-3.5 h-3.5 text-[#204CC7]" />
                    </div>
                    <h2 className="text-[15px] font-bold text-black/80">Change Password</h2>
                  </div>
                  <SectionCard className="p-6 space-y-5">
                    {/* Current Password */}
                    <div>
                      <label className="text-[13px] font-semibold text-black/45 block mb-2">Current Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-black/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                          placeholder="Enter current password"
                          className="w-full pl-10 pr-10 py-2.5 border border-black/[0.08] rounded-lg text-[14px] text-black/85 placeholder:text-black/25 hover:border-black/[0.14] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/12 focus:border-[#204CC7]/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/55 transition-colors p-0.5"
                          aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-black/[0.06]" />

                    {/* New Password */}
                    <div>
                      <label className="text-[13px] font-semibold text-black/45 block mb-2">New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-black/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={formData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                          placeholder="Enter new password"
                          className="w-full pl-10 pr-10 py-2.5 border border-black/[0.08] rounded-lg text-[14px] text-black/85 placeholder:text-black/25 hover:border-black/[0.14] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/12 focus:border-[#204CC7]/30 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/25 hover:text-black/55 transition-colors p-0.5"
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Strength meter */}
                      {formData.newPassword && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                  i <= passwordStrength.score ? passwordStrength.barColor : 'bg-black/[0.06]'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-[13px] font-semibold ${passwordStrength.color}`}>{passwordStrength.label}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="text-[13px] font-semibold text-black/45 block mb-2">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-black/25 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          placeholder="Re-enter new password"
                          className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-[14px] text-black/85 placeholder:text-black/25 hover:border-black/[0.14] focus:outline-none focus:ring-2 transition-all ${
                            passwordsMismatch
                              ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400'
                              : passwordsMatch
                              ? 'border-emerald-300 focus:ring-emerald-100 focus:border-emerald-400'
                              : 'border-black/[0.08] focus:ring-[#204CC7]/12 focus:border-[#204CC7]/30'
                          }`}
                        />
                        {passwordsMatch && (
                          <Check className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        )}
                        {passwordsMismatch && (
                          <AlertTriangle className="w-4 h-4 text-rose-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      {passwordsMismatch && (
                        <p className="text-[13px] text-rose-500 font-medium mt-2">Passwords do not match</p>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        disabled={!formData.currentPassword || !formData.newPassword || !passwordsMatch}
                        className={`h-[38px] px-6 rounded-md text-[13px] font-semibold transition-all ${
                          formData.currentPassword && formData.newPassword && passwordsMatch
                            ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm hover:shadow-md'
                            : 'bg-black/[0.05] text-black/25 cursor-not-allowed'
                        }`}
                      >
                        Update Password
                      </button>
                    </div>
                  </SectionCard>
                </section>

                {/* Active Sessions */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5 text-black/40" />
                      </div>
                      <h2 className="text-[15px] font-bold text-black/80">Active Sessions</h2>
                    </div>
                    <span className="text-[13px] font-medium text-black/35">{activeSessions.length} devices</span>
                  </div>
                  <SectionCard>
                    <div className="divide-y divide-black/[0.04]">
                      {activeSessions.map((session, i) => {
                        const SIcon = session.icon;
                        return (
                          <div key={i} className="px-5 py-4 flex items-center gap-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              session.current ? 'bg-[#204CC7]/[0.07]' : 'bg-black/[0.03]'
                            }`}>
                              <SIcon className={`w-[18px] h-[18px] ${session.current ? 'text-[#204CC7]' : 'text-black/35'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                <span className="text-[14px] font-semibold text-black/80 truncate">{session.device}</span>
                                <span className="text-[13px] text-black/30">{session.browser}</span>
                                {session.current && (
                                  <span className="text-[13px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">This device</span>
                                )}
                              </div>
                              <p className="text-[13px] text-black/35 mt-0.5">{session.location} · {session.lastActive}</p>
                            </div>
                            {!session.current && (
                              <button
                                className="h-[32px] px-3 flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                                aria-label={`Sign out ${session.device}`}
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                Sign out
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                </section>
              </div>
            )}

            {/* ═══════════ NOTIFICATIONS TAB ═══════════ */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                {[
                  {
                    title: 'Communication',
                    icon: Mail,
                    items: [
                      { id: 'inboxMessages', label: 'Inbox messages', desc: 'New messages in channels and DMs' },
                      { id: 'mentionAlerts', label: 'Mentions & replies', desc: 'When someone @mentions you or replies to your message' },
                      { id: 'clientMessages', label: 'Client messages', desc: 'Messages from client channels' },
                    ],
                  },
                  {
                    title: 'Activity',
                    icon: Bell,
                    items: [
                      { id: 'taskReminders', label: 'Task reminders', desc: 'Upcoming deadlines and assigned tasks' },
                      { id: 'reportUpdates', label: 'Report updates', desc: 'New reports and data changes in your workspace' },
                      { id: 'weeklyDigest', label: 'Weekly digest', desc: 'Summary of activity every Monday morning' },
                    ],
                  },
                  {
                    title: 'System',
                    icon: Monitor,
                    items: [
                      { id: 'emailNotifications', label: 'Email notifications', desc: 'All notifications delivered to your email' },
                      { id: 'systemUpdates', label: 'System updates', desc: 'Platform maintenance and feature announcements' },
                    ],
                  },
                ].map((section) => {
                  const SectionIcon = section.icon;
                  return (
                    <section key={section.title}>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                          <SectionIcon className="w-3.5 h-3.5 text-black/40" />
                        </div>
                        <h2 className="text-[15px] font-bold text-black/80">{section.title}</h2>
                      </div>
                      <SectionCard>
                        <div className="divide-y divide-black/[0.04]">
                          {section.items.map(item => (
                            <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-black/75">{item.label}</p>
                                <p className="text-[13px] text-black/35 mt-0.5">{item.desc}</p>
                              </div>
                              <ToggleSwitch
                                checked={formData[item.id as keyof typeof formData] as boolean}
                                onChange={(v) => handleInputChange(item.id, v)}
                                label={item.label}
                              />
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    </section>
                  );
                })}
              </div>
            )}

            {/* ═══════════ STATUS TAB ═══════════ */}
            {activeTab === 'status' && (
              <div className="space-y-8">
                {/* Current status preview */}
                <section>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-black/40" />
                    </div>
                    <h2 className="text-[15px] font-bold text-black/80">Current Status</h2>
                  </div>
                  <SectionCard className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-md shadow-amber-200/30">
                          <span className="text-white text-[17px] font-bold">ML</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          <StatusBadge status={workingStatus} size="md" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[15px] font-bold text-black/85">{formData.firstName} {formData.lastName}</p>
                        <p className="text-[13px] text-black/40 mt-0.5">{formData.role} · {formData.department}</p>
                        <div className="mt-2">
                          <StatusBadge status={workingStatus} size="sm" showLabel />
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </section>

                {/* Status options */}
                <section>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
                      <HeartPulse className="w-3.5 h-3.5 text-black/40" />
                    </div>
                    <h2 className="text-[15px] font-bold text-black/80">Set Your Status</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="Working status options">
                    {statusOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = workingStatus === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setWorkingStatus(option.id)}
                          className={`w-full p-4.5 px-5 py-4 flex items-center gap-4 rounded-xl border-2 text-left transition-all ${
                            isSelected
                              ? `${option.bg} ${option.border} shadow-sm`
                              : 'bg-white border-black/[0.06] hover:border-black/[0.12] hover:shadow-sm'
                          }`}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={option.label}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected ? option.iconBg : 'bg-black/[0.03]'
                          }`}>
                            <Icon className={`w-5 h-5 ${isSelected ? option.color : 'text-black/30'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[14px] font-semibold ${isSelected ? option.color : 'text-black/70'}`}>
                              {option.label}
                            </p>
                            <p className={`text-[13px] mt-0.5 ${isSelected ? `${option.color} opacity-60` : 'text-black/35'}`}>
                              {option.description}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? `${option.border} ${option.bg}` : 'border-black/15'
                          }`}>
                            {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${option.dot}`} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* ═══════════ USER MANAGEMENT TAB (Admin-only) ═══════════
                Visibility is double-gated: the nav item is filtered
                out of `visibleNavItems` for non-admins, AND the
                content render checks `isAdmin` so a stale
                ?activeTab=user-management deep-link can't show the
                screen to a non-admin who manages to set the state. */}
            {activeTab === 'user-management' && isAdmin && (
              <UserManagementPanel />
            )}
          </div>
        </div>
      </div>

      {/* Animation keyframe */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
