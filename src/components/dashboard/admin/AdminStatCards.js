import React from 'react';
import { Card, CardContent, Typography, Box, Grid } from '@mui/material';
import { Schedule as ScheduleIcon, Build as BuildIcon, CheckCircle as CheckCircleIcon, ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';

export default function AdminStatCards({ dashboardMetrics }) {
    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography color="text.secondary" gutterBottom variant="body2">
                                    Pending Receipts
                                </Typography>
                                <Typography variant="h4">
                                    {dashboardMetrics.pendingReceipts.length}
                                </Typography>
                            </Box>
                            <ScheduleIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography color="text.secondary" gutterBottom variant="body2">
                                    In Progress
                                </Typography>
                                <Typography variant="h4">
                                    {dashboardMetrics.inProgress.length}
                                </Typography>
                            </Box>
                            <BuildIcon sx={{ color: 'info.main', fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography color="text.secondary" gutterBottom variant="body2">
                                    QC Required
                                </Typography>
                                <Typography variant="h4">
                                    {dashboardMetrics.qcRequired.length}
                                </Typography>
                            </Box>
                            <CheckCircleIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography color="text.secondary" gutterBottom variant="body2">
                                    Ready for Pickup
                                </Typography>
                                <Typography variant="h4">
                                    {dashboardMetrics.readyForPickup.length}
                                </Typography>
                            </Box>
                            <ShoppingCartIcon sx={{ color: 'success.main', fontSize: 40 }} />
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}
