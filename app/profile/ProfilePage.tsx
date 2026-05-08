'use client';

import { useSearchParams } from 'next/navigation';
import { ProfileSettings } from '@/ProfileSettings';

export default function ProfilePage() {
  const searchParams = useSearchParams();

  return <ProfileSettings />;
}