'use client';

import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Button,
  Autocomplete,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export const MaterialsSection = ({
  formData,
  availableMaterials,
  materialLines,
  onAddLine,
  onRemoveLine,
  onMaterialSelect,
  onQuantityChange
}) => {
  return (
    <Grid item xs={12} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Materials Required for Process
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add materials that are consumed during this process. Leave empty if no materials are required (labor-only process).
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddLine}
          size="small"
        >
          Add Material
        </Button>
      </Box>

      {materialLines.map((line) => (
        <Box 
          key={line.id} 
          sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: 'action.hover' }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={availableMaterials}
                getOptionLabel={(option) => `${option.displayName} (${option.sku || 'No SKU'})`}
                value={line.material}
                onChange={(event, newValue) => onMaterialSelect(line.id, newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Material" variant="outlined" size="small" />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li key={key} {...otherProps}>
                      <Box>
                        <Typography variant="body2">{option.displayName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          SKU: {option.sku || 'N/A'} | {option.variants?.length || 0} variants
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
                onChange={(e) => onQuantityChange(line.id, e.target.value)}
                inputProps={{ min: 0.01, step: 0.01 }}
                helperText={line.material ? `per ${line.material.portionType || 'portion'}` : ''}
              />
            </Grid>
            <Grid item xs={4} md={2}>
              <IconButton size="small" color="error" onClick={() => onRemoveLine(line.id)}>
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
          
          {line.material && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="primary.main">
                {!line.material.isMetalDependent ? 
                  '✓ Universal material - works with all metal types' : 
                  line.material.stullerProducts?.length > 0 ? 
                  `✓ All metal type variants will be included (${line.material.stullerProducts.length} variants available)` : 
                  '✓ Material selected'}
              </Typography>
            </Box>
          )}
        </Box>
      ))}

      {formData.materials?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Added Materials:
          </Typography>
          <List dense>
            {formData.materials.map((material, index) => (
              <ListItem key={index} divider sx={{ bgcolor: 'action.hover' }}>
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
  );
};
