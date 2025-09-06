'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Chip,
  Card,
  CardContent,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';

// Import utility functions for metal variants and pricing
import { 
  METAL_TYPES, 
  KARAT_OPTIONS,
  getMetalVariantsFromMaterials,
  calculateProcessCost,
  parseMetalKey
} from '@/utils/processes.util';

// Simple Metal Context Hook (inline implementation)
const useSimpleMetalContext = () => {
  const [metalContext, setMetalContext] = useState({
    metalType: 'yellow_gold',
    karat: '14k'
  });

  const setMetalType = (metalType) => {
    setMetalContext(prev => ({ ...prev, metalType }));
  };

  const setKarat = (karat) => {
    setMetalContext(prev => ({ ...prev, karat }));
  };

  return {
    currentMetalContext: metalContext,
    setMetalType,
    setKarat,
    error: null
  };
};

// Metal Context Selector Component
function MetalContextSelector() {
  const { currentMetalContext, setMetalType, setKarat, error } = useSimpleMetalContext();
  
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

  const karatOptions = ['10k', '14k', '18k', '22k', '24k', '925', '999', '950', '900', 'N/A'];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Metal Type</InputLabel>
          <Select
            value={currentMetalContext.metalType}
            onChange={(e) => setMetalType(e.target.value)}
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
            value={currentMetalContext.karat}
            onChange={(e) => setKarat(e.target.value)}
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
      
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</Alert>
        </Grid>
      )}
    </Grid>
  );
}

