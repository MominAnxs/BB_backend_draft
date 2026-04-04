"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';

/** Minimal Material Symbols icon helper */
function MIcon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

const navItems = [
  { id: 'home',      label: 'Home', icon: 'space_dashboard', href: '/home' },
  { id: 'inbox',     label: 'Inbox',     icon: 'mail',            href: '/inbox' },
  { id: 'dashboard', label: 'Dashboard',  icon: 'monitoring',      href: '/dashboard' },
  { id: 'workspace', label: 'Workspace', icon: 'work',            href: '/workspace' },
  { id: 'dataroom',  label: 'Dataroom',  icon: 'database',        href: '/dataroom' },
];

export function Navigation() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header
      className="bg-white border-b border-black/[0.06] sticky top-0 z-50"
      role="banner"
    >
      <div className="px-6">
        {/*
          3-column grid: Logo | Nav (always centered) | Actions
          The center column spans the full remaining space and
          centers its children, so the nav stays perfectly centered
          regardless of left / right content width.
        */}
        <div className="flex items-center justify-between h-[52px]">
          {/* ── Left: Logo (fixed width to balance right side) ── */}
          <div className="w-[200px] flex items-center">
          <Link href="/home" className="flex items-center gap-3" aria-label="Brego Business home">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M24 48C37.2548 48 48 37.2548 48 24C48 10.7452 37.2548 0 24 0C10.7452 0 0 10.7452 0 24C0 37.2548 10.7452 48 24 48Z" fill="#204CC7"/>
                <path d="M37.6972 24.2007C34.3441 28.9545 29.8697 32.7561 24.5088 35.8299L26.1129 39.1278H27.7481C32.4777 35.9955 36.7209 32.0282 40.564 27.3297C39.6187 26.2947 38.6701 25.2322 37.6972 24.1973V24.2007Z" fill="white"/>
                <path d="M22.3569 31.4432L23.9335 34.6584C28.9805 31.6122 33.3099 27.8658 36.808 23.3087C35.949 22.4152 35.059 21.5182 34.2 20.6523C31.1607 24.93 27.1452 28.4799 22.3604 31.4432H22.3569Z" fill="white"/>
                <path d="M22.4106 29.7628C24.0458 23.7533 24.5909 17.9922 22.697 11.9551C26.9988 12.5967 30.2934 15.4773 33.0773 19.586C30.9557 22.9978 27.7716 26.4061 22.4106 29.7628Z" fill="white"/>
                <path d="M22.6407 20.0894C22.6407 20.0894 20.5191 16.0636 17.9111 14.694C15.6756 13.4935 14.8443 10.8372 15.0719 8.90875C15.0719 8.90875 23.2134 7.67718 22.6407 20.0929V20.0894Z" fill="white"/>
                <path d="M16.3059 15.7598L14.0394 18.2746L13.8394 22.3281L22.412 29.7658C23.6746 21.8555 20.4629 17.6054 16.3059 15.7598Z" fill="white"/>
                <path d="M21.5005 30.5417L10.375 27.6335L13.0417 23.5801L21.5005 30.5417Z" fill="white"/>
                <path d="M14.5 30.3477L15.8178 33.0592L19.3159 31.5792L14.5 30.3477Z" fill="white"/>
                <path d="M7.44629 32.0813L10.2854 36.2176L13.5834 35.3517L14.301 33.6751L12.4381 29.8183L9.42645 29.0352L7.44974 32.0813H7.44629Z" fill="white"/>
              </svg>
            </div>
          </Link>
          </div>

          {/* ── Center: Navigation (always dead-center) ── */}
          <nav
            className="flex items-center justify-center gap-1"
            aria-label="Main navigation"
          >
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-body ${
                    isActive
                      ? 'text-[#204CC7] font-semibold'
                      : 'text-black/65 font-medium hover:text-black/90 hover:bg-black/[0.03]'
                  }`}
                >
                  <MIcon
                    name={item.icon}
                    className={`text-[20px] ${isActive ? 'text-[#204CC7]' : ''}`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ── Right: Notifications + Profile (fixed width to balance left side) ── */}
          <div className="w-[200px] flex items-center justify-end gap-2">
            {/* Activity Log */}
            <button
              onClick={() => router.push('/activity')}
              className={`relative w-10 h-10 border rounded-xl transition-all flex items-center justify-center ${
                pathname.startsWith('/activity')
                  ? 'border-[#204CC7]/20 bg-[#EEF1FB] text-[#204CC7]'
                  : 'border-black/10 hover:bg-black/[0.03] text-black/55'
              }`}
              aria-label="Activity Log"
            >
              <MIcon name="timeline" className="text-[20px]" />
            </button>

            {/* Notification Bell */}
            <button
              className="relative w-10 h-10 border border-black/10 rounded-xl hover:bg-black/[0.03] transition-all flex items-center justify-center"
              aria-label="Notifications — 1 unread"
            >
              <MIcon name="notifications" className="text-[20px] text-black/55" />
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold leading-none"
                aria-hidden="true"
              >3</span>
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
                <MIcon
                  name="expand_more"
                  className={`text-[18px] text-black/55 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
                />
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
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-black/5 overflow-hidden z-50"
                    role="menu"
                    aria-label="User options"
                  >
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
                        onClick={() => { router.push('/profile'); setShowProfileMenu(false); }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-black/70 hover:bg-black/5 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <MIcon name="account_circle" className="text-[20px] text-black/60" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => { router.push('/adminland'); setShowProfileMenu(false); }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-black/70 hover:bg-black/5 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <MIcon name="settings" className="text-[20px] text-black/60" />
                        <span>Adminland</span>
                      </button>
                      <div className="border-t border-black/5 my-2" role="separator" />
                      <button
                        onClick={() => { console.log('Logout'); setShowProfileMenu(false); }}
                        className="w-full px-3 py-2 text-left text-body font-normal text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors"
                        role="menuitem"
                      >
                        <MIcon name="logout" className="text-[20px]" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
