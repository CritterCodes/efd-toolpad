'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Calculate as CalculateIcon,
  PreviewOutlined as PreviewIcon
} from '@mui/icons-material';

export default function ProcessBasedTaskBuilder() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'sizing',
    subcategory: '',
    metalType: 'silver',
    requiresMetalType: true,
    processes: [],
    materials: [],
    service: {
      estimatedDays: 3,
      rushDays: 1,
      rushMultiplier: 1.5,
      requiresApproval: true,
      requiresInspection: true,
      canBeBundled: true
    },
    display: {
      isActive: true,
      isFeatured: false,
      sortOrder: 0
    }
  });

  // Available data
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pricePreview, setPricePreview] = useState(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const calculatePricePreview = useCallback(async () => {
    if (!adminSettings || formData.processes.length === 0 || formData.materials.length === 0) {
      setPricePreview(null);
      return;
    }

    try {
      let totalLaborMinutes = 0;
      let totalEquipmentCost = 0;
      let totalMaterialCost = 0;

      // Calculate process costs
      for (const processSelection of formData.processes) {
        const process = availableProcesses.find(p => p._id === processSelection.processId);
        if (process) {
          const metalComplexity = process.metalComplexity?.[formData.metalType] || 1.0;
          const quantity = processSelection.quantity || 1;
          totalLaborMinutes += process.laborMinutes * metalComplexity * quantity;
          totalEquipmentCost += process.equipmentCost * quantity;
        }
      }

      // Calculate material costs
      for (const materialSelection of formData.materials) {
        const material = availableMaterials.find(m => m._id === materialSelection.materialId);
        if (material) {
          const quantity = materialSelection.quantity || 1;
          totalMaterialCost += material.unitCost * quantity;
        }
      }

      // Apply business formula
      const markedUpMaterialCost = totalMaterialCost * (adminSettings.pricing.materialMarkup || 1.5);
      const laborRate = adminSettings.pricing.wage / 60;
      const processLaborCost = totalLaborMinutes * laborRate;
      const baseCost = processLaborCost + totalEquipmentCost + markedUpMaterialCost;
      
      const businessMultiplier = (adminSettings.pricing.administrativeFee + 
                                 adminSettings.pricing.businessFee + 
                                 adminSettings.pricing.consumablesFee + 1);
      
      const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;
      const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;

      setPricePreview({
        totalLaborMinutes: Math.round(totalLaborMinutes * 100) / 100,
        totalEquipmentCost: Math.round(totalEquipmentCost * 100) / 100,
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        markedUpMaterialCost: Math.round(markedUpMaterialCost * 100) / 100,
        baseCost: Math.round(baseCost * 100) / 100,
        retailPrice,
        wholesalePrice,
        businessMultiplier: Math.round(businessMultiplier * 100) / 100
      });

    } catch (error) {
      console.error('Price calculation error:', error);
    }
  }, [formData.processes, formData.materials, formData.metalType, adminSettings, availableProcesses, availableMaterials]);

  // Recalculate price when form changes
  useEffect(() => {
    if (formData.processes.length > 0 && formData.materials.length > 0 && adminSettings) {
      calculatePricePreview();
    }
  }, [formData.processes, formData.materials, formData.metalType, adminSettings, calculatePricePreview]);

  const loadInitialData = async () => {
    try {
      const [processesRes, materialsRes, settingsRes] = await Promise.all([
        fetch('/api/repair-processes'),
        fetch('/api/repair-materials'),
        fetch('/api/admin/settings')
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        setAvailableProcesses(processesData.processes || []);
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        setAvailableMaterials(materialsData.materials || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setAdminSettings(settingsData.settings);
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load initial data');
    }
  };

  const addProcess = () => {
    setFormData(prev => ({
      ...prev,
      processes: [...prev.processes, { processId: '', quantity: 1 }]
    }));
  };

  const removeProcess = (index) => {
    setFormData(prev => ({
      ...prev,
      processes: prev.processes.filter((_, i) => i !== index)
    }));
  };

  const updateProcess = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      processes: prev.processes.map((process, i) => 
        i === index ? { ...process, [field]: value } : process
      )
    }));
  };

  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, { materialId: '', quantity: 1 }]
    }));
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const updateMaterial = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/tasks/process-based', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Process-based task created successfully!');
        setTimeout(() => {
          router.push('/dashboard/admin/tasks');
        }, 2000);
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getCompatibleMaterials = () => {
    return availableMaterials.filter(material => 
      material.compatibleMetals.includes(formData.metalType)
    );
  };

  const categories = [
    { value: 'sizing', label: '📏 Sizing', emoji: '📏' },
    { value: 'prongs', label: '🔧 Prongs', emoji: '🔧' },
    { value: 'stone_setting', label: '💎 Stone Setting', emoji: '💎' },
    { value: 'engraving', label: '✍️ Engraving', emoji: '✍️' },
    { value: 'chains', label: '🔗 Chains', emoji: '🔗' },
    { value: 'bracelet', label: '📿 Bracelet', emoji: '📿' },
    { value: 'watch', label: '⌚ Watch', emoji: '⌚' },
    { value: 'misc', label: '🛠️ Miscellaneous', emoji: '🛠️' }
  ];

  const metalTypes = [
    { value: 'silver', label: 'Silver', color: '#C0C0C0' },
    { value: 'gold', label: 'Gold', color: '#FFD700' },
    { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
    { value: 'mixed', label: 'Mixed Metals', color: '#A0A0A0' }
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Process-Based Task Builder
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create tasks by selecting individual processes and materials for accurate pricing.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            
            {/* Basic Information */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">📝 Basic Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <TextField
                        fullWidth
                        label="Task Title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        required
                        placeholder="e.g., Ring Sizing Down - Silver"
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth required>
                        <InputLabel>Category</InputLabel>
                        <Select
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

                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth required>
                        <InputLabel>Metal Type</InputLabel>
                        <Select
                          value={formData.metalType}
                          onChange={(e) => setFormData(prev => ({ ...prev, metalType: e.target.value }))}
                          label="Metal Type"
                        >
                          {metalTypes.map((metal) => (
                            <MenuItem key={metal.value} value={metal.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                  sx={{
                                    width: 16,
                                    height: 16,
                                    bgcolor: metal.color,
                                    borderRadius: '50%',
                                    mr: 1,
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

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Subcategory (Optional)"
                        value={formData.subcategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                        placeholder="e.g., ring_sizing"
                      />
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
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Process Selection */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">⚙️ Process Selection</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addProcess}
                      variant="outlined"
                      size="small"
                    >
                      Add Process
                    </Button>
                  </Box>

                  {formData.processes.map((process, index) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                              <InputLabel>Process</InputLabel>
                              <Select
                                value={process.processId}
                                onChange={(e) => updateProcess(index, 'processId', e.target.value)}
                                label="Process"
                              >
                                {availableProcesses.map((proc) => (
                                  <MenuItem key={proc._id} value={proc._id}>
                                    <Box>
                                      <Typography variant="body2" fontWeight="bold">
                                        {proc.displayName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {proc.laborMinutes}min • ${proc.equipmentCost} equipment • {proc.skillLevel}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Quantity"
                              type="number"
                              value={process.quantity}
                              onChange={(e) => updateProcess(index, 'quantity', parseFloat(e.target.value) || 1)}
                              inputProps={{ min: 1, max: 10, step: 1 }}
                            />
                          </Grid>

                          <Grid item xs={12} md={2}>
                            {process.processId && (
                              <Box>
                                {(() => {
                                  const proc = availableProcesses.find(p => p._id === process.processId);
                                  const complexity = proc?.metalComplexity?.[formData.metalType] || 1.0;
                                  const adjustedTime = proc ? proc.laborMinutes * complexity * process.quantity : 0;
                                  return (
                                    <Typography variant="caption" color="primary">
                                      {Math.round(adjustedTime * 100) / 100} min
                                    </Typography>
                                  );
                                })()}
                              </Box>
                            )}
                          </Grid>

                          <Grid item xs={12} md={1}>
                            <IconButton
                              onClick={() => removeProcess(index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {formData.processes.length === 0 && (
                    <Alert severity="info">
                      Add at least one process to calculate pricing.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Material Selection */}
            <Grid item xs={12}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">🧪 Material Selection</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={addMaterial}
                      variant="outlined"
                      size="small"
                    >
                      Add Material
                    </Button>
                  </Box>

                  {formData.materials.map((material, index) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                              <InputLabel>Material</InputLabel>
                              <Select
                                value={material.materialId}
                                onChange={(e) => updateMaterial(index, 'materialId', e.target.value)}
                                label="Material"
                              >
                                {getCompatibleMaterials().map((mat) => (
                                  <MenuItem key={mat._id} value={mat._id}>
                                    <Box>
                                      <Typography variant="body2" fontWeight="bold">
                                        {mat.displayName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        ${mat.unitCost} per {mat.unitType} • {mat.category}
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Quantity"
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 1)}
                              inputProps={{ min: 0.1, max: 10, step: 0.1 }}
                            />
                          </Grid>

                          <Grid item xs={12} md={2}>
                            {material.materialId && (
                              <Box>
                                {(() => {
                                  const mat = availableMaterials.find(m => m._id === material.materialId);
                                  const totalCost = mat ? mat.unitCost * material.quantity : 0;
                                  return (
                                    <Typography variant="caption" color="primary">
                                      ${Math.round(totalCost * 100) / 100}
                                    </Typography>
                                  );
                                })()}
                              </Box>
                            )}
                          </Grid>

                          <Grid item xs={12} md={1}>
                            <IconButton
                              onClick={() => removeMaterial(index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}

                  {formData.materials.length === 0 && (
                    <Alert severity="info">
                      Add at least one material to calculate pricing.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Price Preview */}
            {pricePreview && (
              <Grid item xs={12}>
                <Card sx={{ bgcolor: 'primary.50', borderLeft: 4, borderColor: 'primary.main' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CalculateIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" color="primary">
                        Price Preview
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Process Labor: <strong>{pricePreview.totalLaborMinutes} minutes</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Equipment Cost: <strong>${pricePreview.totalEquipmentCost}</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Material Cost: <strong>${pricePreview.totalMaterialCost}</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Marked-up Materials: <strong>${pricePreview.markedUpMaterialCost}</strong></Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Base Cost: <strong>${pricePreview.baseCost}</strong></Typography>
                        <Typography variant="h6" color="success.main">Retail Price: <strong>${pricePreview.retailPrice}</strong></Typography>
                        <Typography variant="body1" color="info.main">Wholesale Price: <strong>${pricePreview.wholesalePrice}</strong></Typography>
                        <Typography variant="caption" color="text.secondary">Business Multiplier: {pricePreview.businessMultiplier}x</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || formData.processes.length === 0 || formData.materials.length === 0}
                  startIcon={loading ? null : <AddIcon />}
                >
                  {loading ? 'Creating...' : 'Create Process-Based Task'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/dashboard/admin/tasks')}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>

          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
