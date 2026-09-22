'use client';
/**
 * Persistent banner for an artisan who has not accepted the CURRENT artisan terms (services/policies/
 * termsGate.js gates the money actions; this is the warning before they hit the gate). Renders nothing
 * for other roles and for artisans who are current. Not dismissible on purpose: the gate is not either.
 */
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Alert, Button } from '@mui/material';

export default function TermsBanner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'artisan') { setPending(null); return; }
    fetch('/api/policies').then((r) => (r.ok ? r.json() : null))
      .then((d) => setPending((d?.policies || []).find((p) => p.docId === 'artisan-terms' && p.needsAcceptance) || null))
      .catch(() => setPending(null));
  }, [status, session?.user?.role, pathname]);

  if (!pending || pathname === '/dashboard/policies') return null;
  const updated = Boolean(pending.acceptedVersion);
  return (
    <Alert
      severity="warning"
      sx={{ mb: 2, alignItems: 'center', '& .MuiAlert-message': { flex: 1 } }}
      action={<Button color="inherit" size="small" onClick={() => router.push('/dashboard/policies')} sx={{ textTransform: 'none', fontWeight: 700 }}>{updated ? 'Review & accept' : 'Read & accept'}</Button>}
    >
      {updated
        ? `The artisan terms were updated to v${pending.version}. Claiming work, moving jobs to QC, listing and Stripe payouts pause until you accept the new version.`
        : 'Accept the artisan terms before claiming work, moving jobs to QC, listing pieces or connecting Stripe payouts. It takes a minute.'}
    </Alert>
  );
}
