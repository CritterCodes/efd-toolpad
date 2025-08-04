import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Typography } from '@mui/material';

/**
 * DeleteConfirmDialog Component
 * Confirmation dialog for process deletion
 */
export const DeleteConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  process
}) => {
  const handleConfirm = () => {
    if (process?._id) {
      onConfirm(process._id);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
    >
      <DialogTitle>Delete Process</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete &quot;{process?.displayName}&quot;?
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
};
