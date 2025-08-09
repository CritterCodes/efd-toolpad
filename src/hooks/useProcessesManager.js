/**
 * Custom hook for processes management
 * Centralizes all business logic for the processes page
 */

import * as React from 'react';
import processesService from '@/services/processes.service';
import materialsService from '@/services/materials.service';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import {
  DEFAULT_PROCESS_FORM,
  transformProcessForForm,
  PROCESS_CATEGORIES,
  SKILL_LEVELS,
  METAL_TYPES,
  KARAT_OPTIONS,
  formatCategoryDisplay,
  filterProcesses,
  sortProcesses,
  getUniqueValues,
  calculateProcessCost
} from '@/utils/processes.util';

export function useProcessesManager() {
  // Data state
  const [processes, setProcesses] = React.useState([]);
  const [availableMaterials, setAvailableMaterials] = React.useState([]);
  const [adminSettings, setAdminSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  // UI state
  const [selectedTab, setSelectedTab] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState('name');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [activeStatusFilter, setActiveStatusFilter] = React.useState('all');
  const [skillLevelFilter, setSkillLevelFilter] = React.useState('all');
  const [metalTypeFilter, setMetalTypeFilter] = React.useState('all');
  const [karatFilter, setKaratFilter] = React.useState('all');

  // Dialog state
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingProcess, setEditingProcess] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, process: null });
  const [updatingPrices, setUpdatingPrices] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState(DEFAULT_PROCESS_FORM);
  
  // Material selection state for form
  const [selectedMaterial, setSelectedMaterial] = React.useState(null);
  const [materialQuantity, setMaterialQuantity] = React.useState('');

  // Calculate categorized processes with counts
  const categorizedProcesses = React.useMemo(() => {
    const categorized = {
      all: processes,
      ...Object.fromEntries(
        PROCESS_CATEGORIES.map(category => [
          category,
          processes.filter(process => process.category === category)
        ])
      )
    };
    return categorized;
  }, [processes]);

  // Get unique filter options
  const uniqueSkillLevels = React.useMemo(() => 
    getUniqueValues(processes, 'skillLevel').filter(level => level), 
    [processes]
  );

  const uniqueMetalTypes = React.useMemo(() => 
    getUniqueValues(processes, 'metalType').filter(type => type && type !== 'n_a'), 
    [processes]
  );

  const uniqueKarats = React.useMemo(() => 
    getUniqueValues(processes, 'karat').filter(karat => karat && karat.trim() !== ''), 
    [processes]
  );

  // Apply filters and sorting
  const filteredProcesses = React.useMemo(() => {
    const tabProcesses = categorizedProcesses[selectedTab] || [];
    
    const filters = {
      search: searchQuery,
      isActive: activeStatusFilter === 'all' ? undefined : activeStatusFilter === 'active',
      skillLevel: skillLevelFilter === 'all' ? null : skillLevelFilter,
      metalType: metalTypeFilter === 'all' ? null : metalTypeFilter,
      karat: karatFilter === 'all' ? null : karatFilter
    };

    const filtered = filterProcesses(tabProcesses, filters);
    return sortProcesses(filtered, sortBy, sortOrder);
  }, [categorizedProcesses, selectedTab, searchQuery, activeStatusFilter, skillLevelFilter, metalTypeFilter, karatFilter, sortBy, sortOrder]);

  // Statistics
  const stats = React.useMemo(() => {
    const currentProcesses = categorizedProcesses[selectedTab] || [];
    const active = currentProcesses.filter(p => p.isActive !== false);
    const totalLabor = currentProcesses.reduce((sum, p) => sum + (parseFloat(p.laborCost) || 0), 0);
    const totalMaterials = currentProcesses.reduce((sum, p) => sum + (parseFloat(p.materialsCost) || 0), 0);
    
    return {
      total: currentProcesses.length,
      active: active.length,
      inactive: currentProcesses.length - active.length,
      totalLabor: totalLabor,
      totalMaterials: totalMaterials,
      totalValue: totalLabor + totalMaterials,
      averageValue: currentProcesses.length > 0 ? (totalLabor + totalMaterials) / currentProcesses.length : 0
    };
  }, [categorizedProcesses, selectedTab]);

  // Tab definitions with counts
  const processTabs = [
    { 
      value: 'all', 
      label: 'All Processes', 
      count: categorizedProcesses.all?.length || 0,
      icon: 'ViewModule'
    },
    ...PROCESS_CATEGORIES.map(category => ({
      value: category,
      label: formatCategoryDisplay(category),
      count: categorizedProcesses[category]?.length || 0,
      icon: 'Category'
    }))
  ];

  // Load processes
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

  // Load materials for form
  const loadMaterials = React.useCallback(async () => {
    try {
      const materials = await materialsService.getMaterials();
      setAvailableMaterials(materials || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      setAvailableMaterials([]);
    }
  }, []);

  // Load admin settings
  const loadAdminSettings = React.useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) throw new Error('Failed to load admin settings');
      
      const data = await response.json();
      const settings = data || {};
      
      // Map database structure to expected format
      const baseWage = settings.pricing?.wage || 30;
      const mappedSettings = {
        laborRates: {
          basic: baseWage * 0.75,
          standard: baseWage,
          advanced: baseWage * 1.25,
          expert: baseWage * 1.5
        },
        materialMarkup: settings.pricing?.materialMarkup || 1.3,
        pricing: settings.pricing || { wage: baseWage, materialMarkup: settings.pricing?.materialMarkup || 1.3 }
      };
      
      setAdminSettings(mappedSettings);
    } catch (error) {
      console.error('Error loading admin settings:', error);
      // Set default values
      const baseWage = 30;
      const defaultSettings = {
        laborRates: { 
          basic: baseWage * 0.75,
          standard: baseWage,
          advanced: baseWage * 1.25,
          expert: baseWage * 1.5
        },
        materialMarkup: 1.3,
        pricing: { wage: baseWage, materialMarkup: 1.3 }
      };
      setAdminSettings(defaultSettings);
    }
  }, []);

  // Initialize data
  React.useEffect(() => {
    loadProcesses();
    loadMaterials();
    loadAdminSettings();
  }, [loadProcesses, loadMaterials, loadAdminSettings]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const isUpdate = !!editingProcess;
      let savedProcess;
      
      if (isUpdate) {
        savedProcess = await processesService.updateProcess(editingProcess._id, formData);
      } else {
        savedProcess = await processesService.createProcess(formData);
      }
      
      // If this was an update, trigger cascading updates
      if (isUpdate && savedProcess.process) {
        try {
          const cascadingResult = await cascadingUpdatesService.updateFromProcessesChange([savedProcess.process._id]);
          console.log('✅ Cascading updates completed:', cascadingResult);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
        }
      }

      closeDialog();
      loadProcesses();
    } catch (error) {
      console.error('Error saving process:', error);
      setError(error.message);
    }
  };

  // Handle edit
  const handleEdit = (process) => {
    setEditingProcess(process);
    setFormData(transformProcessForForm(process));
    setOpenDialog(true);
  };

  // Handle delete
  const handleDelete = async (processId) => {
    try {
      await processesService.deleteProcess(processId);
      closeDeleteDialog();
      loadProcesses();
    } catch (error) {
      console.error('Error deleting process:', error);
      setError(error.message);
    }
  };

  // Handle bulk price update
  const handleUpdatePrices = async () => {
    if (updatingPrices) return;
    
    setUpdatingPrices(true);
    try {
      const response = await fetch('/api/processes/bulk-update-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log('Processes price update completed:', data);
      
      // Refresh the processes list
      await loadProcesses();
      
      console.log(`Successfully updated prices for ${data.updated || 0} processes`);
    } catch (error) {
      console.error('Error updating processes prices:', error);
      setError('Failed to update prices: ' + error.message);
    } finally {
      setUpdatingPrices(false);
    }
  };

  // Dialog management
  const openCreateDialog = () => {
    resetForm();
    setEditingProcess(null);
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setEditingProcess(null);
    resetForm();
  };

  const openDeleteDialog = (process) => {
    setDeleteDialog({ open: true, process });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, process: null });
  };

  // Form helpers
  const resetForm = () => {
    setFormData({ ...DEFAULT_PROCESS_FORM });
    setSelectedMaterial(null);
    setMaterialQuantity('');
  };

  // Material management for form
  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQuantity) return;
    
    const quantityMultiplier = parseFloat(materialQuantity);
    const basePrice = selectedMaterial.pricing?.basePrice || selectedMaterial.costPerPortion || 0;
    const estimatedCost = basePrice * quantityMultiplier;
    
    const materialToAdd = {
      materialId: selectedMaterial._id,
      name: selectedMaterial.name || selectedMaterial.displayName,
      sku: selectedMaterial.sku,
      quantity: quantityMultiplier,
      estimatedCost: parseFloat(estimatedCost.toFixed(2)),
      notes: `${selectedMaterial.portionType || 'unit'}`,
      basePrice: basePrice
    };
    
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, materialToAdd]
    }));
    
    // Clear selection
    setSelectedMaterial(null);
    setMaterialQuantity('');
  };

  const handleRemoveMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setActiveStatusFilter('all');
    setSkillLevelFilter('all');
    setMetalTypeFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  // Check if filters are active
  const hasActiveFilters = searchQuery || activeStatusFilter !== 'all' || skillLevelFilter !== 'all' || 
                          metalTypeFilter !== 'all' || sortBy !== 'name' || sortOrder !== 'asc';
  
  const isFiltered = hasActiveFilters || selectedTab !== 'all';

  // Auto-calculate costs when relevant form data changes
  React.useEffect(() => {
    if (adminSettings && formData.timeRequired) {
      const newCosts = calculateProcessCost(formData, adminSettings);
      // Only update if the costs have actually changed to prevent infinite loops
      const currentLaborCost = parseFloat(formData.laborCost) || 0;
      const currentMaterialsCost = parseFloat(formData.materialsCost) || 0;
      
      if (Math.abs(newCosts.laborCost - currentLaborCost) > 0.01 || 
          Math.abs(newCosts.materialsCost - currentMaterialsCost) > 0.01) {
        setFormData(prev => ({
          ...prev,
          laborCost: newCosts.laborCost,
          materialsCost: newCosts.materialsCost,
          totalCost: newCosts.totalCost
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.timeRequired, formData.skillLevel, formData.materials?.length, adminSettings]);

  return {
    // Data
    processes: filteredProcesses,
    loading,
    error,
    stats,
    processTabs,
    availableMaterials,
    adminSettings,
    uniqueSkillLevels,
    uniqueMetalTypes,
    
    // UI State
    selectedTab,
    searchQuery,
    sortBy,
    sortOrder,
    activeStatusFilter,
    skillLevelFilter,
    metalTypeFilter,
    
    // Dialog State
    openDialog,
    editingProcess,
    deleteDialog,
    updatingPrices,
    formData,
    selectedMaterial,
    materialQuantity,
    
    // Actions
    setSelectedTab,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setActiveStatusFilter,
    setSkillLevelFilter,
    setMetalTypeFilter,
    setFormData,
    setSelectedMaterial,
    setMaterialQuantity,
    clearFilters,
    
    // Operations
    handleSubmit,
    handleEdit,
    handleDelete,
    handleUpdatePrices,
    handleAddMaterial,
    handleRemoveMaterial,
    
    // Dialog Management
    openCreateDialog,
    closeDialog,
    openDeleteDialog,
    closeDeleteDialog,
    
    // Computed
    hasActiveFilters,
    isFiltered,
    
    // Constants
    PROCESS_CATEGORIES,
    SKILL_LEVELS,
    METAL_TYPES,
    KARAT_OPTIONS
  };
}
