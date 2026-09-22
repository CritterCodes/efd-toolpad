'use client';
/**
 * Affiliate → Payouts. Commissions are written as payroll entries and paid the same way as everyone
 * else's earnings: through Stripe Connect, and only that way. This page is where an affiliate
 * connects their Stripe account and sees each payout batch (gross / fee / net, status).
 */
import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Paid as PaidIcon } from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ConnectPayoutCard from '@/components/payroll/ConnectPayoutCard';
import { payrollTotal } from '@/services/payrollUtils';

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const STATUS_COLOR = { paid: 'success', finalized: 'warning', draft: 'default', void: 'default' };

export default function AffiliatePayoutsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [batches, setBatches] = useState(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'affiliate') router.push('/dashboard');
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/payouts/mine').then((r) => r.json()).then((b) => setBatches(Array.isArray(b?.batches) ? b.batches : [])).catch(() => setBatches([]));
  }, [status]);

  if (status !== 'authenticated' || session?.user?.role !== 'affiliate') {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <PaidIcon />
        <Typography variant="h5" fontWeight={600}>Payouts</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your commissions are paid through Stripe every Wednesday for the week ending Saturday, in your bank Friday. Connect once; everything after that is automatic.
      </Typography>

      <ConnectPayoutCard sx={{ mb: 3 }} />

      <Typography variant="overline" color="text.secondary">Payout history</Typography>
      {batches === null ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
      ) : batches.length === 0 ? (
        <Card sx={{ mt: 1 }}><CardContent><Typography color="text.secondary">No payouts yet. Commissions appear here the week they are earned.</Typography></CardContent></Card>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {batches.map((b) => {
            const gross = payrollTotal(b);
            return (
              <Card key={b.batchID}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography fontWeight={600}>{b.cadence === 'daily' ? 'Day' : 'Week'} of {new Date(b.weekStart).toLocaleDateString()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b.entryCount || 0} entr{b.entryCount === 1 ? 'y' : 'ies'}
                      {b.payout?.fee > 0 ? ` · ${money(b.payout.gross)} earned, ${money(b.payout.fee)} payout fee` : ''}
                      {b.paidAt ? ` · paid ${new Date(b.paidAt).toLocaleDateString()}` : ''}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(b.payout?.net ?? gross)}</Typography>
                  <Chip size="small" label={b.status === 'finalized' ? 'waiting for payout' : b.status} color={STATUS_COLOR[b.status] || 'default'} />
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
