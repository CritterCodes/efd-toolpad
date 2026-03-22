'use client';

import React from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Alert
} from '@mui/material';

export const CostPreview = ({ costPreview, formData }) => {
  if (!costPreview) return null;

  return (
    <Grid item xs={12}>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Process Cost Preview
        </Typography>
        
        {/* Universal Process Cost */}
        {!costPreview.isMetalDependent && (costPreview.universal || costPreview.totalCost !== undefined) && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Universal Process
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Labor: {formData.laborHours}hrs × ${(costPreview.universal || costPreview).hourlyRate?.toFixed(2) || '0'}/hr ({formData.skillLevel} rate) = ${(costPreview.universal || costPreview).laborCost?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Materials: ${(costPreview.universal || costPreview).materialsCost?.toFixed(2) || '0.00'}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Total: ${(costPreview.universal || costPreview).totalCost?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Metal-Dependent Process Costs - Card Grid */}
        {costPreview.isMetalDependent && costPreview.metalPrices && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Base Labor:</strong> {formData.laborHours}hrs × ${costPreview.summary?.baseHourlyRate || 0}/hr ({formData.skillLevel} rate)
                <br />
                Metal variants found in materials: {costPreview.relevantVariantLabels?.join(', ') || 'none'}
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2, mt: 2 }}>
              {Object.entries(costPreview.metalPrices).map(([variantKey, prices]) => (
                <Card key={variantKey} elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      {prices.metalLabel}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Materials Cost (COG): <strong>${prices.materialsCost?.toFixed(2) || '0.00'}</strong>
                      </Typography>
                      
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
    </Grid>
  );
};
