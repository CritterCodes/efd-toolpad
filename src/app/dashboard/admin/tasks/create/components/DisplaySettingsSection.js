import React from 'react';
import {
  Grid,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Box
} from '@mui/material';

export function DisplaySettingsSection({ formData, setFormData }) {
  return (
    <Grid item xs={12}>
      <Box sx={{ px: { xs: 2, sm: 0 }, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1.5, lineHeight: 1 }}>
          Display Settings
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={formData.display.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, isActive: e.target.checked } }))}
                />
              }
              label="Active"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={3}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={formData.display.isFeatured}
                  onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, isFeatured: e.target.checked } }))}
                />
              }
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
              onChange={(e) => setFormData(prev => ({ ...prev, display: { ...prev.display, sortOrder: parseInt(e.target.value) || 0 } }))}
              inputProps={{ min: 0, max: 999 }}
            />
          </Grid>
        </Grid>
      </Box>
    </Grid>
  );
}
