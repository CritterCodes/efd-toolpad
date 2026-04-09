import React from 'react';
import { Card, CardContent, Typography, TextField } from '@mui/material';

export default function ClientInfoSection({ formData, setFormData }) {
  const safeFormData = formData || {};
  const safeSetFormData = typeof setFormData === 'function' ? setFormData : () => {};

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6">Client Information</Typography>
        <TextField
          fullWidth
          label="First Name"
          value={safeFormData.firstName || ''}
          onChange={(e) => safeSetFormData({ ...safeFormData, firstName: e.target.value })}
        />
      </CardContent>
    </Card>
  );
}
