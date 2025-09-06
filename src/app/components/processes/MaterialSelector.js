/**
 * MaterialSelector Component
 * Handles selecti      // For multi-variant materials, check if any variant matches the repair metal type
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        return material.stullerProducts.some(product => {
          const metalTypeMatch = product.metalType === repairMetalType;
          const karatMatch = !repairKarat || product.karat === repairKarat;
          return metalTypeMatch && karatMatch;
        });
      }

      // For legacy materials with compatible metals array
      if (material.compatibleMetals && Array.isArray(material.compatibleMetals)) {
        return material.compatibleMetals.includes(repairMetalType);
      }ls with multi-variant support and metal type compatibility
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { getMetalLabel, formatPrice } from '@/utils/materials.util';

export const MaterialSelector = ({
  availableMaterials = [],
  selectedMaterial,
  setSelectedMaterial,
  selectedVariant,
  setSelectedVariant,
  materialQuantity,
  setMaterialQuantity,
  isMetalDependent = true,
  repairMetalType = null, // Metal type from repair ticket
  repairKarat = null, // Karat from repair ticket
  hideVariantSelection = false, // New prop to hide variant selection
  showAllVariantsMessage = false, // New prop to show message about all variants
  onAddMaterial,
  disabled = false
}) => {
  // Filter materials based on process metal dependency and repair metal type
  const compatibleMaterials = useMemo(() => {
    return availableMaterials.filter(material => {
      // Universal materials (not metal dependent) are always compatible
      if (material.isMetalDependent === false) {
        return true;
      }

      // If process is not metal dependent, show universal materials only
      if (isMetalDependent === false) {
        return material.isMetalDependent === false;
      }

      // If no repair metal type specified, show all materials for metal-dependent processes
      if (!repairMetalType || repairMetalType === 'n_a') {
        return true;
      }

      // For multi-variant materials, check if any variant matches the repair metal type
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        return material.stullerProducts.some(product => {
          // If product has no metalType, it's universal and matches any repair type
          if (!product.metalType) {
            return true;
          }
          const metalTypeMatch = product.metalType === repairMetalType;
          const karatMatch = !processKarat || product.karat === processKarat;
          return metalTypeMatch && karatMatch;
        });
      }

      // Legacy compatibility - check compatibleMetals array
      if (material.compatibleMetals && material.compatibleMetals.length > 0) {
        return material.compatibleMetals.includes(processMetalType);
      }

      return true; // Default to showing material if uncertain
    });
  }, [availableMaterials, isMetalDependent, repairMetalType]);

  // Get available variants for the selected material
  const availableVariants = useMemo(() => {
    if (!selectedMaterial) return [];

    // Universal materials don't have variants
    if (selectedMaterial.isMetalDependent === false) {
      return [{
        id: 'universal',
        label: 'Universal (all metal types)',
        price: 0, // No standard price - all pricing comes from Stuller
        metalType: 'universal',
        karat: 'n/a'
      }];
    }

    // Multi-variant materials
    if (selectedMaterial.stullerProducts && selectedMaterial.stullerProducts.length > 0) {
      return selectedMaterial.stullerProducts
        .filter(product => {
          // If repair has metal type, filter to matching variants
          if (repairMetalType && repairMetalType !== 'n_a') {
            // If product has no metalType, it's universal and matches any repair type
            if (!product.metalType) {
              return true;
            }
            const metalTypeMatch = product.metalType === repairMetalType;
            const karatMatch = !repairKarat || product.karat === repairKarat;
            return metalTypeMatch && karatMatch;
          }
          return true;
        })
        .map(product => ({
          id: product.id,
          label: product.metalType ? `${getMetalLabel(product.metalType)} ${product.karat || ''}`.trim() : 'Non-metal material',
          price: product.markedUpPrice || product.unitCost || 0,
          costPerPortion: product.costPerPortion, // Use migrated costPerPortion if available
          pricePerPortion: product.pricePerPortion, // Use migrated pricePerPortion if available  
          metalType: product.metalType,
          karat: product.karat,
          stullerItemNumber: product.stullerItemNumber
        }));
    }

    // Legacy single-variant materials
    return [{
      id: 'legacy',
      label: `${getMetalLabel(repairMetalType || 'yellow_gold')} ${repairKarat || '14K'}`,
      price: selectedMaterial.unitCost || 0,
      metalType: repairMetalType || 'yellow_gold',
      karat: repairKarat || '14K'
    }];
  }, [selectedMaterial, repairMetalType, repairKarat]);

  // Calculate cost preview using accurate costPerPortion from migrated data
  const getCostPreview = () => {
    if (!selectedVariant || !materialQuantity) return null;

    const portionsPerUnit = selectedMaterial?.portionsPerUnit || 1;
    let costPerPortion;
    
    // Use migrated costPerPortion if available (most accurate)
    if (selectedVariant.costPerPortion !== undefined) {
      costPerPortion = selectedVariant.costPerPortion;
    } else {
      // Fallback to calculating from price (old method)
      costPerPortion = selectedVariant.price / portionsPerUnit;
    }
    
    const totalCost = costPerPortion * parseFloat(materialQuantity);

    return {
      costPerPortion,
      totalCost,
      portionsPerUnit
    };
  };

  const costPreview = getCostPreview();

  const handleMaterialChange = (event, newValue) => {
    setSelectedMaterial(newValue);
    setSelectedVariant(null); // Reset variant when material changes
  };

  const handleVariantChange = (event) => {
    const variantId = event.target.value;
    const variant = availableVariants.find(v => v.id === variantId);
    setSelectedVariant(variant);
  };

  return (
    <Box>
      {/* Material Selection */}
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          options={compatibleMaterials}
          getOptionLabel={(option) => `${option.displayName} (${option.sku})`}
          value={selectedMaterial}
          onChange={handleMaterialChange}
          disabled={disabled}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Material"
              variant="outlined"
              size="small"
              helperText={`${compatibleMaterials.length} compatible materials available`}
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">
                    {option.displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.sku} • {option.supplier}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {option.isMetalDependent === false && (
                    <Chip label="Universal" size="small" color="secondary" />
                  )}
                  {option.stullerProducts && option.stullerProducts.length > 0 && (
                    <Chip 
                      label={`${option.stullerProducts.length} variants`} 
                      size="small" 
                      color="primary" 
                    />
                  )}
                </Box>
              </Box>
            </li>
          )}
        />
      </Box>

      {/* Variant Selection - Only show if not hidden */}
      {!hideVariantSelection && selectedMaterial && availableVariants.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Material Variant</InputLabel>
            <Select
              value={selectedVariant?.id || ''}
              label="Material Variant"
              onChange={handleVariantChange}
              disabled={disabled || availableVariants.length === 1}
            >
              {availableVariants.map((variant) => (
                <MenuItem key={variant.id} value={variant.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{variant.label}</span>
                    <span style={{ fontWeight: 'bold', color: 'green' }}>
                      {formatPrice(variant.price)}/unit
                    </span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {availableVariants.length === 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Only one variant available for selected metal type
            </Typography>
          )}
        </Box>
      )}

      {/* All Variants Message - Show when variant selection is hidden */}
      {hideVariantSelection && selectedMaterial && showAllVariantsMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>All metal type variants will be included</strong>
            <br />
            {selectedMaterial.stullerProducts?.length > 0 ? (
              `This material has ${selectedMaterial.stullerProducts.length} variants that will all be available for use in this process.`
            ) : selectedMaterial.isMetalDependent === false ? (
              'This is a universal material that works with all metal types.'
            ) : (
              'This material will be available for all compatible metal types.'
            )}
          </Typography>
        </Alert>
      )}

      {/* Quantity Input - Show when material is selected, regardless of variant selection */}
      {selectedMaterial && (hideVariantSelection || selectedVariant) && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Portions Needed"
            value={materialQuantity}
            onChange={(e) => setMaterialQuantity(e.target.value)}
            disabled={disabled}
            inputProps={{ min: 0, step: 0.1 }}
            helperText={`Portions of ${selectedMaterial?.portionType || 'material'}`}
          />
        </Box>
      )}

      {/* Cost Preview - Only show when specific variant is selected and not hiding variants */}
      {!hideVariantSelection && costPreview && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Cost Preview:</strong> {formatPrice(costPreview.costPerPortion)} per portion × {materialQuantity} portions = <strong>{formatPrice(costPreview.totalCost)}</strong>
          </Typography>
          {selectedVariant?.stullerItemNumber && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              Stuller Item: {selectedVariant.stullerItemNumber}
            </Typography>
          )}
        </Alert>
      )}

      {/* Base Cost Preview for All Variants Mode */}
      {hideVariantSelection && selectedMaterial && materialQuantity && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Base Cost Estimate:</strong> Pricing will vary by metal type when process is used
            <br />
            {selectedMaterial.stullerProducts?.length > 0 && (
              <>Variants available: {selectedMaterial.stullerProducts.map(p => 
                p.metalType ? `${p.metalType} ${p.karat || ''}`.trim() : 'Non-metal'
              ).join(', ')}</>
            )}
          </Typography>
        </Alert>
      )}

      {/* Metal Type Compatibility Info */}
      {repairMetalType && repairMetalType !== 'n_a' ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Repair Metal Type:</strong> {getMetalLabel(repairMetalType)} {repairKarat}
            <br />
            Showing {compatibleMaterials.length} compatible materials for this metal type
          </Typography>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>No specific metal type from repair ticket</strong> - Showing {isMetalDependent === false ? 'universal' : 'all'} materials
            <br />
            Select a metal type in the process to filter materials by compatibility
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default MaterialSelector;
