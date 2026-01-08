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
import CircularProgress from '@mui/material/CircularProgress';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter, useParams } from 'next/navigation';
import { VALID_SKILL_LEVELS } from '@/constants/pricing.constants.mjs';

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: 'shanks',
    subcategory: '',
    metalType: 'yellow_gold',
    karat: '14k',
    requiresMetalType: true,
    processes: [],
    materials: [],
    basePrice: '',
    laborHours: '',
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: true,
      requiresInspection: true,
      canBeBundled: true,
      skillLevel: 'standard', // Will be normalized to use DEFAULT_SKILL_LEVEL constant
      riskLevel: 'low'
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    }
  });

  // Match process-based builder categories
  const categories = [
    { value: 'shanks', label: '💍 Shanks', emoji: '💍' },
    { value: 'prongs', label: '🔧 Prongs', emoji: '🔧' },
    { value: 'chains', label: '🔗 Chains', emoji: '🔗' },
    { value: 'stone_setting', label: '💎 Stone Setting', emoji: '💎' },
    { value: 'misc', label: '🛠️ Misc', emoji: '🛠️' },
    { value: 'watches', label: '⌚ Watches', emoji: '⌚' },
    { value: 'engraving', label: '✍️ Engraving', emoji: '✍️' },
    { value: 'bracelets', label: '📿 Bracelets', emoji: '📿' }
  ];

  // Match process-based builder metal types
  const metalTypes = [
    { value: 'yellow_gold', label: 'Yellow Gold', color: '#FFD700' },
    { value: 'white_gold', label: 'White Gold', color: '#E8E8E8' },
    { value: 'rose_gold', label: 'Rose Gold', color: '#E8B4A0' },
    { value: 'sterling_silver', label: 'Sterling Silver', color: '#C0C0C0' },
    { value: 'fine_silver', label: 'Fine Silver', color: '#E5E5E5' },
    { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
    { value: 'mixed', label: 'Mixed Metals', color: '#A0A0A0' },
    { value: 'n_a', label: 'N/A', color: '#808080' }
  ];

  const karatOptions = [
    '10k', '14k', '18k', '22k', '24k', // Gold
    '925', '999', // Silver
    '950', '900', // Platinum
    'N/A' // Not applicable
  ];

  // Use constants from pricing.constants.mjs for consistency
  const skillLevels = VALID_SKILL_LEVELS;

  const riskLevels = [
    'low',
    'medium',
    'high'
  ];

  const loadTask = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?taskId=${taskId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load task');
      }
      
      const data = await response.json();
      
      if (data.success && data.task) {
        const task = data.task;
        setFormData({
          title: task.title || '',
          description: task.description || '',
          category: task.category || 'shanks',
          subcategory: task.subcategory || '',
          metalType: task.metalType || 'yellow_gold',
          karat: task.karat || '14k',
          requiresMetalType: task.requiresMetalType !== false,
          processes: task.processes || [],
          materials: task.materials || [],
          basePrice: task.pricing?.retailPrice?.toString() || task.basePrice?.toString() || '',
          laborHours: task.pricing?.totalLaborHours?.toString() || task.laborHours?.toString() || '',
          service: {
            estimatedDays: task.service?.estimatedDays || 3,
            rushDays: task.service?.rushDays || 1,
            rushMultiplier: task.service?.rushMultiplier || 1.5,
            requiresApproval: task.service?.requiresApproval !== false,
            requiresInspection: task.service?.requiresInspection !== false,
            canBeBundled: task.service?.canBeBundled !== false,
            skillLevel: task.service?.skillLevel || task.skillLevel || VALID_SKILL_LEVELS[1], // Default to 'standard'
            riskLevel: task.service?.riskLevel || task.riskLevel || 'low'
          },
          display: {
            isActive: task.display?.isActive !== false && task.isActive !== false,
            isFeatured: task.display?.isFeatured || false,
            sortOrder: task.display?.sortOrder || 0
          }
        });
      } else {
        throw new Error('Task not found');
      }
      
    } catch (error) {
      console.error('Error loading task:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    if (taskId) {
      loadTask();
    }
  }, [taskId, loadTask]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Prepare data in the new format
      const updateData = {
        taskId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory,
        metalType: formData.metalType,
        karat: formData.karat,
        requiresMetalType: formData.requiresMetalType,
        processes: formData.processes,
        materials: formData.materials,
        // Keep backward compatibility
        basePrice: parseFloat(formData.basePrice) || 0,
        laborHours: parseFloat(formData.laborHours) || 0,
        // New nested structure
        service: formData.service,
        display: formData.display
      };
      
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task');
      }

      setSuccess('Task updated successfully!');
      setTimeout(() => {
        router.push('/dashboard/admin/tasks');
      }, 2000);

    } catch (error) {
      console.error('Error updating task:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleNestedChange = (parentField, childField) => (event) => {
    setFormData({
      ...formData,
      [parentField]: {
        ...formData[parentField],
        [childField]: event.target.type === 'number' ? parseFloat(event.target.value) || 0 : event.target.value
      }
    });
  };

  if (loading) {
    return (
      <PageContainer title="Edit Task">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Edit Task">
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
              Edit Task
            </Typography>
            <Typography color="text.secondary" paragraph>
              Update task details and settings.
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
                      {metalTypes.map((metal) => (
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
                      {karatOptions.map((karat) => (
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

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Estimated Days"
                    value={formData.service.estimatedDays}
                    onChange={handleNestedChange('service', 'estimatedDays')}
                    inputProps={{
                      min: 1,
                      step: 1
                    }}
                    helperText="Standard turnaround time"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rush Days"
                    value={formData.service.rushDays}
                    onChange={handleNestedChange('service', 'rushDays')}
                    inputProps={{
                      min: 1,
                      step: 1
                    }}
                    helperText="Rush turnaround time"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Skill Level Required</InputLabel>
                    <Select
                      value={formData.service.skillLevel}
                      label="Skill Level Required"
                      onChange={handleNestedChange('service', 'skillLevel')}
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
                      value={formData.service.riskLevel}
                      label="Risk Level"
                      onChange={handleNestedChange('service', 'riskLevel')}
                    >
                      {riskLevels.map((level) => (
                        <MenuItem key={level} value={level}>
                          {level.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requiresMetalType}
                        onChange={(e) => setFormData({ ...formData, requiresMetalType: e.target.checked })}
                      />
                    }
                    label="Requires Specific Metal Type"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.service.requiresApproval}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          service: { ...formData.service, requiresApproval: e.target.checked }
                        })}
                      />
                    }
                    label="Requires Customer Approval"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.service.canBeBundled}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          service: { ...formData.service, canBeBundled: e.target.checked }
                        })}
                      />
                    }
                    label="Can Be Bundled"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.display.isActive}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          display: { ...formData.display, isActive: e.target.checked }
                        })}
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
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          display: { ...formData.display, isFeatured: e.target.checked }
                        })}
                      />
                    }
                    label="Featured Task"
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
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
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
