"use client";
import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Grid,
    Card,
    CardContent,
    Chip,
    Alert,
    Breadcrumbs, 
    Link,
    Snackbar
} from '@mui/material';
import {
    VerifiedUser as QcIcon,
    PlayArrow as StartIcon,
    Assignment as TaskIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

export default function QualityControlPage() {
    const router = useRouter();
    const { repairs, updateRepairStatus } = useRepairs();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    
    const qcRepairs = repairs?.filter(repair => repair.status === 'quality_control') || [];
    
    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };
    
    const getStatusColor = (status) => {
        const colors = {
            'quality_control': 'warning',
            'ready_for_work': 'primary',
            'ready_for_pickup': 'success',
            'completed': 'success',
            'on_hold': 'error'
        };
        return colors[status] || 'default';
    };
    
    const getPriorityColor = (priority) => {
        const colors = {
            'high': 'error',
            'medium': 'warning',
            'low': 'success'
        };
        return colors[priority] || 'default';
    };
    
    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Breadcrumbs sx={{ mb: 2 }}>
                    <Link 
                        color="inherit" 
                        href="/dashboard/repairs"
                        sx={{ textDecoration: 'none' }}
                    >
                        Repairs
                    </Link>
                    <Typography color="textPrimary">Quality Control</Typography>
                </Breadcrumbs>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <QcIcon color="primary" sx={{ fontSize: 30 }} />
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        Quality Control
                    </Typography>
                </Box>
                
                <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                    Review completed repairs, document quality, and approve for customer pickup
                </Typography>
                
                {qcRepairs.length === 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                        No repairs currently in quality control.
                    </Alert>
                )}
            </Box>

            {/* QC Queue */}
            <Grid container spacing={3}>
                {qcRepairs.map((repair) => (
                    <Grid item xs={12} md={6} lg={4} key={repair._id}>
                        <Card sx={{ height: '100%', cursor: 'pointer' }} 
                              onClick={() => router.push(`/dashboard/repairs/quality-control/${repair._id}`)}>
                            <CardContent>
                                {/* Repair Header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h6" component="h2" fontWeight="bold" noWrap>
                                        {repair.customerInfo?.firstName} {repair.customerInfo?.lastName}
                                    </Typography>
                                    <Chip 
                                        label={repair.priority || 'medium'} 
                                        color={getPriorityColor(repair.priority)}
                                        size="small"
                                    />
                                </Box>
                                
                                {/* Order Info */}
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    Order #{repair.orderNumber} • {new Date(repair.createdAt).toLocaleDateString()}
                                </Typography>
                                
                                {/* Item Description */}
                                <Typography variant="body1" sx={{ mb: 2 }} noWrap>
                                    <strong>Item:</strong> {repair.itemDetails?.description || 'No description'}
                                </Typography>
                                
                                {/* Work Summary */}
                                {repair.tasks && repair.tasks.length > 0 && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="textSecondary">
                                            <TaskIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                            {repair.tasks.length} task{repair.tasks.length > 1 ? 's' : ''} completed
                                        </Typography>
                                    </Box>
                                )}
                                
                                {/* Status Chip */}
                                <Box sx={{ mb: 2 }}>
                                    <Chip 
                                        label="Quality Control" 
                                        color={getStatusColor(repair.status)}
                                        size="small"
                                    />
                                </Box>
                                
                                {/* Action Button */}
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<QcIcon />}
                                    fullWidth
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/dashboard/repairs/quality-control/${repair._id}`);
                                    }}
                                >
                                    Start QC Review
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            
            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleSnackbarClose} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
