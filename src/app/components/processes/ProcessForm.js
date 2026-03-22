'use client';

import React from 'react';
import { Grid } from '@mui/material';
import { useAdminSettings } from '@/context/AdminSettingsContext';
import { useProcessForm } from '@/hooks/processes/useProcessForm';
import { BasicDetails } from './form/BasicDetails';
import { MaterialsSection } from './form/MaterialsSection';
import { CostPreview } from './form/CostPreview';

/**
 * ProcessForm Component
 * Form for creating and editing processes
 */
export const ProcessForm = ({
  formData,
  setFormData,
  availableMaterials = [],
  editingProcess = null
}) => {
  const { adminSettings } = useAdminSettings();
  
  const {
    materialLines,
    handleAddMaterialLine,
    handleRemoveMaterialLine,
    handleMaterialSelect,
    handleQuantityChange,
    getCostPreview
  } = useProcessForm(formData, setFormData, adminSettings, availableMaterials);

  const costPreview = getCostPreview();

  return (
    <Grid container spacing={2} sx={{ mt: 1 }}>
      <BasicDetails 
        formData={formData} 
        setFormData={setFormData} 
      />

      <MaterialsSection
        formData={formData}
        availableMaterials={availableMaterials}
        materialLines={materialLines}
        onAddLine={handleAddMaterialLine}
        onRemoveLine={handleRemoveMaterialLine}
        onMaterialSelect={handleMaterialSelect}
        onQuantityChange={handleQuantityChange}
      />

      <CostPreview 
        costPreview={costPreview} 
        formData={formData} 
      />
    </Grid>
  );
};
