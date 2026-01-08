/**
 * MaterialForm Component  
 * Form for material general information only
 */

import * as React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Autocomplete
} from '@mui/material';

export default function MaterialFormSimple({ formData, setFormData }) {
  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Predefined options for autocomplete
  const unitTypeOptions = [
    'application', 'sheet', 'spool', 'stick', 'jar', 'tube', 'bottle', 
    'wire', 'piece', 'gram', 'ounce', 'pound', 'inch', 'foot', 'yard', 
    'hour', 'set'
  ];

  const portionTypeOptions = [
    'piece', 'inch', 'foot', 'gram', 'cut', 'segment'
  ];

  const handleAutocompleteChange = (field) => (event, newValue) => {
    setFormData(prev => ({ ...prev, [field]: newValue || '' }));
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <strong>General Information</strong>
      </Box>
      
      <Grid container spacing={2}>
        {/* Basic Info */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Material Name"
            value={formData.name || ''}
            onChange={handleChange('name')}
            placeholder="e.g., Hard Solder Sheet"
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Display Name"
            value={formData.displayName || ''}
            onChange={handleChange('displayName')}
            placeholder="e.g., Hard Solder Sheet"
          />
        </Grid>

        {/* Category */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category || ''}
              label="Category"
              onChange={handleChange('category')}
            >
              <MenuItem value="solder">Solder</MenuItem>
              <MenuItem value="sheet">Sheet</MenuItem>
              <MenuItem value="wire">Wire</MenuItem>
              <MenuItem value="tube">Tube</MenuItem>
              <MenuItem value="casting">Casting</MenuItem>
              <MenuItem value="findings">Findings</MenuItem>
              <MenuItem value="tools">Tools</MenuItem>
              <MenuItem value="consumables">Consumables</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Unit Type */}
        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={unitTypeOptions}
            freeSolo
            value={formData.unitType || ''}
            onChange={handleAutocompleteChange('unitType')}
            onInputChange={(event, newInputValue) => {
              setFormData(prev => ({ ...prev, unitType: newInputValue }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Unit Type"
                placeholder="Select or type custom unit type..."
                fullWidth
              />
            )}
          />
        </Grid>

        {/* Portions */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Portions Per Unit"
            value={formData.portionsPerUnit || 1}
            onChange={handleChange('portionsPerUnit')}
            inputProps={{ min: 1, step: 1 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Autocomplete
            options={portionTypeOptions}
            freeSolo
            value={formData.portionType || 'piece'}
            onChange={handleAutocompleteChange('portionType')}
            onInputChange={(event, newInputValue) => {
              setFormData(prev => ({ ...prev, portionType: newInputValue || 'piece' }));
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Portion Type"
                placeholder="Select or type custom portion type..."
                fullWidth
              />
            )}
          />
        </Grid>

        {/* Description */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={formData.description || ''}
            onChange={handleChange('description')}
            placeholder="Describe the material and its uses..."
          />
        </Grid>

        {/* Supplier */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Supplier"
            value={formData.supplier || 'Stuller'}
            onChange={handleChange('supplier')}
          />
        </Grid>

        {/* Unit Cost - Only show for non-metal dependent materials */}
        {!formData.isMetalDependent && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Base Unit Cost"
              value={formData.unitCost || ''}
              onChange={handleChange('unitCost')}
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0.00"
              helperText="Base cost per unit (used when no Stuller products available)"
            />
          </Grid>
        )}

        {/* Metal Type Dependency Toggle */}
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(formData.isMetalDependent)}
                onChange={handleChange('isMetalDependent')}
                color="primary"
              />
            }
            label="Metal Type Dependent"
            sx={{ mt: 1 }}
          />
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>
            {formData.isMetalDependent ? 
              'This material requires specific metal types (e.g., 14k gold solder)' : 
              'This material works with any metal type (e.g., rhodium plating)'}
          </Box>
        </Grid>

        {/* Status */}
        <Grid item xs={12} sm={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive !== false}
                onChange={handleChange('isActive')}
                color="primary"
              />
            }
            label="Active Material"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
