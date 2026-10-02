import Link from 'next/link';
import { FaceliftRoot, NotFoundPage, QuietButton } from '@/components/facelift';

/**
 * Any URL in the app that resolves to nothing and is not under `/dashboard`. Without this file Next
 * serves its own unstyled 404 — white page, system font, no way back — which is what `/artisans` looked
 * like on the shop before it was redirected.
 */
export default function RootNotFound() {
  return (
    <FaceliftRoot>
      <div style={{ minHeight: '100svh', background: '#08090B' }}>
        <NotFoundPage>
          <QuietButton as={Link} href="/dashboard">Go to the dashboard</QuietButton>
        </NotFoundPage>
      </div>
    </FaceliftRoot>
  );
}
