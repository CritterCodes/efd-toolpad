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

const REPAIR_UI = {
    bgCard: '#171A1F',
    bgPanel: '#15181D',
    border: '#2A2F38',
    textPrimary: '#E6E8EB',
    textHeader: '#D1D5DB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    accent: '#D4AF37',
    shadow: '0 8px 24px rgba(0,0,0,0.45)'
};

const getStatusColor = (status) => {
    const colorMap = {
        'RECEIVING': '#D4AF37',
        'NEEDS PARTS': '#9CA3AF',
        'PARTS ORDERED': '#9CA3AF',
        'READY FOR WORK': '#D4AF37',
        'IN PROGRESS': '#D4AF37',
        'QC': '#E6E8EB',
        'READY FOR PICKUP': '#D4AF37',
        'READY FOR PICK-UP': '#D4AF37',
        'COMPLETED': '#9CA3AF',
        'DELIVERY BATCHED': '#9CA3AF',
        'PAID_CLOSED': '#9CA3AF',
        'PENDING PICKUP': '#9CA3AF',
        'PICKUP REQUESTED': '#9CA3AF',
    };
    return colorMap[status] || REPAIR_UI.textMuted;
};

const getStatusLabel = (status) => {
    const labelMap = {
        'RECEIVING': 'Receiving',
        'NEEDS PARTS': 'Needs Parts',
        'PARTS ORDERED': 'Parts Ordered',
        'READY FOR WORK': 'Ready for Work',
        'IN PROGRESS': 'In Progress',
        'QC': 'QC',
        'READY FOR PICKUP': 'Ready for Pickup',
        'READY FOR PICK-UP': 'Ready for Pickup',
        'COMPLETED': 'Completed',
        'DELIVERY BATCHED': 'Delivery Batched',
        'PAID_CLOSED': 'Paid / Closed',
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
            sx={{
                height: '100%',
                cursor: onClick ? 'pointer' : 'default',
                backgroundColor: REPAIR_UI.bgCard,
                color: REPAIR_UI.textPrimary,
                border: `1px solid ${REPAIR_UI.border}`,
                boxShadow: REPAIR_UI.shadow,
                backgroundImage: 'none',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: '0 12px 28px rgba(0,0,0,0.5)',
                    transform: 'translateY(-2px)'
                },
                ...sx
            }}
            onClick={onClick}
        >
            {repair.picture && (
                <Box sx={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', borderBottom: `1px solid ${REPAIR_UI.border}` }}>
                    <Image
                        src={repair.picture}
                        alt="Repair Item"
                        fill
                        style={{ objectFit: 'cover' }}
                    />
                </Box>
            )}

            <CardContent sx={{ p: 2.25 }}>
                {/* Header: Repair ID + Status + Rush */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: REPAIR_UI.textHeader }}>
                        {repair.repairID}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                        {repair.isRush && (
                            <Chip
                                icon={<PriorityHighIcon />}
                                label="RUSH"
                                size="small"
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 24,
                                    backgroundColor: REPAIR_UI.bgPanel,
                                    color: REPAIR_UI.textPrimary,
                                    border: `1px solid ${REPAIR_UI.border}`,
                                    '& .MuiChip-icon': {
                                        color: REPAIR_UI.accent
                                    }
                                }}
                            />
                        )}
                        <Chip
                            label={getStatusLabel(repair.status)}
                            size="small"
                            sx={{
                                backgroundColor: REPAIR_UI.bgPanel,
                                color: REPAIR_UI.textPrimary,
                                border: `1px solid ${REPAIR_UI.border}`,
                                '& .MuiChip-label': {
                                    px: 1
                                },
                                '&::before': {
                                    content: '""',
                                    display: 'inline-block',
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    backgroundColor: getStatusColor(repair.status),
                                    marginLeft: 8,
                                    marginRight: -2
                                }
                            }}
                        />
                    </Box>
                </Box>

                {/* Client Name */}
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: REPAIR_UI.textPrimary }}>
                    {repair.clientName}
                </Typography>

                {/* Business Name (wholesale) */}
                {repair.businessName && (
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: REPAIR_UI.textSecondary }}>
                        {repair.businessName}
                    </Typography>
                )}

                {/* Description */}
                <Typography
                    variant="body2"
                    sx={{
                        mb: 1,
                        color: REPAIR_UI.textSecondary,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {repair.description || 'No description'}
                </Typography>

                {/* Dates */}
                <Typography variant="body2" sx={{ mb: 0.5, color: REPAIR_UI.textSecondary }}>
                    <Box component="span" sx={{ color: REPAIR_UI.textMuted, mr: 0.5 }}>Submitted:</Box>
                    {formatDate(repair.createdAt)}
                </Typography>

                {repair.promiseDate && (
                    <Typography variant="body2" sx={{ mb: 0.5, color: REPAIR_UI.textSecondary }}>
                        <Box component="span" sx={{ color: REPAIR_UI.textMuted, mr: 0.5 }}>Promise Date:</Box>
                        {formatDate(repair.promiseDate)}
                    </Typography>
                )}

                {/* Task count */}
                {repair.tasks && repair.tasks.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, color: REPAIR_UI.textMuted }}>
                        {repair.tasks.length} task{repair.tasks.length !== 1 ? 's' : ''}
                    </Typography>
                )}

                {/* Total cost */}
                {repair.totalCost > 0 && (
                    <Typography variant="body2" sx={{ mb: 0.5, color: REPAIR_UI.textPrimary, fontWeight: 600 }}>
                        <Box component="span" sx={{ color: REPAIR_UI.textMuted, mr: 0.5, fontWeight: 400 }}>Total:</Box>
                        ${parseFloat(repair.totalCost).toFixed(2)}
                    </Typography>
                )}

                {/* Actions */}
                {actions && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${REPAIR_UI.border}` }}>
                        {actions}
                    </Stack>
                )}
            </CardContent>
        </Card>
    );
};

export default RepairCard;
