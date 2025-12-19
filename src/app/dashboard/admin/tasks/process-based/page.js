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
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Calculate as CalculateIcon,
  PreviewOutlined as PreviewIcon
} from '@mui/icons-material';
import pricingEngine from '@/services/PricingEngine';

export default function ProcessBasedTaskBuilder() {
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'shanks',
    subcategory: '',
    metalType: 'yellow_gold',
    karat: '14k',
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
  const [dataLoadErrors, setDataLoadErrors] = useState({
    processes: false,
    materials: false,
    settings: false
  });
  
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
    console.log('🔥 calculatePricePreview called', { 
      adminSettings: !!adminSettings, 
      processesLength: formData.processes.length,
      processes: formData.processes,
      materials: formData.materials
    });

    console.log('🔥 FULL adminSettings object:', JSON.stringify(adminSettings, null, 2));

    if (!adminSettings || formData.processes.length === 0) {
      console.log('🔥 Clearing price preview - no admin settings or processes');
      setPricePreview(null);
      return;
    }

    try {
      let totalLaborHours = 0;
      let totalProcessCost = 0; // Process costs already include their materials
      let processMaterialCost = 0; // For display only - RAW materials within processes
      let processMarkedUpMaterialCost = 0; // For display only - MARKED UP materials within processes
      let taskMaterialCost = 0; // Only additional task materials (not in processes)

      console.log('🔥 Calculating costs with separation: processes vs task materials');

      // Calculate process costs and extract process materials for display
      for (const processSelection of formData.processes) {
        const process = availableProcesses.find(p => p._id === processSelection.processId);
        console.log('🔥 Processing selected process:', {
          processSelection,
          foundProcess: !!process,
          processName: process?.displayName,
          processLaborHours: process?.laborHours,
          processStoredPricing: process?.pricing?.totalCost,
          processMaterials: process?.materials
        });
        
        if (process) {
          const quantity = processSelection.quantity || 1;
          
          // Always add labor hours regardless of pricing method
          const laborHours = (process.laborHours || 0) * quantity;
          totalLaborHours += laborHours;
          
          console.log('🔥 Added labor hours:', {
            processName: process.displayName,
            baseLaborHours: process.laborHours,
            quantity,
            addedLaborHours: laborHours,
            totalLaborHoursNow: totalLaborHours
          });
          
          // Use stored pricing if available, otherwise calculate
          if (process.pricing?.totalCost) {
            const addedProcessCost = process.pricing.totalCost * quantity;
            totalProcessCost += addedProcessCost;
            
            // Extract material costs from stored pricing for DISPLAY ONLY
            // (These are already included in the totalProcessCost above)
            if (process.pricing.baseMaterialsCost) {
              const rawMaterialCost = process.pricing.baseMaterialsCost * quantity;
              processMaterialCost += rawMaterialCost; // Raw materials for display
            }
            
            if (process.pricing.materialsCost) {
              const markedUpMaterialCost = process.pricing.materialsCost * quantity;
              processMarkedUpMaterialCost += markedUpMaterialCost; // Marked-up materials for display
            }
            
            console.log('🔥 Added material costs for display:', {
              processName: process.displayName,
              baseMaterialsCost: process.pricing.baseMaterialsCost,
              materialsCost: process.pricing.materialsCost,
              quantity,
              processMaterialCostNow: processMaterialCost,
              processMarkedUpMaterialCostNow: processMarkedUpMaterialCost
            });
            
            console.log('🔥 Added stored process cost (includes materials):', {
              processName: process.displayName,
              storedCost: process.pricing.totalCost,
              quantity,
              addedCost: addedProcessCost,
              totalProcessCostNow: totalProcessCost
            });
          } else {
            console.log('🔥 No stored pricing for process:', process.displayName);
            
            // If no stored pricing, add the process's material costs for display
            if (process.materials && process.materials.length > 0) {
              for (const processMaterial of process.materials) {
                const materialCost = (processMaterial.estimatedCost || 0) * quantity;
                processMaterialCost += materialCost;
                console.log('🔥 Added process material cost for display:', {
                  processName: process.displayName,
                  materialName: processMaterial.materialName,
                  estimatedCost: processMaterial.estimatedCost,
                  quantity,
                  addedMaterialCost: materialCost,
                  processMaterialCostNow: processMaterialCost
                });
              }
            }
          }
        }
      }

      // Calculate additional task materials (separate from processes)
      console.log('🔥 Calculating additional task materials:', formData.materials);
      for (const materialSelection of formData.materials) {
        const material = availableMaterials.find(m => m._id === materialSelection.materialId);
        if (material) {
          const quantity = materialSelection.quantity || 1;
          const materialCost = (material.unitCost || material.costPerPortion || 0) * quantity;
          taskMaterialCost += materialCost;
          console.log('🔥 Added task material cost:', {
            materialName: material.name,
            unitCost: material.unitCost,
            costPerPortion: material.costPerPortion,
            quantity,
            addedMaterialCost: materialCost,
            taskMaterialCostNow: taskMaterialCost
          });
        }
      }

      // Use PricingEngine for consistent calculations
      console.warn('⚠️ DEPRECATED: Inline pricing calculation - Using PricingEngine');
      
      // Build task data structure for PricingEngine
      const taskData = {
        processes: formData.processes.map(ps => ({
          processId: ps.processId,
          quantity: ps.quantity || 1
        })),
        materials: formData.materials.map(ms => ({
          materialId: ms.materialId,
          quantity: ms.quantity || 1
        }))
      };
      
      const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings, availableProcesses, availableMaterials);
      
      // Use PricingEngine results
      const retailPrice = pricing.retailPrice;
      const wholesalePrice = pricing.wholesalePrice;
      const businessMultiplier = pricing.businessMultiplier;
      const baseCost = pricing.baseCost;
      const markedUpTaskMaterials = pricing.markedUpMaterialCost - processMarkedUpMaterialCost;
      
      // Calculate display totals (for UI display only)
      const totalDisplayMaterialCost = processMaterialCost + taskMaterialCost;
      const totalDisplayMarkedUpMaterials = processMarkedUpMaterialCost + markedUpTaskMaterials;
      
      console.log('🔥 Using PricingEngine for consistent calculations:', {
        totalLaborHours,
        totalProcessCost: `$${totalProcessCost.toFixed(2)} (includes labor AND process materials already)`,
        processMaterialCost: `$${processMaterialCost.toFixed(2)} (raw process materials for display)`,
        processMarkedUpMaterialCost: `$${processMarkedUpMaterialCost.toFixed(2)} (marked-up process materials for display)`,
        taskMaterialCost: `$${taskMaterialCost.toFixed(2)} (raw task materials)`,
        markedUpTaskMaterials: `$${markedUpTaskMaterials.toFixed(2)} (task materials with markup)`,
        totalDisplayMaterialCost: `$${totalDisplayMaterialCost.toFixed(2)} (all raw materials for display)`,
        totalDisplayMarkedUpMaterials: `$${totalDisplayMarkedUpMaterials.toFixed(2)} (all marked-up materials for display)`,
        baseCost: `$${baseCost.toFixed(2)} (from PricingEngine)`,
        businessMultiplier: `${businessMultiplier}x (from PricingEngine)`,
        retailPrice: `$${retailPrice.toFixed(2)} (from PricingEngine)`,
        wholesalePrice: `$${wholesalePrice.toFixed(2)} (from PricingEngine)`
      });

      console.log('🔥 Final price preview calculation (fixed double counting of labor):', {
        totalLaborHours,
        totalProcessCost: `$${totalProcessCost.toFixed(2)} (from processes - includes labor AND process materials)`,
        processMaterialCost: `$${processMaterialCost.toFixed(2)} (raw process materials for display)`,
        processMarkedUpMaterialCost: `$${processMarkedUpMaterialCost.toFixed(2)} (marked-up process materials)`,
        taskMaterialCost: `$${taskMaterialCost.toFixed(2)} (raw task materials)`,
        totalDisplayMaterialCost: `$${totalDisplayMaterialCost.toFixed(2)} (all raw materials for display)`,
        totalDisplayMarkedUpMaterials: `$${totalDisplayMarkedUpMaterials.toFixed(2)} (all marked-up materials for display)`,
        markedUpTaskMaterials: `$${markedUpTaskMaterials.toFixed(2)} (task materials × ${adminSettings.pricing.materialMarkup || 1.5})`,
        baseCost: `$${baseCost.toFixed(2)} (process costs + marked up task materials - NO DOUBLE LABOR)`,
        businessMultiplier: `${businessMultiplier}x`,
        retailPrice: `$${retailPrice.toFixed(2)}`,
        wholesalePrice: `$${wholesalePrice.toFixed(2)}`
      });

      const pricePreviewData = {
        totalLaborHours: Math.round(totalLaborHours * 100) / 100,
        totalProcessCost: Math.round(totalProcessCost * 100) / 100,
        totalMaterialCost: Math.round(totalDisplayMaterialCost * 100) / 100, // For display
        markedUpMaterialCost: Math.round(totalDisplayMarkedUpMaterials * 100) / 100, // For display
        baseCost: Math.round(baseCost * 100) / 100,
        retailPrice: retailPrice || 0,
        wholesalePrice: wholesalePrice || 0,
        businessMultiplier: Math.round(businessMultiplier * 100) / 100
      };

      console.log('🔥 Setting price preview data (fixed):', pricePreviewData);
      setPricePreview(pricePreviewData);

    } catch (error) {
      console.error('Price calculation error:', error);
    }
  }, [formData.processes, formData.materials, adminSettings, availableProcesses, availableMaterials]);

  // Recalculate price when form changes
  useEffect(() => {
    console.log('🔥 useEffect triggered for price calculation:', {
      processesLength: formData.processes.length,
      hasAdminSettings: !!adminSettings,
      adminSettingsValue: adminSettings,
      materialsLength: formData.materials.length
    });
    if (formData.processes.length > 0 && adminSettings) {
      console.log('🔥 Calling calculatePricePreview...');
      calculatePricePreview();
    } else {
      console.log('🔥 Not calling calculatePricePreview - missing requirements:', {
        hasProcesses: formData.processes.length > 0,
        hasAdminSettings: !!adminSettings
      });
    }
  }, [formData.processes, formData.materials, adminSettings, calculatePricePreview]);

  const loadInitialData = async () => {
    try {
      console.log('🔥 Starting initial data load...');
      
      // Add credentials to ensure authentication is passed
      const fetchOptions = {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      const [processesRes, materialsRes, settingsRes] = await Promise.all([
        fetch('/api/processes', fetchOptions),
        fetch('/api/materials', fetchOptions),
        fetch('/api/admin/settings', fetchOptions)
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        console.log('🔥 Loaded processes successfully:', processesData);
        setAvailableProcesses(processesData.processes || []);
        setDataLoadErrors(prev => ({ ...prev, processes: false }));
      } else {
        console.error('🔥 Failed to load processes:', {
          status: processesRes.status,
          statusText: processesRes.statusText,
          url: processesRes.url
        });
        setDataLoadErrors(prev => ({ ...prev, processes: true }));
        // Try to get error details
        try {
          const errorData = await processesRes.json();
          console.error('🔥 Processes API error details:', errorData);
        } catch (e) {
          console.error('🔥 Could not parse processes error response');
        }
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        console.log('🔥 Loaded materials successfully:', materialsData);
        setAvailableMaterials(materialsData.materials || []);
        setDataLoadErrors(prev => ({ ...prev, materials: false }));
      } else {
        console.error('🔥 Failed to load materials:', {
          status: materialsRes.status,
          statusText: materialsRes.statusText,
          url: materialsRes.url
        });
        setDataLoadErrors(prev => ({ ...prev, materials: true }));
        // Try to get error details
        try {
          const errorData = await materialsRes.json();
          console.error('🔥 Materials API error details:', errorData);
        } catch (e) {
          console.error('🔥 Could not parse materials error response');
        }
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        console.log('🔥 TASK BUILDER - Raw settings response:', settingsData);
        // Handle both possible response structures
        const settings = settingsData.settings || settingsData;
        console.log('🔥 TASK BUILDER - Loaded admin settings:', settings);
        console.log('🔥 TASK BUILDER - Admin settings pricing:', settings.pricing);
        console.log('🔥 TASK BUILDER - Admin settings type:', typeof settings);
        console.log('🔥 TASK BUILDER - Admin settings keys:', Object.keys(settings));
        if (settings.pricing) {
          console.log('🔥 TASK BUILDER - Pricing keys:', Object.keys(settings.pricing));
          console.log('🔥 TASK BUILDER - Administrative fee:', settings.pricing.administrativeFee);
          console.log('🔥 TASK BUILDER - Business fee:', settings.pricing.businessFee);
          console.log('🔥 TASK BUILDER - Consumables fee:', settings.pricing.consumablesFee);
          console.log('🔥 TASK BUILDER - Material markup:', settings.pricing.materialMarkup);
          console.log('🔥 TASK BUILDER - Wage:', settings.pricing.wage);
        }
        setAdminSettings(settings);
      } else {
        console.error('🔥 TASK BUILDER - Failed to load admin settings:', settingsRes.status, settingsRes.statusText);
        // Set fallback settings so the price preview still works
        const fallbackSettings = {
          pricing: {
            wage: 30,
            materialMarkup: 1.5,
            administrativeFee: 0.1,
            businessFee: 0.15,
            consumablesFee: 0.05
          }
        };
        console.log('🔥 TASK BUILDER - Using fallback settings:', fallbackSettings);
        setAdminSettings(fallbackSettings);
      }

    } catch (error) {
      console.error('🔥 TASK BUILDER - Error loading initial data:', error);
      // Set fallback settings on error
      const fallbackSettings = {
        pricing: {
          wage: 30,
          materialMarkup: 1.5,
          administrativeFee: 0.1,
          businessFee: 0.15,
          consumablesFee: 0.05
        }
      };
      console.log('🔥 TASK BUILDER - Using fallback settings due to error:', fallbackSettings);
      setAdminSettings(fallbackSettings);
      setError('Some data failed to load. Processes and materials may not be available. Please check your connection and try refreshing the page.');
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
      // Calculate final pricing information to store with the task
      let calculatedPricing = null;
      
      if (formData.processes.length > 0 && adminSettings && pricePreview) {
        calculatedPricing = {
          totalLaborHours: pricePreview.totalLaborHours,
          totalProcessCost: pricePreview.totalProcessCost,
          totalMaterialCost: pricePreview.totalMaterialCost,
          markedUpMaterialCost: pricePreview.markedUpMaterialCost,
          baseCost: pricePreview.baseCost,
          retailPrice: pricePreview.retailPrice,
          wholesalePrice: pricePreview.wholesalePrice,
          businessMultiplier: pricePreview.businessMultiplier,
          adminSettings: {
            materialMarkup: adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup,
            laborRates: adminSettings.laborRates,
            businessFees: {
              administrativeFee: adminSettings.pricing?.administrativeFee || 0,
              businessFee: adminSettings.pricing?.businessFee || 0,
              consumablesFee: adminSettings.pricing?.consumablesFee || 0
            }
          },
          calculatedAt: new Date().toISOString()
        };
        
        console.log('🔥 Calculated pricing for task submission:', calculatedPricing);
      }

      // Enhanced form data with pricing information
      const taskData = {
        ...formData,
        pricing: calculatedPricing,
        // Include additional metadata
        createdAt: new Date().toISOString(),
        hasStoredPricing: !!calculatedPricing
      };
      
      console.log('🔥 Submitting task data:', taskData);

      const response = await fetch('/api/tasks/process-based', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Process-based task created successfully!');
        console.log('🔥 Task created with pricing data:', data);
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
    { value: 'shanks', label: '� Shanks', emoji: '�' },
    { value: 'prongs', label: '🔧 Prongs', emoji: '🔧' },
    { value: 'chains', label: '🔗 Chains', emoji: '🔗' },
    { value: 'stone_setting', label: '💎 Stone Setting', emoji: '💎' },
    { value: 'misc', label: '🛠️ Misc', emoji: '🛠️' },
    { value: 'watches', label: '⌚ Watches', emoji: '⌚' },
    { value: 'engraving', label: '✍️ Engraving', emoji: '✍️' },
    { value: 'bracelets', label: '📿 Bracelets', emoji: '📿' }
  ];

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
    'N/A' // For mixed or non-precious metals
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Task Builder
          </Typography>
          <Chip 
            label="Recommended" 
            color="success" 
            size="small" 
            sx={{ ml: 2 }}
          />
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create tasks by selecting processes and materials for accurate pricing and better workflow management.
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

        {(dataLoadErrors.processes || dataLoadErrors.materials) && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={loadInitialData}>
                Retry
              </Button>
            }
          >
            <strong>Data Loading Issues:</strong>
            {dataLoadErrors.processes && <div>• Processes could not be loaded (you won&apos;t be able to select processes)</div>}
            {dataLoadErrors.materials && <div>• Materials could not be loaded (material selection will be limited)</div>}
            <div style={{ marginTop: '8px' }}>
              <strong>Possible causes:</strong> Authentication timeout, network issues, or API problems. 
              Try refreshing the page or logging out and back in.
            </div>
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
                      <FormControl fullWidth required>
                        <InputLabel>Karat/Purity</InputLabel>
                        <Select
                          value={formData.karat}
                          onChange={(e) => setFormData(prev => ({ ...prev, karat: e.target.value }))}
                          label="Karat/Purity"
                        >
                          {karatOptions.map((karat) => (
                            <MenuItem key={karat} value={karat}>
                              {karat}
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
                            <Autocomplete
                              options={availableProcesses}
                              getOptionLabel={(option) => option.displayName || ''}
                              value={availableProcesses.find(p => p._id === process.processId) || null}
                              onChange={(event, newValue) => {
                                updateProcess(index, 'processId', newValue?._id || '');
                              }}
                              filterOptions={(options, { inputValue }) => {
                                const filtered = options.filter(option => {
                                  const searchText = inputValue.toLowerCase();
                                  return (
                                    option.displayName?.toLowerCase().includes(searchText) ||
                                    option.processType?.toLowerCase().includes(searchText) ||
                                    option.skillLevel?.toLowerCase().includes(searchText) ||
                                    option.description?.toLowerCase().includes(searchText)
                                  );
                                });
                                return filtered;
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Process"
                                  placeholder="Search processes..."
                                  required
                                />
                              )}
                              renderOption={(props, option) => {
                                const { key, ...otherProps } = props;
                                return (
                                  <Box component="li" key={key} {...otherProps}>
                                    <Box>
                                      <Typography variant="body2" fontWeight="bold">
                                        {option.displayName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {option.laborHours}hrs • ${option.pricing?.totalCost || 0} total • {option.skillLevel}
                                      </Typography>
                                      {option.processType && (
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                          • {option.processType}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              }}
                              isOptionEqualToValue={(option, value) => option._id === value._id}
                              noOptionsText="No processes found"
                            />
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
                                  const adjustedTime = proc ? proc.laborHours * complexity * process.quantity : 0;
                                  return (
                                    <Typography variant="caption" color="primary">
                                      {Math.round(adjustedTime * 100) / 100} hrs
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
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Add materials that will be consumed during this task. Materials are optional - you can create process-only tasks.
                  </Typography>
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
                      No materials selected - this will be a process-only task.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Price Preview */}
            {console.log('Rendering price preview section, pricePreview:', pricePreview)}
            {console.log('🔥 Price preview condition check:', {
              hasPricePreview: !!pricePreview,
              hasRetailPrice: pricePreview?.retailPrice,
              retailPriceValue: pricePreview?.retailPrice,
              formDataProcesses: formData.processes.length,
              adminSettingsAvailable: !!adminSettings,
              adminSettingsValue: adminSettings,
              processesArray: formData.processes
            })}
            {pricePreview && Object.keys(pricePreview).length > 0 && (
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
                        <Typography variant="body2" color="text.secondary">Process Labor: <strong>{pricePreview?.totalLaborHours || 0} hours</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Process Cost: <strong>${pricePreview?.totalProcessCost || 0}</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Material Cost: <strong>${pricePreview?.totalMaterialCost || 0}</strong></Typography>
                        <Typography variant="body2" color="text.secondary">Marked-up Materials: <strong>${pricePreview?.markedUpMaterialCost || 0}</strong></Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2" color="text.secondary">Base Cost: <strong>${pricePreview?.baseCost || 0}</strong></Typography>
                        <Typography variant="h6" color="success.main">Retail Price: <strong>${pricePreview?.retailPrice || 0}</strong></Typography>
                        <Typography variant="body1" color="info.main">Wholesale Price: <strong>${pricePreview?.wholesalePrice || 0}</strong></Typography>
                        <Typography variant="caption" color="text.secondary">Business Multiplier: {pricePreview?.businessMultiplier || 1}x</Typography>
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
                  disabled={loading || formData.processes.length === 0}
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
