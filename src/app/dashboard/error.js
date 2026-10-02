'use client';

import { useEffect } from 'react';
import { FaceliftRoot, ErrorPage, QuietButton } from '@/components/facelift';

/**
 * The dashboard's error boundary. Next requires this to be a client component and hands it the error plus
 * a `reset` that re-renders the segment.
 *
 * Before this file existed a thrown render error showed Next's own error page — white, framed by nothing,
 * and in production just "Application error: a client-side exception has occurred". A jeweler mid-job got
 * no way back to the bench.
 *
 * The digest is shown and the stack is not: the digest is what ties this to a server log, and the stack
 * tells the person nothing while telling anyone looking over their shoulder too much.
 */
export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('[dashboard] unhandled error:', error?.message, error?.digest);
  }, [error]);

  return (
    <FaceliftRoot>
      <ErrorPage digest={error?.digest} onRetry={reset}>
        <QuietButton onClick={() => { window.location.href = '/dashboard/repairs/my-bench'; }}>
          Back to My Bench
        </QuietButton>
      </ErrorPage>
    </FaceliftRoot>
  );
}
