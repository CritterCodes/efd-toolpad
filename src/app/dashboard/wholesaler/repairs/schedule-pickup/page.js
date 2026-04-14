'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, Checkbox,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Snackbar, Card, CardContent, Grid
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    LocalShipping as PickupIcon,
    DirectionsCar as DeliveryIcon
} from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';

export default function SchedulePickupPage() {
    const router = useRouter();
    const {
        repairs, pendingRepairs, loading, error, stats,
        selected, toggleSelect, selectAllPending,
        requestPickup, scheduleDelivery, refresh
    } = useWholesaleRepairs();
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const handleAction = async (actionFn) => {
        setActionLoading(true);
        try {
            const result = await actionFn();
            setSnackbar({ open: true, message: result.message, severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const pickupRequested = repairs.filter(r => r.status === 'PICKUP REQUESTED');
    const schedulableRepairs = [...pendingRepairs, ...pickupRequested];

    const selectedPendingCount = selected.filter(id =>
        pendingRepairs.some(r => r.repairID === id)
    ).length;

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Schedule Pickup</Typography>
                <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Pending', value: stats.pending, color: '#ed6c02' },
                    { label: 'Pickup Requested', value: stats.pickupRequested, color: '#d32f2f' },
                ].map(({ label, value, color }) => (
                    <Grid item xs={6} sm={4} key={label}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h4" sx={{ color, fontWeight: 700 }}>{value}</Typography>
                                <Typography variant="body2" color="text.secondary">{label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Batch Actions */}
            {pendingRepairs.length > 0 && (
                <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Checkbox
                        checked={pendingRepairs.length > 0 && pendingRepairs.every(r => selected.includes(r.repairID))}
                        indeterminate={selectedPendingCount > 0 && selectedPendingCount < pendingRepairs.length}
                        onChange={selectAllPending}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        {selectedPendingCount === 0
                            ? `${pendingRepairs.length} pending repair(s) — select to request pickup or schedule delivery`
                            : `${selectedPendingCount} selected`}
                    </Typography>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={actionLoading ? <CircularProgress size={18} color="inherit" /> : <PickupIcon />}
                        disabled={selectedPendingCount === 0 || actionLoading}
                        onClick={() => handleAction(requestPickup)}
                    >
                        Request Pickup
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={actionLoading ? <CircularProgress size={18} /> : <DeliveryIcon />}
                        disabled={selectedPendingCount === 0 || actionLoading}
                        onClick={() => handleAction(scheduleDelivery)}
                    >
                        I&apos;ll Deliver
                    </Button>
                </Paper>
            )}

            {pendingRepairs.length === 0 && pickupRequested.length === 0 && !loading && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        No pending repairs to schedule. All repairs have been picked up or delivered.
                    </Typography>
                </Paper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : schedulableRepairs.length > 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox" />
                                <TableCell>Repair ID</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Item</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Submitted</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedulableRepairs.map(repair => (
                                <TableRow key={repair.repairID} hover>
                                    <TableCell padding="checkbox">
                                        {repair.status === 'PENDING PICKUP' && (
                                            <Checkbox
                                                checked={selected.includes(repair.repairID)}
                                                onChange={() => toggleSelect(repair.repairID)}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        sx={{ fontFamily: 'monospace', fontSize: '0.85rem', cursor: 'pointer' }}
                                        onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
                                    >
                                        {repair.repairID}
                                    </TableCell>
                                    <TableCell>{repair.clientName || repair.customerName}</TableCell>
                                    <TableCell>{repair.itemType}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {repair.description}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={repair.status}
                                            color={repair.status === 'PICKUP REQUESTED' ? 'error' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
