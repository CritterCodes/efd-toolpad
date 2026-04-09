import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_MATERIAL_FORM, transformMaterialForForm } from '@/utils/materials.util';
import materialsService from '@/services/materials.service';

export const useMaterialUI = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, material: null });
  const [formData, setFormData] = useState(DEFAULT_MATERIAL_FORM);

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

  const handleEdit = useCallback((material) => {
    setEditingMaterial(material);
    setFormData(transformMaterialForForm(material));
    setOpenDialog(true);
  }, []);

  useEffect(() => {
    const costPerPortion = materialsService.calculateCostPerPortion(
      formData.unitCost,
      formData.portionsPerUnit
    );

    if (parseFloat(costPerPortion) !== parseFloat(formData.costPerPortion)) {
      setFormData(prev => ({ ...prev, costPerPortion: parseFloat(costPerPortion) }));
    }
  }, [formData.unitCost, formData.portionsPerUnit, formData.costPerPortion]);

  return {
    openDialog, setOpenDialog,
    editingMaterial, setEditingMaterial,
    deleteDialog, setDeleteDialog,
    formData, setFormData,
    openCreateDialog, closeDialog,
    openDeleteDialog, closeDeleteDialog,
    handleEdit
  };
};