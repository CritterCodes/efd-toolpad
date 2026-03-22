import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField
} from '@mui/material';

export default function ActionDialog({ open, onClose, application, actionType, onConfirm, loading }) {
  const [reviewNotes, setReviewNotes] = useState('');

  // Reset notes when dialog opens
  useEffect(() => {
    if (open) setReviewNotes('');
  }, [open]);

  if (!application) return null;

  const handleConfirm = () => {
    onConfirm(application.applicationId, reviewNotes);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {actionType === 'approve' ? 'Approve' : 'Reject'} Wholesale Application
      </DialogTitle>
      <DialogContent>
        <Box>
          <Typography variant="body1" gutterBottom>
            <strong>Business:</strong> {application.businessName}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Contact:</strong> {application.contactFirstName} {application.contactLastName}
          </Typography>
          <Typography variant="body1" gutterBottom>
            <strong>Email:</strong> {application.email}
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Review Notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder={
              actionType === 'approve' 
                ? 'Optional notes about the approval...' 
                : 'Required: Please provide a reason for rejection...'
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          color={actionType === 'approve' ? 'success' : 'error'}
          variant="contained"
          disabled={loading || (actionType === 'reject' && !reviewNotes.trim())}
        >
          {loading ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}