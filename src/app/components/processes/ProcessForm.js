import React from 'react';
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
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  PROCESS_CATEGORIES,
  SKILL_LEVELS,
  METAL_TYPES,
  KARAT_OPTIONS,
  getKaratOptionsForMetal,
  formatCategoryDisplay,
  formatMetalTypeDisplay,
  calculateProcessCost
} from '@/utils/processes.util';

/**
 * ProcessForm Component
 * Form for creating and editing processes
 */
export const ProcessForm = ({
  formData,
  setFormData,
  availableMaterials = [],
  adminSettings = null,
  editingProcess = null
}) => {
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);
  const [materialQuantity, setMaterialQuantity] = React.useState('');

  // Handle adding material to the process
  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQuantity) return;

    console.log('🔵 ProcessForm: Adding material to process');
    console.log('🔵 ProcessForm: Selected material:', JSON.stringify(selectedMaterial, null, 2));
    
    // Use BASE PRICE to avoid double markup - same fix as in the main page
    const basePrice = selectedMaterial.pricing?.basePrice || selectedMaterial.costPerPortion || 0;
    const estimatedCost = basePrice * parseFloat(materialQuantity);
    
    console.log('🔵 ProcessForm: costPerPortion (marked up):', selectedMaterial.costPerPortion);
    console.log('🔵 ProcessForm: basePrice (no markup):', basePrice);
    console.log('🔵 ProcessForm: Using basePrice to avoid double markup');
    console.log('🔵 ProcessForm: Calculation:', basePrice, '×', materialQuantity, '=', estimatedCost);
    
    const newMaterial = {
      materialId: selectedMaterial._id,
      materialName: selectedMaterial.displayName,
      materialSku: selectedMaterial.sku,
      quantity: parseFloat(materialQuantity),
      unit: selectedMaterial.portionType || 'portion',
      estimatedCost: estimatedCost
    };

    console.log('🔵 ProcessForm: New material being added:', JSON.stringify(newMaterial, null, 2));

    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));

    // Reset form
    setSelectedMaterial(null);
    setMaterialQuantity('');
  };

  // Handle removing material from the process
  const handleRemoveMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Calculate cost preview
  const getCostPreview = () => {
    if (!formData.laborHours || !formData.skillLevel || !adminSettings) {
      return null;
    }

    const costBreakdown = calculateProcessCost(formData, adminSettings);
    return costBreakdown;
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

      {/* Metal Information */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Metal Information
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Metal Type</InputLabel>
          <Select
            value={formData.metalType}
            label="Metal Type"
            onChange={(e) => {
              const newMetalType = e.target.value;
              setFormData({ 
                ...formData, 
                metalType: newMetalType,
                // Clear karat selection when metal type changes
                karat: ''
              });
            }}
          >
            {METAL_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Karat/Purity</InputLabel>
          <Select
            value={formData.karat}
            label="Karat/Purity"
            onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
            disabled={!formData.metalType}
          >
            {getKaratOptionsForMetal(formData.metalType).map((karat) => (
              <MenuItem key={karat.value} value={karat.value}>
                {karat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Metal Complexity Multiplier"
          value={formData.metalComplexityMultiplier}
          onChange={(e) => setFormData({ ...formData, metalComplexityMultiplier: e.target.value })}
          helperText="Pricing multiplier for this metal type (1.0 = standard)"
          inputProps={{
            min: 0.1,
            max: 5.0,
            step: 0.1
          }}
        />
      </Grid>

      {/* Cost Preview */}
      <Grid item xs={12} sm={6}>
        {costPreview && (
          <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
            <Typography variant="subtitle2" gutterBottom>
              Real-Time Cost Preview
            </Typography>
            <Typography variant="body2">
              <strong>Labor:</strong> ${costPreview.laborCost.toFixed(2)} 
              <br />
              <Typography component="span" variant="caption" color="success.contrastText" sx={{ opacity: 0.8 }}>
                {formData.laborHours}hrs × ${costPreview.hourlyRate}/hr ({formData.skillLevel} rate)
              </Typography>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Materials:</strong> ${costPreview.materialsCost.toFixed(2)}
              <br />
              <Typography component="span" variant="caption" color="success.contrastText" sx={{ opacity: 0.8 }}>
                {formData.materials.length} material(s), base cost: ${costPreview.baseMaterialsCost.toFixed(2)}
                {costPreview.materialMarkup !== 1.0 && ` with ${((costPreview.materialMarkup - 1) * 100).toFixed(0)}% markup`}
              </Typography>
            </Typography>
            {costPreview.complexityMultiplier !== 1.0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Metal Complexity:</strong> ×{costPreview.complexityMultiplier}
              </Typography>
            )}
            <Divider sx={{ my: 1, bgcolor: 'success.contrastText', opacity: 0.3 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.contrastText' }}>
              Total: ${costPreview.totalCost.toFixed(2)}
            </Typography>
          </Box>
        )}
      </Grid>

      {/* Materials Required */}
      <Grid item xs={12} sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Materials Required for Process
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add materials that are consumed during this process. Leave empty if no materials are required (labor-only process).
        </Typography>
        
        {/* Add Material Form */}
        <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="end">
            <Grid item xs={12} sm={6}>
              <Autocomplete
                options={Array.isArray(availableMaterials) ? availableMaterials : []}
                getOptionLabel={(option) => `${option.displayName} (${option.sku})`}
                value={selectedMaterial}
                onChange={(event, newValue) => setSelectedMaterial(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Material"
                    variant="outlined"
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Portions Needed"
                value={materialQuantity}
                onChange={(e) => setMaterialQuantity(e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
                helperText="Number of portions"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddMaterial}
                disabled={!selectedMaterial || !materialQuantity}
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Materials List */}
        {formData.materials.length > 0 ? (
          <List dense>
            {formData.materials.map((material, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={`${material.materialName} (${material.materialSku})`}
                  secondary={`${material.quantity} ${material.unit}${material.quantity !== 1 ? 's' : ''} - Est. Cost: $${material.estimatedCost?.toFixed(2) || '0.00'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    size="small" 
                    onClick={() => handleRemoveMaterial(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No materials added - this will be a labor-only process
            </Typography>
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
    </Grid>
  );
};
