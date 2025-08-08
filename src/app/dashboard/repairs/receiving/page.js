"use client";
import React, { useState } from 'react';
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
    Fab,
    Alert,
    Stack
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    MoveUp as MoveIcon,
    Print as PrintIcon,
    AccessTime as ClockIcon,
    LocalShipping as ReceivingIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

const ReceivingPage = () => {
    const { repairs } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter repairs in RECEIVING status
    const receivingRepairs = repairs.filter(repair => repair.status === 'RECEIVING');
    
    // Filter by search query
    const filteredRepairs = receivingRepairs.filter(repair => {
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
            repair.repairID?.toLowerCase().includes(searchLower) ||
            repair.customerName?.toLowerCase().includes(searchLower) ||
            repair.itemDescription?.toLowerCase().includes(searchLower) ||
            repair.phoneNumber?.includes(searchQuery)
        );
    });

    // Calculate receiving stats
    const todayReceived = receivingRepairs.filter(repair => {
        if (!repair.dateReceived) return false;
        const repairDate = new Date(repair.dateReceived).toDateString();
        const today = new Date().toDateString();
        return repairDate === today;
    });

    const urgentRepairs = receivingRepairs.filter(repair => 
        repair.priority === 'URGENT' || repair.dueDate
    );

    const handleViewRepair = (repairID) => {
        router.push(`/dashboard/repairs/details/${repairID}`);
    };

    const handleMoveRepair = (repairID) => {
        router.push(`/dashboard/repairs/move?repairID=${repairID}`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <Box sx={{ padding: '20px', position: 'relative' }}>
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
                <Typography color="text.primary">Receiving</Typography>
            </Breadcrumbs>

            <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ReceivingIcon />
                Receiving
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Items currently in the receiving area awaiting processing
            </Typography>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                                {receivingRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total in Receiving
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {todayReceived.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Received Today
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                {urgentRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Urgent/Due Date
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Stack direction="row" spacing={1} justifyContent="center">
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => router.push('/dashboard/repairs/new')}
                                    color="primary"
                                >
                                    New Repair
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<MoveIcon />}
                                    onClick={() => router.push('/dashboard/repairs/move')}
                                >
                                    Move
                                </Button>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Quick Actions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search */}
            <TextField
                fullWidth
                placeholder="Search by Repair ID, Customer Name, Item Description, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 3 }}
            />

            {/* Content */}
            {filteredRepairs.length === 0 ? (
                <Alert 
                    severity={receivingRepairs.length === 0 ? "info" : "warning"} 
                    sx={{ textAlign: 'center' }}
                >
                    {receivingRepairs.length === 0 
                        ? "No items currently in receiving! All repairs have been processed."
                        : searchQuery 
                            ? `No repairs found matching "${searchQuery}"`
                            : "No repairs found"
                    }
                </Alert>
            ) : (
                <Grid container spacing={2}>
                    {filteredRepairs.map((repair) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={repair.repairID}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    border: repair.priority === 'URGENT' ? '2px solid orange' : 'none',
                                    boxShadow: repair.dueDate ? 3 : 1,
                                    '&:hover': { boxShadow: 4 }
                                }}
                            >
                                <CardContent>
                                    {/* Header */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                                            {repair.repairID}
                                        </Typography>
                                        {repair.priority === 'URGENT' && (
                                            <Chip label="URGENT" color="warning" size="small" />
                                        )}
                                    </Box>

                                    {/* Customer Info */}
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                        {repair.customerName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {repair.phoneNumber}
                                    </Typography>

                                    {/* Item Description */}
                                    <Typography variant="body2" sx={{ mb: 1, minHeight: '20px' }}>
                                        {repair.itemDescription || 'No description'}
                                    </Typography>

                                    {/* Timing Info */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <ClockIcon sx={{ fontSize: '14px' }} />
                                            <Typography variant="caption">
                                                Received: {formatDate(repair.dateReceived)} at {formatTime(repair.dateReceived)}
                                            </Typography>
                                        </Box>
                                        {repair.dueDate && (
                                            <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                                Due: {formatDate(repair.dueDate)}
                                            </Typography>
                                        )}
                                    </Box>

                                    {/* Actions */}
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleViewRepair(repair.repairID)}
                                            sx={{ flex: 1 }}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<MoveIcon />}
                                            onClick={() => handleMoveRepair(repair.repairID)}
                                            sx={{ flex: 1 }}
                                        >
                                            Move
                                        </Button>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Floating Action Button for New Repair */}
            <Fab
                color="primary"
                aria-label="add new repair"
                sx={{ position: 'fixed', bottom: 16, right: 16 }}
                onClick={() => router.push('/dashboard/repairs/new')}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default ReceivingPage;
