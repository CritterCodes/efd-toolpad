"use client";

import React from 'react';
import { Typography, Alert } from '@mui/material';
import { TabRail } from '@/components/facelift';

export default function UserManagementHeader({ 
  tabValue, 
  setTabValue, 
  pendingCount, 
  error, 
  setError 
}) {
  return (
    <>
      <Typography component="h1" variant="h4" gutterBottom>
        User Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TabRail
        ariaLabel="User management views"
        value={tabValue}
        onChange={setTabValue}
        items={[
          { key: 0, label: 'Pending Approval', count: pendingCount },
          { key: 1, label: 'All Users' },
          { key: 2, label: 'Create Admin User' },
        ]}
      />
    </>
  );
}