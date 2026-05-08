"use client";

// Dashboard module layout.
//
// We've closed down the Performance Marketing service, so the Dashboard
// module is now a single-surface module focused on Accounts & Taxation.
// The previous left rail (Performance Marketing / Accounts & taxation
// switcher) is no longer meaningful with one entry, so this layout has
// been simplified to a full-bleed shell — the table now reads
// edge-to-edge across the screen.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-53px)] bg-[#F8F9FB] overflow-hidden">
      {children}
    </div>
  );
}
