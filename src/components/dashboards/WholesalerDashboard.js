import React from 'react';
import { Box, Typography, Chip, Button, Divider, Stack, CircularProgress, Alert } from '@mui/material';
import {
    Add as AddIcon, Build as BuildIcon, ArrowForward as ArrowForwardIcon,
    Inventory2 as InventoryIcon, CheckCircle as CheckIcon, LocalShipping as ShipIcon,
    Speed as SpeedIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useWholesalerDashboard } from '@/hooks/dashboards/useWholesalerDashboard';

const C = {
    bgPanel: '#15181D',
    bgCard: '#171A1F',
    bgTertiary: '#1F232A',
    border: '#2A2F38',
    textPrimary: '#E6E8EB',
    textHeader: '#D1D5DB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    accent: '#D4AF37',
    shadow: '0 8px 24px rgba(0,0,0,0.45)',
};

function Surface({ children, sx }) {
    return (
        <Box sx={{ backgroundColor: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 3, boxShadow: C.shadow, p: 3, ...sx }}>
            {children}
        </Box>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <Box sx={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                    <Typography sx={{ color: C.textMuted, fontSize: 12, mb: 1 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: C.textHeader }}>{value ?? '—'}</Typography>
                </Box>
                <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: C.bgTertiary, color: C.accent, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                    {icon}
                </Box>
            </Box>
        </Box>
    );
}

export default function WholesalerDashboard() {
    const router = useRouter();
    const { session, stats, recentRepairs, loading, error } = useWholesalerDashboard();

    const userName = session?.user?.name?.split(' ')[0] || session?.user?.email?.split('@')[0] || 'Wholesaler';

    if (loading && !stats) {
        return (
            <Surface>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: C.accent }} />
                </Box>
            </Surface>
        );
    }

    const statCards = [
        { label: 'Active Repairs', value: stats?.activeRepairs, icon: <BuildIcon fontSize="small" /> },
        { label: 'Pending Approval', value: stats?.pendingApproval, icon: <SpeedIcon fontSize="small" /> },
        { label: 'Completed This Month', value: stats?.completedThisMonth, icon: <CheckIcon fontSize="small" /> },
        { label: 'Avg. Turnaround', value: stats?.averageTurnaroundTime, icon: <InventoryIcon fontSize="small" /> },
    ];

    const quickActions = [
        { title: 'Create New Repair', href: '/dashboard/repairs/new', icon: <AddIcon fontSize="small" />, primary: true },
        { title: 'Current Repairs', href: '/dashboard/wholesaler/repairs/current', icon: <BuildIcon fontSize="small" /> },
        { title: 'Schedule Pickup', href: '/dashboard/wholesaler/repairs/schedule-pickup', icon: <ShipIcon fontSize="small" /> },
    ];

    return (
        <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Welcome + stats */}
            <Surface>
                <Stack spacing={3}>
                    <Box>
                        <Chip
                            label="Wholesale workspace"
                            sx={{ mb: 2, borderRadius: 2, backgroundColor: C.bgCard, color: C.textPrimary, border: `1px solid ${C.border}` }}
                        />
                        <Typography sx={{ fontSize: { xs: 32, md: 44 }, fontWeight: 600, lineHeight: 1.1, mb: 1, color: C.textHeader }}>
                            Welcome back, {userName}
                        </Typography>
                        <Typography sx={{ color: C.textSecondary, fontSize: 16, lineHeight: 1.6 }}>
                            Overview of your repair accounts and active orders.
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                        {statCards.map((s) => (
                            <StatCard key={s.label} {...s} />
                        ))}
                    </Box>
                </Stack>
            </Surface>

            {/* Recent repairs + Quick actions */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.6fr) minmax(280px,0.9fr)' }, gap: 3, alignItems: 'start' }}>
                {/* Recent repairs */}
                <Surface>
                    <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                            <Box>
                                <Typography sx={{ color: C.textMuted, fontSize: 12, fontWeight: 600, mb: 0.5 }}>Live feed</Typography>
                                <Typography sx={{ fontSize: 22, fontWeight: 600, color: C.textHeader }}>Recent repairs</Typography>
                            </Box>
                            <Button
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => router.push('/dashboard/wholesaler/repairs/current')}
                                sx={{ color: C.accent, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: 'transparent', opacity: 0.9 } }}
                            >
                                View all
                            </Button>
                        </Box>

                        {recentRepairs && recentRepairs.length > 0 ? (
                            <Stack divider={<Divider sx={{ borderColor: C.border }} />}>
                                {recentRepairs.slice(0, 6).map((repair) => (
                                    <Box
                                        key={repair._id || repair.repairID}
                                        sx={{ py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 600, color: C.textHeader, fontFamily: 'monospace' }}>
                                                {repair.repairID || repair.referenceNumber || '—'}
                                            </Typography>
                                            <Typography sx={{ color: C.textSecondary, fontSize: 13 }}>
                                                {repair.clientName || repair.itemDescription || 'Repair'}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={repair.status || 'Unknown'}
                                                size="small"
                                                sx={{ backgroundColor: C.bgTertiary, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 2, fontSize: 11 }}
                                            />
                                            <Button
                                                size="small"
                                                onClick={() => router.push(`/dashboard/repairs/${repair.repairID || repair._id}`)}
                                                sx={{ color: C.accent, minWidth: 0, textTransform: 'none', fontSize: 12, fontWeight: 600, p: '2px 6px' }}
                                            >
                                                View
                                            </Button>
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>
                        ) : (
                            <Box sx={{ py: 3, textAlign: 'center' }}>
                                <Typography sx={{ color: C.textSecondary }}>No recent repairs found.</Typography>
                                <Button
                                    onClick={() => router.push('/dashboard/repairs/new')}
                                    sx={{ color: C.accent, textTransform: 'none', mt: 1 }}
                                >
                                    Create your first repair
                                </Button>
                            </Box>
                        )}
                    </Stack>
                </Surface>

                {/* Quick actions */}
                <Surface>
                    <Stack spacing={2.5}>
                        <Box>
                            <Typography sx={{ color: C.textMuted, fontSize: 12, fontWeight: 600, mb: 0.5 }}>Shortcuts</Typography>
                            <Typography sx={{ fontSize: 22, fontWeight: 600, color: C.textHeader }}>Quick actions</Typography>
                        </Box>
                        <Stack divider={<Divider sx={{ borderColor: C.border }} />}>
                            {quickActions.map((action) => (
                                <Box
                                    key={action.title}
                                    sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', backgroundColor: C.bgTertiary, color: action.primary ? C.accent : C.textSecondary, border: `1px solid ${C.border}`, flexShrink: 0 }}>
                                            {action.icon}
                                        </Box>
                                        <Typography sx={{ fontSize: 15, fontWeight: 500, color: C.textHeader }}>{action.title}</Typography>
                                    </Box>
                                    <Button
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={() => router.push(action.href)}
                                        sx={{ color: action.primary ? C.accent : C.textSecondary, minWidth: 0, p: 0, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: 'transparent', opacity: 0.8 } }}
                                    >
                                        Open
                                    </Button>
                                </Box>
                            ))}
                        </Stack>
                    </Stack>
                </Surface>
            </Box>
        </Stack>
    );
}
