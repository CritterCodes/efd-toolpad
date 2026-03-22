import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

const RepairsStatsCards = ({ currentRepairsCount, inProgressCount, readyForPickupCount }) => {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                            {currentRepairsCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Active Repairs
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                            {inProgressCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            In Progress
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            {readyForPickupCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ready for Pickup
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
};

export default RepairsStatsCards;