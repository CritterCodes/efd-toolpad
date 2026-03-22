import React from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, TextField, Box, IconButton } from '@mui/material';
import { Diamond as DiamondIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export function MaterialsSection({ formData, updateNestedField, handleItemChange, editMode }) {
  const parseCost = (value) => parseFloat(value.replace(/[$,]/g, '')) || 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader title="Materials" avatar={<DiamondIcon color="primary" />} />
      <CardContent>
        {/* Centerstone */}
        <Typography variant="h6" gutterBottom>Centerstone</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={8}>
            <TextField
              fullWidth label="Centerstone Description" size="small"
              value={formData.centerstone.item}
              onChange={(e) => updateNestedField('centerstone', 'item', e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth label="Cost" type="number" size="small" InputProps={{ startAdornment: '$' }}
              value={formData.centerstone.cost}
              onChange={(e) => updateNestedField('centerstone', 'cost', parseCost(e.target.value))}
            />
          </Grid>
        </Grid>

        {/* Mounting */}
        <Typography variant="h6" gutterBottom>Mounting</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={8}>
            <TextField
              fullWidth label="Mounting Description" size="small"
              value={formData.mounting.item}
              onChange={(e) => updateNestedField('mounting', 'item', e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              fullWidth label="Cost" type="number" size="small" InputProps={{ startAdornment: '$' }}
              value={formData.mounting.cost}
              onChange={(e) => updateNestedField('mounting', 'cost', parseCost(e.target.value))}
            />
          </Grid>
        </Grid>

        {/* Accent Stones */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h6">Accent Stones</Typography>
          {editMode && (
            <IconButton size="small" onClick={() => handleItemChange('accentStones', 'ADD', { newItem: { description: '', cost: 0, quantity: 1 } })}>
              <AddIcon />
            </IconButton>
          )}
        </Box>
        {formData.accentStones.map((stone, index) => (
          <Grid container spacing={2} key={index} sx={{ mb: 1, alignItems: 'center' }}>
            <Grid item xs={6}>
              <TextField
                fullWidth label="Description" size="small"
                value={stone.description}
                onChange={(e) => handleItemChange('accentStones', 'UPDATE', { index, key: 'description', value: e.target.value })}
              />
            </Grid>
            <Grid item xs={2}>
              <TextField
                fullWidth label="Qty" type="number" size="small"
                value={stone.quantity}
                onChange={(e) => handleItemChange('accentStones', 'UPDATE', { index, key: 'quantity', value: parseInt(e.target.value) || 1 })}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth label="Cost" type="number" size="small" InputProps={{ startAdornment: '$' }}
                value={stone.cost}
                onChange={(e) => handleItemChange('accentStones', 'UPDATE', { index, key: 'cost', value: parseCost(e.target.value) })}
              />
            </Grid>
            <Grid item xs={1}>
              {editMode && (
                <IconButton size="small" onClick={() => handleItemChange('accentStones', 'REMOVE', { index })}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
        ))}
      </CardContent>
    </Card>
  );
}

export default MaterialsSection;