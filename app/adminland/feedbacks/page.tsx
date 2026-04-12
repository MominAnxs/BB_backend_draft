import { Suspense } from 'react';
import FeedbacksPage from './FeedbacksPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedbacksPage />
    </Suspense>
  );
}