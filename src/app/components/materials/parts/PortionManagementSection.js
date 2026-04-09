import React from 'react';
import { Grid, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Box, FormGroup, FormControlLabel, Switch, IconButton, Button, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';


export const PortionManagementSection = (props) => {
    const { formData, setFormData, isVariantMode, loadingStuller, onFetchStullerData, MATERIAL_CATEGORIES, calculateRetailMargin, handlePortionChange, handleRemovePortion, handleAddPortion, PORTION_UNITS } = props;
    return (
        <>
{/* Portion Management Section */}
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ mt: 2, mb: 1, color: 'primary.main' }}>
          Portion Management
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure how this material is divided into usable portions (e.g., clips from a sheet, sizes from a stick)
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          type="number"
          label="Portions per Unit"
          value={formData.portionsPerUnit}
          onChange={(e) => setFormData({ ...formData, portionsPerUnit: Math.max(1, parseInt(e.target.value) || 1) })}
          inputProps={{
            min: 1,
            step: 1
          }}
          helperText="How many portions in one unit?"
        />
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth>
          <InputLabel>Portion Type</InputLabel>
          <Select
            value={formData.portionType}
            label="Portion Type"
            onChange={(e) => setFormData({ ...formData, portionType: e.target.value })}
          >
            {PORTION_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Cost per Portion"
          value={`$${formData.costPerPortion.toFixed(4)}`}
          InputProps={{
            readOnly: true
          }}
          helperText="Auto-calculated"
          sx={{
            '& .MuiInputBase-input': {
              backgroundColor: 'action.hover',
              color: 'text.secondary'
            }
          }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Compatible Metals</InputLabel>
          <Select
            multiple
            value={formData.compatibleMetals || []}
            label="Compatible Metals"
            onChange={(e) => setFormData({ ...formData, compatibleMetals: e.target.value })}
            disabled={isVariantMode}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const metal = METAL_OPTIONS.find(m => m.value === value);
                  return (
                    <Chip key={value} label={metal?.label || value} size="small" />
                  );
                })}
              </Box>
            )}
          >
            {METAL_OPTIONS.map((metal) => (
              <MenuItem key={metal.value} value={metal.value}>
                {metal.label}
              </MenuItem>
            ))}
          </Select>
          {isVariantMode && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Compatible metals are managed per variant
            </Typography>
          )}
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Supplier"
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </Grid>
    
        </>
    );
};
