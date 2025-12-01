'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    IconButton,
    Tooltip,
    Grid,
    Card,
    CardContent,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Check as ApproveIcon,
    Close as DeclineIcon,
    Info as InfoIcon,
    ThumbUp as ThumbUpIcon,
    ThumbDown as ThumbDownIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
} from '@mui/icons-material';

export default function ProductsAwaitingApprovalPage() {
    const { data: session } = useSession();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [artisanFilter, setArtisanFilter] = useState('all');

    // Dialog states
    const [approvalDialog, setApprovalDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');
    const [approvalAction, setApprovalAction] = useState(null);
    
    // Detail view state
    const [detailView, setDetailView] = useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);

    // Load products awaiting approval
    useEffect(() => {
        loadProducts();
    }, []);

    // Apply filters
    useEffect(() => {
        let filtered = products;
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.title?.toLowerCase().includes(query) ||
                p.artisanInfo?.businessName?.toLowerCase().includes(query) ||
                p.artisanInfo?.name?.toLowerCase().includes(query)
            );
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.designInfo?.status === statusFilter);
        }
        
        // Artisan filter
        if (artisanFilter !== 'all') {
            filtered = filtered.filter(p => p.artisanInfo?._id === artisanFilter);
        }
        
        setFilteredProducts(filtered);
        setPage(0); // Reset to first page
    }, [products, searchQuery, statusFilter, artisanFilter]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/products/awaiting-approval');

            if (!response.ok) {
                throw new Error('Failed to load products');
            }

            const data = await response.json();
            setProducts(data.products || []);
            setError('');
        } catch (err) {
            console.error('❌ Error loading products:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprovalClick = (product, action) => {
        setSelectedProduct(product);
        setApprovalAction(action);
        setApprovalNotes('');
        setApprovalDialog(true);
    };

    const handleSubmitApproval = async () => {
        if (!selectedProduct) return;

        try {
            setActionLoading(true);
            const endpoint = approvalAction === 'approve'
                ? `/api/products/${selectedProduct._id}/approve`
                : `/api/products/${selectedProduct._id}/reject`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notes: approvalNotes.trim() || undefined,
                    approvedBy: session.user.userID
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${approvalAction} product`);
            }

            const responseData = await response.json();
            
            // If approved, also publish the product automatically
            if (approvalAction === 'approve' && responseData.product) {
                const publishResponse = await fetch(`/api/products/${selectedProduct._id}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notes: 'Published automatically after admin approval'
                    })
                });

                if (!publishResponse.ok) {
                    console.warn('⚠️ Product approved but publish failed:', await publishResponse.json());
                }
            }

            // Reload products list
            await loadProducts();
            setApprovalDialog(false);
            setSelectedProduct(null);
            setApprovalNotes('');
        } catch (err) {
            console.error('❌ Approval error:', err);
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getUniqueArtisans = () => {
        const artisans = {};
        products.forEach(p => {
            if (p.artisanInfo?._id) {
                artisans[p.artisanInfo._id] = p.artisanInfo.businessName || p.artisanInfo.name;
            }
        });
        return artisans;
    };

    const getUniqueStatuses = () => {
        const statuses = new Set();
        products.forEach(p => {
            if (p.designInfo?.status) {
                statuses.add(p.designInfo.status);
            }
        });
        return Array.from(statuses);
    };

    const paginatedProducts = filteredProducts.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (!session?.user || session.user.role !== 'admin') {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">Admin access required</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                    🎁 Products Awaiting Approval
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage and review designs that are ready to be listed on the website
                </Typography>
            </Box>

            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Pending Review
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {products.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Filtered Results
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {filteredProducts.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                Unique Artisans
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {Object.keys(getUniqueArtisans()).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" gutterBottom>
                                With COG Data
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {products.filter(p => p.cogData).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search by title or artisan..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Statuses</MenuItem>
                                {getUniqueStatuses().map(status => (
                                    <MenuItem key={status} value={status}>
                                        {status.replace(/_/g, ' ').toUpperCase()}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Artisan</InputLabel>
                            <Select
                                value={artisanFilter}
                                label="Artisan"
                                onChange={(e) => setArtisanFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Artisans</MenuItem>
                                {Object.entries(getUniqueArtisans()).map(([id, name]) => (
                                    <MenuItem key={id} value={id}>
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : filteredProducts.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        No products found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {searchQuery || statusFilter !== 'all' || artisanFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'All products have been reviewed!'}
                    </Typography>
                </Paper>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Artisan</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Submitted</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paginatedProducts.map((product) => (
                                    <TableRow key={product._id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                {product.images?.[0]?.url && (
                                                    <Box
                                                        component="img"
                                                        src={product.images[0].url}
                                                        alt={product.title}
                                                        sx={{
                                                            width: 50,
                                                            height: 50,
                                                            objectFit: 'cover',
                                                            borderRadius: 1
                                                        }}
                                                    />
                                                )}
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        {product.title}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {product.description?.substring(0, 50)}...
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {product.artisanInfo?.businessName || product.artisanInfo?.name}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                ${parseFloat(product.retailPrice || 0).toFixed(2)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={product.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                                size="small"
                                                color={product.designInfo?.status === 'approved' ? 'success' : 'warning'}
                                                variant="outlined"
                                            />
                                            {product.cogData && (
                                                <Chip
                                                    icon={<ThumbUpIcon />}
                                                    label="COG"
                                                    size="small"
                                                    color="success"
                                                    sx={{ ml: 1 }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(product.submittedAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedDetailProduct(product);
                                                        setDetailView(true);
                                                    }}
                                                >
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Approve">
                                                <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleApprovalClick(product, 'approve')}
                                                    disabled={actionLoading}
                                                >
                                                    <ApproveIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Reject">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleApprovalClick(product, 'reject')}
                                                    disabled={actionLoading}
                                                >
                                                    <DeclineIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    <TablePagination
                        component="div"
                        count={filteredProducts.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </>
            )}

            {/* Product Detail Dialog */}
            <Dialog open={detailView} onClose={() => setDetailView(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedDetailProduct?.title}
                </DialogTitle>
                <DialogContent dividers>
                    {selectedDetailProduct && (
                        <Stack spacing={3} sx={{ mt: 2 }}>
                            {/* Image */}
                            {selectedDetailProduct.images?.[0]?.url && (
                                <Box
                                    component="img"
                                    src={selectedDetailProduct.images[0].url}
                                    alt={selectedDetailProduct.title}
                                    sx={{
                                        width: '100%',
                                        maxHeight: 300,
                                        objectFit: 'contain',
                                        borderRadius: 1
                                    }}
                                />
                            )}
                            
                            {/* Description */}
                            {selectedDetailProduct.description && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Description
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedDetailProduct.description}
                                    </Typography>
                                </Box>
                            )}
                            
                            {/* Details Grid */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                        Retail Price
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        ${parseFloat(selectedDetailProduct.retailPrice || 0).toFixed(2)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                        Artisan
                                    </Typography>
                                    <Typography variant="body2">
                                        {selectedDetailProduct.artisanInfo?.businessName || selectedDetailProduct.artisanInfo?.name}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                        Design Status
                                    </Typography>
                                    <Chip
                                        label={selectedDetailProduct.designInfo?.status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                                        size="small"
                                        color={selectedDetailProduct.designInfo?.status === 'approved' ? 'success' : 'warning'}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                        Submitted
                                    </Typography>
                                    <Typography variant="body2">
                                        {new Date(selectedDetailProduct.submittedAt).toLocaleString()}
                                    </Typography>
                                </Grid>
                                {selectedDetailProduct.cogData && (
                                    <Grid item xs={12}>
                                        <Chip
                                            icon={<ThumbUpIcon />}
                                            label="COG Data Configured - Ready for Listing"
                                            color="success"
                                            variant="filled"
                                            fullWidth
                                        />
                                    </Grid>
                                )}
                            </Grid>
                            
                            {/* View Full Product Link */}
                            <Box>
                                <Link href={`/dashboard/products/gemstones/${selectedDetailProduct.productId || selectedDetailProduct._id}`}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<ViewIcon />}
                                    >
                                        View Full Product Page
                                    </Button>
                                </Link>
                            </Box>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailView(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {approvalAction === 'approve' ? '✅ Approve & Publish Product' : '❌ Reject Product'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        <strong>{selectedProduct?.title}</strong>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {approvalAction === 'approve'
                            ? 'This will approve and publish the product immediately. It will appear on the website for customers to purchase.'
                            : 'This will reject the product and return it to the artisan for revisions.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label={approvalAction === 'approve' ? 'Notes (optional)' : 'Rejection reason (required)'}
                        placeholder={approvalAction === 'reject' ? 'Enter reason for rejection...' : 'Any notes for the artisan...'}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        disabled={actionLoading}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setApprovalDialog(false)}
                        disabled={actionLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color={approvalAction === 'approve' ? 'success' : 'error'}
                        onClick={handleSubmitApproval}
                        disabled={
                            actionLoading ||
                            (approvalAction !== 'approve' && !approvalNotes.trim())
                        }
                        startIcon={actionLoading ? <CircularProgress size={20} /> : null}
                    >
                        {actionLoading ? 'Processing...' : approvalAction === 'approve' ? 'Approve & Publish' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}
