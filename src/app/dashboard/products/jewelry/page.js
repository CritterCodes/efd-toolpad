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
import CategoryIcon from '@mui/icons-material/Category';

export default function JewelryManagementPage() {
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
          You must be logged in to access jewelry management.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box display="flex" alignItems="center" gap={2}>
          <CategoryIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Jewelry Management
          </Typography>
        </Box>
      </Box>

      {/* Coming Soon Message */}
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <CategoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Jewelry Management Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={3}>
          This section will allow jewelers to manage their jewelry inventory,
          including rings, necklaces, bracelets, and other finished pieces.
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          <Typography variant="body2">
            <strong>For Jewelers:</strong> This feature is currently in development.
            You&apos;ll be able to list finished jewelry pieces, manage inventory,
            and connect with customers looking for custom jewelry solutions.
          </Typography>
        </Alert>
      </Paper>
    </Container>
  );
}