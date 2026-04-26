'use client';

import { useState, useCallback } from 'react';
import { DEFAULT_MATERIAL_FORM, transformMaterialForForm } from '@/utils/materials.util';

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
