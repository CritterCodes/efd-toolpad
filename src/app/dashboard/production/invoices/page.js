"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Stack, Tabs, Tab,
  CircularProgress, Snackbar, Alert, Link as MuiLink,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Artisan invoices — the resolution surface for the artisan billing rail (U-BILL-2).
 *
 * This page is the reason work-order billing could be switched on. The rail could raise invoices and
 * Stripe could settle them, but nothing in-product could SEE one, let alone resolve it: an artisan
 * frozen by an overdue invoice had no way to find out why, and staff had no way to clear it. Per
 * castingSettlement's invariant — "every exit from an invoiced state must resolve the invoice" — the
 * three exits (send, mark paid, void) all live here.
 *
 * Staff see every invoice; the API scopes an artisan to their own, so this page is safe for both.
 */

const TABS = [
  { key: 'pending_payment', label: 'Outstanding' },
  { key: 'paid', label: 'Paid' },
  { key: 'void', label: 'Void' },
];

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const when = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const isOverdue = (inv) => inv.status === 'pending_payment' && new Date(inv.dueAt).getTime() < Date.now();

export default function ArtisanInvoicesPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState(0);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyID, setBusyID] = useState('');
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const status = TABS[tab].key;
  const say = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artisanInvoices?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load invoices.');
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (error) {
      say(error.message, 'error');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Staff only. Without this an artisan could open the staff page directly and find their own
  // (correctly scoped) ledger behind Send/Mark-paid/Void buttons that all 403 server-side. They have
  // their own read-and-pay view at /dashboard/artisan/invoices; send them there rather than to a wall
  // of dead buttons.
  const isStaff = STAFF_ROLES.includes(session?.user?.role);
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session?.user) { router.push('/dashboard'); return; }
    if (!isStaff) router.push('/dashboard/artisan/invoices');
  }, [authStatus, session, isStaff, router]);

  useEffect(() => { if (isStaff) load(); }, [load, isStaff]);

  const act = async (invoiceID, url, body, successMessage) => {
    setBusyID(invoiceID);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Action failed.');
      say(typeof successMessage === 'function' ? successMessage(data) : successMessage);
      await load();
    } catch (error) {
      say(error.message, 'error');
    } finally {
      setBusyID('');
    }
  };

  const outstandingTotal = useMemo(
    () => invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [invoices],
  );

  if (authStatus === 'loading' || !session?.user || !isStaff) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" fontWeight={600}>Artisan Invoices</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        What artisans owe EFD for facilitated work — casting and work orders. An overdue invoice freezes
        the artisan out of new runs and work orders until it is resolved.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => <Tab key={t.key} label={t.label} />)}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
      ) : invoices.length === 0 ? (
        <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary">Nothing here.</Typography>
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
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                        <Typography fontWeight={600}>{money(inv.amount)}</Typography>
                        <Chip size="small" label={inv.kind === 'casting_charge' ? 'Casting' : 'Work order'} />
                        {isOverdue(inv) && <Chip size="small" color="error" label="Overdue — artisan frozen" />}
                        {inv.checkoutUrl && inv.status === 'pending_payment' && (
                          <Chip size="small" color="info" variant="outlined" label="Sent" />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {inv.description || '—'} · {inv.invoiceID}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {inv.billedEmail || inv.billedUserID} · due {when(inv.dueAt)}
                        {inv.status === 'paid' && ` · paid ${when(inv.paidAt)}`}
                        {inv.status === 'void' && ` · void ${when(inv.voidedAt)}${inv.voidReason ? ` — ${inv.voidReason}` : ''}`}
                      </Typography>
                      {inv.checkoutUrl && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          <MuiLink href={inv.checkoutUrl} target="_blank" rel="noopener noreferrer">
                            Hosted invoice
                          </MuiLink>
                        </Typography>
                      )}
                    </Box>

                    {inv.status === 'pending_payment' && (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={busyID === inv.invoiceID}
                          onClick={() => act(
                            inv.invoiceID,
                            `/api/artisanInvoices/${inv.invoiceID}/push-to-stripe`,
                            {},
                            (d) => (d.alreadySent ? 'Already sent — link reused.' : 'Invoice sent to the artisan.'),
                          )}
                        >
                          {inv.checkoutUrl ? 'Resend' : 'Send invoice'}
                        </Button>
                        <Button
                          size="small"
                          disabled={busyID === inv.invoiceID}
                          onClick={() => {
                            if (!window.confirm(`Record ${money(inv.amount)} as paid for ${inv.invoiceID}?\n\nUse this only for payment taken outside Stripe — a Stripe payment marks itself paid.`)) return;
                            act(inv.invoiceID, `/api/artisanInvoices/${inv.invoiceID}/resolve`, { action: 'mark-paid' }, 'Recorded as paid.');
                          }}
                        >
                          Mark paid
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          disabled={busyID === inv.invoiceID}
                          onClick={() => {
                            const reason = window.prompt(`Void ${inv.invoiceID} (${money(inv.amount)})?\n\nThis cancels the debt and lifts any freeze it caused. Reason:`);
                            if (reason === null) return;
                            act(inv.invoiceID, `/api/artisanInvoices/${inv.invoiceID}/resolve`, { action: 'void', reason }, 'Invoice voided.');
                          }}
                        >
                          Void
                        </Button>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
