'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  Category as CategoryIcon,
  Build as BuildIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { useRouter, useParams } from 'next/navigation';

export default function RepairTaskFormPage() {
  const router = useRouter();
  const params = useParams();
  const isEdit = !!params?.taskId;
  
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(null);
  
  // Form state
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    metalType: '',
    requiresMetalType: false,
    laborHours: 1.0,
    materialCost: 10.0,
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: false,
      requiresInspection: true,
      canBeBundled: true,
      skillLevel: 'standard',
      riskLevel: 'low'
    },
    workflow: {
      departments: ['workshop'],
      equipmentNeeded: [],
      qualityChecks: ['measurement', 'fit', 'finish'],
      safetyRequirements: ['protective_gear']
    },
    constraints: {
      minQuantity: 1,
      maxQuantity: 10,
      sizeRange: null,
      weightLimits: { minGrams: null, maxGrams: null }
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 100,
      tags: []
    }
  });

  const [calculatedPrice, setCalculatedPrice] = React.useState(0);

  // Load existing task for editing
  React.useEffect(() => {
    if (isEdit && params.taskId) {
      loadTask(params.taskId);
    }
  }, [isEdit, params.taskId]);

  // Calculate price when labor hours or material cost changes
  React.useEffect(() => {
    if (!formData.laborHours || !formData.materialCost) return;
    
    const calculatePrice = async () => {
      try {
        // Fetch current admin settings for accurate calculation
        const settingsResponse = await fetch('/api/admin/settings');
        let wage = 45; // Default fallback
        let materialMarkup = 1.5; // Default fallback
        let businessMultiplier = 1.48; // Default fallback
        
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          wage = settings.pricing?.wage || 45;
          materialMarkup = settings.pricing?.materialMarkup || 1.5;
          businessMultiplier = (settings.pricing?.administrativeFee || 0.15) + 
                              (settings.pricing?.businessFee || 0.25) + 
                              (settings.pricing?.consumablesFee || 0.08) + 1;
        }
        
        const laborCost = formData.laborHours * wage;
        const materialCost = formData.materialCost * materialMarkup;
        const subtotal = laborCost + materialCost;
        const estimatedPrice = subtotal * businessMultiplier;
        
        setCalculatedPrice(Math.round(estimatedPrice * 100) / 100);
      } catch (error) {
        console.error('Price calculation error:', error);
      }
    };
    
    calculatePrice();
  }, [formData.laborHours, formData.materialCost]);

  const loadTask = async (taskId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/repair-tasks/crud/${taskId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load repair task');
      }
      
      const task = data.task;
      setFormData({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        subcategory: task.subcategory || '',
        metalType: task.metalType || '',
        requiresMetalType: task.requiresMetalType || false,
        laborHours: task.laborHours || 1.0,
        materialCost: task.materialCost || 10.0,
        service: {
          estimatedDays: task.service?.estimatedDays || 3,
          rushDays: task.service?.rushDays || 1,
          rushMultiplier: task.service?.rushMultiplier || 1.5,
          requiresApproval: task.service?.requiresApproval || false,
          requiresInspection: task.service?.requiresInspection !== false,
          canBeBundled: task.service?.canBeBundled !== false,
          skillLevel: task.service?.skillLevel || 'standard',
          riskLevel: task.service?.riskLevel || 'low'
        },
        workflow: {
          departments: task.workflow?.departments || ['workshop'],
          equipmentNeeded: task.workflow?.equipmentNeeded || [],
          qualityChecks: task.workflow?.qualityChecks || ['measurement', 'fit', 'finish'],
          safetyRequirements: task.workflow?.safetyRequirements || ['protective_gear']
        },
        constraints: {
          minQuantity: task.constraints?.minQuantity || 1,
          maxQuantity: task.constraints?.maxQuantity || 10,
          sizeRange: task.constraints?.sizeRange || null,
          weightLimits: task.constraints?.weightLimits || { minGrams: null, maxGrams: null }
        },
        display: {
          isActive: task.display?.isActive !== false,
          isFeatured: task.display?.isFeatured || false,
          sortOrder: task.display?.sortOrder || 100,
          tags: task.display?.tags || []
        }
      });
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };



  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    setError(null);
    setSuccess(null);
  };

  const handleArrayChange = (field, index, value) => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    const newArray = [...currentArray];
    newArray[index] = value;
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: newArray
      }
    }));
  };

  const addArrayItem = (field, defaultValue = '') => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: [...currentArray, defaultValue]
      }
    }));
  };

  const removeArrayItem = (field, index) => {
    const [parent, child] = field.split('.');
    const currentArray = formData[parent][child];
    const newArray = currentArray.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [child]: newArray
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      const url = isEdit 
        ? `/api/repair-tasks/crud/${params.taskId}`
        : '/api/repair-tasks/crud';
        
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} repair task`);
      }
      
      setSuccess(`Repair task ${isEdit ? 'updated' : 'created'} successfully!`);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/admin/repair-tasks');
      }, 1500);
      
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/admin/repair-tasks');
  };

  if (loading) {
    return (
      <PageContainer title={isEdit ? 'Edit Repair Task' : 'Create Repair Task'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={isEdit ? 'Edit Repair Task' : 'Create Repair Task'}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isEdit ? <BuildIcon color="primary" /> : <AddIcon color="primary" />}
            {isEdit ? 'Edit Repair Task' : 'Create New Repair Task'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isEdit ? 'Update repair task details and pricing' : 'Define a new repair task with pricing and workflow details'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon />
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      required
                      label="Task Title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., Ring Sizing Up/Down"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="shank">🔄 Shank & Sizing</MenuItem>
                        <MenuItem value="prongs">📌 Prong Repair</MenuItem>
                        <MenuItem value="stone_setting">💎 Stone Setting</MenuItem>
                        <MenuItem value="engraving">✏️ Engraving</MenuItem>
                        <MenuItem value="chains">🔗 Chain Repair</MenuItem>
                        <MenuItem value="bracelet">⭕ Bracelet Repair</MenuItem>
                        <MenuItem value="watch">⏰ Watch Repair</MenuItem>
                        <MenuItem value="misc">🔧 Miscellaneous</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Subcategory"
                      value={formData.subcategory}
                      onChange={(e) => handleInputChange('subcategory', e.target.value)}
                      placeholder="e.g., ring_sizing, prong_tips"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Metal Type</InputLabel>
                      <Select
                        value={formData.metalType}
                        onChange={(e) => handleInputChange('metalType', e.target.value)}
                        label="Metal Type"
                      >
                        <MenuItem value="">Any Metal</MenuItem>
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                        <MenuItem value="platinum">Platinum</MenuItem>
                        <MenuItem value="mixed">Mixed Metals</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of the repair task..."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.requiresMetalType}
                          onChange={(e) => handleInputChange('requiresMetalType', e.target.checked)}
                        />
                      }
                      label="Requires specific metal type"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Pricing Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon />
                  Pricing Components
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Labor Hours"
                      value={formData.laborHours}
                      onChange={(e) => handleInputChange('laborHours', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 8, step: 0.25 }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">hours</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Material Cost"
                      value={formData.materialCost}
                      onChange={(e) => handleInputChange('materialCost', parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 0, max: 500, step: 0.01 }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Estimated Base Price:
                      </Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        ${calculatedPrice.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Includes labor, materials markup, and business fees
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Details */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimeIcon />
                  Service Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Estimated Days"
                      value={formData.service.estimatedDays}
                      onChange={(e) => handleInputChange('service.estimatedDays', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 30 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rush Days"
                      value={formData.service.rushDays}
                      onChange={(e) => handleInputChange('service.rushDays', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1, max: 10 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Skill Level</InputLabel>
                      <Select
                        value={formData.service.skillLevel}
                        onChange={(e) => handleInputChange('service.skillLevel', e.target.value)}
                        label="Skill Level"
                      >
                        <MenuItem value="basic">Basic</MenuItem>
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="advanced">Advanced</MenuItem>
                        <MenuItem value="expert">Expert</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Risk Level</InputLabel>
                      <Select
                        value={formData.service.riskLevel}
                        onChange={(e) => handleInputChange('service.riskLevel', e.target.value)}
                        label="Risk Level"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.requiresApproval}
                          onChange={(e) => handleInputChange('service.requiresApproval', e.target.checked)}
                        />
                      }
                      label="Requires customer approval"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.requiresInspection}
                          onChange={(e) => handleInputChange('service.requiresInspection', e.target.checked)}
                        />
                      }
                      label="Requires quality inspection"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.service.canBeBundled}
                          onChange={(e) => handleInputChange('service.canBeBundled', e.target.checked)}
                        />
                      }
                      label="Can be bundled with other tasks"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Display Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon />
                  Display & Status Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.display.isActive}
                          onChange={(e) => handleInputChange('display.isActive', e.target.checked)}
                        />
                      }
                      label="Active (visible to users)"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.display.isFeatured}
                          onChange={(e) => handleInputChange('display.isFeatured', e.target.checked)}
                        />
                      }
                      label="Featured task"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Sort Order"
                      value={formData.display.sortOrder}
                      onChange={(e) => handleInputChange('display.sortOrder', parseInt(e.target.value) || 100)}
                      inputProps={{ min: 1, max: 1000 }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={saving}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || !formData.title || !formData.category}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : (isEdit ? 'Update Task' : 'Create Task')}
          </Button>
        </Box>
      </Box>
    </PageContainer>
  );
}
