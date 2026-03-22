import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

export default function StatsCards({ products, filteredProducts, uniqueArtisansCount, cogDataCount }) {
    return (
        <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            Pending Review
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {products.length}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            Filtered Results
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {filteredProducts.length}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            Unique Artisans
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {uniqueArtisansCount}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            With COG Data
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {cogDataCount}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
    );
}