// Enhanced Metal-Specific Price Preview Component
function MetalSpecificPricePreview({ 
  pricesByMetal, 
  universalPrice, 
  selectedProcesses, 
  availableProcesses, 
  availableMaterials 
}) {
  if (!pricesByMetal || Object.keys(pricesByMetal).length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Price Preview by Metal Type
          </Typography>
          <Alert severity="info">
            Select processes to see pricing preview for each metal type
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const metalEntries = Object.entries(pricesByMetal);
  const hasMultipleMetals = metalEntries.length > 1;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Price Preview by Metal Type
        </Typography>

        {hasMultipleMetals ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Pricing varies by metal type based on materials and complexity multipliers:
            </Typography>

            <Grid container spacing={2}>
              {metalEntries.map(([metalKey, pricing]) => (
                <Grid item xs={12} md={6} lg={4} key={metalKey}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      border: '2px solid',
                      borderColor: 'primary.light',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {pricing.metalLabel || metalKey}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      Labor: <strong>{pricing.totalLaborHours || 0}h</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Process Cost: <strong>${pricing.totalProcessCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Material Cost: <strong>${pricing.totalMaterialCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complexity: <strong>{pricing.metalComplexity || 1.0}x</strong>
                    </Typography>
                    
                    <Box sx={{ 
                      mt: 1, 
                      pt: 1, 
                      borderTop: '1px solid', 
                      borderColor: 'divider' 
                    }}>
                      <Typography variant="h6" color="success.main">
                        Retail: <strong>${pricing.retailPrice || 0}</strong>
                      </Typography>
                      <Typography variant="body2" color="info.main">
                        Wholesale: <strong>${pricing.wholesalePrice || 0}</strong>
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Price Range Summary */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                Price Range Summary:
              </Typography>
              {(() => {
                const retailPrices = metalEntries.map(([_, pricing]) => pricing.retailPrice || 0);
                const minRetail = Math.min(...retailPrices);
                const maxRetail = Math.max(...retailPrices);
                
                const wholesalePrices = metalEntries.map(([_, pricing]) => pricing.wholesalePrice || 0);
                const minWholesale = Math.min(...wholesalePrices);
                const maxWholesale = Math.max(...wholesalePrices);
                
                return (
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Retail: <strong>${minRetail} - ${maxRetail}</strong>
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        Wholesale: <strong>${minWholesale} - ${maxWholesale}</strong>
                      </Typography>
                    </Grid>
                  </Grid>
                );
              })()}
            </Box>
          </>
        ) : (
          // Single metal type or universal pricing
          <Grid container spacing={2}>
            {metalEntries.map(([metalKey, pricing]) => (
              <Grid item xs={12} key={metalKey}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {pricing.metalLabel || 'Universal Pricing'}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Process Labor: <strong>{pricing.totalLaborHours || 0} hours</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Process Cost: <strong>${pricing.totalProcessCost || 0}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Material Cost: <strong>${pricing.totalMaterialCost || 0}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Base Cost: <strong>${pricing.baseCost || 0}</strong>
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      Retail Price: <strong>${pricing.retailPrice || 0}</strong>
                    </Typography>
                    <Typography variant="body1" color="info.main">
                      Wholesale Price: <strong>${pricing.wholesalePrice || 0}</strong>
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            ))}
          </Grid>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {hasMultipleMetals 
              ? "Prices vary by metal type based on materials used and complexity multipliers. Customer can choose their preferred metal during ordering."
              : "This task works universally with automatic pricing adjustments based on metal complexity and market rates."
            }
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Main Task Builder Component
export default function CreateTaskPage() {
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
  const [pricesByMetal, setPricesByMetal] = useState({});

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('🔄 Loading initial data for universal task builder...');
      
      // Load processes, materials, and admin settings in parallel
      const [processesRes, materialsRes, settingsRes] = await Promise.all([
        fetch('/api/processes', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        fetch('/api/materials', {
          method: 'GET', 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        fetch('/api/admin/settings', {
          method: 'GET',
          credentials: 'include', 
          headers: {
            'Content-Type': 'application/json',
          }
        })
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        console.log('✅ Raw processes data from API:', processesData);
        console.log('✅ Loaded processes count:', processesData.processes?.length || 0);
        
        // Log the first process to see its structure
        if (processesData.processes && processesData.processes.length > 0) {
          console.log('🔍 First process raw data:', JSON.stringify(processesData.processes[0], null, 2));
        }
        
        // Ensure processes array is clean
        const cleanProcesses = (processesData.processes || []).map(process => {
          console.log('🧹 Cleaning process:', process.displayName, 'Pricing type:', typeof process.pricing);
          return {
            _id: process._id || '',
            name: typeof process.name === 'string' ? process.name : 'Unknown Process',
            displayName: typeof process.displayName === 'string' ? process.displayName : process.name || 'Unknown Process',
            skillLevel: typeof process.skillLevel === 'string' ? process.skillLevel : 'Standard',
            laborHours: typeof process.laborHours === 'number' ? process.laborHours : 0,
            category: typeof process.category === 'string' ? process.category : '',
            materials: Array.isArray(process.materials) ? process.materials : [],
            pricing: process.pricing && typeof process.pricing === 'object' ? {
              ...process.pricing,
              // Preserve totalCost whether it's a number (universal) or object (multi-variant)
              totalCost: process.pricing.totalCost || 0
            } : { totalCost: 0 }
          };
        });
        
        console.log('🧹 Clean processes result:', cleanProcesses);
        setAvailableProcesses(cleanProcesses);
        setDataLoadErrors(prev => ({ ...prev, processes: false }));
      } else {
        console.error('❌ Failed to load processes - Status:', processesRes.status);
        const errorData = await processesRes.text();
        console.error('❌ Process error details:', errorData);
        setDataLoadErrors(prev => ({ ...prev, processes: true }));
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        console.log('✅ Loaded materials count:', materialsData.materials?.length || 0);
        
        // Ensure materials array is clean and doesn't have objects that could be accidentally rendered
        const cleanMaterials = (materialsData.materials || []).map(material => ({
          _id: material._id || '',
          name: typeof material.name === 'string' ? material.name : 'Unknown Material',
          displayName: typeof material.displayName === 'string' ? material.displayName : material.name || 'Unknown Material',
          category: typeof material.category === 'string' ? material.category : 'Material',
          unitCost: typeof material.unitCost === 'number' ? material.unitCost : 0,
          pricing: material.pricing && typeof material.pricing === 'object' ? {
            basePrice: typeof material.pricing.basePrice === 'number' ? material.pricing.basePrice : 0
          } : { basePrice: 0 },
          // Preserve crucial pricing data for multi-variant materials
          stullerProducts: Array.isArray(material.stullerProducts) ? material.stullerProducts : [],
          portionsPerUnit: typeof material.portionsPerUnit === 'number' ? material.portionsPerUnit : 1,
          baseCostPerPortion: typeof material.baseCostPerPortion === 'number' ? material.baseCostPerPortion : 0,
          estimatedCost: typeof material.estimatedCost === 'number' ? material.estimatedCost : 0,
          isMetalDependent: typeof material.isMetalDependent === 'boolean' ? material.isMetalDependent : false,
          metalTypes: Array.isArray(material.metalTypes) ? material.metalTypes : [],
          sku: typeof material.sku === 'string' ? material.sku : ''
        }));
        
        setAvailableMaterials(cleanMaterials);
        setDataLoadErrors(prev => ({ ...prev, materials: false }));
      } else {
        console.error('❌ Failed to load materials');
        setDataLoadErrors(prev => ({ ...prev, materials: true }));
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settings = settingsData.settings || settingsData;
        console.log('✅ Loaded admin settings');
        setAdminSettings(settings);
        setDataLoadErrors(prev => ({ ...prev, settings: false }));
      } else {
        console.error('❌ Failed to load admin settings');
        setDataLoadErrors(prev => ({ ...prev, settings: true }));
      }

    } catch (error) {
      console.error('💥 Error loading initial data:', error);
      const errorMessage = typeof error === 'string' ? error : (error.message || 'Failed to load essential data. Please refresh the page.');
      setError(errorMessage);
    }
  };

  // Calculate metal-specific pricing
  const calculateMetalSpecificPricing = useCallback(async () => {
    if (!adminSettings || (formData.processes.length === 0 && formData.materials.length === 0)) {
      setPricePreview(null);
      setPricesByMetal({});
      return;
    }

    try {
      console.log('🔄 Calculating metal-specific pricing...');
      
      // Use the same robust metal variant detection as process creation
      const relevantMetalVariants = getMetalVariantsFromMaterials(formData.materials || [], availableMaterials);
      
      // Also check processes for additional metal variants (legacy support)
      const processMetalVariantsMap = new Map();
      for (const processSelection of formData.processes) {
        const process = availableProcesses.find(p => p._id === processSelection.processId);
        
        if (process && process.pricing?.totalCost && typeof process.pricing.totalCost === 'object') {
          console.log('✅ Found metal-specific pricing for process:', process.displayName);
          
          Object.keys(process.pricing.totalCost).forEach(metalKey => {
            const parsedMetal = parseMetalKey(metalKey);
            if (parsedMetal) {
              const variantKey = `${parsedMetal.metalType}_${parsedMetal.karat}`;
              processMetalVariantsMap.set(variantKey, {
                metalType: parsedMetal.metalType,
                karat: parsedMetal.karat,
                metalLabel: metalKey
              });
            }
          });
        }
      }
      
      // Combine material variants with process variants and ensure all have metalLabel
      const allMetalVariants = [...relevantMetalVariants].map(variant => ({
        ...variant,
        metalLabel: variant.metalLabel || `${variant.metalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${variant.karat}`
      }));
      processMetalVariantsMap.forEach(variant => {
        const existingVariant = allMetalVariants.find(v => 
          v.metalType === variant.metalType && v.karat === variant.karat
        );
        if (!existingVariant) {
          allMetalVariants.push({
            ...variant,
            metalLabel: variant.metalLabel || `${variant.metalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${variant.karat}`
          });
        }
      });
      
      const metalVariants = allMetalVariants;
      console.log('🔍 Metal variants detected:', metalVariants.length);
      
      const priceCalculations = {};
      const metalComplexityMultipliers = adminSettings.metalComplexityMultipliers || {};
      
      // If no metal-specific materials found, create universal pricing
      if (metalVariants.length === 0) {
        console.log('📊 No metal variants found, calculating universal pricing');
        
        let totalLaborHours = 0;
        let totalProcessCost = 0;
        let taskMaterialCost = 0;

        // Calculate process costs
        for (const processSelection of formData.processes) {
          const process = availableProcesses.find(p => p._id === processSelection.processId);
          if (process) {
            const quantity = processSelection.quantity || 1;
            const laborHours = (process.laborHours || 0) * quantity;
            totalLaborHours += laborHours;
            
            // Use stored pricing if available, otherwise calculate
            if (process.pricing?.totalCost) {
              totalProcessCost += process.pricing.totalCost * quantity;
            } else {
              // Fallback calculation
              const laborCost = laborHours * (adminSettings.pricing?.wage || 30);
              totalProcessCost += laborCost;
            }
          }
        }

        // Calculate additional task materials
        for (const materialSelection of formData.materials) {
          const material = availableMaterials.find(m => m._id === materialSelection.materialId);
          if (material) {
            const quantity = materialSelection.quantity || 1;
            taskMaterialCost += (material.unitCost || 0) * quantity;
          }
        }

        const markedUpMaterials = taskMaterialCost * (adminSettings.pricing?.materialMarkup || 1.5);
        const baseCost = totalProcessCost + markedUpMaterials;
        
        const businessMultiplier = (
          (adminSettings.pricing?.administrativeFee || 0) + 
          (adminSettings.pricing?.businessFee || 0) + 
          (adminSettings.pricing?.consumablesFee || 0) + 1
        );

        const retailPrice = baseCost * businessMultiplier;
        const wholesalePrice = baseCost * (businessMultiplier * 0.75); // 75% of retail

        priceCalculations['universal'] = {
          metalLabel: 'Universal Pricing',
          metalType: 'universal',
          karat: 'all',
          totalLaborHours: Math.round(totalLaborHours * 100) / 100,
          totalProcessCost: Math.round(totalProcessCost * 100) / 100,
          totalMaterialCost: Math.round(taskMaterialCost * 100) / 100,
          baseCost: Math.round(baseCost * 100) / 100,
          retailPrice: Math.round(retailPrice * 100) / 100,
          wholesalePrice: Math.round(wholesalePrice * 100) / 100,
          businessMultiplier: Math.round(businessMultiplier * 100) / 100,
          metalComplexity: 1.0
        };
        
        console.log('✅ Universal pricing calculated: $' + retailPrice.toFixed(2) + ' retail');
        
      } else {
        // Calculate pricing for each metal variant using existing process pricing data
        console.log('� Calculating pricing for ' + metalVariants.length + ' metal variants');
        
        for (const variant of metalVariants) {
          const { metalType, karat, metalLabel, baseCost: variantBaseCost } = variant;
          
          // Only log for 10K yellow gold to debug the calculation issue
          const isTargetMetal = metalType === 'yellow_gold' && karat === '10K';
          
          if (isTargetMetal) {
            console.log(`\n🎯 DEBUGGING 10K YELLOW GOLD CALCULATION ISSUE:`);
            console.log(`=== STARTING CALCULATION FOR ${metalLabel?.toUpperCase() || 'UNKNOWN METAL'} ===`);
            console.log(`📋 Metal Type: "${metalType}", Karat: "${karat}"`);
            console.log(`🏷️ Metal Label: "${metalLabel}"`);
          }
          
          const metalComplexity = metalComplexityMultipliers[metalType] || 1.0;
          if (isTargetMetal) {
            console.log(`⚙️ Metal complexity multiplier: ${metalComplexity}`);
          }
          let totalLaborHours = 0;
          let totalProcessCost = 0;
          let taskMaterialCost = 0;
          let taskMaterialCostWithoutMarkup = 0; // Track materials that still need markup

          if (isTargetMetal) {
            console.log(`\n💼 PROCESS COST CALCULATIONS (${formData.processes.length} processes):`);
          }
          
          // Calculate process costs using existing pricing data or stored base cost
          for (const processSelection of formData.processes) {
            const process = availableProcesses.find(p => p._id === processSelection.processId);
            if (process) {
              const quantity = processSelection.quantity || 1;
              const laborHours = (process.laborHours || 0) * quantity;
              
              if (isTargetMetal) {
                console.log(`\n  📊 Process: "${process.displayName}" (qty: ${quantity})`);
                console.log(`    - Labor hours: ${process.laborHours} × ${quantity} = ${laborHours}`);
              }
              
              totalLaborHours += laborHours;
              
              let processCostForThisMetal = 0;
              
              // Check if this specific process has metal-specific pricing for this metal
              if (process.pricing?.totalCost && typeof process.pricing.totalCost === 'object' && process.pricing.totalCost[metalLabel]) {
                const baseProcessCost = process.pricing.totalCost[metalLabel];
                processCostForThisMetal = baseProcessCost * quantity;
                if (isTargetMetal) {
                  console.log(`    ✅ METAL-SPECIFIC PRICING: $${baseProcessCost} × ${quantity} = $${processCostForThisMetal}`);
                }
              }
              // Check if this process matches our fallback data (Solder process)
              else if (variantBaseCost && process.displayName === 'Solder') {
                processCostForThisMetal = variantBaseCost * quantity;
                if (isTargetMetal) {
                  console.log(`    ⚡ STORED VARIANT COST: $${variantBaseCost} × ${quantity} = $${processCostForThisMetal}`);
                }
              }
              // Use universal pricing if available
              else if (process.pricing?.totalCost && typeof process.pricing.totalCost === 'number') {
                const universalCost = process.pricing.totalCost;
                processCostForThisMetal = universalCost * quantity;
                if (isTargetMetal) {
                  console.log(`    🌐 UNIVERSAL PRICING: $${universalCost} × ${quantity} = $${processCostForThisMetal}`);
                }
              } 
              // Fallback calculation with metal complexity
              else {
                const baseLaborCost = laborHours * (adminSettings.pricing?.wage || 30);
                const adjustedLaborCost = baseLaborCost * metalComplexity;
                processCostForThisMetal = adjustedLaborCost;
                if (isTargetMetal) {
                  console.log(`    🔧 FALLBACK CALCULATION: ${laborHours}h × $${adminSettings.pricing?.wage || 30} × ${metalComplexity} = $${processCostForThisMetal}`);
                }
              }
              
              totalProcessCost += processCostForThisMetal;
              if (isTargetMetal) {
                console.log(`    💰 Added $${processCostForThisMetal} → Total process cost: $${totalProcessCost}`);
              }
            }
          }

          // Calculate metal-specific material costs
          if (isTargetMetal) {
            console.log(`\n🧪 MATERIAL COST CALCULATIONS (${formData.materials.length} materials):`);
          }
          
          for (const materialSelection of formData.materials) {
            if (isTargetMetal) {
              console.log(`\n  📦 Material: "${materialSelection.materialId}" (qty: ${materialSelection.quantity})`);
            }
            
            // Find material by ID first, then fall back to SKU if available
            let material = availableMaterials.find(m => m._id === materialSelection.materialId);
            console.log(`    🔍 Material lookup by ID "${materialSelection.materialId}": ${material ? 'FOUND' : 'NOT FOUND'}`);
            
            // Only check SKU fallback if materialId didn't match and we actually have a materialSku
            if (!material && materialSelection.materialSku) {
              material = availableMaterials.find(m => m.sku === materialSelection.materialSku);
              console.log(`    🔍 Material lookup by SKU "${materialSelection.materialSku}": ${material ? 'FOUND' : 'NOT FOUND'}`);
            }
            
            if (material) {
              console.log(`    ✅ MATERIAL FOUND: "${material.displayName || material.name}" (ID: ${material._id})`);
              const quantity = materialSelection.quantity || 1;
              let materialCostForThisMetal = 0;
              
              console.log(`    � Material Properties:`);
              console.log(`      - material.stullerProducts.length: ${material.stullerProducts?.length || 0}`);
              console.log(`      - material.isMetalDependent: ${material.isMetalDependent}`);
              console.log(`      - material.unitCost: $${material.unitCost}`);
              console.log(`      - material.baseCostPerPortion: $${material.baseCostPerPortion || 0}`);
              console.log(`      - material.portionsPerUnit: ${material.portionsPerUnit || 1}`);
              
              // Check if we have proper metal-specific variants
              if (material.stullerProducts && Array.isArray(material.stullerProducts) && material.stullerProducts.length > 0) {
                console.log(`    🔍 SEARCHING FOR METAL-SPECIFIC VARIANT:`);
                console.log(`      - Looking for metalType: "${metalType}" and karat: "${karat}"`);
                
                const matchingProduct = material.stullerProducts.find(p => 
                  p.metalType === metalType && p.karat === karat
                );
                
                if (matchingProduct) {
                  console.log(`    ✅ METAL-SPECIFIC VARIANT FOUND!`);
                  console.log(`      - matchingProduct:`, JSON.stringify(matchingProduct, null, 2));
                  
                  // Use pricePerPortion if available (already includes markup)
                  let variantCost;
                  if (matchingProduct.pricePerPortion !== undefined) {
                    variantCost = matchingProduct.pricePerPortion;
                    console.log(`      💰 Using pricePerPortion (markup already applied): $${variantCost}`);
                  } else if (matchingProduct.costPerPortion !== undefined) {
                    variantCost = matchingProduct.costPerPortion;
                    console.log(`      💰 Using costPerPortion (base cost): $${variantCost}`);
                  } else {
                    // Fallback to calculating from stullerPrice (old structure)
                    const portionsPerUnit = material.portionsPerUnit || 1;
                    const stullerPrice = matchingProduct.stullerPrice || 0;
                    variantCost = stullerPrice / portionsPerUnit;
                    console.log(`      💰 Calculating from stullerPrice:`);
                    console.log(`        - matchingProduct.stullerPrice: $${stullerPrice}`);
                    console.log(`        - material.portionsPerUnit: ${portionsPerUnit}`);
                    console.log(`        - variantCost: $${stullerPrice} ÷ ${portionsPerUnit} = $${variantCost}`);
                  }
                  
                  if (variantCost > 0) {
                    materialCostForThisMetal = variantCost * quantity;
                    console.log(`      🧮 Final material cost: $${variantCost} × ${quantity} = $${materialCostForThisMetal.toFixed(2)}`);
                    
                    // Track which materials already have markup vs those that need it
                    if (matchingProduct.pricePerPortion !== undefined) {
                      // This material already has markup built-in
                      console.log(`      ✅ Using pricePerPortion - markup already applied`);
                    } else {
                      // This material needs markup applied later
                      console.log(`      📈 Using costPerPortion - will need markup applied`);
                      taskMaterialCostWithoutMarkup += materialCostForThisMetal;
                    }
                  } else {
                    console.warn(`      ⚠️ Variant cost is $0 - using $0.00`);
                    materialCostForThisMetal = 0;
                  }
                } else {
                  console.log(`    ❌ NO METAL-SPECIFIC VARIANT FOUND`);
                  console.log(`      - Available variants in stullerProducts:`);
                  material.stullerProducts.forEach((product, index) => {
                    console.log(`        [${index}] metalType: "${product.metalType}", karat: "${product.karat}"`);
                  });
                  materialCostForThisMetal = 0;
                }
              } else if (material.isMetalDependent || (material.metalTypes && material.metalTypes.length > 0)) {
                // Material is supposed to be metal-dependent but has no variants
                console.log(`    ⚠️ METAL-DEPENDENT MATERIAL WITH NO STULLER PRODUCTS:`);
                console.log(`      - material.isMetalDependent: ${material.isMetalDependent}`);
                console.log(`      - material.metalTypes: ${JSON.stringify(material.metalTypes)}`);
                console.log(`      - Using $0.00 cost`);
                materialCostForThisMetal = 0;
              } else {
                console.log(`    🔧 NON-METAL-DEPENDENT MATERIAL - CALCULATING BASE COST:`);
                
                // Non-metal-dependent materials should have base cost
                const portionsPerUnit = material.portionsPerUnit || 1;
                let baseCostPerPortion = 0;
                
                console.log(`      - material.portionsPerUnit: ${portionsPerUnit}`);
                
                // First check for migrated pricePerPortion (already includes markup) in stullerProducts
                if (material.stullerProducts && material.stullerProducts.length > 0) {
                  const firstProduct = material.stullerProducts[0];
                  console.log(`      - Checking first stullerProduct:`, JSON.stringify(firstProduct, null, 2));
                  
                  if (firstProduct.pricePerPortion !== undefined) {
                    baseCostPerPortion = firstProduct.pricePerPortion;
                    console.log(`      - Using pricePerPortion (markup already applied): $${baseCostPerPortion}`);
                  } else if (firstProduct.costPerPortion !== undefined) {
                    baseCostPerPortion = firstProduct.costPerPortion;
                    console.log(`      - Using costPerPortion (base cost): $${baseCostPerPortion}`);
                  } else {
                    // Fallback to calculating from stullerPrice
                    const stullerPrice = firstProduct.stullerPrice || 0;
                    baseCostPerPortion = stullerPrice / portionsPerUnit;
                    console.log(`      - Calculating from stullerPrice: $${stullerPrice} ÷ ${portionsPerUnit} = $${baseCostPerPortion}`);
                  }
                }
                // Fallback to unitCost calculation if no stullerProducts
                else if (material.unitCost && material.unitCost > 0) {
                  baseCostPerPortion = material.unitCost / portionsPerUnit;
                  console.log(`      - Using unitCost: $${material.unitCost} ÷ ${portionsPerUnit} = $${baseCostPerPortion}`);
                }
                // Legacy fallback for old costPerPortion field
                else if (material.costPerPortion && material.costPerPortion > 0) {
                  baseCostPerPortion = material.costPerPortion;
                  console.log(`      - Using legacy costPerPortion: $${baseCostPerPortion}`);
                }
                
                if (baseCostPerPortion > 0) {
                  materialCostForThisMetal = baseCostPerPortion * quantity;
                  console.log(`      🧮 Final calculation: $${baseCostPerPortion} × ${quantity} = $${materialCostForThisMetal.toFixed(2)}`);
                  
                  // Track which materials already have markup vs those that need it
                  if (material.stullerProducts && material.stullerProducts.length > 0) {
                    const firstProduct = material.stullerProducts[0];
                    if (firstProduct.pricePerPortion !== undefined) {
                      // This material already has markup built-in
                      console.log(`      ✅ Using pricePerPortion - markup already applied`);
                    } else {
                      // This material needs markup applied later
                      console.log(`      📈 Using costPerPortion - will need markup applied`);
                      taskMaterialCostWithoutMarkup += materialCostForThisMetal;
                    }
                  } else {
                    // Legacy materials without stullerProducts need markup
                    console.log(`      📈 Legacy material - will need markup applied`);
                    taskMaterialCostWithoutMarkup += materialCostForThisMetal;
                  }
                } else {
                  console.log(`      ⚠️ No valid pricing data found - using $0.00`);
                  materialCostForThisMetal = 0;
                }
              }
              
              taskMaterialCost += materialCostForThisMetal;
              console.log(`    💰 Material cost for this metal: $${materialCostForThisMetal}`);
              console.log(`    📈 Running total material cost: $${taskMaterialCost}`);
            } else {
              console.log(`    ❌ MATERIAL NOT FOUND for ID: "${materialSelection.materialId}"`);
              console.log(`      - Available material IDs:`, availableMaterials.map(m => m._id));
            }
          }
          
          if (isTargetMetal) {
            console.log(`\n💰 FINAL COST CALCULATIONS FOR ${metalLabel}:`);
            console.log(`📊 RAW TOTALS:`);
            console.log(`  - Process Cost: $${totalProcessCost.toFixed(2)}`);
            console.log(`  - Material Cost (raw): $${taskMaterialCost.toFixed(2)}`);
            console.log(`  - Materials needing markup: $${taskMaterialCostWithoutMarkup.toFixed(2)}`);
            console.log(`  - Materials already marked up: $${(taskMaterialCost - taskMaterialCostWithoutMarkup).toFixed(2)}`);

            const materialMarkup = adminSettings.pricing?.materialMarkup || 1.5;
            const markedUpMaterials = taskMaterialCostWithoutMarkup * materialMarkup;
            const totalMaterialCost = markedUpMaterials + (taskMaterialCost - taskMaterialCostWithoutMarkup);
            
            console.log(`🏷️ MATERIAL MARKUP:`);
            console.log(`  - Markup multiplier: ${materialMarkup}`);
            console.log(`  - Marked up materials: $${taskMaterialCostWithoutMarkup.toFixed(2)} × ${materialMarkup} = $${markedUpMaterials.toFixed(2)}`);
            console.log(`  - Final material cost: $${markedUpMaterials.toFixed(2)} + $${(taskMaterialCost - taskMaterialCostWithoutMarkup).toFixed(2)} = $${totalMaterialCost.toFixed(2)}`);
            
            const baseCost = totalProcessCost + totalMaterialCost;
            console.log(`💵 BASE COST: $${totalProcessCost.toFixed(2)} + $${totalMaterialCost.toFixed(2)} = $${baseCost.toFixed(2)}`);
            
            const adminFee = adminSettings.pricing?.administrativeFee || 0;
            const businessFee = adminSettings.pricing?.businessFee || 0;
            const consumablesFee = adminSettings.pricing?.consumablesFee || 0;
            const businessMultiplier = adminFee + businessFee + consumablesFee + 1;
            
            const retailPrice = baseCost * businessMultiplier;
            const wholesalePrice = baseCost * (businessMultiplier * 0.75);
            
            console.log(`⚙️ BUSINESS MULTIPLIER: ${adminFee} + ${businessFee} + ${consumablesFee} + 1 = ${businessMultiplier}`);
            console.log(`🎯 FINAL PRICES:`);
            console.log(`  - Retail: $${baseCost.toFixed(2)} × ${businessMultiplier} = $${retailPrice.toFixed(2)}`);
            console.log(`  - Wholesale: $${baseCost.toFixed(2)} × ${businessMultiplier} × 0.75 = $${wholesalePrice.toFixed(2)}`);
            
            console.log(`\n🔍 MYSTERY DEBUGGING:`);
            console.log(`  Expected combined retail: ~$28.50 (if material=$11.01 + process=$17.50)`);
            console.log(`  Actual calculated retail: $${retailPrice.toFixed(2)}`);
            console.log(`  Stored values that will be used in UI:`);
            console.log(`    - totalProcessCost: $${totalProcessCost.toFixed(2)}`);
            console.log(`    - totalMaterialCost: $${totalMaterialCost.toFixed(2)}`);
            console.log(`    - retailPrice: $${retailPrice.toFixed(2)}`);
            console.log(`=== END 10K YELLOW GOLD CALCULATION ===\n`);
          }

          const materialMarkup = adminSettings.pricing?.materialMarkup || 1.5;
          const markedUpMaterials = taskMaterialCostWithoutMarkup * materialMarkup;
          const totalMaterialCost = markedUpMaterials + (taskMaterialCost - taskMaterialCostWithoutMarkup);
          
          const baseCost = totalProcessCost + totalMaterialCost;
          
          const adminFee = adminSettings.pricing?.administrativeFee || 0;
          const businessFee = adminSettings.pricing?.businessFee || 0;
          const consumablesFee = adminSettings.pricing?.consumablesFee || 0;
          const businessMultiplier = adminFee + businessFee + consumablesFee + 1;

          const retailPrice = baseCost * businessMultiplier;
          const wholesalePrice = baseCost * (businessMultiplier * 0.75);

          const variantKey = `${metalType}_${karat}`;
          
          priceCalculations[variantKey] = {
            metalLabel: metalLabel,
            metalType: metalType,
            karat: karat,
            totalLaborHours: Math.round(totalLaborHours * 100) / 100,
            totalProcessCost: Math.round(totalProcessCost * 100) / 100,
            totalMaterialCost: Math.round(totalMaterialCost * 100) / 100, // Use the calculated totalMaterialCost, not taskMaterialCost
            baseCost: Math.round(baseCost * 100) / 100,
            retailPrice: Math.round(retailPrice * 100) / 100,
            wholesalePrice: Math.round(wholesalePrice * 100) / 100,
            businessMultiplier: Math.round(businessMultiplier * 100) / 100,
            metalComplexity: metalComplexity
          };
        }
      }
      
      console.log(`💰 Metal pricing complete: ${Object.keys(priceCalculations).length} variants calculated`);
      setPricesByMetal(priceCalculations);
      
      // Keep backward compatibility by setting first price as preview
      const firstPrice = Object.values(priceCalculations)[0];
      setPricePreview(firstPrice || null);

    } catch (error) {
      console.error('❌ Error calculating metal-specific pricing:', error);
      setPricePreview(null);
      setPricesByMetal({});
    }
  }, [formData.processes, formData.materials, adminSettings, availableProcesses, availableMaterials]);

  // Recalculate pricing when form changes
  useEffect(() => {
    calculateMetalSpecificPricing();
  }, [calculateMetalSpecificPricing]);

  // Process management
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

  // Material management
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
      console.log('🚀 Submitting universal task...');

      // Create task with universal pricing
      const taskData = {
        ...formData,
        universalPricing: pricesByMetal,
        createdAt: new Date().toISOString(),
        isUniversal: true
      };
      
      console.log('📤 Task data being sent:', {
        title: taskData.title,
        category: taskData.category,
        processesCount: taskData.processes?.length || 0,
        materialsCount: taskData.materials?.length || 0,
        isUniversal: taskData.isUniversal,
        hasUniversalPricing: !!taskData.universalPricing
      });
      
      const response = await fetch('/api/tasks/universal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        // If response is not ok, try to get the error text
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (response.ok) {
        setSuccess('Universal task created successfully! Works with all metal contexts.');
        console.log('✅ Universal task created:', result.task);
        
        setTimeout(() => {
          router.push('/dashboard/admin/tasks');
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to create task');
      }

    } catch (error) {
      console.error('❌ Error creating universal task:', error);
      const errorMessage = typeof error === 'string' ? error : (error.message || 'Failed to create task');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'shanks', label: '🔧 Shanks' },
    { value: 'prongs', label: '💎 Prongs' },
    { value: 'chains', label: '🔗 Chains' },
    { value: 'stone_setting', label: '💍 Stone Setting' },
    { value: 'misc', label: '🛠️ Miscellaneous' }
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Universal Task Builder
          </Typography>
          <Chip 
            label="New & Improved" 
            color="success" 
            size="small" 
            sx={{ ml: 2 }}
          />
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Create universal tasks that work with any metal context using our enhanced process-based system.
        </Typography>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        {/* Data Loading Errors */}
        {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Some data failed to load:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              {dataLoadErrors.processes && <li>Processes (required for task creation)</li>}
              {dataLoadErrors.materials && <li>Materials (optional for task creation)</li>}
              {dataLoadErrors.settings && <li>Admin Settings (affects pricing calculations)</li>}
            </ul>
            <Typography variant="body2">
              Please refresh the page or check your authentication status.
            </Typography>
          </Alert>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Debug Info:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px', fontSize: '12px' }}>
              <li>Available Processes: {availableProcesses.length}</li>
              <li>Available Materials: {availableMaterials.length}</li>
              <li>Admin Settings: {adminSettings ? 'Loaded' : 'Not Loaded'}</li>
              <li>Selected Processes: {formData.processes.length}</li>
              <li>Metal Variants Found: {Object.keys(pricesByMetal).length}</li>
            </ul>
          </Alert>
        )}

        {(dataLoadErrors.processes || dataLoadErrors.materials || dataLoadErrors.settings) && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <strong>Data Loading Issues:</strong>
            {dataLoadErrors.processes && <div>• Processes could not be loaded</div>}
            {dataLoadErrors.materials && <div>• Materials could not be loaded</div>}
            {dataLoadErrors.settings && <div>• Admin settings could not be loaded</div>}
            <Button color="inherit" size="small" onClick={loadInitialData} sx={{ mt: 1 }}>
              Retry Loading
            </Button>
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
                        placeholder="e.g., Ring Sizing - Universal"
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
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Process"
                                  placeholder="Search processes..."
                                  required
                                />
                              )}
                              renderOption={(props, option) => (
                                <Box component="li" {...props} key={option._id}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {option.displayName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {option.laborHours || 0}hrs • ${typeof option.pricing?.totalCost === 'number' ? option.pricing.totalCost : 'Multi-Metal'} • {
                                        typeof option.skillLevel === 'string' 
                                          ? option.skillLevel 
                                          : 'Standard'
                                      }
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
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
                            <Box textAlign="center">
                              <Typography variant="caption" color="text.secondary">
                                Universal
                              </Typography>
                              <Chip label="✓" size="small" color="success" />
                            </Box>
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
                      Add at least one process to calculate universal pricing.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Materials Selection */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">🧱 Materials Selection</Typography>
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
                            <Autocomplete
                              options={availableMaterials}
                              getOptionLabel={(option) => option.displayName || option.name || ''}
                              value={availableMaterials.find(m => m._id === material.materialId) || null}
                              onChange={(event, newValue) => {
                                updateMaterial(index, 'materialId', newValue?._id || '');
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Material"
                                  placeholder="Search materials..."
                                  required
                                />
                              )}
                              renderOption={(props, option) => (
                                <Box component="li" {...props} key={option._id}>
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold">
                                      {option.displayName || option.name || 'Unknown Material'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      ${option.pricing?.basePrice || option.unitCost || 0} • {
                                        typeof option.category === 'string' 
                                          ? option.category 
                                          : 'Material'
                                      }
                                    </Typography>
                                  </Box>
                                </Box>
                              )}
                            />
                          </Grid>

                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Quantity"
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(index, 'quantity', parseFloat(e.target.value) || 1)}
                              inputProps={{ min: 1, max: 100, step: 1 }}
                            />
                          </Grid>

                          <Grid item xs={12} md={2}>
                            <Box textAlign="center">
                              <Typography variant="caption" color="text.secondary">
                                Universal
                              </Typography>
                              <Chip label="✓" size="small" color="success" />
                            </Box>
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
                      Materials are optional. Add materials if the task requires specific components.
                    </Alert>
                  )}
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Universal Price Preview */}
            {pricePreview && (
              <Grid item xs={12}>
                <MetalSpecificPricePreview 
                  pricesByMetal={pricesByMetal}
                  universalPrice={pricePreview}
                  selectedProcesses={formData.processes}
                  availableProcesses={availableProcesses}
                  availableMaterials={availableMaterials}
                />
              </Grid>
            )}

            {/* Service Settings */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Service Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Estimated Days"
                        type="number"
                        value={formData.service.estimatedDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            estimatedDays: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 1, max: 30 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Rush Days"
                        type="number"
                        value={formData.service.rushDays}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            rushDays: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 1, max: 10 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Rush Multiplier"
                        type="number"
                        step="0.1"
                        value={formData.service.rushMultiplier}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          service: {
                            ...prev.service,
                            rushMultiplier: parseFloat(e.target.value) || 1.0
                          }
                        }))}
                        inputProps={{ min: 1.0, max: 3.0, step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.requiresApproval}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                requiresApproval: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Requires Approval"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.requiresInspection}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                requiresInspection: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Requires Inspection"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.service.canBeBundled}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              service: {
                                ...prev.service,
                                canBeBundled: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Can Be Bundled"
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Display Settings */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Display Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.display.isActive}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              display: {
                                ...prev.display,
                                isActive: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Active"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.display.isFeatured}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              display: {
                                ...prev.display,
                                isFeatured: e.target.checked
                              }
                            }))}
                          />
                        }
                        label="Featured"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Sort Order"
                        type="number"
                        value={formData.display.sortOrder}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          display: {
                            ...prev.display,
                            sortOrder: parseInt(e.target.value) || 0
                          }
                        }))}
                        inputProps={{ min: 0, max: 999 }}
                      />
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

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
                  {loading ? 'Creating Universal Task...' : 'Create Universal Task'}
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
