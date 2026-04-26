'use client';

import React from 'react';
import { Box, Alert, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function RepairTaskFormPage() {
  const router = useRouter();

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          The advanced repair-task builder is temporarily unavailable while we complete a refactor.
          Please use the universal task flow for now.
        </Alert>
        <Button variant="contained" onClick={() => router.push('/dashboard/admin/tasks')}>
          Go To Universal Tasks
        </Button>
      </Box>
    </Box>
  );
}

