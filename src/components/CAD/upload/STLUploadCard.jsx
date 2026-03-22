import React, { useRef } from 'react';
import {
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DeleteIcon from '@mui/icons-material/Delete';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes, k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const STLUploadCard = ({
  file,
  uploadProgress,
  calculatedVolume,
  meshStats,
  error,
  onFileChange,
  onRemoveFile,
}) => {
  const fileInputRef = useRef(null);

  return (
    <Paper sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>     
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>    
        STL File (3D Print Format)
      </Typography>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>   
        Upload your STL file for 3D printing volume calculation
      </Typography>

      {!file ? (
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
              <Typography variant="body2">{file.name}</Typography>   
              <Chip
                label={formatBytes(file.size)}
                size="small"
                variant="outlined"
              />
            </Box>

            {uploadProgress === 'calculating' && (
              <Box sx={{ mt: 1 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="caption">Calculating volume...</Typography>
              </Box>
            )}

            {uploadProgress === 'done' && calculatedVolume !== null && (
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

            {uploadProgress === 'error' && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}> 
                <ErrorIcon sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                <Typography variant="caption" color="error">
                  {error || 'Calculation failed'}
                </Typography>
              </Box>
            )}

            <Button
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => onRemoveFile('stl')}
              sx={{ mt: 1 }}
            >
              Remove
            </Button>
          </CardContent>
        </Card>
      )}

      {error && !file && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>       
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".stl"
        onChange={(e) => onFileChange(e, 'stl')}
        style={{ display: 'none' }}
      />
    </Paper>
  );
};

export default STLUploadCard;
