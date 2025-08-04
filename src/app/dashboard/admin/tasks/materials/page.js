'use client';

import * as React from 'react';
import cascadingUpdatesService from '@/services/cascadingUpdates.service';
import materialsService from '@/services/materials.service';
import {
  DEFAULT_MATERIAL_FORM,
  transformMaterialForForm
} from '@/utils/materials.util';
import {
  MaterialsHeader,
  MaterialsGrid,
  MaterialDialog,
  DeleteConfirmDialog
} from '@/app/components/materials';
import { Box, CircularProgress, Alert, Fab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { PageContainer } from '@toolpad/core/PageContainer';

export default function MaterialsPage() {
  const [materials, setMaterials] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState(null);
  const [deleteDialog, setDeleteDialog] = React.useState({ open: false, material: null });
  const [loadingStuller, setLoadingStuller] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState(DEFAULT_MATERIAL_FORM);

  // Fetch material data from Stuller
  const fetchStullerData = async (itemNumber) => {
    if (!itemNumber.trim()) return;
    
    setLoadingStuller(true);
    try {
      const data = await materialsService.fetchStullerData(itemNumber);
      
      // Log the enhanced Stuller data for debugging
      console.log('📦 Enhanced Stuller Data Received:', {
        itemNumber: data.itemNumber,
        description: data.description,
        category: data.category,
        metal: data.metal,
        price: data.price,
        dimensions: data.dimensions,
        stock: data.stock,
        merchandising: data.merchandising
      });
      
      // Transform and populate form with Stuller data
      const updatedFormData = materialsService.transformStullerToFormData(data, formData);
      setFormData(updatedFormData);

    } catch (error) {
      console.error('Error fetching Stuller data:', error);
      setError('Failed to fetch Stuller data: ' + error.message);
    } finally {
      setLoadingStuller(false);
    }
  };

  const loadMaterials = React.useCallback(async () => {
    try {
      setLoading(true);
      const materials = await materialsService.getMaterials();
      setMaterials(materials);
      setError(null);
    } catch (error) {
      console.error('Error loading materials:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const isUpdate = !!editingMaterial;
      let savedMaterial;
      
      if (isUpdate) {
        savedMaterial = await materialsService.updateMaterial(editingMaterial._id, formData);
      } else {
        savedMaterial = await materialsService.createMaterial(formData);
      }
      
      // If this was an update, trigger cascading updates
      if (isUpdate && savedMaterial.material) {
        console.log('🔄 Material updated, triggering cascading updates...');
        try {
          const cascadingResult = await cascadingUpdatesService.updateFromMaterialsChange([savedMaterial.material._id]);
          console.log('✅ Cascading updates completed:', cascadingResult);
        } catch (cascadingError) {
          console.error('⚠️ Cascading updates failed:', cascadingError);
          // Don't fail the whole operation, just log the error
        }
      }

      setOpenDialog(false);
      setEditingMaterial(null);
      resetForm();
      loadMaterials();
    } catch (error) {
      console.error('Error saving material:', error);
      setError(error.message);
    }
  };

  // Handle edit material
  const handleEdit = (material) => {
    setEditingMaterial(material);
    setFormData(transformMaterialForForm(material));
    setOpenDialog(true);
  };

  // Handle delete material
  const handleDeleteClick = (material) => {
    setDeleteDialog({ open: true, material });
  };

  const handleDelete = async (materialId) => {
    try {
      await materialsService.deleteMaterial(materialId);
      setDeleteDialog({ open: false, material: null });
      loadMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({ ...DEFAULT_MATERIAL_FORM });
  };

  const handleOpenDialog = () => {
    resetForm();
    setEditingMaterial(null);
    setOpenDialog(true);
  };

  // Auto-calculate cost per portion when form data changes
  React.useEffect(() => {
    const costPerPortion = materialsService.calculateCostPerPortion(formData.unitCost, formData.portionsPerUnit);
    if (parseFloat(costPerPortion) !== parseFloat(formData.costPerPortion)) {
      setFormData(prev => ({ ...prev, costPerPortion: parseFloat(costPerPortion) }));
    }
  }, [formData.unitCost, formData.portionsPerUnit, formData.costPerPortion]);

  if (loading) {
    return (
      <PageContainer title="Materials Management">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Materials Management">
      <Box sx={{ pb: 8 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <MaterialsHeader onAddNew={handleOpenDialog} />
        
        <MaterialsGrid
          materials={materials}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onAddNew={handleOpenDialog}
        />

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add material"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={handleOpenDialog}
        >
          <AddIcon />
        </Fab>

        {/* Material Create/Edit Dialog */}
        <MaterialDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          onFetchStullerData={fetchStullerData}
          loadingStuller={loadingStuller}
          editingMaterial={editingMaterial}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, material: null })}
          onConfirm={handleDelete}
          material={deleteDialog.material}
        />
      </Box>
    </PageContainer>
  );
}
