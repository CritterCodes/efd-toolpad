import React from 'react';
import {
    Card,
    CardContent,
    Box,
    Typography,
    Grid,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import {
    Person as PersonIcon,
    Schedule as ClockIcon,
    LocalOffer as PriceIcon,
    Build as WorkIcon,
    Assignment as TaskIcon
} from '@mui/icons-material';
import { calculateSubtotal, formatCurrency } from '@/services/pricingCalculation.service';
import { getAllWorkItems } from '@/services/pricingCalculation.service';

const QcRepairSummary = ({ repair }) => {
    if (!repair) return null;

    const allWorkItems = getAllWorkItems(repair);
    const subtotal = calculateSubtotal(repair);

    const getStatusColor = (status) => {
        switch (status) {
            case 'QUALITY CONTROL':
                return 'warning';
            case 'IN PROGRESS':
                return 'info';
            case 'READY FOR WORK':
                return 'primary';
            default:
                return 'default';
        }
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
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TaskIcon />
                    Repair Summary
                    <Chip 
                        label={repair.status} 
                        color={getStatusColor(repair.status)}
                        size="small" 
                    />
                </Typography>

                {/* Basic Info */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PersonIcon color="primary" />
                            <Typography variant="body2">
                                <strong>Customer:</strong> {repair.customerName || repair.clientName}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ClockIcon color="primary" />
                            <Typography variant="body2">
                                <strong>Promise Date:</strong> {formatDate(repair.promiseDate)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PriceIcon color="primary" />
                            <Typography variant="body2">
                                <strong>Total Cost:</strong> {formatCurrency(repair.totalCost || subtotal)}
                            </Typography>
                        </Box>
                        {repair.assignedJeweler && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <WorkIcon color="primary" />
                                <Typography variant="body2">
                                    <strong>Jeweler:</strong> {repair.assignedJeweler}
                                </Typography>
                            </Box>
                        )}
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Item Description */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Item Description
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                    {repair.itemDescription || repair.description || 'No description provided'}
                </Typography>

                {/* Work Items */}
                {allWorkItems.length > 0 && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TaskIcon />
                            Work Performed ({allWorkItems.length} items)
                        </Typography>
                        <List dense sx={{ mb: 2 }}>
                            {allWorkItems.slice(0, 5).map((item, index) => (
                                <ListItem key={index} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={item.name || item.taskName || item.partName}
                                        secondary={`${item.type} - ${formatCurrency(item.price)}`}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                    />
                                </ListItem>
                            ))}
                            {allWorkItems.length > 5 && (
                                <ListItem sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={`... and ${allWorkItems.length - 5} more items`}
                                        primaryTypographyProps={{ variant: 'caption', style: { fontStyle: 'italic' } }}
                                    />
                                </ListItem>
                            )}
                        </List>
                    </>
                )}

                {/* Timeline */}
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Timeline
                </Typography>
                <Box sx={{ pl: 1 }}>
                    <Typography variant="caption" display="block">
                        <strong>Received:</strong> {formatDate(repair.dateReceived)} at {formatTime(repair.dateReceived)}
                    </Typography>
                    {repair.startedAt && (
                        <Typography variant="caption" display="block">
                            <strong>Work Started:</strong> {formatDate(repair.startedAt)} at {formatTime(repair.startedAt)}
                        </Typography>
                    )}
                    {repair.movedToQcAt && (
                        <Typography variant="caption" display="block">
                            <strong>Moved to QC:</strong> {formatDate(repair.movedToQcAt)} at {formatTime(repair.movedToQcAt)}
                        </Typography>
                    )}
                </Box>

                {/* Special Instructions */}
                {(repair.specialInstructions || repair.customerNotes) && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                            Special Instructions
                        </Typography>
                        <Typography variant="body2" sx={{ p: 1, backgroundColor: 'warning.light', borderRadius: 1, alpha: 0.1 }}>
                            {repair.specialInstructions || repair.customerNotes}
                        </Typography>
                    </>
                )}

                {/* Priority/Rush */}
                {repair.priority === 'URGENT' && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Chip 
                            label="URGENT REPAIR" 
                            color="error" 
                            sx={{ fontWeight: 'bold' }}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default QcRepairSummary;
