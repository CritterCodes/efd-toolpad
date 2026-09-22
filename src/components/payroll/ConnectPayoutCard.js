'use client';
/**
 * "Get paid by Stripe" — a payee connects their own Express account (bank details live with Stripe,
 * never with us), sees whether payouts are live, and opens their Stripe dashboard. With
 * `adminFor={userID}` the same card manages someone else.
 * Stripe is the ONLY way anyone is paid (owner, 2026-09-22). Backed by /api/payouts/connect
 * (+ /dashboard). See services/payroll/connectPayouts.js.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useSearchParams } from 'next/navigation';

export default function ConnectPayoutCard({ adminFor = null, sx }) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const q = adminFor ? `?userID=${encodeURIComponent(adminFor)}` : '';

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/payouts/connect${q}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not load payout status');
      setStatus(body);
    } catch (e) {
      setError(e.message);
      setStatus({ configured: false });
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);
  // Back from Stripe onboarding → refresh once so "payouts live" shows without a reload.
  useEffect(() => { if (searchParams?.get('connect')) load(); }, [searchParams, load]);

  const onboard = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/payouts/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminFor ? { userID: adminFor } : {}) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not start Stripe onboarding');
      window.location.assign(body.url);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const openDashboard = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/payouts/connect/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminFor ? { userID: adminFor } : {}) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not open the Stripe dashboard');
      window.open(body.url, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setCadence = async (cadence) => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/payouts/cadence', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userID: adminFor, cadence }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not save');
      setStatus((s) => ({ ...s, cadence }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;
  const live = status.connected && status.payoutsEnabled;
  const cadence = status.cadence === 'daily' ? 'daily' : 'weekly';
  const pending = status.connected && !status.payoutsEnabled;

  return (
    <Card sx={{ borderRadius: 3, ...sx }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <AccountBalanceIcon />
          <Typography variant="h6" sx={{ flex: 1 }}>{adminFor ? 'Stripe payouts' : 'Get paid by Stripe'}</Typography>
          {status.mode === 'test' && <Chip label="Stripe test mode" size="small" color="warning" />}
          {live && <Chip label="Payouts live" size="small" color="success" />}
          {pending && <Chip label="Finish Stripe setup" size="small" color="warning" />}
          {status.configured && !status.connected && <Chip label="Not connected" size="small" />}
        </Stack>

        {!status.configured ? (
          <Typography variant="body2" color="text.secondary">Stripe is not configured on this server.</Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {live
                ? 'Every finalized payroll batch is transferred to your Stripe account and paid out to your bank daily. EFD covers Stripe\u2019s fees; you receive the full amount.'
                : pending
                  ? 'Your Stripe account exists but onboarding is not finished \u2014 nothing can be paid until it is. Pick up where you left off.'
                  : 'Payouts go only through Stripe. Connect a Stripe Express account once \u2014 your bank details stay with Stripe \u2014 and every finalized payroll batch (bench labor, consignment sales, referral commissions) is paid to it automatically. EFD covers Stripe\u2019s fees.'}
            </Typography>
            {pending && status.requirementsDue?.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Stripe still needs: {status.requirementsDue.join(', ')}
              </Typography>
            )}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {!live && (
                <Button variant="contained" onClick={onboard} disabled={busy}>
                  {pending ? 'Continue Stripe setup' : 'Connect with Stripe'}
                </Button>
              )}
              {status.connected && (
                <Button variant="outlined" onClick={openDashboard} disabled={busy}>Open Stripe dashboard</Button>
              )}
              <Button variant="text" onClick={load} disabled={busy}>Refresh</Button>
            </Stack>
            {status.connected && (
              <Box sx={{ mt: 1.5 }}>
                {adminFor ? (
                  <>
                    <Typography variant="caption" color="text.secondary">Payout cadence (you grant this)</Typography>
                    <RadioGroup row value={cadence} onChange={(e) => setCadence(e.target.value)}>
                      <FormControlLabel value="weekly" control={<Radio size="small" disabled={busy} />} label="Weekly — Wednesday, in the bank Friday, free" />
                      <FormControlLabel value="daily" control={<Radio size="small" disabled={busy} />} label={`Daily — payee pays ${status.dailyFeeLabel || 'the payout fee'}`} />
                    </RadioGroup>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {cadence === 'daily'
                      ? `You are on daily payouts: each day’s work is transferred the next morning, less ${status.dailyFeeLabel || 'the payout fee'}.`
                      : 'You are on weekly payouts: paid Wednesday for the week ending Saturday, in your bank Friday. Free — EFD covers the Stripe fee. Ask EFD about daily payouts if you want money sooner.'}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}
