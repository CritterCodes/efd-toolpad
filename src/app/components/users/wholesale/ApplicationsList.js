import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Storefront as StoreIcon,
} from '@mui/icons-material';

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function ApplicationsList({ applications, onOpenDetail, onOpenAction }) {
  if (!applications || applications.length === 0) {
    return (
      <Typography variant="body1" color="text.secondary">
        No wholesale applications found.
      </Typography>
    );
  }

  return (
    <Grid container spacing={2}>
      {applications.map((application) => (
        <Grid item xs={12} md={6} lg={4} key={application.applicationId}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  <StoreIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {application.businessName || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {application.email}
                  </Typography>
                </Box>
              </Box>

              <Chip 
                label={application.status || 'unknown'} 
                color={
                  application.status === 'approved' ? 'success' :
                  application.status === 'rejected' ? 'error' : 'warning'
                }
                size="small"
                sx={{ mb: 1 }}
              />

              <Typography variant="body2" gutterBottom>
                <strong>Contact:</strong> {application.contactFirstName} {application.contactLastName}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Phone:</strong> {application.contactPhone || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Location:</strong> {application.businessCity}, {application.businessState}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Submitted:</strong> {formatDate(application.submittedAt)}
              </Typography>

              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Tooltip title="View Details">
                  <IconButton size="small" onClick={() => onOpenDetail(application)}>
                    <ViewIcon />
                  </IconButton>
                </Tooltip>
                
                {application.status === 'pending' && (
                  <>
                    <Tooltip title="Approve Application">
                      <IconButton 
                        size="small" 
                        color="success"
                        onClick={() => onOpenAction(application, 'approve')}
                      >
                        <ApproveIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Application">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => onOpenAction(application, 'reject')}
                      >
                        <RejectIcon />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                
                <Tooltip title="Contact">
                  <IconButton size="small" href={`mailto:${application.email}`}>
                    <EmailIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}