'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardActionArea,
    Grid,
    Button,
    Chip,
    Paper,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    CircularProgress,
    Alert,
    Pagination,
    Tooltip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Diamond as DiamondIcon,
    ArrowUpward as ArrowUpwardIcon,
    ArrowDownward as ArrowDownwardIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { REPAIRS_UI, repairsMenuProps } from '@/app/dashboard/repairs/components/repairsUi';

const PRODUCT_STATUS_COLOR = {
    active: '#66BB6A',
    draft: REPAIRS_UI.textMuted,
    archived: REPAIRS_UI.textMuted,
    pending: '#FFB74D',
};

export default function JewelryPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const [jewelry, setJewelry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => { fetchJewelry(); }, []);

    const fetchJewelry = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/products/jewelry');
            if (!response.ok) throw new Error('Failed to fetch jewelry');
            const data = await response.json();
            setJewelry(data.jewelry || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            const response = await fetch(`/api/products/jewelry/${deleteTarget}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete jewelry');
            setDeleteTarget(null);
            await fetchJewelry();
        } catch (err) {
            setError(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const filteredJewelry = jewelry.filter(item => {
        const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.jewelry?.type || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType ? item.jewelry?.type === filterType : true;
        return matchesSearch && matchesType;
    });

    const sortedJewelry = [...filteredJewelry].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') cmp = new Date(b.createdAt) - new Date(a.createdAt);
        else if (sortBy === 'price') cmp = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        else if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '');
        return sortOrder === 'asc' ? cmp * -1 : cmp;
    });

    const totalPages = Math.ceil(sortedJewelry.length / itemsPerPage);
    const paginatedJewelry = sortedJewelry.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const typeOptions = ['Ring', 'Pendant', 'Bracelet', 'Earrings', 'Other'];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress sx={{ color: REPAIRS_UI.accent }} />
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 6 }}>
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
                            <DiamondIcon sx={{ fontSize: 16, color: REPAIRS_UI.accent }} />
                            Product Catalog
                        </Typography>
                        <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: REPAIRS_UI.textHeader, mb: 1 }}>
                            Jewelry
                        </Typography>
                        <Typography sx={{ color: REPAIRS_UI.textSecondary, lineHeight: 1.6 }}>
                            Manage jewelry pieces and collections.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => router.push('/dashboard/products/jewelry/new')}
                        sx={{ backgroundColor: REPAIRS_UI.accent, color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#C19B2E' }, flexShrink: 0 }}
                    >
                        New Jewelry
                    </Button>
                </Stack>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3, backgroundColor: '#4A1D1D', color: '#F8BBBB', border: '1px solid #7A2E2E' }}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search jewelry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{ startAdornment: <SearchIcon sx={{ color: REPAIRS_UI.textSecondary, mr: 1 }} /> }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={filterType}
                                label="Type"
                                onChange={(e) => setFilterType(e.target.value)}
                                MenuProps={repairsMenuProps}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                {typeOptions.map(type => (
                                    <MenuItem key={type} value={type}>{type}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                label="Sort By"
                                onChange={(e) => setSortBy(e.target.value)}
                                MenuProps={repairsMenuProps}
                            >
                                <MenuItem value="date">Date Added</MenuItem>
                                <MenuItem value="price">Price</MenuItem>
                                <MenuItem value="title">Title</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={sortOrder === 'desc' ? <ArrowDownwardIcon /> : <ArrowUpwardIcon />}
                            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                            sx={{ borderColor: REPAIRS_UI.border, color: REPAIRS_UI.textSecondary, '&:hover': { borderColor: REPAIRS_UI.accent, color: REPAIRS_UI.accent, backgroundColor: REPAIRS_UI.bgCard } }}
                        >
                            {sortOrder === 'desc' ? 'Desc' : 'Asc'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Grid */}
            {paginatedJewelry.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px dashed ${REPAIRS_UI.border}`, borderRadius: 2, boxShadow: 'none' }}>
                    <DiamondIcon sx={{ fontSize: 48, color: REPAIRS_UI.textMuted, mb: 1 }} />
                    <Typography sx={{ color: REPAIRS_UI.textSecondary, fontWeight: 600 }}>
                        No jewelry found matching your criteria.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2}>
                    {paginatedJewelry.map((item) => {
                        const statusColor = PRODUCT_STATUS_COLOR[item.status] || REPAIRS_UI.textMuted;
                        const imgSrc = item.images && item.images.length > 0
                            ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url)
                            : null;

                        return (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                                <Card sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    position: 'relative',
                                    backgroundColor: REPAIRS_UI.bgCard,
                                    backgroundImage: 'none',
                                    border: `1px solid ${REPAIRS_UI.border}`,
                                    borderRadius: 2,
                                    boxShadow: 'none',
                                    transition: 'border-color 0.15s',
                                    '&:hover': { borderColor: REPAIRS_UI.accent },
                                }}>
                                    <CardActionArea
                                        onClick={() => router.push(`/dashboard/products/jewelry/${item.productId || item._id}`)}
                                        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                                    >
                                        <Box sx={{ position: 'relative', pt: '100%' }}>
                                            {imgSrc ? (
                                                <img
                                                    src={imgSrc}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : null}
                                            <Box
                                                sx={{
                                                    position: 'absolute', top: 0, left: 0,
                                                    width: '100%', height: '100%',
                                                    backgroundColor: REPAIRS_UI.bgTertiary,
                                                    display: imgSrc ? 'none' : 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <DiamondIcon sx={{ fontSize: 60, color: REPAIRS_UI.textMuted }} />
                                            </Box>
                                            <Chip
                                                label={item.status || 'draft'}
                                                size="small"
                                                sx={{
                                                    position: 'absolute', top: 8, right: 8,
                                                    backgroundColor: `${statusColor}22`,
                                                    color: statusColor,
                                                    fontWeight: 700,
                                                    fontSize: '0.68rem',
                                                    textTransform: 'capitalize',
                                                }}
                                            />
                                        </Box>
                                        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                                            <Typography variant="h6" noWrap gutterBottom sx={{ color: REPAIRS_UI.textHeader, fontSize: '1rem' }}>
                                                {item.title}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary }} gutterBottom>
                                                {item.jewelry?.type}{item.jewelry?.material ? ` · ${item.jewelry.material}` : ''}
                                            </Typography>
                                            {item.availability && (
                                                <Chip
                                                    label={item.availability.replace(/-/g, ' ')}
                                                    size="small"
                                                    sx={{ mb: 0.5, mr: 0.5, backgroundColor: REPAIRS_UI.bgTertiary, color: REPAIRS_UI.textSecondary, border: `1px solid ${REPAIRS_UI.border}`, textTransform: 'capitalize', fontSize: '0.68rem' }}
                                                />
                                            )}
                                            {item.classification && (
                                                <Chip
                                                    label={item.classification === 'one-of-one' ? '1 of 1' : 'Signature'}
                                                    size="small"
                                                    sx={{ mb: 0.5, backgroundColor: `${REPAIRS_UI.accent}22`, color: REPAIRS_UI.accent, border: 'none', fontSize: '0.68rem' }}
                                                />
                                            )}
                                            <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader, mt: 0.5 }}>
                                                ${item.price?.toLocaleString() || '0'}
                                            </Typography>
                                        </CardContent>
                                    </CardActionArea>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, pb: 1.5 }}>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                aria-label="Delete jewelry"
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item.productId || item._id); }}
                                                sx={{ color: REPAIRS_UI.textMuted, '&:hover': { color: '#EF5350', backgroundColor: '#EF535022' } }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={handlePageChange}
                        sx={{
                            '& .MuiPaginationItem-root': { color: REPAIRS_UI.textSecondary },
                            '& .Mui-selected': { backgroundColor: `${REPAIRS_UI.accent} !important`, color: '#1A1A1A !important', fontWeight: 700 },
                        }}
                    />
                </Box>
            )}

            {/* Delete Confirm Dialog */}
            <Dialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}
            >
                <DialogTitle sx={{ color: REPAIRS_UI.textHeader, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#EF5350' }} />
                    Delete Jewelry
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: REPAIRS_UI.textSecondary }}>
                        Are you sure you want to delete this jewelry piece? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ color: REPAIRS_UI.textSecondary }} disabled={deleting}>
                        Cancel
                    </Button>
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
