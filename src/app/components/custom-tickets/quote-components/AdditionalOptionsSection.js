import React from 'react';
import { Card, CardContent, CardHeader, Grid, FormControlLabel, Switch, TextField, InputAdornment } from '@mui/material';

export function AdditionalOptionsSection({ formData, editMode = true, updateField, financialSettings }) {
  const defaultMarkup = financialSettings?.cogMarkup ?? 2.5;
  const designMarkup = financialSettings?.designFeeMarkup ?? 1.5;
  const rushPct = financialSettings ? (financialSettings.rushMultiplier * 100 - 100).toFixed(0) : '50';

  return (
    <Card>
      <CardHeader title="Additional Options" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="COG Markup (×)"
              type="number"
              fullWidth
              size="small"
              disabled={!editMode}
              value={formData.cogMarkup ?? ''}
              placeholder={String(defaultMarkup)}
              onChange={(e) => updateField('cogMarkup', e.target.value === '' ? '' : parseFloat(e.target.value))}
              helperText={`Applied to materials + labor. Default ${defaultMarkup}× from settings.`}
              inputProps={{ min: 1, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRush}
                  disabled={!editMode}
                  onChange={(e) => updateField('isRush', e.target.checked)}
                />
              }
              label={`Rush Order (${rushPct}% surcharge on COG)`}
            />
          </Grid>

          <Grid item xs={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.includeCustomDesign}
                  disabled={!editMode}
                  onChange={(e) => updateField('includeCustomDesign', e.target.checked)}
                />
              }
              label={`Custom Design Fee (×${designMarkup})`}
            />
          </Grid>
          {formData.includeCustomDesign && (
            <Grid item xs={6}>
              <TextField
                label="Designer Fee ($)"
                type="number"
                fullWidth
                size="small"
                disabled={!editMode}
                value={formData.designerFee ?? 0}
                onChange={(e) => updateField('designerFee', parseFloat(e.target.value) || 0)}
                helperText={`Charged at ×${designMarkup}. Pre-fills from the designer's account.`}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                inputProps={{ min: 0, step: 5 }}
              />
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}

export default AdditionalOptionsSection;