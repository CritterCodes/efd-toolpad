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
          {/* WHERE THIS TASK IS OFFERED. Both boxes can be ticked — stone setting is charged the same
              way on a repair and on a custom. Leaving BOTH unticked means repair-only, which is what
              every task in the catalog is today, so existing tasks keep behaving as they always have.
              Ticking custom alone is the only way to say "custom only". */}
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={(formData.contexts || []).length === 0 || (formData.contexts || []).includes('repair')} onChange={(e) => setFormData(prev => {
                const rest = (prev.contexts || []).filter((c) => c !== 'repair');
                // Unticking repair on an untagged task has to WRITE the remaining surfaces, or the
                // empty array reads as "repair only" again and the change silently undoes itself.
                return { ...prev, contexts: e.target.checked ? Array.from(new Set([...rest, 'repair'])) : (rest.length ? rest : ['custom']) };
              })} />}
              label="Repair intake"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={<Checkbox size="small" checked={(formData.contexts || []).includes('custom')} onChange={(e) => setFormData(prev => {
                const rest = (prev.contexts || []).filter((c) => c !== 'custom');
                // An untagged task is implicitly repair-only, so adding custom must make that explicit
                // — otherwise ['custom'] would quietly drop it out of repair intake.
                const base = (prev.contexts || []).length === 0 ? ['repair'] : rest;
                return { ...prev, contexts: e.target.checked ? Array.from(new Set([...base, 'custom'])) : (rest.length ? rest : ['repair']) };
              })} />}
              label="Custom quote builder"
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
