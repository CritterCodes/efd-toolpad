"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack, Tabs, Tab,
  CircularProgress, Alert, AlertTitle,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * What I owe EFD — the artisan's own view of the billing rail.
 *
 * The staff page (/dashboard/production/invoices) resolves invoices; this one only shows them and
 * lets the artisan pay. Without it the rail was staff-only: an artisan frozen out of new runs by an
 * overdue invoice had no way to see what it was for, how much, or how to clear it — the notification
 * carried a pay link, but nothing listed the ledger.
 *
 * Read-only by construction. GET /api/artisanInvoices scopes to the caller from the SESSION, so this
 * page cannot show another artisan's bills, and no resolve/void action is offered — those are
 * admin-only server-side, and rendering buttons that 403 is worse than not rendering them.
 */

const TABS = [
  { key: 'pending_payment', label: 'Outstanding' },
  { key: 'paid', label: 'Paid' },
];

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const when = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const isOverdue = (inv) => inv.status === 'pending_payment' && new Date(inv.dueAt).getTime() < Date.now();

export default function MyInvoicesPage() {
  const [tab, setTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const status = TABS[tab].key;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/artisanInvoices?status=${status}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load your invoices.');
        if (!cancelled) setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } catch (e) {
        if (!cancelled) { setError(e.message); setInvoices([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  const { outstandingTotal, overdueCount } = useMemo(() => ({
    outstandingTotal: invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    overdueCount: invoices.filter(isOverdue).length,
  }), [invoices]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>My Invoices</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        What you owe Engel Fine Design for facilitated work — casting, and work orders where EFD paid
        someone else to work on your piece. Your own labour on your own pieces is never billed here.
      </Typography>

      {/* The freeze is the reason this page matters — say plainly what it is and how to clear it. */}
      {overdueCount > 0 && status === 'pending_payment' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>New work is paused</AlertTitle>
          {overdueCount === 1 ? 'An invoice is' : `${overdueCount} invoices are`} past due. Until
          {overdueCount === 1 ? ' it is' : ' they are'} paid you can&apos;t start new production runs,
          request CAD, or order casting. Pay below and it lifts straight away.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
      ) : invoices.length === 0 ? (
        <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">
            {status === 'pending_payment' ? 'Nothing outstanding — you’re all clear.' : 'No paid invoices yet.'}
          </Typography>
        </CardContent></Card>
      ) : (
        <>
          {status === 'pending_payment' && (
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {invoices.length} outstanding · {money(outstandingTotal)}
            </Typography>
          )}
          <Stack spacing={1.5}>
            {invoices.map((inv) => (
              <Card key={inv.invoiceID} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography fontWeight={600}>{money(inv.amount)}</Typography>
                        <Chip size="small" label={inv.kind === 'casting_charge' ? 'Casting' : 'Work order'} />
                        {isOverdue(inv) && <Chip size="small" color="error" label="Past due" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {inv.description || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inv.status === 'paid' ? `Paid ${when(inv.paidAt)}` : `Due ${when(inv.dueAt)}`}
                        {' · '}{inv.invoiceID}
                      </Typography>
                    </Box>

                    {inv.status === 'pending_payment' && (
                      inv.checkoutUrl ? (
                        <Button
                          variant="contained"
                          endIcon={<OpenInNewIcon />}
                          href={inv.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ flexShrink: 0 }}
                        >
                          Pay {money(inv.amount)}
                        </Button>
                      ) : (
                        // No hosted invoice yet — usually no billing email on file. Say what to do
                        // rather than showing a dead button.
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, maxWidth: 220 }}>
                          No payment link yet — contact EFD to settle this one.
                        </Typography>
                      )
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
