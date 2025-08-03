'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter } from 'next/navigation';

export default function CreateTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: 'repair',
    subcategory: '',
    metalType: '',
    basePrice: '',
    laborHours: '',
    skillLevel: 'standard',
    riskLevel: 'low',
    isActive: true
  });

  const categories = [
    'repair',
    'sizing',
    'stone_work',
    'finishing', 
    'engraving',
    'design',
    '3d_printing',
    'assembly',
    'other'
  ];

  const skillLevels = [
    'basic',
    'standard', 
    'advanced',
    'expert'
  ];

  const riskLevels = [
    'low',
    'medium',
    'high'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: parseFloat(formData.basePrice) || 0,
          laborHours: parseFloat(formData.laborHours) || 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      setSuccess('Task created successfully!');
      setTimeout(() => {
        router.push('/dashboard/admin/tasks');
      }, 2000);

    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  return (
    <PageContainer title="Create New Task">
      <Box sx={{ pb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Card>
          <CardContent>
            <Typography variant="h5" component="h1" gutterBottom>
              Create New Task
            </Typography>
            <Typography color="text.secondary" paragraph>
              Create a basic task for repairs, engraving, 3D design, or other services.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
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
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
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
                      <MenuItem value="">Any Metal</MenuItem>
                      <MenuItem value="silver">Silver</MenuItem>
                      <MenuItem value="gold">Gold</MenuItem>
                      <MenuItem value="platinum">Platinum</MenuItem>
                      <MenuItem value="mixed">Mixed Metals</MenuItem>
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

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Estimated Labor Hours"
                    value={formData.laborHours}
                    onChange={handleChange('laborHours')}
                    inputProps={{
                      min: 0,
                      step: 0.25
                    }}
                    helperText="Typical time required"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Skill Level Required</InputLabel>
                    <Select
                      value={formData.skillLevel}
                      label="Skill Level Required"
                      onChange={handleChange('skillLevel')}
                    >
                      {skillLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Risk Level</InputLabel>
                    <Select
                      value={formData.riskLevel}
                      label="Risk Level"
                      onChange={handleChange('riskLevel')}
                    >
                      {riskLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                    }
                    label="Active Task"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" gap={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => router.push('/dashboard/admin/tasks')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Task'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
}
