'use client';
import { useState } from 'react';
import { LayoutDashboard, Inbox, FolderKanban, BarChart3, HardDrive, Bell, ChevronDown, Settings, LogOut, UserCircle, Calendar } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface NavigationProps {
  activeSection: string;
  onNavigate: (section: string) => void;
  onProfileClick: () => void;
  onAdminlandClick: () => void;
  onLogout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isAdminland?: boolean;
  globalDateRange?: 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4';
  onDateRangeChange?: (range: 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4') => void;
  globalDepartment?: 'All' | 'Finance' | 'Performance Marketing';
  onDepartmentChange?: (dept: 'All' | 'Finance' | 'Performance Marketing') => void;
}

export function Navigation({ activeSection, onNavigate, onProfileClick, onAdminlandClick, onLogout, activeTab, onTabChange, isAdminland, globalDateRange, onDateRangeChange, globalDepartment, onDepartmentChange }: NavigationProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'workspace', label: 'Workspace', icon: FolderKanban },
    { id: 'dataroom', label: 'Dataroom', icon: HardDrive },
  ];

  const reportTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'growth-pl', label: 'Growth P&L' },
    { id: 'attrition', label: 'Attrition' },
    { id: 'cla', label: 'CLAs' },
    { id: 'sales', label: 'Sales Reports' },
  ];

  const dateRangeLabels: Record<string, string> = {
    'ytd': 'YTD',
    'mtd': 'MTD',
    'weekly': 'Weekly',
    'daily': 'Daily',
    'q1': 'Q1',
    'q2': 'Q2',
    'q3': 'Q3',
    'q4': 'Q4',
  };

  return (
    <header className="bg-white border-b border-black/[0.06] sticky top-0 z-50" role="banner">
      <div className="px-6">
        {/* Row 1: Main Nav */}
        <div className="flex items-center justify-between h-[52px]">
          {/* Logo — fixed width to balance right side */}
          <div className="w-[160px] flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.95"/>
                <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="sr-only">Brego Business</span>
          </div>
          </div>

          {/* Navigation Items — true center */}
          <nav className="flex items-center justify-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-body ${
                    isActive
                      ? 'text-[#204CC7] font-semibold'
                      : 'text-black/65 font-medium hover:text-black/90 hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section — fixed width to balance left side */}
          <div className="w-[160px] flex items-center justify-end gap-3">
            {/* Notification Bell */}
            <button
              className="relative w-10 h-10 border border-black/10 rounded-xl hover:bg-black/[0.03] transition-all flex items-center justify-center"
              aria-label="Notifications — 1 unread"
            >
              <Bell className="w-[18px] h-[18px] text-black/50" aria-hidden="true" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" aria-hidden="true"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-0.5 pr-2 py-0.5 hover:bg-black/[0.03] rounded-full transition-all border border-transparent hover:border-black/5"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-caption font-bold tracking-wide">JD</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {showProfileMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)}
                    aria-hidden="true"
                  />
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/5 overflow-hidden z-50" role="menu" aria-label="User options">
                    {/* User Info */}
                    <div className="p-4 border-b border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white text-body font-bold">JD</span>
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5">
                            <StatusBadge status="in-office" size="sm" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-black/90 truncate text-body font-medium">Johnathan Doe</p>
                          <div className="mt-0.5">
                            <StatusBadge status="in-office" size="sm" showLabel={true} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={() => {
                          onProfileClick();
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-black/70 hover:bg-black/5 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <UserCircle className="w-4 h-4 text-black/60" aria-hidden="true" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          onAdminlandClick();
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-black/70 hover:bg-black/5 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4 text-black/60" aria-hidden="true" />
                        <span>Adminland</span>
                      </button>
                      <div className="border-t border-black/5 my-2" role="separator"></div>
                      <button 
                        onClick={() => {
                          onLogout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Greeting + 3 Dropdowns — Only on Dashboard (not Adminland) */}
        {activeSection === 'dashboard' && !isAdminland && (
          <div className="border-t border-black/5">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-black/90 text-body font-semibold">Good Morning, John</p>
                <p className="text-black/60 mt-0.5 text-caption font-normal">
                  View and analyze key business metrics and reports
                </p>
              </div>

              {/* 3 Dropdowns: Date | Department | Report */}
              <div className="flex items-center gap-2.5">
                {/* Date Dropdown */}
                <div className="relative">
                  <label htmlFor="nav-date-range-filter" className="sr-only">Date range</label>
                  <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  <select
                    id="nav-date-range-filter"
                    value={globalDateRange}
                    onChange={(e) => onDateRangeChange?.(e.target.value as 'ytd' | 'mtd' | 'weekly' | 'daily' | 'q1' | 'q2' | 'q3' | 'q4')}
                    className="appearance-none bg-white pl-8 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    <option value="ytd">YTD</option>
                    <option value="mtd">MTD</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="q1">Q1</option>
                    <option value="q2">Q2</option>
                    <option value="q3">Q3</option>
                    <option value="q4">Q4</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>

                {/* Department Dropdown */}
                <div className="relative">
                  <label htmlFor="nav-dept-filter" className="sr-only">Department</label>
                  <select
                    id="nav-dept-filter"
                    value={globalDepartment}
                    onChange={(e) => onDepartmentChange?.(e.target.value as 'All' | 'Finance' | 'Performance Marketing')}
                    className="appearance-none bg-white pl-3 pr-8 py-1.5 rounded-lg text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
                  >
                    <option value="All">All Departments</option>
                    <option value="Finance">Finance</option>
                    <option value="Performance Marketing">Performance Marketing</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                </div>

                {/* Report View Dropdown */}
                {onTabChange && (
                  <div className="relative">
                    <label htmlFor="nav-report-view" className="sr-only">Report view</label>
                    <select
                      id="nav-report-view"
                      value={activeTab}
                      onChange={(e) => onTabChange(e.target.value)}
                      className="appearance-none bg-[#EEF1FB] text-[#204CC7] pl-3 pr-8 py-1.5 rounded-lg text-caption font-semibold border border-[#204CC7]/20 hover:bg-[#E4E8F9] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-all cursor-pointer"
                    >
                      {reportTabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>{tab.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-white/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}