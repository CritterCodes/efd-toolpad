"use client";
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
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
    LocalShipping as ReceivingIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import RepairCard from '@/components/business/repairs/RepairCard';

const ReceivingPage = () => {
    const { data: session, status: authStatus } = useSession();
    const { repairs } = useRepairs();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    if (authStatus === 'loading') return null;
    if (!session?.user || session.user.role !== 'admin') {
        router.push('/dashboard');
        return null;
    }

    // Filter repairs in RECEIVING status
    const receivingRepairs = repairs.filter(repair => repair.status === 'RECEIVING');
    
    // Filter by search query
    const filteredRepairs = receivingRepairs.filter(repair => {
        if (!searchQuery) return true;
        
        const searchLower = searchQuery.toLowerCase();
        return (
            repair.repairID?.toLowerCase().includes(searchLower) ||
            repair.clientName?.toLowerCase().includes(searchLower) ||
            repair.description?.toLowerCase().includes(searchLower) ||
            repair.businessName?.toLowerCase().includes(searchLower)
        );
    });

    // Calculate receiving stats
    const todayReceived = receivingRepairs.filter(repair => {
        if (!repair.createdAt) return false;
        const repairDate = new Date(repair.createdAt).toDateString();
        const today = new Date().toDateString();
        return repairDate === today;
    });

    const urgentRepairs = receivingRepairs.filter(repair => 
        repair.isRush || repair.promiseDate
    );

    const handleViewRepair = (repairID) => {
        router.push(`/dashboard/repairs/${repairID}`);
    };

    const handleMoveRepair = (repairID) => {
        router.push(`/dashboard/repairs/move?repairID=${repairID}`);
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
                placeholder="Search by Repair ID, Client Name, or Description..."
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
                            <RepairCard
                                repair={repair}
                                actions={
                                    <>
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
                                    </>
                                }
                            />
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
