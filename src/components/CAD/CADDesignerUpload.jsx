'use client';

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import { useCADDesignerUpload } from '@/hooks/cad/useCADDesignerUpload';
import {
  STLUploadCard,
  GLBUploadCard,
  VolumeOverridePanel,
  UploadConfirmDialog,
} from './upload';

const CADDesignerUpload = ({ cadRequestId, onUploadComplete }) => {
  const {
    files,
    uploading,
    uploadProgress,
    calculatedVolume,
    meshStats,
    errors,
    manualVolume,
    confirmDialog,
    setManualVolume,
    setConfirmDialog,
    handleFileChange,
    handleUpload,
    proceedWithUpload,
    removeFile,
  } = useCADDesignerUpload({ cadRequestId, onUploadComplete });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Upload CAD Design Files
      </Typography>

      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <STLUploadCard
            file={files.stl}
            uploadProgress={uploadProgress.stl}
            calculatedVolume={calculatedVolume}
            meshStats={meshStats}
            error={errors.stl}
            onFileChange={handleFileChange}
            onRemoveFile={removeFile}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <GLBUploadCard
            file={files.glb}
            uploadProgress={uploadProgress.glb}
            error={errors.glb}
            onFileChange={handleFileChange}
            onRemoveFile={removeFile}
          />
        </Grid>

        <Grid item xs={12}>
          <VolumeOverridePanel
            calculatedVolume={calculatedVolume}
            manualVolume={manualVolume}
            setManualVolume={setManualVolume}
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            size="large"
            onClick={handleUpload}
            disabled={uploading || (!files.stl && !files.glb)}
            sx={{ width: '100%', py: 1.5 }}
          >
            {uploading ? <CircularProgress size={24} sx={{ mr: 1 }} /> : null}  
            {uploading ? 'Uploading...' : 'Upload Design Files'}
          </Button>
        </Grid>
      </Grid>

      <UploadConfirmDialog
        open={confirmDialog}
        files={files}
        calculatedVolume={calculatedVolume}
        manualVolume={manualVolume}
        onClose={() => setConfirmDialog(false)}
        onConfirm={proceedWithUpload}
      />
    </Box>
  );
};

export default CADDesignerUpload;
