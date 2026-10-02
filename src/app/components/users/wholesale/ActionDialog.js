import React, { useState, useEffect } from 'react';
import { FaceliftRoot, Field, FieldList } from '@/components/facelift';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
          <FaceliftRoot>
            <FieldList>
              <Field label="Business" value={application.businessName} strong />
              <Field
                label="Contact"
                value={[application.contactFirstName, application.contactLastName].filter(Boolean).join(' ')}
              />
              <Field label="Email" value={application.email} mono />
            </FieldList>
          </FaceliftRoot>
          
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