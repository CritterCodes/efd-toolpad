import React from 'react';
import { Box, Typography } from '@mui/material';
import { STATUS_DESCRIPTIONS } from '../constants';

const MoveSummary = ({ repairCount, status }) => {
    if (repairCount === 0 || !status) {
        return null;
    }

    return (
        <Box sx={{ 
            p: 2, 
            mb: 3, 
            backgroundColor: '#e3f2fd', 
            borderRadius: '8px', 
            border: '1px solid #2196f3' 
        }}>
            <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                Move Summary
            </Typography>
            <Typography variant="body1">
                Moving <strong>{repairCount} repair{repairCount !== 1 ? 's' : ''}</strong> to <strong>{status}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {STATUS_DESCRIPTIONS[status]}
            </Typography>
        </Box>
    );
};

export default MoveSummary;
