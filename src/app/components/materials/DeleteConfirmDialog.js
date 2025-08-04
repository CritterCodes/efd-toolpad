/**
 * DeleteConfirmDialog Component
 * Confirmation dialog for deleting materials
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button
} from '@mui/material';

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  material
}) {
  const handleConfirm = () => {
    onConfirm(material._id);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
    >
      <DialogTitle>Delete Material</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete &quot;{material?.displayName}&quot;?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleConfirm}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
