"use client";
import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, TextField, MenuItem, Select, InputLabel, FormControl, Typography, Chip, Stack,
    Button, Alert, CircularProgress, Checkbox
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PrintIcon from '@mui/icons-material/Print';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import { useRepairs } from '@/app/context/repairs.context';


const statusOptions = [
    "RECEIVING",
    "NEEDS QUOTE",
    "COMMUNICATION REQUIRED",
    "NEEDS PARTS",
    "PARTS ORDERED",
    "READY FOR WORK",
    "IN PROGRESS",
    "QC",
    "READY FOR PICKUP",
    "DELIVERY BATCHED",
    "PAID_CLOSED",
    "COMPLETED"
];

const COMPLETED_STATUSES = new Set([
    'COMPLETED',
    'READY FOR PICKUP',
    'READY FOR PICK-UP',
    'DELIVERY BATCHED',
    'PAID_CLOSED',
]);

const normalizeIdentifier = (value) => {
    if (!value) return '';
    if (typeof value === 'object') {
        if (value.$oid) return String(value.$oid);
        if (value._id) return normalizeIdentifier(value._id);
    }
    return String(value).trim().toLowerCase();
};

const uniqueIdentifiers = (values) => [...new Set(values.map(normalizeIdentifier).filter(Boolean))];

const getWholesalerIdentifiers = (wholesaler) => uniqueIdentifiers([
    wholesaler?.userID,
    wholesaler?.id,
    wholesaler?._id,
    wholesaler?.email,
    wholesaler?.wholesaleApplication?.contactEmail,
]);

const repairBelongsToWholesaler = (repair, identifiers, businessNames) => {
    if (!repair || identifiers.length === 0) return false;

    const repairIdentifiers = uniqueIdentifiers([
        repair.userID,
        repair.createdBy,
        repair.clientID,
        repair.customerID,
        repair.clientEmail,
        repair.email,
    ]);
    if (repairIdentifiers.some((id) => identifiers.includes(id))) return true;

    // Fallback: match on business name for legacy wholesale repairs
    const repairBusiness = normalizeIdentifier(repair.businessName || repair.wholesalerName);
    return Boolean(repairBusiness) && businessNames.includes(repairBusiness);
};

