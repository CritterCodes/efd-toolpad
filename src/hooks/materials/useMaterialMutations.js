'use client';

import { useState, useCallback } from 'react';
import materialsService from '@/services/materials.service';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import { useAdminSettings } from '@/context/AdminSettingsContext';
import { DEFAULT_MATERIAL_FORM } from '@/utils/materials.util';

export const useMaterialMutations = ({
  loadMaterials,
  setError,
  setFormData,
  editingMaterial,
  setOpenDialog,
  setEditingMaterial,
  setDeleteDialog
}) => {
  const { adminSettings } = useAdminSettings();
  const [loadingStuller, setLoadingStuller] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [priceSyncResult, setPriceSyncResult] = useState(null);

  const fetchStullerData = useCallback(async (itemNumber) => {
    if (!itemNumber?.trim()) return;

    setLoadingStuller(true);
    try {
      const data = await materialsService.fetchStullerData(itemNumber);
      const stullerInfo = materialsService.transformStullerToFormData(data, {});

      setFormData(prev => ({
        ...prev,
        unitCost: stullerInfo.unitCost,
        karat: stullerInfo.karat,
        compatibleMetals: stullerInfo.compatibleMetals,
        stuller_item_number: itemNumber,
        auto_update_pricing: true,
        last_price_update: new Date().toISOString()
      }));
      return stullerInfo;
    } catch (err) {
      console.error('Error fetching Stuller data:', err);
      setError(`Failed to fetch Stuller data: ${err.message}`);
      throw err;
    } finally {
      setLoadingStuller(false);
    }
  }, [setFormData, setError]);

  const handleSubmit = useCallback(async (submittedFormData) => {
    try {
      const isUpdate = !!editingMaterial;
      let savedMaterial;

      if (isUpdate) {
        savedMaterial = await materialsService.updateMaterial(editingMaterial._id, submittedFormData);
      } else {
        savedMaterial = await materialsService.createMaterial(submittedFormData);
      }

      if (isUpdate && savedMaterial.material) {
        try {
          await cascadingUpdatesService.updateFromMaterialsChange([savedMaterial.material._id]);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
        }
      }

      setOpenDialog(false);
      setEditingMaterial(null);
      setFormData({ ...DEFAULT_MATERIAL_FORM });
      await loadMaterials();

    } catch (err) {
      console.error('Error saving material:', err);
      setError(err.message || 'Failed to save material');
    }
  }, [editingMaterial, loadMaterials, setOpenDialog, setEditingMaterial, setFormData, setError]);

  const handleDelete = useCallback(async (materialId) => {
    try {
      await materialsService.deleteMaterial(materialId);
      setDeleteDialog({ open: false, material: null });
      await loadMaterials();
    } catch (err) {
      console.error('Error deleting material:', err);
      setError(err.message || 'Failed to delete material');
    }
  }, [loadMaterials, setDeleteDialog, setError]);

  const handleUpdatePrices = useCallback(async () => {
    if (updatingPrices) return;

    setUpdatingPrices(true);
    setPriceSyncResult(null);
    try {
      const response = await fetch('/api/materials/bulk-update-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSettings })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      setPriceSyncResult({
        success: true,
        message: data.message || 'Price sync completed',
        candidates: data.candidates || 0,
        updated: data.updated || 0,
        processesUpdated: data.processesUpdated || 0,
        tasksUpdated: data.tasksUpdated || 0,
        tasksSkipped: data.tasksSkipped || 0,
        tasksErrors: data.tasksErrors || 0,
        taskCascadeRan: Boolean(data.taskCascadeRan),
        failed: data.failed || 0,
        failures: Array.isArray(data.failures) ? data.failures : [],
        at: new Date().toISOString()
      });

      await loadMaterials();
    } catch (err) {
      console.error('Error updating materials prices:', err);
      setError(`Failed to update prices: ${err.message}`);
      setPriceSyncResult({
        success: false,
        message: err.message || 'Price sync failed',
        candidates: 0,
        updated: 0,
        processesUpdated: 0,
        tasksUpdated: 0,
        tasksSkipped: 0,
        tasksErrors: 0,
        taskCascadeRan: false,
        failed: 0,
        failures: [],
        at: new Date().toISOString()
      });
    } finally {
      setUpdatingPrices(false);
    }
  }, [updatingPrices, loadMaterials, setError, adminSettings]);

  const clearPriceSyncResult = useCallback(() => {
    setPriceSyncResult(null);
  }, []);

  return {
    loadingStuller,
    updatingPrices,
    priceSyncResult,
    fetchStullerData,
    handleSubmit,
    handleDelete,
    handleUpdatePrices,
    clearPriceSyncResult
  };
};