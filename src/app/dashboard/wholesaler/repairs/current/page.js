'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Chip, CircularProgress, Alert,
    Table, TableBody, TableCell, TableHead, TableRow, Grid
} from '@mui/material';
import { Refresh as RefreshIcon, Build as BuildIcon } from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';
import { STATUS_DESCRIPTIONS } from '@/services/repairWorkflow';

const STATUS_COLORS = {
    'RECEIVING': 'info',
    'NEEDS QUOTE': 'warning',
    'COMMUNICATION REQUIRED': 'secondary',
    'NEEDS PARTS': 'secondary',
    'PARTS ORDERED': 'secondary',
    'READY FOR WORK': 'default',
    'IN PROGRESS': 'primary',
    'QC': 'primary',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const TH = ({ children }) => (
    <TableCell sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

export default function CurrentRepairsPage() {
    const router = useRouter();
    const { activeRepairs, loading, error, stats, refresh } = useWholesaleRepairs();

    const statItems = [
        { label: 'Received', value: stats.receiving },
        { label: 'In Progress', value: stats.inProgress },
        { label: 'Total Active', value: activeRepairs.length },
    ];

    return (
        <Box sx={{ pb: 10 }}>
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
                            <BuildIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Current Repairs
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            Repairs currently in the workflow for your account.
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

                <Grid container spacing={2}>
                    {statItems.map(({ label, value }) => (
                        <Grid item xs={4} sm="auto" key={label}>
                            <Box sx={{ p: 1.5, border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard, minWidth: 100 }}>
                                <Typography variant="h5" fontWeight={700} sx={{ color: UI.textHeader }}>{value ?? '—'}</Typography>
                                <Typography variant="caption" sx={{ color: UI.textMuted }}>{label}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: UI.accent }} />
                </Box>
            ) : activeRepairs.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary }}>No active repairs at this time.</Typography>
                </Box>
            ) : (
                <Box sx={{ border: `1px solid ${UI.border}`, borderRadius: 2, overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TH>Repair ID</TH>
                                <TH>Customer</TH>
                                <TH>Item</TH>
                                <TH>Description</TH>
                                <TH>Status</TH>
                                <TH>Submitted</TH>
                                <TH>Due</TH>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeRepairs.map((repair) => {
                                const displayStatus = repair.normalizedStatus || repair.status;
                                return (
                                    <TableRow
                                        key={repair.repairID}
                                        sx={{
                                            backgroundColor: UI.bgCard,
                                            '&:hover': { backgroundColor: UI.bgTertiary },
                                            '&:not(:last-child) td': { borderBottom: `1px solid ${UI.border}` },
                                            '&:last-child td': { borderBottom: 'none' },
                                        }}
                                    >
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
                                                label={displayStatus}
                                                color={STATUS_COLORS[displayStatus] || 'default'}
                                                size="small"
                                                title={STATUS_DESCRIPTIONS[displayStatus] || displayStatus}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: UI.textSecondary }}>{fmtDate(repair.createdAt)}</TableCell>
                                        <TableCell sx={{ color: UI.textSecondary }}>{repair.promiseDate ? fmtDate(repair.promiseDate) : '—'}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            )}
        </Box>
    );
}
