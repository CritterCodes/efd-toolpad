import React from 'react';
import {
  Grid,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { TaskFormSection } from './taskBuilderUi';

export function DisplaySettingsSection({ formData, setFormData }) {
  return (
    <Grid item xs={12}>
      <TaskFormSection title="Display Settings" subtitle="Control task visibility and ordering in the UI.">
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={formData.display.isActive} onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, isActive: e.target.checked } }))} />}
              label="Active"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={formData.display.isFeatured} onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, isFeatured: e.target.checked } }))} />}
              label="Featured"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Sort Order"
              type="number"
              value={formData.display.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, sortOrder: parseInt(e.target.value, 10) || 0 } }))}
              inputProps={{ min: 0, max: 999 }}
            />
          </Grid>
        </Grid>
      </TaskFormSection>
    </Grid>
  );
}
