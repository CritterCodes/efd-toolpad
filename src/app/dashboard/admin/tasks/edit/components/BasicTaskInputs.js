import * as React from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import { TASK_CATEGORIES, METAL_TYPES, KARAT_OPTIONS } from './TaskConstants';

export default function BasicTaskInputs({ formData, handleChange }) {
  return (
    <>
      <Grid item xs={12} sm={6}>
        <TextField
          required
          fullWidth
          label="Task Title"
          value={formData.title}
          onChange={handleChange('title')}
          helperText="Brief descriptive title for the task"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            label="Category"
            onChange={handleChange('category')}
          >
            {TASK_CATEGORIES.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <TextField
          required
          fullWidth
          multiline
          rows={3}
          label="Description"
          value={formData.description}
          onChange={handleChange('description')}
          helperText="Detailed description of what this task involves"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Subcategory"
          value={formData.subcategory}
          onChange={handleChange('subcategory')}
          helperText="Optional subcategory or specialization"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Metal Type</InputLabel>
          <Select
            value={formData.metalType}
            label="Metal Type"
            onChange={handleChange('metalType')}
          >
            {METAL_TYPES.map((metal) => (
              <MenuItem key={metal.value} value={metal.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: metal.color,
                      border: '1px solid #ccc'
                    }}
                  />
                  {metal.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Karat/Purity</InputLabel>
          <Select
            value={formData.karat}
            label="Karat/Purity"
            onChange={handleChange('karat')}
          >
            {KARAT_OPTIONS.map((karat) => (
              <MenuItem key={karat} value={karat}>
                {karat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          type="number"
          label="Base Price"
          value={formData.basePrice}
          onChange={handleChange('basePrice')}
          InputProps={{
            startAdornment: '$'
          }}
          inputProps={{
            min: 0,
            step: 0.01
          }}
          helperText="Starting price for this task"
        />
      </Grid>
    </>
  );
}
