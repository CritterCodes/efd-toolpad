
import React from 'react';
import { Box, Card, Typography, Chip, Grid, Button } from '@mui/material';

export default function CadDesignList({ requests, users }) {
    if (!requests?.length) return <Typography>No CAD requests found.</Typography>;
    return (
        <Grid container spacing={2}>
            {requests.map(req => (
                <Grid item xs={12} sm={6} md={4} key={req._id}>
                    <Card sx={{ p: 2 }}>
                        <Typography variant="h6">{req.title}</Typography>
                        <Typography variant="body2" color="textSecondary">{req.sku}</Typography>
                        <Box sx={{ mt: 1, mb: 1 }}>
                            <Chip label={req.status} size="small" />
                            <Chip label={req.priority} size="small" sx={{ ml: 1 }} />
                        </Box>
                        <Typography variant="body2">Designer: {users[req.designerId] || 'Unassigned'}</Typography>
                        <Button variant="outlined" sx={{ mt: 2 }} fullWidth>View Details</Button>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