const WholesalerRepairsTab = ({ wholesaler }) => {
    const { repairs, fetchRepairs } = useRepairs();
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    // Return-shipment panel (remote partners: box goes back via carrier w/ tracking).
    const [shipCarrier, setShipCarrier] = useState('');
    const [shipTracking, setShipTracking] = useState('');
    const [shipBusy, setShipBusy] = useState(false);
    const [shipResult, setShipResult] = useState(null);

    const filteredRepairs = useMemo(() => {
        const identifiers = getWholesalerIdentifiers(wholesaler);
        const businessNames = uniqueIdentifiers([
            wholesaler?.businessName,
            wholesaler?.business,
            wholesaler?.wholesaleApplication?.businessName,
        ]);

        let updated = repairs.filter((repair) => repairBelongsToWholesaler(repair, identifiers, businessNames));

        if (statusFilter === '__completed__') {
            updated = updated.filter((repair) => COMPLETED_STATUSES.has(repair.status));
        } else if (statusFilter) {
            updated = updated.filter((repair) => repair.status === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            updated = updated.filter((repair) =>
                (repair.clientName || '').toLowerCase().includes(q) ||
                (repair.description || '').toLowerCase().includes(q) ||
                (repair.repairID || '').toLowerCase().includes(q)
            );
        }

        updated = [...updated].sort((a, b) => {
            const dateA = new Date(a.promiseDate || a.createdAt);
            const dateB = new Date(b.promiseDate || b.createdAt);
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return updated;
    }, [repairs, wholesaler, statusFilter, searchQuery, sortOrder]);

    // SHIP-BACK IS INVOICE-BASED (owner): only invoiced work is done work, and
    // one package may carry several invoices — the manifest is the transfer list.
    const [shippableInvoices, setShippableInvoices] = useState([]);
    const [selectedInvoices, setSelectedInvoices] = useState([]);
    const wholesalerId = wholesaler?.userID || wholesaler?.id || '';

    const loadShippable = async () => {
        if (!wholesalerId) return;
        try {
            const r = await fetch(`/api/wholesale/repairs/ship-back?wholesalerId=${encodeURIComponent(wholesalerId)}`);
            const d = await r.json();
            if (d.success) { setShippableInvoices(d.invoices || []); setSelectedInvoices([]); }
        } catch { /* panel simply stays empty */ }
    };
    useEffect(() => { loadShippable(); }, [wholesalerId]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleInvoice = (id) => setSelectedInvoices((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const handleShipBack = async () => {
        setShipBusy(true);
        setShipResult(null);
        try {
            const r = await fetch('/api/wholesale/repairs/ship-back', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceIDs: selectedInvoices, carrier: shipCarrier.trim(), trackingNumber: shipTracking.trim() }),
            });
            const result = await r.json();
            if (!r.ok || !result.success) throw new Error(result.error || 'Ship-back failed.');
            setShipResult({ severity: 'success', message: result.message });
            // The transfer list rides in the box — open it for printing now.
            const ids = (result.manifest?.invoices || []).map((i) => i.invoiceID).join(',');
            if (ids) {
                window.open(`/dashboard/users/wholesalers/${encodeURIComponent(wholesalerId)}/transfer-list?invoices=${encodeURIComponent(ids)}`, '_blank');
            }
            setShipCarrier('');
            setShipTracking('');
            loadShippable();
            fetchRepairs?.();
        } catch (err) {
            setShipResult({ severity: 'error', message: err.message });
        } finally {
            setShipBusy(false);
        }
    };

    return (
        <Box>
            {/* Return shipping, by INVOICE: pick the invoices going in this box —
                the shipment manifest doubles as the printable transfer list. */}
            {shippableInvoices.length > 0 && (
                <Box sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                        Ship invoices back ({shippableInvoices.length} ready)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Only invoiced work ships — invoicing at closeout is the done-gate. One tracking number covers every invoice in the box.
                    </Typography>
                    {shippableInvoices.map((inv) => (
                        <Box key={inv.invoiceID} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                            <Checkbox size="small" checked={selectedInvoices.includes(inv.invoiceID)} onChange={() => toggleInvoice(inv.invoiceID)} />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{inv.invoiceID}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {inv.repairs.length} repair{inv.repairs.length !== 1 ? 's' : ''} · ${Number(inv.total || 0).toFixed(2)}
                            </Typography>
                            <Chip size="small" label={inv.paymentStatus === 'paid' ? 'Paid' : 'Open'} color={inv.paymentStatus === 'paid' ? 'success' : 'warning'} />
                        </Box>
                    ))}
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
                        {/* The real-world order is: print the list, drive the box to the carrier,
                            come back with a tracking number, THEN record the shipment. So the
                            transfer list must print BEFORE shipping — it shows "Shipment pending"
                            until tracking is recorded, and reprints with tracking afterwards. */}
                        <Button
                            variant="outlined"
                            startIcon={<PrintIcon />}
                            disabled={selectedInvoices.length === 0}
                            onClick={() => window.open(`/dashboard/users/wholesalers/${encodeURIComponent(wholesalerId)}/transfer-list?invoices=${encodeURIComponent(selectedInvoices.join(','))}`, '_blank')}
                        >
                            Print transfer list
                        </Button>
                        <TextField size="small" label="Carrier (optional)" placeholder="UPS, FedEx, USPS..."
                            value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} sx={{ minWidth: 170 }} />
                        <TextField size="small" label="Tracking number" required
                            value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} sx={{ minWidth: 220 }} />
                        <Button
                            variant="contained"
                            startIcon={shipBusy ? <CircularProgress size={16} /> : <LocalShippingIcon />}
                            disabled={selectedInvoices.length === 0 || !shipTracking.trim() || shipBusy}
                            onClick={handleShipBack}
                        >
                            Ship {selectedInvoices.length || ''} invoice{selectedInvoices.length === 1 ? '' : 's'}
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Print the transfer list first and put it in the box. When you have the carrier&apos;s tracking number, enter it and press Ship — that records the shipment and notifies the partner with the tracking.
                    </Typography>
                    {shipResult && <Alert severity={shipResult.severity} sx={{ mt: 1.5 }}>{shipResult.message}</Alert>}
                </Box>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 2,
                    mb: 4,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between'
                }}
            >
                <TextField
                    label="Search"
                    variant="outlined"
                    size="small"
                    sx={{ flex: '1 1 auto', minWidth: 200 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <FormControl variant="outlined" size="small" sx={{ minWidth: 170 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="__completed__">Completed (all closed)</MenuItem>
                        {statusOptions.map((status) => (
                            <MenuItem key={status} value={status}>{status}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Sort by Date</InputLabel>
                    <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} label="Sort by Date">
                        <MenuItem value="newest">Newest First</MenuItem>
                        <MenuItem value="oldest">Oldest First</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip size="small" label={`${filteredRepairs.length} repair${filteredRepairs.length !== 1 ? 's' : ''}`} />
            </Stack>

            {filteredRepairs.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No repairs found for this wholesaler.
                </Typography>
            ) : (
                <RepairsGrid repairs={filteredRepairs} rowsPerPage={9} />
            )}
        </Box>
    );
};

export default WholesalerRepairsTab;
