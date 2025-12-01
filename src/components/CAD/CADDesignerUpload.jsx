'use client';

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';
import { getSTLVolume, getMeshStats } from '@/lib/stlParser';

const CADDesignerUpload = ({ cadRequestId, onUploadComplete }) => {
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState({
    stl: null,
    glb: null,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [calculatedVolume, setCalculatedVolume] = useState(null);
  const [meshStats, setMeshStats] = useState(null);
  const [errors, setErrors] = useState({});
  const [manualVolume, setManualVolume] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  const MAX_FILE_SIZE = {
    stl: 50 * 1024 * 1024, // 50MB for STL
    glb: 20 * 1024 * 1024, // 20MB for GLB
  };

  const handleFileChange = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    const newErrors = { ...errors };
    delete newErrors[fileType];

    // Validate file type
    if (fileType === 'stl') {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        newErrors.stl = 'File must be in .stl format';
        setErrors(newErrors);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE.stl) {
        newErrors.stl = `File size exceeds ${MAX_FILE_SIZE.stl / (1024 * 1024)}MB limit`;
        setErrors(newErrors);
        setFiles({ ...files, stl: null });
        return;
      }

      // Calculate volume
      try {
        setUploadProgress({ ...uploadProgress, stl: 'calculating' });
        const volume = await getSTLVolume(file);
        const stats = getMeshStats(await parseSTLForStats(file));

        setCalculatedVolume(volume);
        setMeshStats(stats);
        setUploadProgress({ ...uploadProgress, stl: 'done' });

        console.log(`STL Volume calculated: ${volume.toFixed(2)} mm³`);
        console.log('Mesh stats:', stats);
      } catch (error) {
        newErrors.stl = `Volume calculation failed: ${error.message}`;
        console.error('Volume calculation error:', error);
        setUploadProgress({ ...uploadProgress, stl: 'error' });
      }
    } else if (fileType === 'glb') {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        newErrors.glb = 'File must be in .glb format';
        setErrors(newErrors);
        return;
      }

      if (file.size > MAX_FILE_SIZE.glb) {
        newErrors.glb = `File size exceeds ${MAX_FILE_SIZE.glb / (1024 * 1024)}MB limit`;
        setErrors(newErrors);
        setFiles({ ...files, glb: null });
        return;
      }
    }

    setFiles({ ...files, [fileType]: file });
    setErrors(newErrors);
  };

  const parseSTLForStats = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const view = new Uint8Array(arrayBuffer);

    // Simple check for binary vs ASCII
    const isASCII = String.fromCharCode(...view.slice(0, 5)) === 'solid';

    if (isASCII) {
      const text = String.fromCharCode(...view);
      const vertices = [];
      const vertexPattern = /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/gi;

      let vertexMatch;
      while ((vertexMatch = vertexPattern.exec(text)) !== null) {
        vertices.push({
          x: parseFloat(vertexMatch[1]),
          y: parseFloat(vertexMatch[3]),
          z: parseFloat(vertexMatch[5]),
        });
      }
      return vertices;
    } else {
      // Binary format
      const dataView = new DataView(arrayBuffer);
      const triangleCount = dataView.getUint32(80, true);
      const vertices = [];
      const vertexMap = new Set();

      let offset = 84;
      for (let i = 0; i < triangleCount; i++) {
        offset += 12; // Skip normal

        for (let j = 0; j < 3; j++) {
          const x = dataView.getFloat32(offset, true);
          const y = dataView.getFloat32(offset + 4, true);
          const z = dataView.getFloat32(offset + 8, true);
          offset += 12;

          const key = `${x.toFixed(10)},${y.toFixed(10)},${z.toFixed(10)}`;
          if (!vertexMap.has(key)) {
            vertices.push({ x, y, z });
            vertexMap.add(key);
          }
        }
      }
      return vertices;
    }
  };

  const handleUpload = async () => {
    if (!files.stl && !files.glb) {
      setErrors({ general: 'Please select at least one file to upload' });
      return;
    }

    if (!cadRequestId) {
      setErrors({ general: 'CAD Request ID is required' });
      return;
    }

    setConfirmDialog(true);
  };

  const proceedWithUpload = async () => {
    setConfirmDialog(false);
    setUploading(true);
    const newErrors = {};
    const newStatus = {};

    try {
      // Upload STL file
      if (files.stl) {
        try {
          setUploadProgress({ ...uploadProgress, stl: 'uploading' });
          const stlUrl = await uploadFileToS3(files.stl, 'stl');
          newStatus.stl = { success: true, url: stlUrl };
          setUploadProgress({ ...uploadProgress, stl: 'complete' });
        } catch (error) {
          newErrors.stl = error.message;
          newStatus.stl = { success: false, error: error.message };
          setUploadProgress({ ...uploadProgress, stl: 'error' });
        }
      }

      // Upload GLB file
      if (files.glb) {
        try {
          setUploadProgress({ ...uploadProgress, glb: 'uploading' });
          const glbUrl = await uploadFileToS3(files.glb, 'glb');
          newStatus.glb = { success: true, url: glbUrl };
          setUploadProgress({ ...uploadProgress, glb: 'complete' });
        } catch (error) {
          newErrors.glb = error.message;
          newStatus.glb = { success: false, error: error.message };
          setUploadProgress({ ...uploadProgress, glb: 'error' });
        }
      }

      setUploadStatus(newStatus);

      // If uploads successful, save to database
      if (newStatus.stl?.success || newStatus.glb?.success) {
        try {
          const finalVolume = manualVolume || calculatedVolume;

          await saveDesignToDB({
            cadRequestId,
            stlUrl: newStatus.stl?.url,
            glbUrl: newStatus.glb?.url,
            volume: finalVolume,
            meshStats,
          });

          // Reset form
          setFiles({ stl: null, glb: null });
          setCalculatedVolume(null);
          setMeshStats(null);
          setManualVolume('');
          setErrors({});

          if (onUploadComplete) {
            onUploadComplete({
              stlUrl: newStatus.stl?.url,
              glbUrl: newStatus.glb?.url,
              volume: finalVolume,
            });
          }
        } catch (error) {
          newErrors.database = `Failed to save design: ${error.message}`;
        }
      }

      setErrors(newErrors);
    } finally {
      setUploading(false);
    }
  };

  const uploadFileToS3 = async (file, type) => {
    // This is a placeholder - implement actual S3 upload
    // In production, you'd use AWS SDK or call your backend API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('cadRequestId', cadRequestId);

    const response = await fetch('/api/upload/cad-files', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  };

  const saveDesignToDB = async (designData) => {
    const response = await fetch('/api/cad/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cadRequestId,
        files: {
          stl: designData.stlUrl ? {
            url: designData.stlUrl,
            originalName: files.stl?.name,
            size: files.stl?.size,
            mimetype: 'application/vnd.ms-pki.stl',
          } : undefined,
          glb: designData.glbUrl ? {
            url: designData.glbUrl,
            originalName: files.glb?.name,
            size: files.glb?.size,
            mimetype: 'application/octet-stream',
          } : undefined,
        },
        printVolume: Math.round(designData.volume || 0),
        meshStats: designData.meshStats,
      }),
    });

    if (!response.ok) {
      throw new Error(`Database save failed: ${response.statusText}`);
    }

    return response.json();
  };

  const removeFile = (fileType) => {
    setFiles({ ...files, [fileType]: null });
    setUploadProgress({ ...uploadProgress, [fileType]: null });
    if (fileType === 'stl') {
      setCalculatedVolume(null);
      setMeshStats(null);
      setManualVolume('');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes, k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Upload CAD Design Files
      </Typography>

      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>
      )}

      <Grid container spacing={3}>
        {/* STL File Upload */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              STL File (3D Print Format)
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Upload your STL file for 3D printing volume calculation
            </Typography>

            {!files.stl ? (
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                Select STL File
              </Button>
            ) : (
              <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{files.stl.name}</Typography>
                    <Chip
                      label={formatBytes(files.stl.size)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {uploadProgress.stl === 'calculating' && (
                    <Box sx={{ mt: 1 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="caption">Calculating volume...</Typography>
                    </Box>
                  )}

                  {uploadProgress.stl === 'done' && calculatedVolume !== null && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          Volume: {calculatedVolume.toFixed(2)} mm³
                        </Typography>
                      </Box>

                      {meshStats && (
                        <Box sx={{ fontSize: '0.75rem', color: 'textSecondary' }}>
                          <Typography variant="caption" display="block">
                            Dimensions: {meshStats.width.toFixed(1)} × {meshStats.height.toFixed(1)} × {meshStats.depth.toFixed(1)} mm
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {uploadProgress.stl === 'error' && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                      <ErrorIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                      <Typography variant="caption" color="error">
                        {errors.stl || 'Calculation failed'}
                      </Typography>
                    </Box>
                  )}

                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => removeFile('stl')}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            )}

            {errors.stl && (
              <Alert severity="error" sx={{ mt: 2 }}>{errors.stl}</Alert>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".stl"
              onChange={(e) => handleFileChange(e, 'stl')}
              style={{ display: 'none' }}
            />
          </Paper>
        </Grid>

        {/* GLB File Upload */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              GLB File (Web Preview)
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Upload your GLB file for web-based 3D preview
            </Typography>

            {!files.glb ? (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CloudUploadIcon />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.glb';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleFileChange({ target: { files: [file] } }, 'glb');
                    }
                  };
                  input.click();
                }}
                fullWidth
              >
                Select GLB File
              </Button>
            ) : (
              <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{files.glb.name}</Typography>
                    <Chip
                      label={formatBytes(files.glb.size)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  {uploadProgress.glb === 'uploading' ? (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="caption">Uploading...</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Ready for upload
                      </Typography>
                    </Box>
                  )}

                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => removeFile('glb')}
                    sx={{ mt: 1 }}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            )}

            {errors.glb && (
              <Alert severity="error" sx={{ mt: 2 }}>{errors.glb}</Alert>
            )}
          </Paper>
        </Grid>

        {/* Volume Override */}
        {calculatedVolume !== null && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, backgroundColor: '#f9f9f9' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Override Volume (Optional)
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Calculated volume: {calculatedVolume.toFixed(2)} mm³ - Enter custom value if needed
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Custom Volume (mm³)"
                value={manualVolume}
                onChange={(e) => setManualVolume(e.target.value)}
                placeholder={calculatedVolume.toFixed(2)}
                size="small"
              />
            </Paper>
          </Grid>
        )}

        {/* Upload Button */}
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

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
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
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button onClick={proceedWithUpload} variant="contained">
            Confirm Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CADDesignerUpload;
