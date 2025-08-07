import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Add as AddIcon, Update as UpdateIcon } from '@mui/icons-material';

/**
 * ProcessesHeader Component
 * Header section with title and action buttons
 */
export const ProcessesHeader = ({ onAddNew, onUpdatePrices, updatingPrices = false }) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h5" component="h1">
        Repair Processes
      </Typography>
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          startIcon={<UpdateIcon />}
          onClick={onUpdatePrices}
          disabled={updatingPrices}
        >
          {updatingPrices ? 'Updating...' : 'Update Prices'}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAddNew}
        >
          Add Process
        </Button>
      </Stack>
    </Box>
  );
};
