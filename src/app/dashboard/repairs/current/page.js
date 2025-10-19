'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    Button,
    Breadcrumbs,
    Link,
    TextField,
    InputAdornment,
    Alert,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    AccessTime as ClockIcon,
    Build as RepairIcon,
    Visibility as ViewIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const CurrentRepairsPage = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');

    // Fetch repair data
    useEffect(() => {
        fetchRepairs();
    }, []);

    const fetchRepairs = async () => {
        try {
            const response = await fetch('/api/repairs/my-repairs');
            if (response.ok) {
                const data = await response.json();
                setRepairs(data.repairs || []);
            }
        } catch (error) {
            console.error('Error fetching repairs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter current repairs (not completed/picked up)
    const currentRepairs = repairs.filter(repair => 
        !['completed', 'picked-up', 'cancelled'].includes(repair.status)
    );

    // Apply search and filters
    const filteredRepairs = currentRepairs.filter(repair => {
        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                repair.repairID?.toLowerCase().includes(searchLower) ||
                repair.repairNumber?.toLowerCase().includes(searchLower) ||
                repair.clientName?.toLowerCase().includes(searchLower) ||
                repair.clientFirstName?.toLowerCase().includes(searchLower) ||
                repair.clientLastName?.toLowerCase().includes(searchLower) ||
                repair.description?.toLowerCase().includes(searchLower) ||
                repair.repairDescription?.toLowerCase().includes(searchLower) ||
                repair.itemDescription?.toLowerCase().includes(searchLower)
            );
            if (!matchesSearch) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && repair.status !== statusFilter) {
            return false;
        }

        return true;
    });

    // Sort repairs
    const sortedRepairs = [...filteredRepairs].sort((a, b) => {
        switch (sortOption) {
            case 'newest':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'dueDate':
                const aDate = a.promiseDate || a.dueDate;
                const bDate = b.promiseDate || b.dueDate;
                if (!aDate && !bDate) return 0;
                if (!aDate) return 1;
                if (!bDate) return -1;
                return new Date(aDate) - new Date(bDate);
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });

    const getStatusColor = (status) => {
        const colorMap = {
            'receiving': 'info',
            'needs-parts': 'warning',
            'parts-ordered': 'info', 
            'ready-for-work': 'primary',
            'in-progress': 'warning',
            'quality-control': 'secondary',
            'ready-for-pickup': 'primary'
        };
        return colorMap[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labelMap = {
            'receiving': 'Receiving',
            'needs-parts': 'Needs Parts',
            'parts-ordered': 'Parts Ordered',
            'ready-for-work': 'Ready for Work',
            'in-progress': 'In Progress',
            'quality-control': 'Quality Control',
            'ready-for-pickup': 'Ready for Pickup'
        };
        return labelMap[status] || status;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const handleViewRepair = (repairId) => {
        router.push(`/dashboard/repairs/${repairId}`);
    };

    const handleCreateRepair = () => {
        router.push('/dashboard/repairs/new');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Loading current repairs...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: isMobile ? 2 : 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Dashboard
                </Link>
                <Link 
                    underline="hover" 
                    color="inherit" 
                    onClick={() => router.push('/dashboard/repairs')} 
                    sx={{ cursor: 'pointer' }}
                >
                    Repairs
                </Link>
                <Typography color="text.primary">Current Repairs</Typography>
            </Breadcrumbs>

            {/* Header */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3,
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 2 : 0
            }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClockIcon />
                        Current Repairs
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        All active repairs (any status except completed/picked up)
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateRepair}
                    size={isMobile ? "medium" : "large"}
                >
                    Create New Repair
                </Button>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                {currentRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Repairs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                                {currentRepairs.filter(r => r.status === 'in-progress').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                In Progress
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {currentRepairs.filter(r => r.status === 'ready-for-pickup').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ready for Pickup
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FilterIcon />
                        Search & Filter
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search repairs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3} md={2}>
                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Current</MenuItem>
                                    <MenuItem value="receiving">Receiving</MenuItem>
                                    <MenuItem value="needs-parts">Needs Parts</MenuItem>
                                    <MenuItem value="parts-ordered">Parts Ordered</MenuItem>
                                    <MenuItem value="ready-for-work">Ready for Work</MenuItem>
                                    <MenuItem value="in-progress">In Progress</MenuItem>
                                    <MenuItem value="quality-control">Quality Control</MenuItem>
                                    <MenuItem value="ready-for-pickup">Ready for Pickup</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3} md={2}>
                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                <InputLabel>Sort By</InputLabel>
                                <Select
                                    value={sortOption}
                                    label="Sort By"
                                    onChange={(e) => setSortOption(e.target.value)}
                                >
                                    <MenuItem value="newest">Newest First</MenuItem>
                                    <MenuItem value="oldest">Oldest First</MenuItem>
                                    <MenuItem value="dueDate">Due Date</MenuItem>
                                    <MenuItem value="status">Status</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Results */}
            {sortedRepairs.length === 0 ? (
                <Card>
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <RepairIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {currentRepairs.length === 0 ? 'No active repairs found' : 'No repairs match your search'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {currentRepairs.length === 0 
                                ? 'All your repairs are completed or you haven\'t submitted any yet'
                                : 'Try adjusting your search criteria or filters'
                            }
                        </Typography>
                        {currentRepairs.length === 0 && (
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleCreateRepair}
                            >
                                Create New Repair
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={2}>
                    {sortedRepairs.map((repair) => (
                        <Grid item xs={12} sm={6} lg={4} key={repair._id}>
                            <Card 
                                elevation={2}
                                sx={{ 
                                    height: '100%',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        elevation: 4,
                                        transform: 'translateY(-2px)'
                                    }
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'flex-start',
                                        mb: 2
                                    }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            Repair #{repair.repairID || repair.repairNumber}
                                        </Typography>
                                        <Chip 
                                            label={getStatusLabel(repair.status)} 
                                            color={getStatusColor(repair.status)}
                                            size="small"
                                        />
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Client:</strong> {repair.clientName || `${repair.clientFirstName || ''} ${repair.clientLastName || ''}`.trim()}
                                    </Typography>
                                    
                                    <Typography 
                                        variant="body2" 
                                        color="text.secondary" 
                                        sx={{ 
                                            mb: 1,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <strong>Item:</strong> {repair.description || repair.repairDescription || repair.itemDescription || 'No description'}
                                    </Typography>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Submitted:</strong> {formatDate(repair.createdAt)}
                                    </Typography>
                                    
                                    {(repair.promiseDate || repair.dueDate) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            <strong>Promise Date:</strong> {formatDate(repair.promiseDate || repair.dueDate)}
                                        </Typography>
                                    )}
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            startIcon={<ViewIcon />}
                                            onClick={() => handleViewRepair(repair.repairID || repair._id)}
                                        >
                                            View Details
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default CurrentRepairsPage;