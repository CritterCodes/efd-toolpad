import React from 'react';
import { Drawer, Box, Typography, Divider, Grid, Chip, IconButton } from '@mui/material';

export default function CADRequestDetailsDrawer({ selectedRequest, setSelectedRequest }) {
    if (!selectedRequest) return null;
    return (
        <Drawer anchor="right" open={!!selectedRequest} onClose={() => setSelectedRequest(null)}>
            <Box sx={{ width: 400, p: 3 }}>
                <Typography variant="h6">Request Details</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1">{selectedRequest.title}</Typography>
            </Box>
        </Drawer>
    );
}
