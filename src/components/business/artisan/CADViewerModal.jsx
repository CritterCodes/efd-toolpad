import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import GLBViewer from '@/components/viewers/GLBViewer';
import STLViewer from '@/components/viewers/STLViewer';

export default function CADViewerModal({
  open,
  onClose,
  previewType,
  previewFile
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Design Preview</DialogTitle>
      <DialogContent sx={{ height: 600 }}>
        {previewType === 'stl' && previewFile && (
          <STLViewer fileUrl={previewFile} />
        )}
        {previewType === 'glb' && previewFile && (
          <GLBViewer fileUrl={previewFile} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}