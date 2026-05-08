import { Suspense } from 'react';
import ProfilePage from './ProfilePage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}