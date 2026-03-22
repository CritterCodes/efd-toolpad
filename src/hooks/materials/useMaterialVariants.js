import { useState } from 'react';
import { KARAT_OPTIONS } from '@/utils/materials.util';

export function useMaterialVariants({ material, onUpdate }) {
  const [editingVariant, setEditingVariant] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [variantFormData, setVariantFormData] = useState({
    metalType: '',
    karat: '',
    sku: '',
    unitCost: 0,
    stullerProductId: '',
    compatibleMetals: [],
    isActive: true,
    notes: ''
  });

  const getAvailableKarats = (metalType) => {
    return KARAT_OPTIONS[metalType] || [{ value: 'na', label: 'N/A' }];
  };

  const handleAddVariant = () => {
    setVariantFormData({
      metalType: '',
      karat: '',
      sku: '',
      unitCost: 0,
      stullerProductId: '',
      compatibleMetals: [],
      isActive: true,
      notes: ''
    });
    setShowAddDialog(true);
  };

  const handleEditVariant = (index) => {
    if (!material.variants || !material.variants[index]) return;
    const variant = material.variants[index];
    setVariantFormData({ ...variant });
    setEditingVariant(index);
    setShowAddDialog(true);
  };

  const handleSaveVariant = () => {
    const updatedMaterial = { ...material };
    if (!updatedMaterial.variants) updatedMaterial.variants = [];
    
    if (editingVariant !== null) {
      updatedMaterial.variants[editingVariant] = {
        ...variantFormData,
        lastUpdated: new Date()
      };
    } else {
      updatedMaterial.variants.push({
        ...variantFormData,
        lastUpdated: new Date()
      });
    }
    
    onUpdate(updatedMaterial);
    handleCloseDialog();
  };

  const handleDeleteVariant = (index) => {
    if (!material.variants) return;
    const updatedMaterial = { ...material };
    updatedMaterial.variants.splice(index, 1);
    onUpdate(updatedMaterial);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingVariant(null);
    setVariantFormData({
      metalType: '',
      karat: '',
      sku: '',
      unitCost: 0,
      stullerProductId: '',
      compatibleMetals: [],
      isActive: true,
      notes: ''
    });
  };

  const handleToggleVariantActive = (index) => {
    if (!material.variants || !material.variants[index]) return;
    const updatedMaterial = { ...material };
    updatedMaterial.variants[index].isActive = !updatedMaterial.variants[index].isActive;
    updatedMaterial.variants[index].lastUpdated = new Date();
    onUpdate(updatedMaterial);
  };

  const handleConvertToSingle = () => {
    if (material.variants && material.variants.length > 1) {
      alert('Cannot convert to single material with multiple variants. Please remove extra variants first.');
      return;
    }
    
    const variant = material.variants && material.variants.length > 0 ? material.variants[0] : {};
    const updatedMaterial = {
      ...material,
      hasVariants: false,
      variants: [],
      unitCost: variant.unitCost || 0,
      sku: variant.sku || '',
      stullerProductId: variant.stullerProductId || '',
      metalType: variant.metalType || '',
      karat: variant.karat || '',
      compatibleMetals: variant.compatibleMetals || []
    };
    
    onUpdate(updatedMaterial);
  };

  const enableVariants = () => {
    const updatedMaterial = {
      ...material,
      hasVariants: true,
      variants: [{
        metalType: material.metalType || 'other',
        karat: material.karat || 'na',
        sku: material.sku || '',
        unitCost: material.unitCost || 0,
        stullerProductId: material.stullerProductId || '',
        compatibleMetals: material.compatibleMetals || [],
        isActive: true,
        lastUpdated: new Date(),
        notes: ''
      }],
      unitCost: null,
      sku: null,
      stullerProductId: null,
      metalType: null,
      karat: null
    };
    onUpdate(updatedMaterial);
  };

  const isValidVariant = () => {
    return (
      variantFormData.metalType &&
      variantFormData.karat &&
      variantFormData.unitCost >= 0
    );
  };

  const isDuplicateVariant = () => {
    if (!material.variants) return false;
    return material.variants.some((variant, index) => 
      index !== editingVariant &&
      variant.metalType === variantFormData.metalType &&
      variant.karat === variantFormData.karat
    );
  };

  return {
    editingVariant,
    showAddDialog,
    variantFormData,
    setVariantFormData,
    getAvailableKarats,
    handleAddVariant,
    handleEditVariant,
    handleSaveVariant,
    handleDeleteVariant,
    handleCloseDialog,
    handleToggleVariantActive,
    handleConvertToSingle,
    enableVariants,
    isValidVariant,
    isDuplicateVariant
  };
}

export default useMaterialVariants;