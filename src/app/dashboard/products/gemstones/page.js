'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box, Typography, Button, Alert, TextField, Grid, Paper,
    FormControl, InputLabel, Select, MenuItem, CircularProgress,
    Stack, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Diamond as DiamondIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useGemstoneManagement } from '../../../../hooks/products/gemstones/useGemstoneManagement';
import GemstoneGrid from '../../../../components/products/gemstones/GemstoneGrid';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

function MetricCard({ label, value }) {
    return (
        <Paper sx={{ p: 2, backgroundColor: REPAIRS_UI.bgCard, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: REPAIRS_UI.textHeader, lineHeight: 1.1 }}>{value}</Typography>
            <Typography sx={{ fontSize: '0.74rem', color: REPAIRS_UI.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
        </Paper>
    );
}

export default function GemstonesDashboardPage() {
    const router = useRouter();
    const { products, loading, error, handleDeleteProduct } = useGemstoneManagement('/api/products/gemstones');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const filteredGemstones = products
        .filter(g => {
            const matchSearch = (g.title || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchStatus = statusFilter ? (g.status || 'draft') === statusFilter : true;
            return matchSearch && matchStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'price') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
            if (sortBy === 'carat') return (parseFloat(b.carat) || 0) - (parseFloat(a.carat) || 0);
            return 0;
        });

    const handleDeleteRequest = (product) => setPendingDelete(product);

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        await handleDeleteProduct(pendingDelete);
        setDeleting(false);
        setPendingDelete(null);
    };

    const metrics = {
        total: products.length,
        available: products.filter(p => ['active', 'Available'].includes(p.status)).length,
        draft: products.filter(p => !p.status || p.status === 'draft').length,
        sold: products.filter(p => p.status === 'sold').length,
    };

    return (
        <Box sx={{ pb: 6, p: { xs: 1.5, sm: 2, md: 3 } }}>
            {/* Header */}
            <Box sx={{
                backgroundColor: { xs: 'transparent', sm: REPAIRS_UI.bgPanel },
                border: { xs: 'none', sm: `1px solid ${REPAIRS_UI.border}` },
                borderRadius: { xs: 0, sm: 3 },
                boxShadow: { xs: 'none', sm: REPAIRS_UI.shadow },
                p: { xs: 0.5, sm: 2.5, md: 3 },
                mb: 3,
            }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 1,
                            px: 1.25, py: 0.5, mb: 1.5,
                            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                            color: REPAIRS_UI.textPrimary, backgroundColor: REPAIRS_UI.bgCard,
                            border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, textTransform: 'uppercase',
                        }}>
                            <DiamondIcon sx={{ fontSize: 16, color: '#64B5F6' }} />
                            Product Catalog
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                            Gemstones
                        </Typography>
                        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                            Manage gemstone inventory and cutting work.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => router.push('/dashboard/products/gemstones/new')}
                        sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' }, flexShrink: 0 }}
                    >
                        Add Gemstone
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3, backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }}>
                    {error}
                </Alert>
            )}

            {/* Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}><MetricCard label="Total" value={metrics.total} /></Grid>
                <Grid item xs={6} md={3}><MetricCard label="Available" value={metrics.available} /></Grid>
                <Grid item xs={6} md={3}><MetricCard label="Draft" value={metrics.draft} /></Grid>
                <Grid item xs={6} md={3}><MetricCard label="Sold" value={metrics.sold} /></Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={5}>
                        <TextField
                            fullWidth
                            placeholder="Search gemstones..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            size="small"
                            InputProps={{ startAdornment: <SearchIcon sx={{ color: REPAIRS_UI.textSecondary, mr: 1 }} /> }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)} MenuProps={repairsMenuProps}>
                                <MenuItem value="">All Statuses</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="sold">Sold</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sort By</InputLabel>
                            <Select value={sortBy} label="Sort By" onChange={e => setSortBy(e.target.value)} MenuProps={repairsMenuProps}>
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value="title">Title</MenuItem>
                                <MenuItem value="price">Price</MenuItem>
                                <MenuItem value="carat">Carat (high first)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <GemstoneGrid
                products={filteredGemstones}
                onDelete={handleDeleteRequest}
                isLoading={loading}
                emptyMessage="No gemstones found."
            />

            {/* Delete Confirm Dialog */}
            <Dialog
                open={Boolean(pendingDelete)}
                onClose={() => setPendingDelete(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}
            >
                <DialogTitle sx={{ color: REPAIRS_UI.textHeader, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#EF5350' }} />
                    Delete Gemstone
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                        Are you sure you want to delete <strong style={{ color: REPAIRS_UI.textHeader }}>{pendingDelete?.title}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPendingDelete(null)} sx={{ color: REPAIRS_UI.textSecondary }} disabled={deleting}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                        sx={{ backgroundColor: '#EF5350', color: '#fff', fontWeight: 600, '&:hover': { backgroundColor: '#C62828' } }}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
