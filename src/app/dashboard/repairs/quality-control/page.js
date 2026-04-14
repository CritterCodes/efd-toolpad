"use client";
import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Grid,
    Alert,
    Breadcrumbs, 
    Link,
    Snackbar
} from '@mui/material';
import {
    VerifiedUser as QcIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import RepairCard from '@/components/business/repairs/RepairCard';

export default function QualityControlPage() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const { repairs } = useRepairs();
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    if (authStatus === 'loading') return null;
    if (!session?.user || session.user.role !== 'admin') {
        router.push('/dashboard');
        return null;
    }
    
    const qcRepairs = repairs?.filter(repair => repair.status === 'QUALITY CONTROL') || [];
    
    const handleSnackbarClose = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
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
                    <Grid item xs={12} md={6} lg={4} key={repair._id || repair.repairID}>
                        <RepairCard
                            repair={repair}
                            actions={
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
                            }
                        />
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
