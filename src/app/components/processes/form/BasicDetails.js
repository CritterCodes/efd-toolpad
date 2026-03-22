'use client';

import React from 'react';
import {
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography
} from '@mui/material';
import {
  PROCESS_CATEGORIES,
  SKILL_LEVELS,
  formatCategoryDisplay
} from '@/utils/processes.util';

export const BasicDetails = ({ formData, setFormData }) => {
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Basic Information
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Process Name"
          value={formData.displayName || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          helperText="Descriptive name for this repair process"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category || ''}
            label="Category"
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          >
            {PROCESS_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {formatCategoryDisplay(category)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Skill Level</InputLabel>
          <Select
            value={formData.skillLevel || ''}
            label="Skill Level"
            onChange={(e) => setFormData(prev => ({ ...prev, skillLevel: e.target.value }))}
          >
            {SKILL_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label} ({level.multiplier}x)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          type="number"
          label="Labor Hours"
          value={formData.laborHours || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, laborHours: e.target.value }))}
          inputProps={{ min: 0.01, step: 0.01, max: 8 }}
          helperText="Time required in hours (e.g., 1.5 for 1 hour 30 minutes)"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          helperText="Optional detailed description of this process"
        />
      </Grid>
    </>
  );
};
