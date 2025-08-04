/**
 * MaterialDialog Component
 * Modal dialog for creating and editing materials
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import MaterialForm from './MaterialForm';

export default function MaterialDialog({
  open,
  onClose,
  onSubmit,
  formData,
  setFormData,
  onFetchStullerData,
  loadingStuller = false,
  editingMaterial = null
}) {
  const isEditing = !!editingMaterial;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing ? 'Edit Material' : 'Add New Material'}
        </DialogTitle>
        <DialogContent>
          <MaterialForm
            formData={formData}
            setFormData={setFormData}
            onFetchStullerData={onFetchStullerData}
            loadingStuller={loadingStuller}
            isEditing={isEditing}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
