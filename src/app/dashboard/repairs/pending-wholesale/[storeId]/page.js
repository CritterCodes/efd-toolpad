'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, TextField, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Snackbar, InputAdornment, useMediaQuery
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    QrCodeScanner as ScannerIcon,
    CheckCircle as ReceivedIcon,
    LocalShipping as ShippingIcon,
    DoneAll as ReceiveAllIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';
import { normalizeRepairWorkflow, REPAIR_STATUS } from '@/services/repairWorkflow';
import { isAdminRole, canReceiveWholesale } from '@/lib/repairAccess';
import StoreFulfillmentSelect from '@/components/admin/StoreFulfillmentSelect';

export default function StorePickupDetailPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { storeId } = useParams();
    const decodedStoreId = decodeURIComponent(storeId);
    const scanInputRef = useRef(null);

    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [storeName, setStoreName] = useState('');
    const [scanValue, setScanValue] = useState('');
    const [receivedIds, setReceivedIds] = useState(new Set());
    const [receiving, setReceiving] = useState(false);
    const [receivingAll, setReceivingAll] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [scanError, setScanError] = useState('');

    const loadRepairs = useCallback(async () => {
        try {
            setLoading(true);
            const [pendingData, pickupData, shippedData] = await Promise.all([
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PENDING_PICKUP }),
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PICKUP_REQUESTED }),
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.SHIPPED_TO_SHOP }),
            ]);
            const allRepairs = [...(shippedData.repairs || []), ...(pickupData.repairs || []), ...(pendingData.repairs || [])].map(normalizeRepairWorkflow);
            const storeRepairs = allRepairs.filter(
                r => (r.createdBy || r.userID) === decodedStoreId
            );
            setRepairs(storeRepairs);
            if (storeRepairs.length > 0) {
                setStoreName(storeRepairs[0].wholesalerName || storeRepairs[0].businessName || 'Unknown Store');
            }
        } catch {
            setSnackbar({ open: true, message: 'Failed to load repairs', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [decodedStoreId]);

    useEffect(() => { loadRepairs(); }, [loadRepairs]);

    useEffect(() => {
        const canView = isAdminRole(session) || canReceiveWholesale(session);

        if (session && !canView) router.replace('/dashboard');
    }, [session, router]);

    /**
     * Auto-focus the scanner, but only where a scanner is plausible.
     *
     * A barcode gun types into whatever has focus, so grabbing it on load is right at the bench. On a
     * phone the same line throws the on-screen keyboard up over the list the moment the page opens,
     * which is half the reason this screen felt unusable there. `pointer: coarse` is the honest test:
     * it asks whether this is a touch device rather than guessing from width.
     */
    const hasHardwarePointer = useMediaQuery('(pointer: fine)', { noSsr: false, defaultMatches: true });

    useEffect(() => {
        if (!loading && hasHardwarePointer && scanInputRef.current) scanInputRef.current.focus();
    }, [loading, hasHardwarePointer]);

    /**
     * Move ONE repair to ready for work.
     *
     * Lifted out of the scan handler so a tap can do what a barcode gun does. On a phone there is no
     * scanner and, until this, no per-row control either — the only other way through was "Move All",
     * which sat in a header that ran off the side of the screen. The owner could open the store, see
     * the three jobs, and have no way to receive one of them (2026-10-12).
     */
    const receiveOne = useCallback(async (repairID, { refocus = true } = {}) => {
        if (!repairID || receivedIds.has(repairID)) return;
        setReceiving(true);
        setScanError('');
        try {
            await wholesaleRepairsClient.receiveSingle(repairID);
            setReceivedIds(prev => new Set([...prev, repairID]));
            setSnackbar({ open: true, message: `Ready for work: ${repairID}`, severity: 'success' });
        } catch {
            setScanError(`Failed to move "${repairID}" to ready for work`);
            setSnackbar({ open: true, message: `Could not move ${repairID}`, severity: 'error' });
        } finally {
            setReceiving(false);
            if (refocus) scanInputRef.current?.focus();
        }
    }, [receivedIds]);

    const handleScan = async (e) => {
        if (e.key !== 'Enter' || !scanValue.trim()) return;
        e.preventDefault();
        const scannedId = scanValue.trim();
        setScanValue('');
        setScanError('');

        // Find the repair in our list
        const repair = repairs.find(r => r.repairID === scannedId);
        if (!repair) {
            setScanError(`"${scannedId}" not found in this pickup`);
            return;
        }
        if (receivedIds.has(scannedId)) {
            setScanError(`"${scannedId}" already scanned`);
            return;
        }

        await receiveOne(scannedId);
    };

    const handleReceiveAll = async () => {
        const unreceived = repairs.filter(r => !receivedIds.has(r.repairID));
        if (unreceived.length === 0) return;

        setReceivingAll(true);
        try {
            const ids = unreceived.map(r => r.repairID);
            await wholesaleRepairsClient.receiveRepairs(ids);
            setReceivedIds(prev => new Set([...prev, ...ids]));
            setSnackbar({
                open: true,
                message: `Moved all ${ids.length} repair(s) to ready for work`,
                severity: 'success'
            });
        } catch {
            setSnackbar({ open: true, message: 'Failed to move all repairs to ready for work', severity: 'error' });
        } finally {
            setReceivingAll(false);
            scanInputRef.current?.focus();
        }
    };

    const canView = isAdminRole(session) || canReceiveWholesale(session);

    if (!session || !canView) return null;

    const unreceivedCount = repairs.filter(r => !receivedIds.has(r.repairID)).length;
    const allReceived = repairs.length > 0 && unreceivedCount === 0;

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/*
              Header. This was ONE flex row — Back, title, Refresh, Move All — so on a phone the two
              buttons that do the work were pushed off the right-hand edge and the page became
              read-only. Stacked below `sm`, with the actions full width and 44px tall.
            */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Button
                        startIcon={<BackIcon />}
                        onClick={() => router.push('/dashboard/repairs/pending-wholesale')}
                        sx={{ minHeight: 44, flexShrink: 0 }}
                    >
                        Back
                    </Button>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h5" sx={{ overflowWrap: 'anywhere' }}>{storeName || 'Store Pickup'}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {receivedIds.size} of {repairs.length} ready for work
                        </Typography>
                    </Box>
                </Box>

                {/* How this store gets finished work back — drives the automatic Finalize at QC pass. */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <StoreFulfillmentSelect storeUserID={decodedStoreId} />
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button
                        startIcon={<RefreshIcon />}
                        onClick={loadRepairs}
                        disabled={loading}
                        sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={receivingAll ? <CircularProgress size={18} color="inherit" /> : <ReceiveAllIcon />}
                        onClick={handleReceiveAll}
                        disabled={allReceived || receivingAll || loading}
                        sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
                    >
                        Move All ({unreceivedCount})
                    </Button>
                </Box>
            </Box>

            {/* Scanner input */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: allReceived ? 'success.50' : 'background.paper' }}>
                {allReceived ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', py: 2 }}>
                        <ReceivedIcon color="success" sx={{ fontSize: 40 }} />
                        <Typography variant="h5" color="success.main">All repairs ready for work!</Typography>
                    </Box>
                ) : (
                    <>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Scan barcode or type repair ID and press Enter
                        </Typography>
                        <TextField
                            inputRef={scanInputRef}
                            fullWidth
                            variant="outlined"
                            placeholder="Scan barcode..."
                            value={scanValue}
                            onChange={(e) => { setScanValue(e.target.value); setScanError(''); }}
                            onKeyDown={handleScan}
                            disabled={receiving}
                            autoFocus={hasHardwarePointer}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {receiving ? <CircularProgress size={20} /> : <ScannerIcon />}
                                    </InputAdornment>
                                ),
                                sx: { fontSize: '1.2rem', fontFamily: 'monospace' }
                            }}
                        />
                        {scanError && <Alert severity="warning" sx={{ mt: 1 }}>{scanError}</Alert>}
                    </>
                )}
            </Paper>

            {/* Repairs table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : repairs.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <ShippingIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No repairs found for this store</Typography>
                </Paper>
            ) : (
              <>
                {/*
                  PHONE: one card per job, each with its own Receive button.
                  A six-column table on a 390px screen shows Status and half of Repair ID, and the
                  columns that matter scroll away sideways. More to the point, the table never had a
                  per-row control at all — receiving meant a barcode gun or Move All, and neither is
                  available to someone standing in the shop with a phone.
                */}
                <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.5 }}>
                    {repairs.map(repair => {
                        const isReceived = receivedIds.has(repair.repairID);
                        const status = repair.normalizedStatus || repair.status;
                        return (
                            <Paper key={repair.repairID} sx={{ p: 2, opacity: isReceived ? 0.6 : 1 }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                                    {isReceived ? (
                                        <Chip icon={<ReceivedIcon />} label="Ready for Work" color="success" size="small" />
                                    ) : (
                                        <Chip
                                            label={status}
                                            color={status === REPAIR_STATUS.PICKUP_REQUESTED ? 'error' : 'warning'}
                                            size="small"
                                        />
                                    )}
                                    {repair.quoteRequest?.status === 'requested' && (
                                        <Chip label="Needs quote" size="small" sx={{ color: '#A855F7', border: '1px solid #A855F7', backgroundColor: 'transparent' }} />
                                    )}
                                </Box>
                                <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                                    {repair.clientName || repair.customerName || '—'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                                    {repair.itemType}{repair.description ? ` — ${repair.description}` : ''}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace', color: 'text.secondary', overflowWrap: 'anywhere' }}>
                                    {repair.repairID} · {formatDate(repair.createdAt)}
                                </Typography>
                                {!isReceived && (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => receiveOne(repair.repairID, { refocus: false })}
                                        disabled={receiving || receivingAll}
                                        sx={{ mt: 1.5, minHeight: 44 }}
                                    >
                                        Move to ready for work
                                    </Button>
                                )}
                            </Paper>
                        );
                    })}
                </Box>

                <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Status</TableCell>
                                <TableCell>Repair ID</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Item</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Submitted</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {repairs.map(repair => {
                                const isReceived = receivedIds.has(repair.repairID);
                                return (
                                    <TableRow
                                        key={repair.repairID}
                                        sx={{
                                            bgcolor: isReceived ? 'success.50' : 'inherit',
                                            opacity: isReceived ? 0.7 : 1,
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <TableCell>
                                            {isReceived ? (
                                                <Chip icon={<ReceivedIcon />} label="Ready for Work" color="success" size="small" />
                                            ) : (
                                                <Chip
                                                    label={repair.normalizedStatus || repair.status}
                                                    color={(repair.normalizedStatus || repair.status) === REPAIR_STATUS.PICKUP_REQUESTED ? 'error' : 'warning'}
                                                    size="small"
                                                />
                                            )}
                                            {repair.quoteRequest?.status === 'requested' && (
                                                <Chip label="Needs quote" size="small" sx={{ ml: 0.5, color: '#A855F7', border: '1px solid #A855F7', backgroundColor: 'transparent' }} />
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                            {repair.repairID}
                                        </TableCell>
                                        <TableCell>{repair.clientName || repair.customerName}</TableCell>
                                        <TableCell>{repair.itemType}</TableCell>
                                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {repair.description}
                                        </TableCell>
                                        <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                        <TableCell align="right">
                                            {!isReceived && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => receiveOne(repair.repairID)}
                                                    disabled={receiving || receivingAll}
                                                    sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
                                                >
                                                    Receive
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
              </>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
