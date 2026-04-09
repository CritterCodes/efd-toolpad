import React from 'react';
import { Grid, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Box, FormGroup, FormControlLabel, Switch, IconButton, Button, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';


export const PricingFieldsSection = (props) => {
    const { formData, setFormData, isVariantMode, loadingStuller, onFetchStullerData, MATERIAL_CATEGORIES, calculateRetailMargin, handlePortionChange, handleRemovePortion, handleAddPortion, PORTION_UNITS } = props;
    return (
        <>
{/* Pricing fields - only show for single materials, not variants */}
      {!isVariantMode && (
        <>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Karat/Purity</InputLabel>
              <Select
                value={formData.karat}
                label="Karat/Purity"
                onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
              >
                {KARAT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Unit Cost"
              value={formData.unitCost}
              onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
              InputProps={{
                startAdornment: '$'
              }}
              inputProps={{
                min: 0,
                step: 0.01
              }}
            />
          </Grid>
        </>
      )}
      
      {isVariantMode && (
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Pricing and metal-specific details are managed in the Variants tab.
          </Typography>
        </Grid>
      )}
      
      
        </>
    );
};
