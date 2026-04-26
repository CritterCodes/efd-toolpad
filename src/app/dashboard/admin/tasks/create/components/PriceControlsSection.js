'use client';
import React from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import LockIcon from '@mui/icons-material/Lock';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { TaskFormSection, TASK_UI } from './taskBuilderUi';

export function PriceControlsSection({ formData, setFormData, pricePreview }) {
  const calculatedPrice = pricePreview?.calculatedRetailPrice ?? pricePreview?.retailPrice ?? null;
  const calculatedWholesalePrice = pricePreview?.calculatedWholesalePrice ?? pricePreview?.wholesalePrice ?? null;
  const calculatedLaborPrice = pricePreview?.calculatedLaborCost ?? pricePreview?.laborCost ?? null;
  const minimumPrice = parseFloat(formData.minimumPrice) || 0;
  const priceOverride = parseFloat(formData.priceOverride) || 0;
  const minimumWholesalePrice = parseFloat(formData.minimumWholesalePrice) || 0;
  const minimumLaborPrice = parseFloat(formData.minimumLaborPrice) || 0;

  const handleChange = (field) => (e) => {
    const raw = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: raw === '' ? '' : raw }));
  };

  const retailFloorActive = calculatedPrice !== null && minimumPrice > 0 && calculatedPrice < minimumPrice;
  const wholesaleFloorActive = calculatedWholesalePrice !== null && minimumWholesalePrice > 0 && calculatedWholesalePrice < minimumWholesalePrice;
  const laborFloorActive = calculatedLaborPrice !== null && minimumLaborPrice > 0 && calculatedLaborPrice < minimumLaborPrice;
  const effectivePrice = (() => {
    if (priceOverride > 0) return priceOverride;
    if (minimumPrice > 0 && calculatedPrice !== null) return Math.max(calculatedPrice, minimumPrice);
    return calculatedPrice;
  })();
  const roundedEffectivePrice = pricePreview?.retailPrice ?? effectivePrice;
  const roundedWholesalePrice = pricePreview?.wholesalePrice ?? calculatedWholesalePrice;

  return (
    <Grid item xs={12}>
      <TaskFormSection title="Price Controls" subtitle="Override the calculated output when you need a floor or fixed charge.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PriceChangeIcon sx={{ color: TASK_UI.accent, fontSize: 18 }} />
          <Typography variant="body2" sx={{ color: TASK_UI.textSecondary }}>
            Use price floors sparingly. Fixed overrides take priority over every other calculation.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Minimum Price Floor" value={formData.minimumPrice ?? ''} onChange={handleChange('minimumPrice')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: TASK_UI.textSecondary }}>$</Box>, endAdornment: retailFloorActive ? <Chip icon={<ArrowUpwardIcon />} label="Active" size="small" variant="outlined" /> : null }} helperText="Raises retail when the calculated price is too low." />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Fixed Price Override" value={formData.priceOverride ?? ''} onChange={handleChange('priceOverride')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: TASK_UI.textSecondary }}>$</Box>, endAdornment: priceOverride > 0 ? <Chip icon={<LockIcon />} label="Active" size="small" variant="outlined" /> : null }} helperText="Sets an exact retail price and bypasses cost-based output." />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Minimum Wholesale Price" value={formData.minimumWholesalePrice ?? ''} onChange={handleChange('minimumWholesalePrice')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: TASK_UI.textSecondary }}>$</Box>, endAdornment: wholesaleFloorActive ? <Chip icon={<ArrowUpwardIcon />} label="Active" size="small" variant="outlined" /> : null }} helperText="Protects your wholesale floor when the calculated total drops too low." />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Minimum Labor Price" value={formData.minimumLaborPrice ?? ''} onChange={handleChange('minimumLaborPrice')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <Box component="span" sx={{ mr: 0.5, color: TASK_UI.textSecondary }}>$</Box>, endAdornment: laborFloorActive ? <Chip icon={<ArrowUpwardIcon />} label="Active" size="small" variant="outlined" /> : null }} helperText="Raises labor before final retail and wholesale prices are derived." />
          </Grid>
        </Grid>

        {priceOverride > 0 && <Alert severity="warning" sx={{ mt: 2 }}><strong>Fixed override active.</strong> Effective retail price: <strong>${priceOverride.toFixed(2)}</strong>.</Alert>}
        {minimumPrice > 0 && calculatedPrice !== null && <Alert severity={retailFloorActive ? 'warning' : 'info'} sx={{ mt: 2 }}>{retailFloorActive ? <>Retail raised from <strong>${calculatedPrice.toFixed(2)}</strong> to <strong>${minimumPrice.toFixed(2)}</strong>.</> : <>Retail already exceeds the floor at <strong>${calculatedPrice.toFixed(2)}</strong>.</>}</Alert>}
        {minimumWholesalePrice > 0 && calculatedWholesalePrice !== null && <Alert severity={wholesaleFloorActive ? 'warning' : 'info'} sx={{ mt: 2 }}>{wholesaleFloorActive ? <>Wholesale raised from <strong>${calculatedWholesalePrice.toFixed(2)}</strong> to <strong>${minimumWholesalePrice.toFixed(2)}</strong>.</> : <>Wholesale already exceeds the floor at <strong>${calculatedWholesalePrice.toFixed(2)}</strong>.</>}</Alert>}
        {minimumLaborPrice > 0 && calculatedLaborPrice !== null && <Alert severity={laborFloorActive ? 'warning' : 'info'} sx={{ mt: 2 }}>{laborFloorActive ? <>Labor raised from <strong>${calculatedLaborPrice.toFixed(2)}</strong> to <strong>${minimumLaborPrice.toFixed(2)}</strong>.</> : <>Labor already exceeds the floor at <strong>${calculatedLaborPrice.toFixed(2)}</strong>.</>}</Alert>}
        {priceOverride === 0 && minimumPrice === 0 && minimumWholesalePrice === 0 && minimumLaborPrice === 0 && roundedEffectivePrice !== null && <Alert severity="info" sx={{ mt: 2 }}>No manual controls active. Current retail: <strong>${roundedEffectivePrice.toFixed(2)}</strong>{roundedWholesalePrice !== null ? <> ? Wholesale: <strong>${roundedWholesalePrice.toFixed(2)}</strong></> : null}</Alert>}
      </TaskFormSection>
    </Grid>
  );
}
