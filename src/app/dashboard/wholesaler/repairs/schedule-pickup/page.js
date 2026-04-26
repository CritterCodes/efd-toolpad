'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Chip, Checkbox,
    Table, TableBody, TableCell, TableHead, TableRow,
    CircularProgress, Alert, Snackbar, Grid
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    LocalShipping as PickupIcon,
    DirectionsCar as DeliveryIcon,
    LocalShipping as ShipIcon
} from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const TH = ({ children, padding }) => (
    <TableCell padding={padding} sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

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

    const allPendingSelected = pendingRepairs.length > 0 && pendingRepairs.every(r => selected.includes(r.repairID));

    return (
        <Box sx={{ pb: 10 }}>
            {/* Header */}
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3,
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                    <Box>
                        <Typography
                            sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 1,
                                px: 1.25, py: 0.5, mb: 1.5,
                                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                                color: UI.textPrimary, backgroundColor: UI.bgCard,
                                border: `1px solid ${UI.border}`, borderRadius: 2, textTransform: 'uppercase',
                            }}
                        >
                            <ShipIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Schedule Pickup
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Select completed repairs to request pickup or mark for delivery.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={refresh}
                        disabled={loading}
                        sx={{ color: UI.textPrimary, borderColor: UI.border, backgroundColor: UI.bgCard }}
                    >
                        Refresh
                    </Button>
                </Box>

                {/* Stat chips */}
                <Grid container spacing={2}>
                    {[
                        { label: 'Pending', value: stats.pending },
                        { label: 'Pickup Requested', value: stats.pickupRequested },
                    ].map(({ label, value }) => (
                        <Grid item xs="auto" key={label}>
                            <Box sx={{ p: 1.5, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard, minWidth: 100 }}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: UI.textHeader }}>{value ?? '—'}</Typography>
                                <Typography variant="caption" sx={{ color: UI.textMuted }}>{label}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Batch action bar */}
            {pendingRepairs.length > 0 && (
                <Box
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                        p: 2, mb: 2,
                        border: `1px solid ${UI.border}`,
                        borderRadius: 2,
                        backgroundColor: UI.bgCard,
                    }}
                >
                    <Checkbox
                        checked={allPendingSelected}
                        indeterminate={selectedPendingCount > 0 && selectedPendingCount < pendingRepairs.length}
                        onChange={selectAllPending}
                        sx={{ color: UI.textMuted, '&.Mui-checked': { color: UI.accent }, '&.MuiCheckbox-indeterminate': { color: UI.accent } }}
                    />
                    <Typography variant="body2" sx={{ color: UI.textSecondary, flexGrow: 1 }}>
                        {selectedPendingCount === 0
                            ? `${pendingRepairs.length} pending — select to request pickup or schedule delivery`
                            : `${selectedPendingCount} selected`}
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <PickupIcon />}
                        disabled={selectedPendingCount === 0 || actionLoading}
                        onClick={() => handleAction(requestPickup)}
                        sx={{ borderColor: '#EF4444', color: '#EF4444', '&:hover': { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' } }}
                    >
                        Request Pickup
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={actionLoading ? <CircularProgress size={16} /> : <DeliveryIcon />}
                        disabled={selectedPendingCount === 0 || actionLoading}
                        onClick={() => handleAction(scheduleDelivery)}
                        sx={{ color: UI.textPrimary, borderColor: UI.border }}
                    >
                        I&apos;ll Deliver
                    </Button>
                </Box>
            )}

            {pendingRepairs.length === 0 && pickupRequested.length === 0 && !loading && (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard, mb: 2 }}>
                    <Typography sx={{ color: UI.textSecondary }}>
                        No pending repairs to schedule. All repairs have been picked up or delivered.
                    </Typography>
                </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: UI.accent }} />
                </Box>
            ) : schedulableRepairs.length > 0 && (
                <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TH padding="checkbox" />
                                <TH>Repair ID</TH>
                                <TH>Customer</TH>
                                <TH>Item</TH>
                                <TH>Description</TH>
                                <TH>Status</TH>
                                <TH>Submitted</TH>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {schedulableRepairs.map(repair => (
                                <TableRow
                                    key={repair.repairID}
                                    sx={{
                                        backgroundColor: UI.bgCard,
                                        '&:hover': { backgroundColor: UI.bgTertiary },
                                        '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                                        '&:last-child td': { borderBottom: 'none' },
                                    }}
                                >
                                    <TableCell padding="checkbox" sx={{ borderBottom: 'none' }}>
                                        {repair.status === 'PENDING PICKUP' && (
                                            <Checkbox
                                                checked={selected.includes(repair.repairID)}
                                                onChange={() => toggleSelect(repair.repairID)}
                                                sx={{ color: UI.textMuted, '&.Mui-checked': { color: UI.accent } }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell
                                        sx={{ fontFamily: 'monospace', fontSize: '0.85rem', cursor: 'pointer', color: UI.accent }}
                                        onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
                                    >
                                        {repair.repairID}
                                    </TableCell>
                                    <TableCell sx={{ color: UI.textPrimary }}>{repair.clientName || repair.customerName}</TableCell>
                                    <TableCell sx={{ color: UI.textSecondary }}>{repair.itemType}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: UI.textSecondary }}>
                                        {repair.description}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={repair.status}
                                            color={repair.status === 'PICKUP REQUESTED' ? 'error' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(repair.createdAt)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
}
