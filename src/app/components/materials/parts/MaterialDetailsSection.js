import React from 'react';
import { Grid, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Box, FormGroup, FormControlLabel, Switch, IconButton, Button, Tooltip } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';


export const MaterialDetailsSection = (props) => {
    const { formData, setFormData, isVariantMode, loadingStuller, onFetchStullerData, MATERIAL_CATEGORIES, calculateRetailMargin, handlePortionChange, handleRemovePortion, handleAddPortion, PORTION_UNITS } = props;
    return (
        <>
{/* Material Details Section */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Material Details
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Display Name"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          helperText="User-friendly name for this material"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="SKU Preview"
          value={generatePreviewSku(formData.displayName, formData.category)}
          disabled
          helperText="Auto-generated when saved"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            label="Category"
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {MATERIAL_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {formatCategoryDisplay(category)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Unit Type</InputLabel>
          <Select
            value={formData.unitType}
            label="Unit Type"
            onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
          >
            {UNIT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {formatUnitTypeDisplay(type)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      
        </>
    );
};
