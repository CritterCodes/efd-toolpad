import Link from 'next/link';
import { FaceliftRoot, NotFoundPage, QuietButton } from '@/components/facelift';

/**
 * A dashboard URL that does not resolve — an old bookmark, a repair that was closed out, a mistyped id.
 * Rendered inside the dashboard layout, so the nav stays and the way back is one tap rather than the
 * browser's back button.
 */
export default function DashboardNotFound() {
  return (
    <FaceliftRoot>
      <NotFoundPage>
        <QuietButton as={Link} href="/dashboard/repairs/my-bench">Back to My Bench</QuietButton>
        <QuietButton as={Link} href="/dashboard">Dashboard</QuietButton>
      </NotFoundPage>
    </FaceliftRoot>
  );
}
