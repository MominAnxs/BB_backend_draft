export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-[calc(100vh-53px)]">
      {children}
    </main>
  );
}
