import React from 'react';
import Image from 'next/image';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Stack
} from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';

const getStatusColor = (status) => {
    const colorMap = {
        'RECEIVING': 'info',
        'NEEDS PARTS': 'warning',
        'PARTS ORDERED': 'info',
        'READY FOR WORK': 'primary',
        'IN PROGRESS': 'warning',
        'QUALITY CONTROL': 'secondary',
        'READY FOR PICK-UP': 'success',
        'COMPLETED': 'success',
        'PENDING PICKUP': 'warning',
        'PICKUP REQUESTED': 'info',
    };
    return colorMap[status] || 'default';
};

const getStatusLabel = (status) => {
    const labelMap = {
        'RECEIVING': 'Receiving',
        'NEEDS PARTS': 'Needs Parts',
        'PARTS ORDERED': 'Parts Ordered',
        'READY FOR WORK': 'Ready for Work',
        'IN PROGRESS': 'In Progress',
        'QUALITY CONTROL': 'Quality Control',
        'READY FOR PICK-UP': 'Ready for Pickup',
        'COMPLETED': 'Completed',
        'PENDING PICKUP': 'Pending Pickup',
        'PICKUP REQUESTED': 'Pickup Requested',
    };
    return labelMap[status] || status;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};

const RepairCard = ({ repair, onClick, actions, sx = {} }) => {
    return (
        <Card
            elevation={2}
            sx={{
                height: '100%',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-2px)'
                },
                ...sx
            }}
            onClick={onClick}
        >
            {repair.picture && (
                <Box sx={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden' }}>
                    <Image
                        src={repair.picture}
                        alt="Repair Item"
                        fill
                        style={{ objectFit: 'cover' }}
                    />
                </Box>
            )}

            <CardContent>
                {/* Header: Repair ID + Status + Rush */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                        {repair.repairID}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                        {repair.isRush && (
                            <Chip
                                icon={<PriorityHighIcon />}
                                label="RUSH"
                                color="error"
                                size="small"
                                sx={{ fontSize: '0.7rem', height: 24 }}
                            />
                        )}
                        <Chip
                            label={getStatusLabel(repair.status)}
                            color={getStatusColor(repair.status)}
                            size="small"
                        />
                    </Box>
                </Box>

                {/* Client Name */}
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {repair.clientName}
                </Typography>

                {/* Business Name (wholesale) */}
                {repair.businessName && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        {repair.businessName}
                    </Typography>
                )}

                {/* Description */}
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
                    {repair.description || 'No description'}
                </Typography>

                {/* Dates */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    <strong>Submitted:</strong> {formatDate(repair.createdAt)}
                </Typography>

                {repair.promiseDate && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Promise Date:</strong> {formatDate(repair.promiseDate)}
                    </Typography>
                )}

                {/* Task count */}
                {repair.tasks && repair.tasks.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        {repair.tasks.length} task{repair.tasks.length !== 1 ? 's' : ''}
                    </Typography>
                )}

                {/* Total cost */}
                {repair.totalCost > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Total:</strong> ${parseFloat(repair.totalCost).toFixed(2)}
                    </Typography>
                )}

                {/* Actions */}
                {actions && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                        {actions}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

export default RepairCard;
