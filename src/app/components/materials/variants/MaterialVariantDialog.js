import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { METAL_OPTIONS } from '@/utils/materials.util';

export function MaterialVariantDialog({
  showAddDialog,
  handleCloseDialog,
  editingVariant,
  variantFormData,
  setVariantFormData,
  getAvailableKarats,
  isDuplicateVariant,
  isValidVariant,
  handleSaveVariant
}) {
  return (
    <Dialog open={showAddDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingVariant !== null ? 'Edit Variant' : 'Add New Variant'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Metal Type</InputLabel>
              <Select
                value={variantFormData.metalType}
                label="Metal Type"
                onChange={(e) => {
                  setVariantFormData(prev => ({
                    ...prev,
                    metalType: e.target.value,
                    karat: '',
                    compatibleMetals: [e.target.value]
                  }));
                }}
              >
                {METAL_OPTIONS.map(metal => (
                  <MenuItem key={metal.value} value={metal.value}>
                    {metal.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6}>
            <FormControl fullWidth>
              <InputLabel>Karat</InputLabel>
              <Select
                value={variantFormData.karat}
                label="Karat"
                onChange={(e) => setVariantFormData(prev => ({ ...prev, karat: e.target.value }))}
                disabled={!variantFormData.metalType}
              >
                {getAvailableKarats(variantFormData.metalType).map(karat => (
                  <MenuItem key={karat.value} value={karat.value}>
                    {karat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="SKU"
              value={variantFormData.sku}
              onChange={(e) => setVariantFormData(prev => ({ ...prev, sku: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Unit Cost"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={variantFormData.unitCost}
              onChange={(e) => setVariantFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Stuller Product ID"
              value={variantFormData.stullerProductId}
              onChange={(e) => setVariantFormData(prev => ({ ...prev, stullerProductId: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={2}
              value={variantFormData.notes}
              onChange={(e) => setVariantFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={variantFormData.isActive}
                  onChange={(e) => setVariantFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>
        
        {isDuplicateVariant() && (
          <Alert severity="error" sx={{ mt: 2 }}>
            A variant with this metal type and karat already exists.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>
          Cancel
        </Button>
        <Button
          onClick={handleSaveVariant}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!isValidVariant() || isDuplicateVariant()}
        >
          {editingVariant !== null ? 'Update' : 'Add'} Variant
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MaterialVariantDialog;
