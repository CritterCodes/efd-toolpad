'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

export default function CADApproveDialog({
  designDialogOpen,
  setDesignDialogOpen,
  designData,
  setDesignData,
  uploadProgress,
  handleFileUpload,
  handleSubmitDesign,
  selectedRequest,
}) {
  return (
    <Dialog
      open={designDialogOpen}
      onClose={() => setDesignDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Submit CAD Design</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload your CAD design files for approval
          </Typography>

          <TextField
            fullWidth
            label="Design Title"
            value={designData.title || ''}
            onChange={(e) =>
              setDesignData({ ...designData, title: e.target.value })
            }
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={designData.description || ''}
            onChange={(e) =>
              setDesignData({ ...designData, description: e.target.value })
            }
            sx={{ mb: 2 }}
          />

          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 1,
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
            }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <CloudUploadIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>Click to upload design files</Typography>
            <input
              id="file-upload"
              type="file"
              multiple
              hidden
              onChange={handleFileUpload}
            />
          </Box>

          {uploadProgress > 0 && (
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ mb: 2 }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSubmitDesign}
          variant="contained"
          disabled={uploadProgress > 0}
        >
          {uploadProgress > 0 ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
