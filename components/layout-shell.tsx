"use client";

import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/navigation';

/** Client wrapper that conditionally renders the Navigation bar.
 *  Hidden on auth pages (e.g. /login) so they render full-screen. */
export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login');

  return (
    <>
      {!isAuthPage && <Navigation />}
      {children}
    </>
  );
}
