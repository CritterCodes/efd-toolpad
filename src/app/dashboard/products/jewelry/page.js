'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Typography,
    Card,
    CardContent,
    CardMedia,
    CardActions,
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
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    Diamond as DiamondIcon
} from '@mui/icons-material';

export default function JewelryPage() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [jewelry, setJewelry] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(12);
    
    // Filtering and sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Fetch jewelry from API
    useEffect(() => {
        fetchJewelry();
    }, []);

    const fetchJewelry = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/products/jewelry');
            if (!response.ok) {
                throw new Error('Failed to fetch jewelry');
            }
            const data = await response.json();
            console.log('Fetched jewelry data:', data);
            if (data.jewelry && data.jewelry.length > 0) {
                console.log('First jewelry item images:', data.jewelry[0].images);
                console.log('First image type:', typeof data.jewelry[0].images?.[0]);
            }
            setJewelry(data.jewelry || []);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteJewelry = async (jewelryId) => {
        if (!confirm('Are you sure you want to delete this jewelry?')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/jewelry/${jewelryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete jewelry');
            }

            await fetchJewelry(); // Refresh the list
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.message);
        }
    };

    // Filtering Logic
    const filteredJewelry = jewelry.filter(item => {
        const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.jewelry?.type || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType ? item.jewelry?.type === filterType : true;
        return matchesSearch && matchesType;
    });

    // Sorting Logic
    const sortedJewelry = [...filteredJewelry].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
            comparison = new Date(b.createdAt) - new Date(a.createdAt);
        } else if (sortBy === 'price') {
            comparison = (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        } else if (sortBy === 'title') {
            comparison = (a.title || '').localeCompare(b.title || '');
        }
        return sortOrder === 'asc' ? comparison * -1 : comparison;
    });

    // Pagination Logic
    const totalPages = Math.ceil(sortedJewelry.length / itemsPerPage);
    const paginatedJewelry = sortedJewelry.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (event, value) => {
        setCurrentPage(value);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const typeOptions = ['Ring', 'Necklace', 'Earrings', 'Bracelet', 'Pendant', 'Brooch', 'Cufflinks', 'Other'];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>Jewelry</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Manage your jewelry collection
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => router.push('/dashboard/products/jewelry/new')}
                >
                    Add New Jewelry
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search jewelry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                            }}
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
                            >
                                <MenuItem value="date">Date Added</MenuItem>
                                <MenuItem value="price">Price</MenuItem>
                                <MenuItem value="title">Title</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Grid */}
            {paginatedJewelry.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        No jewelry found matching your criteria.
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {paginatedJewelry.map((item) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={item._id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <Box sx={{ position: 'relative', pt: '100%' }}>
                                    {item.images && item.images.length > 0 ? (
                                        <img
                                            src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url}
                                            alt={item.title}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                bgcolor: 'grey.100',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <DiamondIcon sx={{ fontSize: 60, color: 'grey.300' }} />
                                        </Box>
                                    )}
                                    <Chip
                                        label={item.status || 'Draft'}
                                        color={item.status === 'active' ? 'success' : 'default'}
                                        size="small"
                                        sx={{ position: 'absolute', top: 8, right: 8 }}
                                    />
                                </Box>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="h6" noWrap gutterBottom>
                                        {item.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {item.jewelry?.type} • {item.jewelry?.material}
                                    </Typography>
                                    {item.availability && (
                                        <Chip 
                                            label={item.availability.replace(/-/g, ' ')} 
                                            size="small" 
                                            variant="outlined" 
                                            color="info" 
                                            sx={{ mb: 1, textTransform: 'capitalize' }} 
                                        />
                                    )}
                                    <Typography variant="h6" color="primary">
                                        ${item.price?.toLocaleString() || '0'}
                                    </Typography>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                                    <Button 
                                        size="small" 
                                        startIcon={<VisibilityIcon />}
                                        onClick={() => router.push(`/dashboard/products/jewelry/${item.productId || item._id}`)}
                                    >
                                        View
                                    </Button>
                                    <Box>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => router.push(`/dashboard/products/jewelry/${item.productId || item._id}`)}
                                        >
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleDeleteJewelry(item.productId || item._id)}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Pagination 
                        count={totalPages} 
                        page={currentPage} 
                        onChange={handlePageChange} 
                        color="primary" 
                    />
                </Box>
            )}
        </Box>
    );
}
