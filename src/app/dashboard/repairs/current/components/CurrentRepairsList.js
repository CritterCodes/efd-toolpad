import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Button
} from '@mui/material';
import { Add as AddIcon, Build as RepairIcon, Visibility as ViewIcon } from '@mui/icons-material';

const CurrentRepairsList = ({
    repairs,
    handleCreateRepair,
    handleViewRepair,
    currentRepairsCount
}) => {
    const getStatusColor = (status) => {
        const colorMap = {
            'receiving': 'info',
            'needs-parts': 'warning',
            'parts-ordered': 'info',
            'ready-for-work': 'primary',
            'in-progress': 'warning',
            'quality-control': 'secondary',
            'ready-for-pickup': 'primary'
        };
        return colorMap[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labelMap = {
            'receiving': 'Receiving',
            'needs-parts': 'Needs Parts',
            'parts-ordered': 'Parts Ordered',
            'ready-for-work': 'Ready for Work',
            'in-progress': 'In Progress',
            'quality-control': 'Quality Control',
            'ready-for-pickup': 'Ready for Pickup'
        };
        return labelMap[status] || status;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (repairs.length === 0) {
        return (
            <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <RepairIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        {currentRepairsCount === 0 ? 'No active repairs found' : 'No repairs match your search'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {currentRepairsCount === 0
                            ? 'All your repairs are completed or you haven\'t submitted any yet'
                            : 'Try adjusting your search criteria or filters'
                        }
                    </Typography>
                    {currentRepairsCount === 0 && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleCreateRepair}
                        >
                            Create New Repair
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

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
                                    Repair #{repair.repairID || repair.repairNumber}
                                </Typography>
                                <Chip
                                    label={getStatusLabel(repair.status)}
                                    color={getStatusColor(repair.status)}
                                    size="small"
                                />
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                <strong>Client:</strong> {repair.clientName || `${repair.clientFirstName || ''} ${repair.clientLastName || ''}`.trim()}
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
                                <strong>Item:</strong> {repair.description || repair.repairDescription || repair.itemDescription || 'No description'}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                <strong>Submitted:</strong> {formatDate(repair.createdAt)}
                            </Typography>

                            {(repair.promiseDate || repair.dueDate) && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    <strong>Promise Date:</strong> {formatDate(repair.promiseDate || repair.dueDate)}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<ViewIcon />}
                                    onClick={() => handleViewRepair(repair.repairID || repair._id)}
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

export default CurrentRepairsList;