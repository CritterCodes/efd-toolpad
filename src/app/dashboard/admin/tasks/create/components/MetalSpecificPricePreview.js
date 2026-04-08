'use client';
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import CalculateIcon from '@mui/icons-material/Calculate';
export function MetalSpecificPricePreview({ 
  pricesByMetal, 
  formData,
  setFormData
}) {
  if (!pricesByMetal || Object.keys(pricesByMetal).length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Price Preview by Metal Type
          </Typography>
          <Alert severity="info">
            Select processes to see pricing preview for each metal type
          </Alert>
        </CardContent>
      </Card>
    );
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
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Price Preview by Metal Type
        </Typography>

        {hasMultipleMetals ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pricing varies by metal type. Use the task markup on each card to push an individual variant up without forcing a flat minimum.
            </Typography>

            <Grid container spacing={2}>
              {metalEntries.map(([metalKey, pricing]) => (
                <Grid item xs={12} md={6} lg={4} key={metalKey}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      border: '2px solid',
                      borderColor: 'primary.light',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {pricing.metalLabel || metalKey}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      Labor: <strong>{pricing.totalLaborHours || 0}h</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Labor Cost: <strong>${pricing.laborCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Material Cost: <strong>${pricing.baseMaterialCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Task Markup: <strong>{pricing.variantRetailMultiplier || 1}x</strong>
                    </Typography>

                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Variant Markup"
                      value={formData?.variantPricingAdjustments?.[metalKey]?.retailMultiplier ?? 1}
                      onChange={(e) => updateVariantMarkup(metalKey, e.target.value)}
                      inputProps={{ min: 0.1, step: 0.05 }}
                      sx={{ mt: 1.5 }}
                      helperText="1.00 = no change, 1.20 = 20% increase"
                    />
                    
                    <Box sx={{ 
                      mt: 1, 
                      pt: 1, 
                      borderTop: '1px solid', 
                      borderColor: 'divider' 
                    }}>
                      <Typography variant="h6" color="success.main">
                        Retail: <strong>${pricing.retailPrice || 0}</strong>
                      </Typography>
                      <Typography variant="body2" color="info.main">
                        Wholesale: <strong>${pricing.wholesalePrice || 0}</strong>
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Price Range Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Price Range Summary:
              </Typography>
              {(() => {
                const retailPrices = metalEntries.map(([_, pricing]) => pricing.retailPrice || 0);
                const minRetail = Math.min(...retailPrices);
                const maxRetail = Math.max(...retailPrices);
                
                const wholesalePrices = metalEntries.map(([_, pricing]) => pricing.wholesalePrice || 0);
                const minWholesale = Math.min(...wholesalePrices);
                const maxWholesale = Math.max(...wholesalePrices);
                
                return (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Retail: <strong>${minRetail} - ${maxRetail}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Wholesale: <strong>${minWholesale} - ${maxWholesale}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                );
              })()}
            </Box>
          </>
        ) : (
          // Single metal type or universal pricing
          <Grid container spacing={2}>
            {metalEntries.map(([metalKey, pricing]) => (
              <Grid item xs={12} key={metalKey}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {pricing.metalLabel || 'Universal Pricing'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Labor: <strong>{pricing.totalLaborHours || 0} hours</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Labor Cost: <strong>${pricing.laborCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Material Cost: <strong>${pricing.baseMaterialCost || 0}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Base Cost: <strong>${pricing.baseCost || 0}</strong>
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      Retail Price: <strong>${pricing.retailPrice || 0}</strong>
                    </Typography>
                    <Typography variant="body1" color="info.main">
                      Wholesale Price: <strong>${pricing.wholesalePrice || 0}</strong>
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {hasMultipleMetals 
              ? "Each card can carry its own task markup multiplier, so higher-risk or higher-value variants can be priced up directly."
              : "This task works universally with automatic pricing adjustments based on your configured cost inputs."
            }
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
}

