'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip, Card, CardContent,
    CardActionArea, Grid, CircularProgress, Alert
} from '@mui/material';
import {
    LocalShipping as ShippingIcon,
    Refresh as RefreshIcon,
    NotificationsActive as UrgentIcon,
    Store as StoreIcon
} from '@mui/icons-material';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';

export default function PendingWholesalePage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadRepairs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [pendingData, pickupData] = await Promise.all([
                wholesaleRepairsClient.fetchRepairs({ status: 'PENDING PICKUP' }),
                wholesaleRepairsClient.fetchRepairs({ status: 'PICKUP REQUESTED' }),
            ]);
            setRepairs([...(pickupData.repairs || []), ...(pendingData.repairs || [])]);
        } catch (err) {
            setError('Failed to load pending repairs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRepairs(); }, [loadRepairs]);

    useEffect(() => {
        if (session && session.user?.role !== 'admin') router.replace('/dashboard');
    }, [session, router]);

    if (!session || session.user?.role !== 'admin') return null;

    // Group by store (createdBy for main-form repairs, or userID for wholesale-form)
    const storeGroups = repairs.reduce((acc, repair) => {
        const key = repair.createdBy || repair.userID || 'unknown';
        if (!acc[key]) {
            acc[key] = {
                storeID: key,
                storeName: repair.wholesalerName || repair.businessName || 'Unknown Store',
                repairs: [],
                pickupRequested: 0,
                pending: 0
            };
        }
        acc[key].repairs.push(repair);
        if (repair.status === 'PICKUP REQUESTED') acc[key].pickupRequested++;
        else acc[key].pending++;
        return acc;
    }, {});
    const stores = Object.values(storeGroups).sort((a, b) => b.pickupRequested - a.pickupRequested);

    const totalPickupRequests = repairs.filter(r => r.status === 'PICKUP REQUESTED').length;
    const totalPending = repairs.filter(r => r.status === 'PENDING PICKUP').length;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4">Wholesale Pickup</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {stores.length} store(s) with {repairs.length} repair(s) awaiting pickup
                    </Typography>
                </Box>
                <Button startIcon={<RefreshIcon />} onClick={loadRepairs} disabled={loading}>Refresh</Button>
            </Box>

            {/* Summary chips */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {totalPickupRequests > 0 && (
                    <Chip icon={<UrgentIcon />} label={`${totalPickupRequests} pickup requested`} color="error" />
                )}
                {totalPending > 0 && (
                    <Chip icon={<ShippingIcon />} label={`${totalPending} awaiting drop-off`} color="warning" />
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : stores.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <ShippingIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No pending pickups</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Stores will appear here when they have repairs awaiting pickup.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {stores.map(store => (
                        <Grid item xs={12} sm={6} md={4} key={store.storeID}>
                            <Card
                                sx={{
                                    border: store.pickupRequested > 0 ? '2px solid' : '1px solid',
                                    borderColor: store.pickupRequested > 0 ? 'error.main' : 'divider',
                                }}
                            >
                                <CardActionArea
                                    onClick={() => router.push(
                                        `/dashboard/repairs/pending-wholesale/${encodeURIComponent(store.storeID)}`
                                    )}
                                >
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <StoreIcon color={store.pickupRequested > 0 ? 'error' : 'action'} />
                                            <Typography variant="h6" noWrap>{store.storeName}</Typography>
                                        </Box>
                                        <Typography variant="h3" sx={{
                                            fontWeight: 700,
                                            color: store.pickupRequested > 0 ? 'error.main' : 'primary.main',
                                            mb: 1
                                        }}>
                                            {store.repairs.length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            repair(s) to receive
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {store.pickupRequested > 0 && (
                                                <Chip
                                                    icon={<UrgentIcon />}
                                                    label={`${store.pickupRequested} pickup`}
                                                    color="error"
                                                    size="small"
                                                />
                                            )}
                                            {store.pending > 0 && (
                                                <Chip label={`${store.pending} drop-off`} color="warning" size="small" />
                                            )}
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}
