import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { ProcessForm } from './ProcessForm';

/**
 * ProcessDialog Component
 * Modal dialog wrapper for process creation and editing
 * Enhanced to support all form capabilities
 */
export const ProcessDialog = ({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  availableMaterials = [],
  editingProcess = null,
  // Additional props for material management
  selectedMaterial,
  setSelectedMaterial,
  materialQuantity,
  setMaterialQuantity,
  onAddMaterial,
  onRemoveMaterial
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {editingProcess ? 'Edit Process' : 'Add New Process'}
        </DialogTitle>
        <DialogContent>
          <ProcessForm
            formData={formData}
            setFormData={setFormData}
            availableMaterials={availableMaterials}
            editingProcess={editingProcess}
            // Pass through material management props if provided
            selectedMaterial={selectedMaterial}
            setSelectedMaterial={setSelectedMaterial}
            materialQuantity={materialQuantity}
            setMaterialQuantity={setMaterialQuantity}
            onAddMaterial={onAddMaterial}
            onRemoveMaterial={onRemoveMaterial}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {editingProcess ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
