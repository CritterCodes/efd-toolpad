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

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const metalLabel = (key) => key
  .split('_')
  .map((w) => (/^\d+k$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
  .join(' ');

/**
 * The process's cost, by THE engine (services/pricing/taskPricing.js processPricing): labor is its hours
 * × the shop wage — there are no skill rates — plus its materials for each metal they're stocked in.
 * `costPreview` is { pricing, pricingMessage }; no pricing means it can't be priced, and why.
 */
export const CostPreview = ({ costPreview, formData }) => {
  if (!costPreview) return null;
  const { pricing, pricingMessage } = costPreview;

  return (
    <Grid item xs={12}>
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Process Cost Preview
        </Typography>

        {!pricing && (
          <Alert severity="warning">{pricingMessage || "Can't price this process."}</Alert>
        )}

        {pricing && !pricing.isMetalDependent && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Universal Process
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Labor: {formData.laborHours}hrs = {money(pricing.laborCost)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Materials: {money(pricing.materialsCost)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Cost: {money(pricing.totalCost)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Retail {money(pricing.retailPrice)} · Wholesale {money(pricing.wholesalePrice)}
              </Typography>
            </CardContent>
          </Card>
        )}

        {pricing && pricing.isMetalDependent && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Labor:</strong> {formData.laborHours}hrs = {money(pricing.laborCost)}, plus materials for each metal
                they&apos;re stocked in. A metal with no stock isn&apos;t shown — it can&apos;t be priced.
              </Typography>
            </Alert>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 2, mt: 2 }}>
              {Object.keys(pricing.totalCost).map((key) => (
                <Card key={key} elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                      {metalLabel(key)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Materials Cost (COG): <strong>{money(pricing.materialsCost[key])}</strong>
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      Cost: {money(pricing.totalCost[key])}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Retail {money(pricing.retailPrice[key])} · Wholesale {money(pricing.wholesalePrice[key])}
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
