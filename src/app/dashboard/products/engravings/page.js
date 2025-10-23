"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Paper,
  CircularProgress
} from '@mui/material';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

export default function EngravingsManagementPage() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Not authenticated
  if (!session) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          You must be logged in to access engraving management.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <DesignServicesIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Engraving Services Management
          </Typography>
        </Box>
      </Box>

      {/* Coming Soon Message */}
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <DesignServicesIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Engraving Management Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          This section will allow hand engravers to manage their engraving services,
          showcase their portfolio, and connect with customers needing custom engraving.
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body2">
            <strong>For Hand Engravers:</strong> This feature is currently in development.
            You&apos;ll be able to showcase your engraving work, offer custom engraving services,
            and connect with jewelers and customers who need personalization.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
}