'use client';

import * as React from 'react';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import processesService from '@/services/processes.service';
import materialsService from '@/services/materials.service';
import {
  DEFAULT_PROCESS_FORM,
  transformProcessForForm
} from '@/utils/processes.util';
import {
  ProcessesHeader,
  ProcessesGrid,
  ProcessDialog,
  DeleteConfirmDialog
} from '@/app/components/processes';
import {
  Box,
  Fab,
  CircularProgress,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function ProcessesPage() {
  const [processes, setProcesses] = React.useState([]);
  const [availableMaterials, setAvailableMaterials] = React.useState([]);
  const [adminSettings, setAdminSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, process: null });

  // Form state
  const [formData, setFormData] = React.useState(DEFAULT_PROCESS_FORM);
  
  // Material selection state
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);
  const [materialQuantity, setMaterialQuantity] = React.useState('');

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
    'palladium',
    'titanium',
    'stainless_steel',
    'alternative',
    'mixed',
    'n_a'
  ];

  const karatOptions = {
    yellow_gold: ['10k', '14k', '18k', '22k', '24k'],
    white_gold: ['10k', '14k', '18k'],
    rose_gold: ['10k', '14k', '18k'],
    sterling_silver: ['925', '900'],
    fine_silver: ['999'],
    platinum: ['950', '900'],
    palladium: ['950', '900'],
    titanium: ['Grade 1', 'Grade 2', 'Grade 4'],
    stainless_steel: ['316L', '304'],
    alternative: ['N/A'],
    mixed: ['N/A'],
    n_a: ['N/A']
  };

  const loadProcesses = React.useCallback(async () => {
    try {
      setLoading(true);
      const processes = await processesService.getProcesses();
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
      console.log('🟡 Loading materials...');
      const materials = await materialsService.getMaterials();
      console.log('🟡 Materials loaded:', materials?.length || 0, 'materials');
      
      // Log sample of materials to check costPerPortion values
      if (materials && materials.length > 0) {
        console.log('🟡 Sample materials data:');
        materials.slice(0, 3).forEach((material, index) => {
          console.log(`🟡 Material ${index + 1}:`, {
            name: material.name,
            sku: material.sku,
            costPerPortion: material.costPerPortion,
            costPerPortionType: typeof material.costPerPortion,
            portionType: material.portionType
          });
        });
        
        // Look specifically for solder materials
        const solderMaterials = materials.filter(m => 
          m.name?.toLowerCase().includes('solder') || 
          m.sku?.toLowerCase().includes('solder')
        );
        
        if (solderMaterials.length > 0) {
          console.log('🟡 Found solder materials:');
          solderMaterials.forEach(material => {
            console.log('🟡 Solder material:', {
              name: material.name,
              sku: material.sku,
              costPerPortion: material.costPerPortion,
              costPerPortionType: typeof material.costPerPortion,
              portionType: material.portionType
            });
          });
        }
      }
      
      setAvailableMaterials(materials || []);
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
      const isUpdate = !!editingProcess;
      
      console.log('🟢 Submitting process form:');
      console.log('🟢 Form data:', JSON.stringify(formData, null, 2));
      console.log('🟢 Materials in form:', formData.materials);
      console.log('🟢 Total materials cost:', formData.materials.reduce((total, material) => total + (material.estimatedCost || 0), 0));
      
      let savedProcess;
      
      if (isUpdate) {
        console.log('🟢 Updating existing process:', editingProcess._id);
        savedProcess = await processesService.updateProcess(editingProcess._id, formData);
      } else {
        console.log('🟢 Creating new process');
        savedProcess = await processesService.createProcess(formData);
      }
      
      console.log('🟢 Saved process response:', JSON.stringify(savedProcess, null, 2));
      
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
    setFormData(transformProcessForForm(process));
    setOpenDialog(true);
  };

  const handleDeleteClick = (process) => {
    setDeleteDialog({ open: true, process });
  };

  const handleDelete = async (processId) => {
    try {
      await processesService.deleteProcess(processId);
      setDeleteDialog({ open: false, process: null });
      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_PROCESS_FORM });
  };

  // Add material to process
  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQuantity) return;
    
    const quantityMultiplier = parseFloat(materialQuantity);
    
    console.log('🔵 Adding material to process:');
    console.log('🔵 Selected material object:', JSON.stringify(selectedMaterial, null, 2));
    console.log('🔵 Material quantity requested:', materialQuantity);
    console.log('🔵 Quantity multiplier parsed:', quantityMultiplier);
    
    // Use BASE PRICE, not the marked-up costPerPortion
    // The markup will be applied later in the process cost calculation
    const basePrice = selectedMaterial.pricing?.basePrice || selectedMaterial.costPerPortion || 0;
    const estimatedCost = basePrice * quantityMultiplier;
    
    console.log('🔵 Material costPerPortion (marked up):', selectedMaterial.costPerPortion);
    console.log('🔵 Material basePrice (no markup):', basePrice);
    console.log('🔵 Using basePrice for calculation to avoid double markup');
    console.log('🔵 Calculation: basePrice × quantity =', basePrice, '×', quantityMultiplier, '=', estimatedCost);
    
    const newMaterial = {
      materialId: selectedMaterial._id,
      materialName: selectedMaterial.name,
      materialSku: selectedMaterial.sku,
      quantity: quantityMultiplier,
      unit: selectedMaterial.portionType || 'portion',
      estimatedCost: estimatedCost
    };
    
    console.log('🔵 New material object being added:', JSON.stringify(newMaterial, null, 2));
    console.log('🔵 Base cost for this material (before process markup):', estimatedCost);
    
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
    
    // baseMaterialsCost should already be the base cost (no markup applied yet)
    const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
      console.log('🟡 Material in process:', material.materialName, 'base cost:', material.estimatedCost);
      return total + (material.estimatedCost || 0);
    }, 0);
    
    // Apply markup to get final materials cost
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
      calculation: `${baseMaterialsCost} × ${materialMarkup} = ${materialsCost}`,
      materialsDetail: process.materials?.map(m => ({
        name: m.materialName,
        quantity: m.quantity,
        baseCost: m.estimatedCost
      }))
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

        <ProcessesHeader onAddNew={handleOpenDialog} />
        
        <ProcessesGrid
          processes={processes}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onAddNew={handleOpenDialog}
          adminSettings={adminSettings}
        />

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add process"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>

        {/* Process Create/Edit Dialog */}
        <ProcessDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          availableMaterials={availableMaterials}
          adminSettings={adminSettings}
          editingProcess={editingProcess}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, process: null })}
          onConfirm={handleDelete}
          process={deleteDialog.process}
        />
      </Box>
    </PageContainer>
  );
}
