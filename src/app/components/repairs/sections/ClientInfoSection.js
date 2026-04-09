import React from 'react';
import { Card, CardContent, Typography, TextField } from '@mui/material';

export default function ClientInfoSection({ formData = {}, setFormData = () => {} }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6">Client Information</Typography>
        <TextField
          fullWidth
          label="First Name"
          value={formData.firstName || ''}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        />
      </CardContent>
    </Card>
  );
}
