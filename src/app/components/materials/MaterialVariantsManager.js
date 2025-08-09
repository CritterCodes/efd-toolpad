/**
 * Material Variants Manager Component
 * Handles creation, editing, and management of material variants
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { METAL_OPTIONS, KARAT_OPTIONS } from '@/utils/materials.util';

export function MaterialVariantsManager({ 
  material, 
  onUpdate,
  disabled = false 
}) {
  const [editingVariant, setEditingVariant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    metalType: '',
    karat: '',
    sku: '',
    unitCost: 0,
    stullerProductId: '',
    compatibleMetals: [],
    isActive: true,
    notes: ''
  });

  // Get available karats based on selected metal type
  const getAvailableKarats = (metalType) => {
    return KARAT_OPTIONS[metalType] || [{ value: 'na', label: 'N/A' }];
  };

  /**
   * Handle adding new variant
   */
  const handleAddVariant = () => {
    setVariantFormData({
      metalType: '',
      karat: '',
      sku: '',
      unitCost: 0,
      stullerProductId: '',
      compatibleMetals: [],
      isActive: true,
      notes: ''
    });
    setShowAddDialog(true);
  };

  /**
   * Handle editing existing variant
   */
  const handleEditVariant = (index) => {
    const variant = material.variants[index];
    setVariantFormData({ ...variant });
    setEditingVariant(index);
    setShowAddDialog(true);
  };

  /**
   * Handle saving variant (add or edit)
   */
  const handleSaveVariant = () => {
    const updatedMaterial = { ...material };
    
    if (editingVariant !== null) {
      // Update existing variant
      updatedMaterial.variants[editingVariant] = {
        ...variantFormData,
        lastUpdated: new Date()
      };
    } else {
      // Add new variant
      updatedMaterial.variants.push({
        ...variantFormData,
        lastUpdated: new Date()
      });
    }
    
    onUpdate(updatedMaterial);
    handleCloseDialog();
  };

  /**
   * Handle deleting variant
   */
  const handleDeleteVariant = (index) => {
    const updatedMaterial = { ...material };
    updatedMaterial.variants.splice(index, 1);
    onUpdate(updatedMaterial);
  };

  /**
   * Handle closing dialog
   */
  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingVariant(null);
    setVariantFormData({
      metalType: '',
      karat: '',
      sku: '',
      unitCost: 0,
      stullerProductId: '',
      compatibleMetals: [],
      isActive: true,
      notes: ''
    });
  };

  /**
   * Toggle variant active status
   */
  const handleToggleVariantActive = (index) => {
    const updatedMaterial = { ...material };
    updatedMaterial.variants[index].isActive = !updatedMaterial.variants[index].isActive;
    updatedMaterial.variants[index].lastUpdated = new Date();
    onUpdate(updatedMaterial);
  };

  /**
   * Convert to single material (remove variants)
   */
  const handleConvertToSingle = () => {
    if (material.variants.length > 1) {
      alert('Cannot convert to single material with multiple variants. Please remove extra variants first.');
      return;
    }
    
    const variant = material.variants[0];
    const updatedMaterial = {
      ...material,
      hasVariants: false,
      variants: [],
      unitCost: variant.unitCost,
      sku: variant.sku,
      stullerProductId: variant.stullerProductId,
      metalType: variant.metalType,
      karat: variant.karat,
      compatibleMetals: variant.compatibleMetals
    };
    
    onUpdate(updatedMaterial);
  };

  /**
   * Validate variant form
   */
  const isValidVariant = () => {
    return (
      variantFormData.metalType &&
      variantFormData.karat &&
      variantFormData.unitCost >= 0
    );
  };

  /**
   * Check for duplicate variants
   */
  const isDuplicateVariant = () => {
    return material.variants.some((variant, index) => 
      index !== editingVariant &&
      variant.metalType === variantFormData.metalType &&
      variant.karat === variantFormData.karat
    );
  };

  if (!material.hasVariants) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Material Variants</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                const updatedMaterial = {
                  ...material,
                  hasVariants: true,
                  variants: [{
                    metalType: material.metalType || 'other',
                    karat: material.karat || 'na',
                    sku: material.sku || '',
                    unitCost: material.unitCost || 0,
                    stullerProductId: material.stullerProductId || '',
                    compatibleMetals: material.compatibleMetals || [],
                    isActive: true,
                    lastUpdated: new Date(),
                    notes: ''
                  }],
                  // Clear legacy fields
                  unitCost: null,
                  sku: null,
                  stullerProductId: null,
                  metalType: null,
                  karat: null
                };
                onUpdate(updatedMaterial);
              }}
              disabled={disabled}
            >
              Enable Variants
            </Button>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            This material currently uses the single-material format. 
            Enable variants to support multiple metal types and karats for the same material.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Material Variants ({material.variants.length})
            </Typography>
            <Box>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddVariant}
                disabled={disabled}
                sx={{ mr: 1 }}
              >
                Add Variant
              </Button>
              {material.variants.length <= 1 && (
                <Button
                  startIcon={<WarningIcon />}
                  onClick={handleConvertToSingle}
                  disabled={disabled}
                  color="warning"
                  size="small"
                >
                  Convert to Single
                </Button>
              )}
            </Box>
          </Box>

          {material.variants.length === 0 ? (
            <Alert severity="warning">
              No variants defined. Add at least one variant or convert to single material format.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metal Type</TableCell>
                    <TableCell>Karat</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Unit Cost</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {material.variants.map((variant, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip 
                          label={variant.metalType.toUpperCase()} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{variant.karat.toUpperCase()}</TableCell>
                      <TableCell>{variant.sku || 'N/A'}</TableCell>
                      <TableCell>${variant.unitCost.toFixed(2)}</TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={variant.isActive}
                              onChange={() => handleToggleVariantActive(index)}
                              disabled={disabled}
                              size="small"
                            />
                          }
                          label={variant.isActive ? 'Active' : 'Inactive'}
                        />
                      </TableCell>
                      <TableCell>
                        {variant.lastUpdated ? 
                          new Date(variant.lastUpdated).toLocaleDateString() : 
                          'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Edit Variant">
                            <IconButton
                              size="small"
                              onClick={() => handleEditVariant(index)}
                              disabled={disabled}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Variant">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteVariant(index)}
                              disabled={disabled || material.variants.length <= 1}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Variant Dialog */}
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
                      karat: '', // Reset karat when metal type changes
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
    </>
  );
}

export default MaterialVariantsManager;
