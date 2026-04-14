'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Paper, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Card, CardContent, Grid
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useWholesaleRepairs } from '@/hooks/wholesale/useWholesaleRepairs';

const STATUS_COLORS = {
    'RECEIVING': 'info',
    'NEEDS PARTS': 'secondary',
    'PARTS ORDERED': 'secondary',
    'READY FOR WORK': 'default',
    'IN PROGRESS': 'primary',
    'QUALITY CONTROL': 'primary',
};

const ACTIVE_STATUSES = ['RECEIVING', 'NEEDS PARTS', 'PARTS ORDERED', 'READY FOR WORK', 'IN PROGRESS', 'QUALITY CONTROL'];

export default function CurrentRepairsPage() {
    const router = useRouter();
    const { repairs, loading, error, stats, refresh } = useWholesaleRepairs();

    const currentRepairs = repairs.filter(r => ACTIVE_STATUSES.includes(r.status));

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Current Repairs</Typography>
                <Button startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
            </Box>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                    { label: 'Received', value: stats.receiving, color: '#0288d1' },
                    { label: 'In Progress', value: stats.inProgress, color: '#1976d2' },
                    { label: 'Total Active', value: currentRepairs.length, color: '#333' },
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

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : currentRepairs.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No active repairs at this time.</Typography>
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
                                <TableCell>Due</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {currentRepairs.map(repair => (
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
                                        <Chip label={repair.status} color={STATUS_COLORS[repair.status] || 'default'} size="small" />
                                    </TableCell>
                                    <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                    <TableCell>{repair.promiseDate || '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
