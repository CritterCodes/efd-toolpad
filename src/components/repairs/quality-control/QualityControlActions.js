import React from 'react';
import { Box, Button, CircularProgress } from '@mui/material';

export default function QualityControlActions({ repair, handleStatusUpdate, isUpdating }) {
    return (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            <Button
                variant="outlined"
                color="error"
                onClick={() => handleStatusUpdate('REJECTED')}
                disabled={isUpdating}
            >
                Reject
            </Button>
            <Button
                variant="contained"
                color="success"
                onClick={() => handleStatusUpdate('APPROVED')}
                disabled={isUpdating}
            >
                {isUpdating ? <CircularProgress size={24} /> : 'Approve & Complete'}
            </Button>
        </Box>
    );
}
