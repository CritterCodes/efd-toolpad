import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import { Check as ApproveIcon, Close as RejectIcon } from '@mui/icons-material';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'declined': return 'error';
    case 'in_review': return 'info';
    default: return 'default';
  }
};

const getStatusIcon = (status) => {
  if (status === 'approved') return <ApproveIcon sx={{ fontSize: 16, mr: 0.5 }} />;
  if (status === 'declined') return <RejectIcon sx={{ fontSize: 16, mr: 0.5 }} />;
  return null;
};

export default function CADDetailModal({
  open,
  onClose,
  selectedDesign
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{selectedDesign?.title}</DialogTitle>
      <DialogContent>
        {selectedDesign && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body2">{selectedDesign.description}</Typography>
              </Grid>

              {selectedDesign.printVolume && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Volume</Typography>
                  <Typography variant="body2">
                    {selectedDesign.printVolume.toLocaleString()} mm³
                  </Typography>
                </Grid>
              )}

              {selectedDesign.status && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip
                    icon={getStatusIcon(selectedDesign.status)}
                    label={selectedDesign.status}
                    color={getStatusColor(selectedDesign.status)}
                  />
                </Grid>
              )}

              {selectedDesign.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Designer Notes</Typography>
                  <Typography variant="body2">{selectedDesign.notes}</Typography>
                </Grid>
              )}

              {selectedDesign.feedbackNotes && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="subtitle2">Feedback</Typography>
                    <Typography variant="body2">{selectedDesign.feedbackNotes}</Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}