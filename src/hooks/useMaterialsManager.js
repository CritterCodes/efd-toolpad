/**
 * Custom hook for Materials Management
 * Handles all state management, filtering, and business logic for materials
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import materialsService from '@/services/materials.service';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import {
  DEFAULT_MATERIAL_FORM,
  transformMaterialForForm,
  MATERIAL_CATEGORIES,
  filterMaterials,
  sortMaterials,
  getUniqueValues,
  generateMaterialStats
} from '@/utils/materials.util';

export const useMaterialsManager = () => {
  // Core data state
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, material: null });
  const [loadingStuller, setLoadingStuller] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  
  // UI state for enhanced features
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('displayName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [metalTypeFilter, setMetalTypeFilter] = useState('all');
  const [karatFilter, setKaratFilter] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState(DEFAULT_MATERIAL_FORM);

  // Calculate tab counts and categorize materials
  const categorizedMaterials = useMemo(() => {
    const categorized = {
      all: materials,
      ...Object.fromEntries(
        MATERIAL_CATEGORIES.map(category => [
          category,
          materials.filter(material => material.category === category)
        ])
      )
    };
    return categorized;
  }, [materials]);

  // Get unique suppliers for filtering
  const uniqueSuppliers = useMemo(() => 
    getUniqueValues(materials, 'supplier').filter(supplier => supplier && supplier.trim() !== ''), 
    [materials]
  );

  // Get unique metal types for filtering
  const uniqueMetalTypes = useMemo(() => 
    getUniqueValues(materials, 'compatibleMetals').flat().filter(metal => metal && metal.trim() !== ''), 
    [materials]
  );

  // Get unique karats for filtering
  const uniqueKarats = useMemo(() => 
    getUniqueValues(materials, 'karat').filter(karat => karat && karat.trim() !== ''), 
    [materials]
  );

  // Apply filters and sorting to current tab materials
  const filteredMaterials = useMemo(() => {
    const tabMaterials = categorizedMaterials[selectedTab] || [];
    
    const filters = {
      search: searchQuery,
      isActive: activeStatusFilter === 'all' ? undefined : activeStatusFilter === 'active',
      supplier: supplierFilter === 'all' ? null : supplierFilter,
      metalType: metalTypeFilter === 'all' ? null : metalTypeFilter,
      karat: karatFilter === 'all' ? null : karatFilter
    };

    const filtered = filterMaterials(tabMaterials, filters);
    return sortMaterials(filtered, sortBy, sortOrder);
  }, [categorizedMaterials, selectedTab, searchQuery, activeStatusFilter, supplierFilter, metalTypeFilter, karatFilter, sortBy, sortOrder]);

  // Calculate statistics for current view
  const stats = useMemo(() => {
    const currentMaterials = categorizedMaterials[selectedTab] || [];
    return generateMaterialStats(currentMaterials);
  }, [categorizedMaterials, selectedTab]);

  // Create tab definitions with counts and icons
  const materialTabs = useMemo(() => [
    { 
      value: 'all', 
      label: 'All Materials', 
      count: categorizedMaterials.all?.length || 0
    },
    ...MATERIAL_CATEGORIES.map(category => ({
      value: category,
      label: category.replace('_', ' ').toUpperCase(),
      count: categorizedMaterials[category]?.length || 0
    }))
  ], [categorizedMaterials]);

  // Load materials from API
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const materialsData = await materialsService.getMaterials();
      setMaterials(materialsData);
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Stuller data and populate form
  const fetchStullerData = useCallback(async (itemNumber) => {
    if (!itemNumber?.trim()) return;
    
    setLoadingStuller(true);
    try {
      const data = await materialsService.fetchStullerData(itemNumber);
      const updatedFormData = materialsService.transformStullerToFormData(data, formData);
      setFormData(updatedFormData);
    } catch (err) {
      console.error('Error fetching Stuller data:', err);
      setError(`Failed to fetch Stuller data: ${err.message}`);
    } finally {
      setLoadingStuller(false);
    }
  }, [formData]);

  // Handle form submission (create/update)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const isUpdate = !!editingMaterial;
      let savedMaterial;
      
      if (isUpdate) {
        savedMaterial = await materialsService.updateMaterial(editingMaterial._id, formData);
      } else {
        savedMaterial = await materialsService.createMaterial(formData);
      }
      
      // Trigger cascading updates for material changes
      if (isUpdate && savedMaterial.material) {
        try {
          await cascadingUpdatesService.updateFromMaterialsChange([savedMaterial.material._id]);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
          // Don't fail the operation, just log the error
        }
      }

      // Reset form and reload materials
      setOpenDialog(false);
      setEditingMaterial(null);
      setFormData({ ...DEFAULT_MATERIAL_FORM });
      await loadMaterials();
      
    } catch (err) {
      console.error('Error saving material:', err);
      setError(err.message || 'Failed to save material');
    }
  }, [editingMaterial, formData, loadMaterials]);

  // Handle edit material
  const handleEdit = useCallback((material) => {
    setEditingMaterial(material);
    setFormData(transformMaterialForForm(material));
    setOpenDialog(true);
  }, []);

  // Handle delete material
  const handleDelete = useCallback(async (materialId) => {
    try {
      await materialsService.deleteMaterial(materialId);
      setDeleteDialog({ open: false, material: null });
      await loadMaterials();
    } catch (err) {
      console.error('Error deleting material:', err);
      setError(err.message || 'Failed to delete material');
    }
  }, [loadMaterials]);

  // Handle bulk price updates
  const handleUpdatePrices = useCallback(async () => {
    if (updatingPrices) return;
    
    setUpdatingPrices(true);
    try {
      const response = await fetch('/api/materials/bulk-update-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Successfully updated prices for ${data.updated || 0} materials`);
      await loadMaterials();
      
    } catch (err) {
      console.error('Error updating materials prices:', err);
      setError(`Failed to update prices: ${err.message}`);
    } finally {
      setUpdatingPrices(false);
    }
  }, [updatingPrices, loadMaterials]);

  // Dialog management functions
  const openCreateDialog = useCallback(() => {
    setFormData({ ...DEFAULT_MATERIAL_FORM });
    setEditingMaterial(null);
    setOpenDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingMaterial(null);
    setFormData({ ...DEFAULT_MATERIAL_FORM });
  }, []);

  const openDeleteDialog = useCallback((material) => {
    setDeleteDialog({ open: true, material });
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, material: null });
  }, []);

  // Filter management
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setActiveStatusFilter('all');
    setSupplierFilter('all');
    setMetalTypeFilter('all');
    setKaratFilter('all');
    setSortBy('displayName');
    setSortOrder('asc');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || activeStatusFilter !== 'all' || supplierFilter !== 'all' || 
                          metalTypeFilter !== 'all' || karatFilter !== 'all' || sortBy !== 'displayName' || 
                          sortOrder !== 'asc';
  
  const isFiltered = hasActiveFilters || selectedTab !== 'all';

  // Auto-calculate cost per portion
  useEffect(() => {
    const costPerPortion = materialsService.calculateCostPerPortion(
      formData.unitCost, 
      formData.portionsPerUnit
    );
    
    if (parseFloat(costPerPortion) !== parseFloat(formData.costPerPortion)) {
      setFormData(prev => ({ ...prev, costPerPortion: parseFloat(costPerPortion) }));
    }
  }, [formData.unitCost, formData.portionsPerUnit, formData.costPerPortion]);

  // Load materials on mount
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  return {
    // Data
    materials: filteredMaterials,
    loading,
    error,
    stats,
    materialTabs,
    uniqueSuppliers,
    uniqueMetalTypes,
    uniqueKarats,
    
    // UI State
    selectedTab,
    searchQuery,
    sortBy,
    sortOrder,
    activeStatusFilter,
    supplierFilter,
    metalTypeFilter,
    karatFilter,
    
    // Dialog State
    openDialog,
    editingMaterial,
    deleteDialog,
    loadingStuller,
    updatingPrices,
    formData,
    
    // Actions
    setSelectedTab,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setActiveStatusFilter,
    setSupplierFilter,
    setMetalTypeFilter,
    setKaratFilter,
    setFormData,
    clearFilters,
    
    // Operations
    handleSubmit,
    handleEdit,
    handleDelete,
    handleUpdatePrices,
    fetchStullerData,
    loadMaterials,
    
    // Dialog Management
    openCreateDialog,
    closeDialog,
    openDeleteDialog,
    closeDeleteDialog,
    
    // Computed
    hasActiveFilters,
    isFiltered
  };
};
