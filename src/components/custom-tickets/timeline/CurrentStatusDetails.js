import React from 'react';
import {
  Box,
  Typography,
  Chip
} from '@mui/material';

export function CurrentStatusDetails({ clientDisplay, statusInfo }) {
  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Current Status
      </Typography>
      <Typography variant="body1" fontWeight="medium">
        {clientDisplay.label}
      </Typography>
      {statusInfo?.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {statusInfo.description}
        </Typography>
      )}
      {statusInfo?.requiresAction && (
        <Chip 
          label="Action Required" 
          size="small" 
          color="warning" 
          sx={{ mt: 1 }}
        />
      )}
    </Box>
  );
}
