import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';

const UploadConfirmDialog = ({
  open,
  files,
  calculatedVolume,
  manualVolume,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>     
      <DialogTitle>Confirm Design Upload</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Ready to upload the following:
        </Typography>
        {files.stl && (
          <Typography variant="body2">
            ✓ STL File: {files.stl.name} (Volume: {calculatedVolume?.toFixed(2) || manualVolume} mm³)
          </Typography>
        )}
        {files.glb && (
          <Typography variant="body2">
            ✓ GLB File: {files.glb.name}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>       
        <Button onClick={onConfirm} variant="contained">
          Confirm Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadConfirmDialog;
