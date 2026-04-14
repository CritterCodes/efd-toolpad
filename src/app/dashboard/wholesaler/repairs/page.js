'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, Tab, Tabs, Checkbox,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent,
    CircularProgress, Alert, Snackbar, Card, CardContent, Grid
} from '@mui/material';
import {
    Add as AddIcon, Refresh as RefreshIcon,
    LocalShipping as PickupIcon, DirectionsCar as DeliveryIcon
} from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';
import WholesaleRepairForm from '@/app/components/wholesale/WholesaleRepairForm';

const STATUS_COLORS = {
    'PENDING PICKUP': 'warning',
    'PICKUP REQUESTED': 'error',
    'RECEIVING': 'info',
    'NEEDS PARTS': 'secondary',
    'PARTS ORDERED': 'secondary',
    'READY FOR WORK': 'default',
    'IN PROGRESS': 'primary',
    'QUALITY CONTROL': 'primary',
    'READY FOR PICK-UP': 'success',
    'COMPLETED': 'success',
};

export default function WholesalerRepairsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const {
        repairs, pendingRepairs, loading, error, filter, setFilter, stats,
        selected, toggleSelect, selectAllPending,
        createRepair, requestPickup, scheduleDelivery, refresh
    } = useWholesaleRepairs();
    const [showForm, setShowForm] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const handleCreateRepair = async (formData) => {
        try {
            setSubmitError(null);
            await createRepair(formData);
            setShowForm(false);
        } catch (err) {
            setSubmitError(err.message);
        }
    };

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

    const FILTERS = ['all', 'PENDING PICKUP', 'PICKUP REQUESTED', 'RECEIVING', 'active', 'done'];
    const handleTabChange = (_, newValue) => setFilter(FILTERS[newValue]);
    const tabIndex = FILTERS.indexOf(filter);

    const filteredRepairs = repairs.filter(r => {
        if (filter === 'all') return true;
        if (filter === 'active') return !['PENDING PICKUP', 'PICKUP REQUESTED', 'RECEIVING', 'COMPLETED', 'READY FOR PICK-UP'].includes(r.status);
        if (filter === 'done') return r.status === 'COMPLETED' || r.status === 'READY FOR PICK-UP';
        return r.status === filter;
    });

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const selectedPendingCount = selected.filter(id =>
        pendingRepairs.some(r => r.repairID === id)
    ).length;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">My Repairs</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(true)}>
                        Submit Repair
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Pending', value: stats.pending, color: '#ed6c02' },
                    { label: 'Pickup Requested', value: stats.pickupRequested, color: '#d32f2f' },
                    { label: 'Received', value: stats.receiving, color: '#0288d1' },
                    { label: 'In Progress', value: stats.inProgress, color: '#1976d2' },
                    { label: 'Completed', value: stats.completed, color: '#2e7d32' },
                ].map(({ label, value, color }) => (
                    <Grid item xs={6} sm={4} md key={label}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h4" sx={{ color, fontWeight: 700 }}>{value}</Typography>
                                <Typography variant="body2" color="text.secondary">{label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Batch Actions for Pending */}
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

            {/* Tabs */}
            <Tabs value={tabIndex >= 0 ? tabIndex : 0} onChange={handleTabChange} sx={{ mb: 2 }} variant="scrollable">
                <Tab label={`All (${stats.total})`} />
                <Tab label={`Pending (${stats.pending})`} />
                <Tab label={`Pickup Requested (${stats.pickupRequested})`} />
                <Tab label={`Received (${stats.receiving})`} />
                <Tab label={`In Progress (${stats.inProgress})`} />
                <Tab label={`Completed (${stats.completed})`} />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : filteredRepairs.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {filter === 'all' ? 'No repairs yet. Submit your first repair!' : 'No repairs in this category.'}
                    </Typography>
                </Paper>
            ) : (
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
                            {filteredRepairs.map(repair => (
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
                                        <Chip label={repair.status} color={STATUS_COLORS[repair.status] || 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth>
                <DialogTitle>Submit New Repair</DialogTitle>
                <DialogContent>
                    {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
                    <Box sx={{ pt: 1 }}>
                        <WholesaleRepairForm onSubmit={handleCreateRepair} onCancel={() => setShowForm(false)} />
                    </Box>
                </DialogContent>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
