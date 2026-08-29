"use client";
import React, { useState, useMemo } from 'react';
import {
    Box, TextField, MenuItem, Select, InputLabel, FormControl, Typography, Chip, Stack,
    Button, Alert, CircularProgress
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RepairsGrid from '@/app/components/repairs/repairGrid';
import { useRepairs } from '@/app/context/repairs.context';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';

// Statuses a finished repair can ship back FROM (matches the ship-back API guard).
const SHIPPABLE_STATUSES = new Set(['COMPLETED', 'READY FOR PICKUP', 'READY FOR PICK-UP']);

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

    // Everything of this wholesaler's that is finished and still in the shop —
    // physically, the contents of the return box.
    const shippableRepairs = useMemo(() => {
        const identifiers = getWholesalerIdentifiers(wholesaler);
        const businessNames = uniqueIdentifiers([
            wholesaler?.businessName,
            wholesaler?.business,
            wholesaler?.wholesaleApplication?.businessName,
        ]);
        return repairs.filter((repair) =>
            repairBelongsToWholesaler(repair, identifiers, businessNames)
            && SHIPPABLE_STATUSES.has(repair.status));
    }, [repairs, wholesaler]);

    const handleShipBack = async () => {
        setShipBusy(true);
        setShipResult(null);
        try {
            const result = await wholesaleRepairsClient.shipBack(
                shippableRepairs.map((r) => r.repairID),
                { carrier: shipCarrier.trim(), trackingNumber: shipTracking.trim() },
            );
            setShipResult({ severity: 'success', message: result.message });
            setShipCarrier('');
            setShipTracking('');
            fetchRepairs?.();
        } catch (err) {
            setShipResult({ severity: 'error', message: err.message });
        } finally {
            setShipBusy(false);
        }
    };

    return (
        <Box>
            {/* Return shipping: record the outbound box for a remote partner. The whole
                completed set ships as one box; the partner is notified with the tracking. */}
            {shippableRepairs.length > 0 && (
                <Box sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>
                        Ship completed repairs back ({shippableRepairs.length})
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                        {shippableRepairs.map((r) => (
                            <Chip key={r.repairID} size="small" label={r.repairID} sx={{ fontFamily: 'monospace' }} />
                        ))}
                    </Stack>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <TextField size="small" label="Carrier (optional)" placeholder="UPS, FedEx, USPS..."
                            value={shipCarrier} onChange={(e) => setShipCarrier(e.target.value)} sx={{ minWidth: 170 }} />
                        <TextField size="small" label="Tracking number" required
                            value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} sx={{ minWidth: 220 }} />
                        <Button
                            variant="contained"
                            startIcon={shipBusy ? <CircularProgress size={16} /> : <LocalShippingIcon />}
                            disabled={!shipTracking.trim() || shipBusy}
                            onClick={handleShipBack}
                        >
                            Mark Shipped
                        </Button>
                    </Box>
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
