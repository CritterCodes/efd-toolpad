/**
 * MaterialsHeader Component
 * Header section with title and add button
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Button
} from '@mui/material';
import {
  Add as AddIcon
} from '@mui/icons-material';

export default function MaterialsHeader({
  onAddNew
}) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h5" component="h1">
        Repair Materials
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onAddNew}
      >
        Add Material
      </Button>
    </Box>
  );
}
