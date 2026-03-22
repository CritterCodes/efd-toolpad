import React from 'react';
import { Alert, Typography } from '@mui/material';

export default function SessionStatusAlert({ status, session }) {
  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>Current Session Status</Typography>
      <Typography><strong>Status:</strong> {status}</Typography>
      <Typography><strong>Email:</strong> {session?.user?.email || 'Not available'}</Typography>
      <Typography><strong>Role:</strong> {session?.user?.role || 'Not available'}</Typography>
      <Typography><strong>Name:</strong> {session?.user?.name || 'Not available'}</Typography>
    </Alert>
  );
}