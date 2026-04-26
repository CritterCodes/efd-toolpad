'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import CalculateIcon from '@mui/icons-material/Calculate';
import { TaskFormSection, TASK_UI, taskSelectionCardSx } from './taskBuilderUi';

export function MetalSpecificPricePreview({ pricesByMetal, formData, setFormData }) {
  if (!pricesByMetal || Object.keys(pricesByMetal).length === 0) {
    return null;
  }

  const metalEntries = Object.entries(pricesByMetal);
  const hasMultipleMetals = metalEntries.length > 1;
  const updateVariantMarkup = (variantKey, rawValue) => {
    setFormData((prev) => ({
      ...prev,
      variantPricingAdjustments: {
        ...(prev.variantPricingAdjustments || {}),
        [variantKey]: {
          retailMultiplier: rawValue === '' ? '' : rawValue
        }
      }
    }));
  };

  return (
    <Grid item xs={12}>
      <TaskFormSection title="Price Preview" subtitle="Review calculated output across each supported metal context.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CalculateIcon sx={{ color: TASK_UI.accent, fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>
            Variant markup lets you push selected metal contexts higher without flattening every price.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {metalEntries.map(([metalKey, pricing]) => (
            <Grid item xs={12} md={hasMultipleMetals ? 6 : 12} lg={hasMultipleMetals ? 4 : 12} key={metalKey}>
              <Box sx={taskSelectionCardSx}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: TASK_UI.textPrimary, mb: 1 }}>
                  {pricing.metalLabel || (hasMultipleMetals ? metalKey : 'Universal Pricing')}
                </Typography>
                <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>Labor: <strong>{pricing.totalLaborHours || 0}h</strong></Typography>
                <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>Labor Cost: <strong>${pricing.laborCost || 0}</strong></Typography>
                <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>Material Cost: <strong>${pricing.baseMaterialCost || 0}</strong></Typography>
                <Typography variant="body2" sx={{ color: TASK_UI.textSecondary, mb: 1.5 }}>Base Cost: <strong>${pricing.baseCost || 0}</strong></Typography>

                {hasMultipleMetals && (
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Variant Markup"
                    value={formData?.variantPricingAdjustments?.[metalKey]?.retailMultiplier ?? 1}
                    onChange={(e) => updateVariantMarkup(metalKey, e.target.value)}
                    inputProps={{ min: 0.1, step: 0.05 }}
                    helperText="1.00 = no change ? 1.20 = +20%"
                    sx={{ mb: 1.5 }}
                  />
                )}

                <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: TASK_UI.border }}>
                  <Typography variant="body2" sx={{ color: TASK_UI.textHeader, fontWeight: 700 }}>
                    Retail: ${pricing.retailPrice || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>
                    Wholesale: ${pricing.wholesalePrice || 0}
                  </Typography>
                  {pricing.roundingApplied && pricing.retailPriceBeforeRounding !== pricing.retailPrice && (
                    <Typography variant="caption" sx={{ color: TASK_UI.textMuted, display: 'block', mt: 0.5 }}>
                      Retail rounded from ${pricing.retailPriceBeforeRounding}.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {hasMultipleMetals && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Pricing spans {metalEntries.length} metal contexts. Use variant markup only where risk or complexity justifies it.
          </Alert>
        )}
      </TaskFormSection>
    </Grid>
  );
}
