'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';

export default function CompletedRepairsPage() {
    const router = useRouter();
    const { repairs, loading, error, refresh } = useWholesaleRepairs();

    const completedRepairs = repairs.filter(r =>
        r.status === 'COMPLETED' || r.status === 'READY FOR PICK-UP'
    );

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Completed Repairs</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip label={`${completedRepairs.length} completed`} color="success" />
                    <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : completedRepairs.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No completed repairs yet.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Repair ID</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Item</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Submitted</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {completedRepairs.map(repair => (
                                <TableRow key={repair.repairID} hover>
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
                                            color={repair.status === 'COMPLETED' ? 'success' : 'info'}
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
        </Box>
    );
}
