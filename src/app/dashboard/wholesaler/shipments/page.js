'use client';

import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, CircularProgress, Alert, Chip
} from '@mui/material';
import {
    LocalShipping as ShipIcon, Refresh as RefreshIcon,
    ArrowForward as OutIcon, ArrowBack as InIcon
} from '@mui/icons-material';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const STATE_CHIP = {
    in_transit: { label: 'In transit to EFD', color: 'info' },
    received: { label: 'Received by EFD', color: 'success' },
    shipped: { label: 'On its way to you', color: 'success' },
};

/**
 * Shipments — packages as packages. A box carrying three invoices is one card
 * here, matching the loading dock, where Billing and Completed show the same
 * tracking spread across rows.
 */
export default function WholesalerShipmentsPage() {
    const [shipments, setShipments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = () => {
        setLoading(true);
        setError('');
        fetch('/api/wholesale/shipments')
            .then((r) => r.json())
            .then((d) => { if (d.success) setShipments(d.shipments || []); else setError(d.error || 'Could not load shipments.'); })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };
    useEffect(load, []);

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
                            <ShipIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Shipments
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Every package between your shop and ours — boxes you shipped in, and boxes on their way back.
                        </Typography>
                    </Box>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading} sx={{ color: UI.textPrimary, borderColor: UI.border }}>
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: UI.accent }} /></Box>}

            {!loading && !error && shipments?.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary }}>
                        No shipments yet. Boxes appear here when you mark repairs shipped, and when we ship invoices back to you.
                    </Typography>
                </Box>
            )}

            {!loading && shipments?.map((pkg) => {
                const chip = STATE_CHIP[pkg.state] || { label: pkg.state, color: 'default' };
                const outboundTotal = pkg.invoices.reduce((s, i) => s + (Number(i.total) || 0), 0);
                return (
                    <Box key={`${pkg.direction}-${pkg.trackingNumber}`} sx={{ mb: 2, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', px: 2, py: 1.25, borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgPanel }}>
                            {pkg.direction === 'inbound'
                                ? <InIcon sx={{ fontSize: 18, color: UI.accent }} />
                                : <OutIcon sx={{ fontSize: 18, color: UI.accent }} />}
                            <Typography sx={{ fontWeight: 700, color: UI.textHeader }}>
                                {pkg.direction === 'inbound' ? 'To EFD' : 'To you'}
                            </Typography>
                            <Typography sx={{ fontFamily: 'monospace', color: UI.textPrimary }}>
                                {pkg.carrier ? `${pkg.carrier} · ` : ''}{pkg.trackingNumber}
                            </Typography>
                            <Chip size="small" label={chip.label} color={chip.color} />
                            <Typography variant="caption" sx={{ color: UI.textMuted, ml: 'auto' }}>
                                shipped {fmtDate(pkg.shippedAt)}
                            </Typography>
                        </Box>
                        <Box sx={{ px: 2, py: 1.25 }}>
                            {pkg.direction === 'inbound' ? (
                                pkg.repairs.map((r) => (
                                    <Box key={r.repairID} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: UI.accent }}>{r.repairID}</Typography>
                                        <Typography variant="body2" sx={{ color: UI.textSecondary, flex: 1, minWidth: 120 }}>{r.description || '—'}</Typography>
                                        <Typography variant="caption" sx={{ color: UI.textMuted }}>
                                            {r.receivedAt ? `received ${fmtDate(r.receivedAt)}` : r.status}
                                        </Typography>
                                    </Box>
                                ))
                            ) : (
                                <>
                                    {pkg.invoices.map((inv) => (
                                        <Box key={inv.invoiceID} sx={{ mb: 1 }}>
                                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: UI.accent }}>{inv.invoiceID}</Typography>
                                                <Typography variant="body2" sx={{ color: UI.textSecondary }}>
                                                    {inv.repairCount} repair{inv.repairCount !== 1 ? 's' : ''} · {money(inv.total)}
                                                </Typography>
                                                <Chip size="small" label={inv.paymentStatus === 'paid' ? 'Paid' : 'Open'} color={inv.paymentStatus === 'paid' ? 'success' : 'warning'} />
                                            </Box>
                                            {inv.repairs.map((r) => (
                                                <Typography key={r.repairID} variant="caption" sx={{ display: 'block', color: UI.textMuted, pl: 2 }}>
                                                    {r.repairID} — {r.description || '—'}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ))}
                                    {pkg.invoices.length > 1 && (
                                        <Typography variant="body2" sx={{ color: UI.textPrimary, fontWeight: 600, mt: 0.5 }}>
                                            Package total: {money(outboundTotal)}
                                        </Typography>
                                    )}
                                </>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}
