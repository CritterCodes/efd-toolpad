'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Chip, CircularProgress, Alert, Grid
} from '@mui/material';
import {
    LocalShipping as ShippingIcon,
    Refresh as RefreshIcon,
    NotificationsActive as UrgentIcon,
    Store as StoreIcon,
} from '@mui/icons-material';
import { wholesaleRepairsClient } from '@/api-clients/wholesaleRepairs.client';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';
import { normalizeRepairWorkflow, REPAIR_STATUS } from '@/services/repairWorkflow';

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
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PENDING_PICKUP }),
                wholesaleRepairsClient.fetchRepairs({ status: REPAIR_STATUS.PICKUP_REQUESTED }),
            ]);
            setRepairs([...(pickupData.repairs || []), ...(pendingData.repairs || [])].map(normalizeRepairWorkflow));
        } catch {
            setError('Failed to load pending repairs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRepairs(); }, [loadRepairs]);
    useEffect(() => {
        const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
        const canReceiveWholesale = session?.user?.role === 'artisan'
            && session?.user?.employment?.isOnsite === true
            && session?.user?.staffCapabilities?.repairOps === true
            && session?.user?.staffCapabilities?.receiving === true;

        if (session && !isAdmin && !canReceiveWholesale) router.replace('/dashboard');
    }, [session, router]);

    const isAdmin = ['admin', 'dev'].includes(session?.user?.role);
    const canReceiveWholesale = session?.user?.role === 'artisan'
        && session?.user?.employment?.isOnsite === true
        && session?.user?.staffCapabilities?.repairOps === true
        && session?.user?.staffCapabilities?.receiving === true;

    if (!session || (!isAdmin && !canReceiveWholesale)) return null;

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
        if (repair.normalizedStatus === REPAIR_STATUS.PICKUP_REQUESTED) acc[key].pickupRequested++;
        else acc[key].pending++;
        return acc;
    }, {});
    const stores = Object.values(storeGroups).sort((a, b) => b.pickupRequested - a.pickupRequested);

    const totalPickupRequests = repairs.filter(r => r.normalizedStatus === REPAIR_STATUS.PICKUP_REQUESTED).length;
    const totalPending = repairs.filter(r => r.normalizedStatus === REPAIR_STATUS.PENDING_PICKUP).length;

    return (
        <Box sx={{ pb: 10, position: 'relative' }}>
            <Box
                sx={{
                    backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                    border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                    borderRadius: { xs: 0, sm: 3 },
                    boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                    p: { xs: 0.5, sm: 2.5, md: 3 },
                    mb: 3
                }}
            >
                <Box sx={{ maxWidth: 920, mb: 2 }}>
                    <Typography
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.25,
                            py: 0.5,
                            mb: 1.5,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: REPAIRS_UI.textPrimary,
                            backgroundColor: REPAIRS_UI.bgCard,
                            border: `1px solid ${REPAIRS_UI.border}`,
                            borderRadius: 2,
                            textTransform: 'uppercase'
                        }}
                    >
                        <ShippingIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                        Wholesale logistics
                    </Typography>

                    <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                        Wholesale Pickup
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                        {stores.length} store{stores.length !== 1 ? 's' : ''} with {repairs.length} repair{repairs.length !== 1 ? 's' : ''} awaiting pickup.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={loadRepairs}
                        disabled={loading}
                        sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border, backgroundColor: REPAIRS_UI.bgCard }}
                    >
                        Refresh
                    </Button>
                    {totalPickupRequests > 0 && (
                        <Chip
                            icon={<UrgentIcon sx={{ color: '#EF4444 !important' }} />}
                            label={`${totalPickupRequests} pickup requested`}
                            sx={{ backgroundColor: REPAIRS_UI.bgCard, color: '#EF4444', border: `1px solid #EF4444`, fontWeight: 600 }}
                        />
                    )}
                    {totalPending > 0 && (
                        <Chip
                            icon={<ShippingIcon sx={{ color: '#F59E0B !important' }} />}
                            label={`${totalPending} awaiting drop-off`}
                            sx={{ backgroundColor: REPAIRS_UI.bgCard, color: '#F59E0B', border: `1px solid #F59E0B`, fontWeight: 600 }}
                        />
                    )}
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2, backgroundColor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
                </Box>
            ) : stores.length === 0 ? (
                <Box
                    sx={{
                        backgroundColor: REPAIRS_UI.bgPanel,
                        border: `1px solid ${REPAIRS_UI.border}`,
                        borderRadius: 3,
                        px: 3,
                        py: 6,
                        textAlign: 'center'
                    }}
                >
                    <ShippingIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: REPAIRS_UI.textHeader, mb: 1 }}>
                        No pending pickups
                    </Typography>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                        Stores will appear here when they have repairs awaiting pickup.
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {stores.map(store => {
                        const hasUrgent = store.pickupRequested > 0;
                        return (
                            <Grid item xs={12} sm={6} md={4} key={store.storeID}>
                                <Box
                                    onClick={() => router.push(`/dashboard/repairs/pending-wholesale/${encodeURIComponent(store.storeID)}`)}
                                    sx={{
                                        backgroundColor: REPAIRS_UI.bgPanel,
                                        border: `1px solid ${hasUrgent ? '#EF4444' : REPAIRS_UI.border}`,
                                        borderRadius: 3,
                                        boxShadow: REPAIRS_UI.shadow,
                                        p: 2.5,
                                        cursor: 'pointer',
                                        transition: 'border-color 0.15s',
                                        '&:hover': {
                                            borderColor: hasUrgent ? '#EF4444' : REPAIRS_UI.accent,
                                            backgroundColor: REPAIRS_UI.bgCard
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                        <Box
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${REPAIRS_UI.border}`,
                                                backgroundColor: REPAIRS_UI.bgCard
                                            }}
                                        >
                                            <StoreIcon sx={{ fontSize: 18, color: hasUrgent ? '#EF4444' : REPAIRS_UI.accent }} />
                                        </Box>
                                        <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, flex: 1 }} noWrap>
                                            {store.storeName}
                                        </Typography>
                                    </Box>

                                    <Typography sx={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.1, color: hasUrgent ? '#EF4444' : REPAIRS_UI.textHeader, mb: 0.5 }}>
                                        {store.repairs.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5 }}>
                                        repair{store.repairs.length !== 1 ? 's' : ''} to receive
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {store.pickupRequested > 0 && (
                                            <Chip
                                                icon={<UrgentIcon sx={{ fontSize: 12 }} />}
                                                label={`${store.pickupRequested} pickup`}
                                                size="small"
                                                sx={{ backgroundColor: REPAIRS_UI.bgCard, color: '#EF4444', border: '1px solid #EF4444', fontSize: '0.7rem', '& .MuiChip-icon': { color: '#EF4444' } }}
                                            />
                                        )}
                                        {store.pending > 0 && (
                                            <Chip
                                                label={`${store.pending} drop-off`}
                                                size="small"
                                                sx={{ backgroundColor: REPAIRS_UI.bgCard, color: '#F59E0B', border: '1px solid #F59E0B', fontSize: '0.7rem' }}
                                            />
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
}
