/**
 * MaterialForm Component
 * Form for creating and editing materials
 */

import * as React from 'react';
import {
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  MATERIAL_CATEGORIES,
  UNIT_TYPES,
  PORTION_TYPES,
  KARAT_OPTIONS,
  METAL_OPTIONS,
  formatCategoryDisplay,
  formatUnitTypeDisplay
} from '@/utils/materials.util';
import materialsService from '@/services/materials.service';

export default function MaterialForm({
  formData,
  setFormData,
  onFetchStullerData,
  loadingStuller = false,
  isEditing = false,
  isVariantMode = false
}) {
  // Generate preview SKU based on category and display name
  const generatePreviewSku = React.useCallback((displayName, category) => {
    return materialsService.generatePreviewSku(displayName, category);
  }, []);

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Stuller Integration Section */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Stuller Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isVariantMode 
            ? 'Enter a Stuller item number to find related products across different karats and metals'
            : 'Enter Stuller item number to auto-populate material data'
          }
        </Typography>
      </Grid>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          label="Stuller Item Number"
          value={formData.stuller_item_number || ''}
          onChange={(e) => setFormData({ ...formData, stuller_item_number: e.target.value })}
          helperText={isVariantMode 
            ? "Will search for related products to create variants"
            : "Enter Stuller item number to auto-populate material data"
          }
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <LoadingButton
          variant="outlined"
          loading={loadingStuller}
          onClick={() => onFetchStullerData(formData.stuller_item_number, isVariantMode)}
          disabled={!formData.stuller_item_number?.trim()}
          fullWidth
          sx={{ height: '56px' }}
        >
          {isVariantMode ? 'Find Variants' : 'Fetch Data'}
        </LoadingButton>
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.auto_update_pricing}
              onChange={(e) => setFormData({ ...formData, auto_update_pricing: e.target.checked })}
            />
          }
          label="Auto-update pricing from Stuller"
        />
      </Grid>

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
    </Grid>
  );
}
