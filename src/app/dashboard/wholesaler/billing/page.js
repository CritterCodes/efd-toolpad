'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Chip,
    Table, TableBody, TableCell, TableHead, TableRow, Tooltip,
    Drawer, IconButton,
    RadioGroup, FormControlLabel, Radio
} from '@mui/material';
import { ReceiptLong as BillingIcon, Refresh as RefreshIcon, Payment as PayIcon, Close as CloseIcon } from '@mui/icons-material';

// Stripe's browser library from its own CDN (the only way Stripe permits serving
// it) — loaded once, on demand, so the page carries no npm Stripe dependency.
let stripeJsPromise = null;
const loadStripeJs = () => {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    if (!stripeJsPromise) {
        stripeJsPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3';
            script.onload = () => resolve(window.Stripe);
            script.onerror = () => { stripeJsPromise = null; reject(new Error('Could not load the payment library.')); };
            document.head.appendChild(script);
        });
    }
    return stripeJsPromise;
};
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const TH = ({ children, align }) => (
    <TableCell align={align} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

/**
 * Billing — what this account owes, what it has paid, and a way to pay online:
 * ACH by default (no fee — the shop eats it), card with the disclosed
 * convenience fee. All payment UI is Stripe Checkout's; the invoice is marked
 * paid by the webhook, never by anything this page does.
 */
export default function WholesalerBillingPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Pay dialog: quote fetched from the server so the fee shown is computed by
    // the same function that builds the charge.
    const [payInvoice, setPayInvoice] = useState(null);
    const [payQuote, setPayQuote] = useState(null);
    const [payMethod, setPayMethod] = useState('ach');
    const [payBusy, setPayBusy] = useState(false);
    const [payError, setPayError] = useState('');
    // The redirect back from Stripe carries ?paid= / ?cancelled= — informational
    // only; the invoice is marked paid by the webhook, never by this URL.
    const [returnBanner, setReturnBanner] = useState(null);
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('paid')) {
            setReturnBanner(params.get('method') === 'card'
                ? { severity: 'success', text: `Payment received for ${params.get('paid')}. It may take a moment to show below.` }
                : { severity: 'info', text: `Bank payment started for ${params.get('paid')}. ACH takes a few business days to settle — the invoice shows paid once the debit clears.` });
            window.history.replaceState(null, '', window.location.pathname);
        } else if (params.get('cancelled')) {
            setReturnBanner({ severity: 'warning', text: 'Payment cancelled — the invoice is unchanged.' });
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const openPayDialog = async (inv) => {
        setPayInvoice(inv);
        setPayQuote(null);
        setPayMethod('ach');
        setPayError('');
        try {
            const r = await fetch(`/api/wholesale/invoices/${encodeURIComponent(inv.invoiceID)}/pay`);
            const d = await r.json();
            if (d.success) setPayQuote(d);
            else setPayError(d.error || 'Could not load payment options.');
        } catch (e) {
            setPayError(e.message);
        }
    };

    // Embedded checkout mounts INSIDE the drawer — the wholesaler never leaves
    // the site (same pattern as the shop's checkout). The instance must be
    // destroyed on close or Stripe refuses to mount a second one.
    const checkoutRef = useRef(null);
    const [checkoutMounted, setCheckoutMounted] = useState(false);
    const destroyCheckout = () => {
        try { checkoutRef.current?.destroy(); } catch { /* already gone */ }
        checkoutRef.current = null;
        setCheckoutMounted(false);
    };
    const closePayDrawer = () => {
        if (payBusy) return;
        destroyCheckout();
        setPayInvoice(null);
    };

    const startPayment = async () => {
        setPayBusy(true);
        setPayError('');
        try {
            const r = await fetch(`/api/wholesale/invoices/${encodeURIComponent(payInvoice.invoiceID)}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: payMethod }),
            });
            const d = await r.json();
            if (!d.success || !d.clientSecret || !d.publishableKey) throw new Error(d.error || 'Could not start the payment.');
            const Stripe = await loadStripeJs();
            const stripe = Stripe(d.publishableKey);
            const checkout = await stripe.initEmbeddedCheckout({ clientSecret: d.clientSecret });
            checkoutRef.current = checkout;
            setCheckoutMounted(true);
            checkout.mount('#wholesale-embedded-checkout');
        } catch (e) {
            setPayError(e.message);
        } finally {
            setPayBusy(false);
        }
    };

    const load = () => {
        setLoading(true);
        setError('');
        fetch('/api/wholesale/invoices')
            .then((r) => r.json())
            .then((d) => { if (d.success) setData(d); else setError(d.error || 'Could not load your invoices.'); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

    const invoices = data?.invoices || [];
    const openBalance = data?.openBalance || 0;

    return (
        <Box sx={{ pb: 10 }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    p: { xs: 0.5, sm: 2.5, md: 3 }, mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.5, mb: 1.5, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', color: UI.textPrimary, backgroundColor: UI.bgCard, border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase' }}>
                            <BillingIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Billing
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Your invoices and account balance. Pay online by bank transfer (no fee) or card, or settle at pickup.
                        </Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading} sx={{ color: UI.textPrimary, borderColor: UI.border }}>
                        Refresh
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', gap: 4, mt: 2, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: openBalance > 0 ? '#F59E0B' : UI.textHeader }}>
                            {money(openBalance)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: UI.textMuted }}>Open balance</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight={700} sx={{ color: UI.textHeader }}>{invoices.length}</Typography>
                        <Typography variant="caption" sx={{ color: UI.textMuted }}>Invoices</Typography>
                    </Box>
                </Box>
            </Box>

            {returnBanner && <Alert severity={returnBanner.severity} sx={{ mb: 2 }} onClose={() => setReturnBanner(null)}>{returnBanner.text}</Alert>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: UI.accent }} /></Box>}

            {!loading && !error && invoices.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary }}>No invoices yet. Invoices appear here when completed repairs are billed.</Typography>
                </Box>
            )}

            {/* Pay drawer: full-width on phones, a right-side panel on desktop.
                Step 1 picks the rail; step 2 mounts Stripe's embedded checkout in
                place — no card or bank data ever touches this app, and the
                wholesaler never leaves the site. */}
            <Drawer
                anchor="right"
                open={Boolean(payInvoice)}
                onClose={closePayDrawer}
                PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, backgroundColor: '#fff' } }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontWeight: 700, color: '#111' }}>
                        Pay invoice <Box component="span" sx={{ fontFamily: 'monospace' }}>{payInvoice?.invoiceID}</Box>
                    </Typography>
                    <IconButton onClick={closePayDrawer} disabled={payBusy} size="small"><CloseIcon /></IconButton>
                </Box>

                <Box sx={{ p: 2, display: checkoutMounted ? 'none' : 'block' }}>
                    {!payQuote && !payError && <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>}
                    {payQuote && (
                        <RadioGroup value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                            <FormControlLabel
                                value="ach"
                                control={<Radio />}
                                sx={{ mb: 1, color: '#111' }}
                                label={`Bank transfer (ACH) — ${money(payQuote.ach.total)}, no fee. Settles in a few business days.`}
                            />
                            <FormControlLabel
                                value="card"
                                control={<Radio />}
                                sx={{ color: '#111' }}
                                label={`Card — ${money(payQuote.card.total)} (includes ${money(payQuote.card.fee)} convenience fee). Instant.`}
                            />
                        </RadioGroup>
                    )}
                    {payError && <Alert severity="error" sx={{ mt: 1 }}>{payError}</Alert>}
                    <Button
                        fullWidth variant="contained" sx={{ mt: 2 }}
                        onClick={startPayment} disabled={!payQuote || payBusy}
                    >
                        {payBusy ? 'Loading payment…' : 'Continue to payment'}
                    </Button>
                </Box>

                {/* Stripe owns everything inside this box. */}
                <Box id="wholesale-embedded-checkout" sx={{ flex: 1, overflowY: 'auto' }} />
                {checkoutMounted && (
                    <Box sx={{ p: 1.5, borderTop: '1px solid #e5e7eb' }}>
                        <Button size="small" onClick={() => { destroyCheckout(); }} sx={{ color: '#555' }}>
                            ← Change payment method
                        </Button>
                    </Box>
                )}
            </Drawer>

            {!loading && invoices.length > 0 && (
                <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TH>Invoice</TH>
                                <TH>Date</TH>
                                <TH>Repairs</TH>
                                <TH align="right">Total</TH>
                                <TH align="right">Paid</TH>
                                <TH align="right">Balance</TH>
                                <TH>Status</TH>
                                <TH>{''}</TH>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoices.map((inv) => {
                                const open = inv.status === 'open' && inv.paymentStatus !== 'paid';
                                const repairList = (inv.repairSnapshots || []).map((r) => r.repairID).join(', ');
                                return (
                                    <TableRow key={inv.invoiceID} sx={{ backgroundColor: UI.bgCard, '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` }, '&:last-child td': { borderBottom: 'none' } }}>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: UI.accent }}>{inv.invoiceID}</TableCell>
                                        <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(inv.createdAt)}</TableCell>
                                        <TableCell sx={{ color: UI.textSecondary }}>
                                            <Tooltip title={repairList || ''}>
                                                <span>{(inv.repairIDs || []).length}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: UI.textPrimary, fontWeight: 600, whiteSpace: 'nowrap' }}>{money(inv.total)}</TableCell>
                                        <TableCell align="right" sx={{ color: UI.textSecondary, whiteSpace: 'nowrap' }}>{money(inv.amountPaid)}</TableCell>
                                        <TableCell align="right" sx={{ color: open ? '#F59E0B' : UI.textSecondary, fontWeight: open ? 700 : 400, whiteSpace: 'nowrap' }}>
                                            {money(inv.remainingBalance)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={inv.paymentStatus === 'paid' ? `Paid ${inv.paidAt ? fmtDate(inv.paidAt) : ''}`.trim() : 'Open'}
                                                color={inv.paymentStatus === 'paid' ? 'success' : 'warning'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {open && inv.pendingCheckout?.sessionId ? (
                                                <Tooltip title={`${String(inv.pendingCheckout.method || '').toUpperCase()} payment started ${fmtDate(inv.pendingCheckout.startedAt)} — bank debits take a few business days to settle.`}>
                                                    <Chip size="small" label="Processing" color="info" />
                                                </Tooltip>
                                            ) : open ? (
                                                <Button size="small" variant="contained" startIcon={<PayIcon />} onClick={() => openPayDialog(inv)}>
                                                    Pay
                                                </Button>
                                            ) : null}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
}
