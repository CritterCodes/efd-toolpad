import React from 'react';
import { Card, CardContent, CardHeader, Grid, FormControlLabel, Switch } from '@mui/material';

export function AdditionalOptionsSection({ formData, updateField, financialSettings }) {
  return (
    <Card>
      <CardHeader title="Additional Options" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.includeCustomDesign}
                  onChange={(e) => updateField('includeCustomDesign', e.target.checked)}
                />
              }
              label={`Custom Design Fee (${financialSettings ? '$' + financialSettings.customDesignFee : '$100'})`}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRush}
                  onChange={(e) => updateField('isRush', e.target.checked)}
                />
              }
              label={`Rush Order (${financialSettings ? (financialSettings.rushMultiplier * 100 - 100).toFixed(0) : '50'}% surcharge)`}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default AdditionalOptionsSection;