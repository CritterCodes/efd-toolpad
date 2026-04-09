"use client";

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';

export default function UserActionDialog({
  actionDialog,
  closeActionDialog,
  setActionDialogField,
  handleAction
}) {
  return (
    <Dialog 
      open={actionDialog.open} 
      onClose={closeActionDialog}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {actionDialog.action === 'approve' ? 'Approve User' : 'Reject User'}
      </DialogTitle>
      <DialogContent>
        {actionDialog.user && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>User:</strong> {actionDialog.user.firstName} {actionDialog.user.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Email:</strong> {actionDialog.user.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Requested Role:</strong> {actionDialog.user.approvalData?.requestedRole || actionDialog.user.role}
            </Typography>
          </Box>
        )}

        {actionDialog.action === 'reject' && (
          <TextField
            fullWidth
            label="Rejection Reason"
            multiline
            rows={3}
            value={actionDialog.reason}
            onChange={(e) => setActionDialogField('reason', e.target.value)}
            required
            sx={{ mb: 2 }}
            placeholder="Please provide a reason for rejection..."
          />
        )}

        <TextField
          fullWidth
          label="Notes (Optional)"
          multiline
          rows={2}
          value={actionDialog.notes}
          onChange={(e) => setActionDialogField('notes', e.target.value)}
          placeholder="Add any additional notes..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={closeActionDialog}>
          Cancel
        </Button>
        <Button 
          onClick={handleAction}
          variant="contained"
          color={actionDialog.action === 'approve' ? 'success' : 'error'}
          disabled={actionDialog.action === 'reject' && !actionDialog.reason.trim()}
        >
          {actionDialog.action === 'approve' ? 'Approve' : 'Reject'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}