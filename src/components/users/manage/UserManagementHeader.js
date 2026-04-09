"use client";

import React from 'react';
import { Typography, Tabs, Tab, Alert } from '@mui/material';

export default function UserManagementHeader({ 
  tabValue, 
  setTabValue, 
  pendingCount, 
  error, 
  setError 
}) {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
        <Tab label={`Pending Approval (${pendingCount})`} />
        <Tab label="All Users" />
        <Tab label="Create Admin User" />
      </Tabs>
    </>
  );
}