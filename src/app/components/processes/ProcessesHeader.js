import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

/**
 * ProcessesHeader Component
 * Header section with title and add button
 */
export const ProcessesHeader = ({ onAddNew }) => {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h5" component="h1">
        Repair Processes
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddNew}
      >
        Add Process
      </Button>
    </Box>
  );
};
