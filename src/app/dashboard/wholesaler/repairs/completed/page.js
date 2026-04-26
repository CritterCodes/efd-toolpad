'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Chip, CircularProgress, Alert,
    Table, TableBody, TableCell, TableHead, TableRow
} from '@mui/material';
import { Refresh as RefreshIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';
import { REPAIRS_UI as UI } from '@/app/dashboard/repairs/components/repairsUi';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const TH = ({ children }) => (
    <TableCell sx={{ color: UI.textMuted, fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: `1px solid ${UI.border}`, backgroundColor: UI.bgTertiary }}>
        {children}
    </TableCell>
);

export default function CompletedRepairsPage() {
    const router = useRouter();
    const { repairs, loading, error, refresh } = useWholesaleRepairs();

    const completedRepairs = repairs.filter(r =>
        r.status === 'COMPLETED' || r.status === 'READY FOR PICK-UP'
    );

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
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
                            <CheckIcon sx={{ fontSize: 16, color: UI.accent }} />
                            Wholesale / Archive
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: UI.textHeader, mb: 1 }}>
                            Completed Repairs
                        </Typography>
                        <Typography sx={{ color: UI.textSecondary, lineHeight: 1.6 }}>
                            {completedRepairs.length} repair{completedRepairs.length !== 1 ? 's' : ''} completed or ready for pick-up.
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
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: UI.accent }} />
                </Box>
            ) : completedRepairs.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', border: `1px solid ${UI.border}`, borderRadius: 2, backgroundColor: UI.bgCard }}>
                    <Typography sx={{ color: UI.textSecondary }}>No completed repairs yet.</Typography>
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
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {completedRepairs.map(repair => (
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
                                            label={repair.status}
                                            color={repair.status === 'COMPLETED' ? 'success' : 'info'}
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
        </Box>
    );
}
