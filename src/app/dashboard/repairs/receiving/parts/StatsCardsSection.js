import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Select, MenuItem } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';



export const StatsCardsSection = ({ receivingRepairs, todayReceived, urgentRepairs, sortAnchor, setSortAnchor }) => {
    return (
        <>
{/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                                {receivingRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total in Receiving
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                                {todayReceived.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Received Today
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                                {urgentRepairs.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Urgent/Due Date
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Stack direction="row" spacing={1} justifyContent="center">
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    onClick={() => router.push('/dashboard/repairs/new')}
                                    color="primary"
                                >
                                    New Repair
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<MoveIcon />}
                                    onClick={() => router.push('/dashboard/repairs/move')}
                                >
                                    Move
                                </Button>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Quick Actions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            
        </>
    );
};
