import React from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { TaskFormSection, taskSelectMenuProps } from './taskBuilderUi';

export function BasicInformationSection({ formData, setFormData, categories }) {
  return (
    <Grid item xs={12}>
      <TaskFormSection title="Basic Information" subtitle="Name, category, and description for the task.">
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Ring Sizing - Universal"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                MenuProps={taskSelectMenuProps}
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                label="Category"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              placeholder="Detailed description of the repair service..."
            />
          </Grid>
        </Grid>
      </TaskFormSection>
    </Grid>
  );
}
