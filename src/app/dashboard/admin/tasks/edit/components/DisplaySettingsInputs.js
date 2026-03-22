import * as React from 'react';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

export default function DisplaySettingsInputs({ formData, handleNestedToggle }) {
  return (
    <>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.display.isActive}
              onChange={handleNestedToggle('display', 'isActive')}
            />
          }
          label="Active Task"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.display.isFeatured}
              onChange={handleNestedToggle('display', 'isFeatured')}
            />
          }
          label="Featured Task"
        />
      </Grid>
    </>
  );
}
