"use client";
import { AllClients } from '@/adminland/AllClients';
import { useRouter } from 'next/navigation';
export default function ClientsPage() {
  const router = useRouter();
  return <AllClients onNavigateToIncidents={() => router.push('/adminland/incidents')} />;
}
