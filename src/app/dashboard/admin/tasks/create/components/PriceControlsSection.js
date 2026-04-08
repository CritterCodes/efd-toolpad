'use client';
import React from 'react';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import LockIcon from '@mui/icons-material/Lock';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

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
  const roundingApplied = Boolean(pricePreview?.roundingApplied);

  return (
    <Grid item xs={12}>
      <Card sx={{ border: '2px solid', borderColor: 'warning.light', borderRadius: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PriceChangeIcon color="warning" />
            <Typography variant="h6">Price Controls</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Override the calculated price when it doesn&apos;t match what you actually charge.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Price Floor"
                value={formData.minimumPrice ?? ''}
                onChange={handleChange('minimumPrice')}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box>
                  ),
                  endAdornment: retailFloorActive ? (
                    <Chip
                      icon={<ArrowUpwardIcon />}
                      label="Active"
                      size="small"
                      color="warning"
                    />
                  ) : null
                }}
                helperText="If the calculated price falls below this, use this price instead."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Fixed Price Override"
                value={formData.priceOverride ?? ''}
                onChange={handleChange('priceOverride')}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box>
                  ),
                  endAdornment: priceOverride > 0 ? (
                    <Chip
                      icon={<LockIcon />}
                      label="Active"
                      size="small"
                      color="error"
                    />
                  ) : null
                }}
                helperText="Set an exact price — ignores the cost calculation entirely."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Wholesale Price"
                value={formData.minimumWholesalePrice ?? ''}
                onChange={handleChange('minimumWholesalePrice')}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box>
                  ),
                  endAdornment: wholesaleFloorActive ? (
                    <Chip
                      icon={<ArrowUpwardIcon />}
                      label="Active"
                      size="small"
                      color="warning"
                    />
                  ) : null
                }}
                helperText="Protect your wholesale margin when the calculated wholesale is too low."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Minimum Labor Price"
                value={formData.minimumLaborPrice ?? ''}
                onChange={handleChange('minimumLaborPrice')}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <Box component="span" sx={{ mr: 0.5, color: 'text.secondary' }}>$</Box>
                  ),
                  endAdornment: laborFloorActive ? (
                    <Chip
                      icon={<ArrowUpwardIcon />}
                      label="Active"
                      size="small"
                      color="warning"
                    />
                  ) : null
                }}
                helperText="Raises the labor portion before retail and wholesale pricing are calculated."
              />
            </Grid>

          </Grid>

          {priceOverride > 0 && (
            <Alert severity="error" icon={<LockIcon />} sx={{ mt: 2 }}>
              <strong>Fixed override active.</strong> This task will always be priced at{' '}
              <strong>${priceOverride.toFixed(2)}</strong>, regardless of material or
              process costs.
            </Alert>
          )}

          {minimumPrice > 0 && calculatedPrice !== null && (
            retailFloorActive ? (
              <Alert severity="warning" icon={<ArrowUpwardIcon />} sx={{ mt: 2 }}>
                <strong>Minimum retail price applied.</strong> Calculated retail was{' '}
                <strong>${calculatedPrice.toFixed(2)}</strong> and was raised to{' '}
                <strong>${minimumPrice.toFixed(2)}</strong>.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                Retail is already above the floor: <strong>${calculatedPrice.toFixed(2)}</strong>.
              </Alert>
            )
          )}

          {minimumWholesalePrice > 0 && calculatedWholesalePrice !== null && (
            wholesaleFloorActive ? (
              <Alert severity="warning" icon={<ArrowUpwardIcon />} sx={{ mt: 2 }}>
                <strong>Minimum wholesale price applied.</strong> Calculated wholesale was{' '}
                <strong>${calculatedWholesalePrice.toFixed(2)}</strong> and was raised to{' '}
                <strong>${minimumWholesalePrice.toFixed(2)}</strong>.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                Wholesale is already above the floor: <strong>${calculatedWholesalePrice.toFixed(2)}</strong>.
              </Alert>
            )
          )}

          {minimumLaborPrice > 0 && calculatedLaborPrice !== null && (
            laborFloorActive ? (
              <Alert severity="warning" icon={<ArrowUpwardIcon />} sx={{ mt: 2 }}>
                <strong>Minimum labor price applied.</strong> Calculated labor was{' '}
                <strong>${calculatedLaborPrice.toFixed(2)}</strong> and was raised to{' '}
                <strong>${minimumLaborPrice.toFixed(2)}</strong> before final pricing.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2 }}>
                Labor is already above the floor: <strong>${calculatedLaborPrice.toFixed(2)}</strong>.
              </Alert>
            )
          )}

          {roundedEffectivePrice !== null && (
            roundingApplied ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Retail rounding applied.</strong> Final retail was rounded from{' '}
                <strong>${(pricePreview?.retailPriceBeforeRounding ?? effectivePrice)?.toFixed(2)}</strong> to{' '}
                <strong>${roundedEffectivePrice.toFixed(2)}</strong> using the nearest $5 rule.
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                Retail rounding is always on to the nearest $5. Current retail already lands on a $0/$5 ending.
              </Alert>
            )
          )}

          {priceOverride === 0 && minimumPrice === 0 && minimumWholesalePrice === 0 && minimumLaborPrice === 0 && effectivePrice !== null && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No price controls active. Effective price:{' '}
              <strong>${roundedEffectivePrice.toFixed(2)}</strong> (fully calculated).
            </Alert>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}
