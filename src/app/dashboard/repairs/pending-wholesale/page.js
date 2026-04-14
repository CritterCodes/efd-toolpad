'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, Checkbox, Tab, Tabs,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Snackbar, Accordion, AccordionSummary,
    AccordionDetails, Badge
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    LocalShipping as ShippingIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckIcon,
    NotificationsActive as UrgentIcon
} from '@mui/icons-material';
import { usePendingWholesale } from '@/hooks/repairs/usePendingWholesale';

export default function PendingWholesalePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const {
        repairs, wholesalerGroups, loading, error,
        selected, toggleSelect, selectAllFromWholesaler,
        selectAll, receiveSelected, refresh
    } = usePendingWholesale();

    const [tab, setTab] = useState(0);
    const [receiving, setReceiving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (session && session.user?.role !== 'admin') {
            router.replace('/dashboard');
        }
    }, [session, router]);

    if (!session || session.user?.role !== 'admin') return null;

    const pickupRequested = repairs.filter(r => r.status === 'PICKUP REQUESTED');
    const pendingPickup = repairs.filter(r => r.status === 'PENDING PICKUP');
    const visibleRepairs = tab === 0 ? pickupRequested : tab === 1 ? pendingPickup : repairs;

    // Build groups from visible repairs
    const visibleGroups = visibleRepairs.reduce((acc, repair) => {
        const key = repair.userID || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                wholesalerID: key,
                wholesalerName: repair.wholesalerName || 'Unknown',
                repairs: []
            };
        }
        acc[key].repairs.push(repair);
        return acc;
    }, {});
    const filteredGroups = Object.values(visibleGroups);

    const handleReceive = async () => {
        setReceiving(true);
        try {
            const result = await receiveSelected();
            const label = tab === 0 ? 'picked up' : 'received';
            setSnackbar({
                open: true,
                message: `${result.received} repair(s) marked as ${label}`,
                severity: 'success'
            });
        } catch (err) {
            setSnackbar({
                open: true,
                message: err.message || 'Failed to receive repairs',
                severity: 'error'
            });
        } finally {
            setReceiving(false);
        }
    };

    const selectAllVisible = () => {
        const visibleIDs = visibleRepairs.map(r => r.repairID);
        const allSelected = visibleIDs.every(id => selected.includes(id));
        if (allSelected) {
            // Deselect all visible
            selectAll(); // toggle off if all selected
        } else {
            // Select all visible - use selectAll for "all" tab, manual for filtered
            if (tab === 2) {
                selectAll();
            } else {
                visibleIDs.forEach(id => {
                    if (!selected.includes(id)) toggleSelect(id);
                });
            }
        }
    };

    const visibleSelectedCount = visibleRepairs.filter(r => selected.includes(r.repairID)).length;
    const allVisibleSelected = visibleRepairs.length > 0 && visibleSelectedCount === visibleRepairs.length;

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const actionLabel = tab === 0 ? 'Mark Picked Up' : 'Mark Received';

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Wholesale Pickup</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage wholesale repair pickups and drop-offs
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        color={tab === 0 ? 'error' : 'primary'}
                        startIcon={receiving ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
                        onClick={handleReceive}
                        disabled={selected.length === 0 || receiving}
                    >
                        {actionLabel} ({selected.length})
                    </Button>
                </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UrgentIcon fontSize="small" color={pickupRequested.length > 0 ? 'error' : 'disabled'} />
                            Pickup Requests ({pickupRequested.length})
                        </Box>
                    }
                />
                <Tab label={`Awaiting Drop-off (${pendingPickup.length})`} />
                <Tab label={`All (${repairs.length})`} />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : visibleRepairs.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <ShippingIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        {tab === 0 ? 'No pickup requests' : tab === 1 ? 'No repairs awaiting drop-off' : 'No pending wholesale repairs'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {tab === 0
                            ? 'Wholesalers will appear here when they request a pickup.'
                            : 'Repairs appear here when wholesalers plan to deliver them.'}
                    </Typography>
                </Paper>
            ) : (
                <Box>
                    <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                            checked={allVisibleSelected}
                            indeterminate={visibleSelectedCount > 0 && !allVisibleSelected}
                            onChange={selectAllVisible}
                        />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {visibleSelectedCount === 0
                                ? `${visibleRepairs.length} repair(s) across ${filteredGroups.length} wholesaler(s)`
                                : `${visibleSelectedCount} of ${visibleRepairs.length} selected`}
                        </Typography>
                    </Paper>

                    {filteredGroups.map(group => {
                        const groupSelected = group.repairs.filter(r => selected.includes(r.repairID));
                        const allGroupSelected = groupSelected.length === group.repairs.length;
                        const groupPickupCount = group.repairs.filter(r => r.status === 'PICKUP REQUESTED').length;

                        return (
                            <Accordion key={group.wholesalerID} defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                        <Checkbox
                                            checked={allGroupSelected}
                                            indeterminate={groupSelected.length > 0 && !allGroupSelected}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => selectAllFromWholesaler(group.wholesalerID)}
                                        />
                                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                            {group.wholesalerName}
                                        </Typography>
                                        {groupPickupCount > 0 && (
                                            <Chip
                                                icon={<UrgentIcon />}
                                                label={`${groupPickupCount} pickup`}
                                                color="error"
                                                size="small"
                                                sx={{ mr: 1 }}
                                            />
                                        )}
                                        <Badge badgeContent={group.repairs.length} color="warning" sx={{ mr: 2 }}>
                                            <ShippingIcon />
                                        </Badge>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell padding="checkbox" />
                                                    <TableCell>Repair ID</TableCell>
                                                    <TableCell>Customer</TableCell>
                                                    <TableCell>Item</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell>Description</TableCell>
                                                    <TableCell>Submitted</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {group.repairs.map(repair => (
                                                    <TableRow
                                                        key={repair.repairID}
                                                        hover
                                                        sx={repair.status === 'PICKUP REQUESTED' ? { bgcolor: 'error.50', '&:hover': { bgcolor: 'error.100' } } : {}}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                checked={selected.includes(repair.repairID)}
                                                                onChange={() => toggleSelect(repair.repairID)}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                                            {repair.repairID}
                                                        </TableCell>
                                                        <TableCell>{repair.clientName || repair.customerName}</TableCell>
                                                        <TableCell>{repair.itemType}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={repair.status}
                                                                color={repair.status === 'PICKUP REQUESTED' ? 'error' : 'warning'}
                                                                size="small"
                                                                icon={repair.status === 'PICKUP REQUESTED' ? <UrgentIcon /> : undefined}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {repair.description}
                                                        </TableCell>
                                                        <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </AccordionDetails>
                            </Accordion>
                        );
                    })}
                </Box>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
