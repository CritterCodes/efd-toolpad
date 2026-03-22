import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  Alert,
  Autocomplete,
  TextField,
  Box,
  Chip,
  Card
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import RepairTaskItem from './RepairTaskItem';

export default function RepairMaterialsAccordion({
  expanded,
  onExpand,
  materials = [],
  compatibleMaterials = [],
  metalType,
  karat,
  getPriceDisplay,
  addMaterial,
  updateItem,
  removeItem,
  stullerSku,
  setStullerSku,
  loadingStuller,
  stullerError,
  addStullerMaterial
}) {
  return (
    <Accordion 
      expanded={expanded}
      onChange={onExpand}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>
          Materials ({materials.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          {!metalType || !karat ? (
            <Alert severity="info">
              Please select a metal type and karat above to see available materials.
            </Alert>
          ) : compatibleMaterials.length === 0 ? (
            <Alert severity="warning">
              No materials are compatible with {metalType} {karat}. You can still add Stuller materials or custom line items.
            </Alert>
          ) : (
            <Autocomplete
              options={compatibleMaterials}
              getOptionLabel={(option) => {
                const price = getPriceDisplay(option);
                const metalInfo = (option.pricing?.unitCost && typeof option.pricing.unitCost === 'object') ||
                                 (option.pricing?.costPerPortion && typeof option.pricing.costPerPortion === 'object') ? 
                                 ` (Metal-specific)` : '';
                return `${option.name} - $${price}${metalInfo}`;
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label={`Add Material (${compatibleMaterials.length} compatible with ${metalType} ${karat})`}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Typography variant="body1">
                      {option.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {option.unit} • {option.category || 'Material'}
                        {((option.pricing?.unitCost && typeof option.pricing.unitCost === 'object') ||
                          (option.pricing?.costPerPortion && typeof option.pricing.costPerPortion === 'object')) && (
                          <Chip label="Metal-specific" size="small" color="info" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${getPriceDisplay(option)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              onChange={(e, value) => value && addMaterial(value)}
            />
          )}
          
          {/* Stuller Integration Section */}
          <Card variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.main' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
              Add Stuller Gemstone/Material
            </Typography>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="Stuller SKU"
                value={stullerSku}
                onChange={(e) => setStullerSku(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addStullerMaterial()}
                placeholder="Enter Stuller item number..."
                size="small"
                sx={{ flexGrow: 1 }}
                error={!!stullerError}
                helperText={stullerError}
              />
              <LoadingButton
                onClick={addStullerMaterial}
                loading={loadingStuller}
                disabled={!stullerSku?.trim()}
                variant="contained"
                size="small"
                sx={{ minWidth: 100 }}
              >
                Add
              </LoadingButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Material will be added with markup applied. No portions logic needed for gemstones.
            </Typography>
          </Card>
          
          {materials.map(material => (
            <RepairTaskItem
              key={material.id}
              item={material}
              onQuantityChange={(qty) => updateItem('materials', material.id, 'quantity', qty)}
              onPriceChange={(price) => updateItem('materials', material.id, 'price', price)}
              onRemove={() => removeItem('materials', material.id)}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
