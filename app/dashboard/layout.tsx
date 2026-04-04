export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="max-w-[1400px] mx-auto px-8 pt-6 pb-6">
      {children}
    </main>
  );
}
