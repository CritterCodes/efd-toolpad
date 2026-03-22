import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Box,
    Typography,
    Chip,
    Button
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency } from './utils';

export const CompletedRepairsGrid = ({ repairs, handleViewRepair }) => {
    return (
        <Grid container spacing={2}>
            {repairs.map((repair) => (
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
    );
};
