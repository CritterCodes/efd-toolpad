import React from 'react';
import {
  Grid,
  TextField,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { TaskFormSection } from './taskBuilderUi';

export function ServiceSettingsSection({ formData, setFormData }) {
  return (
    <Grid item xs={12}>
      <TaskFormSection title="Service Settings" subtitle="Set timing, rush handling, and operational flags.">
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Est. Days"
              type="number"
              value={formData.service.estimatedDays}
              onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, estimatedDays: parseInt(e.target.value, 10) || 0 } }))}
              inputProps={{ min: 1, max: 30 }}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Rush Days"
              type="number"
              value={formData.service.rushDays}
              onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, rushDays: parseInt(e.target.value, 10) || 0 } }))}
              inputProps={{ min: 1, max: 10 }}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Rush Multiplier"
              type="number"
              value={formData.service.rushMultiplier}
              onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, rushMultiplier: parseFloat(e.target.value) || 1.0 } }))}
              inputProps={{ min: 1.0, max: 3.0, step: 0.1 }}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={formData.service.requiresApproval} onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, requiresApproval: e.target.checked } }))} />}
              label="Requires Approval"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={formData.service.requiresInspection} onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, requiresInspection: e.target.checked } }))} />}
              label="Requires Inspection"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={formData.service.canBeBundled} onChange={(e) => setFormData(prev => ({ ...prev, service: { ...prev.service, canBeBundled: e.target.checked } }))} />}
              label="Can Be Bundled"
            />
          </Grid>
        </Grid>
      </TaskFormSection>
    </Grid>
  );
}
