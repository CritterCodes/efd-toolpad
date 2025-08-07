/**
 * MaterialsHeader Component
 * Header section with title and action buttons
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Update as UpdateIcon
} from '@mui/icons-material';

export default function MaterialsHeader({
  onAddNew,
  onUpdatePrices,
  updatingPrices = false
}) {
  return (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h5" component="h1">
        Repair Materials
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
          Add Material
        </Button>
      </Stack>
    </Box>
  );
}
