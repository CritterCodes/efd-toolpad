'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Box, Typography, Button, CircularProgress, Alert, GlobalStyles } from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';

const money = (v) => `$${(Number(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');

/**
 * The TRANSFER LIST that rides in a return-shipping box (owner: "we reserve the
 * right to ship back multiple invoices in one package — that gives us the
 * transfer list"). One page per shipment: the invoices in the box, each with
 * its repairs, plus carrier and tracking. Printed at ship time from the
 * wholesaler profile; re-printable any time from the same URL.
 */
const printStyles = (
    <GlobalStyles styles={`
        @media print {
            body * { visibility: hidden; }
            .transfer-root, .transfer-root * { visibility: visible; }
            .transfer-root { position: absolute; left: 0; top: 0; width: 100%; color: #000; }
            .transfer-root .no-print { display: none !important; }
        }
    `} />
);

function TransferListInner() {
    const params = useParams();
    const search = useSearchParams();
    const wholesalerId = Array.isArray(params?.wholesalerId) ? params.wholesalerId[0] : params?.wholesalerId;
    const invoiceIds = String(search.get('invoices') || '');

    const [invoices, setInvoices] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!wholesalerId || !invoiceIds) return;
        fetch(`/api/wholesale/repairs/ship-back?wholesalerId=${encodeURIComponent(wholesalerId)}&invoices=${encodeURIComponent(invoiceIds)}`)
            .then((r) => r.json())
            .then((d) => { if (d.success) setInvoices(d.invoices || []); else setError(d.error || 'Could not load the shipment.'); })
            .catch((e) => setError(e.message));
    }, [wholesalerId, invoiceIds]);

    const shipment = invoices?.find((i) => i.outboundShipment)?.outboundShipment || null;
    const grandTotal = (invoices || []).reduce((s, i) => s + (Number(i.total) || 0), 0);
    const repairCount = (invoices || []).reduce((s, i) => s + i.repairs.length, 0);

    return (
        <Box className="transfer-root" sx={{ p: 3, maxWidth: 800, mx: 'auto', backgroundColor: '#fff', color: '#000', minHeight: '100vh' }}>
            {printStyles}
            <Box className="no-print" sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={!invoices?.length}>
                    Print
                </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {!invoices && !error && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

            {invoices?.length > 0 && (
                <>
                    <Typography sx={{ fontWeight: 700, fontSize: 20 }}>Engel Fine Design — Transfer List</Typography>
                    <Typography sx={{ fontSize: 13, mb: 2 }}>
                        {shipment ? (
                            <>Shipped {fmtDate(shipment.shippedAt)}{shipment.carrier ? ` via ${shipment.carrier}` : ''} — tracking <strong>{shipment.trackingNumber}</strong></>
                        ) : 'Shipment pending'}
                        {' · '}{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · {repairCount} repair{repairCount !== 1 ? 's' : ''} · {money(grandTotal)}
                    </Typography>

                    {invoices.map((inv) => (
                        <Box key={inv.invoiceID} sx={{ mb: 2, border: '1px solid #999', borderRadius: 1, breakInside: 'avoid' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.75, backgroundColor: '#eee', borderBottom: '1px solid #999' }}>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{inv.invoiceID}</Typography>
                                <Typography sx={{ fontSize: 13 }}>
                                    {money(inv.total)} · {inv.paymentStatus === 'paid' ? 'PAID' : `open — ${money(inv.remainingBalance)} due`}
                                </Typography>
                            </Box>
                            {inv.repairs.map((r) => (
                                <Box key={r.repairID} sx={{ display: 'flex', gap: 2, px: 1.5, py: 0.5, borderBottom: '1px solid #ddd', '&:last-child': { borderBottom: 'none' } }}>
                                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, minWidth: 130 }}>{r.repairID}</Typography>
                                    <Typography sx={{ fontSize: 12 }}>{r.description || '—'}</Typography>
                                </Box>
                            ))}
                        </Box>
                    ))}

                    <Typography sx={{ fontSize: 11, color: '#555', mt: 3 }}>
                        Please verify contents against this list on receipt and report any discrepancy within 2 business days.
                    </Typography>
                </>
            )}
        </Box>
    );
}

export default function TransferListPage() {
    return (
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}>
            <TransferListInner />
        </Suspense>
    );
}
