import React from 'react';
import { Box, Typography, Chip, Alert } from '@mui/material';

export function TaskListHeader({ 
  processedCount, 
  totalCount, 
  stats, 
  currentDisplayName 
}) {
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Tasks ({processedCount} of {totalCount})
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={`Compatible: ${stats?.compatible || 0}`} 
            color="success" 
            variant="outlined" 
          />
          <Chip 
            label={`Incompatible: ${stats?.incompatible || 0}`} 
            color="warning" 
            variant="outlined" 
          />
        </Box>
      </Box>

      {currentDisplayName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Viewing tasks for <strong>{currentDisplayName}</strong>
        </Alert>
      )}
    </>
  );
}
