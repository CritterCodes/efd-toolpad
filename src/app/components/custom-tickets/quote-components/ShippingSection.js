import React from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, TextField, Button, IconButton } from '@mui/material';
import { LocalShipping as ShippingIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export function ShippingSection({ formData, handleItemChange, editMode }) {
  const parseCost = (value) => parseFloat(value.replace(/[$,]/g, '')) || 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Shipping Costs" 
        avatar={<ShippingIcon color="primary" />}
        action={
          editMode && (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => handleItemChange('shippingCosts', 'ADD', { newItem: { description: '', cost: 0 } })} 
              startIcon={<AddIcon />}
            >
              Add Shipping
            </Button>
          )
        }
      />
      <CardContent>
        {formData.shippingCosts.map((shipping, index) => (
          <Grid container spacing={2} key={index} alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={7}>
              <TextField
                fullWidth size="small" label="Description" placeholder="e.g., Supplier shipping, Client delivery"
                value={shipping.description}
                onChange={(e) => handleItemChange('shippingCosts', 'UPDATE', { index, key: 'description', value: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth size="small" label="Cost" type="number" InputProps={{ startAdornment: '$' }}
                value={shipping.cost}
                onChange={(e) => handleItemChange('shippingCosts', 'UPDATE', { index, key: 'cost', value: parseCost(e.target.value) })}
              />
            </Grid>
            <Grid item xs={1}>
              {editMode && (
                <IconButton size="small" onClick={() => handleItemChange('shippingCosts', 'REMOVE', { index })}>
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
        ))}
        {formData.shippingCosts.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            No shipping costs added. Click "Add Shipping" to add supplier or delivery costs.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default ShippingSection;