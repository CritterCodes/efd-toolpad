import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Typography,
  CircularProgress,
  Button
} from '@mui/material';

export default function CADUploadModal({
  open,
  onClose,
  formData,
  calculating,
  calculatedVolume,
  loading,
  handleFormChange,
  handleFileChange,
  handleSubmitDesign
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload New Design</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Design Title"
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            required
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleFormChange}
          />
          <TextField
            fullWidth
            label="CAD Request ID (Optional)"
            name="cadRequestId"
            value={formData.cadRequestId}
            onChange={handleFormChange}
            placeholder="Link to CAD request if applicable"
          />

          <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              STL File (3D Print Format)
            </Typography>
            <input
              type="file"
              accept=".stl"
              onChange={(e) => handleFileChange(e, 'stlFile')}
              style={{ width: '100%' }}
            />
            {calculating && <CircularProgress size={20} sx={{ mt: 1 }} />}
            {formData.stlFile && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                ✓ {formData.stlFile.name}
                {calculatedVolume && ` - Volume: ${calculatedVolume.toLocaleString()} mm³`}
              </Typography>
            )}
          </Box>

          <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              GLB File (Web Preview)
            </Typography>
            <input
              type="file"
              accept=".glb"
              onChange={(e) => handleFileChange(e, 'glbFile')}
              style={{ width: '100%' }}
            />
            {formData.glbFile && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 1 }}>
                ✓ {formData.glbFile.name}
              </Typography>
            )}
          </Box>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Design Notes"
            name="notes"
            value={formData.notes}
            onChange={handleFormChange}
            placeholder="Any notes for the design team..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmitDesign}
          disabled={loading || !formData.title || (!formData.stlFile && !formData.glbFile)}
        >
          {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
          Upload Design
        </Button>
      </DialogActions>
    </Dialog>
  );
}