import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

export const StatsCards = ({ completedRepairs }) => {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {completedRepairs.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Completed
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                            {completedRepairs.filter(r => r.status === 'COMPLETED').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Completed
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card>
                    <CardContent>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            {completedRepairs.filter(r => r.status === 'READY FOR PICK-UP').length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Ready for Pick-Up
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
};
