/**
 * MaterialsGrid Component
 * Grid layout for displaying materials cards
 */

import * as React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button
} from '@mui/material';
import {
  Add as AddIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import MaterialCard from './MaterialCard';

export default function MaterialsGrid({
  materials,
  onEdit,
  onDelete,
  onAddNew
}) {
  if (materials.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box textAlign="center" py={4}>
            <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No materials found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Get started by adding your first material
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddNew}
            >
              Add Material
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      {materials.map((material) => (
        <Grid item xs={12} sm={6} md={4} key={material._id}>
          <MaterialCard
            material={material}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </Grid>
      ))}
    </Grid>
  );
}
