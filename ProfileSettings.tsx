'use client';
import { useState, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, Building2, Briefcase, Calendar, Shield,
  Bell, Eye, EyeOff, Save, Camera, CheckCircle, HeartPulse, Lock,
  Smartphone, Monitor, Globe, LogOut, Clock, AlertTriangle,
  Check, Home, ExternalLink, Laptop, Info, ChevronRight,
  Pencil, KeyRound, Fingerprint, ShieldCheck,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';

/* ─────────── Types ─────────── */
type TabId = 'profile' | 'security' | 'notifications' | 'status';
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

/* ─────────── Component ─────────── */
export function ProfileSettings() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
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
              {navItems.find(n => n.id === activeTab)?.label}
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
                className={`h-[36px] px-5 flex items-center gap-2 rounded-lg text-[13px] font-semibold transition-all ${
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

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-8 py-8">

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
                        className={`h-[38px] px-6 rounded-lg text-[13px] font-semibold transition-all ${
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
