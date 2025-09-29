/**
 * Review and Submit Step Component
 * Constitutional Architecture: Component Layer - Specialized Form Step
 * Responsibility: Handle review and submission form step
 */

"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Typography, Card, CardContent, Grid, Chip
} from '@mui/material';

export default function ReviewSubmitStep({ formData }) {
    const calculateTotalCost = () => {
        return (formData.materialsCost || 0) + (formData.laborCost || 0);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Review Ticket Details
            </Typography>
            
            <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" color="primary" gutterBottom>
                                Ticket Information
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Title
                                </Typography>
                                <Typography variant="body1">
                                    {formData.title}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Type
                                </Typography>
                                <Chip 
                                    label={formData.type?.replace('-', ' ').toUpperCase()} 
                                    size="small" 
                                    color="primary"
                                />
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Status
                                </Typography>
                                <Chip 
                                    label={formData.status} 
                                    size="small" 
                                    color="secondary"
                                />
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Description
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {formData.description}
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Client Information */}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" color="primary" gutterBottom>
                                Client Information
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Name
                                </Typography>
                                <Typography variant="body1">
                                    {formData.clientInfo.name}
                                </Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Email
                                </Typography>
                                <Typography variant="body1">
                                    {formData.clientInfo.email}
                                </Typography>
                            </Box>

                            {formData.clientInfo.phone && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Phone
                                    </Typography>
                                    <Typography variant="body1">
                                        {formData.clientInfo.phone}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Financial Information */}
                <Grid item xs={12}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" color="primary" gutterBottom>
                                Financial Information
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Labor Hours
                                        </Typography>
                                        <Typography variant="body1">
                                            {formData.laborHours || 0} hours
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={6} sm={3}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Materials Cost
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatCurrency(formData.materialsCost)}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={6} sm={3}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Labor Cost
                                        </Typography>
                                        <Typography variant="body1">
                                            {formatCurrency(formData.laborCost)}
                                        </Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={6} sm={3}>
                                    <Box>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Total Cost
                                        </Typography>
                                        <Typography variant="h6" color="primary">
                                            {formatCurrency(calculateTotalCost())}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                <Chip 
                                    label={formData.paymentReceived ? 'Payment Received' : 'Payment Pending'}
                                    color={formData.paymentReceived ? 'success' : 'warning'}
                                    size="small"
                                />
                                <Chip 
                                    label={`Card: ${formData.cardPaymentStatus}`}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>

                            {formData.paymentNotes && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        Payment Notes
                                    </Typography>
                                    <Typography variant="body2">
                                        {formData.paymentNotes}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

ReviewSubmitStep.propTypes = {
    formData: PropTypes.object.isRequired
};