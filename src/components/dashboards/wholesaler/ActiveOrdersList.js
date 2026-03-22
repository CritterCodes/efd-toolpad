import React from 'react';
import { Card, CardContent, Typography, Box, Button, Divider, Chip, CircularProgress, Alert } from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

export default function ActiveOrdersList({ repairs = [], loading, error }) {
    const router = useRouter();

    const getStatusInfo = (status) => {
        const statuses = {
            'pending_review': { label: 'Pending Review', color: 'warning' },
            'pending_approval': { label: 'Needs Approval', color: 'error' },
            'approved': { label: 'Approved', color: 'info' },
            'in_progress': { label: 'In Progress', color: 'primary' },
            'completed': { label: 'Completed', color: 'success' },
            'cancelled': { label: 'Cancelled', color: 'default' }
        };
        return statuses[status] || { label: status || 'Unknown', color: 'default' };
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold">
                        Recent Repairs
                    </Typography>
                    <Button size="small" onClick={() => router.push('/dashboard/repairs')}>
                        View All
                    </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                ) : loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : repairs && repairs.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {repairs.map((repair) => {
                            const statusInfo = getStatusInfo(repair.status);
                            return (
                                <Box 
                                    key={repair._id || repair.id} 
                                    sx={{ 
                                        p: 2, 
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            {repair.referenceNumber || `Order #${repair._id?.substring(0, 8)}`}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                            {repair.itemDescription || 'Jewelry Repair'}
                                        </Typography>
                                        <Chip 
                                            label={statusInfo.label} 
                                            size="small" 
                                            color={statusInfo.color}
                                            variant="outlined"
                                        />
                                    </Box>
                                    <Button 
                                        variant="outlined" 
                                        size="small"
                                        endIcon={<ViewIcon />}
                                        onClick={() => router.push(`/dashboard/repairs/${repair._id || repair.id}`)}
                                    >
                                        View
                                    </Button>
                                </Box>
                            );
                        })}
                    </Box>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="textSecondary" gutterBottom>
                            No recent repairs found.
                        </Typography>
                        <Button 
                            variant="text" 
                            color="primary"
                            onClick={() => router.push('/dashboard/repairs/new')}
                            sx={{ mt: 1 }}
                        >
                            Create your first repair
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
