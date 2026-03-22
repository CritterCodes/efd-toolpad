import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
} from '@mui/material';
import { Description as DocumentIcon } from '@mui/icons-material';

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function DetailDialog({ open, onClose, application }) {
  if (!application) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Wholesale Application Details
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Business Information</Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Business Name:</strong> {application.businessName}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Address:</strong> {application.businessAddress}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>City:</strong> {application.businessCity}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>State:</strong> {application.businessState}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>ZIP:</strong> {application.businessZip}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Country:</strong> {application.businessCountry}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Contact Information</Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Name:</strong> {application.contactFirstName} {application.contactLastName}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Title:</strong> {application.contactTitle}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Email:</strong> {application.contactEmail}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Phone:</strong> {application.contactPhone}
            </Typography>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Application Status</Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Status:</strong> {application.status}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Submitted:</strong> {formatDate(application.submittedAt)}
            </Typography>
            {application.reviewedAt && (
              <Typography variant="body2" gutterBottom>
                <strong>Reviewed:</strong> {formatDate(application.reviewedAt)}
              </Typography>
            )}
            {application.reviewNotes && (
              <Typography variant="body2" gutterBottom>
                <strong>Review Notes:</strong> {application.reviewNotes}
              </Typography>
            )}
          </Grid>
          
          {application.documents && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Documents</Typography>
              {application.documents.salesTaxPermit && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DocumentIcon />
                  <Typography variant="body2">
                    <a 
                      href={application.documents.salesTaxPermit.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Sales Tax Permit ({application.documents.salesTaxPermit.originalName})
                    </a>
                  </Typography>
                </Box>
              )}
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}