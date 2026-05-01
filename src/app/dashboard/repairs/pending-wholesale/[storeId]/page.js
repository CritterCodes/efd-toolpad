'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, TextField, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Snackbar, InputAdornment
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
            const [pendingData, pickupData] = await Promise.all([
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PENDING_PICKUP }),
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PICKUP_REQUESTED }),
            ]);
            const allRepairs = [...(pickupData.repairs || []), ...(pendingData.repairs || [])].map(normalizeRepairWorkflow);
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
        const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
        const canReceiveWholesale = session?.user?.role === 'artisan'
            && session?.user?.employment?.isOnsite === true
            && session?.user?.staffCapabilities?.repairOps === true
            && session?.user?.staffCapabilities?.receiving === true;

        if (session && !isAdmin && !canReceiveWholesale) router.replace('/dashboard');
    }, [session, router]);

    // Auto-focus scanner input when not loading
    useEffect(() => {
        if (!loading && scanInputRef.current) scanInputRef.current.focus();
    }, [loading]);

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

        setReceiving(true);
        try {
            await wholesaleRepairsClient.receiveSingle(scannedId);
            setReceivedIds(prev => new Set([...prev, scannedId]));
            setSnackbar({ open: true, message: `Received: ${scannedId}`, severity: 'success' });
        } catch {
            setScanError(`Failed to receive "${scannedId}"`);
        } finally {
            setReceiving(false);
            scanInputRef.current?.focus();
        }
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
                message: `Received all ${ids.length} repair(s)`,
                severity: 'success'
            });
        } catch {
            setSnackbar({ open: true, message: 'Failed to receive all', severity: 'error' });
        } finally {
            setReceivingAll(false);
            scanInputRef.current?.focus();
        }
    };

    const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
    const canReceiveWholesale = session?.user?.role === 'artisan'
        && session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true
        && session?.user?.staffCapabilities?.receiving === true;

    if (!session || (!isAdmin && !canReceiveWholesale)) return null;

    const unreceivedCount = repairs.filter(r => !receivedIds.has(r.repairID)).length;
    const allReceived = repairs.length > 0 && unreceivedCount === 0;

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/repairs/pending-wholesale')}>
                    Back
                </Button>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h4">{storeName || 'Store Pickup'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {receivedIds.size} of {repairs.length} received
                    </Typography>
                </Box>
                <Button startIcon={<RefreshIcon />} onClick={loadRepairs} disabled={loading}>Refresh</Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={receivingAll ? <CircularProgress size={18} color="inherit" /> : <ReceiveAllIcon />}
                    onClick={handleReceiveAll}
                    disabled={allReceived || receivingAll || loading}
                >
                    Receive All ({unreceivedCount})
                </Button>
            </Box>

            {/* Scanner input */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: allReceived ? 'success.50' : 'background.paper' }}>
                {allReceived ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', py: 2 }}>
                        <ReceivedIcon color="success" sx={{ fontSize: 40 }} />
                        <Typography variant="h5" color="success.main">All repairs received!</Typography>
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
                            autoFocus
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
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Status</TableCell>
                                <TableCell>Repair ID</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Item</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Submitted</TableCell>
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
                                                <Chip icon={<ReceivedIcon />} label="Received" color="success" size="small" />
                                            ) : (
                                                <Chip
                                                    label={repair.normalizedStatus || repair.status}
                                                    color={(repair.normalizedStatus || repair.status) === REPAIR_STATUS.PICKUP_REQUESTED ? 'error' : 'warning'}
                                                    size="small"
                                                />
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
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
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
