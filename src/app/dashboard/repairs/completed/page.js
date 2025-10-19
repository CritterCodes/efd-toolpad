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
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Collapse
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    CheckCircle as CompletedIcon,
    Build as RepairIcon,
    Visibility as ViewIcon,
    FilterList as FilterIcon,
    Download as DownloadIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const CompletedRepairsPage = () => {
    const { data: session } = useSession();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [repairs, setRepairs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [expandedRows, setExpandedRows] = useState(new Set());

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

    // Filter completed repairs
    const completedRepairs = repairs.filter(repair => 
        ['completed', 'picked-up'].includes(repair.status)
    );

    // Apply search and filters
    const filteredRepairs = completedRepairs.filter(repair => {
        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                repair.repairNumber?.toLowerCase().includes(searchLower) ||
                repair.clientFirstName?.toLowerCase().includes(searchLower) ||
                repair.clientLastName?.toLowerCase().includes(searchLower) ||
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
                return new Date(b.completedDate || b.updatedAt) - new Date(a.completedDate || a.updatedAt);
            case 'oldest':
                return new Date(a.completedDate || a.updatedAt) - new Date(b.completedDate || b.updatedAt);
            case 'submittedDate':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });

    const getStatusColor = (status) => {
        const colorMap = {
            'completed': 'success',
            'picked-up': 'primary',
            'delivered': 'success'
        };
        return colorMap[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labelMap = {
            'completed': 'Completed',
            'picked-up': 'Picked Up',
            'delivered': 'Delivered'
        };
        return labelMap[status] || status;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        if (!amount || amount === 0) return 'N/A';
        return `$${parseFloat(amount).toFixed(2)}`;
    };

    const handleViewRepair = (repairId) => {
        router.push(`/dashboard/repairs/${repairId}`);
    };

    const handleCreateRepair = () => {
        router.push('/dashboard/repairs/new');
    };

    const toggleRowExpansion = (repairId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(repairId)) {
            newExpanded.delete(repairId);
        } else {
            newExpanded.add(repairId);
        }
        setExpandedRows(newExpanded);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <Typography>Loading completed repairs...</Typography>
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
                <Typography color="text.primary">Completed Repairs</Typography>
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
                        <CompletedIcon />
                        Completed Repairs
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        View your completed and picked up repairs
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
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {completedRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Completed
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {completedRepairs.filter(r => r.status === 'completed').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ready for Pickup
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                {completedRepairs.filter(r => r.status === 'picked-up').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Picked Up
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
                                    <MenuItem value="all">All Completed</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                    <MenuItem value="picked-up">Picked Up</MenuItem>
                                    <MenuItem value="delivered">Delivered</MenuItem>
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
                                    <MenuItem value="newest">Completed Date (Newest)</MenuItem>
                                    <MenuItem value="oldest">Completed Date (Oldest)</MenuItem>
                                    <MenuItem value="submittedDate">Submitted Date</MenuItem>
                                    <MenuItem value="status">Status</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={12} md={4}>
                            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                                <InputLabel>View Mode</InputLabel>
                                <Select
                                    value={viewMode}
                                    label="View Mode"
                                    onChange={(e) => setViewMode(e.target.value)}
                                >
                                    <MenuItem value="cards">Card View</MenuItem>
                                    <MenuItem value="table">Table View</MenuItem>
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
                        <CompletedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            {completedRepairs.length === 0 ? 'No completed repairs yet' : 'No repairs match your search'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {completedRepairs.length === 0 
                                ? 'Complete some repairs to see them here'
                                : 'Try adjusting your search criteria or filters'
                            }
                        </Typography>
                        {completedRepairs.length === 0 && (
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
            ) : viewMode === 'cards' ? (
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
                                            Repair #{repair.repairNumber}
                                        </Typography>
                                        <Chip 
                                            label={getStatusLabel(repair.status)} 
                                            color={getStatusColor(repair.status)}
                                            size="small"
                                        />
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Client:</strong> {repair.clientFirstName} {repair.clientLastName}
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
                                        <strong>Item:</strong> {repair.repairDescription || repair.itemDescription || 'No description'}
                                    </Typography>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Submitted:</strong> {formatDate(repair.createdAt)}
                                    </Typography>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Completed:</strong> {formatDate(repair.completedDate || repair.updatedAt)}
                                    </Typography>
                                    
                                    {repair.totalCost && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            <strong>Total Cost:</strong> {formatCurrency(repair.totalCost)}
                                        </Typography>
                                    )}
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            startIcon={<ViewIcon />}
                                            onClick={() => handleViewRepair(repair._id)}
                                        >
                                            View Details
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                /* Table View */
                <TableContainer component={Paper}>
                    <Table size={isMobile ? "small" : "medium"}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Repair #</TableCell>
                                <TableCell>Client</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Submitted</TableCell>
                                <TableCell>Completed</TableCell>
                                {!isMobile && <TableCell>Total Cost</TableCell>}
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedRepairs.map((repair) => (
                                <React.Fragment key={repair._id}>
                                    <TableRow>
                                        <TableCell>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                #{repair.repairNumber}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {repair.clientFirstName} {repair.clientLastName}
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={getStatusLabel(repair.status)} 
                                                color={getStatusColor(repair.status)}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                        <TableCell>{formatDate(repair.completedDate || repair.updatedAt)}</TableCell>
                                        {!isMobile && (
                                            <TableCell>{formatCurrency(repair.totalCost)}</TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewRepair(repair._id)}
                                                    title="View Details"
                                                >
                                                    <ViewIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleRowExpansion(repair._id)}
                                                    title="Show Details"
                                                >
                                                    {expandedRows.has(repair._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                                            <Collapse in={expandedRows.has(repair._id)} timeout="auto" unmountOnExit>
                                                <Box sx={{ margin: 1 }}>
                                                    <Typography variant="h6" gutterBottom component="div">
                                                        Repair Details
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        <strong>Item Description:</strong> {repair.repairDescription || repair.itemDescription || 'No description'}
                                                    </Typography>
                                                    {repair.notes && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                            <strong>Notes:</strong> {repair.notes}
                                                        </Typography>
                                                    )}
                                                    {isMobile && repair.totalCost && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                            <strong>Total Cost:</strong> {formatCurrency(repair.totalCost)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default CompletedRepairsPage;