import React from 'react';
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
import DeleteIcon from '@mui/icons-material/Delete';

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes, k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const GLBUploadCard = ({
  file,
  uploadProgress,
  error,
  onFileChange,
  onRemoveFile,
}) => {
  return (
    <Paper sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>     
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>    
        GLB File (Web Preview)
      </Typography>

      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>   
        Upload your GLB file for web-based 3D preview
      </Typography>

      {!file ? (
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
                onFileChange({ target: { files: [file] } }, 'glb');   
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
              <Typography variant="body2">{file.name}</Typography>   
              <Chip
                label={formatBytes(file.size)}
                size="small"
                variant="outlined"
              />
            </Box>

            {uploadProgress === 'uploading' ? (
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
              onClick={() => onRemoveFile('glb')}
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
    </Paper>
  );
};

export default GLBUploadCard;
