'use client';

import * as React from 'react';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Fab from '@mui/material/Fab';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Autocomplete from '@mui/material/Autocomplete';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Divider from '@mui/material/Divider';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Schedule as TimeIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon,
  Security as SecurityIcon,
  Engineering as EngineeringIcon
} from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';
import { generateProcessSku } from '../../../../../utils/skuGenerator';

export default function ProcessesPage() {
  const [processes, setProcesses] = React.useState([]);
  const [availableMaterials, setAvailableMaterials] = React.useState([]);
  const [adminSettings, setAdminSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, process: null });
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);
  const [materialQuantity, setMaterialQuantity] = React.useState('');

  // Form state
  const [formData, setFormData] = React.useState({
    displayName: '',
    description: '',
    category: '',
    skillLevel: '',
    laborHours: '',
    metalType: '', // Single metal type like materials
    karat: '', // Karat for metals
    metalComplexityMultiplier: '1.0', // Single multiplier
    materials: [], // Array of { materialId, materialName, quantity, unit }
  });

  const categories = [
    'metalwork',
    'finishing',
    'stone_work',
    'sizing',
    'prong_work',
    'engraving',
    'design',
    'assembly',
    'other'
  ];

  const skillLevels = [
    'basic',
    'standard',
    'advanced',
    'expert'
  ];

  const metalTypes = [
    'yellow_gold',
    'white_gold', 
    'rose_gold',
    'sterling_silver',
    'fine_silver',
    'platinum',
    'mixed',
    'n_a'
  ];

  const karatOptions = [
    '10k', '14k', '18k', '22k', '24k', // Gold
    '925', '999', // Silver
    '950', '900', // Platinum
    'N/A' // For mixed or non-precious metals
  ];

  const loadProcesses = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/repair-processes');
      
      if (!response.ok) {
        throw new Error('Failed to load processes');
      }
      
      const { processes } = await response.json();
      setProcesses(processes);
      setError(null);
    } catch (error) {
      console.error('Error loading processes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaterials = React.useCallback(async () => {
    try {
      const response = await fetch('/api/repair-materials');
      if (!response.ok) throw new Error('Failed to load materials');
      const data = await response.json();
      // API returns { success: true, materials: [...] }
      setAvailableMaterials(data.materials || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      setAvailableMaterials([]); // Ensure it's always an array on error
    }
  }, []);

  const loadAdminSettings = React.useCallback(async () => {
    try {
      console.log('🔵 Starting loadAdminSettings...');
      const response = await fetch('/api/admin/settings');
      console.log('🔵 Response status:', response.status, response.statusText);
      
      if (!response.ok) throw new Error('Failed to load admin settings');
      
      const data = await response.json();
      // The API returns settings directly, not wrapped in data.settings
      const settings = data || {};
      
      console.log('🔵 Raw admin settings from API:', JSON.stringify(data, null, 2));
      console.log('🔵 Parsed settings:', JSON.stringify(settings, null, 2));
      console.log('🔵 Pricing object:', JSON.stringify(settings.pricing, null, 2));
      console.log('🔵 Material markup value:', settings.pricing?.materialMarkup);
      console.log('🔵 Material markup type:', typeof settings.pricing?.materialMarkup);
      
      // Map database structure to expected format
      // Create skill-level based wages from the base wage
      const baseWage = settings.pricing?.wage || 30;
      const mappedSettings = {
        laborRates: {
          basic: baseWage * 0.75,      // 75% of base wage (e.g., $22.50)
          standard: baseWage,          // 100% of base wage (e.g., $30.00)
          advanced: baseWage * 1.25,   // 125% of base wage (e.g., $37.50)
          expert: baseWage * 1.5       // 150% of base wage (e.g., $45.00)
        },
        materialMarkup: settings.pricing?.materialMarkup || 1.3,
        // Store original pricing data for reference
        pricing: settings.pricing || { wage: baseWage, materialMarkup: settings.pricing?.materialMarkup || 1.3 }
      };
      
      console.log('🔵 Final mapped settings:', JSON.stringify(mappedSettings, null, 2));
      console.log('🔵 Final material markup:', mappedSettings.materialMarkup);
      console.log('🔵 Final pricing material markup:', mappedSettings.pricing.materialMarkup);
      
      setAdminSettings(mappedSettings);
    } catch (error) {
      console.error('🔴 Error loading admin settings:', error);
      // Set default values if settings can't be loaded
      const baseWage = 30;
      const defaultSettings = {
        laborRates: { 
          basic: baseWage * 0.75,      // $22.50
          standard: baseWage,          // $30.00
          advanced: baseWage * 1.25,   // $37.50
          expert: baseWage * 1.5       // $45.00
        },
        materialMarkup: 1.3, // 30% markup
        pricing: { wage: baseWage, materialMarkup: 1.3 }
      };
      console.log('🔴 Using default settings:', JSON.stringify(defaultSettings, null, 2));
      setAdminSettings(defaultSettings);
    }
  }, []);

  React.useEffect(() => {
    loadProcesses();
    loadMaterials();
    loadAdminSettings();
  }, [loadProcesses, loadMaterials, loadAdminSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingProcess 
        ? `/api/repair-processes?id=${editingProcess._id}` 
        : '/api/repair-processes';
      
      const method = editingProcess ? 'PUT' : 'POST';
      const isUpdate = !!editingProcess;
      
      const processData = {
        ...formData,
        sku: editingProcess?.sku || generateProcessSku(formData.category, formData.skillLevel),
        laborHours: parseFloat(formData.laborHours),
        metalComplexityMultiplier: parseFloat(formData.metalComplexityMultiplier),
        materials: formData.materials, // Include materials list
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(processData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save process');
      }

      const savedProcess = await response.json();
      
      // If this was an update, trigger cascading updates
      if (isUpdate && savedProcess.process) {
        console.log('🔄 Process updated, triggering cascading updates...');
        try {
          const cascadingResult = await cascadingUpdatesService.updateFromProcessesChange([savedProcess.process._id]);
          console.log('✅ Cascading updates completed:', cascadingResult);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
          // Don't fail the whole operation, just log the error
        }
      }

      setOpenDialog(false);
      setEditingProcess(null);
      resetForm();
      loadProcesses();
    } catch (error) {
      console.error('Error saving process:', error);
      setError(error.message);
    }
  };

  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData({
      displayName: process.displayName || '',
      description: process.description || '',
      category: process.category || '',
      skillLevel: process.skillLevel || '',
      laborHours: process.laborHours?.toString() || '',
      metalType: process.metalType || '',
      karat: process.karat || '',
      metalComplexityMultiplier: process.metalComplexityMultiplier?.toString() || '1.0',
      materials: process.materials || [], // Load existing materials
    });
    setOpenDialog(true);
  };

  const handleDelete = async (processId) => {
    try {
      const response = await fetch(`/api/repair-processes?id=${processId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete process');
      }

      setDeleteDialog({ open: false, process: null });
      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      description: '',
      category: '',
      skillLevel: '',
      laborHours: '',
      metalType: '',
      karat: '',
      metalComplexityMultiplier: '1.0',
      materials: [], // Reset materials list
    });
    setSelectedMaterial(null);
    setMaterialQuantity('');
  };

  // Add material to process
  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQuantity) return;
    
    const quantityMultiplier = parseFloat(materialQuantity);
    const newMaterial = {
      materialId: selectedMaterial._id,
      materialName: selectedMaterial.name,
      materialSku: selectedMaterial.sku,
      quantity: quantityMultiplier,
      unit: selectedMaterial.portionType || 'portion',
      estimatedCost: selectedMaterial.costPerPortion * quantityMultiplier
    };
    
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, newMaterial]
    }));
    
    setSelectedMaterial(null);
    setMaterialQuantity('');
  };

  // Remove material from process
  const handleRemoveMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const handleOpenDialog = () => {
    resetForm();
    setEditingProcess(null);
    setOpenDialog(true);
  };

  const getSkillColor = (skill) => {
    switch (skill) {
      case 'basic': return 'success';
      case 'standard': return 'info';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
      default: return 'default';
    }
  };

  // Calculate total process cost
  const calculateProcessCost = (process) => {
    console.log('🟡 calculateProcessCost called for:', process.displayName);
    console.log('🟡 adminSettings available:', !!adminSettings);
    
    // If process has stored pricing, use it
    if (process.pricing?.totalCost !== undefined) {
      console.log('🟡 Using stored pricing:', process.pricing);
      return {
        laborCost: process.pricing.laborCost || 0,
        materialsCost: process.pricing.materialsCost || 0,
        baseMaterialsCost: process.pricing.baseMaterialsCost || 0,
        materialMarkup: process.pricing.materialMarkup || 1.0,
        multiplier: process.metalComplexityMultiplier || 1.0,
        totalCost: process.pricing.totalCost || 0
      };
    }
    
    // Fallback to calculation if no stored pricing or adminSettings not available
    if (!adminSettings) return { laborCost: 0, materialsCost: 0, multiplier: 1.0, totalCost: 0 };
    
    console.log('🟡 Current adminSettings:', JSON.stringify(adminSettings, null, 2));
    
    // Labor cost calculation using skill-level based admin settings
    const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
    const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
    const laborCost = (process.laborHours || 0) * hourlyRate;
    
    // Materials cost calculation with markup - prioritize pricing.materialMarkup
    const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
    const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;

    // Debug logging
    console.log('🟡 calculateProcessCost Debug:', {
      processName: process.displayName,
      skillLevel: process.skillLevel,
      laborRates: laborRates,
      hourlyRate: hourlyRate,
      laborCost: laborCost,
      pricingMaterialMarkup: adminSettings.pricing?.materialMarkup,
      fallbackMaterialMarkup: adminSettings.materialMarkup,
      finalMaterialMarkup: materialMarkup,
      baseMaterialsCost: baseMaterialsCost,
      materialsCost: materialsCost,
      calculation: `${baseMaterialsCost} × ${materialMarkup} = ${materialsCost}`
    });

    // Apply metal complexity multiplier to total cost
    const multiplier = process.metalComplexityMultiplier || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;

    return {
      laborCost,
      materialsCost,
      baseMaterialsCost,
      materialMarkup,
      multiplier,
      totalCost
    };
  };

  if (loading) {
    return (
      <PageContainer title="Processes Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Processes Management">
      <Box sx={{ pb: 8 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Repair Processes
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Add Process
          </Button>
        </Box>

        {/* Processes Grid */}
        {processes.length === 0 ? (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No processes found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Get started by adding your first process
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                >
                  Add Process
                </Button>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {processes.map((process) => (
              <Grid item xs={12} sm={6} md={4} key={process._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: process.isActive === false ? 0.7 : 1,
                    borderLeft: process.isActive === false ? 1 : 3,
                    borderLeftColor: process.isActive === false ? 'grey.300' : 'primary.main'
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {process.displayName}
                      </Typography>
                      <Chip
                        label={process.isActive === false ? 'Inactive' : 'Active'}
                        color={process.isActive === false ? 'default' : 'success'}
                        size="small"
                      />
                    </Box>

                    <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                      {process.description || 'No description'}
                    </Typography>

                    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                      <Chip
                        label={process.category}
                        variant="outlined"
                        size="small"
                        icon={<CategoryIcon />}
                      />
                      <Chip
                        label={process.skillLevel}
                        variant="outlined"
                        size="small"
                        color={getSkillColor(process.skillLevel)}
                        icon={<EngineeringIcon />}
                      />
                    </Box>

                    {/* Time and Cost */}
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {process.laborHours} hrs
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <MoneyIcon fontSize="small" color="success" />
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          ${calculateProcessCost(process).totalCost.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Metal Information and Cost Breakdown */}
                    {process.metalType && (
                      <Box mb={2}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Metal: {process.metalType.replace('_', ' ').toUpperCase()} 
                          {process.karat && ` (${process.karat})`} 
                          - Complexity: {process.metalComplexityMultiplier || 1.0}x
                        </Typography>
                        {(() => {
                          const costBreakdown = calculateProcessCost(process);
                          return (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Labor: ${costBreakdown.laborCost.toFixed(2)} + Materials: ${costBreakdown.materialsCost.toFixed(2)}
                              {costBreakdown.materialMarkup !== 1.0 && ` (${((costBreakdown.materialMarkup - 1) * 100).toFixed(0)}% markup)`}
                              {costBreakdown.multiplier !== 1.0 && ` × ${costBreakdown.multiplier}`}
                            </Typography>
                          );
                        })()}
                      </Box>
                    )}

                    {/* Materials Required */}
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Materials Required:
                      </Typography>
                      {process.materials && process.materials.length > 0 ? (
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {process.materials.slice(0, 3).map((material, index) => (
                            <Chip
                              key={index}
                              label={`${material.materialName}: ${material.quantity} ${material.unit}${material.quantity !== 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                          {process.materials.length > 3 && (
                            <Chip
                              label={`+${process.materials.length - 3} more`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                        </Box>
                      ) : (
                        <Chip
                          label="No materials (Labor-only)"
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  </CardContent>

                  <CardActions>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(process)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteDialog({ open: true, process })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add process"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle>
              {editingProcess ? 'Edit Process' : 'Add New Process'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Display Name"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    helperText="User-friendly name for this process"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Skill Level</InputLabel>
                    <Select
                      value={formData.skillLevel}
                      label="Skill Level"
                      onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
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
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Labor Hours"
                    value={formData.laborHours}
                    onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                    inputProps={{ min: 0.01, step: 0.01 }}
                    helperText="Time required in hours (e.g., 1.5 for 1 hour 30 minutes)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Metal Type</InputLabel>
                    <Select
                      value={formData.metalType}
                      label="Metal Type"
                      onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
                    >
                      {metalTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Karat/Purity</InputLabel>
                    <Select
                      value={formData.karat}
                      label="Karat/Purity"
                      onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
                    >
                      {karatOptions.map((karat) => (
                        <MenuItem key={karat} value={karat}>
                          {karat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Metal Complexity Multiplier */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Metal Complexity Multiplier"
                    value={formData.metalComplexityMultiplier}
                    onChange={(e) => setFormData({ ...formData, metalComplexityMultiplier: e.target.value })}
                    helperText="Pricing multiplier for this metal type"
                    inputProps={{
                      min: 0.1,
                      max: 5.0,
                      step: 0.1
                    }}
                  />
                </Grid>

                {/* Cost Preview */}
                <Grid item xs={12} sm={6}>
                  {formData.laborHours && formData.skillLevel && adminSettings && (
                    <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Real-Time Cost Preview
                      </Typography>
                      {(() => {
                        // Use skill-level based wages from admin settings
                        const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
                        const hourlyRate = laborRates[formData.skillLevel] || laborRates.standard;
                        
                        // Prioritize pricing.materialMarkup from database
                        const materialMarkup = adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup || 1.3;
                        
                        const laborCost = parseFloat(formData.laborHours || 0) * hourlyRate;
                        const baseMaterialsCost = formData.materials.reduce((total, material) => total + (material.estimatedCost || 0), 0);
                        const materialsCost = baseMaterialsCost * materialMarkup;
                        const multiplier = parseFloat(formData.metalComplexityMultiplier || 1.0);
                        const totalCost = (laborCost + materialsCost) * multiplier;
                        
                        console.log('🟢 Cost Preview Debug:', {
                          formData: formData,
                          adminSettings: adminSettings,
                          pricing: adminSettings.pricing,
                          skillLevel: formData.skillLevel,
                          laborRates: laborRates,
                          hourlyRate: hourlyRate,
                          pricingMaterialMarkup: adminSettings.pricing?.materialMarkup,
                          fallbackMaterialMarkup: adminSettings.materialMarkup,
                          finalMaterialMarkup: materialMarkup,
                          laborCost: laborCost,
                          baseMaterialsCost: baseMaterialsCost,
                          materialsCost: materialsCost,
                          calculation: `${baseMaterialsCost} × ${materialMarkup} = ${materialsCost}`,
                          markupPercentage: ((materialMarkup - 1) * 100).toFixed(0)
                        });
                        
                        return (
                          <>
                            <Typography variant="body2">
                              <strong>Labor:</strong> ${laborCost.toFixed(2)} 
                              <br />
                              <Typography component="span" variant="caption" color="success.contrastText" sx={{ opacity: 0.8 }}>
                                {formData.laborHours}hrs × ${hourlyRate}/hr ({formData.skillLevel} rate)
                              </Typography>
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>Materials:</strong> ${materialsCost.toFixed(2)}
                              <br />
                              <Typography component="span" variant="caption" color="success.contrastText" sx={{ opacity: 0.8 }}>
                                {formData.materials.length} material(s), base cost: ${baseMaterialsCost.toFixed(2)}
                                {materialMarkup !== 1.0 && ` with ${((materialMarkup - 1) * 100).toFixed(0)}% markup`}
                              </Typography>
                            </Typography>
                            {multiplier !== 1.0 && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                <strong>Metal Complexity:</strong> ×{multiplier}
                              </Typography>
                            )}
                            <Divider sx={{ my: 1, bgcolor: 'success.contrastText', opacity: 0.3 }} />
                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.contrastText' }}>
                              Total: ${totalCost.toFixed(2)}
                            </Typography>
                          </>
                        );
                      })()}
                    </Box>
                  )}
                </Grid>

                {/* Materials Required */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Materials Required for Process
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add materials that are consumed during this process. Leave empty if no materials are required (labor-only process).
                  </Typography>
                  
                  {/* Add Material Form */}
                  <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Grid container spacing={2} alignItems="end">
                      <Grid item xs={12} sm={6}>
                        <Autocomplete
                          options={Array.isArray(availableMaterials) ? availableMaterials : []}
                          getOptionLabel={(option) => `${option.name} (${option.sku})`}
                          value={selectedMaterial}
                          onChange={(event, newValue) => setSelectedMaterial(newValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Select Material"
                              variant="outlined"
                              size="small"
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Portions Needed"
                          value={materialQuantity}
                          onChange={(e) => setMaterialQuantity(e.target.value)}
                          inputProps={{ min: 0, step: 0.1 }}
                          helperText="Number of portions"
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleAddMaterial}
                          disabled={!selectedMaterial || !materialQuantity}
                        >
                          Add
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Materials List */}
                  {formData.materials.length > 0 ? (
                    <List dense>
                      {formData.materials.map((material, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`${material.materialName} (${material.materialSku})`}
                            secondary={`${material.quantity} ${material.unit}${material.quantity !== 1 ? 's' : ''} - Est. Cost: $${material.estimatedCost?.toFixed(2) || '0.00'}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              size="small" 
                              onClick={() => handleRemoveMaterial(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No materials added - this will be a labor-only process
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingProcess ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, process: null })}
        >
          <DialogTitle>Delete Process</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete &quot;{deleteDialog.process?.displayName}&quot;?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, process: null })}>
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => handleDelete(deleteDialog.process._id)}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
