import React from 'react';
import { useAdminSettings } from '@/context/AdminSettingsContext';
import {
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Button,
  Autocomplete,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  PROCESS_CATEGORIES,
  SKILL_LEVELS,
  METAL_TYPES,
  KARAT_OPTIONS,
  getKaratOptionsForMetal,
  formatCategoryDisplay,
  formatMetalTypeDisplay
} from '@/utils/processes.util';
import pricingEngine from '@/services/PricingEngine';

/**
 * ProcessForm Component
 * Form for creating and editing processes
 */
export const ProcessForm = ({
  formData,
  setFormData,
  availableMaterials = [],
  editingProcess = null
}) => {
  const { adminSettings } = useAdminSettings();
  const [materialLines, setMaterialLines] = React.useState([]);

  // Add a new material line
  const handleAddMaterialLine = () => {
    const newLine = {
      id: Date.now(),
      material: null,
      quantity: ''
    };
    setMaterialLines(prev => [...prev, newLine]);
  };

  // Remove a material line
  const handleRemoveMaterialLine = (lineId) => {
    setMaterialLines(prev => prev.filter(line => line.id !== lineId));
    // Also remove from formData.materials if it was added
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material.lineId !== lineId)
    }));
  };

  // Update material selection for a line
  const handleMaterialSelect = (lineId, material) => {
    setMaterialLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, material } : line
    ));
  };

  // Update quantity for a line
  const handleQuantityChange = (lineId, quantity) => {
    setMaterialLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, quantity } : line
    ));
    
    // Update formData if both material and quantity exist
    const line = materialLines.find(l => l.id === lineId);
    if (line?.material && quantity) {
      const numQuantity = parseFloat(quantity);
      if (!isNaN(numQuantity) && numQuantity > 0) {
        updateFormDataMaterial(lineId, line.material, numQuantity);
      }
    }
  };

  // Update formData.materials with the material from a line
  const updateFormDataMaterial = (lineId, selectedMaterial, quantity) => {
    if (!selectedMaterial || !quantity) return;

    // Calculate base cost per portion using the new migrated structure
    const portionsPerUnit = selectedMaterial.portionsPerUnit || 1;
    let baseCostPerPortion = 0;
    
    // For universal materials (not metal dependent)
    if (!selectedMaterial.isMetalDependent) {
      // First check for migrated costPerPortion in stullerProducts
      if (selectedMaterial.stullerProducts && selectedMaterial.stullerProducts.length > 0) {
        const firstProduct = selectedMaterial.stullerProducts[0];
        if (firstProduct.costPerPortion !== undefined) {
          baseCostPerPortion = firstProduct.costPerPortion;
        } else {
          // Fallback to calculating from stullerPrice
          baseCostPerPortion = (firstProduct.stullerPrice || 0) / portionsPerUnit;
        }
      }
      // Fallback to unitCost calculation if no stullerProducts
      else if (selectedMaterial.unitCost && selectedMaterial.unitCost > 0) {
        baseCostPerPortion = selectedMaterial.unitCost / portionsPerUnit;
      }
    }
    // For metal-dependent materials
    else if (selectedMaterial.stullerProducts && selectedMaterial.stullerProducts.length > 0) {
      // Use the lowest costPerPortion if available (from migration)
      const costPerPortions = selectedMaterial.stullerProducts
        .map(p => p.costPerPortion)
        .filter(cost => cost !== undefined && cost > 0);
      
      if (costPerPortions.length > 0) {
        baseCostPerPortion = Math.min(...costPerPortions);
      } else {
        // Fallback to calculating from stullerPrice (old structure)
        const stullerPrices = selectedMaterial.stullerProducts
          .map(p => p.stullerPrice || 0)
          .filter(price => price > 0);
        if (stullerPrices.length > 0) {
          baseCostPerPortion = Math.min(...stullerPrices) / portionsPerUnit;
        }
      }
    }
    // Legacy fallback for variant-based materials
    else if (selectedMaterial.variants && selectedMaterial.variants.length > 0) {
      const baseVariant = selectedMaterial.variants[0];
      baseCostPerPortion = baseVariant.price / portionsPerUnit;
    }
    
    const baseTotalCost = baseCostPerPortion * quantity;
    
    const newMaterial = {
      lineId: lineId,
      materialId: selectedMaterial._id,
      materialName: selectedMaterial.displayName,
      materialSku: selectedMaterial.sku,
      quantity: quantity,
      unit: selectedMaterial.portionType || 'portion',
      
      // Include Stuller products for metal-dependent materials
      stullerProducts: selectedMaterial.stullerProducts || [],
      
      // Base cost calculations (will be adjusted per metal type during pricing)
      portionsPerUnit: portionsPerUnit,
      baseCostPerPortion: baseCostPerPortion,
      estimatedCost: baseTotalCost,
      
      // Material properties for metal dependency calculation
      isMetalDependent: selectedMaterial.isMetalDependent || false,
      metalTypes: selectedMaterial.metalTypes || []
    };

    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.lineId !== lineId).concat(newMaterial)
    }));
  };

  // Calculate cost preview
  const getCostPreview = () => {
    if (!formData.laborHours || !formData.skillLevel || !adminSettings) {
      return null;
    }

    try {
      const costBreakdown = pricingEngine.calculateProcessCost(formData, adminSettings);
      return costBreakdown;
    } catch (error) {
      console.error("PricingEngine Error:", error);
      return null;
    }
  };

  const costPreview = getCostPreview();

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      {/* Basic Information */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Process Name"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          helperText="Descriptive name for this repair process"
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
            {PROCESS_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {formatCategoryDisplay(category)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Skill Level</InputLabel>
          <Select
            value={formData.skillLevel}
            label="Skill Level"
            onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
          >
            {SKILL_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label} ({level.multiplier}x)
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
          label="Labor Hours"
          value={formData.laborHours}
          onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
          inputProps={{ min: 0.01, step: 0.01, max: 8 }}
          helperText="Time required in hours (e.g., 1.5 for 1 hour 30 minutes)"
        />
      </Grid>

      {/* Materials Required */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Materials Required for Process
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add materials that are consumed during this process. Leave empty if no materials are required (labor-only process).
        </Typography>
        
        {/* Add Material Button */}
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddMaterialLine}
            size="small"
          >
            Add Material
          </Button>
        </Box>

        {/* Material Lines */}
        {materialLines.map((line, index) => (
          <Box 
            key={line.id} 
            sx={{ 
              mb: 2, 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              bgcolor: 'grey.50'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={availableMaterials}
                  getOptionLabel={(option) => `${option.displayName} (${option.sku})`}
                  value={line.material}
                  onChange={(event, newValue) => handleMaterialSelect(line.id, newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Material"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                      <li key={key} {...otherProps}>
                        <Box>
                          <Typography variant="body2">
                            {option.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {option.sku} | {option.variants?.length || 0} variants
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                />
              </Grid>
              <Grid item xs={8} md={4}>
                <TextField
                  size="small"
                  label="Quantity"
                  type="number"
                  value={line.quantity}
                  onChange={(e) => handleQuantityChange(line.id, e.target.value)}
                  inputProps={{ min: 0.01, step: 0.01 }}
                  helperText={line.material ? `per ${line.material.portionType || 'portion'}` : ''}
                />
              </Grid>
              <Grid item xs={4} md={2}>
                <IconButton 
                  size="small" 
                  color="error"
                  onClick={() => handleRemoveMaterialLine(line.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
            
            {/* Show variant info when material is selected */}
            {line.material && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="caption" color="primary.main">
                  {!line.material.isMetalDependent ? (
                    '✓ Universal material - works with all metal types'
                  ) : line.material.stullerProducts?.length > 0 ? (
                    `✓ All metal type variants will be included (${line.material.stullerProducts.length} variants available)`
                  ) : (
                    '✓ Material selected'
                  )}
                </Typography>
              </Box>
            )}
          </Box>
        ))}

        {/* Current Materials List */}
        {formData.materials.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Added Materials:
            </Typography>
            <List dense>
              {formData.materials.map((material, index) => (
                <ListItem key={index} divider sx={{ bgcolor: 'success.50' }}>
                  <ListItemText
                    primary={`${material.materialName} (${material.materialSku})`}
                    secondary={
                      <React.Fragment>
                        <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.875rem' }}>
                          {material.quantity} {material.unit}${material.quantity !== 1 ? 's' : ''} - Base Est. Cost: ${material.estimatedCost?.toFixed(2) || '0.00'}
                        </Box>
                        {material.isMetalDependent === false ? (
                          <Box component="span" sx={{ display: 'block', color: 'secondary.main', fontSize: '0.75rem' }}>
                            Universal Material (works with all metal types)
                          </Box>
                        ) : material.stullerProducts && material.stullerProducts.length > 0 ? (
                          <Box component="span" sx={{ display: 'block', color: 'primary.main', fontSize: '0.75rem' }}>
                            All variants included: {material.stullerProducts.map(p => `${p.metalType || 'Unknown'} ${p.karat || ''}`.trim()).join(', ')}
                          </Box>
                        ) : (
                          <Box component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem' }}>
                            Metal-dependent material
                          </Box>
                        )}
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Grid>

      {/* Description */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          helperText="Optional detailed description of this process"
        />
      </Grid>

      {/* Cost Preview - Moved to Bottom */}
      <Grid item xs={12}>
        {costPreview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Process Cost Preview
            </Typography>
            
            {/* Universal Process Cost */}
            {!costPreview.isMetalDependent && costPreview.universal && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Universal Process
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Labor: {formData.laborHours}hrs × ${costPreview.universal.hourlyRate?.toFixed(2) || '0'}/hr ({formData.skillLevel} rate) = ${costPreview.universal.laborCost?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Materials: ${costPreview.universal.materialsCost?.toFixed(2) || '0.00'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Total: ${costPreview.universal.totalCost?.toFixed(2) || '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Metal-Dependent Process Costs - Card Grid */}
            {costPreview.isMetalDependent && costPreview.metalPrices && (
              <Box>
                {/* Base Labor Info */}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Base Labor:</strong> {formData.laborHours}hrs × ${costPreview.summary?.baseHourlyRate || 0}/hr ({formData.skillLevel} rate)
                    <br />
                    Metal variants found in materials: {costPreview.relevantVariantLabels?.join(', ') || 'none'}
                  </Typography>
                </Alert>
                
                {/* Metal Type Cards Grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: 2,
                  mt: 2 
                }}>
                  {Object.entries(costPreview.metalPrices).map(([variantKey, prices]) => (
                    <Card key={variantKey} elevation={2}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {prices.metalLabel}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Materials Total: <strong>${prices.materialsCost?.toFixed(2) || '0.00'}</strong>
                          </Typography>
                          
                          {/* Show individual material costs if available */}
                          {prices.materialBreakdown && (
                            <Box sx={{ ml: 1, mt: 1 }}>
                              {prices.materialBreakdown.map((item, idx) => (
                                <Typography key={idx} variant="caption" display="block" color="text.secondary">
                                  • {item.name}: {item.quantity} × ${item.unitPrice?.toFixed(2)} = ${item.total?.toFixed(2)}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </Box>

                        <Divider sx={{ my: 1 }} />
                        
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          Total: ${prices.totalCost?.toFixed(2) || '0.00'}
                        </Typography>
                        
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          (Materials + ${prices.laborCost?.toFixed(2) || '0.00'} labor{prices.metalComplexity !== 1.0 ? ` ×${prices.metalComplexity}` : ''})
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Grid>
    </Grid>
  );
};
