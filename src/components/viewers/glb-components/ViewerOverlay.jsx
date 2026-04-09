import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function ViewerOverlay({ loading, error }) {
  if (loading) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          zIndex: 10
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="textSecondary">
          Loading 3D model...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          p: 3,
          backgroundColor: '#ffebee',
          borderRadius: 1,
          maxWidth: '80%',
          zIndex: 10
        }}
      >
        <Typography variant="body2" color="error" fontWeight={600}>
          Error Loading Model
        </Typography>
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  return null;
}
